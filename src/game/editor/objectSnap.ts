import type { EditorMapObject, EditorVector3 } from './types'

const DEFAULT_SNAP_DISTANCE = 0.85
const DEFAULT_SNAP_GAP = 0

type SnapOptions = {
  enabled: boolean
  distance?: number
  gap?: number
}

type FootprintBounds = {
  centerX: number
  centerZ: number
  halfX: number
  halfZ: number
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

type SnapCandidate = {
  centerX: number
  centerZ: number
  score: number
}

function roundPosition(position: EditorVector3): EditorVector3 {
  return position.map((value) => Number(value.toFixed(2))) as EditorVector3
}

function getMovedColliderCenter(object: EditorMapObject, objectPosition: EditorVector3): EditorVector3 {
  return [
    object.collider.position[0] + objectPosition[0] - object.position[0],
    object.collider.position[1] + objectPosition[1] - object.position[1],
    object.collider.position[2] + objectPosition[2] - object.position[2],
  ]
}

function rotateOffset(offset: EditorVector3, yaw: number): { x: number; z: number } {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)

  return {
    x: offset[0] * cos - offset[2] * sin,
    z: offset[0] * sin + offset[2] * cos,
  }
}

function getSnapFootprint(object: EditorMapObject, colliderCenter: EditorVector3): FootprintBounds {
  const width = object.snapSize[0] * object.scale[0]
  const depth = object.snapSize[2] * object.scale[2]
  const yaw = object.rotation[1] ?? 0
  const cos = Math.abs(Math.cos(yaw))
  const sin = Math.abs(Math.sin(yaw))
  const offset = rotateOffset([
    object.snapOffset[0] * object.scale[0],
    object.snapOffset[1] * object.scale[1],
    object.snapOffset[2] * object.scale[2],
  ], yaw)

  // 编辑器吸附、边界线、导出碰撞体都使用 GLB 可视包围盒乘对象缩放后的同一套边界。
  const halfX = (cos * width + sin * depth) / 2
  const halfZ = (sin * width + cos * depth) / 2
  const centerX = colliderCenter[0] + offset.x
  const centerZ = colliderCenter[2] + offset.z

  return {
    centerX,
    centerZ,
    halfX,
    halfZ,
    minX: centerX - halfX,
    maxX: centerX + halfX,
    minZ: centerZ - halfZ,
    maxZ: centerZ + halfZ,
  }
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(4))))]
}

function createSnapCandidates(movingBounds: FootprintBounds, targetBounds: FootprintBounds, gap: number) {
  const leftX = targetBounds.minX - movingBounds.halfX - gap
  const rightX = targetBounds.maxX + movingBounds.halfX + gap
  const backZ = targetBounds.minZ - movingBounds.halfZ - gap
  const frontZ = targetBounds.maxZ + movingBounds.halfZ + gap

  const sideAlignedX = uniqueNumbers([
    targetBounds.centerX,
    targetBounds.minX + movingBounds.halfX,
    targetBounds.maxX - movingBounds.halfX,
  ])
  const sideAlignedZ = uniqueNumbers([
    targetBounds.centerZ,
    targetBounds.minZ + movingBounds.halfZ,
    targetBounds.maxZ - movingBounds.halfZ,
  ])

  const candidates: Array<{ centerX: number; centerZ: number }> = []

  for (const centerZ of sideAlignedZ) {
    candidates.push({ centerX: leftX, centerZ }, { centerX: rightX, centerZ })
  }
  for (const centerX of sideAlignedX) {
    candidates.push({ centerX, centerZ: backZ }, { centerX, centerZ: frontZ })
  }
  for (const centerX of [leftX, rightX]) {
    for (const centerZ of [backZ, frontZ]) {
      candidates.push({ centerX, centerZ })
    }
  }

  return candidates
}

export function moveObjectWithCollider(object: EditorMapObject, nextPosition: EditorVector3) {
  const delta: EditorVector3 = [
    nextPosition[0] - object.position[0],
    nextPosition[1] - object.position[1],
    nextPosition[2] - object.position[2],
  ]

  object.position = [...nextPosition]
  object.collider.position = roundPosition([
    object.collider.position[0] + delta[0],
    object.collider.position[1] + delta[1],
    object.collider.position[2] + delta[2],
  ])
}

export function snapObjectToNeighbors(
  object: EditorMapObject,
  objects: readonly EditorMapObject[],
  nextPosition: EditorVector3,
  options: SnapOptions,
): EditorVector3 {
  if (!options.enabled || !object.collider.enabled) return roundPosition(nextPosition)

  const snapDistance = options.distance ?? DEFAULT_SNAP_DISTANCE
  const snapGap = options.gap ?? DEFAULT_SNAP_GAP
  const movingCenter = getMovedColliderCenter(object, nextPosition)
  const movingBounds = getSnapFootprint(object, movingCenter)
  let bestCandidate: SnapCandidate | null = null

  for (const target of objects) {
    if (target.id === object.id || !target.collider.enabled) continue

    const targetBounds = getSnapFootprint(target, target.collider.position)
    for (const candidate of createSnapCandidates(movingBounds, targetBounds, snapGap)) {
      const score = Math.hypot(candidate.centerX - movingBounds.centerX, candidate.centerZ - movingBounds.centerZ)
      if (score > snapDistance) continue
      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = { ...candidate, score }
      }
    }
  }

  if (!bestCandidate) return roundPosition(nextPosition)

  const snappedPosition: EditorVector3 = [...nextPosition]
  snappedPosition[0] += bestCandidate.centerX - movingBounds.centerX
  snappedPosition[2] += bestCandidate.centerZ - movingBounds.centerZ

  return roundPosition(snappedPosition)
}
