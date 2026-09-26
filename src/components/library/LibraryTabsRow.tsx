import { FolderOpen, Plus, X } from 'lucide-react'

export type LibraryTab = { id: string, name: string }

export type LibraryTabsRowProps = {
  tabs: LibraryTab[]
  activeTabId: string | null
  libraryMessage: string
  onSelectTab: (tabId: string) => void
  onRemoveTab: (tabId: string) => void
  onAddTab: () => void
}

export function LibraryTabsRow({ tabs, activeTabId, libraryMessage, onSelectTab, onRemoveTab, onAddTab }: LibraryTabsRowProps) {
  return (
    <div className="library-tabs-row" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0 8px 8px 8px', overflowX: 'auto', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
      {tabs.map(tab => (
        <div key={tab.id} className={`library-tab ${activeTabId === tab.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: activeTabId === tab.id ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-highest)', color: activeTabId === tab.id ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => onSelectTab(tab.id)}>
          <FolderOpen size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{tab.name}</span>
          {activeTabId === tab.id && libraryMessage ? (
            <span className="status-pill" style={{ fontSize: '0.7rem', padding: '1px 6px', marginLeft: '4px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}>
              {libraryMessage}
            </span>
          ) : null}
          <button type="button" className="icon-button" style={{ width: '16px', height: '16px', padding: 0 }} onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.id) }} title="Supprimer cet onglet">
            <X size={12} />
          </button>
        </div>
      ))}
      <button type="button" className="button-like secondary" style={{ padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap', fontSize: '0.75rem' }} onClick={onAddTab}>
        <Plus size={14} />
        <span style={{ marginLeft: '4px' }}>Ajouter un onglet</span>
      </button>
    </div>
  )
}
