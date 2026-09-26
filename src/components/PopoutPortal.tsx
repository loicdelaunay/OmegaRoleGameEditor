import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface PopoutPortalProps {
  /** Si true, le contenu est rendu dans une fenêtre séparée. */
  open: boolean
  /** Titre de la fenêtre popout. */
  title: string
  /** Taille initiale de la fenêtre popout. */
  width?: number
  height?: number
  /** Enfant rendu dans la fenêtre popout. */
  children: ReactNode
  /** Appelé quand la fenêtre popout est fermée par l'utilisateur (croix navigateur). */
  onExternalClose: () => void
}

/**
 * Portail React vers une fenêtre de navigateur séparée (window.open).
 * Permet de déplacer un dialog sur un deuxième écran.
 *
 * Copie automatiquement tous les styles (<link> et <style>) du document parent
 * vers la nouvelle fenêtre pour conserver le thème MUI / CSS.
 */
export function PopoutPortal({ open, title, width = 1000, height = 700, children, onExternalClose }: PopoutPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const popoutRef = useRef<Window | null>(null)

  useEffect(() => {
    if (!open) {
      // Fermeture programmée : on ferme la fenêtre si encore ouverte
      if (popoutRef.current && !popoutRef.current.closed) {
        popoutRef.current.close()
      }
      popoutRef.current = null
      setContainer(null)
      return
    }

    // Ouvre une nouvelle fenêtre centrée
    const left = window.screenLeft ?? window.screenX
    const top = window.screenTop ?? window.screenY
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    const win = window.open('', '', features)
    if (!win) {
      console.warn('PopoutPortal: impossible d\'ouvrir une nouvelle fenêtre (popup bloqué ?).')
      onExternalClose()
      return
    }
    popoutRef.current = win

    // Initialise le DOM de la nouvelle fenêtre
    win.document.title = title
    win.document.head.innerHTML = ''
    win.document.body.innerHTML = ''
    win.document.documentElement.style.margin = '0'
    win.document.documentElement.style.padding = '0'
    win.document.body.style.margin = '0'
    win.document.body.style.padding = '0'
    win.document.body.style.overflow = 'hidden'
    win.document.body.style.background = 'var(--md-sys-color-surface, #fff7fb)'
    win.document.body.style.fontFamily = 'inherit'

    // Copie l'attribut data-theme et color-scheme du document parent
    // pour que le thème (dark/light) soit appliqué dans la fenêtre popout
    const parentHtml = document.documentElement
    const parentTheme = parentHtml.dataset.theme
    if (parentTheme) {
      win.document.documentElement.dataset.theme = parentTheme
    }
    const parentColorScheme = parentHtml.style.colorScheme
    if (parentColorScheme) {
      win.document.documentElement.style.colorScheme = parentColorScheme
    }

    // Copie tous les styles du document parent (links + style tags)
    // afin de conserver MUI Emotion + index.css
    const parentHead = document.head
    const copyPromises: Promise<void>[] = []

    parentHead.querySelectorAll('style').forEach((styleEl) => {
      const clone = win.document.createElement('style')
      clone.textContent = styleEl.textContent
      win.document.head.appendChild(clone)
    })

    parentHead.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
      const href = (linkEl as HTMLLinkElement).href
      const clone = win.document.createElement('link')
      clone.rel = 'stylesheet'
      clone.href = href
      win.document.head.appendChild(clone)
    })

    // Les styles MUI Emotion sont injectés dans <style data-emotion> ; déjà copiés ci-dessus.
    // Mais MUI peut injecter tardivement — on observe le parent et recopie les nouveaux <style>.
    void Promise.all(copyPromises)

    // Container pour le portail React
    const mountEl = win.document.createElement('div')
    mountEl.style.width = '100vw'
    mountEl.style.height = '100vh'
    mountEl.style.display = 'flex'
    mountEl.style.flexDirection = 'column'
    win.document.body.appendChild(mountEl)
    setContainer(mountEl)

    // Gestion fermeture par l'utilisateur (croix navigateur)
    const handleClose = () => {
      onExternalClose()
    }
    win.addEventListener('beforeunload', handleClose)

    // Observer les nouveaux styles injectés par MUI Emotion dans le parent
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'STYLE') {
            const styleEl = node as HTMLStyleElement
            // Évite les doublons
            const existing = Array.from(win.document.head.querySelectorAll('style')).find(
              (s) => s.textContent === styleEl.textContent
            )
            if (!existing) {
              const clone = win.document.createElement('style')
              clone.textContent = styleEl.textContent
              win.document.head.appendChild(clone)
            }
          }
        })
      }
    })
    observer.observe(parentHead, { childList: true, subtree: false })

    return () => {
      win.removeEventListener('beforeunload', handleClose)
      observer.disconnect()
      if (win && !win.closed) {
        win.close()
      }
      popoutRef.current = null
      setContainer(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Met à jour le titre de la fenêtre quand il change
  useEffect(() => {
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.document.title = title
    }
  }, [title])

  if (!open || !container) return null
  return createPortal(children, container)
}