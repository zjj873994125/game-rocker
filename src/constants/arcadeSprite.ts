export type ThemeKey = 'red' | 'black' | 'blue' | 'white' | 'yellow'

export const SPRITE_SIZE = {
  width: 1536,
  height: 1024,
} as const

export const JOYSTICK_HEAD = {
  width: 118,
  height: 118,
  top: 13,
} as const

export const JOYSTICK_SHAFT = {
  width: 34,
  height: 152,
  left: 306,
  top: 165,
} as const

export const ACTION_BUTTON = {
  width: 134,
  height: 133,
  upTop: 687,
  downTop: 848,
} as const

export const THEME_MAP: Record<
  ThemeKey,
  {
    name: string
    preview: string
    joystickLeft: number
    buttonLeft: number
  }
> = {
  red: { name: '红', preview: '#eb1f2f', joystickLeft: 264, buttonLeft: 254 },
  black: { name: '黑', preview: '#14161b', joystickLeft: 485, buttonLeft: 918 },
  blue: { name: '蓝', preview: '#1d6ef1', joystickLeft: 708, buttonLeft: 476 },
  white: { name: '白', preview: '#f0f0f0', joystickLeft: 925, buttonLeft: 698 },
  yellow: { name: '黄', preview: '#f0bb00', joystickLeft: 1144, buttonLeft: 1136 },
}
