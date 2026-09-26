import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { TerrainDocument } from '../../types/terrain'
import { BufferedNumberField } from '../BufferedNumberField'
import { ColorPickerField } from '../ColorPickerField'

export type TerrainDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  terrain: TerrainDocument
  colorPalette: string[]
  onApplyTerrain: (next: TerrainDocument) => void
  onAddPaletteColor: (color: string) => void
  onLoadClick: () => void
  onSaveClick: () => void
  onClose: () => void
}

export function TerrainDialog({
  isOpen,
  backdropPointerDownRef,
  terrain,
  colorPalette,
  onApplyTerrain,
  onAddPaletteColor,
  onLoadClick,
  onSaveClick,
  onClose,
}: TerrainDialogProps) {
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
              <h2>Projet</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body">
          <label>
            Nom
            <input
              value={terrain.name}
              onChange={(event) => onApplyTerrain({ ...terrain, name: event.target.value })}
            />
          </label>
          <div className="inline-grid">
            <label>
              Largeur
              <BufferedNumberField
                min={400}
                value={terrain.width}
                onChange={(nextValue) =>
                  onApplyTerrain({
                    ...terrain,
                    width: Math.max(400, nextValue || 400),
                  })
                }
              />
            </label>
            <label>
              Hauteur
              <BufferedNumberField
                min={300}
                value={terrain.height}
                onChange={(nextValue) =>
                  onApplyTerrain({
                    ...terrain,
                    height: Math.max(300, nextValue || 300),
                  })
                }
              />
            </label>
          </div>
          <div className="inline-grid">
            <label>
              Grille
              <BufferedNumberField
                min={4}
                value={terrain.gridSize}
                onChange={(nextValue) =>
                  onApplyTerrain({
                    ...terrain,
                    gridSize: Math.max(4, nextValue || 4),
                  })
                }
              />
            </label>
            <label>
              Fond
              <ColorPickerField
                value={terrain.backgroundColor}
                palette={colorPalette}
                onChange={(color) => onApplyTerrain({ ...terrain, backgroundColor: color })}
                onAddPreference={onAddPaletteColor}
              />
            </label>
          </div>
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onLoadClick}>
            Charger
          </button>
          <button type="button" className="primary" onClick={onSaveClick}>
            Sauvegarder sous...
          </button>
        </div>
      </section>
    </div>
  )
}
