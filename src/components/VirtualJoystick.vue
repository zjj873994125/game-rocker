<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { JOYSTICK_HEAD, SPRITE_SIZE } from '../constants/arcadeSprite'
import joystickSprite from '../assets/yaogannew.png'

const props = withDefaults(
  defineProps<{
    size?: number
    knobSize?: number
    headLeft?: number
    arrowColor?: string
    keyboardMapping?: {
      up?: string[]
      down?: string[]
      left?: string[]
      right?: string[]
    }
  }>(),
  {
    size: 182,
    knobSize: 80,
    headLeft: 264,
    arrowColor: '#d51723',
    keyboardMapping: () => ({
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
    }),
  },
)

const emit = defineEmits<{
  move: [x: number, y: number]
  end: []
}>()

const zoneRef = ref<HTMLElement | null>(null)
const pointerId = ref<number | null>(null)
const offsetX = ref(0)
const offsetY = ref(0)
const pressing = ref(false)
const keyboardKeys = ref(new Set<string>())

const limit = computed(() => Math.round(props.size * 0.33))

const knobStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${pressing.value ? 0.96 : 1})`,
}))

const shaftLine = computed(() => {
  const center = props.size / 2

  return {
    x1: center,
    y1: center,
    x2: center + offsetX.value * 0.62,
    y2: center + offsetY.value * 0.62 - props.knobSize * 0.12,
  }
})

const shaftCoverStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px)`,
}))

const keyboardCodeMap = computed(() => {
  const entries = Object.entries(props.keyboardMapping) as Array<[
    'up' | 'down' | 'left' | 'right',
    string[] | undefined,
  ]>

  return new Map(entries.flatMap(([direction, codes]) => (codes ?? []).map((code) => [code, direction])))
})

function shouldIgnoreKeyboard(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()

  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function setJoystickOffset(dx: number, dy: number) {
  offsetX.value = Math.round(dx)
  offsetY.value = Math.round(dy)
  emit('move', offsetX.value, offsetY.value)
}

function resetJoystick() {
  offsetX.value = 0
  offsetY.value = 0
  emit('end')
}

function syncKeyboardVector() {
  const directions = new Set(
    Array.from(keyboardKeys.value)
      .map((code) => keyboardCodeMap.value.get(code))
      .filter(Boolean),
  )

  let x = 0
  let y = 0
  if (directions.has('left')) x -= 1
  if (directions.has('right')) x += 1
  if (directions.has('up')) y -= 1
  if (directions.has('down')) y += 1

  if (x === 0 && y === 0) {
    if (pressing.value && pointerId.value == null) {
      pressing.value = false
      resetJoystick()
    }
    return
  }

  const distance = Math.hypot(x, y)
  pressing.value = true
  setJoystickOffset((x / distance) * limit.value, (y / distance) * limit.value)
}

function onKeyDown(event: KeyboardEvent) {
  if (shouldIgnoreKeyboard(event) || !keyboardCodeMap.value.has(event.code)) return
  event.preventDefault()
  keyboardKeys.value.add(event.code)
  syncKeyboardVector()
}

function onKeyUp(event: KeyboardEvent) {
  if (!keyboardCodeMap.value.has(event.code)) return
  event.preventDefault()
  keyboardKeys.value.delete(event.code)
  syncKeyboardVector()
}

function updateFromPointer(clientX: number, clientY: number) {
  if (!zoneRef.value) return

  const rect = zoneRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  let dx = clientX - cx
  let dy = clientY - cy

  const pointerDistance = Math.hypot(dx, dy)
  if (pointerDistance > limit.value) {
    const ratio = limit.value / pointerDistance
    dx *= ratio
    dy *= ratio
  }

  setJoystickOffset(dx, dy)
}

function onPointerDown(event: PointerEvent) {
  if (!zoneRef.value) return
  pointerId.value = event.pointerId
  pressing.value = true
  keyboardKeys.value.clear()
  zoneRef.value.setPointerCapture(event.pointerId)
  updateFromPointer(event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (!pressing.value || pointerId.value !== event.pointerId) return
  updateFromPointer(event.clientX, event.clientY)
}

function releaseJoystick(event?: PointerEvent) {
  if (event && pointerId.value !== event.pointerId) return
  pressing.value = false
  pointerId.value = null
  resetJoystick()
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div
    ref="zoneRef"
    class="joystick"
    :style="{
      '--joy-size': `${size}px`,
      '--knob-size': `${knobSize}px`,
      '--sprite-url': `url(${joystickSprite})`,
      '--sprite-width': `${SPRITE_SIZE.width}px`,
      '--sprite-height': `${SPRITE_SIZE.height}px`,
      '--head-width': `${JOYSTICK_HEAD.width}px`,
      '--head-top': `${JOYSTICK_HEAD.top}px`,
      '--head-left': `${headLeft}px`,
      '--arrow-color': arrowColor,
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="releaseJoystick"
    @pointercancel="releaseJoystick"
  >
    <div class="joystick__arrows">
      <span class="up">▲</span>
      <span class="right">▶</span>
      <span class="down">▼</span>
      <span class="left">◀</span>
    </div>

    <div class="joystick__base">
      <div class="joystick__plate" />
      <svg class="joystick__shaft-svg" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
        <line
          class="joystick__shaft-line"
          :x1="shaftLine.x1"
          :y1="shaftLine.y1"
          :x2="shaftLine.x2"
          :y2="shaftLine.y2"
        />
      </svg>
      <div class="joystick__pivot" />
      <div class="joystick__shaft-cover" :style="shaftCoverStyle" />
      <div
        class="joystick__knob"
        :class="{ 'is-pressing': pressing }"
        :style="knobStyle"
      />
      <div class="joystick__ground-shadow" :style="knobStyle" />
      <div class="joystick__head-shadow" :style="knobStyle" />
      <div class="joystick__knob-highlight" :style="knobStyle" />
    </div>
  </div>
</template>

<style scoped>
.joystick {
  --joy-size: 182px;
  --knob-size: 80px;
  --sprite-width: 1536px;
  --sprite-height: 1024px;
  --head-width: 118px;
  --head-top: 13px;
  --sprite-scale: calc(var(--knob-size) / var(--head-width));
  --shaft-visible-height: calc(64px * var(--sprite-scale));
  --head-left: 264px;
  --arrow-color: #d51723;
  --return-duration: 80ms;

  position: relative;
  width: var(--joy-size);
  height: var(--joy-size);
  touch-action: none;
  user-select: none;
}

.joystick__arrows span {
  position: absolute;
  color: var(--arrow-color);
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45),
    0 2px 2px rgba(0, 0, 0, 0.18);
}

.joystick__arrows .up {
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
}

.joystick__arrows .right {
  right: -22px;
  top: 50%;
  transform: translateY(-50%);
}

.joystick__arrows .down {
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
}

.joystick__arrows .left {
  left: -22px;
  top: 50%;
  transform: translateY(-50%);
}

.joystick__base {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 42%),
    repeating-linear-gradient(
      35deg,
      rgba(255, 255, 255, 0.02) 0 2px,
      rgba(0, 0, 0, 0.03) 2px 4px
    ),
    linear-gradient(180deg, #40454f 0%, #1a1f27 68%, #0b0f15 100%);
  box-shadow:
    inset 0 2px 5px rgba(255, 255, 255, 0.2),
    inset 0 -8px 14px rgba(0, 0, 0, 0.7),
    0 12px 16px rgba(0, 0, 0, 0.4),
    0 26px 22px -18px rgba(0, 0, 0, 0.7);
}

.joystick__plate {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.45),
    inset 0 14px 16px -10px rgba(255, 255, 255, 0.2);
}

.joystick__pivot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 42%),
    linear-gradient(180deg, #2d333c, #11151b 70%);
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.2),
    inset 0 -3px 5px rgba(0, 0, 0, 0.65),
    0 2px 4px rgba(0, 0, 0, 0.45);
}

.joystick__shaft-svg {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 2;
}

.joystick__shaft-line {
  stroke: #b9bec1;
  stroke-width: calc(15px * var(--sprite-scale));
  stroke-linecap: round;
  filter: drop-shadow(0 5px 4px rgba(0, 0, 0, 0.35));
  transition:
    x2 var(--return-duration) linear,
    y2 var(--return-duration) linear;
}

.joystick__shaft-cover {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--knob-size) * 0.72);
  height: calc(var(--knob-size) * 0.52);
  margin-left: calc(var(--knob-size) * -0.36);
  margin-top: calc(var(--knob-size) * -0.28);
  border-radius: 50%;
  background: transparent;
  box-shadow: 0 -18px 0 8px rgba(0, 0, 0, 0.08);
  pointer-events: none;
  transition: transform var(--return-duration) linear;
  z-index: 2;
}

.joystick__ground-shadow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 84px;
  height: 36px;
  margin-left: -42px;
  margin-top: -2px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0));
  filter: blur(2px);
  transition: transform var(--return-duration) linear;
  z-index: 1;
}

.joystick__head-shadow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 72px;
  height: 20px;
  margin-left: -36px;
  margin-top: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0));
  filter: blur(1px);
  transition: transform 45ms linear;
  z-index: 1;
}

.joystick__knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--knob-size);
  height: var(--knob-size);
  margin-left: calc(var(--knob-size) / -2);
  margin-top: calc(var(--knob-size) / -2 - 6px);
  border-radius: 50%;
  background-image: var(--sprite-url);
  background-repeat: no-repeat;
  background-size:
    calc(var(--sprite-width) * var(--sprite-scale))
    calc(var(--sprite-height) * var(--sprite-scale));
  background-position:
    calc(-1 * var(--head-left) * var(--sprite-scale))
    calc(-1 * var(--head-top) * var(--sprite-scale));
  transform: translate(0, 0) scale(1);
  transition: transform var(--return-duration) linear, box-shadow 80ms ease;
  z-index: 3;
}

.joystick__knob-highlight {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 20px;
  margin-left: -20px;
  margin-top: -30px;
  border-radius: 50%;
  background: rgba(255, 246, 246, 0.4);
  filter: blur(2px);
  transition: transform var(--return-duration) linear;
  z-index: 4;
  pointer-events: none;
}
</style>
