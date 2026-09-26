import { DEFAULT_PLAYER_COLOR } from './constants'
import { normalizePaletteColor } from './terrain'
import type { RoomJoinConfig, PredeclaredPlayer } from '../types/terrain'

export function normalizeRoomJoinConfigMessage(value: unknown): RoomJoinConfig {
  if (!value || typeof value !== 'object') {
    return { preallocationEnabled: false, predeclaredPlayers: [] }
  }

  const nextValue = value as {
    preallocationEnabled?: unknown
    predeclaredPlayers?: unknown[]
    playerRegistry?: {
      preallocationEnabled?: unknown
      predeclaredPlayers?: unknown[]
    }
  }
  const source = nextValue.playerRegistry ?? nextValue
  const predeclaredPlayers = Array.isArray(source.predeclaredPlayers)
    ? source.predeclaredPlayers.reduce<PredeclaredPlayer[]>((result, player) => {
      if (!player || typeof player !== 'object') {
        return result
      }

      const nextPlayer = player as Record<string, unknown>
      const id = String(nextPlayer.id ?? '').trim()
      const name = String(nextPlayer.name ?? '').trim().slice(0, 24)
      if (!id || !name) {
        return result
      }

      result.push({
        id,
        name,
        color: normalizePaletteColor(String(nextPlayer.color ?? DEFAULT_PLAYER_COLOR)),
        connectedPlayerId: String(nextPlayer.connectedPlayerId ?? '').trim() || null,
      })
      return result
    }, [])
    : []

  return {
    preallocationEnabled: source.preallocationEnabled === true,
    predeclaredPlayers,
  }
}

export function buildJoinConfigUrl(serverUrl: string, roomId: string) {
  try {
    const nextUrl = new URL(serverUrl)
    const nextPath = `/api/rooms/${encodeURIComponent(roomId)}/join-config`

    if (typeof window !== 'undefined') {
      const browserUrl = new URL(window.location.origin)
      const targetHostMatchesBrowser = browserUrl.hostname === nextUrl.hostname
      const targetUsesLocalHttp = nextUrl.protocol === 'ws:' || nextUrl.protocol === 'wss:'

      if (import.meta.env.DEV && targetUsesLocalHttp && targetHostMatchesBrowser) {
        return nextPath
      }
    }

    nextUrl.protocol = nextUrl.protocol === 'wss:' ? 'https:' : 'http:'
    nextUrl.pathname = nextPath
    nextUrl.search = ''
    nextUrl.hash = ''
    return nextUrl.toString()
  } catch {
    return null
  }
}
