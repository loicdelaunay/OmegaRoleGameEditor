import { DEFAULT_LOCKED_TOKEN_ZOOM, DEFAULT_FLASHLIGHT_DISTANCE, DEFAULT_FLASHLIGHT_OPACITY, FLASHLIGHT_CONE_ANGLE_DEGREES } from './constants'
import { clamp } from './math'
import type { TokenAssignment, TurnTrackerEntry, TerrainItem } from '../types/terrain'

export function buildPlayerViewPolicies(
  tokenAssignments: Record<string, TokenAssignment>,
  currentTurnEntry?: TurnTrackerEntry | null,
  terrainItems?: TerrainItem[]
) {
  let activePlayerTokenId: string | null = null
  if (currentTurnEntry?.kind === 'player') {
    const activePlayerId = currentTurnEntry.playerId
    const assignmentEntry = Object.entries(tokenAssignments).find(([_, a]) => a.playerId === activePlayerId)
    if (assignmentEntry) {
      activePlayerTokenId = assignmentEntry[0]
    }
  } else if (currentTurnEntry?.kind === 'custom' && terrainItems) {
    const matchingItem = terrainItems.find(i => i.kind === 'token' && i.name === currentTurnEntry.label)
    if (matchingItem) {
      activePlayerTokenId = matchingItem.id
    }
  }

  return Object.entries(tokenAssignments).map(([tokenId, assignment]) => {
    let resolvedTokenId = tokenId
    let resolvedMode = assignment.mode

    if (assignment.mode === 'follow-turn') {
      if (activePlayerTokenId) {
        resolvedTokenId = activePlayerTokenId
        resolvedMode = 'locked-token'
      } else {
        resolvedMode = 'free'
      }
    }

    return {
      playerId: assignment.playerId,
      tokenId: resolvedTokenId,
      mode: resolvedMode,
      fixedZoom: DEFAULT_LOCKED_TOKEN_ZOOM,
      lockedViewSize: assignment.lockedViewSize,
      lockVisibleArea: assignment.lockVisibleArea,
      nightModeEnabled: assignment.nightModeEnabled === true,
      flashlightEnabled: assignment.flashlightEnabled === true,
      flashlightDistance: assignment.flashlightDistance || DEFAULT_FLASHLIGHT_DISTANCE,
      flashlightOpacity: clamp(assignment.flashlightOpacity || DEFAULT_FLASHLIGHT_OPACITY, 0, 1),
      flashlightAngle: clamp(assignment.flashlightAngle || FLASHLIGHT_CONE_ANGLE_DEGREES, 10, 180),
      ...(assignment.characterFileName ? { characterFileName: assignment.characterFileName } : {}),
      ...(assignment.characterData ? { characterData: assignment.characterData } : {}),
    }
  })
}
