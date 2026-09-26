import type { LibraryFolderNode } from '../types/library'

export type LibraryProgressContext = {
  lastTime: number
  onProgress?: (root: LibraryFolderNode) => void
  rootNode: LibraryFolderNode
}

export function triggerLibraryProgress(ctx: LibraryProgressContext) {
  if (!ctx.onProgress) return
  const now = Date.now()
  if (now - ctx.lastTime > 300) {
    ctx.lastTime = now
    ctx.onProgress({ ...ctx.rootNode })
  }
}
