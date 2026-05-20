<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import type { JoystickDirection, JoystickKeyboardMapping } from '../lib/types'

const props = withDefaults(
  defineProps<{
    size?: number
    knobSize?: number
    color?: string
    arrowColor?: string
    viewMode?: 'flat' | 'angled'
    keyboardMapping?: JoystickKeyboardMapping
  }>(),
  {
    size: 182,
    knobSize: 80,
    color: '#eb1f2f',
    arrowColor: '#d51723',
    viewMode: 'flat',
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

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const pointerId = ref<number | null>(null)
const offsetX = ref(0)
const offsetY = ref(0)
const pressing = ref(false)
const keyboardKeys = ref(new Set<string>())

const limit = computed(() => Math.round(props.size * 0.33))
const worldLimit = computed(() => 1.4)
const topViewFrustum = 4.6
const knobRadius = 0.72
const knobCenterHeight = 1.62
const arrowThreshold = computed(() => limit.value * 0.22)
const arrowState = computed(() => ({
  up: offsetY.value < -arrowThreshold.value,
  right: offsetX.value > arrowThreshold.value,
  down: offsetY.value > arrowThreshold.value,
  left: offsetX.value < -arrowThreshold.value,
}))

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | THREE.PerspectiveCamera | null = null
let base: THREE.Mesh | null = null
let baseRim: THREE.Mesh | null = null
let baseInnerLip: THREE.Mesh | null = null
let pivot: THREE.Mesh | null = null
let collar: THREE.Mesh | null = null
let shaft: THREE.Mesh | null = null
let knob: THREE.Mesh | null = null
let knobRim: THREE.Mesh | null = null
let shadow: THREE.Mesh | null = null
let animationFrame = 0

const keyboardCodeMap = computed(() => {
  const entries = Object.entries(props.keyboardMapping) as Array<[JoystickDirection, string[] | undefined]>

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
  syncMeshes()
}

function resetJoystick() {
  offsetX.value = 0
  offsetY.value = 0
  syncMeshes()
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
  if (!rootRef.value) return

  const rect = rootRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  let dx = clientX - cx
  let dy = clientY - cy
  const distance = Math.hypot(dx, dy)

  if (distance > limit.value) {
    const ratio = limit.value / distance
    dx *= ratio
    dy *= ratio
  }

  setJoystickOffset(dx, dy)
}

function onPointerDown(event: PointerEvent) {
  if (!rootRef.value) return
  pointerId.value = event.pointerId
  pressing.value = true
  keyboardKeys.value.clear()
  rootRef.value.setPointerCapture(event.pointerId)
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

function createPlasticMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.05,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 1,
  })
}

function createMetalMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#d8dde1',
    metalness: 0.96,
    roughness: 0.18,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
  })
}

function createBaseTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#151515'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 1300; i += 1) {
    const shade = 22 + Math.random() * 38
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.12 + Math.random() * 0.18})`
    context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createKnobShade(color: string) {
  return new THREE.Color(color).multiplyScalar(0.35)
}

function createCamera() {
  if (props.viewMode === 'angled') {
    const perspectiveCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    perspectiveCamera.position.set(0, 6.4, 6.8)
    perspectiveCamera.lookAt(0, 0.38, 0)
    return perspectiveCamera
  }

  const topCamera = new THREE.OrthographicCamera(
    -topViewFrustum / 2,
    topViewFrustum / 2,
    topViewFrustum / 2,
    -topViewFrustum / 2,
    0.1,
    100,
  )
  topCamera.position.set(0, 7.2, 0)
  topCamera.up.set(0, 0, -1)
  topCamera.lookAt(0, 0, 0)
  return topCamera
}

function syncCamera() {
  if (!scene) return

  if (camera) {
    scene.remove(camera)
  }

  camera = createCamera()
  scene.add(camera)
}

function createScene() {
  if (!canvasRef.value) return

  scene = new THREE.Scene()
  syncCamera()

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(props.size, props.size)
  canvasRef.value.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 1.35)
  const key = new THREE.DirectionalLight(0xffffff, 2.8)
  key.position.set(-2.6, 6, -3.2)
  const fill = new THREE.DirectionalLight(0xffffff, 0.8)
  fill.position.set(3, 4.8, 2.4)
  const gloss = new THREE.PointLight(0xffffff, 7, 5, 2)
  gloss.position.set(-1.5, 2.4, -1.7)
  scene.add(ambient, key, fill, gloss)

  const baseTexture = createBaseTexture()
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    color: '#171717',
    metalness: 0.15,
    roughness: 0.66,
    clearcoat: 0.32,
    clearcoatRoughness: 0.45,
    map: baseTexture ?? undefined,
  })
  const blackGlossMaterial = new THREE.MeshPhysicalMaterial({
    color: '#080808',
    metalness: 0.2,
    roughness: 0.24,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
  })

  base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.38, 1.46, 0.22, 128),
    baseMaterial,
  )
  base.position.y = -0.12
  scene.add(base)

  baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.075, 18, 128), blackGlossMaterial)
  baseRim.rotation.x = Math.PI / 2
  baseRim.position.y = 0.02
  scene.add(baseRim)

  baseInnerLip = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.055, 16, 96), blackGlossMaterial)
  baseInnerLip.rotation.x = Math.PI / 2
  baseInnerLip.position.y = 0.04
  scene.add(baseInnerLip)

  pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.42, 0.26, 96),
    blackGlossMaterial,
  )
  pivot.position.y = 0.12
  scene.add(pivot)

  collar = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.32, 80), createMetalMaterial())
  collar.position.y = 0.36
  scene.add(collar)

  shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.12, 1.34, 80),
    createMetalMaterial(),
  )
  scene.add(shaft)

  knob = new THREE.Mesh(
    new THREE.SphereGeometry(knobRadius, 128, 80),
    createPlasticMaterial(props.color),
  )
  scene.add(knob)

  knobRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.03, 10, 96),
    new THREE.MeshBasicMaterial({ color: createKnobShade(props.color), transparent: true, opacity: 0.24 }),
  )
  knobRim.rotation.x = Math.PI / 2
  scene.add(knobRim)

  shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 80),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.055
  scene.add(shadow)

  syncMeshes()
  render()
}

function syncMeshes() {
  if (!shaft || !knob || !knobRim || !shadow) return

  const x = (offsetX.value / limit.value) * worldLimit.value
  const z = (offsetY.value / limit.value) * worldLimit.value
  const basePoint = new THREE.Vector3(0, 0.36, 0)
  const topPoint = new THREE.Vector3(x, knobCenterHeight, z)
  const midPoint = basePoint.clone().add(topPoint).multiplyScalar(0.5)
  const direction = topPoint.clone().sub(basePoint)
  const length = direction.length()

  shaft.position.copy(midPoint)
  shaft.scale.set(1, length / 1.34, 1)
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())

  knob.position.copy(topPoint)
  knob.scale.setScalar(pressing.value ? 0.95 : 1)
  knobRim.position.set(x, topPoint.y + 0.18, z)
  knobRim.scale.setScalar(pressing.value ? 0.95 : 1)
  shadow.position.x = x * 0.38
  shadow.position.z = z * 0.38
}

function render() {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
  animationFrame = window.requestAnimationFrame(render)
}

function resizeRenderer() {
  if (!renderer) return
  renderer.setSize(props.size, props.size)
}

watch(
  () => props.color,
  (color) => {
    const material = knob?.material
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
      material.color.set(color)
    }

    const rimMaterial = knobRim?.material
    if (rimMaterial instanceof THREE.MeshBasicMaterial) {
      rimMaterial.color.copy(createKnobShade(color))
    }
  },
)

watch(
  () => props.size,
  () => {
    resizeRenderer()
  },
)

watch(
  () => props.viewMode,
  () => {
    syncCamera()
  },
)

onMounted(() => {
  createScene()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.cancelAnimationFrame(animationFrame)
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()

  scene?.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return

    if (!disposedGeometries.has(object.geometry)) {
      object.geometry.dispose()
      disposedGeometries.add(object.geometry)
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (disposedMaterials.has(material)) return
      material.dispose()
      disposedMaterials.add(material)
    })
  })
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div
    ref="rootRef"
    class="three-joystick"
    :style="{
      '--joy-size': `${size}px`,
      '--arrow-color': arrowColor,
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="releaseJoystick"
    @pointercancel="releaseJoystick"
  >
    <div ref="canvasRef" class="three-joystick__canvas" />

    <div class="three-joystick__arrows" aria-hidden="true">
      <span class="up" :class="{ 'is-active': arrowState.up }">▲</span>
      <span class="right" :class="{ 'is-active': arrowState.right }">▶</span>
      <span class="down" :class="{ 'is-active': arrowState.down }">▼</span>
      <span class="left" :class="{ 'is-active': arrowState.left }">◀</span>
    </div>
  </div>
</template>

<style scoped>
.three-joystick {
  --joy-size: 182px;
  --arrow-color: #d51723;

  position: relative;
  width: var(--joy-size);
  height: var(--joy-size);
  cursor: grab;
  touch-action: none;
  user-select: none;
  overflow: visible;
}

.three-joystick:active {
  cursor: grabbing;
}

.three-joystick__canvas {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.three-joystick__arrows {
  pointer-events: none;
}

.three-joystick__arrows span {
  position: absolute;
  z-index: 3;
  color: color-mix(in srgb, var(--arrow-color) 58%, #2b0206);
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  opacity: 0.78;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.38)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.22));
  transform-origin: center;
  transition:
    color 120ms ease,
    filter 120ms ease,
    opacity 120ms ease;
}

.three-joystick__arrows span.is-active {
  color: color-mix(in srgb, var(--arrow-color) 78%, #fff0f2);
  opacity: 1;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.42)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.22));
}

.three-joystick__arrows .up {
  top: -36px;
  left: 50%;
  transform: translateX(-50%);
}

.three-joystick__arrows .right {
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
}

.three-joystick__arrows .down {
  bottom: -36px;
  left: 50%;
  transform: translateX(-50%);
}

.three-joystick__arrows .left {
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
