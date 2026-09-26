import { Activity, FolderOpen, Map as MapIcon, Save } from 'lucide-react'

export type ToolbarProjetGroupProps = {
  projectName: string
  hasWorkfolder: boolean
  isAutoSaving: boolean
  hasAutoSaveTarget: boolean
  isAutoSaveOnModifyEnabled: boolean
  lastSaveLabel: string
  saveStatusLabel: string
  saveSubLabel: string | null
  onOpenImport: () => void
  onSaveTerrain: () => void
  onToggleAutoSave: () => void
  onOpenSceneReview: () => void
  onOpenTerrainEdit: () => void
}

export function ToolbarProjetGroup({
  projectName,
  hasWorkfolder,
  isAutoSaving,
  hasAutoSaveTarget,
  isAutoSaveOnModifyEnabled,
  lastSaveLabel,
  saveStatusLabel,
  saveSubLabel,
  onOpenImport,
  onSaveTerrain,
  onToggleAutoSave,
  onOpenSceneReview,
  onOpenTerrainEdit,
}: ToolbarProjetGroupProps) {
  return (
    <div className={`toolbar-group ${!hasWorkfolder ? 'pulse-red-border' : ''}`}>
      <span className="toolbar-group-label">PROJET</span>
      <span
        className="toolbar-title"
        style={{ marginLeft: '4px', marginRight: '8px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface)' }}
      >
        {projectName}
      </span>
      <button
        type="button"
        className="ghost compact-icon-button"
        title="Gestion du projet"
        aria-label="Gestion du projet"
        onClick={onOpenImport}
      >
        <FolderOpen className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={isAutoSaving ? 'secondary compact-icon-button terrain-save-button is-auto-saving' : 'secondary compact-icon-button terrain-save-button'}
        title="Sauvegarder le terrain"
        aria-label="Sauvegarder le terrain"
        onClick={onSaveTerrain}
      >
        <Save className="button-icon" strokeWidth={2.2} />
      </button>
      {hasAutoSaveTarget ? (
        <button
          type="button"
          className={isAutoSaveOnModifyEnabled ? 'compact-icon-button terrain-save-toggle-button is-active' : 'compact-icon-button terrain-save-toggle-button'}
          title={
            isAutoSaveOnModifyEnabled
              ? 'Desactiver la sauvegarde automatique apres modification'
              : 'Activer la sauvegarde automatique apres modification'
          }
          aria-label={
            isAutoSaveOnModifyEnabled
              ? 'Desactiver la sauvegarde automatique'
              : 'Activer la sauvegarde automatique'
          }
          aria-pressed={isAutoSaveOnModifyEnabled}
          onClick={onToggleAutoSave}
        >
          <Save className="button-icon" strokeWidth={2.2} />
        </button>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="terrain-save-status" title={lastSaveLabel}>
          {saveStatusLabel}
        </span>
        {saveSubLabel && (
          <span style={{ fontSize: '0.65rem', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1 }}>
            {saveSubLabel}
          </span>
        )}
      </div>
      <button
        type="button"
        className="ghost compact-icon-button"
        title="Revue de la scene"
        aria-label="Revue de la scene"
        onClick={onOpenSceneReview}
      >
        <Activity className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="ghost compact-icon-button"
        title="Editer la scene"
        aria-label="Editer la scene"
        onClick={onOpenTerrainEdit}
      >
        <MapIcon className="button-icon" strokeWidth={2.2} />
      </button>
    </div>
  )
}
