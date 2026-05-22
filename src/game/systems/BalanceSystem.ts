import { GAME_CONFIG } from '../constants'

export function getWeaponStats(weaponLevel: number) {
  const levelOffset = Math.max(0, Math.floor(weaponLevel) - 1)

  return {
    damage: GAME_CONFIG.bulletDamage + levelOffset * 2,
    fireInterval: Math.max(0.35, GAME_CONFIG.fireInterval - levelOffset * 0.018),
    bulletSpeed: GAME_CONFIG.bulletSpeed + levelOffset * 0.18,
  }
}

export function getZombieStats(elapsed: number, weaponLevel: number) {
  const elapsedMinutes = elapsed / 60

  // 僵尸强度同时参考时间和武器等级，避免玩家升级后场面压力完全失衡。
  return {
    health: Math.min(260, GAME_CONFIG.zombieHealth + elapsedMinutes * 18 + weaponLevel * 5),
    speed: Math.min(2.1, GAME_CONFIG.zombieSpeed + elapsedMinutes * 0.08),
  }
}
