import { GAME_CONFIG } from '../constants'

export class WeaponProgression {
  level = 1
  experience = 0

  get requiredExperience() {
    return getRequiredExperience(this.level)
  }

  addExperience(amount: number) {
    if (this.level >= GAME_CONFIG.maxWeaponLevel) return

    this.experience += amount

    while (this.level < GAME_CONFIG.maxWeaponLevel && this.experience >= this.requiredExperience) {
      this.experience -= this.requiredExperience
      this.level += 1
    }

    if (this.level >= GAME_CONFIG.maxWeaponLevel) {
      this.experience = 0
    }
  }

  reset() {
    this.level = 1
    this.experience = 0
  }
}

export function getRequiredExperience(level: number) {
  return Math.min(GAME_CONFIG.maxWeaponLevel + 1, Math.max(1, Math.floor(level)) + 2)
}
