import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import dropTextureUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/Textures/colormap.png?url'
import clipSmallUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/clip-small.glb?url'
import medkitIconUrl from '../assets/models/kenney_blaster-kit_2.1/Previews/target-fragment-small.png?url'
import { createTrackedLoadingManager, trackAssetTask } from '../systems/AssetLoadingProgress'

export type DropItemType = 'medkit' | 'magazine'

type DropAssets = {
  clipSmall: THREE.Group
  clipTexture: THREE.Texture
  medkitTexture: THREE.Texture
}

let dropAssetsPromise: Promise<DropAssets> | null = null

export class DropItem {
  readonly group = new THREE.Group()
  readonly radius = 0.55
  readonly type: DropItemType

  private age = 0

  constructor(type: DropItemType, position: THREE.Vector3) {
    this.type = type
    this.group.position.copy(position)
    this.group.position.y = 0.08
    this.createFallbackModel()
    this.loadModel()
  }

  update(delta: number) {
    this.age += delta
    this.group.rotation.y += delta * 1.4
    this.group.position.y = 0.08 + Math.sin(this.age * 4) * 0.035
  }

  dispose() {
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return

      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
  }

  private createFallbackModel() {
    const material = new THREE.MeshStandardMaterial({
      color: this.type === 'medkit' ? 0xf04c4c : 0x67d4ff,
      roughness: 0.55,
      metalness: 0.08,
    })
    const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), material)
    fallback.castShadow = true
    fallback.receiveShadow = true
    this.group.add(fallback)
  }

  private loadModel() {
    loadDropAssets()
      .then((assets) => {
        this.group.clear()
        this.group.add(this.type === 'magazine' ? createMagazineModel(assets) : createMedkitModel(assets))
      })
      .catch((error: unknown) => {
        console.warn('Failed to load drop item model', error)
      })
  }
}

function createMagazineModel(assets: DropAssets) {
  const model = clone(assets.clipSmall)
  const wrapper = new THREE.Group()

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = size.y > 0 ? 0.38 / size.y : 1

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  // 弹匣作为可拾取装备需要竖立显示，避免在地面上被视角压扁。
  model.rotation.set(0, 0, Math.PI / 7)
  wrapper.add(model)

  wrapper.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh)) return

    object.castShadow = true
    object.receiveShadow = true
    object.material = new THREE.MeshStandardMaterial({
      map: assets.clipTexture,
      color: 0xffffff,
      roughness: 0.56,
      metalness: 0.1,
    })
  })

  return wrapper
}

function createMedkitModel(assets: DropAssets) {
  const wrapper = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.08, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.02 }),
  )
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ map: assets.medkitTexture, transparent: true, side: THREE.DoubleSide }),
  )

  base.castShadow = true
  base.receiveShadow = true
  icon.position.y = 0.045
  icon.rotation.x = -Math.PI / 2
  wrapper.add(base, icon)

  return wrapper
}

async function loadDropAssets(): Promise<DropAssets> {
  dropAssetsPromise ??= loadDropAssetsOnce()

  return dropAssetsPromise
}

export function preloadDropAssets() {
  return loadDropAssets()
}

async function loadDropAssetsOnce() {
  const manager = createTrackedLoadingManager('掉落物资源')
  const gltfLoader = new GLTFLoader(manager)
  const textureLoader = new THREE.TextureLoader(manager)

  return trackAssetTask('asset:drops', '加载掉落物模型', (async () => {
    const [clipSmall, clipTexture, medkitTexture] = await Promise.all([
      gltfLoader.loadAsync(clipSmallUrl).then((gltf) => gltf.scene),
      textureLoader.loadAsync(dropTextureUrl),
      textureLoader.loadAsync(medkitIconUrl),
    ])

    clipTexture.colorSpace = THREE.SRGBColorSpace
    clipTexture.flipY = false
    medkitTexture.colorSpace = THREE.SRGBColorSpace

    return {
      clipSmall,
      clipTexture,
      medkitTexture,
    }
  })())
}
