import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomAudioState } from '../types/terrain'
import { extractYouTubeId } from '../lib/youtube'

const DEFAULT_AUDIO_STATE: RoomAudioState = {
  isPlaying: false,
  isLooping: false,
  currentTime: 0,
  updatedAt: Date.now(),
}

export interface UseSharedAudioOptions {
  /** Returns the current WebSocket ref (or null) */
  getSocket: () => WebSocket | null
  /** Returns the current role ('host' | 'player' | null) */
  getRole: () => 'host' | 'player' | null
  /** Returns the active audio track src (for YouTube detection) */
  getActiveAudioTrackSrc: () => string | null
  /** Audio element ref (for native audio currentTime) */
  audioElementRef: React.RefObject<HTMLAudioElement | null>
  /** YouTube player ref (for getCurrentTime / seekTo) */
  ytPlayerRef: React.MutableRefObject<any>
}

export function useSharedAudio({
  getSocket,
  getRole,
  getActiveAudioTrackSrc,
  audioElementRef,
  ytPlayerRef,
}: UseSharedAudioOptions) {
  const [sharedAudioState, setSharedAudioState] = useState<RoomAudioState>(DEFAULT_AUDIO_STATE)
  const sharedAudioStateRef = useRef(sharedAudioState)
  sharedAudioStateRef.current = sharedAudioState

  // --- Sync audio currentTime to server every 2s (no re-render) ---
  useEffect(() => {
    if (getRole() !== 'host' || !sharedAudioState.isPlaying) {
      return
    }

    const interval = window.setInterval(() => {
      let currentTime = sharedAudioStateRef.current.currentTime
      const src = getActiveAudioTrackSrc()
      const isYouTube = !!src && !!extractYouTubeId(src)
      if (isYouTube) {
        try {
          if (ytPlayerRef.current?.getCurrentTime) {
            currentTime = ytPlayerRef.current.getCurrentTime()
          }
        } catch {
          // Player might be stale/destroyed during transition
        }
      } else {
        currentTime = audioElementRef.current?.currentTime ?? currentTime
      }

      const nextState: RoomAudioState = {
        isPlaying: true,
        isLooping: sharedAudioStateRef.current.isLooping,
        currentTime,
        updatedAt: Date.now(),
      }
      sharedAudioStateRef.current = nextState

      const socket = getSocket()
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'host:updateAudioState',
            audioState: nextState,
          }),
        )
      }
    }, 2000)

    return () => window.clearInterval(interval)
  }, [sharedAudioState.isPlaying, getActiveAudioTrackSrc, getSocket, getRole, audioElementRef, ytPlayerRef])

  // --- Reset on disconnect ---
  const resetAudio = useCallback(() => {
    setSharedAudioState({ ...DEFAULT_AUDIO_STATE, updatedAt: Date.now() })
  }, [])

  return {
    sharedAudioState,
    setSharedAudioState,
    sharedAudioStateRef,
    resetAudio,
  }
}

export type UseSharedAudioReturn = ReturnType<typeof useSharedAudio>