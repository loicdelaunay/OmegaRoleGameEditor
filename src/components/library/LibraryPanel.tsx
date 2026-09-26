import type { CSSProperties, RefObject } from 'react'
import { FloatingDialog } from '../FloatingDialog'
import { LibraryVirtualGrid } from './LibraryVirtualGrid'
import { LibraryTabsRow, type LibraryTab } from './LibraryTabsRow'
import { LibraryToolbar } from './LibraryToolbar'
import { LibraryCategories } from './LibraryCategories'
import type { LibraryAsset, LibraryFolderNode } from '../../types/library'
import type { LibraryDirectoryHandleLike } from '../../types/savePicker'

export type LibraryPanelProps = {
  isOpen: boolean
  onClose: () => void
  tabs: LibraryTab[]
  activeTabId: string | null
  libraryMessage: string
  onSelectTab: (tabId: string) => void
  onRemoveTab: (tabId: string) => void
  onAddTab: () => void
  isLoading: boolean
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  hasLibraryHandle: boolean
  onRelinkTab: (tabId: string) => void
  onRefreshTab: () => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  previewSize: number
  onPreviewSizeChange: (value: number) => void
  breadcrumbs: LibraryFolderNode[]
  shortcutFolders: LibraryFolderNode[]
  activeFolder: LibraryFolderNode | null
  filteredFolders: LibraryFolderNode[]
  filteredAssets: LibraryAsset[]
  activeLibraryPath: string
  onSelectPath: (path: string) => void
  rootHandleRef: RefObject<LibraryDirectoryHandleLike | null>
  onImportAsset: (asset: LibraryAsset, kind: 'image' | 'token', keepOpen?: boolean) => void
  countAssets: (folder: LibraryFolderNode) => number
}

export function LibraryPanel({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  libraryMessage,
  onSelectTab,
  onRemoveTab,
  onAddTab,
  isLoading,
  isSidebarCollapsed,
  onToggleSidebar,
  hasLibraryHandle,
  onRelinkTab,
  onRefreshTab,
  searchQuery,
  onSearchQueryChange,
  previewSize,
  onPreviewSizeChange,
  breadcrumbs,
  shortcutFolders,
  activeFolder,
  filteredFolders,
  filteredAssets,
  activeLibraryPath,
  onSelectPath,
  rootHandleRef,
  onImportAsset,
  countAssets,
}: LibraryPanelProps) {
  return (
    <FloatingDialog
      open={isOpen}
      onClose={onClose}
      title="Bibliotheque"
      initialSize={{ width: 800, height: 600 }}
      minWidth={400}
      minHeight={300}
      sectionStyle={{ border: '5px solid var(--md-sys-color-primary)', borderRadius: '12px' }}
      bodyClassName=""
      bodyStyle={{ overflow: 'visible', display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}
      dragCursor="grab"
      headerExtra={<>
        <LibraryTabsRow
          tabs={tabs}
          activeTabId={activeTabId}
          libraryMessage={libraryMessage}
          onSelectTab={onSelectTab}
          onRemoveTab={onRemoveTab}
          onAddTab={onAddTab}
        />
        {isLoading ? (
          <div className="md-linear-progress">
            <div className="md-linear-progress-bar"></div>
          </div>
        ) : null}
        <LibraryToolbar
          isLoading={isLoading}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
          activeTabId={activeTabId}
          hasLibraryHandle={hasLibraryHandle}
          onRelinkTab={onRelinkTab}
          onRefreshTab={onRefreshTab}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          previewSize={previewSize}
          onPreviewSizeChange={onPreviewSizeChange}
          breadcrumbs={breadcrumbs}
          activeLibraryPath={activeLibraryPath}
          onSelectPath={onSelectPath}
        />
      </>}
    >
      <div className="library-layout" style={isSidebarCollapsed ? { gridTemplateColumns: 'minmax(0, 1fr)' } : {}}>
        {!isSidebarCollapsed && (
          <LibraryCategories
            shortcutFolders={shortcutFolders}
            activeFolder={activeFolder}
            filteredFolders={filteredFolders}
            activeLibraryPath={activeLibraryPath}
            onSelectPath={onSelectPath}
            countAssets={countAssets}
          />
        )}
        {filteredAssets.length === 0 ? (
          <div className="library-assets" style={{ '--library-preview-size': `${previewSize}px`, display: 'block' } as CSSProperties}>
            <p className="helper">Aucun asset ne correspond a cet emplacement ou a la recherche.</p>
          </div>
        ) : (
          <LibraryVirtualGrid
            assets={filteredAssets}
            libraryPreviewSize={previewSize}
            rootHandle={rootHandleRef.current!}
            importLibraryAsset={onImportAsset}
          />
        )}
      </div>
    </FloatingDialog>
  )
}
