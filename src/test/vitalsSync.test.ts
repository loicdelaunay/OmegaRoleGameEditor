// src/test/vitalsSync.test.ts
//
// Tests unitaires pour la logique de synchronisation des vitales.
// Lancé via `node --import tsx --test src/test/vitalsSync.test.ts`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SkipCounter, extractVitals, vitalsChanged, type Vitals } from '../lib/vitalsSync';

describe('SkipCounter', () => {
  it('devrait commencer à 0', () => {
    const sc = new SkipCounter();
    assert.equal(sc.value, 0);
  });

  it('shouldSkip retourne false quand pas armé', () => {
    const sc = new SkipCounter();
    assert.equal(sc.shouldSkip(), false);
    assert.equal(sc.value, 0);
  });

  it('shouldSkip retourne true après arm', () => {
    const sc = new SkipCounter();
    sc.arm();
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.value, 0);
  });

  it('doit gérer plusieurs arm consécutifs (cascade de useEffects)', () => {
    const sc = new SkipCounter();
    sc.arm();
    sc.arm();
    sc.arm();
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.shouldSkip(), false);
    assert.equal(sc.value, 0);
  });

  it('reset remet le compteur à 0', () => {
    const sc = new SkipCounter();
    sc.arm();
    sc.arm();
    sc.reset();
    assert.equal(sc.value, 0);
    assert.equal(sc.shouldSkip(), false);
  });

  it('shouldSkip décrémente correctement avec un seul arm', () => {
    const sc = new SkipCounter();
    sc.arm();
    assert.equal(sc.value, 1);
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.value, 0);
    assert.equal(sc.shouldSkip(), false);
  });

  it('doit gérer arm/shouldSkip intercalés', () => {
    const sc = new SkipCounter();
    sc.arm();
    assert.equal(sc.shouldSkip(), true);
    sc.arm();
    assert.equal(sc.shouldSkip(), true);
    assert.equal(sc.shouldSkip(), false);
  });
});

describe('extractVitals', () => {
  it('extrait les vitales correctement', () => {
    const stats = {
      health: { current: 20 },
      mental: { current: 15 },
      astra: { current: 10 },
    };
    assert.deepEqual(extractVitals(stats), { health: 20, mental: 15, astra: 10 });
  });

  it('retourne 0 pour les valeurs manquantes', () => {
    const stats = {
      health: { current: 20 },
      mental: { current: 0 },
      astra: { current: 0 },
    };
    assert.deepEqual(extractVitals(stats), { health: 20, mental: 0, astra: 0 });
  });

  it('gère les objets avec des champs undefined', () => {
    const stats = {
      health: { current: undefined as any },
      mental: { current: 15 },
      astra: { current: 10 },
    };
    assert.deepEqual(extractVitals(stats), { health: 0, mental: 15, astra: 10 });
  });
});

describe('vitalsChanged', () => {
  it('retourne false pour des vitales identiques', () => {
    const a: Vitals = { health: 20, mental: 15, astra: 10 };
    const b: Vitals = { health: 20, mental: 15, astra: 10 };
    assert.equal(vitalsChanged(a, b), false);
  });

  it('retourne true si health diffère', () => {
    const a: Vitals = { health: 20, mental: 15, astra: 10 };
    const b: Vitals = { health: 21, mental: 15, astra: 10 };
    assert.equal(vitalsChanged(a, b), true);
  });

  it('retourne true si mental diffère', () => {
    const a: Vitals = { health: 20, mental: 15, astra: 10 };
    const b: Vitals = { health: 20, mental: 14, astra: 10 };
    assert.equal(vitalsChanged(a, b), true);
  });

  it('retourne true si astra diffère', () => {
    const a: Vitals = { health: 20, mental: 15, astra: 10 };
    const b: Vitals = { health: 20, mental: 15, astra: 11 };
    assert.equal(vitalsChanged(a, b), true);
  });

  it('retourne true si toutes diffèrent', () => {
    const a: Vitals = { health: 20, mental: 15, astra: 10 };
    const b: Vitals = { health: 25, mental: 12, astra: 8 };
    assert.equal(vitalsChanged(a, b), true);
  });
});

describe('SkipCounter - scénarios d\'intégration', () => {
  it('simule le flux : MJ tape, puis joueur envoie, puis MJ tape', () => {
    const sc = new SkipCounter();

    // MJ tape (setCharacter utilisateur) → shouldSkip=false → envoie au joueur
    assert.equal(sc.shouldSkip(), false);

    // Joueur envoie update → MJ reçoit → arm() + setCharacter (sync vitales)
    sc.arm();
    assert.equal(sc.shouldSkip(), true);

    // cascade 2 (useEffect health.max)
    sc.arm();
    assert.equal(sc.shouldSkip(), true);

    // MJ tape à nouveau (setCharacter utilisateur) → shouldSkip=false → envoie
    assert.equal(sc.shouldSkip(), false);
  });

  it('simule le spam +1 cinq fois du MJ sans écho', () => {
    const sc = new SkipCounter();

    for (let i = 0; i < 5; i++) {
      assert.equal(sc.shouldSkip(), false);
    }
  });

  it('simule : MJ tape, reçoit écho joueur, tape encore (pas de boucle)', () => {
    const sc = new SkipCounter();

    assert.equal(sc.shouldSkip(), false);

    sc.arm();
    assert.equal(sc.shouldSkip(), true);

    assert.equal(sc.shouldSkip(), false);
  });
});