export type ButtonRow = 'top' | 'bottom'

/** 控制器视角模式：flat 是正俯视，angled 是模拟玩家视角的 45° 俯视。 */
export type ArcadeViewMode = 'flat' | 'angled'

/**
 * 单个动作按钮的声明式配置。
 *
 * 组件只关心按钮的身份、展示文案、键盘映射和所在行；业务侧可以用 id
 * 去映射游戏动作，例如 jump、shoot、dash，而不需要依赖展示用的 label。
 */
export type ArcadeButtonConfig = {
  /** 业务唯一标识，buttonChange 事件会原样返回。 */
  id: string
  /** 显示在按钮上方或下方的标签。 */
  label: string
  /** 可选键盘绑定，支持单个 code 或多个 code，例如 KeyJ、['KeyJ', 'Space']。 */
  keyBinding?: string | string[]
  /** 按钮所在行；未传时默认归到底排，方便只配置主动作按钮。 */
  row?: ButtonRow
}

/** 摇杆轴向变化事件载荷，单位是组件内部的像素偏移值。 */
export type ArcadeAxisPayload = {
  x: number
  y: number
}

/** 按钮按下/释放事件载荷。 */
export type ArcadeButtonPayload = {
  id: string
  label: string
  pressed: boolean
}
