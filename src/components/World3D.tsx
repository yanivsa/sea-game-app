import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GameState } from '../game/types'
import { MAP_HEIGHT, MAP_WIDTH, WATER_LINE, CLIFF_LINE } from '../game/constants'

const SCALE = 0.05 // world units per pixel (scene meters per map pixel)
const PLAYER_EYE_HEIGHT = 1.64

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// Simple tiled noise using sums of sines for dunes/waves
const noise2 = (x: number, z: number) => {
  return (
    Math.sin(x * 0.35 + z * 0.12) * 0.5 +
    Math.sin(x * 0.12 - z * 0.32) * 0.35 +
    Math.cos(x * 0.06 + z * 0.07) * 0.15
  )
}

export const World3D = ({ state }: { state: GameState }) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const suitsGroupRef = useRef<THREE.Group | null>(null)
  const structuresRef = useRef<THREE.Group | null>(null)
  const deviceRef = useRef<THREE.Mesh | null>(null)
  const policeRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x06142e)
    scene.fog = new THREE.Fog(0x06142e, 20, 140)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x35220c, 0.85)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.65)
    dir.position.set(30, 60, -20)
    dir.castShadow = false
    scene.add(dir)

    // Ground (sand) subdivided + dunes around CLIFF_LINE
    const groundSeg = 160
    const groundGeo = new THREE.PlaneGeometry(
      MAP_WIDTH * SCALE,
      MAP_HEIGHT * SCALE,
      groundSeg,
      groundSeg,
    )
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xcaa96f,
      roughness: 1,
      metalness: 0,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.set((MAP_WIDTH * SCALE) / 2, 0, (MAP_HEIGHT * SCALE) / 2)
    // Sculpt dunes
    const pos = groundGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i)
      const vz = pos.getZ(i)
      // Map scene z back to map y pixels
      const mapY = vz / SCALE
      // Dunes strongest near CLIFF_LINE..WATER_LINE
      const band = clamp((mapY - CLIFF_LINE) / (WATER_LINE - CLIFF_LINE), 0, 1)
      const influence = Math.sin(band * Math.PI) // bell curve across band
      const h = noise2(vx * 0.8, vz * 0.8) * 0.6 * influence
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    groundGeo.computeVertexNormals()
    scene.add(ground)

    // Water band
    const waterDepth = (MAP_HEIGHT - WATER_LINE) * SCALE
    const waterSegW = 120
    const waterSegH = 80
    const waterGeo = new THREE.PlaneGeometry(
      MAP_WIDTH * SCALE,
      waterDepth,
      waterSegW,
      waterSegH,
    )
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x0f5d91,
      transparent: true,
      opacity: 0.86,
      shininess: 60,
      specular: 0x88aaff,
    })
    const water = new THREE.Mesh(waterGeo, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.set((MAP_WIDTH * SCALE) / 2, 0.02, (WATER_LINE * SCALE) + waterDepth / 2)
    scene.add(water)

    // Cliff line (visual accent)
    const cliffWidth = (WATER_LINE - CLIFF_LINE) * SCALE
    const cliffGeo = new THREE.PlaneGeometry(MAP_WIDTH * SCALE, cliffWidth, 8, 1)
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2b, roughness: 0.95 })
    const cliff = new THREE.Mesh(cliffGeo, cliffMat)
    cliff.rotation.x = -Math.PI / 2
    cliff.position.set((MAP_WIDTH * SCALE) / 2, 0.01, (CLIFF_LINE * SCALE) + cliffWidth / 2)
    scene.add(cliff)

    // Suits group
    const suitsGroup = new THREE.Group()
    scene.add(suitsGroup)
    suitsGroupRef.current = suitsGroup

    // Structures group (police station, props)
    const structures = new THREE.Group()
    scene.add(structures)
    structuresRef.current = structures

    // Device (iPhone 16) – glowing cube
    const deviceGeo = new THREE.BoxGeometry(0.18, 0.02, 0.08)
    const deviceMat = new THREE.MeshStandardMaterial({ color: 0x1efc1e, emissive: 0x1efc1e, emissiveIntensity: 0.8 })
    const device = new THREE.Mesh(deviceGeo, deviceMat)
    device.castShadow = false
    device.receiveShadow = false
    scene.add(device)
    deviceRef.current = device

    // Police station – small hut + rotating beacon + zone torus
    const station = new THREE.Group()
    const hut = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 1),
      new THREE.MeshStandardMaterial({ color: 0x253447, roughness: 0.9 })
    )
    hut.position.y = 0.45
    station.add(hut)
    // roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 0.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x334a63, roughness: 0.7 })
    )
    roof.position.y = 1.1
    station.add(roof)
    // beacon
    const beacon = new THREE.PointLight(0x66aaff, 1.2, 6)
    beacon.position.set(0, 1.4, 0)
    station.add(beacon)
    // marker torus (zone)
    const policeGeo = new THREE.TorusGeometry(1, 0.02, 10, 64)
    const policeMat = new THREE.MeshBasicMaterial({ color: 0x9ed9ff, transparent: true, opacity: 0.6 })
    const police = new THREE.Mesh(policeGeo, policeMat)
    police.rotation.x = -Math.PI / 2
    station.add(police)
    scene.add(station)
    policeRef.current = police

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    let raf: number
    const clock = new THREE.Clock()
    const tick = () => {
      const t = clock.getElapsedTime()
      // Camera from player POV
      const px = state.player.position.x * SCALE
      const pz = state.player.position.y * SCALE
      const bob = Math.sin(state.player.bobPhase) * 0.06
      camera.position.set(px, PLAYER_EYE_HEIGHT + bob, pz)
      const dirX = Math.cos(state.player.heading)
      const dirZ = Math.sin(state.player.heading)
      camera.lookAt(px + dirX, PLAYER_EYE_HEIGHT + bob * 0.5, pz + dirZ)

      // Water waves (vertex animation)
      const wpos = waterGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < wpos.count; i++) {
        const vx = wpos.getX(i)
        const vz = wpos.getZ(i)
        const wave =
          Math.sin(vx * 0.9 + t * 1.5) * 0.03 +
          Math.sin(vz * 1.2 + t * 0.8) * 0.02 +
          Math.cos((vx + vz) * 0.3 + t * 1.1) * 0.015
        wpos.setY(i, wave)
      }
      wpos.needsUpdate = true
      waterGeo.computeVertexNormals()

      // Update suits meshes count
      const desired = state.suits.length
      while (suitsGroup.children.length < desired) {
        // Build simple low-poly rig: torso + head + arms + legs
        const rig = new THREE.Group()
        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.9, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.85 })
        )
        torso.position.y = 0.9
        rig.add(torso)

        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.28),
          new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.6 })
        )
        head.position.y = 1.45
        rig.add(head)

        const leftArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.6, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x0e0e0e })
        )
        leftArm.position.set(-0.3, 1.05, 0)
        leftArm.name = 'armL'
        rig.add(leftArm)

        const rightArm = leftArm.clone()
        rightArm.position.x = 0.3
        rightArm.name = 'armR'
        rig.add(rightArm)

        const leftLeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.7, 0.14),
          new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
        )
        leftLeg.position.set(-0.12, 0.35, 0)
        leftLeg.name = 'legL'
        rig.add(leftLeg)

        const rightLeg = leftLeg.clone()
        rightLeg.position.x = 0.12
        rightLeg.name = 'legR'
        rig.add(rightLeg)

        suitsGroup.add(rig)
      }
      while (suitsGroup.children.length > desired) {
        const last = suitsGroup.children[suitsGroup.children.length - 1]
        suitsGroup.remove(last)
      }
      // Position suits
      state.suits.forEach((s, i) => {
        const rig = suitsGroup.children[i] as THREE.Group
        rig.position.set(s.position.x * SCALE, 0, s.position.y * SCALE)
        const factor = s.stunnedMs > 0 ? 0.92 : 1
        rig.scale.setScalar(factor)
        // limb animation
        const phase = (t * 6 + i) * (s.stunnedMs > 0 ? 0.2 : 1)
        const armL = rig.getObjectByName('armL') as THREE.Mesh
        const armR = rig.getObjectByName('armR') as THREE.Mesh
        const legL = rig.getObjectByName('legL') as THREE.Mesh
        const legR = rig.getObjectByName('legR') as THREE.Mesh
        const swing = Math.sin(phase) * 0.6
        if (armL && armR && legL && legR) {
          armL.rotation.x = swing
          armR.rotation.x = -swing
          legL.rotation.x = -swing * 0.7
          legR.rotation.x = swing * 0.7
        }
      })

      // Device position (show only if located or retrieved)
      if (deviceRef.current) {
        deviceRef.current.visible = state.device.located || state.device.retrieved
        deviceRef.current.position.set(state.device.position.x * SCALE, 0.03, state.device.position.y * SCALE)
        deviceRef.current.rotation.y += 0.05
      }

      // Police zone torus scale
      if (policeRef.current) {
        const radius = state.policeZone.radius * SCALE
        policeRef.current.parent?.position.set(
          state.policeZone.position.x * SCALE,
          0.02,
          state.policeZone.position.y * SCALE,
        )
        policeRef.current.parent?.scale.set(1, 1, 1)
        policeRef.current.scale.set(radius, radius, radius)
        // flash beacon on station
        const station = policeRef.current.parent as THREE.Group
        const beacon = station.children.find((c) => c.type === 'PointLight') as THREE.PointLight
        if (beacon) {
          beacon.intensity = 1 + Math.sin(t * 6) * 0.6
          beacon.color.setHSL(0.58 + Math.sin(t * 3) * 0.02, 0.8, 0.6)
        }
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="world3d" ref={mountRef} />
}
