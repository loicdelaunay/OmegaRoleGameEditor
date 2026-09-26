import { InspectorSection } from '../../InspectorSection'

export type InspectorIdentityNameSectionProps = {
  name: string
  onChange: (value: string) => void
}

export function InspectorIdentityNameSection({ name, onChange }: InspectorIdentityNameSectionProps) {
  return (
    <InspectorSection title="Nom" tone="identity" className="surface-tonal">
      <label>
        Nom
        <input
          value={name}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </InspectorSection>
  )
}
