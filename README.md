# ZJJ Virtual Arcade Controller

基于 Vue 3 + Three.js 的虚拟街机控制器组件库。

`zjj-virtual-arcade-controller` 提供三层组件：

- `VirtualArcadeController`：开箱即用的组合控制器，包含 1 个摇杆、方向箭头、动作按钮、按钮标签和布局。
- `ThreeJoystick`：独立 3D 摇杆组件。
- `VirtualActionButton`：独立 3D 动作按钮组件。

适用于网页游戏、触屏控制面板、键盘映射调试、街机风格交互原型等场景。

## 功能特性

- 拟真的 Three.js 摇杆和动作按钮。
- 支持鼠标、触摸和键盘输入。
- 支持平面俯视和 2.5D 玩家视角。
- 支持配置按钮布局、颜色、尺寸、标签和上排按钮缩进。
- 支持配置摇杆方向键映射。
- 提供 Vue 3 组件类型、props 类型和事件载荷类型。
- 样式通过 `zjj-virtual-arcade-controller/style.css` 导出。

## 安装

```bash
npm install zjj-virtual-arcade-controller
```

Peer dependencies：

```bash
npm install vue three
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  VirtualArcadeController,
  type ArcadeAxisPayload,
  type ArcadeButtonConfig,
  type ArcadeButtonPayload,
  type JoystickKeyboardMapping,
} from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'

const axis = ref<ArcadeAxisPayload>({ x: 0, y: 0 })
const pressed = ref<Record<string, boolean>>({})

const joystickKeyboardMapping: JoystickKeyboardMapping = {
  up: ['KeyT'],
  down: ['KeyG'],
  left: ['KeyF'],
  right: ['KeyH'],
}

const buttons: ArcadeButtonConfig[] = [
  { id: 'dash', label: 'X', keyBinding: 'KeyU', row: 'top' },
  { id: 'skill', label: 'Y', keyBinding: 'KeyI', row: 'top' },
  { id: 'guard', label: 'RB', keyBinding: 'KeyE', row: 'top' },
  { id: 'menu', label: 'LB', keyBinding: 'KeyQ', row: 'top' },
  { id: 'jump', label: 'A', keyBinding: ['KeyJ', 'Space'], row: 'bottom' },
  { id: 'attack', label: 'B', keyBinding: 'KeyK', row: 'bottom' },
  { id: 'trigger', label: 'RT', keyBinding: 'KeyZ', row: 'bottom' },
  { id: 'special', label: 'LT', keyBinding: 'KeyC', row: 'bottom' },
]

function onAxisChange(payload: ArcadeAxisPayload) {
  axis.value = payload
}

function onAxisEnd() {
  axis.value = { x: 0, y: 0 }
}

function onButtonChange(payload: ArcadeButtonPayload) {
  pressed.value[payload.id] = payload.pressed
}
</script>

<template>
  <VirtualArcadeController
    :buttons="buttons"
    color="#eb1f2f"
    arrow-color="#eb1f2f"
    view-mode="angled"
    :joystick-keyboard-mapping="joystickKeyboardMapping"
    :joystick-size="182"
    :button-size="82"
    :top-offset="14"
    @axis-change="onAxisChange"
    @axis-end="onAxisEnd"
    @button-change="onButtonChange"
  />
</template>
```

## 组件层级

| 组件 | 适用场景 |
| --- | --- |
| `VirtualArcadeController` | 需要完整控制器内核时使用：摇杆、方向箭头、按钮、标签和布局。 |
| `ThreeJoystick` | 只需要独立摇杆，并希望自己设计布局时使用。 |
| `VirtualActionButton` | 只需要单个 3D 按钮，或希望自己组合多个按钮时使用。 |

本地 demo 里的白色底盘、螺丝、街机外壳、`SELECT / START / COIN` 和状态卡片不属于当前 npm 包 API。

## 独立摇杆

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ThreeJoystick } from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'

const axis = ref({ x: 0, y: 0 })

function onMove(x: number, y: number) {
  axis.value = { x, y }
}
</script>

<template>
  <ThreeJoystick
    color="#eb1f2f"
    arrow-color="#eb1f2f"
    view-mode="angled"
    :size="182"
    @move="onMove"
    @end="axis = { x: 0, y: 0 }"
  />
</template>
```

## 独立按钮

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VirtualActionButton } from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'

const pressed = ref(false)
</script>

<template>
  <div>
    <VirtualActionButton
      color="#eb1f2f"
      view-mode="angled"
      :size="82"
      key-binding="KeyJ"
      @press="pressed = true"
      @release="pressed = false"
    />
    <span>A {{ pressed ? 'Pressed' : 'Idle' }}</span>
  </div>
</template>
```

## `VirtualArcadeController` API

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `buttons` | `ArcadeButtonConfig[]` | 8 个默认动作按钮 | 动作按钮配置。 |
| `color` | `string` | `#eb1f2f` | 摇杆头和按钮颜色。 |
| `arrowColor` | `string` | 跟随 `color` | 方向箭头颜色。 |
| `joystickKeyboardMapping` | `JoystickKeyboardMapping` | 方向键 + WASD | 摇杆方向键映射。 |
| `viewMode` | `'flat' \| 'angled'` | `flat` | 渲染视角。 |
| `joystickSize` | `number` | `182` | 摇杆 canvas 尺寸，单位 px。 |
| `buttonSize` | `number` | `82` | 单个按钮 canvas 尺寸，单位 px。 |
| `topOffset` | `number` | `14` | 上排按钮的水平缩进。 |
| `showLabels` | `boolean` | `true` | 是否渲染按钮标签。 |

### 事件

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `axis-change` | `{ x: number; y: number }` | 摇杆移动时触发。 |
| `axis-end` | 无 | 摇杆回中时触发。 |
| `button-change` | `{ id: string; label: string; pressed: boolean }` | 任意动作按钮按下或释放时触发。 |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| `joystick` | 渲染在摇杆区域周围，可用于放玩家编号、装饰或提示。 |

## 键盘映射

`joystickKeyboardMapping` 使用 `KeyboardEvent.code`。

默认映射：

```ts
const joystickKeyboardMapping: JoystickKeyboardMapping = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
}
```

自定义示例：

```vue
<VirtualArcadeController
  :joystick-keyboard-mapping="{
    up: ['KeyT'],
    down: ['KeyG'],
    left: ['KeyF'],
    right: ['KeyH'],
  }"
/>
```

建议不要让摇杆方向键和动作按钮的 `keyBinding` 重叠；如果重叠，同一个键盘输入会同时触发摇杆和按钮事件。

## 类型

```ts
export type ButtonRow = 'top' | 'bottom'
export type ArcadeViewMode = 'flat' | 'angled'
export type JoystickDirection = 'up' | 'down' | 'left' | 'right'
export type JoystickKeyboardMapping = Partial<Record<JoystickDirection, string[]>>

export type ArcadeButtonConfig = {
  id: string
  label: string
  keyBinding?: string | string[]
  row?: ButtonRow
}

export type ArcadeAxisPayload = {
  x: number
  y: number
}

export type ArcadeButtonPayload = {
  id: string
  label: string
  pressed: boolean
}
```

## 导出

```ts
export { default as VirtualArcadeController } from './VirtualArcadeController.vue'
export { default as ThreeJoystick } from '../components/ThreeJoystick.vue'
export { default as VirtualActionButton } from '../components/VirtualActionButton.vue'
export type {
  ArcadeAxisPayload,
  ArcadeButtonConfig,
  ArcadeButtonPayload,
  ArcadeViewMode,
  ButtonRow,
  JoystickDirection,
  JoystickKeyboardMapping,
} from './types'
```

## 注意事项

- 使用任意组件时，都需要引入 `zjj-virtual-arcade-controller/style.css`。
- `vue` 和 `three` 是 peer dependencies，需要由宿主项目安装。
- `VirtualActionButton` 只渲染 3D 按钮本体。按钮文字建议由业务侧自己排版，或直接使用 `VirtualArcadeController`。
- 当前包输出 Vue 3 组件和 ESM 产物。

## 本地开发

```bash
npm install
npm run dev
npm run build
```

本项目使用 Vite 8，需要 Node `20.19+` 或 `22.12+`。

项目文档：

- [VirtualArcadeController 组件文档](./docs/VirtualArcadeController.md)

## License

MIT
