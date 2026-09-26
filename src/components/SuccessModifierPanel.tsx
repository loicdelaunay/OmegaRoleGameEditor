// src/components/SuccessModifierPanel.tsx
// Panneau d'affichage du **modificateur de réussite auto-calculé** à partir
// de la Santé et du Mental restants.
//
// Règle JDR (cf. `src/lib/characterVitals.ts`) :
//   - 100% santé + 100% mental → mod = plancher (défaut -10, avantage maximal)
//   - 0% santé + 0% mental   → mod = plafond (défaut +15, malus maximal)
//   - Interpolation linéaire sur la moyenne pondérée des deux pourcentages
//   - Palier critique : si Santé OU Mental < seuil (défaut 25%), mod = plafond.
//
// Le panneau est **read-only** : l'utilisateur n'édite plus le mod à la main.
// Il voit en temps réel l'impact de ses PV/Sanité sur la difficulté des jets.
//
// UI simplifiée : une seule barre bi-couleur "État global" remplace les
// anciennes barres individuelles Santé/Mental. Chaque portion est un Tooltip
// qui explique à quoi correspond sa couleur (rouge = Santé, bleu = Mental).

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import {
  computeSuccessModifierFromVitals,
  getVitalsPercents,
  type SuccessModifierOptions,
} from '../lib/characterVitals';

export interface SuccessModifierPanelProps {
  healthCurrent: number;
  healthMax: number;
  mentalCurrent: number;
  mentalMax: number;
  /** Plancher du mod (à 100%/100%). */
  modifierMin?: number;
  /** Plafond du mod (à 0%/0% ou palier critique). */
  modifierMax?: number;
  /** Seuil (0-100) du palier critique. */
  criticalThresholdPercent?: number;
  /** Poids relatif de la Santé. */
  weightHealth?: number;
  /** Poids relatif du Mental. */
  weightMental?: number;
}

/**
 * Formate un mod signé en chaîne lisible (`+5`, `-3`, `0`).
 */
function formatMod(mod: number): string {
  if (mod > 0) return `+${mod}`;
  if (mod < 0) return `${mod}`;
  return '0';
}

/**
 * Couleur de la pastille "mod" en fonction de sa valeur.
 *   - plancher (avantage max) → vert foncé
 *   - avantage                → vert
 *   - neutre                  → gris
 *   - malus léger             → orange
 *   - plafond (malus max)     → rouge
 */
function modColor(mod: number, lo: number, hi: number): string {
  if (hi <= lo) return '#9e9e9e';
  const range = hi - lo;
  if (mod <= lo + range * 0.05) return '#2e7d32'; // avantage max
  if (mod < (lo + hi) / 2) return '#66bb6a';      // avantage
  if (mod === 0) return '#9e9e9e';                // neutre
  if (mod >= hi - range * 0.05) return '#e53935'; // malus max
  if (mod > 0) return '#fb8c00';                  // malus modéré
  return '#9e9e9e';
}

/** Couleurs des deux portions de la barre État global. */
const HEALTH_COLOR = '#ef5350';   // rouge
const MENTAL_COLOR = '#42a5f5';   // bleu
const CRITICAL_COLOR = '#e53935'; // rouge palier critique

export const SuccessModifierPanel: React.FC<SuccessModifierPanelProps> = ({
  healthCurrent,
  healthMax,
  mentalCurrent,
  mentalMax,
  modifierMin,
  modifierMax,
  criticalThresholdPercent,
  weightHealth,
  weightMental,
}) => {
  // Regroupe les options avancées pour les passer à la fonction pure.
  const options: SuccessModifierOptions = {
    min: modifierMin,
    max: modifierMax,
    criticalThresholdPercent,
    weightHealth,
    weightMental,
  };
  const percents = getVitalsPercents(healthCurrent, healthMax, mentalCurrent, mentalMax);
  const autoMod = computeSuccessModifierFromVitals(
    healthCurrent,
    healthMax,
    mentalCurrent,
    mentalMax,
    options,
  );

  // Bornes effectives (pour affichage couleur cohérent).
  const lo = Math.min(modifierMin ?? -10, modifierMax ?? 15);
  const hi = Math.max(modifierMin ?? -10, modifierMax ?? 15);

  const pHealth = Math.round(percents.health * 100);
  const pMental = Math.round(percents.mental * 100);

  // Pondération : calcule la part de chaque jauge dans la barre empilée.
  const wH = weightHealth ?? 1;
  const wM = weightMental ?? 1;
  const wTotal = wH + wM;
  // Ratio dans la barre : 0.5/0.5 si poids 1/1, 0.66/0.33 si 2/1, etc.
  // Si poids totaux = 0, fallback 50/50.
  const healthShare = wTotal > 0 ? wH / wTotal : 0.5;
  const mentalShare = 1 - healthShare;
  // Pourcentage de remplissage de chaque portion : % de la jauge × part de la barre.
  // Ex : 80% santé avec part 50% → 40% de la barre totale en rouge.
  const healthFillRatio = percents.health * healthShare;
  const mentalFillRatio = percents.mental * mentalShare;
  // Total rempli (pour le label "État global XX%").
  const totalFillRatio = healthFillRatio + mentalFillRatio;
  const totalFillPct = Math.round(totalFillRatio * 100);
  const modStr = formatMod(autoMod);
  const modClr = modColor(autoMod, lo, hi);

  const threshold = criticalThresholdPercent ?? 10;
  const isCritical = threshold > 0 && (totalFillPct <= threshold);

  // Tooltip détaillé : formule + paramètres + résultat.
  const formula = `mod = ${modifierMin ?? -10} + ${(modifierMax ?? 25) - (modifierMin ?? -10)} × (1 - moyenne_pondérée(P_santé, P_mental))`;
  const weightsText = wTotal > 0
    ? `Poids Santé ${wH} / Mental ${wM} (total ${wTotal})`
    : `Poids Santé 1 / Mental 1 (par défaut)`;
  const tooltip = `${formula}\n` +
    `Plage : ${modifierMin ?? -10} (pleine forme) à ${modifierMax ?? 25} (à terre).\n` +
    `Palier critique : État global <= ${threshold}% → mod = ${modifierMax ?? 25}.\n` +
    `${weightsText}.\n` +
    `Santé ${pHealth}% · Mental ${pMental}% · État global ${totalFillPct}%.\n` +
    (isCritical ? `⚠ Palier critique ACTIF (${threshold}%)` : `Hors palier critique.`);

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        background: 'var(--md-sys-color-surface-container)',
        color: 'var(--md-sys-color-on-surface)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        border: isCritical ? '1px solid #e53935' : undefined,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
            Modificateur de réussite
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Calculé depuis la Santé et le Mental (auto, non éditable)
          </div>
        </Box>
        <Tooltip title={tooltip} placement="top" arrow>
          <Box
            data-testid="success-modifier-value"
            sx={{
              minWidth: 64,
              px: 1.5,
              py: 0.5,
              textAlign: 'center',
              background: 'var(--md-sys-color-surface)',
              border: `1px solid ${modClr}`,
              color: modClr,
              fontWeight: 'bold',
              borderRadius: '4px',
              fontSize: '1.1rem',
              cursor: 'help',
              userSelect: 'none',
            }}
          >
            {modStr}
          </Box>
        </Tooltip>
      </Box>

      <GlobalStateBar
        healthPercent={percents.health}
        mentalPercent={percents.mental}
        healthShare={healthShare}
        mentalShare={mentalShare}
        healthFillRatio={healthFillRatio}
        mentalFillRatio={mentalFillRatio}
        totalFillPct={totalFillPct}
        isCritical={isCritical}
        threshold={threshold}
      />

      {/* Libellé permanent des valeurs brutes : évite de devoir survoler
          chaque portion pour voir "Santé X / Y" et "Mental A / B".
          Pastilles de couleur pour rappeler le code de la barre. */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          fontSize: '0.7rem',
          color: 'var(--md-sys-color-on-surface-variant)',
          flexWrap: 'wrap',
        }}
      >
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', background: isCritical ? CRITICAL_COLOR : HEALTH_COLOR, display: 'inline-block' }} />
          <span>Santé {healthCurrent} / {healthMax}</span>
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', background: isCritical ? CRITICAL_COLOR : MENTAL_COLOR, display: 'inline-block' }} />
          <span>Mental {mentalCurrent} / {mentalMax}</span>
        </Box>
      </Box>

      {isCritical ? (
        <Box
          sx={{
            fontSize: '0.7rem',
            color: '#e53935',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          ⚠ Palier critique actif ({threshold}%)
        </Box>
      ) : null}
    </Box>
  );
};

interface GlobalStateBarProps {
  /** Pourcentage restant de la Santé (0..1). */
  healthPercent: number;
  /** Pourcentage restant du Mental (0..1). */
  mentalPercent: number;
  /** Part de la barre réservée à la Santé (selon pondération). */
  healthShare: number;
  /** Part de la barre réservée au Mental (selon pondération). */
  mentalShare: number;
  /** Ratio rempli de la portion Santé = healthPercent × healthShare. */
  healthFillRatio: number;
  /** Ratio rempli de la portion Mental = mentalPercent × mentalShare. */
  mentalFillRatio: number;
  /** Total rempli (healthFillRatio + mentalFillRatio) en pourcent (0..100). */
  totalFillPct: number;
  /** Vrai si palier critique actif (passe la barre en rouge). */
  isCritical: boolean;
  /** Seuil (0-100) du palier critique, pour info dans le tooltip. */
  threshold: number;
}

/**
 * Barre **bi-couleur empilée** représentant l'état global du personnage.
 * Rouge (Santé) à gauche, bleu (Mental) à droite. La largeur de chaque
 * portion dépend de la **pondération configurée** (poids Santé / poids Mental).
 * Si palier critique actif, les portions sous le seuil passent en rouge vif.
 *
 * Chaque portion a son propre Tooltip qui explique la couleur de façon
 * explicite : "● Couleur ROUGE = Santé (♥)" / "● Couleur BLEU = Mental (@)".
 */
const GlobalStateBar: React.FC<GlobalStateBarProps> = ({
  healthPercent,
  mentalPercent,
  healthShare,
  mentalShare,
  healthFillRatio,
  mentalFillRatio,
  totalFillPct,
  isCritical,
  threshold,
}) => {
  // Largeurs en % de la barre totale.
  const healthWidthPct = Math.max(0, Math.min(100, Math.round(healthShare * 100)));
  const mentalWidthPct = Math.max(0, Math.min(100 - healthWidthPct, Math.round(mentalShare * 100)));
  // Remplissage de chaque portion, normalisé par la taille de la portion.
  // Ex : 80% santé, share 50% → 80% rempli de la portion rouge.
  const healthFillInPortionPct = healthShare > 0
    ? Math.max(0, Math.min(100, Math.round((healthFillRatio / healthShare) * 100)))
    : 0;
  const mentalFillInPortionPct = mentalShare > 0
    ? Math.max(0, Math.min(100, Math.round((mentalFillRatio / mentalShare) * 100)))
    : 0;

  const pHealth = Math.round(healthPercent * 100);
  const pMental = Math.round(mentalPercent * 100);
  // Couleur effective de chaque portion (rouge palier si sous le seuil global).
  const healthColor = isCritical ? CRITICAL_COLOR : HEALTH_COLOR;
  const mentalColor = isCritical ? CRITICAL_COLOR : MENTAL_COLOR;

  // Tooltip par portion : explicite ce que représente la couleur et son
  // remplissage actuel (les valeurs brutes current/max sont déjà affichées
  // en permanence sous la barre, donc on ne les répète plus ici).
  const healthTooltip =
    `● Couleur ROUGE = Santé (♥)\n` +
    `Remplissage : ${pHealth}% de la portion Santé\n` +
    (isCritical
      ? `⚠ Palier critique global atteint (${threshold}%)`
      : `État global au-dessus du palier critique (${threshold}%)`) +
    `\nPortion : ${healthWidthPct}% de la barre (poids Santé dans le calcul)`;

  const mentalTooltip =
    `● Couleur BLEU = Mental (@)\n` +
    `Remplissage : ${pMental}% de la portion Mental\n` +
    (isCritical
      ? `⚠ Palier critique global atteint (${threshold}%)`
      : `État global au-dessus du palier critique (${threshold}%)`) +
    `\nPortion : ${mentalWidthPct}% de la barre (poids Mental dans le calcul)`;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface)' }}>
      <Box
        sx={{
          minWidth: 110,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: isCritical ? '#e53935' : undefined,
          fontWeight: isCritical ? 600 : 400,
        }}
      >
        <span>État global {totalFillPct}%</span>
      </Box>
      <Box
        data-testid="global-state-bar"
        sx={{
          flex: 1,
          height: 10,
          background: 'var(--md-sys-color-surface-container-highest)',
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          border: isCritical ? '1px solid #e53935' : '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        {/* Portion Santé (rouge) à gauche */}
        <Tooltip title={healthTooltip} placement="top" arrow enterDelay={100}>
          <Box
            data-testid="global-state-bar-health"
            sx={{
              width: `${healthWidthPct}%`,
              height: '100%',
              position: 'relative',
              borderRight: mentalWidthPct > 0 ? '1px solid rgba(0,0,0,0.4)' : 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${healthFillInPortionPct}%`,
                background: healthColor,
                transition: 'width 200ms ease-out',
              }}
            />
          </Box>
        </Tooltip>
        {/* Portion Mental (bleu) à droite */}
        <Tooltip title={mentalTooltip} placement="top" arrow enterDelay={100}>
          <Box
            data-testid="global-state-bar-mental"
            sx={{
              width: `${mentalWidthPct}%`,
              height: '100%',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${mentalFillInPortionPct}%`,
                background: mentalColor,
                transition: 'width 200ms ease-out',
              }}
            />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
};
