import { HierarchyItemView } from '../HierarchyItemView'
import type { HierarchyNode, HierarchyDropIndicator } from '../../types/hierarchy'
import type { DragEvent as ReactDragEvent } from 'react'
import type { TerrainItem } from '../../types/terrain'

export type HierarchyItemListProps = {
  nodes: HierarchyNode[]
  selectedItemIds: string[]
  dropIndicator: HierarchyDropIndicator
  onContextMenu: (event: React.MouseEvent, itemId: string) => void
  onSelect: (itemId: string, isCtrl: boolean, isShift: boolean) => void
  onFocusItem: (itemId: string) => void
  onRename: (itemId: string, name: string) => void
  onToggleVisibility: (itemId: string) => void
  onToggleLock: (itemId: string) => void
  onDelete: (itemId: string) => void
  onDragStart: (event: ReactDragEvent<HTMLDivElement>, itemId: string) => void
  onDragEnd: () => void
  onDragOverItem: (event: ReactDragEvent, item: TerrainItem) => void
  onDropBefore: (event: ReactDragEvent, targetItem: TerrainItem) => void
  onDropAsChild: (event: ReactDragEvent, parentItem: TerrainItem) => void
}

export function HierarchyItemList({
  nodes,
  selectedItemIds,
  dropIndicator,
  onContextMenu,
  onSelect,
  onFocusItem,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDropBefore,
  onDropAsChild,
}: HierarchyItemListProps) {
  if (nodes.length === 0) {
    return <p className="helper">Aucun element dans ce calque.</p>
  }

  return (
    <>
      {nodes.map((node) => (
        <HierarchyItemView
          key={node.item.id}
          node={node}
          selectedItemIds={selectedItemIds}
          dropIndicator={dropIndicator}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
          onFocusItem={onFocusItem}
          onRename={onRename}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onDelete={onDelete}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOverItem={onDragOverItem}
          onDropBefore={onDropBefore}
          onDropAsChild={onDropAsChild}
        />
      ))}
    </>
  )
}
