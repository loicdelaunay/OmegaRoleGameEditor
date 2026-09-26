import type { CharacterDocument, DependentStatKey } from './character'
import { DEPENDENT_STAT_LABELS, DEPENDENT_STAT_EMOJI } from './character'
import { computeAllStatsCurrent } from './statCompute'
import { computeStatSuccessThreshold } from './projectConfig'
import { computeSuccessModifierFromVitals } from './characterVitals'

export type CharacteristicEntry = {
  key: DependentStatKey
  emoji: string
  label: string
  /** Valeur actuelle calculée (default + Σ mods équipement + Σ mods modificateurs). */
  current: number
  /** Seuil de réussite calculé (valeur de Réussite de la fiche). */
  successThreshold: number
}

export type CharacteristicConfig = {
  statSuccessDivisor: number
  successModifierMin: number
  successModifierMax: number
  vitalsCriticalThresholdPercent: number
  vitalsWeightHealth: number
  vitalsWeightMental: number
}

/**
 * Extrait la liste ordonnée des caractéristiques d'un CharacterDocument
 * avec leur valeur actuelle **calculée** (default + mods) et leur seuil de
 * réussite **calculé** (formule de la fiche : 90 - floor(current*5/divisor) + autoMod).
 *
 * La valeur de Réussite est calculée dynamiquement pour correspondre exactement
 * à ce que la fiche de personnage affiche, plutôt que d'utiliser le
 * `stat.successThreshold` stocké à 50 dans le JSON.
 */
export function extractCharacteristics(
  doc: CharacterDocument,
  config?: CharacteristicConfig,
): CharacteristicEntry[] {
  const computed = computeAllStatsCurrent(doc)

  // Modificateur auto depuis Santé/Mental (piloté par computeSuccessModifierFromVitals).
  const autoMod = computeSuccessModifierFromVitals(
    doc.stats.health.current,
    doc.stats.health.max,
    doc.stats.mental.current,
    doc.stats.mental.max,
    config
      ? {
          min: config.successModifierMin,
          max: config.successModifierMax,
          criticalThresholdPercent: config.vitalsCriticalThresholdPercent,
          weightHealth: config.vitalsWeightHealth,
          weightMental: config.vitalsWeightMental,
        }
      : undefined,
  )

  const divisor = config?.statSuccessDivisor ?? 1.4

  const keys = Object.keys(DEPENDENT_STAT_LABELS) as DependentStatKey[]
  return keys.map((key) => {
    const current = computed[key]
    const successThreshold = computeStatSuccessThreshold(current, divisor, autoMod)
    return {
      key,
      emoji: DEPENDENT_STAT_EMOJI[key],
      label: DEPENDENT_STAT_LABELS[key],
      current,
      successThreshold,
    }
  })
}