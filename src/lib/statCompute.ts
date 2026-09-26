import type { CharacterDocument, DependentStatKey } from './character'

/**
 * Calcule la valeur Actuelle d'une caractéristique.
 * Règle : Actuel = Par Défaut + Σ(Équipement.XxxMod) + Σ(Modificateurs.XxxMod)
 *
 * Pour l'agilité, un malus de surcharge est appliqué si le personnage
 * porte plus de 50% de sa charge maximale.
 *
 * Cette fonction est partagée entre CharacterSheetDialog et characteristics.ts
 * pour garantir que les valeurs affichées dans le dropdown de dés
 * correspondent à celles de la fiche de personnage.
 */
export function computeStatCurrent(
  statKey: string,
  defaultValue: number,
  equipment: Array<Record<string, any>>,
  modificateurs: Array<Record<string, any>>,
  currentWeight: number = 0,
  maxWeight: number = 0,
): number {
  const modField = `${statKey}Mod`
  const equipMod = sumModField(equipment, modField)
  const modMod = sumModField(modificateurs, modField)
  let val = (Number(defaultValue) || 0) + equipMod + modMod

  if (statKey === 'agility' && maxWeight > 0) {
    const ratio = currentWeight / maxWeight
    let malus = 0
    if (ratio >= 0.5 && ratio <= 1) {
      malus = Math.round(((ratio - 0.5) / 0.5) * 5)
    } else if (ratio > 1) {
      malus = 5
      const excessRatio = ratio - 1
      malus += Math.floor(excessRatio / 0.1)
    }
    val = Math.max(1, val - malus)
  }

  return val
}

function sumModField(items: Array<Record<string, any>>, field: string): number {
  return items.reduce((acc, it) => acc + (Number(it[field]) || 0), 0)
}

/**
 * Calcule la charge maximale (maxWeight) d'un personnage.
 * Règle : maxWeight = endurance * 10
 * (Utilisé pour le malus d'agilité lié à la surcharge.)
 */
export function computeMaxWeight(enduranceCurrent: number): number {
  return (Number(enduranceCurrent) || 0) * 10
}

/**
 * Calcule toutes les caractéristiques actuelles d'un CharacterDocument
 * en appliquant les modificateurs d'équipement et de modificateurs.
 *
 * @returns un Record<DependentStatKey, number> avec les valeurs actuelles calculées.
 */
export function computeAllStatsCurrent(doc: CharacterDocument): Record<DependentStatKey, number> {
  const equipment = (doc.equipment ?? []) as unknown as Array<Record<string, any>>
  const modificateurs = (doc.modificateurs ?? []) as unknown as Array<Record<string, any>>
  const currentWeight = doc.general?.weight ?? 0

  // Calcul en deux passes : d'abord l'endurance (pour le maxWeight),
  // puis l'agilité (qui dépend du malus de surcharge).
  const stats = doc.stats
  const enduranceCurrent = computeStatCurrent('endurance', stats.endurance?.default ?? 10, equipment, modificateurs)
  const maxWeight = computeMaxWeight(enduranceCurrent)

  const keys: DependentStatKey[] = [
    'endurance', 'strength', 'agility', 'intelligence',
    'astraMastery', 'charisma', 'wisdom', 'luck', 'perception',
  ]

  const result = {} as Record<DependentStatKey, number>
  for (const key of keys) {
    const def = stats[key]?.default ?? 10
    result[key] = key === 'endurance'
      ? enduranceCurrent
      : computeStatCurrent(key, def, equipment, modificateurs, currentWeight, maxWeight)
  }
  return result
}