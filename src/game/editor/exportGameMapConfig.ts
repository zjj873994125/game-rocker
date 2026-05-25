import type { GameMapConfig, MapColliderConfig, MapDoorConfig, MapPropConfig, Vector3Tuple } from '../map/types'
import type { EditorDoor, EditorExportResult, EditorMapDocument, EditorMapObject, EditorVector3 } from './types'

function toRuntimeVector(vector: EditorVector3): Vector3Tuple {
  return vector.map((value) => Number(value.toFixed(2))) as unknown as Vector3Tuple
}

function toPropConfig(object: EditorMapObject): MapPropConfig {
  return {
    id: object.id,
    assetId: object.assetId,
    // 运行时通过稳定的 assetId 解析当前构建里的模型 URL，避免把带 hash 的旧构建资源地址写进数据库。
    position: toRuntimeVector(object.position),
    // size 仍作为运行时 box fallback 和物理/选择代理尺寸；真实模型会按编辑器边界归一化显示。
    size: toRuntimeVector([
      object.snapSize[0] * object.scale[0],
      object.snapSize[1] * object.scale[1],
      object.snapSize[2] * object.scale[2],
    ]),
    rotation: toRuntimeVector(object.rotation),
    scale: toRuntimeVector(object.scale),
    color: object.color,
  }
}

function toColliderConfig(object: EditorMapObject): MapColliderConfig | null {
  if (!object.collider.enabled) return null
  const yaw = object.rotation[1] ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const scaledOffset: EditorVector3 = [
    object.snapOffset[0] * object.scale[0],
    object.snapOffset[1] * object.scale[1],
    object.snapOffset[2] * object.scale[2],
  ]
  const offsetX = scaledOffset[0] * cos - scaledOffset[2] * sin
  const offsetZ = scaledOffset[0] * sin + scaledOffset[2] * cos

  return {
    id: `${object.id}-collider`,
    // 碰撞体直接使用编辑器边界线，也就是 GLB 可视包围盒乘对象缩放后的结果。
    position: toRuntimeVector([
      object.collider.position[0] + offsetX,
      object.collider.position[1] + scaledOffset[1],
      object.collider.position[2] + offsetZ,
    ]),
    size: toRuntimeVector([
      object.snapSize[0] * object.scale[0],
      object.snapSize[1] * object.scale[1],
      object.snapSize[2] * object.scale[2],
    ]),
    // collider 使用物体旋转作为运行时物理旋转，避免编辑器里旋转后的模型和阻挡区域错位。
    rotation: toRuntimeVector(object.rotation),
  }
}

function toDoorConfig(door: EditorDoor): MapDoorConfig {
  return {
    id: door.id,
    position: toRuntimeVector(door.position),
    size: toRuntimeVector(door.size),
    targetMapId: door.targetMapId,
    targetSpawnId: door.targetSpawnId,
    interactionDistance: Number(door.interactionDistance.toFixed(2)),
  }
}

function formatValue(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent).replace(/"([^"]+)":/g, '$1:')
}

function toVariableName(mapId: string) {
  const words = mapId.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  const pascal = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('')
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}Map`
}

export function exportGameMapConfig(document: EditorMapDocument): EditorExportResult {
  const colliders = document.objects.map(toColliderConfig).filter((collider): collider is MapColliderConfig => Boolean(collider))
  const props = document.objects.map(toPropConfig)
  const doors = document.doors.map(toDoorConfig)
  const map: GameMapConfig = {
    id: document.id,
    name: document.name,
    spawnPoint: toRuntimeVector(document.spawnPoint),
    requiredKills: document.requiredKills,
    groundMaterial: {
      textureId: document.groundMaterial.textureId,
      repeat: Number(document.groundMaterial.repeat.toFixed(2)),
    },
    colliders,
    props,
    doors,
  }
  const variableName = toVariableName(document.id)

  return {
    map,
    source: `import type { GameMapConfig } from './types'

export const ${variableName}: GameMapConfig = ${formatValue(map)}
`,
  }
}
