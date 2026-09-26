// src/lib/projectConfig.ts
// Configuration persistée dans `config.json` à la racine du workfolder.
// Permet de stocker des constantes globales (ex. coefficients de calcul)
// sans modifier le format des fichiers terrain/character.
//
// Fail-soft : aucune erreur n'est propagée à l'UI. Si le fichier est absent
// ou corrompu, les valeurs par défaut sont conservées.

import {
  DEFAULT_STAT_SUCCESS_DIVISOR,
  DEFAULT_SUCCESS_MODIFIER_MIN,
  DEFAULT_SUCCESS_MODIFIER_MAX,
  DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT,
  DEFAULT_VITALS_WEIGHT_HEALTH,
  DEFAULT_VITALS_WEIGHT_MENTAL,
  DEFAULT_MONEY_SUFFIX,
} from './constants'

type WritableFileHandle = FileSystemFileHandle & {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

export const PROJECT_CONFIG_FILE = 'config.json';

/** Type de base d'une entrée de configuration (clé/valeur typée). */
export type ProjectConfigValueType = 'number' | 'text'

export interface ProjectConfigEntry {
  /** Identifiant unique (slug) de la constante. */
  id: string
  /** Libellé affiché dans l'UI. */
  label: string
  /** Description détaillée (tooltip / helper). */
  description?: string
  /** Type de la valeur pour validation UI. */
  type: ProjectConfigValueType
  /** Valeur courante. */
  value: string
  /** Valeur par défaut — utile pour le bouton "réinitialiser". */
  defaultValue: string
  /** Unité (%, x, ms, ...) affichée à côté de l'input. */
  unit?: string
  /** Pas d'incrément pour les inputs numériques. */
  step?: number
  /** Min/Max pour validation (number). */
  min?: number
  max?: number
}

export interface ProjectConfig {
  version: 1
  entries: ProjectConfigEntry[]
  updatedAt: number
}

/**
 * Config par défaut. Toutes les constantes globales du projet sont définies
 * ici — la lecture depuis un `config.json` existant merge automatiquement
 * les nouvelles entrées (cf. `readProjectConfig`), garantissant une migration
 * ascendante sans casser les anciens workfolders.
 */
export function buildDefaultProjectConfig(): ProjectConfig {
  return {
    version: 1,
    entries: [
      {
        id: 'statSuccessDivisor',
        label: 'Impact des caractéristiques',
        description:
          "Diviseur utilisé pour calculer la valeur de Réussite d'une caractéristique. Plus la valeur est élevée, plus l'impact des caractéristiques est faible (les valeurs de Réussite sont plus proches de 90%). Formule : MAX(5, MIN(95, 90 - INT((valeur_actuelle * 5) / diviseur) + modificateur)).",
        type: 'number',
        value: String(DEFAULT_STAT_SUCCESS_DIVISOR),
        defaultValue: String(DEFAULT_STAT_SUCCESS_DIVISOR),
        unit: 'x',
        step: 0.1,
        min: 0.1,
        max: 50,
      },
      {
        id: 'successModifierMin',
        label: 'Modificateur de réussite — Plancher (pleine forme)',
        description:
          "Valeur du modificateur de réussite lorsque le personnage est à 100% Santé ET 100% Mental. En général négatif : cela baisse le seuil de Réussite et représente un AVANTAGE (sur un D100, le joueur doit faire plus petit, c'est plus facile).",
        type: 'number',
        value: String(DEFAULT_SUCCESS_MODIFIER_MIN),
        defaultValue: String(DEFAULT_SUCCESS_MODIFIER_MIN),
        step: 1,
        min: -50,
        max: 0,
      },
      {
        id: 'successModifierMax',
        label: 'Modificateur de réussite — Plafond (à terre)',
        description:
          "Valeur maximale (malus) du modificateur de réussite. Atteint quand l'état global du personnage passe sous le palier critique. Augmenter cette valeur durcit les jets en cas de personnage en mauvaise forme.",
        type: 'number',
        value: String(DEFAULT_SUCCESS_MODIFIER_MAX),
        defaultValue: String(DEFAULT_SUCCESS_MODIFIER_MAX),
        step: 1,
        min: 0,
        max: 50,
      },
      {
        id: 'vitalsCriticalThresholdPercent',
        label: 'Palier critique Santé/Mental',
        description:
          "Seuil (en pourcentage) sous lequel l'état global (Santé + Mental) déclenche le palier critique : le modificateur de réussite atteint progressivement la valeur plafond. 0 = pas de palier (toujours interpolation linéaire jusqu'à 0%).",
        type: 'number',
        value: String(DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT),
        defaultValue: String(DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT),
        unit: '%',
        step: 1,
        min: 0,
        max: 100,
      },
      {
        id: 'vitalsWeightHealth',
        label: 'Pondération Santé',
        description:
          "Poids relatif de la Santé dans le calcul du modificateur. Pondération totale = Santé + Mental. Défaut 1/1 = 50/50. Pour ne considérer que la Santé, mettre Mental à 0.",
        type: 'number',
        value: String(DEFAULT_VITALS_WEIGHT_HEALTH),
        defaultValue: String(DEFAULT_VITALS_WEIGHT_HEALTH),
        step: 0.1,
        min: 0,
        max: 10,
      },
      {
        id: 'vitalsWeightMental',
        label: 'Pondération Mental',
        description:
          "Poids relatif du Mental dans le calcul du modificateur. Pondération totale = Santé + Mental. Défaut 1/1 = 50/50. Pour ne considérer que le Mental, mettre Santé à 0.",
        type: 'number',
        value: String(DEFAULT_VITALS_WEIGHT_MENTAL),
        defaultValue: String(DEFAULT_VITALS_WEIGHT_MENTAL),
        step: 0.1,
        min: 0,
        max: 10,
      },
      {
        id: 'moneySuffix',
        label: 'Suffixe monétaire',
        description:
          "Suffixe affiché à côté de la valeur d'argent dans la card 'Argent' de la fiche personnage. Permet d'adapter l'appellation à l'univers du projet (PO pour Pièces d'Or, CR pour Crédits, € pour Euros, Caps pour Fallout, etc.). Limité à 8 caractères — gardez un suffixe court et lisible.",
        type: 'text',
        value: DEFAULT_MONEY_SUFFIX,
        defaultValue: DEFAULT_MONEY_SUFFIX,
      },
    ],
    updatedAt: Date.now(),
  }
}

/** Lit le config.json du workfolder ou retourne la config par défaut. */
export async function readProjectConfig(handle: FileSystemDirectoryHandle): Promise<ProjectConfig> {
  try {
    const fileHandle = await handle.getFileHandle(PROJECT_CONFIG_FILE);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (parsed && parsed.version === 1 && Array.isArray(parsed.entries)) {
      // Reconstitue les valeurs par défaut si une nouvelle entrée a été
      // ajoutée depuis la dernière sauvegarde (compat ascendante).
      const defaultConfig = buildDefaultProjectConfig();
      const knownIds = new Set(parsed.entries.map((e: ProjectConfigEntry) => e.id));
      const mergedEntries = [
        ...parsed.entries,
        ...defaultConfig.entries.filter((entry) => !knownIds.has(entry.id)),
      ];
      return {
        version: 1,
        entries: mergedEntries,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };
    }
    return buildDefaultProjectConfig();
  } catch {
    return buildDefaultProjectConfig();
  }
}

/** Écrit le config.json dans le workfolder. Crée le fichier s'il n'existe pas. */
export async function writeProjectConfig(
  handle: FileSystemDirectoryHandle,
  config: ProjectConfig,
): Promise<void> {
  const fileHandle = (await handle.getFileHandle(PROJECT_CONFIG_FILE, {
    create: true,
  })) as WritableFileHandle;
  const writable = await fileHandle.createWritable();
  const payload: ProjectConfig = { ...config, updatedAt: Date.now() };
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

/**
 * Calcule la valeur de Réussite d'une caractéristique.
 * Formule Excel-like :
 *   =MAX(5, MIN(95, 90 - INT((valeur_actuelle * 5) / diviseur) + modificateur))
 *
 * @param currentValue Valeur actuelle de la caractéristique (1-20)
 * @param divisor Diviseur d'impact (config.statSuccessDivisor)
 * @param modifier Modificateur de réussite (signé, en %)
 * @returns Valeur bornée entre 5 et 95
 */
export function computeStatSuccessThreshold(
  currentValue: number,
  divisor: number,
  modifier: number,
): number {
  if (!Number.isFinite(divisor) || divisor <= 0) {
    divisor = DEFAULT_STAT_SUCCESS_DIVISOR
  }
  const safeValue = Number.isFinite(currentValue) ? currentValue : 0
  const safeModifier = Number.isFinite(modifier) ? modifier : 0
  const raw = 90 - Math.floor((safeValue * 5) / divisor) + safeModifier
  return Math.max(5, Math.min(95, Math.round(raw)))
}

/**
 * Lit une entrée de config par son id dans une ProjectConfig.
 * Retourne la valeur par défaut si non trouvée.
 */
export function getProjectConfigValue(config: ProjectConfig | null, entryId: string, fallback?: string): string {
  if (!config) return fallback ?? ''
  const entry = config.entries.find((e) => e.id === entryId)
  return entry?.value ?? fallback ?? ''
}

/** Récupère un divisor numérique depuis la config. */
export function getProjectConfigNumber(config: ProjectConfig | null, entryId: string, fallback: number): number {
  const raw = getProjectConfigValue(config, entryId, String(fallback))
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}
