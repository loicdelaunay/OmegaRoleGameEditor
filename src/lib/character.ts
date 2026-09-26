import { generateUUID } from './uuid';
export type GMValidationStatus = 'rejected' | 'in_progress' | 'balancing' | 'valid';

/**
 * Niveaux de rareté utilisés par les équipements, modificateurs, armes
 * et objets d'inventaire. La valeur de la chaîne correspond à l'ID
 * utilisé dans la migration (rétro-compat) et est aussi utilisée comme
 * clé pour récupérer la pastille de couleur dans `RARITY_META`.
 *
 * - common    ⚪ Commun
 * - rare      🟢 Rare
 * - very_rare 🔵 Très rare
 * - epic      🟣 Épique
 * - legendary 🟠 Légendaire
 * - origin    🔴 Origin
 * - unique    🟤 Unique
 */
export type Rarity =
  | 'common'
  | 'rare'
  | 'very_rare'
  | 'epic'
  | 'legendary'
  | 'origin'
  | 'unique';

/**
 * Métadonnées par rareté : libellé français, emoji, couleur de la pastille.
 * Partagé entre l'éditeur (dropdown / sélecteur) et l'affichage (pastille).
 */
export const RARITY_META: Record<Rarity, { label: string; emoji: string; color: string; short: string }> = {
  common: { label: 'Commun', short: 'Com.', emoji: '⚪', color: '#bdbdbd' },
  rare: { label: 'Rare', short: 'Rare', emoji: '🟢', color: '#66bb6a' },
  very_rare: { label: 'Très rare', short: 'T.R.', emoji: '🔵', color: '#42a5f5' },
  epic: { label: 'Épique', short: 'Ép.', emoji: '🟣', color: '#ab47bc' },
  legendary: { label: 'Légendaire', short: 'Lég.', emoji: '🟠', color: '#ff7043' },
  origin: { label: 'Origin', short: 'Ori.', emoji: '🔴', color: '#ef5350' },
  unique: { label: 'Unique', short: 'Uniq.', emoji: '🟤', color: '#8d6e63' },
};

/** Liste ordonnée pour les dropdowns. */
export const RARITY_OPTIONS: Array<{ value: Rarity; label: string }> = (
  Object.keys(RARITY_META) as Rarity[]
).map((k) => ({ value: k, label: `${RARITY_META[k].emoji} ${RARITY_META[k].label}` }));

/** Type guard — vérifie qu'une string est une Rarity valide. */
export function isRarity(value: string): value is Rarity {
  return value in RARITY_META;
}

export interface CharacterDocument {
  id: string;
  version: string;
  type: 'character';

  general: {
    firstName: string;
    lastName: string;
    alias: string;
    specialty: string;
    /** @deprecated Utiliser gmStatus pour le statut détaillé. Conservé pour la rétrocompatibilité. */
    validatedByGM: boolean;
    /** Statut de validation par le MJ : rejected / in_progress / balancing / valid. */
    gmStatus?: GMValidationStatus;
    /** Si activé, la couleur de mise en avant est personnalisée. */
    useCustomColor?: boolean;
    /** Couleur primaire personnalisée (ex: #ff0000). */
    customColor?: string;
    /** Si activé, les champs MAX (Santé, Mental, Astra) sont gérés manuellement par l'utilisateur. */
  manualMaxManagement?: boolean;
  level: number;
    xp: number;
    xpNextLevel: number;
    age: number;
    gender: string;
    height: number;
    /** Poids actuel porté par le personnage (en kg). Pilonné automatiquement par `computeCurrentWeight`. */
    weight: number;
    /**
     * Caractéristique "Poids" (cf. section Identité) — distincte de
     * `weight` qui est le poids porté. Cette stat pilote certains jets
     * liés à l'encombrement / surcharge. Optionnelle pour rétro-compat
     * avec les anciens JSON (cf. `migrateCharacterDocument`).
     */
    weightStat?: number;
    cyberType: string;
    astraType: string;
    race: string;
    /** Type d'énergie utilisé par le personnage (par défaut 'astra'). Configurable par le MJ. */
    energyType?: string;
  };

  stats: {
    health: { current: number; max: number };
    mental: { current: number; max: number };
    armor: { current: number; max: number };
    astra: { current: number; max: number };
    inspiration: number;
    combat: {
      dodge: string;
      protection: string;
      weaknesses: {
        fire: number;
        water: number;
        electric: number;
        acid: number;
        psy: number;
      };
    };
    endurance: { default: number; current: number; max: number; successThreshold: number };
    strength: { default: number; current: number; max: number; successThreshold: number };
    agility: { default: number; current: number; max: number; successThreshold: number };
    intelligence: { default: number; current: number; max: number; successThreshold: number };
    astraMastery: { default: number; current: number; max: number; successThreshold: number };
    charisma: { default: number; current: number; max: number; successThreshold: number };
    wisdom: { default: number; current: number; max: number; successThreshold: number };
    luck: { default: number; current: number; max: number; successThreshold: number };
    perception: { default: number; current: number; max: number; successThreshold: number };
    modifiers: string;
  };

  skills: Array<{
    id: string;
    /** Rareté de la compétence. Optionnel pour rétro-compat (défaut: 'common'). */
    rarity?: Rarity;
    name: string;
    tags: string;
    type: string;
    level: number;
    actionRequired: string;
    effect: string;
    astraCost: number;
    /**
     * Caractéristique dont dépend la compétence (clé de `stats`).
     * Optionnel : une compétence peut ne dépendre d'aucune caractéristique.
     * Valeur vide `''` = aucune dépendance.
     */
    dependentStat?: DependentStatKey | '';
  }>;

  equipment: Array<{
    id: string;
    /** Rareté de l'équipement. Optionnel pour rétro-compat (défaut: 'common'). */
    rarity?: Rarity;
    description: string;
    effects: string;
    weight: number;
    healthMod: number;
    mentalMod: number;
    armorMod: number;
    astraMod: number;
    enduranceMod: number;
    strengthMod: number;
    agilityMod: number;
    intelligenceMod: number;
    astraMasteryMod: number;
    charismaMod: number;
    wisdomMod: number;
    luckMod: number;
    perceptionMod: number;
  }>;

  /**
   * Modificateurs additionnels (malédictions, bénédictions, afflictions, états...)
   * Mêmes champs qu'un équipement MAIS sans `id` requis à l'origine ; on
   * utilise quand même un id pour permettre la suppression propre.
   * Pour les anciens JSON (avant l'ajout de cette tab), `migrateCharacterDocument`
   * initialise un tableau vide.
   */
  modificateurs: Array<{
    id: string;
    /** Rareté du modificateur. Optionnel pour rétro-compat (défaut: 'common'). */
    rarity?: Rarity;
    description: string;
    effects: string;
    weight: number;
    healthMod: number;
    mentalMod: number;
    armorMod: number;
    astraMod: number;
    enduranceMod: number;
    strengthMod: number;
    agilityMod: number;
    intelligenceMod: number;
    astraMasteryMod: number;
    charismaMod: number;
    wisdomMod: number;
    luckMod: number;
    perceptionMod: number;
  }>;

  /**
   * Largeurs personnalisées (en px) pour les colonnes des tables
   * Équipement / Modificateurs. Si absent ou null sur un champ, on
   * retombe sur la largeur CSS par défaut définie dans `App.css`.
   * Stocké par table pour pouvoir évoluer sans casser les anciens JSON.
   */
  tableColumnWidths?: {
    equipment?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    modificateurs?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    /**
     * Largeurs des colonnes de l'onglet Inventaire. Ajouté en même temps
     * que la conversion de l'inventaire en <table> (cohérence avec les
     * onglets Équipement / Modificateurs). Rétro-compat : optionnel,
     * les anciennes fiches sans ce champ retombent sur les défauts CSS.
     */
    inventory?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    skills?: { name?: number | string; tags?: number | string; type?: number | string; level?: number | string; stat?: number | string; action?: number | string; effect?: number | string; astra?: number | string; actions?: number | string };
    weapons?: { rarity?: number | string; name?: number | string; type?: number | string; damage?: number | string; range?: number | string; hasAmmo?: number | string; ammo?: number | string; maxAmmo?: number | string; magazines?: number | string; tags?: number | string; effects?: number | string; weight?: number | string; actions?: number | string };
  };
  /**
   * Minimums personnalisés (en px) pour les colonnes des tables.
   */
  tableColumnMins?: {
    equipment?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    modificateurs?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    inventory?: { rarity?: number | string; description?: number | string; effects?: number | string; weight?: number | string; mod?: number | string; actions?: number | string };
    skills?: { name?: number | string; tags?: number | string; type?: number | string; level?: number | string; stat?: number | string; action?: number | string; effect?: number | string; astra?: number | string; actions?: number | string };
    weapons?: { rarity?: number | string; name?: number | string; type?: number | string; damage?: number | string; range?: number | string; hasAmmo?: number | string; ammo?: number | string; maxAmmo?: number | string; magazines?: number | string; tags?: number | string; effects?: number | string; weight?: number | string; actions?: number | string };
  };

  inventory: {
    money: number;
    items: Array<{
      id: string;
      /** Rareté de l'objet. Optionnel pour rétro-compat (défaut: 'common'). */
      rarity?: Rarity;
      description: string;
      quantity: number;
      effect: string;
      weightPerItem: number;
    }>;
  };

  weapons: Array<{
    id: string;
    /** Rareté de l'arme. Optionnel pour rétro-compat (défaut: 'common'). */
    rarity?: Rarity;
    name: string;
    type: string;
    damage: string;
    range: string;
    /**
     * TRUE si l'arme utilise des munitions (active les colonnes Munitions,
     * Munitions Max, Chargeurs + les boutons +/-/Reset).
     */
    hasAmmo: boolean;
    /** Munitions actuelles (uniquement pertinent si hasAmmo === true). */
    ammo: number;
    /** Munitions maximum (uniquement pertinent si hasAmmo === true). */
    maxAmmo: number;
    /**
     * Nombre de chargeurs disponibles en réserve (uniquement pertinent si
     * hasAmmo === true). Chaque chargeur permet de recharger l'arme à
     * `maxAmmo`. Un appui sur le bouton "Recharger au max" consomme 1
     * chargeur (et clamp à 0 si épuisé). Défaut 0 pour rétro-compat.
     */
    magazines: number;
    /** Tags libres saisis par le MJ (ex: "lourde", "à deux mains"). */
    tags: string[];
    effects: string;
    weight: number;
  }>;

  lore: {
    history: string;
    origin: string;
    traits: string[];
    objectives: ObjectiveItem[];
    secretObjectives: ObjectiveItem[];
    secretRole: string;
  };
}

export type ObjectiveStatus = 'in_progress' | 'completed' | 'abandoned' | 'failed';

export interface ObjectiveItem {
  id: string;
  text: string;
  status: ObjectiveStatus;
}

/**
 * Clés des caractéristiques (stats principales) sur lesquelles une compétence peut dépendre.
 * Doit rester synchronisé avec la liste affichée dans le dropdown de la Fiche de Personnage.
 */
export type DependentStatKey =
  | 'endurance'
  | 'strength'
  | 'agility'
  | 'intelligence'
  | 'astraMastery'
  | 'charisma'
  | 'wisdom'
  | 'luck'
  | 'perception';

/** Libellés français affichés dans le dropdown de dépendance de caractéristique. */
export const DEPENDENT_STAT_LABELS: Record<DependentStatKey, string> = {
  endurance: 'Endurance',
  strength: 'Force',
  agility: 'Agilité',
  intelligence: 'Intelligence',
  astraMastery: 'Maîtrise Astra',
  charisma: 'Charisme',
  wisdom: 'Sagesse',
  luck: 'Chance',
  perception: 'Perception',
};

/**
 * Emojis associés à chaque caractéristique, cohérents avec la tab Général
 * (🔋 Endurance, 💪 Force, 🦘 Agilité, 🧠 Intelligence, 💫 Maîtrise Astra,
 *  🔊 Charisme, 🌿 Sagesse, 🍀 Chance, 👀 Perception).
 */
export const DEPENDENT_STAT_EMOJI: Record<DependentStatKey, string> = {
  endurance: '🔋',
  strength: '💪',
  agility: '🦘',
  intelligence: '🧠',
  astraMastery: '💫',
  charisma: '🔊',
  wisdom: '🌿',
  luck: '🍀',
  perception: '👀',
};

/** Liste ordonnée pour les dropdowns. Inclut une option "Aucune" en tête. */
export const DEPENDENT_STAT_OPTIONS: Array<{ value: DependentStatKey | ''; label: string }> = [
  { value: '', label: 'Aucune' },
  ...(Object.keys(DEPENDENT_STAT_LABELS) as DependentStatKey[]).map((k) => ({
    value: k,
    label: `${DEPENDENT_STAT_EMOJI[k]}${DEPENDENT_STAT_LABELS[k]}`,
  })),
];

/** Type guard — vérifie qu'une string est une DependentStatKey valide. */
export function isDependentStatKey(value: string): value is DependentStatKey {
  return value in DEPENDENT_STAT_LABELS;
}

export function createDefaultCharacter(): CharacterDocument {
  return {
    id: generateUUID(),
    version: '1.0',
    type: 'character',
    general: {
      firstName: '',
      lastName: '',
      alias: '',
      specialty: '',
      validatedByGM: false,
      gmStatus: 'in_progress',
      level: 1,
      xp: 0,
      xpNextLevel: 100,
      age: 20,
      gender: '',
      height: 175,
      weight: 0,
      // Caractéristique "Poids" de la section Identité (optionnelle,
      // défaut 10 si non fournie — comme les autres caractéristiques).
      weightStat: 10,
      cyberType: 'Mineur',
      astraType: 'Aucun',
      race: 'Humain',
      energyType: 'astra',
    },
    stats: {
      health: { current: 10, max: 10 },
      mental: { current: 10, max: 10 },
      armor: { current: 0, max: 20 },
      astra: { current: 0, max: 0 },
      inspiration: 0,
      combat: {
        dodge: '10',
        protection: '1d3',
        weaknesses: {
          fire: 0,
          water: 0,
          electric: 1,
          acid: 1,
          psy: 1
        }
      },
      endurance: { default: 10, current: 10, max: 20, successThreshold: 50 },
      strength: { default: 10, current: 10, max: 20, successThreshold: 50 },
      agility: { default: 10, current: 10, max: 20, successThreshold: 50 },
      intelligence: { default: 10, current: 10, max: 20, successThreshold: 50 },
      astraMastery: { default: 10, current: 10, max: 20, successThreshold: 50 },
      charisma: { default: 10, current: 10, max: 20, successThreshold: 50 },
      wisdom: { default: 10, current: 10, max: 20, successThreshold: 50 },
      luck: { default: 10, current: 10, max: 20, successThreshold: 50 },
      perception: { default: 10, current: 10, max: 20, successThreshold: 50 },
      modifiers: ''
    },
    skills: [],
    equipment: [],
    modificateurs: [],
    inventory: {
      money: 0,
      items: []
    },
    weapons: [],
    lore: {
      history: '',
      origin: '',
      traits: [],
      objectives: [],
      secretObjectives: [],
      secretRole: ''
    }
  };
}

/**
 * Migre un CharacterDocument ancien format vers le nouveau format.
 * - traits: string → string[] (split par lignes)
 * - objectives/secretObjectives: string → ObjectiveItem[] (split par lignes, status par défaut 'in_progress')
 * - origin: ajouté si absent (default '')
 * Garde les anciens JSON exploitables.
 */
export function migrateCharacterDocument(doc: any): CharacterDocument {
  const def = createDefaultCharacter();
  const lore = doc.lore ?? {};
  // Migration traits: string → string[]
  let traits: string[] = [];
  if (Array.isArray(lore.traits)) {
    traits = lore.traits;
  } else if (typeof lore.traits === 'string' && lore.traits.trim()) {
    traits = lore.traits.split('\n').map((t: string) => t.trim()).filter(Boolean);
  }
  // Migration objectives: string → ObjectiveItem[]
  function migrateObjectives(raw: any): ObjectiveItem[] {
    if (Array.isArray(raw)) {
      return raw.map((o: any) => ({
        id: typeof o.id === 'string' ? o.id : generateUUID(),
        text: typeof o.text === 'string' ? o.text : String(o ?? ''),
        status: (['in_progress', 'completed', 'abandoned', 'failed'].includes(o?.status) ? o.status : 'in_progress') as ObjectiveStatus,
      }));
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split('\n').map((t: string) => t.trim()).filter(Boolean).map((text: string) => ({
        id: generateUUID(),
        text,
        status: 'in_progress' as ObjectiveStatus,
      }));
    }
    return [];
  }
  return {
    ...def,
    ...doc,
    general: {
      ...def.general,
      ...(doc.general ?? {}),
      energyType: typeof doc.general?.energyType === 'string' ? doc.general.energyType : def.general.energyType,
      gmStatus: typeof doc.general?.gmStatus === 'string'
        ? doc.general.gmStatus
        : (doc.general?.validatedByGM ? 'valid' : def.general.gmStatus),
      // Rétro-compat : `weightStat` n'existait pas dans les anciens JSON.
      // Si absent (undefined / null), on retombe sur le défaut 10.
      weightStat: Number.isFinite(doc.general?.weightStat)
        ? doc.general.weightStat
        : def.general.weightStat,
      manualMaxManagement: !!doc.general?.manualMaxManagement,
      useCustomColor: !!doc.general?.useCustomColor,
      customColor: typeof doc.general?.customColor === 'string' ? doc.general.customColor : def.general.customColor,
    },
    stats: {
      ...def.stats,
      ...(doc.stats ?? {}),
    },
    skills: Array.isArray(doc.skills)
      ? (doc.skills as any[]).map((sk: any) => ({
        ...sk,
        rarity: isRarity(sk?.rarity) ? sk.rarity : 'common',
      }))
      : def.skills,
    equipment: Array.isArray(doc.equipment)
      ? (doc.equipment as any[]).map((eq: any) => ({
        ...eq,
        rarity: isRarity(eq?.rarity) ? eq.rarity : 'common',
      }))
      : def.equipment,
    // Modificateurs : nouveau champ. Backward-compat : si absent, on initialise un tableau vide.
    modificateurs: Array.isArray((doc as any).modificateurs)
      ? ((doc as any).modificateurs as any[]).map((md: any) => ({
        ...md,
        rarity: isRarity(md?.rarity) ? md.rarity : 'common',
      }))
      : def.modificateurs,
    // tableColumnWidths : nouveau champ optionnel. Backward-compat : si absent, on initialise {}.
    tableColumnWidths: (doc as any).tableColumnWidths ?? def.tableColumnWidths,
    tableColumnMins: (doc as any).tableColumnMins ?? (def as any).tableColumnMins,
    inventory: doc.inventory
      ? {
        ...doc.inventory,
        items: Array.isArray(doc.inventory.items)
          ? (doc.inventory.items as any[]).map((it: any) => ({
            ...it,
            rarity: isRarity(it?.rarity) ? it.rarity : 'common',
          }))
          : def.inventory.items,
      }
      : def.inventory,
    weapons: Array.isArray(doc.weapons)
      ? (doc.weapons as any[]).map((w: any) => {
        // Migration : `ammo` était un string avant — on le convertit en number.
        let ammoNum = 0;
        if (typeof w?.ammo === 'number') ammoNum = w.ammo;
        else if (typeof w?.ammo === 'string' && w.ammo.trim() !== '') {
          const parsed = parseInt(w.ammo, 10);
          ammoNum = Number.isFinite(parsed) ? parsed : 0;
        }
        return {
          rarity: isRarity(w?.rarity) ? w.rarity : 'common',
          hasAmmo: typeof w?.hasAmmo === 'boolean' ? w.hasAmmo : ammoNum > 0 || (typeof w?.ammo === 'string' && w.ammo.trim() !== ''),
          maxAmmo: typeof w?.maxAmmo === 'number' ? w.maxAmmo : ammoNum,
          // `magazines` n'existait pas dans les anciens JSON → défaut 0.
          // On ne **devine pas** une valeur (impossible sans règle métier) :
          // les fiches chargées depuis un ancien JSON démarrent donc à 0
          // chargeurs, et le MJ doit saisir la valeur réelle.
          // Cf. CharacterSheetDialog : lors de l'init d'une nouvelle arme
          // (hasAmmo coché), on initialise `magazines` à 0 aussi.
          magazines: typeof w?.magazines === 'number' && w.magazines >= 0 ? w.magazines : 0,
          tags: Array.isArray(w?.tags) ? w.tags : [],
          ammo: ammoNum,
          name: w?.name ?? '',
          type: w?.type ?? '',
          damage: w?.damage ?? '',
          range: w?.range ?? '',
          effects: w?.effects ?? '',
          weight: typeof w?.weight === 'number' ? w.weight : 0,
          id: w?.id ?? generateUUID(),
        };
      })
      : def.weapons,
    lore: {
      history: typeof lore.history === 'string' ? lore.history : '',
      origin: typeof lore.origin === 'string' ? lore.origin : '',
      traits,
      objectives: migrateObjectives(lore.objectives),
      secretObjectives: migrateObjectives(lore.secretObjectives),
      secretRole: typeof lore.secretRole === 'string' ? lore.secretRole : '',
    },
  };
}
