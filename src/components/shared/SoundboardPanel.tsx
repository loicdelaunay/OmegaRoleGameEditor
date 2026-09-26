import type { RefObject } from 'react'
import { ChevronDown, ChevronUp, LocateFixed, Play, Plus, Search, Trash2 } from 'lucide-react'
import type { TerrainDocument, TerrainSoundboardItem } from '../../types/terrain'
import { BufferedNumberField } from '../BufferedNumberField'

export type PendingSoundboardPlacement = {
  id: string
  src: string
  defaultRange: number
}

export type SoundboardPanelProps = {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean | ((current: boolean) => boolean)) => void
  position: { x: number; y: number } | null
  startPanelDrag: (panel: 'soundboardPanel', clientX: number, clientY: number) => void
  terrain: TerrainDocument
  soundboardSearch: string
  setSoundboardSearch: (value: string) => void
  pendingSoundboardPlacement: PendingSoundboardPlacement | null
  setPendingSoundboardPlacement: (value: PendingSoundboardPlacement | null) => void
  onLoadSounds: () => void
  onPreviewSound: (src: string) => void
  onRemoveSound: (sound: TerrainSoundboardItem) => void
  onPlaceGlobalSound: (sound: TerrainSoundboardItem) => void
  onUpdatePlacementRange: (range: number) => void
  setStatusMessage: (message: string) => void
  soundboardAudioInputRef?: RefObject<HTMLInputElement | null>
}

export function SoundboardPanel({
  isCollapsed,
  setIsCollapsed,
  position,
  startPanelDrag,
  terrain,
  soundboardSearch,
  setSoundboardSearch,
  pendingSoundboardPlacement,
  setPendingSoundboardPlacement,
  onLoadSounds,
  onPreviewSound,
  onRemoveSound,
  onPlaceGlobalSound,
  onUpdatePlacementRange,
  setStatusMessage,
}: SoundboardPanelProps) {
  return (
    <aside
      className={isCollapsed ? 'soundboard-panel timer-panel card surface-base collapsed' : 'soundboard-panel timer-panel card surface-base'}
      style={position ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      <div
        className="turn-tracker-header"
        onPointerDown={(event) => startPanelDrag('soundboardPanel', event.clientX, event.clientY)}
        style={{ cursor: 'grab' }}
      >
        <div className="turn-tracker-header-main">
          <span className="turn-tracker-kicker">Soundboard</span>
          {!isCollapsed ? <strong>{terrain.soundboard?.length || 0} son(s)</strong> : null}
        </div>
        <div className="turn-tracker-header-actions">
          <button
            type="button"
            className="ghost compact-icon-button"
            title={isCollapsed ? 'Agrandir la Soundboard' : 'Reduire la Soundboard'}
            aria-label={isCollapsed ? 'Agrandir la Soundboard' : 'Reduire la Soundboard'}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronUp className="button-icon" strokeWidth={2.2} /> : <ChevronDown className="button-icon" strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {!isCollapsed ? (
        <div className="timer-list" style={{ padding: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="ghost" style={{ flex: 1 }} onClick={onLoadSounds}>
              <Plus className="button-icon" /> Charger des sons
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--md-sys-color-surface-container)',
                padding: '4px 8px',
                borderRadius: '4px',
                flex: 1,
              }}
            >
              <Search size={14} />
              <input
                type="text"
                placeholder="Rechercher un son..."
                value={soundboardSearch}
                onChange={(e) => setSoundboardSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--md-sys-color-on-surface)',
                  fontSize: '0.85rem',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {terrain.soundboard
            ?.filter((sound) => {
              if (!soundboardSearch) return true
              return sound.name.toLowerCase().includes(soundboardSearch.toLowerCase())
            })
            .map((sound) => {
              const isPending = pendingSoundboardPlacement?.id === sound.id
              return (
                <div key={sound.id} className="timer-card surface-tonal" style={{ gap: '8px' }}>
                  <div className="timer-card-header">
                    <div className="timer-card-title-wrap">
                      <strong>{sound.name}</strong>
                    </div>
                    <div className="timer-card-actions">
                      <button
                        type="button"
                        className="ghost compact-icon-button"
                        title="Preview ce son"
                        onClick={() => onPreviewSound(sound.src)}
                      >
                        <Play className="button-icon" strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        className="ghost compact-icon-button"
                        title="Supprimer ce son"
                        onClick={() => onRemoveSound(sound)}
                      >
                        <Trash2 className="button-icon" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                  <div className="action-row">
                    <button type="button" className="button-like" onClick={() => onPlaceGlobalSound(sound)}>
                      Global
                    </button>
                    <button
                      type="button"
                      className={isPending ? 'button-like active' : 'button-like secondary'}
                      onClick={() => {
                        if (isPending) {
                          setPendingSoundboardPlacement(null)
                        } else {
                          setPendingSoundboardPlacement({ id: sound.id, src: sound.src, defaultRange: sound.defaultRange })
                          setStatusMessage('Cliquez sur le terrain pour positionner le son.')
                        }
                      }}
                    >
                      <LocateFixed className="button-icon" strokeWidth={2.2} style={{ marginRight: '6px' }} />
                      Localise
                    </button>
                    {isPending ? (
                      <div style={{ width: '100%' }}>
                        <label className="field-stack">
                          <span>Portee (px)</span>
                          <BufferedNumberField
                            value={pendingSoundboardPlacement.defaultRange}
                            min={100}
                            max={5000}
                            step={100}
                            onChange={onUpdatePlacementRange}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
        </div>
      ) : null}
    </aside>
  )
}
