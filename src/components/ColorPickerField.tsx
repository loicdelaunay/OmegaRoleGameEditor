import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { normalizePaletteColor } from '../lib/terrain'

export interface ColorPickerFieldProps {
  /** Couleur actuelle (hex). */
  value: string
  /** Palette de couleurs prédéfinies affichées en swatches (dans le popover). */
  palette: string[]
  /** Callback appelé quand l'utilisateur change la couleur. */
  onChange: (color: string) => void
  /** Callback pour ajouter la couleur actuelle à la palette (bouton +). */
  onAddPreference: (color: string) => void
  /** Callback optionnel pour supprimer une couleur de la palette (clic droit / Ctrl+clic sur swatch). */
  onRemovePreference?: (color: string) => void
  /** Classe CSS additionnelle. */
  className?: string
  /** Délai de debounce en ms pour le color input natif (default: 0 = rAF coalescing). */
  debounceMs?: number
}

/**
 * ## ColorPickerField
 *
 * Sélecteur de couleur compact Material Design 3 :
 * - Par défaut, affiche **uniquement** la couleur sélectionnée (un swatch cliquable).
 * - Au clic, ouvre un **popover** contenant :
 *   - Le `<input type="color">` natif (debouncé anti-lag).
 *   - Le bouton "+" pour ajouter la couleur à la palette.
 *   - La rangée de swatches (palette).
 * - Suppression d'une couleur de la palette via clic droit (ou Ctrl+clic) si
 *   `onRemovePreference` est fourni.
 *
 * ### Performance (anti-lag)
 * Le `<input type="color">` natif émet un `input` event à chaque pixel de drag
 * (175 Hz sur certains écrans). Sans debounce, cela déclenche un `setState`
 * React par event → re-render complet → lag.
 *
 * Solution : on debounche l'`onChange` via `requestAnimationFrame` (coalescing).
 * La couleur est commit une fois par frame max (60 fps), ce qui élimine le lag.
 * Le commit final se fait au `change` (release du picker).
 *
 * @example
 * ```tsx
 * <ColorPickerField
 *   value={item.color}
 *   palette={colorPalette.palette}
 *   onChange={(c) => updateItem({ color: c })}
 *   onAddPreference={colorPalette.addColor}
 *   onRemovePreference={colorPalette.removeColor}
 * />
 * ```
 */
export function ColorPickerField({
  value,
  palette,
  onChange,
  onAddPreference,
  onRemovePreference,
  className,
  debounceMs = 0,
}: ColorPickerFieldProps) {
  const normalizedValue = normalizePaletteColor(value)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingColorRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const swatchRef = useRef<HTMLButtonElement | null>(null)

  // Commit la couleur debouncée
  const flushColor = useCallback(() => {
    rafRef.current = null
    if (pendingColorRef.current !== null) {
      onChange(pendingColorRef.current)
      pendingColorRef.current = null
    }
  }, [onChange])

  const scheduleCommit = useCallback(() => {
    if (debounceMs > 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flushColor, debounceMs)
    } else {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushColor)
      }
    }
  }, [debounceMs, flushColor])

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Ferme le popover si on clique en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || swatchRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const handleColorInput = useCallback((raw: string) => {
    pendingColorRef.current = normalizePaletteColor(raw)
    scheduleCommit()
  }, [scheduleCommit])

  const handleSwatchRemove = useCallback((color: string, e: React.MouseEvent) => {
    if (!onRemovePreference) return
    if (e.button === 2) {
      e.preventDefault()
      e.stopPropagation()
      onRemovePreference(color)
    }
  }, [onRemovePreference])

  return (
    <div className={className ? `color-picker-field ${className}` : 'color-picker-field'} style={{ position: 'relative' }}>
      {/* Swatch compact — affiche uniquement la couleur sélectionnée */}
      <button
        ref={swatchRef}
        type="button"
        className="color-swatch active color-picker-trigger"
        title={`Couleur: ${normalizedValue} — cliquer pour ouvrir la palette`}
        aria-label={`Couleur ${normalizedValue}, cliquer pour ouvrir la palette`}
        style={{ '--swatch-color': normalizedValue } as CSSProperties}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span />
      </button>

      {/* Popover palette */}
      {open && (
        <div ref={popoverRef} className="color-picker-popover surface-container-low">
          <div className="color-picker-input-row">
            <input
              type="color"
              value={normalizedValue}
              onInput={(e) => handleColorInput((e.target as HTMLInputElement).value)}
              onChange={(e) => {
                if (timerRef.current) {
                  clearTimeout(timerRef.current)
                  timerRef.current = null
                }
                if (rafRef.current !== null) {
                  window.cancelAnimationFrame(rafRef.current)
                  rafRef.current = null
                }
                pendingColorRef.current = null
                onChange(normalizePaletteColor(e.target.value))
              }}
            />
            <button
              type="button"
              className="ghost compact-icon-button color-picker-add"
              title="Ajouter cette couleur à la palette"
              aria-label="Ajouter cette couleur à la palette"
              onMouseDown={(event) => {
                event.preventDefault()
                onAddPreference(normalizedValue)
              }}
            >
              +
            </button>
          </div>
          <div className="color-picker-palette">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                className={normalizedValue === color ? 'color-swatch active' : 'color-swatch'}
                title={onRemovePreference ? `${color} — clic droit ou Ctrl+clic pour supprimer` : color}
                aria-label={`Choisir ${color}`}
                style={{ '--swatch-color': color } as CSSProperties}
                onMouseDown={(event) => {
                  event.preventDefault()
                  onChange(color)
                }}
                onContextMenu={(e) => handleSwatchRemove(color, e)}
                onClick={(e) => {
                  if (onRemovePreference && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    onRemovePreference(color)
                  }
                }}
              >
                <span />
                {onRemovePreference && (
                  <span className="color-swatch-remove" aria-hidden="true">×</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}