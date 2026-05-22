import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import graveyardTextureUrl from '../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/Textures/colormap.png?url'
import type { Vector3Tuple } from './types'

const modelCache = new Map<string, Promise<THREE.Group>>()
const assetModelUrlCache = new Map<string, Promise<string | null>>()
const graveyardModelModules = import.meta.glob('../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>
let graveyardTexturePromise: Promise<THREE.Texture> | null = null

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

  const loader = graveyardModelModules[`../assets/models/maps/kenney_graveyard-kit_5.0/Models/GLB format/${assetId}.glb`]
  const promise = loader ? loader() : Promise.resolve(null)
  assetModelUrlCache.set(assetId, promise)

  return await promise
}

export function normalizeMapModel(model: THREE.Object3D, targetSize: readonly [number, number, number]) {
  const { center, scale } = getMapModelFit(model, targetSize)

  model.scale.setScalar(scale)
  // 外层代理盒子的 origin 在 collider 中心；模型也必须居中到代理盒子中心，避免再额外抬高半个高度。
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
}

export function calculateNormalizedMapModelBounds(model: THREE.Object3D, targetSize: readonly [number, number, number]): MapModelBounds {
  const { size, scale } = getMapModelFit(model, targetSize)

  return {
    // 这里计算的是模型被 normalizeMapModel 等比塞入代理盒子后的真实可视尺寸，编辑器吸附用它会比手写 collider 更贴近模型外观。
    size: [
      Number((size.x * scale).toFixed(3)),
      Number((size.y * scale).toFixed(3)),
      Number((size.z * scale).toFixed(3)),
    ],
    offset: [0, 0, 0],
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

  return { center, size, scale }
}

async function loadMapModelOnce(modelUrl: string) {
  const loader = new GLTFLoader()
  const [model, texture] = await Promise.all([
    loader.loadAsync(modelUrl).then((gltf) => gltf.scene),
    loadGraveyardTexture(),
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
}

async function loadGraveyardTexture() {
  graveyardTexturePromise ??= new THREE.TextureLoader().loadAsync(graveyardTextureUrl).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = false
    return texture
  })

  return graveyardTexturePromise
}
