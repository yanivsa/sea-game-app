import * as THREE from 'three'
import { CLIFF_LINE, MAP_HEIGHT, MAP_WIDTH, WATER_LINE } from '../game/constants'
import { createWaterMaterial } from '../shaders/water'
import type { StructureKind } from '../game/types'
import { FractalNoise } from './noise'
import { randomRange } from '../game/utils'

const SCALE = 0.05
export const buildTerrain = (seed = 4021) => {
  const noiseGenerator = new FractalNoise(seed)
  const container = new THREE.Group()

  const groundSeg = 320
  const groundGeo = new THREE.PlaneGeometry(
    MAP_WIDTH * SCALE,
    MAP_HEIGHT * SCALE,
    groundSeg,
    groundSeg,
  )
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xc7a46b, roughness: 0.95 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set((MAP_WIDTH * SCALE) / 2, 0, (MAP_HEIGHT * SCALE) / 2)
  const pos = groundGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vz = pos.getZ(i)
    const mapY = vz / SCALE
    const band = THREE.MathUtils.clamp((mapY - CLIFF_LINE) / (WATER_LINE - CLIFF_LINE), 0, 1)
    const influence = Math.sin(band * Math.PI)
    const h = noiseGenerator.sample(vx * 0.08, vz * 0.08, 0, 5, 0.55) * 1.2 * influence
    pos.setY(i, h)
  }
  pos.needsUpdate = true
  groundGeo.computeVertexNormals()
  container.add(ground)

  const waterDepth = (MAP_HEIGHT - WATER_LINE) * SCALE
  const waterGeo = new THREE.PlaneGeometry(MAP_WIDTH * SCALE, waterDepth, 200, 120)
  const water = new THREE.Mesh(waterGeo, createWaterMaterial())
  water.rotation.x = -Math.PI / 2
  water.position.set((MAP_WIDTH * SCALE) / 2, 0.01, (WATER_LINE * SCALE) + waterDepth / 2)
  container.add(water)

  // Decorative palms
  const palmGroup = new THREE.Group()
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.8 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f8a3b, roughness: 0.5 })
  for (let i = 0; i < 40; i += 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.8, 6), trunkMat)
    const x = randomRange(20, MAP_WIDTH - 20) * SCALE
    const z = randomRange(CLIFF_LINE + 20, WATER_LINE - 40) * SCALE
    trunk.position.set(x, 0.9, z)
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.6, 8), leafMat)
    leaves.position.y = 2.1
    trunk.add(leaves)
    palmGroup.add(trunk)
  }
  container.add(palmGroup)

  return { container, water }
}

export const createStructureMesh = (kind: StructureKind) => {
  switch (kind) {
    case 'rock': {
      const geom = new THREE.DodecahedronGeometry(0.5, 0)
      const mat = new THREE.MeshStandardMaterial({ color: 0x4b4139, roughness: 0.95 })
      return new THREE.Mesh(geom, mat)
    }
    case 'lifeguard': {
      const group = new THREE.Group()
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.1, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xb68b5b, roughness: 0.8 }),
      )
      base.position.y = 0.3
      group.add(base)
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }),
      )
      cabin.position.y = 0.8
      group.add(cabin)
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 0.9, 0.4, 4),
        new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.6 }),
      )
      roof.position.y = 1.25
      group.add(roof)
      return group
    }
    case 'flag': {
      const group = new THREE.Group()
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 2, 12),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
      )
      pole.position.y = 1
      group.add(pole)
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }),
      )
      flag.position.set(0.4, 1.4, 0)
      flag.rotation.y = Math.PI / 2
      group.add(flag)
      return group
    }
    case 'buoy': {
      const group = new THREE.Group()
      const base = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0x26d1ff, shininess: 80 }),
      )
      base.position.y = 0.3
      group.add(base)
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a }),
      )
      mast.position.y = 0.9
      group.add(mast)
      return group
    }
    case 'driftwood': {
      const wood = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 1.4, 8),
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
