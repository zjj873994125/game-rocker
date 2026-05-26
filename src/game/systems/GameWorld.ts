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

const DARK_MARKET_MAP_ID = 'mini-market-store'

const DEFAULT_LIGHTING = {
  background: 0x11151b,
  fogNear: 17,
  fogFar: 34,
  ambientIntensity: 1.6,
  keyIntensity: 2.4,
} as const

const DARK_MARKET_LIGHTING = {
  background: 0x020304,
  fogNear: 11,
  fogFar: 24,
  ambientIntensity: 0.02,
  keyIntensity: 0.12,
} as const

const FLASHLIGHT_BEAM = {
  length: 4,
  width: 2.6,
  nearWidth: 0.58,
  startOffset: 0.28,
  floorHeight: 0.11,
} as const

export class GameWorld {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80)
  readonly renderer: THREE.WebGLRenderer

  private readonly raycaster = new THREE.Raycaster()
  private readonly pointerNdc = new THREE.Vector2()
  private readonly aimGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private readonly aimPoint = new THREE.Vector3()
  private readonly laserSight = this.createLaserSight()
  private readonly flashlight = new THREE.SpotLight(0xfff0c0, 42, 5, Math.PI / 4.2, 0.9, 0.95)
  private readonly flashlightTarget = new THREE.Object3D()
  private readonly playerFillLight = new THREE.PointLight(0xffe6aa, 2.6, 4.6, 1.2)
  private readonly flashlightBeam = this.createFlashlightBeam()
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
  private ambientLight: THREE.HemisphereLight | null = null
  private keyLight: THREE.DirectionalLight | null = null
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
  private hasPointerAim = false
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
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerAim)
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerAim)
    this.physicsDebugLines.visible = GAME_CONFIG.showPhysicsDebug
    this.physicsDebugLines.renderOrder = 10
    this.player.group.position.fromArray(this.mapManager.activeMap.spawnPoint)
    this.updateDefaultAimPoint()

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
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerAim)
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerAim)
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
      this.updateFlashlight()
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
    this.updateMapLightingMode()
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
    this.hasPointerAim = false
    this.updateDefaultAimPoint()
    this.resetPlayerPhysicsBody()
    this.weaponProgression.reset()
    this.gun.setWeaponLevel(this.weaponProgression.level)
    this.gun.resetMagazine()
    this.spawner.reset()
    this.mapManager.updateDoorState(this.kills)
    this.updateCamera()
    this.updateFlashlight()
  }

  private tryEnterDoor() {
    const door = this.mapManager.findEnterableDoor(this.player.group.position, this.kills)
    if (!door) return

    this.mapManager.loadMap(door.targetMapId, { physics: this.physics })
    this.updateGroundMaterial()
    this.updateMapLightingMode()
    this.resetLevelProgress()
  }

  private updateGun(delta: number) {
    this.gun.updateState(delta)
    this.gun.setWeaponLevel(this.weaponProgression.level)
    if (this.hasPointerAim) {
      this.updateAimPointFromPointer()
    } else {
      this.updateDefaultAimPoint()
    }
    this.player.updateReloadLabel(this.gun.getAmmoState())
    const spawn = this.gun.update(this.aimPoint)
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
    this.scene.background = new THREE.Color(DEFAULT_LIGHTING.background)
    this.scene.fog = new THREE.Fog(DEFAULT_LIGHTING.background, DEFAULT_LIGHTING.fogNear, DEFAULT_LIGHTING.fogFar)

    const hemiLight = new THREE.HemisphereLight(0xdde8ff, 0x253018, DEFAULT_LIGHTING.ambientIntensity)
    this.ambientLight = hemiLight
    this.scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, DEFAULT_LIGHTING.keyIntensity)
    keyLight.position.set(5, 10, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -16
    keyLight.shadow.camera.right = 16
    keyLight.shadow.camera.top = 16
    keyLight.shadow.camera.bottom = -16
    this.keyLight = keyLight
    this.scene.add(keyLight)

    this.flashlight.castShadow = true
    this.flashlight.shadow.mapSize.set(1024, 1024)
    this.flashlight.shadow.camera.near = 0.2
    this.flashlight.shadow.camera.far = 12
    this.flashlight.shadow.camera.fov = 46
    this.flashlight.visible = false
    this.flashlight.target = this.flashlightTarget
    this.playerFillLight.visible = false
    this.scene.add(this.flashlight, this.flashlightTarget, this.playerFillLight, this.flashlightBeam)

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
    this.scene.add(this.laserSight)

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
    this.updateMapLightingMode()
    this.updateCamera()
    this.updateLaserSight()
  }

  private updateMapLightingMode() {
    const lighting = this.isDarkMarketMap() ? DARK_MARKET_LIGHTING : DEFAULT_LIGHTING
    this.scene.background = new THREE.Color(lighting.background)
    this.scene.fog = new THREE.Fog(lighting.background, lighting.fogNear, lighting.fogFar)

    if (this.ambientLight) this.ambientLight.intensity = lighting.ambientIntensity
    if (this.keyLight) this.keyLight.intensity = lighting.keyIntensity

    // 便利店是室内关卡，用低环境光和玩家前方聚光灯制造手电筒视野。
    this.flashlight.visible = this.isDarkMarketMap()
    this.playerFillLight.visible = this.flashlight.visible
    this.flashlightBeam.visible = this.flashlight.visible
    this.updateFlashlight()
  }

  private isDarkMarketMap() {
    return this.mapManager.activeMap.id === DARK_MARKET_MAP_ID
  }

  private updateFlashlight() {
    if (!this.flashlight.visible) return

    const rotation = this.player.group.rotation.y
    const forward = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation))
    const playerPosition = this.player.group.position

    this.flashlight.position
      .copy(playerPosition)
      .add(new THREE.Vector3(0, 1.45, 0))
      .addScaledVector(forward, 0.72)
    this.flashlightTarget.position
      .copy(playerPosition)
      .add(new THREE.Vector3(0, 0.38, 0))
      .addScaledVector(forward, 6.4)
    this.playerFillLight.position
      .copy(playerPosition)
      .add(new THREE.Vector3(0, 1.05, 0))
      .addScaledVector(forward, 0.42)
    this.flashlightBeam.position
      .copy(playerPosition)
      .add(new THREE.Vector3(0, FLASHLIGHT_BEAM.floorHeight, 0))
      .addScaledVector(forward, FLASHLIGHT_BEAM.startOffset)
    this.flashlightBeam.rotation.set(0, rotation, 0)
  }

  private createFlashlightBeam() {
    const { length, width, nearWidth } = FLASHLIGHT_BEAM
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -nearWidth / 2, 0, 0,
      -width / 2, 0, length,
      width / 2, 0, length,
      nearWidth / 2, 0, 0,
    ]), 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
      0.45, 0,
      0, 1,
      1, 1,
      0.55, 0,
    ]), 2))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    geometry.computeVertexNormals()

    const texture = this.createFlashlightBeamTexture()
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)

    // 光锥用于表现手电筒照射范围，不参与碰撞和命中计算。
    mesh.visible = false
    mesh.renderOrder = 8

    return mesh
  }

  private createFlashlightBeamTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is not available.')
    }

    const gradient = context.createLinearGradient(0, canvas.height, 0, 0)
    gradient.addColorStop(0, 'rgba(255, 244, 188, 0.9)')
    gradient.addColorStop(0.38, 'rgba(255, 226, 132, 0.54)')
    gradient.addColorStop(0.72, 'rgba(255, 214, 112, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 214, 112, 0)')

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.beginPath()
    context.moveTo(canvas.width * 0.48, canvas.height)
    context.quadraticCurveTo(canvas.width * 0.14, canvas.height * 0.5, 0, 0)
    context.lineTo(canvas.width, 0)
    context.quadraticCurveTo(canvas.width * 0.86, canvas.height * 0.5, canvas.width * 0.52, canvas.height)
    context.closePath()
    context.fillStyle = gradient
    context.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true

    return texture
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
    this.updateLaserSight()
  }

  private handlePointerAim = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)

    this.pointerNdc.set(
      ((event.clientX - rect.left) / width) * 2 - 1,
      -(((event.clientY - rect.top) / height) * 2 - 1),
    )
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)

    this.hasPointerAim = true
    this.updateAimPointFromPointer()
  }

  private updateAimPointFromPointer() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)

    const hit = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.aimGroundPlane, hit)) return

    this.aimPoint.set(hit.x, 0, hit.z)
    this.updateLaserSight()
  }

  private updateDefaultAimPoint() {
    const rotation = this.player.group.rotation.y
    this.aimPoint
      .copy(this.player.group.position)
      .add(new THREE.Vector3(Math.sin(rotation) * 3, 0, Math.cos(rotation) * 3))
    this.updateLaserSight()
  }

  private createLaserSight() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))

    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xff2424, transparent: true, opacity: 0.82, depthTest: false }),
    )

    // 红外线只是世界空间方向提示，不参与物理、命中或地图射线选择。
    line.renderOrder = 9

    return line
  }

  private updateLaserSight() {
    const positions = this.laserSight.geometry.getAttribute('position') as THREE.BufferAttribute
    const origin = this.player.group.position
    const direction = new THREE.Vector3().subVectors(this.aimPoint, origin)

    if (direction.lengthSq() <= 0.001) return

    direction.normalize()
    positions.setXYZ(0, origin.x + direction.x * GAME_CONFIG.bulletSpawnForward, GAME_CONFIG.bulletSpawnHeight, origin.z + direction.z * GAME_CONFIG.bulletSpawnForward)
    positions.setXYZ(1, this.aimPoint.x, 0.06, this.aimPoint.z)
    positions.needsUpdate = true
    this.laserSight.geometry.computeBoundingSphere()
  }

  private emitStats() {
    const ammoState = this.gun.getAmmoState()

    this.onStats({
      status: this.status,
      health: this.player.health,
      kills: this.kills,
      time: this.elapsed,
      zombies: this.zombies.length,
      weaponLevel: this.weaponProgression.level,
      weaponExperience: this.weaponProgression.experience,
      weaponRequiredExperience: this.weaponProgression.requiredExperience,
      ammo: ammoState.ammo,
      magazineSize: ammoState.magazineSize,
      reloading: ammoState.reloading,
      reloadRemaining: ammoState.reloadRemaining,
      mapId: this.mapManager.activeMap.id,
      mapName: this.mapManager.activeMap.name,
      requiredKills: this.mapManager.activeMap.requiredKills,
      doorUnlocked: this.mapManager.isCleared(this.kills),
      doorPrompt: this.getDoorPrompt(),
    })
  }

  private getDoorPrompt() {
    const nearbyDoor = this.mapManager.findNearbyDoor(this.player.group.position)
    if (!nearbyDoor) return ''

    // 提示只依赖距离和通关状态，避免玩家看到门变亮后不知道还需要按进入键。
    if (!this.mapManager.isCleared(this.kills)) {
      return `出口未开启，还需 ${Math.max(0, this.mapManager.activeMap.requiredKills - this.kills)} 击杀`
    }

    const targetMap = this.mapManager.availableMaps.find((map) => map.id === nearbyDoor.targetMapId)
    return `按 A/Space 进入${targetMap ? `：${targetMap.name}` : '下一关'}`
  }
}
