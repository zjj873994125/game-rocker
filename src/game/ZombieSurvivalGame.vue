<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GameWorld } from './systems/GameWorld'
import type { GameMapConfig } from './map/types'
import type { GameInput, GameStats, GameViewMode } from './types'
import type { AssetLoadingSnapshot } from './systems/AssetLoadingProgress'
import { subscribeAssetLoading } from './systems/AssetLoadingProgress'
import { preloadGameAssets } from './systems/preloadGameAssets'

const props = defineProps<{
  input: GameInput
  viewMode: GameViewMode
  maps: readonly GameMapConfig[]
}>()

const emit = defineEmits<{
  stats: [stats: GameStats]
}>()

const host = ref<HTMLElement | null>(null)
const loading = ref<AssetLoadingSnapshot>({
  active: true,
  loaded: 0,
  total: 1,
  progress: 0,
  currentLabel: '准备游戏资源',
  error: '',
})
let world: GameWorld | null = null
let resizeObserver: ResizeObserver | null = null
let unsubscribeLoading: (() => void) | null = null

const gameInput = computed(() => props.input)

onMounted(async () => {
  if (!host.value) return

  unsubscribeLoading = subscribeAssetLoading((snapshot) => {
    if (snapshot.total === 0) return
    loading.value = snapshot
  })

  try {
    await preloadGameAssets(props.maps)
  } catch (error) {
    console.warn('Failed to preload game assets', error)
    loading.value = {
      ...loading.value,
      active: false,
      error: error instanceof Error ? error.message : '资源预加载失败',
    }
  }

  world = new GameWorld(host.value, (stats) => emit('stats', stats), props.maps)
  world.setInput(gameInput.value)
  world.setViewMode(props.viewMode)
  world.start()

  resizeObserver = new ResizeObserver(() => world?.resize())
  resizeObserver.observe(host.value)
})

watch(
  gameInput,
  (input) => {
    world?.setInput(input)
  },
  { deep: true },
)

watch(
  () => props.viewMode,
  (viewMode) => {
    world?.setViewMode(viewMode)
  },
)

onBeforeUnmount(() => {
  unsubscribeLoading?.()
  resizeObserver?.disconnect()
  world?.dispose()
})

defineExpose({
  switchMap(mapId: string) {
    world?.switchMap(mapId)
  },
})
</script>

<template>
  <div ref="host" class="zombie-game" aria-label="Zombie survival game canvas">
    <div v-if="loading.active" class="asset-loading" role="status" aria-live="polite">
      <span>资源加载中</span>
      <strong>{{ loading.progress }}%</strong>
      <div class="asset-loading__bar" aria-hidden="true">
        <i :style="{ width: `${loading.progress}%` }" />
      </div>
      <small>{{ loading.loaded }}/{{ loading.total }} {{ loading.currentLabel }}</small>
    </div>
  </div>
</template>
