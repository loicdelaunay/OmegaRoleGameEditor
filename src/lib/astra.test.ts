// src/lib/astra.test.ts
//
// Tests unitaires pour le calcul de l'Astra Max.
// Lancé via `node --import tsx --test src/lib/astra.test.ts` (cf. script `npm test`).
//
// Couvre :
//   - Formule nominale : 15 (base) + Maîtrise Astra (actuelle) + Σ(astraMod)
//   - Base personnalisable
//   - Robustesse (NaN, valeurs négatives, listes nulles/vides)
//   - Régression : un `astra.max` arbitraire issu d'un ancien JSON doit être
//     écrasé par la valeur calculée, sans laisser l'utilisateur le saisir à la main.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAstraMax, ASTRA_MAX_BASE } from './astra.ts';

describe('computeAstraMax — formule par défaut', () => {
  it('Maitrise Astra 10, aucun mod → Astra Max = 25 (15 + 10)', () => {
    const max = computeAstraMax(10, [], []);
    assert.equal(max, 25);
  });

  it('Maitrise Astra 0 → Astra Max = 15 (base seule)', () => {
    const max = computeAstraMax(0, [], []);
    assert.equal(max, 15);
  });

  it('Maitrise Astra 13 + 2 mods astra (équipement +3, modifs +2) → 15 + 13 + 5 = 33', () => {
    const equipment = [{ astraMod: 3 }];
    const modificateurs = [{ astraMod: 2 }];
    const max = computeAstraMax(13, equipment, modificateurs);
    assert.equal(max, 33);
  });

  it('Plusieurs équipements, certains sans astraMod → seuls les définis comptent', () => {
    const equipment = [
      { description: 'Épée', astraMod: 5 },
      { description: 'Lampe', astraMod: 0 },  // défini mais 0
      { description: 'Potion' },              // pas de astraMod
    ];
    const max = computeAstraMax(10, equipment, []);
    assert.equal(max, 30); // 15 + 10 + 5
  });
});

describe('computeAstraMax — base personnalisable', () => {
  it('Base 20 (archétype puissant) + Maitrise Astra 10 + 0 mod → 30', () => {
    const max = computeAstraMax(10, [], [], { base: 20 });
    assert.equal(max, 30);
  });

  it('ASTRA_MAX_BASE exporté = 15 (cohérent avec constants.ts)', () => {
    assert.equal(ASTRA_MAX_BASE, 15);
  });
});

describe('computeAstraMax — robustesse', () => {
  it('Liste d\'équipement `null` ou `undefined` → pas de plantage, somme = 0', () => {
    assert.equal(computeAstraMax(10, null, undefined), 25);
  });

  it('astraMod manquant sur un item → ignoré (pas de NaN)', () => {
    const equipment = [
      {},
      { astraMod: undefined },
      { astraMod: null },
      { astraMod: 'abc' },  // NaN → ignoré
      { astraMod: 4 },
    ];
    const max = computeAstraMax(10, equipment, []);
    assert.equal(max, 29); // 15 + 10 + 4
  });

  it('Maitrise Astra NaN → traitée comme 0 (pas de NaN propagé)', () => {
    const max = computeAstraMax(NaN, [], []);
    assert.equal(max, 15);
  });

  it('Résultat négatif (base 0 + Maitrise Astra -20 + mod -10) → plancher 0', () => {
    // base 0 + Maitrise Astra -20 + mod -10 = -30 → Math.max(0, ...) = 0
    const max = computeAstraMax(-20, [{ astraMod: -10 }], [], { base: 0 });
    assert.equal(max, 0);
  });

  it('Mods astra négatifs (rares mais possibles : désactivation) → soustraits', () => {
    const max = computeAstraMax(10, [{ astraMod: -3 }], []);
    assert.equal(max, 22); // 15 + 10 - 3
  });
});

// =============================================================================
// RÉGRESSION : Astra Max doit suivre Maitrise Astra + Σ(astraMod), pas une valeur
// saisie à la main dans le JSON.
// =============================================================================
// Contexte : avant ce fix, l'utilisateur pouvait saisir librement
// `character.stats.astra.max` dans l'UI. Le state sauvegardé dans le JSON
// pouvait donc diverger de la formule `15 + Maitrise Astra + Σ mods`.
// Symptôme observé : un personnage avec Maitrise Astra 13 et +5 de mods avait
// un Astra Max à 10 (saisie d'origine) au lieu de 33.
//
// Ce test vérifie que la fonction de calcul ignore toute notion de "max
// existant" et retourne toujours la valeur dérivée de la Maitrise Astra et
// des mods — c'est ce qui justifie que l'input UI passe en readOnly.
describe('REGRESSION — Astra Max = 15 + Maitrise Astra actuelle + Σ(astrMod)', () => {
  it('Scénario nominal : Maitrise Astra 13, +5 mods → 33 (pas la valeur JSON d\'origine)', () => {
    const equipment = [{ astraMod: 3 }, { astraMod: 2 }];
    const max = computeAstraMax(13, equipment, []);
    assert.equal(max, 33, 'Astra Max doit être dérivé de la formule, pas d\'un max JSON arbitraire.');
  });

  it('Avec modificateurs ET équipements, la somme cumule les deux', () => {
    const equipment = [{ astraMod: 4 }];
    const modificateurs = [{ astraMod: 6 }];
    const max = computeAstraMax(12, equipment, modificateurs);
    assert.equal(max, 37); // 15 + 12 + 4 + 6
  });

  it('Pureté : la fonction ne mute pas ses entrées', () => {
    const equipment = [{ astraMod: 5 }];
    const modificateurs = [{ astraMod: -2 }];
    const equipSnapshot = JSON.stringify(equipment);
    const modSnapshot = JSON.stringify(modificateurs);
    computeAstraMax(10, equipment, modificateurs);
    assert.equal(JSON.stringify(equipment), equipSnapshot, 'équipement non muté');
    assert.equal(JSON.stringify(modificateurs), modSnapshot, 'modificateurs non muté');
  });

  it('Cohérence : même Maitrise Astra, même mods → même max (déterministe)', () => {
    const equipment = [{ astraMod: 1 }];
    const modificateurs = [{ astraMod: 2 }];
    const a = computeAstraMax(10, equipment, modificateurs);
    const b = computeAstraMax(10, equipment, modificateurs);
    assert.equal(a, b);
  });

  it('Caractéristique source = Maitrise Astra, PAS Intelligence', () => {
    // Si on passait l'Intelligence à la place de la Maitrise Astra, on aurait
    // des valeurs différentes. On vérifie que la stat source influence bien
    // le résultat.
    const withMastery10 = computeAstraMax(10, [], []);
    const withMastery20 = computeAstraMax(20, [], []);
    assert.equal(withMastery10, 25);
    assert.equal(withMastery20, 35);
    // La différence entre les deux est exactement la différence de Maitrise Astra.
    assert.equal(withMastery20 - withMastery10, 10);
  });
});
