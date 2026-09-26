import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizePaletteColor } from './terrain'

/**
 * Fichier de palette de couleurs globale du workfolder.
 * Format : { "colors": ["#ffffff", "#ff0000", ...] }
 */
const COLOR_PALETTE_FILE = 'colors.color.json'

const DEFAULT_PALETTE = [
  '#ffffff', '#e6e8eb', '#bcc3cc', '#737b86', '#101418',
  '#a9d6ff', '#b8b2ff', '#4c3f91', '#f3a6c8', '#9ad9b2',
  '#2f7d5b', '#8a644e', '#ffb86b', '#ff7d7d', '#f3da72',
]

export interface ColorPaletteApi {
  /** Palette globale (workfolder) — utilisable de partout. */
  palette: string[]
  /** Ajoute une couleur à la palette globale (dédoublonnée). */
  addColor: (color: string) => void
  /** Supprime une couleur de la palette globale. */
  removeColor: (color: string) => void
  /** Recharge la palette depuis le workfolder. */
  reload: () => void
  /** Le handle du workfolder actuellement lié. */
  workfolderHandle: any
  /** Lie un workfolder à la palette (charge + active l'auto-save). */
  setWorkfolderHandle: (handle: any) => void
}

/**
 * Hook de gestion d'une palette de couleurs globale sauvegardée dans
 * `colors.color.json` au niveau du workfolder.
 *
 * - Au `setWorkfolderHandle`, charge automatiquement la palette depuis le fichier.
 * - Chaque modification (add/remove) persiste immédiatement dans le fichier.
 * - Si le fichier n'existe pas, la palette par défaut est utilisée.
 * - Utilisable de partout : il suffit d'avoir une seule instance partagée
 *   (via Context ou props) et d'appeler `addColor`/`removeColor`.
 *
 * @example
 * const colorPalette = useColorPalette()
 * colorPalette.setWorkfolderHandle(workfolderHandle)
 * <ColorPickerField palette={colorPalette.palette} onAddPreference={colorPalette.addColor} ... />
 */
export function useColorPalette(): ColorPaletteApi {
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE)
  const [workfolderHandle, setWorkfolderHandleState] = useState<any>(null)
  const handleRef = useRef<any>(null)

  const loadFromFile = useCallback(async (handle: any) => {
    if (!handle) return
    try {
      const fileHandle = await handle.getFileHandle(COLOR_PALETTE_FILE)
      const file = await fileHandle.getFile()
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed.colors)) {
        const colors = parsed.colors
          .filter((c: unknown) => typeof c === 'string')
          .map((c: string) => normalizePaletteColor(c))
        setPalette(colors.length > 0 ? colors : DEFAULT_PALETTE)
      }
    } catch {
      // Fichier absent — on garde la palette par défaut
    }
  }, [])

  const saveToFile = useCallback(async (colors: string[], handle?: any) => {
    const dir = handle ?? handleRef.current
    if (!dir) return
    try {
      const fileHandle = await dir.getFileHandle(COLOR_PALETTE_FILE, { create: true })
      const writable = await (fileHandle as any).createWritable()
      await writable.write(JSON.stringify({ colors }, null, 2))
      await writable.close()
    } catch (e) {
      console.error('Failed to save colors.color.json', e)
    }
  }, [])

  const setWorkfolderHandle = useCallback((handle: any) => {
    handleRef.current = handle
    setWorkfolderHandleState(handle)
    if (handle) {
      void loadFromFile(handle)
    }
  }, [loadFromFile])

  const addColor = useCallback((color: string) => {
    const normalized = normalizePaletteColor(color)
    setPalette((current) => {
      if (current.includes(normalized)) return current
      const next = [...current, normalized]
      void saveToFile(next)
      return next
    })
  }, [saveToFile])

  const removeColor = useCallback((color: string) => {
    const normalized = normalizePaletteColor(color)
    setPalette((current) => {
      const next = current.filter((c) => c !== normalized)
      void saveToFile(next)
      return next
    })
  }, [saveToFile])

  const reload = useCallback(() => {
    if (handleRef.current) {
      void loadFromFile(handleRef.current)
    }
  }, [loadFromFile])

  // Nettoyage
  useEffect(() => {
    return () => {
      handleRef.current = null
    }
  }, [])

  return {
    palette,
    addColor,
    removeColor,
    reload,
    workfolderHandle,
    setWorkfolderHandle,
  }
}