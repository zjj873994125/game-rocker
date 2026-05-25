import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

import { GAME_CONFIG } from '../constants'

const FIXED_TIMESTEP = 1 / 60
const MAX_TIMESTEP = 1 / 30

let rapierInitPromise: Promise<void> | null = null

export type PhysicsBodyHandle = {
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  centerY: number
}

export type StaticBoxColliderConfig = {
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  rotation?: readonly [number, number, number]
}

function initRapier() {
  rapierInitPromise ??= RAPIER.init()
  return rapierInitPromise
}

export class PhysicsWorld {
  readonly world: RAPIER.World
  private readonly characterController: RAPIER.KinematicCharacterController

  private constructor(world: RAPIER.World) {
    this.world = world
    this.world.timestep = FIXED_TIMESTEP
    this.characterController = this.world.createCharacterController(0.02)
    this.characterController.setSlideEnabled(true)
    this.characterController.setUp({ x: 0, y: 1, z: 0 })
  }

  static async init() {
    await initRapier()

    // 玩法被锁在 X/Z 平面，先关闭重力，避免模型高度被物理世界改变。
    return new PhysicsWorld(new RAPIER.World({ x: 0, y: 0, z: 0 }))
  }

  step(delta = FIXED_TIMESTEP) {
    this.world.timestep = Math.min(delta, MAX_TIMESTEP)
    this.world.step()
  }

  getDebugRenderBuffers() {
    return this.world.debugRender()
  }

  createPlayerBody(position: THREE.Vector3) {
    return this.createCharacterBody(position, GAME_CONFIG.playerRadius, GAME_CONFIG.playerColliderHalfHeight)
  }

  createZombieBody(position: THREE.Vector3, radius = GAME_CONFIG.zombieRadius) {
    return this.createCharacterBody(position, radius, GAME_CONFIG.zombieColliderHalfHeight)
  }

  createStaticBoxCollider(config: StaticBoxColliderConfig): PhysicsBodyHandle {
    const [x, y, z] = config.position
    const [width, height, depth] = config.size
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)
    if (config.rotation) {
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...config.rotation, 'XYZ'))
      // 静态障碍物使用刚体旋转，让 Rapier cuboid 和 Three.js 地图模型保持同一方向。
      bodyDesc.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
    }
    const body = this.world.createRigidBody(bodyDesc)
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2),
      body,
    )

    return { body, collider, centerY: y }
  }

  moveKinematicBody(handle: PhysicsBodyHandle, position: THREE.Vector3) {
    const current = handle.body.translation()
    const desiredMovement = {
      x: position.x - current.x,
      y: 0,
      z: position.z - current.z,
    }

    // 使用角色控制器提前修正位移，后续地图 collider 接入后会自动沿障碍滑动。
    this.characterController.computeColliderMovement(handle.collider, desiredMovement)
    const movement = this.characterController.computedMovement()

    handle.body.setNextKinematicTranslation({
      x: current.x + movement.x,
      y: handle.centerY,
      z: current.z + movement.z,
    })
  }

  syncObject(handle: PhysicsBodyHandle, object: THREE.Object3D) {
    const translation = handle.body.translation()

    // Three.js 角色模型以脚底贴地为视觉原点，Rapier capsule 以中心点为物理原点。
    object.position.set(translation.x, 0, translation.z)
  }

  removeBody(handle: PhysicsBodyHandle) {
    this.world.removeCollider(handle.collider, true)
    this.world.removeRigidBody(handle.body)
  }

  dispose() {
    this.world.removeCharacterController(this.characterController)
    this.world.free()
  }

  private createCharacterBody(position: THREE.Vector3, radius: number, halfHeight: number): PhysicsBodyHandle {
    const centerY = halfHeight + radius
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(position.x, centerY, position.z)
        .lockRotations(),
    )
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius),
      body,
    )

    return { body, collider, centerY }
  }
}
