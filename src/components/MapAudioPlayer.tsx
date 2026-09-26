import { useEffect, useRef } from 'react'
import type { TerrainItem } from '../types/terrain'

type AudioGraph = {
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  panner: StereoPannerNode
}

type MapAudioPlayerProps = {
  items: TerrainItem[]
  zoom: number
  stageFrameRef: React.RefObject<HTMLDivElement | null>
  globalVolume: number
  resolvedItems?: Map<string, { x: number; y: number; scale: number; rotation: number }>
  onAudioEnded?: (id: string) => void
  isPlayerMode?: boolean
  listenerPosition?: { x: number; y: number } | null
}

export function MapAudioPlayer({ items, zoom, stageFrameRef, globalVolume, resolvedItems, onAudioEnded, isPlayerMode, listenerPosition }: MapAudioPlayerProps) {
  const audioGraphRefs = useRef<Map<string, AudioGraph>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)

  // Create or remove audio elements when items change
  const audioItems = items.filter((item) => item.kind === 'audio' && item.audioPlaying && item.src && !item.src.includes('youtube.com') && !item.src.includes('youtu.be'))

  useEffect(() => {
    if (audioItems.length > 0 && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const currentMap = audioGraphRefs.current
    const newMap = new Map<string, AudioGraph>()

    for (const item of audioItems) {
      let graph = currentMap.get(item.id)
      if (!graph) {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {})
        }

        const audio = new Audio(item.src)
        audio.crossOrigin = 'anonymous'
        audio.loop = item.audioLoop || false
        audio.onended = () => {
          if (item.audioAutoDestroy && onAudioEnded) {
            onAudioEnded(item.id)
          }
        }
        audio.play().catch((e) => console.warn('Failed to play map audio:', e))

        const source = audioContextRef.current!.createMediaElementSource(audio)
        const panner = audioContextRef.current!.createStereoPanner()
        source.connect(panner)
        panner.connect(audioContextRef.current!.destination)

        graph = { element: audio, source, panner }
      } else {
        if (graph.element.loop !== item.audioLoop) {
          graph.element.loop = item.audioLoop || false
        }
        if (graph.element.src !== item.src) {
          graph.element.src = item.src
          graph.element.play().catch((e) => console.warn('Failed to play map audio:', e))
        }
      }
      newMap.set(item.id, graph)
    }

    for (const [id, graph] of currentMap.entries()) {
      if (!newMap.has(id)) {
        graph.element.pause()
        graph.element.removeAttribute('src')
        graph.element.load()
        graph.source.disconnect()
        graph.panner.disconnect()
      }
    }

    audioGraphRefs.current = newMap
  }, [audioItems])

  // Check if any audio item actually needs spatialization or 3D panning.
  // If none do, we skip the rAF loop entirely and set volumes once.
  const hasSpatialAudio = audioItems.some((item) => item.audioSpatialized)

  // Spatialization loop — only runs when at least one item has spatialization enabled
  useEffect(() => {
    if (!hasSpatialAudio) {
      // No spatialized audio: set flat volumes once, no rAF loop needed
      for (const item of audioItems) {
        const graph = audioGraphRefs.current.get(item.id)
        if (!graph) continue
        graph.element.volume = globalVolume
        graph.panner.pan.value = 0
      }
      return
    }

    let animationFrameId: number

    function updateVolumes() {
      const frame = stageFrameRef.current
      if (!frame) {
        animationFrameId = requestAnimationFrame(updateVolumes)
        return
      }

      let listenerX = 0
      let listenerY = 0
      let hasListener = true

      if (isPlayerMode) {
        if (!listenerPosition) {
          hasListener = false
        } else {
          listenerX = listenerPosition.x
          listenerY = listenerPosition.y
        }
      } else {
        listenerX = (frame.scrollLeft + frame.clientWidth / 2) / zoom
        listenerY = (frame.scrollTop + frame.clientHeight / 2) / zoom
      }

      for (const item of audioItems) {
        const graph = audioGraphRefs.current.get(item.id)
        if (!graph) continue

        if (item.audioSpatialized) {
          if (!hasListener) {
            graph.element.volume = 0
            continue
          }

          const resolved = resolvedItems?.get(item.id)
          const itemX = resolved ? resolved.x : item.x
          const itemY = resolved ? resolved.y : item.y
          const itemScale = resolved ? resolved.scale : item.scale
          
          const itemCenterX = itemX + (item.width * itemScale) / 2
          const itemCenterY = itemY + (item.height * itemScale) / 2
          const dx = itemCenterX - listenerX
          const dy = itemCenterY - listenerY
          const distance = Math.sqrt(dx * dx + dy * dy)
          const range = item.audioRange || 1000

          // Calculate volume based on distance (linear falloff)
          let volume = 1 - (distance / range)
          if (volume < 0) volume = 0
          if (volume > 1) volume = 1
          
          graph.element.volume = volume * globalVolume

          if (item.audio3D) {
            let pan = dx / (range * 0.8)
            if (pan < -1) pan = -1
            if (pan > 1) pan = 1
            graph.panner.pan.value = pan
          } else {
            graph.panner.pan.value = 0
          }
        } else {
          graph.element.volume = globalVolume
          graph.panner.pan.value = 0
        }
      }

      animationFrameId = requestAnimationFrame(updateVolumes)
    }

    updateVolumes()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [audioItems, zoom, stageFrameRef, hasSpatialAudio, listenerPosition, globalVolume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const map = audioGraphRefs.current
      for (const graph of map.values()) {
        graph.element.pause()
        graph.element.src = ''
        graph.source.disconnect()
        graph.panner.disconnect()
      }
      map.clear()
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  return null
}
