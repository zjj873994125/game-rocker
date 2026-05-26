const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8088/api'

function prop(id, assetId, position, size, options = {}) {
  return {
    id,
    assetId,
    position,
    size,
    rotation: options.rotation ?? [0, 0, 0],
    scale: options.scale ?? [1, 1, 1],
    color: options.color ?? 0x6b706a,
  }
}

function collider(id, position, size, rotation = [0, 0, 0]) {
  return {
    id: `${id}-collider`,
    position,
    size,
    rotation,
  }
}

const boundaryProps = [
  prop('north-wall-01', 'stone-wall', [-7.2, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('north-wall-02', 'stone-wall', [-4.8, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('north-wall-03', 'stone-wall-damaged', [-2.4, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('north-wall-04', 'stone-wall', [2.4, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('north-wall-05', 'stone-wall', [4.8, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('north-wall-06', 'stone-wall', [7.2, 0.68, -11.2], [2.4, 1.35, 0.32]),
  prop('south-wall-01', 'stone-wall', [-7.2, 0.68, 11.2], [2.4, 1.35, 0.32]),
  prop('south-wall-02', 'stone-wall-damaged', [-4.8, 0.68, 11.2], [2.4, 1.35, 0.32]),
  prop('south-wall-03', 'iron-fence-border-gate', [0, 0.68, 11.2], [2.2, 1.35, 0.32]),
  prop('south-wall-04', 'stone-wall', [4.8, 0.68, 11.2], [2.4, 1.35, 0.32]),
  prop('south-wall-05', 'stone-wall', [7.2, 0.68, 11.2], [2.4, 1.35, 0.32]),
  prop('west-wall-01', 'stone-wall', [-11.2, 0.68, -7.2], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('west-wall-02', 'stone-wall', [-11.2, 0.68, -4.8], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('west-wall-03', 'stone-wall-damaged', [-11.2, 0.68, -2.4], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('west-wall-04', 'stone-wall', [-11.2, 0.68, 2.4], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('west-wall-05', 'stone-wall', [-11.2, 0.68, 4.8], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('west-wall-06', 'stone-wall', [-11.2, 0.68, 7.2], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-01', 'stone-wall', [11.2, 0.68, -7.2], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-02', 'stone-wall-damaged', [11.2, 0.68, -4.8], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-03', 'stone-wall', [11.2, 0.68, -2.4], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-04', 'stone-wall', [11.2, 0.68, 2.4], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-05', 'stone-wall', [11.2, 0.68, 4.8], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
  prop('east-wall-06', 'stone-wall', [11.2, 0.68, 7.2], [2.4, 1.35, 0.32], { rotation: [0, 1.5708, 0] }),
]

const layoutProps = [
  prop('main-road-01', 'road', [0, 0.04, 7.6], [3.2, 0.08, 3.2], { color: 0x4f5148 }),
  prop('main-road-02', 'road', [0, 0.04, 4.2], [3.2, 0.08, 3.2], { color: 0x4f5148 }),
  prop('main-road-03', 'road', [0, 0.04, 0.8], [3.2, 0.08, 3.2], { color: 0x4f5148 }),
  prop('main-road-04', 'road', [0, 0.04, -2.6], [3.2, 0.08, 3.2], { color: 0x4f5148 }),
  prop('main-road-05', 'road', [0, 0.04, -6.0], [3.2, 0.08, 3.2], { color: 0x4f5148 }),
  prop('left-crypt', 'crypt-small', [-7.8, 0.95, -5.7], [2.6, 1.9, 2.4], { rotation: [0, 0.4, 0] }),
  prop('right-crypt', 'crypt-large', [7.8, 1.12, -5.4], [3.6, 2.25, 3.2], { rotation: [0, -0.35, 0] }),
  prop('center-altar', 'altar-stone', [0, 0.43, -3.8], [1.4, 0.85, 1.05]),
  prop('north-cross', 'cross-column', [0, 0.72, -8.3], [0.65, 1.45, 0.65]),
  prop('left-bench', 'bench-damaged', [-4.2, 0.33, 2.2], [1.9, 0.65, 0.65], { rotation: [0, 0.25, 0] }),
  prop('right-bench', 'bench', [4.2, 0.33, 2.2], [1.9, 0.65, 0.65], { rotation: [0, -0.25, 0] }),
  prop('left-pine-01', 'pine', [-9.0, 1.5, 7.2], [1.1, 3.0, 1.1]),
  prop('left-pine-02', 'pine-crooked', [-8.6, 1.5, -1.1], [1.1, 3.0, 1.1]),
  prop('right-pine-01', 'pine', [9.0, 1.5, 7.0], [1.1, 3.0, 1.1]),
  prop('right-pine-02', 'pine-fall', [8.2, 0.35, 0.6], [2.7, 0.7, 0.9], { rotation: [0, 0.8, 0] }),
  prop('left-rocks', 'rocks', [-6.8, 0.28, 5.5], [1.1, 0.55, 0.9]),
  prop('right-rocks', 'rocks-tall', [6.5, 0.53, 5.6], [0.8, 1.05, 0.75]),
  prop('coffin-left', 'coffin-old', [-5.6, 0.23, -1.7], [1.9, 0.45, 0.75], { rotation: [0, 0.9, 0] }),
  prop('coffin-right', 'coffin', [5.8, 0.23, -1.6], [1.9, 0.45, 0.75], { rotation: [0, -0.9, 0] }),
  prop('lightpost-left', 'lightpost-single', [-2.8, 1.45, 5.5], [0.55, 2.9, 0.55], { color: 0xb7a46e }),
  prop('lightpost-right', 'lightpost-single', [2.8, 1.45, 5.5], [0.55, 2.9, 0.55], { color: 0xb7a46e }),
  prop('fire-basket-center', 'fire-basket', [0, 0.5, 3.0], [1, 1, 1], { color: 0xb7a46e }),
]

const graveProps = [
  prop('grave-left-01', 'gravestone-cross', [-4.8, 0.58, 6.9], [0.7, 1.15, 0.35]),
  prop('grave-left-02', 'gravestone-wide', [-6.2, 0.43, 3.6], [1.15, 0.85, 0.35], { rotation: [0, 0.15, 0] }),
  prop('grave-left-03', 'gravestone-broken', [-5.2, 0.58, 0.6], [0.7, 1.15, 0.35], { rotation: [0, -0.2, 0] }),
  prop('grave-left-04', 'grave-border', [-7.2, 0.1, 1.4], [1.4, 0.2, 2.1], { rotation: [0, 0.35, 0] }),
  prop('grave-left-05', 'gravestone-decorative', [-8.4, 0.58, 4.3], [0.7, 1.15, 0.35]),
  prop('grave-right-01', 'gravestone-round', [4.8, 0.58, 6.8], [0.7, 1.15, 0.35]),
  prop('grave-right-02', 'gravestone-wide', [6.0, 0.43, 3.4], [1.15, 0.85, 0.35], { rotation: [0, -0.15, 0] }),
  prop('grave-right-03', 'gravestone-cross-large', [5.2, 0.58, 0.5], [0.7, 1.15, 0.35], { rotation: [0, 0.2, 0] }),
  prop('grave-right-04', 'grave-border', [7.3, 0.1, 1.4], [1.4, 0.2, 2.1], { rotation: [0, -0.35, 0] }),
  prop('grave-right-05', 'gravestone-bevel', [8.5, 0.58, 4.2], [0.7, 1.15, 0.35]),
  prop('pumpkin-01', 'pumpkin-carved', [-2.5, 0.3, -8.6], [0.65, 0.6, 0.65], { color: 0xc06a2f }),
  prop('pumpkin-02', 'pumpkin-tall', [2.6, 0.3, -8.5], [0.65, 0.6, 0.65], { color: 0xc06a2f }),
  prop('debris-01', 'debris', [-2.1, 0.13, -1.6], [1, 0.25, 0.8]),
  prop('debris-02', 'debris-wood', [2.1, 0.13, -1.5], [1, 0.25, 0.8]),
]

const props = [...boundaryProps, ...layoutProps, ...graveProps]
const collidableIds = new Set([
  ...boundaryProps.map((item) => item.id),
  'left-crypt',
  'right-crypt',
  'center-altar',
  'north-cross',
  'left-bench',
  'right-bench',
  'left-pine-01',
  'left-pine-02',
  'right-pine-01',
  'right-pine-02',
  'left-rocks',
  'right-rocks',
  'coffin-left',
  'coffin-right',
  'fire-basket-center',
  'grave-left-01',
  'grave-left-02',
  'grave-left-03',
  'grave-left-04',
  'grave-left-05',
  'grave-right-01',
  'grave-right-02',
  'grave-right-03',
  'grave-right-04',
  'grave-right-05',
])

const config = {
  id: 'graveyard-courtyard',
  name: '墓地庭院',
  spawnPoint: [0, 0, 8.2],
  requiredKills: 16,
  props,
  colliders: props
    .filter((item) => collidableIds.has(item.id))
    .map((item) => collider(item.id, item.position, item.size, item.rotation)),
  doors: [
    {
      id: 'courtyard-north-exit',
      position: [0, 1.1, -10.75],
      size: [2.2, 2.2, 0.38],
      targetMapId: 'mini-market-store',
      targetSpawnId: 'mini-market-entry',
      interactionDistance: 2.1,
    },
  ],
}

const response = await fetch(`${API_BASE_URL}/maps/${encodeURIComponent(config.id)}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'draft',
    levelNo: 1,
    levelTheme: 'graveyard',
    remark: 'seed complete graveyard courtyard',
    config,
  }),
})

if (!response.ok) {
  const text = await response.text()
  throw new Error(`导入失败：${response.status} ${text}`)
}

const stored = await response.json()
console.log(`已导入地图：${stored.name} (${stored.mapKey})`)
