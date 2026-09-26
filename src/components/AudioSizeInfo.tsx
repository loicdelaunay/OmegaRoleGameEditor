import { InspectorSection } from './InspectorSection'

/**
 * Affiche les informations de taille/format d'un fichier audio (data URL)
 * et alerte si le format n'est pas compressé (mp3/ogg/webm).
 */
export function AudioSizeInfo({ src }: { src: string }) {
  const kbSize = Math.round(src.length * 0.75 / 1024)
  const isCompressed = src.startsWith('data:audio/mp3') || src.startsWith('data:audio/ogg') || src.startsWith('data:audio/webm') || src.startsWith('data:audio/mpeg')

  return (
    <InspectorSection tone="asset" className="surface-tonal">
      <div className="field-stack" style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
        <span className="field-label">Information du fichier audio</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <strong>Poids en sauvegarde : </strong>
            {kbSize > 1024 ? `${(kbSize / 1024).toFixed(2)} Mo` : `${kbSize} Ko`}
          </div>
          {isCompressed ? (
            <div style={{ color: 'var(--md-sys-color-primary)' }}>✓ Format audio compressé</div>
          ) : (
            <div style={{ color: 'var(--md-sys-color-error)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <span>⚠ Format audio non optimisé (wav ou autre format lourd)</span>
              <span style={{ fontSize: '0.8rem' }}>Recommandation : Convertissez ce fichier en .mp3 ou .ogg avant de l'importer pour réduire la taille de votre sauvegarde.</span>
            </div>
          )}
        </div>
      </div>
    </InspectorSection>
  )
}