// src/lib/armor.ts
// Helpers liés à l'Armure (caractéristique défensive du personnage).
//
// Règle JDR :
//   - Armure Max = 20 (fixé, constante de configuration du système)
//   - Armure Actuel = Σ(armorMod des équipements) + Σ(armorMod des modificateurs)
//
// Comme pour Santé/Mental/Astra, l'input UI passe en readOnly : l'utilisateur
// n'édite plus l'armure à la main. Les fiches JSON chargées avec un
// `armor.current` / `armor.max` arbitraire sont automatiquement migrées
// vers les valeurs calculées, ce qui élimine la désynchronisation entre
// l'équipement porté et la jauge affichée.

import { DEFAULT_ARMOR_MAX } from './constants'

/** Item minimaliste (équipement ou modificateur) qui peut contribuer à l'armure. */
export interface ArmorModItem {
  armorMod?: number;
}

/**
 * Calcule la valeur actuelle de l'armure (points d'armure portés).
 * Règle : `current = Σ(items.armorMod)`.
 *
 * @param equipment Liste d'équipements (chacun avec un champ `armorMod`).
 * @param modificateurs Liste de modificateurs (chacun avec un champ `armorMod`).
 * @returns Armure actuelle entière, plancher 0.
 */
export function computeArmorCurrent(
  equipment: ReadonlyArray<ArmorModItem> | undefined | null,
  modificateurs: ReadonlyArray<ArmorModItem> | undefined | null,
): number {
  const total = sumArmorMod(equipment) + sumArmorMod(modificateurs);
  return Math.max(0, Math.round(total));
}

/**
 * Renvoie le max d'armure (constant — 20 par défaut).
 * Paramétré via `options.max` pour permettre un override futur depuis
 * la configuration du workfolder.
 */
export function computeArmorMax(options: { max?: number } = {}): number {
  const v = Number.isFinite(options.max) ? (options.max as number) : DEFAULT_ARMOR_MAX;
  return Math.max(0, Math.round(v));
}

/** Constante exportée pour réutilisation (UI, config, tests). */
export const ARMOR_MAX = DEFAULT_ARMOR_MAX;

/**
 * Somme les `armorMod` d'une liste d'items. Ignore les valeurs non finies
 * (NaN/Infinity) et les champs absents — un item "vieux format" sans
 * `armorMod` ne casse pas le calcul.
 */
function sumArmorMod(items: ReadonlyArray<ArmorModItem> | undefined | null): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    const v = Number(item?.armorMod);
    if (Number.isFinite(v)) total += v;
  }
  return total;
}
