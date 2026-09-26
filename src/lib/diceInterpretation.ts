/**
 * Interprétation des jets de dé 100 (d100) selon le système OmegaJDR.
 *
 * Règles :
 * - Roll de 100  → Réussite critique
 * - Roll de 1    → Échec critique
 * - Roll ≥ seuil → Réussite (écart = roll - seuil)
 * - Roll < seuil → Échec (écart = seuil - roll)
 */

export type DiceInterpretationKind =
  | 'critical_success'
  | 'critical_failure'
  | 'success'
  | 'failure'

export type DiceInterpretation = {
  kind: DiceInterpretationKind
  /** Libellé court affiché dans le popup / l'historique. */
  label: string
  /** Écart absolu par rapport au seuil (toujours positif). */
  margin: number
}

/**
 * Interprète un jet de d100 vis-à-vis d'un seuil de réussite.
 * Il faut faire **≥** au seuil pour réussir.
 *
 * @param roll        Le résultat du dé (1-100).
 * @param threshold   Le seuil de réussite (ex: 50 → réussite si roll ≥ 50).
 * @returns           L'interprétation du jet, ou null si le roll n'est pas un d100 valide.
 */
export function interpretD100Roll(roll: number, threshold: number): DiceInterpretation | null {
  if (!Number.isFinite(roll) || !Number.isFinite(threshold)) return null
  const r = Math.round(roll)
  const t = Math.round(threshold)
  if (r < 1 || r > 100) return null

  // Les critiques sont prioritaires sur le seuil.
  if (r === 100) {
    return { kind: 'critical_success', label: 'Réussite critique', margin: 0 }
  }
  if (r === 1) {
    return { kind: 'critical_failure', label: 'Échec critique', margin: 0 }
  }

  if (r >= t) {
    return { kind: 'success', label: 'Réussite', margin: r - t }
  }
  return { kind: 'failure', label: 'Échec', margin: -(t - r) }
}

/**
 * Couleur (variable CSS) associée à chaque type d'interprétation,
 * pour styler le popup et l'historique.
 */
export const DICE_INTERPRETATION_COLOR: Record<DiceInterpretationKind, string> = {
  critical_success: 'var(--md-sys-color-primary)',
  critical_failure: 'var(--md-sys-color-error)',
  success: 'var(--md-sys-color-primary)',
  failure: 'var(--md-sys-color-error)',
}