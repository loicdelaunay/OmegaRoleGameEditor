export type ThemeMode = 'light' | 'dark' | 'auto'

export type DragState = {
  itemOffsets: {
    itemId: string
    offsetX: number
    offsetY: number
  }[]
} | null

export type ResizeState = {
  itemId: string
  handle: import('./terrain').ResizeHandle
  startWidth: number
  startHeight: number
  flipX: boolean
  flipY: boolean
  parentTransform: import('./terrain').ResolvedItem
  itemTransform: import('./terrain').ResolvedItem
} | null

export type RotationHoldState = {
  itemId: string
  pointerId: number
  startRotation: number
  startPointerAngle: number
  centerX: number
  centerY: number
} | null

export type PanState = {
  targetView: 'editor' | 'player'
  pointerX: number
  pointerY: number
  startScrollLeft: number
  startScrollTop: number
} | null

export type PanelResizeState = {
  startX: number
  startWidth: number
} | null
