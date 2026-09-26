// src/lib/statTiers.ts
// Définitions déclaratives des **paliers d'état** pour les jauges principales
// de la fiche de personnage : Santé, Mental, Armure, Astra, Poids.
//
// Modélisation (cf. `statTier.ts`) : chaque palier = un intervalle de
// ratio `current / max`, délimité par `upperBound` (borne sup exclusive).
// Le 1er palier matchant `ratio < upperBound` est le palier actif.
//
// Convention d'écriture (lisible, du meilleur au pire) :
//   - "ratio < 0.2"  → 1er palier
//   - "ratio < 0.4"  → 2e palier
//   - "ratio < 0.6"  → 3e palier
//   - "ratio < 0.8"  → 4e palier
//   - "ratio < ∞"    → 5e palier (jusqu'à 100% et au-delà)
//
// Couleurs : palette **Material Design 3** (m3.material.io). Chaque
// palier expose un couple { `color`, `textColor` } calibré pour offrir
// un contraste WCAG AA (≥ 4.5:1) en light ET en dark mode, sans
// dépendre du thème MUI (les couleurs sont fixes, sémantiques, et
// marchent sur les deux fonds d'écran du workspace).
//
//   - États critiques (rouge M3)        : fond #b3261e / texte #ffffff
//   - États d'alerte (orange/amber M3)  : fond #f9a825 / texte #1f1500
//   - États neutres (gris M3)           : fond #c4c7c5 / texte #1f2123
//   - États positifs (vert M3)          : fond #2e7d32 / texte #ffffff
//   - États bleus (info M3)             : fond #1565c0 / texte #ffffff
//
// Cf. https://m3.material.io/styles/color/the-color-system/key-colors-tones
// pour le détail des tonalités.

import type { Tier, TierOptions } from './statTier';

/** Seuils (upperBound) communs à toutes les jauges. */
const TIER_UPPER_BOUNDS = [0.2, 0.4, 0.6, 0.8, Infinity] as const;

/**
 * Helper pour construire une liste de paliers à partir de labels + couleurs
 * de fond + couleurs de texte. Réduit la verbosité et garantit que chaque
 * palier a un couple { fond, texte } cohérent.
 */
function buildTiers(
  labels: [string, string, string, string, string],
  colors: [string, string, string, string, string],
  textColors: [string, string, string, string, string],
): Tier[] {
  return TIER_UPPER_BOUNDS.map((upperBound, i) => ({
    upperBound,
    label: labels[i],
    color: colors[i],
    textColor: textColors[i],
  }));
}

// --- Santé : 5 paliers de "mort" (ratio=0) à "stable" (ratio=1) -------------
// Convention d'écriture : 1er palier du tableau = actif à ratio=0,
// dernier = actif à ratio=1 (cf. statTier.ts).
//   - 0%   → "Mort" (1er palier, upperBound=0.2)
//   - <20% → "Mourant"
//   - <40% → "Gravement blessé"
//   - <60% → "Blessé"
//   - <80% jusqu'à 100% → "Stable" (dernier palier, upperBound=∞)
//
// Couleurs M3 : rouge profond → ambre → lime → vert sapin. Texte
// blanc sur les fonds saturés, texte sombre sur les pastilles claires.
const HEALTH_TIERS_LABELS = ['Mort', 'Mourant', 'Gravement blessé', 'Blessé', 'Stable'] as const;
const HEALTH_TIERS_COLORS = ['#b3261e', '#f9a825', '#fdd835', '#9ccc65', '#2e7d32'] as const;
const HEALTH_TIERS_TEXT_COLORS = ['#ffffff', '#1f1500', '#1f1500', '#1f1500', '#ffffff'] as const;

const HEALTH_TIERS_UPPER_BOUNDS = [Number.MIN_VALUE, 0.25, 0.5, 0.75, Infinity] as const;

export const HEALTH_TIERS: TierOptions = {
  tiers: HEALTH_TIERS_UPPER_BOUNDS.map((upperBound, i) => ({
    upperBound,
    label: HEALTH_TIERS_LABELS[i],
    color: HEALTH_TIERS_COLORS[i],
    textColor: HEALTH_TIERS_TEXT_COLORS[i],
  })),
};

// --- Mental : 5 paliers de "folie" (ratio=0) à "motivé" (ratio=1) -----------
//   - 0%   → "Folie" (1er palier, upperBound=0.2)
//   - <20% → "Déprimé"
//   - <40% → "Faible"
//   - <60% → "Normal"
//   - <80% jusqu'à 100% → "Motivé" (dernier palier, upperBound=∞)
//
// Couleurs M3 : violet profond → bleu acier (palette M3 "tertiary +
// primary" des thèmes sombres). Toutes lisibles en light & dark.
const MENTAL_TIERS_LABELS = ['Folie', 'Déprimé', 'Faible', 'Normal', 'Motivé'] as const;
const MENTAL_TIERS_COLORS = ['#4a148c', '#7b1fa2', '#42a5f5', '#1976d2', '#0d47a1'] as const;
const MENTAL_TIERS_TEXT_COLORS = ['#ffffff', '#ffffff', '#0d1b2a', '#ffffff', '#ffffff'] as const;
export const MENTAL_TIERS: TierOptions = {
  tiers: buildTiers(
    [...MENTAL_TIERS_LABELS],
    [...MENTAL_TIERS_COLORS],
    [...MENTAL_TIERS_TEXT_COLORS],
  ),
};

// --- Armure : "max = lourd" — 100% = "Très lourde" (gênant côté mobilité) ---
// Tableau trié dans l'ordre du ratio croissant (du plus léger au plus
// lourd). Pas de flag `inverted` : le tableau est directement trié
// dans l'ordre naturel des valeurs.
//   - 0% (ratio < 0.2)   → "Inexistante" (1er palier, upperBound=0.2)
//   - <20%               → "Légère"
//   - <40%               → "normal"
//   - <60%               → "lourde"
//   - <80% jusqu'à 100% → "Très lourde" (dernier palier, upperBound=∞)
//
// Couleurs M3 : surface neutre (gris bleuté, "surfaceContainerHigh" M3)
// → brun M3 ("brown" tonal palette). Le premier palier est volontairement
// discret (gris) car c'est l'état "pas d'armure" — pas besoin d'alerter.
const ARMOR_TIERS_LABELS = ['Inexistante', 'Légère', 'normal', 'lourde', 'Très lourde'] as const;
const ARMOR_TIERS_COLORS = ['#c4c7c5', '#aab2bd', '#8d8d8d', '#6f4e37', '#3e2723'] as const;
const ARMOR_TIERS_TEXT_COLORS = ['#1f2123', '#1f2123', '#1f2123', '#ffffff', '#ffffff'] as const;
export const ARMOR_TIERS: TierOptions = {
  tiers: buildTiers(
    [...ARMOR_TIERS_LABELS],
    [...ARMOR_TIERS_COLORS],
    [...ARMOR_TIERS_TEXT_COLORS],
  ),
};

// --- Astra : 5 paliers de "épuisé" (ratio=0) à "surchargé" (ratio=1) -------
//   - 0%   → "Epuisé" (1er palier, upperBound=0.2)
//   - <20% → "Faible"
//   - <40% → "Correct"
//   - <60% → "Chargé"
//   - <80% jusqu'à 100% → "Surchargé" (dernier palier, upperBound=∞)
//
// Couleurs M3 : palette "tertiary" ambre/orange de Material 3
// (T90→T30). Rouge orangé vif pour les états dangereux, jaune-ambre
// pour les états intermédiaires.
const ASTRA_TIERS_LABELS = ['Epuisé', 'Faible', 'Correct', 'Chargé', 'Surchargé'] as const;
const ASTRA_TIERS_COLORS = ['#bf360c', '#e65100', '#f9a825', '#ef6c00', '#c62828'] as const;
const ASTRA_TIERS_TEXT_COLORS = ['#ffffff', '#1f1500', '#1f1500', '#1f1500', '#ffffff'] as const;
export const ASTRA_TIERS: TierOptions = {
  tiers: buildTiers(
    [...ASTRA_TIERS_LABELS],
    [...ASTRA_TIERS_COLORS],
    [...ASTRA_TIERS_TEXT_COLORS],
  ),
};

// --- Poids : 100% = "Surchargé" (gênant côté encombrement) -----------------
// Tableau trié du plus léger au plus lourd :
//   - 0% (ratio < 0.2)   → "Minimum" (rien porté, à l'aise)
//   - <20%               → "Leger"
//   - <40%               → "Normal"
//   - <60%               → "Chargé"
//   - <80% jusqu'à 100% → "Surchargé" (au max de la capacité, malus)
//
// Couleurs M3 : vert sapin (succès, "primary" M3) → ambre → rouge
// ("error" M3). Codage universel "feu tricolore" : vert = ok, jaune =
// attention, rouge = surcharge. Lisible en light & dark mode.
const WEIGHT_TIERS_LABELS = ['Minimum', 'Leger', 'Normal', 'Chargé', 'Surchargé'] as const;
const WEIGHT_TIERS_COLORS = ['#2e7d32', '#66bb6a', '#fdd835', '#fb8c00', '#c62828'] as const;
const WEIGHT_TIERS_TEXT_COLORS = ['#ffffff', '#0d1b2a', '#1f1500', '#1f1500', '#ffffff'] as const;
export const WEIGHT_TIERS: TierOptions = {
  tiers: buildTiers(
    [...WEIGHT_TIERS_LABELS],
    [...WEIGHT_TIERS_COLORS],
    [...WEIGHT_TIERS_TEXT_COLORS],
  ),
};
