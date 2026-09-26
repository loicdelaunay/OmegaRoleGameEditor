import { useState, useMemo } from 'react'
import { Menu, MenuItem, Typography, IconButton } from '@mui/material'
import CasinoIcon from '@mui/icons-material/Casino'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
import type { CharacterDocument } from '../../lib/character'
import { extractCharacteristics, type CharacteristicEntry, type CharacteristicConfig } from '../../lib/characteristics'

type CharacteristicDiceDropdownProps = {
  /** Fiche de personnage du joueur. */
  characterData: CharacterDocument
  /** Config projet pour le calcul des seuils de réussite. */
  config?: CharacteristicConfig
  /** Lance un d100 avec seuil de réussite et raison. */
  onRollCharacteristic: (entry: CharacteristicEntry) => void
}

/**
 * Dropdown MUI affichant les caractéristiques du personnage du joueur.
 * Au clic sur une caractéristique, lance un d100 interprété.
 *
 * Affichage : `emoji Label (Valeur actuelle → Valeur de réussite)`
 */
export function CharacteristicDiceDropdown({ characterData, config, onRollCharacteristic }: CharacteristicDiceDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const characteristics = useMemo(() => extractCharacteristics(characterData, config), [characterData, config])

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget)
  }

  function handleClose() {
    setAnchorEl(null)
  }

  function handleSelect(entry: CharacteristicEntry) {
    onRollCharacteristic(entry)
    handleClose()
  }

  return (
    <>
      <IconButton
        size="small"
        title="Jet de caractéristique"
        aria-label="Jet de caractéristique"
        aria-controls={open ? 'characteristic-dice-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        sx={{
          color: 'var(--md-sys-color-on-surface)',
          border: open ? '1px solid var(--md-sys-color-outline)' : '1px solid transparent',
          borderRadius: '20px',
          padding: '4px',
          '&:hover': { backgroundColor: 'var(--md-sys-color-surface-container-highest)' },
        }}
      >
        <CasinoIcon fontSize="small" />
        <ChevronDownIcon fontSize="small" sx={{ width: 14, height: 14 }} />
      </IconButton>
      <Menu
        id="characteristic-dice-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              minWidth: 260,
              maxHeight: 360,
              marginTop: '4px',
              zIndex: 10500,
            },
          },
        }}
        sx={{ zIndex: 10500 }}
      >
        {characteristics.map((entry) => (
          <MenuItem
            key={entry.key}
            onClick={() => handleSelect(entry)}
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
      </Menu>
    </>
  )
}