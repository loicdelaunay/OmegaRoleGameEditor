import { useMemo, useState } from 'react'
import { Box, Tabs, Tab, List, ListItemButton, ListItemIcon, ListItemText, Typography, Tooltip } from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import UserIcon from '@mui/icons-material/Person'
import FileIcon from '@mui/icons-material/InsertDriveFile'
import type { WorkfolderFile } from './FicheDropdown'

interface WorkfolderFilesListProps {
  files: WorkfolderFile[]
  onOpenFile: (fileName: string) => void
}

type FileCategory = 'terrain' | 'character' | 'other'

const CATEGORY_LABEL: Record<FileCategory, string> = {
  terrain: 'Terrains',
  character: 'Personnages',
  other: 'Autres fichiers',
}

const CATEGORY_ICON: Record<FileCategory, React.ReactNode> = {
  terrain: <MapIcon sx={{ fontSize: 16 }} />,
  character: <UserIcon sx={{ fontSize: 16 }} />,
  other: <FileIcon sx={{ fontSize: 16 }} />,
}

/**
 * Liste des fichiers du dossier de travail organisée par onglets (MUI Tabs).
 * Sépare les terrains (.terrain.json), fiches de personnage (.char.json)
 * et autres fichiers (.json non reconnus, palettes, configs, etc.).
 */
export function WorkfolderFilesList({ files, onOpenFile }: WorkfolderFilesListProps) {
  const [activeTab, setActiveTab] = useState<FileCategory>('terrain')

  const grouped = useMemo(() => {
    const terrains = files.filter((f) => f.type === 'terrain')
    const characters = files.filter((f) => f.type === 'character')
    const others = files.filter((f) => f.type === 'other')
    return { terrain: terrains, character: characters, other: others }
  }, [files])

  const availableTabs = useMemo<FileCategory[]>(() => {
    const tabs: FileCategory[] = []
    if (grouped.terrain.length > 0) tabs.push('terrain')
    if (grouped.character.length > 0) tabs.push('character')
    if (grouped.other.length > 0) tabs.push('other')
    return tabs
  }, [grouped])

  const currentTab: FileCategory = availableTabs.includes(activeTab)
    ? activeTab
    : availableTabs[0] ?? 'terrain'

  const currentFiles = grouped[currentTab]

  if (files.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.875rem' }}
      >
        Aucun fichier (.json) trouvé.
      </Typography>
    )
  }

  // Un seul type de fichier : pas besoin d'onglets
  if (availableTabs.length <= 1) {
    return (
      <FileList files={currentFiles} onOpenFile={onOpenFile} />
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Tabs
        value={currentTab}
        onChange={(_, value) => setActiveTab(value as FileCategory)}
        variant="fullWidth"
        sx={{
          minHeight: '36px',
          '& .MuiTab-root': {
            minHeight: '36px',
            textTransform: 'none',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--md-sys-color-on-surface-variant)',
            '&.Mui-selected': {
              color: 'var(--md-sys-color-primary)',
            },
          },
          '& .MuiTabs-indicator': {
            background: 'var(--md-sys-color-primary)',
            height: '2px',
          },
        }}
      >
        {availableTabs.map((cat) => (
          <Tab
            key={cat}
            value={cat}
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {CATEGORY_ICON[cat]}
                {CATEGORY_LABEL[cat]} ({grouped[cat].length})
              </span>
            }
          />
        ))}
      </Tabs>
      <Box
        sx={{
          maxHeight: '210px',
          overflowY: 'auto',
          paddingRight: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <FileList files={currentFiles} onOpenFile={onOpenFile} />
      </Box>
    </Box>
  )
}

interface FileListProps {
  files: WorkfolderFile[]
  onOpenFile: (fileName: string) => void
}

function FileList({ files, onOpenFile }: FileListProps) {
  return (
    <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {files.map((file) => {
        const icon = file.type === 'character' ? <UserIcon sx={{ fontSize: 18 }} /> : file.type === 'other' ? <FileIcon sx={{ fontSize: 18 }} /> : <MapIcon sx={{ fontSize: 18 }} />
        const listItem = (
          <ListItemButton
            key={file.fileName}
            onClick={() => onOpenFile(file.fileName)}
            sx={{
              borderRadius: '8px',
              padding: '8px 12px',
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid transparent',
              transition: 'background-color 0.2s, border-color 0.2s',
              alignItems: 'flex-start',
              '&:hover': {
                background: 'var(--md-sys-color-surface-container-high)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: '32px', color: 'var(--md-sys-color-on-surface)' }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={file.name}
              secondary={file.type === 'other' ? file.description : undefined}
              slotProps={{
                primary: {
                  sx: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--md-sys-color-on-surface)',
                    fontSize: '0.875rem',
                  },
                },
                secondary: {
                  sx: {
                    fontSize: '0.75rem',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    lineHeight: 1.3,
                    mt: 0.25,
                  },
                },
              }}
            />
          </ListItemButton>
        )
        // Tooltip avec description complète pour les fichiers "autres"
        if (file.type === 'other' && file.description) {
          return (
            <Tooltip key={file.fileName} title={file.description} placement="left" arrow>
              {listItem}
            </Tooltip>
          )
        }
        return listItem
      })}
    </List>
  )
}