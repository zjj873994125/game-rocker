export type MapLevelTheme = 'graveyard' | 'mini_market'
export type EditorLevelType = 'graveyard' | 'mini-market'

export type MapLevelMetadata = {
  levelNo: number
  levelTheme: MapLevelTheme
}

export const mapLevelDefinitions: Record<EditorLevelType, {
  levelNo: number
  levelTheme: MapLevelTheme
  label: string
  title: string
  description: string
  defaultName: string
  defaultIdPrefix: string
  defaultDoorTargetMapId: string
  defaultDoorTargetSpawnId: string
}> = {
  graveyard: {
    levelNo: 1,
    levelTheme: 'graveyard',
    label: '第一关',
    title: '墓地',
    description: '墓地资源包',
    defaultName: '自定义墓地房间',
    defaultIdPrefix: 'custom-graveyard-room',
    defaultDoorTargetMapId: 'mini-market-store',
    defaultDoorTargetSpawnId: 'mini-market-entry',
  },
  'mini-market': {
    levelNo: 2,
    levelTheme: 'mini_market',
    label: '第二关',
    title: '便利店',
    description: '便利店资源包',
    defaultName: '自定义便利店',
    defaultIdPrefix: 'custom-mini-market-store',
    defaultDoorTargetMapId: 'graveyard-courtyard',
    defaultDoorTargetSpawnId: 'graveyard-return',
  },
}

export function toEditorLevelType(levelTheme?: string): EditorLevelType {
  return levelTheme === 'mini_market' || levelTheme === 'mini-market' ? 'mini-market' : 'graveyard'
}

export function getLevelMetadata(levelType: EditorLevelType): MapLevelMetadata {
  const definition = mapLevelDefinitions[levelType]

  return {
    levelNo: definition.levelNo,
    levelTheme: definition.levelTheme,
  }
}

export function inferMapLevelMetadata(config: { id: string; props: readonly { assetId?: string }[] }): MapLevelMetadata {
  const hasMiniMarketAsset = config.props.some((prop) => prop.assetId?.startsWith('mini-market:'))
  if (hasMiniMarketAsset || config.id.includes('mini-market')) {
    return { levelNo: 2, levelTheme: 'mini_market' }
  }

  return { levelNo: 1, levelTheme: 'graveyard' }
}
