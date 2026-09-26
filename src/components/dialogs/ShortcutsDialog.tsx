import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { KeyboardShortcut } from '../../types/shortcuts'

export type ShortcutsDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  visibleShortcuts: KeyboardShortcut[]
  searchQuery: string
  onSearchChange: (value: string) => void
  onClose: () => void
}

export function ShortcutsDialog({
  isOpen,
  backdropPointerDownRef,
  visibleShortcuts,
  searchQuery,
  onSearchChange,
  onClose,
}: ShortcutsDialogProps) {
  if (!isOpen) return null

  const query = searchQuery || ''
  const filtered = visibleShortcuts.filter(s => s.description.toLowerCase().includes(query) || s.label.toLowerCase().includes(query))
  const cats = new Set(filtered.map(s => s.category || 'Général'))

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base" onClick={(event) => event.stopPropagation()} style={{ width: '560px', maxWidth: '90vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Raccourcis</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div style={{ padding: '0 24px 12px 24px', flexShrink: 0, marginTop: '16px' }}>
          <input
            type="text"
            placeholder="Rechercher un raccourci..."
            autoFocus
            onChange={(e) => onSearchChange(e.target.value.toLowerCase())}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--md-sys-color-surface-container-highest)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '4px' }}
          />
        </div>
        <div className="conn-dialog-body shortcuts-list" style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from(cats).map(cat => (
            <div key={cat} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--md-sys-color-primary)', marginBottom: '8px' }}>{cat}</div>
              {filtered.filter(s => (s.category || 'Général') === cat).map((shortcut) => (
                <div key={shortcut.key} className="shortcut-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{shortcut.description}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {shortcut.label.split('+').map((part, i) => (
                      <span key={i} style={{ display: 'contents' }}>
                        {i > 0 && <span style={{ color: 'var(--md-sys-color-outline)', alignSelf: 'center', fontSize: '0.8rem' }}>+</span>}
                        <kbd style={{ background: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {part.trim()}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </section>
    </div>
  )
}
