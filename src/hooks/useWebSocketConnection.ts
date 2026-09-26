import { useCallback, useRef } from 'react'
import { getMapPoint } from '../lib/math'
import { generateClientId } from '../lib/terrain'
import type { SyncedMeasure } from '../types/measure'

export interface UseWebSocketConnectionOptions {
  /** WebSocket ref (managed by parent) */
  wsRef: React.MutableRefObject<WebSocket | null>
  /** Role ref (managed by parent) */
  roleRef: React.MutableRefObject<'host' | 'player' | null>
  /** Returns the current role */
  getRole: () => 'host' | 'player' | null
  /** Returns the current player id (for measure attribution) */
  getPlayerId: () => string | null
  /** Returns the editor stage element */
  getEditorStage: () => HTMLDivElement | null
  /** Returns the player stage element */
  getPlayerStage: () => HTMLDivElement | null
  /** Returns the editor terrain */
  getEditorTerrain: () => { width: number; height: number } | null
  /** Returns the player terrain */
  getPlayerTerrain: () => { width: number; height: number } | null
  /** Returns the editor zoom value */
  getEditorZoom: () => number
  /** Push a measure to local state (for immediate display) */
  pushSyncedMeasure: (measure: SyncedMeasure) => void
}

const CURSOR_THROTTLE_MS = 40
const MEASURE_THROTTLE_MS = 40

export function useWebSocketConnection({
  wsRef,
  roleRef,
  getRole,
  getPlayerId,
  getEditorStage,
  getPlayerStage,
  getEditorTerrain,
  getPlayerTerrain,
  getEditorZoom,
  pushSyncedMeasure,
}: UseWebSocketConnectionOptions) {
  const lastCursorSentAtRef = useRef(0)
  const lastMeasureSentAtRef = useRef(0)

  /** Generic send helper */
  const send = useCallback((payload: Record<string, unknown>): boolean => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }
    socket.send(JSON.stringify(payload))
    return true
  }, [wsRef])

  /** Send cursor position (throttled to 25fps) */
  const sendSessionCursor = useCallback((clientX: number, clientY: number) => {
    const role = getRole()
    if (!role) return
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const now = Date.now()
    if (now - lastCursorSentAtRef.current < CURSOR_THROTTLE_MS) return

    const stage = role === 'player' ? getPlayerStage() : getEditorStage()
    const currentTerrain = role === 'player' ? getPlayerTerrain() : getEditorTerrain()
    if (!stage || !currentTerrain) return

    const point = getMapPoint(stage, currentTerrain.width, currentTerrain.height, clientX, clientY)
    socket.send(
      JSON.stringify({
        type: role === 'host' ? 'host:cursor' : 'player:cursor',
        x: point.x,
        y: point.y,
        zoom: role === 'host' ? getEditorZoom() : undefined,
      }),
    )
    lastCursorSentAtRef.current = now
  }, [getRole, getPlayerStage, getEditorStage, getPlayerTerrain, getEditorTerrain, getEditorZoom, wsRef])

  /** Send a ping (map click) */
  const sendSessionPing = useCallback((clientX: number, clientY: number) => {
    const role = getRole()
    if (!role) return
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const stage = role === 'player' ? getPlayerStage() : getEditorStage()
    const currentTerrain = role === 'player' ? getPlayerTerrain() : getEditorTerrain()
    if (!stage || !currentTerrain) return

    const point = getMapPoint(stage, currentTerrain.width, currentTerrain.height, clientX, clientY)
    socket.send(
      JSON.stringify({
        type: role === 'host' ? 'host:ping' : 'player:ping',
        x: point.x,
        y: point.y,
      }),
    )
  }, [getRole, getPlayerStage, getEditorStage, getPlayerTerrain, getEditorTerrain, wsRef])

  /** Send a measure update (throttled) */
  const sendMeasureUpdate = useCallback((
    start: { x: number; y: number },
    end: { x: number; y: number },
    options?: { id?: string; pushLocal?: boolean; force?: boolean },
  ) => {
    const role = getRole()
    const playerIdToUse = role === 'host' ? 'host' : getPlayerId()
    const measure: SyncedMeasure = {
      id: options?.id ?? generateClientId(),
      playerId: playerIdToUse ?? 'local',
      start,
      end,
      expiresAt: Date.now() + 3000,
    }

    if (options?.pushLocal) {
      pushSyncedMeasure(measure)
    }

    const socket = wsRef.current
    if (!role || !socket || socket.readyState !== WebSocket.OPEN) return

    const now = Date.now()
    if (!options?.force && now - lastMeasureSentAtRef.current < MEASURE_THROTTLE_MS) return

    socket.send(
      JSON.stringify({
        type: role === 'host' ? 'host:measure' : 'player:measure',
        measure,
      }),
    )
    lastMeasureSentAtRef.current = now
  }, [getRole, getPlayerId, pushSyncedMeasure, wsRef])

  /** Send a turn tracker command */
  const sendTurnTrackerCommand = useCallback((payload: Record<string, unknown>): boolean => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false

    const role = roleRef.current
    if (role !== 'host') {
      if (payload.action === 'togglePoint') {
        socket.send(
          JSON.stringify({
            type: 'player:toggleTurnTrackerPoint',
            ...payload,
          }),
        )
        return true
      }
      return false
    }

    socket.send(
      JSON.stringify({
        type: 'host:updateTurnTracker',
        ...payload,
      }),
    )
    return true
  }, [wsRef, roleRef])

  return {
    send,
    sendSessionCursor,
    sendSessionPing,
    sendMeasureUpdate,
    sendTurnTrackerCommand,
  }
}

export type UseWebSocketConnectionReturn = ReturnType<typeof useWebSocketConnection>