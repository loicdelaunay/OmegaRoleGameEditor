import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { RoomJoinConfig } from '../../types/terrain'

export type PredeclaredPlayerDialogProps = {
  open: boolean
  joinConfig: RoomJoinConfig | null
  selectedPredeclaredPlayerId: string
  isJoinConfigLoading: boolean
  backdropPointerDownRef: RefObject<boolean>
  onClose: () => void
  onSelectPlayer: (id: string) => void
  onConfirm: () => void
}

export function PredeclaredPlayerDialog({
  open,
  joinConfig,
  selectedPredeclaredPlayerId,
  isJoinConfigLoading,
  backdropPointerDownRef,
  onClose,
  onSelectPlayer,
  onConfirm
}: PredeclaredPlayerDialogProps) {
  if (!open || !joinConfig?.preallocationEnabled) {
    return null
  }

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base" onClick={(event) => event.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Choisir un joueur</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body">
          <label>
            Joueur pre-alloue
            <select
              value={selectedPredeclaredPlayerId}
              onChange={(event) => onSelectPlayer(event.target.value)}
              disabled={isJoinConfigLoading}
            >
              <option value="">Choisir un joueur</option>
              {joinConfig.predeclaredPlayers.map((player) => (
                <option key={player.id} value={player.id} disabled={Boolean(player.connectedPlayerId)}>
                  {player.name}
                  {player.connectedPlayerId ? ' (deja pris)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="primary"
            disabled={isJoinConfigLoading || !selectedPredeclaredPlayerId}
            onClick={onConfirm}
          >
            Rejoindre
          </button>
        </div>
      </section>
    </div>
  )
}
