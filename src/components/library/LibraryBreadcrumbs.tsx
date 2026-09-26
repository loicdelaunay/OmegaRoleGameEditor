import { ChevronRight } from 'lucide-react'
import type { LibraryFolderNode } from '../../types/library'

export type LibraryBreadcrumbsProps = {
  breadcrumbs: LibraryFolderNode[]
  activeLibraryPath: string
  onSelect: (path: string) => void
}

export function LibraryBreadcrumbs({ breadcrumbs, activeLibraryPath, onSelect }: LibraryBreadcrumbsProps) {
  return (
    <div className="library-toolbar-breadcrumbs">
      {breadcrumbs.map((folder, index) => (
        <button
          key={folder.path || 'root'}
          type="button"
          className={folder.path === activeLibraryPath ? 'library-crumb active' : 'library-crumb'}
          onClick={() => onSelect(folder.path)}
        >
          {index > 0 ? <ChevronRight className="button-icon" strokeWidth={2.2} /> : null}
          <span>{folder.name}</span>
        </button>
      ))}
    </div>
  )
}
