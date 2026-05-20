# VirtualArcadeController 组件文档

`VirtualArcadeController` 是这个项目后续 npm 包的核心组件。它只负责白色控制面板里的内容：左侧虚拟摇杆、方向箭头、右侧动作按钮和按钮标签。

页面标题、主题切换、`SELECT / START / COIN`、状态卡片、外层街机外壳都属于示例页面，不属于这个组件的核心职责。

## 适用场景

适合需要在 Vue 3 项目中快速嵌入虚拟街机控制器的场景，例如网页小游戏、操作面板、触屏控制器或按键测试工具。

组件内部已经处理了这些能力：

- 摇杆鼠标和触摸拖动。
- 摇杆键盘控制，默认支持方向键和 WASD。
- 动作按钮鼠标、触摸和键盘触发。
- 平面俯视和 2.5D 玩家视角切换。
- 方向箭头随摇杆方向变亮。
- 按钮按上下两排声明式布局。
- 向外输出轴向和按钮事件，不绑定具体游戏逻辑。

## 基础用法

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

const axis = ref<ArcadeAxisPayload>({ x: 0, y: 0 })
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
    arrow-color="#eb1f2f"
    view-mode="angled"
    :joystick-size="182"
    :button-size="82"
    :top-offset="14"
    @axis-change="onAxisChange"
    @axis-end="axis = { x: 0, y: 0 }"
    @button-change="onButtonChange"
  />
</template>
```

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `buttons` | `ArcadeButtonConfig[]` | 默认 8 个动作按钮 | 动作按钮声明。通过 `row` 决定上排或下排。 |
| `color` | `string` | `#eb1f2f` | 摇杆头和动作按钮的主题色。 |
| `arrowColor` | `string` | 跟随 `color` | 摇杆四方向箭头颜色。 |
| `viewMode` | `'flat' \| 'angled'` | `flat` | 控制摇杆和按钮的渲染视角。`flat` 是平面俯视，`angled` 是 2.5D 玩家视角。 |
| `joystickSize` | `number` | `182` | 摇杆 Three.js 画布尺寸，单位 px。 |
| `buttonSize` | `number` | `82` | 单个动作按钮 Three.js 画布尺寸，单位 px。 |
| `topOffset` | `number` | `14` | 上排按钮和上排标签相对下排的水平缩进，单位 px。 |
| `showLabels` | `boolean` | `true` | 是否显示动作按钮标签。 |

## Events

| 事件 | 载荷 | 触发时机 |
| --- | --- | --- |
| `axis-change` | `{ x: number; y: number }` | 摇杆位置变化时触发。 |
| `axis-end` | 无 | 鼠标、触摸或键盘释放后，摇杆回中时触发。 |
| `button-change` | `{ id: string; label: string; pressed: boolean }` | 任意动作按钮按下或释放时触发。 |

`axis-change` 的 `x/y` 是组件内部的像素偏移值。默认尺寸下最大值约为 `joystickSize * 0.33`。业务侧如果需要标准化数值，可以自行转换为 `-1` 到 `1`。

```ts
function normalizeAxis(value: number, joystickSize = 182) {
  return value / Math.round(joystickSize * 0.33)
}
```

## Slots

| 插槽 | 说明 |
| --- | --- |
| `joystick` | 渲染在摇杆区域外层，可用于放玩家编号、装饰文字或状态提示。 |

这个插槽不会影响摇杆自身事件。需要注意的是，插槽内容如果覆盖在摇杆上方，业务侧应自行处理 `pointer-events`。

## 按钮配置

`buttons` 是组件最重要的配置。组件只关心按钮身份、标签、键盘映射和所在行，不关心具体业务动作。

```ts
export type ArcadeButtonConfig = {
  id: string
  label: string
  keyBinding?: string | string[]
  row?: 'top' | 'bottom'
}
```

建议用 `id` 表示业务语义，用 `label` 表示显示文案：

```ts
const buttons: ArcadeButtonConfig[] = [
  { id: 'jump', label: 'A', keyBinding: ['KeyJ', 'Space'], row: 'bottom' },
  { id: 'attack', label: 'B', keyBinding: 'KeyK', row: 'bottom' },
  { id: 'dash', label: 'X', keyBinding: 'KeyU', row: 'top' },
]
```

事件里会同时返回 `id` 和 `label`：

```ts
function onButtonChange(payload: ArcadeButtonPayload) {
  if (payload.id === 'jump' && payload.pressed) {
    // 执行业务动作
  }
}
```

## 视角模式

`viewMode` 控制摇杆和动作按钮的 Three.js 相机：

- `flat`：平面俯视，适合更清晰的工具面板。
- `angled`：2.5D 玩家视角，更像真实操作台。

方向箭头是 CSS 层，不在 Three.js canvas 内，不会随 `viewMode` 产生透视变化。

## 组件边界

`VirtualArcadeController` 应该只包含控制器本体。下面这些内容建议继续放在业务页面或 demo 里：

- 页面标题和说明文案。
- 主题颜色切换器。
- 平面 / 2.5D 切换按钮。
- `SELECT / START / COIN` 这类整机功能键。
- 轴向和按键状态展示卡片。
- 外层街机外壳、白色面板、螺丝、背景装饰。

如果后续确实需要把 `SELECT / START / COIN` 放进 npm 包，建议另做可选的 `utilityButtons` 配置，而不是混进 `buttons`。这样动作按钮和功能键的语义不会混乱。

## 底层组件

包内还导出了底层组件：

- `ThreeJoystick`：单独的 3D 摇杆。
- `VirtualActionButton`：单独的 3D 动作按钮。

业务项目通常优先使用 `VirtualArcadeController`。只有在需要完全自定义布局时，才建议直接使用底层组件。

## 当前未组件化的配置

以下能力现在还没有作为 `VirtualArcadeController` 的公开 prop：

- 摇杆方向键映射。底层 `ThreeJoystick` 已支持，但主组件暂未透出。
- 摇杆和按钮之间的间距。
- 按钮列宽、行距和响应式断点。
- 面板背景、外壳样式和螺丝装饰。
- 功能键配置，例如 `SELECT / START / COIN`。

这些配置不是第一阶段 npm 包化的必要项。建议先保持组件 API 小而稳定，等真实接入场景出现后再扩展。
