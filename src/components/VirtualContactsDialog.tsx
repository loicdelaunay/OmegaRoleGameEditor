import { useState, type FormEvent } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'

const COLOR_PRESETS = ['#d48b2a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#71717a']

type VirtualContact = {
  id: string
  name: string
  color: string
}

type VirtualContactsDialogProps = {
  isOpen: boolean
  onClose: () => void
  contacts: VirtualContact[]
  onCreate: (name: string, color: string) => void
  onUpdate: (id: string, name: string, color: string) => void
  onDelete: (id: string) => void
}

export function VirtualContactsDialog({
  isOpen,
  onClose,
  contacts,
  onCreate,
  onUpdate,
  onDelete,
}: VirtualContactsDialogProps) {
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState('#d48b2a')

  if (!isOpen) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draftName.trim()) return

    if (draftId) {
      onUpdate(draftId, draftName.trim(), draftColor)
    } else {
      onCreate(draftName.trim(), draftColor)
    }

    setDraftId(null)
    setDraftName('')
    setDraftColor('#d48b2a')
  }

  function handleEdit(contact: VirtualContact) {
    setDraftId(contact.id)
    setDraftName(contact.name)
    setDraftColor(contact.color)
  }

  function handleCancel() {
    setDraftId(null)
    setDraftName('')
    setDraftColor('#d48b2a')
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Gérer les contacts</h2>
              <div className="library-dialog-heading">
                <span className="library-dialog-kicker">
                  <Plus className="button-icon" strokeWidth={2.2} />
                  <span>Contacts PNJ virtuels</span>
                </span>
                <p className="helper">
                  Crée des personnages non-joueurs qui apparaîtront dans la liste des contacts du téléphone des joueurs.
                </p>
              </div>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="conn-dialog-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              Nom
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex: Aubergiste"
                required
              />
            </label>
            <div className="field-stack">
              <span className="field-label">Couleur</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="color"
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  style={{ width: 42, height: 42, padding: 0, cursor: 'pointer', border: 'none', background: 'transparent', flexShrink: 0 }}
                  title="Couleur personnalisee"
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDraftColor(preset)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: preset,
                        border: draftColor === preset ? '2px solid var(--md-sys-color-on-surface)' : '2px solid transparent',
                        padding: 0,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      title="Utiliser ce preset"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="action-row" style={{ justifyContent: 'flex-end', paddingBottom: 2 }}>
              {draftId && (
                <button type="button" className="ghost" onClick={handleCancel}>
                  Annuler
                </button>
              )}
              <button type="submit" className="primary">
                {draftId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>

          <div className="conn-dialog-presence surface-tonal" style={{ marginTop: '8px' }}>
            <span className="field-label">Liste des contacts virtuels ({contacts.length})</span>
            <div className="conn-dialog-presence-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {contacts.length === 0 ? (
                <p className="helper">Aucun contact virtuel.</p>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="presence-row">
                    <span className="swatch" style={{ backgroundColor: contact.color, width: 16, height: 16 }} />
                    <strong style={{ flex: 1 }}>{contact.name}</strong>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                      <button type="button" className="icon-button compact" title="Éditer" onClick={() => handleEdit(contact)}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="icon-button compact error" title="Supprimer" onClick={() => onDelete(contact.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
