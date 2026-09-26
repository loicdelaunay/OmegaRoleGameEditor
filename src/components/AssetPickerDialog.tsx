import { useMemo } from 'react'
import { X, Upload } from 'lucide-react'
import type { TerrainDocument, TerrainItem } from '../types/terrain'

export interface AssetPickerContext {
  mode: 'add-image' | 'add-token' | 'replace-item' | 'effect-reference'
  targetItemId?: string
}

/**
 * Dialog de sélection d'un asset existant dans la scène,
 * ou d'import depuis le PC.
 */
export function AssetPickerDialog({
  context,
  onClose,
  terrain,
  onSelectAsset,
  onUploadClick
}: {
  context: AssetPickerContext | null
  onClose: () => void
  terrain: TerrainDocument
  onSelectAsset: (asset: TerrainItem) => void
  onUploadClick: () => void
}) {
  const uniqueAssets = useMemo(() => {
    const map = new Map<string, TerrainItem>()
    for (const item of terrain.items) {
      if ((item.kind === 'image' || item.kind === 'token') && item.src && !map.has(item.src)) {
        map.set(item.src, item)
      }
    }
    return Array.from(map.values())
  }, [terrain.items])

  if (!context) return null

  let title = 'Choisir un asset'
  if (context.mode === 'add-image') title = 'Ajouter des images'
  if (context.mode === 'add-token') title = 'Ajouter des pions'
  if (context.mode === 'replace-item') title = 'Remplacer l\'image'
  if (context.mode === 'effect-reference') title = 'Image de référence'

  const showUploadButton = context.mode === 'add-image' || context.mode === 'add-token'

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => { e.stopPropagation() }} onClick={onClose} style={{ zIndex: 10000 }}>
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>{title}</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose} title="Fermer">
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body" style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          {showUploadButton && (
            <div style={{ marginBottom: '24px' }}>
              <button type="button" className="primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={onUploadClick}>
                <Upload className="button-icon" size={24} />
                Importer depuis mon PC
              </button>
            </div>
          )}

          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem' }}>{showUploadButton ? 'Ou choisir un asset existant dans la scène' : 'Choisir un asset existant dans la scène'}</h3>
          {uniqueAssets.length === 0 ? (
            <p className="helper">Aucun asset d'image ou de pion présent dans la scène.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {uniqueAssets.map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  className="surface-tonal"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid var(--border)'
                  }}
                  onClick={() => onSelectAsset(asset)}
                  title={asset.name}
                >
                  <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--md-sys-color-surface)', borderRadius: '4px' }}>
                    <img src={asset.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {asset.name || asset.kind}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}