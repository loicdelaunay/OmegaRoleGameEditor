import { useMemo } from 'react'
import { InspectorSection } from './InspectorSection'
import type { TerrainDocument, TerrainItem } from '../types/terrain'

/**
 * Section d'inspecteur permettant de remplacer l'asset courant
 * par un autre asset déjà présent dans la scène.
 */
export function AssetPickerSection({
  terrain,
  selectedItem,
  onPickExisting
}: {
  terrain: TerrainDocument
  selectedItem: TerrainItem
  onPickExisting: () => void
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

  if (uniqueAssets.length <= 1) return null

  return (
    <InspectorSection title="Assets de la scène" tone="asset" className="surface-tonal">
      <div className="field-stack">
        <span className="field-label" style={{ marginBottom: '8px' }}>Information de l'asset en cours</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--md-sys-color-surface)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={selectedItem.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedItem.name || 'Asset sans nom'}
          </div>
        </div>
        <button type="button" className="secondary" onClick={onPickExisting} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          Remplacer par un asset existant
        </button>
      </div>
    </InspectorSection>
  )
}