import { useCallback, useRef, useState } from 'react'

/**
 * Taille (largeur, hauteur) d'un dialog flottant.
 */
export interface DialogSize {
  width: number
  height: number
}

/**
 * Position (x, y) du coin haut-gauche d'un dialog flottant.
 */
export interface DialogPos {
  x: number
  y: number
}

/**
 * Poignées de redimensionnement disponibles (comme les bords d'une fenêtre Windows).
 */
export type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface DragState {
  startX: number
  startY: number
  initialX: number
  initialY: number
}

interface ResizeState {
  startX: number
  startY: number
  initialX: number
  initialY: number
  initialWidth: number
  initialHeight: number
  handle: ResizeHandle
}

export interface FloatingDialogOptions {
  initialPos?: DialogPos
  initialSize?: DialogSize
  minWidth?: number
  minHeight?: number
  /** Marge de bordure pour le bornage (évite de sortir complètement de l'écran). */
  edgeMargin?: number
  /** Sélecteur d'éléments à ignorer pour le drag (boutons, inputs, onglets...). */
  dragIgnoreSelector?: string
}

export interface FloatingDialogApi {
  pos: DialogPos
  size: DialogSize
  setPos: (pos: DialogPos) => void
  setSize: (size: DialogSize) => void
  /** Props à attacher à l'élément header (zone draggable). */
  headerProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  /** Récupère les props de gestion pour une poignée de redimensionnement. */
  resizeHandleProps: (handle: ResizeHandle) => {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  /** Style de positionnement à appliquer au conteneur du dialog flottant. */
  floatingStyle: React.CSSProperties
  /** Reset position/taille (utile à l'ouverture). */
  reset: () => void
}

/**
 * Hook de gestion d'un dialog flottant : drag fluide (coalescing requestAnimationFrame)
 * + redimensionnement par poignées (bords/corners façon Windows).
 *
 * Le drag utilise un ref + rAF pour éviter un re-render React à chaque pointermove
 * (175 Hz sur certains écrans), ce qui rend le déplacement fluide à 60 fps.
 */
export function useFloatingDialog(options: FloatingDialogOptions = {}): FloatingDialogApi {
  const {
    initialPos = { x: 50, y: 50 },
    initialSize = { width: 500, height: 400 },
    minWidth = 300,
    minHeight = 200,
    edgeMargin = 100,
    dragIgnoreSelector = 'button, input, .library-tab, [data-no-drag]',
  } = options

  const [pos, setPos] = useState<DialogPos>(initialPos)
  const [size, setSize] = useState<DialogSize>(initialSize)

  const dragStateRef = useRef<DragState | null>(null)
  const resizeStateRef = useRef<ResizeState | null>(null)
  // Position/size pending pour coalescing rAF (évite re-render à chaque pointermove)
  const pendingPosRef = useRef<DialogPos | null>(null)
  const pendingSizeRef = useRef<DialogSize | null>(null)
  const rafIdRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    rafIdRef.current = null
    if (pendingPosRef.current) {
      setPos(pendingPosRef.current)
      pendingPosRef.current = null
    }
    if (pendingSizeRef.current) {
      setSize(pendingSizeRef.current)
      pendingSizeRef.current = null
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = window.requestAnimationFrame(flush)
    }
  }, [flush])

  // --- Drag (header) ---
  const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(dragIgnoreSelector)) return
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [pos.x, pos.y, dragIgnoreSelector])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragStateRef.current
    if (!st) return
    const dx = e.clientX - st.startX
    const dy = e.clientY - st.startY
    pendingPosRef.current = {
      x: Math.max(0, Math.min(window.innerWidth - edgeMargin, st.initialX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - edgeMargin, st.initialY + dy)),
    }
    scheduleFlush()
  }, [edgeMargin, scheduleFlush])

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (dragStateRef.current) {
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      dragStateRef.current = null
    }
  }, [])

  const headerProps = {
    onPointerDown: onHeaderPointerDown,
    onPointerMove: onHeaderPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  // --- Resize (handles) ---
  const resizeHandleProps = useCallback((handle: ResizeHandle) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation()
      resizeStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: pos.x,
        initialY: pos.y,
        initialWidth: size.width,
        initialHeight: size.height,
        handle,
      }
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const st = resizeStateRef.current
      if (!st || st.handle !== handle) return
      const dx = e.clientX - st.startX
      const dy = e.clientY - st.startY

      let newX = st.initialX
      let newY = st.initialY
      let newW = st.initialWidth
      let newH = st.initialHeight

      if (handle.includes('e')) newW = Math.max(minWidth, st.initialWidth + dx)
      if (handle.includes('s')) newH = Math.max(minHeight, st.initialHeight + dy)
      if (handle.includes('w')) {
        const maxDx = st.initialWidth - minWidth
        const appliedDx = Math.min(dx, maxDx)
        newX = st.initialX + appliedDx
        newW = st.initialWidth - appliedDx
      }
      if (handle.includes('n')) {
        const maxDy = st.initialHeight - minHeight
        const appliedDy = Math.min(dy, maxDy)
        newY = st.initialY + appliedDy
        newH = st.initialHeight - appliedDy
      }

      pendingPosRef.current = { x: newX, y: newY }
      pendingSizeRef.current = { width: newW, height: newH }
      scheduleFlush()
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (resizeStateRef.current?.handle === handle) {
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        resizeStateRef.current = null
      }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (resizeStateRef.current?.handle === handle) {
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        resizeStateRef.current = null
      }
    },
  }), [pos.x, pos.y, size.width, size.height, minWidth, minHeight, scheduleFlush])

  const floatingStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    width: size.width,
    height: size.height,
  }

  const reset = useCallback(() => {
    setPos(initialPos)
    setSize(initialSize)
  }, [initialPos, initialSize])

  return {
    pos,
    size,
    setPos,
    setSize,
    headerProps,
    resizeHandleProps,
    floatingStyle,
    reset,
  }
}

/**
 * Style des poignées de redimensionnement (à appliquer sur les divs handles).
 * Retourne le style + le curseur approprié pour un handle donné.
 */
export function resizeHandleStyle(handle: ResizeHandle): React.CSSProperties {
  const isCorner = handle.length === 2
  return {
    position: 'absolute',
    zIndex: 10,
    cursor: `${handle}-resize`,
    top: handle.includes('n') ? -5 : handle.includes('s') ? 'auto' : 0,
    bottom: handle.includes('s') ? -5 : 'auto',
    left: handle.includes('w') ? -5 : handle.includes('e') ? 'auto' : 0,
    right: handle.includes('e') ? -5 : 'auto',
    width: isCorner ? 24 : (handle === 'n' || handle === 's' ? '100%' : 24),
    height: isCorner ? 24 : (handle === 'e' || handle === 'w' ? '100%' : 24),
  }
}

/**
 * Rendu des 8 poignées de redimensionnement (à utiliser dans le dialog flottant).
 */
export function renderResizeHandles(
  resizeHandleProps: (handle: ResizeHandle) => {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
) {
  const handles: ResizeHandle[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']
  return (
    <>
      {handles.map(handle => (
        <div
          key={handle}
          style={resizeHandleStyle(handle)}
          {...resizeHandleProps(handle)}
        />
      ))}
    </>
  )
}