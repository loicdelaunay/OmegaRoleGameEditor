import { clamp } from './math'
import type { ResolvedItem, TerrainDocument, TerrainItem, ResizeHandle } from '../types/terrain'

export const DEFAULT_TRANSFORM: ResolvedItem = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
}

/** Rotation 2D d'un point autour de l'origine (angle en degrés). */
export function rotatePoint(x: number, y: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

/** Normalise un angle dans [0, 360). */
export function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360
}

/** Convertit un point monde en coordonnées locales par rapport au parent. */
export function toLocalPoint(worldX: number, worldY: number, parent: ResolvedItem) {
  const deltaX = worldX - parent.x
  const deltaY = worldY - parent.y
  const unrotated = rotatePoint(deltaX, deltaY, -parent.rotation)

  return {
    x: unrotated.x / parent.scale,
    y: unrotated.y / parent.scale,
  }
}

/**
 * Construit la map des transformations résolues (monde) pour chaque item
 * en combinant les transformations parent-enfant récursivement.
 */
export function buildResolvedItemMap(terrain: TerrainDocument) {
  const itemMap = new Map(terrain.items.map((item) => [item.id, item]))
  const resolvedMap = new Map<string, ResolvedItem>()
  const resolving = new Set<string>()

  function resolve(itemId: string): ResolvedItem {
    if (resolvedMap.has(itemId)) {
      return resolvedMap.get(itemId) ?? DEFAULT_TRANSFORM
    }

    if (resolving.has(itemId)) {
      return DEFAULT_TRANSFORM
    }

    resolving.add(itemId)
    const item = itemMap.get(itemId)
    if (!item) {
      resolving.delete(itemId)
      return DEFAULT_TRANSFORM
    }

    const parent = item.parentId ? resolve(item.parentId) : DEFAULT_TRANSFORM
    const rotatedOffset = rotatePoint(item.x * parent.scale, item.y * parent.scale, parent.rotation)
    const resolved = {
      x: parent.x + rotatedOffset.x,
      y: parent.y + rotatedOffset.y,
      scale: parent.scale * item.scale,
      rotation: parent.rotation + item.rotation,
    }

    resolvedMap.set(itemId, resolved)
    resolving.delete(itemId)
    return resolved
  }

  for (const item of terrain.items) {
    resolve(item.id)
  }

  return resolvedMap
}

/**
 * Retourne la liste ordonnée des items rendables (visibles, calque visible,
 * branche parent visible) dans l'ordre de rendu calque par calque.
 */
export function getRenderableItems(terrain: TerrainDocument) {
  const itemMap = new Map(terrain.items.map((item) => [item.id, item]))
  const visibleLayerIds = new Set(terrain.layers.filter((layer) => layer.visible).map((layer) => layer.id))

  function branchIsVisible(item: TerrainItem) {
    let current: TerrainItem | undefined = item

    while (current) {
      if (!current.visible) {
        return false
      }

      current = current.parentId ? itemMap.get(current.parentId) : undefined
    }

    return true
  }

  const ordered: TerrainItem[] = []

  function visit(parentId: string | null, layerId: string) {
    for (const item of terrain.items) {
      if (item.layerId !== layerId || item.parentId !== parentId) {
        continue
      }

      if (visibleLayerIds.has(item.layerId) && branchIsVisible(item)) {
        ordered.push(item)
      }

      visit(item.id, layerId)
    }
  }

  for (const layer of terrain.layers) {
    visit(null, layer.id)
  }

  return ordered
}

/** Calcule l'ensemble des IDs descendants (incluant rootId) d'un item. */
export function getDescendantIds(items: TerrainItem[], rootId: string) {
  const ids = new Set<string>([rootId])
  let changed = true

  while (changed) {
    changed = false
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id)
        changed = true
      }
    }
  }

  return ids
}

/**
 * Calcule la bounding box (AABB) d'un item après transformation résolue.
 */
export function getResolvedItemBounds(item: TerrainItem, resolved: ResolvedItem) {
  const width = item.width * resolved.scale
  const height = item.height * resolved.scale
  const centerX = resolved.x + width / 2
  const centerY = resolved.y + height / 2
  const corners = [
    rotatePoint(-width / 2, -height / 2, resolved.rotation),
    rotatePoint(width / 2, -height / 2, resolved.rotation),
    rotatePoint(width / 2, height / 2, resolved.rotation),
    rotatePoint(-width / 2, height / 2, resolved.rotation),
  ]
  const xs = corners.map((corner) => centerX + corner.x)
  const ys = corners.map((corner) => centerY + corner.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

/** Construit la chaîne CSS `transform` pour un item (rotation + flip). */
export function buildItemCssTransform(flipX: boolean, flipY: boolean, rotation: number) {
  const scaleX = flipX ? -1 : 1
  const scaleY = flipY ? -1 : 1

  return `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`
}

/**
 * Reparente un item (et son sous-arbre) vers un nouveau parent/calque,
 * en recalculant les coordonnées locales pour préserver la position monde.
 */
export function relocateItem(
  terrain: TerrainDocument,
  itemId: string,
  nextParentId: string | null,
  nextLayerId: string,
  beforeId?: string,
) {
  const item = terrain.items.find((entry) => entry.id === itemId)
  if (!item) {
    return terrain
  }

  if (nextParentId === itemId) {
    return terrain
  }

  const descendants = getDescendantIds(terrain.items, itemId)
  if (nextParentId && descendants.has(nextParentId)) {
    return terrain
  }

  const resolved = buildResolvedItemMap(terrain)
  const currentWorld = resolved.get(itemId) ?? DEFAULT_TRANSFORM
  const nextParentTransform = nextParentId
    ? resolved.get(nextParentId) ?? DEFAULT_TRANSFORM
    : DEFAULT_TRANSFORM
  const nextLocal = toLocalPoint(currentWorld.x, currentWorld.y, nextParentTransform)
  const nextScale = clamp(currentWorld.scale / nextParentTransform.scale, 0.05, 64)
  const nextRotation = currentWorld.rotation - nextParentTransform.rotation

  const subtreeIds = getDescendantIds(terrain.items, itemId)
  const block = terrain.items.filter((entry) => subtreeIds.has(entry.id))
  const remaining = terrain.items.filter((entry) => !subtreeIds.has(entry.id))
  const updatedBlock = block.map((entry) => {
    if (entry.id === itemId) {
      return {
        ...entry,
        parentId: nextParentId,
        layerId: nextLayerId,
        x: nextLocal.x,
        y: nextLocal.y,
        scale: nextScale,
        rotation: nextRotation,
      }
    }

    return {
      ...entry,
      layerId: nextLayerId,
    }
  })

  const insertionIndex = beforeId ? remaining.findIndex((entry) => entry.id === beforeId) : -1
  const nextItems = [...remaining]

  if (insertionIndex < 0) {
    nextItems.push(...updatedBlock)
  } else {
    nextItems.splice(insertionIndex, 0, ...updatedBlock)
  }

  return {
    ...terrain,
    items: nextItems,
  }
}

/** Test d'inclusion d'un point dans un polygone (ray casting). */
export function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>) {
  const x = point.x
  const y = point.y
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

/** Centre un conteneur scrollable sur un point monde. */
export function centerScrollablePoint(
  container: HTMLDivElement,
  worldX: number,
  worldY: number,
  contentWidth: number,
  contentHeight: number,
) {
  const maxScrollLeft = Math.max(0, contentWidth - container.clientWidth)
  const maxScrollTop = Math.max(0, contentHeight - container.clientHeight)

  container.scrollLeft = clamp(worldX - container.clientWidth / 2, 0, maxScrollLeft)
  container.scrollTop = clamp(worldY - container.clientHeight / 2, 0, maxScrollTop)
}

/** Verrouille le ratio largeur/hauteur lors d'un resize par coin. */
export function lockAspectRatioResize(startWidth: number, startHeight: number, rawWidth: number, rawHeight: number) {
  const safeStartWidth = Math.max(16, startWidth)
  const safeStartHeight = Math.max(16, startHeight)
  const aspectRatio = safeStartWidth / safeStartHeight
  const widthDelta = Math.abs(rawWidth - safeStartWidth) / safeStartWidth
  const heightDelta = Math.abs(rawHeight - safeStartHeight) / safeStartHeight

  if (widthDelta >= heightDelta) {
    let width = Math.max(16, rawWidth)
    let height = width / aspectRatio

    if (height < 16) {
      height = 16
      width = height * aspectRatio
    }

    if (width < 16) {
      width = 16
      height = width / aspectRatio
    }

    return { width, height }
  }

  let height = Math.max(16, rawHeight)
  let width = height * aspectRatio

  if (width < 16) {
    width = 16
    height = width / aspectRatio
  }

  if (height < 16) {
    height = 16
    width = height * aspectRatio
  }

  return { width, height }
}

/** Remappe un handle de resize en tenant compte des flips X/Y. */
export function remapResizeHandleForFlip(handle: ResizeHandle, flipX: boolean, flipY: boolean): ResizeHandle {
  let nextHandle = handle

  if (flipX) {
    switch (nextHandle) {
      case 'nw':
        nextHandle = 'ne'
        break
      case 'w':
        nextHandle = 'e'
        break
      case 'sw':
        nextHandle = 'se'
        break
      case 'ne':
        nextHandle = 'nw'
        break
      case 'e':
        nextHandle = 'w'
        break
      case 'se':
        nextHandle = 'sw'
        break
    }
  }

  if (flipY) {
    switch (nextHandle) {
      case 'nw':
        nextHandle = 'sw'
        break
      case 'n':
        nextHandle = 's'
        break
      case 'ne':
        nextHandle = 'se'
        break
      case 'sw':
        nextHandle = 'nw'
        break
      case 's':
        nextHandle = 'n'
        break
      case 'se':
        nextHandle = 'ne'
        break
    }
  }

  return nextHandle
}

export function isCornerResizeHandle(handle: ResizeHandle) {
  return handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw'
}

export function getResizeHandleVector(handle: ResizeHandle) {
  switch (handle) {
    case 'nw':
      return { x: -1, y: -1 }
    case 'n':
      return { x: 0, y: -1 }
    case 'ne':
      return { x: 1, y: -1 }
    case 'e':
      return { x: 1, y: 0 }
    case 'se':
      return { x: 1, y: 1 }
    case 's':
      return { x: 0, y: 1 }
    case 'sw':
      return { x: -1, y: 1 }
    case 'w':
      return { x: -1, y: 0 }
  }
}

export function getResizeHandleCursor(handle: ResizeHandle) {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
  }
}

export function getResizeAnchorLocalPoint(handle: ResizeHandle, width: number, height: number) {
  switch (handle) {
    case 'nw':
      return { x: width, y: height }
    case 'n':
      return { x: width / 2, y: height }
    case 'ne':
      return { x: 0, y: height }
    case 'e':
      return { x: 0, y: height / 2 }
    case 'se':
      return { x: 0, y: 0 }
    case 's':
      return { x: width / 2, y: 0 }
    case 'sw':
      return { x: width, y: 0 }
    case 'w':
      return { x: width, y: height / 2 }
  }
}

export function getTransformedLocalPointWorldOffset(
  localPoint: { x: number; y: number },
  item: ResolvedItem,
  width: number,
  height: number,
  flipX: boolean,
  flipY: boolean,
) {
  const centerOffsetX = (width * item.scale) / 2
  const centerOffsetY = (height * item.scale) / 2
  const localDeltaX = (localPoint.x - width / 2) * item.scale * (flipX ? -1 : 1)
  const localDeltaY = (localPoint.y - height / 2) * item.scale * (flipY ? -1 : 1)
  const rotatedDelta = rotatePoint(localDeltaX, localDeltaY, item.rotation)

  return {
    x: centerOffsetX + rotatedDelta.x,
    y: centerOffsetY + rotatedDelta.y,
  }
}

export function getTransformedLocalPointWorldPoint(
  localPoint: { x: number; y: number },
  item: ResolvedItem,
  width: number,
  height: number,
  flipX: boolean,
  flipY: boolean,
) {
  const offset = getTransformedLocalPointWorldOffset(localPoint, item, width, height, flipX, flipY)

  return {
    x: item.x + offset.x,
    y: item.y + offset.y,
  }
}

export function toTransformedItemLocalPoint(
  worldX: number,
  worldY: number,
  item: ResolvedItem,
  width: number,
  height: number,
  flipX: boolean,
  flipY: boolean,
) {
  const centerWorldX = item.x + (width * item.scale) / 2
  const centerWorldY = item.y + (height * item.scale) / 2
  const unrotated = rotatePoint(worldX - centerWorldX, worldY - centerWorldY, -item.rotation)

  return {
    x: (unrotated.x / item.scale) * (flipX ? -1 : 1) + width / 2,
    y: (unrotated.y / item.scale) * (flipY ? -1 : 1) + height / 2,
  }
}

/**
 * Détermine le handle de resize affiché (visuel) en fonction du handle logique,
 * des flips et de la rotation.
 */
export function getDisplayedResizeHandle(
  positionHandle: ResizeHandle,
  flipX: boolean,
  flipY: boolean,
  rotation: number,
): ResizeHandle {
  const baseVector = getResizeHandleVector(positionHandle)
  const flippedVector = {
    x: baseVector.x * (flipX ? -1 : 1),
    y: baseVector.y * (flipY ? -1 : 1),
  }
  const rotatedVector = rotatePoint(flippedVector.x, flippedVector.y, rotation)
  const candidates = isCornerResizeHandle(positionHandle)
    ? (['nw', 'ne', 'se', 'sw'] as ResizeHandle[])
    : (['n', 'e', 's', 'w'] as ResizeHandle[])

  return candidates.reduce((bestHandle, candidate) => {
    const candidateVector = getResizeHandleVector(candidate)
    const bestVector = getResizeHandleVector(bestHandle)
    const candidateDot = rotatedVector.x * candidateVector.x + rotatedVector.y * candidateVector.y
    const bestDot = rotatedVector.x * bestVector.x + rotatedVector.y * bestVector.y
    return candidateDot > bestDot ? candidate : bestHandle
  }, candidates[0])
}

/** Place un item sur la grille à un point d'insertion, avec snap optionnel. */
export function placeItemOnGrid(
  item: TerrainItem,
  point: { x: number; y: number },
  terrain: TerrainDocument,
  index: number,
  snapToGrid: boolean = true,
) {
  const grid = Math.max(1, terrain.gridSize)
  const rawX = point.x - item.width / 2 + index * grid
  const rawY = point.y - item.height / 2 + index * grid
  const maxX = Math.max(0, terrain.width - item.width)
  const maxY = Math.max(0, terrain.height - item.height)

  return {
    ...item,
    x: clamp(snapToGrid ? Math.round(rawX / grid) * grid : rawX, 0, maxX),
    y: clamp(snapToGrid ? Math.round(rawY / grid) * grid : rawY, 0, maxY),
  }
}

/** Distance entre deux points. */
export function formatMeasureDistance(start: { x: number; y: number }, end: { x: number; y: number }) {
  const distancePx = Math.hypot(end.x - start.x, end.y - start.y)
  const distanceMeters = distancePx / 100
  return `${distanceMeters.toFixed(1)} m`
}

/** Extension de fichier pour un type MIME d'image presse-papier. */
export function getClipboardImageExtension(type: string) {
  if (type === 'image/jpeg') {
    return 'jpg'
  }

  if (type === 'image/webp') {
    return 'webp'
  }

  if (type === 'image/gif') {
    return 'gif'
  }

  return 'png'
}

/** Vérifie qu'une cible d'event peut recevoir un raccourci clavier d'édition. */
export function canHandleEditorShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return true
  }

  const tagName = target.tagName.toLowerCase()
  return !(tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable)
}

/** Positionne un popup de présence sous un élément ancre, borné horizontalement. */
export function buildPresencePopupPosition(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect()
  return {
    top: rect.bottom + 8,
    left: clamp(rect.left + rect.width / 2, 112, window.innerWidth - 112),
  }
}

/** Style CSS d'une ligne de mesure entre deux points. */
export function buildMeasureLineStyle(start: { x: number; y: number }, end: { x: number; y: number }): import('react').CSSProperties {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const length = Math.hypot(deltaX, deltaY)
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI

  return {
    left: `${start.x}px`,
    top: `${start.y}px`,
    width: `${length}px`,
    transform: `rotate(${angle}deg)`,
  }
}