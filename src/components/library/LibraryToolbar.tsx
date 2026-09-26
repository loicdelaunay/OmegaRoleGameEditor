import type { CSSProperties } from 'react'
import { FolderOpen, PanelLeft, PanelLeftClose, RefreshCw, Search } from 'lucide-react'
import { LibraryBreadcrumbs } from './LibraryBreadcrumbs'
import type { LibraryFolderNode } from '../../types/library'

export type LibraryToolbarProps = {
  isLoading: boolean
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  activeTabId: string | null
  hasLibraryHandle: boolean
  onRelinkTab: (tabId: string) => void
  onRefreshTab: () => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  previewSize: number
  onPreviewSizeChange: (value: number) => void
  breadcrumbs: LibraryFolderNode[]
  activeLibraryPath: string
  onSelectPath: (path: string) => void
}

export function LibraryToolbar({
  isLoading,
  isSidebarCollapsed,
  onToggleSidebar,
  activeTabId,
  hasLibraryHandle,
  onRelinkTab,
  onRefreshTab,
  searchQuery,
  onSearchQueryChange,
  previewSize,
  onPreviewSizeChange,
  breadcrumbs,
  activeLibraryPath,
  onSelectPath,
}: LibraryToolbarProps) {
  return (
    <div className="library-toolbar surface-base">
      <button
        type="button"
        className="ghost compact-icon-button"
        title={isSidebarCollapsed ? "Afficher les dossiers" : "Masquer les dossiers"}
        onClick={onToggleSidebar}
      >
        {isSidebarCollapsed ? <PanelLeft className="button-icon" strokeWidth={2.2} /> : <PanelLeftClose className="button-icon" strokeWidth={2.2} />}
      </button>
      {activeTabId && !hasLibraryHandle ? (
        <button
          type="button"
          className="secondary library-folder-button"
          title="Relier le dossier"
          onClick={() => void onRelinkTab(activeTabId)}
          disabled={isLoading}
        >
          <span className="button-content">
            <FolderOpen className="button-icon" strokeWidth={2.2} />
            <span>Relier le dossier</span>
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className="ghost compact-icon-button"
        title="Actualiser la bibliotheque"
        aria-label="Actualiser la bibliotheque"
        onClick={() => void onRefreshTab()}
        disabled={isLoading || !hasLibraryHandle}
      >
        <RefreshCw className="button-icon" strokeWidth={2.2} />
      </button>
      <div className="library-search-field library-search-field-toolbar">
        <Search className="button-icon" strokeWidth={2.2} />
        <input
          value={searchQuery}
          placeholder="Nom de dossier ou d asset"
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>
      <label className="library-preview-size-control">
        <span className="library-preview-size-label">Preview</span>
        <input
          type="range"
          min="120"
          max="260"
          step="10"
          value={previewSize}
          style={{ '--range-value': `${((previewSize - 120) / 140) * 100}%` } as CSSProperties}
          onChange={(event) => onPreviewSizeChange(Number(event.target.value))}
        />
      </label>
      {isSidebarCollapsed && (
        <LibraryBreadcrumbs
          breadcrumbs={breadcrumbs}
          activeLibraryPath={activeLibraryPath}
          onSelect={onSelectPath}
        />
      )}
    </div>
  )
}
