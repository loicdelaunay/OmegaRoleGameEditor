import { useState, useRef, useEffect, useMemo } from 'react'
import { Box, Chip, Menu, MenuItem, Checkbox, Typography, Tooltip } from '@mui/material'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
// Palette sémantique centralisée (M3) — partagée avec SkillSingleSelectPicker
// et SkillTagsPicker pour garder une cohérence visuelle entre tous les pickers.
import { getPalette } from './chipColors'
// Helpers de sérialisation CSV (parse/serialize/toggle) — factorisés dans
// pickerUtils pour pouvoir être réutilisés par d'autres pickers multi-select
// (Action d'intervention aujourd'hui, peut-être d'autres colonnes demain).
import { parseIds, serializeIds, toggleId } from './pickerUtils'
import type { SkillSingleSelectOption } from './SkillSingleSelectPicker'

/**
 * Picker **multi-sélection** générique pour les colonnes de la table
 * Compétences. Modélise un choix PARMI N options, où l'utilisateur
 * peut cocher 0, 1 ou plusieurs options (vs `SkillSingleSelectPicker`
 * qui force le choix unique).
 *
 * Cas d'usage actuel : colonne "Action d'intervention" — une compétence
 * peut à la fois "nécessiter une action" ET "ne pas bloquer l'attaque".
 * C'est exactement le même pattern visuel que les Tags, mais sur des
 * options typées (libellés + couleurs sémantiques).
 *
 * **Stockage** : string CSV d'ids (`"oui_avec_action, ne_bloquera_pas_attaque"`)
 * — rétro-compatible avec les anciens JSON où le champ était du texte libre
 * (la valeur est juste considérée comme "aucun id reconnu" → placeholder).
 *
 * **Visuel** : à l'image de SkillTagsPicker pour rester cohérent :
 *  - Chips colorés (couleur sémantique) cliquables (clic = ouvre le menu)
 *  - Croix de suppression par chip
 *  - Menu avec checkbox + bordure gauche colorée pour la sélection
 *  - Tooltip sur chaque option (description longue)
 *
 * Pourquoi pas un `<Select multiple>` MUI : même raison que pour
 * SkillSingleSelectPicker — on veut un look compact (ligne dense) ET
 * un tooltip descriptif par option, ce qui demande plus de contrôle.
 */
export interface SkillMultiSelectPickerProps {
    /** Valeur courante : string CSV d'ids d'options sélectionnées. */
    value: string
    /** Callback quand la sélection change (reçoit le nouveau CSV). */
    onChange: (newValue: string) => void
    /** Liste des options proposées dans le menu. */
    options: SkillSingleSelectOption[]
    /** Tooltip global affiché au survol du champ complet. */
    fieldTooltip?: string
    /** Désactive le picker (mode read-only). */
    disabled?: boolean
    /** Titre affiché en tête du menu. */
    menuTitle?: string
    /** Placeholder affiché quand `value` est vide. */
    placeholder?: string
}

export function SkillMultiSelectPicker({
    value,
    onChange,
    options,
    fieldTooltip,
    disabled,
    menuTitle,
    placeholder = '— Aucun —',
}: SkillMultiSelectPickerProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [hoveredDesc, setHoveredDesc] = useState<string>(options[0]?.description ?? '')
    const open = Boolean(anchorEl)
    const containerRef = useRef<HTMLDivElement>(null)

    const selected = useMemo(() => parseIds(value), [value])
    // Options actuellement sélectionnées, dans l'ordre de définition
    // (ordre stable pour l'affichage des chips, comme dans SkillTagsPicker).
    const selectedOptions = useMemo(
        () => options.filter(o => selected.has(o.id)),
        [options, selected]
    )

    // Ferme le menu si clic à l'extérieur du conteneur.
    // IMPORTANT : on écoute 'click' (et non 'mousedown') pour ne PAS démonter
    // les MenuItems avant que leur onClick (qui toggle l'option) ne se déclenche.
    // L'ordre des events est : mousedown → mouseup → click. Avec 'mousedown',
    // on fermait le menu pendant que le mouseup/click arrivait sur un MenuItem
    // désormais démonté → le toggle ne s'exécutait jamais.
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

    function toggle(id: string) {
        const next = toggleId(selected, id)
        onChange(serializeIds(next, options))
    }

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        if (disabled) return
        e.stopPropagation()
        setAnchorEl(e.currentTarget)
    }

    /**
     * Conteneur des chips sélectionnés. Affiche :
     *  - soit un placeholder italique si rien n'est sélectionné
     *  - soit un Chip M3 par option sélectionnée, avec sa couleur
     *    sémantique (pastille + fond + bordure) et une croix de suppression
     *
     * Le tout est cliquable pour ouvrir le menu.
     */
    const chipsContent = (
        <Box
            ref={containerRef}
            onClick={handleOpen}
            data-no-drag
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                alignItems: 'center',
                minHeight: 32,
                padding: '4px 6px',
                borderRadius: '6px',
                cursor: disabled ? 'default' : 'pointer',
                border: '1px solid transparent',
                transition: 'all 0.15s ease',
                '&:hover': disabled ? {} : {
                    borderColor: 'var(--md-sys-color-outline-variant)',
                    background: 'color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent)',
                },
                ...(open && {
                    borderColor: 'var(--md-sys-color-primary)',
                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)',
                }),
            }}
        >
            {selectedOptions.length === 0 ? (
                <Typography
                    variant="caption"
                    sx={{ color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6, fontStyle: 'italic' }}
                >
                    {placeholder}
                </Typography>
            ) : (
                selectedOptions.map(opt => {
                    const palette = getPalette(opt.color)
                    return (
                        <Tooltip
                            key={opt.id}
                            title={opt.description}
                            placement="top"
                            arrow
                            enterDelay={200}
                        >
                            <Chip
                                label={opt.label}
                                size="small"
                                onDelete={disabled ? undefined : (e) => {
                                    e.stopPropagation()
                                    toggle(opt.id)
                                }}
                                // La pastille à gauche du label est l'affordance principale :
                                // elle donne la couleur sémantique de l'option (8px).
                                // Le chip entier prend la couleur de fond correspondante
                                // pour une lecture immédiate.
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: palette.bg,
                                    color: palette.fg,
                                    border: `1px solid ${palette.border}`,
                                    '&::before': {
                                        content: '""',
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: palette.dot,
                                        marginRight: '5px',
                                        verticalAlign: 'middle',
                                    },
                                    '& .MuiChip-deleteIcon': {
                                        fontSize: 14,
                                        color: palette.fg,
                                        opacity: 0.7,
                                        '&:hover': { opacity: 1 },
                                    },
                                }}
                            />
                        </Tooltip>
                    )
                })
            )}
            <ChevronDownIcon
                sx={{ fontSize: 16, ml: 'auto', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6 }}
            />
        </Box>
    )

    return (
        <>
            {fieldTooltip ? (
                <Tooltip title={fieldTooltip} placement="top" arrow disableInteractive>
                    {chipsContent}
                </Tooltip>
            ) : (
                chipsContent
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
                            minWidth: 280,
                            maxWidth: 360,
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
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'var(--md-sys-color-on-surface-variant)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                fontWeight: 600,
                            }}
                        >
                            {menuTitle}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ py: 0.5 }}>
                    {options.map(opt => {
                        const isSelected = selected.has(opt.id)
                        const isHovered = hoveredDesc === opt.description
                        // Palette sémantique propre à cette option.
                        const palette = getPalette(opt.color)
                        return (
                            <MenuItem
                                key={opt.id}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggle(opt.id)
                                }}
                                onMouseEnter={() => setHoveredDesc(opt.description)}
                                selected={isHovered}
                                sx={{
                                    gap: 1,
                                    py: 0.75,
                                    px: 1.25,
                                    mx: 0.5,
                                    borderRadius: '4px',
                                    my: 0.1,
                                    // Bordure gauche colorée quand l'item est sélectionné
                                    // (3px) — feedback visuel fort en plus de la checkbox.
                                    borderLeft: isSelected
                                        ? `3px solid ${palette.dot}`
                                        : '3px solid transparent',
                                    // Pastille ronde 10px à gauche (juste avant la checkbox).
                                    // On l'injecte en `::before` pour rester cohérent avec
                                    // SkillTagsPicker (alignement flexbox).
                                    '&::before': {
                                        content: '""',
                                        display: 'inline-block',
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: palette.dot,
                                        flexShrink: 0,
                                    },
                                    '&:hover': {
                                        background: palette.hover,
                                    },
                                    background: isSelected
                                        ? palette.bg
                                        : (isHovered ? palette.hover : 'transparent'),
                                }}
                            >
                                {/* Le Checkbox n'a pas de onClick propre : le onClick
                                    de la MenuItem parente (ci-dessus) fait déjà le
                                    toggle. Sans ça, le <input> natif de MUI
                                    intercepte les events et la MenuItem ne les
                                    reçoit jamais (la case se coche visuellement
                                    mais l'état React ne change pas). */}
                                <Checkbox
                                    checked={isSelected}
                                    size="small"
                                    sx={{
                                        p: 0.25,
                                        color: palette.dot,
                                        '&.Mui-checked': { color: palette.dot },
                                    }}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1, minWidth: 0 }}>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: '0.85rem',
                                            fontWeight: isSelected ? 700 : 600,
                                            color: isSelected ? palette.fg : 'var(--md-sys-color-on-surface)',
                                        }}
                                    >
                                        {opt.label}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: '0.7rem',
                                            color: 'var(--md-sys-color-on-surface-variant)',
                                            opacity: 0.85,
                                            lineHeight: 1.3,
                                        }}
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
