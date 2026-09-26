import type { RefObject } from 'react'
import { Search } from 'lucide-react'

export type InspectorSearchBarProps = {
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
}

export function InspectorSearchBar({ inputRef, value, onChange }: InspectorSearchBarProps) {
  return (
    <div className="inspector-search-row">
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder="Rechercher une section de l inspecteur"
        aria-label="Rechercher une section de l inspecteur"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="ghost compact-icon-button inspector-search-button"
        title="Rechercher dans l inspecteur"
        aria-label="Rechercher dans l inspecteur"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="button-icon" strokeWidth={2.2} />
      </button>
    </div>
  )
}
