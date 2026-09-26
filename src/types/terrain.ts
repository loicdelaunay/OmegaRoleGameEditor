export type TerrainLayer = {
  id: string
  name: string
  visible: boolean
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export type TerrainItemKind = 'image' | 'token' | 'shadow' | 'audio' | 'light' | 'note' | 'empty'

export type GeneratedAsset = {
  preset:
    | 'square'
    | 'rounded-square'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'hexagon'
    | 'star'
    | 'arrow-right'
  fill: string
}

export type VisualEffectType = 'blur' | 'sepia' | 'grayscale' | 'invert' | 'brightness' | 'contrast' | 'hue-rotate' | 'drop-shadow' | 'glow' | 'anim-ripple' | 'anim-fire' | 'anim-glitch' | 'anim-pulse' | 'anim-float' | 'anim-spin'

export type BaseVisualEffect = {
  id: string
}

export type FilterVisualEffect = BaseVisualEffect & {
  type: 'blur' | 'sepia' | 'grayscale' | 'invert' | 'brightness' | 'contrast' | 'hue-rotate'
  intensity: number
}

export type DropShadowVisualEffect = BaseVisualEffect & {
  type: 'drop-shadow'
  offsetX: number
  offsetY: number
  blurRadius: number
  color: string
}

export type GlowVisualEffect = BaseVisualEffect & {
  type: 'glow'
  color: string
  intensity: number // Equivalent to blurRadius but specifically for glow effect intensity
}

export type AnimationVisualEffect = BaseVisualEffect & {
  type: 'anim-ripple' | 'anim-fire' | 'anim-glitch' | 'anim-pulse' | 'anim-float' | 'anim-spin'
  intensity: number // Speed or intensity
}

export type VisualEffect = FilterVisualEffect | DropShadowVisualEffect | GlowVisualEffect | AnimationVisualEffect

export type TerrainItem = {
  id: string
  layerId: string
  parentId: string | null
  locked: boolean
  name: string
  note: string
  notePlayers: string
  noteVisibleToPlayers?: boolean
  noteColor?: string
  tokenPanelEnabled: boolean
  tokenPanelText: string
  kind: TerrainItemKind
  src: string
  generatedAsset?: GeneratedAsset
  shadowPoints?: Array<{ x: number; y: number }>
  effects?: VisualEffect[]
  x: number
  y: number
  width: number
  height: number
  scale: number
  flipX: boolean
  flipY: boolean
  rotation: number
  outlineEnabled: boolean
  outlineWidth: number
  outlineColor: string
  grayscaleEnabled: boolean
  rippleEnabled: boolean
  opacity: number
  visible: boolean
  audioSpatialized?: boolean
  audio3D?: boolean
  audioRange?: number
  audioLoop?: boolean
  audioAutoDestroy?: boolean
  audioPlaying?: boolean
  lightSourceHidden?: boolean
  isBuilding?: boolean
  buildingRoofColor?: string
  ignoreBuildingMode?: boolean
  isWindow?: boolean
}

export type TerrainAudio = {
  name: string
  src: string
}

export type TerrainSoundboardItem = {
  id: string
  name: string
  src: string
  defaultRange: number
}

export type PlayerViewMode = 'free' | 'follow-host' | 'locked-token' | 'follow-turn'

export type TokenAssignment = {
  playerId: string
  mode: PlayerViewMode
  fixedZoom?: number
  lockedViewSize: number
  lockVisibleArea: boolean
  nightModeEnabled: boolean
  flashlightEnabled: boolean
  flashlightDistance: number
  flashlightOpacity: number
  flashlightAngle: number
  characterFileName?: string
  characterData?: import('../lib/character').CharacterDocument
}

export type TerrainDocument = {
  version: 1
  name: string
  width: number
  height: number
  gridSize: number
  backgroundColor: string
  colorPalette: string[]
  audio: TerrainAudio | null
  soundboard?: TerrainSoundboardItem[]
  assets?: Record<string, string>
  youtubeHistory?: string[]
  youtubeBookmarks?: string[]
  youtubeTitles?: Record<string, string>
  preallocationEnabled?: boolean
  predeclaredPlayers?: PredeclaredPlayer[]
  tokenAssignments?: Record<string, TokenAssignment>
  phoneVirtualContacts?: { id: string, name: string, color: string }[]
  libraryTabs?: { id: string, name: string }[]
  layers: TerrainLayer[]
  items: TerrainItem[]
  updatedAt: string
}

export type RoomAudioState = {
  isPlaying: boolean
  isLooping: boolean
  currentTime: number
  updatedAt: number
}

export type PredeclaredPlayer = {
  id: string
  name: string
  color: string
  connectedPlayerId?: string | null
}

export type RoomJoinConfig = {
  preallocationEnabled: boolean
  predeclaredPlayers: PredeclaredPlayer[]
}

export type PhoneChatConversationKind = 'direct' | 'group' | 'npc'

export type PhoneChatConversation = {
  id: string
  kind: PhoneChatConversationKind
  title: string
  participantIds: string[]
  creatorId: string
  externalTargetName?: string | null
  createdAt: number
}

export type PhoneChatMessage = {
  id: string
  conversationId: string
  authorId: string
  authorName: string
  authorColor: string
  text: string
  createdAt: number
}

export type PlayerPhoneState = {
  playerId: string
  flashlightEnabled: boolean
}

export type RoomPhoneChatState = {
  conversations: PhoneChatConversation[]
  messages: PhoneChatMessage[]
}

export type PlayerPing = {
  x: number
  y: number
  at: number
}

export type RoomPlayer = {
  id: string
  name: string
  color: string
  predeclaredPlayerId?: string | null
  x: number
  y: number
  zoom?: number
  role?: 'host' | 'player' | 'npc'
  ping?: PlayerPing
}

export type TurnTrackerEntry = {
  id: string
  label: string
  color: string
  kind: 'player' | 'custom'
  playerId?: string
  points?: { action: boolean; movement: boolean; intervention: boolean }
}

export type TurnTrackerState = {
  entries: TurnTrackerEntry[]
  currentEntryId: string | null
  round: number
}

export type SharedTimerMode = 'stopwatch' | 'countdown'

export type SharedTimer = {
  id: string
  title: string
  mode: SharedTimerMode
  durationMs: number | null
  elapsedMs: number
  isPaused: boolean
  updatedAt: number
}

export type ResolvedItem = {
  x: number
  y: number
  scale: number
  rotation: number
}