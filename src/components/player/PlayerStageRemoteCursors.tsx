import type { RoomPlayer } from '../../types/terrain'

export type PlayerStageRemoteCursorsProps = {
  players: RoomPlayer[]
  currentPlayerId: string | null
  hideNonHostWhenFlashlight: boolean
}

export function PlayerStageRemoteCursors({
  players,
  currentPlayerId,
  hideNonHostWhenFlashlight,
}: PlayerStageRemoteCursorsProps) {
  return (
    <>
      {players.map((player) => {
        if (hideNonHostWhenFlashlight && player.role !== 'host') return null
        return (
          <div
            key={player.id}
            id={`player-cursor-${player.id}`}
            className={player.id === currentPlayerId ? 'remote-cursor self' : 'remote-cursor'}
            style={{ left: `${player.x}px`, top: `${player.y}px`, borderColor: player.color }}
          >
            <span style={{ backgroundColor: player.color }}>{player.name}</span>
          </div>
        )
      })}
      {players.map((player) => {
        if (hideNonHostWhenFlashlight && player.role !== 'host') return null
        return player.ping ? (
          <i
            key={`${player.id}-ping`}
            className="ping-ring"
            style={{
              left: `${player.ping.x}px`,
              top: `${player.ping.y}px`,
              borderColor: player.color,
              color: player.color,
            }}
          ></i>
        ) : null
      })}
    </>
  )
}
