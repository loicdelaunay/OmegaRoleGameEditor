import type { LibraryAsset, LibraryFolderNode } from '../types/library'

export function pruneEmptyLibraryFolders(folders: LibraryFolderNode[]): LibraryFolderNode[] {
  const result: LibraryFolderNode[] = []
  for (const folder of folders) {
    folder.folders = pruneEmptyLibraryFolders(folder.folders)
    if (folder.folders.length > 0 || folder.assets.length > 0) {
      result.push(folder)
    }
  }
  return result
}

export function createLibraryAsset(file: File, folderPath: string): LibraryAsset {
  return {
    id: `${folderPath}:${file.name}:${file.lastModified}`,
    name: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    folderPath,
  }
}

export function isLibraryFileSupported(fileName: string) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)
}

export function findLibraryFolder(root: LibraryFolderNode, path: string): LibraryFolderNode | null {
  if (!path || root.path === path) {
    return root
  }

  for (const folder of root.folders) {
    const match = findLibraryFolder(folder, path)
    if (match) {
      return match
    }
  }

  return null
}

export function buildLibraryBreadcrumbs(root: LibraryFolderNode, path: string) {
  const breadcrumbs: LibraryFolderNode[] = [root]
  if (!path) {
    return breadcrumbs
  }

  const segments = path.split('/').filter(Boolean)
  let current = root
  let currentPath = ''

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const next = current.folders.find((folder) => folder.path === currentPath)
    if (!next) {
      break
    }
    breadcrumbs.push(next)
    current = next
  }

  return breadcrumbs
}

export function searchLibraryAssets(folder: LibraryFolderNode, query: string): LibraryAsset[] {
  const matches = folder.assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(query) ||
      asset.folderPath.toLowerCase().includes(query),
  )

  for (const child of folder.folders) {
    const childMatches = searchLibraryAssets(child, query)
    for (let i = 0; i < childMatches.length; i++) {
      matches.push(childMatches[i])
    }
  }

  return matches.sort((left, right) => left.name.localeCompare(right.name))
}

export function collectLibraryFolders(folder: LibraryFolderNode, includeSelf = false): LibraryFolderNode[] {
  const folders = includeSelf ? [folder] : []

  for (const child of folder.folders) {
    folders.push(child)
    const childFolders = collectLibraryFolders(child)
    for (let i = 0; i < childFolders.length; i++) {
      folders.push(childFolders[i])
    }
  }

  return folders
}

export function countLibraryAssets(folder: LibraryFolderNode): number {
  return folder.assets.length + folder.folders.reduce((total, child) => total + countLibraryAssets(child), 0)
}

export function countLibraryFolders(folder: LibraryFolderNode): number {
  return folder.folders.length + folder.folders.reduce((total, child) => total + countLibraryFolders(child), 0)
}
