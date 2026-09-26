import type { CSSProperties, RefObject } from 'react'
import { Monitor, Moon, Sun, X } from 'lucide-react'
import type { ThemeMode } from '../../types/app'
import { InspectorSection } from '../InspectorSection'

export type SettingsDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  themeMode: ThemeMode
  resolvedThemeMode: 'light' | 'dark'
  diceRollAnimationDurationMs: number
  diceResultDisplayDurationMs: number
  showOwnSyncedCursor: boolean
  zoomSpeedMultiplier: number
  appName: string
  appVersion: string
  onThemeModeChange: (mode: ThemeMode) => void
  onDiceRollAnimationDurationChange: (ms: number) => void
  onDiceResultDisplayDurationChange: (ms: number) => void
  onShowOwnSyncedCursorChange: (value: boolean) => void
  onZoomSpeedMultiplierChange: (value: number) => void
  onOpenChangelogs: () => void
  onClose: () => void
}

export function SettingsDialog({
  isOpen,
  backdropPointerDownRef,
  themeMode,
  resolvedThemeMode,
  diceRollAnimationDurationMs,
  diceResultDisplayDurationMs,
  showOwnSyncedCursor,
  zoomSpeedMultiplier,
  appName,
  appVersion,
  onThemeModeChange,
  onDiceRollAnimationDurationChange,
  onDiceResultDisplayDurationChange,
  onShowOwnSyncedCursorChange,
  onZoomSpeedMultiplierChange,
  onOpenChangelogs,
  onClose,
}: SettingsDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base settings-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Réglages</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body settings-body">
          <InspectorSection title="Thème" tone="identity" className="surface-tonal">
            <div className="field-stack">
              <strong>Theme</strong>
              <p className="helper">Choisis un theme fixe ou laisse l application suivre le systeme.</p>
            </div>
            <div className="settings-theme-grid">
              <button
                type="button"
                className={themeMode === 'light' ? 'secondary settings-choice active' : 'ghost settings-choice'}
                onClick={() => onThemeModeChange('light')}
              >
                <Sun className="button-icon" strokeWidth={2.2} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={themeMode === 'dark' ? 'secondary settings-choice active' : 'ghost settings-choice'}
                onClick={() => onThemeModeChange('dark')}
              >
                <Moon className="button-icon" strokeWidth={2.2} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                className={themeMode === 'auto' ? 'secondary settings-choice active' : 'ghost settings-choice'}
                onClick={() => onThemeModeChange('auto')}
              >
                <Monitor className="button-icon" strokeWidth={2.2} />
                <span>Auto</span>
              </button>
            </div>
            <p className="helper">Theme applique actuellement&nbsp;: {resolvedThemeMode === 'dark' ? 'Dark' : 'Light'}</p>
          </InspectorSection>

          <InspectorSection title="Résultat des dés" tone="geometry" className="surface-tonal">
            <div className="field-stack">
              <strong>Resultat des des</strong>
              <p className="helper">Definis la duree d animation du lancer, puis le temps d affichage du resultat.</p>
            </div>
            <label className="settings-duration-field">
              <span className="field-label">Duree d animation</span>
              <div className="range-field">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={Math.round(diceRollAnimationDurationMs / 1000)}
                  style={{ '--range-value': `${((Math.round(diceRollAnimationDurationMs / 1000) - 1) / 11) * 100}%` } as CSSProperties}
                  onChange={(event) => onDiceRollAnimationDurationChange(Math.max(1000, Number(event.target.value) * 1000))}
                />
                <span className="range-value-pill">{Math.round(diceRollAnimationDurationMs / 1000)}s</span>
              </div>
            </label>
            <label className="settings-duration-field">
              <span className="field-label">Duree d affichage du resultat</span>
              <div className="range-field">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={Math.round(diceResultDisplayDurationMs / 1000)}
                  style={{ '--range-value': `${((Math.round(diceResultDisplayDurationMs / 1000) - 1) / 11) * 100}%` } as CSSProperties}
                  onChange={(event) => onDiceResultDisplayDurationChange(Math.max(1000, Number(event.target.value) * 1000))}
                />
                <span className="range-value-pill">{Math.round(diceResultDisplayDurationMs / 1000)}s</span>
              </div>
            </label>
          </InspectorSection>

          <InspectorSection title="Curseurs synchronisés" tone="structure" className="surface-tonal">
            <div className="field-stack">
              <strong>Curseur synchro</strong>
              <p className="helper">Affiche ou masque ton propre curseur synchronise localement.</p>
            </div>
            <label className="switch-field compact-field settings-toggle-row md-switch-field">
              <span className="md-switch-label">Afficher mon curseur synchro</span>
              <span className="md-switch-control">
                <input
                  className="md-switch-input"
                  type="checkbox"
                  checked={showOwnSyncedCursor}
                  onChange={(event) => onShowOwnSyncedCursorChange(event.target.checked)}
                />
                <span className="md-switch-track">
                  <span className="md-switch-thumb" />
                </span>
              </span>
            </label>
          </InspectorSection>

          <InspectorSection title="Navigation" tone="action" className="surface-tonal">
            <div className="field-stack">
              <strong>Vitesse de Zoom</strong>
              <p className="helper">Ajuste la sensibilite de la molette pour le zoom (x{zoomSpeedMultiplier.toFixed(1)}).</p>
            </div>
            <label className="settings-duration-field">
              <div className="range-field">
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={zoomSpeedMultiplier}
                  style={{ '--range-value': `${((zoomSpeedMultiplier - 0.1) / 2.9) * 100}%` } as CSSProperties}
                  onChange={(event) => onZoomSpeedMultiplierChange(Number(event.target.value))}
                />
              </div>
            </label>
          </InspectorSection>

          <InspectorSection title="Information" tone="note" className="surface-tonal">
            <div className="field-stack">
              <strong>Information</strong>
              <p className="helper">Version du logiciel et informations techniques.</p>
            </div>
            <div className="settings-info-grid">
              <div className="settings-info-row">
                <span className="settings-info-label">Application</span>
                <span className="settings-info-value">{appName}</span>
              </div>
              <div className="settings-info-row">
                <span className="settings-info-label">Version</span>
                <span className="settings-info-value">{appVersion}</span>
              </div>
              <div className="settings-info-row">
                <span className="settings-info-label">Stack</span>
                <span className="settings-info-value">React + Vite + TypeScript</span>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="secondary" onClick={onOpenChangelogs}>
                Voir Changelogs
              </button>
            </div>
          </InspectorSection>
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </section>
    </div>
  )
}
