// src/lib/characterVitals.test.ts
//
// Tests unitaires pour la logique de calcul du modificateur de réussite.
// Lancé via `node --test --import tsx src/lib/characterVitals.test.ts`.
//
// Couvre :
//   - Cas nominal (100% / 100%, 0% / 0%, milieu)
//   - Palier critique
//   - Pondération Santé / Mental
//   - Bornes personnalisées
//   - Régression du bug "État global 76% alors que Santé=100% et Mental=100%"
//     (l'input readOnly Max Santé/Mental doit suivre la même formule que la table)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSuccessModifierFromVitals,
  getVitalsPercents,
  SUCCESS_MODIFIER_MIN,
  SUCCESS_MODIFIER_MAX,
} from './characterVitals.ts';

describe('computeSuccessModifierFromVitals — cas par défaut', () => {
  it('100% / 100% → mod plancher (avantage maximal, -10 par défaut)', () => {
    const mod = computeSuccessModifierFromVitals(20, 20, 20, 20);
    assert.equal(mod, SUCCESS_MODIFIER_MIN);
    assert.equal(mod, -10);
  });

  it('0% / 0% → mod plafond (malus maximal, +25 par défaut)', () => {
    const mod = computeSuccessModifierFromVitals(0, 20, 0, 20);
    assert.equal(mod, SUCCESS_MODIFIER_MAX);
    assert.equal(mod, 25);
  });

  it('50% / 50% → interpolation lissée avec le seuil de 10%', () => {
    const mod = computeSuccessModifierFromVitals(10, 20, 10, 20);
    // avg = 0.5. t = 0.1. effectiveAvg = (0.5 - 0.1) / 0.9 = 4/9.
    // raw = -10 + 35 * (1 - 4/9) = -10 + 35 * 5/9 = 9.444 → round → 9
    assert.equal(mod, 9);
  });

  it('Bornes : 0/20 santé + 20/20 mental', () => {
    // avg = 50%
    const mod = computeSuccessModifierFromVitals(0, 20, 20, 20);
    assert.equal(mod, 9);
  });
});

describe('computeSuccessModifierFromVitals — palier critique', () => {
  it('État global <= seuil (10%) → palier critique actif → mod = max', () => {
    const mod = computeSuccessModifierFromVitals(2, 20, 2, 20); // avg = 10%
    assert.equal(mod, 25);
  });

  it('État global > seuil (10%) → interpolation progressive', () => {
    // p = 4/20 = 0.20
    // avg = 0.20 ; effectiveAvg = (0.20 - 0.10) / 0.90 = 1/9
    // raw = -10 + 35 * (8/9) = 21.11 → 21
    const mod = computeSuccessModifierFromVitals(4, 20, 4, 20);
    assert.equal(mod, 21);
  });

  it('Seuil = 0 → palier désactivé (interpolation pure)', () => {
    const mod = computeSuccessModifierFromVitals(0, 20, 0, 20, { criticalThresholdPercent: 0 });
    // avg = 0 ; raw = -10 + 35*1 = 25
    assert.equal(mod, 25);
  });

  it('Seuil = 100 → palier désactivé (interpolation pure)', () => {
    const mod = computeSuccessModifierFromVitals(0, 20, 0, 20, { criticalThresholdPercent: 100 });
    assert.equal(mod, 25);
  });
});

describe('computeSuccessModifierFromVitals — pondération', () => {
  it('Poids Santé seul (wH=1, wM=0) → moyenne = %Santé', () => {
    // 50% santé, 100% mental, poids H=1, M=0
    // avg = (0.5*1 + 1*0) / 1 = 0.5 ; raw = -10 + 25*0.5 = 2.5 → 3
    const mod = computeSuccessModifierFromVitals(10, 20, 20, 20, { weightHealth: 1, weightMental: 0 });
    assert.equal(mod, 3);
  });

  it('Poids Mental dominant (wH=1, wM=2) sans palier → moyenne pondérée', () => {
    // Pour éviter le palier critique (mental=0% < 25%), on prend mental=10/20 = 50%
    // avg = (1*1 + 0.5*2) / 3 = 2/3 = 0.667 ; raw = -10 + 25*0.333 = -1.67 → -2
    const mod = computeSuccessModifierFromVitals(20, 20, 10, 20, { weightHealth: 1, weightMental: 2 });
    assert.equal(mod, -2);
  });

  it('Poids totaux = 0 → fallback moyenne simple 50/50', () => {
    // santé=100%, mental=50% (au-dessus palier) ; avg = 0.75 ; raw = -10 + 25*0.25 = -3.75 → -4
    const mod = computeSuccessModifierFromVitals(20, 20, 10, 20, { weightHealth: 0, weightMental: 0 });
    assert.equal(mod, -4);
  });
});

describe('computeSuccessModifierFromVitals — bornes personnalisées', () => {
  it('Bornes [-5, +5] : 100% / 100% → -5', () => {
    const mod = computeSuccessModifierFromVitals(20, 20, 20, 20, { min: -5, max: 5 });
    assert.equal(mod, -5);
  });

  it('Bornes [-5, +5] : 0% / 0% → +5', () => {
    const mod = computeSuccessModifierFromVitals(0, 20, 0, 20, { min: -5, max: 5 });
    assert.equal(mod, 5);
  });

  it('min > max (inversé) : 100% / 100% → "min" = +5 (l\'utilisateur a inversé)', () => {
    // min=+5, max=-5 ; lo=-5, hi=+5 ; à 100% on prend lo = -5
    // Mais 100% = avg=1 ; raw = lo + (hi-lo)*(1-1) = lo = -5
    const mod = computeSuccessModifierFromVitals(20, 20, 20, 20, { min: 5, max: -5 });
    assert.equal(mod, -5);
  });
});

describe('computeSuccessModifierFromVitals — robustesse aux entrées invalides', () => {
  it('max=0 → on retombe sur 100% plein (neutre)', () => {
    // clampPercent(0, 0) = 1 (cas "non initialisé")
    const mod = computeSuccessModifierFromVitals(0, 0, 0, 0);
    assert.equal(mod, -10);
  });

  it('current négatif → clamp à 0%', () => {
    const mod = computeSuccessModifierFromVitals(-5, 20, 20, 20);
    // avg = 50% → interpolation → 9
    assert.equal(mod, 9);
  });

  it('current > max (over-heal) → clamp à 100% (pas de bonus)', () => {
    const mod = computeSuccessModifierFromVitals(50, 20, 20, 20);
    assert.equal(mod, -10);
  });

  it('NaN current → 0% (sécurité)', () => {
    const mod = computeSuccessModifierFromVitals(NaN, 20, 20, 20);
    // avg = 50% → interpolation → 9
    assert.equal(mod, 9);
  });
});

describe('getVitalsPercents', () => {
  it('100% / 100% → { health: 1, mental: 1, average: 1 }', () => {
    const p = getVitalsPercents(20, 20, 20, 20);
    assert.equal(p.health, 1);
    assert.equal(p.mental, 1);
    assert.equal(p.average, 1);
  });

  it('0% / 0% → { health: 0, mental: 0, average: 0 }', () => {
    const p = getVitalsPercents(0, 20, 0, 20);
    assert.equal(p.health, 0);
    assert.equal(p.mental, 0);
    assert.equal(p.average, 0);
  });

  it('50% / 50% → average = 0.5', () => {
    const p = getVitalsPercents(10, 20, 10, 20);
    assert.equal(p.average, 0.5);
  });
});

// =============================================================================
// RÉGRESSION : bug "État global 76% alors que Santé=100% et Mental=100%"
// =============================================================================
// Contexte : dans CharacterSheetDialog, le state `character.stats.health.max`
// etait historiquement initialisé depuis la valeur JSON (statique) au lieu
// d'etre recalculé via la formule d'affichage (`endurance * 2 + level * 2`).
// Symptôme : le SuccessModifierPanel recevait healthMax=22 (statique JSON) alors
// que la table affichait endurance=13 → max calculé=28. Résultat : 22/28 = 79%
// au lieu de 100% quand l'utilisateur tapait la valeur courante dans le champ
// "Santé actuel" (22).
//
// Ce test verifie que la fonction de calcul du modificateur elle-meme est
// cohérente : avec max=22 et current=22, on DOIT obtenir 100% (mod plancher),
// PAS un état intermédiaire dû à une incohérence de max.
describe('REGRESSION — État global 100% quand Santé=100% et Mental=100%', () => {
  it('Santé 22/22 + Mental 22/22 → mod = -10 (avantage, pas de palier)', () => {
    const mod = computeSuccessModifierFromVitals(22, 22, 22, 22);
    assert.equal(mod, -10, 'Avec Santé et Mental à 100%, le mod doit être plancher (-10).');
  });

  it('Santé 22/28 + Mental 22/22 (cas "désynchro max") → mod cohérent avec le ratio réel', () => {
    // Si jamais la désynchro revient, on veut au moins que le panel affiche
    // le ratio basé sur le max qu'il reçoit (pas d'arrondi mystérieux).
    // 22/28 = 78.6% ; 22/22 = 100% ; avg = 89.3% ; raw = -10 + 25*0.107 = -7.3 → -7
    const mod = computeSuccessModifierFromVitals(22, 28, 22, 22);
    assert.equal(mod, -7);
  });

  it('Santé 100% et Mental 100% peu importe les max → toujours mod = -10', () => {
    // Test parametré : la règle "100% = plancher" doit être indépendante des max.
    const cas = [
      [22, 22, 22, 22],
      [28, 28, 22, 22],
      [10, 10, 10, 10],
      [1, 1, 1, 1],
    ] as const;
    for (const [hC, hM, mC, mM] of cas) {
      const mod = computeSuccessModifierFromVitals(hC, hM, mC, mM);
      assert.equal(mod, -10, `Cas (${hC}/${hM}, ${mC}/${mM}) devrait donner -10`);
    }
  });
});
