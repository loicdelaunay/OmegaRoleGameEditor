import type { GeneratedAsset, TerrainDocument, TerrainItem, TerrainItemKind, TerrainLayer } from '../types/terrain'

const DEFAULT_GENERATED_ASSET_COLOR = '#147a78'
const DEFAULT_ITEM_OUTLINE_COLOR = '#ffffff'
export const DEFAULT_PLAYER_COLOR = '#147a78'
export const DEFAULT_TERRAIN_COLOR_PALETTE = [
  '#ffffff',
  '#e6e8eb',
  '#bcc3cc',
  '#737b86',
  '#101418',
  '#a9d6ff',
  '#b8b2ff',
  '#4c3f91',
  '#f3a6c8',
  '#9ad9b2',
  '#2f7d5b',
  '#8a644e',
  '#ffb86b',
  '#ff7d7d',
  '#f3da72',
] as const

export function generateClientId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function createId() {
  return generateClientId()
}

export function createLayer(name: string): TerrainLayer {
  return {
    id: createId(),
    name,
    visible: true,
  }
}

export function createDefaultTerrain(): TerrainDocument {
  const baseLayer = createLayer('Fond de scene')

  return {
    version: 1,
    name: 'Nouveau terrain',
    width: 1600,
    height: 900,
    gridSize: 64,
    backgroundColor: '#e8dfc9',
    colorPalette: [...DEFAULT_TERRAIN_COLOR_PALETTE],
    audio: null,
    soundboard: [],
    libraryTabs: [],
    layers: [baseLayer],
    items: [],
    updatedAt: new Date().toISOString(),
  }
}

export function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function normalizeGeneratedAssetColor(value: string) {
  const normalized = value.trim()
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)
    ? normalized
    : DEFAULT_GENERATED_ASSET_COLOR
}

export function normalizePaletteColor(value: string, fallback: string = DEFAULT_TERRAIN_COLOR_PALETTE[0]) {
  const normalized = value.trim()
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toLowerCase() : fallback
}

export function normalizeTerrainColorPalette(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_TERRAIN_COLOR_PALETTE]
  }

  const seen = new Set<string>()
  const palette: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    const color = normalizePaletteColor(entry)
    if (seen.has(color)) {
      continue
    }

    seen.add(color)
    palette.push(color)
  }

  return palette.length > 0 ? palette : [...DEFAULT_TERRAIN_COLOR_PALETTE]
}

export function buildGeneratedAssetSvg(asset: GeneratedAsset) {
  const fill = normalizeGeneratedAssetColor(asset.fill)
  const svgOpenTag = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" preserveAspectRatio="none">'

  switch (asset.preset) {
    case 'square':
      return [
        svgOpenTag,
        `  <rect x="0" y="0" width="512" height="512" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'rounded-square':
      return [
        svgOpenTag,
        `  <rect x="0" y="0" width="512" height="512" rx="112" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'circle':
      return [
        svgOpenTag,
        `  <circle cx="256" cy="256" r="256" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'triangle':
      return [
        svgOpenTag,
        `  <path d="M256 0L512 512H0L256 0Z" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'diamond':
      return [
        svgOpenTag,
        `  <path d="M256 0L512 256L256 512L0 256L256 0Z" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'hexagon':
      return [
        svgOpenTag,
        `  <path d="M128 0H384L512 256L384 512H128L0 256L128 0Z" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'star':
      return [
        svgOpenTag,
        `  <path d="M256 0L318.91 174.91L512 194.24L366 324.98L411.98 512L256 419.84L100.02 512L146 324.98L0 194.24L193.09 174.91L256 0Z" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    case 'arrow-right':
      return [
        svgOpenTag,
        `  <path d="M0 192H256V64L512 256L256 448V320H0V192Z" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
    default:
      return [
        svgOpenTag,
        `  <rect x="0" y="0" width="512" height="512" rx="112" fill="${fill}" />`,
        '</svg>',
      ].join('\n')
  }
}

export function buildGeneratedAssetDataUrl(asset: GeneratedAsset) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildGeneratedAssetSvg(asset))}`
}

export function createGeneratedAssetFile(name: string, asset: GeneratedAsset) {
  const safeBaseName = name.trim().replace(/[\\/:*?"<>|]+/g, ' ') || 'carre-rond'
  return new File([buildGeneratedAssetSvg(asset)], `${safeBaseName}.svg`, { type: 'image/svg+xml' })
}

function parseGeneratedAsset(value: unknown): GeneratedAsset | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<GeneratedAsset>
  if (
    candidate.preset !== 'square' &&
    candidate.preset !== 'rounded-square' &&
    candidate.preset !== 'circle' &&
    candidate.preset !== 'triangle' &&
    candidate.preset !== 'diamond' &&
    candidate.preset !== 'hexagon' &&
    candidate.preset !== 'star' &&
    candidate.preset !== 'arrow-right'
  ) {
    return undefined
  }

  return {
    preset: candidate.preset,
    fill: normalizeGeneratedAssetColor(typeof candidate.fill === 'string' ? candidate.fill : DEFAULT_GENERATED_ASSET_COLOR),
  }
}

export function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({
        width: image.naturalWidth || 256,
        height: image.naturalHeight || 256,
      })
    }
    image.onerror = () => reject(new Error('Impossible de charger l image importee.'))
    image.src = src
  })
}

export function convertDataUrlToWebp(dataUrl: string, quality = 0.8): Promise<string> {
  if (
    !dataUrl.startsWith('data:image/') ||
    dataUrl.startsWith('data:image/webp') ||
    dataUrl.startsWith('data:image/svg+xml')
  ) {
    return Promise.resolve(dataUrl)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }
        ctx.drawImage(img, 0, 0)
        const webpDataUrl = canvas.toDataURL('image/webp', quality)
        if (webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl)
        } else {
          resolve(dataUrl)
        }
      } catch (err) {
        console.error('Failed to convert image to webp:', err)
        resolve(dataUrl)
      }
    }
    img.onerror = () => {
      resolve(dataUrl)
    }
    img.src = dataUrl
  })
}

export type TrimImageResult = {
  src: string
  cropInfo?: {
    top: number
    bottom: number
    left: number
    right: number
    oldWidth: number
    oldHeight: number
    newWidth: number
    newHeight: number
  }
}

export function trimImageTransparentPixels(dataUrl: string): Promise<TrimImageResult> {
  if (!dataUrl.startsWith('data:image/')) {
    return Promise.resolve({ src: dataUrl })
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || img.width
        const height = img.naturalHeight || img.height
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve({ src: dataUrl })
          return
        }
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        let top = 0, bottom = height, left = 0, right = width

        topSearch: for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              top = y
              break topSearch
            }
          }
        }

        if (top === height) {
          resolve({ src: dataUrl })
          return
        }

        bottomSearch: for (let y = height - 1; y >= 0; y--) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              bottom = y + 1
              break bottomSearch
            }
          }
        }

        leftSearch: for (let x = 0; x < width; x++) {
          for (let y = top; y < bottom; y++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              left = x
              break leftSearch
            }
          }
        }

        rightSearch: for (let x = width - 1; x >= 0; x--) {
          for (let y = top; y < bottom; y++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              right = x + 1
              break rightSearch
            }
          }
        }

        const newWidth = right - left
        const newHeight = bottom - top

        if (newWidth === width && newHeight === height) {
          resolve({ src: dataUrl })
          return
        }

        const trimmedCanvas = document.createElement('canvas')
        trimmedCanvas.width = newWidth
        trimmedCanvas.height = newHeight
        const trimmedCtx = trimmedCanvas.getContext('2d')
        if (!trimmedCtx) {
          resolve({ src: dataUrl })
          return
        }

        trimmedCtx.putImageData(ctx.getImageData(left, top, newWidth, newHeight), 0, 0)
        
        resolve({
          src: trimmedCanvas.toDataURL('image/webp', 0.9),
          cropInfo: {
            top, bottom, left, right,
            oldWidth: width,
            oldHeight: height,
            newWidth, newHeight
          }
        })
      } catch (err) {
        console.error('Failed to trim image:', err)
        resolve({ src: dataUrl })
      }
    }
    img.onerror = () => resolve({ src: dataUrl })
    img.src = dataUrl
  })
}

export async function createItemFromFile(
  file: File,
  layerId: string,
  parentId: string | null,
  kind: TerrainItemKind,
  index: number,
): Promise<TerrainItem> {
  const src = await fileToDataUrl(file)
  const isAudio = file.type.startsWith('audio/')
  const isMapAudio = kind === 'audio' || isAudio
  
  let width = 64
  let height = 64
  let scale = 1

  if (!isMapAudio) {
    const dims = await loadImageDimensions(src)
    width = dims.width
    height = dims.height
    const maxEdge = kind === 'token' ? 120 : 520
    scale = Math.min(1, maxEdge / Math.max(width, height))
  }

  return {
    id: createId(),
    layerId,
    parentId,
    locked: false,
    name: file.name.replace(/\.[^.]+$/, ''),
    note: '',
    notePlayers: '',
    noteVisibleToPlayers: false,
    tokenPanelEnabled: false,
    tokenPanelText: '',
    kind: isMapAudio ? 'audio' : kind,
    src,
    x: 72 + index * 28,
    y: 72 + index * 28,
    width: isMapAudio ? 64 : Math.max(48, Math.round(width * scale)),
    height: isMapAudio ? 64 : Math.max(48, Math.round(height * scale)),
    scale: 1,
    flipX: false,
    flipY: false,
    rotation: 0,
    outlineEnabled: false,
    outlineWidth: 0,
    outlineColor: DEFAULT_ITEM_OUTLINE_COLOR,
    grayscaleEnabled: false,
    rippleEnabled: false,
    opacity: 1,
    visible: true,
    ...(isMapAudio ? {
      audioSpatialized: true,
      audio3D: false,
      audioRange: 1000,
      audioLoop: false,
      audioPlaying: false,
    } : {})
  }
}

// Memoization cache: if the same terrain object reference is passed again,
// return the cached sanitized result instead of recomputing.
let _sanitizeCacheInput: TerrainDocument | null = null
let _sanitizeCacheOutput: TerrainDocument | null = null

export function sanitizeTerrainForPlayers(terrain: TerrainDocument): TerrainDocument {
  if (_sanitizeCacheInput === terrain && _sanitizeCacheOutput) {
    return _sanitizeCacheOutput
  }

  const visibleLayers = terrain.layers.filter((layer) => layer.visible)
  const visibleLayerIds = new Set(visibleLayers.map((layer) => layer.id))
  const itemMap = new Map(terrain.items.map((item) => [item.id, item]))

  function isVisibleInBranch(item: TerrainItem) {
    let current: TerrainItem | undefined = item

    while (current) {
      if (!current.visible) {
        return false
      }

      current = current.parentId ? itemMap.get(current.parentId) : undefined
    }

    return true
  }

  const result: TerrainDocument = {
    ...terrain,
    layers: visibleLayers,
    audio: terrain.audio ?? null,
    items: terrain.items
      .filter((item) => visibleLayerIds.has(item.layerId) && isVisibleInBranch(item) && (item.kind !== 'note' || item.noteVisibleToPlayers === true))
      .map((item) => ({
        ...item,
        note: item.notePlayers || '',
      })),
  }

  _sanitizeCacheInput = terrain
  _sanitizeCacheOutput = result
  return result
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export async function hashImageVisually(src: string): Promise<string> {
  if (!src.startsWith('data:image/')) return src

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(src)
        
        ctx.drawImage(img, 0, 0, 32, 32)
        resolve(canvas.toDataURL('image/webp', 0.5))
      } catch {
        resolve(src)
      }
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

async function hashStringSHA1(str: string) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  const buffer = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-1', buffer)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function deduplicateTerrainAssets(terrain: TerrainDocument): Promise<TerrainDocument> {
  const assets: Record<string, string> = {}
  const nextItems = [...terrain.items]
  
  for (let i = 0; i < nextItems.length; i++) {
    const item = nextItems[i]
    if (item.src && item.src.startsWith('data:') && item.src.length > 512) {
      const hash = (await hashStringSHA1(item.src)) || generateClientId()
      assets[hash] = item.src
      nextItems[i] = { ...item, src: `asset://${hash}` }
    }
  }

  return {
    ...terrain,
    items: nextItems,
    assets
  }
}

export function parseTerrainDocument(raw: string): TerrainDocument | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TerrainDocument>

    if (!Array.isArray(parsed.layers) || !Array.isArray(parsed.items)) {
      return null
    }

    const layers = parsed.layers
      .map((layer, index) => ({
        id: normalizeString(layer?.id, createId()),
        name: normalizeString(layer?.name, `Calque ${index + 1}`),
        visible: layer?.visible !== false,
      }))
      .filter((layer) => layer.id)

    if (layers.length === 0) {
      layers.push(createLayer('Fond de scene'))
    }

    const layerIds = new Set(layers.map((layer) => layer.id))
    const itemIds = new Set(
      parsed.items
        .map((item) => (typeof item?.id === 'string' ? item.id : null))
        .filter((itemId): itemId is string => Boolean(itemId)),
    )

    const assets = parsed.assets && typeof parsed.assets === 'object' ? (parsed.assets as Record<string, string>) : {}

    return {
      version: 1,
      name: normalizeString(parsed.name, 'Terrain importe'),
      width: Math.max(400, normalizeNumber(parsed.width, 1600)),
      height: Math.max(300, normalizeNumber(parsed.height, 900)),
      gridSize: Math.max(16, normalizeNumber(parsed.gridSize, 64)),
      backgroundColor: normalizeString(parsed.backgroundColor, '#e8dfc9'),
      colorPalette: normalizeTerrainColorPalette(parsed.colorPalette),
      audio:
        parsed.audio && typeof parsed.audio === 'object' && typeof parsed.audio.src === 'string'
          ? {
              name: normalizeString(parsed.audio.name, 'Ambiance'),
              src: normalizeString(parsed.audio.src, ''),
            }
          : null,
      soundboard: Array.isArray(parsed.soundboard)
        ? parsed.soundboard.map((item) => ({
            id: normalizeString(item?.id, createId()),
            name: normalizeString(item?.name, 'Son'),
            src: normalizeString(item?.src, ''),
            defaultRange: normalizeNumber(item?.defaultRange, 1000),
          })).filter(item => item.src)
        : [],
      libraryTabs: Array.isArray(parsed.libraryTabs)
        ? parsed.libraryTabs.map(t => ({
            id: typeof t?.id === 'string' ? t.id : createId(),
            name: typeof t?.name === 'string' ? t.name : 'Tab',
          }))
        : [],
      preallocationEnabled: parsed.preallocationEnabled === true,
      youtubeHistory: Array.isArray(parsed.youtubeHistory) ? parsed.youtubeHistory.map(String) : [],
      youtubeBookmarks: Array.isArray(parsed.youtubeBookmarks) ? parsed.youtubeBookmarks.map(String) : [],
      youtubeTitles: parsed.youtubeTitles && typeof parsed.youtubeTitles === 'object' ? (parsed.youtubeTitles as Record<string, string>) : undefined,
      predeclaredPlayers: Array.isArray(parsed.predeclaredPlayers)
        ? parsed.predeclaredPlayers
            .filter((p): p is any => typeof p === 'object' && p !== null && typeof (p as any).id === 'string')
            .map((p) => ({
              id: String(p.id),
              name: String(p.name ?? '').slice(0, 24) || 'Joueur',
              color: normalizePaletteColor(String(p.color || DEFAULT_PLAYER_COLOR)),
              connectedPlayerId: null,
            }))
        : [],
      tokenAssignments: parsed.tokenAssignments && typeof parsed.tokenAssignments === 'object' 
        ? (parsed.tokenAssignments as Record<string, import('../types/terrain').TokenAssignment>)
        : undefined,
      phoneVirtualContacts: Array.isArray(parsed.phoneVirtualContacts)
        ? parsed.phoneVirtualContacts
            .filter((c): c is any => typeof c === 'object' && c !== null && typeof (c as any).id === 'string' && typeof (c as any).name === 'string')
            .map((c) => ({
              id: String(c.id),
              name: String(c.name).slice(0, 32),
              color: normalizePaletteColor(String(c.color || DEFAULT_PLAYER_COLOR)),
            }))
        : undefined,
      layers,
      items: parsed.items
        .map((item) => {
          const generatedAsset = parseGeneratedAsset(item?.generatedAsset)

          return {
            id: normalizeString(item?.id, createId()),
            layerId: layerIds.has(String(item?.layerId)) ? String(item?.layerId) : layers[0].id,
            parentId:
              typeof item?.parentId === 'string' && itemIds.has(item.parentId) ? item.parentId : null,
            locked: item?.locked === true,
            name: normalizeString(item?.name, 'Element'),
            note: typeof item?.note === 'string' ? item.note : '',
            notePlayers: typeof item?.notePlayers === 'string' ? item.notePlayers : (item?.noteVisibleToPlayers === true ? (item?.note || '') : ''),
            noteVisibleToPlayers: item?.noteVisibleToPlayers === true,
            noteColor: typeof item?.noteColor === 'string' ? item.noteColor : undefined,
            tokenPanelEnabled: item?.tokenPanelEnabled === true,
            tokenPanelText: typeof item?.tokenPanelText === 'string' ? item.tokenPanelText : '',
            kind: (item?.kind === 'token' ? 'token' : item?.kind === 'shadow' ? 'shadow' : item?.kind === 'audio' ? 'audio' : item?.kind === 'light' ? 'light' : item?.kind === 'note' ? 'note' : item?.kind === 'empty' ? 'empty' : 'image') as TerrainItemKind,
            src: generatedAsset ? buildGeneratedAssetDataUrl(generatedAsset) : (() => {
              const rawSrc = normalizeString(item?.src, '')
              if (rawSrc.startsWith('asset://')) {
                const assetId = rawSrc.slice(8)
                return assets[assetId] || ''
              }
              return rawSrc
            })(),
            generatedAsset,
            x: normalizeNumber(item?.x, 0),
            y: normalizeNumber(item?.y, 0),
            width: Math.max(16, normalizeNumber(item?.width, 96)),
            height: Math.max(16, normalizeNumber(item?.height, 96)),
            scale: Math.max(0.05, normalizeNumber(item?.scale, 1)),
            flipX: item?.flipX === true,
            flipY: item?.flipY === true,
            rotation: normalizeNumber(item?.rotation, 0),
            shadowPoints: Array.isArray(item?.shadowPoints) ? item.shadowPoints : undefined,
            effects: Array.isArray(item?.effects) ? item.effects : undefined,
            outlineEnabled:
              item?.outlineEnabled === true || Math.max(0, Math.min(32, normalizeNumber(item?.outlineWidth, 0))) > 0,
            outlineWidth: Math.max(0, Math.min(32, normalizeNumber(item?.outlineWidth, 0))),
            outlineColor: normalizePaletteColor(
              typeof item?.outlineColor === 'string' ? item.outlineColor : DEFAULT_ITEM_OUTLINE_COLOR,
              DEFAULT_ITEM_OUTLINE_COLOR,
            ),
            grayscaleEnabled: item?.grayscaleEnabled === true,
            rippleEnabled: item?.rippleEnabled === true,
            opacity: Math.min(1, Math.max(0.1, normalizeNumber(item?.opacity, 1))),
            visible: item?.visible !== false,
            ...(item?.kind === 'audio' ? {
              audioSpatialized: item?.audioSpatialized !== false,
              audio3D: item?.audio3D === true,
              audioRange: normalizeNumber(item?.audioRange, 1000),
              audioLoop: item?.audioLoop === true,
              audioPlaying: item?.audioPlaying === true,
            } : {}),
            lightSourceHidden: item?.lightSourceHidden === true,
            isBuilding: item?.isBuilding === true,
            buildingRoofColor: normalizePaletteColor(
              typeof item?.buildingRoofColor === 'string' ? item.buildingRoofColor : '#000000',
              '#000000',
            ),
            ignoreBuildingMode: item?.ignoreBuildingMode === true,
          }
        })
        .filter((item) => item.src || ['shadow', 'note', 'light', 'audio', 'empty'].includes(item.kind)),
      updatedAt: normalizeString(parsed.updatedAt, new Date().toISOString()),
    }
  } catch {
    return null
  }
}