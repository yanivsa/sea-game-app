import * as THREE from 'three'

export class CameraRig {
  public camera: THREE.PerspectiveCamera
  public target = new THREE.Vector3()
  private offset = new THREE.Vector3(-6, 4, -6)
  private smoothing = 0.1

  constructor(fov: number, aspect: number, near = 0.1, far = 800) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera.position.set(0, 5, -8)
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  update(delta: number, playerPos: THREE.Vector3, direction: THREE.Vector3, bob = 0) {
    const desiredPos = new THREE.Vector3()
      .copy(playerPos)
      .add(direction.clone().multiplyScalar(this.offset.z))
      .add(new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(this.offset.x))
      .add(new THREE.Vector3(0, this.offset.y + bob, 0))

    this.camera.position.lerp(desiredPos, 1 - Math.pow(1 - this.smoothing, delta * 0.06))
    this.target.copy(playerPos).add(new THREE.Vector3(0, 1.2 + bob, 0))
    this.camera.lookAt(this.target)
  }

  setOffset(offset: { x?: number; y?: number; z?: number }) {
    if (offset.x !== undefined) this.offset.x = offset.x
    if (offset.y !== undefined) this.offset.y = offset.y
    if (offset.z !== undefined) this.offset.z = offset.z
  }

  setSmoothing(value: number) {
    this.smoothing = value
  }
}
