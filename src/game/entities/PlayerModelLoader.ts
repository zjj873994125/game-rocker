import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import playerIdleUrl from '../assets/models/kenney_animated-characters-protagonists/Animations/idle.fbx?url'
import playerRunUrl from '../assets/models/kenney_animated-characters-protagonists/Animations/run.fbx?url'
import playerModelUrl from '../assets/models/kenney_animated-characters-protagonists/Model/characterMedium.fbx?url'
import criminalMaleSkinUrl from '../assets/models/kenney_animated-characters-protagonists/Skins/criminalMaleA.png?url'
import cyborgFemaleSkinUrl from '../assets/models/kenney_animated-characters-protagonists/Skins/cyborgFemaleA.png?url'
import skaterFemaleSkinUrl from '../assets/models/kenney_animated-characters-protagonists/Skins/skaterFemaleA.png?url'
import skaterMaleSkinUrl from '../assets/models/kenney_animated-characters-protagonists/Skins/skaterMaleA.png?url'
import { GAME_CONFIG } from '../constants'
import { createTrackedLoadingManager, trackAssetTask } from '../systems/AssetLoadingProgress'

type PlayerModelAsset = {
  source: THREE.Group
  idleClip: THREE.AnimationClip | null
  runClip: THREE.AnimationClip | null
  scale: number
  yOffset: number
  center: THREE.Vector3
  textures: THREE.Texture[]
}

type PlayerModelInstance = {
  model: THREE.Group
}

let playerAssetPromise: Promise<PlayerModelAsset> | null = null

export function loadPlayerModel() {
  playerAssetPromise ??= loadKenneyPlayer()

  return playerAssetPromise
}

export function clonePlayerModel(asset: PlayerModelAsset): PlayerModelInstance {
  const model = clone(asset.source)
  const wrapper = new THREE.Group()
  const texture = asset.textures[Math.floor(Math.random() * asset.textures.length)] ?? asset.textures[0]

  model.scale.setScalar(asset.scale)
  model.position.set(-asset.center.x * asset.scale, asset.yOffset, -asset.center.z * asset.scale)
  wrapper.add(model)

  wrapper.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh)) return

    object.castShadow = true
    object.receiveShadow = true
    object.frustumCulled = false
    object.material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.72,
      metalness: 0.03,
    })
  })

  return {
    model: wrapper,
  }
}

async function loadKenneyPlayer(): Promise<PlayerModelAsset> {
  const manager = createTrackedLoadingManager('玩家资源')
  const loader = new FBXLoader(manager)
  const textureLoader = new THREE.TextureLoader(manager)

  return trackAssetTask('asset:player', '加载玩家模型', (async () => {
    const [model, idleAnimation, runAnimation, criminalMale, cyborgFemale, skaterFemale, skaterMale] = await Promise.all([
      loader.loadAsync(playerModelUrl),
      loader.loadAsync(playerIdleUrl),
      loader.loadAsync(playerRunUrl),
      textureLoader.loadAsync(criminalMaleSkinUrl),
      textureLoader.loadAsync(cyborgFemaleSkinUrl),
      textureLoader.loadAsync(skaterFemaleSkinUrl),
      textureLoader.loadAsync(skaterMaleSkinUrl),
    ])

    const textures = [criminalMale, cyborgFemale, skaterFemale, skaterMale]
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = true
    })

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    // 角色模型按目标身高统一缩放，避免换皮肤或换模型后和地图素材比例失衡。
    const targetHeight = GAME_CONFIG.playerVisualHeight
    const scale = size.y > 0 ? targetHeight / size.y : 1
    const yOffset = -box.min.y * scale

    return {
      source: model,
      idleClip: idleAnimation.animations.find((clip) => clip.name.toLowerCase().includes('idle')) ?? null,
      runClip: runAnimation.animations.find((clip) => clip.name.toLowerCase().includes('run')) ?? null,
      scale,
      yOffset,
      center,
      textures,
    }
  })())
}
