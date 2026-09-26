import type { CSSProperties, DragEvent as ReactDragEvent } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  LocateFixed,
  Plus,
  RefreshCw,
  Shuffle,
  X,
} from 'lucide-react'
import type { TerrainDocument, TokenAssignment, TurnTrackerEntry, TurnTrackerState } from '../../types/terrain'

export type TurnTrackerPanelProps = {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean | ((current: boolean) => boolean)) => void
  position: { x: number; y: number } | null
  startPanelDrag: (panel: 'turnTracker', clientX: number, clientY: number) => void
  turnTracker: TurnTrackerState
  turnTrackerDraftLabel: string
  setTurnTrackerDraftLabel: (value: string) => void
  displayedTurnTrackerEntries: TurnTrackerEntry[]
  currentTurnEntry: TurnTrackerEntry | null
  draggedTurnEntryId: string | null
  dragOverTurnEntryId: string | null
  setDraggedTurnEntryId: (value: string | null) => void
  setDragOverTurnEntryId: (value: string | null) => void
  isHost: boolean
  currentPlayerIdentityId: string | null
  tokenAssignments: Record<string, TokenAssignment>
  terrain: TerrainDocument
  setStatusMessage: (message: string) => void
  sendTurnTrackerCommand: (payload: Record<string, unknown>) => void
  addCustomTurnTrackerEntry: () => void
  focusHierarchyItem: (itemId: string) => void
}

type RowProps = {
  entry: TurnTrackerEntry
  index: number
  isActive: boolean
  isDragged: boolean
  isDragOver: boolean
  isHost: boolean
  canEditOwnPoints: boolean
  draggedTurnEntryId: string | null
  onDragStart: (entryId: string, e: ReactDragEvent<HTMLDivElement>) => void
  onDragOver: (entryId: string, e: ReactDragEvent<HTMLDivElement>) => void
  onDragLeave: (entryId: string) => void
  onDrop: (entryId: string, e: ReactDragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onSetCurrent: () => void
  onFocusToken: () => void
  onTogglePoint: (pointType: 'action' | 'movement' | 'intervention') => void
  onRemoveEntry: () => void
}

function TurnTrackerEntryRow({
  entry,
  index,
  isActive,
  isDragged,
  isDragOver,
  isHost,
  canEditOwnPoints,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSetCurrent,
  onFocusToken,
  onTogglePoint,
  onRemoveEntry,
}: RowProps) {
  return (
    <div
      className={`turn-tracker-row surface-tonal ${isActive ? 'active' : ''}`}
      style={{ opacity: isDragged ? 0.5 : 1, transform: isDragOver ? 'translateY(2px)' : 'none', transition: 'all 0.2s', flexWrap: 'nowrap' }}
      draggable={isHost}
      onDragStart={(e) => onDragStart(entry.id, e)}
      onDragOver={(e) => onDragOver(entry.id, e)}
      onDragLeave={() => onDragLeave(entry.id)}
      onDrop={(e) => onDrop(entry.id, e)}
      onDragEnd={onDragEnd}
      onClick={onSetCurrent}
    >
      {isHost ? (
        <div className="turn-tracker-drag-handle">
          <GripVertical size={14} />
        </div>
      ) : (
        <div />
      )}
      <span className="turn-tracker-order">{index + 1}</span>
      <span className="turn-tracker-swatch" style={{ background: entry.color }} />
      <div className="turn-tracker-row-body" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <strong style={{ display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{entry.label}</strong>
        <span style={{ display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{entry.kind === 'player' ? 'Joueur' : 'Entree custom'}</span>
      </div>
      <div className="turn-tracker-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="turn-tracker-actions" style={{ display: 'flex', flexShrink: 0 }}>
          {isHost ? (
            <button
              type="button"
              className="ghost compact-icon-button"
              title="Focus sur le pion (Ctrl+F)"
              aria-label="Focus sur le pion"
              onClick={(event) => {
                event.stopPropagation()
                onFocusToken()
              }}
            >
              <LocateFixed className="button-icon" strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
        {entry.kind === 'player' ? (
          (() => {
            const points = entry.points ?? { action: true, movement: true, intervention: true }
            return (
              <div className="turn-tracker-points" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  className={`point-toggle ${points.action ? 'active' : ''}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: points.action ? '#ef4444' : 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: points.action ? '#ffffff' : 'var(--md-sys-color-on-surface-variant)',
                    cursor: isHost || canEditOwnPoints ? 'pointer' : 'default',
                    opacity: points.action ? 1 : 0.5,
                  }}
                  title="Point d'action"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isHost || canEditOwnPoints) onTogglePoint('action')
                  }}
                >
                  A
                </button>
                <button
                  type="button"
                  className={`point-toggle ${points.movement ? 'active' : ''}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: points.movement ? '#22c55e' : 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: points.movement ? '#ffffff' : 'var(--md-sys-color-on-surface-variant)',
                    cursor: isHost || canEditOwnPoints ? 'pointer' : 'default',
                    opacity: points.movement ? 1 : 0.5,
                  }}
                  title="Point de mouvement"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isHost || canEditOwnPoints) onTogglePoint('movement')
                  }}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`point-toggle ${points.intervention ? 'active' : ''}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: points.intervention ? '#3b82f6' : 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: points.intervention ? '#ffffff' : 'var(--md-sys-color-on-surface-variant)',
                    cursor: isHost || canEditOwnPoints ? 'pointer' : 'default',
                    opacity: points.intervention ? 1 : 0.5,
                  }}
                  title="Point d'intervention"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isHost || canEditOwnPoints) onTogglePoint('intervention')
                  }}
                >
                  I
                </button>
              </div>
            )
          })()
        ) : null}
        <div className="turn-tracker-remove-container" style={{ display: 'flex', flexShrink: 0 }}>
          {isHost && entry.kind === 'custom' ? (
            <button
              type="button"
              className="ghost compact-icon-button turn-tracker-remove"
              title="Retirer cette entree"
              aria-label="Retirer cette entree"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveEntry()
              }}
            >
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function TurnTrackerPanel({
  isCollapsed,
  setIsCollapsed,
  position,
  startPanelDrag,
  turnTracker,
  turnTrackerDraftLabel,
  setTurnTrackerDraftLabel,
  displayedTurnTrackerEntries,
  currentTurnEntry,
  draggedTurnEntryId,
  dragOverTurnEntryId,
  setDraggedTurnEntryId,
  setDragOverTurnEntryId,
  isHost,
  currentPlayerIdentityId,
  tokenAssignments,
  terrain,
  setStatusMessage,
  sendTurnTrackerCommand,
  addCustomTurnTrackerEntry,
  focusHierarchyItem,
}: TurnTrackerPanelProps) {
  return (
    <aside
      className={isCollapsed ? 'turn-tracker-panel card surface-base collapsed' : 'turn-tracker-panel card surface-base'}
      style={position ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      <div
        className="turn-tracker-header"
        onPointerDown={(event) => startPanelDrag('turnTracker', event.clientX, event.clientY)}
        style={{ cursor: 'grab' }}
      >
        <div className="turn-tracker-header-main">
          <span className="turn-tracker-kicker">Ordre de tour</span>
          {isCollapsed && currentTurnEntry?.kind === 'player' ? (
            <div className="turn-tracker-collapsed-current">
              <strong>A jouer</strong>
              <span
                className="turn-tracker-chip"
                style={{ backgroundColor: currentTurnEntry.color, borderColor: currentTurnEntry.color } as CSSProperties}
              >
                {currentTurnEntry.label}
              </span>
            </div>
          ) : (
            <strong>{currentTurnEntry ? `A jouer: ${currentTurnEntry.label}` : 'Aucun combattant actif'}</strong>
          )}
        </div>
        <div className="turn-tracker-header-actions">
          <span className="turn-tracker-round-pill">Tour {Math.max(1, turnTracker.round)}</span>
          <button
            type="button"
            className="ghost compact-icon-button"
            title={isCollapsed ? 'Agrandir le panneau d ordre du tour' : 'Reduire le panneau d ordre du tour'}
            aria-label={isCollapsed ? 'Agrandir le panneau d ordre du tour' : 'Reduire le panneau d ordre du tour'}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronUp className="button-icon" strokeWidth={2.2} /> : <ChevronDown className="button-icon" strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {!isCollapsed && isHost ? (
        <div className="turn-tracker-controls">
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Joueur precedent"
            aria-label="Joueur precedent"
            onClick={() => sendTurnTrackerCommand({ action: 'previous' })}
          >
            <ChevronLeft className="button-icon" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Melanger l ordre"
            aria-label="Melanger l ordre"
            onClick={() => sendTurnTrackerCommand({ action: 'shuffle' })}
          >
            <Shuffle className="button-icon" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Reinitialiser les points de tous les joueurs"
            aria-label="Reinitialiser les points de tous les joueurs"
            onClick={() => sendTurnTrackerCommand({ action: 'resetPoints' })}
          >
            <RefreshCw className="button-icon" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="ghost compact-icon-button"
            title="Joueur suivant"
            aria-label="Joueur suivant"
            onClick={() => sendTurnTrackerCommand({ action: 'next' })}
          >
            <ChevronRight className="button-icon" strokeWidth={2.2} />
          </button>
        </div>
      ) : null}

      {!isCollapsed && isHost ? (
        <div className="turn-tracker-add-row">
          <input
            value={turnTrackerDraftLabel}
            placeholder="Ajouter ennemi, piege, tourelle..."
            onChange={(event) => setTurnTrackerDraftLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              addCustomTurnTrackerEntry()
            }}
          />
          <button type="button" className="secondary compact-icon-button" onClick={addCustomTurnTrackerEntry}>
            <Plus className="button-icon" strokeWidth={2.2} />
          </button>
        </div>
      ) : null}

      {!isCollapsed ? (
        <div className="turn-tracker-list">
          {displayedTurnTrackerEntries.length === 0 ? (
            <p className="helper">Aucun joueur connecte ni entree custom dans l ordre de tour.</p>
          ) : (
            displayedTurnTrackerEntries.map((entry, index) => {
              const isActive = entry.id === currentTurnEntry?.id
              const isDragged = draggedTurnEntryId === entry.id
              const isDragOver = dragOverTurnEntryId === entry.id
              const canEditOwnPoints = entry.kind === 'player' && entry.playerId === currentPlayerIdentityId
              return (
                <TurnTrackerEntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isActive={isActive}
                  isDragged={isDragged}
                  isDragOver={isDragOver}
                  isHost={isHost}
                  canEditOwnPoints={canEditOwnPoints}
                  draggedTurnEntryId={draggedTurnEntryId}
                  onDragStart={(entryId, e) => {
                    if (!isHost) return
                    setDraggedTurnEntryId(entryId)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(entryId, e) => {
                    if (!isHost) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverTurnEntryId(entryId)
                  }}
                  onDragLeave={(entryId) => {
                    if (dragOverTurnEntryId === entryId) setDragOverTurnEntryId(null)
                  }}
                  onDrop={(entryId, e) => {
                    if (!isHost) return
                    e.preventDefault()
                    setDragOverTurnEntryId(null)
                    if (draggedTurnEntryId && draggedTurnEntryId !== entryId) {
                      sendTurnTrackerCommand({ action: 'reorder', sourceId: draggedTurnEntryId, targetId: entryId })
                    }
                    setDraggedTurnEntryId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedTurnEntryId(null)
                    setDragOverTurnEntryId(null)
                  }}
                  onSetCurrent={() => {
                    if (!isHost) return
                    sendTurnTrackerCommand({ action: 'setCurrent', entryId: entry.id })
                  }}
                  onFocusToken={() => {
                    let targetTokenId: string | null = null
                    if (entry.kind === 'player') {
                      const assignment = Object.entries(tokenAssignments).find(([_, a]) => a.playerId === entry.playerId)
                      if (assignment) targetTokenId = assignment[0]
                    } else if (entry.kind === 'custom') {
                      const matchingItem = terrain.items.find((i) => i.kind === 'token' && i.name === entry.label)
                      if (matchingItem) targetTokenId = matchingItem.id
                    }
                    if (targetTokenId) {
                      focusHierarchyItem(targetTokenId)
                    } else {
                      setStatusMessage('Aucun pion lie trouve.')
                    }
                  }}
                  onTogglePoint={(pointType) => {
                    sendTurnTrackerCommand({ action: 'togglePoint', entryId: entry.id, pointType })
                  }}
                  onRemoveEntry={() => {
                    sendTurnTrackerCommand({ action: 'removeEntry', entryId: entry.id })
                  }}
                />
              )
            })
          )}
        </div>
      ) : null}
    </aside>
  )
}
