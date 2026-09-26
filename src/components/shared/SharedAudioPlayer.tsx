import YouTube from 'react-youtube'
import type { RefObject } from 'react'
import { extractYouTubeId } from '../../lib/youtube'

export function SharedAudioPlayer({
  isYouTubeAudio,
  activeAudioTrack,
  ytPlayerOpts,
  audioVolume,
  audioElementRef,
  ytPlayerRef,
  onYouTubeError,
  onYouTubeStateChange,
  onEnded,
  setAudioDuration,
}: {
  isYouTubeAudio: boolean
  activeAudioTrack: { src: string } | null
  ytPlayerOpts: object
  audioVolume: number
  audioElementRef: RefObject<HTMLAudioElement | null>
  ytPlayerRef: RefObject<any>
  onYouTubeError: (e: any) => void
  onYouTubeReady: (event: any) => void
  onYouTubeStateChange: (event: any) => void
  onLoadedMetadata: () => void
  onEnded: () => void
  setAudioDuration: (duration: number) => void
}) {
  if (isYouTubeAudio && activeAudioTrack && extractYouTubeId(activeAudioTrack.src)) {
    return (
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <YouTube
          key={extractYouTubeId(activeAudioTrack.src) as string}
          videoId={extractYouTubeId(activeAudioTrack.src) as string}
          opts={ytPlayerOpts}
          onError={onYouTubeError}
          onReady={(event) => {
            ytPlayerRef.current = event.target
            event.target.setVolume(Math.round(Math.max(0, Math.min(1, audioVolume)) * 100))
            setAudioDuration(event.target.getDuration() || 0)
          }}
          onStateChange={onYouTubeStateChange}
        />
      </div>
    )
  }

  return (
    <audio
      ref={audioElementRef}
      className="shared-audio"
      src={activeAudioTrack?.src ?? undefined}
      preload="auto"
      onLoadedMetadata={() => {
        if (audioElementRef.current) {
          setAudioDuration(audioElementRef.current.duration || 0)
        }
      }}
      onEnded={onEnded}
    />
  )
}
