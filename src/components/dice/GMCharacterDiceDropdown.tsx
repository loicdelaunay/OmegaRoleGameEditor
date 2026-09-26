import { useState, useMemo, useRef } from 'react'
import { Menu, MenuItem, Typography, IconButton, Popper, Paper, MenuList } from '@mui/material'
import CasinoIcon from '@mui/icons-material/Casino'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import UserIcon from '@mui/icons-material/Person'
import type { CharacterDocument } from '../../lib/character'
import { extractCharacteristics, type CharacteristicEntry, type CharacteristicConfig } from '../../lib/characteristics'

export type GMCharacterEntry = {
  id: string
  label: string
  characterData: CharacterDocument
}

type GMCharacterDiceDropdownProps = {
  characters: GMCharacterEntry[]
  config?: CharacteristicConfig
  onRollCharacteristic: (character: GMCharacterEntry, entry: CharacteristicEntry) => void
}

/**
 * Dropdown MUI côté MJ listant les fiches de personnages assignées aux pions.
 * Au survol d'une fiche, un sous-menu Popper s'ouvre à droite avec les caractéristiques.
 *
 * Le sous-menu utilise Popper (pas Menu) pour éviter le backdrop modal de MUI
 * qui bloquerait les onMouseEnter du menu principal. Ainsi, déplacer la souris
 * d'une fiche à l'autre change le sous-menu instantanément.
 */
export function GMCharacterDiceDropdown({ characters, config, onRollCharacteristic }: GMCharacterDiceDropdownProps) {
  const [mainAnchor, setMainAnchor] = useState<HTMLElement | null>(null)
  const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLElement | null>>({})
  const closeTimerRef = useRef<number | null>(null)
  const mainOpen = Boolean(mainAnchor)

  const hoveredCharacter = useMemo(
    () => characters.find((c) => c.id === hoveredCharacterId) ?? null,
    [characters, hoveredCharacterId],
  )

  const characteristics = useMemo(() => {
    if (!hoveredCharacter) return []
    return extractCharacteristics(hoveredCharacter.characterData, config)
  }, [hoveredCharacter, config])

  function handleMainClick(event: React.MouseEvent<HTMLButtonElement>) {
    setMainAnchor(event.currentTarget)
  }

  function handleMainClose() {
    setMainAnchor(null)
    setHoveredCharacterId(null)
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function handleItemEnter(characterId: string) {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setHoveredCharacterId(characterId)
  }

  function handleMenuLeave() {
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredCharacterId(null)
    }, 300)
  }

  function handleSubMenuEnter() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function handleRoll(character: GMCharacterEntry, entry: CharacteristicEntry) {
    onRollCharacteristic(character, entry)
    handleMainClose()
  }

  if (characters.length === 0) return null

  // Le Popper est ancré sur le MenuItem survolé.
  const subAnchorEl = hoveredCharacterId ? itemRefs.current[hoveredCharacterId] ?? null : null
  const subOpen = Boolean(subAnchorEl) && mainOpen

  return (
    <>
      <IconButton
        size="small"
        title="Jet de caractéristique (fiches)"
        aria-label="Jet de caractéristique (fiches)"
        aria-controls={mainOpen ? 'gm-character-dice-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={mainOpen ? 'true' : undefined}
        onClick={handleMainClick}
        sx={{
          color: 'var(--md-sys-color-on-surface)',
          border: mainOpen ? '1px solid var(--md-sys-color-outline)' : '1px solid transparent',
          borderRadius: '20px',
          padding: '4px',
          '&:hover': { backgroundColor: 'var(--md-sys-color-surface-container-highest)' },
        }}
      >
        <CasinoIcon fontSize="small" />
        <ChevronDownIcon fontSize="small" sx={{ width: 14, height: 14 }} />
      </IconButton>
      <Menu
        id="gm-character-dice-menu"
        anchorEl={mainAnchor}
        open={mainOpen}
        onClose={handleMainClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onMouseLeave={handleMenuLeave}
        slotProps={{
          paper: {
            sx: {
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              minWidth: 220,
              maxHeight: 360,
              marginTop: '4px',
              zIndex: 10500,
            },
          },
        }}
        sx={{ zIndex: 10500 }}
        disableAutoFocusItem
        disableRestoreFocus
      >
        {characters.map((character) => (
          <MenuItem
            key={character.id}
            selected={hoveredCharacterId === character.id}
            onMouseEnter={() => handleItemEnter(character.id)}
            ref={(el) => { itemRefs.current[character.id] = el }}
            onClick={(e) => {
              e.stopPropagation()
              handleItemEnter(character.id)
            }}
            sx={{ gap: 1, borderRadius: '4px', mx: 0.5 }}
          >
            <UserIcon fontSize="small" sx={{ flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {character.label}
            </Typography>
            <ChevronRightIcon fontSize="small" sx={{ color: 'var(--md-sys-color-on-surface-variant)', flexShrink: 0 }} />
          </MenuItem>
        ))}
      </Menu>
      {/* Sous-menu via Popper — pas de backdrop modal, les onMouseEnter du menu parent restent actifs. */}
      <Popper
        open={subOpen}
        anchorEl={subAnchorEl}
        placement="right-start"
        onMouseEnter={handleSubMenuEnter}
        onMouseLeave={handleMenuLeave}
        sx={{
          zIndex: 10501,
          pointerEvents: 'auto',
        }}
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, 4] },
          },
        ]}
      >
        <Paper
          sx={{
            background: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            minWidth: 260,
            maxHeight: 360,
            overflow: 'auto',
            py: 0.5,
          }}
        >
          <MenuList sx={{ py: 0.5 }}>
          {hoveredCharacter && characteristics.map((entry) => (
            <MenuItem
              key={entry.key}
              onClick={() => handleRoll(hoveredCharacter, entry)}
              sx={{ gap: 1, borderRadius: '4px', mx: 0.5, py: 0.75 }}
            >
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '1.1rem' }}>{entry.emoji}</span>
                <span style={{ fontWeight: 600 }}>{entry.label}</span>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  ml: 'auto',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {entry.current} → {entry.successThreshold}
              </Typography>
            </MenuItem>
          ))}
          </MenuList>
        </Paper>
      </Popper>
    </>
  )
}