import React, { useState, useEffect, useRef } from 'react';
import { generateUUID } from '../lib/uuid';
import type { CharacterDocument } from '../lib/character';
import { createDefaultCharacter } from '../lib/character';
import type { ObjectiveItem, ObjectiveStatus } from '../lib/character';
import { DEPENDENT_STAT_OPTIONS } from '../lib/character';
import { Save, Plus, Radio, Pencil, ExternalLink, Minus, RotateCcw } from 'lucide-react';
import { RowDragHandle, RowDeleteButton, DraggableRow, moveRow } from './RowDragDrop';
import { FloatingDialog } from './FloatingDialog';
import { PopoutPortal } from './PopoutPortal';
import { FicheDropdown, type WorkfolderFile } from './FicheDropdown';
import { BufferedNumberField } from './BufferedNumberField';
import { CollapsibleSection } from './CollapsibleSection';
import { TextField, IconButton, Tooltip, Box, Button, Select, MenuItem, InputLabel, FormControl, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Switch, ThemeProvider, createTheme, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { GMValidationStatus } from '../lib/character';
import { computeStatSuccessThreshold } from '../lib/projectConfig';
import { computeSuccessModifierFromVitals } from '../lib/characterVitals';
import { computeAstraMax } from '../lib/astra';
import { computeArmorCurrent, computeArmorMax } from '../lib/armor';
import { computeCarryCapacityMax, computeCurrentWeight } from '../lib/carryWeight';
import { computeStatCurrent } from '../lib/statCompute';
import { computeStatTier, type TierOptions } from '../lib/statTier';
import { useVitalsSync, type IncomingVitals } from '../hooks/useVitalsSync';
import {
  HEALTH_TIERS,
  MENTAL_TIERS,
  ARMOR_TIERS,
  ASTRA_TIERS,
  WEIGHT_TIERS,
} from '../lib/statTiers';
import { SkillTagsPicker, SKILL_TAGS_FIELD_TOOLTIP } from './SkillTagsPicker';
import { SkillSingleSelectPicker, SKILL_TYPE_OPTIONS, SKILL_TYPE_FIELD_TOOLTIP, SKILL_ACTION_OPTIONS, SKILL_ACTION_FIELD_TOOLTIP } from './SkillSingleSelectPicker';
// Picker multi-sélection utilisé pour la colonne "Action d'intervention" :
// une compétence peut cumuler plusieurs modes (ex: "nécessite une action"
// ET "ne bloque pas l'attaque"). Le stockage est un CSV d'ids, rétro-
// compatible avec l'ancien format texte libre.
import { SkillMultiSelectPicker } from './SkillMultiSelectPicker';
import { SuccessModifierPanel } from './SuccessModifierPanel';
import { CharacterTotalsPanel } from './CharacterTotalsPanel';
import { type ColumnWidthDef, type ColumnWidthsState } from './ColumnWidthEditor';
import { TableColumnSettingsDialog } from './TableColumnSettingsDialog';
import { TableColumnResize } from './TableColumnResize';
import { RarityPicker } from './RarityPicker';

export interface CharacterSheetFile {
  /** Nom affiché (sans extension). */
  name: string;
  /** Nom du fichier complet (avec .char.json). */
  fileName: string;
  /** Type de fichier — toujours 'character' pour ce composant. */
  type?: 'character';
}

interface CharacterSheetDialogProps {
  character: CharacterDocument;
  initialFileName: string;
  onClose: () => void;
  onSave: (character: CharacterDocument, fileName: string) => void;
  onLiveChange?: (character: CharacterDocument) => void;
  onApplyColumnSettingsToAll?: (tableId: string, newWidths: any, newMins: any) => void;
  /**
   * Appelé quand le joueur modifie ses vitales (Santé/Mental/Astra).
   * Le composant attache un timestamp (Date.now()) pour la résolution de conflits.
   * Côté MJ, ce callback n'est PAS appelé (le MJ utilise onVitalsBroadcast).
   */
  onPlayerVitalsChange?: (vitals: { health: number; mental: number; astra: number }) => void;
  /**
   * Appelé quand le MJ modifie les vitales d'un personnage.
   * Le composant attache un timestamp pour la résolution de conflits.
   * Côté joueur, ce callback n'est PAS appelé (le joueur utilise onPlayerVitalsChange).
   */
  onVitalsBroadcast?: (vitals: { health: number; mental: number; astra: number }) => void;
  /**
   * Vitales entrantes reçues du réseau (MJ→joueur ou joueur→MJ).
   * Quand ce prop change, le composant applique les vitales si le timestamp
   * est plus récent que la dernière modification locale.
   * null = pas d'update entrant.
   */
  incomingVitals?: IncomingVitals | null;
  readOnly?: boolean;
  /** Fiches de personnages disponibles dans le workfolder (pour le switch rapide). */
  availableFiles?: CharacterSheetFile[];
  /** Callback appelé quand l'utilisateur sélectionne une autre fiche via le dropdown. */
  onSwitchFile?: (fileName: string) => void;
  /**
   * Diviseur d'impact pour le calcul dynamique des valeurs de Réussite.
   * Provient de `config.json` du workfolder.
   */
  statSuccessDivisor?: number;
  /** Plancher du modificateur de réussite (à 100% PV/Sanité). Défaut -10. */
  successModifierMin?: number;
  /** Plafond du modificateur de réussite (à 0% ou palier critique). Défaut +15. */
  successModifierMax?: number;
  /** Seuil (0-100) sous lequel Santé OU Mental déclenche le palier critique. */
  vitalsCriticalThresholdPercent?: number;
  /** Poids relatif de la Santé dans la moyenne pondérée. Défaut 1. */
  vitalsWeightHealth?: number;
  /** Poids relatif du Mental dans la moyenne pondérée. Défaut 1. */
  vitalsWeightMental?: number;
  /**
   * Suffixe monétaire affiché à côté de la valeur d'argent dans la card
   * "Argent" de l'onglet Inventaire (ex: "PO", "CR", "€", "Caps").
   * Configurable par projet dans `config.json` → `moneySuffix`.
   * Si vide, on retombe sur le défaut "PO".
   */
  moneySuffix?: string;
}

/**
 * Petit composant interne : affiche un footer de carte avec un **palier
 * d'état** calculé depuis `current / max` (cf. `statTier.ts`). Évite de
 * calculer deux fois le palier (une pour la couleur, une pour le label).
 *
 * Les couleurs sont issues de la palette **Material Design 3** et le
 * couple { fond, texte } est calibré pour rester lisible en light ET
 * dark mode (contraste WCAG AA ≥ 4.5:1). Si pour une raison quelconque
 * `textColor` est absent, on retombe sur un fallback (`#fff` ou `#000`
 * selon la luminance de `color`).
 */
function StatFooter({
  current,
  max,
  tiers,
}: {
  current: number;
  max: number;
  tiers: TierOptions;
}) {
  const t = computeStatTier(current, max, tiers);
  // Fallback de secours : si `textColor` n'est pas fourni, on choisit
  // blanc ou noir selon la luminance perçue du fond. Ça évite un texte
  // illisible en light/dark mode si une définition de palier oublie le
  // `textColor`.
  const textColor = t.textColor ?? pickReadableTextColor(t.color);
  return (
    <div
      className="char-stat-card-footer"
      style={{ background: t.color, color: textColor }}
    >
      {t.label}
    </div>
  );
}

/**
 * Choisit `#ffffff` ou `#1a1a1a` selon la luminance perçue du fond.
 * Algorithme WCAG : `L = 0.2126 R + 0.7152 G + 0.0722 B` (avec
 * décodage sRGB linéaire). Fond clair → texte sombre, fond sombre →
 * texte clair. Utilisé comme **fallback** uniquement.
 */
function pickReadableTextColor(bg?: string): string {
  if (!bg) return '#1a1a1a';
  // Décode "#rrggbb" → [r, g, b] en 0..1 linéaire.
  const m = bg.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#1a1a1a';
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#1a1a1a' : '#ffffff';
}


function sumModField<T extends Record<string, any>>(
  items: T[],
  field: string,
): number {
  return items.reduce((acc, it) => acc + (Number((it as any)[field]) || 0), 0);
}

// `moveRow` est importé depuis `./RowDragDrop`.

/**
 * Définition des colonnes éditables (largeur en px) pour les tables
 * Équipement et Modificateurs. Partagé entre les deux onglets.
 * - `rarity`     : min 50, max 140 (sélecteur de rareté compact, pastille seule en lecture)
 * - `description` / `effects` : min 80, max 400 (texte libre)
 * - `weight` : min 70, max 140 (saisie numérique — doit afficher des valeurs
 *   jusqu'à "99.9" sans masquage par les spinners. Cf. CSS `.col-weight`.)
 * - `mod` : min 36, max 90 (colonnes de modificateurs)
 * - `actions` : min 32, max 60 (bouton corbeille)
 */
const MOD_TABLE_COLUMN_DEFS: ColumnWidthDef[] = [
  { key: 'rarity', label: 'Rareté', default: 60, min: 30, max: 140 },
  { key: 'description', label: 'Description', default: 160, min: 30, max: 400 },
  { key: 'effects', label: 'Effets', default: 160, min: 30, max: 400 },
  { key: 'weight', label: 'Poids', default: 84, min: 30, max: 140 },
  { key: 'mod', label: 'Modificateurs', default: 54, min: 30, max: 90 },
  { key: 'actions', label: 'Actions', default: 70, min: 30, max: 100 },
];

// `RowDragHandle` et `RowDeleteButton` sont importés depuis `./RowDragDrop`.

export const CharacterSheetDialog: React.FC<CharacterSheetDialogProps> = ({
  character: initialCharacter,
  initialFileName,
  onClose,
  onSave,
  onLiveChange,
  onApplyColumnSettingsToAll,
  onPlayerVitalsChange,
  onVitalsBroadcast,
  incomingVitals,
  readOnly = false,
  availableFiles = [],
  onSwitchFile,
  statSuccessDivisor,
  successModifierMin,
  successModifierMax,
  vitalsCriticalThresholdPercent,
  vitalsWeightHealth,
  vitalsWeightMental,
  moneySuffix,
}) => {
  const [character, setCharacter] = useState<CharacterDocument>(() => {
    const def = createDefaultCharacter();
    // Calcule les max Santé/Mental depuis l'endurance/sagesse actuelle et le
    // niveau (formule UI : `caractéristique * 2 + niveau * 2`). Cela garantit
    // la cohérence initiale entre la valeur affichée (readOnly) et la valeur
    // stockée dans le JSON, sans dépendre d'un useEffect (qui ne s'exécute
    // qu'après le premier render).
    //
    // ⚠️ On utilise `computeStatCurrent` (la même formule que l'UI) pour
    // calculer l'endurance/sagesse actuelle. C'est crucial : si on lisait
    // directement `endurance.default`, on pourrait diverger de la valeur
    // affichée dans la table des caractéristiques (= default + Σ mods).
    const initLevel = initialCharacter.general?.level ?? def.general.level ?? 1;
    const initEndurance = computeStatCurrent('endurance', initialCharacter.stats.endurance?.default ?? def.stats.endurance.default, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const initWisdom = computeStatCurrent('wisdom', initialCharacter.stats.wisdom?.default ?? def.stats.wisdom.default, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const initAstraMastery = computeStatCurrent('astraMastery', initialCharacter.stats.astraMastery?.default ?? def.stats.astraMastery?.default ?? 10, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const computedHealthMax = (initEndurance || 0) * 2 + (initLevel || 1) * 2;
    const computedMentalMax = (initWisdom || 0) * 2 + (initLevel || 1) * 2;
    const computedAstraMax = computeAstraMax(initAstraMastery, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const computedArmorCurrent = computeArmorCurrent(initialCharacter.equipment, (initialCharacter as any).modificateurs);
    const computedArmorMax = computeArmorMax();
    const computedWeight = computeCurrentWeight(initialCharacter.equipment, (initialCharacter as any).modificateurs, initialCharacter.inventory?.items);
    return {
      ...initialCharacter,
      general: {
        ...def.general,
        ...initialCharacter.general,
        weightStat: Number.isFinite(initialCharacter.general?.weightStat)
          ? initialCharacter.general.weightStat
          : (def.general.weightStat ?? 10),
        weight: computedWeight,
      },
      stats: {
        ...def.stats,
        ...initialCharacter.stats,
        combat: initialCharacter.stats.combat || def.stats.combat,
        inspiration: initialCharacter.stats.inspiration ?? def.stats.inspiration,
        // Force la synchro des max avec la formule d'affichage.
        health: {
          ...def.stats.health,
          ...initialCharacter.stats.health,
          max: computedHealthMax,
        },
        mental: {
          ...def.stats.mental,
          ...initialCharacter.stats.mental,
          max: computedMentalMax,
        },
        // Astra Max = 15 + Maîtrise Astra actuelle + Σ(astraMod). Même logique
        // que Santé/Mental : on écrase le `max` du JSON pour garantir la
        // cohérence entre la valeur stockée et la formule d'affichage.
        astra: {
          ...def.stats.astra,
          ...initialCharacter.stats.astra,
          max: computedAstraMax,
        },
        // Armure : actuel = Σ(armorMod), max = 20 (constant).
        armor: {
          ...def.stats.armor,
          ...initialCharacter.stats.armor,
          current: computedArmorCurrent,
          max: computedArmorMax,
        },
      },
      weapons: initialCharacter.weapons || def.weapons,
      // Backward-compat : si la fiche chargée n'a pas le champ `modificateurs`
      // (JSON ancien), on l'initialise à un tableau vide.
      modificateurs: (initialCharacter as any).modificateurs ?? def.modificateurs,
      lore: {
        ...def.lore,
        ...initialCharacter.lore,
      },
    };
  });
  // DEBUG : affichage de la valeur effective du state après init
  // (laissé commenté pour debug si besoin)
  // console.log('[CharacterSheetDialog] after init, character.stats.health.max=', character.stats.health?.max);
  const [fileName, setFileName] = useState<string>(initialFileName);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingFileName, setEditingFileName] = useState(initialFileName);
  const fileNameInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'stats' | 'skills' | 'equipment' | 'modificateurs' | 'lore' | 'config'>('general');
  const [activeEquipTab, setActiveEquipTab] = useState<'inventory' | 'equipment' | 'weapons'>('equipment');
  // Popout : détache le dialog dans une fenêtre navigateur séparée (2ème écran)
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  // Sections collapsibles de l'onglet Lore (état local, non persisté)
  const [collapsedLoreSections, setCollapsedLoreSections] = useState<Record<string, boolean>>({ history: false });
  // Suivi des modifications pour l'auto-save (grisé si pas de modification)
  const [isDirty, setIsDirty] = useState(false);
  // Snapshot du dernier état sauvegardé pour comparer
  const lastSavedCharacterRef = useRef<CharacterDocument | null>(null);
  const lastSavedFileNameRef = useRef<string>('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'skill' | 'equipment' | 'inventory' | 'weapon' | 'modifier'; id: string; name: string }>({ open: false, type: 'skill', id: '', name: '' });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<{ id: 'skills' | 'weapons' | 'equipment' | 'inventory' | 'modificateurs'; title: string; columns: ColumnWidthDef[]; widths: ColumnWidthsState; mins: ColumnWidthsState } | null>(null);

  const formatWidth = (val: number | string | undefined, def: number | string, minVal?: number | string) => {
    let finalVal = val === undefined ? def : val;
    if (typeof finalVal === 'number' && minVal !== undefined) {
      const minNum = Number(minVal);
      if (!isNaN(minNum)) {
        finalVal = Math.max(finalVal, minNum);
      }
    }
    if (typeof finalVal === 'string') return finalVal.endsWith('%') || finalVal.endsWith('px') ? finalVal : `${finalVal}px`;
    return `${finalVal}px`;
  };

  
    const formatMin = (minVal: number | string | undefined, def: number | string = 0) => {
      let finalVal = minVal === undefined ? def : minVal;
      if (typeof finalVal === 'number') return `${Math.max(0, finalVal)}px`;
      if (typeof finalVal === 'string') return finalVal.endsWith('%') || finalVal.endsWith('px') ? finalVal : `${finalVal}px`;
      return `${def}px`;
    };
// Ref pour garder la callback de live change stable et éviter les boucles de re-render
  const onLiveChangeRef = useRef(onLiveChange);
  useEffect(() => {
    onLiveChangeRef.current = onLiveChange;
  }, [onLiveChange]);

  // Synchronise le nom du fichier avec le nom du fichier dans le workfolder projet
  useEffect(() => {
    setFileName(initialFileName);
    setEditingFileName(initialFileName);
  }, [initialFileName]);

  // Focus automatique sur le champ d'édition du nom quand on entre en mode édition
  useEffect(() => {
    if (isEditingFileName && fileNameInputRef.current) {
      fileNameInputRef.current.focus();
      fileNameInputRef.current.select();
    }
  }, [isEditingFileName]);

  // Valide le nouveau nom de fichier : nettoyage des caractères invalides pour un nom de fichier
  function commitFileNameEdit() {
    const trimmed = editingFileName.trim().replace(/[<>:"/\\|?*]/g, '');
    const effective = trimmed || fileName || character.general.firstName || 'Sans_Nom';
    setFileName(effective);
    setEditingFileName(effective);
    setIsEditingFileName(false);
  }

  function cancelFileNameEdit() {
    setEditingFileName(fileName);
    setIsEditingFileName(false);
  }

  function startEditingFileName() {
    if (readOnly) return;
    setEditingFileName(fileName);
    setIsEditingFileName(true);
  }

  // === Sync des vitales via hook dédié ====================================
  // useVitalsSync gère :
  // - Le SkipCounter anti-boucle (skipNotifyRef)
  // - Le VitalsTimestampTracker (résolution de conflits par timestamp)
  // - Le useEffect[incomingVitals] (apply incoming vitals si timestamp accepté)
  // - Le helper handleVitalChange (à appeler dans les onChange des inputs)
  //
  // Le skipNotifyRef est partagé : le useEffect[character] ci-dessous l'utilise
  // pour skipper le onLiveChange lors d'une sync entrante.
  const { handleVitalChange, skipNotifyRef } = useVitalsSync(character, setCharacter, {
    readOnly,
    incomingVitals,
    onPlayerVitalsChange,
    onVitalsBroadcast,
  });

  // Synchronisation temps réel (joueur) : quand le MJ met à jour la fiche
  // complète (non-vitales), initialCharacter change → on resynchronise le state
  // local. On ne sync PAS les vitales ici : elles passent par le canal dédié
  // incomingVitals (useVitalsSync) qui applique toujours (last write wins).
  //
  // ⚠️ On n'arme PAS le skipNotify ici : on préserve les vitales locales
  // (prev.stats.*.current), donc le useEffect[character] qui suit ne verra
  // aucun changement de vitales → pas de risque d'écho.
  useEffect(() => {
    if (!readOnly) return;
    const def = createDefaultCharacter();
    setCharacter(prev => ({
      ...initialCharacter,
      stats: {
        ...def.stats,
        ...initialCharacter.stats,
        combat: initialCharacter.stats.combat || def.stats.combat,
        inspiration: initialCharacter.stats.inspiration ?? def.stats.inspiration,
        // Garde les vitales locales : elles sont sync via incomingVitals
        health: { ...def.stats.health, ...initialCharacter.stats.health, current: prev.stats.health.current },
        mental: { ...def.stats.mental, ...initialCharacter.stats.mental, current: prev.stats.mental.current },
        astra: { ...def.stats.astra, ...initialCharacter.stats.astra, current: prev.stats.astra.current },
      },
      weapons: initialCharacter.weapons || def.weapons,
      modificateurs: (initialCharacter as any).modificateurs ?? def.modificateurs,
      lore: {
        ...def.lore,
        ...initialCharacter.lore,
      },
    }));
  }, [initialCharacter, readOnly]);

  // (La sync des vitales côté MJ se fait UNIQUEMENT via incomingVitals
  // dans useVitalsSync. On ne sync PAS les vitales depuis initialCharacter
  // ici car cela causerait des rollbacks quand l'auto-save appelle
  // setActiveCharacter avec un état en retard par rapport au state local.)

  // (La sync des vitales via incomingVitals est gérée par useVitalsSync ci-dessus)

  // Le champ `stats.modifiers` (rétro-compat JSON) est piloté automatiquement
  // par la Santé et le Mental. On le resynchronise à chaque changement de
  // l'un de ces deux champs pour que la valeur sauvegardée sur disque
  // corresponde toujours au calcul auto, sans dépendre d'une saisie manuelle.
  useEffect(() => {
    const autoMod = computeSuccessModifierFromVitals(
      character.stats.health.current,
      character.stats.health.max,
      character.stats.mental.current,
      character.stats.mental.max,
      {
        min: successModifierMin,
        max: successModifierMax,
        criticalThresholdPercent: vitalsCriticalThresholdPercent,
        weightHealth: vitalsWeightHealth,
        weightMental: vitalsWeightMental,
      },
    );
    const serialized = autoMod > 0 ? `+${autoMod}` : `${autoMod}`;
    if (character.stats.modifiers !== serialized) {
      setCharacter(p => ({ ...p, stats: { ...p.stats, modifiers: serialized } }));
    }
  }, [
    character.stats.health.current,
    character.stats.health.max,
    character.stats.mental.current,
    character.stats.mental.max,
    successModifierMin,
    successModifierMax,
    vitalsCriticalThresholdPercent,
    vitalsWeightHealth,
    vitalsWeightMental,
  ]);

  // Synchronise `stats.health.max` (et `stats.mental.max`) avec la formule
  // affichée dans l'UI (readOnly) : `Endurance/Sagesse actuelle * 2 + Niveau * 2`.
  // Sans ce useEffect, le `max` restait figé sur la valeur du JSON chargé
  // (souvent 10) alors que l'UI affichait 22 → la barre État global passait
  // à 100% à la première saisie de current.
  //
  // ⚠️ On utilise `computeStatCurrent` (la même formule que l'UI de la table
  // des caractéristiques) pour lire l'endurance/sagesse actuelle. C'est
  // crucial car l'UI de la carte Santé/Mental lit aussi cette valeur : si
  // le useEffect utilisait `endurance.default` (non stocké dans le state de
  // façon cohérente) et la carte utilisait `endurance.current`, on aurait
  // une désynchronisation entre ce que voit l'utilisateur et ce qui est
  // passé à `SuccessModifierPanel` (état global aberrant).
  useEffect(() => {

    const endRef = computeStatCurrent('endurance', character.stats.endurance?.default || 0, character.equipment, character.modificateurs);
    const wisRef = computeStatCurrent('wisdom', character.stats.wisdom?.default || 0, character.equipment, character.modificateurs);
    const computedHealthMax = endRef * 2 + (character.general.level || 1) * 2;
    const computedMentalMax = wisRef * 2 + (character.general.level || 1) * 2;
    if (
      character.stats.health.max !== computedHealthMax ||
      character.stats.mental.max !== computedMentalMax
    ) {
      setCharacter(p => ({
        ...p,
        stats: {
          ...p.stats,
          health: { ...p.stats.health, max: computedHealthMax },
          mental: { ...p.stats.mental, max: computedMentalMax },
        },
      }));
    }
  }, [
    character.stats.endurance?.default,
    character.stats.wisdom?.default,
    character.equipment,
    character.modificateurs,
    character.general.level,
  ]);

  // Synchronise `stats.astra.max` avec la formule `15 (base) + Maîtrise Astra
  // actuelle + Σ(astraMod des équipements et modificateurs)`. L'input est
  // readOnly (cf. carte Astra) ; ce useEffect assure que la valeur stockée
  // dans le state correspond toujours au calcul affiché à l'écran, et que
  // les fiches JSON chargées avec un `astra.max` arbitraire sont
  // automatiquement migrées vers la formule.
  //
  // ⚠️ La caractéristique source est **Maîtrise Astra** (pas Intelligence) :
  // c'est la stat qui pilote l'utilisation de l'Astra dans le système JDR.
  //
  // On s'appuie sur `computeAstraMax` (lib pure, testée) plutôt que de
  // réimplémenter la somme des mods inline : ça évite la dérive entre la
  // formule calculée ici et celle exposée à l'UI / aux tests.
  useEffect(() => {
    if (character.general.manualMaxManagement) return;
    const astraMasteryCurrent = computeStatCurrent(
      'astraMastery',
      character.stats.astraMastery?.default || 0,
      character.equipment,
      character.modificateurs,
    );
    const computedAstraMax = computeAstraMax(astraMasteryCurrent, character.equipment, character.modificateurs);
    if (character.stats.astra.max !== computedAstraMax) {
      setCharacter(p => ({
        ...p,
        stats: {
          ...p.stats,
          astra: { ...p.stats.astra, max: computedAstraMax },
        },
      }));
    }
  }, [
    character.stats.astraMastery?.default,
    character.equipment,
    character.modificateurs,
  ]);

  // Synchronise `stats.armor.current` (= Σ(armorMod des équipements et
  // modificateurs)) et `stats.armor.max` (= 20, constante du système).
  // Les deux inputs sont readOnly (cf. carte Armure) ; ce useEffect assure
  // que la valeur stockée dans le state correspond toujours à l'équipement
  // porté, sans dépendre d'une saisie manuelle.
  useEffect(() => {
    const computedArmorCurrent = computeArmorCurrent(character.equipment, character.modificateurs);
    const computedArmorMax = computeArmorMax();
    if (
      character.stats.armor.current !== computedArmorCurrent ||
      character.stats.armor.max !== computedArmorMax
    ) {
      setCharacter(p => ({
        ...p,
        stats: {
          ...p.stats,
          armor: { current: computedArmorCurrent, max: computedArmorMax },
        },
      }));
    }
  }, [
    character.equipment,
    character.modificateurs,
  ]);

  // Synchronise `general.weight` (= Σ(weight équipements + modifs) +
  // Σ(weightPerItem × quantity inventaire)). L'input est readOnly (cf.
  // carte Poids) ; le poids actuel est toujours dérivé de l'équipement porté.
  // Le poids max n'est PAS stocké dans le state : il est calculé à la volée
  // dans le rendu de l'input (Force actuelle × 5), pas besoin de useEffect.
  useEffect(() => {
    const computedWeight = computeCurrentWeight(character.equipment, character.modificateurs, character.inventory?.items);
    // Comparaison flottante : on arrondit à 1 décimale des deux côtés pour
    // éviter les boucles de re-render sur des écarts de 1e-10.
    const current = Math.round((character.general.weight || 0) * 10) / 10;
    if (current !== computedWeight) {
      setCharacter(p => ({ ...p, general: { ...p.general, weight: computedWeight } }));
    }
  }, [
    character.equipment,
    character.modificateurs,
    character.inventory?.items,
  ]);

  // Resynchronise le state local quand on change de fiche (MJ qui switch via le
  // dropdown). On se base sur initialFileName comme déclencheur : le MJ fait
  // toujours setActiveCharacter + setActiveCharacterFileName ensemble quand il
  // ouvre une autre fiche, donc le filename change toujours. Cela permet de
  // distinguer un "switch de fiche" (filename change → resync complet) d'une
  // "mise à jour temps réel" sur la même fiche (filename identique → ne pas
  // écraser les modifs locales).
  useEffect(() => {
    if (readOnly) return;
    const def = createDefaultCharacter();
    // Même synchro des max que dans le useState initial (cf. commentaire plus haut).
    const initLevel = initialCharacter.general?.level ?? def.general.level ?? 1;
    const initEndurance = computeStatCurrent('endurance', initialCharacter.stats.endurance?.default ?? def.stats.endurance.default, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const initWisdom = computeStatCurrent('wisdom', initialCharacter.stats.wisdom?.default ?? def.stats.wisdom.default, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const initAstraMastery = computeStatCurrent('astraMastery', initialCharacter.stats.astraMastery?.default ?? def.stats.astraMastery?.default ?? 10, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const computedHealthMax = (initEndurance || 0) * 2 + (initLevel || 1) * 2;
    const computedMentalMax = (initWisdom || 0) * 2 + (initLevel || 1) * 2;
    const computedAstraMax = def.general.manualMaxManagement || initialCharacter.general?.manualMaxManagement ? initialCharacter.stats.astra.max : computeAstraMax(initAstraMastery, initialCharacter.equipment, (initialCharacter as any).modificateurs ?? def.modificateurs);
    const computedArmorCurrent = computeArmorCurrent(initialCharacter.equipment, (initialCharacter as any).modificateurs);
    const computedArmorMax = computeArmorMax();
    const computedWeight = computeCurrentWeight(initialCharacter.equipment, (initialCharacter as any).modificateurs, initialCharacter.inventory?.items);
    setCharacter({
      ...initialCharacter,
      general: {
        ...def.general,
        ...initialCharacter.general,
        weightStat: Number.isFinite(initialCharacter.general?.weightStat)
          ? initialCharacter.general.weightStat
          : (def.general.weightStat ?? 10),
        weight: computedWeight,
      },
      stats: {
        ...def.stats,
        ...initialCharacter.stats,
        combat: initialCharacter.stats.combat || def.stats.combat,
        inspiration: initialCharacter.stats.inspiration ?? def.stats.inspiration,
        health: {
          ...def.stats.health,
          ...initialCharacter.stats.health,
          max: computedHealthMax,
        },
        mental: {
          ...def.stats.mental,
          ...initialCharacter.stats.mental,
          max: computedMentalMax,
        },
        astra: {
          ...def.stats.astra,
          ...initialCharacter.stats.astra,
          max: computedAstraMax,
        },
        armor: {
          ...def.stats.armor,
          ...initialCharacter.stats.armor,
          current: computedArmorCurrent,
          max: computedArmorMax,
        },
      },
      weapons: initialCharacter.weapons || def.weapons,
      // Backward-compat : si la fiche chargée n'a pas le champ `modificateurs`
      // (JSON ancien), on l'initialise à un tableau vide.
      modificateurs: (initialCharacter as any).modificateurs ?? def.modificateurs,
      lore: {
        ...def.lore,
        ...initialCharacter.lore,
      },
    });
  }, [initialFileName, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const effectiveFileName = fileName.trim() || (character.general.firstName || 'Sans_Nom');
    onSave(character, effectiveFileName);
    lastSavedCharacterRef.current = JSON.parse(JSON.stringify(character));
    lastSavedFileNameRef.current = effectiveFileName;
    setIsDirty(false);
  };

  // Initialise le snapshot sauvegardé au montage et quand initialCharacter change (switch de fiche)
  useEffect(() => {
    lastSavedCharacterRef.current = JSON.parse(JSON.stringify(initialCharacter));
    lastSavedFileNameRef.current = initialFileName;
    setIsDirty(false);
  }, [initialCharacter, initialFileName]);

  // Détecte les modifications par rapport au dernier état sauvegardé
  useEffect(() => {
    if (readOnly) return;
    const saved = lastSavedCharacterRef.current;
    if (!saved) {
      setIsDirty(true);
      return;
    }
    // Comparaison superficielle : JSON stringify pour détecter tout changement
    const changed = JSON.stringify(saved) !== JSON.stringify(character) || lastSavedFileNameRef.current !== fileName;
    setIsDirty(changed);
  }, [character, fileName, readOnly]);

  // === Auto-save debounced (1s) ============================================
  // Objectif : éviter que le MJ perde son travail s'il ferme la fenêtre /
  // passe à un autre onglet sans cliquer sur "Sauvegarder".
  //
  // Fonctionnement :
  //  - À chaque fois que `isDirty` passe à true (modif en attente), on
  //    (ré)arme un timer de 1s.
  //  - Si une nouvelle modif arrive avant la fin du timer, on l'annule
  //    et on en arme un nouveau → debounce "trailing edge" classique.
  //  - Quand le timer se déclenche : on appelle `handleSave()` (qui
  //    met à jour `isDirty` à false et persiste le JSON via le parent).
  //  - Le timer est nettoyé à l'unmount ou au switch de fiche pour
  //    éviter d'écrire un état stale.
  //
  // L'état `autoSaveStatus` est purement visuel (indicateur dans le
  // footer) ; il n'a aucun impact sur la logique de sauvegarde.
  // =============================================================================
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');

  // Refs vers les 5 tables redimensionnables (Équipement, Inventaire,
  // Modificateurs, Compétences, Armes). Chaque TableColumnResize utilise
  // ce ref pour écrire directement la variable CSS (`--col-*-width`) sur
  // le <table> pendant le drag, ce qui évite un re-render React par
  // event mousemove. Les hooks DOIVENT être déclarés au top-level du
  // composant, c'est pourquoi on les pose ici plutôt que dans les IIFE
  // des onglets.
  const equipmentTableRef = useRef<HTMLTableElement | null>(null);
  const inventoryTableRef = useRef<HTMLTableElement | null>(null);
  const modificateursTableRef = useRef<HTMLTableElement | null>(null);
  const skillsTableRef = useRef<HTMLTableElement | null>(null);
  const weaponsTableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    if (readOnly) return;
    // Annule un timer en cours : nouvelle frappe → on retarde l'auto-save.
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!isDirty) {
      // Pas de modif en attente → on reste en idle (le bandeau "À jour"
      // est déjà affiché par ailleurs, pas besoin de duplicata).
      setAutoSaveStatus((s) => (s === 'saved' ? 'saved' : 'idle'));
      return;
    }
    // Modif en attente : on arme le timer.
    setAutoSaveStatus('pending');
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      // handleSave() est défini plus bas dans le composant mais il est
      // stable dans le scope du useEffect (closure sur le state actuel).
      handleSave();
      // Après l'écriture, on bascule en 'saved' pendant ~1.5s pour que
      // l'utilisateur voie la confirmation, puis retour à idle.
      setTimeout(() => setAutoSaveStatus('idle'), 1500);
    }, 1000);

    return () => {
      // Cleanup au démontage du composant ou avant un re-déclenchement :
      // on supprime le timer en attente (mais on laisse passer celui qui
      // est en train de sauvegarder — le 'saving' est intentionnel).
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, readOnly]);
  // Note : on n'inclut PAS `handleSave` dans les deps car :
  //  (1) il est défini après ce useEffect (ordre top-down),
  //  (2) il est stable dans le scope de l'effet (closure sur le state),
  //  (3) le ré-exécuter à chaque render créerait une boucle infinie
  //      (isDirty change → useEffect → handleSave → isDirty change → ...).
  // ============================================================================

  // Synchronisation temps réel côté MJ : à chaque modification de la fiche,
  // on notifie le parent pour qu'il propage la mise à jour aux joueurs via WebSocket.
  // ⚠️ Si shouldSkip() retourne true, c'est qu'on vient de recevoir une sync
  // externe → on ne renvoie pas d'update pour éviter la boucle.
  useEffect(() => {
    // Côté joueur (readOnly), ce useEffect ne doit RIEN faire (pas de onLiveChange).
    // MAIS il faut quand même décrémenter le SkipCounter si armé, sinon le
    // compteur reste bloqué et le premier changement du joueur est ignoré.
    if (readOnly) {
      skipNotifyRef.current.shouldSkip();
      return;
    }
    if (skipNotifyRef.current.shouldSkip()) return;
    onLiveChangeRef.current?.(character);
  }, [character, readOnly]);

  // (handleVitalChange est fourni par useVitalsSync ci-dessus)

  const updateGeneral = (field: keyof CharacterDocument['general'], value: string | number | boolean) => {
    setCharacter(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value
      }
    }));
  };

  function toggleLoreSection(sectionId: string) {
    setCollapsedLoreSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  const dialogTitle = `Fiche de Personnage : ${fileName || character.general.firstName || 'Sans_Nom'}`;

  // Style commun pour les TextFields MUI sur fond sombre (Material Design 3)
  const muiFieldSx = {
    '& .MuiInputBase-input': {
      color: 'var(--md-sys-color-on-surface)',
    },
    '& .MuiInputBase-input.Mui-disabled': {
      color: 'var(--md-sys-color-on-surface-variant)',
      WebkitTextFillColor: 'var(--md-sys-color-on-surface-variant)',
    },
    '& .MuiOutlinedInput-root': {
      background: 'var(--md-sys-color-surface-container)',
      '& fieldset': { borderColor: 'var(--md-sys-color-outline-variant)' },
      '&:hover fieldset': { borderColor: 'var(--md-sys-color-primary)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--md-sys-color-primary)' },
    },
    '& .MuiInputLabel-root': {
      color: 'var(--md-sys-color-on-surface-variant)',
      '&.Mui-focused': { color: 'var(--md-sys-color-primary)' },
    },
  };

  const gmStatusOptions: { value: GMValidationStatus; label: string; chipColor: string; chipBg: string }[] = [
    { value: 'rejected', label: 'Refusé', chipColor: 'var(--md-sys-color-on-error)', chipBg: 'var(--md-sys-color-error)' },
    { value: 'in_progress', label: 'En cours', chipColor: 'var(--md-sys-color-on-tertiary-container)', chipBg: 'var(--md-sys-color-tertiary-container)' },
    { value: 'balancing', label: 'Équilibrage par le MJ en cours', chipColor: 'var(--md-sys-color-on-secondary-container)', chipBg: 'var(--md-sys-color-secondary-container)' },
    { value: 'valid', label: 'Valide', chipColor: 'var(--md-sys-color-on-primary)', chipBg: 'var(--md-sys-color-primary)' },
  ];

  const currentGmStatus: GMValidationStatus = character.general.gmStatus
    ?? (character.general.validatedByGM ? 'valid' : 'in_progress');

  // Props communes pour les Select MUI : force le z-index du menu au-dessus
  // du FloatingDialog (zIndex 10000). Sans cela, le menu Portal reste caché.
  const selectMenuProps = {
    PaperProps: {
      sx: {
        zIndex: 10500,
        background: 'var(--md-sys-color-surface-container)',
        '& .MuiMenuItem-root': { color: 'var(--md-sys-color-on-surface)' },
      },
    },
    sx: { zIndex: 10500 },
  };

  const customColors = character.general.useCustomColor && character.general.customColor ? {
    '--md-sys-color-primary': character.general.customColor,
    '--md-sys-color-primary-container': `${character.general.customColor}33`,
    '--md-sys-color-on-primary-container': character.general.customColor,
  } as React.CSSProperties : undefined;

  const baseTheme = useTheme();
  const customMuiTheme = React.useMemo(() => {
    if (character.general.useCustomColor && character.general.customColor) {
      return createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          primary: {
            ...baseTheme.palette.primary,
            main: character.general.customColor,
          },
        },
      });
    }
    return baseTheme;
  }, [baseTheme, character.general.useCustomColor, character.general.customColor]);

  const dialogContent = (
    <ThemeProvider theme={customMuiTheme}>
      <FloatingDialog
        open={true}
        onClose={isPoppedOut ? () => setIsPoppedOut(false) : onClose}
        forceFullscreen={isPoppedOut}
        sectionStyle={customColors}
        headerClassName={character.general.useCustomColor ? "custom-color-pulse" : ""}
      title={
        isEditingFileName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              inputRef={fileNameInputRef}
              size="small"
              variant="outlined"
              value={editingFileName}
              onChange={(e) => setEditingFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitFileNameEdit(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelFileNameEdit(); }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'var(--md-sys-color-surface)',
                },
                minWidth: 200,
              }}
            />
            <Tooltip title="Valider">
              <IconButton size="small" onClick={commitFileNameEdit} sx={{ color: 'var(--md-sys-color-primary)' }}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Annuler">
              <IconButton size="small" onClick={cancelFileNameEdit} sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: readOnly ? 'default' : 'pointer',
              borderRadius: '6px',
              padding: '2px 6px',
              margin: '-2px -6px',
              '&:hover': readOnly ? {} : { background: 'color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)' },
            }}
            data-no-drag
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              onClick={startEditingFileName}
            >
              <span>Fiche de Personnage : {fileName || character.general.firstName || 'Sans_Nom'}</span>
              {!readOnly && (
                <Pencil size={13} style={{ opacity: 0.6 }} />
              )}
            </Box>
            {/* Badge Statut MJ — juste après le nom, avant le switch */}
            {(() => {
              const status: GMValidationStatus = character.general.gmStatus
                ?? (character.general.validatedByGM ? 'valid' : 'in_progress');
              const statusConfig: Record<GMValidationStatus, { label: string; bg: string; color: string }> = {
                rejected: { label: 'Refusé', bg: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' },
                in_progress: { label: 'En cours', bg: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' },
                balancing: { label: 'Équilibrage par le MJ en cours', bg: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)' },
                valid: { label: 'Valide', bg: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' },
              };
              const cfg = statusConfig[status] ?? statusConfig.in_progress;
              return (
                <span style={{ fontSize: '0.7rem', background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>
                  {cfg.label}
                </span>
              );
            })()}
            {/* Dropdown de switch rapide de fiche (réutilise le même composant que la navbar) */}
            {availableFiles.length > 0 && (
              <Box
                data-no-drag
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{ display: 'flex', alignItems: 'center', marginLeft: '8px', position: 'relative', zIndex: 1300 }}
              >
                <FicheDropdown
                  files={availableFiles as WorkfolderFile[]}
                  workfolderHandle={true}
                  onOpenFile={(fullFileName) => {
                    if (onSwitchFile) onSwitchFile(fullFileName);
                  }}
                  activeFileName={fileName}
                  hideLabel
                />
              </Box>
            )}
          </Box>
        )
      }
      initialSize={{ width: 1000, height: 700 }}
      minWidth={500}
      minHeight={400}
      bodyClassName=""
      bodyStyle={{ overflow: 'visible', display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}
      footer={
        readOnly ? null : (
          <>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>
                {fileName ? `${fileName}.char.json` : 'Non sauvegardé'}
                {isDirty ? ' • Modifications non sauvegardées' : ' • À jour'}
              </span>
              {/* Indicateur d'auto-save (debounce 1s). Affiché uniquement
                  quand un cycle de sauvegarde est en cours. États :
                  - 'pending' : timer armé, sauvegarde dans <1s
                  - 'saving'  : écriture en cours
                  - 'saved'   : sauvegarde confirmée (visible 1.5s) */}
              {autoSaveStatus !== 'idle' && (
                <span
                  aria-live="polite"
                  data-autosave-status={autoSaveStatus}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    background:
                      autoSaveStatus === 'saved'
                        ? 'color-mix(in srgb, #2e7d32 18%, transparent)'
                        : autoSaveStatus === 'saving'
                          ? 'color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent)'
                          : 'color-mix(in srgb, var(--md-sys-color-tertiary) 18%, transparent)',
                    color:
                      autoSaveStatus === 'saved'
                        ? '#2e7d32'
                        : autoSaveStatus === 'saving'
                          ? 'var(--md-sys-color-primary)'
                          : 'var(--md-sys-color-tertiary)',
                  }}
                >
                  {autoSaveStatus === 'pending' && (
                    <>
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'currentColor',
                          opacity: 0.7,
                          animation: 'autosave-pulse 1s ease-in-out infinite',
                        }}
                      />
                      Sauvegarde dans 1s…
                    </>
                  )}
                  {autoSaveStatus === 'saving' && 'Sauvegarde…'}
                  {autoSaveStatus === 'saved' && '✓ Sauvegardé'}
                </span>
              )}
            </span>
            <Tooltip title={!isDirty ? "Ctrl+Clic pour forcer la sauvegarde" : ""}>
              <Button
                variant="contained"
                size="small"
                disableElevation={!isDirty}
                onClick={(e) => {
                  if (!isDirty && !e.ctrlKey && !e.metaKey) return;
                  handleSave();
                }}
                startIcon={<Save size={16} />}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontWeight: 600,
                  background: isDirty ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-highest)',
                  color: isDirty ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  opacity: isDirty ? 1 : 0.7,
                  '&:hover': {
                    background: isDirty ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-highest)',
                  },
                }}
              >
                Sauvegarder
              </Button>
            </Tooltip>
          </>
        )
      }
      headerActions={<>
        {/* Bouton détacher dans une fenêtre séparée (popout vers 2ème écran) */}
        <Tooltip title={isPoppedOut ? 'Réattacher à la fenêtre principale' : 'Détacher dans une fenêtre séparée'}>
          <IconButton
            size="small"
            data-no-drag
            onClick={() => setIsPoppedOut((v) => !v)}
            sx={{
              color: 'var(--md-sys-color-on-surface-variant)',
              '&:hover': { background: 'color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)' },
            }}
          >
            <ExternalLink size={16} />
          </IconButton>
        </Tooltip>
        {readOnly && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em',
            color: 'var(--md-sys-color-primary)',
            background: 'color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)',
            padding: '4px 10px', borderRadius: '100px',
          }}>
            <Radio size={13} style={{ animation: 'pulse-radio 1.5s ease-in-out infinite' }} />
            En direct
          </span>
        )}
      </>}
      headerExtra={<>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 8px 0 8px', background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
          {[
            { id: 'general', label: 'Général' },
            { id: 'skills', label: 'Compétences' },
            { id: 'equipment', label: 'Équipements' },
            { id: 'modificateurs', label: 'Modificateurs' },
            { id: 'lore', label: 'Lore' },
            ...(readOnly ? [] : [{ id: 'config', label: 'Configuration' }]),
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button text-button ${activeTab === tab.id ? 'primary' : 'ghost'}`}
              style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === tab.id ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent', padding: '12px 16px' }}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </>}
    >

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Inner wrapper: en mode readOnly, on désactive les interactions sur le
            contenu (pour empêcher l'édition) tout en gardant le scroll du
            conteneur parent fonctionnel. Les inputs des vitales (Santé/Mental/
            Astra) ont pointerEvents:'auto' pour rester interactives. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', ...(readOnly ? { pointerEvents: 'none', userSelect: 'text' } : {}) }}>

        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Section Identité — refaite avec MUI, structure optimisée */}
            <CollapsibleSection
              id="general-identity"
              title="Identité"
              collapsed={collapsedLoreSections['general-identity'] === true}
              onToggle={toggleLoreSection}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  columnGap: 1.25,
                  rowGap: 1.5,
                  '& .MuiTextField-root, & .MuiFormControl-root': {
                    margin: 0,
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.8rem',
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem',
                    padding: '6px 10px',
                  },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                  '& .MuiFormControl-root .MuiInputBase-root': {
                    minHeight: 36,
                  },
                }}
              >
                <TextField
                  label="Prénom"
                  size="small"
                  margin="dense"
                  value={character.general.firstName}
                  onChange={e => updateGeneral('firstName', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Nom"
                  size="small"
                  margin="dense"
                  value={character.general.lastName}
                  onChange={e => updateGeneral('lastName', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Alias"
                  size="small"
                  margin="dense"
                  value={character.general.alias}
                  onChange={e => updateGeneral('alias', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Spécialité"
                  size="small"
                  margin="dense"
                  value={character.general.specialty}
                  onChange={e => updateGeneral('specialty', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Race"
                  size="small"
                  margin="dense"
                  value={character.general.race}
                  onChange={e => updateGeneral('race', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Genre"
                  size="small"
                  margin="dense"
                  value={character.general.gender}
                  onChange={e => updateGeneral('gender', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Âge"
                  type="number"
                  size="small"
                  margin="dense"
                  value={character.general.age}
                  onChange={e => updateGeneral('age', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Taille (cm)"
                  type="number"
                  size="small"
                  margin="dense"
                  value={character.general.height}
                  onChange={e => updateGeneral('height', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Poids (caract.)"
                  type="number"
                  size="small"
                  margin="dense"
                  // Caractéristique "Poids" de la section Identité (distincte
                  // du poids porté affiché dans la carte dédiée). Pilote
                  // certains jets liés à l'encombrement / surcharge.
                  value={character.general.weightStat ?? 10}
                  onChange={e => updateGeneral('weightStat', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <TextField
                  label="Cyber Type"
                  size="small"
                  margin="dense"
                  value={character.general.cyberType}
                  onChange={e => updateGeneral('cyberType', e.target.value)}
                  disabled={readOnly}
                  sx={muiFieldSx}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                  <Typography variant="caption" sx={{ color: 'var(--md-sys-color-on-surface-variant)', mb: 0.5, px: 1, fontWeight: 500 }}>
                    Astra Type
                  </Typography>
                  <Box sx={{ background: 'var(--md-sys-color-surface-container)', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <SkillMultiSelectPicker
                      value={character.general.astraType || ''}
                      onChange={v => updateGeneral('astraType', v)}
                      options={[
                        { id: 'bleu', label: 'Bleu', description: 'Affinité Astra Bleue', color: 'info' },
                        { id: 'violet', label: 'Violet', description: 'Affinité Astra Violette', color: 'special' },
                        { id: 'rouge', label: 'Rouge', description: 'Affinité Astra Rouge', color: 'danger' },
                        { id: 'jaune', label: 'Jaune', description: 'Affinité Astra Jaune', color: 'warning' },
                        { id: 'orange', label: 'Orange', description: 'Affinité Astra Orange', color: 'warning' },
                        { id: 'rose', label: 'Rose', description: 'Affinité Astra Rose', color: 'special' },
                        { id: 'vert', label: 'Vert', description: 'Affinité Astra Verte', color: 'success' },
                      ] as any}
                      disabled={readOnly}
                      placeholder="Sélectionner..."
                      menuTitle="Types d'Astra"
                    />
                  </Box>
                </Box>
                {/* Statut de validation MJ — Select MUI avec 4 états */}
                <FormControl size="small" margin="dense" disabled={readOnly}>
                  <InputLabel id="gm-status-label" sx={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', '&.Mui-focused': { color: 'var(--md-sys-color-primary)' } }}>Statut MJ</InputLabel>
                  <Select
                    labelId="gm-status-label"
                    label="Statut MJ"
                    value={currentGmStatus}
                    onChange={e => {
                      const newStatus = e.target.value as GMValidationStatus;
                      updateGeneral('gmStatus', newStatus);
                      updateGeneral('validatedByGM', newStatus === 'valid');
                    }}
                    MenuProps={selectMenuProps}
                    sx={{
                      borderRadius: '8px',
                      background: 'var(--md-sys-color-surface-container)',
                      '& .MuiSelect-select': { color: 'var(--md-sys-color-on-surface)', fontSize: '0.875rem', padding: '6px 10px', minHeight: 'auto' },
                      '& fieldset': { borderColor: 'var(--md-sys-color-outline-variant)' },
                      '&:hover fieldset': { borderColor: 'var(--md-sys-color-primary)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--md-sys-color-primary)' },
                    }}
                    renderValue={(value) => {
                      const opt = gmStatusOptions.find(o => o.value === value);
                      return opt ? (
                        <Chip size="small" label={opt.label} sx={{ bgcolor: opt.chipBg, color: opt.chipColor, fontWeight: 600, height: 22 }} />
                      ) : value;
                    }}
                  >
                    {gmStatusOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Chip size="small" label={opt.label} sx={{ bgcolor: opt.chipBg, color: opt.chipColor, fontWeight: 600 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CollapsibleSection>

            <div className="char-sheet-grid">

              {/* Colonne Gauche - Caractéristiques */}
              <div>
                <table className="char-table">
                  <thead>
                    <tr>
                      <th>Caractéristiques<div style={{ fontSize: '0.6rem', fontWeight: 400 }}>Valeurs de 1 - 20</div></th>
                      <th style={{ textAlign: 'center', width: '64px' }}>Par défaut</th>
                      <th style={{ textAlign: 'center', width: '64px' }}>Actuel</th>
                      <th style={{ textAlign: 'center', width: '64px' }}>Réussite<div style={{ fontSize: '0.6rem', fontWeight: 400 }}>% ou -</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {['endurance', 'strength', 'agility', 'intelligence', 'astraMastery', 'charisma', 'wisdom', 'luck', 'perception'].map(statKey => {
                      const stat = character.stats[statKey as keyof typeof character.stats] as any;
                      const labels: Record<string, string> = { endurance: '🔋Endurance', strength: '💪Force', agility: '🦘Agilité', intelligence: '🧠Intelligence', astraMastery: '💫Maitrise Astra', charisma: '🔊Charisme', wisdom: '🌿Sagesse', luck: '🍀Chance', perception: '👀Perception' };
                      
                      const strengthCurrent = computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs);
                      const maxWeight = computeCarryCapacityMax(strengthCurrent);
                      const currentWeight = character.general.weight || 0;
                      
                      const actuel = computeStatCurrent(statKey, stat.default, character.equipment, character.modificateurs, currentWeight, maxWeight);
                      const isEncombre = statKey === 'agility' && actuel < (stat.default + sumModField(character.equipment, 'agilityMod') + sumModField(character.modificateurs, 'agilityMod'));

                      // Modificateur auto-calculé depuis Santé + Mental (champ read-only).
                      const autoMod = computeSuccessModifierFromVitals(
                        character.stats.health.current,
                        character.stats.health.max,
                        character.stats.mental.current,
                        character.stats.mental.max,
                        {
                          min: successModifierMin,
                          max: successModifierMax,
                          criticalThresholdPercent: vitalsCriticalThresholdPercent,
                          weightHealth: vitalsWeightHealth,
                          weightMental: vitalsWeightMental,
                        },
                      );
                      return (
                        <tr key={statKey}>
                          <td>{labels[statKey]}</td>
                          <td className="char-stat-cell" style={{ textAlign: 'center' }}><input type="number" className="char-stat-input" style={{ textAlign: 'center' }} value={stat.default} onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, [statKey]: { ...stat, default: parseInt(e.target.value) || 0 } } }))} /></td>
                          <td className="char-stat-cell" style={{ textAlign: 'center' }}><input type="number" className="char-stat-input" style={{ textAlign: 'center', opacity: 0.7, cursor: 'not-allowed', width: '100%' }} value={actuel} readOnly title={isEncombre ? "Non éditable (Actuel) - Encombré" : "Non éditable (Actuel)"} /></td>
                          <td className="char-stat-cell" style={{ textAlign: 'center' }}><input type="number" className="char-stat-input" style={{ textAlign: 'center', opacity: 0.7, cursor: 'not-allowed' }} value={computeStatSuccessThreshold(actuel, statSuccessDivisor ?? parseFloat('1.4'), autoMod)} readOnly title={`Non éditable (Réussite) — Mod auto : ${autoMod >= 0 ? '+' : ''}${autoMod} (Santé/Mental)`} /></td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                      <td>Total</td>
                      <td className="char-stat-cell" style={{ textAlign: 'center' }}>
                        {['endurance', 'strength', 'agility', 'intelligence', 'astraMastery', 'charisma', 'wisdom', 'luck', 'perception'].reduce((acc, statKey) => acc + ((character.stats[statKey as keyof typeof character.stats] as any).default || 0), 0)}
                      </td>
                      <td className="char-stat-cell" style={{ textAlign: 'center' }}>
                        {['endurance', 'strength', 'agility', 'intelligence', 'astraMastery', 'charisma', 'wisdom', 'luck', 'perception'].reduce((acc, statKey) => {
                          const strengthCurrent = computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs);
                          const maxWeight = computeCarryCapacityMax(strengthCurrent);
                          const currentWeight = character.general.weight || 0;
                          return acc + computeStatCurrent(statKey, ((character.stats[statKey as keyof typeof character.stats] as any).default || 0), character.equipment, character.modificateurs, currentWeight, maxWeight);
                        }, 0)}
                      </td>
                      <td className="char-stat-cell" style={{ textAlign: 'center' }}></td>
                    </tr>
                  </tbody>
                </table>

                <SuccessModifierPanel
                  healthCurrent={character.stats.health.current}
                  healthMax={character.stats.health.max}
                  mentalCurrent={character.stats.mental.current}
                  mentalMax={character.stats.mental.max}
                  modifierMin={successModifierMin}
                  modifierMax={successModifierMax}
                  criticalThresholdPercent={vitalsCriticalThresholdPercent}
                  weightHealth={vitalsWeightHealth}
                  weightMental={vitalsWeightMental}
                />
              </div>

              {/* Colonne Droite - Modules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div className="char-cards-grid">

                  {/* Santé */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-health)' }}>♥</span> Santé</div>
                    <div className="char-stat-card-body">
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Actuel</span>
                        <input type="number" className="char-stat-input char-stat-value-number" style={{ pointerEvents: 'auto' }} value={character.stats.health.current} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          handleVitalChange('health', val);
                        }} />
                      </div>
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Max</span>
                        <input type="number" className="char-stat-input char-stat-value-number" value={character.stats.health.max} onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, health: { ...p.stats.health, max: parseInt(e.target.value) || 0 } } }))} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title="Calculé : Endurance Actuel * 2 + Niveau * 2" />
                      </div>
                    </div>
                    <StatFooter current={character.stats.health.current} max={character.stats.health.max} tiers={HEALTH_TIERS} />
                  </div>

                  {/* Mental */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-mental)' }}>@</span> Mental</div>
                    <div className="char-stat-card-body">
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Actuel</span>
                        <input type="number" className="char-stat-input char-stat-value-number" style={{ pointerEvents: 'auto' }} value={character.stats.mental.current} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          handleVitalChange('mental', val);
                        }} />
                      </div>
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Max</span>
                        <input type="number" className="char-stat-input char-stat-value-number" value={character.stats.mental.max} onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, mental: { ...p.stats.mental, max: parseInt(e.target.value) || 0 } } }))} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title="Calculé : Sagesse Actuel * 2 + Niveau * 2" />
                      </div>
                    </div>
                    <StatFooter current={character.stats.mental.current} max={character.stats.mental.max} tiers={MENTAL_TIERS} />
                  </div>

                  {/* Armure */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-armor)' }}>🛡</span> Armure</div>
                    <div className="char-stat-card-body">
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Actuel</span>
                        {/* Armure actuel = Σ(armorMod des équipements + modificateurs). Cf. useEffect de synchro. */}
                        <input type="number" className="char-stat-input char-stat-value-number" value={character.stats.armor.current} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title={`Calculé : Σ(armorMod équipements/modifs) = ${(character.equipment || []).reduce((a, e) => a + (Number(e?.armorMod) || 0), 0) + (character.modificateurs || []).reduce((a, m) => a + (Number(m?.armorMod) || 0), 0)}`} />
                      </div>
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Max</span>
                        {/* Armure Max = 20 (constant du système, cf. DEFAULT_ARMOR_MAX). */}
                        <input type="number" className="char-stat-input char-stat-value-number" value={character.stats.armor.max} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title="Constante du système : 20 points d'armure maximum" />
                      </div>
                    </div>
                    <StatFooter current={character.stats.armor.current} max={character.stats.armor.max} tiers={ARMOR_TIERS} />
                  </div>

                  {/* Carte Énergie — le label suit le type défini en Configuration */}
                  {(() => {
                    const energyLabel = (character.general.energyType || 'astra').replace(/^./, c => c.toUpperCase());
                    return (
                      <div className="char-stat-card">
                        <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-astra)' }}>✨</span> {energyLabel}</div>
                        <div className="char-stat-card-body">
                          <div className="char-stat-value">
                            <span className="char-stat-value-label">Actuel</span>
                            <input type="number" className="char-stat-input char-stat-value-number" style={{ pointerEvents: 'auto' }} value={character.stats.astra.current} onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              handleVitalChange('astra', val);
                            }} />
                          </div>
                          <div className="char-stat-value">
                            <span className="char-stat-value-label">Max</span>
                            <input type="number" className="char-stat-input char-stat-value-number" value={character.stats.astra.max} onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, astra: { ...p.stats.astra, max: parseInt(e.target.value) || 0 } } }))} readOnly={!character.general.manualMaxManagement} style={{ opacity: character.general.manualMaxManagement ? 1 : 0.8, cursor: character.general.manualMaxManagement ? 'text' : 'not-allowed' }} title={character.general.manualMaxManagement ? "Max géré manuellement" : `Calculé : 15 (base) + Maîtrise Astra actuelle (${computeStatCurrent('astraMastery', character.stats.astraMastery?.default || 0, character.equipment, character.modificateurs)}) + Σ(astrMod équipements/modifs) (${(character.equipment || []).reduce((a, e) => a + (Number(e?.astraMod) || 0), 0) + (character.modificateurs || []).reduce((a, m) => a + (Number(m?.astraMod) || 0), 0)})`} />
                          </div>
                        </div>
                        <StatFooter current={character.stats.astra.current} max={character.stats.astra.max} tiers={ASTRA_TIERS} />
                      </div>
                    );
                  })()}

                  {/* Niveau */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-level)' }}>📊</span> Niveau</div>
                    <div className="char-stat-card-body">
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Xp actuel</span>
                        <input type="number" className="char-stat-input char-stat-value-number" value={character.general.xp} onChange={e => updateGeneral('xp', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Xp niveau +</span>
                        <input type="number" className="char-stat-input char-stat-value-number" value={100 + 50 * (character.general.level || 1)} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title="Calculé : 100 + 50 * Niveau" />
                      </div>
                    </div>
                    <div className="char-stat-card-footer" style={{ background: 'var(--md-sys-color-surface-container-high)', display: 'flex', justifyContent: 'space-between', padding: '4px 12px', alignItems: 'center', minHeight: '34px' }}>
                      {(character.general.xp || 0) >= (100 + 50 * (character.general.level || 1)) ? (
                        <button 
                          type="button"
                          className="primary" 
                          style={{ width: '100%', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '4px' }}
                          onClick={() => {
                            setCharacter(p => ({
                              ...p,
                              general: {
                                ...p.general,
                                level: (p.general.level || 1) + 1,
                                xp: 0
                              }
                            }));
                          }}
                        >
                          🌟 NIVEAU SUPÉRIEUR
                        </button>
                      ) : (
                        <>
                          <span>Niveau:</span> <input type="number" className="char-stat-input" style={{ width: '40px', padding: 0 }} value={character.general.level} onChange={e => updateGeneral('level', parseInt(e.target.value) || 1)} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Poids */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-weight)' }}>⚖</span> Poids en kg</div>
                    <div className="char-stat-card-body">
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Actuel</span>
                        {/* Poids actuel = Σ(weight équipements + modifs) + Σ(weightPerItem × quantity inventaire). Cf. useEffect de synchro. */}
                        <input type="number" step="0.1" className="char-stat-input char-stat-value-number" value={character.general.weight} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title={`Calculé : Σ(weight équipements/modifs) + Σ(weightPerItem × quantity inventaire). Équip.=${(character.equipment || []).reduce((a, e) => a + (Number(e?.weight) || 0), 0).toFixed(1)} kg, Modifs=${(character.modificateurs || []).reduce((a, m) => a + (Number(m?.weight) || 0), 0).toFixed(1)} kg, Inventaire=${(character.inventory?.items || []).reduce((a, it) => a + (Number(it?.weightPerItem) || 0) * (Number(it?.quantity) || 0), 0).toFixed(1)} kg`} />
                      </div>
                      <div className="char-stat-value">
                        <span className="char-stat-value-label">Max</span>
                        {/* Poids max = Force actuelle × 10 / 2 (= × 5). Cf. useEffect de synchro. */}
                        <input type="number" step="0.1" className="char-stat-input char-stat-value-number" value={computeCarryCapacityMax(computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs))} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} title={`Calculé : Force actuelle (${computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs)}) × 10 / 2`} />
                      </div>
                    </div>
                    <StatFooter current={character.general.weight} max={computeCarryCapacityMax(computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs))} tiers={WEIGHT_TIERS} />
                  </div>

                </div>
                
                {/* --- LIGNE 2 (Inspiration & Combat) --- */}
                <div className="char-cards-grid">
                  {/* Inspiration */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-inspiration)' }}>💡</span> Inspiration</div>
                    <div className="char-stat-card-body" style={{ justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column' }}>
                      <input 
                        type="number" 
                        className="char-stat-input char-stat-value-number" 
                        style={{ textAlign: 'center', fontSize: '2rem' }} 
                        value={character.stats.inspiration} 
                        onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, inspiration: parseInt(e.target.value) || 0 } }))} 
                      />
                    </div>
                    <div className="char-stat-card-footer" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Relance de dé
                    </div>
                  </div>

                  {/* Esquive */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-dodge)' }}>🤸</span> Esquive</div>
                    <div className="char-stat-card-body" style={{ justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column' }}>
                      <input 
                        type="text" 
                        className="char-stat-input char-stat-value-number" 
                        style={{ textAlign: 'center', width: '100%', opacity: 0.8, cursor: 'not-allowed', color: 'var(--md-sys-color-primary)', fontSize: '2rem' }} 
                        value={(() => {
                          const strengthCurrent = computeStatCurrent('strength', character.stats.strength?.default || 0, character.equipment, character.modificateurs);
                          const maxWeight = computeCarryCapacityMax(strengthCurrent);
                          const currentWeight = character.general.weight || 0;
                          const agilityCurrent = computeStatCurrent('agility', character.stats.agility?.default || 0, character.equipment, character.modificateurs, currentWeight, maxWeight);
                          const autoMod = parseInt((character.stats as any).modifiers || '0', 10) || 0;
                          const agilitySuccess = computeStatSuccessThreshold(agilityCurrent, statSuccessDivisor ?? 1.4, autoMod);
                          return Math.max(10, Math.min(19, Math.round(10 + (agilitySuccess * 9 / 100))));
                        })()} 
                        readOnly 
                        title="Esquive calculée automatiquement en fonction de la Réussite de l'Agilité (10 = min réussite, 19 = max réussite)" 
                      />
                    </div>
                    <div className="char-stat-card-footer" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      1 fois par tour : 1d20 supérieur pour esquiver
                    </div>
                  </div>

                  {/* Protection */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header"><span style={{ color: 'var(--stat-color-protection)' }}>🛡️</span> Protection</div>
                    <div className="char-stat-card-body" style={{ justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column' }}>
                      <input 
                        type="text" 
                        className="char-stat-input char-stat-value-number" 
                        style={{ textAlign: 'center', width: '100%', opacity: 0.8, cursor: 'not-allowed', color: 'var(--md-sys-color-primary)', fontSize: '2rem' }} 
                        value={(() => {
                          const armorCurrent = Math.max(0, Math.min(20, character.stats.armor?.current || 0));
                          const level = character.general?.level || 1;
                          const maxFaces = 4 + level;
                          const diceFace = Math.round(maxFaces * (armorCurrent / 20));
                          return diceFace < 2 ? "Aucune" : `1d${diceFace}`;
                        })()} 
                        readOnly 
                        title={`Protection calculée automatiquement : 1d( Arrondi((4 + Niveau) * (Armure Actuelle / 20)) ) -> ${(() => { const armorCurrent = Math.max(0, Math.min(20, character.stats.armor?.current || 0)); const level = character.general?.level || 1; const diceFace = Math.round((4 + level) * (armorCurrent / 20)); return diceFace < 2 ? "Aucune" : `1d${diceFace}`; })()}`} 
                      />
                    </div>
                    <div className="char-stat-card-footer" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Réduction des dégâts
                    </div>
                  </div>

                  {/* Faiblesses */}
                  <div className="char-stat-card">
                    <div className="char-stat-card-header" title="Ajoute x dégâts en cas de dégât de ce type"><span style={{ color: 'var(--stat-color-weakness)' }}>💥</span> Faiblesses</div>
                    <div className="char-stat-card-body" style={{ padding: '6px 8px', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      {['fire', 'water', 'electric', 'acid', 'psy'].map((weaknessType) => {
                        const labels: Record<string, string> = { fire: '🔥 Feu', water: '💧 Eau', electric: '⚡ Elec', acid: '🧪 Acide', psy: '🔮 Psy' };
                        const val = (character.stats.combat?.weaknesses as any)?.[weaknessType] ?? 0;
                        const bgColor = val < 0 ? 'rgba(76, 175, 80, 0.2)' : val > 0 ? 'rgba(244, 67, 54, 0.2)' : 'transparent';
                        return (
                          <div key={weaknessType} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 8px', backgroundColor: bgColor, borderRadius: '4px', transition: 'background-color 0.2s' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 600 }}>{labels[weaknessType]}</span>
                            <input 
                              type="number" 
                              className="char-stat-input char-stat-value-number" 
                              style={{ fontSize: '0.85rem', width: '35px', textAlign: 'center', background: 'transparent', padding: '0' }} 
                              value={val} 
                              onChange={e => setCharacter(p => ({ ...p, stats: { ...p.stats, combat: { ...p.stats.combat, weaknesses: { ...p.stats.combat.weaknesses, [weaknessType]: parseInt(e.target.value) || 0 } } } }))} 
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="char-stat-card-footer" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.65rem' }}>
                      Modificateur des dégâts sur l'effet
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        )}



        {activeTab === 'skills' && (() => {
          // Largeurs des colonnes Compétences — fallback sur défauts (en px,
          // calculés à partir d'un viewport de référence 1200px et des
          // pourcentages historiques de la table).
          const skWidths: ColumnWidthsState = character.tableColumnWidths?.skills ?? {};
              const skMins: ColumnWidthsState = character.tableColumnMins?.skills ?? {};
          const skStyle: React.CSSProperties = {
            ['--col-rarity-width' as any]: `50px`, // col-rarity reste FIXE (cf. App.css)
            ['--col-skill-name-width' as any]: formatWidth(skWidths.name, 216, skMins.name),
            ['--col-skill-name-min' as any]: formatMin(skMins.name, 0),
            ['--col-skill-tags-width' as any]: formatWidth(skWidths.tags, 156, skMins.tags),
            ['--col-skill-tags-min' as any]: formatMin(skMins.tags, 0),
            ['--col-skill-type-width' as any]: formatWidth(skWidths.type, 144, skMins.type),
            ['--col-skill-type-min' as any]: formatMin(skMins.type, 0),
            ['--col-skill-level-width' as any]: formatWidth(skWidths.level, 60, skMins.level),
            ['--col-skill-level-min' as any]: formatMin(skMins.level, 0),
            ['--col-skill-stat-width' as any]: formatWidth(skWidths.stat, 144, skMins.stat),
            ['--col-skill-stat-min' as any]: formatMin(skMins.stat, 0),
            ['--col-skill-action-width' as any]: formatWidth(skWidths.action, 156, skMins.action),
            ['--col-skill-action-min' as any]: formatMin(skMins.action, 0),
            ['--col-skill-effect-width' as any]: formatWidth(skWidths.effect, 240, skMins.effect),
            ['--col-skill-effect-min' as any]: formatMin(skMins.effect, 0),
            ['--col-skill-astra-width' as any]: formatWidth(skWidths.astra, 60, skMins.astra),
            ['--col-skill-astra-min' as any]: formatMin(skMins.astra, 0),
            ['--col-skill-actions-width' as any]: formatWidth(skWidths.actions, 70, skMins.actions),
            ['--col-skill-actions-min' as any]: formatMin(skMins.actions, 0),
          };
          // Helper local : met à jour UNE largeur de colonne Compétences.
          const commitSkWidth = (key: string, w: number) => setCharacter(p => ({
            ...p,
            tableColumnWidths: {
              ...(p.tableColumnWidths ?? {}),
              skills: { ...(p.tableColumnWidths?.skills ?? {}), [key]: w },
            },
          }));
          const openSkSettings = () => {
            setSettingsTarget({
              id: 'skills',
              title: 'Compétences',
              columns: [
                { key: 'name', label: 'Compétence', default: 216, min: 30, max: 600 },
                { key: 'tags', label: 'Tags', default: 156, min: 30, max: 600 },
                { key: 'type', label: 'Type', default: 144, min: 30, max: 600 },
                { key: 'level', label: 'Lvl', default: 60, min: 30, max: 120 },
                { key: 'stat', label: 'Stat', default: 144, min: 30, max: 600 },
                { key: 'action', label: 'Action requise', default: 156, min: 30, max: 600 },
                { key: 'effect', label: 'Effet', default: 240, min: 30, max: 800 },
                { key: 'astra', label: 'Astra', default: 60, min: 30, max: 120 },
                { key: 'actions', label: 'Actions', default: 70, min: 30, max: 200 },
              ],
              widths: skWidths, mins: skMins
            });
            setSettingsDialogOpen(true);
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setCharacter(p => ({ ...p, skills: [...p.skills, { id: generateUUID(), name: 'Nouvelle compétence', tags: '', type: 'Passif', level: 1, actionRequired: '', effect: '', astraCost: 0, dependentStat: '', rarity: 'common' }] }))}><Plus size={16} /> Ajouter une compétence</button>
                <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                  Astuce : faites glisser le bord droit d'un en-tête de colonne pour redimensionner
                </span>
              </div>

              <table className="char-table char-skill-table" style={skStyle} ref={skillsTableRef}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>#</th>
                    <th scope="col" className="col-rarity" title="Rareté">🎲<br /><span className="mod-label">Rar.</span></th>
                    <th style={{ position: 'relative' }}>
                      Compétence
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-name"
                        userMin={skMins['name'] !== undefined ? Number(skMins['name']) : undefined}
                              currentWidth={skWidths.name ?? 216}
                        min={30}
                        max={600}
                        onCommit={(w) => commitSkWidth('name', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Compétence"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Tags
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-tags"
                        userMin={skMins['tags'] !== undefined ? Number(skMins['tags']) : undefined}
                              currentWidth={skWidths.tags ?? 156}
                        min={30}
                        max={400}
                        onCommit={(w) => commitSkWidth('tags', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Tags"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Type
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-type"
                        userMin={skMins['type'] !== undefined ? Number(skMins['type']) : undefined}
                              currentWidth={skWidths.type ?? 144}
                        min={30}
                        max={400}
                        onCommit={(w) => commitSkWidth('type', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Type"
                      />
                    </th>
                    <th style={{ textAlign: 'center', position: 'relative' }}>
                      Niveau
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-level"
                        userMin={skMins['level'] !== undefined ? Number(skMins['level']) : undefined}
                              currentWidth={skWidths.level ?? 60}
                        min={30}
                        max={120}
                        onCommit={(w) => commitSkWidth('level', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Niveau"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Caractéristique
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-stat"
                        userMin={skMins['stat'] !== undefined ? Number(skMins['stat']) : undefined}
                              currentWidth={skWidths.stat ?? 144}
                        min={30}
                        max={400}
                        onCommit={(w) => commitSkWidth('stat', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Caractéristique"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Action d'intervention
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-action"
                        userMin={skMins['action'] !== undefined ? Number(skMins['action']) : undefined}
                              currentWidth={skWidths.action ?? 156}
                        min={30}
                        max={400}
                        onCommit={(w) => commitSkWidth('action', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Action d'intervention"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Effet
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-effect"
                        userMin={skMins['effect'] !== undefined ? Number(skMins['effect']) : undefined}
                              currentWidth={skWidths.effect ?? 240}
                        min={30}
                        max={600}
                        onCommit={(w) => commitSkWidth('effect', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Effet"
                      />
                    </th>
                    <th style={{ textAlign: 'center', position: 'relative' }}>
                      Utilisation <span style={{ color: 'var(--stat-color-astra)' }}>{(character.general.energyType || 'astra').replace(/^./, c => c.toUpperCase())}</span>
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-astra"
                        userMin={skMins['astra'] !== undefined ? Number(skMins['astra']) : undefined}
                              currentWidth={skWidths.astra ?? 60}
                        min={30}
                        max={120}
                        onCommit={(w) => commitSkWidth('astra', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Utilisation"
                      />
                    </th>
                    <th style={{ position: 'relative' }}>
                      Actions
                      <TableColumnResize
                        tableRef={skillsTableRef}
                        columnKey="skill-actions"
                        userMin={skMins['actions'] !== undefined ? Number(skMins['actions']) : undefined}
                              currentWidth={skWidths.actions ?? 70}
                        min={30}
                        max={120}
                        onCommit={(w) => commitSkWidth('actions', w)}
                        onSettingsOpen={openSkSettings}
                        disabled={readOnly}
                        label="Redimensionner la colonne Actions"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {character.skills.map((skill, index) => (
                    <DraggableRow
                      key={skill.id}
                      items={character.skills}
                      rowIndex={index}
                      getId={s => s.id}
                      reorder={(fromId, toIndex) => setCharacter(p => {
                        const fromIdx = p.skills.findIndex(s2 => s2.id === fromId);
                        return { ...p, skills: moveRow(p.skills, fromIdx, toIndex) };
                      })}
                    >
                      <td style={{ width: '40px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{index + 1}</td>
                      <td className="col-rarity" style={{ width: '50px' }}>
                        <RarityPicker
                          value={skill.rarity ?? 'common'}
                          onChange={(r) => { const skills = [...character.skills]; skills[index] = { ...skills[index], rarity: r }; setCharacter(p => ({ ...p, skills })); }}
                          disabled={readOnly}
                          title="Rareté de la compétence"
                        />
                      </td>
                      <td>
                        <textarea
                          className="char-stat-textarea"
                          rows={2}
                          value={skill.name}
                          title={skill.name || undefined}
                          onChange={e => { const skills = [...character.skills]; skills[index].name = e.target.value; setCharacter(p => ({ ...p, skills })); }}
                          style={{ fontWeight: 'bold' }}
                        />
                      </td>
                      <td>
                        <SkillTagsPicker
                          value={skill.tags}
                          onChange={(newTags) => { const skills = [...character.skills]; skills[index].tags = newTags; setCharacter(p => ({ ...p, skills })); }}
                          disabled={readOnly}
                          fieldTooltip={SKILL_TAGS_FIELD_TOOLTIP}
                        />
                      </td>
                      <td>
                        <SkillSingleSelectPicker
                          value={skill.type}
                          onChange={(newType) => { const skills = [...character.skills]; skills[index] = { ...skills[index], type: newType }; setCharacter(p => ({ ...p, skills })); }}
                          options={SKILL_TYPE_OPTIONS}
                          fieldTooltip={SKILL_TYPE_FIELD_TOOLTIP}
                          menuTitle="Type de compétence"
                          placeholder="— Choisir —"
                          disabled={readOnly}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" className="char-stat-input" style={{ textAlign: 'center', fontWeight: 'bold' }} value={skill.level} onChange={e => { const skills = [...character.skills]; skills[index].level = parseInt(e.target.value) || 1; setCharacter(p => ({ ...p, skills })); }} />
                      </td>
                      <td>
                        <FormControl size="small" fullWidth disabled={readOnly} sx={muiFieldSx}>
                          <Select
                            value={(skill.dependentStat ?? '') as string}
                            onChange={(e) => {
                              const skills = [...character.skills];
                              skills[index] = { ...skills[index], dependentStat: e.target.value as any };
                              setCharacter(p => ({ ...p, skills }));
                            }}
                            MenuProps={selectMenuProps}
                            renderValue={(selected) => {
                              if (!selected) {
                                return <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Aucune</span>;
                              }
                              const opt = DEPENDENT_STAT_OPTIONS.find(o => o.value === selected);
                              return opt?.label ?? selected;
                            }}
                            sx={{
                              fontSize: '0.8rem',
                              '& .MuiSelect-select': { padding: '4px 8px', minHeight: 'unset' },
                            }}
                          >
                            {DEPENDENT_STAT_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value || 'none'} value={opt.value} sx={{ fontSize: '0.85rem' }}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </td>
                      <td>
                        <SkillMultiSelectPicker
                          value={skill.actionRequired}
                          onChange={(newAction) => { const skills = [...character.skills]; skills[index] = { ...skills[index], actionRequired: newAction }; setCharacter(p => ({ ...p, skills })); }}
                          options={SKILL_ACTION_OPTIONS}
                          fieldTooltip={SKILL_ACTION_FIELD_TOOLTIP}
                          menuTitle="Action d'intervention"
                          placeholder="— Choisir —"
                          disabled={readOnly}
                        />
                      </td>
                      <td>
                        <textarea
                          className="char-stat-textarea"
                          rows={2}
                          value={skill.effect}
                          title={skill.effect || undefined}
                          onChange={e => { const skills = [...character.skills]; skills[index].effect = e.target.value; setCharacter(p => ({ ...p, skills })); }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" className="char-stat-input" style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--stat-color-astra)' }} value={skill.astraCost} onChange={e => { const skills = [...character.skills]; skills[index].astraCost = parseInt(e.target.value) || 0; setCharacter(p => ({ ...p, skills })); }} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="row-actions-cell">
                          <RowDeleteButton
                            onClick={() => setDeleteConfirm({ open: true, type: 'skill', id: skill.id, name: skill.name || 'cette compétence' })}
                            disabled={readOnly}
                            label="Supprimer la compétence"
                          />
                          <RowDragHandle label="Glisser pour réorganiser la compétence" />
                        </div>
                      </td>
                    </DraggableRow>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {activeTab === 'equipment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              {[
                { id: 'inventory', label: 'Inventaire' },
                { id: 'equipment', label: 'Équipement' },
                { id: 'weapons', label: 'Armes' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tab-button text-button ${activeEquipTab === tab.id ? 'primary' : 'ghost'}`}
                  style={{ borderRadius: '8px 8px 0 0', borderBottom: activeEquipTab === tab.id ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent', padding: '8px 16px' }}
                  onClick={() => setActiveEquipTab(tab.id as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeEquipTab === 'equipment' && (() => {
              const eqWidths: ColumnWidthsState = character.tableColumnWidths?.equipment ?? {};
              const eqMins: ColumnWidthsState = character.tableColumnMins?.equipment ?? {};
              const EQ_COLS = [
                { key: 'rarity', label: 'Rareté', min: 30, max: 180, default: 60 },
                { key: 'description', label: 'Description', min: 30, max: 600, default: 160 },
                { key: 'effects', label: 'Effets', min: 30, max: 600, default: 160 },
                { key: 'weight', label: 'Poids', min: 30, max: 200, default: 84 },
                { key: 'actions', label: 'Actions', min: 30, max: 200, default: 70 },
              ] as const;
              const eqStyle: React.CSSProperties = {
                ['--col-rarity-width' as any]: `50px`,
                ['--col-equip-description-width' as any]: formatWidth(eqWidths.description, EQ_COLS[1].default, eqMins.description),
            ['--col-equip-description-min' as any]: formatMin(eqMins.description, 0),
                ['--col-equip-effects-width' as any]: formatWidth(eqWidths.effects, EQ_COLS[2].default, eqMins.effects),
            ['--col-equip-effects-min' as any]: formatMin(eqMins.effects, 0),
                ['--col-equip-weight-width' as any]: formatWidth(eqWidths.weight, EQ_COLS[3].default, eqMins.weight),
            ['--col-equip-weight-min' as any]: formatMin(eqMins.weight, 0),
                ['--col-equip-mod-width' as any]: formatWidth(eqWidths.mod, 54, eqMins.mod),
            ['--col-equip-mod-min' as any]: formatMin(eqMins.mod, 0),
                ['--col-equip-actions-width' as any]: formatWidth(eqWidths.actions, EQ_COLS[4].default, eqMins.actions),
            ['--col-equip-actions-min' as any]: formatMin(eqMins.actions, 0),
              };
              const commitEqWidth = (key: string, w: number) => setCharacter(p => ({
                ...p,
                tableColumnWidths: {
                  ...(p.tableColumnWidths ?? {}),
                  equipment: { ...(p.tableColumnWidths?.equipment ?? {}), [key]: w },
                },
              }));
              const openEqSettings = () => {
                setSettingsTarget({
                  id: 'equipment',
                  title: 'Équipement',
                  columns: [...EQ_COLS, { key: 'mod', label: 'Modificateurs', default: 54, min: 30, max: 90 }],
                  widths: eqWidths, mins: eqMins
                });
                setSettingsDialogOpen(true);
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* === Totaux Équipement — affichés EN LIGNE au-dessus du bouton Ajouter === */}
                  <CharacterTotalsPanel
                    items={character.equipment}
                    title="Totaux Équipement"
                  />

                  {/* === Bouton Ajouter un équipement === */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="secondary" onClick={() => setCharacter(p => ({ ...p, equipment: [...p.equipment, { id: generateUUID(), description: 'Nouvel équipement', effects: '', weight: 0, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 }] }))}><Plus size={16} /> Ajouter un équipement</button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                      Astuce : faites glisser le bord droit d'un en-tête de colonne pour redimensionner
                    </span>
                  </div>

                  <div style={{ flex: '1 1 600px', minWidth: 0, overflowX: 'auto' }} className="char-equip-table-wrap">
                    <table className="char-table char-equip-table" style={eqStyle} ref={equipmentTableRef}>
                      <thead>
                        <tr>
                          <th scope="col" style={{ width: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>#</th>
                          <th scope="col" className="col-rarity" title="Rareté" style={{ position: 'relative' }}>
                            🎲<br /><span className="mod-label">Rar.</span>
                            <TableColumnResize
                              tableRef={equipmentTableRef}
                              columnKey="rarity"
                              userMin={eqMins['rarity'] !== undefined ? Number(eqMins['rarity']) : undefined}
                              currentWidth={eqWidths.rarity ?? EQ_COLS[0].default}
                              min={EQ_COLS[0].min}
                              max={EQ_COLS[0].max}
                              onCommit={(w) => commitEqWidth('rarity', w)}
                              onSettingsOpen={openEqSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Rareté"
                            />
                          </th>
                          <th scope="col" className="col-description" style={{ position: 'relative' }}>
                            Description
                            <TableColumnResize
                              tableRef={equipmentTableRef}
                              columnKey="description"
                              userMin={eqMins['description'] !== undefined ? Number(eqMins['description']) : undefined}
                              currentWidth={eqWidths.description ?? EQ_COLS[1].default}
                              min={EQ_COLS[1].min}
                              max={EQ_COLS[1].max}
                              onCommit={(w) => commitEqWidth('description', w)}
                              onSettingsOpen={openEqSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Description"
                            />
                          </th>
                          <th scope="col" className="col-effects" style={{ position: 'relative' }}>
                            Effets
                            <TableColumnResize
                              tableRef={equipmentTableRef}
                              columnKey="effects"
                              userMin={eqMins['effects'] !== undefined ? Number(eqMins['effects']) : undefined}
                              currentWidth={eqWidths.effects ?? EQ_COLS[2].default}
                              min={EQ_COLS[2].min}
                              max={EQ_COLS[2].max}
                              onCommit={(w) => commitEqWidth('effects', w)}
                              onSettingsOpen={openEqSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Effets"
                            />
                          </th>
                          <th scope="col" className="col-weight" title="Poids en kg" style={{ position: 'relative' }}>
                            ⚖<br /><span className="mod-label">Poids</span>
                            <TableColumnResize
                              tableRef={equipmentTableRef}
                              columnKey="weight"
                              userMin={eqMins['weight'] !== undefined ? Number(eqMins['weight']) : undefined}
                              currentWidth={eqWidths.weight ?? EQ_COLS[3].default}
                              min={EQ_COLS[3].min}
                              max={EQ_COLS[3].max}
                              onCommit={(w) => commitEqWidth('weight', w)}
                              onSettingsOpen={openEqSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Poids"
                            />
                          </th>
                          {[
                            { key: 'healthMod', label: 'Santé', short: 'Sant.', emoji: '♥', color: 'var(--stat-color-health)' },
                            { key: 'mentalMod', label: 'Mental', short: 'Ment.', emoji: '@', color: 'var(--stat-color-mental)' },
                            { key: 'armorMod', label: 'Armure', short: 'Armu.', emoji: '🛡', color: 'var(--stat-color-armor)' },
                            { key: 'astraMod', label: 'Astra', short: 'Astr.', emoji: '✨', color: 'var(--stat-color-astra)' },
                            { key: 'enduranceMod', label: 'Endurance', short: 'Endu.', emoji: '🔋', color: '' },
                            { key: 'strengthMod', label: 'Force', short: 'Forc.', emoji: '💪', color: '' },
                            { key: 'agilityMod', label: 'Agilité', short: 'Agil.', emoji: '🦘', color: '' },
                            { key: 'intelligenceMod', label: 'Intelligence', short: 'Inte.', emoji: '🧠', color: '' },
                            { key: 'astraMasteryMod', label: 'Maitrise', short: 'Mait.', emoji: '💫', color: '' },
                            { key: 'charismaMod', label: 'Charisme', short: 'Char.', emoji: '🔊', color: '' },
                            { key: 'wisdomMod', label: 'Sagesse', short: 'Sag.', emoji: '🌿', color: '' },
                            { key: 'luckMod', label: 'Chance', short: 'Chan.', emoji: '🍀', color: '' },
                            { key: 'perceptionMod', label: 'Perception', short: 'Perc.', emoji: '👀', color: '' }
                          ].map(m => {
                            if (m.key !== 'healthMod') {
                              return (
                                <th key={m.key} scope="col" className="col-mod" title={m.label}>
                                  <span className="mod-emoji" style={{ color: m.color || 'var(--md-sys-color-on-surface-variant)' }}>{m.emoji}</span>
                                  <span className="mod-label">{m.short}</span>
                                </th>
                              );
                            }
                            return (
                              <th key={m.key} scope="col" className="col-mod" title={m.label} style={{ position: 'relative' }}>
                                <span className="mod-emoji" style={{ color: m.color || 'var(--md-sys-color-on-surface-variant)' }}>{m.emoji}</span>
                                <span className="mod-label">{m.short}</span>
                                <TableColumnResize
                                  tableRef={equipmentTableRef}
                                  columnKey="mod"
                                  userMin={eqMins['mod'] !== undefined ? Number(eqMins['mod']) : undefined}
                              currentWidth={eqWidths.mod ?? 54}
                                  min={30}
                                  max={90}
                                  onCommit={(w) => commitEqWidth('mod', w)}
                                  onSettingsOpen={openEqSettings}
                                  disabled={readOnly}
                                  label="Redimensionner les colonnes Modificateurs"
                                />
                              </th>
                            );
                          })}
                          <th scope="col" className="col-actions" style={{ position: 'relative' }}>
                            Actions
                            <TableColumnResize
                              tableRef={equipmentTableRef}
                              columnKey="actions"
                              userMin={eqMins['actions'] !== undefined ? Number(eqMins['actions']) : undefined}
                              currentWidth={eqWidths.actions ?? EQ_COLS[4].default}
                              min={30}
                              max={200}
                              onCommit={(w) => commitEqWidth('actions', w)}
                              onSettingsOpen={openEqSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Actions"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {character.equipment.map((eq, index) => (
                          <DraggableRow
                            key={eq.id}
                            items={character.equipment}
                            rowIndex={index}
                            getId={e => e.id}
                            reorder={(fromId, toIndex) => setCharacter(p => {
                              const fromIdx = p.equipment.findIndex(e2 => e2.id === fromId);
                              return { ...p, equipment: moveRow(p.equipment, fromIdx, toIndex) };
                            })}
                          >
                            <td style={{ width: '40px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{index + 1}</td>
                            <td className="col-rarity">
                              <RarityPicker
                                value={eq.rarity}
                                onChange={(r) => { const equipment = [...character.equipment]; equipment[index] = { ...equipment[index], rarity: r }; setCharacter(p => ({ ...p, equipment })); }}
                                disabled={readOnly}
                              />
                            </td>
                            <td className="col-description">
                              <textarea
                                className="char-stat-textarea"
                                rows={2}
                                value={eq.description}
                                title={eq.description || undefined}
                                onChange={e => { const equipment = [...character.equipment]; equipment[index].description = e.target.value; setCharacter(p => ({ ...p, equipment })); }}
                                style={{ fontWeight: 'bold' }}
                              />
                            </td>
                            <td className="col-effects">
                              <textarea
                                className="char-stat-textarea"
                                rows={2}
                                value={eq.effects}
                                title={eq.effects || undefined}
                                onChange={e => { const equipment = [...character.equipment]; equipment[index].effects = e.target.value; setCharacter(p => ({ ...p, equipment })); }}
                              />
                            </td>
                            <td className="col-weight">
                              <input type="number" step="0.1" className="char-stat-input" value={eq.weight || ''} onChange={e => { const equipment = [...character.equipment]; equipment[index].weight = parseFloat(e.target.value) || 0; setCharacter(p => ({ ...p, equipment })); }} placeholder="0" />
                            </td>
                            {[
                              'healthMod', 'mentalMod', 'armorMod', 'astraMod',
                              'enduranceMod', 'strengthMod', 'agilityMod', 'intelligenceMod',
                              'astraMasteryMod', 'charismaMod', 'wisdomMod', 'luckMod', 'perceptionMod'
                            ].map(modKey => {
                              const val = (eq as any)[modKey];
                              const modClass = val > 0 ? 'char-mod-positive' : val < 0 ? 'char-mod-negative' : '';
                              return (
                                <td key={modKey} className="col-mod">
                                  <input
                                    type="number"
                                    className={`char-stat-input ${modClass}`}
                                    value={val || ''}
                                    onChange={e => { const equipment = [...character.equipment]; (equipment[index] as any)[modKey] = parseInt(e.target.value) || 0; setCharacter(p => ({ ...p, equipment })); }}
                                    placeholder="·"
                                  />
                                </td>
                              );
                            })}
                            <td className="col-actions">
                              <div className="row-actions-cell">
                                <RowDeleteButton
                                  onClick={() => setDeleteConfirm({ open: true, type: 'equipment', id: eq.id, name: eq.description || 'cet équipement' })}
                                  disabled={readOnly}
                                  label="Supprimer l'équipement"
                                />
                                <RowDragHandle label="Glisser pour réorganiser l'équipement" />
                              </div>
                            </td>
                          </DraggableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeEquipTab === 'inventory' && (() => {
              const invWidths: ColumnWidthsState = character.tableColumnWidths?.inventory ?? {};
              const invMins: ColumnWidthsState = character.tableColumnMins?.inventory ?? {};
              const INV_COLS = [
                { key: 'rarity', label: 'Rareté', min: 30, max: 180, default: 110 },
                { key: 'description', label: 'Description', min: 30, max: 400, default: 220 },
                { key: 'effects', label: 'Effet', min: 30, max: 400, default: 200 },
                { key: 'weight', label: 'Poids', min: 30, max: 160, default: 100 },
                { key: 'actions', label: 'Actions', min: 30, max: 120, default: 80 },
              ] as const;
              const invStyle: React.CSSProperties = {
                ['--col-rarity-width' as any]: formatWidth(invWidths.rarity, INV_COLS[0].default, invMins.rarity),
            ['--col-rarity-min' as any]: formatMin(invMins.rarity, 0),
                ['--col-equip-description-width' as any]: formatWidth(invWidths.description, INV_COLS[1].default, invMins.description),
            ['--col-equip-description-min' as any]: formatMin(invMins.description, 0),
                ['--col-equip-effects-width' as any]: formatWidth(invWidths.effects, INV_COLS[2].default, invMins.effects),
            ['--col-equip-effects-min' as any]: formatMin(invMins.effects, 0),
                ['--col-equip-weight-width' as any]: formatWidth(invWidths.weight, INV_COLS[3].default, invMins.weight),
            ['--col-equip-weight-min' as any]: formatMin(invMins.weight, 0),
                ['--col-equip-actions-width' as any]: formatWidth(invWidths.actions, INV_COLS[4].default, invMins.actions),
            ['--col-equip-actions-min' as any]: formatMin(invMins.actions, 0),
              };
              const commitInvWidth = (key: string, w: number) => setCharacter(p => ({
                ...p,
                tableColumnWidths: {
                  ...(p.tableColumnWidths ?? {}),
                  inventory: { ...(p.tableColumnWidths?.inventory ?? {}), [key]: w },
                },
              }));
              const openInvSettings = () => {
                setSettingsTarget({
                  id: 'inventory',
                  title: 'Inventaire',
                  columns: [...INV_COLS],
                  widths: invWidths, mins: invMins
                });
                setSettingsDialogOpen(true);
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* === Card "Argent" : mise en avant M3 === */}
                  <div
                    className={`char-money-card ${character.inventory.money < 0 ? 'char-money-card--debt' : ''}`}
                    role="group"
                    aria-label="Argent disponible"
                    data-debt={character.inventory.money < 0 ? 'true' : 'false'}
                  >
                    <div className="char-money-card-icon" aria-hidden>{character.inventory.money < 0 ? '💸' : '💰'}</div>
                    <div className="char-money-card-body">
                      <label className="char-money-card-label" htmlFor="inv-money-input">Argent disponible</label>
                      <div className="char-money-card-value-row">
                        <BufferedNumberField
                          id="inv-money-input"
                          className="char-money-card-input"
                          value={character.inventory.money}
                          onChange={(v) => setCharacter(p => ({ ...p, inventory: { ...p.inventory, money: v } }))}
                          step={1}
                          disabled={readOnly}
                          aria-label="Montant d'argent"
                          title={character.inventory.money < 0 ? 'Dette — le personnage doit de l\u2019argent' : undefined}
                        />
                        <span className="char-money-card-suffix" aria-hidden>
                          {character.inventory.money < 0
                            ? 'DETTE'
                            : (moneySuffix && moneySuffix.trim().length > 0 ? moneySuffix : 'PO')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* === Totaux Inventaire === */}
                  <CharacterTotalsPanel
                    items={character.inventory.items.map(it => ({
                      id: it.id,
                      weight: (Number(it.weightPerItem) || 0) * (Number(it.quantity) || 0),
                    }))}
                    title="Totaux Inventaire"
                  />

                  {/* === Bouton Ajouter un objet === */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="secondary" onClick={() => setCharacter(p => ({ ...p, inventory: { ...p.inventory, items: [...p.inventory.items, { id: generateUUID(), description: 'Nouvel objet', quantity: 1, effect: '', weightPerItem: 0, rarity: 'common' }] } }))}><Plus size={16} /> Ajouter un objet</button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                      Astuce : faites glisser le bord droit d'un en-tête de colonne pour redimensionner
                    </span>
                  </div>

                  <div style={{ flex: '1 1 600px', minWidth: 0, overflowX: 'auto' }} className="char-equip-table-wrap">
                    <table className="char-table char-equip-table char-inventory-table" style={invStyle} ref={inventoryTableRef}>
                      <thead>
                        <tr>
                          <th scope="col" style={{ width: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>#</th>
                          <th scope="col" className="col-rarity" title="Rareté" style={{ position: 'relative' }}>
                            🎲<br /><span className="mod-label">Rar.</span>
                            <TableColumnResize
                              tableRef={inventoryTableRef}
                              columnKey="rarity"
                              userMin={invMins['rarity'] !== undefined ? Number(invMins['rarity']) : undefined}
                              currentWidth={invWidths.rarity ?? INV_COLS[0].default}
                              min={INV_COLS[0].min}
                              max={INV_COLS[0].max}
                              onCommit={(w) => commitInvWidth('rarity', w)}
                              onSettingsOpen={openInvSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Rareté"
                            />
                          </th>
                          <th scope="col" className="col-description" style={{ position: 'relative' }}>
                            Description
                            <TableColumnResize
                              tableRef={inventoryTableRef}
                              columnKey="description"
                              userMin={invMins['description'] !== undefined ? Number(invMins['description']) : undefined}
                              currentWidth={invWidths.description ?? INV_COLS[1].default}
                              min={INV_COLS[1].min}
                              max={INV_COLS[1].max}
                              onCommit={(w) => commitInvWidth('description', w)}
                              onSettingsOpen={openInvSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Description"
                            />
                          </th>
                          <th scope="col" className="col-quantity" style={{ width: '60px', textAlign: 'center' }}>Quantité</th>
                          <th scope="col" className="col-effects" style={{ position: 'relative' }}>
                            Effet
                            <TableColumnResize
                              tableRef={inventoryTableRef}
                              columnKey="effects"
                              userMin={invMins['effects'] !== undefined ? Number(invMins['effects']) : undefined}
                              currentWidth={invWidths.effects ?? INV_COLS[2].default}
                              min={INV_COLS[2].min}
                              max={INV_COLS[2].max}
                              onCommit={(w) => commitInvWidth('effects', w)}
                              onSettingsOpen={openInvSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Effet"
                            />
                          </th>
                          <th scope="col" className="col-weight" title="Poids unitaire (kg)" style={{ position: 'relative' }}>
                            ⚖<br /><span className="mod-label">U.</span>
                            <TableColumnResize
                              tableRef={inventoryTableRef}
                              columnKey="weight"
                              userMin={invMins['weight'] !== undefined ? Number(invMins['weight']) : undefined}
                              currentWidth={invWidths.weight ?? INV_COLS[3].default}
                              min={INV_COLS[3].min}
                              max={INV_COLS[3].max}
                              onCommit={(w) => commitInvWidth('weight', w)}
                              onSettingsOpen={openInvSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Poids"
                            />
                          </th>
                          <th scope="col" className="col-weight-total" style={{ width: '90px', textAlign: 'center' }} title="Poids total (kg)">⚖<br /><span className="mod-label">Total</span></th>
                          <th scope="col" className="col-actions" style={{ position: 'relative' }}>
                            Actions
                            <TableColumnResize
                              tableRef={inventoryTableRef}
                              columnKey="actions"
                              userMin={invMins['actions'] !== undefined ? Number(invMins['actions']) : undefined}
                              currentWidth={invWidths.actions ?? INV_COLS[4].default}
                              min={INV_COLS[4].min}
                              max={INV_COLS[4].max}
                              onCommit={(w) => commitInvWidth('actions', w)}
                              onSettingsOpen={openInvSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Actions"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {character.inventory.items.map((item, index) => (
                          <DraggableRow
                            key={item.id}
                            items={character.inventory.items}
                            rowIndex={index}
                            getId={i => i.id}
                            reorder={(fromId, toIndex) => setCharacter(p => {
                              const fromIdx = p.inventory.items.findIndex(i2 => i2.id === fromId);
                              return { ...p, inventory: { ...p.inventory, items: moveRow(p.inventory.items, fromIdx, toIndex) } };
                            })}
                          >
                            <td style={{ width: '40px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{index + 1}</td>
                            <td className="col-rarity">
                              <RarityPicker
                                value={item.rarity}
                                onChange={(r) => { const items = [...character.inventory.items]; items[index] = { ...items[index], rarity: r }; setCharacter(p => ({ ...p, inventory: { ...p.inventory, items } })); }}
                                disabled={readOnly}
                              />
                            </td>
                            <td className="col-description">
                              <textarea
                                className="char-stat-textarea"
                                rows={2}
                                value={item.description}
                                title={item.description || undefined}
                                onChange={e => { const items = [...character.inventory.items]; items[index].description = e.target.value; setCharacter(p => ({ ...p, inventory: { ...p.inventory, items } })); }}
                                style={{ fontWeight: 'bold' }}
                              />
                            </td>
                            <td className="col-quantity" style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="char-stat-input"
                                style={{ textAlign: 'center', fontWeight: 'bold' }}
                                value={item.quantity}
                                onChange={e => { const items = [...character.inventory.items]; const v = Math.max(0, parseInt(e.target.value) || 0); items[index].quantity = v; setCharacter(p => ({ ...p, inventory: { ...p.inventory, items } })); }}
                                disabled={readOnly}
                              />
                            </td>
                            <td className="col-effects">
                              <textarea
                                className="char-stat-textarea"
                                rows={2}
                                value={item.effect}
                                title={item.effect || undefined}
                                onChange={e => { const items = [...character.inventory.items]; items[index].effect = e.target.value; setCharacter(p => ({ ...p, inventory: { ...p.inventory, items } })); }}
                              />
                            </td>
                            <td className="col-weight">
                              <input
                                type="number"
                                step="0.1"
                                min={0}
                                className="char-stat-input"
                                style={{ textAlign: 'center' }}
                                value={item.weightPerItem}
                                onChange={e => { const items = [...character.inventory.items]; const v = Math.max(0, parseFloat(e.target.value) || 0); items[index].weightPerItem = v; setCharacter(p => ({ ...p, inventory: { ...p.inventory, items } })); }}
                                disabled={readOnly}
                                placeholder="0"
                              />
                            </td>
                            <td className="col-weight-total" style={{ textAlign: 'center' }}>
                              <div className="char-inv-total-cell">
                                {Math.round(item.quantity * item.weightPerItem * 10) / 10} <span className="char-inv-total-unit">kg</span>
                              </div>
                            </td>
                            <td className="col-actions">
                              <div className="row-actions-cell">
                                <RowDeleteButton
                                  onClick={() => setDeleteConfirm({ open: true, type: 'inventory', id: item.id, name: item.description || 'cet objet' })}
                                  disabled={readOnly}
                                  label="Supprimer l'objet"
                                />
                                <RowDragHandle label="Glisser pour réorganiser l'objet" />
                              </div>
                            </td>
                          </DraggableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeEquipTab === 'weapons' && (() => {
              const anyAmmo = character.weapons.some(w => w.hasAmmo);
              const wWidths: ColumnWidthsState = character.tableColumnWidths?.weapons ?? {};
              const wMins: ColumnWidthsState = character.tableColumnMins?.weapons ?? {};
              const wStyle: React.CSSProperties = {
                ['--col-rarity-width' as any]: formatWidth(wWidths.rarity, 60, wMins.rarity),
            ['--col-rarity-min' as any]: formatMin(wMins.rarity, 0),
                ['--col-weapon-name-width' as any]: formatWidth(wWidths.name, 192, wMins.name),
            ['--col-weapon-name-min' as any]: formatMin(wMins.name, 0),
                ['--col-weapon-type-width' as any]: formatWidth(wWidths.type, 144, wMins.type),
            ['--col-weapon-type-min' as any]: formatMin(wMins.type, 0),
                ['--col-weapon-damage-width' as any]: formatWidth(wWidths.damage, 96, wMins.damage),
            ['--col-weapon-damage-min' as any]: formatMin(wMins.damage, 0),
                ['--col-weapon-range-width' as any]: formatWidth(wWidths.range, 96, wMins.range),
            ['--col-weapon-range-min' as any]: formatMin(wMins.range, 0),
                ['--col-weapon-hasammo-width' as any]: formatWidth(wWidths.hasAmmo, 96, wMins.hasAmmo),
            ['--col-weapon-hasammo-min' as any]: formatMin(wMins.hasAmmo, 0),
                ['--col-weapon-ammo-width' as any]: formatWidth(wWidths.ammo, 120, wMins.ammo),
            ['--col-weapon-ammo-min' as any]: formatMin(wMins.ammo, 0),
                ['--col-weapon-maxammo-width' as any]: formatWidth(wWidths.maxAmmo, 84, wMins.maxAmmo),
            ['--col-weapon-maxammo-min' as any]: formatMin(wMins.maxAmmo, 0),
                ['--col-weapon-magazines-width' as any]: formatWidth(wWidths.magazines, 84, wMins.magazines),
            ['--col-weapon-magazines-min' as any]: formatMin(wMins.magazines, 0),
                ['--col-weapon-tags-width' as any]: formatWidth(wWidths.tags, 180, wMins.tags),
            ['--col-weapon-tags-min' as any]: formatMin(wMins.tags, 0),
                ['--col-weapon-effects-width' as any]: formatWidth(wWidths.effects, 216, wMins.effects),
            ['--col-weapon-effects-min' as any]: formatMin(wMins.effects, 0),
                ['--col-weapon-weight-width' as any]: formatWidth(wWidths.weight, 60, wMins.weight),
            ['--col-weapon-weight-min' as any]: formatMin(wMins.weight, 0),
                ['--col-weapon-actions-width' as any]: formatWidth(wWidths.actions, 72, wMins.actions),
            ['--col-weapon-actions-min' as any]: formatMin(wMins.actions, 0),
              };
              const commitWWidth = (key: string, w: number) => setCharacter(p => ({
                ...p,
                tableColumnWidths: {
                  ...(p.tableColumnWidths ?? {}),
                  weapons: { ...(p.tableColumnWidths?.weapons ?? {}), [key]: w },
                },
              }));
              const openWSettings = () => {
                setSettingsTarget({
                  id: 'weapons',
                  title: 'Armes',
                  columns: [
                    { key: 'rarity', label: 'Rareté', default: 60, min: 30, max: 140 },
                    { key: 'name', label: 'Arme', default: 192, min: 30, max: 500 },
                    { key: 'type', label: 'Type', default: 144, min: 30, max: 400 },
                    { key: 'damage', label: 'Dégâts', default: 96, min: 30, max: 200 },
                    { key: 'range', label: 'Portée', default: 96, min: 30, max: 200 },
                    { key: 'hasAmmo', label: 'Mun.', default: 96, min: 30, max: 160 },
                    { key: 'ammo', label: 'Munitions', default: 120, min: 30, max: 260 },
                    { key: 'maxAmmo', label: 'Mun Max', default: 84, min: 30, max: 160 },
                    { key: 'magazines', label: 'Chargeurs', default: 84, min: 30, max: 160 },
                    { key: 'tags', label: 'Tags', default: 180, min: 30, max: 400 },
                    { key: 'effects', label: 'Effets', default: 216, min: 30, max: 500 },
                    { key: 'weight', label: 'Poids', default: 60, min: 30, max: 160 },
                    { key: 'actions', label: 'Actions', default: 72, min: 30, max: 120 },
                  ],
                  widths: wWidths, mins: wMins
                });
                setSettingsDialogOpen(true);
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setCharacter(p => ({ ...p, weapons: [...p.weapons, { id: generateUUID(), name: 'Nouvelle arme', type: 'Distance', damage: '1d4', range: '10m', hasAmmo: false, ammo: 0, maxAmmo: 0, magazines: 0, tags: [], effects: '', weight: 1, rarity: 'common' }] }))}><Plus size={16} /> Ajouter une arme</button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                      Astuce : faites glisser le bord droit d'un en-tête de colonne pour redimensionner
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="char-table char-weapons-table" style={{ ...wStyle, width: '100%' }} ref={weaponsTableRef}>
                      <thead>
                        <tr>
                          <th className="col-rarity" title="Rareté" style={{ position: 'relative' }}>
                            🎲<br /><span className="mod-label">Rar.</span>
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="rarity"
                              userMin={wMins['rarity'] !== undefined ? Number(wMins['rarity']) : undefined}
                              currentWidth={wWidths.rarity ?? 60}
                              min={30}
                              max={140}
                              onCommit={(w) => commitWWidth('rarity', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Rareté"
                            />
                          </th>
                          <th style={{ position: 'relative' }}>
                            Arme
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="name"
                              userMin={wMins['name'] !== undefined ? Number(wMins['name']) : undefined}
                              currentWidth={wWidths.name ?? 192}
                              min={30}
                              max={500}
                              onCommit={(w) => commitWWidth('name', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Arme"
                            />
                          </th>
                          <th style={{ position: 'relative' }}>
                            Type
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="type"
                              userMin={wMins['type'] !== undefined ? Number(wMins['type']) : undefined}
                              currentWidth={wWidths.type ?? 144}
                              min={30}
                              max={400}
                              onCommit={(w) => commitWWidth('type', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Type"
                            />
                          </th>
                          <th style={{ textAlign: 'center', position: 'relative' }}>
                            Dégâts
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="damage"
                              userMin={wMins['damage'] !== undefined ? Number(wMins['damage']) : undefined}
                              currentWidth={wWidths.damage ?? 96}
                              min={30}
                              max={200}
                              onCommit={(w) => commitWWidth('damage', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Dégâts"
                            />
                          </th>
                          <th style={{ textAlign: 'center', position: 'relative' }}>
                            Portée
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="range"
                              userMin={wMins['range'] !== undefined ? Number(wMins['range']) : undefined}
                              currentWidth={wWidths.range ?? 96}
                              min={30}
                              max={200}
                              onCommit={(w) => commitWWidth('range', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Portée"
                            />
                          </th>
                          <th style={{ textAlign: 'center', position: 'relative' }} title="Avec munitions">
                            🔫<br /><span className="mod-label">Mun.</span>
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="hasAmmo"
                              userMin={wMins['hasAmmo'] !== undefined ? Number(wMins['hasAmmo']) : undefined}
                              currentWidth={wWidths.hasAmmo ?? 96}
                              min={30}
                              max={160}
                              onCommit={(w) => commitWWidth('hasAmmo', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Avec munitions"
                            />
                          </th>
                          {anyAmmo && (
                            <>
                              <th style={{ textAlign: 'center', position: 'relative' }} title="Munitions actuelles">
                                Munitions<br /><span className="mod-label">+/-/↺</span>
                                <TableColumnResize
                                  tableRef={weaponsTableRef}
                                  columnKey="ammo"
                                  userMin={wMins['ammo'] !== undefined ? Number(wMins['ammo']) : undefined}
                              currentWidth={wWidths.ammo ?? 120}
                                  min={30}
                                  max={260}
                                  onCommit={(w) => commitWWidth('ammo', w)}
                                  onSettingsOpen={openWSettings}
                                  disabled={readOnly}
                                  label="Redimensionner la colonne Munitions"
                                />
                              </th>
                              <th style={{ textAlign: 'center', position: 'relative' }}>
                                Mun Max
                                <TableColumnResize
                                  tableRef={weaponsTableRef}
                                  columnKey="maxAmmo"
                                  userMin={wMins['maxAmmo'] !== undefined ? Number(wMins['maxAmmo']) : undefined}
                              currentWidth={wWidths.maxAmmo ?? 84}
                                  min={30}
                                  max={160}
                                  onCommit={(w) => commitWWidth('maxAmmo', w)}
                                  onSettingsOpen={openWSettings}
                                  disabled={readOnly}
                                  label="Redimensionner la colonne Mun Max"
                                />
                              </th>
                              <th style={{ textAlign: 'center', position: 'relative' }} title="Nombre de chargeurs en réserve. Le bouton Recharger consomme 1 chargeur.">
                                Chargeurs<br /><span className="mod-label">🔋</span>
                                <TableColumnResize
                                  tableRef={weaponsTableRef}
                                  columnKey="magazines"
                                  userMin={wMins['magazines'] !== undefined ? Number(wMins['magazines']) : undefined}
                              currentWidth={wWidths.magazines ?? 84}
                                  min={30}
                                  max={160}
                                  onCommit={(w) => commitWWidth('magazines', w)}
                                  onSettingsOpen={openWSettings}
                                  disabled={readOnly}
                                  label="Redimensionner la colonne Chargeurs"
                                />
                              </th>
                            </>
                          )}
                          <th style={{ position: 'relative' }}>
                            Tags
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="tags"
                              userMin={wMins['tags'] !== undefined ? Number(wMins['tags']) : undefined}
                              currentWidth={wWidths.tags ?? 180}
                              min={30}
                              max={400}
                              onCommit={(w) => commitWWidth('tags', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Tags"
                            />
                          </th>
                          <th style={{ position: 'relative' }}>
                            Effets
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="effects"
                              userMin={wMins['effects'] !== undefined ? Number(wMins['effects']) : undefined}
                              currentWidth={wWidths.effects ?? 216}
                              min={30}
                              max={500}
                              onCommit={(w) => commitWWidth('effects', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Effets"
                            />
                          </th>
                          <th style={{ textAlign: 'center', position: 'relative' }}>
                            Poids
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="weight"
                              userMin={wMins['weight'] !== undefined ? Number(wMins['weight']) : undefined}
                              currentWidth={wWidths.weight ?? 60}
                              min={30}
                              max={160}
                              onCommit={(w) => commitWWidth('weight', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Poids"
                            />
                          </th>
                          <th style={{ textAlign: 'center', position: 'relative' }}>
                            Actions
                            <TableColumnResize
                              tableRef={weaponsTableRef}
                              columnKey="actions"
                              userMin={wMins['actions'] !== undefined ? Number(wMins['actions']) : undefined}
                              currentWidth={wWidths.actions ?? 72}
                              min={30}
                              max={120}
                              onCommit={(w) => commitWWidth('actions', w)}
                              onSettingsOpen={openWSettings}
                              disabled={readOnly}
                              label="Redimensionner la colonne Actions"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {character.weapons.map((w, index) => (
                          <DraggableRow
                            key={w.id}
                            items={character.weapons}
                            rowIndex={index}
                            getId={ww => ww.id}
                            reorder={(fromId, toIndex) => setCharacter(p => {
                              const fromIdx = p.weapons.findIndex(ww2 => ww2.id === fromId);
                              return { ...p, weapons: moveRow(p.weapons, fromIdx, toIndex) };
                            })}
                          >
                            <td className="col-rarity">
                              <RarityPicker
                                value={w.rarity}
                                onChange={(r) => { const weapons = [...character.weapons]; weapons[index] = { ...weapons[index], rarity: r }; setCharacter(p => ({ ...p, weapons })); }}
                                disabled={readOnly}
                              />
                            </td>
                            <td><textarea className="char-stat-textarea" rows={2} style={{ fontWeight: 'bold' }} value={w.name} title={w.name || undefined} onChange={e => { const weapons = [...character.weapons]; weapons[index].name = e.target.value; setCharacter(p => ({ ...p, weapons })); }} /></td>
                            <td><textarea className="char-stat-textarea" rows={2} value={w.type} title={w.type || undefined} onChange={e => { const weapons = [...character.weapons]; weapons[index].type = e.target.value; setCharacter(p => ({ ...p, weapons })); }} /></td>
                            <td style={{ textAlign: 'center' }}><input className="char-stat-input" style={{ textAlign: 'center', fontWeight: 'bold' }} value={w.damage} onChange={e => { const weapons = [...character.weapons]; weapons[index].damage = e.target.value; setCharacter(p => ({ ...p, weapons })); }} /></td>
                            <td style={{ textAlign: 'center' }}><input className="char-stat-input" style={{ textAlign: 'center' }} value={w.range} onChange={e => { const weapons = [...character.weapons]; weapons[index].range = e.target.value; setCharacter(p => ({ ...p, weapons })); }} /></td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!!w.hasAmmo}
                                onChange={e => { const weapons = [...character.weapons]; const next = { ...weapons[index], hasAmmo: e.target.checked }; if (e.target.checked && (!next.ammo && !next.maxAmmo)) { next.maxAmmo = 10; next.ammo = 10; } setCharacter(p => ({ ...p, weapons: weapons.map((ww, i) => i === index ? next : ww) })); }}
                                disabled={readOnly}
                                title="Cette arme utilise des munitions"
                                aria-label="Avec munition"
                              />
                            </td>
                            {anyAmmo && (
                              <>
                                <td style={{ textAlign: 'center' }}>
                                  {w.hasAmmo ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                      <button type="button" className="ghost compact-icon-button" style={{ padding: '2px' }} onClick={() => { const weapons = [...character.weapons]; const newAmmo = Math.max(0, (weapons[index].ammo || 0) - 1); weapons[index] = { ...weapons[index], ammo: newAmmo }; setCharacter(p => ({ ...p, weapons })); }} title="Retirer 1 munition" disabled={readOnly}><Minus size={12} /></button>
                                      <input
                                        type="number"
                                        className="char-stat-input"
                                        style={{ textAlign: 'center', fontWeight: 'bold', width: '50px' }}
                                        value={w.ammo ?? 0}
                                        onChange={e => { const weapons = [...character.weapons]; const v = Math.max(0, parseInt(e.target.value) || 0); weapons[index] = { ...weapons[index], ammo: v }; setCharacter(p => ({ ...p, weapons })); }}
                                        disabled={readOnly}
                                        min={0}
                                      />
                                      <button type="button" className="ghost compact-icon-button" style={{ padding: '2px' }} onClick={() => { const weapons = [...character.weapons]; const max = weapons[index].maxAmmo || 0; const newAmmo = Math.min(max, (weapons[index].ammo || 0) + 1); weapons[index] = { ...weapons[index], ammo: newAmmo }; setCharacter(p => ({ ...p, weapons })); }} title="Ajouter 1 munition (max = Mun Max)" disabled={readOnly}><Plus size={12} /></button>
                                      <button
                                        type="button"
                                        className="ghost compact-icon-button"
                                        style={{ padding: '2px' }}
                                        onClick={() => {
                                          const weapons = [...character.weapons];
                                          const current = weapons[index];
                                          const max = current.maxAmmo || 0;
                                          const mags = current.magazines || 0;
                                          if (mags <= 0) return;
                                          if ((current.ammo || 0) >= max) return;
                                          weapons[index] = { ...current, ammo: max, magazines: mags - 1 };
                                          setCharacter(p => ({ ...p, weapons }));
                                        }}
                                        disabled={readOnly || (w.magazines || 0) <= 0 || (w.ammo || 0) >= (w.maxAmmo || 0)}
                                        title={
                                          (w.magazines || 0) <= 0
                                            ? 'Pas de chargeur disponible'
                                            : (w.ammo || 0) >= (w.maxAmmo || 0)
                                              ? 'Déjà au maximum de munitions'
                                              : `Recharger au max (consomme 1 chargeur — il en reste ${(w.magazines || 0) - 1})`
                                        }
                                      ><RotateCcw size={12} /></button>
                                    </div>
                                  ) : (
                                    <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>—</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {w.hasAmmo ? (
                                    <input
                                      type="number"
                                      className="char-stat-input"
                                      style={{ textAlign: 'center', fontWeight: 'bold' }}
                                      value={w.maxAmmo ?? 0}
                                      onChange={e => { const weapons = [...character.weapons]; const v = Math.max(0, parseInt(e.target.value) || 0); weapons[index] = { ...weapons[index], maxAmmo: v, ammo: Math.min(weapons[index].ammo || 0, v) }; setCharacter(p => ({ ...p, weapons })); }}
                                      disabled={readOnly}
                                      min={0}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>—</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {w.hasAmmo ? (
                                    <input
                                      type="number"
                                      className="char-stat-input"
                                      style={{
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        color: (w.magazines || 0) <= 0 ? 'var(--md-sys-color-error)' : 'inherit',
                                        background: (w.magazines || 0) <= 0 ? 'color-mix(in srgb, var(--md-sys-color-error) 12%, transparent)' : 'transparent',
                                      }}
                                      value={w.magazines ?? 0}
                                      onChange={e => { const weapons = [...character.weapons]; const v = Math.max(0, parseInt(e.target.value) || 0); weapons[index] = { ...weapons[index], magazines: v }; setCharacter(p => ({ ...p, weapons })); }}
                                      disabled={readOnly}
                                      min={0}
                                      placeholder="0"
                                      title="Nombre de chargeurs en réserve. Saisi manuel (achats, loot...)."
                                    />
                                  ) : (
                                    <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>—</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td>
                              <input
                                className="char-stat-input"
                                style={{ fontSize: '0.8rem' }}
                                value={(w.tags || []).join(', ')}
                                placeholder="lourde, à deux mains..."
                                onChange={e => { const weapons = [...character.weapons]; const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean); weapons[index] = { ...weapons[index], tags }; setCharacter(p => ({ ...p, weapons })); }}
                                disabled={readOnly}
                                title="Tags séparés par des virgules"
                              />
                            </td>
                            <td><textarea className="char-stat-textarea" rows={2} value={w.effects} title={w.effects || undefined} onChange={e => { const weapons = [...character.weapons]; weapons[index].effects = e.target.value; setCharacter(p => ({ ...p, weapons })); }} /></td>
                            <td style={{ textAlign: 'center' }}><input type="number" step="0.1" className="char-stat-input" style={{ textAlign: 'center' }} value={w.weight || ''} onChange={e => { const weapons = [...character.weapons]; weapons[index].weight = parseFloat(e.target.value) || 0; setCharacter(p => ({ ...p, weapons })); }} placeholder="0" /></td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="row-actions-cell">
                                <RowDeleteButton
                                  onClick={() => setDeleteConfirm({ open: true, type: 'weapon', id: w.id, name: w.name || 'cette arme' })}
                                  disabled={readOnly}
                                  label="Supprimer l'arme"
                                />
                                <RowDragHandle label="Glisser pour réorganiser l'arme" />
                              </div>
                            </td>
                          </DraggableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'modificateurs' && (() => {
          const mdWidths: ColumnWidthsState = character.tableColumnWidths?.modificateurs ?? {};
              const mdMins: ColumnWidthsState = character.tableColumnMins?.modificateurs ?? {};
          const mdStyle: React.CSSProperties = {
            ['--col-rarity-width' as any]: formatWidth(mdWidths.rarity, MOD_TABLE_COLUMN_DEFS[0].default, mdMins.rarity),
            ['--col-rarity-min' as any]: formatMin(mdMins.rarity, 0),
            ['--col-description-width' as any]: formatWidth(mdWidths.description, MOD_TABLE_COLUMN_DEFS[1].default, mdMins.description),
            ['--col-description-min' as any]: formatMin(mdMins.description, 0),
            ['--col-effects-width' as any]: formatWidth(mdWidths.effects, MOD_TABLE_COLUMN_DEFS[2].default, mdMins.effects),
            ['--col-effects-min' as any]: formatMin(mdMins.effects, 0),
            ['--col-weight-width' as any]: formatWidth(mdWidths.weight, MOD_TABLE_COLUMN_DEFS[3].default, mdMins.weight),
            ['--col-weight-min' as any]: formatMin(mdMins.weight, 0),
            ['--col-mod-width' as any]: formatWidth(mdWidths.mod, MOD_TABLE_COLUMN_DEFS[4].default, mdMins.mod),
            ['--col-mod-min' as any]: formatMin(mdMins.mod, 0),
            ['--col-actions-width' as any]: formatWidth(mdWidths.actions, MOD_TABLE_COLUMN_DEFS[5].default, mdMins.actions),
            ['--col-actions-min' as any]: formatMin(mdMins.actions, 0),
          };
          const commitMdWidth = (key: string, w: number) => setCharacter(p => ({
            ...p,
            tableColumnWidths: {
              ...(p.tableColumnWidths ?? {}),
              modificateurs: { ...(p.tableColumnWidths?.modificateurs ?? {}), [key]: w },
            },
          }));
          const openMdSettings = () => {
            setSettingsTarget({
              id: 'modificateurs',
              title: 'Modificateurs',
              columns: [...MOD_TABLE_COLUMN_DEFS],
              widths: mdWidths, mins: mdMins
            });
            setSettingsDialogOpen(true);
          };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* === Totaux Modificateurs — affichés EN LIGNE au-dessus du bouton Ajouter === */}
              <CharacterTotalsPanel
                items={character.modificateurs || []}
                title="Totaux Modificateurs"
              />

              {/* === Bouton Ajouter un modificateur === */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="secondary" onClick={() => setCharacter(p => ({ ...p, modificateurs: [...(p.modificateurs || []), { id: generateUUID(), description: 'Nouveau modificateur', effects: '', weight: 0, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 }] }))}><Plus size={16} /> Ajouter un modificateur</button>
                <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                  Astuce : faites glisser le bord droit d'un en-tête de colonne pour redimensionner
                </span>
              </div>

              <div style={{ flex: '1 1 600px', minWidth: 0, overflowX: 'auto' }} className="char-equip-table-wrap">
                <table className="char-table char-equip-table" style={mdStyle} ref={modificateursTableRef}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>#</th>
                      <th scope="col" className="col-rarity" title="Rareté" style={{ position: 'relative' }}>
                        🎲<br /><span className="mod-label">Rar.</span>
                        <TableColumnResize
                          tableRef={modificateursTableRef}
                          columnKey="rarity"
                          userMin={mdMins['rarity'] !== undefined ? Number(mdMins['rarity']) : undefined}
                              currentWidth={mdWidths.rarity ?? MOD_TABLE_COLUMN_DEFS[0].default}
                          min={MOD_TABLE_COLUMN_DEFS[0].min}
                          max={MOD_TABLE_COLUMN_DEFS[0].max}
                          onCommit={(w) => commitMdWidth('rarity', w)}
                          onSettingsOpen={openMdSettings}
                          disabled={readOnly}
                          label="Redimensionner la colonne Rareté"
                        />
                      </th>
                      <th scope="col" className="col-description" style={{ position: 'relative' }}>
                        Description
                        <TableColumnResize
                          tableRef={modificateursTableRef}
                          columnKey="description"
                          userMin={mdMins['description'] !== undefined ? Number(mdMins['description']) : undefined}
                              currentWidth={mdWidths.description ?? MOD_TABLE_COLUMN_DEFS[1].default}
                          min={MOD_TABLE_COLUMN_DEFS[1].min}
                          max={MOD_TABLE_COLUMN_DEFS[1].max}
                          onCommit={(w) => commitMdWidth('description', w)}
                          onSettingsOpen={openMdSettings}
                          disabled={readOnly}
                          label="Redimensionner la colonne Description"
                        />
                      </th>
                      <th scope="col" className="col-effects" style={{ position: 'relative' }}>
                        Effets
                        <TableColumnResize
                          tableRef={modificateursTableRef}
                          columnKey="effects"
                          userMin={mdMins['effects'] !== undefined ? Number(mdMins['effects']) : undefined}
                              currentWidth={mdWidths.effects ?? MOD_TABLE_COLUMN_DEFS[2].default}
                          min={MOD_TABLE_COLUMN_DEFS[2].min}
                          max={MOD_TABLE_COLUMN_DEFS[2].max}
                          onCommit={(w) => commitMdWidth('effects', w)}
                          onSettingsOpen={openMdSettings}
                          disabled={readOnly}
                          label="Redimensionner la colonne Effets"
                        />
                      </th>
                      <th scope="col" className="col-weight" title="Poids en kg" style={{ position: 'relative' }}>
                        ⚖<br /><span className="mod-label">Poids</span>
                        <TableColumnResize
                          tableRef={modificateursTableRef}
                          columnKey="weight"
                          userMin={mdMins['weight'] !== undefined ? Number(mdMins['weight']) : undefined}
                              currentWidth={mdWidths.weight ?? MOD_TABLE_COLUMN_DEFS[3].default}
                          min={MOD_TABLE_COLUMN_DEFS[3].min}
                          max={MOD_TABLE_COLUMN_DEFS[3].max}
                          onCommit={(w) => commitMdWidth('weight', w)}
                          onSettingsOpen={openMdSettings}
                          disabled={readOnly}
                          label="Redimensionner la colonne Poids"
                        />
                      </th>
                      {[
                        { key: 'healthMod', label: 'Santé', short: 'Sant.', emoji: '♥', color: 'var(--stat-color-health)' },
                        { key: 'mentalMod', label: 'Mental', short: 'Ment.', emoji: '@', color: 'var(--stat-color-mental)' },
                        { key: 'armorMod', label: 'Armure', short: 'Armu.', emoji: '🛡', color: 'var(--stat-color-armor)' },
                        { key: 'astraMod', label: 'Astra', short: 'Astr.', emoji: '✨', color: 'var(--stat-color-astra)' },
                        { key: 'enduranceMod', label: 'Endurance', short: 'Endu.', emoji: '🔋', color: '' },
                        { key: 'strengthMod', label: 'Force', short: 'Forc.', emoji: '💪', color: '' },
                        { key: 'agilityMod', label: 'Agilité', short: 'Agil.', emoji: '🦘', color: '' },
                        { key: 'intelligenceMod', label: 'Intelligence', short: 'Inte.', emoji: '🧠', color: '' },
                        { key: 'astraMasteryMod', label: 'Maitrise', short: 'Mait.', emoji: '💫', color: '' },
                        { key: 'charismaMod', label: 'Charisme', short: 'Char.', emoji: '🔊', color: '' },
                        { key: 'wisdomMod', label: 'Sagesse', short: 'Sag.', emoji: '🌿', color: '' },
                        { key: 'luckMod', label: 'Chance', short: 'Chan.', emoji: '🍀', color: '' },
                        { key: 'perceptionMod', label: 'Perception', short: 'Perc.', emoji: '👀', color: '' }
                      ].map(m => {
                        if (m.key !== 'healthMod') {
                          return (
                            <th key={m.key} scope="col" className="col-mod" title={m.label}>
                              <span className="mod-emoji" style={{ color: m.color || 'var(--md-sys-color-on-surface-variant)' }}>{m.emoji}</span>
                              <span className="mod-label">{m.short}</span>
                            </th>
                          );
                        }
                        return (
                          <th key={m.key} scope="col" className="col-mod" title={m.label} style={{ position: 'relative' }}>
                            <span className="mod-emoji" style={{ color: m.color || 'var(--md-sys-color-on-surface-variant)' }}>{m.emoji}</span>
                            <span className="mod-label">{m.short}</span>
                            <TableColumnResize
                              tableRef={modificateursTableRef}
                              columnKey="mod"
                              userMin={mdMins['mod'] !== undefined ? Number(mdMins['mod']) : undefined}
                              currentWidth={mdWidths.mod ?? MOD_TABLE_COLUMN_DEFS[4].default}
                              min={MOD_TABLE_COLUMN_DEFS[4].min}
                              max={MOD_TABLE_COLUMN_DEFS[4].max}
                              onCommit={(w) => commitMdWidth('mod', w)}
                              onSettingsOpen={openMdSettings}
                              disabled={readOnly}
                              label="Redimensionner les colonnes Modificateurs"
                            />
                          </th>
                        );
                      })}
                      <th scope="col" className="col-actions" style={{ position: 'relative' }}>
                        Actions
                        <TableColumnResize
                          tableRef={modificateursTableRef}
                          columnKey="actions"
                          userMin={mdMins['actions'] !== undefined ? Number(mdMins['actions']) : undefined}
                              currentWidth={mdWidths.actions ?? MOD_TABLE_COLUMN_DEFS[5].default}
                          min={MOD_TABLE_COLUMN_DEFS[5].min}
                          max={MOD_TABLE_COLUMN_DEFS[5].max}
                          onCommit={(w) => commitMdWidth('actions', w)}
                          onSettingsOpen={openMdSettings}
                          disabled={readOnly}
                          label="Redimensionner la colonne Actions"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(character.modificateurs || []).map((md, index) => (
                      <DraggableRow
                        key={md.id}
                        items={character.modificateurs || []}
                        rowIndex={index}
                        getId={m => m.id}
                        reorder={(fromId, toIndex) => setCharacter(p => {
                          const list = p.modificateurs || [];
                          const fromIdx = list.findIndex(m2 => m2.id === fromId);
                          return { ...p, modificateurs: moveRow(list, fromIdx, toIndex) };
                        })}
                      >
                        <td style={{ width: '40px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{index + 1}</td>
                        <td className="col-rarity">
                          <RarityPicker
                            value={md.rarity}
                            onChange={(r) => { const list = [...(character.modificateurs || [])]; list[index] = { ...list[index], rarity: r }; setCharacter(p => ({ ...p, modificateurs: list })); }}
                            disabled={readOnly}
                          />
                        </td>
                        <td className="col-description">
                          <textarea
                            className="char-stat-textarea"
                            rows={2}
                            value={md.description}
                            title={md.description || undefined}
                            onChange={e => { const list = [...(character.modificateurs || [])]; list[index].description = e.target.value; setCharacter(p => ({ ...p, modificateurs: list })); }}
                            style={{ fontWeight: 'bold' }}
                          />
                        </td>
                        <td className="col-effects">
                          <textarea
                            className="char-stat-textarea"
                            rows={2}
                            value={md.effects}
                            title={md.effects || undefined}
                            onChange={e => { const list = [...(character.modificateurs || [])]; list[index].effects = e.target.value; setCharacter(p => ({ ...p, modificateurs: list })); }}
                          />
                        </td>
                        <td className="col-weight">
                          <input type="number" step="0.1" className="char-stat-input" value={md.weight || ''} onChange={e => { const list = [...(character.modificateurs || [])]; list[index].weight = parseFloat(e.target.value) || 0; setCharacter(p => ({ ...p, modificateurs: list })); }} placeholder="0" />
                        </td>
                        {[
                          'healthMod', 'mentalMod', 'armorMod', 'astraMod',
                          'enduranceMod', 'strengthMod', 'agilityMod', 'intelligenceMod',
                          'astraMasteryMod', 'charismaMod', 'wisdomMod', 'luckMod', 'perceptionMod'
                        ].map(modKey => {
                          const val = (md as any)[modKey];
                          const modClass = val > 0 ? 'char-mod-positive' : val < 0 ? 'char-mod-negative' : '';
                          return (
                            <td key={modKey} className="col-mod">
                              <input
                                type="number"
                                className={`char-stat-input ${modClass}`}
                                value={val || ''}
                                onChange={e => { const list = [...(character.modificateurs || [])]; (list[index] as any)[modKey] = parseInt(e.target.value) || 0; setCharacter(p => ({ ...p, modificateurs: list })); }}
                                placeholder="·"
                              />
                            </td>
                          );
                        })}
                        <td className="col-actions">
                          <div className="row-actions-cell">
                            <RowDeleteButton
                              onClick={() => setDeleteConfirm({ open: true, type: 'modifier', id: md.id, name: md.description || 'ce modificateur' })}
                              disabled={readOnly}
                              label="Supprimer le modificateur"
                            />
                            <RowDragHandle label="Glisser pour réorganiser le modificateur" />
                          </div>
                        </td>
                      </DraggableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {activeTab === 'lore' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {/* Colonne gauche — Histoire Complète + Origine */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CollapsibleSection
                id="lore-history"
                title="Histoire Complète (Prologue, événements...)"
                collapsed={collapsedLoreSections['lore-history'] === true}
                onToggle={toggleLoreSection}
              >
                <textarea
                  rows={16}
                  value={character.lore.history}
                  onChange={e => setCharacter(p => ({ ...p, lore: { ...p.lore, history: e.target.value } }))}
                  style={{ width: '100%', resize: 'vertical', minHeight: '200px' }}
                />
              </CollapsibleSection>
              <CollapsibleSection
                id="lore-origin"
                title="Origine"
                collapsed={collapsedLoreSections['lore-origin'] === true}
                onToggle={toggleLoreSection}
              >
                <textarea
                  rows={6}
                  value={character.lore.origin}
                  onChange={e => setCharacter(p => ({ ...p, lore: { ...p.lore, origin: e.target.value } }))}
                  placeholder="Lieu de naissance, culture, famille, formation..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </CollapsibleSection>
            </div>
            {/* Colonne droite — Traits, Objectifs, Objectifs Cachés & Rôle Secret */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CollapsibleSection
                id="lore-traits"
                title="Traits (caractère, comportement)"
                collapsed={collapsedLoreSections['lore-traits'] === true}
                onToggle={toggleLoreSection}
              >
                <EditableList
                  items={character.lore.traits}
                  onChange={(traits) => setCharacter(p => ({ ...p, lore: { ...p.lore, traits } }))}
                  placeholder="Ajouter un trait..."
                  readOnly={readOnly}
                />
              </CollapsibleSection>
              <CollapsibleSection
                id="lore-objectives"
                title="Objectifs Principaux"
                collapsed={collapsedLoreSections['lore-objectives'] === true}
                onToggle={toggleLoreSection}
              >
                <ObjectiveList
                  items={character.lore.objectives}
                  onChange={(objectives) => setCharacter(p => ({ ...p, lore: { ...p.lore, objectives } }))}
                  readOnly={readOnly}
                />
              </CollapsibleSection>
              <CollapsibleSection
                id="lore-secret"
                title="Objectifs Cachés & Rôle Secret"
                collapsed={collapsedLoreSections['lore-secret'] === true}
                onToggle={toggleLoreSection}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <ObjectiveList
                    items={character.lore.secretObjectives}
                    onChange={(secretObjectives) => setCharacter(p => ({ ...p, lore: { ...p.lore, secretObjectives } }))}
                    readOnly={readOnly}
                  />
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>Rôle Secret
                    <input
                      value={character.lore.secretRole}
                      onChange={e => setCharacter(p => ({ ...p, lore: { ...p.lore, secretRole: e.target.value } }))}
                      style={{ width: '100%', marginTop: '4px' }}
                      placeholder="Rôle secret du personnage..."
                    />
                  </label>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        )}

        {/* Onglet Configuration — visible uniquement par le MJ (readOnly = false) */}
        {activeTab === 'config' && !readOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 600 }}>
            <CollapsibleSection
              id="config-energy"
              title="Type d'énergie du personnage"
              collapsed={collapsedLoreSections['config-energy'] === true}
              onToggle={toggleLoreSection}
            >
              <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', margin: '0 0 16px 0' }}>
                Chaque joueur utilise un type d'énergie différent. Par défaut il s'agit d'Astra, mais vous pouvez saisir n'importe quel type pour ce personnage.
              </p>
              <TextField
                fullWidth
                size="small"
                label="Type d'énergie"
                value={character.general.energyType ?? 'astra'}
                onChange={e => updateGeneral('energyType', e.target.value)}
                placeholder="astra"
                sx={muiFieldSx}
              />
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Type actuel :</span>
                <Chip
                  size="small"
                  label={character.general.energyType || 'astra'}
                  sx={{ bgcolor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontWeight: 600, textTransform: 'capitalize' }}
                />
              </Box>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Switch
                  checked={!!character.general.manualMaxManagement}
                  onChange={e => updateGeneral('manualMaxManagement', e.target.checked)}
                  color="primary"
                  id="manual-max-toggle"
                />
                <div>
                  <label htmlFor="manual-max-toggle" style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}>Gestion manuelle du MAX de l'Énergie</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
                    Désactive le calcul automatique. Vous permet de modifier librement la valeur Max de l'Énergie.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Switch
                  checked={!!character.general.useCustomColor}
                  onChange={e => updateGeneral('useCustomColor', e.target.checked)}
                  color="primary"
                  id="custom-color-toggle"
                />
                <div>
                  <label htmlFor="custom-color-toggle" style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}>Couleur de mise en avant personnalisée</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
                    Permet de choisir une couleur principale spécifique pour cette fiche de personnage.
                  </p>
                </div>
              </div>
              {character.general.useCustomColor && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '58px' }}>
                  <input
                    type="color"
                    value={character.general.customColor || '#8a2be2'}
                    onChange={e => updateGeneral('customColor', e.target.value)}
                    style={{
                      width: '40px',
                      height: '40px',
                      padding: 0,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'none'
                    }}
                    title="Choisir la couleur"
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>
                    Couleur : {character.general.customColor || '#8a2be2'}
                  </span>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

      </div>{/* fin inner wrapper readOnly */}
      </div>
      {settingsTarget && (
        <TableColumnSettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          title={settingsTarget.title}
          columns={settingsTarget.columns}
          currentWidths={settingsTarget.widths}
          currentMins={settingsTarget.mins}
          onApplyToAll={onApplyColumnSettingsToAll ? (newWidths, newMins) => {
            onApplyColumnSettingsToAll(settingsTarget.id, newWidths, newMins);
          } : undefined}
          onSave={(newWidths, newMins) => {
            setCharacter(p => ({
              ...p,
              tableColumnWidths: {
                ...(p.tableColumnWidths ?? {}),
                [settingsTarget.id]: newWidths,
              },
              tableColumnMins: {
                ...(p.tableColumnMins ?? {}),
                [settingsTarget.id]: newMins,
              }
            }));
          }}
        />
      )}

      {deleteConfirm.open && (
        <Dialog 
          open={deleteConfirm.open} 
          onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
          sx={{ zIndex: 99999 }}
        >
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.name}</strong> ?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })} sx={{ color: 'var(--md-sys-color-on-surface)' }}>Annuler</Button>
            <Button 
              color="error" 
              variant="contained"
              onClick={() => {
                setCharacter(p => {
                  let next = { ...p };
                  if (deleteConfirm.type === 'skill') {
                    next.skills = next.skills.filter(s => s.id !== deleteConfirm.id);
                  } else if (deleteConfirm.type === 'equipment') {
                    next.equipment = next.equipment.filter(e => e.id !== deleteConfirm.id);
                  } else if (deleteConfirm.type === 'inventory') {
                    next.inventory = { ...next.inventory, items: next.inventory.items.filter(i => i.id !== deleteConfirm.id) };
                  } else if (deleteConfirm.type === 'weapon') {
                    next.weapons = next.weapons.filter(w => w.id !== deleteConfirm.id);
                  } else if (deleteConfirm.type === 'modifier') {
                    next.modificateurs = (next.modificateurs || []).filter(m => m.id !== deleteConfirm.id);
                  }
                  return next;
                });
                setDeleteConfirm({ ...deleteConfirm, open: false });
              }}
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </FloatingDialog>
    </ThemeProvider>
  );

  if (isPoppedOut) {
    return (
      <PopoutPortal
        open={isPoppedOut}
        title={dialogTitle}
        onExternalClose={() => setIsPoppedOut(false)}
      >
        {dialogContent}
      </PopoutPortal>
    );
  }

  return dialogContent;
};

// === Composants utilitaires pour les listes éditables de l'onglet Lore ===

const EditableList: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ items, onChange, placeholder = 'Ajouter un élément...', readOnly = false }) => {
  const [newItem, setNewItem] = useState('');

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
  }

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--md-sys-color-primary)', flexShrink: 0,
          }} />
          <input
            value={item}
            onChange={e => updateItem(index, e.target.value)}
            readOnly={readOnly}
            style={{
              flex: '1 1 0', minWidth: 0,
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px', padding: '6px 10px',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.875rem',
            }}
          />
          {!readOnly && (
            <IconButton size="small" onClick={() => removeItem(index)} sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      ))}
      {!readOnly && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            placeholder={placeholder}
            style={{
              flex: '1 1 0', minWidth: 0,
              background: 'var(--md-sys-color-surface-container)',
              border: '1px dashed var(--md-sys-color-outline-variant)',
              borderRadius: '8px', padding: '6px 10px',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.875rem',
            }}
          />
          <IconButton size="small" onClick={addItem} sx={{ color: 'var(--md-sys-color-primary)' }}>
            <Plus size={16} />
          </IconButton>
        </Box>
      )}
    </div>
  );
};

const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  in_progress: 'En cours',
  completed: 'Complété',
  abandoned: 'Abandonné',
  failed: 'Échoué',
};

const OBJECTIVE_STATUS_COLORS: Record<ObjectiveStatus, string> = {
  in_progress: 'var(--md-sys-color-primary)',
  completed: '#2e7d32',
  abandoned: 'var(--md-sys-color-on-surface-variant)',
  failed: '#c62828',
};

const ObjectiveList: React.FC<{
  items: ObjectiveItem[];
  onChange: (items: ObjectiveItem[]) => void;
  readOnly?: boolean;
}> = ({ items, onChange, readOnly = false }) => {
  const [newText, setNewText] = useState('');
  // Le redimensionnement automatique est géré via CSS (field-sizing: content)

  function addItem() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const id = generateUUID();
    onChange([...items, { id, text: trimmed, status: 'in_progress' }]);
    setNewText('');
    // Pas besoin d'auto-size manuel, géré par CSS.
  }

  function updateItem(id: string, patch: Partial<ObjectiveItem>) {
    onChange(items.map(o => o.id === id ? { ...o, ...patch } : o));
    // Pas besoin d'auto-size manuel, géré par CSS.
  }

  function removeItem(id: string) {

    onChange(items.filter(o => o.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {items.map((obj) => (
        <Box key={obj.id} sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: 'var(--md-sys-color-surface-container)',
          border: `1px solid var(--md-sys-color-outline-variant)`,
          borderLeft: `3px solid ${OBJECTIVE_STATUS_COLORS[obj.status]}`,
          borderRadius: '8px', padding: '6px 10px',
        }}>
          <textarea
            className="char-stat-textarea"
            value={obj.text}
            onChange={e => updateItem(obj.id, { text: e.target.value })}
            readOnly={readOnly}
            rows={1}
            style={{
              flex: '1 1 0', minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              lineHeight: 1.25,
              resize: 'none',
              padding: 0,
              minHeight: 'unset',
              maxHeight: 'none',
              overflowY: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          />
          {!readOnly && (
            <select
              value={obj.status}
              onChange={e => updateItem(obj.id, { status: e.target.value as ObjectiveStatus })}
              style={{
                flexShrink: 0,
                flexGrow: 0,
                width: 'auto',
                minWidth: 0,
                background: 'var(--md-sys-color-surface)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: '6px', padding: '4px 6px',
                color: OBJECTIVE_STATUS_COLORS[obj.status],
                fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {(Object.keys(OBJECTIVE_STATUS_LABELS) as ObjectiveStatus[]).map(s => (
                <option key={s} value={s}>{OBJECTIVE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          {!readOnly && (
            <IconButton size="small" onClick={() => removeItem(obj.id)} sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      ))}
      {!readOnly && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            placeholder="Ajouter un objectif..."
            style={{
              flex: '1 1 0', minWidth: 0,
              background: 'var(--md-sys-color-surface-container)',
              border: '1px dashed var(--md-sys-color-outline-variant)',
              borderRadius: '8px', padding: '6px 10px',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.875rem',
            }}
          />
          <IconButton size="small" onClick={addItem} sx={{ color: 'var(--md-sys-color-primary)' }}>
            <Plus size={16} />
          </IconButton>
        </Box>
      )}
    </div>
  );
};
