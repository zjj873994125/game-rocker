import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import type { DamageResult } from '../types'
import { cloneZombieModel, loadZombieModel } from './ZombieModelLoader'

export class Zombie {
  readonly group = new THREE.Group()
  readonly radius = GAME_CONFIG.zombieRadius

  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x486b3d,
    roughness: 0.78,
    metalness: 0.04,
  })
  private readonly headMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f8064,
    roughness: 0.82,
  })
  private readonly healthFill: THREE.Mesh
  private readonly healthBack: THREE.Mesh
  private readonly healthBarGroup = new THREE.Group()
  private readonly maxHealth: number
  private readonly speed: number
  private health: number
  private hitFlash = 0
  private contactTimer = 0
  private model: THREE.Object3D | null = null
  private mixer: THREE.AnimationMixer | null = null

  constructor(position: THREE.Vector3, health: number = GAME_CONFIG.zombieHealth, speed: number = GAME_CONFIG.zombieSpeed) {
    this.maxHealth = health
    this.health = health
    this.speed = speed
    this.group.position.copy(position)

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.45, 1.05, 10), this.bodyMaterial)
    body.position.y = 0.58
    body.castShadow = true
    body.receiveShadow = true

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), this.headMaterial)
    head.position.y = 1.27
    head.castShadow = true

    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.18, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x33452f, roughness: 0.8 }),
    )
    shoulder.position.y = 0.96
    shoulder.castShadow = true

    this.healthBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.055, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x2b1518 }),
    )

    this.healthFill = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.065, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xd83b3b }),
    )
    this.healthFill.position.set(0, 0.005, 0.01)
    this.healthBarGroup.position.set(0, 1.72, 0)
    this.healthBarGroup.add(this.healthBack, this.healthFill)

    this.group.add(body, head, shoulder, this.healthBarGroup)
    this.loadModel()
  }

  update(delta: number, target: THREE.Vector3) {
    const direction = new THREE.Vector3().subVectors(target, this.group.position)
    direction.y = 0
    const nextPosition = this.group.position.clone()

    if (direction.lengthSq() > 0.001) {
      direction.normalize()
      nextPosition.addScaledVector(direction, this.speed * delta)
      this.group.rotation.y = Math.atan2(direction.x, direction.z)
    }

    this.contactTimer = Math.max(0, this.contactTimer - delta)
    this.hitFlash = Math.max(0, this.hitFlash - delta)
    this.bodyMaterial.color.setHex(this.hitFlash > 0 ? 0x9b3333 : 0x486b3d)
    this.mixer?.update(delta)

    return nextPosition
  }

  takeDamage(amount: number): DamageResult {
    this.health = Math.max(0, this.health - amount)
    this.hitFlash = 0.12
    this.healthFill.scale.x = this.health / this.maxHealth
    this.healthFill.position.x = -0.35 * (1 - this.healthFill.scale.x)

    return { killed: this.health <= 0 }
  }

  canDamagePlayer() {
    return this.contactTimer <= 0
  }

  markDamagedPlayer() {
    this.contactTimer = GAME_CONFIG.zombieContactInterval
  }

  dispose() {
    this.mixer?.stopAllAction()
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return

      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
  }

  private loadModel() {
    loadZombieModel()
      .then((asset) => {
        const model = cloneZombieModel(asset)
        this.model = model
        this.group.add(model)
        this.healthBarGroup.position.y = asset.height + 0.22
        this.hidePlaceholder()

        if (asset.runClip) {
          this.mixer = new THREE.AnimationMixer(model)
          this.mixer.clipAction(asset.runClip).reset().play()
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load zombie model', error)
      })
  }

  private hidePlaceholder() {
    for (const child of this.group.children) {
      if (child === this.model || child === this.healthBarGroup) continue
      child.visible = false
    }
  }
}
