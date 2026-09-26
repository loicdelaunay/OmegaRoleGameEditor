export type SaveFileHandleLike = {
  getFile?: () => Promise<File>
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
  }>
}

export type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: Array<{
      description: string
      accept: Record<string, string[]>
    }>
  }) => Promise<SaveFileHandleLike>
  showOpenFilePicker?: (options: {
    types: Array<{
      description: string
      accept: Record<string, string[]>
    }>
  }) => Promise<SaveFileHandleLike[]>
}

export type LibraryFileHandleLike = {
  kind: 'file'
  name: string
  getFile: () => Promise<File>
  createWritable?: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>
}

export type LibraryDirectoryHandleLike = {
  kind: 'directory'
  name: string
  entries: () => AsyncIterable<[string, LibraryDirectoryHandleLike | LibraryFileHandleLike]>
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<LibraryDirectoryHandleLike>
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<LibraryFileHandleLike>
}
