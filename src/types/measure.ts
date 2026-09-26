export type MeasureOverlayState = {
  start: { x: number; y: number }
  end: { x: number; y: number } | null
} | null

export type SyncedMeasure = {
  id: string
  playerId: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  expiresAt: number
}
