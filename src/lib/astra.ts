// src/lib/astra.ts
// Helpers liés à l'Astra (ressource de "puissance mentale" du personnage).
//
// Règle JDR (formule du Max) :
//   - Astra Max = base + Maîtrise Astra (actuelle) + Σ(astraMod)
//   - `base` est un socle narratif (race/archétype), défaut 15.
//   - La Maîtrise Astra actuelle est calculée par
//     `computeStatCurrent('astraMastery', ...)`
//     (default + Σ(equipement.astraMasteryMod) + Σ(modificateurs.astraMasteryMod)).
//   - Les bonus d'Astra (equipement.astraMod + modificateurs.astraMod) sont sommés.
//
// Le Max est donc piloté par la Maîtrise Astra et l'équipement, comme Santé et
// Mental sont pilotés par l'Endurance/Sagesse et le Niveau. L'input UI passe
// en readOnly et le state est synchronisé via useEffect, à l'identique de
// `character.stats.health.max` / `character.stats.mental.max`.
//
// ⚠️ Les fiches JSON chargées avec un `astra.max` arbitraire (saisi à la main
// dans une version antérieure) sont **automatiquement** ré-écrites avec la
// valeur calculée. Le Max n'est plus jamais éditable, ce qui évite la
// désynchronisation entre la table des caractéristiques et la carte Astra.

import { DEFAULT_ASTRA_MAX_BASE } from './constants'

/** Structure minimaliste d'un équipement/modificateur (seul `astraMod` nous intéresse). */
export interface AstaModItem {
  astraMod?: number;
}

/** Options avancées pour le calcul de l'Astra Max. */
export interface AstraMaxOptions {
  /** Socle narratif (race/archétype). Défaut : `DEFAULT_ASTRA_MAX_BASE`. */
  base?: number;
}

/**
 * Calcule la valeur actuelle d'une caractéristique en sommant ses mods.
 * Reproduit la logique de `computeStatCurrent` côté UI sans dépendre de
 * React : `default + Σ(items.astraMod)`.
 */
function sumAstraMod(items: ReadonlyArray<AstaModItem> | undefined | null): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    const v = Number(item?.astraMod);
    if (Number.isFinite(v)) total += v;
  }
  return total;
}

/**
 * Calcule l'Astra Max depuis la Maîtrise Astra (déjà actuelle : default + mods)
 * et la somme des mods Astra des équipements + modificateurs.
 *
 * @param astraMasteryCurrent Valeur actuelle de la Maîtrise Astra
 *   (= `default + Σ(astraMasteryMod)`).
 * @param equipment Liste d'équipements (chacun avec un champ `astraMod`).
 * @param modificateurs Liste de modificateurs (chacun avec un champ `astraMod`).
 * @param options Options avancées (`base` pour override le socle).
 * @returns Astra Max entier (Math.round pour rester lisible, plancher 0).
 */
export function computeAstraMax(
  astraMasteryCurrent: number,
  equipment: ReadonlyArray<AstaModItem> | undefined | null,
  modificateurs: ReadonlyArray<AstaModItem> | undefined | null,
  options: AstraMaxOptions = {},
): number {
  const base = Number.isFinite(options.base) ? (options.base as number) : DEFAULT_ASTRA_MAX_BASE;
  const mastery = Number.isFinite(astraMasteryCurrent) ? (astraMasteryCurrent as number) : 0;
  const modSum = sumAstraMod(equipment) + sumAstraMod(modificateurs);
  return Math.max(0, Math.round(base + mastery + modSum));
}

/** Constante exportée pour réutilisation (UI, config, tests). */
export const ASTRA_MAX_BASE = DEFAULT_ASTRA_MAX_BASE;
