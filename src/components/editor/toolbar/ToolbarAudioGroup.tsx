import type { CSSProperties } from 'react'
import type { TerrainAudio } from '../../../types/terrain'

export type ToolbarAudioGroupProps = {
  isPlaying: boolean
  playbackStatus: string
  activeTrack: TerrainAudio | null
  audioVolume: number
  soundboardVolume: number
  onAudioVolumeChange: (value: number) => void
  onSoundboardVolumeChange: (value: number) => void
}

export function ToolbarAudioGroup({
  isPlaying,
  playbackStatus,
  activeTrack,
  audioVolume,
  soundboardVolume,
  onAudioVolumeChange,
  onSoundboardVolumeChange,
}: ToolbarAudioGroupProps) {
  const audioPct = Math.round(audioVolume * 100)
  const sfxPct = Math.round(soundboardVolume * 100)
  return (
    <div className="toolbar-group toolbar-audio-group">
      <span className="toolbar-group-label">Audio</span>
      <span className={isPlaying ? 'audio-state-pill active' : 'audio-state-pill'}>
        {playbackStatus}
      </span>
      <span className="audio-track-name">{activeTrack?.name ?? 'Aucune piste'}</span>
      <label className="audio-volume-control">
        <span className="audio-volume-label">Vol</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={audioPct}
          style={{ '--range-value': `${audioPct}%` } as CSSProperties}
          onChange={(event) => onAudioVolumeChange(Number(event.target.value) / 100)}
        />
      </label>
      <div style={{ width: '1px', height: '16px', background: 'var(--md-sys-color-outline-variant)', margin: '0 8px' }} />
      <label className="audio-volume-control">
        <span className="audio-volume-label">SFX</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={sfxPct}
          style={{ '--range-value': `${sfxPct}%` } as CSSProperties}
          onChange={(event) => onSoundboardVolumeChange(Number(event.target.value) / 100)}
        />
      </label>
    </div>
  )
}
