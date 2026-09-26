// src/lib/statTier.ts
// Helpers liés aux **paliers d'état** des jauges numériques (Santé, Mental,
// Armure, Astra, Poids, etc.).
//
// Règle JDR : pour chaque jauge `current / max`, on déduit un **état
// textuel** parmi 5 paliers (du meilleur au pire), qui s'affiche sous la
// carte correspondante dans la fiche de personnage.
//
// Modélisation : chaque palier = un **seuil** (upperBound, ratio à partir
// duquel on passe au palier suivant). Convention de lecture :
//   - Le tableau est trié du **MEILLEUR** état (1er) au **PIRE** (dernier).
//   - `upperBound` = ratio à partir duquel ce palier n'est plus actif.
//     (ex: upperBound=0.2 → actif pour ratio ∈ [0, 0.2[).
//   - Le 1er palier a upperBound=0.2 (actif pour ratio < 20%).
//   - Le dernier palier a upperBound=Infinity (actif pour ratio ≥ 80%).
//
// Algorithme : on parcourt le tableau et on garde le **dernier palier
// dont le seuil est encore atteint** (`ratio < upperBound`). C'est plus
// simple et lisible qu'un `findLast`.
//
// C'est une fonction *pure* et testable, sans dépendance UI.

export interface Tier {
  /**
   * Borne supérieure (exclusive) du ratio `current / max` au-dessus de
   * laquelle on quitte ce palier. Utiliser `Infinity` pour le dernier
   * palier (gère les ratios ≥ 100% — over-heal, surcharge, etc.).
   */
  upperBound: number;
  /** Libellé affiché (ex: "Stable", "Surchargé"). */
  label: string;
  /**
   * Couleur de fond de la pastille (CSS color). Doit être définie en
   * cohérence avec `textColor` pour assurer la lisibilité en light & dark.
   */
  color?: string;
  /**
   * Couleur du texte sur la pastille (CSS color). Choisie pour atteindre
   * un contraste WCAG AA (≥ 4.5:1) sur `color` en light & dark mode.
   * Si non fournie, l'UI doit utiliser un fallback lisible (ex: `text.primary`).
   */
  textColor?: string;
}

export interface TierOptions {
  /**
   * Liste de paliers, du **MEILLEUR** (1er) au **PIRE** (dernier).
   * L'ordre est crucial : c'est lui qui détermine la sémantique, pas
   * la lib.
   */
  tiers: Tier[];
  /**
   * Si `true`, le palier est calculé sur `1 - ratio` (= "plus c'est
   * rempli, plus c'est mauvais"). C'est le cas pour l'Armure
   * ("Très lourde" à 100%) et le Poids ("Surchargé" à 100%).
   * Si `false` (défaut), c'est l'inverse : "plus c'est rempli, mieux
   * c'est" (Santé, Mental, Astra).
   */
  inverted?: boolean;
  /** Couleur du texte sur la pastille (peut être `undefined` si non fournie). */
  textColor?: string;
  /** Palier de secours quand aucun seuil ne matche (défaut: 1er). */
  fallback?: Tier;
}

export interface TierResult {
  /** Palier actif (label + couleur). */
  label: string;
  /** Couleur de fond associée (peut être `undefined` si non fournie). */
  color?: string;
  textColor?: string;
  /** Ratio normalisé 0..1 (avant toute décision de palier). */
  ratio: number;
  /** `upperBound` du palier matché (pour debug / tooltip). */
  matchedUpperBound: number;
}

/** Borne le ratio dans [0, 1]. max=0 → 1 (cas "non initialisé"). */
function clampPercent(current: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  if (!Number.isFinite(current)) return 0;
  if (current <= 0) return 0;
  if (current >= max) return 1;
  return current / max;
}

/**
 * Détermine le palier d'état actif pour une jauge `current / max`.
 *
 * Logique : on cherche le **1er palier** (dans l'ordre du tableau, qui
 * va du **meilleur** au **pire**) dont `upperBound > ratio`. C'est
 * l'intervalle semi-ouvert `[seuil_précédent, upperBound[` qui matche.
 *   - ratio = 0.0  → 1er palier (upperBound > 0)
 *   - ratio = 0.5  → palier dont upperBound > 0.5 (= le 3e avec [0.2, 0.4, 0.6, 0.8, ∞])
 *   - ratio = 1.0  → dernier palier (upperBound = Infinity)
 *
 * Convention : le **1er palier** est le **meilleur état** (actif à ratio
 * bas = 0%). Le **dernier palier** est le **pire** (actif à ratio
 * haut = 100%, upperBound = Infinity).
 *
 * Pour les jauges "max = mauvais" (Armure, Poids), le tableau est trié
 * avec le meilleur état en 1er (actif à ratio=0, "Inexistante" /
 * "Minimum") et le pire en dernier (actif à ratio=1, "Très lourde" /
 * "Surchargé"). C'est la même convention de lecture que les autres
 * jauges, le tableau est simplement réordonné.
 *
 * @param current Valeur actuelle de la jauge.
 * @param max Valeur max de la jauge.
 * @param options Liste de paliers (du meilleur au pire) + fallback.
 * @returns Palier actif + ratio + `upperBound` atteint.
 */
export function computeStatTier(
  current: number,
  max: number,
  options: TierOptions,
): TierResult {
  const ratio = clampPercent(current, max);
  // Si la jauge est "max = mauvais" (Armure, Poids) : on inverse le ratio
  // avant la comparaison. Comme ça, le tableau de paliers reste lisible
  // dans l'ordre "du meilleur au pire", quelle que soit la jauge.
  const effectiveRatio = options.inverted ? 1 - ratio : ratio;
  const fallback: Tier = options.fallback ?? options.tiers[0] ?? { upperBound: 0, label: '—' };
  // 1er palier (dans l'ordre du tableau) dont `upperBound > ratio`.
  // C'est l'intervalle semi-ouvert `[seuil_précédent, upperBound[` :
  //   - ratio = 0.0  → 1er palier (upperBound=0.2 > 0)
  //   - ratio = 0.2  → 2e palier (upperBound=0.4 > 0.2, 0.2 pas > 0.2)
  //   - ratio = 0.5  → 3e palier (upperBound=0.6 > 0.5)
  //   - ratio = 0.8  → 5e palier (upperBound=∞ > 0.8)
  //   - ratio = 1.0  → 5e palier (upperBound=∞ > 1.0)
  const matched = options.tiers.find((t) => effectiveRatio < t.upperBound) ?? fallback;

  return {
    textColor: matched.textColor,
    label: matched.label,
    color: matched.color,
    ratio,
    matchedUpperBound: matched.upperBound,
  };
}
