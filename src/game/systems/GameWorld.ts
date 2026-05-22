import * as THREE from 'three'
import { GAME_CONFIG } from '../constants'
import { Bullet } from '../entities/Bullet'
import { Gun } from '../entities/Gun'
import { Player } from '../entities/Player'
import type { Zombie } from '../entities/Zombie'
import { createGroundMaterial } from '../map/EnvironmentMaterials'
import { MapManager } from '../map/MapManager'
import type { GameMapConfig } from '../map/types'
import type { GameInput, GameStats, GameStatus, GameViewMode } from '../types'
import { CollisionSystem } from './CollisionSystem'
import { DropSystem } from './DropSystem'
import { PhysicsWorld, type PhysicsBodyHandle } from './PhysicsWorld'
import { WeaponProgression } from './WeaponProgression'
import { ZombieSpawner } from './ZombieSpawner'

export class GameWorld {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80)
  readonly renderer: THREE.WebGLRenderer

  private readonly player = new Player()
  private readonly gun = new Gun(this.player)
  private readonly spawner = new ZombieSpawner()
  private readonly collision = new CollisionSystem()
  private readonly drops = new DropSystem()
  private readonly weaponProgression = new WeaponProgression()
  private readonly mapManager: MapManager
  private readonly bullets: Bullet[] = []
  private readonly zombies: Zombie[] = []
  private physics: PhysicsWorld | null = null
  private playerBody: PhysicsBodyHandle | null = null
  private readonly zombieBodies = new Map<Zombie, PhysicsBodyHandle>()
  private readonly mapBoundaryBodies: PhysicsBodyHandle[] = []
  private ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null
  private readonly physicsDebugGeometry = new THREE.BufferGeometry()
  private readonly physicsDebugLines = new THREE.LineSegments(
    this.physicsDebugGeometry,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthTest: false }),
  )
  private animationFrame = 0
  private elapsed = 0
  private kills = 0
  private status: GameStatus = 'running'
  private viewMode: GameViewMode = 'angled'
  private lastPausePressed = false
  private lastRestartPressed = false
  private lastDashPressed = false
  private lastFrameTime = 0
  private input: GameInput = {
    axis: { x: 0, y: 0 },
    dash: false,
    pausePressed: false,
    restartPressed: false,
  }
  private readonly container: HTMLElement
  private readonly onStats: (stats: GameStats) => void

  constructor(
    container: HTMLElement,
    onStats: (stats: GameStats) => void,
    maps: readonly GameMapConfig[],
  ) {
    this.container = container
    this.onStats = onStats
    this.mapManager = new MapManager(this.scene, maps)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.container.appendChild(this.renderer.domElement)
    this.physicsDebugLines.visible = GAME_CONFIG.showPhysicsDebug
    this.physicsDebugLines.renderOrder = 10
    this.player.group.position.fromArray(this.mapManager.activeMap.spawnPoint)

    this.setupScene()
    void this.setupPhysics()
    this.resize()
    this.emitStats()
  }

  start() {
    this.lastFrameTime = performance.now()
    this.loop()
  }

  setInput(input: GameInput) {
    this.input = input
  }

  setViewMode(viewMode: GameViewMode) {
    this.viewMode = viewMode
    this.updateCamera()
  }

  resize() {
    const { clientWidth, clientHeight } = this.container
    const width = Math.max(1, clientWidth)
    const height = Math.max(1, clientHeight)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame)
    this.bullets.forEach((bullet) => bullet.dispose())
    this.zombies.forEach((zombie) => zombie.dispose())
    this.zombieBodies.clear()
    this.mapManager.unloadMap(this.physics)
    this.mapBoundaryBodies.length = 0
    this.drops.clear()
    this.physics?.dispose()
    this.physicsDebugGeometry.dispose()
    const debugMaterial = this.physicsDebugLines.material
    if (Array.isArray(debugMaterial)) {
      debugMaterial.forEach((material) => material.dispose())
    } else {
      debugMaterial.dispose()
    }
    this.renderer.dispose()
    this.renderer.domElement.remove()

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
  }

  private loop = () => {
    const now = performance.now()
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = now

    this.update(delta)
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  private update(delta: number) {
    this.handleStateButtons()

    if (this.status === 'running') {
      this.elapsed += delta
      const playerTarget = this.updatePlayer(delta)
      this.updateZombies(delta, playerTarget)
      this.stepPhysics(delta)
      this.updateGun(delta)
      this.updateBullets(delta)
      this.drops.update(delta, this.player, this.weaponProgression)
      this.resolveCollisions()
      this.mapManager.updateDoorState(this.kills)
      this.updateCamera()
      this.updatePhysicsDebug()

      if (this.player.health <= 0) {
        this.status = 'game-over'
      }
    }

    this.emitStats()
  }

  private handleStateButtons() {
    if (this.input.pausePressed && !this.lastPausePressed && this.status !== 'game-over') {
      this.status = this.status === 'running' ? 'paused' : 'running'
    }

    if (this.input.restartPressed && !this.lastRestartPressed) {
      this.reset()
    }

    if (this.input.dash && !this.lastDashPressed && this.status === 'running') {
      this.tryEnterDoor()
    }

    this.lastPausePressed = this.input.pausePressed
    this.lastRestartPressed = this.input.restartPressed
    this.lastDashPressed = this.input.dash
  }

  private reset() {
    this.resetLevelProgress()
  }

  switchMap(mapId: string) {
    this.mapManager.loadMap(mapId, { physics: this.physics })
    this.updateGroundMaterial()
    this.resetLevelProgress()
  }

  private resetLevelProgress() {
    this.bullets.forEach((bullet) => {
      this.scene.remove(bullet.mesh)
      bullet.dispose()
    })
    this.zombies.forEach((zombie) => {
      this.scene.remove(zombie.group)
      zombie.dispose()
      this.removeZombiePhysicsBody(zombie)
    })
    this.bullets.length = 0
    this.zombies.length = 0
    this.drops.clear()
    this.elapsed = 0
    this.kills = 0
    this.status = 'running'
    this.player.reset()
    this.player.group.position.fromArray(this.mapManager.activeMap.spawnPoint)
    this.resetPlayerPhysicsBody()
    this.weaponProgression.reset()
    this.gun.setWeaponLevel(this.weaponProgression.level)
    this.spawner.reset()
    this.mapManager.updateDoorState(this.kills)
    this.updateCamera()
  }

  private tryEnterDoor() {
    const door = this.mapManager.findEnterableDoor(this.player.group.position, this.kills)
    if (!door) return

    this.mapManager.loadMap(door.targetMapId, { physics: this.physics })
    this.updateGroundMaterial()
    this.resetLevelProgress()
  }

  private updateGun(delta: number) {
    this.gun.setWeaponLevel(this.weaponProgression.level)
    const spawn = this.gun.update(delta, this.zombies)
    if (!spawn) return

    const bullet = new Bullet(spawn.position, spawn.direction, spawn.weaponLevel, spawn.damage, spawn.speed)
    this.bullets.push(bullet)
    this.scene.add(bullet.mesh)
  }

  private updatePlayer(delta: number) {
    const nextPosition = this.player.update(delta, this.input)

    if (!this.physics || !this.playerBody) {
      this.player.group.position.copy(nextPosition)
      return nextPosition
    }

    // 玩家最终位置以物理世界为准，后续地图/障碍物 collider 会在这里阻挡位移。
    this.physics.moveKinematicBody(this.playerBody, nextPosition)
    return nextPosition
  }

  private updateBullets(delta: number) {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index]
      bullet.update(delta)

      if (!bullet.expired) continue

      this.scene.remove(bullet.mesh)
      bullet.dispose()
      this.bullets.splice(index, 1)
    }
  }

  private updateZombies(delta: number, playerTarget: THREE.Vector3) {
    const zombie = this.spawner.update(delta, this.elapsed, this.weaponProgression.level, this.zombies.length)
    if (zombie) {
      this.zombies.push(zombie)
      this.scene.add(zombie.group)
      this.createZombiePhysicsBody(zombie)
    }

    for (const item of this.zombies) {
      const nextPosition = item.update(delta, playerTarget)
      const body = this.zombieBodies.get(item)

      if (!this.physics || !body) {
        item.group.position.copy(nextPosition)
        continue
      }

      this.physics.moveKinematicBody(body, nextPosition)
    }
  }

  private stepPhysics(delta: number) {
    if (!this.physics) return

    this.physics.step(delta)
    if (this.playerBody) this.physics.syncObject(this.playerBody, this.player.group)

    for (const zombie of this.zombies) {
      const body = this.zombieBodies.get(zombie)
      if (body) this.physics.syncObject(body, zombie.group)
    }
  }

  private resolveCollisions() {
    const { removedBullets, killedZombies } = this.collision.resolveBulletHits(this.bullets, this.zombies)

    for (const bullet of removedBullets) {
      const index = this.bullets.indexOf(bullet)
      if (index >= 0) this.bullets.splice(index, 1)
      this.scene.remove(bullet.mesh)
      bullet.dispose()
    }

    for (const zombie of killedZombies) {
      const index = this.zombies.indexOf(zombie)
      if (index >= 0) this.zombies.splice(index, 1)
      this.scene.remove(zombie.group)
      this.removeZombiePhysicsBody(zombie)
      zombie.dispose()
      this.kills += 1

      // 击杀只负责生成掉落物；武器升级必须通过拾取弹匣获得经验完成。
      const drop = this.drops.tryDrop(zombie.group.position)
      if (drop) this.scene.add(drop.group)
    }

    this.collision.resolvePlayerDamage(this.player, this.zombies)
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x11151b)
    this.scene.fog = new THREE.Fog(0x11151b, 17, 34)

    const hemiLight = new THREE.HemisphereLight(0xdde8ff, 0x253018, 1.6)
    this.scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
    keyLight.position.set(5, 10, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -16
    keyLight.shadow.camera.right = 16
    keyLight.shadow.camera.top = 16
    keyLight.shadow.camera.bottom = -16
    this.scene.add(keyLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GAME_CONFIG.mapRadius * 2, GAME_CONFIG.mapRadius * 2, 24, 24),
      createGroundMaterial(this.mapManager.activeMap.groundMaterial),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.ground = ground
    this.scene.add(ground)

    const grid = new THREE.GridHelper(GAME_CONFIG.mapRadius * 2, 24, 0x5d674e, 0x454d3e)
    grid.position.y = 0.012
    this.scene.add(grid)

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(GAME_CONFIG.mapRadius * 2, 0.3, GAME_CONFIG.mapRadius * 2)),
      new THREE.LineBasicMaterial({ color: 0xb7c27b }),
    )
    border.position.y = 0.15
    this.scene.add(border)

    this.mapManager.loadMap(this.mapManager.activeMap.id)
    this.updateGroundMaterial()
    this.scene.add(this.player.group)
    this.scene.add(this.physicsDebugLines)
    this.updateCamera()
  }

  private async setupPhysics() {
    this.physics = await PhysicsWorld.init()
    this.createMapBoundaryBodies()
    this.mapManager.createMapColliders(this.physics)
    this.resetPlayerPhysicsBody()
    this.zombies.forEach((zombie) => this.createZombiePhysicsBody(zombie))
  }

  private resetPlayerPhysicsBody() {
    if (!this.physics) return

    if (this.playerBody) {
      this.physics.removeBody(this.playerBody)
    }

    this.playerBody = this.physics.createPlayerBody(this.player.group.position)
    this.physics.syncObject(this.playerBody, this.player.group)
  }

  private createMapBoundaryBodies() {
    if (!this.physics || this.mapBoundaryBodies.length > 0) return

    const radius = GAME_CONFIG.mapRadius
    const wallThickness = 0.55
    const wallHeight = 1.6
    const wallLength = radius * 2 + wallThickness * 2

    // 四条静态墙放在视觉边界外侧，角色胶囊体会在地图边缘前被挡住。
    const configs = [
      { position: [0, wallHeight / 2, -radius - wallThickness / 2], size: [wallLength, wallHeight, wallThickness] },
      { position: [0, wallHeight / 2, radius + wallThickness / 2], size: [wallLength, wallHeight, wallThickness] },
      { position: [-radius - wallThickness / 2, wallHeight / 2, 0], size: [wallThickness, wallHeight, wallLength] },
      { position: [radius + wallThickness / 2, wallHeight / 2, 0], size: [wallThickness, wallHeight, wallLength] },
    ] as const

    for (const config of configs) {
      this.mapBoundaryBodies.push(this.physics.createStaticBoxCollider(config))
    }
  }

  private updatePhysicsDebug() {
    if (!GAME_CONFIG.showPhysicsDebug || !this.physics) return

    const buffers = this.physics.getDebugRenderBuffers()
    this.physicsDebugGeometry.setAttribute('position', new THREE.BufferAttribute(buffers.vertices, 3))
    this.physicsDebugGeometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 4))
    this.physicsDebugGeometry.computeBoundingSphere()
  }

  private updateGroundMaterial() {
    if (!this.ground) return

    const previousMaterial = this.ground.material
    this.ground.material = createGroundMaterial(this.mapManager.activeMap.groundMaterial)
    previousMaterial.map?.dispose()
    previousMaterial.dispose()
  }

  private createZombiePhysicsBody(zombie: Zombie) {
    if (!this.physics || this.zombieBodies.has(zombie)) return

    const body = this.physics.createZombieBody(zombie.group.position, zombie.radius)
    this.zombieBodies.set(zombie, body)
    this.physics.syncObject(body, zombie.group)
  }

  private removeZombiePhysicsBody(zombie: Zombie) {
    const body = this.zombieBodies.get(zombie)
    if (!this.physics || !body) return

    this.physics.removeBody(body)
    this.zombieBodies.delete(zombie)
  }

  private updateCamera() {
    const target = this.player.group.position

    if (this.viewMode === 'flat') {
      this.camera.fov = 38
      this.camera.position.set(target.x, 17.5, target.z + 0.12)
      this.camera.lookAt(target.x, 0, target.z)
    } else {
      this.camera.fov = 48
      this.camera.position.set(target.x, GAME_CONFIG.cameraHeight, target.z + GAME_CONFIG.cameraDepth)
      this.camera.lookAt(target.x, 0.4, target.z)
    }

    this.camera.updateProjectionMatrix()
  }

  private emitStats() {
    this.onStats({
      status: this.status,
      health: this.player.health,
      kills: this.kills,
      time: this.elapsed,
      zombies: this.zombies.length,
      weaponLevel: this.weaponProgression.level,
      weaponExperience: this.weaponProgression.experience,
      weaponRequiredExperience: this.weaponProgression.requiredExperience,
      mapId: this.mapManager.activeMap.id,
      mapName: this.mapManager.activeMap.name,
      requiredKills: this.mapManager.activeMap.requiredKills,
      doorUnlocked: this.mapManager.isCleared(this.kills),
    })
  }
}
