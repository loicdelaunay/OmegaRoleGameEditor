import { useCallback, useRef, useState } from 'react'
import type { TerrainDocument, TerrainItem } from '../types/terrain'
import { sanitizeTerrainForPlayers, createDefaultTerrain } from '../lib/terrain'

const MAX_UNDO_STACK = 20

export interface CommitTerrainOptions {
  recordHistory?: boolean
  syncItemId?: string
  syncItemIds?: string[]
  flushSync?: boolean
  skipPlayerTerrain?: boolean
}

export interface UseTerrainOptions {
  /** WebSocket ref */
  wsRef: React.MutableRefObject<WebSocket | null>
  /** Role ref */
  roleRef: React.MutableRefObject<'host' | 'player' | null>
  /** Set player terrain (managed by parent) */
  setPlayerTerrain: (terrain: TerrainDocument) => void
  /** Set status message */
  setStatusMessage: (message: string) => void
}

export function useTerrain({
  wsRef,
  roleRef,
  setPlayerTerrain,
  setStatusMessage,
}: UseTerrainOptions) {
  const [terrain, setTerrain] = useState<TerrainDocument>(() => createDefaultTerrain())
  const terrainRef = useRef(terrain)
  terrainRef.current = terrain

  const terrainUndoStackRef = useRef<TerrainDocument[]>([])
  const continuousHistoryRef = useRef<{
    active: boolean
    captured: boolean
    snapshot: TerrainDocument | null
  }>({ active: false, captured: false, snapshot: null })

  const pendingTerrainSyncRef = useRef<TerrainDocument | null>(null)
  const terrainSyncTimeoutRef = useRef<number | null>(null)

  // --- Terrain sync (WebSocket) ---
  const flushTerrainSync = useCallback(() => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN || !pendingTerrainSyncRef.current) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'host:updateTerrain',
        terrain: pendingTerrainSyncRef.current,
      }),
    )
    pendingTerrainSyncRef.current = null
    if (terrainSyncTimeoutRef.current !== null) {
      window.clearTimeout(terrainSyncTimeoutRef.current)
      terrainSyncTimeoutRef.current = null
    }
  }, [wsRef, roleRef])

  const scheduleTerrainSync = useCallback((sanitizedTerrain: TerrainDocument, delay = 500) => {
    pendingTerrainSyncRef.current = sanitizedTerrain

    if (terrainSyncTimeoutRef.current !== null) {
      window.clearTimeout(terrainSyncTimeoutRef.current)
    }

    terrainSyncTimeoutRef.current = window.setTimeout(() => {
      flushTerrainSync()
    }, delay)
  }, [flushTerrainSync])

  const sendTerrainItemSync = useCallback((itemId: string, sanitizedTerrain: TerrainDocument) => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    const item = sanitizedTerrain.items.find((entry) => entry.id === itemId)

    wsRef.current.send(
      JSON.stringify(
        item
          ? { type: 'host:syncItem', item }
          : { type: 'host:removeItem', itemId },
      ),
    )
  }, [wsRef, roleRef])

  // --- Undo history ---
  const pushTerrainUndoSnapshot = useCallback((snapshot: TerrainDocument) => {
    // Strip heavy base64 data from undo snapshots to prevent OOM
    const lightweight: TerrainDocument = {
      ...snapshot,
      items: snapshot.items.map(item => ({
        ...item,
        src: item.generatedAsset ? item.src : `__undo_ref__${item.id}`,
      })),
      audio: snapshot.audio ? { name: snapshot.audio.name, src: '__undo_audio__' } : null,
      soundboard: snapshot.soundboard?.map(s => ({ ...s, src: `__undo_sb__${s.id}` })) ?? [],
    }
    terrainUndoStackRef.current = [...terrainUndoStackRef.current.slice(-(MAX_UNDO_STACK - 1)), lightweight]
  }, [])

  const beginContinuousTerrainHistory = useCallback(() => {
    continuousHistoryRef.current = {
      active: true,
      captured: false,
      snapshot: terrainRef.current,
    }
  }, [])

  const captureContinuousTerrainHistory = useCallback(() => {
    const state = continuousHistoryRef.current
    if (!state.active || state.captured || !state.snapshot || roleRef.current === 'player') {
      return
    }

    pushTerrainUndoSnapshot(state.snapshot)
    continuousHistoryRef.current = { ...state, captured: true }
  }, [pushTerrainUndoSnapshot, roleRef])

  const endContinuousTerrainHistory = useCallback(() => {
    continuousHistoryRef.current = { active: false, captured: false, snapshot: null }
  }, [])

  // --- Commit terrain (the core mutation function) ---
  const commitTerrain = useCallback((
    nextTerrain: TerrainDocument,
    options: CommitTerrainOptions = {},
  ) => {
    const currentTerrain = terrainRef.current
    const stampedTerrain = { ...nextTerrain, updatedAt: new Date().toISOString() }

    if (options.recordHistory !== false && roleRef.current !== 'player' && currentTerrain !== nextTerrain) {
      pushTerrainUndoSnapshot(currentTerrain)
    }

    terrainRef.current = stampedTerrain
    setTerrain(stampedTerrain)

    if (options.skipPlayerTerrain !== true && roleRef.current !== 'player') {
      const sanitizedTerrain = sanitizeTerrainForPlayers(stampedTerrain)
      setPlayerTerrain(sanitizedTerrain)

      if (roleRef.current === 'host' && wsRef.current?.readyState === WebSocket.OPEN) {
        const syncItemIds = options.syncItemIds ?? (options.syncItemId ? [options.syncItemId] : [])

        for (const itemId of new Set(syncItemIds)) {
          sendTerrainItemSync(itemId, sanitizedTerrain)
        }

        if (options.flushSync) {
          pendingTerrainSyncRef.current = sanitizedTerrain
          flushTerrainSync()
        } else {
          scheduleTerrainSync(sanitizedTerrain)
        }
      }
    } else if (roleRef.current === 'host' && wsRef.current?.readyState === WebSocket.OPEN) {
      const syncItemIds = options.syncItemIds ?? (options.syncItemId ? [options.syncItemId] : [])
      if (syncItemIds.length > 0) {
        for (const itemId of new Set(syncItemIds)) {
          const item = stampedTerrain.items.find((entry) => entry.id === itemId)
          if (item) {
            wsRef.current.send(JSON.stringify({ type: 'host:syncItem', item }))
          }
        }
      }
    }
  }, [pushTerrainUndoSnapshot, sendTerrainItemSync, flushTerrainSync, scheduleTerrainSync, setPlayerTerrain, wsRef, roleRef])

  const applyTerrain = useCallback((nextTerrain: TerrainDocument, options?: { flushSync?: boolean }) => {
    commitTerrain(nextTerrain, options)
  }, [commitTerrain])

  const updateTerrain = useCallback((
    updater: (current: TerrainDocument) => TerrainDocument,
    options?: CommitTerrainOptions,
  ) => {
    commitTerrain(updater(terrainRef.current), options)
  }, [commitTerrain])

  const runIfItemUnlocked = useCallback((
    itemId: string,
    updater: (current: TerrainDocument, item: TerrainItem) => TerrainDocument,
    options?: CommitTerrainOptions,
  ) => {
    updateTerrain((current) => {
      const item = current.items.find((entry) => entry.id === itemId)
      if (!item) return current
      if (item.locked) {
        setStatusMessage('Element verrouille.')
        return current
      }
      return updater(current, item)
    }, options)
  }, [updateTerrain, setStatusMessage])

  const updateItem = useCallback((
    itemId: string,
    patch: Partial<TerrainItem>,
    options?: { recordHistory?: boolean },
  ) => {
    runIfItemUnlocked(
      itemId,
      (current) => ({
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      }),
      { recordHistory: options?.recordHistory, syncItemId: itemId },
    )
  }, [runIfItemUnlocked])

  // --- Undo ---
  const undoTerrainChange = useCallback(() => {
    if (terrainUndoStackRef.current.length === 0) {
      setStatusMessage('Aucune action a annuler.')
      return
    }

    const lightweight = terrainUndoStackRef.current[terrainUndoStackRef.current.length - 1]
    terrainUndoStackRef.current = terrainUndoStackRef.current.slice(0, -1)

    // Restore heavy src data from current terrain into the lightweight undo snapshot
    const currentTerrain = terrainRef.current
    const currentItemMap = new Map(currentTerrain.items.map(item => [item.id, item]))
    const currentSbMap = new Map((currentTerrain.soundboard ?? []).map(s => [s.id, s]))

    const restoredTerrain: TerrainDocument = {
      ...lightweight,
      items: lightweight.items.map(item => {
        if (item.src.startsWith('__undo_ref__')) {
          const originalId = item.src.slice('__undo_ref__'.length)
          const currentItem = currentItemMap.get(originalId)
          return { ...item, src: currentItem?.src ?? '' }
        }
        return item
      }),
      audio: lightweight.audio?.src === '__undo_audio__'
        ? (currentTerrain.audio ? { ...lightweight.audio, src: currentTerrain.audio.src } : null)
        : lightweight.audio,
      soundboard: (lightweight.soundboard ?? []).map(s => {
        if (s.src.startsWith('__undo_sb__')) {
          const originalId = s.src.slice('__undo_sb__'.length)
          const currentSb = currentSbMap.get(originalId)
          return { ...s, src: currentSb?.src ?? '' }
        }
        return s
      }),
    }

    commitTerrain(restoredTerrain, { flushSync: true, recordHistory: false })
    setStatusMessage('Derniere action annulee.')
  }, [commitTerrain, setStatusMessage])

  // --- Clear sync timeout (for cleanup) ---
  const clearTerrainSyncTimeout = useCallback(() => {
    if (terrainSyncTimeoutRef.current !== null) {
      window.clearTimeout(terrainSyncTimeoutRef.current)
      terrainSyncTimeoutRef.current = null
    }
    pendingTerrainSyncRef.current = null
  }, [])

  return {
    terrain,
    setTerrain,
    terrainRef,
    terrainUndoStackRef,
    commitTerrain,
    applyTerrain,
    updateTerrain,
    runIfItemUnlocked,
    updateItem,
    pushTerrainUndoSnapshot,
    beginContinuousTerrainHistory,
    captureContinuousTerrainHistory,
    endContinuousTerrainHistory,
    undoTerrainChange,
    flushTerrainSync,
    scheduleTerrainSync,
    sendTerrainItemSync,
    clearTerrainSyncTimeout,
  }
}

export type UseTerrainReturn = ReturnType<typeof useTerrain>