export type LibraryAsset = {
  id: string
  name: string
  fileName: string
  folderPath: string
}

export type LibraryFolderNode = {
  id: string
  name: string
  path: string
  folders: LibraryFolderNode[]
  assets: LibraryAsset[]
}
