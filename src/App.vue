<script setup lang="ts">
import { computed, ref } from 'vue'
import { THEME_MAP, type ThemeKey } from './constants/arcadeSprite'
import { VirtualArcadeController, type ArcadeButtonConfig, type ArcadeButtonPayload, type ArcadeViewMode } from './lib'

const currentTheme = ref<ThemeKey>('red')
const viewMode = ref<ArcadeViewMode>('flat')
const activeTheme = computed(() => THEME_MAP[currentTheme.value])

const axisX = ref(0)
const axisY = ref(0)
const jumpPressed = ref(false)

const actionPressed = ref<Record<string, boolean>>({
  Y: false,
  X: false,
  RB: false,
  LB: false,
  A: false,
  B: false,
  RT: false,
  LT: false,
})

const actionButtons: ArcadeButtonConfig[] = [
  { id: 'x', label: 'X', keyBinding: 'KeyU', row: 'top' },
  { id: 'y', label: 'Y', keyBinding: 'KeyI', row: 'top' },
  { id: 'rb', label: 'RB', keyBinding: 'KeyE', row: 'top' },
  { id: 'lb', label: 'LB', keyBinding: 'KeyQ', row: 'top' },
  { id: 'a', label: 'A', keyBinding: 'KeyJ', row: 'bottom' },
  { id: 'b', label: 'B', keyBinding: 'KeyK', row: 'bottom' },
  { id: 'rt', label: 'RT', keyBinding: 'KeyZ', row: 'bottom' },
  { id: 'lt', label: 'LT', keyBinding: 'KeyC', row: 'bottom' },
]

const axisText = computed(() => `${axisX.value}, ${axisY.value}`)

function formatKeyBinding(code: string) {
  return code.replace(/^Key/, '')
}

function onAxisChange({ x, y }: { x: number; y: number }) {
  axisX.value = x
  axisY.value = y
}

function onEnd() {
  axisX.value = 0
  axisY.value = 0
}

function setAction({ label, pressed }: ArcadeButtonPayload) {
  actionPressed.value[label] = pressed
  if (label === 'A') jumpPressed.value = pressed
}
</script>

<template>
  <main class="arcade-page">
    <section class="hero-header">
      <div>
        <h1>虚拟街机<span>摇杆</span></h1>
        <p>— VIRTUAL ARCADE STICK —</p>
      </div>
      <div class="header-controls">
        <div class="theme-switch">
          <span>主题颜色</span>
          <button
            v-for="(theme, key) in THEME_MAP"
            :key="key"
            class="color-dot"
            :class="{ active: key === currentTheme }"
            :style="{ '--dot-color': theme.preview }"
            type="button"
            @click="currentTheme = key as ThemeKey"
          />
        </div>
        <div class="view-switch">
          <button :class="{ active: viewMode === 'flat' }" type="button" @click="viewMode = 'flat'">平面</button>
          <button :class="{ active: viewMode === 'angled' }" type="button" @click="viewMode = 'angled'">2.5D</button>
        </div>
        <button class="ghost-btn">音效 ON</button>
        <button class="ghost-btn">全屏</button>
      </div>
    </section>

    <section class="cabinet-shell">
      <div class="cabinet-topbar">
        <button>SELECT</button>
        <button>START</button>
        <button class="active">COIN</button>
      </div>

      <div class="cabinet-panel">
        <span class="panel-bolt tl" />
        <span class="panel-bolt tr" />
        <span class="panel-bolt bl" />
        <span class="panel-bolt br" />
        <VirtualArcadeController
          :buttons="actionButtons"
          :color="activeTheme.preview"
          :arrow-color="activeTheme.preview"
          :view-mode="viewMode"
          :joystick-size="182"
          :button-size="82"
          :top-offset="14"
          @axis-change="onAxisChange"
          @axis-end="onEnd"
          @button-change="setAction"
        >
          <template #joystick>
          
          </template>
        </VirtualArcadeController>
      </div>
    </section>

    <section class="settings-row">
      <article class="settings-card">
        <h2>摇杆设置</h2>
        <p>当前轴向: {{ axisText }}</p>
      </article>
      <article class="settings-card">
        <h2>按键设置</h2>
        <p>Jump: <strong :class="{ on: jumpPressed }">{{ jumpPressed ? 'Pressed' : 'Idle' }}</strong></p>
      </article>
      <article class="settings-card">
        <h2>外观设置</h2>
        <p>主题: {{ activeTheme.name }}色</p>
      </article>
      <article class="settings-card">
        <h2>按键测试</h2>
        <div class="pressed-list">
          <span
            v-for="button in actionButtons"
            :key="button.label"
            :class="{ active: actionPressed[button.label] }"
          >
            <strong>{{ button.label }}</strong>
              <em>{{ formatKeyBinding(button.keyBinding as string) }}</em>
          </span>
        </div>
      </article>
    </section>
  </main>
</template>
