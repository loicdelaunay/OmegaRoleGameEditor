import { useCallback, useEffect, useState } from 'react'
import type { SharedTimer, SharedTimerMode } from '../types/terrain'
import { MAX_SHARED_TIMERS } from '../lib/constants'

export type SendFn = (data: string) => void
export type SetStatusFn = (message: string) => void

export interface UseSharedTimersOptions {
  /** Returns the current WebSocket ref (or null) — used to send timer commands */
  getSocket: () => WebSocket | null
  /** Returns the current role ('host' | 'player' | null) */
  getRole: () => 'host' | 'player' | null
  /** Set a status message in the parent (for validation feedback) */
  setStatusMessage: SetStatusFn
}

export function useSharedTimers({ getSocket, getRole, setStatusMessage }: UseSharedTimersOptions) {
  const [sharedTimers, setSharedTimers] = useState<SharedTimer[]>([])
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false)
  const [isTimerPanelCollapsed, setIsTimerPanelCollapsed] = useState(false)
  const [timerDraftTitle, setTimerDraftTitle] = useState('')
  const [timerDraftMode, setTimerDraftMode] = useState<SharedTimerMode>('countdown')
  const [timerDraftMinutes, setTimerDraftMinutes] = useState('5')
  const [timerDraftSeconds, setTimerDraftSeconds] = useState('0')

  // --- Timer tick: only runs when at least one timer is not paused ---
  useEffect(() => {
    const hasRunningTimer = sharedTimers.some((timer) => !timer.isPaused)
    if (sharedTimers.length === 0 || !hasRunningTimer) {
      return
    }

    setTimerNow(Date.now())
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [sharedTimers])

  // --- Send timer command to server ---
  const sendTimerCommand = useCallback(
    (payload: Record<string, unknown>): boolean => {
      if (getRole() !== 'host') return false
      const socket = getSocket()
      if (!socket || socket.readyState !== WebSocket.OPEN) return false

      socket.send(
        JSON.stringify({
          type: 'host:updateTimers',
          ...payload,
        }),
      )
      return true
    },
    [getSocket, getRole],
  )

  // --- Timer math helpers ---
  const getSharedTimerElapsedMs = useCallback(
    (timer: SharedTimer, now = timerNow): number => {
      const elapsedWhileRunning = timer.isPaused ? 0 : Math.max(0, now - timer.updatedAt)
      const elapsedMs = timer.elapsedMs + elapsedWhileRunning
      if (timer.mode === 'countdown' && timer.durationMs !== null) {
        return Math.min(elapsedMs, timer.durationMs)
      }
      return elapsedMs
    },
    [timerNow],
  )

  const getSharedTimerRemainingMs = useCallback(
    (timer: SharedTimer, now = timerNow): number | null => {
      if (timer.mode !== 'countdown' || timer.durationMs === null) {
        return null
      }
      return Math.max(0, timer.durationMs - getSharedTimerElapsedMs(timer, now))
    },
    [timerNow, getSharedTimerElapsedMs],
  )

  const formatTimerClock = useCallback((totalMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(totalMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
    }

    return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }, [])

  const formatSharedTimerValue = useCallback(
    (timer: SharedTimer, now = timerNow): string => {
      return timer.mode === 'countdown'
        ? formatTimerClock(getSharedTimerRemainingMs(timer, now) ?? 0)
        : formatTimerClock(getSharedTimerElapsedMs(timer, now))
    },
    [timerNow, formatTimerClock, getSharedTimerRemainingMs, getSharedTimerElapsedMs],
  )

  // --- Create a new shared timer ---
  const createSharedTimer = useCallback(() => {
    const title = timerDraftTitle.trim()
    if (!title) {
      setStatusMessage('Donne un titre au timer.')
      return
    }

    if (sharedTimers.length >= MAX_SHARED_TIMERS) {
      setStatusMessage('Maximum 3 timers en meme temps.')
      return
    }

    const minutes = Math.max(0, Number.parseInt(timerDraftMinutes, 10) || 0)
    const seconds = Math.max(0, Number.parseInt(timerDraftSeconds, 10) || 0)
    const durationMs = (minutes * 60 + seconds) * 1000

    if (timerDraftMode === 'countdown' && durationMs <= 0) {
      setStatusMessage('Le minuteur doit durer au moins une seconde.')
      return
    }

    if (
      sendTimerCommand({
        action: 'create',
        title,
        mode: timerDraftMode,
        durationMs: timerDraftMode === 'countdown' ? durationMs : null,
      })
    ) {
      setIsTimerDialogOpen(false)
      setTimerDraftTitle('')
      setTimerDraftMode('countdown')
      setTimerDraftMinutes('5')
      setTimerDraftSeconds('0')
    }
  }, [timerDraftTitle, timerDraftMinutes, timerDraftSeconds, timerDraftMode, sharedTimers.length, sendTimerCommand, setStatusMessage])

  // --- Normalize incoming timer messages from server ---
  const normalizeSharedTimersMessage = useCallback((value: unknown): SharedTimer[] => {
    if (!Array.isArray(value)) {
      return []
    }

    return value.reduce<SharedTimer[]>((result, timer) => {
      if (!timer || typeof timer !== 'object') {
        return result
      }

      const nextTimer = timer as Record<string, unknown>
      const id = String(nextTimer.id ?? '').trim()
      const mode = nextTimer.mode === 'stopwatch' ? 'stopwatch' : 'countdown'
      const title = String(nextTimer.title ?? '').trim()
      if (!id || !title) {
        return result
      }

      const durationValue = Number(nextTimer.durationMs)
      const elapsedValue = Number(nextTimer.elapsedMs)
      const updatedAtValue = Number(nextTimer.updatedAt)
      result.push({
        id,
        title,
        mode,
        durationMs: mode === 'countdown' && Number.isFinite(durationValue) ? Math.max(1000, Math.round(durationValue)) : null,
        elapsedMs: Number.isFinite(elapsedValue) ? Math.max(0, Math.round(elapsedValue)) : 0,
        isPaused: nextTimer.isPaused === true,
        updatedAt: Number.isFinite(updatedAtValue) ? updatedAtValue : Date.now(),
      })
      return result
    }, []).slice(0, MAX_SHARED_TIMERS)
  }, [])

  // --- Reset on disconnect ---
  const resetTimers = useCallback(() => {
    setSharedTimers([])
    setIsTimerDialogOpen(false)
    setIsTimerPanelCollapsed(false)
  }, [])

  return {
    sharedTimers,
    setSharedTimers,
    timerNow,
    isTimerDialogOpen,
    setIsTimerDialogOpen,
    isTimerPanelCollapsed,
    setIsTimerPanelCollapsed,
    timerDraftTitle,
    setTimerDraftTitle,
    timerDraftMode,
    setTimerDraftMode,
    timerDraftMinutes,
    setTimerDraftMinutes,
    timerDraftSeconds,
    setTimerDraftSeconds,
    sendTimerCommand,
    getSharedTimerElapsedMs,
    getSharedTimerRemainingMs,
    formatTimerClock,
    formatSharedTimerValue,
    createSharedTimer,
    normalizeSharedTimersMessage,
    resetTimers,
  }
}

export type UseSharedTimersReturn = ReturnType<typeof useSharedTimers>