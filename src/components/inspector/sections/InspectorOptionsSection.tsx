import { InspectorSection } from '../../InspectorSection'

export type InspectorOptionsSectionProps = {
  ignoreBuildingMode: boolean
  onIgnoreBuildingModeChange: (value: boolean) => void
}

export function InspectorOptionsSection({ ignoreBuildingMode, onIgnoreBuildingModeChange }: InspectorOptionsSectionProps) {
  return (
    <InspectorSection title="Options" tone="settings" className="surface-tonal">
      <div className="field-row">
        <label className="switch-field compact-field inline-switch md-switch-field" style={{ flex: 1 }}>
          <span className="md-switch-label">Ignorer le mode bâtiment</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={ignoreBuildingMode}
              onChange={(event) => onIgnoreBuildingModeChange(event.target.checked)}
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
      </div>
    </InspectorSection>
  )
}
