import type * as THREE from 'three'

export type GameStatus = 'running' | 'paused' | 'game-over'

export type GameViewMode = 'flat' | 'angled'

export type GameInput = {
  axis: {
    x: number
    y: number
  }
  dash: boolean
  pausePressed: boolean
  restartPressed: boolean
}

export type GameStats = {
  status: GameStatus
  health: number
  kills: number
  time: number
  zombies: number
  weaponLevel: number
  weaponExperience: number
  weaponRequiredExperience: number
  mapId: string
  mapName: string
  requiredKills: number
  doorUnlocked: boolean
}

export type BulletSpawn = {
  position: THREE.Vector3
  direction: THREE.Vector3
  weaponLevel: number
  damage: number
  speed: number
}

export type DamageResult = {
  killed: boolean
}
