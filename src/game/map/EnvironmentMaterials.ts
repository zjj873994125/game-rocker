import * as THREE from 'three'

import doorTextureUrl from '../assets/models/textures/kenney_retro-textures-fantasy/PNG/door_metal_gate_lock.png?url'
import {
  DEFAULT_GROUND_REPEAT,
  DEFAULT_GROUND_TEXTURE_ID,
  getGroundTextureDefinition,
} from './GroundMaterials'
import type { GroundMaterialConfig } from './types'

const textureLoader = new THREE.TextureLoader()
let doorTexture: THREE.Texture | null = null
const groundTextures = new Map<string, THREE.Texture>()

function configureRetroTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestMipmapNearestFilter
  texture.needsUpdate = true
}

function getGroundTexture(textureId: string | undefined) {
  const definition = getGroundTextureDefinition(textureId)
  const cached = groundTextures.get(definition.id)
  if (cached) return cached

  const texture = textureLoader.load(definition.url)
  configureRetroTexture(texture)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  groundTextures.set(definition.id, texture)

  return texture
}

export function normalizeGroundMaterialConfig(config?: Partial<GroundMaterialConfig>): GroundMaterialConfig {
  const definition = getGroundTextureDefinition(config?.textureId ?? DEFAULT_GROUND_TEXTURE_ID)
  const repeat = Number.isFinite(config?.repeat) ? Number(config?.repeat) : DEFAULT_GROUND_REPEAT

  return {
    textureId: definition.id,
    repeat: THREE.MathUtils.clamp(repeat, 1, 40),
  }
}

function getDoorTexture() {
  if (!doorTexture) {
    doorTexture = textureLoader.load(doorTextureUrl)
    configureRetroTexture(doorTexture)
  }

  return doorTexture
}

export function createGroundMaterial(config: Partial<GroundMaterialConfig> = {}) {
  const normalized = normalizeGroundMaterialConfig(config)
  const texture = getGroundTexture(normalized.textureId).clone()
  // 每个地面实例使用独立 texture clone，避免游戏和编辑器设置不同 repeat 时互相覆盖。
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(normalized.repeat, normalized.repeat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestMipmapNearestFilter
  texture.needsUpdate = true

  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.02,
  })
}

export function createDoorMaterial(options: { unlocked?: boolean; transparent?: boolean } = {}) {
  const unlocked = Boolean(options.unlocked)

  return new THREE.MeshStandardMaterial({
    map: getDoorTexture(),
    color: unlocked ? 0xb8ffc3 : 0xd9e1ea,
    roughness: 0.58,
    metalness: 0.22,
    emissive: unlocked ? 0x214f25 : 0x000000,
    emissiveIntensity: unlocked ? 0.45 : 0,
    transparent: options.transparent,
    opacity: options.transparent ? 0.82 : 1,
  })
}
