import * as THREE from 'three'

export const createSuitRig = () => {
  const rig = new THREE.Group()

  const torsoMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.15 })
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.3), torsoMat)
  torso.position.y = 0.9
  torso.name = 'torso'
  rig.add(torso)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }),
  )
  head.position.y = 1.5
  head.name = 'head'
  rig.add(head)

  const glasses = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.02, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x87a1ff, emissive: 0x87a1ff, emissiveIntensity: 1 }),
  )
  glasses.rotation.x = Math.PI / 2
  glasses.position.set(0, 1.5, 0.16)
  rig.add(glasses)

  const makeLimb = (name: string) => {
    const limb = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0f0f0f }),
    )
    limb.name = name
    return limb
  }

  const armL = makeLimb('armL')
  armL.position.set(-0.32, 1.1, 0)
  rig.add(armL)
  const armR = makeLimb('armR')
  armR.position.set(0.32, 1.1, 0)
  rig.add(armR)

  const legL = makeLimb('legL')
  legL.position.set(-0.14, 0.4, 0)
  rig.add(legL)
  const legR = makeLimb('legR')
  legR.position.set(0.14, 0.4, 0)
  rig.add(legR)

  rig.traverse((obj) => {
    obj.castShadow = true
    obj.receiveShadow = true
  })

  return rig
}
