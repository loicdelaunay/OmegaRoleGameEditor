import { Grid, Moon } from 'lucide-react'
import type { PlayerViewMode } from '../../../types/terrain'
import { BufferedNumberField } from '../../BufferedNumberField'

export type ToolbarToolsGroupProps = {
  isGridSnapEnabled: boolean
  isHostNightModePreview: boolean
  bulkAssignedViewMode: PlayerViewMode
  gridSize: number
  onToggleGridSnap: () => void
  onChangeGridSize: (value: number) => void
  onToggleNightModePreview: () => void
  onChangeBulkViewMode: (mode: PlayerViewMode) => void
  onApplyBulkViewMode: () => void
}

export function ToolbarToolsGroup({
  isGridSnapEnabled,
  isHostNightModePreview,
  bulkAssignedViewMode,
  gridSize,
  onToggleGridSnap,
  onChangeGridSize,
  onToggleNightModePreview,
  onChangeBulkViewMode,
  onApplyBulkViewMode,
}: ToolbarToolsGroupProps) {
  return (
    <div className="toolbar-group toolbar-tools-group">
      <span className="toolbar-group-label">Tools</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          className={isGridSnapEnabled ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
          title={isGridSnapEnabled ? 'Desactiver le snap sur la grille' : 'Activer le snap sur la grille'}
          aria-label={isGridSnapEnabled ? 'Desactiver le snap sur la grille' : 'Activer le snap sur la grille'}
          onClick={onToggleGridSnap}
        >
          <Grid className="button-icon" strokeWidth={2.2} />
        </button>
        {isGridSnapEnabled && (
          <BufferedNumberField
            value={gridSize}
            onChange={(value) => onChangeGridSize(Math.max(0, value))}
            className="compact-input"
            style={{ width: '60px' }}
            min={0}
            title="Taille de la grille"
          />
        )}
      </div>
      <button
        type="button"
        className={isHostNightModePreview ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
        title={isHostNightModePreview ? 'Désactiver l aperçu nuit MJ' : 'Activer l aperçu nuit MJ'}
        aria-label={isHostNightModePreview ? 'Désactiver l aperçu nuit MJ' : 'Activer l aperçu nuit MJ'}
        onClick={onToggleNightModePreview}
      >
        <Moon className="button-icon" strokeWidth={2.2} />
      </button>
      <select value={bulkAssignedViewMode} onChange={(event) => onChangeBulkViewMode(event.target.value as PlayerViewMode)}>
        <option value="free">Libre</option>
        <option value="follow-host">Force suivis MJ</option>
        <option value="locked-token">Fige sur pion</option>
        <option value="follow-turn">Suivre par tour</option>
      </select>
      <button type="button" className="secondary" onClick={onApplyBulkViewMode}>
        Apply
      </button>
    </div>
  )
}
