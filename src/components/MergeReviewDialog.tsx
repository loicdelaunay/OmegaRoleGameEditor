import { X, RefreshCw, ArrowRight } from 'lucide-react'
import type { TerrainItem } from '../types/terrain'

export interface MergeGroup {
  master: TerrainItem
  duplicates: TerrainItem[]
}

/**
 * Dialog de revue de fusion d'images : affiche les groupes d'images
 * visuellement identiques et permet de les fusionner individuellement
 * ou tous en une fois.
 */
export function MergeReviewDialog({
  isOpen,
  onClose,
  groups,
  onAcceptGroup,
  onAcceptAll,
  isProcessing
}: {
  isOpen: boolean
  onClose: () => void
  groups: MergeGroup[]
  onAcceptGroup: (index: number) => void
  onAcceptAll: () => void
  isProcessing: boolean
}) {
  if (!isOpen) return null

  const totalSaved = groups.reduce((acc, g) => acc + g.duplicates.length, 0)

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => { e.stopPropagation() }} onClick={onClose}>
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Fusion des images</h2>
              <p className="helper">
                Validation individuelle par groupe. À gauche : les doublons qui seront écrasés. À droite : l'image résultat unique qui sera conservée en mémoire.
              </p>
            </div>
            <button type="button" className="ghost" onClick={onClose} title="Fermer" disabled={isProcessing}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body" style={{ padding: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px' }}>
              <RefreshCw className="button-icon" size={32} style={{ animation: 'spin 2s linear infinite' }} />
              <p>Analyse des images en cours... Cela peut prendre quelques secondes.</p>
            </div>
          ) : groups.length === 0 ? (
            <p>Aucune image identique trouvée. Votre scène est déjà optimisée !</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <p style={{ margin: 0 }}><strong>{totalSaved}</strong> images en double réparties dans <strong>{groups.length}</strong> groupes.</p>
              {groups.map((group, index) => (
                <div key={index} className="card surface-tonal" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--md-sys-color-primary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Éléments à fusionner ({group.duplicates.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
                        {group.duplicates.map(d => (
                          <div key={d.id} className="surface-base" style={{ padding: '8px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border)' }}>
                            <img src={d.src} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.kind}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', padding: '0 8px' }}>
                      <ArrowRight className="button-icon" size={24} style={{ color: 'var(--md-sys-color-on-surface-variant)', marginTop: '24px' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--md-sys-color-primary)' }}>
                        Résultat unique en mémoire
                      </div>
                      <div className="surface-base" style={{ padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid var(--border)', height: '100%', boxSizing: 'border-box' }}>
                        <img src={group.master.src} alt={group.master.name} style={{ width: '96px', height: '96px', objectFit: 'contain', background: 'var(--md-sys-color-surface)', borderRadius: '4px' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', wordBreak: 'break-word' }}>{group.master.name || group.master.kind}</span>
                      </div>
                    </div>

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="secondary" onClick={() => onAcceptGroup(index)}>
                      Fusionner ce groupe uniquement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose} disabled={isProcessing}>
            Annuler
          </button>
          {!isProcessing && groups.length > 1 && (
            <button type="button" className="primary" onClick={onAcceptAll}>
              Tout fusionner ({groups.length} groupes)
            </button>
          )}
        </div>
      </section>
    </div>
  )
}