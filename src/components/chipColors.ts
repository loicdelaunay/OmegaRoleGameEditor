/**
 * Palette sémantique d'un chip / item de picker (Tags, Type, Action...).
 * Les couleurs sont choisies pour refléter la **logique** de l'option :
 *  - success  : action positive / sans coût pour le joueur (vert)
 *  - warning  : action coûteuse / demande une ressource (orange)
 *  - danger   : action agressive / effet négatif (rouge)
 *  - info     : informationnel, action programmée / contextuelle (bleu)
 *  - neutral  : pas d'implication particulière (gris)
 *  - special  : mécanique unique / narrative (violet, pour les corruptions)
 */
export type ChipColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'special' | 'origin' | 'specialty'

/**
 * Mapping ChipColor → couleurs (indépendantes du thème M3 pour garantir la distinction).
 */
export interface ChipPalette {
    bg: string
    fg: string
    border: string
    hover: string
    chipHover: string
    dot: string
}

export const CHIP_PALETTES: Record<ChipColor, ChipPalette> = {
    success: {
        bg: 'color-mix(in srgb, #2e7d32 18%, transparent)',
        fg: 'light-dark(#1b5e20, #a5d6a7)',
        border: 'color-mix(in srgb, #2e7d32 45%, transparent)',
        hover: 'color-mix(in srgb, #2e7d32 28%, transparent)',
        chipHover: 'color-mix(in srgb, #2e7d32 12%, transparent)',
        dot: '#2e7d32',
    },
    warning: {
        bg: 'color-mix(in srgb, #ed6c02 18%, transparent)',
        fg: 'light-dark(#7a3e00, #ffcc80)',
        border: 'color-mix(in srgb, #ed6c02 45%, transparent)',
        hover: 'color-mix(in srgb, #ed6c02 28%, transparent)',
        chipHover: 'color-mix(in srgb, #ed6c02 12%, transparent)',
        dot: '#ed6c02',
    },
    danger: {
        bg: 'color-mix(in srgb, #d32f2f 18%, transparent)',
        fg: 'light-dark(#7f0000, #ef9a9a)',
        border: 'color-mix(in srgb, #d32f2f 45%, transparent)',
        hover: 'color-mix(in srgb, #d32f2f 28%, transparent)',
        chipHover: 'color-mix(in srgb, #d32f2f 12%, transparent)',
        dot: '#d32f2f',
    },
    info: {
        bg: 'color-mix(in srgb, #0288d1 18%, transparent)',
        fg: 'light-dark(#01579b, #81d4fa)',
        border: 'color-mix(in srgb, #0288d1 45%, transparent)',
        hover: 'color-mix(in srgb, #0288d1 28%, transparent)',
        chipHover: 'color-mix(in srgb, #0288d1 12%, transparent)',
        dot: '#0288d1',
    },
    neutral: {
        bg: 'color-mix(in srgb, #616161 18%, transparent)',
        fg: 'light-dark(#2c2c2c, #eeeeee)',
        border: 'color-mix(in srgb, #616161 45%, transparent)',
        hover: 'color-mix(in srgb, #616161 28%, transparent)',
        chipHover: 'color-mix(in srgb, #616161 12%, transparent)',
        dot: '#616161',
    },
    special: {
        bg: 'color-mix(in srgb, #7b1fa2 18%, transparent)',
        fg: 'light-dark(#4a0072, #e1bee7)',
        border: 'color-mix(in srgb, #7b1fa2 45%, transparent)',
        hover: 'color-mix(in srgb, #7b1fa2 28%, transparent)',
        chipHover: 'color-mix(in srgb, #7b1fa2 12%, transparent)',
        dot: '#7b1fa2',
    },
    origin: {
        bg: 'color-mix(in srgb, #1976d2 18%, transparent)',
        fg: 'light-dark(#0d47a1, #90caf9)',
        border: 'color-mix(in srgb, #1976d2 45%, transparent)',
        hover: 'color-mix(in srgb, #1976d2 28%, transparent)',
        chipHover: 'color-mix(in srgb, #1976d2 12%, transparent)',
        dot: '#1976d2',
    },
    specialty: {
        bg: 'color-mix(in srgb, #00796b 18%, transparent)',
        fg: 'light-dark(#004d40, #80cbc4)',
        border: 'color-mix(in srgb, #00796b 45%, transparent)',
        hover: 'color-mix(in srgb, #00796b 28%, transparent)',
        chipHover: 'color-mix(in srgb, #00796b 12%, transparent)',
        dot: '#00796b',
    },
}

/**
 * Helper pour récupérer la palette d'une couleur.
 * Fallback `neutral` (gris) si la couleur est undefined ou invalide.
 */
export function getPalette(color?: ChipColor): ChipPalette {
    if (color && color in CHIP_PALETTES) return CHIP_PALETTES[color]
    return CHIP_PALETTES.neutral
}
