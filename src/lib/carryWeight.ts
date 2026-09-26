// src/lib/carryWeight.ts
// Helpers liés au Poids porté par le personnage (inventaire + équipement).
//
// Règle JDR :
//   - Poids actuel = Σ(weight des équipements) + Σ(weight des modificateurs) [en kg]
//   - Poids max (= capacité de port) = Force actuelle × 10 / 2 = Force actuelle × 5
//     (formule utilisateur : "Force actuelle * 10 / 2").
//
// Comme pour Santé/Mental/Astra/Armure, les inputs UI passent en readOnly :
// l'utilisateur n'édite plus le poids actuel ni le max à la main.
// Les fiches JSON chargées avec des valeurs arbitraires sont automatiquement
// migrées vers les valeurs calculées.

/** Item minimaliste (équipement ou modificateur) qui peut peser. */
export interface WeightItem {
  weight?: number;
}

/**
 * Calcule le poids total porté par le personnage (en kg).
 * Règle : `poidsActuel = Σ(items.weight)`.
 *
 * @param equipment Liste d'équipements (chacun avec un champ `weight`).
 * @param modificateurs Liste de modificateurs (chacun avec un champ `weight`).
 * @param inventory Liste d'objets d'inventaire (chacun avec `weightPerItem × quantity`).
 * @returns Poids actuel en kg, arrondi à 1 décimale, plancher 0.
 */
export function computeCurrentWeight(
  equipment: ReadonlyArray<WeightItem> | undefined | null,
  modificateurs: ReadonlyArray<WeightItem> | undefined | null,
  inventory?: ReadonlyArray<{ weightPerItem?: number; quantity?: number }> | null,
): number {
  const eq = sumWeight(equipment);
  const mod = sumWeight(modificateurs);
  let inv = 0;
  if (inventory && inventory.length > 0) {
    for (const item of inventory) {
      const w = Number(item?.weightPerItem);
      const q = Number(item?.quantity);
      if (Number.isFinite(w) && Number.isFinite(q) && q > 0) inv += w * q;
    }
  }
  // Arrondi à 1 décimale pour la lisibilité (un équipement à 0.5 kg n'est
  // pas masqué par un arrondi à l'entier).
  return Math.max(0, Math.round((eq + mod + inv) * 10) / 10);
}

/**
 * Calcule la capacité de port (= poids max que le personnage peut porter)
 * en kg. Formule : `Force actuelle × 10 / 2` = `Force actuelle × 5`.
 *
 * @param strengthCurrent Valeur actuelle de la Force (= `default + Σ(strengthMod)`).
 * @returns Poids max en kg, plancher 0.
 */
export function computeCarryCapacityMax(strengthCurrent: number): number {
  const f = Number.isFinite(strengthCurrent) ? (strengthCurrent as number) : 0;
  return Math.max(0, Math.round((f * 10 / 2) * 10) / 10);
}

/**
 * Somme les `weight` d'une liste d'items. Ignore les valeurs non finies
 * (NaN/Infinity) et les champs absents.
 */
function sumWeight(items: ReadonlyArray<WeightItem> | undefined | null): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    const v = Number(item?.weight);
    if (Number.isFinite(v)) total += v;
  }
  return total;
}
