// src/test/vitalsSyncScenario.test.ts
//
// Tests qui simulent le flux complet de synchronisation des vitales
// entre le MJ et le joueur.
//
// Version 3 : système "last write wins" + echo suppression (SkipCounter).
// Plus de timestamp ni de VitalsTimestampTracker.
//
// Lancé via `node --import tsx --test src/test/vitalsSyncScenario.test.ts`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SkipCounter } from '../lib/vitalsSync';

describe('Scénario : MJ→Joueur (sync via canal dédié)', () => {
  it('le joueur accepte la valeur du MJ et ne renvoie rien', () => {
    const sc = new SkipCounter();

    // MJ modifie → pas de skip → envoie
    assert.equal(sc.shouldSkip(), false);

    // Joueur reçoit la sync via incomingVitals → arm() avant setCharacter
    sc.arm();

    // useEffect[character] du joueur (readOnly) → shouldSkip() décrémente
    assert.equal(sc.shouldSkip(), true);

    // Joueur modifie → shouldSkip() = false → envoie au MJ ✓
    assert.equal(sc.shouldSkip(), false);
  });

  it('le joueur reçoit une sync avec cascade de 3 useEffects', () => {
    const sc = new SkipCounter();

    sc.arm();
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.shouldSkip(), false);
    assert.equal(sc.shouldSkip(), false);
    assert.equal(sc.shouldSkip(), false);
  });
});

describe('Scénario : Joueur→MJ (sync vitales)', () => {
  it('le MJ accepte la valeur du joueur et ne renvoie rien', () => {
    const sc = new SkipCounter();

    // Joueur modifie → pas de skip → envoie au MJ
    assert.equal(sc.shouldSkip(), false);

    // MJ reçoit via incomingVitals → arm() avant setCharacter
    sc.arm();

    // useEffect[character] du MJ → shouldSkip() → skip onLiveChange ✓
    assert.equal(sc.shouldSkip(), true);

    // MJ modifie autre chose → shouldSkip() = false → envoie au joueur ✓
    assert.equal(sc.shouldSkip(), false);
  });
});

describe('Bug régression : compteur bloqué côté joueur', () => {
  it('le compteur est décrémenté même en readOnly', () => {
    const sc = new SkipCounter();

    sc.arm();
    assert.equal(sc.value, 1);

    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.value, 0);

    assert.equal(sc.shouldSkip(), false);
  });

  it('simule spam MJ +1 cinq fois puis joueur modifie', () => {
    const sc = new SkipCounter();

    for (let i = 0; i < 5; i++) {
      assert.equal(sc.shouldSkip(), false); // MJ envoie
      sc.arm(); // Joueur reçoit
      assert.equal(sc.shouldSkip(), true); // décrémente
    }

    assert.equal(sc.shouldSkip(), false);
    assert.equal(sc.value, 0);
  });
});

describe('Scénario : MJ et joueur modifient simultanément', () => {
  it('alternance MJ→joueur→MJ→joueur', () => {
    const sc = new SkipCounter();

    // MJ tape → envoie
    assert.equal(sc.shouldSkip(), false);

    // Joueur reçoit → arm → useEffect décrémente
    sc.arm();
    assert.equal(sc.shouldSkip(), true);

    // Joueur tape → envoie
    assert.equal(sc.shouldSkip(), false);

    // MJ reçoit → arm → useEffect décrémente
    sc.arm();
    assert.equal(sc.shouldSkip(), true);

    // MJ tape → envoie
    assert.equal(sc.shouldSkip(), false);
  });
});