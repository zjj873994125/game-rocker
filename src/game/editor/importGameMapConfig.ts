import type { GameMapConfig, MapColliderConfig, MapDoorConfig, MapPropConfig, Vector3Tuple } from '../map/types'
import { normalizeGroundMaterialConfig } from '../map/EnvironmentMaterials'
import { getEditorAssetById } from './editorAssets'
import type { EditorDoor, EditorMapDocument, EditorMapObject, EditorVector3 } from './types'

function toEditorVector(vector: Vector3Tuple | undefined, fallback: EditorVector3): EditorVector3 {
  if (!vector) return [...fallback]

  return [vector[0], vector[1], vector[2]]
}

function findColliderForProp(prop: MapPropConfig, colliders: readonly MapColliderConfig[]) {
  const byDerivedId = colliders.find((collider) => collider.id === `${prop.id}-collider`)
  if (byDerivedId) return byDerivedId

  return colliders.find((collider) => collider.id === prop.id || (
    collider.position[0] === prop.position[0]
    && collider.position[1] === prop.position[1]
    && collider.position[2] === prop.position[2]
  )) ?? null
}

function toEditorObject(prop: MapPropConfig, collider: MapColliderConfig | null): EditorMapObject {
  const asset = prop.assetId ? getEditorAssetById(prop.assetId) : null
  const position = toEditorVector(prop.position, [0, 0, 0])
  const size = toEditorVector(prop.size, asset?.defaultSize ?? [1, 1, 1])

  return {
    id: prop.id,
    assetId: prop.assetId ?? asset?.id ?? 'placeholder-box',
    modelUrl: prop.modelUrl ?? asset?.modelUrl,
    name: asset?.name ?? prop.id,
    kind: asset?.kind ?? 'structure',
    position,
    rotation: toEditorVector(prop.rotation, [0, 0, 0]),
    scale: toEditorVector(prop.scale, [1, 1, 1]),
    snapSize: toEditorVector(asset?.defaultSnapSize, size),
    snapOffset: toEditorVector(asset?.defaultSnapOffset, [0, 0, 0]),
    color: prop.color,
    collider: {
      enabled: Boolean(collider),
      position: toEditorVector(collider?.position, position),
      size: toEditorVector(collider?.size, size),
    },
  }
}

function toEditorDoor(door: MapDoorConfig): EditorDoor {
  return {
    id: door.id,
    position: toEditorVector(door.position, [0, 0, 0]),
    size: toEditorVector(door.size, [1, 1, 1]),
    targetMapId: door.targetMapId,
    targetSpawnId: door.targetSpawnId,
    interactionDistance: door.interactionDistance,
  }
}

export function gameMapToEditorDocument(map: GameMapConfig): EditorMapDocument {
  return {
    id: map.id,
    name: map.name,
    spawnPoint: toEditorVector(map.spawnPoint, [0, 0, 0]),
    requiredKills: map.requiredKills,
    groundMaterial: normalizeGroundMaterialConfig(map.groundMaterial),
    objects: map.props.map((prop) => toEditorObject(prop, findColliderForProp(prop, map.colliders))),
    doors: map.doors.map(toEditorDoor),
  }
}
