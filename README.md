# Virtual Arcade Controller

一个基于 Vue 3 + Three.js 的虚拟街机控制器组件。当前项目仍处于组件抽离阶段，已经提供可复用的 `VirtualArcadeController`，后续可以继续整理为 npm 包。

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
export type { ArcadeAxisPayload, ArcadeButtonConfig, ArcadeButtonPayload, ButtonRow } from './types'
```

建议业务项目优先使用 `VirtualArcadeController`。`ThreeJoystick` 和 `VirtualActionButton` 是底层组件，适合需要自定义布局时单独使用。

## 后续 npm 包化建议

1. 增加 Vite library mode，例如输出 `dist/index.mjs` 和 `dist/style.css`。
2. 把 `vue` 和 `three` 调整为 `peerDependencies`，避免宿主项目重复安装运行时。
3. 增加 `types`、`exports`、`files` 字段。
4. 补充组件测试或最小 playground，避免后续改动破坏事件和布局。
5. 发布前确认包名、README 截图、license 和版本策略。
