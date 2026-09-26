import type { TerrainLayer } from '../../../types/terrain'
import { InspectorSection } from '../../InspectorSection'

export type InspectorStructureSectionProps = {
  layerId: string
  locked: boolean
  layers: TerrainLayer[]
  onChange: (newLayerId: string) => void
}

export function InspectorStructureSection({ layerId, locked, layers, onChange }: InspectorStructureSectionProps) {
  return (
    <InspectorSection title="Structure" tone="structure" className="surface-tonal">
      <label>
        Calque
        <select
          value={layerId}
          disabled={locked}
          onChange={(event) => onChange(event.target.value)}
        >
          {layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
            </option>
          ))}
        </select>
      </label>
    </InspectorSection>
  )
}
