// src/lib/carryWeight.test.ts
//
// Tests unitaires pour le calcul du Poids porté et de la capacité de port.
// Lancé via `npm test` (cf. scripts dans package.json).
//
// Couvre :
//   - Poids actuel = Σ(weight) équipements + modifs + inventaire
//   - Capacité max = Force actuelle × 10 / 2 (≡ × 5)
//   - Robustesse (listes nulles/vides, NaN, items.quantity=0, etc.)
//   - Régression : valeurs arbitraires écrasées par le calcul.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCurrentWeight, computeCarryCapacityMax } from './carryWeight.ts';

describe('computeCarryCapacityMax — Force actuelle × 5', () => {
  it('Force 10 → 50 kg (10 × 10 / 2 = 50)', () => {
    assert.equal(computeCarryCapacityMax(10), 50);
  });

  it('Force 0 → 0 kg (plancher)', () => {
    assert.equal(computeCarryCapacityMax(0), 0);
  });

  it('Force 1 → 5 kg', () => {
    assert.equal(computeCarryCapacityMax(1), 5);
  });

  it('Force 20 → 100 kg', () => {
    assert.equal(computeCarryCapacityMax(20), 100);
  });

  it('Force NaN → 0 (sécurité)', () => {
    assert.equal(computeCarryCapacityMax(NaN), 0);
  });

  it('Force négative → 0 (plancher, on ne "perd" pas de capacité)', () => {
    assert.equal(computeCarryCapacityMax(-5), 0);
  });
});

describe('computeCurrentWeight — Σ(weight)', () => {
  it('Aucun item → 0 kg', () => {
    assert.equal(computeCurrentWeight([], []), 0);
    assert.equal(computeCurrentWeight([], [], []), 0);
  });

  it('Équipement weight 2.5 + modif 1.5 → 4.0 kg', () => {
    assert.equal(computeCurrentWeight([{ weight: 2.5 }], [{ weight: 1.5 }]), 4.0);
  });

  it('Plusieurs équipements : cumul', () => {
    const equipment = [{ weight: 1.2 }, { weight: 3.5 }, { weight: 0.5 }];
    assert.equal(computeCurrentWeight(equipment, []), 5.2);
  });

  it('Inventaire : weightPerItem × quantity', () => {
    const inventory = [
      { weightPerItem: 0.5, quantity: 4 },  // 2.0 kg
      { weightPerItem: 1.0, quantity: 3 },  // 3.0 kg
    ];
    assert.equal(computeCurrentWeight([], [], inventory), 5.0);
  });

  it('Équipement + modif + inventaire : cumul total', () => {
    const equipment = [{ weight: 1.5 }];
    const modificateurs = [{ weight: 0.5 }];
    const inventory = [{ weightPerItem: 2, quantity: 2 }];  // 4 kg
    assert.equal(computeCurrentWeight(equipment, modificateurs, inventory), 6.0);
  });
});

describe('computeCurrentWeight — robustesse', () => {
  it('Listes null/undefined → 0', () => {
    assert.equal(computeCurrentWeight(null, undefined), 0);
    assert.equal(computeCurrentWeight(null, undefined, null), 0);
  });

  it('weight manquant → ignoré (pas de NaN)', () => {
    const equipment = [
      {},
      { weight: undefined },
      { weight: null },
      { weight: 'abc' },
      { weight: 2.5 },
    ];
    assert.equal(computeCurrentWeight(equipment, []), 2.5);
  });

  it('Inventaire avec quantity=0 → pas de contribution', () => {
    const inventory = [{ weightPerItem: 5, quantity: 0 }];
    assert.equal(computeCurrentWeight([], [], inventory), 0);
  });

  it('Inventaire avec weightPerItem NaN → ignoré', () => {
    const inventory = [
      { weightPerItem: NaN, quantity: 5 },
      { weightPerItem: 1, quantity: 2 },
    ];
    assert.equal(computeCurrentWeight([], [], inventory), 2);
  });

  it('Arrondi à 1 décimale (0.1 + 0.2 = 0.3, pas 0.30000000000000004)', () => {
    const equipment = [{ weight: 0.1 }];
    const modificateurs = [{ weight: 0.2 }];
    const w = computeCurrentWeight(equipment, modificateurs);
    assert.equal(w, 0.3);
  });
});

// =============================================================================
// RÉGRESSION : poids = Σ(items) et capacité = Force × 5, pas une valeur
// saisie à la main dans le JSON.
// =============================================================================
// Contexte : avant ce fix, l'utilisateur saisissait `general.weight` (poids
// actuel) à la main et le max était codé en dur à 70 dans l'UI. Les deux
// étaient incohérents avec l'équipement porté et la Force du personnage.
//
// Ce test vérifie que les deux fonctions retournent toujours la valeur
// dérivée, sans état caché.
describe('REGRESSION — poids piloté par Σ(weight) et Force × 5', () => {
  it('Scénario : équipement 3.5 kg + modif 1.5 kg + inventaire 5 kg → 10.0 kg', () => {
    const equipment = [{ weight: 3.5 }];
    const modificateurs = [{ weight: 1.5 }];
    const inventory = [{ weightPerItem: 1, quantity: 5 }];
    assert.equal(computeCurrentWeight(equipment, modificateurs, inventory), 10.0);
  });

  it('Capacité cohérente avec la Force', () => {
    // Force actuelle = 12 (default 10 + modif +2) → capacité = 60 kg
    const capacity = computeCarryCapacityMax(12);
    assert.equal(capacity, 60);
  });

  it('Surcharge détectable : poids actuel > capacité', () => {
    // Force 10 → capacité 50 kg. Si on porte 75 kg, on est en surcharge.
    const equipment = [{ weight: 75 }];
    const carried = computeCurrentWeight(equipment, []);
    const capacity = computeCarryCapacityMax(10);
    assert.equal(carried, 75);
    assert.equal(capacity, 50);
    assert.ok(carried > capacity, 'Le test reproduit une situation de surcharge');
  });

  it('Pureté : la fonction ne mute pas ses entrées', () => {
    const equipment = [{ weight: 2.5 }];
    const inventory = [{ weightPerItem: 1, quantity: 3 }];
    const equipSnapshot = JSON.stringify(equipment);
    const invSnapshot = JSON.stringify(inventory);
    computeCurrentWeight(equipment, [], inventory);
    assert.equal(JSON.stringify(equipment), equipSnapshot, 'équipement non muté');
    assert.equal(JSON.stringify(inventory), invSnapshot, 'inventaire non muté');
  });

  it('Cohérence : mêmes entrées → même poids (déterministe)', () => {
    const equipment = [{ weight: 1.5 }];
    const modificateurs = [{ weight: 0.5 }];
    const a = computeCurrentWeight(equipment, modificateurs);
    const b = computeCurrentWeight(equipment, modificateurs);
    assert.equal(a, b);
  });
});
