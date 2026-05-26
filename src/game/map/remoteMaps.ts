import { getMap, listMaps, type MapSummary } from '../api/mapApi'
import type { GameMapConfig } from './types'

let cachedMaps: GameMapConfig[] = []

export async function loadRemoteGameMaps() {
  const summaries = await listMaps()

  const maps = await Promise.all(summaries.map((summary) => getMap(summary.mapKey).then((stored) => stored.config)))
  cachedMaps = sortMapsBySummary(maps, summaries)

  return cachedMaps
}

export function getCachedGameMaps() {
  return cachedMaps
}

export function getCachedDefaultMapId() {
  return cachedMaps[0]?.id ?? ''
}

function sortMapsBySummary(maps: GameMapConfig[], summaries: MapSummary[]) {
  const order = new Map(summaries.map((summary, index) => [summary.mapKey, {
    index,
    levelNo: summary.levelNo || 1,
  }]))

  return [...maps].sort((a, b) => {
    const left = order.get(a.id)
    const right = order.get(b.id)

    // 地图列表优先按关卡顺序进入游戏，同一关再保留后端列表原顺序。
    return (left?.levelNo ?? 1) - (right?.levelNo ?? 1) || (left?.index ?? 0) - (right?.index ?? 0)
  })
}
