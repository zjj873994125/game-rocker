import type { GameMapConfig } from '../map/types'
import type { MapLevelTheme } from '../map/levelMetadata'
import { apiRequest } from './client'

export type StoredMap = {
  mapKey: string
  name: string
  status: string
  levelNo: number
  levelTheme: MapLevelTheme
  ownerUserId?: number
  editMode: 'public' | 'private'
  config: GameMapConfig
  createdAt: string
  updatedAt: string
}

export type MapSummary = {
  mapKey: string
  name: string
  status: string
  levelNo: number
  levelTheme: MapLevelTheme
  ownerUserId?: number
  editMode: 'public' | 'private'
  requiredKills: number
  updatedAt: string
}

export type SaveMapPayload = {
  status: string
  remark: string
  levelNo: number
  levelTheme: MapLevelTheme
  editMode?: 'public' | 'private'
  config: GameMapConfig
}

export function listMaps() {
  return apiRequest<MapSummary[]>('/maps')
}

export function getMap(mapKey: string) {
  return apiRequest<StoredMap>(`/maps/${encodeURIComponent(mapKey)}`)
}

export function saveMap(payload: SaveMapPayload) {
  const mapKey = encodeURIComponent(payload.config.id)

  return apiRequest<StoredMap>(`/maps/${mapKey}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteMap(mapKey: string) {
  return apiRequest<void>(`/maps/${encodeURIComponent(mapKey)}`, {
    method: 'DELETE',
  })
}
