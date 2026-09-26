import type { TerrainItem } from './terrain'

export type HierarchyNode = {
  item: TerrainItem
  children: HierarchyNode[]
}

export type HierarchyDropIndicator = {
  mode: 'before' | 'child' | 'layer-root'
  targetItemId: string | null
  layerId: string
} | null
