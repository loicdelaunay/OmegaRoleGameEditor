import { ColorPickerField } from '../../ColorPickerField'
import { InspectorSection } from '../../InspectorSection'

export type InspectorNoteTextSectionProps = {
  name: string
  noteVisibleToPlayers: boolean
  noteColor: string
  onNameChange: (value: string) => void
  onVisibilityChange: (visible: boolean) => void
  onColorChange: (color: string) => void
  palette: string[]
  onAddPreference: (color: string) => void
}

export function InspectorNoteTextSection({
  name,
  noteVisibleToPlayers,
  noteColor,
  onNameChange,
  onVisibilityChange,
  onColorChange,
  palette,
  onAddPreference,
}: InspectorNoteTextSectionProps) {
  return (
    <InspectorSection title="Texte de la Note" tone="identity" className="surface-tonal">
      <label>
        Texte affiché
        <textarea
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          style={{ minHeight: '80px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
          placeholder="Saisissez le texte de la note ici..."
        />
      </label>
      <label className="switch-field compact-field inline-switch md-switch-field" style={{ marginTop: '12px' }}>
        <span className="md-switch-label">Visible par les joueurs</span>
        <span className="md-switch-control">
          <input
            className="md-switch-input"
            type="checkbox"
            checked={noteVisibleToPlayers}
            onChange={(event) => onVisibilityChange(event.target.checked)}
          />
          <span className="md-switch-track">
            <span className="md-switch-thumb" />
          </span>
        </span>
      </label>
      <div style={{ marginTop: '12px' }}>
        <span className="field-label" style={{ marginBottom: '4px', display: 'block' }}>Couleur de la note</span>
        <ColorPickerField
          value={noteColor}
          onChange={onColorChange}
          palette={palette}
          onAddPreference={onAddPreference}
        />
      </div>
    </InspectorSection>
  )
}
