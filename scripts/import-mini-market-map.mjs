const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8088/api'
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.ZJJ_AUTH_TOKEN || ''

function prop(id, assetId, position, size, options = {}) {
  return {
    id,
    assetId,
    position,
    size,
    rotation: options.rotation ?? [0, 0, 0],
    scale: options.scale ?? [1, 1, 1],
    color: options.color ?? 0x7b8179,
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

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`请求失败：${response.status} ${text}`)
  }

  return await response.json()
}

const WALL_Y = 0.85
const SHELF_Y = 0.42
const HALF_PI = 1.5708

function wall(id, assetId, x, z, rotation = [0, 0, 0]) {
  return prop(id, assetId, [x, WALL_Y, z], [2, 1.7, 0.25], { rotation })
}

function aisleShelf(id, assetId, x, z, color) {
  return prop(id, assetId, [x, SHELF_Y, z], [1.55, 1.45, 0.65], {
    rotation: [0, HALF_PI, 0],
    color,
  })
}

function endCap(id, x, z, rotation = [0, 0, 0]) {
  return prop(id, 'mini-market:shelf-end', [x, SHELF_Y, z], [0.85, 1.45, 0.75], {
    rotation,
    color: 0x8c7353,
  })
}

const boundaryProps = [
  // 外墙按真实门店封闭，南侧中间留入口，其余墙段使用窗墙和实墙交错。
  ...[-9, -7, -5, -3, -1, 1, 3, 5, 7, 9].map((x, index) => (
    wall(`market-north-wall-${String(index + 1).padStart(2, '0')}`, index % 2 === 0 ? 'mini-market:wall-window' : 'mini-market:wall', x, -11.1)
  )),
  wall('market-south-wall-left-01', 'mini-market:wall-window', -9, 11.1),
  wall('market-south-wall-left-02', 'mini-market:wall', -7, 11.1),
  wall('market-south-wall-left-03', 'mini-market:wall-window', -5, 11.1),
  wall('market-south-wall-left-04', 'mini-market:wall', -3, 11.1),
  wall('market-south-entry-door', 'mini-market:wall-door-rotate', 0, 11.1),
  wall('market-south-wall-right-01', 'mini-market:wall', 3, 11.1),
  wall('market-south-wall-right-02', 'mini-market:wall-window', 5, 11.1),
  wall('market-south-wall-right-03', 'mini-market:wall', 7, 11.1),
  wall('market-south-wall-right-04', 'mini-market:wall-window', 9, 11.1),
  ...[-9, -7, -5, -3, -1, 1, 3, 5, 7, 9].map((z, index) => (
    wall(`market-west-wall-${String(index + 1).padStart(2, '0')}`, index % 3 === 1 ? 'mini-market:wall-window' : 'mini-market:wall', -11.1, z, [0, HALF_PI, 0])
  )),
  ...[-9, -7, -5, -3, -1, 1, 3, 5, 7, 9].map((z, index) => (
    wall(`market-east-wall-${String(index + 1).padStart(2, '0')}`, index % 3 === 0 ? 'mini-market:wall-window' : 'mini-market:wall', 11.1, z, [0, HALF_PI, 0])
  )),
]

const layoutProps = [
  // 入口区：左侧放购物车和篮筐，右侧直接连接收银结账动线。
  prop('market-entry-cart-01', 'mini-market:shopping-cart', [-7.9, 0.43, 8.55], [0.9, 0.85, 1.25], { rotation: [0, -0.18, 0] }),
  prop('market-entry-cart-02', 'mini-market:shopping-cart', [-6.75, 0.43, 8.55], [0.9, 0.85, 1.25], { rotation: [0, -0.12, 0] }),
  prop('market-entry-baskets', 'mini-market:shopping-basket', [-5.55, 0.18, 8.35], [0.75, 0.35, 0.58], { rotation: [0, 0.18, 0], color: 0xb05043 }),
  prop('market-front-produce', 'mini-market:display-fruit', [-7.25, 0.53, 5.45], [1.55, 1.05, 1.05], { rotation: [0, 0.18, 0], color: 0x7d9a55 }),
  prop('market-front-bread', 'mini-market:display-bread', [-4.95, 0.53, 5.35], [1.45, 1.05, 1], { rotation: [0, -0.1, 0], color: 0x9a7550 }),

  // 收银区：靠近出口右侧，使用围栏模拟排队通道，员工站在收银台后。
  prop('market-checkout-register', 'mini-market:cash-register', [6.65, 0.28, 7.65], [0.9, 0.55, 0.65], { rotation: [0, -HALF_PI, 0], color: 0x6c7480 }),
  prop('market-checkout-employee', 'mini-market:character-employee', [8.25, 0.72, 7.25], [0.75, 1.45, 0.75], { rotation: [0, -HALF_PI, 0], color: 0x6d8aa0 }),
  prop('market-checkout-rail-01', 'mini-market:fence', [5.4, 0.58, 5.95], [1.7, 1.15, 0.2], { rotation: [0, HALF_PI, 0], color: 0x6b6f68 }),
  prop('market-checkout-rail-02', 'mini-market:fence', [7.95, 0.58, 5.1], [1.7, 1.15, 0.2], { rotation: [0, HALF_PI, 0], color: 0x6b6f68 }),

  // 中场货架：三条纵向货架岛，保留前后横向主通道和左右侧通道。
  aisleShelf('market-aisle-left-01', 'mini-market:shelf-boxes', -5.8, 2.7, 0x8c7353),
  aisleShelf('market-aisle-left-02', 'mini-market:shelf-bags', -5.8, 0.45, 0x8c7353),
  aisleShelf('market-aisle-left-03', 'mini-market:shelf-boxes', -5.8, -1.8, 0x8c7353),
  aisleShelf('market-aisle-left-04', 'mini-market:shelf-bags', -5.8, -4.05, 0x8c7353),
  endCap('market-aisle-left-front-cap', -5.8, 4.2),
  endCap('market-aisle-left-back-cap', -5.8, -5.5, [0, 3.1416, 0]),
  aisleShelf('market-aisle-center-01', 'mini-market:shelf-bags', -1.55, 2.7, 0x8c7353),
  aisleShelf('market-aisle-center-02', 'mini-market:shelf-boxes', -1.55, 0.45, 0x8c7353),
  aisleShelf('market-aisle-center-03', 'mini-market:shelf-bags', -1.55, -1.8, 0x8c7353),
  aisleShelf('market-aisle-center-04', 'mini-market:shelf-boxes', -1.55, -4.05, 0x8c7353),
  endCap('market-aisle-center-front-cap', -1.55, 4.2),
  endCap('market-aisle-center-back-cap', -1.55, -5.5, [0, 3.1416, 0]),
  aisleShelf('market-aisle-right-01', 'mini-market:shelf-boxes', 2.7, 2.7, 0x8c7353),
  aisleShelf('market-aisle-right-02', 'mini-market:shelf-bags', 2.7, 0.45, 0x8c7353),
  aisleShelf('market-aisle-right-03', 'mini-market:shelf-boxes', 2.7, -1.8, 0x8c7353),
  aisleShelf('market-aisle-right-04', 'mini-market:shelf-bags', 2.7, -4.05, 0x8c7353),
  endCap('market-aisle-right-front-cap', 2.7, 4.2),
  endCap('market-aisle-right-back-cap', 2.7, -5.5, [0, 3.1416, 0]),

  // 冷藏和服务设备靠边/靠后，符合超市后墙冷柜、侧边冰柜的常见布局。
  prop('market-back-freezer-left', 'mini-market:freezers-standing', [-7.7, 0.88, -9.65], [2.6, 1.75, 0.75], { color: 0x8aa4ad }),
  prop('market-back-freezer-center', 'mini-market:freezers-standing', [-4.9, 0.88, -9.65], [2.6, 1.75, 0.75], { color: 0x8aa4ad }),
  prop('market-back-freezer-right', 'mini-market:freezers-standing', [-2.1, 0.88, -9.65], [2.6, 1.75, 0.75], { color: 0x8aa4ad }),
  prop('market-bottle-return', 'mini-market:bottle-return', [2.1, 0.78, -9.5], [1.35, 1.55, 0.75], { color: 0x8a8f87 }),
  prop('market-side-freezer-01', 'mini-market:freezer', [8.85, 0.48, -5.95], [1.65, 0.95, 1], { rotation: [0, -HALF_PI, 0], color: 0x8aa4ad }),
  prop('market-side-freezer-02', 'mini-market:freezer', [8.85, 0.48, -3.85], [1.65, 0.95, 1], { rotation: [0, -HALF_PI, 0], color: 0x8aa4ad }),
  prop('market-side-bread-display', 'mini-market:display-bread', [8.5, 0.53, -0.65], [1.35, 1.05, 0.95], { rotation: [0, -HALF_PI, 0], color: 0x9a7550 }),
  prop('market-side-fruit-display', 'mini-market:display-fruit', [8.45, 0.53, 1.65], [1.45, 1.05, 1], { rotation: [0, -HALF_PI, 0], color: 0x7d9a55 }),

  // 结构柱靠边，不阻断主要动线。
  prop('market-column-left', 'mini-market:column', [-9.2, 1.05, -1.1], [0.55, 2.1, 0.55], { color: 0x8a8f87 }),
  prop('market-column-right', 'mini-market:column', [8.85, 1.05, 3.8], [0.55, 2.1, 0.55], { color: 0x8a8f87 }),
]

const props = [...boundaryProps, ...layoutProps]
const collidableIds = new Set([
  ...boundaryProps.map((item) => item.id),
  ...layoutProps
    .filter((item) => !['market-entry-baskets', 'market-employee'].includes(item.id))
    .map((item) => item.id),
])

const miniMarketMap = {
  id: 'mini-market-store',
  name: '便利店',
  spawnPoint: [0, 0, 8.4],
  requiredKills: 18,
  groundMaterial: {
    textureId: 'floor-stone-pattern-small-depth',
    repeat: 14,
  },
  props,
  colliders: props
    .filter((item) => collidableIds.has(item.id))
    .map((item) => collider(item.id, item.position, item.size, item.rotation)),
  doors: [
    {
      id: 'mini-market-exit',
      position: [0, 0.95, 11.1],
      size: [2, 1.9, 0.36],
      targetMapId: 'graveyard-courtyard',
      targetSpawnId: 'default',
      interactionDistance: 2.2,
    },
  ],
}

const courtyardMap = await apiRequest('/maps/graveyard-courtyard')
const updatedCourtyardConfig = {
  ...courtyardMap.config,
  doors: courtyardMap.config.doors.map((door) => (
    door.id === 'courtyard-north-exit'
      ? {
          ...door,
          targetMapId: miniMarketMap.id,
          targetSpawnId: 'mini-market-entry',
        }
      : door
  )),
}

await apiRequest(`/maps/${encodeURIComponent(miniMarketMap.id)}`, {
  method: 'PUT',
  body: JSON.stringify({
    status: 'published',
    levelNo: 2,
    levelTheme: 'mini_market',
    editMode: 'public',
    remark: 'seed mini market store level',
    config: miniMarketMap,
  }),
})

await apiRequest('/maps/graveyard-courtyard', {
  method: 'PUT',
  body: JSON.stringify({
    status: courtyardMap.status,
    levelNo: courtyardMap.levelNo ?? 1,
    levelTheme: courtyardMap.levelTheme ?? 'graveyard',
    editMode: courtyardMap.editMode,
    remark: 'link courtyard exit to mini market store',
    config: updatedCourtyardConfig,
  }),
})

console.log(`已导入新关卡：${miniMarketMap.name} (${miniMarketMap.id})`)
console.log('已把 graveyard-courtyard 的 courtyard-north-exit 指向 mini-market-store')
