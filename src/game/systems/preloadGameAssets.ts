import { loadBulletModels } from '../entities/BulletModelLoader'
import { preloadDropAssets } from '../entities/DropItem'
import { loadGunModels } from '../entities/GunModelLoader'
import { loadPlayerModel } from '../entities/PlayerModelLoader'
import { loadZombieModel } from '../entities/ZombieModelLoader'
import { loadMapModel, resolveMapAssetModelUrl } from '../map/MapModelLoader'
import type { GameMapConfig } from '../map/types'
import { trackAssetTask } from './AssetLoadingProgress'

export async function preloadGameAssets(maps: readonly GameMapConfig[]) {
  const initialMap = maps[0]

  await trackAssetTask('asset:game-preload', '准备游戏资源', Promise.all([
    loadPlayerModel(),
    loadZombieModel(),
    loadGunModels(),
    loadBulletModels(),
    preloadDropAssets(),
    initialMap ? preloadMapAssets(initialMap) : Promise.resolve(),
  ]))
}

async function preloadMapAssets(map: GameMapConfig) {
  const modelUrls = new Set<string>()

  for (const prop of map.props) {
    const modelUrl = await resolveMapAssetModelUrl(prop.assetId) ?? prop.modelUrl
    if (modelUrl) modelUrls.add(modelUrl)
  }

  // 只预加载当前进入地图的模型，避免一次性把后续房间全部拉下来导致首屏更慢。
  await Promise.all([...modelUrls].map((modelUrl) => loadMapModel(modelUrl)))
}
