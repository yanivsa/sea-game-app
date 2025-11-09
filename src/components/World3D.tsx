import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GameState } from '../game/types'
import { MAP_WIDTH, WATER_LINE, CLIFF_LINE } from '../game/constants'
import { createPlayerRig } from '../three/playerRig'
import type { PlayerRig } from '../three/playerRig'
import { buildTerrain, createStructureMesh } from '../three/environment'
import { createSuitRig } from '../three/suitRig'
import { CameraRig } from '../three/controllers/CameraRig'
import { PhysicsWorld } from '../three/physics/PhysicsWorld'

const SCALE = 0.05 // world units per pixel (scene meters per map pixel)

export const World3D = ({ state }: { state: GameState }) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRigRef = useRef<CameraRig | null>(null)
  const suitsGroupRef = useRef<THREE.Group | null>(null)
  const structuresRef = useRef<THREE.Group | null>(null)
  const playerRigRef = useRef<THREE.Group | null>(null)
  const playerRigDataRef = useRef<PlayerRig | null>(null)
  const wakeRef = useRef<{ meshes: THREE.Mesh[] } | null>(null)
  const deviceRef = useRef<THREE.Mesh | null>(null)
  const policeRef = useRef<THREE.Mesh | null>(null)
  const waterRef = useRef<THREE.Mesh | null>(null)
  const stateRef = useRef<GameState>(state)
  const physicsRef = useRef<PhysicsWorld | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    const initialWeather = stateRef.current.weather
    scene.background = new THREE.Color(initialWeather?.skyTint ?? 0x06142e)
    scene.fog = new THREE.Fog(initialWeather?.fogTint ?? 0x06142e, 20, 160)
    sceneRef.current = scene

    const cameraRig = new CameraRig(60, width / height, 0.1, 1200)
    cameraRigRef.current = cameraRig

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    physicsRef.current = new PhysicsWorld()

    // Lights
    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x35220c, 0.95)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(60, 120, -80)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 400
    dir.shadow.camera.left = -80
    dir.shadow.camera.right = 80
    dir.shadow.camera.top = 80
    dir.shadow.camera.bottom = -80
    scene.add(dir)

    const { container: terrain, water } = buildTerrain(stateRef.current.worldSeed)
    scene.add(terrain)
    waterRef.current = water

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
    const playerRigData = createPlayerRig()
    scene.add(playerRigData.group)
    playerRigRef.current = playerRigData.group
    playerRigDataRef.current = playerRigData

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

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      cameraRig.resize(w, h)
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
      const delta = clock.getDelta()
      const t = clock.elapsedTime
      // Camera from player POV
      const px = snapshot.player.position.x * SCALE
      const pz = snapshot.player.position.y * SCALE
      const dirX = Math.cos(snapshot.player.heading)
      const dirZ = Math.sin(snapshot.player.heading)
      const bob = Math.sin(snapshot.player.bobPhase) * 0.05

      if (scene.background instanceof THREE.Color) {
        scene.background.setHex(snapshot.weather.skyTint)
      } else {
        scene.background = new THREE.Color(snapshot.weather.skyTint)
      }
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.setHex(snapshot.weather.fogTint)
      }
      hemi.intensity = 0.75 + snapshot.weather.ambientGain * 0.3
      dir.intensity = 0.8 + snapshot.weather.ambientGain * 0.4
      dir.position.y = 100 + snapshot.weather.waveStrength * 20

      const physics = physicsRef.current
      if (physics) {
        physics.syncPlayer(new THREE.Vector3(px, 0, pz), new THREE.Vector3(dirX, 0, dirZ))
        physics.step(delta)
        const bodyPos = physics.entities.player.position
        if (playerRigRef.current && playerRigDataRef.current) {
          playerRigRef.current.position.lerp(new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z), 0.4)
          playerRigRef.current.rotation.y = Math.atan2(dirX, dirZ)
          playerRigDataRef.current.arrow.rotation.x = -Math.PI / 2 + Math.sin(t * 2) * 0.05
          playerRigDataRef.current.paddle.rotation.z = Math.sin(t * 2) * 0.25
        }
      }

      const cameraRig = cameraRigRef.current
      if (cameraRig) {
        const anchor = physicsRef.current ? physicsRef.current.entities.player.position : { x: px, y: 0, z: pz }
        cameraRig.update(delta, new THREE.Vector3(anchor.x, anchor.y, anchor.z), new THREE.Vector3(dirX, 0, dirZ), bob)
      }

      const waterMesh = waterRef.current
      if (waterMesh) {
        const material = waterMesh.material as THREE.ShaderMaterial
        material.uniforms.uTime.value = t
        material.uniforms.uStrength.value = snapshot.weather.waveStrength
      }

      // Update suits meshes count
      const desired = snapshot.suits.length
      while (suitsGroup.children.length < desired) {
        suitsGroup.add(createSuitRig())
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

      const activeCamera = cameraRigRef.current?.camera
      if (activeCamera) {
        renderer.render(scene, activeCamera)
      }
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
