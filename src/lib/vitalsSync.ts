/**
 * Logique de synchronisation bidirectionnelle des vitales (Santé/Mental/Astra)
 * entre le MJ et les joueurs.
 *
 * Architecture : "last write wins" + echo suppression (SkipCounter).
 *
 * - Pas de timestamp ni de résolution de conflits : chaque update entrant
 *   est TOUJOURS appliqué. Si les deux côtés éditent en même temps, la
 *   dernière valeur reçue gagne.
 * - Un SkipCounter empêche l'écho : quand on applique un update entrant,
 *   on arme le compteur. Le prochain setCharacter déclenché par cet
 *   update sera skippé (pas de re-broadcast).
 * - Un compteur monotonic `seq` (généré côté App.tsx) assure que chaque
 *   message est unique même si les valeurs sont identiques, pour que le
 *   useEffect[incomingVitals] de React se déclenche à chaque message.
 *
 * Directions :
 * 1. MJ → Joueur : onVitalsBroadcast → host:broadcastVitals → room:vitalsUpdate
 * 2. Joueur → MJ : onPlayerVitalsChange → player:updateCharacterVitals → room:updateCharacterVitals
 */

export interface Vitals {
  health: number;
  mental: number;
  astra: number;
}

/**
 * Extrait les vitales d'un CharacterDocument-like objet.
 */
export function extractVitals(stats: {
  health: { current: number };
  mental: { current: number };
  astra: { current: number };
}): Vitals {
  return {
    health: stats.health?.current ?? 0,
    mental: stats.mental?.current ?? 0,
    astra: stats.astra?.current ?? 0,
  };
}

/**
 * Compare deux vitales et retourne true si elles diffèrent.
 */
export function vitalsChanged(a: Vitals, b: Vitals): boolean {
  return a.health !== b.health || a.mental !== b.mental || a.astra !== b.astra;
}

/**
 * Classe qui gère le skip anti-boucle avec un compteur.
 *
 * Chaque setCharacter déclenché par une sync entrante incrémente le compteur
 * via arm(). Le compteur est décrémenté à chaque fois qu'on détecte que le
 * setCharacter vient d'une sync (et non d'une saisie utilisateur) via
 * shouldSkip().
 *
 * On utilise un compteur plutôt qu'un booléen car une sync entrante peut
 * déclencher plusieurs setCharacter en cascade (useEffects de synchro de max,
 * modifiers auto, etc.), chacun déclenchant le useEffect[character].
 */
export class SkipCounter {
  private count = 0;

  arm(): void {
    this.count++;
  }

  shouldSkip(): boolean {
    if (this.count > 0) {
      this.count--;
      return true;
    }
    return false;
  }

  reset(): void {
    this.count = 0;
  }

  get value(): number {
    return this.count;
  }
}