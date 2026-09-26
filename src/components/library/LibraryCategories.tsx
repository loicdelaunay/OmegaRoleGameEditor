import { Folder } from 'lucide-react'
import type { LibraryFolderNode } from '../../types/library'

export type LibraryCategoriesProps = {
  shortcutFolders: LibraryFolderNode[]
  activeFolder: LibraryFolderNode | null
  filteredFolders: LibraryFolderNode[]
  activeLibraryPath: string
  onSelectPath: (path: string) => void
  countAssets: (folder: LibraryFolderNode) => number
}

export function LibraryCategories({
  shortcutFolders,
  activeFolder,
  filteredFolders,
  activeLibraryPath,
  onSelectPath,
  countAssets,
}: LibraryCategoriesProps) {
  return (
    <aside className="library-categories">
      {shortcutFolders.length > 0 ? (
        <div className="library-shortcuts">
          {shortcutFolders.map((folder) => (
            <button
              key={`shortcut-${folder.path || 'root'}`}
              type="button"
              className={folder.path === activeLibraryPath ? 'library-shortcut active' : 'library-shortcut'}
              onClick={() => onSelectPath(folder.path)}
            >
              <span className="library-folder-name">
                <Folder className="button-icon" strokeWidth={2.2} />
                <span>{folder.name}</span>
              </span>
              <span>{countAssets(folder)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {!activeFolder ? (
        <p className="helper">Aucune bibliotheque chargee.</p>
      ) : (
        filteredFolders.length === 0 ? (
          <p className="helper">Aucun sous-dossier dans cet emplacement.</p>
        ) : (
          filteredFolders.map((folder) => (
            <button
              key={folder.path}
              type="button"
              className={folder.path === activeLibraryPath ? 'library-category active' : 'library-category'}
              onClick={() => onSelectPath(folder.path)}
            >
              <span className="library-folder-name">
                <Folder className="button-icon" strokeWidth={2.2} />
                <span>{folder.name}</span>
              </span>
              <span>{countAssets(folder)}</span>
            </button>
          ))
        )
      )}
    </aside>
  )
}
