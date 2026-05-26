import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import blasterTextureUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/Textures/colormap.png?url'
import blasterAUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-a.glb?url'
import blasterBUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-b.glb?url'
import blasterCUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-c.glb?url'
import blasterDUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-d.glb?url'
import blasterEUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-e.glb?url'
import blasterFUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-f.glb?url'
import blasterGUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-g.glb?url'
import blasterHUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-h.glb?url'
import blasterIUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-i.glb?url'
import blasterJUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-j.glb?url'
import blasterKUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-k.glb?url'
import blasterLUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-l.glb?url'
import blasterMUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-m.glb?url'
import blasterNUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-n.glb?url'
import blasterOUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-o.glb?url'
import blasterPUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-p.glb?url'
import blasterQUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-q.glb?url'
import blasterRUrl from '../assets/models/kenney_blaster-kit_2.1/Models/GLB format/blaster-r.glb?url'
import { GAME_CONFIG } from '../constants'
import { createTrackedLoadingManager, trackAssetTask } from '../systems/AssetLoadingProgress'

type GunModelAsset = {
  sources: THREE.Group[]
  texture: THREE.Texture
}

const BLASTER_URLS = [
  blasterAUrl,
  blasterBUrl,
  blasterCUrl,
  blasterDUrl,
  blasterEUrl,
  blasterFUrl,
  blasterGUrl,
  blasterHUrl,
  blasterIUrl,
  blasterJUrl,
  blasterKUrl,
  blasterLUrl,
  blasterMUrl,
  blasterNUrl,
  blasterOUrl,
  blasterPUrl,
  blasterQUrl,
  blasterRUrl,
]

export const MAX_GUN_LEVEL = BLASTER_URLS.length

let gunAssetPromise: Promise<GunModelAsset> | null = null

export function loadGunModels() {
  gunAssetPromise ??= loadBlasterModels()

  return gunAssetPromise
}

export function cloneGunModel(asset: GunModelAsset, weaponLevel: number) {
  const source = asset.sources[getGunIndex(weaponLevel)] ?? asset.sources[0]
  const model = clone(source)
  const wrapper = new THREE.Group()

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = size.z > 0 ? GAME_CONFIG.gunModelLength / size.z : 1

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, 0.08 - center.y * scale, -center.z * scale)
  wrapper.rotation.y = Math.PI
  wrapper.add(model)

  wrapper.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh)) return

    object.castShadow = true
    object.receiveShadow = true
    object.material = new THREE.MeshStandardMaterial({
      map: asset.texture,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.12,
    })
  })

  return wrapper
}

function getGunIndex(weaponLevel: number) {
  return THREE.MathUtils.clamp(Math.floor(weaponLevel), 1, BLASTER_URLS.length) - 1
}

async function loadBlasterModels(): Promise<GunModelAsset> {
  const manager = createTrackedLoadingManager('武器资源')
  const loader = new GLTFLoader(manager)
  const textureLoader = new THREE.TextureLoader(manager)

  return trackAssetTask('asset:guns', '加载武器模型', (async () => {
    const [texture, ...models] = await Promise.all([
      textureLoader.loadAsync(blasterTextureUrl),
      ...BLASTER_URLS.map((url) => loader.loadAsync(url).then((gltf) => gltf.scene)),
    ])

    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = false

    return {
      sources: models,
      texture,
    }
  })())
}
