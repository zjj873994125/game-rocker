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
  const order = new Map(summaries.map((summary, index) => [summary.mapKey, index]))

  return [...maps].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
