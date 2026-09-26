export type StatusTone = 'info' | 'warning' | 'error'

export type StatusNotification = {
  id: string
  message: string
  tone: StatusTone
}
