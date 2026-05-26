import * as THREE from 'three'

import type { PhysicsBodyHandle, PhysicsWorld } from '../systems/PhysicsWorld'
import { createDoorMaterial } from './EnvironmentMaterials'
import { loadMapModel, normalizeMapModel, resolveMapAssetModelUrl } from './MapModelLoader'
import type { GameMapConfig, MapDoorConfig, MapPropConfig } from './types'

type LoadMapOptions = {
  physics?: PhysicsWorld | null
}

const DOOR_LOCKED_COLOR = 0x26352f
const DOOR_UNLOCKED_COLOR = 0x77c66e
const DOOR_UNLOCKED_EMISSIVE = 0x244d24

export type ActiveMapDoor = MapDoorConfig & {
  unlocked: boolean
}

export class MapManager {
  private currentMap: GameMapConfig
  private readonly scene: THREE.Scene
  private maps: GameMapConfig[]
  private readonly mapObjects: THREE.Object3D[] = []
  private readonly mapColliderBodies: PhysicsBodyHandle[] = []
  private readonly doorMeshes = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>()

  constructor(scene: THREE.Scene, maps: readonly GameMapConfig[]) {
    this.scene = scene
    this.maps = [...maps]

    const initialMap = this.maps[0]
    if (!initialMap) {
      throw new Error('Game maps are empty.')
    }

    this.currentMap = initialMap
  }

  get activeMap() {
    return this.currentMap
  }

  get availableMaps() {
    return this.maps
  }

  setAvailableMaps(maps: readonly GameMapConfig[]) {
    this.maps = [...maps]
  }

  isCleared(kills: number) {
    return kills >= this.currentMap.requiredKills
  }

  getActiveDoors(kills: number): ActiveMapDoor[] {
    const unlocked = this.isCleared(kills)
    return this.currentMap.doors.map((door) => ({ ...door, unlocked }))
  }

  findEnterableDoor(playerPosition: THREE.Vector3, kills: number) {
    if (!this.isCleared(kills)) return null

    return this.findNearbyDoor(playerPosition)
  }

  findNearbyDoor(playerPosition: THREE.Vector3) {
    return this.currentMap.doors.find((door) => {
      const [x, , z] = door.position
      const distance = Math.hypot(playerPosition.x - x, playerPosition.z - z)
      return distance <= door.interactionDistance
    }) ?? null
  }

  loadMap(mapId: string, options: LoadMapOptions = {}) {
    const nextMap = this.maps.find((map) => map.id === mapId)
    if (!nextMap) {
      throw new Error(`Game map "${mapId}" is not registered.`)
    }

    this.unloadMap(options.physics)
    this.currentMap = nextMap
    this.createMapProps()
    if (options.physics) this.createMapColliders(options.physics)

    return this.currentMap
  }

  unloadMap(physics?: PhysicsWorld | null) {
    for (const object of this.mapObjects) {
      this.scene.remove(object)
      this.disposeObject(object)
    }
    this.mapObjects.length = 0
    this.doorMeshes.clear()

    if (physics) {
      for (const body of this.mapColliderBodies) {
        physics.removeBody(body)
      }
    }
    this.mapColliderBodies.length = 0
  }

  createMapColliders(physics: PhysicsWorld) {
    for (const body of this.mapColliderBodies) {
      physics.removeBody(body)
    }
    this.mapColliderBodies.length = 0

    for (const collider of this.currentMap.colliders) {
      this.mapColliderBodies.push(physics.createStaticBoxCollider(collider))
    }
  }

  updateDoorState(kills: number) {
    const unlocked = this.isCleared(kills)

    for (const door of this.currentMap.doors) {
      const mesh = this.doorMeshes.get(door.id)
      if (!mesh) continue

      // 门暂时还是占位盒子，先用材质状态表达“已通关可进入”，后续换真实门模型时复用同一状态入口。
      mesh.material.color.setHex(unlocked ? DOOR_UNLOCKED_COLOR : DOOR_LOCKED_COLOR)
      mesh.material.emissive.setHex(unlocked ? DOOR_UNLOCKED_EMISSIVE : 0x000000)
      mesh.material.emissiveIntensity = unlocked ? 0.75 : 0
    }
  }

  private createMapProps() {
    for (const prop of this.currentMap.props) {
      const mesh = this.createMapPropMesh(prop)
      this.mapObjects.push(mesh)
      this.scene.add(mesh)
    }

    for (const door of this.currentMap.doors) {
      const mesh = this.createDoorMesh(door)
      this.mapObjects.push(mesh)
      this.doorMeshes.set(door.id, mesh)
      this.scene.add(mesh)
    }

    this.updateDoorState(0)
  }

  private createMapPropMesh(prop: MapPropConfig) {
    const [width, height, depth] = prop.size
    const [x, y, z] = prop.position
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color: prop.color,
        roughness: 0.82,
        metalness: 0.04,
        transparent: Boolean(prop.modelUrl || prop.assetId),
        opacity: prop.modelUrl || prop.assetId ? 0 : 1,
        depthWrite: !(prop.modelUrl || prop.assetId),
      }),
    )

    mesh.name = prop.id
    mesh.position.set(x, y, z)
    if (prop.rotation) mesh.rotation.set(prop.rotation[0], prop.rotation[1], prop.rotation[2])
    if (prop.scale) {
      mesh.scale.set(
        prop.scale[0] || 1,
        prop.scale[1] || 1,
        prop.scale[2] || 1,
      )
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (prop.modelUrl || prop.assetId) this.loadPropModel(mesh, prop)

    return mesh
  }

  private loadPropModel(mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>, prop: MapPropConfig) {
    resolveMapAssetModelUrl(prop.assetId)
      .then((resolvedUrl) => {
        // 数据库里的 modelUrl 可能来自旧构建，带 hash 的资源路径上线后会过期；运行时优先按 assetId 解析当前构建产物。
        const modelUrl = resolvedUrl ?? prop.modelUrl
        if (!modelUrl) throw new Error(`Missing map model url for asset ${prop.assetId ?? prop.id}`)

        return loadMapModel(modelUrl)
      })
      .then((model) => {
        if (!this.mapObjects.includes(mesh)) return

        normalizeMapModel(model, prop.size)
        mesh.add(model)
      })
      .catch((error: unknown) => {
        console.warn('Failed to load map prop model', error)
        mesh.material.opacity = 1
        mesh.material.depthWrite = true
        mesh.material.needsUpdate = true
      })
  }

  private createDoorMesh(door: MapDoorConfig) {
    const [width, height, depth] = door.size
    const [x, y, z] = door.position
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      createDoorMaterial(),
    )

    mesh.name = door.id
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true

    return mesh
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose())
      } else {
        child.material.dispose()
      }
    })
  }
}
