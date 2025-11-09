import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export interface PhysicsEntities {
  player: CANNON.Body
}

export class PhysicsWorld {
  world: CANNON.World
  entities: PhysicsEntities
  tmpVec = new CANNON.Vec3()

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.8, 0),
      allowSleep: true,
    })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.defaultContactMaterial.friction = 0.05
    this.world.defaultContactMaterial.restitution = 0.2

    const playerShape = new CANNON.Box(new CANNON.Vec3(0.3, 0.1, 0.7))
    const playerBody = new CANNON.Body({ mass: 5, shape: playerShape })
    playerBody.linearDamping = 0.7
    playerBody.angularDamping = 0.7
    this.world.addBody(playerBody)

    this.entities = { player: playerBody }
  }

  syncPlayer(target: THREE.Vector3, heading: THREE.Vector3) {
    const body = this.entities.player
    const desired = new CANNON.Vec3(target.x, target.y * 0.5 + 0.1, target.z)
    const force = desired.vsub(body.position).scale(20)
    body.applyForce(force, body.position)
    const forward = new CANNON.Vec3(heading.x, 0, heading.z)
    body.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), forward)
  }

  step(delta: number) {
    this.world.step(1 / 60, delta, 4)
  }
}
