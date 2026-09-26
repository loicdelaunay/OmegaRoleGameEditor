// src/lib/characterVitals.ts
// Helpers liés à la Santé / Mental et au calcul auto du modificateur de réussite.
//
// Logique métier (règle JDR) :
//   - Le seuil de Réussite est calculé comme un nombre entre 5 et 95 (cf.
//     `computeStatSuccessThreshold`). Sur un D100, le joueur doit faire
//     STRICTEMENT SUPÉRIEUR au seuil pour réussir (100 = critique).
//   - Le modificateur de réussite est un offset signé appliqué à ce seuil.
//   - À pleine forme (Santé ET Mental = 100%), le mod est au PLANCHER
//     (par défaut -10) → avantage : le seuil baisse → plus facile à dépasser.
//   - À 0% (personne K.O.), le mod est au PLAFOND (par défaut +15) → malus.
//   - Entre les deux : interpolation linéaire sur la MOYENNE PONDÉRÉE
//     des deux pourcentages, avec un arrondi entier pour rester lisible.
//   - PALIER CRITIQUE : si Santé OU Mental passe sous un seuil (défaut 25%),
//     le mod est forcé au plafond (à terre), quelle que soit la moyenne.
//
// La fonction est *pure* et testable ; elle n'a aucune dépendance UI.

import {
  DEFAULT_SUCCESS_MODIFIER_MIN,
  DEFAULT_SUCCESS_MODIFIER_MAX,
  DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT,
  DEFAULT_VITALS_WEIGHT_HEALTH,
  DEFAULT_VITALS_WEIGHT_MENTAL,
} from './constants'

/**
 * Bornes appliquées au pourcentage Santé/Mental.
 * Si `current > max`, on plafonne à 100% (règle : pas de bonus "over-heal").
 * Si `max <= 0` (caractéristique non initialisée), on retourne 100% (neutre plein).
 */
function clampPercent(current: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1
  if (!Number.isFinite(current)) return 0
  if (current <= 0) return 0
  if (current >= max) return 1
  return current / max
}

/**
 * Options avancées pour le calcul du modificateur de réussite.
 * Toutes les valeurs sont optionnelles ; les défauts viennent de `constants.ts`
 * (et sont eux-mêmes surchargeables via `config.json` du workfolder).
 */
export interface SuccessModifierOptions {
  /** Modificateur plancher (à 100%/100%). Négatif = avantage. */
  min?: number;
  /** Modificateur plafond (à 0%/0% ou sous le palier critique). Positif = malus. */
  max?: number;
  /**
   * Seuil en pourcentage (0..100) sous lequel la Santé OU le Mental déclenche
   * le palier critique : le mod saute au plafond. `0` désactive le palier.
   */
  criticalThresholdPercent?: number;
  /** Poids relatif de la Santé dans la moyenne pondérée (défaut 1). */
  weightHealth?: number;
  /** Poids relatif du Mental dans la moyenne pondérée (défaut 1). */
  weightMental?: number;
}

/** Bornes par défaut (synchronisées avec `constants.ts`). */
export const SUCCESS_MODIFIER_MIN = DEFAULT_SUCCESS_MODIFIER_MIN
export const SUCCESS_MODIFIER_MAX = DEFAULT_SUCCESS_MODIFIER_MAX

/**
 * Calcule le modificateur de réussite auto à partir de la Santé et du Mental.
 *
 * Algorithme :
 *   1. Convertir Santé et Mental en pourcentages bornés [0..1].
 *   2. Si l'un des deux est sous le `criticalThresholdPercent` (et seuil > 0),
 *      retourner directement le plafond (mod max = malus).
 *   3. Sinon, calculer la moyenne pondérée `moy = (pH*wH + pM*wM) / (wH+wM)`.
 *      Si `wH + wM == 0`, retomber sur la moyenne simple 50/50.
 *   4. `mod = min + (max - min) * (1 - moy)`, borné et arrondi à l'entier.
 *
 * @returns Modificateur entier borné dans [`min`, `max`].
 */
export function computeSuccessModifierFromVitals(
  healthCurrent: number,
  healthMax: number,
  mentalCurrent: number,
  mentalMax: number,
  options: SuccessModifierOptions = {},
): number {
  const min = Number.isFinite(options.min) ? (options.min as number) : SUCCESS_MODIFIER_MIN;
  const max = Number.isFinite(options.max) ? (options.max as number) : SUCCESS_MODIFIER_MAX;
  const criticalThreshold = Number.isFinite(options.criticalThresholdPercent)
    ? Math.max(0, Math.min(100, options.criticalThresholdPercent as number))
    : DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT;
  const wH = Number.isFinite(options.weightHealth) ? Math.max(0, options.weightHealth as number) : DEFAULT_VITALS_WEIGHT_HEALTH;
  const wM = Number.isFinite(options.weightMental) ? Math.max(0, options.weightMental as number) : DEFAULT_VITALS_WEIGHT_MENTAL;

  const pHealth = clampPercent(healthCurrent, healthMax);
  const pMental = clampPercent(mentalCurrent, mentalMax);

  // L'utilisateur peut configurer `min > max` ; on respecte ses bornes.
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);

  // 1) Moyenne pondérée (fallback 50/50 si poids totaux = 0).
  const wTotal = wH + wM;
  const avg = wTotal > 0 ? (pHealth * wH + pMental * wM) / wTotal : (pHealth + pMental) / 2;

  // 2) Normalisation de la moyenne pour que l'interpolation atteigne le plafond (hi)
  //    exactement au palier critique (ne pas passer sec).
  let effectiveAvg = avg;
  if (criticalThreshold > 0 && criticalThreshold < 100) {
    const t = criticalThreshold / 100;
    effectiveAvg = Math.max(0, avg - t) / (1 - t);
  }

  // 3) Interpolation linéaire entre plancher (à 100%) et plafond (au palier).
  const raw = lo + (hi - lo) * (1 - effectiveAvg);

  // Bornes de sécurité + arrondi à l'entier le plus proche.
  const clamped = Math.min(hi, Math.max(lo, raw));
  return Math.round(clamped);
}

/**
 * Renvoie le détail des pourcentages (pour affichage debug/tooltip).
 */
export function getVitalsPercents(
  healthCurrent: number,
  healthMax: number,
  mentalCurrent: number,
  mentalMax: number,
): { health: number; mental: number; average: number } {
  const health = clampPercent(healthCurrent, healthMax)
  const mental = clampPercent(mentalCurrent, mentalMax)
  return {
    health,
    mental,
    average: (health + mental) / 2,
  }
}
