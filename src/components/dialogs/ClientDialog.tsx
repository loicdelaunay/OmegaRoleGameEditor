import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { RoomJoinConfig } from '../../types/terrain'
import { ColorPickerField } from '../ColorPickerField'

export type ClientDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  serverUrl: string
  roomId: string
  playerColor: string
  playerName: string
  colorPalette: string[]
  selectedPredeclaredPlayerId: string
  joinConfig: RoomJoinConfig | null
  isJoinConfigLoading: boolean
  onServerUrlChange: (value: string) => void
  onRoomIdChange: (value: string) => void
  onPlayerColorChange: (color: string) => void
  onPlayerNameChange: (value: string) => void
  onPredeclaredPlayerChange: (id: string) => void
  onAddPaletteColor: (color: string) => void
  onDisconnect: () => void
  onConnect: () => void
  onClose: () => void
}

export function ClientDialog({
  isOpen,
  backdropPointerDownRef,
  serverUrl,
  roomId,
  playerColor,
  playerName,
  colorPalette,
  selectedPredeclaredPlayerId,
  joinConfig,
  isJoinConfigLoading,
  onServerUrlChange,
  onRoomIdChange,
  onPlayerColorChange,
  onPlayerNameChange,
  onPredeclaredPlayerChange,
  onAddPaletteColor,
  onDisconnect,
  onConnect,
  onClose,
}: ClientDialogProps) {
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
              <h2>Connexion Joueur</h2>
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
          <label>
            Code de salle
            <input value={roomId} onChange={(event) => onRoomIdChange(event.target.value.toUpperCase())} />
          </label>

          {isJoinConfigLoading ? (
            <p className="helper">Chargement de la configuration…</p>
          ) : joinConfig?.preallocationEnabled ? (
            <>
              <label>
                Qui incarnes-tu ?
                <select
                  value={selectedPredeclaredPlayerId}
                  onChange={(event) => onPredeclaredPlayerChange(event.target.value)}
                >
                  <option value="">Choisir un personnage</option>
                  {joinConfig.predeclaredPlayers.map((player) => (
                    <option key={player.id} value={player.id} disabled={Boolean(player.connectedPlayerId)}>
                      {player.name}
                      {player.connectedPlayerId ? ' (déjà pris)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <p className="helper">Le MJ a activé la pré-allocation – choisis ton personnage avant de rejoindre.</p>
            </>
          ) : (
            <>
              <label>
                Couleur
                <ColorPickerField
                  value={playerColor}
                  palette={colorPalette}
                  onChange={onPlayerColorChange}
                  onAddPreference={onAddPaletteColor}
                />
              </label>
              <label>
                Nom
                <input value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} />
              </label>
            </>
          )}
        </div>

        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
          <button type="button" className="secondary" onClick={onDisconnect}>
            Quitter la salle
          </button>
          <button
            type="button"
            className="primary"
            disabled={isJoinConfigLoading}
            onClick={onConnect}
          >
            Rejoindre
          </button>
        </div>
      </section>
    </div>
  )
}
