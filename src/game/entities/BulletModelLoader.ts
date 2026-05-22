import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import bulletTextureUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/Textures/colormap.png?url'
import bulletFoamUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/bullet-foam.glb?url'
import bulletFoamThickUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/bullet-foam-thick.glb?url'
import bulletFoamTipUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/bullet-foam-tip.glb?url'
import bulletFoamTipThickUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/bullet-foam-tip-thick.glb?url'

type BulletModelAsset = {
  sources: THREE.Group[]
  texture: THREE.Texture
}

const BULLET_URLS = [bulletFoamUrl, bulletFoamThickUrl, bulletFoamTipUrl, bulletFoamTipThickUrl]

let bulletAssetPromise: Promise<BulletModelAsset> | null = null

export function loadBulletModels() {
  bulletAssetPromise ??= loadFoamBullets()

  return bulletAssetPromise
}

export function cloneBulletModel(asset: BulletModelAsset, direction: THREE.Vector3, weaponLevel: number) {
  const source = asset.sources[getBulletIndex(weaponLevel)] ?? asset.sources[0]
  const model = clone(source)
  const wrapper = new THREE.Group()

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = size.y > 0 ? 0.22 / size.y : 1

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  model.rotation.x = Math.PI / 2
  wrapper.rotation.y = Math.atan2(direction.x, direction.z)
  wrapper.add(model)

  wrapper.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh)) return

    object.castShadow = true
    object.receiveShadow = true
    object.material = new THREE.MeshStandardMaterial({
      map: asset.texture,
      color: 0xffffff,
      emissive: 0xff7a1a,
      emissiveIntensity: 0.18,
      roughness: 0.5,
      metalness: 0.04,
    })
  })

  return wrapper
}

function getBulletIndex(weaponLevel: number) {
  return (THREE.MathUtils.clamp(Math.floor(weaponLevel), 1, 18) - 1) % BULLET_URLS.length
}

async function loadFoamBullets(): Promise<BulletModelAsset> {
  const loader = new GLTFLoader()
  const textureLoader = new THREE.TextureLoader()

  const [texture, ...models] = await Promise.all([
    textureLoader.loadAsync(bulletTextureUrl),
    ...BULLET_URLS.map((url) => loader.loadAsync(url).then((gltf) => gltf.scene)),
  ])

  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = false

  return {
    sources: models,
    texture,
  }
}
