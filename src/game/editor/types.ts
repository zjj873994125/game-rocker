import type { GameMapConfig, GroundMaterialConfig, Vector3Tuple } from '../map/types'

export type EditorVector3 = [number, number, number]

export type EditorAssetKind = 'prop' | 'structure' | 'decoration' | 'light' | 'door' | 'spawn'

export type EditorAssetDefinition = {
  id: string
  name: string
  kind: EditorAssetKind
  previewUrl?: string
  modelUrl?: string
  loadModelUrl?: () => Promise<string>
  defaultSize: EditorVector3
  defaultSnapSize?: EditorVector3
  defaultSnapOffset?: EditorVector3
  defaultColor: number
  colliderEnabledByDefault: boolean
}

export type EditorCollider = {
  enabled: boolean
  position: EditorVector3
  size: EditorVector3
}

export type EditorMapObject = {
  id: string
  assetId: string
  modelUrl?: string
  name: string
  kind: EditorAssetKind
  position: EditorVector3
  rotation: EditorVector3
  scale: EditorVector3
  snapSize: EditorVector3
  snapOffset: EditorVector3
  color: number
  collider: EditorCollider
}

export type EditorDoor = {
  id: string
  position: EditorVector3
  size: EditorVector3
  targetMapId: string
  targetSpawnId: string
  interactionDistance: number
}

export type EditorMapDocument = {
  id: string
  name: string
  spawnPoint: EditorVector3
  requiredKills: number
  groundMaterial: GroundMaterialConfig
  objects: EditorMapObject[]
  doors: EditorDoor[]
}

export type EditorExportResult = {
  map: GameMapConfig
  source: string
}

export function toRuntimeVector(vector: EditorVector3): Vector3Tuple {
  return [vector[0], vector[1], vector[2]]
}
