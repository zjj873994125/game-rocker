<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'

const props = withDefaults(
  defineProps<{
    label?: string
    size?: number
    color?: string
    viewMode?: 'flat' | 'angled'
    buttonLeft?: number
    keyBinding?: string | string[]
  }>(),
  {
    label: 'A',
    size: 84,
    color: '#eb1f2f',
    viewMode: 'flat',
    buttonLeft: 254,
    keyBinding: undefined,
  },
)

const emit = defineEmits<{
  press: []
  release: []
}>()

const buttonRef = ref<HTMLButtonElement | null>(null)
const pressing = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | THREE.PerspectiveCamera | null = null
let cap: THREE.Mesh | null = null
let capInset: THREE.Mesh | null = null
let capShadow: THREE.Mesh | null = null
let rimMaterial: THREE.MeshPhysicalMaterial | null = null
let grooveMaterial: THREE.MeshBasicMaterial | null = null
let insetMaterial: THREE.MeshBasicMaterial | null = null
let animationFrame = 0

const keyBindings = computed(() => {
  if (!props.keyBinding) return []
  return Array.isArray(props.keyBinding) ? props.keyBinding : [props.keyBinding]
})

function shouldIgnoreKeyboard(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()

  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function onPress() {
  if (pressing.value) return
  pressing.value = true
  syncButtonMeshes()
  emit('press')
}

function onRelease() {
  if (!pressing.value) return
  pressing.value = false
  syncButtonMeshes()
  emit('release')
}

function onKeyDown(event: KeyboardEvent) {
  if (shouldIgnoreKeyboard(event) || !keyBindings.value.includes(event.code)) return
  event.preventDefault()
  onPress()
}

function onKeyUp(event: KeyboardEvent) {
  if (!keyBindings.value.includes(event.code)) return
  event.preventDefault()
  onRelease()
}

function createButtonMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color: createShade(color, 0.92),
    metalness: 0.02,
    roughness: 0.28,
    clearcoat: 0.62,
    clearcoatRoughness: 0.2,
    specularIntensity: 0.75,
  })
}

function createShade(color: string, multiplier = 0.45) {
  return new THREE.Color(color).multiplyScalar(multiplier)
}

function createCamera() {
  if (props.viewMode === 'angled') {
    const perspectiveCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    perspectiveCamera.position.set(0, 3.3, 3.4)
    perspectiveCamera.lookAt(0, 0.08, 0)
    return perspectiveCamera
  }

  const topCamera = new THREE.OrthographicCamera(-1.45, 1.45, 1.45, -1.45, 0.1, 100)
  topCamera.position.set(0, 4.2, 0)
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
  if (!buttonRef.value) return

  scene = new THREE.Scene()
  syncCamera()

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(props.size, props.size)
  buttonRef.value.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 1.18)
  const key = new THREE.DirectionalLight(0xffffff, 2.45)
  key.position.set(-2.6, 5.4, -2.8)
  const fill = new THREE.DirectionalLight(0xffffff, 0.55)
  fill.position.set(2.4, 3.5, 2.2)
  const gloss = new THREE.PointLight(0xffffff, 3.2, 4, 2)
  gloss.position.set(-1.5, 2.4, -1.5)
  scene.add(ambient, key, fill, gloss)

  rimMaterial = new THREE.MeshPhysicalMaterial({
    color: createShade(props.color, 0.38),
    metalness: 0.04,
    roughness: 0.32,
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
  })
  grooveMaterial = new THREE.MeshBasicMaterial({
    color: createShade(props.color, 0.25),
    transparent: true,
    opacity: 0.7,
  })

  capShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.04, 96),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 }),
  )
  capShadow.rotation.x = -Math.PI / 2
  capShadow.position.y = -0.15
  scene.add(capShadow)

  const lowerShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.02, 0.26, 128),
    rimMaterial,
  )
  lowerShell.position.y = -0.02
  scene.add(lowerShell)

  const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.12, 20, 128), rimMaterial)
  outerBezel.rotation.x = Math.PI / 2
  outerBezel.position.y = 0.16
  scene.add(outerBezel)

  const groove = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 10, 128), grooveMaterial)
  groove.rotation.x = Math.PI / 2
  groove.position.y = 0.29
  scene.add(groove)

  cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.7, 0.16, 128, 1, false),
    createButtonMaterial(props.color),
  )
  scene.add(cap)

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.62, 0.04, 128), cap.material)
  capTop.position.y = 0.1
  cap.add(capTop)

  insetMaterial = new THREE.MeshBasicMaterial({ color: createShade(props.color, 0.58), transparent: true, opacity: 0.5 })
  capInset = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.02, 10, 128),
    insetMaterial,
  )
  capInset.rotation.x = Math.PI / 2
  scene.add(capInset)

  syncButtonMeshes()
  render()
}

function syncButtonMeshes() {
  const y = pressing.value ? 0.12 : 0.26
  const scale = pressing.value ? 0.97 : 1

  cap?.position.set(0, y, 0)
  cap?.scale.set(scale, pressing.value ? 0.78 : 1, scale)
  capInset?.position.set(0, y + 0.1, 0)
  capInset?.scale.setScalar(scale)
  capShadow?.scale.setScalar(pressing.value ? 0.92 : 1)
}

function render() {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
  animationFrame = window.requestAnimationFrame(render)
}

function resizeRenderer() {
  renderer?.setSize(props.size, props.size)
}

watch(
  () => props.color,
  (color) => {
    const capMaterial = cap?.material
    if (capMaterial instanceof THREE.MeshPhysicalMaterial) {
      capMaterial.color.copy(createShade(color, 0.92))
    }
    rimMaterial?.color.copy(createShade(color, 0.38))
    grooveMaterial?.color.copy(createShade(color, 0.25))
    insetMaterial?.color.copy(createShade(color, 0.58))
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
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <button
    ref="buttonRef"
    class="action-btn"
    :class="{ 'is-pressing': pressing }"
    :style="{
      '--btn-size': `${size}px`,
    }"
    type="button"
    @pointerdown="onPress"
    @pointerup="onRelease"
    @pointercancel="onRelease"
    @pointerleave="onRelease"
  >

  </button>
</template>

<style scoped>
.action-btn {
  --btn-size: 84px;

  position: relative;
  width: var(--btn-size);
  height: var(--btn-size);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #f7f8fb;
  font: 700 31px/1 'Avenir Next', 'Trebuchet MS', sans-serif;
  letter-spacing: 1px;
  background: transparent;
  touch-action: manipulation;
  padding: 0;
}

.action-btn span {
  position: relative;
  z-index: 1;
  display: inline-block;
  transform: translateY(1px);
}

.action-btn canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.action-btn:focus-visible {
  outline: 2px solid #f1636c;
  outline-offset: 3px;
}
</style>
