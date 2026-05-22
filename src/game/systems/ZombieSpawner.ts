import { GAME_CONFIG } from '../constants'
import { Zombie } from '../entities/Zombie'
import * as THREE from 'three'
import { getZombieStats } from './BalanceSystem'

export class ZombieSpawner {
  private timer = 0.4

  update(delta: number, elapsed: number, weaponLevel: number, zombieCount: number) {
    this.timer -= delta
    if (this.timer > 0) return null

    if (zombieCount >= GAME_CONFIG.maxZombies) {
      this.timer = 0.25
      return null
    }

    const elapsedMinutes = elapsed / 60
    const interval = Math.max(
      GAME_CONFIG.zombieMinSpawnInterval,
      GAME_CONFIG.zombieSpawnInterval - elapsedMinutes * 0.16,
    )
    this.timer = interval

    const angle = Math.random() * Math.PI * 2
    const radius = 6 + Math.random() * 2
    const stats = getZombieStats(elapsed, weaponLevel)

    return new Zombie(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius), stats.health, stats.speed)
  }

  reset() {
    this.timer = 0.4
  }
}
