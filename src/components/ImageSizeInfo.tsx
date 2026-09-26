import { useEffect, useState } from 'react'
import { InspectorSection } from './InspectorSection'
import { loadImageDimensions, convertDataUrlToWebp } from '../lib/terrain'

/**
 * Affiche les informations de taille/format d'une image source (data URL)
 * et propose un bouton d'optimisation vers WebP si non optimisée.
 */
export function ImageSizeInfo({ src, onOptimize }: { src: string; onOptimize: (newSrc: string) => void }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  useEffect(() => {
    let active = true
    loadImageDimensions(src).then(dims => {
      if (active) setDimensions(dims)
    }).catch(() => { })
    return () => { active = false }
  }, [src])

  const kbSize = Math.round(src.length * 0.75 / 1024)

  async function handleOptimize() {
    setIsOptimizing(true)
    try {
      const optimizedSrc = await convertDataUrlToWebp(src)
      if (optimizedSrc !== src) {
        onOptimize(optimizedSrc)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <InspectorSection tone="asset" className="surface-tonal">
      <div className="field-stack" style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
        <span className="field-label">Information de l'image source</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <strong>Dimensions : </strong>
            {dimensions ? `${dimensions.width} x ${dimensions.height} px` : 'Chargement...'}
          </div>
          <div>
            <strong>Poids en sauvegarde : </strong>
            {kbSize > 1024 ? `${(kbSize / 1024).toFixed(2)} Mo` : `${kbSize} Ko`}
          </div>
          {src.startsWith('data:image/webp') ? (
            <div style={{ color: 'var(--md-sys-color-primary)' }}>✓ Format WebP optimisé</div>
          ) : src.startsWith('data:image/svg') ? (
            <div>✓ Format SVG vectoriel</div>
          ) : (
            <div style={{ color: 'var(--md-sys-color-error)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <span>⚠ Format raster non optimisé</span>
              <button
                type="button"
                className="secondary"
                disabled={isOptimizing}
                onClick={() => void handleOptimize()}
              >
                {isOptimizing ? 'Optimisation...' : 'Optimiser cette image'}
              </button>
            </div>
          )}
        </div>
      </div>
    </InspectorSection>
  )
}