import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { GeneratedAsset, TerrainItemKind } from '../../types/terrain'
import {
  DEFAULT_LIBRARY_ASSET_NAME,
  GENERATED_ASSET_PRESETS,
} from '../../lib/constants'
import { buildGeneratedAssetDataUrl, normalizeGeneratedAssetColor } from '../../lib/terrain'
import { ColorPickerField } from '../ColorPickerField'

export type DefaultLibraryDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  previewSrc: string
  preset: GeneratedAsset['preset']
  kind: TerrainItemKind
  name: string
  color: string
  colorPalette: string[]
  onPresetChange: (preset: GeneratedAsset['preset']) => void
  onPresetSelected: (preset: GeneratedAsset['preset'], label: string) => void
  onKindChange: (kind: TerrainItemKind) => void
  onNameChange: (value: string) => void
  onColorChange: (color: string) => void
  onAddPaletteColor: (color: string) => void
  onCreate: () => void
  onClose: () => void
}

export function DefaultLibraryDialog({
  isOpen,
  backdropPointerDownRef,
  previewSrc,
  preset,
  kind,
  name,
  color,
  colorPalette,
  onPresetChange,
  onPresetSelected,
  onKindChange,
  onNameChange,
  onColorChange,
  onAddPaletteColor,
  onCreate,
  onClose,
}: DefaultLibraryDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base default-library-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Formes de base</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body default-library-layout">
          <div className="default-library-preview surface-tonal">
            <img src={previewSrc} alt="Preview de la forme SVG" className="default-library-preview-image" />
          </div>
          <div className="default-library-fields">
            <div className="field-stack">
              <span className="field-label">Forme</span>
              <div className="default-library-preset-grid">
                {GENERATED_ASSET_PRESETS.map((option) => (
                  <button
                    key={option.preset}
                    type="button"
                    className={
                      preset === option.preset
                        ? 'secondary default-library-preset active'
                        : 'ghost default-library-preset'
                    }
                    onClick={() => {
                      onPresetChange(option.preset)
                      onPresetSelected(option.preset, option.label)
                    }}
                  >
                    <img
                      src={buildGeneratedAssetDataUrl({
                        preset: option.preset,
                        fill: normalizeGeneratedAssetColor(color),
                      })}
                      alt={option.label}
                      className="default-library-preset-icon"
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <label>
              Type
              <select
                value={kind}
                onChange={(event) => onKindChange(event.target.value as TerrainItemKind)}
              >
                <option value="image">Image classique</option>
                <option value="light">Lumière (Mode Nuit)</option>
                <option value="token">Pion interactif</option>
              </select>
            </label>
            <label>
              Nom
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={DEFAULT_LIBRARY_ASSET_NAME}
              />
            </label>
            <label>
              Couleur
              <ColorPickerField
                value={normalizeGeneratedAssetColor(color)}
                palette={colorPalette}
                onChange={onColorChange}
                onAddPreference={onAddPaletteColor}
              />
            </label>
            <p className="helper">Le SVG est cree en image embarquee et garde sa metadonnee pour etre recolore dans l inspecteur.</p>
          </div>
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary" onClick={() => void onCreate()}>
            Ajouter à la scène
          </button>
        </div>
      </section>
    </div>
  )
}
