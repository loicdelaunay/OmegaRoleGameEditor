import { useState } from 'react'
import { X, Layers3 } from 'lucide-react'
import type { TerrainDocument } from '../types/terrain'

/**
 * Dialog de revue de la scène : liste tous les assets (images/tokens/audios),
 * leur format et leur poids, avec actions d'optimisation (WebP, fusion d'images).
 */
export function SceneReviewDialog({
  isOpen,
  onClose,
  terrain,
  onOptimizeAll,
  onOptimizeItem,
  onTryMerge
}: {
  isOpen: boolean
  onClose: () => void
  terrain: TerrainDocument
  onOptimizeAll: () => void
  onOptimizeItem: (id: string) => void
  onTryMerge: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'image' | 'token' | 'audio'>('all')

  if (!isOpen) return null

  const getFormatFromSrc = (src?: string) => {
    if (!src) return '?'
    const match = src.match(/^data:(.*?);/)
    if (match) return match[1].split('/')[1]?.toUpperCase() || '?'
    return 'URL'
  }

  const targetItems = terrain.items.filter(i => i.kind === 'image' || i.kind === 'token' || i.kind === 'audio')
  const totalItems = targetItems.length

  const filteredItems = targetItems.filter(i => {
    if (filterCategory !== 'all' && i.kind !== filterCategory) return false
    if (searchQuery.trim() !== '') {
      return i.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const unoptimizedItems = targetItems.filter(i => i.src && i.kind !== 'audio' && !i.src.startsWith('data:image/webp') && !i.src.startsWith('data:image/svg') && !i.src.startsWith('data:image/gif'))
  const isAllOptimized = unoptimizedItems.length === 0
  const terrainSizeKo = Math.round(JSON.stringify(terrain).length / 1024)

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => { e.stopPropagation() }} onClick={onClose}>
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Revue de la scène</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose} title="Fermer">
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body" style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 16px 0' }}>
            Assets dans la scène : <strong>{totalItems}</strong><br />
            Images non optimisées : <strong style={{ color: isAllOptimized ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)' }}>{unoptimizedItems.length}</strong><br />
            Taille de la sauvegarde : <strong>{terrainSizeKo > 1024 ? `${(terrainSizeKo / 1024).toFixed(2)} Mo` : `${terrainSizeKo} Ko`}</strong>
          </p>
          <div className="surface-tonal" style={{ padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Actions d'optimisation avancées</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="secondary" onClick={onTryMerge}>
                <Layers3 className="button-icon" size={16} style={{ marginRight: '8px' }} />
                Essayer de fusionner les images
              </button>
            </div>
            <p className="helper" style={{ margin: '8px 0 0 0' }}>
              Recherche les images visuellement identiques pour n'en stocker qu'une seule et réduire considérablement la taille de la sauvegarde.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)' }}
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as 'all' | 'image' | 'token' | 'audio')}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)' }}
              >
                <option value="all">Tous les types</option>
                <option value="image">Images</option>
                <option value="token">Tokens</option>
                <option value="audio">Audios</option>
              </select>
            </div>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                <th style={{ padding: '8px 4px' }}>Nom</th>
                <th style={{ padding: '8px 4px' }}>Type</th>
                <th style={{ padding: '8px 4px' }}>Poids</th>
                <th style={{ padding: '8px 4px' }}>État</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const sizeKb = Math.round((item.src?.length || 0) * 0.75 / 1024)
                const isOptimized = item.kind === 'audio'
                  ? (item.src?.startsWith('data:audio/mp3') || item.src?.startsWith('data:audio/ogg') || item.src?.startsWith('data:audio/webm') || item.src?.startsWith('data:audio/mpeg'))
                  : (item.src?.startsWith('data:image/webp') || item.src?.startsWith('data:image/svg') || item.src?.startsWith('data:image/gif'))
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '8px 4px' }}>
                      {item.name || 'Sans nom'}
                      <span style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                        fontWeight: 600
                      }}>
                        {getFormatFromSrc(item.src)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 4px' }}>{item.kind === 'token' ? 'Pion' : item.kind === 'audio' ? 'Audio' : 'Image'}</td>
                    <td style={{ padding: '8px 4px' }}>{sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(2)} Mo` : `${sizeKb} Ko`}</td>
                    <td style={{ padding: '8px 4px' }}>
                      {isOptimized ? (
                        <span style={{ color: 'var(--md-sys-color-primary)' }}>✓ Optimisé</span>
                      ) : (
                        <span style={{ color: 'var(--md-sys-color-error)' }}>{item.kind === 'audio' ? '⚠ Lourd' : '⚠ À optimiser'}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      {!isOptimized && item.kind !== 'audio' && (
                        <button type="button" className="secondary compact-button" onClick={() => onOptimizeItem(item.id)}>
                          Optimiser
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
          <button type="button" className="primary" disabled={isAllOptimized} onClick={onOptimizeAll}>
            Tout optimiser
          </button>
        </div>
      </section>
    </div>
  )
}