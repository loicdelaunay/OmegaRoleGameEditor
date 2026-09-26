import type { RefObject } from 'react'
import { Shuffle, X } from 'lucide-react'
import type { RoomPlayer } from '../../types/terrain'

export type HostDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  serverUrl: string
  roomId: string
  roomPlayers: RoomPlayer[]
  isHostSessionActive: boolean
  onServerUrlChange: (value: string) => void
  onRoomIdChange: (value: string) => void
  onGenerateRoomCode: () => void
  onToggleHost: () => void
  onClose: () => void
}

export function HostDialog({
  isOpen,
  backdropPointerDownRef,
  serverUrl,
  roomId,
  roomPlayers,
  isHostSessionActive,
  onServerUrlChange,
  onRoomIdChange,
  onGenerateRoomCode,
  onToggleHost,
  onClose,
}: HostDialogProps) {
  if (!isOpen) return null

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
              <h2>Mode Host</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="conn-dialog-body">
          <label>
            Serveur WebSocket
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <select
                value={serverUrl === 'http://localhost:8787/' ? serverUrl : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onServerUrlChange(e.target.value)
                }}
                style={{ flex: '0 0 140px' }}
              >
                <option value="http://localhost:8787/">Local</option>
                <option value="custom">Custom</option>
              </select>
              <input
                value={serverUrl}
                onChange={(event) => onServerUrlChange(event.target.value)}
                style={{ flex: '1 1 0', margin: 0 }}
              />
            </div>
          </label>
          <div className="conn-dialog-room-row">
            <label style={{ flex: '1 1 0' }}>
              Code de salle
              <input value={roomId} onChange={(event) => onRoomIdChange(event.target.value.toUpperCase())} />
            </label>
            <button type="button" className="secondary conn-dialog-room-btn" onClick={onGenerateRoomCode}>
              <span className="button-content">
                <Shuffle className="button-icon" strokeWidth={2.2} />
                <span>Nouveau code</span>
              </span>
            </button>
          </div>

          {roomPlayers.length > 0 ? (
            <div className="conn-dialog-presence surface-tonal">
              <span className="field-label">Joueurs connectés ({roomPlayers.length})</span>
              <div className="conn-dialog-presence-list">
                {roomPlayers.map((player) => (
                  <div key={player.id} className="presence-row">
                    <span className="swatch" style={{ backgroundColor: player.color }} />
                    <strong>{player.name}</strong>
                    <span className="helper" style={{ marginLeft: 'auto' }}>
                      {Math.round(player.x)} / {Math.round(player.y)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="helper">Aucun joueur connecté.</p>
          )}
        </div>

        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className={isHostSessionActive ? 'secondary' : 'primary'}
            onClick={onToggleHost}
          >
            {isHostSessionActive ? 'Désactiver le host' : 'Activer le host'}
          </button>
        </div>
      </section>
    </div>
  )
}
