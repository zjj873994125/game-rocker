import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import zombieRunUrl from '../assets/models/kenney_animated-characters-survivors/Animations/run.fbx?url'
import zombieModelUrl from '../assets/models/kenney_animated-characters-survivors/Model/characterMedium.fbx?url'
import zombieSkinUrl from '../assets/models/kenney_animated-characters-survivors/Skins/zombieA.png?url'
import zombieSkinCUrl from '../assets/models/kenney_animated-characters-survivors/Skins/zombieC.png?url'
import { GAME_CONFIG } from '../constants'

type ZombieModelAsset = {
  source: THREE.Group
  animations: THREE.AnimationClip[]
  runClip: THREE.AnimationClip | null
  scale: number
  yOffset: number
  center: THREE.Vector3
  height: number
  textures: THREE.Texture[]
}

let zombieAssetPromise: Promise<ZombieModelAsset> | null = null

export function loadZombieModel() {
  zombieAssetPromise ??= loadKenneyZombie()

  return zombieAssetPromise
}

export function cloneZombieModel(asset: ZombieModelAsset) {
  const model = clone(asset.source)
  const wrapper = new THREE.Group()
  const texture = asset.textures[Math.floor(Math.random() * asset.textures.length)] ?? asset.textures[0]
  const tint = createRandomZombieTint()
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
      color: tint,
      side: THREE.DoubleSide,
      roughness: 0.78,
      metalness: 0.02,
    })
  })

  return wrapper
}

async function loadKenneyZombie(): Promise<ZombieModelAsset> {
  const loader = new FBXLoader()
  const textureLoader = new THREE.TextureLoader()

  const [model, runAnimation, textureA, textureC] = await Promise.all([
    loader.loadAsync(zombieModelUrl),
    loader.loadAsync(zombieRunUrl),
    textureLoader.loadAsync(zombieSkinUrl),
    textureLoader.loadAsync(zombieSkinCUrl),
  ])

  const textures = [textureA, textureC]
  textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = true
  })

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  // 僵尸略矮于玩家，和墓地道具、围栏、门的比例保持一致。
  const targetHeight = GAME_CONFIG.zombieVisualHeight
  const scale = size.y > 0 ? targetHeight / size.y : 1
  const yOffset = -box.min.y * scale
  const runClip = runAnimation.animations.find((clip) => clip.name.toLowerCase().includes('run')) ?? null

  return {
    source: model,
    animations: runAnimation.animations,
    runClip,
    scale,
    yOffset,
    center,
    height: targetHeight,
    textures,
  }
}

function createRandomZombieTint() {
  const palette = [0xd8f0a5, 0xbfd6a0, 0xaec4a5, 0xc7d08b, 0xd2b0a0, 0xa8b9a8]
  const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])

  color.offsetHSL((Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08)

  return color
}
