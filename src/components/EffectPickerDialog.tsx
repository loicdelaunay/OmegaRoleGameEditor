import type React from 'react'
import { X } from 'lucide-react'
import type { VisualEffectType } from '../types/terrain'

const EFFECTS: { type: VisualEffectType; label: string; icon: React.ReactNode; filterStr?: string; className?: string }[] = [
  { type: 'blur', label: 'Flou', icon: '🌫️', filterStr: 'blur(5px)' },
  { type: 'sepia', label: 'Sépia', icon: '🟤', filterStr: 'sepia(100%)' },
  { type: 'grayscale', label: 'Noir et blanc', icon: '⚫', filterStr: 'grayscale(100%)' },
  { type: 'invert', label: 'Négatif', icon: '🌗', filterStr: 'invert(100%)' },
  { type: 'brightness', label: 'Luminosité', icon: '☀️', filterStr: 'brightness(150%)' },
  { type: 'contrast', label: 'Contraste', icon: '🌓', filterStr: 'contrast(150%)' },
  { type: 'hue-rotate', label: 'Rotation des teintes', icon: '🎨', filterStr: 'hue-rotate(90deg)' },
  { type: 'drop-shadow', label: 'Ombre portée', icon: '👤', filterStr: 'drop-shadow(5px 5px 10px #000000)' },
  { type: 'glow', label: 'Halo lumineux', icon: '🌟', filterStr: 'drop-shadow(0 0 15px #FFD700)' },
  { type: 'anim-ripple', label: 'Ondulation (Eau)', icon: '💧', className: 'anim-ripple' },
  { type: 'anim-fire', label: 'Feu', icon: '🔥', className: 'anim-fire' },
  { type: 'anim-glitch', label: 'Glitch', icon: '⚡', className: 'anim-glitch' },
  { type: 'anim-pulse', label: 'Pulsation', icon: '❤️', className: 'anim-pulse' },
  { type: 'anim-float', label: 'Flottaison', icon: '🎈', className: 'anim-float' },
  { type: 'anim-spin', label: 'Rotation', icon: '🌀', className: 'anim-spin' },
]

/**
 * Dialog de sélection d'un effet visuel à appliquer à la sélection.
 * Affiche un aperçu de l'effet sur l'image de référence.
 */
export function EffectPickerDialog({
  onSelect,
  onClose,
  referenceImageSrc,
  onChangeReferenceClick
}: {
  onSelect: (type: VisualEffectType) => void
  onClose: () => void
  referenceImageSrc: string
  onChangeReferenceClick: () => void
}) {
  return (
    <div className="dialog-backdrop" onPointerDown={(e) => { e.stopPropagation() }} onClick={onClose} style={{ zIndex: 9999 }}>
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Ajouter un effet visuel</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose} title="Fermer">
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Choisissez un effet à ajouter à la sélection</span>
            <button type="button" className="secondary" onClick={onChangeReferenceClick}>
              Changer l'image de référence
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
            {EFFECTS.map((eff) => (
              <button
                key={eff.type}
                type="button"
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)',
                  background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)'
                }}
                onClick={() => {
                  onSelect(eff.type)
                  onClose()
                }}
              >
                <div style={{
                  width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--md-sys-color-surface-container-high)', borderRadius: '12px', overflow: 'hidden', position: 'relative'
                }}>
                  {referenceImageSrc ? (
                    <img
                      src={referenceImageSrc}
                      className={`stage-item ${eff.className || ''}`}
                      style={{
                        maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                        '--inline-filter': eff.filterStr || 'none',
                        '--anim-intensity': 10,
                        filter: eff.filterStr || 'none',
                      } as React.CSSProperties}
                      alt=""
                    />
                  ) : (
                    <div className={`stage-item ${eff.className || ''}`} style={{
                      width: '60px', height: '60px', background: 'var(--md-sys-color-primary)', borderRadius: '8px',
                      '--inline-filter': eff.filterStr || 'none',
                      '--anim-intensity': 10,
                      filter: eff.filterStr || 'none',
                    } as React.CSSProperties} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{eff.icon}</span>
                  <span style={{ fontWeight: 600 }}>{eff.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}