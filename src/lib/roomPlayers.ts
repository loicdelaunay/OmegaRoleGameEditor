import type { RoomPlayer } from '../types/terrain'

export function upsertRoomPlayer(players: RoomPlayer[], nextPlayer: RoomPlayer) {
  const existingIndex = players.findIndex((player) => player.id === nextPlayer.id)
  if (existingIndex < 0) {
    return [...players, nextPlayer]
  }

  const nextPlayers = [...players]
  nextPlayers[existingIndex] = { ...nextPlayers[existingIndex], ...nextPlayer }
  return nextPlayers
}
