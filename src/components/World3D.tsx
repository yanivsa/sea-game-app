import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GameState, StructureKind } from '../game/types'
import { MAP_HEIGHT, MAP_WIDTH, WATER_LINE, CLIFF_LINE } from '../game/constants'
import { createWaterMaterial } from '../shaders/water'

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
  const playerRigRef = useRef<THREE.Group | null>(null)
  const wakeRef = useRef<{ meshes: THREE.Mesh[] } | null>(null)
  const deviceRef = useRef<THREE.Mesh | null>(null)
  const policeRef = useRef<THREE.Mesh | null>(null)
  const stateRef = useRef<GameState>(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

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
    const waterMat = createWaterMaterial()
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

    // Player rig (visible in world)
    const playerRig = new THREE.Group()
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x0f365c, roughness: 0.25, metalness: 0.35 }),
    )
    board.position.y = 0.08
    playerRig.add(board)

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfcbf9e, roughness: 0.6 }),
    )
    body.position.y = 0.7
    playerRig.add(body)

    const paddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 1),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }),
    )
    paddle.position.set(0.35, 0.4, 0)
    paddle.rotation.y = Math.PI / 5
    playerRig.add(paddle)

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf2c744, emissiveIntensity: 0.8 }),
    )
    arrow.position.set(0, 1.2, -0.3)
    arrow.name = 'playerArrow'
    playerRig.add(arrow)

    scene.add(playerRig)
    playerRigRef.current = playerRig

    // Wake meshes
    const wakeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const wake1 = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), wakeMaterial.clone())
    wake1.rotation.x = -Math.PI / 2
    const wake2 = wake1.clone()
    scene.add(wake1)
    scene.add(wake2)
    wakeRef.current = { meshes: [wake1, wake2] }

    const createStructureMesh = (kind: StructureKind) => {
      switch (kind) {
        case 'rock': {
          const geom = new THREE.DodecahedronGeometry(0.4, 0)
          const mat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.95 })
          return new THREE.Mesh(geom, mat)
        }
        case 'lifeguard': {
          const tower = new THREE.Group()
          const legs = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.05, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xb08a5b, roughness: 0.9 }),
          )
          legs.position.y = 0.2
          tower.add(legs)
          const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.4, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
          )
          cabin.position.y = 0.6
          tower.add(cabin)
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.05, 0.9),
            new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.7 }),
          )
          roof.position.y = 0.83
          tower.add(roof)
          return tower
        }
        case 'flag': {
          const group = new THREE.Group()
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.6, 12),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
          )
          pole.position.y = 0.8
          group.add(pole)
          const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }),
          )
          flag.position.set(0.26, 1.2, 0)
          flag.rotation.y = Math.PI / 2
          group.add(flag)
          return group
        }
        case 'buoy': {
          const group = new THREE.Group()
          const base = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0x22d3ee, shininess: 60 }),
          )
          base.position.y = 0.2
          group.add(base)
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x0f172a }),
          )
          mast.position.y = 0.7
          group.add(mast)
          return group
        }
        case 'driftwood': {
          const wood = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.06, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x7a4d1f, roughness: 0.9 }),
          )
          wood.rotation.z = Math.PI / 2.5
          return wood
        }
        default:
          return new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.2, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
          )
      }
    }

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
      const snapshot = stateRef.current
      if (!snapshot) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = clock.getElapsedTime()
      // Camera from player POV
      const px = snapshot.player.position.x * SCALE
      const pz = snapshot.player.position.y * SCALE
      const dirX = Math.cos(snapshot.player.heading)
      const dirZ = Math.sin(snapshot.player.heading)
      const bob = Math.sin(snapshot.player.bobPhase) * 0.05

      if (playerRigRef.current) {
        playerRigRef.current.position.lerp(new THREE.Vector3(px, 0, pz), 0.3)
        playerRigRef.current.rotation.y = Math.atan2(dirX, dirZ)
        const arrowMesh = playerRigRef.current.getObjectByName('playerArrow') as THREE.Mesh | null
        if (arrowMesh) {
          arrowMesh.rotation.x = -Math.PI / 2 + Math.sin(t * 2) * 0.05
        }
      }

      const camTarget = new THREE.Vector3(px, 0.6 + bob, pz)
      const camPos = new THREE.Vector3(
        px - dirX * 3.2 + Math.sin(t * 0.4) * 0.1,
        PLAYER_EYE_HEIGHT + 0.4 - bob,
        pz - dirZ * 3.2 + Math.cos(t * 0.4) * 0.1,
      )
      camera.position.lerp(camPos, 0.12)
      camera.lookAt(camTarget)

      ;(water.material as THREE.ShaderMaterial).uniforms.uTime.value = t

      // Update suits meshes count
      const desired = snapshot.suits.length
      while (suitsGroup.children.length < desired) {
        // Build simple low-poly rig: torso + head + arms + legs
        const rig = new THREE.Group()
        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.9, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.85 })
        )
        torso.position.y = 0.9
        torso.name = 'torso'
        rig.add(torso)

        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.28),
          new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.6 })
        )
        head.position.y = 1.45
        head.name = 'head'
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
      snapshot.suits.forEach((s, i) => {
        const rig = suitsGroup.children[i] as THREE.Group
        rig.position.set(s.position.x * SCALE, 0, s.position.y * SCALE)
        const factor = s.stunnedMs > 0 ? 0.92 : 1
        rig.scale.setScalar(factor)
        const torso = rig.getObjectByName('torso') as THREE.Mesh
        const head = rig.getObjectByName('head') as THREE.Mesh
        const baseColor = s.variant === 'shore' ? 0x141414 : 0x0b2d63
        if (torso) {
          const mat = torso.material as THREE.MeshStandardMaterial
          mat.color.set(baseColor)
          mat.emissive.setHex(s.stunnedMs > 0 ? 0x333333 : 0x000000)
        }
        if (head) {
          const mat = head.material as THREE.MeshStandardMaterial
          mat.color.set(s.variant === 'shore' ? 0x1f1f1f : 0x133d6e)
        }
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
        deviceRef.current.visible = snapshot.device.located || snapshot.device.retrieved
        deviceRef.current.position.set(snapshot.device.position.x * SCALE, 0.03, snapshot.device.position.y * SCALE)
        deviceRef.current.rotation.y += 0.05
      }

      // Police zone torus scale
      if (policeRef.current) {
        const radius = snapshot.policeZone.radius * SCALE
        policeRef.current.parent?.position.set(
          snapshot.policeZone.position.x * SCALE,
          0.02,
          snapshot.policeZone.position.y * SCALE,
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

      // Wake animation
      if (wakeRef.current) {
        wakeRef.current.meshes.forEach((mesh, idx) => {
          const phase = (t * 0.6 + idx * 0.35) % 1
          const scale = 0.6 + phase * 2.6
          mesh.position.set(px - dirX * 0.4, 0.01, pz - dirZ * 0.4)
          mesh.scale.set(scale, scale, scale)
          const material = mesh.material as THREE.MeshBasicMaterial
          material.opacity = 0.25 * (1 - phase)
          mesh.rotation.y = Math.atan2(dirX, dirZ)
        })
      }

      // Structures sync
      if (structuresRef.current) {
        const group = structuresRef.current
        const existing = new Map<number, THREE.Object3D>()
        group.children.forEach((child) => {
          if (child.userData.sid != null) existing.set(child.userData.sid, child)
        })
        snapshot.structures.forEach((structure) => {
          let mesh = existing.get(structure.id)
          if (!mesh) {
            mesh = createStructureMesh(structure.kind)
            mesh.userData.sid = structure.id
            group.add(mesh)
          }
          mesh.position.set(structure.position.x * SCALE, 0, structure.position.y * SCALE)
          mesh.scale.setScalar(0.6 + structure.size * 0.01)
          existing.delete(structure.id)
        })
        existing.forEach((mesh) => group.remove(mesh))
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
