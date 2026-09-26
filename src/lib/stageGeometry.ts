import type { CSSProperties } from 'react'
import type { TerrainDocument } from '../types/terrain'

export function buildStageStyle(terrain: TerrainDocument, zoom: number): CSSProperties {
  const gridAlpha = terrain.gridSize < 16 ? 0.06 : 0.12
  return {
    width: `${terrain.width}px`,
    height: `${terrain.height}px`,
    backgroundColor: terrain.backgroundColor,
    backgroundImage: `linear-gradient(rgba(103, 40, 133, ${gridAlpha}) 1px, transparent 1px), linear-gradient(90deg, rgba(103, 40, 133, ${gridAlpha}) 1px, transparent 1px)`,
    backgroundSize: `${terrain.gridSize}px ${terrain.gridSize}px`,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    '--stage-zoom': zoom,
  } as CSSProperties
}
