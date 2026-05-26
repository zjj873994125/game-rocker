import type { EditorAssetDefinition, EditorAssetKind, EditorVector3 } from './types'

// 墓地包资源较多，用 glob 自动收集，避免后续新增模型时继续手写 import 列表。
const graveyardModelModules = import.meta.glob('../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>

const graveyardPreviewModules = import.meta.glob('../assets/models/maps/kenney_graveyard-kit_5.0/Previews/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// 新关卡会使用便利店资源包，assetId 使用包名前缀，避免和墓地包里的 wall/floor 等通用名字冲突。
const miniMarketModelModules = import.meta.glob('../assets/models/maps/kenney_mini-market/Models/GLB format/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>

const miniMarketPreviewModules = import.meta.glob('../assets/models/maps/kenney_mini-market/Previews/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

type GraveyardAssetPreset = {
  id: string
  name: string
  kind: EditorAssetKind
  defaultSize: EditorVector3
  defaultSnapSize?: EditorVector3
  defaultSnapOffset?: EditorVector3
  defaultColor: number
  colliderEnabledByDefault: boolean
}

type MiniMarketAssetPreset = {
  id: string
  localId: string
  name: string
  kind: EditorAssetKind
  defaultSize: EditorVector3
  defaultColor: number
  colliderEnabledByDefault: boolean
}

const graveyardAssetPresets: readonly GraveyardAssetPreset[] = [
  { id: 'altar-stone', name: '祭坛石制', kind: 'prop', defaultSize: [1.4, 0.85, 1.05], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'altar-wood', name: '祭坛木制', kind: 'prop', defaultSize: [1.4, 0.85, 1.05], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'bench', name: '长椅', kind: 'prop', defaultSize: [1.9, 0.65, 0.65], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'bench-damaged', name: '长椅破损', kind: 'prop', defaultSize: [1.9, 0.65, 0.65], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'border-pillar', name: '边界柱子', kind: 'structure', defaultSize: [0.65, 1.45, 0.65], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'brick-wall', name: '砖墙', kind: 'structure', defaultSize: [2.4, 1.35, 0.32], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'brick-wall-curve', name: '砖墙弯曲', kind: 'structure', defaultSize: [1.8, 1.35, 1.8], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'brick-wall-curve-small', name: '砖墙弯曲小型', kind: 'structure', defaultSize: [1.8, 1.35, 1.8], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'brick-wall-end', name: '砖墙端头', kind: 'structure', defaultSize: [2.4, 1.35, 0.32], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'candle', name: '蜡烛', kind: 'light', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0xb7a46e, colliderEnabledByDefault: false },
  { id: 'candle-multiple', name: '蜡烛组合', kind: 'light', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0xb7a46e, colliderEnabledByDefault: false },
  { id: 'character-ghost', name: '角色幽灵', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0xb7d0ce, colliderEnabledByDefault: false },
  { id: 'character-keeper', name: '角色守墓人', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0x6f7a64, colliderEnabledByDefault: false },
  { id: 'character-skeleton', name: '角色骷髅', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0x6f7a64, colliderEnabledByDefault: false },
  { id: 'character-vampire', name: '角色吸血鬼', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0x6f7a64, colliderEnabledByDefault: false },
  { id: 'character-zombie', name: '角色僵尸', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0x6f7a64, colliderEnabledByDefault: false },
  { id: 'coffin', name: '棺材', kind: 'prop', defaultSize: [1.9, 0.45, 0.75], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'coffin-old', name: '棺材旧', kind: 'prop', defaultSize: [1.9, 0.45, 0.75], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'column-large', name: '石柱大型', kind: 'structure', defaultSize: [0.85, 2.25, 0.85], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'cross', name: '十字架', kind: 'prop', defaultSize: [0.7, 1.25, 0.28], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'cross-column', name: '十字架石柱', kind: 'structure', defaultSize: [0.65, 1.45, 0.65], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'cross-wood', name: '十字架木制', kind: 'prop', defaultSize: [0.7, 1.25, 0.28], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'crypt', name: '墓穴', kind: 'structure', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-a', name: '墓穴a', kind: 'structure', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-b', name: '墓穴b', kind: 'structure', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-door', name: '墓穴门', kind: 'door', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-large', name: '墓穴大型', kind: 'structure', defaultSize: [3.6, 2.25, 3.2], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-large-door', name: '墓穴大型门', kind: 'door', defaultSize: [3.6, 2.25, 3.2], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-large-roof', name: '墓穴大型屋顶', kind: 'structure', defaultSize: [3.6, 2.25, 3.2], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-small', name: '墓穴小型', kind: 'structure', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'crypt-small-roof', name: '墓穴小型屋顶', kind: 'structure', defaultSize: [2.6, 1.9, 2.4], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'debris', name: '碎石', kind: 'decoration', defaultSize: [1, 0.25, 0.8], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'debris-wood', name: '碎石木制', kind: 'decoration', defaultSize: [1, 0.25, 0.8], defaultColor: 0x7a5838, colliderEnabledByDefault: false },
  { id: 'detail-bowl', name: '细节碗', kind: 'decoration', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'detail-chalice', name: '细节圣杯', kind: 'decoration', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'detail-plate', name: '细节盘子', kind: 'decoration', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'fence', name: '栅栏', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'fence-damaged', name: '栅栏破损', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'fence-gate', name: '栅栏门', kind: 'door', defaultSize: [2, 1.15, 0.22], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'fire-basket', name: '火盆篮', kind: 'light', defaultSize: [1, 1, 1], defaultColor: 0xb7a46e, colliderEnabledByDefault: true },
  { id: 'grave', name: '坟墓', kind: 'prop', defaultSize: [1.4, 0.2, 2.1], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'grave-border', name: '坟墓边界', kind: 'structure', defaultSize: [1.4, 0.2, 2.1], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-bevel', name: '墓碑斜面', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-broken', name: '墓碑破裂', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-cross', name: '墓碑十字架', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-cross-large', name: '墓碑十字架大型', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-debris', name: '墓碑碎石', kind: 'decoration', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'gravestone-decorative', name: '墓碑装饰', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-roof', name: '墓碑屋顶', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-round', name: '墓碑圆形', kind: 'prop', defaultSize: [0.7, 1.15, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'gravestone-wide', name: '墓碑宽型', kind: 'prop', defaultSize: [1.15, 0.85, 0.35], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'hay-bale', name: '干草捆', kind: 'decoration', defaultSize: [1, 0.7, 0.75], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'hay-bale-bundled', name: '干草捆成捆', kind: 'decoration', defaultSize: [1, 0.7, 0.75], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'iron-fence', name: '铁栅栏', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-bar', name: '铁栅栏栏杆', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-border', name: '铁栅栏边界', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-border-column', name: '铁栅栏边界石柱', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-border-curve', name: '铁栅栏边界弯曲', kind: 'structure', defaultSize: [1.6, 1.15, 1.6], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-border-gate', name: '铁栅栏边界门', kind: 'door', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-curve', name: '铁栅栏弯曲', kind: 'structure', defaultSize: [1.6, 1.15, 1.6], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'iron-fence-damaged', name: '铁栅栏破损', kind: 'structure', defaultSize: [2, 1.15, 0.22], defaultColor: 0x2f3432, colliderEnabledByDefault: true },
  { id: 'lantern-candle', name: '灯笼蜡烛', kind: 'light', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0xb7a46e, colliderEnabledByDefault: false },
  { id: 'lantern-glass', name: '灯笼玻璃', kind: 'light', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0xb7a46e, colliderEnabledByDefault: false },
  { id: 'lightpost-all', name: '路灯组合', kind: 'light', defaultSize: [0.55, 2.9, 0.55], defaultColor: 0xb7a46e, colliderEnabledByDefault: true },
  { id: 'lightpost-double', name: '路灯双头', kind: 'light', defaultSize: [0.55, 2.9, 0.55], defaultColor: 0xb7a46e, colliderEnabledByDefault: true },
  { id: 'lightpost-single', name: '路灯单头', kind: 'light', defaultSize: [0.55, 2.9, 0.55], defaultColor: 0xb7a46e, colliderEnabledByDefault: true },
  { id: 'pillar-large', name: '柱子大型', kind: 'structure', defaultSize: [0.85, 2.25, 0.85], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'pillar-obelisk', name: '柱子方尖碑', kind: 'structure', defaultSize: [0.65, 1.45, 0.65], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'pillar-small', name: '柱子小型', kind: 'structure', defaultSize: [0.65, 1.45, 0.65], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'pillar-square', name: '柱子方形', kind: 'structure', defaultSize: [0.65, 1.45, 0.65], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'pine', name: '松树', kind: 'decoration', defaultSize: [1.1, 3, 1.1], defaultColor: 0x31513a, colliderEnabledByDefault: true },
  { id: 'pine-crooked', name: '松树弯曲', kind: 'decoration', defaultSize: [1.1, 3, 1.1], defaultColor: 0x31513a, colliderEnabledByDefault: true },
  { id: 'pine-fall', name: '松树倒下', kind: 'decoration', defaultSize: [2.7, 0.7, 0.9], defaultColor: 0x31513a, colliderEnabledByDefault: true },
  { id: 'pine-fall-crooked', name: '松树倒下弯曲', kind: 'decoration', defaultSize: [2.7, 0.7, 0.9], defaultColor: 0x31513a, colliderEnabledByDefault: true },
  { id: 'pumpkin', name: '南瓜', kind: 'decoration', defaultSize: [0.65, 0.6, 0.65], defaultColor: 0xc06a2f, colliderEnabledByDefault: false },
  { id: 'pumpkin-carved', name: '南瓜雕刻', kind: 'decoration', defaultSize: [0.65, 0.6, 0.65], defaultColor: 0xc06a2f, colliderEnabledByDefault: false },
  { id: 'pumpkin-tall', name: '南瓜高', kind: 'decoration', defaultSize: [0.65, 0.6, 0.65], defaultColor: 0xc06a2f, colliderEnabledByDefault: false },
  { id: 'pumpkin-tall-carved', name: '南瓜高雕刻', kind: 'decoration', defaultSize: [0.65, 0.6, 0.65], defaultColor: 0xc06a2f, colliderEnabledByDefault: false },
  { id: 'road', name: '道路', kind: 'prop', defaultSize: [4, 0.08, 4], defaultColor: 0x6b706a, colliderEnabledByDefault: false },
  { id: 'rocks', name: '石头', kind: 'prop', defaultSize: [1.1, 0.55, 0.9], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'rocks-tall', name: '石头高', kind: 'prop', defaultSize: [0.8, 1.05, 0.75], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'shovel', name: '铲子', kind: 'decoration', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0x7a5838, colliderEnabledByDefault: false },
  { id: 'shovel-dirt', name: '铲子泥土', kind: 'decoration', defaultSize: [0.35, 0.45, 0.35], defaultColor: 0x7a5838, colliderEnabledByDefault: false },
  { id: 'stone-wall', name: '石制墙', kind: 'structure', defaultSize: [2.4, 1.35, 0.32], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'stone-wall-column', name: '石制墙石柱', kind: 'structure', defaultSize: [2.4, 1.35, 0.32], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'stone-wall-curve', name: '石制墙弯曲', kind: 'structure', defaultSize: [1.8, 1.35, 1.8], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'stone-wall-damaged', name: '石制墙破损', kind: 'structure', defaultSize: [2.4, 1.35, 0.32], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'trunk', name: '树干', kind: 'decoration', defaultSize: [0.7, 0.7, 0.7], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'trunk-long', name: '树干长', kind: 'decoration', defaultSize: [2.1, 0.45, 0.55], defaultColor: 0x7a5838, colliderEnabledByDefault: true },
  { id: 'urn-round', name: '骨灰罐圆形', kind: 'decoration', defaultSize: [0.55, 0.7, 0.55], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
  { id: 'urn-square', name: '骨灰罐方形', kind: 'decoration', defaultSize: [0.55, 0.7, 0.55], defaultColor: 0x6b706a, colliderEnabledByDefault: true },
]

const miniMarketAssetPresets: readonly MiniMarketAssetPreset[] = [
  { id: 'mini-market:bottle-return', localId: 'bottle-return', name: '便利店回收机', kind: 'prop', defaultSize: [1.35, 1.55, 0.75], defaultColor: 0x8a8f87, colliderEnabledByDefault: true },
  { id: 'mini-market:cash-register', localId: 'cash-register', name: '便利店收银机', kind: 'prop', defaultSize: [0.9, 0.55, 0.65], defaultColor: 0x6c7480, colliderEnabledByDefault: true },
  { id: 'mini-market:character-employee', localId: 'character-employee', name: '便利店员工', kind: 'decoration', defaultSize: [0.75, 1.45, 0.75], defaultColor: 0x6d8aa0, colliderEnabledByDefault: false },
  { id: 'mini-market:column', localId: 'column', name: '便利店柱子', kind: 'structure', defaultSize: [0.55, 2.1, 0.55], defaultColor: 0x8a8f87, colliderEnabledByDefault: true },
  { id: 'mini-market:display-bread', localId: 'display-bread', name: '面包陈列', kind: 'prop', defaultSize: [1.35, 1.05, 0.95], defaultColor: 0x9a7550, colliderEnabledByDefault: true },
  { id: 'mini-market:display-fruit', localId: 'display-fruit', name: '水果陈列', kind: 'prop', defaultSize: [1.45, 1.05, 1], defaultColor: 0x7d9a55, colliderEnabledByDefault: true },
  { id: 'mini-market:fence', localId: 'fence', name: '便利店围栏', kind: 'structure', defaultSize: [1.6, 1.2, 0.2], defaultColor: 0x6b6f68, colliderEnabledByDefault: true },
  { id: 'mini-market:fence-door-rotate', localId: 'fence-door-rotate', name: '便利店围栏门', kind: 'door', defaultSize: [1.6, 1.2, 0.25], defaultColor: 0x6b6f68, colliderEnabledByDefault: true },
  { id: 'mini-market:floor', localId: 'floor', name: '便利店地砖', kind: 'decoration', defaultSize: [2, 0.08, 2], defaultColor: 0x70757a, colliderEnabledByDefault: false },
  { id: 'mini-market:freezer', localId: 'freezer', name: '卧式冰柜', kind: 'prop', defaultSize: [1.65, 0.95, 1], defaultColor: 0x8aa4ad, colliderEnabledByDefault: true },
  { id: 'mini-market:freezers-standing', localId: 'freezers-standing', name: '立式冰柜', kind: 'prop', defaultSize: [2.6, 1.75, 0.75], defaultColor: 0x8aa4ad, colliderEnabledByDefault: true },
  { id: 'mini-market:shelf-bags', localId: 'shelf-bags', name: '袋装货架', kind: 'prop', defaultSize: [1.55, 1.45, 0.65], defaultColor: 0x8c7353, colliderEnabledByDefault: true },
  { id: 'mini-market:shelf-boxes', localId: 'shelf-boxes', name: '盒装货架', kind: 'prop', defaultSize: [1.55, 1.45, 0.65], defaultColor: 0x8c7353, colliderEnabledByDefault: true },
  { id: 'mini-market:shelf-end', localId: 'shelf-end', name: '端头货架', kind: 'prop', defaultSize: [0.85, 1.45, 0.75], defaultColor: 0x8c7353, colliderEnabledByDefault: true },
  { id: 'mini-market:shopping-basket', localId: 'shopping-basket', name: '购物篮', kind: 'decoration', defaultSize: [0.55, 0.35, 0.45], defaultColor: 0xb05043, colliderEnabledByDefault: false },
  { id: 'mini-market:shopping-cart', localId: 'shopping-cart', name: '购物车', kind: 'prop', defaultSize: [0.9, 0.85, 1.25], defaultColor: 0x8a8f87, colliderEnabledByDefault: true },
  { id: 'mini-market:wall', localId: 'wall', name: '便利店墙', kind: 'structure', defaultSize: [2, 1.7, 0.25], defaultColor: 0x7b8179, colliderEnabledByDefault: true },
  { id: 'mini-market:wall-corner', localId: 'wall-corner', name: '便利店墙角', kind: 'structure', defaultSize: [1.65, 1.7, 1.65], defaultColor: 0x7b8179, colliderEnabledByDefault: true },
  { id: 'mini-market:wall-door-rotate', localId: 'wall-door-rotate', name: '便利店入口门', kind: 'door', defaultSize: [2, 1.7, 0.3], defaultColor: 0x7b8179, colliderEnabledByDefault: true },
  { id: 'mini-market:wall-window', localId: 'wall-window', name: '便利店窗墙', kind: 'structure', defaultSize: [2, 1.7, 0.25], defaultColor: 0x7b8179, colliderEnabledByDefault: true },
]

function resolveGraveyardPreview(modules: Record<string, string>, id: string) {
  return modules[`../assets/models/maps/kenney_graveyard-kit_5.0/Previews/${id}.png`]
}

function resolveMiniMarketPreview(modules: Record<string, string>, localId: string) {
  return modules[`../assets/models/maps/kenney_mini-market/Previews/${localId}.png`]
}

// 默认尺寸和碰撞体只作为编辑器初始值，实际关卡仍可在右侧属性面板手动调整。
function resolveGraveyardModelLoader(modules: Record<string, () => Promise<string>>, id: string) {
  return modules[`../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/${id}.glb`]
}

function resolveMiniMarketModelLoader(modules: Record<string, () => Promise<string>>, localId: string) {
  return modules[`../assets/models/maps/kenney_mini-market/Models/GLB format/${localId}.glb`]
}

function createCachedModelUrlLoader(loader: (() => Promise<string>) | undefined) {
  let cachedUrl: string | null = null

  return async () => {
    if (cachedUrl) return cachedUrl
    if (!loader) throw new Error('模型资源不存在')

    cachedUrl = await loader()
    return cachedUrl
  }
}

const graveyardEditorAssets: readonly EditorAssetDefinition[] = graveyardAssetPresets.map((asset) => ({
  ...asset,
  defaultSnapSize: asset.defaultSnapSize ?? asset.defaultSize,
  defaultSnapOffset: asset.defaultSnapOffset ?? [0, 0, 0],
  previewUrl: resolveGraveyardPreview(graveyardPreviewModules, asset.id),
  loadModelUrl: createCachedModelUrlLoader(resolveGraveyardModelLoader(graveyardModelModules, asset.id)),
}))

const miniMarketEditorAssets: readonly EditorAssetDefinition[] = miniMarketAssetPresets.map((asset) => ({
  id: asset.id,
  name: asset.name,
  kind: asset.kind,
  defaultSize: asset.defaultSize,
  defaultSnapSize: asset.defaultSize,
  defaultSnapOffset: [0, 0, 0],
  defaultColor: asset.defaultColor,
  colliderEnabledByDefault: asset.colliderEnabledByDefault,
  previewUrl: resolveMiniMarketPreview(miniMarketPreviewModules, asset.localId),
  loadModelUrl: createCachedModelUrlLoader(resolveMiniMarketModelLoader(miniMarketModelModules, asset.localId)),
}))

export const editorAssets: readonly EditorAssetDefinition[] = [
  {
    id: 'placeholder-box',
    name: '占位方块',
    kind: 'structure',
    defaultSize: [1.6, 0.8, 1.2],
    defaultSnapSize: [1.6, 0.8, 1.2],
    defaultSnapOffset: [0, 0, 0],
    defaultColor: 0x66705f,
    colliderEnabledByDefault: true,
  },
  ...graveyardEditorAssets,
  ...miniMarketEditorAssets,
]

export function getEditorAssetById(assetId: string) {
  return editorAssets.find((asset) => asset.id === assetId) ?? null
}
