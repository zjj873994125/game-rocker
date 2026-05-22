import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { GAME_CONFIG } from '../constants'
import { createDoorMaterial, createGroundMaterial } from '../map/EnvironmentMaterials'
import { calculateNormalizedMapModelBounds, loadMapModel, normalizeMapModel } from '../map/MapModelLoader'
import type { GroundMaterialConfig } from '../map/types'
import { getEditorAssetById } from './editorAssets'
import type { EditorAssetDefinition, EditorDoor, EditorMapObject, EditorVector3 } from './types'

// 编辑器地面必须和游戏运行地图共用同一尺寸，避免编辑时可放置范围大于实际游戏边界。
const EDITOR_MAP_SIZE = GAME_CONFIG.mapRadius * 2

export type EditorPlacementMode = 'place-object' | 'set-spawn' | 'add-door'
export type EditorBoundsDisplayState = {
  bounds: boolean
}

type EditorWorldOptions = {
  onObjectPlaced?: (object: EditorMapObject) => void
  onObjectSelected?: (objectId: string) => void
  onObjectMoved?: (objectId: string, position: EditorVector3) => void
  onSpawnPointPicked?: (position: EditorVector3) => void
  onDoorPlaced?: (door: EditorDoor) => void
  onDoorSelected?: (doorId: string) => void
  onDoorMoved?: (doorId: string, position: EditorVector3) => void
}

export class EditorWorld {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
  readonly renderer: THREE.WebGLRenderer

  private readonly container: HTMLElement
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly controls: OrbitControls
  private readonly placedObjects = new Map<string, THREE.Mesh>()
  private readonly placedObjectStates = new Map<string, EditorMapObject>()
  private readonly objectMaterials = new Map<string, THREE.MeshStandardMaterial>()
  private readonly boundsHelpers = new Map<string, THREE.LineSegments>()
  private boundsDisplayState: EditorBoundsDisplayState = { bounds: true }
  private readonly doorMeshes = new Map<string, THREE.Mesh>()
  private spawnMarker: THREE.Group | null = null
  private readonly options: EditorWorldOptions
  private ground: THREE.Mesh | null = null
  private selectedAsset: EditorAssetDefinition | null = null
  private placementMode: EditorPlacementMode = 'place-object'
  private animationFrame = 0
  private objectIndex = 0
  private doorIndex = 0
  private dragTarget: { type: 'object' | 'door'; id: string; y: number; offset: THREE.Vector3 } | null = null
  private pendingDragTarget: {
    type: 'object' | 'door'
    id: string
    object: THREE.Object3D
    hitPoint: THREE.Vector3
    startX: number
    startY: number
    pointerId: number
  } | null = null
  private activePointerId: number | null = null
  private cameraAzimuth = 0
  private cameraPolar = 0

  constructor(container: HTMLElement, options: EditorWorldOptions = {}) {
    this.container = container
    this.options = options
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp)
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerUp)
    window.addEventListener('keydown', this.handleKeyDown)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enableRotate = false
    this.controls.enablePan = true
    this.controls.enableZoom = true
    this.controls.minDistance = 6
    this.controls.maxDistance = 32

    this.setupScene()
    this.resize()
  }

  start() {
    this.loop()
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  setSelectedAsset(asset: EditorAssetDefinition | null) {
    this.selectedAsset = asset
  }

  setPlacementMode(mode: EditorPlacementMode) {
    this.placementMode = mode
  }

  setSelectedObject(objectId: string) {
    for (const [id, material] of this.objectMaterials) {
      material.emissive.setHex(id === objectId ? 0x5a420e : 0x000000)
      material.emissiveIntensity = id === objectId ? 0.85 : 0
    }
  }

  setSelectedDoor(doorId: string) {
    for (const [id, door] of this.doorMeshes) {
      const material = door.material
      if (Array.isArray(material) || !(material instanceof THREE.MeshStandardMaterial)) continue

      const selected = id === doorId
      material.color.setHex(selected ? 0x84d7ff : 0x5fb4ff)
      material.emissive.setHex(selected ? 0x2e6f91 : 0x123a59)
      material.emissiveIntensity = selected ? 1.35 : 0.85
      material.opacity = selected ? 0.9 : 0.72
    }
  }

  setBoundsDisplayState(state: EditorBoundsDisplayState) {
    this.boundsDisplayState = { ...state }
    this.updateBoundsHelpersVisibility()
  }

  setGroundMaterial(config: Partial<GroundMaterialConfig>) {
    if (!this.ground) return

    const previousMaterial = this.ground.material
    this.ground.material = createGroundMaterial(config)
    // 地面材质会频繁预览切换，旧贴图 clone 和材质需要及时释放。
    if (Array.isArray(previousMaterial)) {
      previousMaterial.forEach((material) => material.dispose())
    } else if (previousMaterial instanceof THREE.MeshStandardMaterial) {
      previousMaterial.map?.dispose()
      previousMaterial.dispose()
    } else {
      previousMaterial.dispose()
    }
  }

  clearEditableObjects() {
    for (const objectId of [...this.placedObjects.keys()]) {
      this.removeObject(objectId)
    }

    for (const doorId of [...this.doorMeshes.keys()]) {
      this.removeDoor(doorId)
    }
  }

  addObject(object: EditorMapObject) {
    const asset = this.resolveAssetForObject(object)
    const mesh = this.createObjectMesh(object, asset)

    this.placedObjects.set(object.id, mesh)
    this.placedObjectStates.set(object.id, object)
    this.scene.add(mesh)
    this.updateObjectTransform(object)

    if (!object.modelUrl && asset?.loadModelUrl) {
      void this.resolveObjectModelUrl(object, asset, mesh)
    }
  }

  addDoor(door: EditorDoor) {
    this.updateDoor(door)
  }

  removeObject(objectId: string) {
    const mesh = this.placedObjects.get(objectId)
    if (!mesh) return

    this.scene.remove(mesh)
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose())
    } else {
      mesh.material.dispose()
    }
    this.placedObjects.delete(objectId)
    this.placedObjectStates.delete(objectId)
    this.objectMaterials.delete(objectId)
    this.removeObjectBoundsHelpers(objectId)
  }

  updateObjectTransform(object: EditorMapObject) {
    const mesh = this.placedObjects.get(object.id)
    if (!mesh) return

    mesh.position.fromArray(object.position)
    mesh.rotation.set(object.rotation[0], object.rotation[1], object.rotation[2])
    mesh.scale.fromArray(object.scale)
    this.updateObjectBoundsHelpers(object)
  }

  updateObjectCollider(object: EditorMapObject) {
    this.updateObjectBoundsHelpers(object)
  }

  updateSpawnPoint(position: EditorVector3) {
    const marker = this.spawnMarker ?? this.createSpawnMarker()
    marker.position.fromArray(position)
    marker.position.y = Math.max(0.04, position[1])

    if (!this.spawnMarker) {
      this.spawnMarker = marker
      this.scene.add(marker)
    }
  }

  updateDoor(door: EditorDoor) {
    const currentDoor = this.doorMeshes.get(door.id)
    const mesh = currentDoor ?? this.createDoorMesh(door)

    mesh.position.fromArray(door.position)
    mesh.scale.fromArray(door.size)

    if (!currentDoor) {
      this.doorMeshes.set(door.id, mesh)
      this.scene.add(mesh)
    }
  }

  removeDoor(doorId: string) {
    const door = this.doorMeshes.get(doorId)
    if (!door) return

    this.scene.remove(door)
    door.geometry.dispose()
    if (Array.isArray(door.material)) {
      door.material.forEach((material) => material.dispose())
    } else {
      door.material.dispose()
    }
    this.doorMeshes.delete(doorId)
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame)
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerUp)
    window.removeEventListener('keydown', this.handleKeyDown)
    this.controls.dispose()
    for (const helper of this.boundsHelpers.values()) {
      helper.geometry.dispose()
      if (Array.isArray(helper.material)) {
        helper.material.forEach((material) => material.dispose())
      } else {
        helper.material.dispose()
      }
    }
    this.boundsHelpers.clear()
    this.placedObjectStates.clear()
    for (const door of this.doorMeshes.values()) {
      door.geometry.dispose()
      if (Array.isArray(door.material)) {
        door.material.forEach((material) => material.dispose())
      } else {
        door.material.dispose()
      }
    }
    this.doorMeshes.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    })
  }

  private loop = () => {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.ground) return
    if (event.button !== 0) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const objectHits = this.raycaster.intersectObjects([...this.placedObjects.values()], false)
    if (objectHits.length > 0) {
      const objectId = objectHits[0].object.name
      this.setSelectedObject(objectId)
      this.options.onObjectSelected?.(objectId)
      this.queueDrag(event, 'object', objectId, objectHits[0].object, objectHits[0].point)
      return
    }

    const doorHits = this.raycaster.intersectObjects([...this.doorMeshes.values()], false)
    if (doorHits.length > 0) {
      const doorId = doorHits[0].object.name
      this.setSelectedDoor(doorId)
      this.options.onDoorSelected?.(doorId)
      this.queueDrag(event, 'door', doorId, doorHits[0].object, doorHits[0].point)
      return
    }

    const [hit] = this.raycaster.intersectObject(this.ground)
    if (!hit) return

    if (this.placementMode === 'set-spawn') {
      const position = this.toGroundPosition(hit.point)
      this.updateSpawnPoint(position)
      this.options.onSpawnPointPicked?.(position)
      return
    }

    if (this.placementMode === 'add-door') {
      const door = this.createEditorDoor(hit.point)
      this.updateDoor(door)
      this.setSelectedDoor(door.id)
      this.options.onDoorPlaced?.(door)
      return
    }

    if (!this.selectedAsset) return

    const selectedAsset = this.selectedAsset
    const object = this.createEditorObject(selectedAsset, hit.point)
    const mesh = this.createObjectMesh(object, selectedAsset)
    this.placedObjects.set(object.id, mesh)
    this.placedObjectStates.set(object.id, object)
    this.scene.add(mesh)
    this.updateObjectCollider(object)
    this.setSelectedObject(object.id)
    this.options.onObjectPlaced?.(object)

    void this.resolveObjectModelUrl(object, selectedAsset, mesh)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pendingDragTarget && !this.dragTarget) {
      const moveDistance = Math.hypot(event.clientX - this.pendingDragTarget.startX, event.clientY - this.pendingDragTarget.startY)
      if (moveDistance < 5) return

      this.startDrag(this.pendingDragTarget)
    }

    if (!this.dragTarget || !this.ground) return

    const point = this.pickGroundPoint(event)
    if (!point) return

    const adjustedPoint = point.clone().add(this.dragTarget.offset)
    const position = this.toEditorPosition(adjustedPoint, this.dragTarget.y)
    if (this.dragTarget.type === 'object') {
      const mesh = this.placedObjects.get(this.dragTarget.id)
      if (!mesh) return

      mesh.position.fromArray(position)
      this.options.onObjectMoved?.(this.dragTarget.id, position)
      return
    }

    const door = this.doorMeshes.get(this.dragTarget.id)
    if (!door) return

    door.position.fromArray(position)
    this.options.onDoorMoved?.(this.dragTarget.id, position)
  }

  private handlePointerUp = () => {
    this.pendingDragTarget = null
    if (!this.dragTarget) return

    this.dragTarget = null
    this.controls.enabled = true
    if (this.activePointerId !== null && this.renderer.domElement.hasPointerCapture?.(this.activePointerId)) {
      this.renderer.domElement.releasePointerCapture(this.activePointerId)
    }
    this.activePointerId = null
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.isTypingTarget(event.target)) return

    const key = event.key.toLowerCase()
    if (!['w', 'a', 's', 'd'].includes(key)) return

    event.preventDefault()

    const rotateStep = 0.12
    const polarStep = 0.08
    if (key === 'a') this.cameraAzimuth -= rotateStep
    if (key === 'd') this.cameraAzimuth += rotateStep
    if (key === 'w') this.cameraPolar = Math.max(-0.42, this.cameraPolar - polarStep)
    if (key === 's') this.cameraPolar = Math.min(0.38, this.cameraPolar + polarStep)

    this.updateCameraFromKeyboard()
  }

  private updateCameraFromKeyboard() {
    const target = this.controls.target
    const radius = this.camera.position.distanceTo(target)
    const basePolar = Math.acos((10.5 - target.y) / new THREE.Vector3(8.5, 10.5, 10.5).length())
    const polar = THREE.MathUtils.clamp(basePolar + this.cameraPolar, 0.38, Math.PI / 2.15)
    const azimuth = Math.atan2(8.5, 10.5) + this.cameraAzimuth

    this.camera.position.set(
      target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      target.z + radius * Math.sin(polar) * Math.cos(azimuth),
    )
    this.camera.lookAt(target)
    this.controls.update()
  }

  private isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false

    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
  }

  private queueDrag(event: PointerEvent, type: 'object' | 'door', id: string, object: THREE.Object3D, hitPoint: THREE.Vector3) {
    this.pendingDragTarget = {
      type,
      id,
      object,
      hitPoint: hitPoint.clone(),
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    }
  }

  private startDrag(target: NonNullable<EditorWorld['pendingDragTarget']>) {
    // 记录命中点和物体中心之间的偏移，拖拽时物体不会瞬间吸附到鼠标射线落点。
    const offset = target.object.position.clone().sub(target.hitPoint)
    offset.y = 0
    this.dragTarget = { type: target.type, id: target.id, y: target.object.position.y, offset }
    this.pendingDragTarget = null
    this.controls.enabled = false
    this.activePointerId = target.pointerId
    this.renderer.domElement.setPointerCapture?.(target.pointerId)
  }

  private pickGroundPoint(event: PointerEvent) {
    if (!this.ground) return null

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const [hit] = this.raycaster.intersectObject(this.ground)
    return hit?.point ?? null
  }

  private toGroundPosition(point: THREE.Vector3): EditorVector3 {
    return [Number(point.x.toFixed(2)), 0, Number(point.z.toFixed(2))]
  }

  private toEditorPosition(point: THREE.Vector3, y: number): EditorVector3 {
    return [Number(point.x.toFixed(2)), Number(y.toFixed(2)), Number(point.z.toFixed(2))]
  }

  private removeObjectBoundsHelpers(objectId: string) {
    this.removeBoundsHelper(this.boundsHelpers, objectId)
  }

  private removeBoundsHelper(helpers: Map<string, THREE.LineSegments>, objectId: string) {
    const helper = helpers.get(objectId)
    if (!helper) return

    this.scene.remove(helper)
    helper.geometry.dispose()
    if (Array.isArray(helper.material)) {
      helper.material.forEach((material) => material.dispose())
    } else {
      helper.material.dispose()
    }
    helpers.delete(objectId)
  }

  private updateObjectBoundsHelpers(object: EditorMapObject) {
    this.updateBoundsHelper(object)
    this.updateBoundsHelpersVisibility()
  }

  private updateBoundsHelper(object: EditorMapObject) {
    if (!object.collider.enabled) {
      this.removeBoundsHelper(this.boundsHelpers, object.id)
      return
    }

    const helper = this.boundsHelpers.get(object.id) ?? this.createBoundsHelper(`${object.id}-bounds`, 0xffcf69)
    const yaw = object.rotation[1] ?? 0
    const cos = Math.cos(yaw)
    const sin = Math.sin(yaw)
    const scaledOffset: EditorVector3 = [
      object.snapOffset[0] * object.scale[0],
      object.snapOffset[1] * object.scale[1],
      object.snapOffset[2] * object.scale[2],
    ]
    const offsetX = scaledOffset[0] * cos - scaledOffset[2] * sin
    const offsetZ = scaledOffset[0] * sin + scaledOffset[2] * cos

    // 边界线使用 GLB 真实可视包围盒，并乘上对象缩放；导出碰撞体和吸附也使用同一套尺寸。
    helper.position.set(
      object.collider.position[0] + offsetX,
      object.collider.position[1] + scaledOffset[1],
      object.collider.position[2] + offsetZ,
    )
    helper.rotation.set(object.rotation[0], object.rotation[1], object.rotation[2])
    helper.scale.set(
      object.snapSize[0] * object.scale[0],
      object.snapSize[1] * object.scale[1],
      object.snapSize[2] * object.scale[2],
    )

    if (!this.boundsHelpers.has(object.id)) {
      this.boundsHelpers.set(object.id, helper)
      this.scene.add(helper)
    }
  }

  private updateBoundsHelpersVisibility() {
    for (const helper of this.boundsHelpers.values()) {
      helper.visible = this.boundsDisplayState.bounds
    }
  }

  private createEditorObject(asset: EditorAssetDefinition, point: THREE.Vector3): EditorMapObject {
    this.objectIndex += 1
    const position: [number, number, number] = [
      Number(point.x.toFixed(2)),
      Number((asset.defaultSize[1] / 2).toFixed(2)),
      Number(point.z.toFixed(2)),
    ]

    return {
      id: `${asset.id}-${this.objectIndex}`,
      assetId: asset.id,
      modelUrl: asset.modelUrl,
      name: asset.name,
      kind: asset.kind,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      snapSize: [...(asset.defaultSnapSize ?? asset.defaultSize)],
      snapOffset: [...(asset.defaultSnapOffset ?? [0, 0, 0])],
      color: asset.defaultColor,
      collider: {
        enabled: asset.colliderEnabledByDefault,
        position,
        size: [...asset.defaultSize],
      },
    }
  }

  private createEditorDoor(point: THREE.Vector3): EditorDoor {
    this.doorIndex += 1
    const size: EditorVector3 = [1.5, 2.2, 0.28]
    const position: EditorVector3 = [
      Number(point.x.toFixed(2)),
      Number((size[1] / 2).toFixed(2)),
      Number(point.z.toFixed(2)),
    ]

    return {
      id: `door-${this.doorIndex}`,
      position,
      size,
      targetMapId: 'graveyard-crypt',
      targetSpawnId: 'default',
      interactionDistance: 1.8,
    }
  }

  private createObjectMesh(object: EditorMapObject, asset?: EditorAssetDefinition | null) {
    const [width, height, depth] = object.collider.size
    const hasModel = Boolean(object.modelUrl || asset?.modelUrl || asset?.loadModelUrl)
    const material = new THREE.MeshStandardMaterial({
      color: object.color,
      roughness: 0.8,
      metalness: 0.04,
      emissive: 0x000000,
      emissiveIntensity: 0,
      transparent: hasModel,
      opacity: hasModel ? 0 : 1,
      depthWrite: !hasModel,
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)

    mesh.name = object.id
    mesh.position.fromArray(object.position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.objectMaterials.set(object.id, material)
    const modelUrl = object.modelUrl ?? asset?.modelUrl
    if (modelUrl) this.loadObjectModel(mesh, modelUrl, object.collider.size)

    return mesh
  }

  private resolveAssetForObject(object: EditorMapObject) {
    const asset = getEditorAssetById(object.assetId)
    if (!asset && !object.modelUrl) return null

    if (asset) {
      return {
        ...asset,
        // 后端地图通常只保存 assetId；如果旧数据有 modelUrl，则优先保留旧数据的明确资源地址。
        modelUrl: object.modelUrl ?? asset.modelUrl,
      }
    }

    // 兼容历史或外部导入数据：没有资源库定义但直接给了模型 URL 时，仍然允许编辑器加载模型。
    return {
      id: object.assetId,
      name: object.name,
      kind: object.kind,
      modelUrl: object.modelUrl,
      defaultSize: [...object.collider.size],
      defaultSnapSize: [...object.snapSize],
      defaultSnapOffset: [...object.snapOffset],
      defaultColor: object.color,
      colliderEnabledByDefault: object.collider.enabled,
    } satisfies EditorAssetDefinition
  }

  private async resolveObjectModelUrl(object: EditorMapObject, asset: EditorAssetDefinition, mesh: THREE.Mesh) {
    if (object.modelUrl || !asset.loadModelUrl) return

    try {
      object.modelUrl = await asset.loadModelUrl()
      if (!this.placedObjects.has(object.id)) return

      const material = this.objectMaterials.get(object.id)
      if (material) {
        material.transparent = true
        material.opacity = 0
        material.depthWrite = false
        material.needsUpdate = true
      }
      this.loadObjectModel(mesh, object.modelUrl, object.collider.size)
    } catch (error) {
      console.warn('Failed to resolve editor map model url', error)
    }
  }

  private loadObjectModel(mesh: THREE.Mesh, modelUrl: string, size: EditorVector3) {
    loadMapModel(modelUrl)
      .then((model) => {
        if (!this.placedObjects.has(mesh.name)) return

        const bounds = calculateNormalizedMapModelBounds(model, size)
        const object = this.placedObjectStates.get(mesh.name)
        if (object) {
          object.snapSize = [...bounds.size]
          object.snapOffset = [...bounds.offset]
          this.updateBoundsHelper(object)
          this.updateBoundsHelpersVisibility()
        }
        normalizeMapModel(model, size)
        mesh.add(model)
      })
      .catch((error: unknown) => {
        console.warn('Failed to load editor map model', error)
        const material = this.objectMaterials.get(mesh.name)
        if (!material) return

        material.opacity = 1
        material.depthWrite = true
        material.needsUpdate = true
      })
  }

  private createBoundsHelper(name: string, color: number) {
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    })
    const helper = new THREE.LineSegments(geometry, material)

    helper.name = name
    helper.renderOrder = 10

    return helper
  }

  private createSpawnMarker() {
    // 出生点用地面圆环加向上标记，避免和普通地图对象混在一起。
    const group = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 32),
      new THREE.MeshBasicMaterial({ color: 0x59d58b, side: THREE.DoubleSide, depthTest: false }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.renderOrder = 12
    group.add(ring)

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.55, 18),
      new THREE.MeshBasicMaterial({ color: 0x59d58b, depthTest: false }),
    )
    arrow.position.y = 0.42
    arrow.renderOrder = 12
    group.add(arrow)

    return group
  }

  private createDoorMesh(door: EditorDoor) {
    const material = createDoorMaterial({ transparent: true })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)

    mesh.name = door.id
    mesh.position.fromArray(door.position)
    mesh.scale.fromArray(door.size)
    mesh.renderOrder = 9

    return mesh
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x101417)
    this.scene.fog = new THREE.Fog(0x101417, 26, 48)

    const ambientLight = new THREE.HemisphereLight(0xe6edf5, 0x1b241b, 1.8)
    this.scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(6, 11, 7)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(keyLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(EDITOR_MAP_SIZE, EDITOR_MAP_SIZE),
      createGroundMaterial(),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.ground = ground
    this.scene.add(ground)

    const grid = new THREE.GridHelper(EDITOR_MAP_SIZE, EDITOR_MAP_SIZE, 0x9ea76e, 0x4d5747)
    grid.position.y = 0.015
    this.scene.add(grid)

    const origin = new THREE.AxesHelper(1.8)
    origin.position.y = 0.04
    this.scene.add(origin)

    this.camera.position.set(8.5, 10.5, 10.5)
    this.camera.lookAt(0, 0, 0)
    this.controls.target.set(0, 0, 0)
  }
}
