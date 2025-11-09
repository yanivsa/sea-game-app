import * as THREE from 'three'

export interface PlayerRig {
  group: THREE.Group
  arrow: THREE.Mesh
  paddle: THREE.Mesh
  body: THREE.Mesh
  board: THREE.Mesh
}

export const createPlayerRig = (): PlayerRig => {
  const group = new THREE.Group()

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.25, metalness: 0.4 }),
  )
  board.position.y = 0.08
  board.castShadow = true
  board.receiveShadow = true
  group.add(board)

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.9, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0xf4c7a1, roughness: 0.55 }),
  )
  body.position.y = 0.9
  body.castShadow = true
  group.add(body)

  const paddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
  )
  paddle.position.set(0.38, 0.6, -0.1)
  paddle.castShadow = true
  paddle.receiveShadow = true
  group.add(paddle)

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf2c744, emissiveIntensity: 0.85 }),
  )
  arrow.position.set(0, 1.3, -0.35)
  arrow.rotation.x = -Math.PI / 2
  arrow.name = 'playerArrow'
  group.add(arrow)

  return { group, arrow, paddle, body, board }
}
