import { GAME_CONFIG } from '../constants'
import { distance2D } from '../math'
import type { Bullet } from '../entities/Bullet'
import type { Player } from '../entities/Player'
import type { Zombie } from '../entities/Zombie'

export class CollisionSystem {
  resolveBulletHits(bullets: Bullet[], zombies: Zombie[]) {
    const removedBullets = new Set<Bullet>()
    const killedZombies = new Set<Zombie>()

    // 子弹速度高，暂时用 2D 距离检测避免刚体碰撞穿透和事件队列复杂度。
    for (const bullet of bullets) {
      for (const zombie of zombies) {
        if (removedBullets.has(bullet) || killedZombies.has(zombie)) continue

        const hitDistance = bullet.radius + zombie.radius
        if (distance2D(bullet.mesh.position, zombie.group.position) > hitDistance) continue

        removedBullets.add(bullet)
        const result = zombie.takeDamage(bullet.damage)
        if (result.killed) killedZombies.add(zombie)
      }
    }

    return { removedBullets, killedZombies }
  }

  resolvePlayerDamage(player: Player, zombies: Zombie[]) {
    for (const zombie of zombies) {
      // Rapier 会把两个角色胶囊体挡在“刚好不重叠”的位置，伤害判定需要一点余量来表达贴身接触。
      const touchDistance = player.radius + zombie.radius + GAME_CONFIG.zombieContactPadding
      if (distance2D(player.group.position, zombie.group.position) > touchDistance) continue
      if (!zombie.canDamagePlayer()) continue

      player.takeDamage(GAME_CONFIG.zombieContactDamage)
      zombie.markDamagedPlayer()
    }
  }
}
