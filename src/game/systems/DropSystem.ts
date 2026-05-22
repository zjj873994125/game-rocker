import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import { DropItem } from '../entities/DropItem'
import type { Player } from '../entities/Player'
import { distance2D } from '../math'
import type { WeaponProgression } from './WeaponProgression'

export class DropSystem {
  readonly items: DropItem[] = []

  tryDrop(position: THREE.Vector3) {
    if (Math.random() > GAME_CONFIG.dropChance) return null

    const type = Math.random() < GAME_CONFIG.magazineDropRatio ? 'magazine' : 'medkit'
    const item = new DropItem(type, position.clone())
    this.items.push(item)

    return item
  }

  update(delta: number, player: Player, weaponProgression: WeaponProgression) {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index]
      item.update(delta)

      // 掉落物只需要拾取范围，不需要参与 Rapier 刚体模拟。
      if (distance2D(player.group.position, item.group.position) > GAME_CONFIG.dropPickupRadius) continue

      this.applyPickup(item, player, weaponProgression)
      this.items.splice(index, 1)
      item.group.removeFromParent()
      item.dispose()
    }
  }

  clear() {
    this.items.forEach((item) => {
      item.group.removeFromParent()
      item.dispose()
    })
    this.items.length = 0
  }

  private applyPickup(item: DropItem, player: Player, weaponProgression: WeaponProgression) {
    if (item.type === 'magazine') {
      weaponProgression.addExperience(GAME_CONFIG.magazineExperience)
      return
    }

    player.heal(GAME_CONFIG.medkitHeal)
  }
}
