<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ThreeJoystick,
  VirtualActionButton,
  type ArcadeAxisPayload,
  type ArcadeButtonConfig,
  type ArcadeButtonPayload,
  type ArcadeViewMode,
  type JoystickKeyboardMapping,
} from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'
import AuthStatus from '../components/AuthStatus.vue'
import ZombieSurvivalGame from '../game/ZombieSurvivalGame.vue'
import { loadRemoteGameMaps } from '../game/map/remoteMaps'
import type { GameMapConfig } from '../game/map/types'
import type { GameInput, GameStats } from '../game/types'

const viewMode = ref<ArcadeViewMode>('angled')
const axis = ref<ArcadeAxisPayload>({ x: 0, y: 0 })
const pressedButtons = ref<Record<string, boolean>>({})
const showControlsHelp = ref(false)
const showMapDialog = ref(false)
const gameStarted = ref(false)
const maps = ref<GameMapConfig[]>([])
const mapsLoading = ref(true)
const mapsError = ref('')
const gameRef = ref<InstanceType<typeof ZombieSurvivalGame> | null>(null)
const stats = ref<GameStats>({
  status: 'running',
  health: 100,
  kills: 0,
  time: 0,
  zombies: 0,
  weaponLevel: 1,
  weaponExperience: 0,
  weaponRequiredExperience: 3,
  mapId: 'graveyard-entrance',
  mapName: '墓地入口',
  requiredKills: 10,
  doorUnlocked: false,
})

const canStartGame = computed(() => !mapsLoading.value && !mapsError.value && maps.value.length > 0)

const statusText = computed(() => {
  if (!gameStarted.value) return '未开始'
  if (stats.value.status === 'running') return '运行中'
  if (stats.value.status === 'paused') return '已暂停'

  return '已结束'
})

const healthPercent = computed(() => `${Math.max(0, Math.min(100, stats.value.health))}%`)
const weaponExperiencePercent = computed(() => {
  if (stats.value.weaponRequiredExperience <= 0) return '100%'

  return `${Math.max(0, Math.min(100, (stats.value.weaponExperience / stats.value.weaponRequiredExperience) * 100))}%`
})

const joystickKeyboardMapping: JoystickKeyboardMapping = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
}

const buttons: ArcadeButtonConfig[] = [
  { id: 'pause', label: 'X', keyBinding: 'KeyP', row: 'top' },
  { id: 'restart', label: 'Y', keyBinding: 'KeyR', row: 'top' },
  { id: 'dash', label: 'A', keyBinding: ['Space', 'KeyJ'], row: 'bottom' },
]

onMounted(() => {
  void loadMaps()
})

const gameInput = computed<GameInput>(() => {
  return {
    axis: axis.value,
    dash: Boolean(pressedButtons.value.dash),
    pausePressed: Boolean(pressedButtons.value.pause),
    restartPressed: Boolean(pressedButtons.value.restart),
  }
})

function onAxisChange(payload: ArcadeAxisPayload) {
  axis.value = payload
}

function onAxisEnd() {
  axis.value = { x: 0, y: 0 }
}

function onButtonChange(payload: ArcadeButtonPayload) {
  pressedButtons.value[payload.id] = payload.pressed
}

function onStatsChange(payload: GameStats) {
  stats.value = payload
}

function switchMap(mapId: string) {
  gameRef.value?.switchMap(mapId)
  showMapDialog.value = false
}

async function loadMaps() {
  mapsLoading.value = true
  mapsError.value = ''

  try {
    maps.value = await loadRemoteGameMaps()
    if (maps.value.length === 0) {
      mapsError.value = '后端暂无地图，请先在数据库或编辑器中创建地图'
      gameStarted.value = false
    }
  } catch (error) {
    mapsError.value = error instanceof Error ? error.message : '地图加载失败'
    gameStarted.value = false
  } finally {
    mapsLoading.value = false
  }
}

function startGame() {
  if (!canStartGame.value) return

  // 游戏实例只在点击开始后挂载，避免刷新页面后自动进入战斗循环。
  gameStarted.value = true
  showControlsHelp.value = false
  showMapDialog.value = false
  axis.value = { x: 0, y: 0 }
  pressedButtons.value = {}
}
</script>

<template>
  <main class="page">
    <section class="game-shell">
      <div class="game-panel">
        <div class="game-topbar">
          <div>
            <p class="eyebrow">npm 游戏示例</p>
            <h1>zjj 打僵尸</h1>
          </div>

          <div class="top-actions">
            <div class="view-switch" aria-label="view mode">
              <button type="button" :class="{ active: viewMode === 'flat' }" @click="viewMode = 'flat'">平面</button>
              <button type="button" :class="{ active: viewMode === 'angled' }" @click="viewMode = 'angled'">
                2.5D
              </button>
            </div>
            <button type="button" class="help-btn" :class="{ active: showControlsHelp }" @click="showControlsHelp = !showControlsHelp">
              操作说明
            </button>
            <button
              v-if="gameStarted"
              type="button"
              class="help-btn"
              :class="{ active: showMapDialog }"
              @click="showMapDialog = !showMapDialog"
            >
              地图
            </button>
            <div class="route-switch" aria-label="页面切换">
              <RouterLink custom to="/" v-slot="{ href, navigate, isActive }">
                <button type="button" :class="{ active: isActive }" :data-href="href" @click="navigate">游戏</button>
              </RouterLink>
              <RouterLink custom to="/editor" v-slot="{ href, navigate, isActive }">
                <button type="button" :class="{ active: isActive }" :data-href="href" @click="navigate">编辑器</button>
              </RouterLink>
            </div>
            <AuthStatus />
          </div>
        </div>

        <div v-if="showControlsHelp" class="controls-help">
          WASD 或摇杆移动，A/Space 冲刺；门开启后靠近出口按 A 进入下一房间。X/P 暂停，Y/R 重新开始。
        </div>

        <div v-if="showMapDialog && gameStarted" class="map-dialog" role="dialog" aria-label="地图切换">
          <div class="map-dialog__header">
            <strong>地图切换</strong>
            <button type="button" aria-label="关闭地图弹窗" @click="showMapDialog = false">关闭</button>
          </div>

          <button
            v-for="map in maps"
            :key="map.id"
            type="button"
            class="map-option"
            :class="{ active: stats.mapId === map.id }"
            @click="switchMap(map.id)"
          >
            <span>{{ map.name }}</span>
            <small>{{ map.requiredKills }} 击杀开门</small>
          </button>
          <small v-if="maps.length === 0">{{ mapsError || '暂无地图' }}</small>
        </div>

        <div v-if="mapsLoading || mapsError" class="state-banner">
          {{ mapsLoading ? '正在加载地图...' : mapsError }}
        </div>

        <div v-else-if="!gameStarted" class="start-screen" role="dialog" aria-label="开始游戏">
          <p class="eyebrow">生存射击</p>
          <strong>准备进入墓地</strong>
          <span>点击开始后，角色会自动射击，使用摇杆控制移动。</span>
          <button type="button" :disabled="!canStartGame" @click="startGame">开始游戏</button>
        </div>

        <ZombieSurvivalGame
          v-else
          ref="gameRef"
          :input="gameInput"
          :view-mode="viewMode"
          :maps="maps"
          @stats="onStatsChange"
        />

        <div v-if="gameStarted && stats.status !== 'running'" class="state-banner">
          {{ stats.status === 'paused' ? '已暂停' : '游戏结束' }}
        </div>
      </div>

      <div v-if="gameStarted" class="bottom-dock" aria-label="game controller">
        <div class="floating-controls__left">
          <ThreeJoystick
            color="#eb1f2f"
            arrow-color="#eb1f2f"
            :view-mode="viewMode"
            :keyboard-mapping="joystickKeyboardMapping"
            :size="154"
            @move="(x, y) => onAxisChange({ x, y })"
            @end="onAxisEnd"
          />
        </div>

        <div class="hud">
          <div>
            <span>地图</span>
            <strong>{{ stats.mapName }}</strong>
          </div>
          <div>
            <span>击杀</span>
            <strong>{{ stats.kills }}/{{ stats.requiredKills }}</strong>
          </div>
          <div>
            <span>时间</span>
            <strong>{{ Math.floor(stats.time) }}s</strong>
          </div>
          <div>
            <span>僵尸</span>
            <strong>{{ stats.zombies }}</strong>
          </div>
          <div>
            <span>武器</span>
            <strong>Lv.{{ stats.weaponLevel }}</strong>
          </div>
          <div>
            <span>出口</span>
            <strong>{{ stats.doorUnlocked ? '已开启' : '未开启' }}</strong>
          </div>
          <div>
            <span>状态</span>
            <strong>{{ statusText }}</strong>
          </div>
        </div>

        <div class="status-bars" aria-label="player status bars">
          <div class="status-bar health-bar">
            <span class="status-bar__fill" :style="{ width: healthPercent }" />
            <strong>{{ stats.health }}/100</strong>
          </div>
          <div class="status-bar weapon-exp-bar">
            <span class="status-bar__fill" :style="{ width: weaponExperiencePercent }" />
            <strong>{{ stats.weaponExperience }}/{{ stats.weaponRequiredExperience }}</strong>
          </div>
        </div>

        <div class="floating-controls__right">
          <div class="button-grid">
            <VirtualActionButton
              v-for="button in buttons"
              :key="button.id"
              :label="button.label"
              :color="'#eb1f2f'"
              :view-mode="viewMode"
              :size="58"
              :key-binding="button.keyBinding"
              @press="onButtonChange({ id: button.id, label: button.label, pressed: true })"
              @release="onButtonChange({ id: button.id, label: button.label, pressed: false })"
            />
          </div>
          <div class="button-labels">
            <small v-for="button in buttons" :key="button.id">{{ button.label }}</small>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
