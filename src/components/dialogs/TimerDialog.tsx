import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { SharedTimerMode } from '../../types/terrain'

export type TimerDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  mode: SharedTimerMode
  title: string
  minutes: string
  seconds: string
  onModeChange: (mode: SharedTimerMode) => void
  onTitleChange: (value: string) => void
  onMinutesChange: (value: string) => void
  onSecondsChange: (value: string) => void
  onCreate: () => void
  onClose: () => void
}

export function TimerDialog({
  isOpen,
  backdropPointerDownRef,
  mode,
  title,
  minutes,
  seconds,
  onModeChange,
  onTitleChange,
  onMinutesChange,
  onSecondsChange,
  onCreate,
  onClose,
}: TimerDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base" onClick={(event) => event.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Créer un timer</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body">
          <div className="segmented compact-segmented timer-mode-switch" aria-label="Type de timer">
            <button
              type="button"
              className={mode === 'countdown' ? 'active' : ''}
              onClick={() => onModeChange('countdown')}
            >
              <span>Minuteur</span>
            </button>
            <button
              type="button"
              className={mode === 'stopwatch' ? 'active' : ''}
              onClick={() => onModeChange('stopwatch')}
            >
              <span>Chrono</span>
            </button>
          </div>
          <label>
            Titre
            <input
              value={title}
              maxLength={40}
              placeholder={mode === 'stopwatch' ? 'Combat principal' : 'Pause strategique'}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </label>
          {mode === 'countdown' ? (
            <div className="inline-grid">
              <label>
                Minutes
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={minutes}
                  onChange={(event) => onMinutesChange(event.target.value)}
                />
              </label>
              <label>
                Secondes
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(event) => onSecondsChange(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <p className="helper">Le chrono demarre immediatement et reste partage avec tous les joueurs.</p>
          )}
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={onCreate}>
            Créer
          </button>
        </div>
      </section>
    </div>
  )
}
