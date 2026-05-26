import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import miniMarketTextureUrl from '../assets/models/maps/kenney_mini-market/Models/Textures/variation-a.png?url'
import graveyardTextureUrl from '../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/Textures/colormap.png?url'
import { createTrackedLoadingManager, trackAssetTask } from '../systems/AssetLoadingProgress'
import type { Vector3Tuple } from './types'

const modelCache = new Map<string, Promise<THREE.Group>>()
const assetModelUrlCache = new Map<string, Promise<string | null>>()
const modelPackageCache = new Map<string, string>()
const graveyardModelModules = import.meta.glob('../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>
const miniMarketModelModules = import.meta.glob('../assets/models/maps/kenney_mini-market/Models/GLB format/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>
let graveyardTexturePromise: Promise<THREE.Texture> | null = null
let miniMarketTexturePromise: Promise<THREE.Texture> | null = null

export type MapModelBounds = {
  size: Vector3Tuple
  offset: Vector3Tuple
}

export async function loadMapModel(modelUrl: string) {
  const modelPromise = modelCache.get(modelUrl) ?? loadMapModelOnce(modelUrl)
  modelCache.set(modelUrl, modelPromise)
  const source = await modelPromise

  return clone(source)
}

export async function resolveMapAssetModelUrl(assetId: string | undefined) {
  if (!assetId) return null

  const cached = assetModelUrlCache.get(assetId)
  if (cached) return await cached

  const { packageId, localAssetId } = parseMapAssetId(assetId)
  const loader = resolveMapModelLoader(packageId, localAssetId)
  const promise = loader
    ? loader().then((modelUrl) => {
        // 构建后的 URL 可能只剩 hash 文件名，缓存来源包名用于后续选择正确贴图。
        modelPackageCache.set(modelUrl, packageId)
        return modelUrl
      })
    : Promise.resolve(null)
  assetModelUrlCache.set(assetId, promise)

  return await promise
}

export function normalizeMapModel(model: THREE.Object3D, targetSize: readonly [number, number, number]) {
  const { box, center, scale } = getMapModelFit(model, targetSize)

  model.scale.setScalar(scale)
  // 地图数据里的 position.y 是碰撞盒中心；模型底部贴到碰撞盒底部，避免矮模型在盒子中心悬浮。
  model.position.set(
    -center.x * scale,
    -box.min.y * scale - targetSize[1] / 2,
    -center.z * scale,
  )
}

export function calculateNormalizedMapModelBounds(model: THREE.Object3D, targetSize: readonly [number, number, number]): MapModelBounds {
  const { box, size, scale } = getMapModelFit(model, targetSize)
  const normalizedHeight = size.y * scale

  return {
    // 这里计算的是模型被 normalizeMapModel 等比塞入代理盒子后的真实可视尺寸，编辑器吸附用它会比手写 collider 更贴近模型外观。
    size: [
      Number((size.x * scale).toFixed(3)),
      Number((size.y * scale).toFixed(3)),
      Number((size.z * scale).toFixed(3)),
    ],
    offset: [
      0,
      Number(((box.min.y * scale + normalizedHeight / 2) - targetSize[1] / 2).toFixed(3)),
      0,
    ],
  }
}

function getMapModelFit(model: THREE.Object3D, targetSize: readonly [number, number, number]) {
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = Math.min(
    targetSize[0] / Math.max(size.x, 0.001),
    targetSize[1] / Math.max(size.y, 0.001),
    targetSize[2] / Math.max(size.z, 0.001),
  )

  return { box, center, size, scale }
}

async function loadMapModelOnce(modelUrl: string) {
  const manager = createTrackedLoadingManager('地图模型')

  return trackAssetTask(`asset:map-model:${modelUrl}`, '加载地图模型', (async () => {
    const loader = new GLTFLoader(manager)
    const packageId = inferMapPackageFromModelUrl(modelUrl)
    const [model, texture] = await Promise.all([
      loader.loadAsync(modelUrl).then((gltf) => gltf.scene),
      loadMapPackageTexture(packageId),
    ])

    model.traverse((object: THREE.Object3D) => {
      if (!(object instanceof THREE.Mesh)) return

      object.castShadow = true
      object.receiveShadow = true
      object.material = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0.04,
      })
    })

    return model
  })())
}

function parseMapAssetId(assetId: string) {
  const separatorIndex = assetId.indexOf(':')
  if (separatorIndex === -1) {
    return {
      packageId: 'graveyard',
      localAssetId: assetId,
    }
  }

  return {
    packageId: assetId.slice(0, separatorIndex),
    localAssetId: assetId.slice(separatorIndex + 1),
  }
}

function resolveMapModelLoader(packageId: string, localAssetId: string) {
  if (packageId === 'mini-market') {
    return miniMarketModelModules[`../assets/models/maps/kenney_mini-market/Models/GLB format/${localAssetId}.glb`]
  }

  return graveyardModelModules[`../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/${localAssetId}.glb`]
}

function inferMapPackageFromModelUrl(modelUrl: string) {
  const cachedPackage = modelPackageCache.get(modelUrl)
  if (cachedPackage) return cachedPackage
  if (modelUrl.includes('kenney_mini-market')) return 'mini-market'

  return 'graveyard'
}

async function loadMapPackageTexture(packageId: string) {
  if (packageId === 'mini-market') return await loadMiniMarketTexture()

  return await loadGraveyardTexture()
}

async function loadGraveyardTexture() {
  graveyardTexturePromise ??= trackAssetTask(
    'asset:graveyard-texture',
    '加载墓地贴图',
    new THREE.TextureLoader(createTrackedLoadingManager('墓地贴图')).loadAsync(graveyardTextureUrl).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = false
      return texture
    }),
  )

  return graveyardTexturePromise
}

async function loadMiniMarketTexture() {
  miniMarketTexturePromise ??= trackAssetTask(
    'asset:mini-market-texture',
    '加载便利店贴图',
    new THREE.TextureLoader(createTrackedLoadingManager('便利店贴图')).loadAsync(miniMarketTextureUrl).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = false
      return texture
    }),
  )

  return miniMarketTexturePromise
}
