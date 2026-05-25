import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import { getWeaponStats } from '../systems/BalanceSystem'
import type { BulletSpawn } from '../types'
import { cloneGunModel, loadGunModels } from './GunModelLoader'
import type { Player } from './Player'
import type { Zombie } from './Zombie'

export class Gun {
  readonly group = new THREE.Group()

  private cooldown = 0
  private readonly fallbackModel = new THREE.Group()
  private readonly player: Player
  private model: THREE.Object3D | null = null
  private modelLoadId = 0
  private weaponLevel = 1

  constructor(player: Player) {
    this.player = player

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.32, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x18191d, roughness: 0.42, metalness: 0.55 }),
    )
    grip.position.set(0.12, -0.12, 0.1)
    grip.rotation.x = -0.36
    grip.castShadow = true

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.35, metalness: 0.68 }),
    )
    body.position.z = 0.26
    body.castShadow = true

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.52, 12),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.28, metalness: 0.82 }),
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = 0.72
    barrel.castShadow = true

    this.fallbackModel.add(grip, body, barrel)
    this.group.add(this.fallbackModel)
    this.player.gunMount.add(this.group)
    this.loadModel(this.weaponLevel)
  }

  setWeaponLevel(level: number) {
    const nextLevel = THREE.MathUtils.clamp(Math.floor(level), 1, GAME_CONFIG.maxWeaponLevel)
    if (nextLevel === this.weaponLevel) return

    this.weaponLevel = nextLevel
    this.loadModel(nextLevel)
  }

  update(delta: number, zombies: Zombie[]): BulletSpawn | null {
    this.cooldown = Math.max(0, this.cooldown - delta)

    const target = this.findNearestZombie(zombies)
    if (!target) return null

    const playerPosition = this.player.group.position
    const direction = new THREE.Vector3().subVectors(target.group.position, playerPosition)
    direction.y = 0

    if (direction.lengthSq() <= 0.001) return null

    direction.normalize()
    this.player.group.rotation.y = Math.atan2(direction.x, direction.z)

    if (this.cooldown > 0) return null

    const stats = getWeaponStats(this.weaponLevel)
    this.cooldown = stats.fireInterval

    return {
      position: playerPosition
        .clone()
        .add(new THREE.Vector3(direction.x * GAME_CONFIG.bulletSpawnForward, GAME_CONFIG.bulletSpawnHeight, direction.z * GAME_CONFIG.bulletSpawnForward)),
      direction,
      weaponLevel: this.weaponLevel,
      damage: stats.damage,
      speed: stats.bulletSpeed,
    }
  }

  private findNearestZombie(zombies: Zombie[]) {
    let nearest: Zombie | null = null
    let nearestDistance = Infinity
    const playerPosition = this.player.group.position

    for (const zombie of zombies) {
      const distance = playerPosition.distanceToSquared(zombie.group.position)
      if (distance < nearestDistance) {
        nearest = zombie
        nearestDistance = distance
      }
    }

    return nearest
  }

  private loadModel(weaponLevel: number) {
    const loadId = ++this.modelLoadId

    loadGunModels()
      .then((asset) => {
        if (loadId !== this.modelLoadId) return

        if (this.model) {
          this.group.remove(this.model)
          disposeObject(this.model)
        }

        const model = cloneGunModel(asset, weaponLevel)
        this.model = model
        this.fallbackModel.visible = false
        this.group.add(model)
      })
      .catch((error: unknown) => {
        console.warn('Failed to load gun model', error)
      })
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((item) => {
    if (!(item instanceof THREE.Mesh)) return

    item.geometry.dispose()
    if (Array.isArray(item.material)) {
      item.material.forEach((material) => material.dispose())
    } else {
      item.material.dispose()
    }
  })
}
