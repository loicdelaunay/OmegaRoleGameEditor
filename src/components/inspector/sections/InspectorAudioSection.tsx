import { Pause, Play } from 'lucide-react'
import { BufferedNumberField } from '../../BufferedNumberField'
import { InspectorSection } from '../../InspectorSection'

export type InspectorAudioSectionProps = {
  audioSpatialized: boolean
  audio3D: boolean
  audioRange: number
  audioLoop: boolean
  audioPlaying: boolean
  onAudioSpatializedChange: (value: boolean) => void
  onAudio3DChange: (value: boolean) => void
  onAudioRangeChange: (value: number) => void
  onAudioLoopChange: (value: boolean) => void
  onAudioPlayingToggle: () => void
  clamp: (value: number, min: number, max: number) => number
}

export function InspectorAudioSection({
  audioSpatialized,
  audio3D,
  audioRange,
  audioLoop,
  audioPlaying,
  onAudioSpatializedChange,
  onAudio3DChange,
  onAudioRangeChange,
  onAudioLoopChange,
  onAudioPlayingToggle,
  clamp,
}: InspectorAudioSectionProps) {
  return (
    <InspectorSection title="Audio" tone="asset" className="surface-tonal">
      <div className="field-stack">
        <span className="field-label">Paramètres Audio</span>
        <label className="switch-field compact-field inline-switch md-switch-field">
          <span className="md-switch-label">Son spatialisé (selon la caméra du joueur)</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={audioSpatialized}
              onChange={(event) => onAudioSpatializedChange(event.target.checked)}
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
        {audioSpatialized ? (
          <>
            <label className="switch-field compact-field inline-switch md-switch-field">
              <span className="md-switch-label">Stéréo 3D (panoramique gauche/droite)</span>
              <span className="md-switch-control">
                <input
                  className="md-switch-input"
                  type="checkbox"
                  checked={audio3D}
                  onChange={(event) => onAudio3DChange(event.target.checked)}
                />
                <span className="md-switch-track">
                  <span className="md-switch-thumb" />
                </span>
              </span>
            </label>
            <label>
              Portée du son (pixels)
              <BufferedNumberField
                min={100}
                max={10000}
                step={100}
                fractionDigits={0}
                value={audioRange || 1000}
                onChange={(nextValue) => onAudioRangeChange(clamp(Math.round(nextValue || 1000), 100, 10000))}
              />
            </label>
          </>
        ) : null}
        <label className="switch-field compact-field inline-switch md-switch-field">
          <span className="md-switch-label">Lecture en boucle</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={audioLoop}
              onChange={(event) => onAudioLoopChange(event.target.checked)}
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
        <div className="action-row" style={{ marginTop: '8px' }}>
          <button
            type="button"
            className={audioPlaying ? "primary" : "secondary"}
            onClick={onAudioPlayingToggle}
          >
            {audioPlaying ? (
              <><Pause className="button-icon" /> Pause</>
            ) : (
              <><Play className="button-icon" /> Jouer le son</>
            )}
          </button>
        </div>
      </div>
    </InspectorSection>
  )
}
