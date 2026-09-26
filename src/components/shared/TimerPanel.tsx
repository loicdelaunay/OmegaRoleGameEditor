import { ChevronDown, ChevronUp, Pause, Play, Trash2 } from 'lucide-react'
import type { SharedTimer } from '../../types/terrain'
import { MAX_SHARED_TIMERS } from '../../lib/constants'

export type TimerPanelProps = {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean | ((current: boolean) => boolean)) => void
  position: { x: number; y: number } | null
  startPanelDrag: (panel: 'timerPanel', clientX: number, clientY: number) => void
  sharedTimers: SharedTimer[]
  isHost: boolean
  formatSharedTimerValue: (timer: SharedTimer) => string
  getSharedTimerRemainingMs: (timer: SharedTimer) => number | null
  formatTimerClock: (ms: number) => string
  sendTimerCommand: (payload: Record<string, unknown>) => void
}

export function TimerPanel({
  isCollapsed,
  setIsCollapsed,
  position,
  startPanelDrag,
  sharedTimers,
  isHost,
  formatSharedTimerValue,
  getSharedTimerRemainingMs,
  formatTimerClock,
  sendTimerCommand,
}: TimerPanelProps) {
  return (
    <aside
      className={isCollapsed ? 'timer-panel card surface-base collapsed' : 'timer-panel card surface-base'}
      style={position ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      <div
        className="turn-tracker-header"
        onPointerDown={(event) => startPanelDrag('timerPanel', event.clientX, event.clientY)}
        style={{ cursor: 'grab' }}
      >
        <div className="turn-tracker-header-main">
          <span className="turn-tracker-kicker">Timers</span>
          {!isCollapsed ? (
            <strong>{sharedTimers.length > 0 ? `${sharedTimers.length} timer${sharedTimers.length > 1 ? 's' : ''} actif${sharedTimers.length > 1 ? 's' : ''}` : 'Aucun timer actif'}</strong>
          ) : null}
        </div>
        <div className="turn-tracker-header-actions">
          {isHost ? (
            <span className="turn-tracker-round-pill">{sharedTimers.length}/{MAX_SHARED_TIMERS}</span>
          ) : null}
          <button
            type="button"
            className="ghost compact-icon-button"
            title={isCollapsed ? 'Agrandir le panneau des timers' : 'Reduire le panneau des timers'}
            aria-label={isCollapsed ? 'Agrandir le panneau des timers' : 'Reduire le panneau des timers'}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronUp className="button-icon" strokeWidth={2.2} /> : <ChevronDown className="button-icon" strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {sharedTimers.length === 0 ? null : isCollapsed ? (
        <div className="timer-collapsed-list">
          {sharedTimers.map((timer) => (
            <div key={timer.id} className="timer-collapsed-row surface-tonal">
              <strong>{timer.title}</strong>
              <span className="timer-collapsed-value">{formatSharedTimerValue(timer)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="timer-list">
          {sharedTimers.map((timer) => {
            const remainingMs = getSharedTimerRemainingMs(timer)
            const isFinished = timer.mode === 'countdown' && remainingMs === 0
            return (
              <div key={timer.id} className={isFinished ? 'timer-card surface-tonal finished' : 'timer-card surface-tonal'}>
                <div className="timer-card-header">
                  <div className="timer-card-title-wrap">
                    <strong>{timer.title}</strong>
                    <span className="timer-mode-pill">{timer.mode === 'stopwatch' ? 'Chrono' : isFinished ? 'Termine' : 'Minuteur'}</span>
                  </div>
                  {isHost ? (
                    <div className="timer-card-actions">
                      <button
                        type="button"
                        className="ghost compact-icon-button"
                        title={timer.isPaused ? 'Relancer le timer' : 'Mettre le timer en pause'}
                        aria-label={timer.isPaused ? 'Relancer le timer' : 'Mettre le timer en pause'}
                        onClick={() => sendTimerCommand({ action: 'togglePause', timerId: timer.id })}
                      >
                        {timer.isPaused ? <Play className="button-icon" strokeWidth={2.2} /> : <Pause className="button-icon" strokeWidth={2.2} />}
                      </button>
                      <button
                        type="button"
                        className="ghost compact-icon-button"
                        title="Supprimer ce timer"
                        aria-label="Supprimer ce timer"
                        onClick={() => sendTimerCommand({ action: 'remove', timerId: timer.id })}
                      >
                        <Trash2 className="button-icon" strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="timer-value">{formatSharedTimerValue(timer)}</div>
                <div className="timer-meta">
                  <span>{timer.isPaused ? 'En pause' : 'En cours'}</span>
                  {timer.mode === 'countdown' ? (
                    <span>Depart {formatTimerClock(timer.durationMs ?? 0)}</span>
                  ) : (
                    <span>Chrono partage</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
