export type DiceHistoryEntry = {
  id: string
  playerId: string
  playerName: string
  playerColor: string
  count: number
  sides: number
  modifier?: number
  reason?: string
  rolls?: number[]
  result: number | null
  isSecret: boolean
  createdAt: number
  /**
   * Seuil de réussite pour les jets de caractéristique (d100).
   * Si présent et que `sides === 100`, le popup et l'historique affichent
   * l'interprétation (Réussite / Échec / Critique + écart).
   * Optionnel pour rétro-compatibilité avec les anciens lancers.
   */
  successThreshold?: number
}

export type ActiveDiceRoll = DiceHistoryEntry & {
  expiresAt: number
}
