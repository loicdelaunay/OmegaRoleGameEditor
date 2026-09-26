// src/test/vitalsSyncE2E.test.ts
//
// Test E2E de la synchronisation des vitales — système "last write wins".
// Plus de timestamp : chaque update entrant est toujours appliqué.
// Le SkipCounter empêche l'écho (re-broadcast de la valeur reçue).
//
// Lancé via `node --import tsx --test src/test/vitalsSyncE2E.test.ts`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SkipCounter, extractVitals, type Vitals } from '../lib/vitalsSync';

interface MockCharacter {
  stats: {
    health: { current: number; max: number };
    mental: { current: number; max: number };
    astra: { current: number; max: number };
  };
}

function makeMockChar(h: number, m: number, a: number): MockCharacter {
  return {
    stats: {
      health: { current: h, max: 20 },
      mental: { current: m, max: 20 },
      astra: { current: a, max: 20 },
    },
  };
}

/**
 * Simule le CharacterSheetDialog côté MJ (readOnly = false).
 */
class MJDialog {
  character: MockCharacter;
  skipNotify: SkipCounter;
  onVitalsBroadcastCalls: Vitals[] = [];
  onVitalsBroadcast: (vitals: Vitals) => void;

  constructor(char: MockCharacter) {
    this.character = char;
    this.skipNotify = new SkipCounter();
    this.onVitalsBroadcast = (v: Vitals) => {
      this.onVitalsBroadcastCalls.push(v);
    };
  }

  /** Simule un input onChange du MJ (tape une vitale) */
  mjSetVital(field: 'health' | 'mental' | 'astra', val: number) {
    this.character = {
      ...this.character,
      stats: {
        ...this.character.stats,
        [field]: { ...this.character.stats[field], current: val },
      },
    } as any;
    if (this.skipNotify.shouldSkip()) return;
    const vitals = extractVitals(this.character.stats);
    this.onVitalsBroadcast(vitals);
  }

  /** Simule la réception d'un update du joueur (via incomingVitals prop) */
  receiveFromPlayer(vitals: Vitals) {
    this.skipNotify.arm();
    this.character = {
      ...this.character,
      stats: {
        ...this.character.stats,
        health: { ...this.character.stats.health, current: vitals.health },
        mental: { ...this.character.stats.mental, current: vitals.mental },
        astra: { ...this.character.stats.astra, current: vitals.astra },
      },
    };
    // useEffect[character] → shouldSkip → true → pas de re-broadcast
    this.skipNotify.shouldSkip();
  }
}

/**
 * Simule le CharacterSheetDialog côté joueur (readOnly = true).
 */
class PlayerDialog {
  character: MockCharacter;
  skipNotify: SkipCounter;
  onPlayerVitalsChangeCalls: Vitals[] = [];
  onPlayerVitalsChange: (vitals: Vitals) => void;

  constructor(char: MockCharacter) {
    this.character = char;
    this.skipNotify = new SkipCounter();
    this.onPlayerVitalsChange = (v: Vitals) => {
      this.onPlayerVitalsChangeCalls.push(v);
    };
  }

  /** Simule un input onChange du joueur (tape une vitale) */
  playerSetVital(field: 'health' | 'mental' | 'astra', val: number) {
    this.character = {
      ...this.character,
      stats: {
        ...this.character.stats,
        [field]: { ...this.character.stats[field], current: val },
      },
    } as any;
    if (this.skipNotify.shouldSkip()) return;
    const vitals = extractVitals(this.character.stats);
    this.onPlayerVitalsChange(vitals);
  }

  /** Simule la réception d'un broadcast du MJ (via incomingVitals prop) */
  receiveFromMJ(vitals: Vitals) {
    this.skipNotify.arm();
    this.character = {
      ...this.character,
      stats: {
        ...this.character.stats,
        health: { ...this.character.stats.health, current: vitals.health },
        mental: { ...this.character.stats.mental, current: vitals.mental },
        astra: { ...this.character.stats.astra, current: vitals.astra },
      },
    };
    // useEffect[character] readOnly → shouldSkip → true → pas d'envoi
    this.skipNotify.shouldSkip();
  }
}

describe('E2E : MJ spam +1 sur Santé', () => {
  it('le joueur reçoit la valeur finale après 5 clics +1', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
    };

    // MJ clique +1 (5 fois)
    for (let i = 1; i <= 5; i++) {
      mj.mjSetVital('health', 20 + i);
    }

    assert.equal(player.character.stats.health.current, 25,
      `Le joueur doit avoir health=25 après 5 clics +1, mais a ${player.character.stats.health.current}`);

    // Le joueur doit pouvoir modifier ses vitales sans être bloqué
    player.playerSetVital('health', 30);
    assert.equal(player.onPlayerVitalsChangeCalls.length, 1,
      `Le joueur doit avoir envoyé 1 update, mais a envoyé ${player.onPlayerVitalsChangeCalls.length}`);
    assert.equal(player.onPlayerVitalsChangeCalls[0].health, 30);
  });

  it('le joueur reçoit chaque valeur intermédiaire si MJ clique lentement', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    const receivedValues: number[] = [];

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
      receivedValues.push(player.character.stats.health.current);
    };

    mj.mjSetVital('health', 21);
    mj.mjSetVital('health', 22);
    mj.mjSetVital('health', 23);

    assert.deepEqual(receivedValues, [21, 22, 23]);
  });

  it('BUG : MJ tape "1" puis "6" rapidement → le joueur voit bien 16', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
    };

    // MJ tape "1" (efface 20, tape 1)
    mj.mjSetVital('health', 1);
    assert.equal(player.character.stats.health.current, 1);

    // MJ tape "6" (1 devient 16)
    mj.mjSetVital('health', 16);
    assert.equal(player.character.stats.health.current, 16,
      `Le joueur doit voir 16, mais voit ${player.character.stats.health.current}`);
  });
});

describe('E2E : Joueur modifie → MJ voit la valeur', () => {
  it('le MJ reçoit et affiche la valeur du joueur', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    player.playerSetVital('health', 25);

    assert.equal(mj.character.stats.health.current, 25,
      `Le MJ doit avoir health=25, mais a ${mj.character.stats.health.current}`);
    assert.equal(mj.onVitalsBroadcastCalls.length, 0,
      `Le MJ ne doit pas avoir déclenché onVitalsBroadcast (anti-boucle)`);
  });

  it('le MJ peut modifier après avoir reçu du joueur (pas de blocage)', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    player.playerSetVital('health', 25);
    assert.equal(mj.character.stats.health.current, 25);

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
    };
    mj.mjSetVital('health', 30);

    assert.equal(player.character.stats.health.current, 30,
      `Le joueur doit avoir health=30, mais a ${player.character.stats.health.current}`);
  });

  it('BUG : joueur tape 18 → le MJ voit bien 18', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    player.playerSetVital('health', 18);

    assert.equal(mj.character.stats.health.current, 18,
      `Le MJ doit voir 18, mais voit ${mj.character.stats.health.current}`);
  });
});

describe('E2E : Anti-boucle', () => {
  it('MJ modifie → joueur reçoit → joueur ne renvoie pas', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
    };

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    mj.mjSetVital('health', 25);

    assert.equal(player.character.stats.health.current, 25);
    assert.equal(player.onPlayerVitalsChangeCalls.length, 0);
  });

  it('Joueur modifie → MJ reçoit → MJ ne renvoie pas', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    const playerReceived: number[] = [];

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
      playerReceived.push(player.character.stats.health.current);
    };

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    player.playerSetVital('health', 25);

    assert.equal(mj.character.stats.health.current, 25);
    assert.equal(mj.onVitalsBroadcastCalls.length, 0);
    assert.equal(playerReceived.length, 0);
  });
});

describe('E2E : Spam alterné MJ et joueur', () => {
  it('MJ +1, joueur +1, MJ +1 → les deux voient les bonnes valeurs', () => {
    const mj = new MJDialog(makeMockChar(20, 20, 20));
    const player = new PlayerDialog(makeMockChar(20, 20, 20));

    mj.onVitalsBroadcast = (v) => {
      mj.onVitalsBroadcastCalls.push(v);
      player.receiveFromMJ(v);
    };

    player.onPlayerVitalsChange = (v) => {
      player.onPlayerVitalsChangeCalls.push(v);
      mj.receiveFromPlayer(v);
    };

    mj.mjSetVital('health', 21);
    assert.equal(player.character.stats.health.current, 21);

    player.playerSetVital('health', 22);
    assert.equal(mj.character.stats.health.current, 22);

    mj.mjSetVital('health', 23);
    assert.equal(player.character.stats.health.current, 23);

    assert.equal(mj.character.stats.health.current, 23);
    assert.equal(player.character.stats.health.current, 23);
  });
});