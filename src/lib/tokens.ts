import { DEFAULT_LOCKED_TOKEN_ZOOM, DEFAULT_LOCKED_VIEW_SIZE, DEFAULT_FLASHLIGHT_DISTANCE, DEFAULT_FLASHLIGHT_OPACITY, FLASHLIGHT_CONE_ANGLE_DEGREES } from './constants'
import type { TokenAssignment } from '../types/terrain'

export function getOrCreateTokenAssignment(current: TokenAssignment | null): TokenAssignment {
  return current || {
    playerId: '',
    mode: 'free',
    fixedZoom: DEFAULT_LOCKED_TOKEN_ZOOM,
    lockedViewSize: DEFAULT_LOCKED_VIEW_SIZE,
    lockVisibleArea: false,
    nightModeEnabled: false,
    flashlightEnabled: false,
    flashlightDistance: DEFAULT_FLASHLIGHT_DISTANCE,
    flashlightOpacity: DEFAULT_FLASHLIGHT_OPACITY,
    flashlightAngle: FLASHLIGHT_CONE_ANGLE_DEGREES,
  }
}
