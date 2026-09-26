import type { DragEvent as ReactDragEvent, KeyboardEvent } from 'react'
import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, LockOpen, Trash2, Image as ImageIcon, User, SquareDashed, Volume2, Lightbulb, StickyNote, Folder } from 'lucide-react'
import type { TerrainItem, TerrainItemKind } from '../types/terrain'

type HierarchyNode = {
  item: TerrainItem
  children: HierarchyNode[]
}

type HierarchyDropIndicator = {
  mode: 'before' | 'child' | 'layer-root'
  targetItemId: string | null
  layerId: string
} | null

type HierarchyItemViewProps = {
  node: HierarchyNode
  selectedItemIds: string[]
  dropIndicator: HierarchyDropIndicator
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
  onContextMenu: (event: React.MouseEvent, itemId: string) => void
}

export function getKindIcon(kind: TerrainItemKind) {
  const props = { className: 'tree-item-kind-icon', strokeWidth: 2.2, size: 16 }
  switch (kind) {
    case 'image': return <ImageIcon {...props} style={{ color: 'var(--hierarchy-color-image)' }} />
    case 'token': return <User {...props} style={{ color: 'var(--hierarchy-color-token)' }} />
    case 'shadow': return <SquareDashed {...props} style={{ color: 'var(--hierarchy-color-shadow)' }} />
    case 'audio': return <Volume2 {...props} style={{ color: 'var(--hierarchy-color-audio)' }} />
    case 'light': return <Lightbulb {...props} style={{ color: 'var(--hierarchy-color-light)' }} />
    case 'note': return <StickyNote {...props} style={{ color: 'var(--hierarchy-color-note)' }} />
    case 'empty': return <Folder {...props} style={{ color: 'var(--hierarchy-color-empty)' }} />
    default: return null
  }
}

function hasAnyChildSelected(node: HierarchyNode, selectedItemIds: string[]): boolean {
  return node.children.some(child => selectedItemIds.includes(child.item.id) || hasAnyChildSelected(child, selectedItemIds))
}

export function HierarchyItemView({
  node,
  selectedItemIds,
  dropIndicator,
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
  onContextMenu,
}: HierarchyItemViewProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const hasPersistentControls = !node.item.visible || node.item.locked
  const hasChildren = node.children.length > 0
  const [isExpanded, setIsExpanded] = useState(true)
  const isSelected = selectedItemIds.includes(node.item.id)
  const isDropBefore = dropIndicator?.targetItemId === node.item.id && dropIndicator.mode === 'before'
  const isDropChild = dropIndicator?.targetItemId === node.item.id && dropIndicator.mode === 'child'
  const hasSelectedChild = !isSelected && hasAnyChildSelected(node, selectedItemIds)

  return (
    <div className="tree-node" id={`hierarchy-item-${node.item.id}`}>
      <div
        draggable
        className={[
          isSelected ? 'tree-item active' : 'tree-item',
          hasPersistentControls ? 'has-persistent-controls' : '',
          hasSelectedChild ? 'has-selected-child' : '',
          isDropBefore ? 'drop-before' : '',
          isDropChild ? 'drop-child' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => onSelect(node.item.id, event.ctrlKey || event.metaKey, event.shiftKey)}
        onContextMenu={(event) => onContextMenu(event, node.item.id)}
        onDoubleClick={() => onFocusItem(node.item.id)}
        onKeyDown={(event) => {
          if (event.key === 'F2') {
            event.preventDefault()
            setRenameDraft(node.item.name)
            setIsRenaming(true)
            requestAnimationFrame(() => renameInputRef.current?.select())
          }
        }}
        onDragStart={(event) => onDragStart(event, node.item.id)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOverItem(event, node.item)}
        onDrop={(event) => {
          if (dropIndicator?.targetItemId === node.item.id && dropIndicator.mode === 'before') {
            onDropBefore(event, node.item)
            return
          }

          onDropAsChild(event, node.item)
        }}
      >
        <div className="tree-item-main">
          {hasChildren ? (
            <button
              type="button"
              className="tree-item-expand-toggle"
              title={isExpanded ? 'Replier les enfants' : 'Afficher les enfants'}
              aria-label={isExpanded ? 'Replier les enfants' : 'Afficher les enfants'}
              aria-expanded={isExpanded}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsExpanded((current) => !current)
              }}
            >
              {isExpanded ? <ChevronDown className="button-icon" strokeWidth={2.2} /> : <ChevronRight className="button-icon" strokeWidth={2.2} />}
            </button>
          ) : (
            <span className="tree-item-expand-spacer" aria-hidden="true" />
          )}
          {getKindIcon(node.item.kind)}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="tree-item-rename-input"
              value={renameDraft}
              autoFocus
              onChange={(event) => setRenameDraft(event.target.value)}
              onBlur={() => {
                const trimmed = renameDraft.trim()
                if (trimmed) onRename(node.item.id, trimmed)
                setIsRenaming(false)
              }}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                event.stopPropagation()
                if (event.key === 'Enter') {
                  const trimmed = renameDraft.trim()
                  if (trimmed) onRename(node.item.id, trimmed)
                  setIsRenaming(false)
                } else if (event.key === 'Escape') {
                  setIsRenaming(false)
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <span
              className="tree-item-label"
              onDoubleClick={(event) => {
                event.stopPropagation()
                setRenameDraft(node.item.name)
                setIsRenaming(true)
                requestAnimationFrame(() => renameInputRef.current?.select())
              }}
            >
              {node.item.name}
            </span>
          )}
        </div>
        <div className={hasPersistentControls ? 'tree-item-toolbar mini-actions has-active-state' : 'tree-item-toolbar mini-actions'}>
          <button
            type="button"
            className="ghost compact-icon-button"
            title={node.item.visible ? 'Masquer' : 'Afficher'}
            aria-label={node.item.visible ? 'Masquer' : 'Afficher'}
            onClick={(event) => {
              event.stopPropagation()
              onToggleVisibility(node.item.id)
            }}
          >
            {node.item.visible ? <Eye className="button-icon" strokeWidth={2.2} /> : <EyeOff className="button-icon" strokeWidth={2.2} />}
          </button>
          <button
            type="button"
            className={node.item.locked ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
            title={node.item.locked ? 'Deverrouiller' : 'Verrouiller'}
            aria-label={node.item.locked ? 'Deverrouiller' : 'Verrouiller'}
            onClick={(event) => {
              event.stopPropagation()
              onToggleLock(node.item.id)
            }}
          >
            {node.item.locked ? <Lock className="button-icon" strokeWidth={2.2} /> : <LockOpen className="button-icon" strokeWidth={2.2} />}
          </button>
          <button
            type="button"
            className="ghost danger compact-icon-button"
            title="Supprimer"
            aria-label="Supprimer"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(node.item.id)
            }}
          >
            <Trash2 className="button-icon" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <div className="tree-children">
          {node.children.map((child) => (
            <HierarchyItemView
              key={child.item.id}
              node={child}
              selectedItemIds={selectedItemIds}
              dropIndicator={dropIndicator}
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
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}