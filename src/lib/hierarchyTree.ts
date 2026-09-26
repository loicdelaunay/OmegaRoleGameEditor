import { normalizeInspectorSearchQuery } from './inspectorSearch'
import type { TerrainItem } from '../types/terrain'
import type { HierarchyNode } from '../types/hierarchy'

export function buildHierarchyNodes(
  items: TerrainItem[],
  layerId: string,
  parentId: string | null,
  searchQuery: string = ''
): HierarchyNode[] {
  const normalizedQuery = searchQuery ? normalizeInspectorSearchQuery(searchQuery) : ''

  return items
    .filter((item) => item.layerId === layerId && item.parentId === parentId)
    .map((item) => {
      const children = buildHierarchyNodes(items, layerId, item.id, searchQuery)
      const matchesQuery = !normalizedQuery || normalizeInspectorSearchQuery(item.name || '').includes(normalizedQuery)

      if (normalizedQuery && !matchesQuery && children.length === 0) {
        return null
      }

      return {
        item,
        children,
      }
    })
    .filter((node): node is HierarchyNode => node !== null)
}

export function flattenHierarchyNodes(nodes: HierarchyNode[]): string[] {
  return nodes.flatMap((node) => [node.item.id, ...flattenHierarchyNodes(node.children)])
}
