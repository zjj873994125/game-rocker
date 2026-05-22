export type Vector3Tuple = readonly [number, number, number]

export type GroundMaterialConfig = {
  textureId: string
  repeat: number
}

export type MapColliderConfig = {
  id: string
  position: Vector3Tuple
  size: Vector3Tuple
  rotation?: Vector3Tuple
}

export type MapPropConfig = {
  id: string
  assetId?: string
  modelUrl?: string
  position: Vector3Tuple
  size: Vector3Tuple
  rotation?: Vector3Tuple
  scale?: Vector3Tuple
  color: number
}

export type MapDoorConfig = {
  id: string
  position: Vector3Tuple
  size: Vector3Tuple
  targetMapId: string
  targetSpawnId: string
  interactionDistance: number
}

export type GameMapConfig = {
  id: string
  name: string
  spawnPoint: Vector3Tuple
  requiredKills: number
  groundMaterial?: GroundMaterialConfig
  colliders: readonly MapColliderConfig[]
  props: readonly MapPropConfig[]
  doors: readonly MapDoorConfig[]
}
