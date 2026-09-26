import { type ReactNode } from 'react'
import ChevronDownIcon from '@mui/icons-material/ExpandMore'
import { Collapse } from '@mui/material'

export interface CollapsibleSectionProps {
  /** Identifiant unique de la section (pour la persistance). */
  id: string
  /** Titre de la section (icône + texte). */
  title: ReactNode
  /** Contenu de la section. */
  children: ReactNode
  /** État collapsé. */
  collapsed: boolean
  /** Callback pour basculer l'état collapsé. */
  onToggle: (id: string) => void
  /** Classe CSS additionnelle pour la card. */
  className?: string
  /** Actions optionnelles dans le header (ex: bouton refresh). */
  headerActions?: ReactNode
}

/**
 * Section collapsible Material Design 3 pour le dialog "Gestion du projet".
 * Le titre est cliquable pour déplier/replier la section.
 * L'icône chevron pivote selon l'état.
 */
export function CollapsibleSection({
  id,
  title,
  children,
  collapsed,
  onToggle,
  className = '',
  headerActions,
}: CollapsibleSectionProps) {
  return (
    <div className={`project-dialog-card ${className}`}>
      <div className="project-dialog-card-header">
        <div
          role="button"
          tabIndex={0}
          className="ghost compact-icon-button"
          onClick={() => onToggle(id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(id) } }}
          style={{ padding: '4px', gap: '8px', flex: '1 1 0', justifyContent: 'flex-start', cursor: 'pointer', display: 'flex', alignItems: 'center', border: 'none', background: 'transparent' }}
          aria-expanded={!collapsed}
          aria-label="Replier/Déplier la section"
        >
          <ChevronDownIcon
            fontSize="small"
            sx={{
              color: 'var(--md-sys-color-primary)',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
          <span className="project-dialog-card-title">{title}</span>
        </div>
        {headerActions}
      </div>
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </div>
  )
}