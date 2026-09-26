import { useEffect, useState, useRef, memo, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LibraryAsset } from '../../types/library'
import type { LibraryDirectoryHandleLike } from '../../types/savePicker'

export const libraryAssetUrlCache = new Map<string, string>()

export function LazyAssetImage({ asset, rootHandle, alt, className }: { asset: LibraryAsset, rootHandle: LibraryDirectoryHandleLike, alt: string, className?: string }) {
  const [src, setSrc] = useState<string | null>(() => libraryAssetUrlCache.get(asset.id) || null)

  useEffect(() => {
    if (src) return

    let active = true
    getLibraryAssetFile(rootHandle, asset).then(file => {
      if (active && file) {
        const url = URL.createObjectURL(file)
        libraryAssetUrlCache.set(asset.id, url)
        setSrc(url)
      }
    }).catch(console.error)

    return () => {
      active = false
    }
  }, [asset, rootHandle, src])

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {src ? <img src={src} alt={alt} decoding="async" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : null}
    </div>
  )
}

const LibraryVirtualRow = memo(({
  virtualRow,
  columns,
  libraryPreviewSize,
  assets,
  rootHandle,
  importLibraryAsset
}: {
  virtualRow: any
  columns: number
  libraryPreviewSize: number
  assets: LibraryAsset[]
  rootHandle: LibraryDirectoryHandleLike
  importLibraryAsset: (asset: LibraryAsset, type: 'image' | 'token', useControl: boolean) => void
}) => {
  const startIndex = virtualRow.index * columns
  const rowAssets = assets.slice(startIndex, startIndex + columns)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(${libraryPreviewSize}px, 1fr))`,
        gap: '12px',
        paddingBottom: '12px',
        boxSizing: 'border-box'
      }}
    >
      {rowAssets.map((asset) => (
        <article key={asset.id} className="library-card surface-tonal">
          <LazyAssetImage asset={asset} rootHandle={rootHandle} alt={asset.name} className="library-preview" />
          <div className="library-meta">
            <strong>{asset.name}</strong>
            <span>{asset.folderPath || 'Racine'}</span>
          </div>
          <div className="mini-actions">
            <button
              type="button"
              className="secondary"
              onClick={(event) => void importLibraryAsset(asset, 'image', event.ctrlKey)}
            >
              Image
            </button>
            <button
              type="button"
              className="ghost"
              onClick={(event) => void importLibraryAsset(asset, 'token', event.ctrlKey)}
            >
              Pion
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}, (prev, next) => {
  return prev.virtualRow.index === next.virtualRow.index &&
    prev.virtualRow.start === next.virtualRow.start &&
    prev.columns === next.columns &&
    prev.libraryPreviewSize === next.libraryPreviewSize &&
    prev.assets === next.assets
})

export function LibraryVirtualGrid({
  assets,
  libraryPreviewSize,
  rootHandle,
  importLibraryAsset
}: {
  assets: LibraryAsset[],
  libraryPreviewSize: number,
  rootHandle: LibraryDirectoryHandleLike,
  importLibraryAsset: (asset: LibraryAsset, type: 'image' | 'token', useControl: boolean) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    if (!parentRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        const gap = 12
        const cols = Math.floor((width + gap) / (libraryPreviewSize + gap))
        setColumns(Math.max(1, cols))
      }
    })
    observer.observe(parentRef.current)
    return () => observer.disconnect()
  }, [libraryPreviewSize])

  const rowCount = Math.ceil(assets.length / columns)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => libraryPreviewSize + 86,
    overscan: 2,
  })

  return (
    <div ref={parentRef} className="library-assets" style={{ '--library-preview-size': `${libraryPreviewSize}px`, overflow: 'auto', minHeight: 0, display: 'block' } as CSSProperties}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <LibraryVirtualRow
            key={virtualRow.index}
            virtualRow={virtualRow}
            columns={columns}
            libraryPreviewSize={libraryPreviewSize}
            assets={assets}
            rootHandle={rootHandle}
            importLibraryAsset={importLibraryAsset}
          />
        ))}
      </div>
    </div>
  )
}

const dirHandleCache = new Map<string, LibraryDirectoryHandleLike>()

async function getLibraryAssetFile(rootHandle: LibraryDirectoryHandleLike, asset: LibraryAsset): Promise<File | null> {
  try {
    let currentHandle = rootHandle
    if (asset.folderPath) {
      const segments = asset.folderPath.split('/').filter(Boolean)
      let currentPath = ''
      for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment
        const cacheKey = `${rootHandle.name}_${currentPath}`
        if (dirHandleCache.has(cacheKey)) {
          currentHandle = dirHandleCache.get(cacheKey)!
        } else {
          currentHandle = await currentHandle.getDirectoryHandle(segment)
          dirHandleCache.set(cacheKey, currentHandle)
        }
      }
    }
    const fileHandle = await currentHandle.getFileHandle(asset.fileName)
    return await fileHandle.getFile()
  } catch (error) {
    console.error('Failed to get file handle for asset', asset, error)
    return null
  }
}
