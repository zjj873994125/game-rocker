<script setup lang="ts">
import { computed } from 'vue'
import ThreeJoystick from '../components/ThreeJoystick.vue'
import VirtualActionButton from '../components/VirtualActionButton.vue'
import type { ArcadeAxisPayload, ArcadeButtonConfig, ArcadeButtonPayload, ArcadeViewMode } from './types'

// 这个组件是后续 npm 包的主要入口：把底层 3D 摇杆和 3D 按钮组合成一个可配置控制器。
// App.vue 只作为示例页面使用它，业务项目也应该优先接入这个组件，而不是直接拼底层部件。
const props = withDefaults(
  defineProps<{
    /** 动作按钮配置；通过 row 决定上下两排，通过 id 承载业务语义。 */
    buttons?: ArcadeButtonConfig[]
    /** 摇杆头和按钮的主题色。 */
    color?: string
    /** 方向箭头颜色；默认跟随主题色。 */
    arrowColor?: string
    /** 3D 渲染视角；flat 为平面俯视，angled 为 45° 玩家视角。 */
    viewMode?: ArcadeViewMode
    /** 摇杆画布尺寸。 */
    joystickSize?: number
    /** 单个按钮画布尺寸。 */
    buttonSize?: number
    /** 上排按钮相对下排的缩进，用来模拟街机面板的错位排布。 */
    topOffset?: number
    /** 是否渲染按钮标签；禁用后可由外部自行排版标签。 */
    showLabels?: boolean
  }>(),
  {
    buttons: () => [
      { id: 'x', label: 'X', keyBinding: 'KeyU', row: 'top' },
      { id: 'y', label: 'Y', keyBinding: 'KeyI', row: 'top' },
      { id: 'rb', label: 'RB', keyBinding: 'KeyE', row: 'top' },
      { id: 'lb', label: 'LB', keyBinding: 'KeyQ', row: 'top' },
      { id: 'a', label: 'A', keyBinding: 'KeyJ', row: 'bottom' },
      { id: 'b', label: 'B', keyBinding: 'KeyK', row: 'bottom' },
      { id: 'rt', label: 'RT', keyBinding: 'KeyZ', row: 'bottom' },
      { id: 'lt', label: 'LT', keyBinding: 'KeyC', row: 'bottom' },
    ],
    color: '#eb1f2f',
    arrowColor: undefined,
    viewMode: 'flat',
    joystickSize: 182,
    buttonSize: 82,
    topOffset: 14,
    showLabels: true,
  },
)

const emit = defineEmits<{
  /** 摇杆移动时触发，x/y 为当前偏移值。 */
  axisChange: [payload: ArcadeAxisPayload]
  /** 摇杆释放回中时触发。 */
  axisEnd: []
  /** 任意按钮按下或释放时触发。 */
  buttonChange: [payload: ArcadeButtonPayload]
}>()

// 拆成上下两排是为了让布局只由配置驱动；调用方调整按钮顺序时不需要改模板。
const topButtons = computed(() => props.buttons.filter((button) => (button.row ?? 'bottom') === 'top'))
const bottomButtons = computed(() => props.buttons.filter((button) => (button.row ?? 'bottom') === 'bottom'))
const resolvedArrowColor = computed(() => props.arrowColor ?? props.color)

function onMove(x: number, y: number) {
  emit('axisChange', { x, y })
}

function onButtonChange(button: ArcadeButtonConfig, pressed: boolean) {
  // label 只用于显示，但一起返回可以让调试面板或日志不必再查配置表。
  emit('buttonChange', {
    id: button.id,
    label: button.label,
    pressed,
  })
}
</script>

<template>
  <div
    class="virtual-arcade-controller"
    :style="{
      // CSS 变量让上排缩进可以由 props 控制，同时保持响应式样式留在 CSS 中。
      '--top-offset': `${topOffset}px`,
    }"
  >
    <div class="virtual-arcade-controller__joystick">
      <ThreeJoystick
        :size="joystickSize"
        :color="color"
        :arrow-color="resolvedArrowColor"
        :view-mode="viewMode"
        @move="onMove"
        @end="emit('axisEnd')"
      />
      <!-- 预留插槽给业务侧放玩家编号、装饰或提示，不污染控制器内部 API。 -->
      <slot name="joystick" />
    </div>

    <div class="virtual-arcade-controller__buttons">
      <div v-if="showLabels" class="button-label-row button-row--top">
        <small v-for="button in topButtons" :key="button.id">{{ button.label }}</small>
      </div>

      <div class="button-row button-row--top">
        <div v-for="button in topButtons" :key="button.id" class="btn-cell">
          <VirtualActionButton
            :label="''"
            :size="buttonSize"
            :color="color"
            :view-mode="viewMode"
            :key-binding="button.keyBinding"
            @press="onButtonChange(button, true)"
            @release="onButtonChange(button, false)"
          />
        </div>
      </div>

      <div class="button-row button-row--bottom">
        <div v-for="button in bottomButtons" :key="button.id" class="btn-cell">
          <VirtualActionButton
            :label="''"
            :size="buttonSize"
            :color="color"
            :view-mode="viewMode"
            :key-binding="button.keyBinding"
            @press="onButtonChange(button, true)"
            @release="onButtonChange(button, false)"
          />
        </div>
      </div>

      <div v-if="showLabels" class="button-label-row button-label-row--bottom">
        <small v-for="button in bottomButtons" :key="button.id">{{ button.label }}</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-arcade-controller {
  --top-offset: 14px;

  display: flex;
  align-items: center;
  gap: 28px;
  width: 100%;
}

.virtual-arcade-controller__joystick {
  flex: 1;
  min-width: 310px;
  display: grid;
  place-items: center;
  position: relative;
}

.virtual-arcade-controller__buttons {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.button-row,
.button-label-row {
  display: grid;
  grid-template-columns: repeat(4, 92px);
  justify-content: start;
}

.button-row--top {
  margin-left: var(--top-offset);
}

.button-row--bottom,
.button-label-row--bottom {
  margin-top: 4px;
}

.btn-cell {
  display: grid;
  place-items: center;
  width: 92px;
}

.button-label-row small {
  position: relative;
  z-index: 2;
  width: 64px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  border-radius: 6px;
  background: linear-gradient(180deg, #424852, #181d26 72%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  color: #f4f7fe;
  font: 700 24px/1 'Avenir Next', sans-serif;
}

.btn-cell .action-btn {
  z-index: 1;
}

@media (max-width: 1080px) {
  .virtual-arcade-controller {
    flex-direction: column;
  }

  .button-row,
  .button-label-row {
    grid-template-columns: repeat(4, 88px);
  }
}

@media (max-width: 900px) {
  .button-row,
  .button-label-row {
    grid-template-columns: repeat(2, 96px);
    justify-content: center;
  }

  .btn-cell {
    width: 96px;
  }
}
</style>
