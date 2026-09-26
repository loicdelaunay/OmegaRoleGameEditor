// src/lib/armor.test.ts
//
// Tests unitaires pour le calcul de l'Armure.
// Lancé via `npm test` (cf. scripts dans package.json).
//
// Couvre :
//   - Max fixe (= 20 par défaut, surchargeable via options.max)
//   - Actuel = Σ(armorMod des équipements + modificateurs)
//   - Robustesse (listes nulles/vides, NaN, mods absents)
//   - Régression : un `armor.current` ou `armor.max` arbitraire issu d'un
//     ancien JSON doit être écrasé par la valeur calculée.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeArmorCurrent, computeArmorMax, ARMOR_MAX } from './armor.ts';

describe('computeArmorMax — constante du système', () => {
  it('Sans option → 20 (DEFAULT_ARMOR_MAX)', () => {
    assert.equal(computeArmorMax(), 20);
  });

  it('ARMOR_MAX exporté = 20 (cohérent avec constants.ts)', () => {
    assert.equal(ARMOR_MAX, 20);
  });

  it('Override via options.max', () => {
    assert.equal(computeArmorMax({ max: 30 }), 30);
    assert.equal(computeArmorMax({ max: 0 }), 0);
  });

  it('Override invalide (NaN) → retombe sur la constante', () => {
    assert.equal(computeArmorMax({ max: NaN }), 20);
  });
});

describe('computeArmorCurrent — Σ(armorMod)', () => {
  it('Aucun équipement, aucun modif → 0', () => {
    assert.equal(computeArmorCurrent([], []), 0);
  });

  it('Équipement avec armorMod +2 → 2', () => {
    assert.equal(computeArmorCurrent([{ armorMod: 2 }], []), 2);
  });

  it('Modif avec armorMod +3 → 3', () => {
    assert.equal(computeArmorCurrent([], [{ armorMod: 3 }]), 3);
  });

  it('Équipement +3 + modif +2 → 5 (somme des deux)', () => {
    const equipment = [{ armorMod: 3 }];
    const modificateurs = [{ armorMod: 2 }];
    assert.equal(computeArmorCurrent(equipment, modificateurs), 5);
  });

  it('Plusieurs équipements : cumul', () => {
    const equipment = [{ armorMod: 2 }, { armorMod: 3 }, { armorMod: 5 }];
    assert.equal(computeArmorCurrent(equipment, []), 10);
  });
});

describe('computeArmorCurrent — robustesse', () => {
  it('Listes null/undefined → 0 (pas de plantage)', () => {
    assert.equal(computeArmorCurrent(null, undefined), 0);
    assert.equal(computeArmorCurrent(undefined, null), 0);
  });

  it('Item sans armorMod → ignoré (pas de NaN)', () => {
    const equipment = [
      {},
      { armorMod: undefined },
      { armorMod: null },
      { armorMod: 'abc' },
      { armorMod: 4 },
    ];
    assert.equal(computeArmorCurrent(equipment, []), 4);
  });

  it('armorMod négatif → soustrait, plancher 0', () => {
    // Un malus d'armure (ex. armure maudite -2) soustrait, mais le total
    // ne descend jamais sous 0 (logique de jeu : on n\'a pas "d\'armure
    // négative", juste moins de protection).
    assert.equal(computeArmorCurrent([{ armorMod: -2 }], []), 0);
  });

  it('armorMod négatif compensé par un bonus → reste positif', () => {
    // +5 - 2 = 3
    const equipment = [{ armorMod: 5 }, { armorMod: -2 }];
    assert.equal(computeArmorCurrent(equipment, []), 3);
  });
});

// =============================================================================
// RÉGRESSION : armor.max = 20 constant, armor.current = Σ(armorMod).
// =============================================================================
// Contexte : avant ce fix, l'utilisateur pouvait saisir librement
// `character.stats.armor.max` dans l'UI. Le state sauvegardé dans le JSON
// pouvait donc diverger de la constante 20 et de l'équipement porté.
// Symptôme : un personnage avec armure totale 12 (Σ armorMod) avait armor.max
// = 10 (saisie d'origine), ce qui faussait la jauge et les calculs dérivés.
//
// Ce test vérifie que la fonction de calcul est stable et ignore toute
// notion de "max existant" ou "current existant".
describe('REGRESSION — armor: max constant, current = Σ(armorMod)', () => {
  it('Max constant : ne dépend pas de l\'équipement', () => {
    // Que l'équipement soit vide ou chargé, le max reste 20.
    assert.equal(computeArmorMax(), 20);
    assert.equal(computeArmorMax([{ armorMod: 100 }], []), 20);
  });

  it('Actuel = Σ(armorMod), pas une valeur arbitraire', () => {
    // 3 équipements avec armorMod total 8 → l'UI doit afficher 8.
    const equipment = [{ armorMod: 3 }, { armorMod: 2 }, { armorMod: 3 }];
    assert.equal(computeArmorCurrent(equipment, []), 8);
  });

  it('Cohérence : même équipement → même armor (déterministe)', () => {
    const equipment = [{ armorMod: 5 }];
    const a = computeArmorCurrent(equipment, []);
    const b = computeArmorCurrent(equipment, []);
    assert.equal(a, b);
  });

  it('Pureté : la fonction ne mute pas ses entrées', () => {
    const equipment = [{ armorMod: 5 }];
    const modificateurs = [{ armorMod: -2 }];
    const equipSnapshot = JSON.stringify(equipment);
    const modSnapshot = JSON.stringify(modificateurs);
    computeArmorCurrent(equipment, modificateurs);
    assert.equal(JSON.stringify(equipment), equipSnapshot, 'équipement non muté');
    assert.equal(JSON.stringify(modificateurs), modSnapshot, 'modificateurs non muté');
  });
});
