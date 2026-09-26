import { useState, type ReactNode } from 'react'
import { Monitor, Square, X } from 'lucide-react'
import {
  useFloatingDialog,
  renderResizeHandles,
  type FloatingDialogOptions,
} from '../lib/useFloatingDialog'

export interface FloatingDialogProps extends FloatingDialogOptions {
  /** État d'ouverture contrôlé. */
  open: boolean
  /** Titre du dialog. */
  title: ReactNode
  /** Contenu du corps du dialog. */
  children: ReactNode
  /** Callback de fermeture (bouton X / clic backdrop en fullscreen). */
  onClose: () => void
  /** Contenu optionnel à insérer dans le header après les boutons (ex: onglets). */
  headerExtra?: ReactNode
  /** Actions optionnelles à insérer avant les boutons maximize/close (ex: bouton Sauvegarder). */
  headerActions?: ReactNode
  /** Style additionnel appliqué à la section flottante (bordure, radius...). */
  sectionStyle?: React.CSSProperties
  /** Classe additionnelle pour la section. */
  sectionClassName?: string
  /** Classe additionnelle pour le header. */
  headerClassName?: string
  /** Classe pour le body. Défaut: 'conn-dialog-body'. */
  bodyClassName?: string
  /** Style du body. */
  bodyStyle?: React.CSSProperties
  /** Curseur du header en mode flottant. Défaut: 'move'. */
  dragCursor?: 'move' | 'grab'
  /** zIndex du backdrop. Défaut: 10000. */
  zIndex?: number
  /** Si true, ne pas rendre quand fermé (default: true). */
  unmountOnClose?: boolean
  /** Si true, force le mode plein écran (utile pour un popout dans une fenêtre externe). */
  forceFullscreen?: boolean
  /** Contenu optionnel en bas du dialog (actions, bouton sauvegarder...). Hors zone scroll. */
  footer?: ReactNode
}

/**
 * Composant de dialog flottant réutilisable : draggable, redimensionnable
 * (poignées façon Windows) et maximisable (plein écran).
 *
 * Utilise le hook `useFloatingDialog` pour la logique drag/resize fluide (rAF).
 *
 * Pattern Material Design 3 : header surface-tonal, elevation-3, boutons ghost.
 */
export function FloatingDialog({
  open,
  title,
  children,
  onClose,
  headerExtra,
  headerActions,
  sectionStyle,
  sectionClassName,
  headerClassName = '',
  bodyClassName = 'conn-dialog-body',
  bodyStyle,
  dragCursor = 'move',
  zIndex = 10000,
  unmountOnClose = true,
  initialPos = { x: 50, y: 50 },
  initialSize = { width: 500, height: 400 },
  minWidth = 300,
  minHeight = 200,
  edgeMargin = 100,
  dragIgnoreSelector = 'button, input, .library-tab, [data-no-drag]',
  forceFullscreen = false,
  footer,
}: FloatingDialogProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const effectiveMaximized = forceFullscreen || isMaximized
  const dialog = useFloatingDialog({
    initialPos,
    initialSize,
    minWidth,
    minHeight,
    edgeMargin,
    dragIgnoreSelector,
  })

  if (!open) {
    return unmountOnClose ? null : null
  }

  return (
    <div
      className={effectiveMaximized ? 'dialog-backdrop dialog-backdrop-fullscreen' : 'dialog-backdrop-floating'}
      style={
        effectiveMaximized
          ? // ⚠️ On reste en `position: fixed; inset: 0` même en plein écran.
          // Si on passait en `position: static`, le backdrop perdrait son
          // contexte viewport, et le dialog à `width: 100vw; height: 100svh`
          // ne pourrait plus se mesurer contre la fenêtre (il déborderait ou
          // resterait à la taille du parent, sans atteindre les bords).
          // Le `pointerEvents: 'auto'` permet de garder le clic-backdrop
          // fonctionnel (cf. onPointerDown ci-dessous) ; on conserve un
          // fond transparent pour ne pas assombrir inutilement.
          { position: 'fixed', inset: 0, background: 'transparent', pointerEvents: 'auto', zIndex }
          : { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex }
      }
      onPointerDown={(e) => {
        // backdrop click close only in fullscreen mode (pas en forceFullscreen)
        if (e.target === e.currentTarget && isMaximized && !forceFullscreen) onClose()
      }}
    >
      <section
        className={`dialog card surface-base ${effectiveMaximized ? 'dialog-fullscreen' : 'dialog-floating'} ${sectionClassName ?? ''}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={
          effectiveMaximized
            ? sectionStyle
            : {
              ...dialog.floatingStyle,
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--md-sys-elevation-3)',
              borderRadius: '16px',
              overflow: 'hidden',
              ...sectionStyle,
            }
        }
      >
        {!effectiveMaximized && renderResizeHandles(dialog.resizeHandleProps)}
        <div
          className={`library-dialog-header surface-tonal ${headerClassName}`.trim()}
          style={{ cursor: effectiveMaximized ? 'default' : dragCursor }}
          {...(effectiveMaximized ? {} : dialog.headerProps)}
        >
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>{title}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {headerActions}
              {!forceFullscreen && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setIsMaximized(!isMaximized)}
                  title={isMaximized ? 'Minimiser' : 'Agrandir'}
                >
                  {isMaximized ? (
                    <Square className="button-icon" strokeWidth={2.2} size={18} />
                  ) : (
                    <Monitor className="button-icon" strokeWidth={2.2} size={18} />
                  )}
                </button>
              )}
              <button
                type="button"
                // `ghost` = bouton transparent (M3 text button), `danger`
                // = couleur d'erreur M3 (rouge, auto-adapté dark/light).
                // L'icône de fermeture reste lisible sur le header surface-tonal
                // tout en étant visuellement distincte des actions neutres
                // (Agrandir / Minimiser) pour signaler une action destructive.
                className="ghost danger"
                onClick={onClose}
                title="Fermer"
                aria-label="Fermer le dialogue"
              >
                <X className="button-icon" strokeWidth={2.2} />
              </button>
            </div>
          </div>
          {headerExtra}
        </div>
        <div
          className={bodyClassName}
          style={{
            flex: '1 1 0',
            // Scroll vertical ET horizontal : certaines tables (Compétences,
            // Armes avec anyAmmo) ont beaucoup de colonnes ; sur un viewport
            // étroit ou après un redimensionnement agressif, la largeur
            // naturelle du contenu peut dépasser celle du dialog. On active
            // donc `overflowX: 'auto'` pour qu'une scrollbar apparaisse
            // plutôt que d'écraser les colonnes (ce qui rendrait la table
            // illisible). Idem verticalement pour les longs formulaires
            // (Lore, Configuration, listes d'armes/équipement).
            overflowY: 'auto',
            overflowX: 'auto',
            // Indique au navigateur de gérer la scrollbar de manière
            // classique (pas de "scrollbar gutter" réservé) : évite que la
            // scrollbar apparaisse/disparaisse fasse sauter la largeur du
            // contenu au moment de l'apparition.
            scrollbarGutter: 'stable',
            display: 'flex',
            flexDirection: 'column',
            ...bodyStyle,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="dialog-footer surface-tonal"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '8px 16px',
              borderTop: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            {footer}
          </div>
        )}
      </section>
    </div>
  )
}