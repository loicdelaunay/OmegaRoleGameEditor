/**
 * useVitalsSync — Hook de synchronisation bidirectionnelle des vitales
 * (Santé/Mental/Astra) entre le MJ et les joueurs.
 *
 * Architecture simplifiée — "last write wins" + echo suppression :
 *
 * - Pas de timestamp ni de résolution de conflits : chaque update entrant
 *   est TOUJOURS appliqué. Si les deux côtés éditent en même temps, la
 *   dernière valeur reçue gagne. C'est acceptable pour un outil JDR.
 * - Un SkipCounter empêche l'écho : quand on applique un update entrant,
 *   on arme le compteur. Le prochain setCharacter déclenché par cet
 *   update sera skippé (pas de re-broadcast).
 * - Le compteur (pas un booléen) gère les cascades de useEffects
 *   (modifiers auto, health.max sync, etc.) qui déclenchent plusieurs
 *   setCharacter pour un seul update entrant.
 *
 * Directions :
 * 1. MJ → Joueur : handleVitalChange → onVitalsBroadcast → host:broadcastVitals
 * 2. Joueur → MJ : handleVitalChange → onPlayerVitalsChange → player:updateCharacterVitals
 */

import { useRef, useEffect, useCallback } from 'react';
import type { CharacterDocument } from '../lib/character';
import { SkipCounter } from '../lib/vitalsSync';

export interface IncomingVitals {
  health: number;
  mental: number;
  astra: number;
  /** Counter unique pour distinguer deux messages identiques (same values, different send). */
  seq: number;
}

export interface VitalsChangeHandlers {
  /** Côté joueur : appelé quand le joueur modifie ses vitales. */
  onPlayerVitalsChange?: (vitals: { health: number; mental: number; astra: number }) => void;
  /** Côté MJ : appelé quand le MJ modifie les vitales d'un personnage. */
  onVitalsBroadcast?: (vitals: { health: number; mental: number; astra: number }) => void;
  /** Vitales entrantes reçues du réseau (MJ→joueur ou joueur→MJ). */
  incomingVitals?: IncomingVitals | null;
  /** Mode lecture seule (côté joueur). */
  readOnly?: boolean;
}

export interface UseVitalsSyncReturn {
  /** Helper à appeler dans les onChange des inputs Santé/Mental/Astra. */
  handleVitalChange: (field: 'health' | 'mental' | 'astra', value: number) => void;
  /**
   * Ref du SkipCounter — utilisé par le useEffect[character] du composant
   * pour skipper le onLiveChange lors d'une sync entrante.
   */
  skipNotifyRef: React.MutableRefObject<SkipCounter>;
}

/**
 * Hook de synchronisation des vitales.
 */
export function useVitalsSync(
  character: CharacterDocument,
  setCharacter: React.Dispatch<React.SetStateAction<CharacterDocument>>,
  handlers: VitalsChangeHandlers,
): UseVitalsSyncReturn {
  const { onPlayerVitalsChange, onVitalsBroadcast, incomingVitals, readOnly = false } = handlers;

  // SkipCounter anti-boucle : partagé entre la sync des vitales et le
  // useEffect[character] du composant (pour skipper onLiveChange).
  const skipNotifyRef = useRef(new SkipCounter());

  // Ref stable pour toujours avoir les dernières valeurs des vitales
  // sans recréer handleVitalChange à chaque render.
  const vitalsRef = useRef({ h: 0, m: 0, a: 0 });
  useEffect(() => {
    vitalsRef.current = {
      h: character.stats.health.current,
      m: character.stats.mental.current,
      a: character.stats.astra.current,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- on veut se recréer quand les vitales changent
  }, [character.stats.health.current, character.stats.mental.current, character.stats.astra.current]);

  // Refs stables pour les callbacks (évite les re-renders)
  const onPlayerVitalsChangeRef = useRef(onPlayerVitalsChange);
  useEffect(() => {
    onPlayerVitalsChangeRef.current = onPlayerVitalsChange;
  }, [onPlayerVitalsChange]);

  const onVitalsBroadcastRef = useRef(onVitalsBroadcast);
  useEffect(() => {
    onVitalsBroadcastRef.current = onVitalsBroadcast;
  }, [onVitalsBroadcast]);

  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  // === Sync des vitales via canal dédié ====================================
  // Toujours appliquer (last write wins). Le SkipCounter empêche l'écho.
  // ⚠️ On n'arme le skipNotify QUE si quelque chose va réellement changer.
  useEffect(() => {
    if (!incomingVitals) return;
    setCharacter(prev => {
      const healthChanged = prev.stats.health.current !== incomingVitals.health;
      const mentalChanged = prev.stats.mental.current !== incomingVitals.mental;
      const astraChanged = prev.stats.astra.current !== incomingVitals.astra;
      if (!healthChanged && !mentalChanged && !astraChanged) return prev;
      skipNotifyRef.current.arm();
      const nextStats = { ...prev.stats };
      if (healthChanged) nextStats.health = { ...prev.stats.health, current: incomingVitals.health };
      if (mentalChanged) nextStats.mental = { ...prev.stats.mental, current: incomingVitals.mental };
      if (astraChanged) nextStats.astra = { ...prev.stats.astra, current: incomingVitals.astra };
      return { ...prev, stats: nextStats };
    });
  }, [incomingVitals, setCharacter]);

  // Helper centralisé pour la modification d'une vitale (Santé/Mental/Astra).
  // 1. Met à jour le state local
  // 2. Si ce n'est pas une sync entrante (shouldSkip=false), appelle le callback
  //    approprié : onVitalsBroadcast côté MJ, onPlayerVitalsChange côté joueur.
  // Utilise vitalsRef pour lire les valeurs courantes sans recréer la callback.
  const handleVitalChange = useCallback((field: 'health' | 'mental' | 'astra', value: number) => {
    setCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [field]: { ...prev.stats[field], current: value },
      },
    }));
    if (skipNotifyRef.current.shouldSkip()) return;
    const vitals = {
      health: field === 'health' ? value : vitalsRef.current.h,
      mental: field === 'mental' ? value : vitalsRef.current.m,
      astra: field === 'astra' ? value : vitalsRef.current.a,
    };
    if (readOnlyRef.current && onPlayerVitalsChangeRef.current) {
      onPlayerVitalsChangeRef.current(vitals);
    } else if (!readOnlyRef.current && onVitalsBroadcastRef.current) {
      onVitalsBroadcastRef.current(vitals);
    }
  }, [setCharacter]);

  return {
    handleVitalChange,
    skipNotifyRef,
  };
}