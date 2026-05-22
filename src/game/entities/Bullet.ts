import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import { cloneBulletModel, loadBulletModels } from './BulletModelLoader'

export class Bullet {
  readonly mesh = new THREE.Group()
  readonly damage: number
  readonly radius = GAME_CONFIG.bulletRadius

  private readonly velocity = new THREE.Vector3()
  private readonly fallbackMesh: THREE.Mesh
  private lifetime = GAME_CONFIG.bulletLifetime

  constructor(position: THREE.Vector3, direction: THREE.Vector3, weaponLevel: number, damage: number, speed: number) {
    this.damage = damage

    const geometry = new THREE.SphereGeometry(this.radius, 14, 10)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff8c2a,
      emissiveIntensity: 0.55,
      roughness: 0.38,
      metalness: 0.12,
    })

    this.fallbackMesh = new THREE.Mesh(geometry, material)
    this.fallbackMesh.castShadow = true
    this.mesh.add(this.fallbackMesh)
    this.mesh.position.copy(position)
    this.velocity.copy(direction).normalize().multiplyScalar(speed)
    this.loadModel(direction, weaponLevel)
  }

  update(delta: number) {
    this.mesh.position.addScaledVector(this.velocity, delta)
    this.lifetime -= delta
  }

  get expired() {
    return this.lifetime <= 0
  }

  dispose() {
    this.mesh.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return

      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((item) => item.dispose())
      } else {
        object.material.dispose()
      }
    })
  }

  private loadModel(direction: THREE.Vector3, weaponLevel: number) {
    loadBulletModels()
      .then((asset) => {
        if (this.expired) return

        const model = cloneBulletModel(asset, direction, weaponLevel)
        this.fallbackMesh.visible = false
        this.mesh.add(model)
      })
      .catch((error: unknown) => {
        console.warn('Failed to load bullet model', error)
      })
  }
}
