import { memo } from 'react'
import { Shield } from 'lucide-react'
import type { TerrainItem } from '../../types/terrain'

/**
 * Tooltip affiché au survol d'un item : montre la note MJ (en mode
 * éditeur) et/ou la note Joueurs (publique).
 *
 * ⚠️ Performance : ce composant est wrappé dans `React.memo` car il est
 * rendu à côté de toute la scène et reçoit beaucoup de re-renders. En
 * particulier, la position (x, y) du tooltip est appliquée via DOM direct
 * (`element.style.left/top`) plutôt que via une prop React — voir
 * `data-hovered-note-tooltip` ciblé par `document.querySelector` dans
 * `App.tsx::scheduleHoveredNotePosUpdate`. Cela permet à `onPointerMove`
 * de fire 100+ fois/sec sans déclencher de re-render React complet (sinon
 * les FPS tombent de 175 à 30 sur le survol).
 */

export interface NoteTooltipProps {
  /** Contenu HTML de la note MJ (sanitizé). Visible uniquement en éditeur. */
  htmlMJ: string | null
  /** Contenu HTML de la note Joueurs (sanitizé). Visible par tous. */
  htmlPlayers: string | null
  /** Item associé (utilisé par le parent pour ctrl+O). */
  item: TerrainItem | null
}

const NoteTooltipInner: React.FC<NoteTooltipProps> = ({ htmlMJ, htmlPlayers, item }) => {
  if (!item || (!htmlMJ && !htmlPlayers)) {
    return null
  }
  return (
    <div
      data-hovered-note-tooltip
      className="note-tooltip surface-base"
      style={{
        left: '0px',
        top: '0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        // `willChange` indique au navigateur qu'on va muter left/top
        // → promotion sur une couche GPU, animations plus fluides.
        willChange: 'left, top',
      }}
    >
      {htmlMJ && (
        <div
          style={{
            borderColor: '#f97316',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
          }}
        >
          <div className="note-tooltip-content" dangerouslySetInnerHTML={{ __html: htmlMJ }} style={{ flex: '1 1 0' }} />
          <Shield size={20} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
        </div>
      )}
      {htmlPlayers && (
        <div
          style={{
            borderRadius: '6px',
            padding: htmlMJ ? '4px 12px' : '4px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div className="note-tooltip-content" dangerouslySetInnerHTML={{ __html: htmlPlayers }} style={{ flex: '1 1 0' }} />
        </div>
      )}
      <div style={{ fontSize: '0.65rem', color: 'var(--md-sys-color-outline)', textAlign: 'center', marginTop: '4px', fontStyle: 'italic' }}>
        Appuyer sur ctrl + O pour ouvrir en grand
      </div>
    </div>
  )
}

/**
 * Composant exporté, mémoizé : ne re-render que si le contenu
 * (htmlMJ / htmlPlayers / item) change. La position du tooltip est
 * appliquée via DOM direct dans le parent (cf. `data-hovered-note-tooltip`),
 * donc PAS de re-render sur le mouvement de la souris.
 */
export const NoteTooltip = memo(NoteTooltipInner, (prev, next) => {
  return (
    prev.htmlMJ === next.htmlMJ &&
    prev.htmlPlayers === next.htmlPlayers &&
    prev.item === next.item
  )
})

