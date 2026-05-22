<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GameWorld } from './systems/GameWorld'
import type { GameMapConfig } from './map/types'
import type { GameInput, GameStats, GameViewMode } from './types'

const props = defineProps<{
  input: GameInput
  viewMode: GameViewMode
  maps: readonly GameMapConfig[]
}>()

const emit = defineEmits<{
  stats: [stats: GameStats]
}>()

const host = ref<HTMLElement | null>(null)
let world: GameWorld | null = null
let resizeObserver: ResizeObserver | null = null

const gameInput = computed(() => props.input)

onMounted(() => {
  if (!host.value) return

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
  <div ref="host" class="zombie-game" aria-label="Zombie survival game canvas"></div>
</template>
