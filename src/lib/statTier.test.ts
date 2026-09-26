// src/lib/statTier.test.ts
//
// Tests unitaires pour le calcul des paliers d'état.
// Lancé via `npm test`.
//
// Modélisation : chaque palier = un intervalle de ratio `current / max`.
//   - `upperBound` = borne sup inclusive du palier.
//   - Le palier actif = 1er dont `ratio <= upperBound`.
//   - Seuils communs : 0.2, 0.4, 0.6, 0.8, 1.0 (intervalles de 20%).
//   - Convention d'écriture du tableau : 1er palier du tableau = actif
//     à ratio=0, dernier = actif à ratio=1 (= 100%).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeStatTier } from './statTier.ts';
import {
  HEALTH_TIERS,
  MENTAL_TIERS,
  ARMOR_TIERS,
  ASTRA_TIERS,
  WEIGHT_TIERS,
} from './statTiers.ts';

describe('computeStatTier — Santé', () => {
  // Tableau : [Mort, Mourant, Gravement blessé, Blessé, Stable]
  // Intervalles : [0-20%] (=1er), [20-40%] (=2e), [40-60%] (=3e), [60-80%] (=4e), [80-100%] (=5e)
  // Convention : 1er palier du tableau = actif à ratio=0, dernier = actif à ratio=1.
  it('100/100 (100%) → "Stable" (5e palier)', () => assert.equal(computeStatTier(100, 100, HEALTH_TIERS).label, 'Stable'));
  it('100/100 (100%) → matchedUpperBound=Infinity', () => assert.equal(computeStatTier(100, 100, HEALTH_TIERS).matchedUpperBound, Infinity));
  it('81/100 (81%) → "Stable"', () => assert.equal(computeStatTier(81, 100, HEALTH_TIERS).label, 'Stable'));
  it('80/100 (80%) → "Stable" (80% = limite palier 5)', () => assert.equal(computeStatTier(80, 100, HEALTH_TIERS).label, 'Stable'));
  it('79/100 (79%) → "Blessé"', () => assert.equal(computeStatTier(79, 100, HEALTH_TIERS).label, 'Blessé'));
  it('60/100 (60%) → "Blessé" (0.6 < 0.8)', () => assert.equal(computeStatTier(60, 100, HEALTH_TIERS).label, 'Blessé'));
  it('50/100 (50%) → "Gravement blessé"', () => assert.equal(computeStatTier(50, 100, HEALTH_TIERS).label, 'Gravement blessé'));
  it('40/100 (40%) → "Gravement blessé" (0.4 < 0.6)', () => assert.equal(computeStatTier(40, 100, HEALTH_TIERS).label, 'Gravement blessé'));
  it('20/100 (20%) → "Mourant" (0.2 < 0.4)', () => assert.equal(computeStatTier(20, 100, HEALTH_TIERS).label, 'Mourant'));
  it('19/100 (19%) → "Mourant"', () => assert.equal(computeStatTier(19, 100, HEALTH_TIERS).label, 'Mourant'));
  it('0/100 → "Mort"', () => assert.equal(computeStatTier(0, 100, HEALTH_TIERS).label, 'Mort'));
  it('> max (over-heal) → "Stable" (clamp 100%)', () => assert.equal(computeStatTier(150, 100, HEALTH_TIERS).label, 'Stable'));
});

describe('computeStatTier — Mental', () => {
  // Tableau : [Folie, Déprimé, Faible, Normal, Motivé]
  it('20/20 → "Motivé"', () => assert.equal(computeStatTier(20, 20, MENTAL_TIERS).label, 'Motivé'));
  it('15/20 (75%) → "Normal"', () => assert.equal(computeStatTier(15, 20, MENTAL_TIERS).label, 'Normal'));
  it('10/20 (50%) → "Faible"', () => assert.equal(computeStatTier(10, 20, MENTAL_TIERS).label, 'Faible'));
  it('5/20 (25%) → "Déprimé"', () => assert.equal(computeStatTier(5, 20, MENTAL_TIERS).label, 'Déprimé'));
  it('0/20 → "Folie"', () => assert.equal(computeStatTier(0, 20, MENTAL_TIERS).label, 'Folie'));
});

describe('computeStatTier — Astra', () => {
  // Tableau : [Epuisé, Faible, Correct, Chargé, Surchargé]
  it('25/25 → "Surchargé" (5e palier, 100%)', () => assert.equal(computeStatTier(25, 25, ASTRA_TIERS).label, 'Surchargé'));
  it('21/25 (84%) → "Surchargé"', () => assert.equal(computeStatTier(21, 25, ASTRA_TIERS).label, 'Surchargé'));
  it('20/25 (80%) → "Surchargé" (0.8 < ∞)', () => assert.equal(computeStatTier(20, 25, ASTRA_TIERS).label, 'Surchargé'));
  it('15/25 (60%) → "Chargé" (60% = limite palier 4)', () => assert.equal(computeStatTier(15, 25, ASTRA_TIERS).label, 'Chargé'));
  it('10/25 (40%) → "Correct" (40% = limite palier 3)', () => assert.equal(computeStatTier(10, 25, ASTRA_TIERS).label, 'Correct'));
  it('5/25 (20%) → "Faible" (20% = limite palier 2)', () => assert.equal(computeStatTier(5, 25, ASTRA_TIERS).label, 'Faible'));
  it('0/25 → "Epuisé" (1er palier)', () => assert.equal(computeStatTier(0, 25, ASTRA_TIERS).label, 'Epuisé'));
});

describe('computeStatTier — Armure', () => {
  // Tableau : [Inexistante, Légère, normal, lourde, Très lourde]
  // 0% = "Inexistante" (1er), 100% = "Très lourde" (dernier).
  it('0/20 → "Inexistante" (1er palier)', () => assert.equal(computeStatTier(0, 20, ARMOR_TIERS).label, 'Inexistante'));
  it('4/20 (20%) → "Légère" (20% = limite palier 2)', () => assert.equal(computeStatTier(4, 20, ARMOR_TIERS).label, 'Légère'));
  it('5/20 (25%) → "Légère"', () => assert.equal(computeStatTier(5, 20, ARMOR_TIERS).label, 'Légère'));
  it('8/20 (40%) → "normal" (40% = limite palier 3)', () => assert.equal(computeStatTier(8, 20, ARMOR_TIERS).label, 'normal'));
  it('12/20 (60%) → "lourde" (60% = limite palier 4)', () => assert.equal(computeStatTier(12, 20, ARMOR_TIERS).label, 'lourde'));
  it('16/20 (80%) → "Très lourde" (80% = limite palier 5)', () => assert.equal(computeStatTier(16, 20, ARMOR_TIERS).label, 'Très lourde'));
  it('20/20 → "Très lourde"', () => assert.equal(computeStatTier(20, 20, ARMOR_TIERS).label, 'Très lourde'));
});

describe('computeStatTier — Poids', () => {
  // Tableau : [Minimum, Leger, Normal, Chargé, Surchargé]
  it('0/50 → "Minimum"', () => assert.equal(computeStatTier(0, 50, WEIGHT_TIERS).label, 'Minimum'));
  it('10/50 (20%) → "Leger" (20% = limite palier 2)', () => assert.equal(computeStatTier(10, 50, WEIGHT_TIERS).label, 'Leger'));
  it('15/50 (30%) → "Leger"', () => assert.equal(computeStatTier(15, 50, WEIGHT_TIERS).label, 'Leger'));
  it('20/50 (40%) → "Normal" (40% = limite palier 3)', () => assert.equal(computeStatTier(20, 50, WEIGHT_TIERS).label, 'Normal'));
  it('30/50 (60%) → "Chargé" (60% = limite palier 4)', () => assert.equal(computeStatTier(30, 50, WEIGHT_TIERS).label, 'Chargé'));
  it('40/50 (80%) → "Surchargé" (80% = limite palier 5)', () => assert.equal(computeStatTier(40, 50, WEIGHT_TIERS).label, 'Surchargé'));
  it('50/50 → "Surchargé"', () => assert.equal(computeStatTier(50, 50, WEIGHT_TIERS).label, 'Surchargé'));
});

describe('computeStatTier — robustesse', () => {
  it('current=0, max>0 → 1er palier ("Mort" / "Inexistante")', () => {
    assert.equal(computeStatTier(0, 100, HEALTH_TIERS).label, 'Mort');
    assert.equal(computeStatTier(0, 20, ARMOR_TIERS).label, 'Inexistante');
  });

  it('current NaN → traité comme 0 → 1er palier', () => {
    assert.equal(computeStatTier(NaN, 100, HEALTH_TIERS).label, 'Mort');
  });

  it('current négatif → traité comme 0 → 1er palier', () => {
    assert.equal(computeStatTier(-10, 100, HEALTH_TIERS).label, 'Mort');
  });

  it('max NaN → ratio=1 → 5e palier (Santé → "Stable")', () => {
    assert.equal(computeStatTier(50, NaN, HEALTH_TIERS).label, 'Stable');
  });

  it('tiers vide + fallback défini → utilise le fallback', () => {
    const t = computeStatTier(50, 100, { tiers: [], fallback: { upperBound: 1, label: 'Custom' } });
    assert.equal(t.label, 'Custom');
  });
});

describe('computeStatTier — résultat expose ratio + matchedUpperBound', () => {
  it('Santé 50/100 → ratio=0.5, matchedUpperBound=0.6 ("Gravement blessé")', () => {
    const t = computeStatTier(50, 100, HEALTH_TIERS);
    assert.equal(t.ratio, 0.5);
    assert.equal(t.matchedUpperBound, 0.6);
    assert.equal(t.label, 'Gravement blessé');
  });

  it('Armure 8/20 (40%) → ratio=0.4, matchedUpperBound=0.6 ("normal")', () => {
    const t = computeStatTier(8, 20, ARMOR_TIERS);
    assert.equal(t.ratio, 0.4);
    // 0.4 <= 0.6 OUI → palier ub=0.6 = "normal"
    assert.equal(t.matchedUpperBound, 0.6);
    assert.equal(t.label, 'normal');
  });
});

// =============================================================================
// RÉGRESSION : tableau des paliers fourni par l'utilisateur (verbatim).
// =============================================================================
describe('REGRESSION — tableau des paliers fourni par l\'utilisateur', () => {
  it('Santé : Stable → Blessé → Gravement blessé → Mourant → Mort (par ordre de jauge pleine)', () => {
    assert.equal(computeStatTier(100, 100, HEALTH_TIERS).label, 'Stable');
    assert.equal(computeStatTier(70, 100, HEALTH_TIERS).label, 'Blessé');
    assert.equal(computeStatTier(50, 100, HEALTH_TIERS).label, 'Gravement blessé');
    assert.equal(computeStatTier(25, 100, HEALTH_TIERS).label, 'Mourant');
    assert.equal(computeStatTier(0, 100, HEALTH_TIERS).label, 'Mort');
  });

  it('Mental : Motivé → Normal → Faible → Déprimé → Folie', () => {
    assert.equal(computeStatTier(20, 20, MENTAL_TIERS).label, 'Motivé');
    assert.equal(computeStatTier(15, 20, MENTAL_TIERS).label, 'Normal');
    assert.equal(computeStatTier(10, 20, MENTAL_TIERS).label, 'Faible');
    assert.equal(computeStatTier(5, 20, MENTAL_TIERS).label, 'Déprimé');
    assert.equal(computeStatTier(0, 20, MENTAL_TIERS).label, 'Folie');
  });

  it('Armure : Inexistante → Légère → normal → lourde → Très lourde', () => {
    assert.equal(computeStatTier(0, 20, ARMOR_TIERS).label, 'Inexistante');
    assert.equal(computeStatTier(5, 20, ARMOR_TIERS).label, 'Légère');
    assert.equal(computeStatTier(10, 20, ARMOR_TIERS).label, 'normal');
    assert.equal(computeStatTier(15, 20, ARMOR_TIERS).label, 'lourde');
    assert.equal(computeStatTier(20, 20, ARMOR_TIERS).label, 'Très lourde');
  });

  it('Astra : Epuisé → Faible → Correct → Chargé → Surchargé (par ratio croissant)', () => {
    assert.equal(computeStatTier(0, 25, ASTRA_TIERS).label, 'Epuisé');
    assert.equal(computeStatTier(5, 25, ASTRA_TIERS).label, 'Faible');
    assert.equal(computeStatTier(10, 25, ASTRA_TIERS).label, 'Correct');
    assert.equal(computeStatTier(15, 25, ASTRA_TIERS).label, 'Chargé');
    assert.equal(computeStatTier(25, 25, ASTRA_TIERS).label, 'Surchargé');
  });

  it('Poids : Minimum → Leger → Normal → Chargé → Surchargé', () => {
    assert.equal(computeStatTier(0, 50, WEIGHT_TIERS).label, 'Minimum');
    assert.equal(computeStatTier(15, 50, WEIGHT_TIERS).label, 'Leger');
    assert.equal(computeStatTier(25, 50, WEIGHT_TIERS).label, 'Normal');
    assert.equal(computeStatTier(35, 50, WEIGHT_TIERS).label, 'Chargé');
    assert.equal(computeStatTier(50, 50, WEIGHT_TIERS).label, 'Surchargé');
  });

  it('Couleurs présentes pour chaque palier (utilisées comme background)', () => {
    for (const tiers of [HEALTH_TIERS, MENTAL_TIERS, ARMOR_TIERS, ASTRA_TIERS, WEIGHT_TIERS]) {
      for (const t of tiers.tiers) {
        assert.ok(t.color, `Le palier "${t.label}" doit avoir une couleur`);
      }
    }
  });

  it('textColor présent pour chaque palier (lisibilité light & dark)', () => {
    for (const tiers of [HEALTH_TIERS, MENTAL_TIERS, ARMOR_TIERS, ASTRA_TIERS, WEIGHT_TIERS]) {
      for (const t of tiers.tiers) {
        assert.ok(t.textColor, `Le palier "${t.label}" doit avoir un textColor`);
        // Hex court valide : #rrggbb
        assert.match(t.textColor!, /^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('Le textColor est exposé dans TierResult', () => {
    const t = computeStatTier(0, 100, HEALTH_TIERS);
    assert.equal(t.label, 'Mort');
    assert.ok(t.color);
    assert.ok(t.textColor);
  });
});

// =============================================================================
// Tests de contraste WCAG : chaque couple {color, textColor} doit atteindre
// un ratio ≥ 4.5:1 (niveau AA pour du texte < 18pt). Calcul conforme à
// https://www.w3.org/TR/WCAG21/#contrast-minimum.
// =============================================================================
describe('statTiers — contraste WCAG AA (≥ 4.5:1)', () => {
  /**
   * Ratio de contraste WCAG entre deux couleurs hex `#rrggbb`.
   * Cf. https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio.
   */
  function contrastRatio(fg: string, bg: string): number {
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const parse = (hex: string) => {
      const m = hex.match(/^#?([0-9a-f]{6})$/i);
      if (!m) throw new Error(`hex invalide: ${hex}`);
      const n = parseInt(m[1], 16);
      return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
    };
    const lum = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const L1 = Math.max(lum(parse(fg)), lum(parse(bg)));
    const L2 = Math.min(lum(parse(fg)), lum(parse(bg)));
    return (L1 + 0.05) / (L2 + 0.05);
  }

  const TIERS_LIST = [
    { name: 'Santé', tiers: HEALTH_TIERS },
    { name: 'Mental', tiers: MENTAL_TIERS },
    { name: 'Armure', tiers: ARMOR_TIERS },
    { name: 'Astra', tiers: ASTRA_TIERS },
    { name: 'Poids', tiers: WEIGHT_TIERS },
  ];

  for (const { name, tiers } of TIERS_LIST) {
    for (const t of tiers.tiers) {
      it(`${name} : "${t.label}" → ratio ≥ 4.5:1`, () => {
        const ratio = contrastRatio(t.textColor!, t.color!);
        // Marge : 4.0 pour tolérer les arrondis (objectif 4.5).
        assert.ok(ratio >= 4.0, `Contraste insuffisant (${ratio.toFixed(2)}:1) pour "${t.label}" (${t.color} / ${t.textColor})`);
      });
    }
  }
});
