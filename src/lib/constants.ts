import type { GeneratedAsset, RoomAudioState } from '../types/terrain'

export const DEFAULT_AUDIO_STATE: RoomAudioState = {
  isPlaying: false,
  isLooping: false,
  currentTime: 0,
  updatedAt: 0,
}

export const LIBRARY_PREVIEW_SIZE_STORAGE_KEY = 'omega-jdr:library-preview-size'

export const PING_DURATION_MS = 1000

export const DEFAULT_DICE_ROLL_ANIMATION_DURATION_MS = 2000

export const DEFAULT_DICE_RESULT_DISPLAY_DURATION_MS = 3000

export const DEFAULT_TURN_TRACKER_CUSTOM_COLOR = '#b3261e'

export const STATUS_SNACKBAR_DURATION_MS = 4200

export const MAX_STATUS_NOTIFICATIONS = 4

export const MAX_DICE_HISTORY = 50

export const MAX_ACTIVE_DICE_ROLLS = 4

export const MAX_SHARED_TIMERS = 3

export const DEFAULT_HIERARCHY_PANEL_WIDTH = 270

// --- Modificateur de réussite auto (Santé / Mental) ----------------------------
// Plage par défaut du mod. À 100% PV/Sanité → avantage (mod = MIN). À 0% → malus (mod = MAX).
export const DEFAULT_SUCCESS_MODIFIER_MIN = -10
export const DEFAULT_SUCCESS_MODIFIER_MAX = 25
// Seuil de palier critique (en %). Si l'état global (moyenne) passe sous ce seuil,
// le mod est forcé au max (malus) — le personnage est considéré comme "à terre".
export const DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT = 10
// Pondération par défaut des deux jauges (santé 1, mental 1) → ratio 50/50.
export const DEFAULT_VITALS_WEIGHT_HEALTH = 1
export const DEFAULT_VITALS_WEIGHT_MENTAL = 1

// --- Inventaire / Monnaie ----------------------------------------------------
/**
 * Suffixe monétaire affiché à côté de la valeur d'argent dans la card
 * "Argent" de la fiche personnage. Configurable par projet dans
 * `config.json` → entrée `moneySuffix` (cf. `buildDefaultProjectConfig`).
 * "PO" = Pièces d'Or, le défaut générique fantasy. Les MJ peuvent
 * adapter à leur univers ("CR" pour Crédits, "€" pour Euro,
 * "Caps" pour Fallout, etc.).
 */
export const DEFAULT_MONEY_SUFFIX = 'PO'

// --- Astra : calcul du Max ----------------------------------------------------
// Formule : `Astra Max = base + Intelligence (actuelle) + Σ(astraMod)`.
// `base` représente le socle narratif (race / archétype) et vaut 15 par défaut.
// Cette formule est alignée sur celle de Santé/Mental (caractéristique * 2 + ...)
// mais remplace le multiplicateur fixe par un ajout d'Intelligence (qui pilote
// la "puissance mentale" du personnage, ce qui colle à l'univers Astra).
export const DEFAULT_ASTRA_MAX_BASE = 15
// --- Armure : Max fixe --------------------------------------------------------
// Le Max d'armure est une constante du système (20 points par défaut), pas
// dérivé d'une caractéristique. L'utilisateur ne peut pas le saisir à la main
// (cf. carte Armure readOnly dans CharacterSheetDialog).
export const DEFAULT_ARMOR_MAX = 20

// --- Poids (capacité de port) -------------------------------------------------
// Pas de constante ici : la capacité max est dérivée de la Force actuelle
// (`forceActuelle * 10 / 2`, cf. `computeCarryCapacityMax` dans
// `src/lib/carryWeight.ts`). Le `weight` actuel (inventaire porté) est
// Σ(weight) des équipements + Σ(weight) des modificateurs + Σ(weightPerItem × quantity) de l'inventaire.
export const MIN_HIERARCHY_PANEL_WIDTH = 220

export const MAX_HIERARCHY_PANEL_WIDTH = 460

export const DEFAULT_INSPECTOR_PANEL_WIDTH = 300

export const MIN_INSPECTOR_PANEL_WIDTH = 260

export const MAX_INSPECTOR_PANEL_WIDTH = 520

export const DEFAULT_PLAYER_COLOR = '#147a78'

export const DEFAULT_LOCKED_TOKEN_ZOOM = 1

export const DEFAULT_LOCKED_VIEW_SIZE = 1000

export const DEFAULT_FLASHLIGHT_DISTANCE = 420

export const FLASHLIGHT_CONE_ANGLE_DEGREES = 54

export const DEFAULT_FLASHLIGHT_OPACITY = 1

/**
 * Diviseur par défaut pour le calcul de la valeur de Réussite d'une
 * caractéristique (config.json → statSuccessDivisor).
 * Formule : MAX(5, MIN(95, 90 - INT((valeur_actuelle * 5) / diviseur) + modificateur))
 */
export const DEFAULT_STAT_SUCCESS_DIVISOR = 1.4

export const DEFAULT_LIBRARY_ASSET_NAME = 'Carre rond'

export const DEFAULT_LIBRARY_ASSET_PRESET: GeneratedAsset['preset'] = 'rounded-square'

export const GENERATED_ASSET_PRESETS: Array<{ preset: GeneratedAsset['preset']; label: string }> = [
  { preset: 'square', label: 'Carre' },
  { preset: 'rounded-square', label: 'Carre rond' },
  { preset: 'circle', label: 'Rond' },
  { preset: 'triangle', label: 'Triangle' },
  { preset: 'diamond', label: 'Losange' },
  { preset: 'hexagon', label: 'Hexagone' },
  { preset: 'star', label: 'Etoile' },
  { preset: 'arrow-right', label: 'Fleche' },
]
