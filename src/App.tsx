import type { ChangeEvent, CSSProperties, DragEvent as ReactDragEvent } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { generateUUID } from './lib/uuid'
import {
  Music,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Dices,
  Eye,
  EyeOff,
  FolderOpen,
  FlipHorizontal,
  FlipVertical,
  LocateFixed,
  Map as MapIcon,
  Monitor,
  Move,
  Info,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCw,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  StickyNote,
  Timer as TimerIcon,
  Trash2,
  X,
} from 'lucide-react'
import { User, Users } from 'lucide-react'
import type { CharacterDocument } from './lib/character'
import { createDefaultCharacter, migrateCharacterDocument } from './lib/character'
import { CharacterSheetDialog } from './components/CharacterSheetDialog'
import { FloatingDialog } from './components/FloatingDialog'
import './components/project-dialog.css'
import { useColorPalette } from './lib/useColorPalette'
import './App.css'
import pkg from '../package.json'
import { BufferedNumberField } from './components/BufferedNumberField'
import { ColorPickerField } from './components/ColorPickerField'
import { DiceRollPopup } from './components/DiceRollPopup'
import { DiceToolbar } from './components/DiceToolbar'
import type { GMCharacterEntry } from './components/dice/GMCharacterDiceDropdown'
import type { CharacteristicEntry, CharacteristicConfig } from './lib/characteristics'
import { getKindIcon } from './components/HierarchyItemView'
import { InspectorSection } from './components/InspectorSection'
import { InspectorSearchBar } from './components/inspector/InspectorSearchBar'
import { InspectorNoteTextSection } from './components/inspector/sections/InspectorNoteTextSection'
import { InspectorAudioSection } from './components/inspector/sections/InspectorAudioSection'
import { InspectorStructureSection } from './components/inspector/sections/InspectorStructureSection'
import { InspectorIdentityNameSection } from './components/inspector/sections/InspectorIdentityNameSection'
import { InspectorGeometrySection } from './components/inspector/sections/InspectorGeometrySection'
import { InspectorOptionsSection } from './components/inspector/sections/InspectorOptionsSection'
import { InspectorOutlineSection } from './components/inspector/sections/InspectorOutlineSection'
import { InspectorTokenSection } from './components/inspector/sections/InspectorTokenSection'
import { PlayerStageRemoteCursors } from './components/player/PlayerStageRemoteCursors'
import { PlayerStageShadowZones } from './components/player/PlayerStageShadowZones'
import { PlayerStageNightOverlay } from './components/player/PlayerStageNightOverlay'
import { PlayerTopBar } from './components/player/PlayerTopBar'
import { HierarchyToolbar } from './components/hierarchy/HierarchyToolbar'
import { HierarchyItemList } from './components/hierarchy/HierarchyItemList'
import { ToolbarBrand } from './components/editor/toolbar/ToolbarBrand'
import { ToolbarProjetGroup } from './components/editor/toolbar/ToolbarProjetGroup'
import { ToolbarAssetsGroup } from './components/editor/toolbar/ToolbarAssetsGroup'
import { ToolbarAudioGroup } from './components/editor/toolbar/ToolbarAudioGroup'
import { ToolbarDownloadGroup } from './components/editor/toolbar/ToolbarDownloadGroup'
import { ToolbarToolsGroup } from './components/editor/toolbar/ToolbarToolsGroup'
import { ToolbarFicheGroup } from './components/editor/toolbar/ToolbarFicheGroup'
import { PhoneModule } from './components/PhoneModule'
import { StageItemSprite } from './components/StageItemSprite'
import { VirtualContactsDialog } from './components/VirtualContactsDialog'
import { MapAudioPlayer } from './components/MapAudioPlayer'
import { ChangelogDialog } from './components/ChangelogDialog'
import { AudioLoadDialog } from './components/dialogs/AudioLoadDialog'
import { DefaultLibraryDialog } from './components/dialogs/DefaultLibraryDialog'
import { ShortcutsDialog } from './components/dialogs/ShortcutsDialog'
import { ClientDialog } from './components/dialogs/ClientDialog'
import { DiceHistoryDialog } from './components/dialogs/DiceHistoryDialog'
import { HostDialog } from './components/dialogs/HostDialog'
import { SettingsDialog } from './components/dialogs/SettingsDialog'
import { TerrainDialog } from './components/dialogs/TerrainDialog'
import { TimerDialog } from './components/dialogs/TimerDialog'
import { BrowserSupportDialog } from './components/dialogs/BrowserSupportDialog'
import { useSharedTimers } from './hooks/useSharedTimers'
import { usePhone } from './hooks/usePhone'
import { useSharedAudio } from './hooks/useSharedAudio'
import { useWebSocketConnection } from './hooks/useWebSocketConnection'
import { useTerrain } from './hooks/useTerrain'
import { WorkfolderFilesList } from './components/WorkfolderFilesList'
import { CollapsibleSection } from './components/CollapsibleSection'
import { ProjectConfigSection } from './components/ProjectConfigSection'
import { ImageSizeInfo } from './components/ImageSizeInfo'
import { AssetPickerSection } from './components/AssetPickerSection'
import { AssetPickerDialog } from './components/AssetPickerDialog'
import { EffectPickerDialog } from './components/EffectPickerDialog'
import { AudioSizeInfo } from './components/AudioSizeInfo'
import { SceneReviewDialog } from './components/SceneReviewDialog'
import { MergeReviewDialog } from './components/MergeReviewDialog'
import {
  buildGeneratedAssetDataUrl,
  convertDataUrlToWebp,
  createGeneratedAssetFile,
  createDefaultTerrain,
  createItemFromFile,
  createLayer,
  DEFAULT_TERRAIN_COLOR_PALETTE,
  fileToDataUrl,
  generateClientId,
  generateRoomCode,
  loadImageDimensions,
  normalizeGeneratedAssetColor,
  normalizePaletteColor,
  parseTerrainDocument,
  sanitizeTerrainForPlayers,
  trimImageTransparentPixels,
  deduplicateTerrainAssets,
  hashImageVisually
} from './lib/terrain'
import { saveLibraryHandle, getLibraryHandle, removeLibraryHandle, saveTerrainSaveHandle } from './lib/idb'
import { readLastConfig, writeLastConfig, type LastConfig } from './lib/lastConfig'
import {
  buildDefaultProjectConfig,
  readProjectConfig,
  writeProjectConfig,
  getProjectConfigNumber,
  getProjectConfigValue,
  type ProjectConfig,
} from './lib/projectConfig'
import {
  LIBRARY_PREVIEW_SIZE_STORAGE_KEY,
  PING_DURATION_MS,
  DEFAULT_DICE_ROLL_ANIMATION_DURATION_MS,
  DEFAULT_DICE_RESULT_DISPLAY_DURATION_MS,
  DEFAULT_TURN_TRACKER_CUSTOM_COLOR,
  STATUS_SNACKBAR_DURATION_MS,
  MAX_STATUS_NOTIFICATIONS,
  MAX_DICE_HISTORY,
  MAX_ACTIVE_DICE_ROLLS,
  DEFAULT_HIERARCHY_PANEL_WIDTH,
  MIN_HIERARCHY_PANEL_WIDTH,
  MAX_HIERARCHY_PANEL_WIDTH,
  DEFAULT_INSPECTOR_PANEL_WIDTH,
  MIN_INSPECTOR_PANEL_WIDTH,
  MAX_INSPECTOR_PANEL_WIDTH,
  DEFAULT_PLAYER_COLOR,
  DEFAULT_LOCKED_TOKEN_ZOOM,
  DEFAULT_LOCKED_VIEW_SIZE,
  DEFAULT_FLASHLIGHT_DISTANCE,
  FLASHLIGHT_CONE_ANGLE_DEGREES,
  DEFAULT_FLASHLIGHT_OPACITY,
  DEFAULT_LIBRARY_ASSET_NAME,
  DEFAULT_LIBRARY_ASSET_PRESET,
  DEFAULT_STAT_SUCCESS_DIVISOR,
  DEFAULT_SUCCESS_MODIFIER_MIN,
  DEFAULT_SUCCESS_MODIFIER_MAX,
  DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT,
  DEFAULT_VITALS_WEIGHT_HEALTH,
  DEFAULT_VITALS_WEIGHT_MENTAL,
  DEFAULT_MONEY_SUFFIX,
  GENERATED_ASSET_PRESETS,
} from './lib/constants'
import type {
  GeneratedAsset,
  PredeclaredPlayer,
  RoomAudioState,
  RoomJoinConfig,
  RoomPlayer,
  TerrainDocument,
  TerrainItem,
  TerrainItemKind,
  TerrainLayer,
  TokenAssignment,
  PlayerViewMode,
  TurnTrackerEntry,
  TurnTrackerState,
  ResolvedItem,
  ResizeHandle,
} from './types/terrain'
import type {
  ThemeMode,
  DragState,
  ResizeState,
  RotationHoldState,
  PanState,
  PanelResizeState,
} from './types/app'
import type { HierarchyDropIndicator } from './types/hierarchy'
import type { PlayerViewPolicy, AssignablePlayerOption } from './types/room'
import type { DiceHistoryEntry, ActiveDiceRoll } from './types/dice'
import type { StatusNotification } from './types/notifications'
import type { MeasureOverlayState, SyncedMeasure } from './types/measure'
import type { PresencePopupState } from './types/presence'
import type { LibraryAsset, LibraryFolderNode } from './types/library'
import type {
  SaveFileHandleLike,
  SavePickerWindow,
  LibraryDirectoryHandleLike,
} from './types/savePicker'
import { clamp, getMapPoint } from './lib/math'
import {
  normalizeAngle,
  toLocalPoint,
  buildResolvedItemMap,
  getRenderableItems,
  getDescendantIds,
  getResolvedItemBounds,
  buildItemCssTransform,
  relocateItem,
  pointInPolygon,
  centerScrollablePoint,
  lockAspectRatioResize,
  remapResizeHandleForFlip,
  getResizeHandleCursor,
  getResizeAnchorLocalPoint,
  getTransformedLocalPointWorldOffset,
  getTransformedLocalPointWorldPoint,
  toTransformedItemLocalPoint,
  getDisplayedResizeHandle,
  placeItemOnGrid,
  formatMeasureDistance,
  getClipboardImageExtension,
  canHandleEditorShortcutTarget,
  buildPresencePopupPosition,
  buildMeasureLineStyle,
  DEFAULT_TRANSFORM,
} from './lib/stageMath'
import { FlashlightSystem } from './components/FlashlightSystem'
import { libraryAssetUrlCache } from './components/library/LibraryVirtualGrid'
import { LibraryPanel } from './components/library/LibraryPanel'
import { MapStatusBar } from './components/shared/MapStatusBar'
import { DragTooltip } from './components/shared/DragTooltip'
import { MassReparentingBanner } from './components/shared/MassReparentingBanner'
import { PredeclaredPlayerDialog } from './components/shared/PredeclaredPlayerDialog'
import { SharedAudioPlayer } from './components/shared/SharedAudioPlayer'
import { AudioErrorBoundary } from './components/shared/AudioErrorBoundary'
import { TimerPanel } from './components/shared/TimerPanel'
import { SoundboardPanel } from './components/shared/SoundboardPanel'
import { StatusNotifications } from './components/shared/StatusNotifications'
import { NoteTooltip } from './components/shared/NoteTooltip'
import { TurnTrackerPanel } from './components/shared/TurnTrackerPanel'
import { SoundboardPlacementCursor } from './components/editor/SoundboardPlacementCursor'
import { inferStatusTone } from './lib/status'
import { buildPlayerViewPolicies } from './lib/playerViewPolicies'
import { normalizeRoomJoinConfigMessage, buildJoinConfigUrl } from './lib/joinConfig'
import { extractYouTubeId } from './lib/youtube'
import { buildStageStyle } from './lib/stageGeometry'
import { buildHierarchyNodes, flattenHierarchyNodes } from './lib/hierarchyTree'
import { upsertRoomPlayer } from './lib/roomPlayers'
import { triggerLibraryProgress, type LibraryProgressContext } from './lib/libraryProgress'
import {
  pruneEmptyLibraryFolders,
  createLibraryAsset,
  isLibraryFileSupported,
  findLibraryFolder,
  buildLibraryBreadcrumbs,
  searchLibraryAssets,
  collectLibraryFolders,
  countLibraryAssets,
  countLibraryFolders,
} from './lib/library'
import {
  renderNoteHtml,
  sanitizeRichTextNote,
} from './lib/notes'
import { normalizeInspectorSearchQuery, sectionMatchesInspectorSearch } from './lib/inspectorSearch'

const INDEX_FILE_NAME = 'index.omegajdrdb'
const dirHandleCache = new Map<string, LibraryDirectoryHandleLike>()

async function readLibraryTreeFromHandle(
  rootHandle: LibraryDirectoryHandleLike,
  onProgress?: (root: LibraryFolderNode) => void,
  forceRescan = false
) {
  if (!forceRescan) {
    try {
      const fileHandle = await rootHandle.getFileHandle(INDEX_FILE_NAME)
      const file = await fileHandle.getFile()
      const text = await file.text()
      const cachedRoot = JSON.parse(text)
      if (cachedRoot && cachedRoot.id === 'root') {
        if (onProgress) onProgress(cachedRoot)
        return cachedRoot as LibraryFolderNode
      }
    } catch {
      // Ignore errors, proceed to full scan
    }
  }

  const root: LibraryFolderNode = {
    id: 'root',
    name: rootHandle.name || 'Bibliotheque',
    path: '',
    folders: [],
    assets: [],
  }

  const ctx: LibraryProgressContext = {
    lastTime: Date.now(),
    onProgress,
    rootNode: root
  }

  await populateLibraryFolder(rootHandle, root, '', ctx)

  root.folders = pruneEmptyLibraryFolders(root.folders)

  try {
    const fileHandle = await rootHandle.getFileHandle(INDEX_FILE_NAME, { create: true })
    if (fileHandle.createWritable) {
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(root))
      await writable.close()
    }
  } catch (error) {
    console.error('Failed to save library index', error)
  }

  return root
}

async function populateLibraryFolder(
  handle: LibraryDirectoryHandleLike,
  node: LibraryFolderNode,
  parentPath: string,
  ctx: LibraryProgressContext
) {
  for await (const [, child] of handle.entries()) {
    if (child.kind === 'directory') {
      const childPath = parentPath ? `${parentPath}/${child.name}` : child.name
      const childNode: LibraryFolderNode = {
        id: childPath || 'root',
        name: child.name,
        path: childPath,
        folders: [],
        assets: [],
      }
      node.folders.push(childNode)
      triggerLibraryProgress(ctx)

      await populateLibraryFolder(child, childNode, childPath, ctx)
    } else if (isLibraryFileSupported(child.name)) {
      const file = await child.getFile()
      node.assets.push(createLibraryAsset(file, parentPath))
      triggerLibraryProgress(ctx)
    }
  }

  node.folders.sort((left, right) => left.name.localeCompare(right.name))
  node.assets.sort((left, right) => left.name.localeCompare(right.name))
}

async function getLibraryAssetFile(rootHandle: LibraryDirectoryHandleLike, asset: LibraryAsset): Promise<File | null> {
  try {
    let currentHandle = rootHandle
    if (asset.folderPath) {
      const segments = asset.folderPath.split('/').filter(Boolean)
      let currentPath = ''
      for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment
        const cacheKey = `${rootHandle.name}_${currentPath}`
        if (dirHandleCache.has(cacheKey)) {
          currentHandle = dirHandleCache.get(cacheKey)!
        } else {
          currentHandle = await currentHandle.getDirectoryHandle(segment)
          dirHandleCache.set(cacheKey, currentHandle)
        }
      }
    }
    const fileHandle = await currentHandle.getFileHandle(asset.fileName)
    return await fileHandle.getFile()
  } catch (error) {
    console.error('Failed to get file handle for asset', asset, error)
    return null
  }
}


function App() {
  const renderCountRef = useRef(0)
  renderCountRef.current++
  if (renderCountRef.current % 100 === 0) {
    console.log(`[App] render #${renderCountRef.current}`)
  }
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto')
  const [systemThemeMode, setSystemThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [viewMode, setViewMode] = useState<'editor' | 'player'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('omega-jdr-view-mode')
      if (saved === 'editor' || saved === 'player') {
        return saved
      }
    }
    return 'player'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('omega-jdr-view-mode', viewMode)
    }
  }, [viewMode])
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [workfolderHandle, setWorkfolderHandle] = useState<any>(null)
  const [workfolderTerrains, setWorkfolderTerrains] = useState<{ name: string, fileName: string, type: 'terrain' | 'character' | 'other', description?: string }[]>([])
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = useState(false)
  const [isPlayerCharacterSheetOpen, setIsPlayerCharacterSheetOpen] = useState(false)
  const [activeCharacter, setActiveCharacter] = useState<CharacterDocument | null>(null)
  const [activeCharacterFileName, setActiveCharacterFileName] = useState<string>('')
  // Ref pour éviter le stale closure : socket.onmessage capture
  // handleServerMessage au moment du connect(). Sans ce ref, toutes
  // les variables (activeCharacterFileName, etc.) sont stalles.
  const handleServerMessageRef = useRef<(payload: string) => void>(() => {})
  handleServerMessageRef.current = handleServerMessage;
  // Incoming vitals for the MJ's CharacterSheetDialog (from player via server).
  // Updated when 'room:updateCharacterVitals' is received.
  const [incomingVitalsForGM, setIncomingVitalsForGM] = useState<{ health: number; mental: number; astra: number; seq: number } | null>(null)
  // Incoming vitals for the player's CharacterSheetDialog (from MJ via server).
  // Updated when 'room:vitalsUpdate' is received.
  const [incomingVitalsForPlayer, setIncomingVitalsForPlayer] = useState<{ health: number; mental: number; astra: number; seq: number } | null>(null)
  // Monotonic sequence counter for outgoing vitals messages.
  // Ensures every message has a unique seq even if values are identical
  // or sent in the same millisecond.
  const vitalsSeqRef = useRef(0)
  //

  const [playerTerrain, setPlayerTerrain] = useState<TerrainDocument>(() =>
    sanitizeTerrainForPlayers(createDefaultTerrain()),
  )
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isMassReparentingMode, setIsMassReparentingMode] = useState(false)
  const [serverUrl, setServerUrl] = useState('ws://localhost:8787')
  const [roomId, setRoomId] = useState(() => generateRoomCode())
  const [playerName, setPlayerName] = useState('Joueur')
  const [playerColor, setPlayerColor] = useState(DEFAULT_PLAYER_COLOR)
  const [isPlayerPreallocationEnabled, setIsPlayerPreallocationEnabled] = useState(false)
  const [predeclaredPlayers, setPredeclaredPlayers] = useState<PredeclaredPlayer[]>([])
  // Sections collapsées du dialog "Gestion du projet" (persistées dans mj-preferences.config.json)
  const [collapsedProjectSections, setCollapsedProjectSections] = useState<Record<string, boolean>>({})
  const collapsedProjectSectionsRef = useRef(collapsedProjectSections)
  useEffect(() => { collapsedProjectSectionsRef.current = collapsedProjectSections }, [collapsedProjectSections])
  // Configuration globale du projet (config.json) — constantes modifiables
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>(() => buildDefaultProjectConfig())
  const projectConfigRef = useRef(projectConfig)
  useEffect(() => { projectConfigRef.current = projectConfig }, [projectConfig])
  const projectConfigSaveTimerRef = useRef<number | null>(null)
  const [selectedPredeclaredPlayerId, setSelectedPredeclaredPlayerId] = useState('')
  const [isPredeclaredPlayerChoiceDialogOpen, setIsPredeclaredPlayerChoiceDialogOpen] = useState(false)
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; items: TerrainItem[] } | null>(null)
  const [hierarchyContextMenuState, setHierarchyContextMenuState] = useState<{ x: number; y: number; itemId: string } | null>(null)
  const [lastSelectedHierarchyItemId, setLastSelectedHierarchyItemId] = useState<string | null>(null)
  const [joinConfig, setJoinConfig] = useState<RoomJoinConfig | null>(null)
  const [isJoinConfigLoading, setIsJoinConfigLoading] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [isVirtualContactsDialogOpen, setIsVirtualContactsDialogOpen] = useState(false)
  const [activePhoneConversationId, setActivePhoneConversationId] = useState<string | null>(null)
  const [statusNotifications, setStatusNotifications] = useState<StatusNotification[]>([])
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState>(null)
  const [resizeState, setResizeState] = useState<ResizeState>(null)
  const [rotationHoldState, setRotationHoldState] = useState<RotationHoldState>(null)
  const [panState, setPanState] = useState<PanState>(null)
  const [editorZoom, setEditorZoom] = useState(1)
  const [hierarchyDragItemId, setHierarchyDragItemId] = useState<string | null>(null)
  const [hierarchyDropIndicator, setHierarchyDropIndicator] = useState<HierarchyDropIndicator>(null)
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [collapsedLayerIds, setCollapsedLayerIds] = useState<string[]>([])
  const [layerRenameDraft, setLayerRenameDraft] = useState('')
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [hierarchySearchQuery, setHierarchySearchQuery] = useState('')
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_HIERARCHY_PANEL_WIDTH)
  const [leftPanelResizeState, setLeftPanelResizeState] = useState<PanelResizeState>(null)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_INSPECTOR_PANEL_WIDTH)
  const [rightPanelResizeState, setRightPanelResizeState] = useState<PanelResizeState>(null)
  const [isTerrainDialogOpen, setIsTerrainDialogOpen] = useState(false)
  const [isDragOverStage, setIsDragOverStage] = useState(false)
  const [effectPickerOpen, setEffectPickerOpen] = useState(false)
  const [effectPickerReferenceSrc, setEffectPickerReferenceSrc] = useState<string | null>(null)
  const [isSceneReviewDialogOpen, setIsSceneReviewDialogOpen] = useState(false)
  const [isMergeReviewDialogOpen, setIsMergeReviewDialogOpen] = useState(false)
  const [assetPickerContext, setAssetPickerContext] = useState<{ mode: 'add-image' | 'add-token' | 'replace-item' | 'effect-reference', targetItemId?: string } | null>(null)
  const [isMergeProcessing, setIsMergeProcessing] = useState(false)
  const [assetPreloadProgress, setAssetPreloadProgress] = useState<{ loaded: number; total: number; sizeBytes: number } | null>(null)
  const [mergeGroups, setMergeGroups] = useState<Array<{ master: TerrainItem; duplicates: TerrainItem[] }>>([])

  async function tryMergeImages() {
    setIsMergeReviewDialogOpen(true)
    setIsMergeProcessing(true)

    try {
      const images = terrainRef.current.items.filter(i => i.kind === 'image' || i.kind === 'token')
      const hashMap = new Map<string, TerrainItem[]>()

      for (const item of images) {
        if (!item.src) continue
        const hash = await hashImageVisually(item.src)
        const list = hashMap.get(hash) || []
        list.push(item)
        hashMap.set(hash, list)
      }

      const groups = Array.from(hashMap.values())
        .filter(list => list.length > 1)
        .map(list => {
          const master = list.find(i => i.src.startsWith('data:image/webp')) || list[0]
          const duplicates = list.filter(i => i.id !== master.id)
          return { master, duplicates }
        })

      setMergeGroups(groups)
    } finally {
      setIsMergeProcessing(false)
    }
  }

  function applyMerge(groupIndex?: number) {
    updateTerrain(current => {
      const itemMap = new Map(current.items.map(i => [i.id, { ...i }]))

      const groupsToMerge = groupIndex !== undefined && mergeGroups[groupIndex] ? [mergeGroups[groupIndex]] : mergeGroups

      for (const group of groupsToMerge) {
        for (const dup of group.duplicates) {
          const item = itemMap.get(dup.id)
          if (item) {
            item.src = group.master.src
          }
        }
      }

      return {
        ...current,
        items: Array.from(itemMap.values())
      }
    })

    if (groupIndex !== undefined) {
      setMergeGroups(prev => prev.filter((_, idx) => idx !== groupIndex))
      setStatusMessage('Groupe fusionné avec succès.')
      if (mergeGroups.length <= 1) {
        setIsMergeReviewDialogOpen(false)
      }
    } else {
      setMergeGroups([])
      setIsMergeReviewDialogOpen(false)
      setStatusMessage('Toutes les images ont été fusionnées avec succès.')
    }
  }
  const [isHostNightModePreview, setIsHostNightModePreview] = useState(false)
  const [isHostDialogOpen, setIsHostDialogOpen] = useState(false)
  const [serverMemory, setServerMemory] = useState<{ rss: number, heapTotal: number, heapUsed: number } | null>(null)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isChangelogsDialogOpen, setIsChangelogsDialogOpen] = useState(false)
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false)
  const dragTooltipRef = useRef<HTMLDivElement>(null)
  // Coalescing du drag : on ne commit terrain qu'une fois par frame (requestAnimationFrame)
  // pour éviter les re-renders React à chaque pointermove (175 Hz �?' ~60 commits/sec max).
  const dragPendingPositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null)
  const dragRafIdRef = useRef<number | null>(null)

  const [noteDialogItem, setNoteDialogItem] = useState<TerrainItem | null>(null)

  const [isLibrarySidebarCollapsed, setIsLibrarySidebarCollapsed] = useState(false)
  // Palette de couleurs globale (workfolder colors.color.json) — réutilisable de partout
  const colorPalette = useColorPalette()
  const [isDefaultLibraryDialogOpen, setIsDefaultLibraryDialogOpen] = useState(false)
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false)
  const [isDragOverReplace, setIsDragOverReplace] = useState(false)
  const [isGridSnapEnabled, setIsGridSnapEnabled] = useState(false)
  const [defaultLibraryAssetKind, setDefaultLibraryAssetKind] = useState<TerrainItemKind>('image')
  const [defaultLibraryAssetName, setDefaultLibraryAssetName] = useState(DEFAULT_LIBRARY_ASSET_NAME)
  const [defaultLibraryAssetPreset, setDefaultLibraryAssetPreset] = useState<GeneratedAsset['preset']>(DEFAULT_LIBRARY_ASSET_PRESET)
  const [defaultLibraryAssetColor, setDefaultLibraryAssetColor] = useState(DEFAULT_PLAYER_COLOR)
  const [activeLibraryTabId, setActiveLibraryTabId] = useState<string | null>(null)
  const [libraryRoot, setLibraryRoot] = useState<LibraryFolderNode | null>(null)
  const [activeLibraryPath, setActiveLibraryPath] = useState('')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)
  const [hasLibraryHandle, setHasLibraryHandle] = useState(false)
  const [libraryMessage, setLibraryMessage] = useState('Selectionne ou ajoute un dossier pour charger ta bibliotheque.')
  const [libraryPreviewSize, setLibraryPreviewSize] = useState(() => {
    if (typeof window === 'undefined') {
      return 180
    }

    const storedValue = Number(window.localStorage.getItem(LIBRARY_PREVIEW_SIZE_STORAGE_KEY))
    return Number.isFinite(storedValue) ? clamp(storedValue, 120, 260) : 180
  })
  const [draggedTurnEntryId, setDraggedTurnEntryId] = useState<string | null>(null)
  const [dragOverTurnEntryId, setDragOverTurnEntryId] = useState<string | null>(null)
  const [isFollowingHostCursor, setIsFollowingHostCursor] = useState(false)
  const [playerZoom, setPlayerZoom] = useState(1)
  const [audioVolume, setAudioVolume] = useState(0.8)
  const [soundboardVolume, setSoundboardVolume] = useState(0.8)
  const [showOwnSyncedCursor, setShowOwnSyncedCursor] = useState(false)
  // Contenu de la note de survol (htmlMJ, htmlPlayers). Mis à jour
  // UNIQUEMENT quand l'item survolé change (onPointerEnter), PAS sur
  // onPointerMove — sinon chaque pixel de mouvement de souris déclencherait
  // une re-sanitisation HTML (DOMParser, coûteux) + un re-render complet
  // de l'app. La position (x, y) est appliquée via DOM direct dans le
  // tooltip (cf. `scheduleHoveredNotePosUpdate`), donc 0 re-render React
  // sur le mouvement.
  const [hoveredNoteContent, setHoveredNoteContent] = useState<{
    htmlMJ: string | null
    htmlPlayers: string | null
  } | null>(null)
  const hoveredNotePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // rAF id pour throttler la mise à jour DOM de la position :
  // onPointerMove fire potentiellement 100+ fois/sec, mais on ne commit
  // qu'une fois par frame navigateur (60-175 fps selon le display).
  const hoveredNoteRafRef = useRef<number | null>(null)
  // Item de la note de survol (utilisé pour ctrl+O ouvrir en grand).
  const [hoveredNoteItem, setHoveredNoteItem] = useState<TerrainItem | null>(null)
  const [hoveredEditorItemId, setHoveredEditorItemId] = useState<string | null>(null)
  const [measureDraft, setMeasureDraft] = useState<MeasureOverlayState>(null)
  const [syncedMeasures, setSyncedMeasures] = useState<SyncedMeasure[]>([])
  const [presencePopup, setPresencePopup] = useState<PresencePopupState>(null)
  const [tokenAssignments, setTokenAssignments] = useState<Record<string, TokenAssignment>>({})
  const tokenAssignmentsRef = useRef(tokenAssignments)
  useEffect(() => {
    tokenAssignmentsRef.current = tokenAssignments
  }, [tokenAssignments])
  const [playerViewPolicy, setPlayerViewPolicy] = useState<PlayerViewPolicy>(null)
  const [bulkAssignedViewMode, setBulkAssignedViewMode] = useState<PlayerViewMode>('free')
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false)
  const [shortcutsSearchQuery, setShortcutsSearchQuery] = useState('')

  useEffect(() => {
    if (viewMode !== 'editor') {
      setServerMemory(null)
      return
    }

    let active = true
    async function fetchHealth() {
      try {
        const url = serverUrl.replace(/^ws/, 'http').replace(/\/$/, '') + '/api/health'
        const response = await fetch(url)
        if (!active) return
        const data = await response.json()
        if (data && data.memory) {
          setServerMemory(data.memory)
        }
      } catch {
        if (active) setServerMemory(null)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [viewMode, serverUrl])
  const [isDiceToolbarOpen, setIsDiceToolbarOpen] = useState(false)
  const [selectedDiceCount, setSelectedDiceCount] = useState(1)
  const [selectedDiceSides, setSelectedDiceSides] = useState(6)
  const [customDiceFormula, setCustomDiceFormula] = useState('1d6')
  const [diceRollReason, setDiceRollReason] = useState('')
  const [diceTarget, setDiceTarget] = useState('')
  const [isSecretDiceRoll, setIsSecretDiceRoll] = useState(false)
  const [diceRollAnimationDurationMs, setDiceRollAnimationDurationMs] = useState(DEFAULT_DICE_ROLL_ANIMATION_DURATION_MS)
  const [diceResultDisplayDurationMs, setDiceResultDisplayDurationMs] = useState(DEFAULT_DICE_RESULT_DISPLAY_DURATION_MS)
  const [zoomSpeedMultiplier, setZoomSpeedMultiplier] = useState(() => {
    const saved = window.localStorage.getItem('omega-zoom-speed')
    return saved !== null ? Number(saved) : 1
  })

  useEffect(() => {
    window.localStorage.setItem('omega-zoom-speed', String(zoomSpeedMultiplier))
  }, [zoomSpeedMultiplier])
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([])
  const [activeDiceRolls, setActiveDiceRolls] = useState<ActiveDiceRoll[]>([])
  const [isAudioLoadDialogOpen, setIsAudioLoadDialogOpen] = useState(false)
  const [editingYoutubeTitle, setEditingYoutubeTitle] = useState<string | null>(null)
  const [youtubeBookmarkSearch, setYoutubeBookmarkSearch] = useState('')
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [isDiceHistoryOpen, setIsDiceHistoryOpen] = useState(false)
  const [isNoteColorPaletteOpen, setIsNoteColorPaletteOpen] = useState(false)
  const [isNotePlayersColorPaletteOpen, setIsNotePlayersColorPaletteOpen] = useState(false)
  const [isTokenPanelColorPaletteOpen, setIsTokenPanelColorPaletteOpen] = useState(false)
  const [noteColorDraft, setNoteColorDraft] = useState<string>(DEFAULT_TERRAIN_COLOR_PALETTE[8])
  const [notePlayersColorDraft, setNotePlayersColorDraft] = useState<string>(DEFAULT_TERRAIN_COLOR_PALETTE[8])
  const [tokenPanelColorDraft, setTokenPanelColorDraft] = useState<string>(DEFAULT_TERRAIN_COLOR_PALETTE[8])
  const [hasAutoSaveTarget, setHasAutoSaveTarget] = useState(false)
  const [isAutoSaveOnModifyEnabled, setIsAutoSaveOnModifyEnabled] = useState(true)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastTerrainSaveAt, setLastTerrainSaveAt] = useState<number | null>(null)
  const [terrainModifiedAt, setTerrainModifiedAt] = useState<number | null>(null)
  const [isAutoSaveScheduled, setIsAutoSaveScheduled] = useState(false)
  const [inspectorSearchQuery, setInspectorSearchQuery] = useState('')
  const [outlineDraftEnabled, setOutlineDraftEnabled] = useState(false)
  const [outlineDraftWidth, setOutlineDraftWidth] = useState(0)
  const [outlineDraftColor, setOutlineDraftColor] = useState('#ffffff')
  const [hostPreviewPolicy, setHostPreviewPolicy] = useState<PlayerViewPolicy>(null)
  const [turnTracker, setTurnTracker] = useState<TurnTrackerState>({ entries: [], currentEntryId: null, round: 1 })
  const [turnTrackerDraftLabel, setTurnTrackerDraftLabel] = useState('')
  const [isTurnTrackerCollapsed, setIsTurnTrackerCollapsed] = useState(false)
  const [saveStatusNow, setSaveStatusNow] = useState(() => Date.now())
  const [isSoundboardPanelVisible, setIsSoundboardPanelVisible] = useState(false)
  const [isSoundboardPanelCollapsed, setIsSoundboardPanelCollapsed] = useState(false)
  const [soundboardSearch, setSoundboardSearch] = useState('')
  const [soundboardPanelPosition, setSoundboardPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [pendingSoundboardPlacement, setPendingSoundboardPlacement] = useState<{ id: string; src: string; defaultRange: number } | null>(null)
  const [turnTrackerPosition, setTurnTrackerPosition] = useState<{ x: number; y: number } | null>(null)
  const [timerPanelPosition, setTimerPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [phonePanelPosition, setPhonePanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [draggingPanel, setDraggingPanel] = useState<'turnTracker' | 'timerPanel' | 'phonePanel' | 'soundboardPanel' | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null)
  const backdropPointerDownRef = useRef(false)

  const wsRef = useRef<WebSocket | null>(null)
  const roleRef = useRef<'host' | 'player' | null>(null)

  // --- Terrain composable ---
  const {
    terrain,
    terrainRef,
    applyTerrain,
    updateTerrain,
    runIfItemUnlocked,
    updateItem,
    beginContinuousTerrainHistory,
    captureContinuousTerrainHistory,
    endContinuousTerrainHistory,
    undoTerrainChange,
    flushTerrainSync,
    clearTerrainSyncTimeout,
  } = useTerrain({
    wsRef,
    roleRef,
    setPlayerTerrain,
    setStatusMessage,
  })

  // Ref mirror for playerTerrain (needed by FlashlightSystem, MapAudioPlayer, etc.)
  const playerTerrainRef = useRef(playerTerrain)
  playerTerrainRef.current = playerTerrain
  // Refs miroirs utilisés par les useEffects des éditeurs de notes
  // riches (note MJ, note Joueurs, panneau token) pour savoir QUEL item
  // est ACTUELLEMENT affiché dans le DOM (≠ `selectedItem` qui change
  // au moment du clic sur un autre sprite). Chaque éditeur maintient
  // son propre ref (`*ShownItemIdRef`) mis à jour à la FIN de son
  // useEffect — cf. `noteEditorShownItemIdRef` (~ligne 1625).
  const editorZoomRef = useRef(editorZoom)
  const editorZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Shared timers composable ---
  const {
    sharedTimers,
    setSharedTimers,
    isTimerDialogOpen,
    setIsTimerDialogOpen,
    isTimerPanelCollapsed,
    setIsTimerPanelCollapsed,
    timerDraftTitle,
    setTimerDraftTitle,
    timerDraftMode,
    setTimerDraftMode,
    timerDraftMinutes,
    setTimerDraftMinutes,
    timerDraftSeconds,
    setTimerDraftSeconds,
    sendTimerCommand,
    getSharedTimerRemainingMs,
    formatTimerClock,
    formatSharedTimerValue,
    createSharedTimer,
    normalizeSharedTimersMessage,
    resetTimers,
  } = useSharedTimers({
    getSocket: () => wsRef.current,
    getRole: () => roleRef.current,
    setStatusMessage,
  })
  const playerZoomRef = useRef(playerZoom)
  const editorStageRef = useRef<HTMLDivElement | null>(null)
  const playerStageRef = useRef<HTMLDivElement | null>(null)
  const editorStageFrameRef = useRef<HTMLDivElement | null>(null)
  const playerStageFrameRef = useRef<HTMLDivElement | null>(null)

  // --- WebSocket connection composable ---
  const {
    sendSessionCursor,
    sendSessionPing,
    sendMeasureUpdate,
    sendTurnTrackerCommand,
  } = useWebSocketConnection({
    wsRef,
    roleRef,
    getRole: () => roleRef.current,
    getPlayerId: () => playerId,
    getEditorStage: () => editorStageRef.current,
    getPlayerStage: () => playerStageRef.current,
    getEditorTerrain: () => terrainRef.current,
    getPlayerTerrain: () => playerTerrainRef.current,
    getEditorZoom: () => editorZoomRef.current,
    pushSyncedMeasure,
  })

  // --- last.config.json : état courant et debounce ---
  const lastConfigSaveTimerRef = useRef<number | null>(null)
  const currentTerrainFileNameRef = useRef<string>('')
  const editorScrollRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const playerScrollRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => { editorScrollRef.current = { x: editorStageFrameRef.current?.scrollLeft ?? 0, y: editorStageFrameRef.current?.scrollTop ?? 0 } }, [editorZoom])
  useEffect(() => { playerScrollRef.current = { x: playerStageFrameRef.current?.scrollLeft ?? 0, y: playerStageFrameRef.current?.scrollTop ?? 0 } }, [playerZoom])

  function scheduleLastConfigSave() {
    if (!workfolderHandle) return;
    if (lastConfigSaveTimerRef.current !== null) {
      window.clearTimeout(lastConfigSaveTimerRef.current);
    }
    lastConfigSaveTimerRef.current = window.setTimeout(() => {
      lastConfigSaveTimerRef.current = null;
      const next: LastConfig = {
        version: 1,
        lastTerrainFileName: currentTerrainFileNameRef.current,
        camera: {
          editor: {
            scrollX: editorStageFrameRef.current?.scrollLeft ?? editorScrollRef.current.x,
            scrollY: editorStageFrameRef.current?.scrollTop ?? editorScrollRef.current.y,
            zoom: editorZoom,
          },
          player: {
            scrollX: playerStageFrameRef.current?.scrollLeft ?? playerScrollRef.current.x,
            scrollY: playerStageFrameRef.current?.scrollTop ?? playerScrollRef.current.y,
            zoom: playerZoom,
          },
        },
        updatedAt: Date.now(),
      };
      void writeLastConfig(workfolderHandle, next);
    }, 500);
  }

  useEffect(() => {
    scheduleLastConfigSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorZoom]);

  useEffect(() => {
    scheduleLastConfigSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerZoom]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const ytPlayerRef = useRef<any>(null)

  // --- Shared audio composable ---
  const activeAudioTrackSrcRef = useRef<string | null>(null)
  const {
    sharedAudioState,
    setSharedAudioState,
    sharedAudioStateRef,
    resetAudio,
  } = useSharedAudio({
    getSocket: () => wsRef.current,
    getRole: () => roleRef.current,
    getActiveAudioTrackSrc: () => activeAudioTrackSrcRef.current,
    audioElementRef,
    ytPlayerRef,
  })

  const pingAudioContextRef = useRef<AudioContext | null>(null)
  const pingTimeoutsRef = useRef<Map<string, number>>(new Map())
  const noteEditorRef = useRef<HTMLDivElement | null>(null)
  const noteSelectionRef = useRef<Range | null>(null)
  const notePlayersEditorRef = useRef<HTMLDivElement | null>(null)
  const notePlayersSelectionRef = useRef<Range | null>(null)
  const tokenPanelEditorRef = useRef<HTMLDivElement | null>(null)
  const tokenPanelSelectionRef = useRef<Range | null>(null)
  const presenceAnchorRef = useRef<HTMLElement | null>(null)
  const presenceHideTimeoutRef = useRef<number | null>(null)
  const measureStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const measureDraftIdRef = useRef<string | null>(null)

  const lastPlayerPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastEditorPointerRef = useRef<{ x: number; y: number } | null>(null)
  const copiedTerrainItemsRef = useRef<TerrainItem[] | null>(null)
  const autoSaveTimeoutRef = useRef<number | null>(null)
  const autoSaveInFlightCountRef = useRef(0)
  const terrainSaveHandleRef = useRef<SaveFileHandleLike | null>(null)
  const libraryDirectoryHandleRef = useRef<LibraryDirectoryHandleLike | null>(null)
  const statusTimeoutsRef = useRef<Map<string, number>>(new Map())
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const tokenInputRef = useRef<HTMLInputElement | null>(null)
  const mapAudioInputRef = useRef<HTMLInputElement | null>(null)
  const soundboardAudioInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const youtubeUrlRef = useRef<HTMLInputElement | null>(null)
  const terrainLoadInputRef = useRef<HTMLInputElement | null>(null)
  const cursorTagRef = useRef<HTMLDivElement | null>(null)
  const inspectorSearchInputRef = useRef<HTMLInputElement | null>(null)
  const layerRenameInputRef = useRef<HTMLInputElement | null>(null)
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null)
  const inspectorScrollRef = useRef<HTMLElement | null>(null)
  const lastInspectorScrollTop = useRef<number>(0)

  const resolvedEditorItems = useMemo(() => buildResolvedItemMap(terrain), [terrain])
  const resolvedEditorItemsRef = useRef(resolvedEditorItems)
  resolvedEditorItemsRef.current = resolvedEditorItems
  const resolvedPlayerItems = useMemo(() => buildResolvedItemMap(playerTerrain), [playerTerrain])
  const resolvedPlayerItemsRef = useRef(resolvedPlayerItems)
  resolvedPlayerItemsRef.current = resolvedPlayerItems

  const roomPlayersRef = useRef(roomPlayers)
  roomPlayersRef.current = roomPlayers



  const flashlightPathsRef = useRef<Record<string, SVGPathElement | null>>({})
  const remoteCursorPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const renderedEditorItems = useMemo(() => getRenderableItems(terrain), [terrain])
  const renderedPlayerItems = useMemo(() => getRenderableItems(playerTerrain), [playerTerrain])
  const terrainColorPalette = terrain.colorPalette
  const selectedItem = terrain.items.find((item) => item.id === selectedItemId) ?? null
  const activeParentId = selectedItem && selectedItem.kind !== 'audio' ? selectedItem.id : null
  const activeLayerId = selectedItem
    ? selectedItem.layerId
    : selectedLayerId && terrain.layers.some((layer) => layer.id === selectedLayerId)
      ? selectedLayerId
      : terrain.layers[0]?.id ?? null
  const selectedResolvedItem = selectedItemId ? resolvedEditorItems.get(selectedItemId) ?? null : null
  const selectedItems = useMemo(
    () => terrain.items.filter((item) => selectedItemIds.includes(item.id)),
    [selectedItemIds, terrain.items],
  )
  const selectedItemBounds = useMemo(
    () => (selectedItem && selectedResolvedItem ? getResolvedItemBounds(selectedItem, selectedResolvedItem) : null),
    [selectedItem, selectedResolvedItem],
  )
  const selectedItemChildPreviewIds = useMemo(() => {
    if (!selectedItem) {
      return new Set<string>()
    }

    const descendantIds = getDescendantIds(terrain.items, selectedItem.id)
    descendantIds.delete(selectedItem.id)
    return descendantIds
  }, [selectedItem, terrain.items])
  const selectedGroupBounds = useMemo(() => {
    if (selectedItems.length === 0) {
      return null
    }

    if (selectedItems.length === 1 && selectedItems[0].kind !== 'empty') {
      return null
    }

    const allRelevantIds = new Set<string>()
    for (const item of selectedItems) {
      if (item.kind === 'empty') {
        const descendantIds = getDescendantIds(terrain.items, item.id)
        for (const id of descendantIds) {
          allRelevantIds.add(id)
        }
      } else {
        allRelevantIds.add(item.id)
      }
    }

    const bounds = Array.from(allRelevantIds)
      .map((id) => {
        const item = terrain.items.find((i) => i.id === id)
        const resolved = resolvedEditorItems.get(id)
        if (!item || !resolved || item.kind === 'empty') return null
        return getResolvedItemBounds(item, resolved)
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

    if (bounds.length === 0) {
      if (selectedItems.length === 1 && selectedItems[0].kind === 'empty') {
        const resolved = resolvedEditorItems.get(selectedItems[0].id)
        if (resolved) {
          return {
            left: resolved.x,
            right: resolved.x,
            top: resolved.y,
            bottom: resolved.y,
            width: 0,
            height: 0,
          }
        }
      }
      return null
    }

    const left = Math.min(...bounds.map((entry) => entry.left))
    const right = Math.max(...bounds.map((entry) => entry.right))
    const top = Math.min(...bounds.map((entry) => entry.top))
    const bottom = Math.max(...bounds.map((entry) => entry.bottom))

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    }
  }, [resolvedEditorItems, selectedItems, terrain.items])
  const defaultLibraryAssetPreview = buildGeneratedAssetDataUrl({
    preset: defaultLibraryAssetPreset,
    fill: normalizeGeneratedAssetColor(defaultLibraryAssetColor),
  })
  const hoveredEditorItem = terrain.items.find((item) => item.id === hoveredEditorItemId) ?? null
  const hoveredEditorResolvedItem = hoveredEditorItemId ? resolvedEditorItems.get(hoveredEditorItemId) ?? null : null

  const canControlAudio = roleRef.current !== 'player'
  const hostPresence = roomPlayers.find((player) => player.role === 'host') ?? null
  const displayedTurnTrackerEntries = useMemo(() => {
    const entriesById = new Map(turnTracker.entries.map((entry) => [entry.id, entry]))
    const orderedEntryIds = turnTracker.entries.map((entry) => entry.id)

    for (const player of roomPlayers) {
      if (player.role !== 'player') {
        continue
      }

      const identityId = player.predeclaredPlayerId || player.id
      const entryId = `player:${identityId}`
      if (!entriesById.has(entryId)) {
        entriesById.set(entryId, {
          id: entryId,
          label: player.name,
          color: player.color,
          kind: 'player',
          playerId: identityId,
        })
        orderedEntryIds.push(entryId)
      }
    }

    return orderedEntryIds
      .map((entryId) => entriesById.get(entryId) ?? null)
      .filter((entry): entry is TurnTrackerEntry => entry !== null)
  }, [roomPlayers, turnTracker.entries])
  const currentTurnEntry =
    displayedTurnTrackerEntries.find((entry) => entry.id === turnTracker.currentEntryId) ?? displayedTurnTrackerEntries[0] ?? null
  const isTurnTrackerVisible =
    roleRef.current === 'host' || displayedTurnTrackerEntries.length > 0 || roomPlayers.some((player) => player.role === 'player')
  const isTimerPanelVisible = roleRef.current === 'host' || sharedTimers.length > 0
  const connectedPeopleCount = roomPlayers.length
  const resolvedThemeMode = themeMode === 'auto' ? systemThemeMode : themeMode
  const isHostSessionActive = roleRef.current === 'host' && roomPlayers.some((player) => player.role === 'host')
  const currentSelectedTokenAssignment =
    selectedItem?.kind === 'token' ? tokenAssignments[selectedItem.id] ?? null : null
  const currentPlayerPresence = playerId ? roomPlayers.find((player) => player.id === playerId) ?? null : null
  const currentPlayerIdentityId = currentPlayerPresence
    ? currentPlayerPresence.predeclaredPlayerId ?? currentPlayerPresence.id
    : selectedPredeclaredPlayerId || playerId || null

  const currentPlayerCharacterAssignment = useMemo(() => {
    if (roleRef.current !== 'player' || !playerViewPolicy) return null;
    if (playerViewPolicy.characterData && playerViewPolicy.tokenId) {
      return {
        tokenId: playerViewPolicy.tokenId,
        characterData: playerViewPolicy.characterData,
        characterFileName: playerViewPolicy.characterFileName
      }
    }
    return null;
  }, [roleRef.current, playerViewPolicy]);

  /**
   * Liste des fiches de personnages assignées aux pions, pour le dropdown
   * de jets de caractéristique côté MJ.
   */
  const gmCharacterDiceEntries = useMemo<GMCharacterEntry[]>(() => {
    if (roleRef.current !== 'host') return []
    return Object.entries(tokenAssignments)
      .filter(([, assignment]) => assignment.characterData)
      .map(([tokenId, assignment]) => {
        const doc = assignment.characterData!
        const label = [doc.general.firstName, doc.general.lastName].filter(Boolean).join(' ') || doc.general.alias || assignment.characterFileName || 'Personnage'
        return { id: tokenId, label, characterData: doc }
      })
  }, [roleRef.current, tokenAssignments])

  /**
   * Config projet pour le calcul dynamique des seuils de réussite des caractéristiques.
   */
  const characteristicConfig = useMemo<CharacteristicConfig>(() => ({
    statSuccessDivisor: getProjectConfigNumber(projectConfig, 'statSuccessDivisor', DEFAULT_STAT_SUCCESS_DIVISOR),
    successModifierMin: getProjectConfigNumber(projectConfig, 'successModifierMin', DEFAULT_SUCCESS_MODIFIER_MIN),
    successModifierMax: getProjectConfigNumber(projectConfig, 'successModifierMax', DEFAULT_SUCCESS_MODIFIER_MAX),
    vitalsCriticalThresholdPercent: getProjectConfigNumber(projectConfig, 'vitalsCriticalThresholdPercent', DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT),
    vitalsWeightHealth: getProjectConfigNumber(projectConfig, 'vitalsWeightHealth', DEFAULT_VITALS_WEIGHT_HEALTH),
    vitalsWeightMental: getProjectConfigNumber(projectConfig, 'vitalsWeightMental', DEFAULT_VITALS_WEIGHT_MENTAL),
  }), [projectConfig])

  function handleRollCharacteristic(entry: CharacteristicEntry, character?: GMCharacterEntry) {
    // Remplit le champ Cible automatiquement avec le seuil de réussite.
    setDiceTarget(String(entry.successThreshold))
    const reasonPrefix = character?.label ? `${character.label} — ` : ''
    requestDiceRoll({
      count: 1,
      sides: 100,
      reason: `${reasonPrefix}${entry.emoji} ${entry.label} (${entry.current} → ${entry.successThreshold})`,
      successThreshold: entry.successThreshold,
    })
  }

  const roomPlayersByPredeclaredId = useMemo(
    () =>
      new Map(
        roomPlayers
          .filter((player) => player.role === 'player' && player.predeclaredPlayerId)
          .map((player) => [player.predeclaredPlayerId as string, player]),
      ),
    [roomPlayers],
  )
  const hostAssignablePlayers = useMemo<AssignablePlayerOption[]>(() => {
    if (isPlayerPreallocationEnabled) {
      return predeclaredPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        connectedPlayerId: roomPlayersByPredeclaredId.get(player.id)?.id ?? null,
      }))
    }

    return roomPlayers
      .filter((player) => player.role === 'player')
      .map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        connectedPlayerId: player.id,
      }))
  }, [isPlayerPreallocationEnabled, predeclaredPlayers, roomPlayers, roomPlayersByPredeclaredId])
  const normalizedInspectorSearchQuery = useMemo(
    () => normalizeInspectorSearchQuery(inspectorSearchQuery),
    [inspectorSearchQuery],
  )
  const showIdentityTypeSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'identite',
    'type',
    'image',
    'pion',
  ])
  const showIdentityNameSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, ['identite', 'nom'])
  const showGeneratedAssetSection =
    selectedItem?.generatedAsset === undefined
      ? false
      : sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, ['svg', 'asset', 'forme', 'couleur'])
  const showStructureSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, ['structure', 'calque', 'hierarchie'])
  const showGeometrySection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'geometrie',
    'position',
    'taille',
    'rotation',
    'opacite',
    'scale',
  ])
  const showOutlineSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, ['outline', 'contour'])
  const showEffectSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'effect',
    'effet',
    'noir',
    'blanc',
    'grayscale',
    'ondulation',
    'ripple',
  ])
  const showTokenSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'pion',
    'token',
    'joueur',
    'panneau',
    'vue',
    'bind',
    'lampe',
    'flashlight',
    'cone',
  ])
  const showNoteSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, ['note', 'survol', 'publique'])
  const showAudioSection = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'audio',
    'son',
    'musique',
    'volume',
    'boucle',
    'spatialise',
  ])
  const showActionControls = sectionMatchesInspectorSearch(normalizedInspectorSearchQuery, [
    'actions',
    'ordre',
    'visible',
    'masquer',
  ])
  const hasVisibleInspectorSections =
    showIdentityTypeSection ||
    showIdentityNameSection ||
    showGeneratedAssetSection ||
    showStructureSection ||
    showGeometrySection ||
    showOutlineSection ||
    showEffectSection ||
    showTokenSection ||
    showNoteSection ||
    showAudioSection ||
    showActionControls
  const assignedPlayerIds = useMemo(
    () => new Set(Object.values(tokenAssignments).map((assignment) => assignment.playerId)),
    [tokenAssignments],
  )
  const assignablePlayers = useMemo(() => {
    const currentAssignedPlayerId = currentSelectedTokenAssignment?.playerId ?? null
    return hostAssignablePlayers.map((player) => ({
      ...player,
      isTransfer: assignedPlayerIds.has(player.id) && player.id !== currentAssignedPlayerId,
    }))
  }, [assignedPlayerIds, currentSelectedTokenAssignment?.playerId, hostAssignablePlayers])
  useEffect(() => {
    if (!selectedItem) {
      setOutlineDraftEnabled(false)
      setOutlineDraftWidth(0)
      setOutlineDraftColor('#ffffff')
      return
    }

    setOutlineDraftEnabled(selectedItem.outlineEnabled)
    setOutlineDraftWidth(selectedItem.outlineWidth)
    setOutlineDraftColor(selectedItem.outlineColor)
  }, [selectedItem])
  const displayedRoomPlayers = useMemo(
    () =>
      roomPlayers.filter((player) => {
        const isOwnCursor =
          (roleRef.current === 'host' && player.role === 'host') ||
          (roleRef.current === 'player' && player.id === playerId)

        return showOwnSyncedCursor || !isOwnCursor
      }),
    [playerId, roomPlayers, showOwnSyncedCursor],
  )
  const activePlayerViewPolicy = roleRef.current === 'host' && hostPreviewPolicy ? hostPreviewPolicy : playerViewPolicy
  const activePhoneIdentityId =
    roleRef.current === 'host' && hostPreviewPolicy?.tokenId
      ? tokenAssignments[hostPreviewPolicy.tokenId]?.playerId ?? null
      : currentPlayerIdentityId
  const phoneViewerIdentityId = roleRef.current === 'host' ? 'host' : currentPlayerIdentityId

  // --- Phone composable ---
  const {
    roomPhoneChatState,
    phoneUnreadConversationIds,
    playerPhoneStates,
    phoneVirtualContacts,
    setPhoneVirtualContacts,
    setPhoneViewerIdentityId,
    openPhoneConversation,
    createPhoneConversation,
    sendPhoneChatMessage,
    handleCreateVirtualContact,
    handleUpdateVirtualContact,
    handleDeleteVirtualContact,
    togglePlayerPhoneFlashlight,
    handlePhoneServerMessage,
    resetPhone,
  } = usePhone({
    getSocket: () => wsRef.current,
    getRole: () => roleRef.current,
    getCurrentPlayerIdentityId: () => currentPlayerIdentityId,
    getActivePlayerViewPolicy: () => activePlayerViewPolicy,
    setIsPhoneOpen,
    setActivePhoneConversationId,
  })
  setPhoneViewerIdentityId(phoneViewerIdentityId)

  // Ref mirror for FlashlightSystem (needs mutable ref to phone states)
  const playerPhoneStatesRef = useRef(playerPhoneStates)
  playerPhoneStatesRef.current = playerPhoneStates

  const activePhoneFlashlightState = activePhoneIdentityId ? playerPhoneStates[activePhoneIdentityId]?.flashlightEnabled !== false : true
  const activePhoneFlashlightEnabled = Boolean(
    activePlayerViewPolicy?.flashlightEnabled === true &&
    activePhoneIdentityId &&
    activePhoneFlashlightState,
  )
  const phoneContacts = useMemo(() => {
    const contacts: { id: string; name: string; color: string; role: 'host' | 'player' | 'npc' }[] = []

    if (roleRef.current === 'player' && hostPresence) {
      contacts.push({
        id: 'host',
        name: hostPresence.name,
        color: hostPresence.color,
        role: 'host',
      })
    }

    for (const vc of phoneVirtualContacts) {
      contacts.push({
        id: vc.id,
        name: vc.name,
        color: vc.color,
        role: 'npc',
      })
    }

    for (const player of roomPlayers) {
      if (player.role !== 'player') {
        continue
      }

      const identityId = player.predeclaredPlayerId ?? player.id
      if (roleRef.current === 'player' && identityId === currentPlayerIdentityId) {
        continue
      }

      contacts.push({
        id: identityId,
        name: player.name,
        color: player.color,
        role: 'player',
      })
    }

    return contacts
  }, [currentPlayerIdentityId, hostPresence, roomPlayers])
  const activeAudioTrack = (viewMode === 'player' ? playerTerrain.audio : terrain.audio) ?? null
  activeAudioTrackSrcRef.current = activeAudioTrack?.src ?? null
  const isYouTubeAudio = useMemo(() => {
    return Boolean(activeAudioTrack?.src?.includes('youtube.com') || activeAudioTrack?.src?.includes('youtu.be'))
  }, [activeAudioTrack?.src])

  // Clear the stale YouTube player ref when switching away from YouTube.
  // Without this, the sync effect below tries to call methods on a destroyed
  // player after YouTube → mp3 → YouTube transitions.
  useEffect(() => {
    if (!isYouTubeAudio) {
      ytPlayerRef.current = null
    }
  }, [isYouTubeAudio])

  const ytPlayerOpts = useMemo(() => {
    const videoId = extractYouTubeId(activeAudioTrack?.src)
    return {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        loop: 0,
        playlist: videoId,
      },
    }
  }, [activeAudioTrack?.src])

  const assignedTokenId = activePlayerViewPolicy?.tokenId ?? null
  const assignedToken = assignedTokenId ? playerTerrain.items.find((item) => item.id === assignedTokenId) ?? null : null
  const assignedTokenResolved = assignedTokenId ? resolvedPlayerItems.get(assignedTokenId) ?? null : null
  const flashlightMaskId = `player-flashlight-mask-${playerId ?? 'anonymous'}`
  const usesPhoneFlashlightViewport =
    viewMode === 'player' &&
    activePlayerViewPolicy?.mode === 'locked-token' &&
    activePlayerViewPolicy.flashlightEnabled === true &&
    Boolean(assignedToken && assignedTokenResolved)

  const flashlightOverlayOpacity = activePhoneFlashlightEnabled
    ? clamp(activePlayerViewPolicy?.flashlightOpacity ?? DEFAULT_FLASHLIGHT_OPACITY, 0, 1)
    : 1
  const editorFlashlightPreviews = useMemo(() => {
    return Object.entries(tokenAssignments)
      .map(([tokenId, assignment]) => {
        if (assignment.flashlightEnabled !== true) {
          return null
        }

        const item = terrain.items.find((entry) => entry.id === tokenId && entry.kind === 'token')
        const resolved = resolvedEditorItems.get(tokenId)
        if (!item || !resolved) {
          return null
        }

        const originX = resolved.x + (item.width * resolved.scale) / 2
        const originY = resolved.y + (item.height * resolved.scale) / 2
        return {
          tokenId,
          path: '', // géré par FlashlightSystem à 175Hz
          originX,
          originY,
          opacity: clamp(assignment.flashlightOpacity ?? DEFAULT_FLASHLIGHT_OPACITY, 0, 1),
          isActive: playerPhoneStates[assignment.playerId]?.flashlightEnabled !== false,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [playerPhoneStates, resolvedEditorItems, roomPlayers, roomPlayersByPredeclaredId, terrain.items, tokenAssignments])
  const editorLockedViewPreviews = useMemo(() => {
    return Object.entries(tokenAssignments)
      .map(([tokenId, assignment]) => {
        if (assignment.mode !== 'locked-token') {
          return null
        }

        if (!selectedItemIds.includes(tokenId)) {
          return null
        }

        const item = terrain.items.find((entry) => entry.id === tokenId && entry.kind === 'token')
        const resolved = resolvedEditorItems.get(tokenId)
        if (!item || !resolved) {
          return null
        }

        const centerX = resolved.x + (item.width * resolved.scale) / 2
        const centerY = resolved.y + (item.height * resolved.scale) / 2
        const size = clamp(assignment.lockedViewSize ?? DEFAULT_LOCKED_VIEW_SIZE, 160, 4000)

        return {
          tokenId,
          left: centerX - size / 2,
          top: centerY - size / 2,
          size,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [resolvedEditorItems, terrain.items, tokenAssignments, selectedItemIds])
  const isForcedHostFollow = activePlayerViewPolicy?.mode === 'follow-host'
  const isLockedToToken = activePlayerViewPolicy?.mode === 'locked-token'
  const isFollowHostViewLocked = isForcedHostFollow && activePlayerViewPolicy?.lockVisibleArea === true
  const lockedViewSize = clamp(activePlayerViewPolicy?.lockedViewSize ?? DEFAULT_LOCKED_VIEW_SIZE, 160, 4000)
  const usesLockedViewport = isLockedToToken || isFollowHostViewLocked
  const effectiveFollowHost = !isLockedToToken && (isForcedHostFollow || isFollowingHostCursor)
  const hideRemoteVisionAidsInFlashlight = usesPhoneFlashlightViewport
  const visibleShortcuts = useMemo(() => {
    const sharedShortcuts = [
      {
        key: 'zoom-grid',
        label: 'Ctrl/Cmd + molette',
        description: 'Zoom sur la grille sous le curseur',
        category: 'Grille et Vue',
      },
      {
        key: 'pan-grid',
        label: 'Ctrl + glisser',
        description: 'Deplacer la vue de la grille',
        category: 'Grille et Vue',
      },
      {
        key: 'measure',
        label: 'R',
        description: 'Poser une regle temporaire synchronisee pour tous pendant 3 secondes',
        category: 'Grille et Vue',
      },
    ]

    if (viewMode === 'editor') {
      return [
        ...sharedShortcuts,
        {
          key: 'host-ping',
          label: 'A',
          description: 'Envoyer un ping partage depuis la grille en mode MJ',
          category: 'Communication',
        },
        {
          key: 'delete-item',
          label: 'Suppr',
          description: 'Supprimer l element selectionne',
          category: '�?dition',
        },
        {
          key: 'undo',
          label: 'Ctrl/Cmd + Z',
          description: 'Annuler la derniere modification du terrain',
          category: '�?dition',
        },
        {
          key: 'move-item-to-pointer',
          label: 'B',
          description: 'Placer l element selectionne sous la souris sur la grille',
          category: '�?dition',
        },
        {
          key: 'copy-item',
          label: 'Ctrl/Cmd + C',
          description: 'Copier l element selectionne',
          category: '�?dition',
        },
        {
          key: 'paste-item',
          label: 'Ctrl/Cmd + V',
          description: 'Coller une copie de l element selectionne',
          category: '�?dition',
        },
        {
          key: 'assign-parent',
          label: 'Alt + Drag & Drop',
          description: 'Assigner rapidement un ou plusieurs éléments à un parent (survolé)',
          category: '�?dition',
        },
        {
          key: 'assign-parent-mass',
          label: 'Ctrl/Cmd + P',
          description: 'Activer le mode d\'assignation de parent (cliquez ensuite sur la hiérarchie)',
          category: '�?dition',
        },
        {
          key: 'toggle-lock',
          label: 'L',
          description: 'Verrouiller ou deverrouiller l element selectionne',
          category: 'Attributs',
        },
        {
          key: 'toggle-visibility',
          label: 'S',
          description: 'Afficher ou masquer l element selectionne',
          category: 'Attributs',
        },
        {
          key: 'focus-hierarchy',
          label: 'Double-clic hierarchie',
          description: 'Recentre la grille sur l element choisi',
          category: 'Navigation',
        },
        {
          key: 'focus-selected-item',
          label: 'Ctrl/Cmd + F',
          description: 'Recentre la grille sur l element selectionne',
          category: 'Navigation',
        },
      ]
    }

    return [
      ...sharedShortcuts,
      {
        key: 'player-ping',
        label: 'A',
        description: 'Envoyer un ping partage en vue joueur',
        category: 'Communication',
      },
    ]
  }, [viewMode])
  useEffect(() => {
    if (!hasAutoSaveTarget || !isAutoSaveOnModifyEnabled || lastTerrainSaveAt === null) return
    setSaveStatusNow(Date.now())
    const id = window.setInterval(() => setSaveStatusNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [hasAutoSaveTarget, isAutoSaveOnModifyEnabled, lastTerrainSaveAt])
  const audioPlaybackStatus = !activeAudioTrack
    ? 'Aucune piste'
    : sharedAudioState.isPlaying
      ? 'Lecture en cours'
      : 'En pause'
  const lastTerrainSaveLabel = useMemo(() => {
    if (lastTerrainSaveAt === null) {
      return 'Derniere sauvegarde: jamais'
    }

    return `Derniere sauvegarde: ${new Date(lastTerrainSaveAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }, [lastTerrainSaveAt])
  const terrainSaveStatusLabel = useMemo(() => {
    if (!hasAutoSaveTarget) return 'inactif: aucun fichier lié'
    if (!isAutoSaveOnModifyEnabled) return 'inactif: désactivé'
    if (lastTerrainSaveAt === null) return 'en attente de sauvegarde'
    const diffMs = saveStatusNow - lastTerrainSaveAt
    if (diffMs < 60_000) return 'il y a moins d\'une minute'
    if (diffMs < 3_600_000) {
      const mins = Math.floor(diffMs / 60_000)
      return `il y a ${mins} min`
    }
    const hours = Math.floor(diffMs / 3_600_000)
    return `il y a ${hours}h`
  }, [hasAutoSaveTarget, isAutoSaveOnModifyEnabled, lastTerrainSaveAt, saveStatusNow])

  const hasUnsavedChanges = terrainModifiedAt !== null && (lastTerrainSaveAt === null || terrainModifiedAt > lastTerrainSaveAt)
  const saveSubLabel = useMemo(() => {
    if (!hasAutoSaveTarget) return null
    if (isAutoSaveScheduled) return 'Sauvegarde prévue...'
    if (hasUnsavedChanges) return 'Modification détectée'
    return null
  }, [hasAutoSaveTarget, isAutoSaveScheduled, hasUnsavedChanges])

  const activeLibraryFolder = useMemo(
    () => (libraryRoot ? findLibraryFolder(libraryRoot, activeLibraryPath) ?? libraryRoot : null),
    [activeLibraryPath, libraryRoot],
  )
  const libraryBreadcrumbs = useMemo(
    () => (libraryRoot ? buildLibraryBreadcrumbs(libraryRoot, activeLibraryPath) : []),
    [activeLibraryPath, libraryRoot],
  )
  const filteredLibraryFolders = useMemo(() => {
    if (!activeLibraryFolder) {
      return []
    }

    const query = librarySearchQuery.trim().toLowerCase()
    if (!query) {
      return activeLibraryFolder.folders
    }

    return activeLibraryFolder.folders.filter((folder) => folder.name.toLowerCase().includes(query))
  }, [activeLibraryFolder, librarySearchQuery])
  const filteredLibraryAssets = useMemo(() => {
    if (!activeLibraryFolder) {
      return []
    }

    const query = librarySearchQuery.trim().toLowerCase()
    if (!query) {
      return searchLibraryAssets(activeLibraryFolder, '')
    }

    return searchLibraryAssets(activeLibraryFolder, query)
  }, [activeLibraryFolder, librarySearchQuery])
  const libraryShortcutFolders = useMemo(() => {
    if (!activeLibraryFolder) {
      return []
    }

    const query = librarySearchQuery.trim().toLowerCase()
    const folders = collectLibraryFolders(activeLibraryFolder, true)

    if (!query) {
      return folders
    }

    return folders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(query) ||
        folder.path.toLowerCase().includes(query) ||
        countLibraryAssets(folder) > 0,
    )
  }, [activeLibraryFolder, librarySearchQuery])

  function dismissStatusNotification(notificationId: string) {
    const timeoutId = statusTimeoutsRef.current.get(notificationId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      statusTimeoutsRef.current.delete(notificationId)
    }

    setStatusNotifications((current) => current.filter((notification) => notification.id !== notificationId))
  }

  function setStatusMessage(message: string) {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      return
    }

    const notificationId = generateClientId()
    const notification: StatusNotification = {
      id: notificationId,
      message: trimmedMessage,
      tone: inferStatusTone(trimmedMessage),
    }

    setStatusNotifications((current) => [...current, notification].slice(-MAX_STATUS_NOTIFICATIONS))

    const timeoutId = window.setTimeout(() => {
      dismissStatusNotification(notificationId)
    }, STATUS_SNACKBAR_DURATION_MS)

    statusTimeoutsRef.current.set(notificationId, timeoutId)
  }

  useLayoutEffect(() => {
    if (inspectorScrollRef.current && selectedItemId) {
      inspectorScrollRef.current.scrollTop = lastInspectorScrollTop.current
    }
  }, [selectedItemId])

  useEffect(() => {
    setIsNoteColorPaletteOpen(false)
    setIsTokenPanelColorPaletteOpen(false)
  }, [selectedItem?.id])

  useEffect(() => {
    return () => {
      for (const timeoutId of statusTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId)
      }

      statusTimeoutsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    terrainRef.current = terrain
    setTerrainModifiedAt(Date.now())
  }, [terrain])

  useEffect(() => {
    editorZoomRef.current = editorZoom
  }, [editorZoom])

  useEffect(() => {
    playerZoomRef.current = playerZoom
  }, [playerZoom])

  useEffect(() => {
    playerTerrainRef.current = playerTerrain
  }, [playerTerrain])



  useEffect(() => {
    if (!draggingPanel) return

    const handleMove = (event: PointerEvent) => {
      handlePanelDragMove(event)
    }

    const handleEnd = () => {
      handlePanelDragEnd()
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
    }
  }, [draggingPanel])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(LIBRARY_PREVIEW_SIZE_STORAGE_KEY, String(libraryPreviewSize))
  }, [libraryPreviewSize])

  useEffect(() => {
    if (!isLibraryDialogOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      setIsLibraryDialogOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLibraryDialogOpen])

  useEffect(() => {
    if (isLibraryDialogOpen && !activeLibraryTabId && terrain.libraryTabs && terrain.libraryTabs.length > 0) {
      void loadLibraryTab(terrain.libraryTabs[0].id)
    }
    if (!isLibraryDialogOpen) {
      dirHandleCache.clear()
      libraryAssetUrlCache.forEach(url => URL.revokeObjectURL(url))
      libraryAssetUrlCache.clear()
    }
  }, [isLibraryDialogOpen, activeLibraryTabId, terrain.libraryTabs])

  // ⚠️ Bug fix : si l'utilisateur a tapé du texte dans l'éditeur de l'item
  // précédent mais n'a pas cliqué sur un bouton de la toolbar (qui flush
  // via `applyNoteCommand`) ni explicitement blur l'éditeur (clic hors
  // champ texte qui appelle `onBlur`), le DOM contient des modifications
  // non persistées. Si on bascule l'innerHTML sur le nouveau item sans
  // commit au préalable, le contenu sale reste dans le DOM, et la
  // prochaine saisie/blur/commit l'écrira dans le MAUVAIS item.
  //
  // Stratégie : on garde un ref `shownItemIdRef` qui contient l'id de
  // l'item dont la note est ACTUELLEMENT affichée dans le DOM. Quand
  // l'effet détecte que `selectedItemId` diffère de `shownItemIdRef`,
  // on commit le DOM dans l'ancien item (trouvé via le terrain via
  // l'ancien id), puis on bascule le DOM sur le nouveau contenu. Le ref
  // est mis à jour À LA FIN de l'effet, donc même si React re-render
  // entre-temps, le prochain passage trouvera le bon `shownItemIdRef`.
  //
  // ⚠️ On ne peut PAS utiliser `selectedItemRef` ici car ce ref est mis
  // à jour AVANT cet effet (ordre de déclaration des useEffects) — il
  // pointerait déjà vers le nouvel item, et on committerait dans le
  // mauvais item. D'où l'utilisation d'un ref dédié mis à jour à la fin.
  const noteEditorShownItemIdRef = useRef<string | null>(null)
  useEffect(() => {
    const editor = noteEditorRef.current
    if (!editor) {
      return
    }

    const currentShownId = noteEditorShownItemIdRef.current
    const nextId = selectedItem?.id ?? null

    if (currentShownId !== nextId) {
      // L'item affiché change : on commit le contenu sale dans
      // l'ancien item (trouvé via son id dans le terrain courant).
      if (currentShownId && document.activeElement === editor) {
        const previous = terrainRef.current.items.find(
          (item) => item.id === currentShownId,
        )
        const currentEditor = noteEditorRef.current
        if (previous && currentEditor) {
          const nextNote = sanitizeRichTextNote(currentEditor.innerHTML)
          if (nextNote !== previous.note) {
            updateItem(previous.id, { note: nextNote }, { recordHistory: true })
          }
        }
        currentEditor?.blur()
      }

      const nextHtml = renderNoteHtml(selectedItem?.note ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
      noteEditorShownItemIdRef.current = nextId
    } else if (document.activeElement !== editor) {
      // Même item, mais l'utilisateur n'est pas en train d'éditer : on
      // resynchronise si le contenu a changé (ex: undo/redo, sync
      // WebSocket, etc.).
      const nextHtml = renderNoteHtml(selectedItem?.note ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
    }
  }, [selectedItem?.id, selectedItem?.note])

  // Cf. commentaire détaillé dans `noteEditorShownItemIdRef` au-dessus.
  // Même stratégie : ref dédié par éditeur, mis à jour à la fin de
  // l'effet, pour ne jamais confondre "item actuellement sélectionné"
  // (qui change AVANT cet effet) et "item dont la note est affichée
  // dans le DOM" (qu'on track nous-mêmes).
  const notePlayersEditorShownItemIdRef = useRef<string | null>(null)
  useEffect(() => {
    const editor = notePlayersEditorRef.current
    if (!editor) {
      return
    }

    const currentShownId = notePlayersEditorShownItemIdRef.current
    const nextId = selectedItem?.id ?? null

    if (currentShownId !== nextId) {
      if (currentShownId && document.activeElement === editor) {
        const previous = terrainRef.current.items.find(
          (item) => item.id === currentShownId,
        )
        const currentEditor = notePlayersEditorRef.current
        if (previous && currentEditor) {
          const nextNote = sanitizeRichTextNote(currentEditor.innerHTML)
          if (nextNote !== previous.notePlayers) {
            updateItem(previous.id, { notePlayers: nextNote }, { recordHistory: true })
          }
        }
        currentEditor?.blur()
      }

      const nextHtml = renderNoteHtml(selectedItem?.notePlayers ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
      notePlayersEditorShownItemIdRef.current = nextId
    } else if (document.activeElement !== editor) {
      const nextHtml = renderNoteHtml(selectedItem?.notePlayers ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
    }
  }, [selectedItem?.id, selectedItem?.notePlayers])

  // Cf. commentaire détaillé dans `noteEditorShownItemIdRef` au-dessus.
  const tokenPanelEditorShownItemIdRef = useRef<string | null>(null)
  useEffect(() => {
    const editor = tokenPanelEditorRef.current
    if (!editor || !selectedItem) {
      return
    }

    const currentShownId = tokenPanelEditorShownItemIdRef.current
    const nextId = selectedItem.id

    if (currentShownId !== nextId) {
      if (currentShownId && document.activeElement === editor) {
        const previous = terrainRef.current.items.find(
          (item) => item.id === currentShownId,
        )
        const currentEditor = tokenPanelEditorRef.current
        if (previous && currentEditor) {
          const nextContent = sanitizeRichTextNote(currentEditor.innerHTML)
          if (nextContent !== previous.tokenPanelText) {
            updateItem(previous.id, { tokenPanelText: nextContent }, { recordHistory: true })
          }
        }
        currentEditor?.blur()
      }

      const nextHtml = renderNoteHtml(selectedItem.tokenPanelText ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
      tokenPanelEditorShownItemIdRef.current = nextId
    } else if (document.activeElement !== editor) {
      const nextHtml = renderNoteHtml(selectedItem.tokenPanelText ?? '')
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
    }
  }, [selectedItem?.id, selectedItem?.kind, selectedItem?.tokenPanelText])

  useEffect(() => {
    const audio = audioElementRef.current
    if (audio) {
      audio.volume = clamp(audioVolume, 0, 1)
    }

    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(Math.round(clamp(audioVolume, 0, 1) * 100))
    }
  }, [audioVolume, activeAudioTrack?.src, isYouTubeAudio])

  useEffect(() => {
    if (!pendingSoundboardPlacement) return
    const onMouseMove = (e: MouseEvent) => {
      if (cursorTagRef.current) {
        cursorTagRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [pendingSoundboardPlacement])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemThemeMode(event.matches ? 'dark' : 'light')
    }

    setSystemThemeMode(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedThemeMode
    document.documentElement.style.colorScheme = resolvedThemeMode
    document.title = 'OmegaRoleGameEditor'
  }, [resolvedThemeMode])

  useEffect(() => {
    if (!selectedLayerId && terrain.layers[0]) {
      setSelectedLayerId(terrain.layers[0].id)
      return
    }

    if (selectedLayerId && !terrain.layers.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(terrain.layers[0]?.id ?? null)
    }
  }, [selectedLayerId, terrain.layers])

  useEffect(() => {
    if (selectedItemId && !terrain.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(null)
    }
  }, [selectedItemId, terrain.items])

  useEffect(() => {
    const availableIds = new Set(terrain.items.map((item) => item.id))
    const nextSelectedItemIds = selectedItemIds.filter((itemId) => availableIds.has(itemId))

    if (nextSelectedItemIds.length !== selectedItemIds.length) {
      setSelectedItemIds(nextSelectedItemIds)
    }

    if (!selectedItemId) {
      if (nextSelectedItemIds.length > 0) {
        setSelectedItemIds([])
      }
      return
    }

    if (!availableIds.has(selectedItemId)) {
      return
    }

    if (!nextSelectedItemIds.includes(selectedItemId)) {
      setSelectedItemIds([selectedItemId])
    }
  }, [selectedItemId, selectedItemIds, terrain.items])

  useEffect(() => {
    if (hoveredEditorItemId && !terrain.items.some((item) => item.id === hoveredEditorItemId)) {
      setHoveredEditorItemId(null)
    }
  }, [hoveredEditorItemId, terrain.items])

  useEffect(() => {
    if (syncedMeasures.length === 0) {
      return
    }

    const now = Date.now()
    const nextExpiry = Math.min(...syncedMeasures.map((measure) => measure.expiresAt))
    const timeoutId = window.setTimeout(() => {
      const nextNow = Date.now()
      setSyncedMeasures((current) => current.filter((measure) => measure.expiresAt > nextNow))
    }, Math.max(0, nextExpiry - now))

    return () => window.clearTimeout(timeoutId)
  }, [syncedMeasures])

  useEffect(() => {
    if (activeDiceRolls.length === 0) {
      return
    }

    const now = Date.now()
    const nextExpiry = Math.min(...activeDiceRolls.map((roll) => roll.expiresAt))
    const timeoutId = window.setTimeout(() => {
      const nextNow = Date.now()
      setActiveDiceRolls((current) => current.filter((roll) => roll.expiresAt > nextNow))
    }, Math.max(0, nextExpiry - now))

    return () => window.clearTimeout(timeoutId)
  }, [activeDiceRolls])

  useEffect(() => {
    if (!leftPanelResizeState) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - leftPanelResizeState.startX
      setLeftPanelWidth(clamp(leftPanelResizeState.startWidth + deltaX, MIN_HIERARCHY_PANEL_WIDTH, MAX_HIERARCHY_PANEL_WIDTH))
    }

    const handlePointerUp = () => {
      setLeftPanelResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [leftPanelResizeState])

  useEffect(() => {
    if (!rightPanelResizeState) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = rightPanelResizeState.startX - event.clientX
      setRightPanelWidth(clamp(rightPanelResizeState.startWidth + deltaX, MIN_INSPECTOR_PANEL_WIDTH, MAX_INSPECTOR_PANEL_WIDTH))
    }

    const handlePointerUp = () => {
      setRightPanelResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [rightPanelResizeState])

  useEffect(() => {
    const validTokenIds = new Set(terrain.items.filter((item) => item.kind === 'token').map((item) => item.id))
    const validPlayerIds = new Set(hostAssignablePlayers.map((player) => player.id))
    // En mode pré-allocation, ne pas nettoyer si les predeclaredPlayers ne sont pas encore chargés
    // (évite de perdre les assignations pendant le chargement initial du workfolder)
    if (isPlayerPreallocationEnabled && predeclaredPlayers.length === 0 && validPlayerIds.size === 0) {
      return
    }

    setTokenAssignments((current) => {
      const nextEntries = Object.entries(current).filter(
        ([tokenId, assignment]) => validTokenIds.has(tokenId) && (assignment.playerId === '' || validPlayerIds.has(assignment.playerId)),
      )

      if (nextEntries.length === Object.keys(current).length) {
        return current
      }

      // Met aussi à jour le terrain pour que la suppression soit persistée
      const nextAssignments = Object.fromEntries(nextEntries)
      updateTerrain((currentTerrain) => ({
        ...currentTerrain,
        tokenAssignments: nextAssignments,
      }))

      return nextAssignments
    })
  }, [hostAssignablePlayers, terrain.items, isPlayerPreallocationEnabled, predeclaredPlayers.length])

  // Envoi des viewPolicies au joueur. L'envoi n'est plus debouncé ici car le
  // onLiveChange du CharacterSheetDialog est déjà debounced (500ms). Les
  // mises à jour arrivent donc déjà espacées. On garde un guard simple.
  useEffect(() => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }
    wsRef.current.send(
      JSON.stringify({
        type: 'host:updateViewPolicies',
        policies: buildPlayerViewPolicies(tokenAssignments, currentTurnEntry, terrainRef.current.items),
      }),
    )
  }, [isPlayerPreallocationEnabled, predeclaredPlayers, tokenAssignments, currentTurnEntry])

  useEffect(() => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'host:updatePlayerRegistry',
        preallocationEnabled: isPlayerPreallocationEnabled,
        predeclaredPlayers,
      }),
    )
  }, [isPlayerPreallocationEnabled, predeclaredPlayers])

  useEffect(() => {
    if (!isClientDialogOpen) {
      return
    }

    const normalizedRoomId = roomId.trim().toUpperCase()
    if (!normalizedRoomId) {
      setJoinConfig(null)
      setSelectedPredeclaredPlayerId('')
      return
    }

    const abortController = new AbortController()
    setIsJoinConfigLoading(true)

    void loadJoinConfig(normalizedRoomId, abortController.signal)
      .then((nextJoinConfig) => {
        if (!nextJoinConfig) {
          throw new Error('join-config-unavailable')
        }

        setJoinConfig(nextJoinConfig)
        setSelectedPredeclaredPlayerId((current) => {
          const isStillAvailable = nextJoinConfig.predeclaredPlayers.some(
            (player) => player.id === current && !player.connectedPlayerId,
          )
          return isStillAvailable ? current : ''
        })
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setJoinConfig(null)
          setSelectedPredeclaredPlayerId('')
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsJoinConfigLoading(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [isClientDialogOpen, roomId, serverUrl])

  async function loadJoinConfig(targetRoomId: string, abortSignal?: AbortSignal) {
    const requestUrl = buildJoinConfigUrl(serverUrl, targetRoomId)
    if (!requestUrl) {
      return null
    }

    const response = await fetch(requestUrl, { signal: abortSignal })
    if (!response.ok) {
      return null
    }

    return normalizeRoomJoinConfigMessage((await response.json()) as unknown)
  }

  async function connectPlayerWithJoinConfig() {
    const normalizedRoomId = roomId.trim().toUpperCase()
    if (!normalizedRoomId) {
      setStatusMessage('Renseigne un code de salle.')
      return
    }

    setIsJoinConfigLoading(true)
    try {
      const latestJoinConfig = await loadJoinConfig(normalizedRoomId)
      if (latestJoinConfig) {
        setJoinConfig(latestJoinConfig)

        if (latestJoinConfig.preallocationEnabled) {
          const selectedPlayerStillAvailable = latestJoinConfig.predeclaredPlayers.some(
            (player) => player.id === selectedPredeclaredPlayerId && !player.connectedPlayerId,
          )

          if (!selectedPlayerStillAvailable) {
            setSelectedPredeclaredPlayerId('')
            setIsPredeclaredPlayerChoiceDialogOpen(true)
            setStatusMessage('Choisis un joueur pre-alloue avant de rejoindre.')
            return
          }
        }
      }

      setIsPredeclaredPlayerChoiceDialogOpen(false)
      connect('player')
      setIsClientDialogOpen(false)
    } finally {
      setIsJoinConfigLoading(false)
    }
  }

  useEffect(() => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'host:updateAudioState',
        audioState: sharedAudioState,
      }),
    )
  }, [sharedAudioState])

  useEffect(() => {
    if (isYouTubeAudio) {
      const yt = ytPlayerRef.current
      if (!yt) return

      try {
        if (sharedAudioState.isPlaying) {
          if (yt.getPlayerState && yt.getPlayerState() !== 1) { // 1 is PLAYING
            yt.playVideo()
          }
          const currentYtTime = yt.getCurrentTime ? yt.getCurrentTime() : 0
          if (Math.abs(currentYtTime - sharedAudioState.currentTime) > 2) {
            yt.seekTo(sharedAudioState.currentTime, true)
          }
        } else {
          if (yt.getPlayerState && yt.getPlayerState() === 1) {
            yt.pauseVideo()
          }
        }
      } catch (e) {
        // Player might be destroyed during transition — safe to ignore
        console.warn('[audio] YouTube player method failed (player may be stale):', e)
      }
      // Loop is handled manually in onStateChange (ENDED) callback
      return
    }

    const audio = audioElementRef.current
    if (!audio) {
      return
    }

    audio.loop = sharedAudioState.isLooping

    if (!activeAudioTrack?.src) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      return
    }

    const targetTime = sharedAudioState.isPlaying
      ? sharedAudioState.currentTime + Math.max(0, Date.now() - sharedAudioState.updatedAt) / 1000
      : sharedAudioState.currentTime

    const applyPlayback = () => {
      if (Math.abs(audio.currentTime - targetTime) > 0.35) {
        audio.currentTime = Math.max(0, targetTime)
      }

      if (sharedAudioState.isPlaying) {
        void audio.play().catch(() => {
          if (roleRef.current === 'player') {
            setStatusMessage('Lecture audio bloquee par le navigateur.')
          }
        })
        return
      }

      audio.pause()
    }

    if (audio.readyState >= 1) {
      applyPlayback()
      return
    }

    const handleLoadedMetadata = () => applyPlayback()
    audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [activeAudioTrack?.src, sharedAudioState])

  useEffect(() => {
    if (roleRef.current !== 'host' || !sharedAudioState.isPlaying || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    // Audio sync is handled by useSharedAudio hook — this effect just sends the initial state
    wsRef.current.send(
      JSON.stringify({
        type: 'host:updateAudioState',
        audioState: sharedAudioStateRef.current,
      }),
    )
  }, [sharedAudioState.isPlaying])

  useEffect(() => {
    if (roleRef.current !== 'host' || wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'host:updateViewport',
        zoom: editorZoom,
      }),
    )
  }, [editorZoom])

  useEffect(() => {
    if (viewMode !== 'player') {
      return
    }

    if (effectiveFollowHost && hostPresence?.zoom) {
      setPlayerZoom(clamp(hostPresence.zoom, 0.05, 6))
    }
  }, [effectiveFollowHost, hostPresence?.zoom, viewMode])

  useEffect(() => {
    if (viewMode !== 'player') {
      return
    }

    const frame = playerStageFrameRef.current
    if (!frame) {
      return
    }

    const recenterViewport = () => {
      if (isLockedToToken && assignedToken && assignedTokenResolved) {
        centerScrollablePoint(
          frame,
          (assignedTokenResolved.x + (assignedToken.width * assignedTokenResolved.scale) / 2) * playerZoom,
          (assignedTokenResolved.y + (assignedToken.height * assignedTokenResolved.scale) / 2) * playerZoom,
          playerTerrain.width * playerZoom,
          playerTerrain.height * playerZoom,
        )
        return
      }

      if (effectiveFollowHost && hostPresence) {
        centerScrollablePoint(
          frame,
          hostPresence.x * playerZoom,
          hostPresence.y * playerZoom,
          playerTerrain.width * playerZoom,
          playerTerrain.height * playerZoom,
        )
      }
    }

    let frameId = 0
    let settleFrameId = 0

    frameId = window.requestAnimationFrame(() => {
      recenterViewport()
      settleFrameId = window.requestAnimationFrame(recenterViewport)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(settleFrameId)
    }
  }, [
    assignedToken,
    assignedTokenResolved,
    effectiveFollowHost,
    hostPresence,
    isFollowHostViewLocked,
    isLockedToToken,
    lockedViewSize,
    playerTerrain.height,
    playerTerrain.width,
    playerZoom,
    viewMode,
  ])

  useEffect(() => {
    if (!panState) {
      return
    }

    const frame = panState.targetView === 'player' ? playerStageFrameRef.current : editorStageFrameRef.current
    if (!frame) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      frame.scrollLeft = panState.startScrollLeft - (event.clientX - panState.pointerX)
      frame.scrollTop = panState.startScrollTop - (event.clientY - panState.pointerY)
    }

    const handlePointerUp = () => {
      setPanState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [panState])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canHandleEditorShortcutTarget(document.activeElement)) {
        return
      }

      const key = event.key.toLowerCase()

      if (event.repeat) {
        return
      }

      if (viewMode === 'editor' && event.key === 'Delete' && selectedItemId) {
        event.preventDefault()
        deleteItem(selectedItemId)
        setStatusMessage('Element supprime.')
        return
      }

      if (viewMode === 'editor' && key === 'escape' && isMassReparentingMode) {
        event.preventDefault()
        setIsMassReparentingMode(false)
        return
      }

      if (viewMode === 'editor' && (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'p') {
        event.preventDefault()
        if (selectedItemIds.length > 0) {
          setIsMassReparentingMode((prev) => !prev)
        } else {
          setStatusMessage('Veuillez d\'abord sélectionner des éléments.')
        }
        return
      }

      if (viewMode === 'editor' && (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'z') {
        event.preventDefault()
        undoTerrainChange()
        return
      }

      if (viewMode === 'editor' && (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'c') {
        if (!copySelectedItemToClipboard()) {
          return
        }

        event.preventDefault()
        setStatusMessage('Element copie.')
        return
      }

      if (viewMode === 'editor' && (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'f') {
        if (!selectedItemId) {
          return
        }

        event.preventDefault()
        focusHierarchyItem(selectedItemId)
        return
      }

      if (viewMode === 'editor' && (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'v') {
        if (!pasteCopiedItemFromClipboard()) {
          return
        }

        event.preventDefault()
        setStatusMessage('Element colle.')
        return
      }

      if (viewMode === 'editor' && key === 'l' && selectedItem) {
        if (!toggleSelectedItemLock()) {
          return
        }

        event.preventDefault()
        return
      }

      if (viewMode === 'editor' && key === 's' && selectedItem) {
        if (!toggleSelectedItemVisibility()) {
          return
        }

        event.preventDefault()
        return
      }

      if (viewMode === 'editor' && key === 'b' && selectedItem) {
        if (!moveSelectedItemToEditorPointer()) {
          return
        }

        event.preventDefault()
        return
      }

      if (key === 'r') {
        const point = getCurrentStageMapPoint(viewMode)
        if (!point || measureStartPointRef.current) {
          return
        }

        event.preventDefault()
        measureStartPointRef.current = point
        measureDraftIdRef.current = generateClientId()
        setMeasureDraft({ start: point, end: point })
        sendMeasureUpdate(point, point, { id: measureDraftIdRef.current, force: true })
        return
      }

      if (key !== 'a' || !roleRef.current) {
        return
      }

      const pointer = viewMode === 'player' ? lastPlayerPointerRef.current : lastEditorPointerRef.current
      if (!pointer) {
        return
      }

      event.preventDefault()
      sendSessionPing(pointer.x, pointer.y)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeLayerId, playerId, selectedItem, selectedItemId, selectedItemIds, isMassReparentingMode, viewMode])

  useEffect(() => {
    function handleNoteKeyDown(e: KeyboardEvent) {
      if ((e.key === 'o' || e.key === 'O') && e.ctrlKey) {
        if (hoveredNoteItem) {
          e.preventDefault()
          setNoteDialogItem(hoveredNoteItem)
          hideNoteTooltip()
        }
      }
    }
    window.addEventListener('keydown', handleNoteKeyDown)
    return () => window.removeEventListener('keydown', handleNoteKeyDown)
  }, [hoveredNoteItem])

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'r') {
        return
      }

      const start = measureStartPointRef.current
      if (!start) {
        return
      }

      const end = getCurrentStageMapPoint(viewMode) ?? start
      const measureId = measureDraftIdRef.current ?? generateClientId()
      measureStartPointRef.current = null
      measureDraftIdRef.current = null
      setMeasureDraft(null)
      sendMeasureUpdate(start, end, { id: measureId, pushLocal: true, force: true })
    }

    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [viewMode])

  useEffect(() => {
    if (!dragState) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const stage = editorStageRef.current
      const currentTerrain = terrainRef.current
      if (!stage) {
        return
      }

      const point = getMapPoint(stage, currentTerrain.width, currentTerrain.height, event.clientX, event.clientY)
      const itemMap = new Map(currentTerrain.items.map((item) => [item.id, item]))
      // Use cached resolved map �?" parent transforms don't change during drag
      const resolved = resolvedEditorItemsRef.current
      const nextPositions = new Map(
        dragState.itemOffsets
          .map((entry) => {
            const currentItem = itemMap.get(entry.itemId)
            if (!currentItem || currentItem.locked) {
              return null
            }

            const nextWorldX = point.x - entry.offsetX
            const nextWorldY = point.y - entry.offsetY
            const parentTransform = currentItem.parentId
              ? resolved.get(currentItem.parentId) ?? DEFAULT_TRANSFORM
              : DEFAULT_TRANSFORM
            let local = toLocalPoint(nextWorldX, nextWorldY, parentTransform)

            if (isGridSnapEnabled && currentTerrain.gridSize > 0 && !event.ctrlKey) {
              local = {
                x: Math.round(local.x / currentTerrain.gridSize) * currentTerrain.gridSize,
                y: Math.round(local.y / currentTerrain.gridSize) * currentTerrain.gridSize,
              }
            }

            return [entry.itemId, local] as const
          })
          .filter((entry): entry is readonly [string, { x: number; y: number }] => entry !== null),
      )

      if (nextPositions.size === 0) {
        return
      }

      captureContinuousTerrainHistory()

      // === DOM-direct drag (zéro re-render React pendant le drag) ===
      // On mute directement les styles left/top des sprites draggés + descendants
      // pour éviter un setTerrain (�?' re-render complet d'App) à chaque frame.
      // Le commit terrain final se fait au pointerup.
      const stageEl = editorStageRef.current
      if (stageEl) {
        // Calcule le delta world pour appliquer aux descendants
        const firstEntry = dragState.itemOffsets[0]
        const firstResolved = resolved.get(firstEntry.itemId)
        if (firstResolved) {
          const newFirstX = point.x - firstEntry.offsetX
          const newFirstY = point.y - firstEntry.offsetY
          const deltaWorldX = newFirstX - firstResolved.x
          const deltaWorldY = newFirstY - firstResolved.y

          // Applique le delta world à tous les sprites draggés + leurs descendants
          const allIds = new Set<string>()
          for (const entry of dragState.itemOffsets) {
            allIds.add(entry.itemId)
            for (const descId of getDescendantIds(currentTerrain.items, entry.itemId)) {
              allIds.add(descId)
            }
          }

          for (const id of allIds) {
            const r = resolved.get(id)
            if (!r) continue
            // querySelectorAll : le wrapper <div data-item-id> (non positionné) ET le
            // sprite <img>/<div> enfant (position: absolute, left/top inline) portent
            // tous deux data-item-id. On met à jour left/top sur tous ; seul l'élément
            // positionné (position: absolute) réagit visuellement.
            const els = stageEl.querySelectorAll<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`)
            for (let i = 0; i < els.length; i++) {
              els[i].style.left = `${r.x + deltaWorldX}px`
              els[i].style.top = `${r.y + deltaWorldY}px`
            }
          }
        }
      }

      // Stocke les positions finales pour le commit au pointerup
      dragPendingPositionsRef.current = new Map(nextPositions)

      // Sync joueur par rAF (sans setTerrain) �?" envoie host:syncItem directement
      if (dragRafIdRef.current === null) {
        dragRafIdRef.current = window.requestAnimationFrame(() => {
          dragRafIdRef.current = null
          const pending = dragPendingPositionsRef.current
          if (!pending || pending.size === 0) return

          // Envoie les items mis à jour aux joueurs via host:syncItem sans re-render local
          if (roleRef.current === 'host' && wsRef.current?.readyState === WebSocket.OPEN) {
            const currentItems = terrainRef.current.items
            for (const [itemId, pos] of pending) {
              const item = currentItems.find((i) => i.id === itemId)
              if (item) {
                wsRef.current.send(JSON.stringify({
                  type: 'host:syncItem',
                  item: { ...item, x: pos.x, y: pos.y },
                }))
              }
            }
          }
        })
      }

      if (event.altKey) {
        const draggedIds = Array.from(nextPositions.keys())
        const elements = document.elementsFromPoint(event.clientX, event.clientY)
        const hit = elements.find(
          (el) => el.hasAttribute('data-item-id') && !draggedIds.includes(el.getAttribute('data-item-id')!),
        )
        if (hit && dragTooltipRef.current) {
          const parentId = hit.getAttribute('data-item-id')!
          const item = terrainRef.current.items.find((i) => i.id === parentId)
          if (item) {
            dragTooltipRef.current.style.display = 'block'
            dragTooltipRef.current.style.left = `${event.clientX + 15}px`
            dragTooltipRef.current.style.top = `${event.clientY + 15}px`
            dragTooltipRef.current.textContent = `Enfant de: ${item.name || '�?lément'}`
          } else {
            dragTooltipRef.current.style.display = 'none'
          }
        } else if (dragTooltipRef.current) {
          dragTooltipRef.current.style.display = 'none'
        }
      } else if (dragTooltipRef.current) {
        dragTooltipRef.current.style.display = 'none'
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (dragTooltipRef.current) dragTooltipRef.current.style.display = 'none'

      // Annule le rAF de sync en attente
      if (dragRafIdRef.current !== null) {
        window.cancelAnimationFrame(dragRafIdRef.current)
        dragRafIdRef.current = null
      }

      // Commit final du terrain avec les positions accumulées pendant le drag.
      // Pendant le drag on a muté le DOM directement (zéro setTerrain), on commit
      // maintenant une seule fois pour réconcilier l'état React.
      //
      // ⚠️ Bug fix : on commit TOUJOURS les positions, y compris en Alt-drag.
      // Auparavant, `&& !event.altKey` empêchait le commit en mode Alt-drag
      // (l'auteur pensait que l'Alt-drag était uniquement un reparent), mais
      // les sprites avaient quand même bougé visuellement via la mutation DOM
      // directe dans `handlePointerMove`. Résultat : la position React
      // divergeait de la position DOM, et la bounding box (rendue depuis
      // `selectedResolvedItem` qui lit l'état React) restait à l'ancienne
      // place → effet "bounding box fantôme". On commit donc les positions
      // dans tous les cas, puis on applique le reparent si `altKey` est
      // maintenu (le reparent s'appuie sur la position monde déjà à jour).
      const finalPositions = dragPendingPositionsRef.current
      dragPendingPositionsRef.current = null
      if (finalPositions && finalPositions.size > 0) {
        const itemIds = Array.from(finalPositions.keys())
        updateTerrain(
          (current) => ({
            ...current,
            items: current.items.map((item) => {
              const nextPosition = finalPositions.get(item.id)
              if (!nextPosition) {
                return item
              }
              return { ...item, x: nextPosition.x, y: nextPosition.y }
            }),
          }),
          { recordHistory: true, syncItemIds: itemIds, skipPlayerTerrain: true } as any,
        )
      }

      const draggedIds = Array.from(dragState.itemOffsets.map((o) => o.itemId))
      if (event.altKey && draggedIds.length > 0) {
        const elements = document.elementsFromPoint(event.clientX, event.clientY)
        const hit = elements.find(
          (el) => el.hasAttribute('data-item-id') && !draggedIds.includes(el.getAttribute('data-item-id')!),
        )
        if (hit) {
          const parentId = hit.getAttribute('data-item-id')!
          updateTerrain(
            (current) => {
              let next = current
              const pLayerId = current.items.find((i) => i.id === parentId)?.layerId
              if (!pLayerId) return current
              for (const id of draggedIds) {
                next = relocateItem(next, id, parentId, pLayerId)
              }
              return next
            },
            { recordHistory: true },
          )
        }
      }

      setDragState(null)
      endContinuousTerrainHistory()
      // Refresh player terrain after drag ends �?" it was skipped during drag for performance
      if (roleRef.current !== 'player') {
        setPlayerTerrain(sanitizeTerrainForPlayers(terrainRef.current))
      }
      flushTerrainSync()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      // Flush toute position en attente et annule le rAF pour éviter fuite / maj tardive.
      if (dragRafIdRef.current !== null) {
        window.cancelAnimationFrame(dragRafIdRef.current)
        dragRafIdRef.current = null
      }
      dragPendingPositionsRef.current = null
    }
  }, [dragState, isGridSnapEnabled])

  useEffect(() => {
    if (viewMode !== 'editor') {
      return
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (!canHandleEditorShortcutTarget(event.target) || !activeLayerId) {
        return
      }

      // Try reading directly from files first (better for files copied from OS Explorer)
      let imageFiles = Array.from(event.clipboardData?.files ?? []).filter(
        (file) => file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
      )

      // Fallback to items (better for image data copied from browser/snipping tool)
      if (imageFiles.length === 0) {
        imageFiles = Array.from(event.clipboardData?.items ?? [])
          .filter((item) => item.type.startsWith('image/'))
          .map((item, index) => {
            const blob = item.getAsFile()
            if (!blob) {
              return null
            }

            return new File([blob], `clipboard-${Date.now()}-${index}.${getClipboardImageExtension(blob.type)}`, {
              type: blob.type || 'image/png',
            })
          })
          .filter((file): file is File => Boolean(file))
      }

      if (!imageFiles.length) {
        return
      }

      event.preventDefault()
      void pasteClipboardImages(imageFiles)
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [activeLayerId, viewMode])

  useEffect(() => {
    if (!presencePopup) {
      return
    }

    const updatePopupPosition = () => {
      const anchor = presenceAnchorRef.current
      if (!anchor) {
        setPresencePopup(null)
        return
      }

      setPresencePopup(buildPresencePopupPosition(anchor))
    }

    window.addEventListener('resize', updatePopupPosition)
    window.addEventListener('scroll', updatePopupPosition, true)

    return () => {
      window.removeEventListener('resize', updatePopupPosition)
      window.removeEventListener('scroll', updatePopupPosition, true)
    }
  }, [presencePopup])

  useEffect(() => {
    if (!resizeState) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const stage = editorStageRef.current
      const currentTerrain = terrainRef.current
      if (!stage) {
        return
      }

      const point = getMapPoint(stage, currentTerrain.width, currentTerrain.height, event.clientX, event.clientY, false)
      const pointerLocal = toTransformedItemLocalPoint(
        point.x,
        point.y,
        resizeState.itemTransform,
        resizeState.startWidth,
        resizeState.startHeight,
        resizeState.flipX,
        resizeState.flipY,
      )

      const effectiveHandle = remapResizeHandleForFlip(resizeState.handle, resizeState.flipX, resizeState.flipY)
      const isEastHandle = effectiveHandle === 'ne' || effectiveHandle === 'e' || effectiveHandle === 'se'
      const isWestHandle = effectiveHandle === 'nw' || effectiveHandle === 'w' || effectiveHandle === 'sw'
      const isSouthHandle = effectiveHandle === 'sw' || effectiveHandle === 's' || effectiveHandle === 'se'
      const isNorthHandle = effectiveHandle === 'nw' || effectiveHandle === 'n' || effectiveHandle === 'ne'
      const isCornerHandle = (isEastHandle || isWestHandle) && (isSouthHandle || isNorthHandle)

      const rawWidth = isEastHandle
        ? Math.max(16, pointerLocal.x)
        : isWestHandle
          ? Math.max(16, resizeState.startWidth - Math.min(pointerLocal.x, resizeState.startWidth - 16))
          : resizeState.startWidth

      const rawHeight = isSouthHandle
        ? Math.max(16, pointerLocal.y)
        : isNorthHandle
          ? Math.max(16, resizeState.startHeight - Math.min(pointerLocal.y, resizeState.startHeight - 16))
          : resizeState.startHeight

      const { width: nextWidth, height: nextHeight } = event.shiftKey && isCornerHandle
        ? lockAspectRatioResize(resizeState.startWidth, resizeState.startHeight, rawWidth, rawHeight)
        : { width: rawWidth, height: rawHeight }

      const anchorLocalPoint = getResizeAnchorLocalPoint(
        effectiveHandle,
        resizeState.startWidth,
        resizeState.startHeight,
      )
      const anchorWorldPoint = getTransformedLocalPointWorldPoint(
        anchorLocalPoint,
        resizeState.itemTransform,
        resizeState.startWidth,
        resizeState.startHeight,
        resizeState.flipX,
        resizeState.flipY,
      )
      const nextAnchorLocalPoint = getResizeAnchorLocalPoint(effectiveHandle, nextWidth, nextHeight)
      const nextAnchorOffset = getTransformedLocalPointWorldOffset(
        nextAnchorLocalPoint,
        resizeState.itemTransform,
        nextWidth,
        nextHeight,
        resizeState.flipX,
        resizeState.flipY,
      )
      const nextWorldOrigin = {
        x: anchorWorldPoint.x - nextAnchorOffset.x,
        y: anchorWorldPoint.y - nextAnchorOffset.y,
      }
      const nextLocalOrigin = toLocalPoint(
        nextWorldOrigin.x,
        nextWorldOrigin.y,
        resizeState.parentTransform,
      )

      captureContinuousTerrainHistory()
      updateItem(resizeState.itemId, {
        x: nextLocalOrigin.x,
        y: nextLocalOrigin.y,
        width: nextWidth,
        height: nextHeight,
      }, { recordHistory: false })
    }

    const handlePointerUp = () => {
      setResizeState(null)
      endContinuousTerrainHistory()
      flushTerrainSync()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [resizeState])

  useEffect(() => {
    if (!rotationHoldState) {
      return
    }

    const stopRotation = (event?: PointerEvent) => {
      if (event && event.pointerId !== rotationHoldState.pointerId) {
        return
      }

      setRotationHoldState(null)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== rotationHoldState.pointerId) {
        return
      }

      const pointerAngle = getEditorPointerAngle(
        rotationHoldState.centerX,
        rotationHoldState.centerY,
        event.clientX,
        event.clientY,
      )
      if (pointerAngle === null) {
        return
      }

      const angleDelta = ((pointerAngle - rotationHoldState.startPointerAngle + 540) % 360) - 180

      captureContinuousTerrainHistory()
      updateTerrain(
        (current) => {
          const item = current.items.find((entry) => entry.id === rotationHoldState.itemId)
          if (!item || item.locked) {
            return current
          }

          return {
            ...current,
            items: current.items.map((entry) =>
              entry.id === rotationHoldState.itemId
                ? {
                  ...entry,
                  rotation: event.ctrlKey
                    ? Math.round(normalizeAngle(rotationHoldState.startRotation + angleDelta) / 45) * 45
                    : normalizeAngle(rotationHoldState.startRotation + angleDelta)
                }
                : entry,
            ),
          }
        },
        { recordHistory: false, syncItemId: rotationHoldState.itemId },
      )
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopRotation)
    window.addEventListener('pointercancel', stopRotation)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopRotation)
      window.removeEventListener('pointercancel', stopRotation)
      endContinuousTerrainHistory()
      flushTerrainSync()
    }
  }, [rotationHoldState])

  useEffect(() => {
    const handleGlobalWheel = (event: globalThis.WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return
      }

      // Empêcher le zoom natif du navigateur partout sur la page
      event.preventDefault()

      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      const isEditorStageWheel = Boolean(
        editorStageFrameRef.current?.contains(target) || editorStageRef.current?.contains(target),
      )
      const isPlayerStageWheel = Boolean(
        playerStageFrameRef.current?.contains(target) || playerStageRef.current?.contains(target),
      )

      if (!isEditorStageWheel && !isPlayerStageWheel) {
        return
      }

      if (isEditorStageWheel) {
        const frame = editorStageFrameRef.current
        if (!frame) {
          return
        }

        const rect = frame.getBoundingClientRect()
        const currentZoom = editorZoomRef.current
        const nextZoom = clamp(currentZoom * Math.exp(-event.deltaY * 0.0015 * zoomSpeedMultiplier), 0.05, 64)
        editorZoomRef.current = nextZoom

        const offsetX = event.clientX - rect.left + frame.scrollLeft
        const offsetY = event.clientY - rect.top + frame.scrollTop
        const ratioX = offsetX / currentZoom
        const ratioY = offsetY / currentZoom

        const scaler = frame.querySelector('.stage-scaler') as HTMLElement
        const stageEl = frame.querySelector('.terrain-stage') as HTMLElement
        if (scaler && stageEl) {
          scaler.style.width = `${terrainRef.current.width * nextZoom}px`
          scaler.style.height = `${terrainRef.current.height * nextZoom}px`
          stageEl.style.transform = `scale(${nextZoom})`
          stageEl.style.setProperty('--stage-zoom', nextZoom.toString())
        }

        frame.scrollLeft = ratioX * nextZoom - (event.clientX - rect.left)
        frame.scrollTop = ratioY * nextZoom - (event.clientY - rect.top)

        if (editorZoomTimeoutRef.current) {
          clearTimeout(editorZoomTimeoutRef.current)
        }
        editorZoomTimeoutRef.current = setTimeout(() => {
          setEditorZoom(editorZoomRef.current)
        }, 150)
        return
      }

      if (!isPlayerStageWheel || effectiveFollowHost || isFollowHostViewLocked) {
        return
      }

      const frame = playerStageFrameRef.current
      if (!frame) {
        return
      }

      const rect = frame.getBoundingClientRect()
      const currentZoom = playerZoomRef.current
      const nextZoom = clamp(currentZoom * Math.exp(-event.deltaY * 0.0015 * zoomSpeedMultiplier), 0.05, 6)
      const offsetX = event.clientX - rect.left + frame.scrollLeft
      const offsetY = event.clientY - rect.top + frame.scrollTop
      const ratioX = offsetX / currentZoom
      const ratioY = offsetY / currentZoom

      setPlayerZoom(nextZoom)

      setTimeout(() => {
        frame.scrollLeft = ratioX * nextZoom - (event.clientX - rect.left)
        frame.scrollTop = ratioY * nextZoom - (event.clientY - rect.top)
      }, 0)
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true })

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true })
    }
  }, [effectiveFollowHost, playerZoom, usesLockedViewport, zoomSpeedMultiplier])

  useEffect(() => {
    return () => {
      if (presenceHideTimeoutRef.current !== null) {
        window.clearTimeout(presenceHideTimeoutRef.current)
      }
      clearTerrainSyncTimeout()
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
      }
      for (const timeoutId of pingTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      pingTimeoutsRef.current.clear()
      // Close the ping AudioContext to free its audio resources
      if (pingAudioContextRef.current) {
        pingAudioContextRef.current.close().catch(() => {})
        pingAudioContextRef.current = null
      }
      disconnectSession('Session fermee.')
    }
  }, [])

  /**
   * Restaure les metadonnees liees aux joueurs (assignations de tokens, contacts virtuels)
   * depuis un terrain charge depuis disque.
   * La pre-allocation des joueurs (predeclaredPlayers / preallocationEnabled) est desormais
   * geree au niveau du workfolder (preallocated-players.json), pas dans le terrain.
   * Utilise par loadTerrainFromFile et openWorkfolderFile afin de garder un seul chemin
   * de restauration (sinon l'assignation joueur n'est pas memorisee a la reopen).
   */
  function applyTerrainPlayerMetadata(parsed: TerrainDocument) {
    // La pre-allocation (predeclaredPlayers / preallocationEnabled) est geree au niveau
    // du workfolder (preallocated-players.json), pas dans le terrain.
    // On garde juste un mapping d'ID pour les tokenAssignments si le terrain contient
    // d'anciennes donnees predeclaredPlayers (compatibilite ascendante).
    const idMapping = new Map<string, string>()
    if (parsed.predeclaredPlayers) {
      parsed.predeclaredPlayers.forEach(newPlayer => {
        // Matching insensible à la casse pour gérer les variations de casse entre les anciens et nouveaux predeclaredPlayers
        const oldPlayer = predeclaredPlayers.find(op => op.name.toLowerCase() === newPlayer.name.toLowerCase())
        if (oldPlayer) {
          idMapping.set(newPlayer.id, oldPlayer.id)
        }
      })
    }

    if (parsed.phoneVirtualContacts !== undefined) {
      setPhoneVirtualContacts(parsed.phoneVirtualContacts)
    } else {
      setPhoneVirtualContacts([])
    }

    // Preserve current token assignments by matching token IDs or Names
    const currentAssignments = tokenAssignmentsRef.current || tokenAssignments
    const currentTokens = terrainRef.current.items.filter(i => i.kind === 'token')
    const newTokens = parsed.items.filter(i => i.kind === 'token')
    // Remappe aussi les playerIds des assignations chargées depuis le terrain (compatibilité ascendante)
    const nextAssignments: Record<string, typeof currentAssignments[string]> = {}
    for (const [tokenId, assignment] of Object.entries(parsed.tokenAssignments || {})) {
      const remappedPlayerId = idMapping.get(assignment.playerId) ?? assignment.playerId
      nextAssignments[tokenId] = { ...assignment, playerId: remappedPlayerId }
    }

    for (const [oldTokenId, assignment] of Object.entries(currentAssignments)) {
      const oldToken = currentTokens.find(t => t.id === oldTokenId)
      if (!oldToken) continue

      const matchingNewToken = newTokens.find(t => t.id === oldTokenId) || newTokens.find(t => t.name === oldToken.name && t.name !== 'Pion')
      if (matchingNewToken) {
        // Remap playerId si l'ancien terrain avait des predeclaredPlayers avec des IDs differents
        const remappedPlayerId = idMapping.get(assignment.playerId) ?? assignment.playerId
        nextAssignments[matchingNewToken.id] = { ...assignment, playerId: remappedPlayerId }
      }
    }
    setTokenAssignments(nextAssignments)
    // Met à jour le terrain pour que les assignations remappées soient persistées à la prochaine sauvegarde
    updateTerrain((currentTerrain) => ({
      ...currentTerrain,
      tokenAssignments: nextAssignments,
    }))
    // Recharge les characterData depuis les fichiers .char.json du workfolder
    // (characterData n'est pas persisté dans le terrain JSON pour limiter la taille)
    if (workfolderHandle) {
      for (const [tokenId, assignment] of Object.entries(nextAssignments)) {
        if (assignment.characterFileName && !assignment.characterData) {
          loadCharacterDataForAssignment(tokenId, assignment.characterFileName)
        }
      }
    }
  }

  async function loadCharacterDataForAssignment(tokenId: string, characterFileName: string) {
    if (!workfolderHandle) return
    try {
      const fileHandle = await workfolderHandle.getFileHandle(characterFileName)
      const file = await fileHandle.getFile()
      const text = await file.text()
      const parsed = migrateCharacterDocument(JSON.parse(text))
      setTokenAssignments((current) => {
        const existing = current[tokenId]
        if (!existing || existing.characterFileName !== characterFileName) return current
        return { ...current, [tokenId]: { ...existing, characterData: parsed } }
      })
    } catch (e) {
      console.warn('Failed to load character data for assignment', characterFileName, e)
    }
  }

  function clearSelectedItems() {
    setSelectedItemId(null)
    setSelectedItemIds([])
  }

  function handleMassReparent(targetItemId: string) {
    if (selectedItemIds.length === 0) {
      setIsMassReparentingMode(false)
      return
    }

    if (selectedItemIds.includes(targetItemId)) {
      setStatusMessage('Cible invalide : l\'élément fait partie de la sélection.')
      setIsMassReparentingMode(false)
      return
    }

    const itemMap = new Map(terrain.items.map(item => [item.id, item]))
    const targetItem = itemMap.get(targetItemId)
    if (!targetItem) {
      setIsMassReparentingMode(false)
      return
    }

    let current = targetItem.parentId ?? null
    const selectedSet = new Set(selectedItemIds)
    while (current) {
      if (selectedSet.has(current)) {
        setStatusMessage('Cible invalide : l\'élément est un enfant de la sélection.')
        setIsMassReparentingMode(false)
        return
      }
      current = itemMap.get(current)?.parentId ?? null
    }

    updateTerrain(
      (currentTerrain) => {
        let nextTerrain = currentTerrain
        const roots = getDragRootItemIds(selectedItemIds, nextTerrain.items)
        for (const itemId of roots) {
          nextTerrain = relocateItem(nextTerrain, itemId, targetItemId, targetItem.layerId)
        }
        return nextTerrain
      },
      { syncItemIds: selectedItemIds }
    )

    setIsMassReparentingMode(false)
    setStatusMessage('Parents assignes avec succes.')
  }

  function selectSingleItem(itemId: string) {
    setSelectedItemId(itemId)
    setSelectedItemIds([itemId])
  }

  function toggleItemSelection(itemId: string) {
    const nextSelectedItemIds = selectedItemIds.includes(itemId)
      ? selectedItemIds.filter((entry) => entry !== itemId)
      : [...selectedItemIds, itemId]

    setSelectedItemIds(nextSelectedItemIds)
    setSelectedItemId(nextSelectedItemIds[nextSelectedItemIds.length - 1] ?? null)
  }

  function getDragRootItemIds(itemIds: string[], items: TerrainItem[]) {
    const itemIdsSet = new Set(itemIds)
    const itemsById = new Map(items.map((item) => [item.id, item]))

    return itemIds.filter((itemId) => {
      let current = itemsById.get(itemId)?.parentId ?? null

      while (current) {
        if (itemIdsSet.has(current)) {
          return false
        }

        current = itemsById.get(current)?.parentId ?? null
      }

      return true
    })
  }

  function startSelectedItemsDrag(anchorItemId: string, clientX: number, clientY: number) {
    const stage = editorStageRef.current
    if (!stage) {
      return
    }

    const point = getMapPoint(stage, terrain.width, terrain.height, clientX, clientY)
    const nextDragItemIds = getDragRootItemIds(
      selectedItemIds.includes(anchorItemId) ? selectedItemIds : [anchorItemId],
      terrain.items,
    )
    const itemOffsets = nextDragItemIds
      .map((itemId) => {
        const resolved = resolvedEditorItems.get(itemId)
        if (!resolved) {
          return null
        }

        return {
          itemId,
          offsetX: point.x - resolved.x,
          offsetY: point.y - resolved.y,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

    if (itemOffsets.length === 0) {
      return
    }

    beginContinuousTerrainHistory()
    setDragState({ itemOffsets })
  }

  function moveSelectedItemToEditorPointer() {
    if (viewMode !== 'editor' || !selectedItem) {
      return false
    }

    const point = getCurrentStageMapPoint('editor')
    if (!point) {
      return false
    }

    const resolved = resolvedEditorItems.get(selectedItem.id) ?? DEFAULT_TRANSFORM
    const parentTransform = selectedItem.parentId
      ? resolvedEditorItems.get(selectedItem.parentId) ?? DEFAULT_TRANSFORM
      : DEFAULT_TRANSFORM
    const nextWorldOrigin = {
      x: point.x - (selectedItem.width * resolved.scale) / 2,
      y: point.y - (selectedItem.height * resolved.scale) / 2,
    }
    const nextLocalOrigin = toLocalPoint(nextWorldOrigin.x, nextWorldOrigin.y, parentTransform)

    runIfItemUnlocked(
      selectedItem.id,
      (current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === selectedItem.id
            ? {
              ...item,
              x: nextLocalOrigin.x,
              y: nextLocalOrigin.y,
            }
            : item,
        ),
      }),
      { syncItemId: selectedItem.id },
    )
    setStatusMessage('Element deplace sous la souris.')
    return true
  }

  function copySelectedItemToClipboard() {
    if (!selectedItem || viewMode !== 'editor') {
      return false
    }

    const getSubtree = (parentId: string): TerrainItem[] => {
      const children = terrainRef.current.items.filter(item => item.parentId === parentId)
      return children.flatMap(child => [child, ...getSubtree(child.id)])
    }

    const subtree = [selectedItem, ...getSubtree(selectedItem.id)]

    copiedTerrainItemsRef.current = subtree.map(item => ({
      ...item,
      generatedAsset: item.generatedAsset ? { ...item.generatedAsset } : undefined,
    }))
    return true
  }

  function pasteCopiedItemFromClipboard() {
    if (viewMode !== 'editor') {
      return false
    }

    const copiedItems = copiedTerrainItemsRef.current
    if (!copiedItems || copiedItems.length === 0) {
      return false
    }

    const rootItem = copiedItems[0]
    const layerExists = terrainRef.current.layers.some((layer) => layer.id === rootItem.layerId)
    const rootParentExists = rootItem.parentId ? terrainRef.current.items.some((item) => item.id === rootItem.parentId) : false

    const idMap = new Map<string, string>()
    for (const item of copiedItems) {
      idMap.set(item.id, generateClientId())
    }

    const nextItems = copiedItems.map((item) => {
      const isRoot = item.id === rootItem.id
      return {
        ...item,
        id: idMap.get(item.id)!,
        layerId: isRoot ? (layerExists ? item.layerId : activeLayerId ?? terrainRef.current.layers[0]?.id ?? item.layerId) : item.layerId,
        parentId: isRoot ? (rootParentExists ? item.parentId : null) : idMap.get(item.parentId!) || null,
        x: isRoot ? item.x + 24 : item.x,
        y: isRoot ? item.y + 24 : item.y,
      }
    })

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, ...nextItems],
    }))
    setSelectedItemId(nextItems[0].id)
    return true
  }

  async function createDefaultLibraryAsset() {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour creer cet asset.')
      return
    }

    const generatedAsset: GeneratedAsset = {
      preset: defaultLibraryAssetPreset,
      fill: normalizeGeneratedAssetColor(defaultLibraryAssetColor),
    }
    const itemName = defaultLibraryAssetName.trim() || DEFAULT_LIBRARY_ASSET_NAME
    const file = createGeneratedAssetFile(itemName, generatedAsset)
    const item = await createItemFromFile(file, activeLayerId, activeParentId, defaultLibraryAssetKind, terrain.items.length)

    updateTerrain((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          ...item,
          generatedAsset,
          src: buildGeneratedAssetDataUrl(generatedAsset),
        },
      ],
    }))
    setSelectedItemId(item.id)
    setStatusMessage(`${itemName} ajoute comme SVG modifiable.`)
    setIsDefaultLibraryDialogOpen(false)
  }

  function updateGeneratedAssetColor(item: TerrainItem, fill: string) {
    if (!item.generatedAsset) {
      return
    }

    const generatedAsset: GeneratedAsset = {
      ...item.generatedAsset,
      fill: normalizeGeneratedAssetColor(fill),
    }

    updateItem(item.id, {
      generatedAsset,
      src: buildGeneratedAssetDataUrl(generatedAsset),
    })
  }

  function applySelectedItemOutlineDraft() {
    if (!selectedItem) {
      return
    }

    updateItem(selectedItem.id, {
      outlineEnabled: outlineDraftEnabled,
      outlineWidth: outlineDraftEnabled ? clamp(Math.round(outlineDraftWidth), 0, 24) : 0,
      outlineColor: normalizePaletteColor(outlineDraftColor, '#ffffff'),
    })
  }

  function clearSelectedItemOutlineDraft() {
    if (!selectedItem) {
      return
    }

    setOutlineDraftEnabled(false)
    setOutlineDraftWidth(0)
    setOutlineDraftColor('#ffffff')
    updateItem(selectedItem.id, {
      outlineEnabled: false,
      outlineWidth: 0,
    })
  }

  function toggleItemLock(itemId: string) {
    updateTerrain(
      (current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId
            ? {
              ...item,
              locked: !item.locked,
            }
            : item,
        ),
      }),
      { syncItemId: itemId },
    )
  }

  function deleteItem(itemId: string) {
    runIfItemUnlocked(itemId, (current) => {
      const ids = getDescendantIds(current.items, itemId)
      return {
        ...current,
        items: current.items.filter((item) => !ids.has(item.id)),
      }
    })
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    runIfItemUnlocked(itemId, (current, item) => {
      const siblings = current.items.filter(
        (entry) => entry.layerId === item.layerId && entry.parentId === item.parentId,
      )
      const itemIndex = siblings.findIndex((entry) => entry.id === itemId)
      const targetIndex = itemIndex + direction
      if (itemIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
        return current
      }

      const target = siblings[targetIndex]
      return relocateItem(current, itemId, item.parentId, item.layerId, target.id)
    })
  }

  function addLayer() {
    const layer = createLayer(`Calque ${terrain.layers.length + 1}`)
    updateTerrain((current) => ({
      ...current,
      layers: [...current.layers, layer],
    }))
    setSelectedLayerId(layer.id)
  }

  function deleteLayer(layerId: string) {
    if (terrain.layers.length === 1) {
      return
    }

    updateTerrain((current) => ({
      ...current,
      layers: current.layers.filter((layer) => layer.id !== layerId),
      items: current.items.filter((item) => item.layerId !== layerId),
    }))
  }

  function moveLayer(layerId: string, direction: -1 | 1) {
    updateTerrain((current) => {
      const layerIndex = current.layers.findIndex((layer) => layer.id === layerId)
      const targetIndex = layerIndex + direction
      if (layerIndex < 0 || targetIndex < 0 || targetIndex >= current.layers.length) {
        return current
      }

      const layers = [...current.layers]
        ;[layers[layerIndex], layers[targetIndex]] = [layers[targetIndex], layers[layerIndex]]
      return { ...current, layers }
    })
  }

  function commitLayerRename(layerId: string) {
    const trimmedName = layerRenameDraft.trim()
    setRenamingLayerId(null)

    if (!trimmedName) {
      return
    }

    updateTerrain((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? { ...layer, name: trimmedName } : layer)),
    }))
  }

  async function importItems(event: ChangeEvent<HTMLInputElement>, kind: 'image' | 'token' | 'audio') {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!files.length || !activeLayerId) {
      return
    }

    const items = await Promise.all(
      files.map((file, index) => createItemFromFile(file, activeLayerId, activeParentId, kind, index)),
    )

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, ...items],
    }))

    setSelectedItemId(items[items.length - 1]?.id ?? null)
    setStatusMessage(`${items.length} element(s) importe(s).`)
  }

  async function processImageReplacement(file: File) {
    if (!selectedItemId || !selectedItem) {
      return
    }

    try {
      const src = await fileToDataUrl(file)
      const { width, height } = await loadImageDimensions(src)
      const currentMaxEdge = Math.max(selectedItem.width, selectedItem.height)
      const newScale = currentMaxEdge / Math.max(width, height)
      const newWidth = Math.max(16, Math.round(width * newScale))
      const newHeight = Math.max(16, Math.round(height * newScale))

      updateItem(selectedItem.id, {
        src,
        width: newWidth,
        height: newHeight,
        name: file.name.replace(/\.[^.]+$/, ''),
        generatedAsset: undefined,
      }, { recordHistory: true })

      setStatusMessage('Image remplacée avec succès.')
    } catch (error) {
      console.error(error)
      setStatusMessage("Erreur lors du remplacement de l'image.")
    }
  }

  async function handleReplaceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      await processImageReplacement(file)
    }
  }

  async function handleAutoCropImage() {
    if (!selectedItemId || !selectedItem || !selectedItem.src) {
      return
    }

    try {
      setStatusMessage('Recadrage auto en cours...')
      const result = await trimImageTransparentPixels(selectedItem.src)
      if (!result.cropInfo) {
        setStatusMessage("L'image est déjà recadrée ou ne peut pas l'être.")
        return
      }

      const { top, bottom, left, right, oldWidth, oldHeight, newWidth, newHeight } = result.cropInfo

      const widthRatio = selectedItem.width / oldWidth
      const heightRatio = selectedItem.height / oldHeight

      const visualLeft = selectedItem.flipX ? oldWidth - right : left
      const visualTop = selectedItem.flipY ? oldHeight - bottom : top

      const dx = visualLeft * widthRatio
      const dy = visualTop * heightRatio

      const scaledNewWidth = newWidth * widthRatio
      const scaledNewHeight = newHeight * heightRatio

      const cx = dx - selectedItem.width / 2 + scaledNewWidth / 2
      const cy = dy - selectedItem.height / 2 + scaledNewHeight / 2

      const theta = selectedItem.rotation * (Math.PI / 180)
      const rx = cx * Math.cos(theta) - cy * Math.sin(theta)
      const ry = cx * Math.sin(theta) + cy * Math.cos(theta)

      const x2 = selectedItem.x + selectedItem.width / 2 + rx - scaledNewWidth / 2
      const y2 = selectedItem.y + selectedItem.height / 2 + ry - scaledNewHeight / 2

      updateItem(selectedItem.id, {
        src: result.src,
        x: x2,
        y: y2,
        width: Math.max(16, scaledNewWidth),
        height: Math.max(16, scaledNewHeight),
        generatedAsset: undefined,
      }, { recordHistory: true })

      setStatusMessage('Recadrage automatique terminé avec succès.')
    } catch (error) {
      console.error(error)
      setStatusMessage("Erreur lors du recadrage de l'image.")
    }
  }

  async function optimizeAllImages() {
    setStatusMessage('Optimisation des images en cours...')
    try {
      let optimizedCount = 0
      let totalToOptimize = 0

      for (const item of terrainRef.current.items) {
        if (item.src && item.src.startsWith('data:image/') && !item.src.startsWith('data:image/webp') && !item.src.startsWith('data:image/svg+xml')) {
          totalToOptimize++
        }
      }

      if (totalToOptimize === 0) {
        setStatusMessage('Toutes les images sont déjà optimisées en WebP.')
        return
      }

      const updatedItems = await Promise.all(
        terrainRef.current.items.map(async (item) => {
          if (item.src && item.src.startsWith('data:image/') && !item.src.startsWith('data:image/webp') && !item.src.startsWith('data:image/svg+xml')) {
            const optimizedSrc = await convertDataUrlToWebp(item.src)
            if (optimizedSrc !== item.src) {
              optimizedCount++
            }
            return { ...item, src: optimizedSrc }
          }
          return item
        })
      )

      applyTerrain({
        ...terrainRef.current,
        items: updatedItems,
      })

      setStatusMessage(`${optimizedCount} image(s) optimisée(s) en WebP avec succès.`)
    } catch (error) {
      console.error(error)
      setStatusMessage("Erreur lors de l'optimisation des images.")
    }
  }

  async function pasteClipboardImages(files: File[]) {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour coller une image.')
      return
    }

    const currentTerrain = terrainRef.current
    const insertionPoint = getEditorInsertionPoint()
    const items = await Promise.all(
      files.map(async (file, index) => {
        const item = await createItemFromFile(file, activeLayerId, activeParentId, 'image', currentTerrain.items.length + index)
        return placeItemOnGrid(item, insertionPoint, currentTerrain, index, isGridSnapEnabled)
      }),
    )

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, ...items],
    }))

    setSelectedItemId(items[items.length - 1]?.id ?? null)
    setStatusMessage(`${items.length} image(s) collee(s) sur la grille.`)
  }

  async function dropImagesOnEditor(files: File[], insertionPoint: { x: number; y: number }, snapToGrid = true) {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour deposer une image.')
      return
    }

    const currentTerrain = terrainRef.current
    const items = await Promise.all(
      files.map(async (file, index) => {
        const item = await createItemFromFile(file, activeLayerId, activeParentId, 'image', currentTerrain.items.length + index)
        return placeItemOnGrid(item, insertionPoint, currentTerrain, index, snapToGrid)
      }),
    )

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, ...items],
    }))

    setSelectedItemId(items[items.length - 1]?.id ?? null)
    setStatusMessage(`${items.length} image(s) deposee(s) sur la grille.`)
  }

  function createShadowZone() {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour creer une zone d ombre.')
      return
    }

    const size = 100
    const centerX = terrain.width / 2 - size / 2
    const centerY = terrain.height / 2 - size / 2

    const shadowItem: TerrainItem = {
      id: generateClientId(),
      layerId: activeLayerId,
      parentId: activeParentId,
      locked: false,
      name: 'Zone d ombre',
      note: '',
      notePlayers: '',
      noteVisibleToPlayers: false,
      tokenPanelEnabled: false,
      tokenPanelText: '',
      kind: 'shadow',
      src: '',
      shadowPoints: [
        { x: 0, y: 0 },
        { x: size, y: 0 },
        { x: size, y: size },
        { x: 0, y: size },
      ],
      x: centerX,
      y: centerY,
      width: size,
      height: size,
      scale: 1,
      flipX: false,
      flipY: false,
      rotation: 0,
      outlineEnabled: false,
      outlineWidth: 0,
      outlineColor: '#000000',
      grayscaleEnabled: false,
      rippleEnabled: false,
      opacity: 1,
      visible: true,
    }

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, shadowItem],
    }))

    setSelectedItemId(shadowItem.id)
    setSelectedItemIds([shadowItem.id])
    setStatusMessage('Zone d ombre creee.')
  }

  function createNoteItem() {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour creer une note.')
      return
    }

    const size = 80
    const centerX = terrain.width / 2 - size / 2
    const centerY = terrain.height / 2 - size / 2

    const noteItem: TerrainItem = {
      id: generateClientId(),
      layerId: activeLayerId,
      parentId: activeParentId,
      locked: false,
      name: 'Note MJ',
      note: 'Texte de la note...',
      notePlayers: '',
      noteVisibleToPlayers: false,
      tokenPanelEnabled: false,
      tokenPanelText: '',
      kind: 'note',
      src: '',
      x: centerX,
      y: centerY,
      width: size,
      height: size,
      scale: 1,
      flipX: false,
      flipY: false,
      rotation: 0,
      outlineEnabled: false,
      outlineWidth: 0,
      outlineColor: '#000000',
      grayscaleEnabled: false,
      rippleEnabled: false,
      opacity: 1,
      visible: true,
    }

    updateTerrain((current) => ({
      ...current,
      items: [...current.items, noteItem],
    }))

    setSelectedItemId(noteItem.id)
    setSelectedItemIds([noteItem.id])
    setStatusMessage('Note (MJ) creee.')
  }

  async function importLibraryAsset(asset: LibraryAsset, kind: 'image' | 'token', keepOpen = false) {
    if (!activeLayerId) {
      setStatusMessage('Aucun calque actif pour importer cet asset.')
      return
    }

    if (!activeLibraryTabId) {
      setStatusMessage("Impossible d'importer l'asset : Aucun onglet actif.")
      return
    }

    const handle = await getLibraryHandle(activeLibraryTabId)
    if (!handle) {
      setStatusMessage("Impossible d'importer l'asset : Dossier non lié.")
      return
    }

    const file = await getLibraryAssetFile(handle, asset)
    if (!file) {
      setStatusMessage("Impossible d'importer l'asset : Fichier introuvable sur le disque.")
      return
    }

    const item = await createItemFromFile(file, activeLayerId, activeParentId, kind, terrain.items.length)
    updateTerrain((current) => ({
      ...current,
      items: [...current.items, item],
    }))
    setSelectedItemId(item.id)
    setStatusMessage(`${asset.name} importe dans ${kind === 'token' ? 'les pions' : 'les images'}.`)
    if (!keepOpen) {
      setIsLibraryDialogOpen(false)
    }
  }

  async function addLibraryTab() {
    setIsLibraryLoading(true)
    setLibraryMessage('Chargement de la bibliotheque...')

    try {
      const pickerWindow = window as any
      if (!pickerWindow.showDirectoryPicker) {
        setLibraryMessage('Ton navigateur ne supporte pas la selection de dossiers.')
        setIsLibraryLoading(false)
        return
      }
      const handle = await pickerWindow.showDirectoryPicker({ mode: 'readwrite' })
      const id = generateUUID()
      const name = handle.name

      await saveLibraryHandle(id, handle)

      updateTerrain((current) => ({
        ...current,
        libraryTabs: [...(current.libraryTabs || []), { id, name }]
      }))

      setActiveLibraryTabId(id)
      libraryDirectoryHandleRef.current = handle

      const nextLibraryRoot = await readLibraryTreeFromHandle(handle, (progressRoot) => {
        setLibraryRoot(progressRoot)
        setLibraryMessage(`Analyse: ${countLibraryFolders(progressRoot)}D, ${countLibraryAssets(progressRoot)}A...`)
      })
      if (!nextLibraryRoot || countLibraryAssets(nextLibraryRoot) === 0) {
        setLibraryRoot(null)
        setActiveLibraryPath('')
        setLibrarySearchQuery('')
        setLibraryMessage('Aucun asset image trouve dans le dossier.')
        return
      }

      setLibraryRoot(nextLibraryRoot)
      setActiveLibraryPath('')
      setLibrarySearchQuery('')
      setLibraryMessage(`${countLibraryFolders(nextLibraryRoot)}D / ${countLibraryAssets(nextLibraryRoot)}A`)
      setHasLibraryHandle(true)
    } catch (error) {
      console.error('Library loading error:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setLibraryMessage('Selection de dossier annulee.')
      } else {
        setLibraryMessage('Impossible de charger le dossier.')
        setStatusMessage('Erreur bibliotheque: ' + (error instanceof Error ? error.message : String(error)))
      }
    } finally {
      setIsLibraryLoading(false)
    }
  }

  async function loadLibraryTab(tabId: string) {
    setActiveLibraryTabId(tabId)
    setLibraryRoot(null)
    setActiveLibraryPath('')
    setLibrarySearchQuery('')
    setHasLibraryHandle(false)
    setIsLibraryLoading(true)
    setLibraryMessage("Chargement de l'onglet...")

    try {
      const handle = await getLibraryHandle(tabId)
      if (!handle) {
        setLibraryMessage('Dossier introuvable localement. Veuillez le relier.')
        return
      }
      libraryDirectoryHandleRef.current = handle

      const opts = { mode: 'readwrite' as const }
      if ((await handle.queryPermission(opts)) !== 'granted') {
        if ((await handle.requestPermission(opts)) !== 'granted') {
          setLibraryMessage('Acces refuse au dossier. Veuillez accorder la permission de lecture/ecriture.')
          return
        }
      }

      const nextLibraryRoot = await readLibraryTreeFromHandle(handle, (progressRoot) => {
        setLibraryRoot(progressRoot)
        setLibraryMessage(`Analyse: ${countLibraryFolders(progressRoot)}D, ${countLibraryAssets(progressRoot)}A...`)
      })
      if (!nextLibraryRoot || countLibraryAssets(nextLibraryRoot) === 0) {
        setLibraryRoot(null)
        setLibraryMessage('Aucun asset image trouve dans le dossier.')
        return
      }

      setLibraryRoot(nextLibraryRoot)
      setLibraryMessage(`${countLibraryFolders(nextLibraryRoot)}D / ${countLibraryAssets(nextLibraryRoot)}A`)
      setHasLibraryHandle(true)
    } catch (error) {
      console.error('Library loading error:', error)
      setLibraryMessage('Impossible de charger le dossier.')
      setStatusMessage('Erreur bibliotheque: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLibraryLoading(false)
    }
  }

  async function relinkLibraryTab(tabId: string) {
    setIsLibraryLoading(true)
    try {
      const pickerWindow = window as any
      if (!pickerWindow.showDirectoryPicker) return

      const handle = await pickerWindow.showDirectoryPicker()
      await saveLibraryHandle(tabId, handle)

      updateTerrain((current) => ({
        ...current,
        libraryTabs: (current.libraryTabs || []).map(t => t.id === tabId ? { ...t, name: handle.name } : t)
      }))

      await loadLibraryTab(tabId)
    } catch (error) {
      console.error('Library relink error:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setLibraryMessage('Selection de dossier annulee.')
      } else {
        setLibraryMessage('Impossible de relier le dossier.')
        setStatusMessage('Erreur bibliotheque: ' + (error instanceof Error ? error.message : String(error)))
      }
    } finally {
      setIsLibraryLoading(false)
    }
  }

  function removeLibraryTab(tabId: string) {
    void removeLibraryHandle(tabId)
    updateTerrain((current) => {
      const nextTabs = (current.libraryTabs || []).filter(t => t.id !== tabId)
      if (activeLibraryTabId === tabId) {
        setActiveLibraryTabId(null)
        setLibraryRoot(null)
        setHasLibraryHandle(false)
        setLibraryMessage('Selectionne ou ajoute un dossier pour charger ta bibliotheque.')
      }
      return { ...current, libraryTabs: nextTabs }
    })
  }

  async function refreshLibraryTab() {
    if (!activeLibraryTabId) return
    setIsLibraryLoading(true)
    setLibraryMessage('Actualisation de la bibliotheque...')
    try {
      const handle = await getLibraryHandle(activeLibraryTabId)
      if (!handle) return
      libraryDirectoryHandleRef.current = handle

      const opts = { mode: 'readwrite' as const }
      if ((await handle.queryPermission(opts)) !== 'granted') {
        if ((await handle.requestPermission(opts)) !== 'granted') return
      }

      const nextLibraryRoot = await readLibraryTreeFromHandle(handle, (progressRoot) => {
        setLibraryRoot(progressRoot)
        setLibraryMessage(`Actualisation: ${countLibraryFolders(progressRoot)}D, ${countLibraryAssets(progressRoot)}A...`)
      }, true)
      if (!nextLibraryRoot || countLibraryAssets(nextLibraryRoot) === 0) {
        setLibraryRoot(null)
        setLibraryMessage('Aucun asset image trouve dans le dossier.')
        return
      }

      setLibraryRoot(nextLibraryRoot)
      setLibraryMessage(`${countLibraryFolders(nextLibraryRoot)} dossier(s) et ${countLibraryAssets(nextLibraryRoot)} asset(s) charges.`)
    } catch (error) {
      console.error('Library refresh error:', error)
      setLibraryMessage('Impossible de recharger la bibliotheque.')
      setStatusMessage('Erreur bibliotheque: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLibraryLoading(false)
    }
  }

  async function loadTerrainFromFile(
    event: ChangeEvent<HTMLInputElement>,
    target: 'editor' | 'player',
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const parsed = parseTerrainDocument(await file.text())
    if (!parsed) {
      setStatusMessage('Le fichier terrain est invalide.')
      return
    }

    if (target === 'editor') {
      terrainSaveHandleRef.current = null
      setHasAutoSaveTarget(false)
      setLastTerrainSaveAt(null)
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      applyTerrain(parsed)
      setSharedAudioState({
        isPlaying: false,
        isLooping: false,
        currentTime: 0,
        updatedAt: Date.now(),
      })
      applyTerrainPlayerMetadata(parsed)
      setSelectedLayerId(parsed.layers[0]?.id ?? null)
      setSelectedItemId(parsed.items[0]?.id ?? null)
      setViewMode('editor')
    } else {
      setPlayerTerrain(sanitizeTerrainForPlayers(parsed))
      setSharedAudioState({
        isPlaying: false,
        isLooping: false,
        currentTime: 0,
        updatedAt: Date.now(),
      })
      setViewMode('player')
    }

    setStatusMessage(`Terrain charge: ${parsed.name}`)
  }


  const PREALLOCATED_PLAYERS_FILE = 'preallocated-players.json';
  const MJ_PREFERENCES_FILE = 'mj-preferences.config.json';
  const PROJECT_CONFIG_FILE = 'config.json';

  async function loadProjectConfigFromWorkfolder(handle: any) {
    const cfg = await readProjectConfig(handle);
    if (cfg) {
      setProjectConfig(cfg);
    }
  }

  function scheduleProjectConfigSave(handle?: any) {
    if (projectConfigSaveTimerRef.current !== null) {
      window.clearTimeout(projectConfigSaveTimerRef.current);
    }
    projectConfigSaveTimerRef.current = window.setTimeout(() => {
      projectConfigSaveTimerRef.current = null;
      const dir = handle ?? workfolderHandle;
      if (!dir) return;
      void writeProjectConfig(dir, projectConfigRef.current);
    }, 400);
  }

  function persistProjectConfigChange(next: ProjectConfig, handle?: any) {
    setProjectConfig(next);
    projectConfigRef.current = next;
    scheduleProjectConfigSave(handle);
  }

  async function loadMJPreferencesFromWorkfolder(handle: any) {
    try {
      const fileHandle = await handle.getFileHandle(MJ_PREFERENCES_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.collapsedProjectSections && typeof parsed.collapsedProjectSections === 'object') {
        setCollapsedProjectSections(parsed.collapsedProjectSections);
      }
    } catch {
      // Fichier absent — pas d'erreur, on garde les valeurs par défaut
    }
  }

  async function saveMJPreferencesToWorkfolder(handle?: any) {
    const dir = handle ?? workfolderHandle;
    if (!dir) return;
    try {
      const fileHandle = await dir.getFileHandle(MJ_PREFERENCES_FILE, { create: true });
      const writable = await (fileHandle as any).createWritable();
      const data = {
        collapsedProjectSections: collapsedProjectSectionsRef.current,
      };
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) {
      console.error('Failed to save mj-preferences.config.json', e);
    }
  }

  function toggleProjectSection(sectionId: string) {
    setCollapsedProjectSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      // Sauvegarde asynchrone
      collapsedProjectSectionsRef.current = next;
      void saveMJPreferencesToWorkfolder();
      return next;
    });
  }

  async function loadPreallocatedPlayersFromWorkfolder(handle: any) {
    try {
      const fileHandle = await handle.getFileHandle(PREALLOCATED_PLAYERS_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.players)) {
        const players: PredeclaredPlayer[] = parsed.players
          .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
          .map((p: any) => ({
            id: p.id,
            name: String(p.name).slice(0, 24),
            color: typeof p.color === 'string' ? p.color : '#888888',
            connectedPlayerId: null,
          }));
        setPredeclaredPlayers(players);
      }
      if (typeof parsed.preallocationEnabled === 'boolean') {
        setIsPlayerPreallocationEnabled(parsed.preallocationEnabled);
      }
    } catch {
      // Fichier absent ou invalide �?" pas d'erreur bloquante
    }
  }

  async function savePreallocatedPlayersToWorkfolder(
    players: PredeclaredPlayer[],
    enabled: boolean,
    handle?: any
  ) {
    const dir = handle ?? workfolderHandle;
    if (!dir) return;
    try {
      const fileHandle = await dir.getFileHandle(PREALLOCATED_PLAYERS_FILE, { create: true });
      const writable = await (fileHandle as any).createWritable();
      const data = {
        preallocationEnabled: enabled,
        players: players.map(({ connectedPlayerId: _c, ...rest }) => rest),
      };
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) {
      console.error('Failed to save preallocated-players.json', e);
    }
  }

  async function selectWorkfolder() {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      setWorkfolderHandle(dirHandle);
      colorPalette.setWorkfolderHandle(dirHandle);
      await refreshWorkfolderTerrains(dirHandle);
      await loadPreallocatedPlayersFromWorkfolder(dirHandle);
      await loadMJPreferencesFromWorkfolder(dirHandle);
      await loadProjectConfigFromWorkfolder(dirHandle);
      await applyLastConfigFromWorkfolder(dirHandle);
    } catch (e) {
      console.error(e);
    }
  }

  async function refreshWorkfolderTerrains(handle: any) {
    try {
      const terrains: { name: string, fileName: string, type: 'terrain' | 'character' | 'other', description?: string }[] = [];
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file') {
          if (name.endsWith('.char.json')) {
            let displayName = name.slice(0, -10);
            terrains.push({ name: displayName, fileName: name, type: 'character' });
          } else if (name.endsWith('.terrain.json')) {
            let displayName = name.slice(0, -13);
            terrains.push({ name: displayName, fileName: name, type: 'terrain' });
          } else if (name.endsWith('.json') && name !== PREALLOCATED_PLAYERS_FILE && name !== MJ_PREFERENCES_FILE && name !== PROJECT_CONFIG_FILE) {
            // Fichier "autre" — on garde l'extension pour clarté et on décrit son utilité
            const desc = getOtherFileDescription(name);
            terrains.push({ name, fileName: name, type: 'other', description: desc });
          }
        }
      }
      setWorkfolderTerrains(terrains);
    } catch (e) {
      console.error('Failed to refresh workfolder terrains', e);
      setStatusMessage('Erreur lors de la lecture du dossier de travail.');
    }
  }

  /** Retourne une description d'utilité pour un fichier "autre" du workfolder. */
  function getOtherFileDescription(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.color.json')) {
      return 'Palette de couleurs du terrain — utilisé par le sélecteur de couleurs du MJ.';
    }
    if (lower === 'preallocated-players.json') {
      return 'Joueurs pré-alloués — définit les identités disponibles avant de rejoindre la partie.';
    }
    if (lower.endsWith('.config.json')) {
      return 'Fichier de configuration du projet.';
    }
    if (lower.endsWith('.json')) {
      return 'Fichier JSON — format de données non reconnu comme terrain ou personnage.';
    }
    return 'Fichier de données du projet.';
  }

  async function openWorkfolderFile(fileName: string) {
    if (!workfolderHandle) return;
    try {
      const fileHandle = await workfolderHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (fileName.endsWith('.char.json')) {
        const parsed = migrateCharacterDocument(JSON.parse(text));
        setActiveCharacter(parsed);
        setActiveCharacterFileName(fileName.slice(0, -'.char.json'.length));
        setIsCharacterSheetOpen(true);
        setIsImportDialogOpen(false);
      } else if (fileName.endsWith('.color.json')) {
        // Palette de couleurs — recharge la palette globale du workfolder
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.colors)) {
            // Remplace la palette en rechargeant depuis le fichier
            colorPalette.reload();
            setStatusMessage(`Palette de couleurs chargée : ${fileName}`);
            setIsImportDialogOpen(false);
          }
        } catch {
          setStatusMessage(`Impossible de lire la palette : ${fileName}`);
        }
      } else if (fileName.endsWith('.config.json')) {
        // Fichier de configuration — ne pas ouvrir, juste informer
        setStatusMessage(`Fichier de configuration : ${fileName} (géré automatiquement)`);
      } else {
        const parsed = parseTerrainDocument(text);
        if (!parsed) {
          setStatusMessage('Le fichier terrain est invalide.');
          return;
        }
        // Activation de l'auto-save vers ce fichier du workfolder
        currentTerrainFileNameRef.current = fileName;
        terrainSaveHandleRef.current = fileHandle;
        saveTerrainSaveHandle(fileHandle).catch(console.error);
        setHasAutoSaveTarget(true);
        setLastTerrainSaveAt(null);
        if (autoSaveTimeoutRef.current !== null) {
          window.clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        applyTerrain(parsed);
        setSharedAudioState({
          isPlaying: false,
          isLooping: false,
          currentTime: 0,
          updatedAt: Date.now(),
        });
        // Restaure les metadonnees joueurs (assignations, predeclaredPlayers, etc.)
        applyTerrainPlayerMetadata(parsed);
        setSelectedLayerId(parsed.layers[0]?.id ?? null);
        setSelectedItemId(parsed.items[0]?.id ?? null);
        setViewMode('editor');
        setIsImportDialogOpen(false);
        setStatusMessage(`Terrain chargé: ${parsed.name}`);
        scheduleLastConfigSave();
      }
    } catch (e) {
      console.error('Failed to open file from workfolder', e);
      setStatusMessage('Erreur lors du chargement depuis le dossier.');
    }
  }

  async function applyLastConfigFromWorkfolder(handle: FileSystemDirectoryHandle) {
    const cfg = await readLastConfig(handle);
    if (!cfg) return;
    if (!cfg.lastTerrainFileName) return;
    // Le terrain doit être référencé dans la liste courante du workfolder
    const exists = workfolderTerrains.some(
      (t) => t.fileName === cfg.lastTerrainFileName && t.type === 'terrain',
    );
    if (!exists) {
      console.warn(`[lastConfig] last terrain "${cfg.lastTerrainFileName}" not found in workfolder, ignoring.`);
      return;
    }
    await openWorkfolderFile(cfg.lastTerrainFileName);
    // Restaurer scroll + zoom après que le stage ait re-rendu le terrain
    // (même délai que l'ancien hot-reload pour rester safe sur les gros terrains)
    window.setTimeout(() => {
      const eFrame = editorStageFrameRef.current;
      if (eFrame) {
        eFrame.scrollLeft = cfg.camera.editor.scrollX;
        eFrame.scrollTop = cfg.camera.editor.scrollY;
      }
      const pFrame = playerStageFrameRef.current;
      if (pFrame) {
        pFrame.scrollLeft = cfg.camera.player.scrollX;
        pFrame.scrollTop = cfg.camera.player.scrollY;
      }
      setEditorZoom(cfg.camera.editor.zoom);
      setPlayerZoom(cfg.camera.player.zoom);
    }, 100);
  }


  async function applyColumnSettingsToAllCharacters(tableId: string, newWidths: any, newMins: any) {
    if (!workfolderHandle) return;
    try {
      for await (const entry of (workfolderHandle as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.char.json')) {
          const fileHandle = await workfolderHandle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const text = await file.text();
          let charDoc: any = null;
          try { charDoc = JSON.parse(text); } catch(e) {}
          if (charDoc && charDoc.type === 'character') {
            charDoc.tableColumnWidths = charDoc.tableColumnWidths || {};
            charDoc.tableColumnWidths[tableId] = newWidths;
            charDoc.tableColumnMins = charDoc.tableColumnMins || {};
            charDoc.tableColumnMins[tableId] = newMins;
            const writable = await (fileHandle as any).createWritable();
            await writable.write(JSON.stringify(charDoc, null, 2));
            await writable.close();
            syncCharacterToTokenAssignments(entry.name, charDoc);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveCharacterToWorkfolder(character: CharacterDocument, fileName: string, previousFileName?: string) {
    if (!workfolderHandle) return;
    try {
      const fullFileName = `${fileName}.char.json`;
      const fileHandle = await workfolderHandle.getFileHandle(fullFileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(JSON.stringify(character, null, 2));
      await writable.close();
      // Si le nom a changé, on supprime l'ancien fichier .char.json et on met à jour les assignations de tokens
      if (previousFileName && previousFileName !== fileName) {
        const oldFullFileName = `${previousFileName}.char.json`;
        try {
          await workfolderHandle.removeEntry(oldFullFileName);
        } catch (e) {
          console.warn('Failed to remove old character file', oldFullFileName, e);
        }
        const oldCharFileName = `${previousFileName}.char.json`;
        const newCharFileName = `${fileName}.char.json`;
        const currentAssignments = tokenAssignmentsRef.current
        let assignmentsChanged = false
        const nextAssignments = { ...currentAssignments }
        for (const [tokenId, assignment] of Object.entries(currentAssignments)) {
          if (assignment.characterFileName === oldCharFileName) {
            nextAssignments[tokenId] = { ...assignment, characterFileName: newCharFileName }
            assignmentsChanged = true
          }
        }
        if (assignmentsChanged) {
          setTokenAssignments(nextAssignments)
        }
      }
      setStatusMessage(`Fiche de Personnage : ${fileName} sauvegardée.`);
      await refreshWorkfolderTerrains(workfolderHandle);
    } catch (e) {
      console.error('Failed to save character to workfolder', e);
      setStatusMessage('Erreur lors de la sauvegarde du personnage.');
    }
  }

  function syncCharacterToTokenAssignments(characterFileName: string, characterData: CharacterDocument) {
    const currentAssignments = tokenAssignmentsRef.current
    let hasChanged = false
    const nextAssignments = { ...currentAssignments }
    for (const [tokenId, assignment] of Object.entries(currentAssignments)) {
      if (assignment.characterFileName === characterFileName) {
        nextAssignments[tokenId] = { ...assignment, characterData }
        hasChanged = true
      }
    }
    if (hasChanged) {
      setTokenAssignments(nextAssignments)
      // Met à jour aussi le terrain pour que l'auto-save persiste le characterData
      updateTerrain((currentTerrain) => ({
        ...currentTerrain,
        tokenAssignments: nextAssignments,
      }))
    }
  }

  function createNewCharacter() {
    const nextChar = createDefaultCharacter();
    setActiveCharacter(nextChar);
    setActiveCharacterFileName('');
    setIsCharacterSheetOpen(true);
    setIsImportDialogOpen(false);
  }

  function createNewTerrain() {
    const nextTerrain = createDefaultTerrain()
    const hasExistingTerrainContent =
      terrain.items.length > 0 ||
      terrain.layers.length > 1 ||
      terrain.audio !== null ||
      terrain.name !== nextTerrain.name ||
      terrain.width !== nextTerrain.width ||
      terrain.height !== nextTerrain.height ||
      terrain.gridSize !== nextTerrain.gridSize ||
      terrain.backgroundColor !== nextTerrain.backgroundColor

    if (hasExistingTerrainContent) {
      const shouldCreate = window.confirm('Creer un nouveau terrain vide et remplacer le terrain actuel ?')
      if (!shouldCreate) {
        return
      }
    }

    terrainSaveHandleRef.current = null
    setHasAutoSaveTarget(false)
    setLastTerrainSaveAt(null)
    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }

    setTokenAssignments({})
    setPlayerViewPolicy(null)
    setHostPreviewPolicy(null)
    applyTerrain(nextTerrain)
    setSharedAudioState({
      isPlaying: false,
      isLooping: false,
      currentTime: 0,
      updatedAt: Date.now(),
    })
    setSelectedLayerId(nextTerrain.layers[0]?.id ?? null)
    clearSelectedItems()
    setViewMode('editor')
    setStatusMessage('Nouveau terrain cree.')
  }

  function buildTerrainSaveBlob(terrainDocument: TerrainDocument) {
    return new Blob([JSON.stringify(terrainDocument, null, 2)], {
      type: 'application/json',
    })
  }

  function getTerrainSaveFileName(terrainDocument: TerrainDocument) {
    return `${terrainDocument.name.trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'omegarolegameeditor'}.terrain.json`
  }

  async function writeTerrainToHandle(handle: SaveFileHandleLike, terrainDocument: TerrainDocument) {
    const writable = await handle.createWritable()
    await writable.write(buildTerrainSaveBlob(terrainDocument))
    await writable.close()
  }

  async function saveTerrainToFile(
    options: {
      forcePicker?: boolean
      silent?: boolean
      terrainDocument?: TerrainDocument
    } = {},
  ) {
    const baseDocument = options.terrainDocument ?? terrainRef.current
    // Strip characterData des tokenAssignments avant sauvegarde : characterFileName suffit
    // pour recharger la fiche au chargement. Cela évite d'embarquer un CharacterDocument
    // complet (potentiellement volumineux) dans chaque assignation du terrain JSON.
    const slimTokenAssignments = Object.fromEntries(
      Object.entries(tokenAssignments).map(([tokenId, assignment]) => {
        const { characterData: _cd, ...rest } = assignment
        return [tokenId, rest]
      })
    )
    const preTerrainDocument = {
      ...baseDocument,
      tokenAssignments: slimTokenAssignments,
      phoneVirtualContacts,
    }
    const terrainDocument = await deduplicateTerrainAssets(preTerrainDocument)
    const fileName = getTerrainSaveFileName(terrainDocument)
    const pickerWindow = window as SavePickerWindow
    let handle = options.forcePicker ? null : terrainSaveHandleRef.current
    const isSilentSave = Boolean(options.silent)

    if (isSilentSave) {
      autoSaveInFlightCountRef.current += 1
      setIsAutoSaving(true)
    }

    try {
      if (!handle && pickerWindow.showSaveFilePicker) {
        handle = await pickerWindow.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Terrain OmegaRoleGameEditor',
              accept: {
                'application/json': ['.terrain.json', '.json'],
              },
            },
          ],
        })
        terrainSaveHandleRef.current = handle
        saveTerrainSaveHandle(handle).catch(console.error)
        setHasAutoSaveTarget(true)
      }

      if (handle) {
        setHasAutoSaveTarget(true)
        await writeTerrainToHandle(handle, terrainDocument)
      } else {
        if (options.silent) {
          return
        }

        const blob = buildTerrainSaveBlob(terrainDocument)
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)
      }

      setLastTerrainSaveAt(Date.now())

      if (!options.silent) {
        setStatusMessage(`Terrain sauvegarde: ${fileName}`)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (!options.silent) {
          setStatusMessage('Sauvegarde annulee.')
        }
        return
      }

      setStatusMessage('Impossible de sauvegarder le terrain.')
    } finally {
      if (isSilentSave) {
        autoSaveInFlightCountRef.current = Math.max(0, autoSaveInFlightCountRef.current - 1)
        setIsAutoSaving(autoSaveInFlightCountRef.current > 0)
      }
    }
  }

  useEffect(() => {
    if (!isAutoSaveOnModifyEnabled || !hasAutoSaveTarget || terrainSaveHandleRef.current === null) {
      return
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current)
    }

    setIsAutoSaveScheduled(true)

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null
      setIsAutoSaveScheduled(false)
      void saveTerrainToFile({ silent: true, terrainDocument: terrainRef.current })
    }, 5000)

    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
        setIsAutoSaveScheduled(false)
      }
    }
  }, [hasAutoSaveTarget, isAutoSaveOnModifyEnabled, terrain])

  function disconnectSession(message = 'Connexion coupee.') {
    const socket = wsRef.current
    wsRef.current = null
    roleRef.current = null
    clearTerrainSyncTimeout()
    measureStartPointRef.current = null
    measureDraftIdRef.current = null
    setMeasureDraft(null)
    setSyncedMeasures([])
    setDiceHistory([])
    setActiveDiceRolls([])
    setTurnTracker({ entries: [], currentEntryId: null, round: 1 })
    setTurnTrackerDraftLabel('')
    setSharedTimers([])
    resetTimers()
    setIsTimerDialogOpen(false)
    setIsTimerPanelCollapsed(false)
    setPlayerViewPolicy(null)
    setIsFollowingHostCursor(false)
    for (const timeoutId of pingTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId)
    }
    pingTimeoutsRef.current.clear()
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close()
    }
    setPlayerId(null)
    setRoomPlayers([])
    remoteCursorPositionsRef.current.clear()
    resetPhone()
    setIsPhoneOpen(false)
    resetAudio()
    setJoinConfig(null)
    setSelectedPredeclaredPlayerId('')
    setPlayerTerrain(createDefaultTerrain())
    setIsPredeclaredPlayerChoiceDialogOpen(false)
    setStatusMessage(message)
  }


  async function importSoundboardTracks(event: ChangeEvent<HTMLInputElement>) {
    const filesArray = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ''

    if (filesArray.length === 0) {
      return
    }

    try {
      const newItems = await Promise.all(
        filesArray.map(async (file) => {
          const src = await fileToDataUrl(file)
          return {
            id: generateClientId(),
            name: file.name.replace(/\.[^.]+$/, ''),
            src,
            defaultRange: 1000
          }
        })
      )

      applyTerrain({
        ...terrainRef.current,
        soundboard: [...(terrainRef.current.soundboard || []), ...newItems],
      })
      setStatusMessage(`${newItems.length} son(s) ajoute(s) a la soundboard.`)
    } catch (err) {
      setStatusMessage('Erreur lors de l import d un son.')
    }
  }

  async function importAudioTrack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const src = await fileToDataUrl(file)
      applyTerrain({
        ...terrainRef.current,
        audio: {
          name: file.name.replace(/\.[^.]+$/, ''),
          src,
        },
      })
      setSharedAudioState({
        isPlaying: false,
        isLooping: false,
        currentTime: 0,
        updatedAt: Date.now(),
      })
      setStatusMessage(`Audio charge: ${file.name}`)
    } catch {
      setStatusMessage('Impossible de charger la piste audio.')
    }
  }

  function clearAudioTrack() {
    if (!terrainRef.current.audio) {
      return
    }

    applyTerrain({
      ...terrainRef.current,
      audio: null,
    })
    setSharedAudioState({
      isPlaying: false,
      isLooping: false,
      currentTime: 0,
      updatedAt: Date.now(),
    })
    setStatusMessage('Audio retire du terrain.')
  }

  function toggleSharedAudioPlayback() {
    if (!canControlAudio || !activeAudioTrack?.src) {
      return
    }

    const audio = audioElementRef.current
    const currentTime = audio?.currentTime ?? sharedAudioState.currentTime
    const nextPlaying = !sharedAudioState.isPlaying

    setSharedAudioState({
      isPlaying: nextPlaying,
      isLooping: sharedAudioState.isLooping,
      currentTime,
      updatedAt: Date.now(),
    })
    setStatusMessage(nextPlaying ? 'Lecture audio synchronisee.' : 'Lecture audio en pause.')
  }

  function toggleSharedAudioLoop() {
    if (!canControlAudio || !activeAudioTrack?.src) {
      return
    }

    const nextLoop = !sharedAudioState.isLooping
    setSharedAudioState((current) => ({
      ...current,
      isLooping: nextLoop,
      updatedAt: Date.now(),
    }))
    setStatusMessage(nextLoop ? 'Boucle audio activee.' : 'Boucle audio desactivee.')
  }

  function handleSharedAudioEnded() {
    // For YouTube with loop enabled, manually restart playback
    // (YouTube's native loop playerVar doesn't work reliably with dynamic toggling)
    if (sharedAudioStateRef.current.isLooping) {
      const yt = ytPlayerRef.current
      if (yt?.seekTo) {
        yt.seekTo(0, true)
        yt.playVideo()
      }
      return
    }

    if (roleRef.current !== 'host') {
      return
    }

    setSharedAudioState({
      isPlaying: false,
      isLooping: false,
      currentTime: 0,
      updatedAt: Date.now(),
    })
  }

  function startStagePan(clientX: number, clientY: number, targetView: 'editor' | 'player' = 'editor') {
    const frame = targetView === 'player' ? playerStageFrameRef.current : editorStageFrameRef.current
    if (!frame) {
      return
    }

    setPanState({
      targetView,
      pointerX: clientX,
      pointerY: clientY,
      startScrollLeft: frame.scrollLeft,
      startScrollTop: frame.scrollTop,
    })
  }

  function clearPlayerPingTimer(playerIdToClear: string) {
    const timeoutId = pingTimeoutsRef.current.get(playerIdToClear)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      pingTimeoutsRef.current.delete(playerIdToClear)
    }
  }

  function schedulePingExpiry(playerIdToClear: string) {
    clearPlayerPingTimer(playerIdToClear)

    const timeoutId = window.setTimeout(() => {
      pingTimeoutsRef.current.delete(playerIdToClear)
      setRoomPlayers((current) =>
        current.map((player) => (player.id === playerIdToClear ? { ...player, ping: undefined } : player)),
      )
    }, PING_DURATION_MS)
    pingTimeoutsRef.current.set(playerIdToClear, timeoutId)
  }

  function playPingSound() {
    if (typeof window === 'undefined') {
      return
    }

    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) {
      return
    }

    try {
      const audioContext = pingAudioContextRef.current ?? new AudioContextCtor()
      pingAudioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        void audioContext.resume()
      }

      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const startAt = audioContext.currentTime

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1046.5, startAt)
      oscillator.frequency.exponentialRampToValueAtTime(783.99, startAt + 0.12)

      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28)

      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start(startAt)
      oscillator.stop(startAt + 0.3)
    } catch {
      // Ignore audio failures on unsupported or blocked contexts.
    }
  }

  function commitNoteEditorContent() {
    if (!selectedItem || !noteEditorRef.current) {
      return
    }

    const nextNote = sanitizeRichTextNote(noteEditorRef.current.innerHTML)
    if (nextNote !== selectedItem.note) {
      updateItem(selectedItem.id, { note: nextNote })
    }
  }

  function commitNotePlayersEditorContent() {
    if (!selectedItem || !notePlayersEditorRef.current) {
      return
    }

    const nextNote = sanitizeRichTextNote(notePlayersEditorRef.current.innerHTML)
    if (nextNote !== selectedItem.notePlayers) {
      updateItem(selectedItem.id, { notePlayers: nextNote })
    }
  }

  function commitTokenPanelEditorContent() {
    if (!selectedItem || !tokenPanelEditorRef.current) {
      return
    }

    const nextContent = sanitizeRichTextNote(tokenPanelEditorRef.current.innerHTML)
    if (nextContent !== selectedItem.tokenPanelText) {
      updateItem(selectedItem.id, { tokenPanelText: nextContent })
    }
  }

  function saveNoteSelection() {
    const selection = window.getSelection()
    const editor = noteEditorRef.current
    if (!selection || !editor || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      return
    }

    noteSelectionRef.current = range.cloneRange()
  }

  function saveNotePlayersSelection() {
    const selection = window.getSelection()
    const editor = notePlayersEditorRef.current
    if (!selection || !editor || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      return
    }

    notePlayersSelectionRef.current = range.cloneRange()
  }

  function saveTokenPanelSelection() {
    const selection = window.getSelection()
    const editor = tokenPanelEditorRef.current
    if (!selection || !editor || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      return
    }

    tokenPanelSelectionRef.current = range.cloneRange()
  }

  function restoreNoteSelection() {
    const selection = window.getSelection()
    const editor = noteEditorRef.current
    if (!selection || !editor) {
      return false
    }

    editor.focus()
    if (!noteSelectionRef.current) {
      return false
    }

    selection.removeAllRanges()
    selection.addRange(noteSelectionRef.current)
    return true
  }

  function restoreNotePlayersSelection() {
    const selection = window.getSelection()
    const editor = notePlayersEditorRef.current
    if (!selection || !editor) {
      return false
    }

    editor.focus()
    if (!notePlayersSelectionRef.current) {
      return false
    }

    selection.removeAllRanges()
    selection.addRange(notePlayersSelectionRef.current)
    return true
  }

  function restoreTokenPanelSelection() {
    const selection = window.getSelection()
    const editor = tokenPanelEditorRef.current
    if (!selection || !editor) {
      return false
    }

    editor.focus()
    if (!tokenPanelSelectionRef.current) {
      return false
    }

    selection.removeAllRanges()
    selection.addRange(tokenPanelSelectionRef.current)
    return true
  }

  function applyNoteCommand(command: 'bold' | 'italic' | 'foreColor', value?: string) {
    if (!selectedItem || !noteEditorRef.current) {
      return
    }

    restoreNoteSelection()
    document.execCommand(command, false, value)
    commitNoteEditorContent()
    saveNoteSelection()
  }

  function applyNotePlayersCommand(command: 'bold' | 'italic' | 'foreColor', value?: string) {
    if (!selectedItem || !notePlayersEditorRef.current) {
      return
    }

    restoreNotePlayersSelection()
    document.execCommand(command, false, value)
    commitNotePlayersEditorContent()
    saveNotePlayersSelection()
  }

  function applyTokenPanelCommand(command: 'bold' | 'italic' | 'foreColor', value?: string) {
    if (!selectedItem || !tokenPanelEditorRef.current) {
      return
    }

    restoreTokenPanelSelection()
    document.execCommand(command, false, value)
    commitTokenPanelEditorContent()
    saveTokenPanelSelection()
  }

  function updateTerrainColorPalette(nextColor: string) {
    const normalizedColor = normalizePaletteColor(nextColor)
    updateTerrain((current) => {
      const existingPalette = current.colorPalette ?? []
      if (existingPalette.includes(normalizedColor)) {
        return current
      }

      return {
        ...current,
        colorPalette: [...existingPalette, normalizedColor],
      }
    })
  }

  function applyNoteColor(color: string) {
    const normalizedColor = normalizePaletteColor(color)
    setNoteColorDraft(normalizedColor)
    applyNoteCommand('foreColor', normalizedColor)
  }

  function applyNotePlayersColor(color: string) {
    const normalizedColor = normalizePaletteColor(color)
    setNotePlayersColorDraft(normalizedColor)
    applyNotePlayersCommand('foreColor', normalizedColor)
  }

  function applyTokenPanelColor(color: string) {
    const normalizedColor = normalizePaletteColor(color)
    setTokenPanelColorDraft(normalizedColor)
    applyTokenPanelCommand('foreColor', normalizedColor)
  }

  /**
   * Met à jour le CONTENU de la note de survol (htmlMJ, htmlPlayers).
   * Appelé uniquement sur `onPointerEnter` (changement d'item), PAS sur
   * `onPointerMove` — le contenu est stable tant qu'on reste sur le même
   * item. Coûteux : DOMParser pour la sanitization HTML. À ne PAS appeler
   * sur chaque pixel de mouvement de souris (cf. `scheduleHoveredNotePosUpdate`).
   */
  function setHoveredNoteContentForItem(item: TerrainItem | null) {
    if (!item) {
      setHoveredNoteContent(null)
      setHoveredNoteItem(null)
      return
    }
    const isEditor = viewMode === 'editor'
    const htmlMJ = isEditor && item.note ? renderNoteHtml(item.note) : null
    const htmlPlayers = item.notePlayers ? renderNoteHtml(item.notePlayers) : null
    if (!htmlMJ && !htmlPlayers) {
      setHoveredNoteContent(null)
      setHoveredNoteItem(null)
      return
    }
    setHoveredNoteContent({ htmlMJ, htmlPlayers })
    setHoveredNoteItem(item)
  }

  /**
   * Met à jour la POSITION de la note de survol de façon throttled (rAF).
   * Appelé sur `onPointerMove` : peut fire 100+ fois/sec, mais on ne
   * commit qu'une fois par frame navigateur, et on applique la position
   * via DOM direct (pas de re-render React) pour ne pas plomber les FPS.
   */
  function scheduleHoveredNotePosUpdate(clientX: number, clientY: number) {
    hoveredNotePosRef.current = { x: clientX, y: clientY }
    if (hoveredNoteRafRef.current !== null) {
      return
    }
    hoveredNoteRafRef.current = window.requestAnimationFrame(() => {
      hoveredNoteRafRef.current = null
      // Mutation DOM directe : on retrouve le tooltip et on met à jour
      // sa position sans déclencher de re-render React.
      const el = document.querySelector<HTMLElement>('[data-hovered-note-tooltip]')
      if (el) {
        el.style.left = `${hoveredNotePosRef.current.x}px`
        el.style.top = `${hoveredNotePosRef.current.y}px`
      }
    })
  }

  function showNoteTooltip(item: TerrainItem, clientX: number, clientY: number) {
    // ⚠️ Performance : on sépare le contenu (changement d'item) et la
    // position (mouvement de souris). Le contenu est mis à jour
    // immédiatement (rare, ~1 fois par survol). La position est
    // throttled via rAF (peut fire 100+ fois/sec sur un mouvement) et
    // appliquée via DOM direct, sans re-render React.
    setHoveredNoteContentForItem(item)
    // Position immédiate au premier appel (sinon le tooltip apparaît à 0,0
    // pendant 1 frame avant la première animation frame).
    const el = document.querySelector<HTMLElement>('[data-hovered-note-tooltip]')
    if (el) {
      el.style.left = `${clientX}px`
      el.style.top = `${clientY}px`
    }
    hoveredNotePosRef.current = { x: clientX, y: clientY }
  }

  function hideNoteTooltip() {
    if (hoveredNoteRafRef.current !== null) {
      window.cancelAnimationFrame(hoveredNoteRafRef.current)
      hoveredNoteRafRef.current = null
    }
    setHoveredNoteContent(null)
    setHoveredNoteItem(null)
  }

  function cancelPresencePopupHide() {
    if (presenceHideTimeoutRef.current !== null) {
      window.clearTimeout(presenceHideTimeoutRef.current)
      presenceHideTimeoutRef.current = null
    }
  }

  function showPresencePopup(anchor: HTMLElement) {
    cancelPresencePopupHide()
    presenceAnchorRef.current = anchor
    setPresencePopup(buildPresencePopupPosition(anchor))
  }

  function hidePresencePopupSoon() {
    cancelPresencePopupHide()
    presenceHideTimeoutRef.current = window.setTimeout(() => {
      presenceAnchorRef.current = null
      presenceHideTimeoutRef.current = null
      setPresencePopup(null)
    }, 120)
  }

  function getEditorInsertionPoint() {
    const currentTerrain = terrainRef.current
    const pointer = lastEditorPointerRef.current
    const stage = editorStageRef.current
    if (!pointer || !stage) {
      return {
        x: currentTerrain.width / 2,
        y: currentTerrain.height / 2,
      }
    }

    return getMapPoint(stage, currentTerrain.width, currentTerrain.height, pointer.x, pointer.y)
  }

  function getCurrentStageMapPoint(targetViewMode: 'editor' | 'player') {
    const pointer = targetViewMode === 'player' ? lastPlayerPointerRef.current : lastEditorPointerRef.current
    const stage = targetViewMode === 'player' ? playerStageRef.current : editorStageRef.current
    const currentTerrain = targetViewMode === 'player' ? playerTerrainRef.current : terrainRef.current
    if (!pointer || !stage) {
      return null
    }

    return getMapPoint(stage, currentTerrain.width, currentTerrain.height, pointer.x, pointer.y)
  }

  function getEditorStagePoint(clientX: number, clientY: number) {
    const stage = editorStageRef.current
    if (!stage) {
      return null
    }

    const rect = stage.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    return {
      x: ((clientX - rect.left) / rect.width) * terrainRef.current.width,
      y: ((clientY - rect.top) / rect.height) * terrainRef.current.height,
    }
  }

  function getEditorPointerAngle(centerX: number, centerY: number, clientX: number, clientY: number) {
    const point = getEditorStagePoint(clientX, clientY)
    if (!point) {
      return null
    }

    return (Math.atan2(point.y - centerY, point.x - centerX) * 180) / Math.PI
  }

  function toggleSelectedItemLock() {
    if (viewMode !== 'editor' || !selectedItem) {
      return false
    }

    const nextLocked = !selectedItem.locked
    updateTerrain(
      (current) => ({
        ...current,
        items: current.items.map((item) => (item.id === selectedItem.id ? { ...item, locked: nextLocked } : item)),
      }),
      { syncItemId: selectedItem.id },
    )
    setStatusMessage(nextLocked ? 'Element verrouille.' : 'Element deverrouille.')
    return true
  }

  function toggleSelectedItemVisibility() {
    if (viewMode !== 'editor' || !selectedItem) {
      return false
    }

    if (selectedItem.locked) {
      setStatusMessage('Element verrouille.')
      return false
    }

    const nextVisible = !selectedItem.visible
    updateItem(selectedItem.id, { visible: nextVisible })
    setStatusMessage(nextVisible ? 'Element affiche.' : 'Element masque.')
    return true
  }

  function pushSyncedMeasure(measure: SyncedMeasure) {
    setSyncedMeasures((current) => [...current.filter((entry) => entry.id !== measure.id), measure])
  }

  function normalizeDiceSides(value: number) {
    if (!Number.isFinite(value)) {
      return 6
    }

    return Math.max(2, Math.min(1000, Math.round(value)))
  }

  function normalizeDiceCount(value: number) {
    if (!Number.isFinite(value)) {
      return 1
    }

    return Math.max(1, Math.min(100, Math.round(value)))
  }

  function formatDiceFormula(count: number, sides: number, modifier?: number) {
    const rawValue = `${normalizeDiceCount(count)}d${normalizeDiceSides(sides)}`
    if (!modifier) return rawValue
    return `${rawValue}${modifier > 0 ? '+' : ''}${modifier}`
  }

  function sanitizeDiceFormulaInput(value: string) {
    const rawValue = value.toLowerCase().replace(/[^\dd+\-]/g, '')
    const separatorIndex = rawValue.indexOf('d')
    return separatorIndex < 0
      ? rawValue.replace(/d/g, '')
      : `${rawValue.slice(0, separatorIndex).replace(/d/g, '')}d${rawValue.slice(separatorIndex + 1).replace(/d/g, '')}`
  }

  function parseDiceFormula(value: string) {
    const match = value.trim().replace(/\s+/g, '').match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i)
    if (!match) {
      return null
    }

    return {
      count: normalizeDiceCount(Number(match[1])),
      sides: normalizeDiceSides(Number(match[2])),
      modifier: match[3] ? (match[3] === '-' ? -Number(match[4]) : Number(match[4])) : 0,
    }
  }

  function applyDiceFormula(value: string, options?: { commitText?: boolean }) {
    const parsed = parseDiceFormula(value)
    if (!parsed) {
      if (options?.commitText) {
        setCustomDiceFormula(formatDiceFormula(selectedDiceCount, selectedDiceSides))
      }
      return false
    }

    setSelectedDiceCount(parsed.count)
    setSelectedDiceSides(parsed.sides)
    if (options?.commitText) {
      setCustomDiceFormula(formatDiceFormula(parsed.count, parsed.sides, parsed.modifier))
    }
    return true
  }

  function handleCustomDiceFormulaChange(value: string) {
    const nextValue = sanitizeDiceFormulaInput(value)
    setCustomDiceFormula(nextValue)
    if (!nextValue) {
      return
    }

    void applyDiceFormula(nextValue)
  }

  function appendDiceHistoryEntry(entry: DiceHistoryEntry) {
    setDiceHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, MAX_DICE_HISTORY))
  }

  function pushActiveDiceRoll(entry: DiceHistoryEntry) {
    const nextRoll: ActiveDiceRoll = {
      ...entry,
      expiresAt: Date.now() + diceRollAnimationDurationMs + diceResultDisplayDurationMs,
    }

    setActiveDiceRolls((current) => [nextRoll, ...current.filter((roll) => roll.id !== entry.id)].slice(0, MAX_ACTIVE_DICE_ROLLS))
  }

  function getDiceSidesToRoll() {
    const parsedCustomFormula = parseDiceFormula(customDiceFormula)
    if (parsedCustomFormula) {
      return parsedCustomFormula
    }

    return {
      count: normalizeDiceCount(selectedDiceCount),
      sides: normalizeDiceSides(selectedDiceSides),
      modifier: 0,
    }
  }

  function selectDicePreset(sides: number) {
    const normalizedSides = normalizeDiceSides(sides)
    setSelectedDiceCount(1)
    setSelectedDiceSides(normalizedSides)
    setCustomDiceFormula(formatDiceFormula(1, normalizedSides))
  }

  function requestDiceRoll(nextRoll?: { count: number; sides: number; modifier?: number; reason?: string; successThreshold?: number } | Event) {
    const isEvent = nextRoll instanceof Event || (nextRoll && 'nativeEvent' in nextRoll)
    const payload = isEvent ? undefined : nextRoll as { count: number; sides: number; modifier?: number; reason?: string; successThreshold?: number }
    const { count, sides, modifier } = payload ?? getDiceSidesToRoll()
    const reason = payload?.reason ?? diceRollReason
    // successThreshold : priorité au payload (jet de caractéristique), sinon au champ Cible.
    const targetNumber = payload?.successThreshold ?? (diceTarget.trim() !== '' ? Number(diceTarget) : undefined)
    const successThreshold = Number.isFinite(targetNumber) ? Math.max(1, Math.min(100, Math.round(targetNumber!))) : undefined

    if (!roleRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
      setStatusMessage('Connecte une salle pour lancer les des.')
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: roleRef.current === 'host' ? 'host:rollDice' : 'player:rollDice',
        count,
        sides,
        modifier: modifier || 0,
        reason: reason.trim() || undefined,
        secret: isSecretDiceRoll,
        successThreshold,
      }),
    )
    setDiceRollReason('')
    setDiceTarget('')
  }



  function resolveMeasureColor(measurePlayerId: string) {
    return roomPlayers.find((player) => player.id === measurePlayerId)?.color ?? hostPresence?.color ?? 'var(--md-sys-color-primary)'
  }

  function renderTokenPanel(item: TerrainItem, resolved: typeof DEFAULT_TRANSFORM) {
    if (!item.tokenPanelEnabled) {
      return null
    }

    if (viewMode === 'editor' && item.id === selectedItemId) {
      return null
    }

    const html = renderNoteHtml(item.tokenPanelText)
    if (!html) {
      return null
    }

    const width = item.width * resolved.scale

    return (
      <div
        key={`${item.id}-panel`}
        className="token-panel surface-base"
        style={{
          left: `${resolved.x + width / 2}px`,
          top: `${resolved.y + item.height * resolved.scale + 8}px`,
          minWidth: `${Math.max(96, Math.min(width, 220))}px`,
          maxWidth: `${Math.max(156, width * 1.8)}px`,
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  }

  function renderMeasureOverlays() {
    return (
      <>
        {syncedMeasures.map((measure) => {
          if (hideRemoteVisionAidsInFlashlight && measure.playerId !== 'host') return null
          const color = resolveMeasureColor(measure.playerId)

          return (
            <div key={measure.id} className="measure-overlay" aria-hidden="true">
              <div
                className="measure-point"
                style={{ left: `${measure.start.x}px`, top: `${measure.start.y}px`, backgroundColor: color }}
              />
              <div
                className="measure-line"
                style={{ ...buildMeasureLineStyle(measure.start, measure.end), backgroundColor: color }}
              />
              <div
                className="measure-point"
                style={{ left: `${measure.end.x}px`, top: `${measure.end.y}px`, backgroundColor: color }}
              />
              <div
                className="measure-label surface-base"
                style={{
                  left: `${(measure.start.x + measure.end.x) / 2}px`,
                  top: `${(measure.start.y + measure.end.y) / 2 - 14}px`,
                  borderColor: color,
                }}
              >
                {formatMeasureDistance(measure.start, measure.end)}
              </div>
            </div>
          )
        })}
        {measureDraft ? (
          <div className="measure-overlay" aria-hidden="true">
            <div
              className="measure-point"
              style={{ left: `${measureDraft.start.x}px`, top: `${measureDraft.start.y}px` }}
            />
            {measureDraft.end ? (
              <>
                <div
                  className="measure-line"
                  style={buildMeasureLineStyle(measureDraft.start, measureDraft.end)}
                />
                <div
                  className="measure-point"
                  style={{ left: `${measureDraft.end.x}px`, top: `${measureDraft.end.y}px` }}
                />
                <div
                  className="measure-label surface-base"
                  style={{
                    left: `${(measureDraft.start.x + measureDraft.end.x) / 2}px`,
                    top: `${(measureDraft.start.y + measureDraft.end.y) / 2 - 14}px`,
                  }}
                >
                  {formatMeasureDistance(measureDraft.start, measureDraft.end)}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  async function preloadTerrainAssets(terrain: import('./types/terrain').TerrainDocument) {
    const assetsToLoad = terrain.items.filter(i => i.src && (i.kind === 'image' || i.kind === 'token' || i.kind === 'audio'))
    if (assetsToLoad.length === 0) {
      setPlayerTerrain(terrain)
      return
    }

    let loadedCount = 0
    let totalSize = 0

    for (const item of assetsToLoad) {
      if (item.src.startsWith('data:')) {
        totalSize += Math.round(item.src.length * 0.75)
      }
    }

    setAssetPreloadProgress({ loaded: 0, total: assetsToLoad.length, sizeBytes: totalSize })

    const promises = assetsToLoad.map(item => {
      return new Promise<void>((resolve) => {
        if (item.kind === 'audio') {
          const audio = new Audio()
          const cleanup = () => {
            audio.oncanplaythrough = null
            audio.onerror = null
            audio.removeAttribute('src')
            audio.load()
            resolve()
          }
          audio.oncanplaythrough = () => {
            loadedCount++
            setAssetPreloadProgress(prev => prev ? { ...prev, loaded: loadedCount } : null)
            cleanup()
          }
          audio.onerror = () => {
            loadedCount++
            setAssetPreloadProgress(prev => prev ? { ...prev, loaded: loadedCount } : null)
            cleanup()
          }
          audio.src = item.src
          audio.load()
        } else {
          const img = new Image()
          const cleanup = () => {
            img.onload = null
            img.onerror = null
            img.src = ''
            resolve()
          }
          img.onload = () => {
            loadedCount++
            setAssetPreloadProgress(prev => prev ? { ...prev, loaded: loadedCount } : null)
            cleanup()
          }
          img.onerror = () => {
            loadedCount++
            setAssetPreloadProgress(prev => prev ? { ...prev, loaded: loadedCount } : null)
            cleanup()
          }
          img.src = item.src
        }
      })
    })

    const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, 8000))
    await Promise.race([Promise.all(promises), timeoutPromise])

    setAssetPreloadProgress(null)
    setPlayerTerrain(terrain)
  }

  function handleServerMessage(payload: string) {
    try {
      const message = JSON.parse(payload) as Record<string, unknown>

      if (message.type === 'session:ready') {
        if (message.role === 'host') {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'host:updatePlayerRegistry',
                preallocationEnabled: isPlayerPreallocationEnabled,
                predeclaredPlayers,
              }),
            )
            wsRef.current.send(
              JSON.stringify({
                type: 'host:updateViewPolicies',
                policies: buildPlayerViewPolicies(tokenAssignments, currentTurnEntry, terrain.items),
              }),
            )
          }
          setStatusMessage(`Salle ${String(message.roomId)} ouverte.`)
          return
        }

        setPlayerId(String(message.playerId ?? ''))
        setStatusMessage(`Connecte a la salle ${String(message.roomId)}.`)
        if (message.phoneVirtualContacts) {
          setPhoneVirtualContacts(message.phoneVirtualContacts as any[])
        }
        if (message.terrain) {
          if (roleRef.current === 'player' || message.role === 'player') {
            // First terrain load: preload assets once, then set terrain
            preloadTerrainAssets(message.terrain as import('./types/terrain').TerrainDocument).catch(console.error)
          } else {
            setPlayerTerrain(message.terrain as import('./types/terrain').TerrainDocument)
          }
        }
        return
      }

      if (message.type === 'room:terrain' && message.terrain) {
        setPlayerTerrain(message.terrain as import('./types/terrain').TerrainDocument)
        return
      }

      if (message.type === 'room:itemSynced' && message.item) {
        const nextItem = message.item as TerrainItem
        setPlayerTerrain((current) => {
          const existingIndex = current.items.findIndex((item) => item.id === nextItem.id)
          if (existingIndex === -1) {
            return {
              ...current,
              items: [...current.items, nextItem],
            }
          }

          const items = current.items.slice()
          items[existingIndex] = nextItem
          return {
            ...current,
            items,
          }
        })
        return
      }

      if (message.type === 'room:itemRemoved' && message.itemId) {
        const itemId = String(message.itemId)
        setPlayerTerrain((current) => ({
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
        }))
        return
      }

      if (message.type === 'room:audioState' && message.audioState) {
        if (roleRef.current === 'host') {
          return
        }
        setSharedAudioState(message.audioState as RoomAudioState)
        return
      }

      // Delegate phone-related messages to the phone composable
      if (handlePhoneServerMessage(message)) {
        return
      }

      if (message.type === 'room:updateCharacterVitals' && roleRef.current === 'host') {
        const tokenId = String(message.tokenId || '')
        const assignment = tokenAssignmentsRef.current[tokenId]
        if (assignment && assignment.characterFileName && assignment.characterData) {
          const healthCurrent = Number(message.healthCurrent) || 0
          const mentalCurrent = Number(message.mentalCurrent) || 0
          const astraCurrent = Number(message.astraCurrent) || 0
          const seq = Number(message.seq) || 0
          const updatedCharacter = {
            ...assignment.characterData,
            stats: {
              ...assignment.characterData.stats,
              health: { ...assignment.characterData.stats.health, current: healthCurrent },
              mental: { ...assignment.characterData.stats.mental, current: mentalCurrent },
              astra: { ...assignment.characterData.stats.astra, current: astraCurrent }
            }
          }
          const fullFileName = assignment.characterFileName.endsWith('.char.json')
            ? assignment.characterFileName
            : `${assignment.characterFileName}.char.json`
          syncCharacterToTokenAssignments(fullFileName, updatedCharacter as any)
          // Met aussi à jour activeCharacter si le MJ a la fiche de ce personnage
          // ouverte. On merge UNIQUEMENT les vitales pour ne pas écraser les
          // autres modifications en cours du MJ (nom, stats, etc.).
          if (activeCharacterFileName && `${activeCharacterFileName}.char.json` === fullFileName) {
            setActiveCharacter(prev => {
              if (!prev) return updatedCharacter as any;
              return {
                ...prev,
                stats: {
                  ...prev.stats,
                  health: { ...prev.stats.health, current: healthCurrent },
                  mental: { ...prev.stats.mental, current: mentalCurrent },
                  astra: { ...prev.stats.astra, current: astraCurrent },
                },
              };
            });
            // Alimente le canal dédié incomingVitals pour le CharacterSheetDialog du MJ.
            setIncomingVitalsForGM({ health: healthCurrent, mental: mentalCurrent, astra: astraCurrent, seq })
          }
          void saveCharacterToWorkfolder(updatedCharacter as any, assignment.characterFileName)
        }
        return
      }

      if (message.type === 'room:vitalsUpdate' && roleRef.current === 'player') {
        // Le MJ a modifié les vitales → on les relaye au CharacterSheetDialog du joueur
        // via le canal dédié incomingVitals. Toujours appliqué (last write wins).
        const seq = Number(message.seq) || 0
        setIncomingVitalsForPlayer({
          health: Number(message.healthCurrent) || 0,
          mental: Number(message.mentalCurrent) || 0,
          astra: Number(message.astraCurrent) || 0,
          seq,
        })
        return
      }

      if (message.type === 'room:playerRegistry') {
        const nextJoinConfig = normalizeRoomJoinConfigMessage(message)
        if (roleRef.current !== 'host') {
          setIsPlayerPreallocationEnabled(nextJoinConfig.preallocationEnabled)
          setPredeclaredPlayers(nextJoinConfig.predeclaredPlayers)
          setJoinConfig(nextJoinConfig)
          setSelectedPredeclaredPlayerId((current) =>
            nextJoinConfig.predeclaredPlayers.some((player) => player.id === current) ? current : '',
          )
        }
        return
      }

      if (message.type === 'room:viewPolicy') {
        setPlayerViewPolicy((message.policy as PlayerViewPolicy | null) ?? null)
        return
      }

      if (message.type === 'room:measure' && message.measure) {
        const nextMeasure = message.measure as SyncedMeasure
        if (
          !nextMeasure.id ||
          !nextMeasure.playerId ||
          !nextMeasure.start ||
          !nextMeasure.end ||
          !Number.isFinite(nextMeasure.expiresAt)
        ) {
          return
        }

        if (nextMeasure.expiresAt <= Date.now()) {
          return
        }

        if (measureDraftIdRef.current === nextMeasure.id) {
          return
        }

        pushSyncedMeasure(nextMeasure)
        return
      }

      if (message.type === 'room:diceHistory' && Array.isArray(message.entries)) {
        setDiceHistory((message.entries as DiceHistoryEntry[]).slice(0, MAX_DICE_HISTORY))
        return
      }

      if (message.type === 'room:diceHistoryEntry' && message.entry) {
        appendDiceHistoryEntry(message.entry as DiceHistoryEntry)
        return
      }

      if (message.type === 'room:diceRoll' && message.roll) {
        pushActiveDiceRoll(message.roll as DiceHistoryEntry)
        return
      }

      if (message.type === 'room:turnTracker' && message.turnTracker) {
        setTurnTracker(normalizeTurnTrackerStateMessage(message.turnTracker))
        return
      }

      if (message.type === 'room:timers') {
        setSharedTimers(normalizeSharedTimersMessage(message.timers))
        return
      }

      if (message.type === 'room:players' && Array.isArray(message.players)) {
        const nextPlayers = (message.players as RoomPlayer[]).map((player) => {
          if (!player.ping) {
            clearPlayerPingTimer(player.id)
            return player
          }

          if (Date.now() - player.ping.at >= PING_DURATION_MS) {
            clearPlayerPingTimer(player.id)
            return { ...player, ping: undefined }
          }

          schedulePingExpiry(player.id)
          return player
        })

        // Purge stale cursor positions for players no longer in the room
        const currentPlayerIds = new Set(nextPlayers.map((p) => p.id))
        for (const cursorId of Array.from(remoteCursorPositionsRef.current.keys())) {
          if (!currentPlayerIds.has(cursorId)) {
            remoteCursorPositionsRef.current.delete(cursorId)
          }
        }

        setRoomPlayers(nextPlayers)
        return
      }

      if (message.type === 'room:cursor' && message.player) {
        const nextPlayer = message.player as RoomPlayer

        remoteCursorPositionsRef.current.set(nextPlayer.id, { x: nextPlayer.x, y: nextPlayer.y });

        // Update DOM directly for cursor positions to avoid 25fps React re-renders
        const editorCursor = document.getElementById(`editor-cursor-${nextPlayer.id}`);
        if (editorCursor) {
          editorCursor.style.left = `${nextPlayer.x}px`;
          editorCursor.style.top = `${nextPlayer.y}px`;
        }
        const playerCursor = document.getElementById(`player-cursor-${nextPlayer.id}`);
        if (playerCursor) {
          playerCursor.style.left = `${nextPlayer.x}px`;
          playerCursor.style.top = `${nextPlayer.y}px`;
        }

        if (nextPlayer.ping) {
          if (Date.now() - nextPlayer.ping.at >= PING_DURATION_MS) {
            clearPlayerPingTimer(nextPlayer.id)
            nextPlayer.ping = undefined
          } else {
            schedulePingExpiry(nextPlayer.id)
          }
        } else {
          clearPlayerPingTimer(nextPlayer.id)
          nextPlayer.ping = undefined
        }

        // Fast-path: mutate the existing player object in-place to avoid
        // calling setRoomPlayers 25fps (which would queue updaters in React
        // even when returning `current`, causing a massive memory leak).
        // Only call setRoomPlayers if the player is new or non-cursor fields changed.
        const existing = roomPlayersRef.current.find(p => p.id === nextPlayer.id);
        if (existing && existing.ping?.at === nextPlayer.ping?.at && existing.name === nextPlayer.name && existing.color === nextPlayer.color) {
          // Mutate in-place — no React state update needed
          existing.x = nextPlayer.x;
          existing.y = nextPlayer.y;
        } else {
          setRoomPlayers((current) => upsertRoomPlayer(current, nextPlayer));
        }
        return
      }

      if (message.type === 'room:ping' && message.ping) {
        const ping = message.ping as { playerId: string; x: number; y: number; at: number }
        playPingSound()
        setRoomPlayers((current) =>
          current.map((player) =>
            player.id === ping.playerId ? { ...player, ping: { x: ping.x, y: ping.y, at: ping.at } } : player,
          ),
        )
        schedulePingExpiry(ping.playerId)
        return
      }

      if (message.type === 'room:closed') {
        disconnectSession('Le MJ a ferme la salle.')
        return
      }

      if (message.type === 'system:error') {
        if (String(message.message ?? '').includes('pre-declare')) {
          setIsClientDialogOpen(true)
          setIsPredeclaredPlayerChoiceDialogOpen(true)
        }
        disconnectSession(String(message.message ?? 'Erreur reseau.'))
      }
    } catch {
      setStatusMessage('Message reseau ignore car invalide.')
    }
  }

  function connect(role: 'host' | 'player') {
    disconnectSession('Connexion en cours...')
    const socket = new WebSocket(serverUrl)
    wsRef.current = socket
    roleRef.current = role

    socket.onopen = () => {
      if (role === 'host') {
        socket.send(JSON.stringify({ type: 'host:createRoom', roomId }))
        socket.send(
          JSON.stringify({
            type: 'host:updateTerrain',
            terrain: sanitizeTerrainForPlayers(terrainRef.current),
          }),
        )
        socket.send(
          JSON.stringify({
            type: 'host:updateAudioState',
            audioState: sharedAudioStateRef.current,
          }),
        )
        socket.send(
          JSON.stringify({
            type: 'host:updateViewPolicies',
            policies: buildPlayerViewPolicies(tokenAssignments, currentTurnEntry, terrainRef.current.items),
          }),
        )
      } else {
        socket.send(
          JSON.stringify({
            type: 'player:join',
            roomId,
            name: playerName.trim() || 'Joueur',
            color: playerColor,
            predeclaredPlayerId: joinConfig?.preallocationEnabled ? selectedPredeclaredPlayerId : null,
          }),
        )
      }
    }

    socket.onmessage = (event) => {
      handleServerMessageRef.current(String(event.data))
    }

    socket.onerror = () => {
      disconnectSession('Impossible de joindre le serveur.')
    }

    socket.onclose = () => {
      if (wsRef.current === socket) {
        disconnectSession('Connexion fermee.')
      }
    }
  }

  function normalizeTurnTrackerStateMessage(value: unknown): TurnTrackerState {
    const fallbackState: TurnTrackerState = { entries: [], currentEntryId: null, round: 1 }
    if (!value || typeof value !== 'object') {
      return fallbackState
    }

    const rawEntries = Array.isArray((value as { entries?: unknown[] }).entries) ? (value as { entries: unknown[] }).entries : []
    const entries = rawEntries.reduce<TurnTrackerEntry[]>((result, entry) => {
      if (!entry || typeof entry !== 'object') {
        return result
      }

      const nextEntry = entry as Record<string, unknown>
      const kind = nextEntry.kind === 'player' ? 'player' : 'custom'
      const id = String(nextEntry.id ?? '').trim()
      const label = String(nextEntry.label ?? '').trim()
      if (!id || !label) {
        return result
      }

      result.push({
        id,
        label,
        color: normalizePaletteColor(String(nextEntry.color ?? DEFAULT_TURN_TRACKER_CUSTOM_COLOR)),
        kind,
        playerId: kind === 'player' ? String(nextEntry.playerId ?? '').trim() || undefined : undefined,
        points: nextEntry.points && typeof nextEntry.points === 'object' ? {
          action: Boolean((nextEntry.points as Record<string, unknown>).action),
          movement: Boolean((nextEntry.points as Record<string, unknown>).movement),
          intervention: Boolean((nextEntry.points as Record<string, unknown>).intervention),
        } : undefined,
      })
      return result
    }, [])

    const currentEntryId = String((value as { currentEntryId?: unknown }).currentEntryId ?? '').trim() || null
    const roundValue = Number((value as { round?: unknown }).round)

    return {
      entries,
      currentEntryId: currentEntryId && entries.some((entry) => entry.id === currentEntryId) ? currentEntryId : entries[0]?.id ?? null,
      round: Number.isFinite(roundValue) ? Math.max(1, Math.round(roundValue)) : 1,
    }
  }

  function addCustomTurnTrackerEntry() {
    const label = turnTrackerDraftLabel.trim()
    if (!label) {
      setStatusMessage('Donne un nom a l entree de tour.')
      return
    }

    if (sendTurnTrackerCommand({ action: 'addCustom', label, color: DEFAULT_TURN_TRACKER_CUSTOM_COLOR })) {
      setTurnTrackerDraftLabel('')
    }
  }
  function startPanelDrag(panel: 'turnTracker' | 'timerPanel' | 'phonePanel' | 'soundboardPanel', clientX: number, clientY: number) {
    const currentPos = panel === 'turnTracker' ? turnTrackerPosition : panel === 'timerPanel' ? timerPanelPosition : panel === 'soundboardPanel' ? soundboardPanelPosition : phonePanelPosition
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panelX: currentPos?.x ?? 0,
      panelY: currentPos?.y ?? 0,
    }
    setDraggingPanel(panel)
  }

  function handlePanelDragMove(event: PointerEvent) {
    if (!draggingPanel || !dragStartRef.current) return

    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    const newX = dragStartRef.current.panelX + deltaX
    const newY = dragStartRef.current.panelY + deltaY

    if (draggingPanel === 'turnTracker') {
      setTurnTrackerPosition({ x: newX, y: newY })
    } else if (draggingPanel === 'timerPanel') {
      setTimerPanelPosition({ x: newX, y: newY })
    } else if (draggingPanel === 'soundboardPanel') {
      setSoundboardPanelPosition({ x: newX, y: newY })
    } else {
      setPhonePanelPosition({ x: newX, y: newY })
    }
  }

  function handlePanelDragEnd() {
    if (!draggingPanel || !dragStartRef.current) {
      setDraggingPanel(null)
      return
    }

    const SNAP_THRESHOLD = 40
    const position = draggingPanel === 'turnTracker' ? turnTrackerPosition : draggingPanel === 'timerPanel' ? timerPanelPosition : draggingPanel === 'soundboardPanel' ? soundboardPanelPosition : phonePanelPosition
    if (!position) {
      setDraggingPanel(null)
      return
    }

    const distanceToOrigin = Math.sqrt(position.x * position.x + position.y * position.y)
    if (distanceToOrigin < SNAP_THRESHOLD) {
      if (draggingPanel === 'turnTracker') {
        setTurnTrackerPosition(null)
      } else if (draggingPanel === 'timerPanel') {
        setTimerPanelPosition(null)
      } else if (draggingPanel === 'soundboardPanel') {
        setSoundboardPanelPosition(null)
      } else {
        setPhonePanelPosition(null)
      }
    }

    setDraggingPanel(null)
    dragStartRef.current = null
  }


  function startItemDrag(item: TerrainItem, clientX: number, clientY: number) {
    if (item.locked) {
      selectSingleItem(item.id)
      setStatusMessage('Element verrouille.')
      return
    }

    if (!selectedItemIds.includes(item.id)) {
      selectSingleItem(item.id)
    } else {
      setSelectedItemId(item.id)
    }

    startSelectedItemsDrag(item.id, clientX, clientY)
  }

  function startResize(item: TerrainItem, handle: ResizeHandle) {
    if (item.locked) {
      setSelectedItemId(item.id)
      setStatusMessage('Element verrouille.')
      return
    }

    const resolved = resolvedEditorItems.get(item.id) ?? DEFAULT_TRANSFORM
    const parentTransform = item.parentId
      ? resolvedEditorItems.get(item.parentId) ?? DEFAULT_TRANSFORM
      : DEFAULT_TRANSFORM

    setSelectedItemId(item.id)
    beginContinuousTerrainHistory()
    setResizeState({
      itemId: item.id,
      handle,
      startWidth: item.width,
      startHeight: item.height,
      flipX: item.flipX,
      flipY: item.flipY,
      parentTransform,
      itemTransform: resolved,
    })
  }

  function startRotationHold(item: TerrainItem, resolved: ResolvedItem, clientX: number, clientY: number, pointerId: number) {
    if (item.locked) {
      setSelectedItemId(item.id)
      setStatusMessage('Element verrouille.')
      return
    }

    const centerX = resolved.x + (item.width * resolved.scale) / 2
    const centerY = resolved.y + (item.height * resolved.scale) / 2
    const startPointerAngle = getEditorPointerAngle(centerX, centerY, clientX, clientY)
    if (startPointerAngle === null) {
      return
    }

    setSelectedItemId(item.id)
    beginContinuousTerrainHistory()
    setRotationHoldState({
      itemId: item.id,
      pointerId,
      startRotation: item.rotation,
      startPointerAngle,
      centerX,
      centerY,
    })
  }

  function handleTreeDragStart(event: ReactDragEvent<HTMLDivElement>, itemId: string) {
    const item = terrainRef.current.items.find((entry) => entry.id === itemId)
    if (!item || item.locked) {
      event.preventDefault()
      setStatusMessage('Element verrouille.')
      return
    }

    const draggingIds = selectedItemIds.includes(itemId) ? selectedItemIds : [itemId]
    const validDraggingIds = draggingIds.filter(id => {
      const i = terrainRef.current.items.find(e => e.id === id)
      return i && !i.locked
    })

    if (validDraggingIds.length === 0) {
      event.preventDefault()
      return
    }

    const idsString = validDraggingIds.join(',')
    setHierarchyDragItemId(idsString)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', idsString)

    const dragGhost = document.createElement('div')
    dragGhost.className = 'drag-ghost'
    dragGhost.style.position = 'absolute'
    dragGhost.style.top = '-1000px'
    dragGhost.style.background = 'var(--md-sys-color-primary)'
    dragGhost.style.color = 'var(--md-sys-color-on-primary)'
    dragGhost.style.padding = '4px 8px'
    dragGhost.style.borderRadius = '4px'
    dragGhost.style.fontSize = '12px'
    dragGhost.style.pointerEvents = 'none'
    dragGhost.style.zIndex = '9999'
    dragGhost.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
    dragGhost.style.whiteSpace = 'nowrap'

    if (validDraggingIds.length === 1) {
      dragGhost.textContent = item.name || item.kind
    } else {
      dragGhost.textContent = `${validDraggingIds.length} éléments`
    }

    document.body.appendChild(dragGhost)
    event.dataTransfer.setDragImage(dragGhost, 0, 0)

    requestAnimationFrame(() => {
      if (document.body.contains(dragGhost)) {
        document.body.removeChild(dragGhost)
      }
    })
  }

  function handleTreeDragEnd() {
    setHierarchyDragItemId(null)
    setHierarchyDropIndicator(null)
  }

  function resolveHierarchyDropMode(event: ReactDragEvent) {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    return relativeY <= rect.height * 0.35 ? 'before' : 'child'
  }

  function handleDragOverItem(event: ReactDragEvent, item: TerrainItem) {
    event.preventDefault()
    event.stopPropagation()

    const draggedItemId = hierarchyDragItemId ?? event.dataTransfer.getData('text/plain')
    if (!draggedItemId) {
      setHierarchyDropIndicator(null)
      return
    }

    const mode = resolveHierarchyDropMode(event)
    const targetParentId = mode === 'child' ? item.id : item.parentId
    if (!canDropItemOnTarget(draggedItemId, targetParentId)) {
      setHierarchyDropIndicator(null)
      return
    }

    setHierarchyDropIndicator({
      mode,
      targetItemId: item.id,
      layerId: item.layerId,
    })
  }

  function handleLayerRootDragOver(event: ReactDragEvent, layer: TerrainLayer) {
    event.preventDefault()

    const draggedItemId = hierarchyDragItemId ?? event.dataTransfer.getData('text/plain')
    if (!canDropItemOnTarget(draggedItemId, null)) {
      setHierarchyDropIndicator(null)
      return
    }

    setHierarchyDropIndicator({
      mode: 'layer-root',
      targetItemId: null,
      layerId: layer.id,
    })
  }

  function canDropItemOnTarget(sourceIdsString: string, targetId: string | null) {
    if (!sourceIdsString) {
      return false
    }

    const sourceIds = sourceIdsString.split(',')
    for (const sourceId of sourceIds) {
      if (targetId === sourceId) {
        return false
      }

      if (targetId) {
        if (getDescendantIds(terrain.items, sourceId).has(targetId)) {
          return false
        }
      }
    }

    return true
  }

  function handleDropAsChild(event: ReactDragEvent, parentItem: TerrainItem) {
    event.preventDefault()
    event.stopPropagation()
    const draggedItemIdString = hierarchyDragItemId ?? event.dataTransfer.getData('text/plain')
    if (!canDropItemOnTarget(draggedItemIdString, parentItem.id)) {
      setHierarchyDropIndicator(null)
      return
    }

    const draggedIds = draggedItemIdString.split(',')
    updateTerrain((current) => {
      let next = current
      for (const id of draggedIds) {
        const item = next.items.find(i => i.id === id)
        if (item && !item.locked) {
          next = relocateItem(next, id, parentItem.id, parentItem.layerId)
        }
      }
      return next
    })

    setSelectedItemIds(draggedIds)
    if (draggedIds.length === 1) setSelectedItemId(draggedIds[0])
    setHierarchyDragItemId(null)
    setHierarchyDropIndicator(null)
  }

  function handleDropBefore(event: ReactDragEvent, targetItem: TerrainItem) {
    event.preventDefault()
    event.stopPropagation()
    const draggedItemIdString = hierarchyDragItemId ?? event.dataTransfer.getData('text/plain')
    if (!canDropItemOnTarget(draggedItemIdString, targetItem.parentId)) {
      setHierarchyDropIndicator(null)
      return
    }

    const draggedIds = draggedItemIdString.split(',')
    updateTerrain((current) => {
      let next = current
      for (const id of draggedIds) {
        const item = next.items.find(i => i.id === id)
        if (item && !item.locked) {
          next = relocateItem(next, id, targetItem.parentId, targetItem.layerId, targetItem.id)
        }
      }
      return next
    })

    setSelectedItemIds(draggedIds)
    if (draggedIds.length === 1) setSelectedItemId(draggedIds[0])
    setHierarchyDragItemId(null)
    setHierarchyDropIndicator(null)
  }

  function handleDropToLayerRoot(event: ReactDragEvent, layer: TerrainLayer) {
    event.preventDefault()
    event.stopPropagation()
    const draggedItemIdString = hierarchyDragItemId ?? event.dataTransfer.getData('text/plain')
    if (!draggedItemIdString) {
      setHierarchyDropIndicator(null)
      return
    }

    const draggedIds = draggedItemIdString.split(',')
    updateTerrain((current) => {
      let next = current
      for (const id of draggedIds) {
        const item = next.items.find(i => i.id === id)
        if (item && !item.locked) {
          next = relocateItem(next, id, null, layer.id)
        }
      }
      return next
    })

    setSelectedLayerId(layer.id)
    setSelectedItemIds(draggedIds)
    if (draggedIds.length === 1) setSelectedItemId(draggedIds[0])
    setHierarchyDragItemId(null)
    setHierarchyDropIndicator(null)
  }

  function focusHierarchyItem(itemId: string) {
    const frame = editorStageFrameRef.current
    const item = terrainRef.current.items.find((entry) => entry.id === itemId)
    const resolved = resolvedEditorItems.get(itemId)
    if (!frame || !item || !resolved) {
      return
    }

    centerScrollablePoint(
      frame,
      (resolved.x + (item.width * resolved.scale) / 2) * editorZoomRef.current,
      (resolved.y + (item.height * resolved.scale) / 2) * editorZoomRef.current,
      terrainRef.current.width * editorZoomRef.current,
      terrainRef.current.height * editorZoomRef.current,
    )
  }

  function rotateSelectedItem(step: number) {
    if (!selectedItem) {
      return
    }

    updateItem(selectedItem.id, { rotation: normalizeAngle(selectedItem.rotation + step) })
  }

  function toggleSelectedItemMirror(axis: 'x' | 'y') {
    if (!selectedItem) {
      return
    }

    updateItem(selectedItem.id, axis === 'x' ? { flipX: !selectedItem.flipX } : { flipY: !selectedItem.flipY })
  }

  function updateTokenAssignment(tokenId: string, updater: (current: TokenAssignment | null) => TokenAssignment | null) {
    const currentAssignments = tokenAssignmentsRef.current || tokenAssignments
    let nextAssignments: Record<string, TokenAssignment> = { ...currentAssignments }

    const nextAssignment = updater(currentAssignments[tokenId] ?? null)
    if (!nextAssignment) {
      if (tokenId in currentAssignments) {
        delete nextAssignments[tokenId]
      }
    } else {
      const displacedPlayerId = currentAssignments[tokenId]?.playerId

      const previousTokenId = Object.entries(currentAssignments).find(
        ([currentTokenId, assignment]) => currentTokenId !== tokenId && nextAssignment.playerId !== '' && assignment.playerId === nextAssignment.playerId,
      )?.[0]
      if (previousTokenId) {
        nextAssignments[previousTokenId] = {
          ...nextAssignments[previousTokenId],
          playerId: displacedPlayerId || '',
        }
      }

      nextAssignments[tokenId] = nextAssignment
    }

    setTokenAssignments(nextAssignments)

    // Assure-toi que cela soit publié !
    updateTerrain((currentTerrain) => ({
      ...currentTerrain,
      tokenAssignments: nextAssignments
    }))

    setTerrainModifiedAt(Date.now())
  }

  function applyViewModeToAssignedTokens(mode: PlayerViewMode) {
    const currentAssignments = tokenAssignmentsRef.current || tokenAssignments
    const nextAssignments = Object.fromEntries(
      Object.entries(currentAssignments).map(([tokenId, assignment]) => [
        tokenId,
        {
          ...assignment,
          mode,
          fixedZoom: DEFAULT_LOCKED_TOKEN_ZOOM,
          lockedViewSize: assignment.lockedViewSize || DEFAULT_LOCKED_VIEW_SIZE,
          lockVisibleArea: assignment.lockVisibleArea === true,
          nightModeEnabled: assignment.nightModeEnabled === true,
          flashlightEnabled: assignment.flashlightEnabled === true,
          flashlightDistance: assignment.flashlightDistance || DEFAULT_FLASHLIGHT_DISTANCE,
          flashlightOpacity: clamp(assignment.flashlightOpacity || DEFAULT_FLASHLIGHT_OPACITY, 0, 1),
          flashlightAngle: clamp(assignment.flashlightAngle || FLASHLIGHT_CONE_ANGLE_DEGREES, 10, 180),
        },
      ]),
    )

    setTokenAssignments(nextAssignments)

    // Assure-toi que cela soit publié !
    updateTerrain((currentTerrain) => ({
      ...currentTerrain,
      tokenAssignments: nextAssignments
    }))

    setTerrainModifiedAt(Date.now())
  }

  function addPredeclaredPlayer() {
    setPredeclaredPlayers((current) => {
      const next = [
        ...current,
        {
          id: generateClientId(),
          name: `Joueur ${current.length + 1}`,
          color: terrainColorPalette[current.length % terrainColorPalette.length] ?? DEFAULT_PLAYER_COLOR,
          connectedPlayerId: null,
        },
      ];
      void savePreallocatedPlayersToWorkfolder(next, isPlayerPreallocationEnabled);
      return next;
    })
    setTerrainModifiedAt(Date.now())
  }

  function updatePredeclaredPlayer(playerId: string, updates: Partial<PredeclaredPlayer>) {
    setPredeclaredPlayers((current) => {
      const next = current.map((player) =>
        player.id === playerId
          ? {
            ...player,
            ...updates,
            name: String(updates.name ?? player.name).slice(0, 24),
            color: normalizePaletteColor(String(updates.color ?? (player.color || DEFAULT_PLAYER_COLOR))),
          }
          : player,
      );
      void savePreallocatedPlayersToWorkfolder(next, isPlayerPreallocationEnabled);
      return next;
    })

    setTerrainModifiedAt(Date.now())

    if (updates.name !== undefined) {
      const assignedTokenIds = Object.entries(tokenAssignments)
        .filter(([_, assignment]) => assignment.playerId === playerId)
        .map(([tokenId]) => tokenId)

      if (assignedTokenIds.length > 0) {
        updateTerrain((current) => ({
          ...current,
          items: current.items.map(item => {
            if (assignedTokenIds.includes(item.id)) {
              return { ...item, name: String(updates.name).slice(0, 24) }
            }
            return item
          })
        }))
      }
    }
  }

  function removePredeclaredPlayer(playerId: string) {
    setPredeclaredPlayers((current) => {
      const next = current.filter((player) => player.id !== playerId);
      void savePreallocatedPlayersToWorkfolder(next, isPlayerPreallocationEnabled);
      return next;
    })
    setTerrainModifiedAt(Date.now())
  }

  const handleStageContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    if (viewMode !== 'editor') return

    const point = getMapPoint(editorStageRef.current!, terrain.width, terrain.height, event.clientX, event.clientY)

    const intersectingItems = renderedEditorItems.filter(item => {
      if (item.kind === 'audio' || item.kind === 'light') return false
      const resolved = resolvedEditorItems.get(item.id) ?? DEFAULT_TRANSFORM
      const w = item.width * resolved.scale
      const h = item.height * resolved.scale
      const cx = resolved.x + w / 2
      const cy = resolved.y + h / 2
      const rad = (resolved.rotation * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      const corners = [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 },
      ].map(p => ({
        x: cx + p.x * cos - p.y * sin,
        y: cy + p.x * sin + p.y * cos
      }))

      return pointInPolygon(point, corners)
    }).reverse()

    if (intersectingItems.length > 0) {
      setContextMenuState({
        x: event.clientX,
        y: event.clientY,
        items: intersectingItems,
      })
    } else {
      setContextMenuState(null)
    }
  }

  const loadYouTubeUrl = async (url: string) => {
    if (!url) return
    updateTerrain((current) => {
      const history = current.youtubeHistory || []
      const newHistory = [url, ...history.filter(u => u !== url)].slice(0, 10)
      return {
        ...current,
        audio: { name: 'YouTube Audio', src: url },
        youtubeHistory: newHistory
      }
    })
    setIsAudioLoadDialogOpen(false)
    // Reset shared audio state so the sync effect doesn't try to use
    // the previous (now stale) player/currentTime before the new YouTube
    // component fires onReady.
    ytPlayerRef.current = null
    setSharedAudioState({
      isPlaying: false,
      isLooping: false,
      currentTime: 0,
      updatedAt: Date.now(),
    })

    // Fetch the title if we don't have it
    const currentTitles = terrain.youtubeTitles || {}
    if (!currentTitles[url]) {
      try {
        const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)
        const data = await response.json()
        if (data && data.title) {
          updateYoutubeTitle(url, data.title)
        } else {
          updateYoutubeTitle(url, 'UNKNOWN')
        }
      } catch (e) {
        updateYoutubeTitle(url, 'UNKNOWN')
      }
    }
  }

  const removeFromYoutubeHistory = (url: string) => {
    updateTerrain((current) => {
      const history = current.youtubeHistory || []
      return { ...current, youtubeHistory: history.filter(u => u !== url) }
    })
  }

  const handlePreviewSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = clamp(soundboardVolume, 0, 1)
    audio.play().catch(e => {
      console.warn('Failed to preview audio', e)
      if (e.name === 'NotSupportedError') {
        setStatusMessage('Format audio non supporté par le navigateur (incompatible).')
      } else {
        setStatusMessage('Impossible de lire ce son.')
      }
    })
  }

  const toggleYoutubeBookmark = (url: string) => {
    updateTerrain((current) => {
      const bookmarks = current.youtubeBookmarks || []
      const newBookmarks = bookmarks.includes(url) ? bookmarks.filter(u => u !== url) : [...bookmarks, url]
      return { ...current, youtubeBookmarks: newBookmarks }
    })
  }

  const updateYoutubeTitle = (url: string, title: string) => {
    updateTerrain((current) => {
      const titles = current.youtubeTitles || {}
      return {
        ...current,
        youtubeTitles: { ...titles, [url]: title }
      }
    })
  }

  return (
    <div className="shell">
      <FlashlightSystem
        currentPlayerIdentityId={currentPlayerIdentityId}
        roomPlayersRef={roomPlayersRef}
        playerTerrainRef={playerTerrainRef}
        terrainRef={terrainRef}
        playerPhoneStatesRef={playerPhoneStatesRef}
        resolvedPlayerItemsRef={resolvedPlayerItemsRef}
        resolvedEditorItemsRef={resolvedEditorItemsRef}
        remoteCursorPositionsRef={remoteCursorPositionsRef}
        lastPlayerPointerRef={lastPlayerPointerRef}
        lastEditorPointerRef={lastEditorPointerRef}
        playerStageRef={playerStageRef}
        editorStageRef={editorStageRef}
        flashlightPathsRef={flashlightPathsRef}
      />
      {isMassReparentingMode && <MassReparentingBanner />}
      <AudioErrorBoundary moduleName="Musique Globale">
        <SharedAudioPlayer
          isYouTubeAudio={isYouTubeAudio}
          activeAudioTrack={activeAudioTrack}
          ytPlayerOpts={ytPlayerOpts}
          audioVolume={audioVolume}
          audioElementRef={audioElementRef}
          ytPlayerRef={ytPlayerRef}
          onYouTubeError={(e) => {
            console.error('Erreur de lecteur YouTube:', e)
            setStatusMessage('Erreur avec la vidéo YouTube (Lien invalide ou bloqué par le navigateur).')
          }}
          onYouTubeReady={() => { }}
          onYouTubeStateChange={(event) => {
            if (event.data === 0) {
              handleSharedAudioEnded()
            }
          }}
          onLoadedMetadata={() => { }}
          onEnded={handleSharedAudioEnded}
          setAudioDuration={setAudioDuration}
        />
      </AudioErrorBoundary>
      <section
        className={
          (viewMode === 'editor' && isToolbarExpanded) || isDiceToolbarOpen
            ? 'toolbar card surface-base toolbar-expanded'
            : 'toolbar card surface-base'
        }
      >
        <div className="toolbar-strip toolbar-strip-main">
          <ToolbarBrand onOpenSettings={() => setIsSettingsDialogOpen(true)} />
          {viewMode === 'editor' ? (
            <ToolbarProjetGroup
              projectName={terrain.name}
              hasWorkfolder={Boolean(workfolderHandle)}
              isAutoSaving={isAutoSaving}
              hasAutoSaveTarget={hasAutoSaveTarget}
              isAutoSaveOnModifyEnabled={isAutoSaveOnModifyEnabled}
              lastSaveLabel={lastTerrainSaveLabel}
              saveStatusLabel={terrainSaveStatusLabel}
              saveSubLabel={saveSubLabel}
              onOpenImport={() => setIsImportDialogOpen(true)}
              onSaveTerrain={() => void saveTerrainToFile()}
              onToggleAutoSave={() => setIsAutoSaveOnModifyEnabled((current) => !current)}
              onOpenSceneReview={() => setIsSceneReviewDialogOpen(true)}
              onOpenTerrainEdit={() => setIsTerrainDialogOpen(true)}
            />
          ) : null}

          {viewMode === 'editor' ? (
            <ToolbarAssetsGroup
              onOpenLibrary={() => setIsLibraryDialogOpen(true)}
              onOpenDefaultLibrary={() => setIsDefaultLibraryDialogOpen(true)}
              onPickAsset={(mode) => setAssetPickerContext({ mode })}
              onClickMapAudioInput={() => mapAudioInputRef.current?.click()}
              onCreateShadowZone={() => createShadowZone()}
              onCreateNoteItem={() => createNoteItem()}
            />
          ) : null}

          {viewMode === 'editor' ? (
            <div className="toolbar-group toolbar-toggle-tools-group">
              <span className="toolbar-group-label">Navbar</span>
              <button
                type="button"
                className={isToolbarExpanded ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                title={isToolbarExpanded ? 'Masquer les tools' : 'Afficher les tools'}
                aria-label={isToolbarExpanded ? 'Masquer les tools' : 'Afficher les tools'}
                onClick={() => setIsToolbarExpanded((current) => !current)}
              >
                {isToolbarExpanded ? (
                  <ChevronUp className="button-icon" strokeWidth={2.2} />
                ) : (
                  <ChevronDown className="button-icon" strokeWidth={2.2} />
                )}
              </button>
            </div>
          ) : null}

          {viewMode !== 'editor' ? (
            <ToolbarAudioGroup
              isPlaying={sharedAudioState.isPlaying}
              playbackStatus={audioPlaybackStatus}
              activeTrack={activeAudioTrack}
              audioVolume={audioVolume}
              soundboardVolume={soundboardVolume}
              onAudioVolumeChange={setAudioVolume}
              onSoundboardVolumeChange={setSoundboardVolume}
            />
          ) : null}

          {assetPreloadProgress ? (
            <ToolbarDownloadGroup
              loaded={assetPreloadProgress.loaded}
              total={assetPreloadProgress.total}
              sizeBytes={assetPreloadProgress.sizeBytes}
            />
          ) : null}

          {viewMode === 'editor' ? (
            <div className="toolbar-group toolbar-telephone-group">
              <span className="toolbar-group-label">Téléphone</span>
              <button
                type="button"
                className="secondary text-button compact"
                style={{ height: '32px' }}
                onClick={() => setIsVirtualContactsDialogOpen(true)}
              >
                Gérer contacts (PNJ)
              </button>
            </div>
          ) : null}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => void importItems(event, 'image')}
          />
          <input
            ref={tokenInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => void importItems(event, 'token')}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
            onChange={(event) => void importAudioTrack(event)}
          />
          <input
            ref={soundboardAudioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
            multiple
            onChange={(event) => void importSoundboardTracks(event)}
          />
          <input
            ref={mapAudioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
            multiple
            onChange={(event) => void importItems(event, 'audio')}
          />
          <input
            ref={terrainLoadInputRef}
            type="file"
            accept=".json,.terrain.json"
            onChange={(event) => void loadTerrainFromFile(event, 'editor')}
          />


          {roleRef.current === 'player' && currentPlayerCharacterAssignment ? (
            <div className="toolbar-group">
              <span className="toolbar-group-label">Personnage</span>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsPlayerCharacterSheetOpen(true)}
              >
                <User className="button-icon" strokeWidth={2.2} /> Fiche Personnage
              </button>
            </div>
          ) : null}
          <div className="toolbar-group toolbar-group-right">
            {viewMode === 'editor' ? (
              <>
                <div className="toolbar-group toolbar-subgroup toolbar-presence-group">
                  <span className="toolbar-group-label">Host</span>
                  {serverMemory && (
                    <span
                      className="toolbar-memory-info"
                      title={`RSS: ${(serverMemory.rss / 1024 / 1024).toFixed(1)} Mo | Heap Used: ${(serverMemory.heapUsed / 1024 / 1024).toFixed(1)} Mo | Heap Total: ${(serverMemory.heapTotal / 1024 / 1024).toFixed(1)} Mo`}
                      style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', marginRight: '8px', display: 'flex', alignItems: 'center' }}
                    >
                      {(serverMemory.rss / 1024 / 1024).toFixed(0)} Mo
                    </span>
                  )}
                  {isPlayerPreallocationEnabled ? (
                    <span
                      className="host-preallocation-indicator"
                      title="Pre allocation des joueurs active"
                      aria-label="Pre allocation des joueurs active"
                    >
                      <CircleDot className="button-icon" strokeWidth={2.2} />
                    </span>
                  ) : null}
                  <div className="toolbar-presence-anchor">
                    <span
                      className="toolbar-presence-count"
                      tabIndex={0}
                      onPointerEnter={(event) => showPresencePopup(event.currentTarget)}
                      onPointerLeave={hidePresencePopupSoon}
                      onFocus={(event) => showPresencePopup(event.currentTarget)}
                      onBlur={hidePresencePopupSoon}
                    >
                      {connectedPeopleCount}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="compact-icon-button"
                    title="Ouvrir le mode host"
                    aria-label="Ouvrir le mode host"
                    onClick={() => setIsHostDialogOpen(true)}
                  >
                    <Server className="button-icon" strokeWidth={2.2} />
                  </button>
                </div>
              </>
            ) : (
              <div className="toolbar-group toolbar-subgroup toolbar-presence-group">
                <span className="toolbar-group-label">Client</span>
                <div className="toolbar-presence-anchor">
                  <span
                    className="toolbar-presence-count"
                    tabIndex={0}
                    onPointerEnter={(event) => showPresencePopup(event.currentTarget)}
                    onPointerLeave={hidePresencePopupSoon}
                    onFocus={(event) => showPresencePopup(event.currentTarget)}
                    onBlur={hidePresencePopupSoon}
                  >
                    {connectedPeopleCount}
                  </span>
                </div>
                <button
                  type="button"
                  className="compact-icon-button"
                  title="Ouvrir la connexion joueur"
                  aria-label="Ouvrir la connexion joueur"
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  <Monitor className="button-icon" strokeWidth={2.2} />
                </button>
              </div>
            )}
            {viewMode === 'player' ? (
              <>
                {hostPreviewPolicy ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setHostPreviewPolicy(null)
                      setViewMode('editor')
                    }}
                  >
                    <span className="button-content">
                      <X className="button-icon" strokeWidth={2.2} />
                      <span>Quitter preview</span>
                    </span>
                  </button>
                ) : null}

              </>
            ) : null}
            <div className="segmented compact-segmented toolbar-mode-switch" aria-label="Mode d affichage">
              <button
                type="button"
                className={viewMode === 'editor' ? 'active' : ''}
                onClick={() => {
                  setHostPreviewPolicy(null)
                  setViewMode('editor')
                }}
              >
                <span className="button-content">
                  <Pencil className="button-icon" strokeWidth={2.2} />
                  <span>MJ</span>
                </span>
              </button>
              <button
                type="button"
                className={viewMode === 'player' ? 'active' : ''}
                onClick={() => setViewMode('player')}
              >
                <span className="button-content">
                  <Monitor className="button-icon" strokeWidth={2.2} />
                  <span>Joueur</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              className={isDiceToolbarOpen ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
              title={isDiceToolbarOpen ? 'Masquer la barre des des' : 'Afficher la barre des des'}
              aria-label={isDiceToolbarOpen ? 'Masquer la barre des des' : 'Afficher la barre des des'}
              onClick={() => setIsDiceToolbarOpen((current) => !current)}
            >
              {isDiceToolbarOpen ? (
                <EyeOff className="button-icon" strokeWidth={2.2} />
              ) : (
                <Dices className="button-icon" strokeWidth={2.2} />
              )}
            </button>
            {viewMode === 'editor' ? (
              <>
                <button
                  type="button"
                  className={isTimerDialogOpen ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                  title="Creer un timer partage"
                  aria-label="Creer un timer partage"
                  onClick={() => setIsTimerDialogOpen(true)}
                >
                  <TimerIcon className="button-icon" strokeWidth={2.2} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="ghost compact-icon-button"
              title="Afficher les raccourcis"
              aria-label="Afficher les raccourcis"
              onClick={() => setIsShortcutsDialogOpen(true)}
            >
              <Info className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        {(viewMode === 'editor' && isToolbarExpanded) || isDiceToolbarOpen ? (
          <div className="toolbar-strip toolbar-strip-secondary">
            {viewMode === 'editor' && isToolbarExpanded ? (
              <>
                <ToolbarToolsGroup
                  isGridSnapEnabled={isGridSnapEnabled}
                  isHostNightModePreview={isHostNightModePreview}
                  bulkAssignedViewMode={bulkAssignedViewMode}
                  gridSize={terrain.gridSize}
                  onToggleGridSnap={() => setIsGridSnapEnabled((current) => !current)}
                  onChangeGridSize={(value) => updateTerrain((current) => ({ ...current, gridSize: value }))}
                  onToggleNightModePreview={() => setIsHostNightModePreview((current) => !current)}
                  onChangeBulkViewMode={setBulkAssignedViewMode}
                  onApplyBulkViewMode={() => applyViewModeToAssignedTokens(bulkAssignedViewMode)}
                />
                <div className="toolbar-group toolbar-audio-group">
                  <span className="toolbar-group-label">Audio</span>
                  <button
                    type="button"
                    className={isSoundboardPanelVisible ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                    title={isSoundboardPanelVisible ? 'Masquer la Soundboard' : 'Afficher la Soundboard'}
                    aria-label={isSoundboardPanelVisible ? 'Masquer la Soundboard' : 'Afficher la Soundboard'}
                    onClick={() => setIsSoundboardPanelVisible((current) => !current)}
                  >
                    <Mic className="button-icon" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="icon-button compact-icon-button"
                    title="Charger une musique"
                    aria-label="Charger une musique"
                    disabled={!canControlAudio}
                    onClick={() => setIsAudioLoadDialogOpen(true)}
                  >
                    <Music className="button-icon" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className={sharedAudioState.isPlaying ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                    title={sharedAudioState.isPlaying ? 'Mettre en pause la musique' : 'Lire la musique'}
                    aria-label={sharedAudioState.isPlaying ? 'Mettre en pause la musique' : 'Lire la musique'}
                    disabled={!canControlAudio || !activeAudioTrack}
                    onClick={toggleSharedAudioPlayback}
                  >
                    {sharedAudioState.isPlaying ? (
                      <Pause className="button-icon" strokeWidth={2.2} />
                    ) : (
                      <Play className="button-icon" strokeWidth={2.2} />
                    )}
                  </button>
                  <button
                    type="button"
                    className={sharedAudioState.isLooping ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                    title={sharedAudioState.isLooping ? 'Desactiver la boucle' : 'Activer la boucle'}
                    aria-label={sharedAudioState.isLooping ? 'Desactiver la boucle' : 'Activer la boucle'}
                    disabled={!canControlAudio || !activeAudioTrack}
                    onClick={toggleSharedAudioLoop}
                  >
                    <Repeat className="button-icon" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="ghost compact-icon-button"
                    title="Retirer la musique"
                    aria-label="Retirer la musique"
                    disabled={!canControlAudio || !activeAudioTrack}
                    onClick={clearAudioTrack}
                  >
                    <X className="button-icon" strokeWidth={2.2} />
                  </button>
                  <span className="audio-track-name">{activeAudioTrack?.name ?? 'Aucune piste'}</span>
                  {canControlAudio && activeAudioTrack ? (
                    <input
                      type="range"
                      min="0"
                      max={audioDuration || 100}
                      step="1"
                      value={sharedAudioState.currentTime}
                      onChange={(e) => {
                        const time = Number(e.target.value)
                        setSharedAudioState(s => ({ ...s, currentTime: time, updatedAt: Date.now() }))
                        if (isYouTubeAudio) {
                          ytPlayerRef.current?.seekTo(time, true)
                        } else if (audioElementRef.current) {
                          audioElementRef.current.currentTime = time
                        }
                      }}
                      style={{ width: '100px', marginLeft: '8px' }}
                      title="Position de lecture"
                    />
                  ) : null}
                  <label className="audio-volume-control" style={{ marginLeft: '8px' }}>
                    <span className="audio-volume-label">Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(audioVolume * 100)}
                      style={{ '--range-value': `${Math.round(audioVolume * 100)}%` } as CSSProperties}
                      onChange={(event) => setAudioVolume(Number(event.target.value) / 100)}
                    />
                  </label>
                  <div style={{ width: '1px', height: '16px', background: 'var(--md-sys-color-outline-variant)', margin: '0 8px' }} />
                  <label className="audio-volume-control">
                    <span className="audio-volume-label">SFX</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(soundboardVolume * 100)}
                      style={{ '--range-value': `${Math.round(soundboardVolume * 100)}%` } as CSSProperties}
                      onChange={(event) => setSoundboardVolume(Number(event.target.value) / 100)}
                    />
                  </label>
                </div>
                <ToolbarFicheGroup
                  files={workfolderTerrains}
                  workfolderHandle={workfolderHandle}
                  onOpenImport={() => setIsImportDialogOpen(true)}
                  onOpenFile={(fileName) => void openWorkfolderFile(fileName)}
                />
              </>
            ) : null}
            {isDiceToolbarOpen ? (
              <DiceToolbar
                isSecretDiceRoll={isSecretDiceRoll}
                selectedDiceCount={selectedDiceCount}
                selectedDiceSides={selectedDiceSides}
                customDiceFormula={customDiceFormula}
                diceRollReason={diceRollReason}
                diceTarget={diceTarget}
                onDiceRollReasonChange={setDiceRollReason}
                onDiceTargetChange={setDiceTarget}
                onSecretDiceRollChange={setIsSecretDiceRoll}
                onSelectDicePreset={selectDicePreset}
                onCustomDiceFormulaChange={handleCustomDiceFormulaChange}
                onCustomDiceFormulaBlur={() => {
                  void applyDiceFormula(customDiceFormula, { commitText: true })
                }}
                onOpenDiceHistory={() => setIsDiceHistoryOpen(true)}
                onRequestDiceRoll={requestDiceRoll}
                playerCharacterData={currentPlayerCharacterAssignment?.characterData ?? null}
                gmCharacters={gmCharacterDiceEntries}
                onRollCharacteristic={handleRollCharacteristic}
                characteristicConfig={characteristicConfig}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      <StatusNotifications
        notifications={statusNotifications}
        onDismiss={dismissStatusNotification}
      />

      <NoteTooltip
        htmlMJ={hoveredNoteContent?.htmlMJ ?? null}
        htmlPlayers={hoveredNoteContent?.htmlPlayers ?? null}
        item={hoveredNoteItem}
      />

      {viewMode === 'editor' ? (
        <div
          style={{ '--hierarchy-panel-width': `${leftPanelWidth}px`, '--inspector-panel-width': `${rightPanelWidth}px` } as CSSProperties}
          className={[
            'workspace',
            isLeftPanelCollapsed ? 'left-collapsed' : '',
            isRightPanelCollapsed ? 'right-collapsed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <aside className={isLeftPanelCollapsed ? 'panel panel-collapsed left-panel' : 'panel left-panel'}>
            {isLeftPanelCollapsed ? (
              <div className="panel-rail card surface-base">
                <button
                  type="button"
                  className="icon-button compact-icon-button"
                  title="Afficher la hierarchie"
                  aria-label="Afficher la hierarchie"
                  onClick={() => setIsLeftPanelCollapsed(false)}
                >
                  <ChevronRight className="button-icon" strokeWidth={2.2} />
                </button>
                <span className="rail-label">Hierarchie</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={leftPanelResizeState ? 'hierarchy-resize-handle active' : 'hierarchy-resize-handle'}
                  aria-label="Redimensionner la hierarchie"
                  title="Redimensionner la hierarchie"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    setLeftPanelResizeState({
                      startX: event.clientX,
                      startWidth: leftPanelWidth,
                    })
                  }}
                />
                <section className="card surface-base scroll-panel fill-panel">
                  <HierarchyToolbar
                    searchQuery={hierarchySearchQuery}
                    onSearchChange={setHierarchySearchQuery}
                    onAddLayer={addLayer}
                    onCollapse={() => setIsLeftPanelCollapsed(true)}
                  />
                  <div className="tree-list">
                    {terrain.layers.map((layer) => {
                      const nodes = buildHierarchyNodes(terrain.items, layer.id, null, hierarchySearchQuery)

                      return (
                        <div
                          key={layer.id}
                          className={layer.id === activeLayerId ? 'tree-group active' : 'tree-group'}
                        >
                          <div className="tree-header" onClick={() => setSelectedLayerId(layer.id)}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="tree-item-expand-toggle"
                                title={collapsedLayerIds.includes(layer.id) ? 'Déplier' : 'Replier'}
                                onClick={() => setCollapsedLayerIds(prev => prev.includes(layer.id) ? prev.filter(id => id !== layer.id) : [...prev, layer.id])}
                                style={{ marginRight: 4 }}
                              >
                                {collapsedLayerIds.includes(layer.id) ? <ChevronRight className="button-icon" strokeWidth={2.2} /> : <ChevronDown className="button-icon" strokeWidth={2.2} />}
                              </button>
                              {renamingLayerId === layer.id ? (
                                <input
                                  ref={layerRenameInputRef}
                                  className="tree-layer-rename-input"
                                  value={layerRenameDraft}
                                  autoFocus
                                  onChange={(event) => setLayerRenameDraft(event.target.value)}
                                  onBlur={() => commitLayerRename(layer.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      commitLayerRename(layer.id)
                                      return
                                    }

                                    if (event.key === 'Escape') {
                                      event.preventDefault()
                                      setRenamingLayerId(null)
                                    }
                                  }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="ghost tree-layer-name-button"
                                  onClick={() => setSelectedLayerId(layer.id)}
                                  onDoubleClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setSelectedLayerId(layer.id)
                                    setRenamingLayerId(layer.id)
                                    setLayerRenameDraft(layer.name)
                                    requestAnimationFrame(() => layerRenameInputRef.current?.select())
                                  }}
                                >
                                  {layer.name}
                                </button>
                              )}
                            </div>
                            <div className="mini-actions tree-layer-actions">
                              <button
                                type="button"
                                className="ghost compact-icon-button"
                                title="Ajouter un groupe"
                                aria-label="Ajouter un groupe"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  const newGroupId = generateClientId()
                                  updateTerrain((current) => ({
                                    ...current,
                                    items: [
                                      ...current.items,
                                      {
                                        id: newGroupId,
                                        layerId: layer.id,
                                        parentId: null,
                                        locked: false,
                                        name: 'Groupe',
                                        note: '',
                                        notePlayers: '',
                                        noteVisibleToPlayers: false,
                                        tokenPanelEnabled: false,
                                        tokenPanelText: '',
                                        kind: 'empty',
                                        src: '',
                                        x: 0,
                                        y: 0,
                                        width: 0,
                                        height: 0,
                                        scale: 1,
                                        flipX: false,
                                        flipY: false,
                                        rotation: 0,
                                        outlineEnabled: false,
                                        outlineWidth: 0,
                                        outlineColor: '#ffffff',
                                        grayscaleEnabled: false,
                                        rippleEnabled: false,
                                        opacity: 1,
                                        visible: true,
                                      }
                                    ]
                                  }), { syncItemId: newGroupId })
                                  setSelectedItemId(newGroupId)
                                }}
                              >
                                <Plus className="button-icon" strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                className="ghost compact-icon-button"
                                title={layer.visible ? 'Masquer le calque' : 'Afficher le calque'}
                                aria-label={layer.visible ? 'Masquer le calque' : 'Afficher le calque'}
                                onClick={() =>
                                  updateTerrain((current) => ({
                                    ...current,
                                    layers: current.layers.map((entry) =>
                                      entry.id === layer.id ? { ...entry, visible: !entry.visible } : entry,
                                    ),
                                  }))
                                }
                              >
                                {layer.visible ? (
                                  <Eye className="button-icon" strokeWidth={2.2} />
                                ) : (
                                  <EyeOff className="button-icon" strokeWidth={2.2} />
                                )}
                              </button>
                              <button
                                type="button"
                                className="ghost compact-icon-button"
                                title="Monter le calque"
                                aria-label="Monter le calque"
                                onClick={() => moveLayer(layer.id, -1)}
                              >
                                <ChevronUp className="button-icon" strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                className="ghost compact-icon-button"
                                title="Descendre le calque"
                                aria-label="Descendre le calque"
                                onClick={() => moveLayer(layer.id, 1)}
                              >
                                <ChevronDown className="button-icon" strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                className="ghost danger compact-icon-button"
                                title="Supprimer le calque"
                                aria-label="Supprimer le calque"
                                onClick={() => deleteLayer(layer.id)}
                              >
                                <Trash2 className="button-icon" strokeWidth={2.2} />
                              </button>
                            </div>
                          </div>

                          {collapsedLayerIds.includes(layer.id) ? null : (
                            <div
                              className={
                                hierarchyDropIndicator?.mode === 'layer-root' && hierarchyDropIndicator.layerId === layer.id
                                  ? 'tree-items drop-root'
                                  : 'tree-items'
                              }
                              onDragOver={(event) => handleLayerRootDragOver(event, layer)}
                              onDrop={(event) => handleDropToLayerRoot(event, layer)}
                            >
                              <HierarchyItemList
                                nodes={nodes}
                                selectedItemIds={selectedItemIds}
                                dropIndicator={hierarchyDropIndicator}
                                onContextMenu={(event, itemId) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setHierarchyContextMenuState({ x: event.clientX, y: event.clientY, itemId })
                                }}
                                onSelect={(itemId, isCtrl, isShift) => {
                                  if (isMassReparentingMode) {
                                    handleMassReparent(itemId)
                                    return
                                  }

                                  setSelectedLayerId(layer.id)

                                  if (isShift && lastSelectedHierarchyItemId) {
                                    const allFlatIds = terrain.layers.flatMap(l => {
                                      if (collapsedLayerIds.includes(l.id)) return []
                                      return flattenHierarchyNodes(buildHierarchyNodes(terrain.items, l.id, null, hierarchySearchQuery))
                                    })

                                    const startIndex = allFlatIds.indexOf(lastSelectedHierarchyItemId)
                                    const endIndex = allFlatIds.indexOf(itemId)

                                    if (startIndex !== -1 && endIndex !== -1) {
                                      const min = Math.min(startIndex, endIndex)
                                      const max = Math.max(startIndex, endIndex)
                                      const rangeIds = allFlatIds.slice(min, max + 1)
                                      setSelectedItemIds(rangeIds)
                                      return
                                    }
                                  }

                                  if (isCtrl) {
                                    toggleItemSelection(itemId)
                                    setLastSelectedHierarchyItemId(itemId)
                                    return
                                  }

                                  selectSingleItem(itemId)
                                  setLastSelectedHierarchyItemId(itemId)
                                }}
                                onFocusItem={focusHierarchyItem}
                                onRename={(itemId, name) => updateItem(itemId, { name })}
                                onToggleVisibility={(itemId) => {
                                  const item = terrain.items.find((entry) => entry.id === itemId)
                                  if (!item) {
                                    return
                                  }
                                  updateItem(itemId, { visible: !item.visible })
                                }}
                                onToggleLock={toggleItemLock}
                                onDelete={deleteItem}
                                onDragStart={handleTreeDragStart}
                                onDragEnd={handleTreeDragEnd}
                                onDragOverItem={handleDragOverItem}
                                onDropBefore={handleDropBefore}
                                onDropAsChild={handleDropAsChild}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}
          </aside>

          <main className="stage-column" style={{ position: 'relative' }}>
            <MapStatusBar stageRef={editorStageRef} terrainWidth={terrain.width} terrainHeight={terrain.height} zoom={editorZoom} />
            <div
              ref={editorStageFrameRef}
              className={panState ? 'stage-frame is-panning' : 'stage-frame'}
              onScroll={(e) => {
                editorScrollRef.current = { x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop };
                scheduleLastConfigSave();
              }}
            >
              <div
                className="stage-scaler"
                style={{
                  width: `${terrain.width * editorZoom}px`,
                  height: `${terrain.height * editorZoom}px`,
                }}
              >
                <div
                  ref={editorStageRef}
                  className={isDragOverStage ? 'terrain-stage editor-stage is-drag-over' : 'terrain-stage editor-stage'}
                  style={buildStageStyle(terrain, editorZoom)}
                  onContextMenu={handleStageContextMenu}
                  onPointerDown={(event) => {
                    if (event.ctrlKey) {
                      event.preventDefault()
                      startStagePan(event.clientX, event.clientY)
                      return
                    }

                    if (pendingSoundboardPlacement) {
                      const point = getMapPoint(editorStageRef.current!, terrain.width, terrain.height, event.clientX, event.clientY)
                      const soundId = generateClientId()
                      applyTerrain({
                        ...terrainRef.current,
                        items: [
                          ...terrainRef.current.items,
                          {
                            id: soundId,
                            layerId: terrainRef.current.layers[0].id,
                            parentId: activeParentId,
                            name: terrainRef.current.soundboard?.find(s => s.id === pendingSoundboardPlacement.id)?.name || 'Son',
                            kind: 'audio',
                            src: pendingSoundboardPlacement.src,
                            visible: true,
                            x: point.x,
                            y: point.y,
                            width: 96,
                            height: 96,
                            scale: 1,
                            opacity: 1,
                            outlineEnabled: false,
                            outlineWidth: 0,
                            outlineColor: '#000000',
                            locked: false,
                            note: '',
                            notePlayers: '',
                            noteVisibleToPlayers: false,
                            tokenPanelEnabled: false,
                            tokenPanelText: '',
                            flipX: false,
                            flipY: false,
                            rotation: 0,
                            grayscaleEnabled: false,
                            rippleEnabled: false,
                            audioSpatialized: true,
                            audio3D: false,
                            audioRange: pendingSoundboardPlacement.defaultRange,
                            audioLoop: false,
                            audioAutoDestroy: true,
                            audioPlaying: true
                          }
                        ]
                      })
                      setPendingSoundboardPlacement(null)
                      return
                    }

                    setHoveredEditorItemId(null)
                    clearSelectedItems()
                  }}
                  onPointerMove={(event) => {
                    lastEditorPointerRef.current = { x: event.clientX, y: event.clientY }
                    if (measureStartPointRef.current) {
                      const point = getMapPoint(editorStageRef.current!, terrain.width, terrain.height, event.clientX, event.clientY)
                      setMeasureDraft({
                        start: measureStartPointRef.current,
                        end: point,
                      })
                      if (measureDraftIdRef.current) {
                        sendMeasureUpdate(measureStartPointRef.current, point, { id: measureDraftIdRef.current })
                      }
                    }
                    sendSessionCursor(event.clientX, event.clientY)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    event.dataTransfer.dropEffect = 'copy'
                    setIsDragOverStage(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsDragOverStage(false)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsDragOverStage(false)

                    const stage = editorStageRef.current
                    if (!stage) return

                    const point = getMapPoint(stage, terrain.width, terrain.height, event.clientX, event.clientY)
                    const files = Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('audio/'))

                    if (files.length > 0) {
                      dropImagesOnEditor(files, point, isGridSnapEnabled && !event.ctrlKey)
                    }
                  }}
                >
                  {renderedEditorItems
                    .filter((item) => !(item.kind === 'light' && item.lightSourceHidden))
                    .map((item) => {
                      const resolved = resolvedEditorItems.get(item.id) ?? DEFAULT_TRANSFORM
                      return (
                        <div key={item.id} data-item-id={item.id}>
                          <StageItemSprite
                            item={item}
                            resolved={resolved}
                            outline={
                              selectedItemIds.includes(item.id)
                                ? '3px solid var(--md-sys-color-primary)'
                                : selectedItemChildPreviewIds.has(item.id)
                                  ? '2px solid #1db954'
                                  : 'none'
                            }
                            onPointerDown={(event) => {
                              if (event.ctrlKey) {
                                event.preventDefault()
                                event.stopPropagation()
                                startStagePan(event.clientX, event.clientY)
                                return
                              }

                              if (event.shiftKey) {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleItemSelection(item.id)
                                return
                              }

                              event.stopPropagation()
                              startItemDrag(item, event.clientX, event.clientY)
                            }}
                            onPointerEnter={(event) => {
                              setHoveredEditorItemId(item.id)
                              showNoteTooltip(item, event.clientX, event.clientY)
                            }}
                            onPointerMove={(event) => {
                              setHoveredEditorItemId(item.id)
                              // ⚠️ Performance : onPointerMove fire 100+ fois/sec.
                              // On ne recalcule PAS le HTML ici (coûteux : DOMParser),
                              // on met juste à jour la position via DOM direct
                              // (cf. `scheduleHoveredNotePosUpdate`).
                              scheduleHoveredNotePosUpdate(event.clientX, event.clientY)
                            }}
                            onPointerLeave={() => {
                              setHoveredEditorItemId((current) => (current === item.id ? null : current))
                              hideNoteTooltip()
                            }}
                          />
                          {renderTokenPanel(item, resolved)}
                        </div>
                      )
                    })}
                  {renderedEditorItems
                    .filter((item) => item.kind === 'shadow' && item.shadowPoints)
                    .map((shadowItem) => {
                      const resolved = resolvedEditorItems.get(shadowItem.id) ?? DEFAULT_TRANSFORM
                      const points = shadowItem.shadowPoints ?? []
                      const isSelected = selectedItemIds.includes(shadowItem.id)

                      if (points.length < 3) return null

                      const polygonPoints = points.map((p) => `${resolved.x + p.x * resolved.scale},${resolved.y + p.y * resolved.scale}`).join(' ')

                      return (
                        <svg
                          key={`shadow-svg-${shadowItem.id}`}
                          className="shadow-zone-svg"
                          viewBox={`0 0 ${terrain.width} ${terrain.height}`}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 15,
                          }}
                          aria-hidden="true"
                        >
                          <defs>
                            <pattern id={`hatch-${shadowItem.id}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                              <rect width="8" height="8" fill="rgba(0, 0, 0, 0.8)" />
                              <line x1="-2" y1="-2" x2="6" y2="6" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                              <line x1="2" y1="-6" x2="10" y2="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                            </pattern>
                          </defs>
                          <g
                            className={isSelected ? 'shadow-zone is-selected' : 'shadow-zone'}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedItemId(shadowItem.id)
                            }}
                            onPointerDown={(event) => {
                              if (event.shiftKey) {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleItemSelection(shadowItem.id)
                                return
                              }

                              event.stopPropagation()
                              startItemDrag(shadowItem, event.clientX, event.clientY)
                            }}
                            onPointerEnter={() => setHoveredEditorItemId(shadowItem.id)}
                            onPointerLeave={() => setHoveredEditorItemId((current) => (current === shadowItem.id ? null : current))}
                          >
                            <polygon points={polygonPoints} fill={`url(#hatch-${shadowItem.id})`} opacity="0.5" style={{ pointerEvents: 'all' }} />
                            <polyline points={polygonPoints} className="shadow-zone-outline" />
                            {isSelected
                              ? points.map((point, index) => {
                                const edgeStart = points[index]
                                const edgeEnd = points[(index + 1) % points.length]
                                const midX = (edgeStart.x + edgeEnd.x) / 2
                                const midY = (edgeStart.y + edgeEnd.y) / 2
                                const worldMidX = resolved.x + midX * resolved.scale
                                const worldMidY = resolved.y + midY * resolved.scale

                                return (
                                  <g key={`point-group-${index}`}>
                                    <circle
                                      cx={resolved.x + point.x * resolved.scale}
                                      cy={resolved.y + point.y * resolved.scale}
                                      r="6"
                                      className="shadow-zone-point"
                                      onPointerDown={(event) => {
                                        event.stopPropagation()
                                        const startX = event.clientX
                                        const startY = event.clientY
                                        const startPointX = point.x
                                        const startPointY = point.y

                                        const handlePointerMove = (moveEvent: PointerEvent) => {
                                          const deltaX = moveEvent.clientX - startX
                                          const deltaY = moveEvent.clientY - startY
                                          const mapDeltaX = deltaX / (editorZoom * resolved.scale)
                                          const mapDeltaY = deltaY / (editorZoom * resolved.scale)

                                          updateTerrain((current) => ({
                                            ...current,
                                            items: current.items.map((item) =>
                                              item.id === shadowItem.id && item.shadowPoints
                                                ? {
                                                  ...item,
                                                  shadowPoints: item.shadowPoints.map((p, i) =>
                                                    i === index
                                                      ? {
                                                        x: startPointX + mapDeltaX,
                                                        y: startPointY + mapDeltaY,
                                                      }
                                                      : p,
                                                  ),
                                                }
                                                : item,
                                            ),
                                          }), { syncItemId: shadowItem.id })
                                        }

                                        const handlePointerUp = () => {
                                          window.removeEventListener('pointermove', handlePointerMove)
                                          window.removeEventListener('pointerup', handlePointerUp)
                                        }

                                        window.addEventListener('pointermove', handlePointerMove)
                                        window.addEventListener('pointerup', handlePointerUp)
                                      }}
                                    />
                                    <circle
                                      cx={worldMidX}
                                      cy={worldMidY}
                                      r="4"
                                      className="shadow-zone-add-point"
                                      onPointerDown={(event) => {
                                        event.stopPropagation()
                                        updateTerrain((current) => ({
                                          ...current,
                                          items: current.items.map((item) =>
                                            item.id === shadowItem.id && item.shadowPoints
                                              ? {
                                                ...item,
                                                shadowPoints: [
                                                  ...item.shadowPoints.slice(0, index + 1),
                                                  { x: midX, y: midY },
                                                  ...item.shadowPoints.slice(index + 1),
                                                ],
                                              }
                                              : item,
                                          ),
                                        }), { syncItemId: shadowItem.id })
                                      }}
                                    />
                                  </g>
                                )
                              })
                              : null}
                          </g>
                        </svg>
                      )
                    })}
                  {isHostNightModePreview ? (
                    <svg
                      className="editor-night-overlay"
                      viewBox={`0 0 ${terrain.width} ${terrain.height}`}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 16,
                      }}
                    >
                      <defs>
                        <mask id="editor-night-mask">
                          <rect x="0" y="0" width={terrain.width} height={terrain.height} fill="white" />
                          {editorFlashlightPreviews.map((preview) => (
                            <path id={`editor-flashlight-preview-${preview.tokenId}`} key={preview.tokenId} d={preview.path} fill="black" />
                          ))}
                          {renderedEditorItems
                            .filter((item) => item.kind === 'light')
                            .map((item) => {
                              const resolved = resolvedEditorItems.get(item.id) ?? DEFAULT_TRANSFORM
                              const scaledWidth = item.width * resolved.scale
                              const scaledHeight = item.height * resolved.scale
                              const centerX = resolved.x + scaledWidth / 2
                              const centerY = resolved.y + scaledHeight / 2
                              const scaleX = item.flipX ? -1 : 1
                              const scaleY = item.flipY ? -1 : 1
                              return (
                                <g key={item.id} transform={`translate(${centerX}, ${centerY}) rotate(${resolved.rotation}) scale(${scaleX}, ${scaleY})`}>
                                  {item.generatedAsset ? (
                                    <image
                                      href={buildGeneratedAssetDataUrl({ ...item.generatedAsset, fill: '#000000' })}
                                      x={-scaledWidth / 2}
                                      y={-scaledHeight / 2}
                                      width={scaledWidth}
                                      height={scaledHeight}
                                      preserveAspectRatio="none"
                                    />
                                  ) : (
                                    <image
                                      href={item.src}
                                      x={-scaledWidth / 2}
                                      y={-scaledHeight / 2}
                                      width={scaledWidth}
                                      height={scaledHeight}
                                      style={{ filter: 'brightness(0)' }}
                                      preserveAspectRatio="none"
                                    />
                                  )}
                                </g>
                              )
                            })}
                        </mask>
                      </defs>
                      <rect
                        x="0"
                        y="0"
                        width={terrain.width}
                        height={terrain.height}
                        fill={`rgba(0, 0, 0, 1)`}
                        mask="url(#editor-night-mask)"
                        style={{ pointerEvents: 'none' }}
                      />
                    </svg>
                  ) : null}
                  {editorFlashlightPreviews.length > 0 && !isHostNightModePreview ? (
                    <svg
                      className="editor-flashlight-preview-overlay"
                      viewBox={`0 0 ${terrain.width} ${terrain.height}`}
                      aria-hidden="true"
                    >
                      {editorFlashlightPreviews.map((preview) => (
                        <g key={preview.tokenId}>
                          <path
                            id={`editor-flashlight-preview-cone-${preview.tokenId}`}
                            d={preview.path}
                            className={preview.isActive ? 'editor-flashlight-preview-cone is-active' : 'editor-flashlight-preview-cone'}
                            style={{ opacity: preview.opacity }}
                          />
                          <circle
                            id={`editor-flashlight-preview-origin-${preview.tokenId}`}
                            cx={preview.originX}
                            cy={preview.originY}
                            r="10"
                            className={preview.isActive ? 'editor-flashlight-preview-origin is-active' : 'editor-flashlight-preview-origin'}
                          />
                        </g>
                      ))}
                    </svg>
                  ) : null}
                  {editorLockedViewPreviews.length > 0 ? (
                    <svg
                      className="editor-locked-view-preview-overlay"
                      viewBox={`0 0 ${terrain.width} ${terrain.height}`}
                      aria-hidden="true"
                    >
                      {editorLockedViewPreviews.map((preview) => (
                        <rect
                          key={preview.tokenId}
                          x={preview.left}
                          y={preview.top}
                          width={preview.size}
                          height={preview.size}
                          className="editor-locked-view-preview-box"
                        />
                      ))}
                    </svg>
                  ) : null}

                  {renderedEditorItems
                    .filter((item) => item.kind === 'audio' && item.audioSpatialized && selectedItemIds.includes(item.id))
                    .map((audioItem) => {
                      const resolved = resolvedEditorItems.get(audioItem.id) ?? DEFAULT_TRANSFORM
                      const range = audioItem.audioRange ?? 1000
                      return (
                        <svg
                          key={`audio-range-${audioItem.id}`}
                          className="audio-range-preview-overlay"
                          viewBox={`0 0 ${terrain.width} ${terrain.height}`}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 14,
                          }}
                          aria-hidden="true"
                        >
                          <circle
                            cx={resolved.x}
                            cy={resolved.y}
                            r={range}
                            fill="none"
                            stroke="rgba(0, 150, 255, 0.5)"
                            strokeWidth="4"
                            strokeDasharray="8 8"
                          />
                          <circle
                            cx={resolved.x}
                            cy={resolved.y}
                            r={range}
                            fill="rgba(0, 150, 255, 0.1)"
                          />
                        </svg>
                      )
                    })}

                  {hoveredEditorItem &&
                    hoveredEditorResolvedItem &&
                    hoveredEditorItem.id !== selectedItemId ? (
                    <div
                      className="selection-box selection-box-preview"
                      style={{
                        left: `${hoveredEditorResolvedItem.x}px`,
                        top: `${hoveredEditorResolvedItem.y}px`,
                        width: `${hoveredEditorItem.width * hoveredEditorResolvedItem.scale}px`,
                        height: `${hoveredEditorItem.height * hoveredEditorResolvedItem.scale}px`,
                        transform: buildItemCssTransform(
                          hoveredEditorItem.flipX,
                          hoveredEditorItem.flipY,
                          hoveredEditorResolvedItem.rotation,
                        ),
                      }}
                    />
                  ) : null}

                  {selectedGroupBounds ? (
                    <div
                      className="selection-box"
                      style={{
                        left: `${selectedGroupBounds.left}px`,
                        top: `${selectedGroupBounds.top}px`,
                        width: `${selectedGroupBounds.width}px`,
                        height: `${selectedGroupBounds.height}px`,
                      }}
                      onPointerDown={(event) => {
                        if (!selectedItem) {
                          return
                        }

                        if (event.ctrlKey) {
                          event.preventDefault()
                          event.stopPropagation()
                          startStagePan(event.clientX, event.clientY)
                          return
                        }

                        event.stopPropagation()
                        startSelectedItemsDrag(selectedItem.id, event.clientX, event.clientY)
                      }}
                    >
                      <button
                        type="button"
                        className="selection-drag-handle"
                        onPointerDown={(event) => {
                          if (!selectedItem) return

                          if (event.ctrlKey) {
                            event.preventDefault()
                            event.stopPropagation()
                            startStagePan(event.clientX, event.clientY)
                            return
                          }

                          event.stopPropagation()
                          startSelectedItemsDrag(selectedItem.id, event.clientX, event.clientY)
                        }}
                      >
                        <Move size={14} />
                      </button>
                    </div>
                  ) : null}

                  {selectedItem && selectedResolvedItem && !selectedGroupBounds ? (
                    <>
                      <div
                        className="selection-box"
                        style={{
                          left: `${selectedResolvedItem.x}px`,
                          top: `${selectedResolvedItem.y}px`,
                          width: `${selectedItem.width * selectedResolvedItem.scale}px`,
                          height: `${selectedItem.height * selectedResolvedItem.scale}px`,
                          transform: buildItemCssTransform(selectedItem.flipX, selectedItem.flipY, selectedResolvedItem.rotation),
                        }}
                      >
                        {selectedItem.kind !== 'shadow' && (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((positionHandle) => {
                          const displayedHandle = getDisplayedResizeHandle(
                            positionHandle,
                            selectedItem.flipX,
                            selectedItem.flipY,
                            selectedResolvedItem.rotation,
                          )

                          return (
                            <button
                              key={positionHandle}
                              type="button"
                              className={`selection-handle ${positionHandle}`}
                              style={{ cursor: getResizeHandleCursor(displayedHandle) }}
                              onPointerDown={(event) => {
                                if (event.ctrlKey) {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  startStagePan(event.clientX, event.clientY)
                                  return
                                }

                                event.stopPropagation()
                                startResize(selectedItem, positionHandle)
                              }}
                            />
                          )
                        })}
                        {selectedItem.kind !== 'shadow' && (
                          <button
                            type="button"
                            className="selection-rotate-handle"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              startRotationHold(
                                selectedItem,
                                selectedResolvedItem,
                                event.clientX,
                                event.clientY,
                                event.pointerId,
                              )
                            }}
                          >
                            <RotateCw className="button-icon" strokeWidth={2.2} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="selection-drag-handle"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            startSelectedItemsDrag(selectedItem.id, event.clientX, event.clientY)
                          }}
                        >
                          <Move className="button-icon" strokeWidth={2.2} />
                        </button>
                      </div>
                      {selectedItem.kind !== 'shadow' && (
                        <div
                          className="selection-toolbar surface-base"
                          style={{
                            left: `${(selectedItemBounds?.left ?? selectedResolvedItem.x) + (selectedItemBounds?.width ?? selectedItem.width * selectedResolvedItem.scale) / 2}px`,
                            top: `calc(${(selectedItemBounds?.bottom ?? selectedResolvedItem.y + selectedItem.height * selectedResolvedItem.scale)}px + 12px * var(--inverse-zoom, 1))`,
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={selectedItem.flipX ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                            title="Miroir horizontal"
                            aria-label="Miroir horizontal"
                            onClick={() => toggleSelectedItemMirror('x')}
                          >
                            <FlipHorizontal className="button-icon" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            className={selectedItem.flipY ? 'secondary compact-icon-button' : 'ghost compact-icon-button'}
                            title="Miroir vertical"
                            aria-label="Miroir vertical"
                            onClick={() => toggleSelectedItemMirror('y')}
                          >
                            <FlipVertical className="button-icon" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            className="ghost compact-icon-button"
                            title="Tourner de -45 degres"
                            aria-label="Tourner de -45 degres"
                            onClick={() => rotateSelectedItem(-45)}
                          >
                            <ChevronLeft className="button-icon" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            className="ghost compact-icon-button"
                            title="Tourner de 45 degres"
                            aria-label="Tourner de 45 degres"
                            onClick={() => rotateSelectedItem(45)}
                          >
                            <ChevronRight className="button-icon" strokeWidth={2.2} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}

                  {renderMeasureOverlays()}

                  {displayedRoomPlayers.map((player) => (
                    <div
                      key={player.id}
                      id={`editor-cursor-${player.id}`}
                      className="remote-cursor"
                      style={{ left: `${player.x}px`, top: `${player.y}px`, borderColor: player.color }}
                    >
                      <span style={{ backgroundColor: player.color }}>{player.name}</span>
                    </div>
                  ))}
                  {displayedRoomPlayers.map((player) =>
                    player.ping ? (
                      <i
                        key={`${player.id}-ping`}
                        className="ping-ring"
                        style={{
                          left: `${player.ping.x}px`,
                          top: `${player.ping.y}px`,
                          borderColor: player.color,
                          color: player.color,
                        }}
                      ></i>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
            <AudioErrorBoundary moduleName="Audio Spatialisé (Éditeur)">
              <MapAudioPlayer
                items={terrain.items}
                zoom={editorZoom}
                stageFrameRef={editorStageFrameRef}
                globalVolume={soundboardVolume}
                resolvedItems={resolvedEditorItems}
                onAudioEnded={(id) => {
                  applyTerrain({
                    ...terrainRef.current,
                    items: terrainRef.current.items.filter((i) => i.id !== id)
                  })
                }}
              />
            </AudioErrorBoundary>
          </main>

          <aside className={isRightPanelCollapsed ? 'panel panel-collapsed right-panel' : 'panel right-panel'}>
            {isRightPanelCollapsed ? (
              <div className="panel-rail card surface-base panel-rail-right">
                <button
                  type="button"
                  className="icon-button compact-icon-button"
                  title="Afficher l inspecteur"
                  aria-label="Afficher l inspecteur"
                  onClick={() => setIsRightPanelCollapsed(false)}
                >
                  <ChevronLeft className="button-icon" strokeWidth={2.2} />
                </button>
                <span className="rail-label">Inspecteur</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={rightPanelResizeState ? 'inspector-resize-handle active' : 'inspector-resize-handle'}
                  aria-label="Redimensionner l inspecteur"
                  title="Redimensionner l inspecteur"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    setRightPanelResizeState({
                      startX: event.clientX,
                      startWidth: rightPanelWidth,
                    })
                  }}
                />
                <section
                  ref={inspectorScrollRef}
                  className="card surface-base scroll-panel fill-panel"
                  onScroll={(e) => {
                    if (selectedItemId) {
                      lastInspectorScrollTop.current = e.currentTarget.scrollTop
                    }
                  }}
                >
                  <div className="section-title-row">
                    <h2>Inspecteur</h2>
                    <button
                      type="button"
                      className="ghost compact-icon-button"
                      title="Replier l inspecteur"
                      aria-label="Replier l inspecteur"
                      onClick={() => setIsRightPanelCollapsed(true)}
                    >
                      <ChevronRight className="button-icon" strokeWidth={2.2} />
                    </button>
                  </div>
                  <InspectorSearchBar
                    inputRef={inspectorSearchInputRef}
                    value={inspectorSearchQuery}
                    onChange={setInspectorSearchQuery}
                  />
                  {!selectedItem ? (
                    <p className="helper">
                      Selectionne un element sur le terrain pour ajuster son type, son nom, son calque et ses reglages visuels.
                    </p>
                  ) : !hasVisibleInspectorSections ? (
                    <p className="helper">Aucune section de l inspecteur ne correspond a cette recherche.</p>
                  ) : (
                    <div className="inspector-grid">
                      {showIdentityTypeSection ? <InspectorSection title="Identité et Image" tone="identity" className="surface-tonal">
                        <div className="field-stack">
                          <span className="field-label">Type</span>
                          <select
                            className="type-pill surface-tonal"
                            style={{ cursor: 'pointer', border: 'none', outline: 'none', background: 'var(--md-sys-color-surface-container-high)', color: 'inherit', fontFamily: 'inherit' }}
                            value={selectedItem.kind}
                            onChange={(event) => updateItem(selectedItem.id, { kind: event.target.value as TerrainItemKind })}
                          >
                            {selectedItem.generatedAsset ? (
                              <>
                                <option value="image">Forme</option>
                                <option value="light">Lumière</option>
                                <option value="token">Pion</option>
                              </>
                            ) : (
                              <>
                                <option value="image">Image</option>
                                <option value="light">Lumière</option>
                                <option value="token">Pion</option>
                              </>
                            )}
                            {selectedItem.kind === 'shadow' && <option value="shadow" disabled>Zone d'ombre</option>}
                            {selectedItem.kind === 'audio' && <option value="audio" disabled>Audio</option>}
                            {selectedItem.kind === 'note' && <option value="note" disabled>Note</option>}
                          </select>
                        </div>
                        {selectedItem.kind === 'light' && (
                          <div className="field-stack" style={{ marginTop: '12px' }}>
                            <label className="checkbox-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selectedItem.lightSourceHidden ?? false}
                                onChange={(e) => updateItem(selectedItem.id, { lightSourceHidden: e.target.checked })}
                              />
                              Masquer l'image de la forme générée
                            </label>
                          </div>
                        )}
                        {(selectedItem.kind === 'image' || selectedItem.kind === 'token' || selectedItem.kind === 'light') && (
                          <div className="field-stack" style={{ marginTop: '12px' }}>
                            <span className="field-label">Image</span>
                            <button
                              type="button"
                              className={isDragOverReplace ? "secondary text-button is-drag-over" : "secondary text-button"}
                              onClick={() => replaceImageInputRef.current?.click()}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDragOverReplace(true)
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDragOverReplace(false)
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDragOverReplace(false)
                                const file = e.dataTransfer.files?.[0]
                                if (file && file.type.startsWith('image/')) {
                                  void processImageReplacement(file)
                                }
                              }}
                            >
                              Remplacer l'image
                            </button>
                            <button
                              type="button"
                              className="secondary text-button"
                              onClick={() => void handleAutoCropImage()}
                            >
                              Auto recadrage (Crop transparent)
                            </button>
                            <input
                              ref={replaceImageInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(event) => void handleReplaceImage(event)}
                            />
                          </div>
                        )}
                      </InspectorSection> : null}
                      {showIdentityNameSection && selectedItem.kind !== 'note' ? (
                        <InspectorIdentityNameSection
                          name={selectedItem.name}
                          onChange={(value) => updateItem(selectedItem.id, { name: value })}
                        />
                      ) : null}
                      {selectedItem.kind === 'note' ? (
                        <InspectorNoteTextSection
                          name={selectedItem.name}
                          noteVisibleToPlayers={selectedItem.noteVisibleToPlayers ?? false}
                          noteColor={selectedItem.noteColor ?? '#fef08a'}
                          onNameChange={(value) => updateItem(selectedItem.id, { name: value })}
                          onVisibilityChange={(value) => updateItem(selectedItem.id, { noteVisibleToPlayers: value })}
                          onColorChange={(color) => updateItem(selectedItem.id, { noteColor: color })}
                          palette={terrainColorPalette}
                          onAddPreference={updateTerrainColorPalette}
                        />
                      ) : null}
                      {selectedItem.kind === 'token' && showTokenSection ? (
                        <InspectorTokenSection
                          tokenId={selectedItem.id}
                          currentAssignment={currentSelectedTokenAssignment}
                          assignablePlayers={assignablePlayers}
                          isPlayerPreallocationEnabled={isPlayerPreallocationEnabled}
                          workfolderHandle={workfolderHandle}
                          workfolderCharacterFiles={workfolderTerrains.filter((t) => t.type === 'character')}
                          onUpdateAssignment={updateTokenAssignment}
                          onStatusMessage={setStatusMessage}
                          clamp={clamp}
                        />
                      ) : null}

                      {showTokenSection && selectedItem.kind !== 'audio' ? (
                        <InspectorSection title="Texte du panneau" tone="token" className="token-assignment-field surface-tonal">
                          <label className="switch-field compact-field inline-switch md-switch-field">
                            <span className="md-switch-label">Afficher un panneau sous l item</span>
                            <span className="md-switch-control">
                              <input
                                className="md-switch-input"
                                type="checkbox"
                                checked={selectedItem.tokenPanelEnabled}
                                onChange={(event) => updateItem(selectedItem.id, { tokenPanelEnabled: event.target.checked })}
                              />
                              <span className="md-switch-track">
                                <span className="md-switch-thumb" />
                              </span>
                            </span>
                          </label>
                          <div className="field-stack">
                            <span className="field-label">Texte du panneau</span>
                            <div className="note-editor-field surface-tonal">
                              <div className="note-editor-toolbar">
                                <button
                                  type="button"
                                  className="ghost compact-icon-button note-toolbar-button"
                                  title="Gras"
                                  aria-label="Gras"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    applyTokenPanelCommand('bold')
                                  }}
                                >
                                  <strong>B</strong>
                                </button>
                                <button
                                  type="button"
                                  className="ghost compact-icon-button note-toolbar-button"
                                  title="Italique"
                                  aria-label="Italique"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    applyTokenPanelCommand('italic')
                                  }}
                                >
                                  <em>I</em>
                                </button>
                                <button
                                  type="button"
                                  className="ghost compact-icon-button note-toolbar-button"
                                  title="Couleur du texte"
                                  aria-label="Couleur du texte"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    setIsTokenPanelColorPaletteOpen((current) => !current)
                                  }}
                                >
                                  <span className="note-color-indicator" style={{ background: tokenPanelColorDraft }} />
                                </button>
                                {isTokenPanelColorPaletteOpen ? (
                                  <div className="note-color-popover surface-base">
                                    <ColorPickerField
                                      value={tokenPanelColorDraft}
                                      palette={terrainColorPalette}
                                      onChange={applyTokenPanelColor}
                                      onAddPreference={updateTerrainColorPalette}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <div
                                ref={tokenPanelEditorRef}
                                className="note-editor"
                                contentEditable
                                suppressContentEditableWarning
                                data-placeholder="Texte sous l item, sur une ou plusieurs lignes"
                                onInput={commitTokenPanelEditorContent}
                                onKeyUp={saveTokenPanelSelection}
                                onMouseUp={saveTokenPanelSelection}
                              />
                            </div>
                          </div>
                        </InspectorSection>
                      ) : null}
                      {showNoteSection ? <InspectorSection title="Notes de survol" tone="note" className="field-stack surface-tonal">
                        <span className="field-label">Note MJ (Privée)</span>
                        <div className="note-editor-field surface-tonal">
                          <div className="note-editor-toolbar">
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Gras"
                              aria-label="Gras"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                applyNoteCommand('bold')
                              }}
                            >
                              <strong>B</strong>
                            </button>
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Italique"
                              aria-label="Italique"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                applyNoteCommand('italic')
                              }}
                            >
                              <em>I</em>
                            </button>
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Couleur du texte"
                              aria-label="Couleur du texte"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                setIsNoteColorPaletteOpen((current) => !current)
                              }}
                            >
                              <span className="note-color-indicator" style={{ background: noteColorDraft }} />
                            </button>
                            {isNoteColorPaletteOpen ? (
                              <div className="note-color-popover surface-base">
                                <ColorPickerField
                                  value={noteColorDraft}
                                  palette={terrainColorPalette}
                                  onChange={applyNoteColor}
                                  onAddPreference={updateTerrainColorPalette}
                                />
                              </div>
                            ) : null}
                          </div>
                          <div
                            ref={noteEditorRef}
                            className="note-editor"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Texte visible uniquement par le MJ"
                            onInput={commitNoteEditorContent}
                            onKeyUp={saveNoteSelection}
                            onMouseUp={saveNoteSelection}
                          />
                        </div>

                        <span className="field-label" style={{ marginTop: '16px' }}>Note Joueurs (Publique)</span>
                        <div className="note-editor-field surface-tonal">
                          <div className="note-editor-toolbar">
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Gras"
                              aria-label="Gras"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                applyNotePlayersCommand('bold')
                              }}
                            >
                              <strong>B</strong>
                            </button>
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Italique"
                              aria-label="Italique"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                applyNotePlayersCommand('italic')
                              }}
                            >
                              <em>I</em>
                            </button>
                            <button
                              type="button"
                              className="ghost compact-icon-button note-toolbar-button"
                              title="Couleur du texte"
                              aria-label="Couleur du texte"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                setIsNotePlayersColorPaletteOpen((current) => !current)
                              }}
                            >
                              <span className="note-color-indicator" style={{ background: notePlayersColorDraft }} />
                            </button>
                            {isNotePlayersColorPaletteOpen ? (
                              <div className="note-color-popover surface-base">
                                <ColorPickerField
                                  value={notePlayersColorDraft}
                                  palette={terrainColorPalette}
                                  onChange={applyNotePlayersColor}
                                  onAddPreference={updateTerrainColorPalette}
                                />
                              </div>
                            ) : null}
                          </div>
                          <div
                            ref={notePlayersEditorRef}
                            className="note-editor"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Texte visible par les joueurs au survol"
                            onInput={commitNotePlayersEditorContent}
                            onKeyUp={saveNotePlayersSelection}
                            onMouseUp={saveNotePlayersSelection}
                          />
                        </div>
                      </InspectorSection> : null}
                      {selectedItem.generatedAsset && showGeneratedAssetSection ? (
                        <InspectorSection title="SVG Généré" tone="asset" className="field-stack surface-tonal">
                          <div className="field-stack">
                            <span className="field-label">Forme</span>
                            <select
                              value={selectedItem.generatedAsset?.preset || 'square'}
                              onChange={(event) => updateItem(selectedItem.id, { generatedAsset: { ...selectedItem.generatedAsset, preset: event.target.value } as any })}
                            >
                              {GENERATED_ASSET_PRESETS.map((option) => (
                                <option key={option.preset} value={option.preset}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field-stack">
                            <span className="field-label">Couleur du SVG</span>
                            <ColorPickerField
                              value={normalizeGeneratedAssetColor(selectedItem.generatedAsset.fill)}
                              palette={terrainColorPalette}
                              onChange={(color) => updateGeneratedAssetColor(selectedItem, color)}
                              onAddPreference={updateTerrainColorPalette}
                            />
                          </div>
                          <div className="field-stack">
                            <span className="field-label">Type de structure</span>
                            <div className="field-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                style={{ flex: 1 }}
                                value={selectedItem.isBuilding ? 'building' : selectedItem.isWindow ? 'window' : 'default'}
                                onChange={(event) => {
                                  const val = event.target.value
                                  if (val === 'building') {
                                    updateItem(selectedItem.id, { isBuilding: true, isWindow: false })
                                  } else if (val === 'window') {
                                    updateItem(selectedItem.id, { isBuilding: false, isWindow: true })
                                  } else {
                                    updateItem(selectedItem.id, { isBuilding: false, isWindow: false })
                                  }
                                }}
                              >
                                <option value="default">Défaut</option>
                                <option value="building">Bâtiment</option>
                                <option value="window">Fenêtre</option>
                              </select>
                              {selectedItem.isBuilding && (
                                <div style={{ flexShrink: 0 }}>
                                  <ColorPickerField
                                    value={selectedItem.buildingRoofColor || '#000000'}
                                    palette={terrainColorPalette}
                                    onChange={(color) => updateItem(selectedItem.id, { buildingRoofColor: color })}
                                    onAddPreference={updateTerrainColorPalette}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </InspectorSection>
                      ) : null}
                      {showStructureSection ? (
                        <InspectorStructureSection
                          layerId={selectedItem.layerId}
                          locked={selectedItem.locked}
                          layers={terrain.layers}
                          onChange={(newLayerId) =>
                            runIfItemUnlocked(
                              selectedItem.id,
                              (current) => relocateItem(current, selectedItem.id, null, newLayerId),
                            )
                          }
                        />
                      ) : null}
                      {showGeometrySection ? (
                        <InspectorGeometrySection
                          kind={selectedItem.kind}
                          x={selectedItem.x}
                          y={selectedItem.y}
                          width={selectedItem.width}
                          height={selectedItem.height}
                          scale={selectedItem.scale}
                          rotation={selectedItem.rotation}
                          opacity={selectedItem.opacity}
                          onPositionXChange={(value) => updateItem(selectedItem.id, { x: value })}
                          onPositionYChange={(value) => updateItem(selectedItem.id, { y: value })}
                          onWidthChange={(value) => updateItem(selectedItem.id, { width: value })}
                          onHeightChange={(value) => updateItem(selectedItem.id, { height: value })}
                          onScaleChange={(value) => updateItem(selectedItem.id, { scale: value })}
                          onRotationChange={(value) => updateItem(selectedItem.id, { rotation: normalizeAngle(value) })}
                          onOpacityChange={(value) => updateItem(selectedItem.id, { opacity: value })}
                          onRotateStep={(delta) => rotateSelectedItem(delta)}
                          normalizedRotation={normalizeAngle(selectedItem.rotation)}
                          clamp={clamp}
                        />
                      ) : null}
                      {showOutlineSection && selectedItem.kind !== 'audio' ? (
                        <InspectorOutlineSection
                          outlineDraftEnabled={outlineDraftEnabled}
                          outlineDraftColor={outlineDraftColor}
                          outlineDraftWidth={outlineDraftWidth}
                          onEnabledChange={setOutlineDraftEnabled}
                          onColorChange={setOutlineDraftColor}
                          onWidthChange={(value) => setOutlineDraftWidth(clamp(Math.round(value || 0), 0, 24))}
                          onApply={applySelectedItemOutlineDraft}
                          onClear={clearSelectedItemOutlineDraft}
                          palette={terrainColorPalette}
                          onAddPreference={updateTerrainColorPalette}
                          clamp={clamp}
                        />
                      ) : null}
                      {showEffectSection && selectedItem.kind !== 'audio' ? (
                        <InspectorSection
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <span>Effets visuels</span>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEffectPickerOpen(true)
                                }}
                                title="Ajouter un effet"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          }
                          tone="asset"
                          className="surface-tonal"
                        >
                          <div className="field-stack outline-section">
                            {/* Legacy Outline */}
                            {selectedItem.outlineEnabled && (
                              <details className="card surface-base" open style={{ padding: '0', border: '1px solid var(--border)' }}>
                                <summary className="inspector-effect-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ChevronRight size={16} />
                                    <span style={{ fontWeight: 500 }}>Contour</span>
                                  </div>
                                  <button type="button" className="icon-button" onClick={(e) => { e.preventDefault(); updateItem(selectedItem.id, { outlineEnabled: false }) }}>
                                    <Trash2 size={16} />
                                  </button>
                                </summary>
                                <div className="field-stack" style={{ padding: '0 12px 12px 12px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem' }}>�?paisseur</span>
                                    <BufferedNumberField
                                      min={1}
                                      max={24}
                                      step={1}
                                      fractionDigits={0}
                                      value={selectedItem.outlineWidth || 4}
                                      onChange={(val) => updateItem(selectedItem.id, { outlineWidth: clamp(Math.round(val || 4), 1, 24) })}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem' }}>Couleur</span>
                                    <ColorPickerField
                                      value={selectedItem.outlineColor || '#ffffff'}
                                      palette={terrainColorPalette}
                                      onChange={(color) => updateItem(selectedItem.id, { outlineColor: color })}
                                      onAddPreference={updateTerrainColorPalette}
                                    />
                                  </div>
                                </div>
                              </details>
                            )}

                            {/* Legacy Grayscale */}
                            {selectedItem.grayscaleEnabled && (
                              <div className="card surface-base" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 500 }}>Noir et blanc</span>
                                  <button type="button" className="icon-button" onClick={() => updateItem(selectedItem.id, { grayscaleEnabled: false })}>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Legacy Ripple */}
                            {selectedItem.rippleEnabled && (
                              <div className="card surface-base" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 500 }}>Ondulation (Eau)</span>
                                  <button type="button" className="icon-button" onClick={() => updateItem(selectedItem.id, { rippleEnabled: false })}>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* New Generic Effects */}
                            {selectedItem.effects?.map((effect) => {
                              const removeEffect = () => {
                                updateItem(selectedItem.id, {
                                  effects: selectedItem.effects?.filter(e => e.id !== effect.id)
                                })
                              }

                              const updateEffect = (patch: Partial<import('./types/terrain').VisualEffect>) => {
                                updateItem(selectedItem.id, {
                                  effects: selectedItem.effects?.map(e => e.id === effect.id ? { ...e, ...patch } as any : e)
                                })
                              }

                              if (effect.type === 'drop-shadow') {
                                return (
                                  <details key={effect.id} className="card surface-base" open style={{ padding: '0', border: '1px solid var(--border)' }}>
                                    <summary className="inspector-effect-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ChevronRight size={16} />
                                        <span style={{ fontWeight: 500 }}>Ombre portée</span>
                                      </div>
                                      <button type="button" className="icon-button" onClick={(e) => { e.preventDefault(); removeEffect() }}>
                                        <Trash2 size={16} />
                                      </button>
                                    </summary>
                                    <div className="field-stack" style={{ padding: '0 12px 12px 12px' }}>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Décalage X</span>
                                        <BufferedNumberField min={-100} max={100} step={1} fractionDigits={0} value={effect.offsetX} onChange={(v) => updateEffect({ offsetX: v || 0 })} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Décalage Y</span>
                                        <BufferedNumberField min={-100} max={100} step={1} fractionDigits={0} value={effect.offsetY} onChange={(v) => updateEffect({ offsetY: v || 0 })} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Flou</span>
                                        <BufferedNumberField min={0} max={100} step={1} fractionDigits={0} value={effect.blurRadius} onChange={(v) => updateEffect({ blurRadius: v || 0 })} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Couleur</span>
                                        <ColorPickerField value={effect.color} palette={terrainColorPalette} onChange={(color) => updateEffect({ color })} onAddPreference={updateTerrainColorPalette} />
                                      </div>
                                    </div>
                                  </details>
                                )
                              }

                              if (effect.type === 'glow') {
                                return (
                                  <details key={effect.id} className="card surface-base" open style={{ padding: '0', border: '1px solid var(--border)' }}>
                                    <summary className="inspector-effect-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ChevronRight size={16} />
                                        <span style={{ fontWeight: 500 }}>Halo lumineux</span>
                                      </div>
                                      <button type="button" className="icon-button" onClick={(e) => { e.preventDefault(); removeEffect() }}>
                                        <Trash2 size={16} />
                                      </button>
                                    </summary>
                                    <div className="field-stack" style={{ padding: '0 12px 12px 12px' }}>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Intensité</span>
                                        <BufferedNumberField min={0} max={100} step={1} fractionDigits={0} value={effect.intensity} onChange={(v) => updateEffect({ intensity: v || 0 })} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ flex: 1, fontSize: '0.8rem' }}>Couleur</span>
                                        <ColorPickerField value={effect.color} palette={terrainColorPalette} onChange={(color) => updateEffect({ color })} onAddPreference={updateTerrainColorPalette} />
                                      </div>
                                    </div>
                                  </details>
                                )
                              }

                              // Generic filter effects
                              const labelMap: Record<string, string> = {
                                blur: 'Flou',
                                sepia: 'Sépia',
                                grayscale: 'Noir et blanc',
                                invert: 'Négatif',
                                brightness: 'Luminosité',
                                contrast: 'Contraste',
                                'hue-rotate': 'Rotation des teintes',
                                'anim-ripple': 'Animation: Ondulation',
                                'anim-fire': 'Animation: Feu',
                                'anim-glitch': 'Animation: Glitch',
                                'anim-pulse': 'Animation: Pulsation',
                                'anim-float': 'Animation: Flottaison',
                                'anim-spin': 'Animation: Rotation',
                              }
                              const maxMap: Record<string, number> = {
                                blur: 50,
                                sepia: 100,
                                grayscale: 100,
                                invert: 100,
                                brightness: 200,
                                contrast: 200,
                                'hue-rotate': 360,
                                'anim-ripple': 100,
                                'anim-fire': 100,
                                'anim-glitch': 100,
                                'anim-pulse': 100,
                                'anim-float': 100,
                                'anim-spin': 100,
                              }

                              return (
                                <details key={effect.id} className="card surface-base" open style={{ padding: '0', border: '1px solid var(--border)' }}>
                                  <summary className="inspector-effect-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <ChevronRight size={16} />
                                      <span style={{ fontWeight: 500 }}>{labelMap[effect.type] || effect.type}</span>
                                    </div>
                                    <button type="button" className="icon-button" onClick={(e) => { e.preventDefault(); removeEffect() }}>
                                      <Trash2 size={16} />
                                    </button>
                                  </summary>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0 12px 12px 12px' }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem' }}>{effect.type.startsWith('anim-') ? 'Vitesse' : 'Intensité'}</span>
                                    <input
                                      type="range"
                                      min={effect.type.startsWith('anim-') ? 1 : 0}
                                      max={maxMap[effect.type] || 100}
                                      value={effect.intensity}
                                      onChange={(e) => updateEffect({ intensity: Number(e.target.value) })}
                                      style={{ flex: 2 }}
                                    />
                                    <span style={{ width: '40px', fontSize: '0.8rem', textAlign: 'right' }}>
                                      {effect.intensity}{effect.type === 'blur' ? 'px' : effect.type === 'hue-rotate' ? '°' : effect.type.startsWith('anim-') ? '' : '%'}
                                    </span>
                                  </div>
                                </details>
                              )
                            })}

                            {!selectedItem.outlineEnabled && !selectedItem.grayscaleEnabled && !selectedItem.rippleEnabled && (!selectedItem.effects || selectedItem.effects.length === 0) && (
                              <p className="helper">Aucun effet visuel actif.</p>
                            )}
                          </div>
                        </InspectorSection>
                      ) : null}



                      {selectedItem.kind === 'audio' && showAudioSection ? (
                        <InspectorAudioSection
                          audioSpatialized={selectedItem.audioSpatialized ?? false}
                          audio3D={selectedItem.audio3D ?? false}
                          audioRange={selectedItem.audioRange ?? 1000}
                          audioLoop={selectedItem.audioLoop ?? false}
                          audioPlaying={selectedItem.audioPlaying ?? false}
                          onAudioSpatializedChange={(value) => updateItem(selectedItem.id, { audioSpatialized: value })}
                          onAudio3DChange={(value) => updateItem(selectedItem.id, { audio3D: value })}
                          onAudioRangeChange={(value) => updateItem(selectedItem.id, { audioRange: value })}
                          onAudioLoopChange={(value) => updateItem(selectedItem.id, { audioLoop: value })}
                          onAudioPlayingToggle={() => updateItem(selectedItem.id, { audioPlaying: !selectedItem.audioPlaying })}
                          clamp={clamp}
                        />
                      ) : null}

                      <InspectorOptionsSection
                        ignoreBuildingMode={selectedItem.ignoreBuildingMode ?? false}
                        onIgnoreBuildingModeChange={(value) => updateItem(selectedItem.id, { ignoreBuildingMode: value })}
                      />

                      {(selectedItem.kind === 'image' || selectedItem.kind === 'token') && selectedItem.src ? (
                        <>
                          <AssetPickerSection
                            terrain={terrain}
                            selectedItem={selectedItem}
                            onPickExisting={() => setAssetPickerContext({ mode: 'replace-item', targetItemId: selectedItem.id })}
                          />
                          <ImageSizeInfo
                            src={selectedItem.src}
                            onOptimize={(optimizedSrc) => {
                              updateItem(selectedItem.id, { src: optimizedSrc }, { recordHistory: true })
                              setStatusMessage('Image optimisée avec succès.')
                            }}
                          />
                        </>
                      ) : selectedItem.kind === 'audio' && selectedItem.src ? (
                        <AudioSizeInfo src={selectedItem.src} />
                      ) : null}
                      {showActionControls ? <div className="action-row">
                        <button
                          type="button"
                          className="secondary compact-icon-button"
                          title="Monter"
                          aria-label="Monter"
                          onClick={() => moveItem(selectedItem.id, -1)}
                        >
                          <ChevronUp className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          className="secondary compact-icon-button"
                          title="Descendre"
                          aria-label="Descendre"
                          onClick={() => moveItem(selectedItem.id, 1)}
                        >
                          <ChevronDown className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          className="compact-icon-button"
                          title={selectedItem.visible ? 'Masquer' : 'Afficher'}
                          aria-label={selectedItem.visible ? 'Masquer' : 'Afficher'}
                          onClick={() => updateItem(selectedItem.id, { visible: !selectedItem.visible })}
                        >
                          {selectedItem.visible ? (
                            <EyeOff className="button-icon" strokeWidth={2.2} />
                          ) : (
                            <Eye className="button-icon" strokeWidth={2.2} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="ghost danger compact-icon-button"
                          title="Supprimer avec enfants"
                          aria-label="Supprimer avec enfants"
                          onClick={() => deleteItem(selectedItem.id)}
                        >
                          <Trash2 className="button-icon" strokeWidth={2.2} />
                        </button>
                      </div> : null}
                    </div>
                  )}
                </section>
              </>
            )}
          </aside>
        </div>
      ) : (
        <main className="player-stage-wrap player-stage-only" style={{ position: 'relative' }}>
          <PlayerTopBar stageRef={playerStageRef} terrainWidth={playerTerrain.width} terrainHeight={playerTerrain.height} zoom={playerZoom} />
          <div
            ref={playerStageFrameRef}
            className={usesLockedViewport ? 'player-stage-frame locked-token-frame' : 'player-stage-frame'}
            onScroll={(e) => {
              playerScrollRef.current = { x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop };
              scheduleLastConfigSave();
            }}
            style={
              usesLockedViewport
                ? {
                  width: `${Math.min(playerTerrain.width, lockedViewSize) * playerZoom}px`,
                  height: `${Math.min(playerTerrain.height, lockedViewSize) * playerZoom}px`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }
                : undefined
            }
          >
            <div
              className="stage-scaler"
              style={{
                width: `${playerTerrain.width * playerZoom}px`,
                height: `${playerTerrain.height * playerZoom}px`,
              }}
            >
              <div
                ref={playerStageRef}
                className="terrain-stage player-stage"
                style={buildStageStyle(playerTerrain, playerZoom)}
                onPointerDown={(event) => {
                  if (!(event.ctrlKey && !usesLockedViewport && !effectiveFollowHost)) {
                    return
                  }

                  event.preventDefault()
                  startStagePan(event.clientX, event.clientY, 'player')
                }}
                onPointerMove={(event) => {
                  lastPlayerPointerRef.current = { x: event.clientX, y: event.clientY }
                  if (measureStartPointRef.current) {
                    const point = getMapPoint(playerStageRef.current!, playerTerrain.width, playerTerrain.height, event.clientX, event.clientY)
                    setMeasureDraft({
                      start: measureStartPointRef.current,
                      end: point,
                    })
                    if (measureDraftIdRef.current) {
                      sendMeasureUpdate(measureStartPointRef.current, point, { id: measureDraftIdRef.current })
                    }
                  }
                  sendSessionCursor(event.clientX, event.clientY)
                }}
              >
                {(() => {
                  const hiddenBuildingIds = new Set<string>()
                  const insideBuildingPolygons: Array<Array<{ x: number, y: number }>> = []
                  const windowPolygons: Array<Array<{ x: number, y: number }>> = []

                  const playerTokenPos = assignedTokenResolved
                    ? {
                      x: assignedTokenResolved.x + (assignedToken!.width * assignedTokenResolved.scale) / 2,
                      y: assignedTokenResolved.y + (assignedToken!.height * assignedTokenResolved.scale) / 2,
                    }
                    : null

                  for (const item of renderedPlayerItems) {
                    if (item.isBuilding || item.isWindow) {
                      const resolved = resolvedPlayerItems.get(item.id) ?? DEFAULT_TRANSFORM
                      const w = item.width * resolved.scale
                      const h = item.height * resolved.scale
                      const cx = resolved.x + w / 2
                      const cy = resolved.y + h / 2
                      const rad = (resolved.rotation * Math.PI) / 180
                      const cos = Math.cos(rad)
                      const sin = Math.sin(rad)

                      const corners = [
                        { x: -w / 2, y: -h / 2 },
                        { x: w / 2, y: -h / 2 },
                        { x: w / 2, y: h / 2 },
                        { x: -w / 2, y: h / 2 },
                      ].map(p => ({
                        x: cx + p.x * cos - p.y * sin,
                        y: cy + p.x * sin + p.y * cos
                      }))

                      if (item.isBuilding) {
                        let isInside = false
                        if (playerTokenPos) {
                          isInside = pointInPolygon(playerTokenPos, corners)

                          if (isInside) {
                            insideBuildingPolygons.push(corners)
                          }
                        }

                        if (!isInside) {
                          hiddenBuildingIds.add(item.id)
                        }
                      } else if (item.isWindow) {
                        windowPolygons.push(corners)
                      }
                    }
                  }

                  return (
                    <>
                      {renderedPlayerItems
                        .filter(item => item.kind !== 'audio' && item.kind !== 'light')
                        .filter(item => {
                          if (item.ignoreBuildingMode) return true
                          let currentId: string | null = item.parentId
                          while (currentId) {
                            if (hiddenBuildingIds.has(currentId)) {
                              return false
                            }
                            const parent = playerTerrain.items.find(i => i.id === currentId)
                            currentId = parent?.parentId || null
                          }
                          return true
                        })
                        .map((item) => {
                          const resolved = resolvedPlayerItems.get(item.id) ?? DEFAULT_TRANSFORM

                          const renderItem = hiddenBuildingIds.has(item.id) && item.generatedAsset
                            ? { ...item, generatedAsset: { ...item.generatedAsset, fill: item.buildingRoofColor || '#000000' } }
                            : item

                          return (
                            <div key={item.id} data-item-id={item.id}>
                              <StageItemSprite
                                item={renderItem}
                                resolved={resolved}
                                onPointerEnter={(event) => showNoteTooltip(item, event.clientX, event.clientY)}
                                onPointerMove={(event) => {
                                  // ⚠️ Performance : on ne recalcule PAS le HTML ici
                                  // (coûteux : DOMParser), on met juste à jour la
                                  // position via DOM direct (cf. note dans App.tsx).
                                  scheduleHoveredNotePosUpdate(event.clientX, event.clientY)
                                }}
                                onPointerLeave={hideNoteTooltip}
                              />
                              {renderTokenPanel(item, resolved)}
                            </div>
                          )
                        })}

                      {insideBuildingPolygons.length > 0 && (
                        <svg
                          className="building-isolation-overlay"
                          viewBox={`0 0 ${playerTerrain.width} ${playerTerrain.height}`}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 16,
                          }}
                          aria-hidden="true"
                        >
                          <defs>
                            <mask id={`building-isolation-mask-${playerId}`}>
                              <rect x="0" y="0" width={playerTerrain.width} height={playerTerrain.height} fill="white" />
                              {insideBuildingPolygons.map((corners, idx) => (
                                <polygon key={`b-${idx}`} points={corners.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />
                              ))}
                              {windowPolygons.map((corners, idx) => (
                                <polygon key={`w-${idx}`} points={corners.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />
                              ))}
                            </mask>
                          </defs>
                          <rect
                            x="0"
                            y="0"
                            width={playerTerrain.width}
                            height={playerTerrain.height}
                            fill="black"
                            mask={`url(#building-isolation-mask-${playerId})`}
                          />
                        </svg>
                      )}
                    </>
                  )
                })()}
                <PlayerStageShadowZones
                  shadowItems={renderedPlayerItems.filter((item) => item.kind === 'shadow' && item.shadowPoints)}
                  resolvedItems={resolvedPlayerItems}
                  terrainWidth={playerTerrain.width}
                  terrainHeight={playerTerrain.height}
                  assignedToken={assignedToken}
                  assignedTokenResolved={assignedTokenResolved}
                />
                <PlayerStageNightOverlay
                  isActive={activePlayerViewPolicy?.nightModeEnabled === true || activePhoneFlashlightEnabled}
                  terrainWidth={playerTerrain.width}
                  terrainHeight={playerTerrain.height}
                  flashlightMaskId={flashlightMaskId}
                  flashlightPathsRef={flashlightPathsRef}
                  currentPlayerIdentityId={currentPlayerIdentityId}
                  roomPlayers={roomPlayers}
                  lightItems={renderedPlayerItems.filter((item) => item.kind === 'light')}
                  resolvedItems={resolvedPlayerItems}
                  currentPlayerId={playerId}
                  overlayOpacity={flashlightOverlayOpacity}
                />
                <PlayerStageRemoteCursors
                  players={displayedRoomPlayers}
                  currentPlayerId={playerId}
                  hideNonHostWhenFlashlight={hideRemoteVisionAidsInFlashlight}
                />
                {renderMeasureOverlays()}
              </div>
            </div>
            <AudioErrorBoundary moduleName="Audio Spatialisé (Joueur)">
              <MapAudioPlayer
                items={playerTerrain.items}
                zoom={playerZoom}
                stageFrameRef={playerStageFrameRef}
                globalVolume={soundboardVolume}
                resolvedItems={resolvedPlayerItems}
                isPlayerMode={true}
                listenerPosition={
                  assignedToken && assignedTokenResolved
                    ? {
                      x: assignedTokenResolved.x + (assignedToken.width * assignedTokenResolved.scale) / 2,
                      y: assignedTokenResolved.y + (assignedToken.height * assignedTokenResolved.scale) / 2,
                    }
                    : null
                }
              />
            </AudioErrorBoundary>
          </div>
        </main>
      )}

      {pendingSoundboardPlacement && (
        <SoundboardPlacementCursor
          cursorRef={cursorTagRef}
          placement={pendingSoundboardPlacement}
          editorZoom={editorZoom}
          soundName={terrain.soundboard?.find(s => s.id === pendingSoundboardPlacement.id)?.name || 'Son'}
        />
      )}

      {roleRef.current ? (
        <PhoneModule
          role={roleRef.current}
          viewerIdentityId={phoneViewerIdentityId}
          isOpen={isPhoneOpen}
          onToggleOpen={() => setIsPhoneOpen((current) => !current)}
          conversations={roomPhoneChatState.conversations}
          messages={roomPhoneChatState.messages}
          unreadConversationIds={phoneUnreadConversationIds}
          activeConversationId={activePhoneConversationId}
          onSelectConversation={openPhoneConversation}
          onCreateConversation={createPhoneConversation}
          onSendMessage={sendPhoneChatMessage}
          contacts={phoneContacts}
          canUseFlashlightApp={roleRef.current === 'player' && activePlayerViewPolicy?.flashlightEnabled === true}
          flashlightEnabled={currentPlayerIdentityId ? playerPhoneStates[currentPlayerIdentityId]?.flashlightEnabled ?? false : false}
          onToggleFlashlight={togglePlayerPhoneFlashlight}
          style={phonePanelPosition ? { transform: `translate(${phonePanelPosition.x}px, ${phonePanelPosition.y}px)` } : undefined}
          onDragHandlePointerDown={(e) => startPanelDrag('phonePanel', e.clientX, e.clientY)}
        />
      ) : null}

      {isTurnTrackerVisible || isTimerPanelVisible || isSoundboardPanelVisible ? (
        <>
          {isTurnTrackerVisible ? (
            <TurnTrackerPanel
              isCollapsed={isTurnTrackerCollapsed}
              setIsCollapsed={setIsTurnTrackerCollapsed}
              position={turnTrackerPosition}
              startPanelDrag={startPanelDrag}
              turnTracker={turnTracker}
              turnTrackerDraftLabel={turnTrackerDraftLabel}
              setTurnTrackerDraftLabel={setTurnTrackerDraftLabel}
              displayedTurnTrackerEntries={displayedTurnTrackerEntries}
              currentTurnEntry={currentTurnEntry}
              draggedTurnEntryId={draggedTurnEntryId}
              dragOverTurnEntryId={dragOverTurnEntryId}
              setDraggedTurnEntryId={setDraggedTurnEntryId}
              setDragOverTurnEntryId={setDragOverTurnEntryId}
              isHost={roleRef.current === 'host'}
              currentPlayerIdentityId={currentPlayerIdentityId}
              tokenAssignments={tokenAssignments}
              terrain={terrain}
              setStatusMessage={setStatusMessage}
              sendTurnTrackerCommand={sendTurnTrackerCommand}
              addCustomTurnTrackerEntry={addCustomTurnTrackerEntry}
              focusHierarchyItem={focusHierarchyItem}
            />
          ) : null}

          {isTimerPanelVisible ? (
            <TimerPanel
              isCollapsed={isTimerPanelCollapsed}
              setIsCollapsed={setIsTimerPanelCollapsed}
              position={timerPanelPosition}
              startPanelDrag={startPanelDrag}
              sharedTimers={sharedTimers}
              isHost={roleRef.current === 'host'}
              formatSharedTimerValue={formatSharedTimerValue}
              getSharedTimerRemainingMs={getSharedTimerRemainingMs}
              formatTimerClock={formatTimerClock}
              sendTimerCommand={sendTimerCommand}
            />
          ) : null}

          {isSoundboardPanelVisible ? (
            <SoundboardPanel
              isCollapsed={isSoundboardPanelCollapsed}
              setIsCollapsed={setIsSoundboardPanelCollapsed}
              position={soundboardPanelPosition}
              startPanelDrag={startPanelDrag}
              terrain={terrain}
              soundboardSearch={soundboardSearch}
              setSoundboardSearch={setSoundboardSearch}
              pendingSoundboardPlacement={pendingSoundboardPlacement}
              setPendingSoundboardPlacement={setPendingSoundboardPlacement}
              onLoadSounds={() => soundboardAudioInputRef.current?.click()}
              onPreviewSound={handlePreviewSound}
              onRemoveSound={(sound) => {
                applyTerrain({
                  ...terrainRef.current,
                  soundboard: terrainRef.current.soundboard?.filter(s => s.id !== sound.id) || []
                })
              }}
              onPlaceGlobalSound={(sound) => {
                const soundId = generateClientId()
                applyTerrain({
                  ...terrainRef.current,
                  items: [
                    ...terrainRef.current.items,
                    {
                      id: soundId,
                      layerId: terrainRef.current.layers[0].id,
                      parentId: activeParentId,
                      name: sound.name,
                      kind: 'audio',
                      src: sound.src,
                      visible: true,
                      x: Math.round(terrainRef.current.width / 2),
                      y: Math.round(terrainRef.current.height / 2),
                      width: 96,
                      height: 96,
                      scale: 1,
                      opacity: 1,
                      outlineEnabled: false,
                      outlineWidth: 0,
                      outlineColor: '#000000',
                      locked: false,
                      note: '',
                      notePlayers: '',
                      noteVisibleToPlayers: false,
                      tokenPanelEnabled: false,
                      tokenPanelText: '',
                      flipX: false,
                      flipY: false,
                      rotation: 0,
                      grayscaleEnabled: false,
                      rippleEnabled: false,
                      audioSpatialized: false,
                      audio3D: false,
                      audioRange: 1000,
                      audioLoop: false,
                      audioAutoDestroy: true,
                      audioPlaying: true
                    }
                  ]
                })
                setStatusMessage(`Son global lancé : ${sound.name}`)
              }}
              onUpdatePlacementRange={(val) => {
                if (pendingSoundboardPlacement) {
                  setPendingSoundboardPlacement({ ...pendingSoundboardPlacement, defaultRange: val })
                }
              }}
              setStatusMessage={setStatusMessage}
            />
          ) : null}

        </>
      ) : null}

      <FloatingDialog
        open={!!noteDialogItem}
        onClose={() => setNoteDialogItem(null)}
        title={noteDialogItem ? `Note : ${noteDialogItem.name || 'Sans nom'}` : ''}
        initialSize={{ width: 500, height: 400 }}
        minWidth={300}
        minHeight={200}
        bodyStyle={{ gap: '16px', padding: '16px' }}
      >
        {noteDialogItem && viewMode === 'editor' && noteDialogItem.note && (
          <div
            style={{
              borderColor: '#f97316',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: renderNoteHtml(noteDialogItem.note) }} style={{ flex: '1 1 0', wordBreak: 'break-word' }} />
            <Shield size={20} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
          </div>
        )}
        {noteDialogItem?.notePlayers && (
          <div
            style={{
              borderRadius: '6px',
              padding: (viewMode === 'editor' && noteDialogItem?.note) ? '4px 12px' : '4px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: renderNoteHtml(noteDialogItem?.notePlayers ?? '') }} style={{ flex: '1 1 0', wordBreak: 'break-word' }} />
          </div>
        )}
      </FloatingDialog>

      <LibraryPanel
        isOpen={isLibraryDialogOpen}
        onClose={() => setIsLibraryDialogOpen(false)}
        tabs={terrain.libraryTabs || []}
        activeTabId={activeLibraryTabId}
        libraryMessage={libraryMessage}
        onSelectTab={loadLibraryTab}
        onRemoveTab={removeLibraryTab}
        onAddTab={addLibraryTab}
        isLoading={isLibraryLoading}
        isSidebarCollapsed={isLibrarySidebarCollapsed}
        onToggleSidebar={() => setIsLibrarySidebarCollapsed(!isLibrarySidebarCollapsed)}
        hasLibraryHandle={hasLibraryHandle}
        onRelinkTab={relinkLibraryTab}
        onRefreshTab={refreshLibraryTab}
        searchQuery={librarySearchQuery}
        onSearchQueryChange={setLibrarySearchQuery}
        previewSize={libraryPreviewSize}
        onPreviewSizeChange={setLibraryPreviewSize}
        breadcrumbs={libraryBreadcrumbs}
        shortcutFolders={libraryShortcutFolders}
        activeFolder={activeLibraryFolder}
        filteredFolders={filteredLibraryFolders}
        filteredAssets={filteredLibraryAssets}
        activeLibraryPath={activeLibraryPath}
        onSelectPath={setActiveLibraryPath}
        rootHandleRef={libraryDirectoryHandleRef}
        onImportAsset={importLibraryAsset}
        countAssets={countLibraryAssets}
      />

      {activeDiceRolls.length > 0 && typeof document !== 'undefined'
        ? createPortal(
          <div className="dice-roll-overlay-stack">
            {activeDiceRolls.map((roll, index) => (
              <DiceRollPopup
                key={roll.id}
                roll={roll}
                stackIndex={index}
                animationDurationMs={diceRollAnimationDurationMs}
                resultDisplayDurationMs={diceResultDisplayDurationMs}
              />
            ))}
          </div>,
          document.body,
        )
        : null}

      <ShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        visibleShortcuts={visibleShortcuts}
        searchQuery={shortcutsSearchQuery}
        onSearchChange={setShortcutsSearchQuery}
        onClose={() => setIsShortcutsDialogOpen(false)}
      />

      <DiceHistoryDialog
        isOpen={isDiceHistoryOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        diceHistory={diceHistory}
        onClose={() => setIsDiceHistoryOpen(false)}
      />

      <ChangelogDialog isOpen={isChangelogsDialogOpen} onClose={() => setIsChangelogsDialogOpen(false)} />

      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        themeMode={themeMode}
        resolvedThemeMode={resolvedThemeMode}
        diceRollAnimationDurationMs={diceRollAnimationDurationMs}
        diceResultDisplayDurationMs={diceResultDisplayDurationMs}
        showOwnSyncedCursor={showOwnSyncedCursor}
        zoomSpeedMultiplier={zoomSpeedMultiplier}
        appName={pkg.name}
        appVersion={pkg.version}
        onThemeModeChange={setThemeMode}
        onDiceRollAnimationDurationChange={setDiceRollAnimationDurationMs}
        onDiceResultDisplayDurationChange={setDiceResultDisplayDurationMs}
        onShowOwnSyncedCursorChange={setShowOwnSyncedCursor}
        onZoomSpeedMultiplierChange={setZoomSpeedMultiplier}
        onOpenChangelogs={() => setIsChangelogsDialogOpen(true)}
        onClose={() => setIsSettingsDialogOpen(false)}
      />

      <BrowserSupportDialog />

      <DefaultLibraryDialog
        isOpen={isDefaultLibraryDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        previewSrc={defaultLibraryAssetPreview}
        preset={defaultLibraryAssetPreset}
        kind={defaultLibraryAssetKind}
        name={defaultLibraryAssetName}
        color={defaultLibraryAssetColor}
        colorPalette={terrainColorPalette}
        onPresetChange={setDefaultLibraryAssetPreset}
        onPresetSelected={(_preset, label) => {
          if (
            GENERATED_ASSET_PRESETS.some(
              (presetOption) => presetOption.label.toLowerCase() === defaultLibraryAssetName.trim().toLowerCase(),
            )
          ) {
            setDefaultLibraryAssetName(label)
          }
        }}
        onKindChange={setDefaultLibraryAssetKind}
        onNameChange={setDefaultLibraryAssetName}
        onColorChange={setDefaultLibraryAssetColor}
        onAddPaletteColor={updateTerrainColorPalette}
        onCreate={createDefaultLibraryAsset}
        onClose={() => setIsDefaultLibraryDialogOpen(false)}
      />

      <AudioLoadDialog
        isOpen={isAudioLoadDialogOpen}
        terrain={terrain}
        youtubeUrlRef={youtubeUrlRef}
        youtubeBookmarkSearch={youtubeBookmarkSearch}
        editingYoutubeTitle={editingYoutubeTitle}
        onClose={() => setIsAudioLoadDialogOpen(false)}
        onChooseLocalFile={() => {
          setIsAudioLoadDialogOpen(false)
          audioInputRef.current?.click()
        }}
        onLoadYouTubeUrl={loadYouTubeUrl}
        onYoutubeBookmarkSearchChange={setYoutubeBookmarkSearch}
        onStartEditYoutubeTitle={setEditingYoutubeTitle}
        onUpdateYoutubeTitle={updateYoutubeTitle}
        onStopEditYoutubeTitle={() => setEditingYoutubeTitle(null)}
        onToggleYoutubeBookmark={toggleYoutubeBookmark}
        onRemoveYoutubeHistory={removeFromYoutubeHistory}
      />

      <SceneReviewDialog
        isOpen={isSceneReviewDialogOpen}
        onClose={() => setIsSceneReviewDialogOpen(false)}
        terrain={terrain}
        onOptimizeAll={() => {
          void optimizeAllImages()
        }}
        onOptimizeItem={async (id) => {
          const item = terrain.items.find(i => i.id === id)
          if (!item || !item.src || item.src.startsWith('data:image/webp') || item.src.startsWith('data:image/svg')) return
          try {
            setStatusMessage('Optimisation...')
            const newSrc = await convertDataUrlToWebp(item.src)
            updateItem(id, { src: newSrc }, { recordHistory: true })
            setStatusMessage('Image optimisée.')
          } catch (error) {
            console.error(error)
            setStatusMessage("Erreur lors de l'optimisation.")
          }
        }}
        onTryMerge={() => { void tryMergeImages() }}
      />
      <MergeReviewDialog
        isOpen={isMergeReviewDialogOpen}
        onClose={() => setIsMergeReviewDialogOpen(false)}
        groups={mergeGroups}
        onAcceptGroup={(index) => applyMerge(index)}
        onAcceptAll={() => applyMerge()}
        isProcessing={isMergeProcessing}
      />

      {effectPickerOpen && selectedItemIds.length > 0 && (
        <EffectPickerDialog
          referenceImageSrc={effectPickerReferenceSrc || (terrain.items.find(i => i.id === selectedItemIds[0])?.src) || terrain.items.find(i => i.kind === 'image' || i.kind === 'token' || i.kind === 'audio')?.src || ''}
          onChangeReferenceClick={() => setAssetPickerContext({ mode: 'effect-reference' })}
          onClose={() => setEffectPickerOpen(false)}
          onSelect={(type) => {
            const id = generateClientId()
            let newEffect: import('./types/terrain').VisualEffect

            if (type === 'drop-shadow') {
              newEffect = { id, type, offsetX: 5, offsetY: 5, blurRadius: 10, color: '#000000' }
            } else if (type === 'glow') {
              newEffect = { id, type, intensity: 15, color: '#FFD700' } as import('./types/terrain').GlowVisualEffect
            } else if (type === 'anim-ripple' || type === 'anim-fire' || type === 'anim-glitch' || type === 'anim-pulse' || type === 'anim-float' || type === 'anim-spin') {
              newEffect = { id, type, intensity: 10 } as import('./types/terrain').AnimationVisualEffect
            } else {
              newEffect = { id, type, intensity: type === 'sepia' || type === 'invert' || type === 'grayscale' ? 100 : type === 'blur' ? 5 : 50 } as import('./types/terrain').FilterVisualEffect
            }

            for (const itemId of selectedItemIds) {
              const item = terrain.items.find(i => i.id === itemId)
              if (item) {
                updateItem(itemId, { effects: [...(item.effects || []), newEffect] }, { recordHistory: true })
              }
            }
          }}
        />
      )}

      <AssetPickerDialog
        context={assetPickerContext}
        onClose={() => setAssetPickerContext(null)}
        terrain={terrain}
        onUploadClick={() => {
          if (assetPickerContext?.mode === 'add-image') {
            imageInputRef.current?.click()
          } else if (assetPickerContext?.mode === 'add-token') {
            tokenInputRef.current?.click()
          }
          setAssetPickerContext(null)
        }}
        onSelectAsset={(asset) => {
          if (assetPickerContext?.mode === 'effect-reference') {
            setEffectPickerReferenceSrc(asset.src || null)
            setAssetPickerContext(null)
          } else if (assetPickerContext?.mode === 'replace-item' && assetPickerContext.targetItemId) {
            updateItem(assetPickerContext.targetItemId, { src: asset.src }, { recordHistory: true })
            setStatusMessage('Asset remplacé avec succès.')
          } else if (assetPickerContext?.mode === 'add-image' || assetPickerContext?.mode === 'add-token') {
            const kind = assetPickerContext.mode === 'add-image' ? 'image' : 'token'
            const newItem: TerrainItem = {
              id: generateClientId(),
              layerId: selectedLayerId ?? '',
              parentId: null,
              locked: false,
              name: asset.name,
              note: '',
              notePlayers: '',
              noteVisibleToPlayers: false,
              tokenPanelEnabled: false,
              tokenPanelText: '',
              kind,
              src: asset.src,
              x: Math.round((-(panState?.startScrollLeft ?? 0)) + window.innerWidth / 2 - asset.width / 2),
              y: Math.round((-(panState?.startScrollTop ?? 0)) + window.innerHeight / 2 - asset.height / 2),
              width: asset.width,
              height: asset.height,
              scale: asset.scale,
              flipX: asset.flipX,
              flipY: asset.flipY,
              rotation: 0,
              outlineEnabled: false,
              outlineWidth: 0,
              outlineColor: '#ffffff',
              grayscaleEnabled: false,
              rippleEnabled: false,
              opacity: 1,
              visible: true,
              lightSourceHidden: false,
              ignoreBuildingMode: false
            }

            updateTerrain(current => ({
              ...current,
              items: [...current.items, newItem]
            }), { recordHistory: true })

            setSelectedItemIds([newItem.id])
            setStatusMessage('Asset ajouté à la scène.')
          }
          setAssetPickerContext(null)
        }}
      />

      <TerrainDialog
        isOpen={isTerrainDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        terrain={terrain}
        colorPalette={terrainColorPalette}
        onApplyTerrain={applyTerrain}
        onAddPaletteColor={updateTerrainColorPalette}
        onLoadClick={() => terrainLoadInputRef.current?.click()}
        onSaveClick={() => void saveTerrainToFile({ forcePicker: true })}
        onClose={() => setIsTerrainDialogOpen(false)}
      />

      <TimerDialog
        isOpen={isTimerDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        mode={timerDraftMode}
        title={timerDraftTitle}
        minutes={timerDraftMinutes}
        seconds={timerDraftSeconds}
        onModeChange={setTimerDraftMode}
        onTitleChange={setTimerDraftTitle}
        onMinutesChange={setTimerDraftMinutes}
        onSecondsChange={setTimerDraftSeconds}
        onCreate={createSharedTimer}
        onClose={() => setIsTimerDialogOpen(false)}
      />

      <HostDialog
        isOpen={isHostDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        serverUrl={serverUrl}
        roomId={roomId}
        roomPlayers={roomPlayers}
        isHostSessionActive={isHostSessionActive}
        onServerUrlChange={setServerUrl}
        onRoomIdChange={setRoomId}
        onGenerateRoomCode={() => setRoomId(generateRoomCode())}
        onToggleHost={() => (isHostSessionActive ? disconnectSession() : connect('host'))}
        onClose={() => setIsHostDialogOpen(false)}
      />

      <ClientDialog
        isOpen={isClientDialogOpen}
        backdropPointerDownRef={backdropPointerDownRef}
        serverUrl={serverUrl}
        roomId={roomId}
        playerColor={playerColor}
        playerName={playerName}
        colorPalette={terrainColorPalette}
        selectedPredeclaredPlayerId={selectedPredeclaredPlayerId}
        joinConfig={joinConfig}
        isJoinConfigLoading={isJoinConfigLoading}
        onServerUrlChange={setServerUrl}
        onRoomIdChange={setRoomId}
        onPlayerColorChange={setPlayerColor}
        onPlayerNameChange={setPlayerName}
        onPredeclaredPlayerChange={setSelectedPredeclaredPlayerId}
        onAddPaletteColor={updateTerrainColorPalette}
        onDisconnect={() => disconnectSession()}
        onConnect={() => void connectPlayerWithJoinConfig()}
        onClose={() => setIsClientDialogOpen(false)}
      />

      <FloatingDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        title="Gestion du projet"
        initialSize={{ width: 480, height: 560 }}
        minWidth={360}
        minHeight={360}
        bodyStyle={{ gap: '16px', minHeight: '150px', padding: '16px' }}
      >

        <div className="project-dialog-grid">

          <CollapsibleSection
            id="creation"
            title={<><Plus size={18} /> Création</>}
            collapsed={collapsedProjectSections['creation'] === true}
            onToggle={toggleProjectSection}
          >
            <button
              type="button"
              className="secondary project-dialog-btn-full"
              onClick={() => {
                setIsImportDialogOpen(false)
                createNewTerrain()
              }}
            >
              Créer un nouveau terrain
            </button>
            <button
              type="button"
              className="secondary project-dialog-btn-full"
              onClick={() => {
                setIsImportDialogOpen(false)
                createNewCharacter()
              }}
            >
              Créer une fiche personnage
            </button>
          </CollapsibleSection>

          <CollapsibleSection
            id="workfolder"
            title={<><FolderOpen size={18} /> Dossier de travail</>}
            collapsed={collapsedProjectSections['workfolder'] === true}
            onToggle={toggleProjectSection}
            headerActions={workfolderHandle ? (
              <button type="button" className="ghost compact-icon-button" onClick={() => void selectWorkfolder()} title="Changer de dossier" style={{ padding: '4px' }}>
                <RefreshCw size={16} />
              </button>
            ) : undefined}
          >
            {!workfolderHandle ? (
              <button
                type="button"
                className="primary project-dialog-btn-full"
                style={{ borderRadius: '100px' }}
                onClick={() => void selectWorkfolder()}
              >
                <span className="button-content">
                  <FolderOpen className="button-icon" strokeWidth={2.2} />
                  <span>Sélectionner un dossier</span>
                </span>
              </button>
            ) : (
              <div className="project-dialog-folder-name">
                Nom du dossier : <strong>{workfolderHandle.name}</strong>
              </div>
            )}
          </CollapsibleSection>

          {workfolderHandle && (
            <CollapsibleSection
              id="preallocation"
              title={<><Users size={18} /> Pré-allocation des joueurs</>}
              collapsed={collapsedProjectSections['preallocation'] === true}
              onToggle={toggleProjectSection}
              className={predeclaredPlayers.length > 0 ? 'project-dialog-card--wide' : ''}
            >
              <p className="project-dialog-card-desc">
                Quand ce mode est actif, le joueur choisit son personnage avant de rejoindre. Ces identités peuvent être assignées aux pions. Sauvegardé dans <code>preallocated-players.json</code>.
              </p>
              {predeclaredPlayers.length === 0 ? (
                <p className="project-dialog-card-desc">Aucun joueur pré-déclaré.</p>
              ) : (
                <div className="field-stack">
                  {predeclaredPlayers.map((player) => {
                    const connectedPlayer = roomPlayersByPredeclaredId.get(player.id) ?? null
                    return (
                      <div key={player.id} className="conn-dialog-player-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', flexWrap: 'nowrap' }}>
                        <ColorPickerField
                          value={player.color}
                          palette={colorPalette.palette}
                          onChange={(color) => updatePredeclaredPlayer(player.id, { color })}
                          onAddPreference={colorPalette.addColor}
                          onRemovePreference={colorPalette.removeColor}
                        />
                        <input
                          value={player.name}
                          onChange={(event) => updatePredeclaredPlayer(player.id, { name: event.target.value })}
                          placeholder="Nom"
                          style={{ flex: '1 1 0', minWidth: '0', margin: 0 }}
                        />
                        <span className="helper" style={{ flex: '0 0 auto', margin: 0, fontSize: '12px' }}>
                          {connectedPlayer ? '● ' + connectedPlayer.name : 'Libre'}
                        </span>
                        <button type="button" className="ghost danger compact-icon-button" onClick={() => removePredeclaredPlayer(player.id)} style={{ flex: '0 0 auto' }}>
                          <Trash2 className="button-icon" strokeWidth={2.2} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="conn-dialog-prealloc-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button type="button" className="secondary compact" onClick={addPredeclaredPlayer} style={{ padding: '6px 12px' }}>
                    <Plus className="button-icon" strokeWidth={2.2} />
                    <span>Ajouter</span>
                  </button>
                  <button type="button" className="ghost compact" onClick={() => void loadPreallocatedPlayersFromWorkfolder(workfolderHandle)} title="Recharger depuis preallocated-players.json" style={{ padding: '6px 12px' }}>
                    <RefreshCw className="button-icon" strokeWidth={2.2} size={16} />
                    <span>Recharger</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label className="switch-field compact-field inline-switch md-switch-field" style={{ margin: 0 }}>
                    <span className="md-switch-label">Activer</span>
                    <span className="md-switch-control">
                      <input
                        className="md-switch-input"
                        type="checkbox"
                        checked={isPlayerPreallocationEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setIsPlayerPreallocationEnabled(enabled);
                          void savePreallocatedPlayersToWorkfolder(predeclaredPlayers, enabled);
                        }}
                      />
                      <span className="md-switch-track">
                        <span className="md-switch-thumb" />
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {workfolderHandle && (
            <CollapsibleSection
              id="configuration"
              title={<><Settings2 size={18} /> Configuration</>}
              collapsed={collapsedProjectSections['configuration'] === true}
              onToggle={toggleProjectSection}
            >
              <p className="project-dialog-card-desc">
                Constantes globales du projet, sauvegardées dans <code>config.json</code>. Utilisées pour le calcul des seuils de réussite des caractéristiques.
              </p>
              <ProjectConfigSection
                config={projectConfig}
                disabled={!workfolderHandle}
                onChange={setProjectConfig}
                onPersist={persistProjectConfigChange}
              />
            </CollapsibleSection>
          )}

          {workfolderHandle && (
            <CollapsibleSection
              id="files"
              title={<><MapIcon size={18} /> Fichiers disponibles</>}
              collapsed={collapsedProjectSections['files'] === true}
              onToggle={toggleProjectSection}
              className="project-dialog-card--full-row"
            >
              <WorkfolderFilesList
                files={workfolderTerrains}
                onOpenFile={(fileName) => void openWorkfolderFile(fileName)}
              />
            </CollapsibleSection>
          )}

        </div>
      </FloatingDialog>


      {isPlayerCharacterSheetOpen && currentPlayerCharacterAssignment && currentPlayerCharacterAssignment.characterData && (
        <CharacterSheetDialog
          character={currentPlayerCharacterAssignment.characterData}
          initialFileName={(currentPlayerCharacterAssignment.characterFileName || 'Personnage').replace(/\.char\.json$/, '')}
          onClose={() => setIsPlayerCharacterSheetOpen(false)}
          onSave={(_char, _fileName) => {

          }}
          readOnly={true}
          onPlayerVitalsChange={(vitals) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              vitalsSeqRef.current += 1;
              wsRef.current.send(JSON.stringify({
                type: 'player:updateCharacterVitals',
                tokenId: currentPlayerCharacterAssignment.tokenId,
                healthCurrent: vitals.health,
                mentalCurrent: vitals.mental,
                astraCurrent: vitals.astra,
                seq: vitalsSeqRef.current,
              }));
            }
          }}
          incomingVitals={incomingVitalsForPlayer}
          statSuccessDivisor={getProjectConfigNumber(projectConfig, 'statSuccessDivisor', DEFAULT_STAT_SUCCESS_DIVISOR)}
          successModifierMin={getProjectConfigNumber(projectConfig, 'successModifierMin', DEFAULT_SUCCESS_MODIFIER_MIN)}
          successModifierMax={getProjectConfigNumber(projectConfig, 'successModifierMax', DEFAULT_SUCCESS_MODIFIER_MAX)}
          vitalsCriticalThresholdPercent={getProjectConfigNumber(projectConfig, 'vitalsCriticalThresholdPercent', DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT)}
          vitalsWeightHealth={getProjectConfigNumber(projectConfig, 'vitalsWeightHealth', DEFAULT_VITALS_WEIGHT_HEALTH)}
          vitalsWeightMental={getProjectConfigNumber(projectConfig, 'vitalsWeightMental', DEFAULT_VITALS_WEIGHT_MENTAL)}
          moneySuffix={getProjectConfigValue(projectConfig, 'moneySuffix', DEFAULT_MONEY_SUFFIX)}
          availableFiles={workfolderTerrains.filter(f => f.type === 'character').map(f => ({ name: f.name, fileName: f.fileName, type: 'character' as const }))}
        />
      )}

      {isCharacterSheetOpen && activeCharacter && (
        <CharacterSheetDialog
          character={activeCharacter}
          initialFileName={activeCharacterFileName}
          onClose={() => setIsCharacterSheetOpen(false)}
          onSave={(char, fileName) => {
            const previousFileName = activeCharacterFileName;
            setActiveCharacter(char);
            setActiveCharacterFileName(fileName);
            void saveCharacterToWorkfolder(char, fileName, previousFileName || undefined);
            syncCharacterToTokenAssignments(`${fileName}.char.json`, char);
          }}
          statSuccessDivisor={getProjectConfigNumber(projectConfig, 'statSuccessDivisor', DEFAULT_STAT_SUCCESS_DIVISOR)}
          successModifierMin={getProjectConfigNumber(projectConfig, 'successModifierMin', DEFAULT_SUCCESS_MODIFIER_MIN)}
          successModifierMax={getProjectConfigNumber(projectConfig, 'successModifierMax', DEFAULT_SUCCESS_MODIFIER_MAX)}
          vitalsCriticalThresholdPercent={getProjectConfigNumber(projectConfig, 'vitalsCriticalThresholdPercent', DEFAULT_VITALS_CRITICAL_THRESHOLD_PERCENT)}
          vitalsWeightHealth={getProjectConfigNumber(projectConfig, 'vitalsWeightHealth', DEFAULT_VITALS_WEIGHT_HEALTH)}
          vitalsWeightMental={getProjectConfigNumber(projectConfig, 'vitalsWeightMental', DEFAULT_VITALS_WEIGHT_MENTAL)}
          moneySuffix={getProjectConfigValue(projectConfig, 'moneySuffix', DEFAULT_MONEY_SUFFIX)}
          availableFiles={workfolderTerrains.filter(f => f.type === 'character').map(f => ({ name: f.name, fileName: f.fileName, type: 'character' as const }))}
          onSwitchFile={(fullFileName) => void openWorkfolderFile(fullFileName)}
          onApplyColumnSettingsToAll={applyColumnSettingsToAllCharacters}
          onLiveChange={(char) => {
            const fullFileName = `${activeCharacterFileName}.char.json`;
            syncCharacterToTokenAssignments(fullFileName, char);
          }}
          onVitalsBroadcast={(vitals) => {
            // Le MJ a modifié les vitales → on envoie au serveur pour broadcast aux joueurs.
            const fullFileName = `${activeCharacterFileName}.char.json`;
            const entry = Object.entries(tokenAssignmentsRef.current).find(
              ([, a]) => a.characterFileName === fullFileName
            );
            const tokenId = entry ? entry[0] : null;
            if (tokenId && wsRef.current?.readyState === WebSocket.OPEN) {
              vitalsSeqRef.current += 1;
              wsRef.current.send(JSON.stringify({
                type: 'host:broadcastVitals',
                tokenId,
                healthCurrent: vitals.health,
                mentalCurrent: vitals.mental,
                astraCurrent: vitals.astra,
                seq: vitalsSeqRef.current,
              }));
            }
          }}
          incomingVitals={incomingVitalsForGM}
        />
      )}

      <PredeclaredPlayerDialog
        open={isPredeclaredPlayerChoiceDialogOpen}
        joinConfig={joinConfig}
        selectedPredeclaredPlayerId={selectedPredeclaredPlayerId}
        isJoinConfigLoading={isJoinConfigLoading}
        backdropPointerDownRef={backdropPointerDownRef}
        onClose={() => setIsPredeclaredPlayerChoiceDialogOpen(false)}
        onSelectPlayer={setSelectedPredeclaredPlayerId}
        onConfirm={() => void connectPlayerWithJoinConfig()}
      />
      {contextMenuState ? (
        <>
          <div className="dialog-backdrop" style={{ background: 'transparent', backdropFilter: 'none', zIndex: 100 }} onPointerDown={() => setContextMenuState(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenuState(null); }} />
          <div
            className="context-menu card surface-base"
            style={{
              position: 'fixed',
              left: `${contextMenuState.x}px`,
              top: `${contextMenuState.y}px`,
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              minWidth: '220px',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {selectedItem && (
              <div className="surface-tonal" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.8, color: 'var(--md-sys-color-primary)', letterSpacing: '0.5px' }}>
                  Action sur l'élément
                </div>
                <button
                  type="button"
                  className="ghost context-menu-item"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '8px', textAlign: 'left', borderRadius: '6px' }}
                  onClick={() => {
                    const el = document.getElementById(`hierarchy-item-${selectedItem.id}`)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    } else {
                      setStatusMessage('Veuillez dérouler les calques pour trouver l\'élément dans la hiérarchie.')
                    }
                    setContextMenuState(null)
                  }}
                >
                  <LocateFixed className="button-icon" size={16} style={{ marginRight: '8px' }} />
                  Focus dans la hiérarchie
                </button>
                {selectedItem.note && (
                  <button
                    type="button"
                    className="ghost context-menu-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '8px', textAlign: 'left', borderRadius: '6px' }}
                    onClick={() => {
                      setNoteDialogItem(selectedItem)
                      hideNoteTooltip()
                      setContextMenuState(null)
                    }}
                  >
                    <StickyNote className="button-icon" size={16} style={{ marginRight: '8px' }} />
                    Voir note
                  </button>
                )}
              </div>
            )}
            {contextMenuState.items.length > 0 && (
              <div className="surface-base" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.8, color: 'var(--md-sys-color-primary)', letterSpacing: '0.5px' }}>
                  Superposition
                </div>
                {contextMenuState.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="ghost context-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', padding: '8px', textAlign: 'left', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      selectSingleItem(item.id)
                      setContextMenuState(null)
                    }}
                  >
                    {getKindIcon(item.kind)}
                    {item.name || item.kind}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
      {hierarchyContextMenuState ? (
        <>
          <div className="dialog-backdrop" style={{ background: 'transparent', backdropFilter: 'none', zIndex: 100 }} onPointerDown={() => setHierarchyContextMenuState(null)} onContextMenu={(e) => { e.preventDefault(); setHierarchyContextMenuState(null); }} />
          <div
            className="context-menu card surface-base"
            style={{
              position: 'fixed',
              left: `${hierarchyContextMenuState.x}px`,
              top: `${hierarchyContextMenuState.y}px`,
              zIndex: 101,
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '180px'
            }}
          >
            {(() => {
              const targetItemId = hierarchyContextMenuState.itemId
              const targetItem = terrain.items.find(i => i.id === targetItemId)
              if (!targetItem) return null

              const isMultiSelectContextMenu = selectedItemIds.length > 1 && selectedItemIds.includes(targetItemId)

              if (isMultiSelectContextMenu) {
                return (
                  <button
                    type="button"
                    className="ghost context-menu-item"
                    style={{ justifyContent: 'flex-start', padding: '6px 8px', textAlign: 'left' }}
                    onClick={() => {
                      const newGroupId = generateClientId()
                      updateTerrain((current) => {
                        let next = {
                          ...current,
                          items: [
                            ...current.items,
                            {
                              id: newGroupId,
                              layerId: targetItem.layerId,
                              parentId: targetItem.parentId,
                              locked: false,
                              name: 'Nouveau groupe',
                              note: '',
                              notePlayers: '',
                              noteVisibleToPlayers: false,
                              tokenPanelEnabled: false,
                              tokenPanelText: '',
                              kind: 'empty' as const,
                              src: '',
                              x: targetItem.x,
                              y: targetItem.y,
                              width: 0,
                              height: 0,
                              scale: 1,
                              flipX: false,
                              flipY: false,
                              rotation: 0,
                              outlineEnabled: false,
                              outlineWidth: 0,
                              outlineColor: '#ffffff',
                              grayscaleEnabled: false,
                              rippleEnabled: false,
                              opacity: 1,
                              visible: true,
                            }
                          ]
                        }

                        for (const id of selectedItemIds) {
                          const item = next.items.find(i => i.id === id)
                          if (item && !item.locked) {
                            next = relocateItem(next, id, newGroupId, targetItem.layerId)
                          }
                        }

                        return next
                      }, { syncItemId: newGroupId })
                      setSelectedItemId(newGroupId)
                      setSelectedItemIds([newGroupId])
                      setHierarchyContextMenuState(null)
                    }}
                  >
                    Grouper la sélection
                  </button>
                )
              }

              return (
                <button
                  type="button"
                  className="ghost context-menu-item"
                  style={{ justifyContent: 'flex-start', padding: '6px 8px', textAlign: 'left' }}
                  onClick={() => {
                    const newGroupId = generateClientId()
                    updateTerrain((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        {
                          id: newGroupId,
                          layerId: targetItem.layerId,
                          parentId: targetItemId,
                          locked: false,
                          name: 'Groupe',
                          note: '',
                          notePlayers: '',
                          noteVisibleToPlayers: false,
                          tokenPanelEnabled: false,
                          tokenPanelText: '',
                          kind: 'empty' as const,
                          src: '',
                          x: targetItem.x,
                          y: targetItem.y,
                          width: 0,
                          height: 0,
                          scale: 1,
                          flipX: false,
                          flipY: false,
                          rotation: 0,
                          outlineEnabled: false,
                          outlineWidth: 0,
                          outlineColor: '#ffffff',
                          grayscaleEnabled: false,
                          rippleEnabled: false,
                          opacity: 1,
                          visible: true,
                        }
                      ]
                    }), { syncItemId: newGroupId })
                    setSelectedItemId(newGroupId)
                    setHierarchyContextMenuState(null)
                  }}
                >
                  Créer groupe
                </button>
              )
            })()}
          </div>
        </>
      ) : null}
      <VirtualContactsDialog
        isOpen={isVirtualContactsDialogOpen}
        onClose={() => setIsVirtualContactsDialogOpen(false)}
        contacts={phoneVirtualContacts}
        onCreate={handleCreateVirtualContact}
        onUpdate={handleUpdateVirtualContact}
        onDelete={handleDeleteVirtualContact}
      />
      <DragTooltip ref={dragTooltipRef} />
    </div>
  )
}


export default App
