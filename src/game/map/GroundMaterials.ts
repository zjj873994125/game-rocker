import floorGroundDirtUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_dirt.png?url'
import floorGroundGrassUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_grass.png?url'
import floorGroundGrassOverlayUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_grass_overlay.png?url'
import floorGroundSandUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_sand.png?url'
import floorGroundWaterUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_water.png?url'
import floorGroundWaterGreenUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_ground_water_green.png?url'
import floorStoneUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone.png?url'
import floorStoneGrateUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_grate.png?url'
import floorStonePatternUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_pattern.png?url'
import floorStonePatternDepthUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_pattern_depth.png?url'
import floorStonePatternSmallUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_pattern_small.png?url'
import floorStonePatternSmallDepthUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_pattern_small_depth.png?url'
import floorStoneSandGrateUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_sand_grate.png?url'
import floorStoneSandInsetUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_sand_inset.png?url'
import floorStoneSandRandomUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_sand_random.png?url'
import floorStoneSandRandomDepthUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_stone_sand_random_depth.png?url'
import floorTilesBlueLargeUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_blue_large.png?url'
import floorTilesBlueSmallUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_blue_small.png?url'
import floorTilesBlueSmallDamagedUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_blue_small_damaged.png?url'
import floorTilesSandLargeUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_sand_large.png?url'
import floorTilesSandSmallUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_sand_small.png?url'
import floorTilesSandSmallDamagedUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_sand_small_damaged.png?url'
import floorTilesTanLargeUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_tan_large.png?url'
import floorTilesTanSmallUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_tan_small.png?url'
import floorTilesTanSmallDamagedUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_tiles_tan_small_damaged.png?url'
import floorWoodPlanksUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_wood_planks.png?url'
import floorWoodPlanksDamagedUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_wood_planks_damaged.png?url'
import floorWoodPlanksWideUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_wood_planks_wide.png?url'
import floorWoodPlanksWideDamagedUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/floor_wood_planks_wide_damaged.png?url'

export type GroundTextureId =
  | 'floor-ground-dirt'
  | 'floor-ground-grass'
  | 'floor-ground-grass-overlay'
  | 'floor-ground-sand'
  | 'floor-ground-water'
  | 'floor-ground-water-green'
  | 'floor-stone'
  | 'floor-stone-grate'
  | 'floor-stone-pattern'
  | 'floor-stone-pattern-depth'
  | 'floor-stone-pattern-small'
  | 'floor-stone-pattern-small-depth'
  | 'floor-stone-sand-grate'
  | 'floor-stone-sand-inset'
  | 'floor-stone-sand-random'
  | 'floor-stone-sand-random-depth'
  | 'floor-tiles-blue-large'
  | 'floor-tiles-blue-small'
  | 'floor-tiles-blue-small-damaged'
  | 'floor-tiles-sand-large'
  | 'floor-tiles-sand-small'
  | 'floor-tiles-sand-small-damaged'
  | 'floor-tiles-tan-large'
  | 'floor-tiles-tan-small'
  | 'floor-tiles-tan-small-damaged'
  | 'floor-wood-planks'
  | 'floor-wood-planks-damaged'
  | 'floor-wood-planks-wide'
  | 'floor-wood-planks-wide-damaged'

export type GroundTextureDefinition = {
  id: GroundTextureId
  name: string
  url: string
}

export const DEFAULT_GROUND_TEXTURE_ID: GroundTextureId = 'floor-stone-pattern-small-depth'
export const DEFAULT_GROUND_REPEAT = 12

// 这里显式维护可选清单，避免把非地板贴图误暴露给地图编辑器。
export const groundTextureOptions: GroundTextureDefinition[] = [
  { id: 'floor-stone-pattern-small-depth', name: '石砖小图案 深度', url: floorStonePatternSmallDepthUrl },
  { id: 'floor-stone-pattern-small', name: '石砖小图案', url: floorStonePatternSmallUrl },
  { id: 'floor-stone-pattern-depth', name: '石砖图案 深度', url: floorStonePatternDepthUrl },
  { id: 'floor-stone-pattern', name: '石砖图案', url: floorStonePatternUrl },
  { id: 'floor-stone', name: '石板', url: floorStoneUrl },
  { id: 'floor-stone-grate', name: '石板格栅', url: floorStoneGrateUrl },
  { id: 'floor-stone-sand-random-depth', name: '沙石随机 深度', url: floorStoneSandRandomDepthUrl },
  { id: 'floor-stone-sand-random', name: '沙石随机', url: floorStoneSandRandomUrl },
  { id: 'floor-stone-sand-grate', name: '沙石格栅', url: floorStoneSandGrateUrl },
  { id: 'floor-stone-sand-inset', name: '沙石嵌入', url: floorStoneSandInsetUrl },
  { id: 'floor-ground-dirt', name: '泥地', url: floorGroundDirtUrl },
  { id: 'floor-ground-grass', name: '草地', url: floorGroundGrassUrl },
  { id: 'floor-ground-grass-overlay', name: '草地覆盖', url: floorGroundGrassOverlayUrl },
  { id: 'floor-ground-sand', name: '沙地', url: floorGroundSandUrl },
  { id: 'floor-ground-water', name: '水面', url: floorGroundWaterUrl },
  { id: 'floor-ground-water-green', name: '绿色水面', url: floorGroundWaterGreenUrl },
  { id: 'floor-tiles-blue-large', name: '蓝色大地砖', url: floorTilesBlueLargeUrl },
  { id: 'floor-tiles-blue-small', name: '蓝色小地砖', url: floorTilesBlueSmallUrl },
  { id: 'floor-tiles-blue-small-damaged', name: '蓝色破损小地砖', url: floorTilesBlueSmallDamagedUrl },
  { id: 'floor-tiles-sand-large', name: '沙色大地砖', url: floorTilesSandLargeUrl },
  { id: 'floor-tiles-sand-small', name: '沙色小地砖', url: floorTilesSandSmallUrl },
  { id: 'floor-tiles-sand-small-damaged', name: '沙色破损小地砖', url: floorTilesSandSmallDamagedUrl },
  { id: 'floor-tiles-tan-large', name: '浅棕大地砖', url: floorTilesTanLargeUrl },
  { id: 'floor-tiles-tan-small', name: '浅棕小地砖', url: floorTilesTanSmallUrl },
  { id: 'floor-tiles-tan-small-damaged', name: '浅棕破损小地砖', url: floorTilesTanSmallDamagedUrl },
  { id: 'floor-wood-planks', name: '木板', url: floorWoodPlanksUrl },
  { id: 'floor-wood-planks-damaged', name: '破损木板', url: floorWoodPlanksDamagedUrl },
  { id: 'floor-wood-planks-wide', name: '宽木板', url: floorWoodPlanksWideUrl },
  { id: 'floor-wood-planks-wide-damaged', name: '破损宽木板', url: floorWoodPlanksWideDamagedUrl },
]

export function getGroundTextureDefinition(textureId: string | undefined) {
  return groundTextureOptions.find((option) => option.id === textureId) ?? groundTextureOptions[0]
}
