import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import { length2D, normalizeAxis } from '../math'
import type { GameInput } from '../types'
import { clonePlayerModel, loadPlayerModel } from './PlayerModelLoader'

export class Player {
  readonly group = new THREE.Group()
  readonly gunMount = new THREE.Group()
  readonly radius = GAME_CONFIG.playerRadius

  health: number = GAME_CONFIG.playerHealth

  private dashTimer = 0
  private dashCooldown = 0
  private fallbackModel = new THREE.Group()
  private model: THREE.Object3D | null = null
  private mixer: THREE.AnimationMixer | null = null
  private idleAction: THREE.AnimationAction | null = null
  private runAction: THREE.AnimationAction | null = null
  private activeAction: THREE.AnimationAction | null = null
  private modelLoadId = 0

  constructor() {
    this.createFallbackModel()
    this.loadModel()
  }

  update(delta: number, input: GameInput) {
    this.dashTimer = Math.max(0, this.dashTimer - delta)
    this.dashCooldown = Math.max(0, this.dashCooldown - delta)

    const x = normalizeAxis(input.axis.x)
    const z = normalizeAxis(input.axis.y)
    const length = length2D(x, z)

    if (input.dash && length > 0.1 && this.dashCooldown <= 0) {
      this.dashTimer = GAME_CONFIG.dashDuration
      this.dashCooldown = GAME_CONFIG.dashCooldown
    }

    if (length <= 0.06) {
      this.playAction(this.idleAction)
      this.mixer?.update(delta)
      return this.group.position.clone()
    }

    const direction = new THREE.Vector3(x / length, 0, z / length)
    const speed = this.dashTimer > 0 ? GAME_CONFIG.playerDashSpeed : GAME_CONFIG.playerSpeed
    const nextPosition = this.group.position.clone().addScaledVector(direction, speed * delta)
    this.group.rotation.y = Math.atan2(direction.x, direction.z)
    this.playAction(this.runAction)
    this.mixer?.update(delta)

    return nextPosition
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount)
  }

  heal(amount: number) {
    this.health = Math.min(GAME_CONFIG.playerHealth, this.health + amount)
  }

  reset() {
    this.health = GAME_CONFIG.playerHealth
    this.group.position.set(0, 0, 0)
    this.group.rotation.set(0, 0, 0)
    this.dashTimer = 0
    this.dashCooldown = 0
    this.loadModel()
  }

  private createFallbackModel() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f5f8b,
      roughness: 0.55,
      metalness: 0.08,
    })
    const armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x182331,
      roughness: 0.45,
      metalness: 0.22,
    })
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0a17b,
      roughness: 0.62,
    })

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.08, 16), bodyMaterial)
    body.position.y = 0.62
    body.castShadow = true
    body.receiveShadow = true

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.54, 0.28), armorMaterial)
    vest.position.set(0, 0.8, 0.12)
    vest.castShadow = true

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 12), skinMaterial)
    head.position.y = 1.32
    head.castShadow = true

    this.setFrontGunMount()

    this.fallbackModel.add(body, vest, head)
    this.group.add(this.fallbackModel, this.gunMount)
  }

  private loadModel() {
    const loadId = ++this.modelLoadId

    loadPlayerModel()
      .then((asset) => {
        if (loadId !== this.modelLoadId) return

        this.mixer?.stopAllAction()
        if (this.model) this.group.remove(this.model)

        const instance = clonePlayerModel(asset)
        this.model = instance.model
        this.fallbackModel.visible = false
        this.group.add(instance.model)
        this.group.add(this.gunMount)
        this.setFrontGunMount()

        this.mixer = new THREE.AnimationMixer(instance.model)
        this.idleAction = asset.idleClip ? this.mixer.clipAction(asset.idleClip) : null
        this.runAction = asset.runClip ? this.mixer.clipAction(asset.runClip) : null
        this.playAction(this.idleAction)
      })
      .catch((error: unknown) => {
        console.warn('Failed to load player model', error)
        this.fallbackModel.visible = true
        this.group.add(this.gunMount)
        this.setFrontGunMount()
      })
  }

  private setFrontGunMount() {
    this.gunMount.position.set(0, 0.9, 0.5)
    this.gunMount.rotation.set(0, 0, 0)
    this.gunMount.scale.setScalar(1)
  }

  private playAction(nextAction: THREE.AnimationAction | null) {
    if (!nextAction || nextAction === this.activeAction) return

    nextAction.reset().fadeIn(0.12).play()
    this.activeAction?.fadeOut(0.12)
    this.activeAction = nextAction
  }
}
