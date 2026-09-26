import { useState, useMemo } from 'react'
import { Menu, MenuItem, Typography } from '@mui/material'
import UserIcon from '@mui/icons-material/Person'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'

export interface WorkfolderFile {
  name: string
  fileName: string
  type: 'terrain' | 'character' | 'other'
  /** Description optionnelle pour les fichiers "autres" (utilité du fichier). */
  description?: string
}

interface FicheDropdownProps {
  /** Fichiers disponibles dans le dossier de travail */
  files: WorkfolderFile[]
  /** Indique si un dossier de travail est sélectionné */
  workfolderHandle: any
  /** Ouvre le dialog d'import quand aucun dossier n'est sélectionné (optionnel si des fichiers existent déjà) */
  onOpenImport?: () => void
  /** Ouvre une fiche de personnage depuis le workfolder */
  onOpenFile: (fileName: string) => void
  /** Nom de fichier actif pour le surlignage (optionnel) */
  activeFileName?: string
  /** Masquer le label "Fiche" (utile dans un header de dialog). Défaut: false */
  hideLabel?: boolean
}

/**
 * Dropdown MUI listant les fiches de personnages (.char.json) du dossier de travail.
 * Utilise MUI Menu pour gérer l'ouverture/fermeture correctement (collapse fiable).
 *
 * Réutilisable : si des fichiers character sont déjà disponibles, le menu s'ouvre
 * même sans workfolderHandle (utile dans le CharacterSheetDialog).
 */
export function FicheDropdown({ files, workfolderHandle, onOpenImport, onOpenFile, activeFileName, hideLabel = false }: FicheDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const characterFiles = useMemo(() => files.filter((f) => f.type === 'character'), [files])

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!workfolderHandle && characterFiles.length === 0) {
      onOpenImport?.()
      return
    }
    setAnchorEl(event.currentTarget)
  }

  // Ouvre le menu sur pointerdown (et non click) pour éviter que le Modal du Menu
  // ne détecte le mousedown d'ouverture comme un clic extérieur et referme
  // immédiatement le menu. C'est un pattern recommandé par MUI pour les Menu
  // imbriqués dans des zones interactives (dialogs, drag headers...).
  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    if (!workfolderHandle && characterFiles.length === 0) {
      onOpenImport?.()
      event.preventDefault()
      return
    }
    setAnchorEl(event.currentTarget)
    // Empêche le drag du dialog de démarrer et le focus stealing.
    event.preventDefault()
    event.stopPropagation()
  }

  function handleClose() {
    setAnchorEl(null)
  }

  function handleSelectFile(fileName: string) {
    onOpenFile(fileName)
    handleClose()
  }

  return (
    <>
      {!hideLabel && <span className="toolbar-group-label">Fiche</span>}
      <IconButton
        size="small"
        title="Fiches de personnages du dossier de travail"
        aria-label="Fiches de personnages du dossier de travail"
        aria-controls={open ? 'fiche-dropdown-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        sx={{
          color: 'var(--md-sys-color-on-surface)',
          border: open ? '1px solid var(--md-sys-color-outline)' : '1px solid transparent',
          borderRadius: '20px',
          padding: '4px',
          '&:hover': { backgroundColor: 'var(--md-sys-color-surface-container-highest)' },
        }}
      >
        <UserIcon fontSize="small" />
        <ChevronDownIcon fontSize="small" sx={{ width: 14, height: 14 }} />
      </IconButton>
      <Menu
        id="fiche-dropdown-menu"
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
              minWidth: 220,
              maxHeight: 320,
              marginTop: '4px',
              zIndex: 10500,
            },
          },
        }}
        sx={{ zIndex: 10500 }}
      >
        {characterFiles.length === 0 ? (
          <MenuItem disabled sx={{ opacity: 0.6, fontStyle: 'italic' }}>
            <Typography variant="caption">Aucune fiche (.char.json) trouvée.</Typography>
          </MenuItem>
        ) : (
          characterFiles.map((fiche) => {
            const isActive = activeFileName ? fiche.fileName === activeFileName || fiche.name === activeFileName : false
            return (
            <MenuItem
              key={fiche.fileName}
              onClick={() => handleSelectFile(fiche.fileName)}
              selected={isActive}
              sx={{ gap: 1, borderRadius: '4px', mx: 0.5 }}
            >
              <UserIcon fontSize="small" sx={{ color: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)', flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {fiche.name}
              </Typography>
            </MenuItem>
            )
          })
        )}
      </Menu>
    </>
  )
}