import { BufferedNumberField } from '../../BufferedNumberField'
import { ColorPickerField } from '../../ColorPickerField'
import { InspectorSection } from '../../InspectorSection'

export type InspectorOutlineSectionProps = {
  outlineDraftEnabled: boolean
  outlineDraftColor: string
  outlineDraftWidth: number
  onEnabledChange: (value: boolean) => void
  onColorChange: (color: string) => void
  onWidthChange: (value: number) => void
  onApply: () => void
  onClear: () => void
  palette: string[]
  onAddPreference: (color: string) => void
  clamp: (value: number, min: number, max: number) => number
}

export function InspectorOutlineSection({
  outlineDraftEnabled,
  outlineDraftColor,
  outlineDraftWidth,
  onEnabledChange,
  onColorChange,
  onWidthChange,
  onApply,
  onClear,
  palette,
  onAddPreference,
  clamp,
}: InspectorOutlineSectionProps) {
  return (
    <InspectorSection title="Contour" tone="asset" className="surface-tonal">
      <div className="field-stack outline-section">
        <span className="field-label">Outline</span>
        <div className="outline-top-row">
          <label className="switch-field compact-field inline-switch md-switch-field outline-toggle-row">
            <span className="md-switch-label">Activer l outline</span>
            <span className="md-switch-control">
              <input
                className="md-switch-input"
                type="checkbox"
                checked={outlineDraftEnabled}
                onChange={(event) => onEnabledChange(event.target.checked)}
              />
              <span className="md-switch-track">
                <span className="md-switch-thumb" />
              </span>
            </span>
          </label>
          <div className="field-stack outline-color-field">
            <span className="field-label">Couleur</span>
            <ColorPickerField
              value={outlineDraftColor}
              palette={palette}
              onChange={onColorChange}
              onAddPreference={onAddPreference}
            />
          </div>
        </div>
        <label>
          Epaisseur
          <BufferedNumberField
            min={0}
            max={24}
            step={1}
            fractionDigits={0}
            value={outlineDraftWidth}
            onChange={(nextValue) => onWidthChange(clamp(Math.round(nextValue || 0), 0, 24))}
          />
        </label>
        <div className="action-row outline-action-row">
          <button type="button" className="secondary" onClick={onApply}>
            Apply
          </button>
          <button type="button" className="ghost" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </InspectorSection>
  )
}
