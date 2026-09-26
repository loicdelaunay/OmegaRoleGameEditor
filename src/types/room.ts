import type { PlayerViewMode } from './terrain'
import type { CharacterDocument } from '../lib/character'

export type PlayerViewPolicy = {
  tokenId: string | null
  mode: PlayerViewMode
  fixedZoom: number
  lockedViewSize: number
  lockVisibleArea: boolean
  nightModeEnabled: boolean
  flashlightEnabled: boolean
  flashlightDistance: number
  flashlightOpacity: number
  flashlightAngle: number
  characterFileName?: string
  characterData?: CharacterDocument
} | null

export type AssignablePlayerOption = {
  id: string
  name: string
  color: string
  connectedPlayerId: string | null
}
