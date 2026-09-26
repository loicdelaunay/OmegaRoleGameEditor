import { useState, useRef, useEffect } from 'react'
import { Box, Chip, Menu, MenuItem, Checkbox, ListItemText, Typography, Tooltip } from '@mui/material'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
// Palette sémantique centralisée (M3) — partagée avec SkillSingleSelectPicker.
import type { ChipColor } from './chipColors'
import { getPalette } from './chipColors'


export interface SkillTagDefinition {
  /** Identifiant unique du tag (stocké tel quel dans la string). */
  id: string
  /** Libellé affiché dans le picker. */
  label: string
  /** Description affichée dans le tooltip au survol. */
  description: string
  /**
   * Couleur sémantique du chip / item de menu. Doit refléter la logique
   * du tag (l'origine/spécialité sont neutres, le CaC est offensif,
   * un malus est négatif, l'inconnu est "spécial", une mécanique
   * automatique est "positive"). Optionnel → fallback 'neutral'.
   */
  color?: ChipColor
}

/**
 * Définitions des tags disponibles, avec leur **couleur sémantique**.
 * L'objectif : un MJ qui parcourt la table Compétences doit comprendre
 * d'un coup d'œil la nature d'une compétence via la couleur du chip.
 *
 * Logique des couleurs :
 *  - Origine, Spécialité : `info` (bleu) — en lien avec l'identité du PJ
 *  - CaC                : `warning` (orange) — engagement physique risqué
 *  - Malus              : `danger` (rouge) — effet négatif
 *  - Non Découvert ?    : `special` (violet) — mécanique narrative unique
 *  - Reactive           : `success` (vert) — déclencheur automatique bénéfique
 */
export const SKILL_TAG_DEFINITIONS: SkillTagDefinition[] = [
  { id: 'origine', label: 'Origine', description: 'En lien avec l\'origine du personnage', color: 'origin' },
  { id: 'specialite', label: 'Spécialité', description: 'En lien avec les compétences du personnage', color: 'specialty' },
  { id: 'cac', label: 'CaC', description: 'Uniquement au corps à corps', color: 'warning' },
  { id: 'malus', label: 'Malus', description: 'Agit plutôt comme un malus', color: 'danger' },
  { id: 'non_decouvert', label: 'Non Découvert ?', description: 'Quelque chose d\'inconnu en vous', color: 'special' },
  { id: 'reactive', label: 'Reactive', description: 'S\'active automatiquement en fonction de conditions (voir Effet)', color: 'success' },
]

/** Tooltip global affiché au survol du champ Tags. */
export const SKILL_TAGS_FIELD_TOOLTIP = 'Cliquez pour choisir un ou plusieurs tags. Survolez chaque option pour voir sa signification.'

/** Map id → définition pour un lookup O(1). */
const SKILL_TAG_BY_ID = new Map(SKILL_TAG_DEFINITIONS.map(t => [t.id, t]))

/** Convertit la string `tags` en Set d'ids normalisés. */
function parseTags(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)
  )
}

/** Convertit un Set d'ids en string `tags` (ordre déterministe selon SKILL_TAG_DEFINITIONS). */
function serializeTags(ids: Set<string>): string {
  return SKILL_TAG_DEFINITIONS
    .filter(t => ids.has(t.id))
    .map(t => t.id)
    .join(', ')
}

interface SkillTagsPickerProps {
  /** Valeur brute stockée dans le JSON (string d'ids séparés par virgule). */
  value: string
  /** Callback quand la sélection change. */
  onChange: (newValue: string) => void
  /** Désactive le picker (mode read-only). */
  disabled?: boolean
  /** Tooltip descriptif au survol du champ complet. */
  fieldTooltip?: string
}

/**
 * Picker multi-select pour les tags de compétences. Affiche les tags sélectionnés
 * comme des Chips cliquables (un clic ouvre le menu) avec tooltip sur chaque option.
 *
 * Stockage : string d'ids séparés par virgule (rétrocompatible avec l'ancien champ texte).
 */
export function SkillTagsPicker({ value, onChange, disabled, fieldTooltip }: SkillTagsPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [hoveredDesc, setHoveredDesc] = useState<string>(SKILL_TAG_DEFINITIONS[0]?.description ?? '')
  const open = Boolean(anchorEl)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = parseTags(value)

  // Ferme le menu si clic à l'extérieur du conteneur.
  // IMPORTANT : on écoute 'click' (et non 'mousedown') pour ne PAS démonter
  // les MenuItems avant que leur onClick (qui toggle le tag) ne se déclenche.
  // L'ordre des events est : mousedown → mouseup → click. Avec 'mousedown',
  // on fermait le menu pendant que le mouseup/click arrivait sur un MenuItem
  // désormais démonté → le toggle ne s'exécutait jamais et le bouton
  // "Sauvegarder" ne s'activait pas.
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

  function toggleTag(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(serializeTags(next))
  }

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

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
      {selected.size === 0 ? (
        <Typography variant="caption" sx={{ color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6, fontStyle: 'italic' }}>
          Aucun tag
        </Typography>
      ) : (
        SKILL_TAG_DEFINITIONS.filter(t => selected.has(t.id)).map(t => {
          // Récupère la palette sémantique (M3) pour ce tag. Chaque tag
          // a sa propre couleur (info / warning / danger / special /
          // success), ce qui permet de distinguer visuellement une
          // compétence d'origine d'une compétence CaC d'un malus
          // simplement en regardant les chips.
          const palette = getPalette(t.color)
          return (
            <Tooltip
              key={t.id}
              title={t.description}
              placement="top"
              arrow
              enterDelay={200}
            >
              <Chip
                label={t.label}
                size="small"
                onDelete={disabled ? undefined : (e) => {
                  e.stopPropagation()
                  const next = new Set(selected)
                  next.delete(t.id)
                  onChange(serializeTags(next))
                }}
                // La pastille à gauche du label est l'affordance principale :
                // elle donne la couleur sémantique du tag (8px, alignée via
                // flexbox interne). Le chip entier prend la couleur de fond
                // correspondante pour une lecture immédiate.
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: palette.bg,
                  color: palette.fg,
                  border: `1px solid ${palette.border}`,
                  // Pastille à gauche : on utilise un caractère unicode "●"
                  // en `::before` pour éviter un JSX supplémentaire et
                  // garder le Chip simple à cloner.
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
      <ChevronDownIcon sx={{ fontSize: 16, ml: 'auto', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.6 }} />
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
            onMouseLeave: () => setHoveredDesc(SKILL_TAG_DEFINITIONS[0]?.description ?? ''),
            sx: {
              background: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              minWidth: 280,
              maxWidth: 340,
              mt: 0.5,
              zIndex: 10500,
              overflow: 'visible',
            },
          },
        }}
        sx={{ zIndex: 10500 }}
      >
        <Box sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
          <Typography variant="caption" sx={{ color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Tags de compétence
          </Typography>
        </Box>
        <Box sx={{ py: 0.5 }}>
          {SKILL_TAG_DEFINITIONS.map(tag => {
            const isSelected = selected.has(tag.id)
            const isHovered = hoveredDesc === tag.description
            // Palette sémantique pour ce tag — utilisée pour la pastille
            // et pour l'effet hover/fond. On garde la même logique
            // visuelle que les chips fermés pour que le menu soit un
            // miroir cohérent de l'état sélectionné.
            const palette = getPalette(tag.color)
            return (
              <MenuItem
                key={tag.id}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTag(tag.id)
                }}
                onMouseEnter={() => setHoveredDesc(tag.description)}
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
                  borderLeft: isSelected ? `3px solid ${palette.dot}` : '3px solid transparent',
                  // Pastille ronde 10px à gauche (juste avant la checkbox).
                  // On l'injecte en `::before` pour éviter un JSX
                  // supplémentaire et respecter l'alignement de la flexbox.
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
                }}
              >
                <Checkbox
                  checked={isSelected}
                  size="small"
                  sx={{ p: 0.5, color: 'var(--md-sys-color-outline)', '&.Mui-checked': { color: palette.dot } }}
                />
                <ListItemText
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 600 : 400,
                        // Le texte du label prend la couleur de la palette
                        // (par ex. ambre pour CaC, rouge pour Malus) pour
                        // renforcer le signal sémantique.
                        color: isSelected ? palette.fg : 'var(--md-sys-color-on-surface)',
                      },
                    },
                  }}
                >
                  {tag.label}
                </ListItemText>
              </MenuItem>
            )
          })}
        </Box>
        {/* Footer descriptif — montre la signification du tag survolé */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            background: 'var(--md-sys-color-surface-container)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            minHeight: 48,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16, color: 'var(--md-sys-color-primary)', mt: '1px', flexShrink: 0 }} />
          <Typography
            variant="caption"
            sx={{
              color: 'var(--md-sys-color-on-surface-variant)',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              fontStyle: 'italic',
            }}
          >
            {hoveredDesc}
          </Typography>
        </Box>
      </Menu>
    </>
  )
}

/** Helper exporté pour afficher un tag dans d'autres contextes. */
export function getSkillTagDefinition(id: string): SkillTagDefinition | undefined {
  return SKILL_TAG_BY_ID.get(id.toLowerCase().trim())
}
