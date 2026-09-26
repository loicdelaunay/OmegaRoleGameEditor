import { ChevronLeft, Layers3, Search, X } from 'lucide-react'

export type HierarchyToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddLayer: () => void
  onCollapse: () => void
}

export function HierarchyToolbar({ searchQuery, onSearchChange, onAddLayer, onCollapse }: HierarchyToolbarProps) {
  return (
    <>
      <div className="section-title-row">
        <h2>Hierarchie</h2>
        <div className="mini-actions">
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Ajouter un calque"
            aria-label="Ajouter un calque"
            onClick={onAddLayer}
          >
            <Layers3 className="button-icon" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Replier la hierarchie"
            aria-label="Replier la hierarchie"
            onClick={onCollapse}
          >
            <ChevronLeft className="button-icon" strokeWidth={2.2} />
          </button>
        </div>
      </div>
      <div style={{ padding: '0 12px 12px 12px' }}>
        <div className="md3-search-bar">
          <Search className="button-icon" size={18} strokeWidth={2.2} />
          <input
            type="search"
            placeholder="Rechercher..."
            aria-label="Rechercher dans la hiérarchie"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
