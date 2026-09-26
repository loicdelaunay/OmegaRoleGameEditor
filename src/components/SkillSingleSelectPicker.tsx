import { useState, useRef, useEffect } from 'react'
import { Box, Menu, MenuItem, Typography, Tooltip } from '@mui/material'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
// Palette sémantique centralisée — réutilisée par SkillTagsPicker pour
// garder une cohérence visuelle (les Tags et les Types doivent avoir
// la même logique de couleurs).
import type { ChipColor } from './chipColors'
import { getPalette } from './chipColors'

// Re-export pour rétro-compatibilité : le reste de l'app peut continuer
// à importer ChipColor depuis ce fichier.
export type { ChipColor } from './chipColors'

/**
 * Définition d'une option pour SkillSingleSelectPicker.
 * Modélise un choix unique parmi N (vs SkillTagsPicker qui est multi).
 */
export interface SkillSingleSelectOption {
    /** Identifiant unique (stocké tel quel dans le JSON). */
    id: string
    /** Libellé court affiché dans le menu ET dans le chip de la cellule. */
    label: string
    /** Description affichée dans le tooltip au survol de l'option. */
    description: string
    /**
     * Couleur sémantique du chip / item de menu. Doit refléter la
     * logique de l'option (coût, bénéfice, dangerosité…).
     * Si non fourni, fallback `neutral` (gris).
     */
    color?: ChipColor
}

/**
 * === Options de la colonne "Type" de la table Compétences ===
 * Remplace l'ancien `<textarea>` libre par une liste fermée et typée :
 *  - Active     : déclenchée par le joueur (consomme le PA si associé) → info
 *  - Passif     : tout le temps actif → success (bénéfice permanent sans coût)
 *  - Corruption : en lien avec une corruption → special (mécanique narrative unique)
 */
export const SKILL_TYPE_OPTIONS: SkillSingleSelectOption[] = [
    { id: 'active', label: 'Active', description: '1 fois par tour — consomme le point d\'action', color: 'info' },
    { id: 'active_sans_pa', label: 'Active sans point d\'action', description: '1 fois par tour — ne consomme pas le point d\'action', color: 'success' },
    { id: 'passif', label: 'Passif', description: 'Tout le temps actif', color: 'warning' },
    { id: 'corruption', label: 'Corruption', description: 'En lien avec une corruption', color: 'special' },
]

/** Tooltip global affiché au survol du champ "Type" de compétence. */
export const SKILL_TYPE_FIELD_TOOLTIP = 'Choisissez le type de compétence. Survolez chaque option pour voir sa signification.'

/**
 * === Options de la colonne "Action d'intervention" ===
 * Remplace l'ancien `<textarea>` libre par une liste fermée :
 *  - Oui sans action           : utilisable à tout moment → success (bénéfice : pas de coût)
 *  - Oui avec action           : nécessite de dépenser le PA → warning (coûte une ressource)
 *  - Non                       : ne peut pas être déclenchée → neutral (état par défaut, MJ-only)
 *  - Ne bloquera pas l'attaque : effet contextuel sans interrompre → info (informationnel)
 */
export const SKILL_ACTION_OPTIONS: SkillSingleSelectOption[] = [
    { id: 'oui_sans_action', label: 'Oui sans action', description: 'Utilisable à tout moment, ne consomme pas le point d\'action', color: 'success' },
    { id: 'oui_avec_action', label: 'Oui avec action', description: 'Nécessite de dépenser le point d\'action pour être déclenchée', color: 'warning' },
    { id: 'non', label: 'Non', description: 'Ne peut pas être déclenchée par le joueur', color: 'neutral' },
    { id: 'ne_bloquera_pas_attaque', label: 'Ne bloquera pas l\'attaque', description: 'Effet contextuel qui s\'applique en plus, sans interrompre l\'action principale', color: 'info' },
]

/** Tooltip global affiché au survol du champ "Action d'intervention" de compétence. */
export const SKILL_ACTION_FIELD_TOOLTIP = 'Précisez si la compétence nécessite une action, ne peut pas être déclenchée, ou est un effet contextuel.'

interface SkillSingleSelectPickerProps {
    /** Valeur courante (id de l'option sélectionnée, ou '' pour "aucun"). */
    value: string
    /** Callback quand l'utilisateur choisit une option. */
    onChange: (newValue: string) => void
    /** Liste des options proposées dans le menu. */
    options: SkillSingleSelectOption[]
    /** Tooltip global affiché au survol du champ complet. */
    fieldTooltip?: string
    /** Désactive le picker (mode read-only). */
    disabled?: boolean
    /** Titre affiché en tête du menu (ex: "Type de compétence"). */
    menuTitle?: string
    /** Placeholder affiché quand `value` est vide. */
    placeholder?: string
}

/**
 * Picker **mono-sélection** pour les colonnes de la table Compétences
 * (Type, Action d'intervention, etc.). Sur le même modèle visuel que
 * `SkillTagsPicker` :
 *  - Chip compact M3 qui ouvre un menu au clic
 *  - Tooltip sur chaque option pour expliquer la sémantique
 *  - Persistance en string (id de l'option, ou '' pour "aucun")
 *
 * Pourquoi pas un `<Select>` MUI : on veut un look compact (ligne
 * dense) ET un tooltip descriptif par option, ce qui demande un peu
 * plus de contrôle que ce que propose `<Select>` nativement.
 */
export function SkillSingleSelectPicker({
    value,
    onChange,
    options,
    fieldTooltip,
    disabled,
    menuTitle,
    placeholder = '— Aucun —',
}: SkillSingleSelectPickerProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [hoveredDesc, setHoveredDesc] = useState<string>(options[0]?.description ?? '')
    const open = Boolean(anchorEl)
    const containerRef = useRef<HTMLDivElement>(null)

    // Ferme le menu si clic à l'extérieur.
    // (voir SkillTagsPicker pour l'explication détaillée du choix 'click' vs 'mousedown')
    useEffect(() => {
        if (!open) return
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setAnchorEl(null)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [open])

    function pickOption(id: string) {
        onChange(id)
        setAnchorEl(null)
    }

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        if (disabled) return
        e.stopPropagation()
        setAnchorEl(e.currentTarget)
    }

    const current = options.find(o => o.id === value)
    // Récupère la palette correspondant à l'option courante. Si `value`
    // est vide (placeholder), on tombe sur neutral (gris léger).
    const currentPalette = current ? getPalette(current.color) : getPalette('neutral')

    const chipContent = (
        <Box
            ref={containerRef}
            onClick={handleOpen}
            data-no-drag
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minHeight: 32,
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: disabled ? 'default' : 'pointer',
                border: `1px solid ${currentPalette.border}`,
                background: currentPalette.bg,
                transition: 'all 0.15s ease',
                fontSize: '0.8rem',
                '&:hover': disabled ? {} : {
                    background: currentPalette.chipHover,
                    borderColor: currentPalette.dot,
                },
                ...(open && {
                    borderColor: currentPalette.dot,
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${currentPalette.dot} 25%, transparent)`,
                }),
            }}
        >
            {/* Pastille ronde colorée : affordance visuelle qui signale la
                sémantique de l'option, et qui permet de scanner la colonne
                d'un coup d'œil. Toujours 8px, centrée verticalement. */}
            {current && (
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: currentPalette.dot,
                        flexShrink: 0,
                        boxShadow: `0 0 0 2px color-mix(in srgb, ${currentPalette.dot} 20%, transparent)`,
                    }}
                />
            )}
            {current ? (
                <Typography
                    component="span"
                    sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: currentPalette.fg,
                        // Tronque le label s'il est trop long pour la cellule
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                    }}
                    title={current.description}
                >
                    {current.label}
                </Typography>
            ) : (
                <Typography variant="caption" sx={{ color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6, fontStyle: 'italic' }}>
                    {placeholder}
                </Typography>
            )}
            <ChevronDownIcon sx={{ fontSize: 16, ml: 'auto', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6 }} />
        </Box>
    )

    return (
        <>
            {fieldTooltip ? (
                <Tooltip title={fieldTooltip} placement="top" arrow disableInteractive>
                    {chipContent}
                </Tooltip>
            ) : (
                chipContent
            )}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        onMouseLeave: () => setHoveredDesc(options[0]?.description ?? ''),
                        sx: {
                            background: 'var(--md-sys-color-surface-container-high)',
                            border: '1px solid var(--md-sys-color-outline-variant)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            minWidth: 260,
                            maxWidth: 340,
                            mt: 0.5,
                            zIndex: 10500,
                            overflow: 'visible',
                        },
                    },
                }}
                sx={{ zIndex: 10500 }}
            >
                {menuTitle && (
                    <Box sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                            {menuTitle}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ py: 0.5 }}>
                    {/* Option "Aucun" (vide) pour réinitialiser. Affichée seulement
                        si `value` n'est PAS vide actuellement, pour ne pas doublonner. */}
                    {value !== '' && (
                        <MenuItem
                            onClick={() => pickOption('')}
                            sx={{
                                fontSize: '0.85rem',
                                py: 0.75,
                                px: 1.5,
                                fontStyle: 'italic',
                                color: 'var(--md-sys-color-on-surface-variant)',
                            }}
                        >
                            — Aucun —
                        </MenuItem>
                    )}
                    {options.map(opt => {
                        const isSelected = value === opt.id
                        const isHovered = hoveredDesc === opt.description
                        // Palette sémantique propre à cette option.
                        const optPalette = getPalette(opt.color)
                        return (
                            <MenuItem
                                key={opt.id}
                                onClick={() => pickOption(opt.id)}
                                onMouseEnter={() => setHoveredDesc(opt.description)}
                                sx={{
                                    fontSize: '0.85rem',
                                    py: 0.75,
                                    px: 1.5,
                                    gap: 1.25,
                                    background: isSelected
                                        ? optPalette.bg
                                        : (isHovered
                                            ? optPalette.hover
                                            : 'transparent'),
                                    borderLeft: `3px solid ${isSelected ? optPalette.dot : 'transparent'}`,
                                    '&:hover': {
                                        background: optPalette.hover,
                                    },
                                }}
                            >
                                {/* Pastille colorée à gauche du label, même affordance
                                    que dans le chip fermé : permet de scanner rapidement
                                    les options quand le menu est ouvert. */}
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: optPalette.dot,
                                        flexShrink: 0,
                                        boxShadow: `0 0 0 2px color-mix(in srgb, ${optPalette.dot} 18%, transparent)`,
                                    }}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1, minWidth: 0 }}>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: '0.85rem',
                                            fontWeight: isSelected ? 700 : 600,
                                            color: isSelected ? optPalette.fg : 'var(--md-sys-color-on-surface)',
                                        }}
                                    >
                                        {opt.label}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.85, lineHeight: 1.3 }}
                                    >
                                        {opt.description}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        )
                    })}
                </Box>
            </Menu>
        </>
    )
}
