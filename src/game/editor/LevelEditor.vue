<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { deleteMap, getMap, listMaps, saveMap, type MapSummary } from '../api/mapApi'
import { DEFAULT_GROUND_REPEAT, DEFAULT_GROUND_TEXTURE_ID, groundTextureOptions } from '../map/GroundMaterials'
import { getLevelMetadata, inferMapLevelMetadata, mapLevelDefinitions, toEditorLevelType, type EditorLevelType } from '../map/levelMetadata'
import { EditorWorld, type EditorBoundsDisplayState, type EditorPlacementMode } from './EditorWorld'
import { editorAssets, getEditorAssetById } from './editorAssets'
import { exportGameMapConfig } from './exportGameMapConfig'
import { gameMapToEditorDocument } from './importGameMapConfig'
import { moveObjectWithCollider, snapObjectToNeighbors } from './objectSnap'
import type { EditorAssetDefinition, EditorAssetKind, EditorDoor, EditorMapDocument, EditorMapObject, EditorVector3 } from './types'

const selectedAssetId = ref(editorAssets[0]?.id ?? '')
const selectedAsset = computed(() => editorAssets.find((asset) => asset.id === selectedAssetId.value) ?? null)
const assetSearchKeyword = ref('')
const selectedAssetKind = ref<'all' | EditorAssetKind>('all')

const selectedLevelType = ref<EditorLevelType>('graveyard')
const backendMaps = ref<MapSummary[]>([])
const selectedBackendMapKey = ref('')
const backendStatus = ref('')
const backendBusy = ref(false)
const selectedBackendMap = computed(() => {
  return backendMaps.value.find((map) => map.mapKey === selectedBackendMapKey.value) ?? null
})
const placedObjects = ref<EditorMapObject[]>([])
const doors = ref<EditorDoor[]>([])
const selectedObjectId = ref('')
const selectedDoorId = ref('')
const mapId = ref('custom-graveyard-room')
const mapName = ref('自定义墓地房间')
const requiredKills = ref(10)
// editMode 是后端权限元数据，只随保存接口提交，不写入游戏运行时 GameMapConfig。
const editMode = ref<'public' | 'private'>('public')
const groundTextureId = ref<string>(DEFAULT_GROUND_TEXTURE_ID)
const groundRepeat = ref(DEFAULT_GROUND_REPEAT)
const spawnPoint = ref<EditorVector3>([0, 0, 0])
const placementMode = ref<EditorPlacementMode>('place-object')
const snapEnabled = ref(false)
const boundsDisplayState = ref<EditorBoundsDisplayState>({ bounds: false })
const selectedObject = computed(() => placedObjects.value.find((object) => object.id === selectedObjectId.value) ?? null)
const selectedDoor = computed(() => doors.value.find((door) => door.id === selectedDoorId.value) ?? null)
const levelDefinitions = mapLevelDefinitions
const currentLevelDefinition = computed(() => levelDefinitions[selectedLevelType.value])
const currentLevelMetadata = computed(() => getLevelMetadata(selectedLevelType.value))
const levelBackendMaps = computed(() => {
  return backendMaps.value.filter((map) => {
    return map.levelNo === currentLevelMetadata.value.levelNo
      && toEditorLevelType(map.levelTheme) === selectedLevelType.value
  })
})
const levelEditorAssets = computed(() => {
  return editorAssets.filter((asset) => isAssetAvailableForLevel(asset, selectedLevelType.value))
})
const assetKindOptions = computed(() => {
  const kinds = new Set(levelEditorAssets.value.map((asset) => asset.kind))

  return [
    { value: 'all' as const, label: '全部' },
    ...Array.from(kinds).map((kind) => ({ value: kind, label: assetKindLabels[kind] })),
  ]
})
const filteredEditorAssets = computed(() => {
  const keyword = assetSearchKeyword.value.trim().toLowerCase()

  return levelEditorAssets.value.filter((asset) => {
    const matchesKind = selectedAssetKind.value === 'all' || asset.kind === selectedAssetKind.value
    const matchesKeyword = !keyword
      || asset.name.toLowerCase().includes(keyword)
      || asset.id.toLowerCase().includes(keyword)

    return matchesKind && matchesKeyword
  })
})
const placementModeLabel = computed(() => {
  if (placementMode.value === 'place-object') return '放置对象'
  if (placementMode.value === 'set-spawn') return '设置出生点'

  return '添加出口门'
})
const statusPrimaryText = computed(() => {
  if (selectedObject.value) return `已选对象：${selectedObject.value.name}`
  if (selectedDoor.value) return `已选门：${selectedDoor.value.id}`
  if (placementMode.value === 'set-spawn') return `出生点：${spawnPoint.value.join(' / ')}`

  return `当前资源：${selectedAsset.value?.name ?? '未选择'}`
})
const statusHintText = computed(() => {
  if (selectedObject.value) return `位置 ${selectedObject.value.position.join(' / ')}`
  if (selectedDoor.value) return `目标 ${selectedDoor.value.targetMapId} / 距离 ${selectedDoor.value.interactionDistance}`
  if (placementMode.value === 'place-object') return '点击地面放置，拖拽已选对象移动'
  if (placementMode.value === 'set-spawn') return '点击地面更新玩家出生点'

  return '点击地面添加出口门'
})
const boundsDisplayLabel = computed(() => {
  return boundsDisplayState.value.bounds ? '显示' : '隐藏'
})
const editModeLabel = computed(() => {
  return editMode.value === 'private' ? '仅自己和超管可编辑' : '登录用户都可编辑'
})
const exportSource = ref('')
const exportCopyState = ref('')
const viewportHost = ref<HTMLElement | null>(null)
let editorWorld: EditorWorld | null = null
let resizeObserver: ResizeObserver | null = null

const assetKindLabels: Record<EditorAssetKind, string> = {
  prop: '道具',
  structure: '结构',
  decoration: '装饰',
  light: '灯光',
  door: '门类',
  spawn: '出生点',
}

function isMiniMarketAsset(asset: EditorAssetDefinition) {
  return asset.id.startsWith('mini-market:')
}

function isAssetAvailableForLevel(asset: EditorAssetDefinition, levelType: EditorLevelType) {
  if (asset.id === 'placeholder-box') return true
  if (levelType === 'mini-market') return isMiniMarketAsset(asset)

  return !isMiniMarketAsset(asset)
}

function getFirstAssetIdForLevel(levelType: EditorLevelType) {
  return editorAssets.find((asset) => isAssetAvailableForLevel(asset, levelType))?.id ?? editorAssets[0]?.id ?? ''
}

function inferLevelTypeFromDocument(document: EditorMapDocument, map?: Pick<MapSummary, 'levelTheme'>): EditorLevelType {
  if (map?.levelTheme) return toEditorLevelType(map.levelTheme)

  return toEditorLevelType(inferMapLevelMetadata({
    id: document.id,
    props: document.objects,
  }).levelTheme)
}

function createEmptyEditorDocument(): EditorMapDocument {
  const suffix = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/\D/g, '')

  return {
    id: `${currentLevelDefinition.value.defaultIdPrefix}-${suffix.slice(-6)}`,
    name: `${currentLevelDefinition.value.defaultName} ${suffix.slice(-6)}`,
    spawnPoint: [0, 0, 0],
    requiredKills: 10,
    groundMaterial: {
      textureId: DEFAULT_GROUND_TEXTURE_ID,
      repeat: DEFAULT_GROUND_REPEAT,
    },
    objects: [],
    doors: [],
  }
}

onMounted(() => {
  if (!viewportHost.value) return

  editorWorld = new EditorWorld(viewportHost.value, {
    onObjectPlaced(object) {
      const snappedPosition = snapObjectToNeighbors(object, placedObjects.value, object.position, { enabled: snapEnabled.value })
      moveObjectWithCollider(object, snappedPosition)
      editorWorld?.updateObjectTransform(object)
      placedObjects.value.push(object)
      selectedObjectId.value = object.id
      selectedDoorId.value = ''
    },
    onObjectSelected(objectId) {
      selectedObjectId.value = objectId
      selectedDoorId.value = ''
      editorWorld?.setSelectedDoor('')
    },
    onObjectMoved(objectId, position) {
      const object = placedObjects.value.find((item) => item.id === objectId)
      if (!object) return

      const snappedPosition = snapObjectToNeighbors(object, placedObjects.value, position, { enabled: snapEnabled.value })
      moveObjectWithCollider(object, snappedPosition)
      editorWorld?.updateObjectTransform(object)
    },
    onSpawnPointPicked(position) {
      spawnPoint.value = [...position]
    },
    onDoorPlaced(door) {
      // 新门默认连到下一关，避免每次放门后还要手动补 targetMapId。
      door.targetMapId = currentLevelDefinition.value.defaultDoorTargetMapId
      door.targetSpawnId = currentLevelDefinition.value.defaultDoorTargetSpawnId
      doors.value.push(door)
      selectedDoorId.value = door.id
      selectedObjectId.value = ''
      editorWorld?.setSelectedObject('')
    },
    onDoorSelected(doorId) {
      selectDoor(doorId)
    },
    onDoorMoved(doorId, position) {
      const door = doors.value.find((item) => item.id === doorId)
      if (!door) return

      door.position = [...position]
    },
  })
  editorWorld.setSelectedAsset(selectedAsset.value)
  editorWorld.setPlacementMode(placementMode.value)
  editorWorld.setBoundsDisplayState(boundsDisplayState.value)
  editorWorld.updateSpawnPoint(spawnPoint.value)
  editorWorld.start()
  resizeObserver = new ResizeObserver(() => editorWorld?.resize())
  resizeObserver.observe(viewportHost.value)
  void refreshBackendMaps({ loadFirst: true })
})

watch(selectedAsset, (asset) => {
  editorWorld?.setSelectedAsset(asset)
})

watch(selectedLevelType, () => {
  selectedAssetKind.value = 'all'
  if (!selectedAsset.value || !isAssetAvailableForLevel(selectedAsset.value, selectedLevelType.value)) {
    selectedAssetId.value = getFirstAssetIdForLevel(selectedLevelType.value)
  }
})

watch(selectedObjectId, (objectId) => {
  editorWorld?.setSelectedObject(objectId)
})

watch(selectedDoorId, (doorId) => {
  editorWorld?.setSelectedDoor(doorId)
})

watch(placementMode, (mode) => {
  editorWorld?.setPlacementMode(mode)
})

watch(boundsDisplayState, (state) => {
  editorWorld?.setBoundsDisplayState(state)
}, { deep: true })

watch([groundTextureId, groundRepeat], () => {
  editorWorld?.setGroundMaterial({
    textureId: groundTextureId.value,
    repeat: groundRepeat.value,
  })
})

function updateSelectedObjectVector(field: 'position' | 'rotation' | 'scale', index: 0 | 1 | 2, value: string) {
  const object = selectedObject.value
  if (!object) return

  const nextValue = Number(value)
  if (!Number.isFinite(nextValue)) return

  object[field][index] = nextValue
  if (field === 'position') object.collider.position[index] = nextValue
  editorWorld?.updateObjectTransform(object)
}

function updateSelectedColliderEnabled(value: boolean) {
  const object = selectedObject.value
  if (!object) return

  object.collider.enabled = value
  editorWorld?.updateObjectCollider(object)
}

function updateSelectedColliderVector(field: 'position' | 'size', index: 0 | 1 | 2, value: string) {
  const object = selectedObject.value
  if (!object) return

  const rawValue = Number(value)
  if (!Number.isFinite(rawValue)) return

  // collider 尺寸需要始终保持正数，否则 Three.js 线框和后续 Rapier halfExtents 都会失真。
  const nextValue = field === 'size' ? Math.max(0.1, rawValue) : rawValue
  object.collider[field][index] = nextValue
  if (field === 'size') object.snapSize[index] = nextValue
  editorWorld?.updateObjectCollider(object)
}

function setPlacementMode(mode: EditorPlacementMode) {
  placementMode.value = mode
}

function updateSpawnPointVector(index: 0 | 1 | 2, value: string) {
  const nextValue = Number(value)
  if (!Number.isFinite(nextValue)) return

  const nextSpawn: EditorVector3 = [...spawnPoint.value]
  nextSpawn[index] = nextValue
  spawnPoint.value = nextSpawn
  editorWorld?.updateSpawnPoint(nextSpawn)
}

function updateSelectedDoorVector(field: 'position' | 'size', index: 0 | 1 | 2, value: string) {
  const door = selectedDoor.value
  if (!door) return

  const rawValue = Number(value)
  if (!Number.isFinite(rawValue)) return

  const nextValue = field === 'size' ? Math.max(0.1, rawValue) : rawValue
  door[field][index] = nextValue
  editorWorld?.updateDoor(door)
}

function updateSelectedDoorText(field: 'targetMapId' | 'targetSpawnId', value: string) {
  const door = selectedDoor.value
  if (!door) return

  door[field] = value
}

function updateSelectedDoorInteractionDistance(value: string) {
  const door = selectedDoor.value
  if (!door) return

  const nextValue = Number(value)
  if (!Number.isFinite(nextValue)) return

  door.interactionDistance = Math.max(0.1, nextValue)
}

function selectDoor(doorId: string) {
  selectedDoorId.value = doorId
  selectedObjectId.value = ''
  editorWorld?.setSelectedObject('')
}

function selectObject(objectId: string) {
  selectedObjectId.value = objectId
  selectedDoorId.value = ''
  editorWorld?.setSelectedDoor('')
}

function deleteSelectedObject() {
  const objectId = selectedObjectId.value
  if (!objectId) return

  placedObjects.value = placedObjects.value.filter((object) => object.id !== objectId)
  editorWorld?.removeObject(objectId)
  selectedObjectId.value = ''
  editorWorld?.setSelectedObject('')
}

function deleteSelectedDoor() {
  const doorId = selectedDoorId.value
  if (!doorId) return

  doors.value = doors.value.filter((door) => door.id !== doorId)
  editorWorld?.removeDoor(doorId)
  selectedDoorId.value = ''
  editorWorld?.setSelectedDoor('')
}

function findFirstMapForLevel(levelType: EditorLevelType) {
  const metadata = getLevelMetadata(levelType)

  return backendMaps.value.find((map) => {
    return map.levelNo === metadata.levelNo && toEditorLevelType(map.levelTheme) === levelType
  }) ?? null
}

function applyEditorDocument(document: EditorMapDocument, map?: Pick<MapSummary, 'levelTheme'>) {
  selectedLevelType.value = inferLevelTypeFromDocument(document, map)
  mapId.value = document.id
  mapName.value = document.name
  requiredKills.value = document.requiredKills
  groundTextureId.value = document.groundMaterial.textureId
  groundRepeat.value = document.groundMaterial.repeat
  spawnPoint.value = [...document.spawnPoint]
  placedObjects.value = document.objects.map((object) => ({
    ...object,
    position: [...object.position],
    rotation: [...object.rotation],
    scale: [...object.scale],
    snapSize: [...object.snapSize],
    snapOffset: [...object.snapOffset],
    collider: {
      enabled: object.collider.enabled,
      position: [...object.collider.position],
      size: [...object.collider.size],
    },
  }))
  doors.value = document.doors.map((door) => ({
    ...door,
    position: [...door.position],
    size: [...door.size],
  }))
  selectedObjectId.value = ''
  selectedDoorId.value = ''
  exportSource.value = ''
  exportCopyState.value = `已载入：${document.name}`

  editorWorld?.clearEditableObjects()
  editorWorld?.setGroundMaterial(document.groundMaterial)
  editorWorld?.updateSpawnPoint(spawnPoint.value)
  placedObjects.value.forEach((object) => editorWorld?.addObject(object))
  doors.value.forEach((door) => editorWorld?.addDoor(door))
  editorWorld?.setSelectedObject('')
  editorWorld?.setSelectedDoor('')
}

function createNewMap(options: { silent?: boolean } = {}) {
  applyEditorDocument(createEmptyEditorDocument())
  selectedBackendMapKey.value = ''
  editMode.value = 'public'
  backendStatus.value = '已新建空白地图，填写地图信息后点击保存写入后端'
  exportCopyState.value = '新地图尚未保存'
  if (!options.silent) {
    ElMessage.success('已新建空白地图')
  }
}

function handleCreateNewMap() {
  createNewMap()
}

async function refreshBackendMaps(options: { loadFirst?: boolean; silent?: boolean } = {}) {
  backendBusy.value = true
  backendStatus.value = '正在读取后端地图...'

  try {
    backendMaps.value = await listMaps()
    const currentLevelMap = findFirstMapForLevel(selectedLevelType.value)
    selectedBackendMapKey.value = currentLevelMap?.mapKey ?? backendMaps.value[0]?.mapKey ?? ''
    backendStatus.value = backendMaps.value.length > 0 ? `后端地图：${backendMaps.value.length} 张` : '后端暂无地图'
    if (!options.silent) {
      if (backendMaps.value.length > 0) {
        ElMessage.success(`刷新成功，共 ${backendMaps.value.length} 张地图`)
      } else {
        ElMessage.warning('刷新成功，但后端暂无地图')
      }
    }
    if (options.loadFirst && selectedBackendMapKey.value) {
      await loadSelectedBackendMap()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取后端地图失败'
    backendStatus.value = message
    ElMessage.error(message)
  } finally {
    backendBusy.value = false
  }
}

async function loadSelectedBackendMap() {
  if (!selectedBackendMapKey.value) return

  backendBusy.value = true
  backendStatus.value = '正在载入后端地图...'

  try {
    const stored = await getMap(selectedBackendMapKey.value)
    applyEditorDocument(gameMapToEditorDocument(stored.config), stored)
    editMode.value = stored.editMode ?? 'public'
    backendStatus.value = `已从后端载入：${stored.name}`
    ElMessage.success(`已载入地图：${stored.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '载入后端地图失败'
    backendStatus.value = message
    ElMessage.error(message)
  } finally {
    backendBusy.value = false
  }
}

async function loadMapForLevel(levelType: EditorLevelType) {
  selectedLevelType.value = levelType

  const targetMap = findFirstMapForLevel(levelType)
  if (!targetMap) {
    createNewMap({ silent: true })
    backendStatus.value = `${levelDefinitions[levelType].label}暂无后端地图，已创建空白草稿`
    ElMessage.warning(`${levelDefinitions[levelType].label}暂无后端地图，已创建空白草稿`)
    return
  }

  selectedBackendMapKey.value = targetMap.mapKey
  await loadSelectedBackendMap()
}

function createEditorDocument(): EditorMapDocument {
  return {
    id: mapId.value.trim() || 'custom-map',
    name: mapName.value.trim() || '自定义地图',
    spawnPoint: [...spawnPoint.value],
    requiredKills: Math.max(0, Number(requiredKills.value) || 0),
    groundMaterial: {
      textureId: groundTextureId.value,
      repeat: Math.max(1, Number(groundRepeat.value) || DEFAULT_GROUND_REPEAT),
    },
    objects: placedObjects.value,
    doors: doors.value,
  }
}

function selectLevelType(levelType: EditorLevelType) {
  void loadMapForLevel(levelType)
}

async function ensurePlacedObjectModelUrls() {
  await Promise.all(placedObjects.value.map(async (object) => {
    if (object.modelUrl) return

    const asset = getEditorAssetById(object.assetId)
    if (!asset?.loadModelUrl) return

    // 模型 URL 是按需解析的，保存前补齐，避免刚放置后立刻保存丢模型。
    object.modelUrl = await asset.loadModelUrl()
  }))
}

async function generateExportSource() {
  await ensurePlacedObjectModelUrls()
  const result = exportGameMapConfig(createEditorDocument())
  exportSource.value = result.source
  exportCopyState.value = `已生成：${result.map.props.length} 个物件 / ${result.map.colliders.length} 个碰撞体 / ${result.map.doors.length} 个门`
}

async function saveCurrentMapToBackend() {
  backendBusy.value = true
  backendStatus.value = '正在保存到后端...'

  try {
    await ensurePlacedObjectModelUrls()
    const result = exportGameMapConfig(createEditorDocument())
    const levelMetadata = currentLevelMetadata.value
    const stored = await saveMap({
      status: 'draft',
      remark: 'editor save',
      levelNo: levelMetadata.levelNo,
      levelTheme: levelMetadata.levelTheme,
      editMode: editMode.value,
      config: result.map,
    })
    exportSource.value = result.source
    exportCopyState.value = `已保存到后端：${stored.name}`
    backendStatus.value = `已保存：${stored.mapKey}`
    ElMessage.success(`已保存地图：${stored.name}`)
    await refreshBackendMaps({ silent: true })
    selectedBackendMapKey.value = stored.mapKey
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存后端地图失败'
    backendStatus.value = message
    ElMessage.error(message)
  } finally {
    backendBusy.value = false
  }
}

async function deleteSelectedBackendMap() {
  const map = selectedBackendMap.value
  if (!map) return

  try {
    await ElMessageBox.confirm(
      `确定删除地图“${map.name}”吗？删除后无法从编辑器恢复。`,
      '删除后端地图',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  backendBusy.value = true
  backendStatus.value = `正在删除：${map.name}`

  try {
    // 删除只作用于后端当前选中的地图，不清空正在编辑的画布，避免误删后丢失本地改动。
    await deleteMap(map.mapKey)
    ElMessage.success(`已删除地图：${map.name}`)
    await refreshBackendMaps({ silent: true, loadFirst: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除后端地图失败'
    backendStatus.value = message
    ElMessage.error(message)
  } finally {
    backendBusy.value = false
  }
}

async function copyExportSource() {
  if (!exportSource.value) await generateExportSource()

  try {
    await navigator.clipboard.writeText(exportSource.value)
    exportCopyState.value = '已复制到剪贴板'
  } catch {
    exportCopyState.value = '浏览器不允许自动复制，请手动复制文本框内容'
  }
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  editorWorld?.dispose()
})
</script>

<template>
  <section class="level-editor" aria-label="开发关卡编辑器">
    <header class="level-editor__topbar">
      <nav class="level-editor__level-switch" aria-label="关卡切换">
        <button
          v-for="(definition, levelType) in levelDefinitions"
          :key="levelType"
          type="button"
          :disabled="backendBusy"
          :class="{ active: selectedLevelType === levelType }"
          @click="selectLevelType(levelType)"
        >
          <span>{{ definition.label }}</span>
          <strong>{{ definition.title }}</strong>
        </button>
      </nav>

      <div class="level-editor__top-actions">
        <button type="button" :disabled="backendBusy" @click="handleCreateNewMap">新建</button>
        <button type="button" :disabled="backendBusy" @click="() => refreshBackendMaps()">刷新</button>
        <button type="button" :disabled="backendBusy || !selectedBackendMapKey" @click="loadSelectedBackendMap">
          载入
        </button>
        <button
          type="button"
          :disabled="backendBusy || !selectedBackendMap"
          class="level-editor__danger-btn"
          @click="deleteSelectedBackendMap"
        >
          删除
        </button>
        <button type="button" :disabled="backendBusy" class="level-editor__primary-btn" @click="saveCurrentMapToBackend">
          保存
        </button>
      </div>

      <nav class="level-editor__tool-strip" aria-label="编辑工具">
        <button
          type="button"
          :class="{ active: placementMode === 'place-object' }"
          @click="setPlacementMode('place-object')"
        >
          放置
        </button>
        <button type="button" :class="{ active: placementMode === 'set-spawn' }" @click="setPlacementMode('set-spawn')">
          出生点
        </button>
        <button type="button" :class="{ active: placementMode === 'add-door' }" @click="setPlacementMode('add-door')">
          门
        </button>
        <label class="level-editor__tool-toggle" :class="{ active: snapEnabled }">
          <input v-model="snapEnabled" type="checkbox" />
          <span>吸附</span>
        </label>
        <label class="level-editor__tool-toggle" :class="{ active: boundsDisplayState.bounds }">
          <input v-model="boundsDisplayState.bounds" type="checkbox" />
          <span>边界线</span>
        </label>
      </nav>
    </header>

    <aside class="level-editor__panel level-editor__assets">
      <div class="level-editor__load-map">
        <label>
          <span>后端地图</span>
          <select v-model="selectedBackendMapKey" :disabled="backendBusy || levelBackendMaps.length === 0">
            <option v-for="map in levelBackendMaps" :key="map.mapKey" :value="map.mapKey">
              {{ map.name }}
            </option>
          </select>
        </label>
        <small>{{ backendStatus || `当前显示${currentLevelDefinition.label}地图。` }}</small>
      </div>

      <div class="level-editor__panel-head">
        <p class="eyebrow">资源</p>
        <strong>对象库</strong>
      </div>

      <small class="level-editor__level-hint">
        当前：{{ currentLevelDefinition.description }}
      </small>

      <div class="level-editor__asset-filters" aria-label="资源筛选">
        <label>
          <span>搜索资源</span>
          <input v-model="assetSearchKeyword" placeholder="名称或 ID" />
        </label>
        <label>
          <span>分类</span>
          <select v-model="selectedAssetKind">
            <option v-for="option in assetKindOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <small>显示 {{ filteredEditorAssets.length }} / {{ levelEditorAssets.length }} 个资源</small>
      </div>

      <div class="level-editor__asset-list">
        <button
          v-for="asset in filteredEditorAssets"
          :key="asset.id"
          type="button"
          class="level-editor__asset-card"
          :class="{ active: selectedAssetId === asset.id }"
          @click="selectedAssetId = asset.id"
        >
          <img v-if="asset.previewUrl" :src="asset.previewUrl" :alt="asset.name" />
          <span>{{ asset.name }}</span>
          <small>{{ assetKindLabels[asset.kind] }} / {{ asset.colliderEnabledByDefault ? '默认碰撞体' : '仅视觉/灯光' }}</small>
        </button>
      </div>
    </aside>

    <section class="level-editor__viewport">
      <div ref="viewportHost" class="level-editor__canvas-host" />

      <div class="level-editor__status-bar">
        <span class="level-editor__status-pill active">模式：{{ placementModeLabel }}</span>
        <span class="level-editor__status-pill">{{ statusPrimaryText }}</span>
        <span class="level-editor__status-pill" :class="{ active: snapEnabled }">
          吸附：{{ snapEnabled ? '开启' : '关闭' }}
        </span>
        <span class="level-editor__status-pill" :class="{ active: boundsDisplayState.bounds }">
          边界线：{{ boundsDisplayLabel }}
        </span>
        <small>{{ statusHintText }} / WASD 旋转镜头 / 滚轮缩放 / 右键平移</small>
      </div>
    </section>

    <aside class="level-editor__panel level-editor__properties">
      <div class="level-editor__panel-head">
        <p class="eyebrow">属性</p>
        <strong v-if="selectedObject">对象属性</strong>
        <strong v-else-if="selectedDoor">门属性</strong>
        <strong v-else-if="placementMode === 'set-spawn'">出生点</strong>
        <strong v-else>地图设置</strong>
      </div>

      <div
        v-if="!selectedObject && !selectedDoor && placementMode !== 'set-spawn'"
        class="level-editor__section level-editor__section--plain"
      >
          <label>
            <span>关卡类型</span>
            <input :value="`${currentLevelDefinition.label} / ${currentLevelDefinition.title}`" readonly />
          </label>

          <label>
            <span>地图 ID</span>
            <input v-model="mapId" />
        </label>

        <label>
          <span>地图名称</span>
          <input v-model="mapName" />
        </label>

        <label>
          <span>开门击杀数</span>
          <input v-model.number="requiredKills" type="number" step="1" min="0" />
        </label>

        <div class="level-editor__inline-setting">
          <label class="level-editor__toggle level-editor__toggle--compact">
            <input
              type="checkbox"
              :checked="editMode === 'private'"
              @change="editMode = ($event.target as HTMLInputElement).checked ? 'private' : 'public'"
            />
            <span>仅自己可编辑</span>
          </label>
          <small>{{ editModeLabel }}</small>
        </div>

        <label>
          <span>地板材质</span>
          <select v-model="groundTextureId">
            <option v-for="texture in groundTextureOptions" :key="texture.id" :value="texture.id">
              {{ texture.name }}
            </option>
          </select>
        </label>

        <label>
          <span>地板平铺</span>
          <input v-model.number="groundRepeat" type="number" step="1" min="1" max="40" />
        </label>
      </div>

      <div v-if="!selectedObject && !selectedDoor && placementMode === 'set-spawn'" class="level-editor__section">
        <span class="level-editor__section-title">出生点</span>
        <div class="level-editor__field-grid">
          <label>
            <span>X</span>
            <input
              type="number"
              step="0.1"
              :value="spawnPoint[0]"
              @input="updateSpawnPointVector(0, ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label>
            <span>Y</span>
            <input
              type="number"
              step="0.1"
              :value="spawnPoint[1]"
              @input="updateSpawnPointVector(1, ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label>
            <span>Z</span>
            <input
              type="number"
              step="0.1"
              :value="spawnPoint[2]"
              @input="updateSpawnPointVector(2, ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>
      </div>

      <template v-if="selectedObject">
        <div class="level-editor__section level-editor__section--plain">
          <div class="level-editor__section-head">
            <span class="level-editor__section-title">对象</span>
            <button type="button" class="level-editor__danger-btn" @click="deleteSelectedObject">删除</button>
          </div>

          <label>
            <span>名称</span>
            <input :value="selectedObject.name" readonly />
          </label>

          <label>
            <span>资源 ID</span>
            <input :value="selectedObject.assetId" readonly />
          </label>
        </div>

        <div class="level-editor__section">
          <span class="level-editor__section-title">变换</span>
          <div class="level-editor__field-grid">
            <label>
              <span>位置 X</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.position[0]"
                @input="updateSelectedObjectVector('position', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>位置 Y</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.position[1]"
                @input="updateSelectedObjectVector('position', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>位置 Z</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.position[2]"
                @input="updateSelectedObjectVector('position', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <label>
            <span>Y 轴旋转</span>
            <input
              type="number"
              step="0.1"
              :value="selectedObject.rotation[1]"
              @input="updateSelectedObjectVector('rotation', 1, ($event.target as HTMLInputElement).value)"
            />
          </label>

          <div class="level-editor__field-grid">
            <label>
              <span>缩放 X</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.scale[0]"
                @input="updateSelectedObjectVector('scale', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>缩放 Y</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.scale[1]"
                @input="updateSelectedObjectVector('scale', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>缩放 Z</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.scale[2]"
                @input="updateSelectedObjectVector('scale', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>

        <div class="level-editor__section">
          <div class="level-editor__section-head">
            <span class="level-editor__section-title">碰撞体</span>
            <label class="level-editor__toggle level-editor__toggle--compact">
              <input
                type="checkbox"
                :checked="selectedObject.collider.enabled"
                @change="updateSelectedColliderEnabled(($event.target as HTMLInputElement).checked)"
              />
              <span>{{ selectedObject.collider.enabled ? '启用' : '关闭' }}</span>
            </label>
          </div>

          <div class="level-editor__field-grid">
            <label>
              <span>偏移 X</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.collider.position[0]"
                @input="updateSelectedColliderVector('position', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>偏移 Y</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.collider.position[1]"
                @input="updateSelectedColliderVector('position', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>偏移 Z</span>
              <input
                type="number"
                step="0.1"
                :value="selectedObject.collider.position[2]"
                @input="updateSelectedColliderVector('position', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <div class="level-editor__field-grid">
            <label>
              <span>尺寸 X</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.snapSize[0]"
                @input="updateSelectedColliderVector('size', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>尺寸 Y</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.snapSize[1]"
                @input="updateSelectedColliderVector('size', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>尺寸 Z</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedObject.snapSize[2]"
                @input="updateSelectedColliderVector('size', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>
      </template>

      <div v-if="!selectedObject && !selectedDoor" class="level-editor__section">
        <span class="level-editor__section-title">已放置对象</span>
        <label>
          <span>对象数量</span>
          <input :value="String(placedObjects.length)" readonly />
        </label>

        <div class="level-editor__object-list">
          <button
            v-for="object in placedObjects"
            :key="object.id"
            type="button"
            :class="{ active: selectedObjectId === object.id }"
            @click="selectObject(object.id)"
          >
            <span>{{ object.name }}</span>
            <small>{{ object.position.join(' / ') }}</small>
          </button>
        </div>
      </div>

      <div v-if="!selectedObject && !selectedDoor" class="level-editor__section">
        <span class="level-editor__section-title">出口门</span>
        <label>
          <span>门数量</span>
          <input :value="String(doors.length)" readonly />
        </label>

        <div class="level-editor__object-list">
          <button
            v-for="door in doors"
            :key="door.id"
            type="button"
            :class="{ active: selectedDoorId === door.id }"
            @click="selectDoor(door.id)"
          >
            <span>{{ door.id }}</span>
            <small>{{ door.position.join(' / ') }} -> {{ door.targetMapId }}</small>
          </button>
        </div>
      </div>

      <template v-if="selectedDoor">
        <div class="level-editor__section level-editor__section--plain">
          <div class="level-editor__section-head">
            <span class="level-editor__section-title">出口门</span>
            <button type="button" class="level-editor__danger-btn" @click="deleteSelectedDoor">删除</button>
          </div>
          <label>
            <span>门 ID</span>
            <input :value="selectedDoor.id" readonly />
          </label>
        </div>

        <div class="level-editor__section">
          <span class="level-editor__section-title">目标</span>
          <label>
            <span>目标地图 ID</span>
            <input
              :value="selectedDoor.targetMapId"
              @input="updateSelectedDoorText('targetMapId', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label>
            <span>目标出生点 ID</span>
            <input
              :value="selectedDoor.targetSpawnId"
              @input="updateSelectedDoorText('targetSpawnId', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label>
            <span>交互距离</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              :value="selectedDoor.interactionDistance"
              @input="updateSelectedDoorInteractionDistance(($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <div class="level-editor__section">
          <span class="level-editor__section-title">位置和尺寸</span>
          <div class="level-editor__field-grid">
            <label>
              <span>门 X</span>
              <input
                type="number"
                step="0.1"
                :value="selectedDoor.position[0]"
                @input="updateSelectedDoorVector('position', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>门 Y</span>
              <input
                type="number"
                step="0.1"
                :value="selectedDoor.position[1]"
                @input="updateSelectedDoorVector('position', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>门 Z</span>
              <input
                type="number"
                step="0.1"
                :value="selectedDoor.position[2]"
                @input="updateSelectedDoorVector('position', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <div class="level-editor__field-grid">
            <label>
              <span>宽</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedDoor.size[0]"
                @input="updateSelectedDoorVector('size', 0, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>高</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedDoor.size[1]"
                @input="updateSelectedDoorVector('size', 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label>
              <span>厚</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                :value="selectedDoor.size[2]"
                @input="updateSelectedDoorVector('size', 2, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>
      </template>

      <details v-if="!selectedObject && !selectedDoor" class="level-editor__export">
        <summary>调试导出</summary>
        <div class="level-editor__export-actions">
          <button type="button" @click="generateExportSource">生成配置</button>
          <button type="button" :disabled="backendBusy" @click="saveCurrentMapToBackend">保存后端</button>
          <button type="button" @click="copyExportSource">复制配置</button>
        </div>
        <textarea
          v-model="exportSource"
          class="level-editor__export-textarea"
          spellcheck="false"
          placeholder="点击生成配置后，这里会显示 GameMapConfig TypeScript 文本。"
        />
        <small>{{ exportCopyState || '导出的配置可以手动复制到 src/game/map 下的新地图文件。' }}</small>
      </details>
    </aside>
  </section>
</template>
