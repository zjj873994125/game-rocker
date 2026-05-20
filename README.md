# Virtual Arcade Controller

一个基于 Vue 3 + Three.js 的虚拟街机控制器组件库，提供独立摇杆、独立按钮和组合控制器三层组件。

## 功能

- 3D 摇杆：支持鼠标、触摸和键盘方向键/WASD。
- 3D 动作按钮：支持鼠标、触摸和自定义键盘映射。
- 可配置按钮布局：通过 `buttons` 声明上排/下排按钮。
- 可配置主题色、摇杆尺寸、按钮尺寸、上排缩进和视角模式。
- 支持平面俯视和 45° 玩家视角两种渲染模式。
- 事件输出清晰：摇杆轴向变化、摇杆释放、按钮按下/释放。

## 本地开发

项目依赖 Vite 8，Node 版本需要 `20.19+` 或 `22.12+`。

```bash
npm install
npm run dev
npm run build
```

如果本机默认 Node 版本较低，可以先切到 Node 22：

```bash
nvm use 22
npm run build
```

## 安装后使用

组件发布到 npm 后，在 Vue 3 项目中安装：

```bash
npm install zjj-virtual-arcade-controller
```

在业务组件中引入主组件和样式：

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

const axis = ref<ArcadeAxisPayload>({ x: 0, y: 0 })
const pressed = ref<Record<string, boolean>>({})
const joystickKeyboardMapping: JoystickKeyboardMapping = {
  up: ['KeyT'],
  down: ['KeyG'],
  left: ['KeyF'],
  right: ['KeyH'],
}

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

`VirtualArcadeController` 是 npm 包的推荐主入口。`App.vue` 只是本仓库的 demo 页面，里面的页面标题、主题切换、`SELECT / START / COIN`、状态卡片和外层街机外壳不属于包 API。

## 分层导入

这个包按三层组件导出：

| 组件 | 适用场景 |
| --- | --- |
| `ThreeJoystick` | 只需要一个独立 3D 摇杆，业务侧自己排版按钮或其他 UI。 |
| `VirtualActionButton` | 只需要一个独立 3D 按钮，或想自己组合多个按钮。 |
| `VirtualArcadeController` | 快速接入完整控制器内核：1 个摇杆、方向箭头、8 个动作按钮和按钮标签。 |

白色底盘、螺丝、街机外壳、顶部 `SELECT / START / COIN` 仍属于 demo 外观，不在这三个基础组件内。后续如果需要开箱即用的完整面板，可以新增更高层的 `ArcadeControlPanel`。

单独使用摇杆：

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

单独使用按钮：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VirtualActionButton } from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'

const pressed = ref(false)
</script>

<template>
  <div class="action-button-field">
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

## 基础用法

当前还没有发布到 npm，可以在项目内直接从 `src/lib` 引入：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  VirtualArcadeController,
  type ArcadeAxisPayload,
  type ArcadeButtonConfig,
  type ArcadeButtonPayload,
} from './lib'

const buttons: ArcadeButtonConfig[] = [
  { id: 'x', label: 'X', keyBinding: 'KeyU', row: 'top' },
  { id: 'y', label: 'Y', keyBinding: 'KeyI', row: 'top' },
  { id: 'rb', label: 'RB', keyBinding: 'KeyE', row: 'top' },
  { id: 'lb', label: 'LB', keyBinding: 'KeyQ', row: 'top' },
  { id: 'a', label: 'A', keyBinding: 'KeyJ', row: 'bottom' },
  { id: 'b', label: 'B', keyBinding: 'KeyK', row: 'bottom' },
  { id: 'rt', label: 'RT', keyBinding: 'KeyZ', row: 'bottom' },
  { id: 'lt', label: 'LT', keyBinding: 'KeyC', row: 'bottom' },
]

const axis = ref({ x: 0, y: 0 })
const pressed = ref<Record<string, boolean>>({})

function onAxisChange(payload: ArcadeAxisPayload) {
  axis.value = payload
}

function onButtonChange(payload: ArcadeButtonPayload) {
  pressed.value[payload.id] = payload.pressed
}
</script>

<template>
  <VirtualArcadeController
    :buttons="buttons"
    color="#eb1f2f"
    view-mode="flat"
    :joystick-size="182"
    :button-size="82"
    :top-offset="14"
    @axis-change="onAxisChange"
    @axis-end="axis = { x: 0, y: 0 }"
    @button-change="onButtonChange"
  />
</template>
```

发布成 npm 包后，宿主项目需要同时引入组件样式：

```ts
import { VirtualArcadeController } from 'zjj-virtual-arcade-controller'
import 'zjj-virtual-arcade-controller/style.css'
```

`style.css` 包含摇杆方向箭头、动作按钮、按钮标签、两排按钮布局和响应式排列。没有引入这个文件时，组件仍然可以渲染，但外部项目会丢失核心布局和拟真外观。

## 组件文档

`VirtualArcadeController` 是后续 npm 包的核心组件，只负责白色控制面板里的摇杆、方向箭头、动作按钮和按钮标签。

更完整的组件边界、props、events、slots 和按钮配置说明见：

- [VirtualArcadeController 组件文档](./docs/VirtualArcadeController.md)

`App.vue` 里的页面标题、主题切换、`SELECT / START / COIN`、状态卡片和外层街机外壳属于 demo 示例，不建议作为第一阶段核心组件 API。

## 组件 API

### `VirtualArcadeController`

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `buttons` | `ArcadeButtonConfig[]` | 8 个默认街机按钮 | 动作按钮配置。 |
| `color` | `string` | `#eb1f2f` | 摇杆头和按钮主题色。 |
| `arrowColor` | `string` | 跟随 `color` | 摇杆方向箭头颜色。 |
| `joystickKeyboardMapping` | `JoystickKeyboardMapping` | 方向键 + WASD | 摇杆键盘方向映射。 |
| `viewMode` | `'flat' \| 'angled'` | `flat` | 渲染视角。`flat` 为平面俯视，`angled` 为 45° 玩家视角。 |
| `joystickSize` | `number` | `182` | 摇杆画布尺寸。 |
| `buttonSize` | `number` | `82` | 单个按钮画布尺寸。 |
| `topOffset` | `number` | `14` | 上排按钮和标签的整体缩进。 |
| `showLabels` | `boolean` | `true` | 是否显示按钮标签。 |

### 事件

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `axis-change` | `{ x: number; y: number }` | 摇杆移动时触发。 |
| `axis-end` | 无 | 摇杆释放回中时触发。 |
| `button-change` | `{ id: string; label: string; pressed: boolean }` | 任意按钮按下或释放时触发。 |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| `joystick` | 渲染在摇杆区域内，可用于放玩家编号、装饰文字或提示。 |

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

## 导出入口

当前导出集中在 `src/lib/index.ts`：

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

建议业务项目优先使用 `VirtualArcadeController`。`ThreeJoystick` 和 `VirtualActionButton` 是底层组件，适合需要自定义布局时单独使用。

## 后续 npm 包化建议

完整执行清单见：

- [npm 包化步骤清单](./docs/npm-package-roadmap.md)

1. 增加 Vite library mode，例如输出 `dist/index.mjs` 和 `dist/style.css`。
2. 把 `vue` 和 `three` 调整为 `peerDependencies`，避免宿主项目重复安装运行时。
3. 增加 `types`、`exports`、`files` 字段。
4. 补充组件测试或最小 playground，避免后续改动破坏事件和布局。
5. 发布前确认包名、README 截图、license 和版本策略。

## 注意事项

- 宿主项目需要安装 `vue` 和 `three`，它们是 peer dependencies，不会被内联进组件包。
- 使用任意导出组件时都需要引入 `zjj-virtual-arcade-controller/style.css`。
- `VirtualActionButton` 只渲染 3D 按钮本体，按钮文字建议由业务侧或 `VirtualArcadeController` 的标签区域承载。
- 白色底盘、螺丝、街机外壳和 `SELECT / START / COIN` 仍属于 demo 外观，不在当前基础组件 API 内。

## License

MIT
