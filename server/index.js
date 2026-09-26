import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import http from 'node:http'
import express from 'express'
import { WebSocketServer } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DEFAULT_PORT = 8787
const DEFAULT_PROXY_TARGET = 'http://localhost:8787'

function readJsonConfig(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch (error) {
    console.warn(`[config] Impossible de lire ${filePath}: ${error.message}`)
    return {}
  }
}

const projectConfig = readJsonConfig(path.join(ROOT_DIR, 'config.json'))
const hostConfig = (projectConfig.host && typeof projectConfig.host === 'object') ? projectConfig.host : {}
const clientConfig = (projectConfig.client && typeof projectConfig.client === 'object') ? projectConfig.client : {}

function readPortFromConfig() {
  const raw = hostConfig.port
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_PORT
  }

  const numericValue = Number(raw)
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 65535) {
    console.warn(`[config] Port invalide dans config.json (${raw}), utilisation de ${DEFAULT_PORT}.`)
    return DEFAULT_PORT
  }

  return Math.round(numericValue)
}

const PORT = Number(process.env.PORT || readPortFromConfig())
const PROXY_TARGET = typeof clientConfig.proxyTarget === 'string' && clientConfig.proxyTarget.trim() !== ''
  ? clientConfig.proxyTarget.trim()
  : DEFAULT_PROXY_TARGET
const PLAYER_COLORS = ['#d94b24', '#147a78', '#7b5cff', '#b88c16', '#db2f7f', '#1b5dd8']
const HOST_COLOR = '#ff8a3d'
const PING_DURATION_MS = 1000
const MAX_DICE_HISTORY = 50
const TURN_TRACKER_CUSTOM_COLOR = '#b3261e'
const MAX_SHARED_TIMERS = 3
const MAX_SHARED_TIMER_DURATION_MS = 24 * 60 * 60 * 1000
const MAX_PHONE_MESSAGES_PER_CONVERSATION = 200
const MAX_PHONE_CONVERSATIONS = 50
const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 10_000
const ROOM_TTL_MS = 5 * 60 * 1000
const SEND_BACKPRESSURE_THRESHOLD = 1024 * 1024

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, maxPayload: 50 * 1024 * 1024 })
const rooms = new Map()

// --- Heartbeat: detect and terminate dead WebSocket connections ---
const socketLastPong = new WeakMap()

function heartbeat() {
  for (const socket of wss.clients) {
    if (socket.readyState !== socket.OPEN) continue

    const lastPong = socketLastPong.get(socket) ?? Date.now()
    if (Date.now() - lastPong > HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS) {
      socket.terminate()
      continue
    }

    socket.ping()
  }
}

const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
heartbeatInterval.unref()

// --- Room TTL: close orphaned rooms where host has been inactive ---
const roomLastActivity = new Map()

function touchRoomActivity(roomId) {
  roomLastActivity.set(roomId, Date.now())
}

function checkRoomTTL() {
  const now = Date.now()
  for (const [roomId, lastActivity] of roomLastActivity) {
    if (now - lastActivity > ROOM_TTL_MS) {
      console.log(`[ttl] Closing orphaned room ${roomId} after ${Math.round(ROOM_TTL_MS / 1000)}s of inactivity`)
      closeRoom(roomId)
      roomLastActivity.delete(roomId)
    }
  }
}

const roomTtlInterval = setInterval(checkRoomTTL, 60_000)
roomTtlInterval.unref()

app.use((request, response, next) => {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : null
  response.setHeader('Access-Control-Allow-Origin', origin || '*')
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
})

app.use(express.json())

app.get('/api/health', (_request, response) => {
  const memoryUsage = process.memoryUsage()
  response.json({
    ok: true,
    rooms: rooms.size,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
    }
  })
})

app.get('/api/rooms/:roomId/join-config', (request, response) => {
  const room = getRoom(request.params.roomId)
  if (!room) {
    response.status(404).json({ message: 'Salle introuvable.' })
    return
  }

  response.json(serializePlayerRegistry(room))
})

const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    // Backpressure: skip if the socket's send buffer is already too large
    if (socket.bufferedAmount > SEND_BACKPRESSURE_THRESHOLD) {
      return
    }
    socket.send(JSON.stringify(payload))
  }
}

function broadcastRoom(room, payload) {
  send(room.host, payload)
  for (const player of room.players.values()) {
    send(player.socket, payload)
  }
}

function broadcastToPlayers(room, payload) {
  for (const player of room.players.values()) {
    send(player.socket, payload)
  }
}

function clampDiceSides(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 6
  }

  return Math.max(2, Math.min(1000, Math.round(numericValue)))
}

function clampDiceCount(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.max(1, Math.min(100, Math.round(numericValue)))
}

function normalizePlayerColor(value, fallback) {
  const normalizedValue = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(normalizedValue) ? normalizedValue : fallback
}

function buildDiceHistoryEntry(playerId, playerName, playerColor, count, sides, modifier, isSecret, reason, successThreshold) {
  const normalizedCount = clampDiceCount(count)
  const normalizedSides = clampDiceSides(sides)
  const normalizedModifier = typeof modifier === 'number' && !isNaN(modifier) ? Math.max(-1000, Math.min(1000, Math.round(modifier))) : 0
  const normalizedReason = typeof reason === 'string' ? reason.slice(0, 100).trim() : ''
  const rolls = Array.from({ length: normalizedCount }, () => Math.floor(Math.random() * normalizedSides) + 1)
  const normalizedThreshold =
    typeof successThreshold === 'number' && Number.isFinite(successThreshold)
      ? Math.max(1, Math.min(100, Math.round(successThreshold)))
      : undefined

  return {
    id: randomUUID(),
    playerId,
    playerName,
    playerColor,
    count: normalizedCount,
    sides: normalizedSides,
    modifier: normalizedModifier,
    reason: normalizedReason || undefined,
    rolls,
    result: rolls.reduce((total, roll) => total + roll, 0) + normalizedModifier,
    isSecret: isSecret === true,
    createdAt: Date.now(),
    successThreshold: normalizedThreshold,
  }
}

function serializeDiceEntryForViewer(entry, viewerId) {
  const canSeeResult = entry.isSecret !== true || entry.playerId === viewerId || viewerId === 'host'
  return {
    id: entry.id,
    playerId: entry.playerId,
    playerName: entry.playerName,
    playerColor: entry.playerColor,
    count: entry.count,
    sides: entry.sides,
    modifier: entry.modifier,
    reason: entry.reason,
    rolls: canSeeResult ? entry.rolls : undefined,
    result: canSeeResult ? entry.result : null,
    isSecret: entry.isSecret === true,
    createdAt: entry.createdAt,
    successThreshold: entry.successThreshold,
  }
}

function sendDiceHistorySnapshot(room, socket, viewerId) {
  send(socket, {
    type: 'room:diceHistory',
    entries: room.diceHistory.map((entry) => serializeDiceEntryForViewer(entry, viewerId)),
  })
}

function broadcastDiceHistoryEntry(room, entry) {
  send(room.host, {
    type: 'room:diceHistoryEntry',
    entry: serializeDiceEntryForViewer(entry, room.hostPresence.id),
  })

  for (const player of room.players.values()) {
    send(player.socket, {
      type: 'room:diceHistoryEntry',
      entry: serializeDiceEntryForViewer(entry, player.id),
    })
  }
}

function broadcastPublicDiceRoll(room, entry) {
  broadcastRoom(room, {
    type: 'room:diceRoll',
    roll: serializeDiceEntryForViewer(entry, null),
  })
}

function getActivePing(ping) {
  if (!ping) {
    return undefined
  }

  return Date.now() - ping.at < PING_DURATION_MS ? ping : undefined
}

function serializePlayers(room) {
  const presences = []

  if (room.hostPresence) {
    presences.push({
      id: room.hostPresence.id,
      name: room.hostPresence.name,
      color: room.hostPresence.color,
      x: room.hostPresence.x,
      y: room.hostPresence.y,
      zoom: room.hostPresence.zoom,
      ping: getActivePing(room.hostPresence.ping),
      role: 'host',
    })
  }

  return presences.concat(Array.from(room.players.values()).map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    predeclaredPlayerId: player.predeclaredPlayerId ?? null,
    x: player.x,
    y: player.y,
    ping: getActivePing(player.ping),
    role: 'player',
  })))
}

function sanitizeTurnTrackerLabel(value, fallback = 'Entree') {
  const label = String(value || '').trim().slice(0, 32)
  return label || fallback
}

function sanitizeSharedTimerTitle(value, fallback = 'Timer') {
  const title = String(value || '').trim().slice(0, 40)
  return title || fallback
}

function normalizeSharedTimerDurationMs(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 60 * 1000
  }

  return Math.max(1000, Math.min(MAX_SHARED_TIMER_DURATION_MS, Math.round(numericValue)))
}

function getSharedTimerElapsedMs(timer, now = Date.now()) {
  const baseElapsed = Number.isFinite(Number(timer?.elapsedMs)) ? Math.max(0, Number(timer.elapsedMs)) : 0
  if (timer?.isPaused === true) {
    if (timer?.mode === 'countdown' && Number.isFinite(Number(timer?.durationMs))) {
      return Math.min(baseElapsed, Number(timer.durationMs))
    }

    return baseElapsed
  }

  const updatedAt = Number.isFinite(Number(timer?.updatedAt)) ? Number(timer.updatedAt) : now
  const runningElapsed = baseElapsed + Math.max(0, now - updatedAt)
  if (timer?.mode === 'countdown' && Number.isFinite(Number(timer?.durationMs))) {
    return Math.min(runningElapsed, Number(timer.durationMs))
  }

  return runningElapsed
}

function serializeSharedTimers(room) {
  const now = Date.now()
  const timers = Array.isArray(room.timers)
    ? room.timers
      .map((timer) => {
        const id = String(timer?.id || '').trim()
        if (!id) {
          return null
        }

        const mode = timer?.mode === 'stopwatch' ? 'stopwatch' : 'countdown'
        const durationMs = mode === 'countdown' ? normalizeSharedTimerDurationMs(timer?.durationMs) : null
        const elapsedMs = getSharedTimerElapsedMs({ ...timer, mode, durationMs }, now)
        const isPaused = timer?.isPaused === true

        return {
          id,
          title: sanitizeSharedTimerTitle(timer?.title, mode === 'stopwatch' ? 'Chrono' : 'Minuteur'),
          mode,
          durationMs,
          elapsedMs,
          isPaused,
          updatedAt: isPaused ? now : now,
        }
      })
      .filter(Boolean)
      .slice(0, MAX_SHARED_TIMERS)
    : []

  room.timers = timers
  return timers
}

function serializeTurnTracker(room) {
  const playerEntries = Array.from(room.players.values()).map((player) => {
    const identityId = player.predeclaredPlayerId || player.id;
    return {
      id: `player:${identityId}`,
      label: sanitizeTurnTrackerLabel(player.name, 'Joueur'),
      color: player.color,
      kind: 'player',
      playerId: identityId,
    };
  })
  const customEntries = Array.isArray(room.turnTracker?.customEntries)
    ? room.turnTracker.customEntries
      .map((entry) => {
        const id = String(entry?.id || '').trim()
        if (!id) {
          return null
        }

        return {
          id,
          label: sanitizeTurnTrackerLabel(entry.label, 'Entree'),
          color: normalizePlayerColor(entry.color, TURN_TRACKER_CUSTOM_COLOR),
          kind: 'custom',
        }
      })
      .filter(Boolean)
    : []

  const entriesById = new Map([...playerEntries, ...customEntries].map((entry) => [entry.id, entry]))
  const nextOrder = Array.isArray(room.turnTracker?.order)
    ? room.turnTracker.order.filter((entryId) => entriesById.has(entryId))
    : []

  for (const entry of [...playerEntries, ...customEntries]) {
    if (!nextOrder.includes(entry.id)) {
      nextOrder.push(entry.id)
    }
  }

  const currentEntryId = entriesById.has(room.turnTracker?.currentEntryId) ? room.turnTracker.currentEntryId : nextOrder[0] ?? null
  const round = Number.isFinite(Number(room.turnTracker?.round)) ? Math.max(1, Math.round(Number(room.turnTracker.round))) : 1

  const points = room.turnTracker?.points || {}

  room.turnTracker = {
    customEntries,
    order: nextOrder,
    currentEntryId,
    round,
    points,
  }

  return {
    entries: nextOrder.map((entryId) => {
      const entry = entriesById.get(entryId)
      if (!entry) return null
      return {
        ...entry,
        points: points[entryId] || { action: true, movement: true, intervention: true }
      }
    }).filter(Boolean),
    currentEntryId,
    round,
  }
}

function broadcastTurnTracker(room) {
  broadcastRoom(room, {
    type: 'room:turnTracker',
    turnTracker: serializeTurnTracker(room),
  })
}

function broadcastSharedTimers(room) {
  broadcastRoom(room, {
    type: 'room:timers',
    timers: serializeSharedTimers(room),
  })
}

function normalizeAudioState(message) {
  return {
    isPlaying: message?.isPlaying === true,
    isLooping: message?.isLooping === true,
    currentTime: Number.isFinite(Number(message?.currentTime)) ? Math.max(0, Number(message.currentTime)) : 0,
    updatedAt: Number.isFinite(Number(message?.updatedAt)) ? Number(message.updatedAt) : Date.now(),
  }
}

function getRoom(roomId) {
  return rooms.get(String(roomId).toUpperCase())
}

function normalizePlayerRegistry(message) {
  const predeclaredPlayers = Array.isArray(message?.predeclaredPlayers)
    ? message.predeclaredPlayers.reduce((result, player, index) => {
      const id = String(player?.id || '').trim()
      const name = String(player?.name || '').trim().slice(0, 24)
      if (!id || !name) {
        return result
      }

      result.push({
        id,
        name,
        color: normalizePlayerColor(player?.color, PLAYER_COLORS[index % PLAYER_COLORS.length]),
      })
      return result
    }, [])
    : []

  return {
    preallocationEnabled: message?.preallocationEnabled === true,
    predeclaredPlayers,
  }
}

function serializePlayerRegistry(room) {
  const connectedByIdentityId = new Map(
    Array.from(room.players.values())
      .filter((player) => player.predeclaredPlayerId)
      .map((player) => [player.predeclaredPlayerId, player.id]),
  )

  return {
    preallocationEnabled: room.playerRegistry?.preallocationEnabled === true,
    predeclaredPlayers: Array.isArray(room.playerRegistry?.predeclaredPlayers)
      ? room.playerRegistry.predeclaredPlayers.map((player) => ({
        ...player,
        connectedPlayerId: connectedByIdentityId.get(player.id) ?? null,
      }))
      : [],
  }
}

function normalizeTargetViewPolicies(message) {
  const nextPolicies = new Map()

  for (const policy of Array.isArray(message?.policies) ? message.policies : []) {
    const playerId = String(policy?.playerId || '')
    if (!playerId) {
      continue
    }

    nextPolicies.set(playerId, {
      tokenId: typeof policy?.tokenId === 'string' ? policy.tokenId : null,
      mode: policy?.mode === 'follow-host' || policy?.mode === 'locked-token' ? policy.mode : 'free',
      fixedZoom: 1,
      lockedViewSize: Number.isFinite(Number(policy?.lockedViewSize)) ? Math.max(160, Number(policy.lockedViewSize)) : 500,
      lockVisibleArea: policy?.lockVisibleArea === true,
      nightModeEnabled: policy?.nightModeEnabled === true,
      flashlightEnabled: policy?.flashlightEnabled === true,
      flashlightDistance: Number.isFinite(Number(policy?.flashlightDistance))
        ? Math.max(80, Number(policy.flashlightDistance))
        : 420,
      flashlightOpacity: Number.isFinite(Number(policy?.flashlightOpacity))
        ? Math.max(0, Math.min(1, Number(policy.flashlightOpacity)))
        : 1,
      flashlightAngle: Number.isFinite(Number(policy?.flashlightAngle))
        ? Math.max(10, Math.min(180, Number(policy.flashlightAngle)))
        : 54,
      ...(policy?.characterFileName ? { characterFileName: policy.characterFileName } : {}),
      ...(policy?.characterData ? { characterData: policy.characterData } : {}),
    })
  }

  return nextPolicies
}

function serializePhoneVirtualContacts(room) {
  return Array.from(room.phoneVirtualContacts.values()).map(vc => ({
    id: vc.id,
    name: vc.name,
    color: vc.color,
  }))
}

function broadcastPhoneVirtualContacts(room) {
  broadcastRoom(room, {
    type: 'room:phoneVirtualContacts',
    contacts: serializePhoneVirtualContacts(room),
  })
}

function resolveTargetPlayerId(room, targetPlayerId) {
  if (room.players.has(targetPlayerId)) {
    return targetPlayerId
  }

  const matchingPlayer = Array.from(room.players.values()).find((player) => player.predeclaredPlayerId === targetPlayerId)
  return matchingPlayer?.id ?? null
}

function isValidPhoneParticipant(room, id) {
  if (id === 'host') return true
  if (room.phoneVirtualContacts && room.phoneVirtualContacts.has(id)) return true
  if (resolveTargetPlayerId(room, id) !== null) return true
  return false
}

function resolveRoomViewPolicies(room) {
  const resolvedPolicies = new Map()

  for (const [targetPlayerId, policy] of room.targetViewPolicies.entries()) {
    const resolvedPlayerId = resolveTargetPlayerId(room, targetPlayerId)
    if (!resolvedPlayerId) {
      continue
    }

    resolvedPolicies.set(resolvedPlayerId, policy)
  }

  room.viewPolicies = resolvedPolicies
  return resolvedPolicies
}

function broadcastResolvedViewPolicies(room) {
  resolveRoomViewPolicies(room)
  for (const player of room.players.values()) {
    send(player.socket, { type: 'room:viewPolicy', policy: room.viewPolicies.get(player.id) ?? null })
  }
}

function getSessionIdentityId(room, session) {
  if (session.role === 'host') {
    return 'host'
  }

  const player = room?.players.get(session.playerId)
  if (!player) {
    return null
  }

  return player.predeclaredPlayerId || player.id
}

function getIdentityDisplay(room, identityId) {
  if (identityId === 'host') {
    return {
      name: room.hostPresence.name,
      color: room.hostPresence.color,
    }
  }

  const virtualContact = room.phoneVirtualContacts.get(identityId)
  if (virtualContact) {
    return {
      name: virtualContact.name,
      color: virtualContact.color,
    }
  }

  const matchingPlayer = Array.from(room.players.values()).find(
    (player) => (player.predeclaredPlayerId || player.id) === identityId,
  )
  if (matchingPlayer) {
    return {
      name: matchingPlayer.name,
      color: matchingPlayer.color,
    }
  }

  const matchingPredeclaredPlayer = Array.isArray(room.playerRegistry?.predeclaredPlayers)
    ? room.playerRegistry.predeclaredPlayers.find((player) => player.id === identityId)
    : null

  return {
    name: matchingPredeclaredPlayer?.name || 'Joueur',
    color: matchingPredeclaredPlayer?.color || PLAYER_COLORS[0],
  }
}

function serializePhoneStates(room) {
  return Array.from(room.phoneStates.entries()).map(([playerId, state]) => ({
    playerId,
    flashlightEnabled: state?.flashlightEnabled === true,
  }))
}

function broadcastPhoneStates(room) {
  const states = serializePhoneStates(room)
  broadcastRoom(room, { type: 'room:phoneStates', states })
}

function serializePhoneChatStateForViewer(room, viewerIdentityId) {
  const conversations = Array.from(room.phoneConversations.values())
    .filter((conversation) => conversation.participantIds.includes(viewerIdentityId))
    .sort((left, right) => left.createdAt - right.createdAt)

  const conversationIds = new Set(conversations.map((conversation) => conversation.id))
  const messagesByConversation = new Map()
  for (const msg of room.phoneMessages.values()) {
    if (!conversationIds.has(msg.conversationId)) continue
    const arr = messagesByConversation.get(msg.conversationId) || []
    arr.push(msg)
    messagesByConversation.set(msg.conversationId, arr)
  }

  // Cap messages per conversation to prevent unbounded growth
  const messages = []
  for (const [, msgs] of messagesByConversation) {
    msgs.sort((a, b) => a.createdAt - b.createdAt)
    const capped = msgs.length > MAX_PHONE_MESSAGES_PER_CONVERSATION
      ? msgs.slice(-MAX_PHONE_MESSAGES_PER_CONVERSATION)
      : msgs
    messages.push(...capped)
  }
  messages.sort((a, b) => a.createdAt - b.createdAt)

  return {
    conversations,
    messages,
  }
}

function sendPhoneChatState(room, socket, viewerIdentityId) {
  send(socket, {
    type: 'room:phoneChatState',
    chatState: serializePhoneChatStateForViewer(room, viewerIdentityId),
  })
}

function broadcastPhoneConversation(room, conversation) {
  for (const participantId of conversation.participantIds) {
    if (participantId === 'host') {
      sendPhoneChatState(room, room.host, 'host')
      continue
    }

    const resolvedPlayerId = resolveTargetPlayerId(room, participantId)
    const participant = resolvedPlayerId ? room.players.get(resolvedPlayerId) : null
    if (participant) {
      sendPhoneChatState(room, participant.socket, participantId)
    }
  }
}

function normalizeChatText(value) {
  return String(value || '').trim().slice(0, 4000)
}

function closeRoom(roomId) {
  const room = getRoom(roomId)
  if (!room) {
    return
  }

  for (const player of room.players.values()) {
    send(player.socket, { type: 'room:closed' })
    player.socket.close()
  }

  rooms.delete(roomId)
  roomLastActivity.delete(roomId)
}

wss.on('connection', (socket) => {
  // Initialize heartbeat tracking for this socket
  socketLastPong.set(socket, Date.now())
  socket.on('pong', () => {
    socketLastPong.set(socket, Date.now())
  })

  const session = {
    role: null,
    roomId: null,
    playerId: null,
  }

  socket.on('message', (raw) => {
    let message

    try {
      message = JSON.parse(String(raw))
    } catch {
      send(socket, { type: 'system:error', message: 'Message reseau invalide.' })
      return
    }

    // Track host activity for room TTL (any host: message counts as activity)
    if (typeof message.type === 'string' && message.type.startsWith('host:') && session.roomId) {
      touchRoomActivity(session.roomId)
    }

    if (message.type === 'host:createRoom') {
      const roomId = String(message.roomId || '').trim().toUpperCase()
      if (!roomId) {
        send(socket, { type: 'system:error', message: 'Code de salle manquant.' })
        return
      }

      if (rooms.has(roomId)) {
        send(socket, { type: 'system:error', message: 'Cette salle existe deja.' })
        return
      }

      rooms.set(roomId, {
        host: socket,
        terrain: null,
        diceHistory: [],
        audioState: {
          isPlaying: false,
          isLooping: false,
          currentTime: 0,
          updatedAt: Date.now(),
        },
        hostPresence: {
          id: 'host',
          name: 'MJ',
          color: HOST_COLOR,
          x: 48,
          y: 48,
          zoom: 1,
          ping: undefined,
        },
        playerRegistry: {
          preallocationEnabled: false,
          predeclaredPlayers: [],
        },
        phoneVirtualContacts: new Map(),
        phoneConversations: new Map(),
        phoneMessages: new Map(),
        phoneStates: new Map(),
        targetViewPolicies: new Map(),
        viewPolicies: new Map(),
        turnTracker: {
          customEntries: [],
          order: [],
          currentEntryId: null,
          round: 1,
          points: {},
        },
        timers: [],
        players: new Map(),
      })

      session.role = 'host'
      session.roomId = roomId
      touchRoomActivity(roomId)
      send(socket, { type: 'session:ready', role: 'host', roomId })
      send(socket, { type: 'room:players', players: serializePlayers(getRoom(roomId)) })
      send(socket, { type: 'room:playerRegistry', playerRegistry: serializePlayerRegistry(getRoom(roomId)) })
      send(socket, { type: 'room:audioState', audioState: getRoom(roomId).audioState })
      send(socket, { type: 'room:phoneStates', states: serializePhoneStates(getRoom(roomId)) })
      send(socket, { type: 'room:phoneVirtualContacts', contacts: serializePhoneVirtualContacts(getRoom(roomId)) })
      sendPhoneChatState(getRoom(roomId), socket, 'host')
      send(socket, { type: 'room:turnTracker', turnTracker: serializeTurnTracker(getRoom(roomId)) })
      send(socket, { type: 'room:timers', timers: serializeSharedTimers(getRoom(roomId)) })
      sendDiceHistorySnapshot(getRoom(roomId), socket, 'host')
      return
    }

    if (message.type === 'host:updatePlayerRegistry') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.playerRegistry = normalizePlayerRegistry(message)
      const validIdentityIds = new Set(room.playerRegistry.predeclaredPlayers.map((player) => player.id))
      for (const identityId of Array.from(room.phoneStates.keys())) {
        if (identityId === 'host') {
          continue
        }

        const hasConnectedPlayer = Array.from(room.players.values()).some(
          (player) => (player.predeclaredPlayerId || player.id) === identityId,
        )
        if (!validIdentityIds.has(identityId) && !hasConnectedPlayer) {
          room.phoneStates.delete(identityId)
        }
      }
      broadcastRoom(room, { type: 'room:playerRegistry', playerRegistry: serializePlayerRegistry(room) })
      broadcastPhoneStates(room)
      broadcastResolvedViewPolicies(room)
      return
    }

    if (message.type === 'host:updateViewPolicies') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.targetViewPolicies = normalizeTargetViewPolicies(message)
      broadcastResolvedViewPolicies(room)
      return
    }

    if (message.type === 'host:updateTurnTracker') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      const snapshot = serializeTurnTracker(room)
      const order = [...snapshot.entries.map((entry) => entry.id)]
      const currentIndex = snapshot.currentEntryId ? order.indexOf(snapshot.currentEntryId) : -1
      const action = String(message.action || '').trim()

      if (action === 'previous' && order.length > 0) {
        const nextIndex = currentIndex <= 0 ? order.length - 1 : currentIndex - 1
        room.turnTracker.currentEntryId = order[nextIndex] ?? null
        if (currentIndex === 0 && order.length > 0) {
          room.turnTracker.round = Math.max(1, room.turnTracker.round - 1)
        }
      } else if (action === 'next' && order.length > 0) {
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % order.length
        room.turnTracker.currentEntryId = order[nextIndex] ?? null
        if (currentIndex === order.length - 1) {
          room.turnTracker.round += 1
        }
      } else if (action === 'shuffle') {
        const nextOrder = [...order]
        for (let index = nextOrder.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1))
            ;[nextOrder[index], nextOrder[randomIndex]] = [nextOrder[randomIndex], nextOrder[index]]
        }
        room.turnTracker.order = nextOrder
        room.turnTracker.currentEntryId = nextOrder[0] ?? null
        room.turnTracker.round = 1
      } else if (action === 'setCurrent') {
        const entryId = String(message.entryId || '').trim()
        if (order.includes(entryId)) {
          room.turnTracker.currentEntryId = entryId
        }
      } else if (action === 'addCustom') {
        const label = sanitizeTurnTrackerLabel(message.label, '')
        if (label) {
          const nextEntry = {
            id: `custom:${randomUUID()}`,
            label,
            color: normalizePlayerColor(message.color, TURN_TRACKER_CUSTOM_COLOR),
          }
          room.turnTracker.customEntries = [...room.turnTracker.customEntries, nextEntry]
          room.turnTracker.order = [...room.turnTracker.order, nextEntry.id]
          if (!room.turnTracker.currentEntryId) {
            room.turnTracker.currentEntryId = nextEntry.id
          }
        }
      } else if (action === 'removeEntry') {
        const entryId = String(message.entryId || '').trim()
        room.turnTracker.customEntries = room.turnTracker.customEntries.filter((entry) => entry.id !== entryId)
        room.turnTracker.order = room.turnTracker.order.filter((currentEntryId) => currentEntryId !== entryId)
        if (room.turnTracker.currentEntryId === entryId) {
          room.turnTracker.currentEntryId = room.turnTracker.order[0] ?? null
        }
      } else if (action === 'reorder') {
        const sourceId = String(message.sourceId || '').trim()
        const targetId = String(message.targetId || '').trim()
        if (sourceId && targetId && sourceId !== targetId && order.includes(sourceId) && order.includes(targetId)) {
          const nextOrder = [...order]
          const sourceIndex = nextOrder.indexOf(sourceId)
          nextOrder.splice(sourceIndex, 1)
          const targetIndex = nextOrder.indexOf(targetId)
          // Insert before targetId if source comes from below, or after if we want exact swap, but standard drag and drop usually places the source at the target's old index.
          nextOrder.splice(targetIndex, 0, sourceId)
          room.turnTracker.order = nextOrder
        }
      } else if (action === 'togglePoint') {
        const entryId = String(message.entryId || '').trim()
        const pointType = String(message.pointType || '').trim()
        if (entryId && (pointType === 'action' || pointType === 'movement' || pointType === 'intervention')) {
          const currentPoints = room.turnTracker.points?.[entryId] || { action: true, movement: true, intervention: true }
          room.turnTracker.points = {
            ...(room.turnTracker.points || {}),
            [entryId]: {
              ...currentPoints,
              [pointType]: !currentPoints[pointType]
            }
          }
        }
      } else if (action === 'resetPoints') {
        room.turnTracker.points = {}
      }

      broadcastTurnTracker(room)
      return
    }

    if (message.type === 'host:updateTimers') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      const action = String(message.action || '').trim()
      const timers = serializeSharedTimers(room)

      if (action === 'create') {
        if (timers.length >= MAX_SHARED_TIMERS) {
          broadcastSharedTimers(room)
          return
        }

        const mode = message.mode === 'stopwatch' ? 'stopwatch' : 'countdown'
        const nextTimer = {
          id: `timer:${randomUUID()}`,
          title: sanitizeSharedTimerTitle(message.title, mode === 'stopwatch' ? 'Chrono' : 'Minuteur'),
          mode,
          durationMs: mode === 'countdown' ? normalizeSharedTimerDurationMs(message.durationMs) : null,
          elapsedMs: 0,
          isPaused: false,
          updatedAt: Date.now(),
        }

        room.timers = [...timers, nextTimer]
      } else if (action === 'togglePause') {
        const timerId = String(message.timerId || '').trim()
        const now = Date.now()
        room.timers = timers.map((timer) => {
          if (timer.id !== timerId) {
            return timer
          }

          const elapsedMs = getSharedTimerElapsedMs(timer, now)
          return {
            ...timer,
            elapsedMs,
            isPaused: !timer.isPaused,
            updatedAt: now,
          }
        })
      } else if (action === 'remove') {
        const timerId = String(message.timerId || '').trim()
        room.timers = timers.filter((timer) => timer.id !== timerId)
      }

      broadcastSharedTimers(room)
      return
    }

    if (message.type === 'host:phoneCreateVirtualContact') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') return

      const contact = {
        id: `vc:${randomUUID()}`,
        name: String(message.name || '').trim().slice(0, 48),
        color: normalizePlayerColor(message.color, '#d48b2a'),
      }
      room.phoneVirtualContacts.set(contact.id, contact)
      broadcastPhoneVirtualContacts(room)
      return
    }

    if (message.type === 'host:phoneUpdateVirtualContact') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') return

      const contact = room.phoneVirtualContacts.get(message.id)
      if (contact) {
        contact.name = String(message.name || contact.name).trim().slice(0, 48)
        contact.color = normalizePlayerColor(message.color, contact.color)
        broadcastPhoneVirtualContacts(room)
      }
      return
    }

    if (message.type === 'host:phoneDeleteVirtualContact') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') return

      room.phoneVirtualContacts.delete(message.id)
      broadcastPhoneVirtualContacts(room)
      return
    }

    if (message.type === 'host:updateTerrain') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      if (raw.length > 30 * 1024 * 1024) {
        send(socket, { type: 'system:error', message: 'Le terrain depasse la taille maximale (30MB).' })
        return
      }

      room.terrain = message.terrain
      for (const player of room.players.values()) {
        send(player.socket, { type: 'room:terrain', terrain: room.terrain })
      }
      return
    }

    if (message.type === 'host:syncItem') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host' || !message.item || !room.terrain) {
        return
      }

      const nextItem = message.item
      const existingIndex = room.terrain.items.findIndex((item) => item.id === nextItem.id)

      if (existingIndex === -1) {
        room.terrain.items.push(nextItem)
      } else {
        room.terrain.items[existingIndex] = nextItem
      }

      for (const player of room.players.values()) {
        send(player.socket, { type: 'room:itemSynced', item: nextItem })
      }
      return
    }

    if (message.type === 'host:removeItem') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host' || !room.terrain) {
        return
      }

      const itemId = String(message.itemId || '')
      if (!itemId) {
        return
      }

      room.terrain.items = room.terrain.items.filter((item) => item.id !== itemId)
      for (const player of room.players.values()) {
        send(player.socket, { type: 'room:itemRemoved', itemId })
      }
      return
    }

    if (message.type === 'host:cursor') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.hostPresence.x = Number(message.x) || 0
      room.hostPresence.y = Number(message.y) || 0
      room.hostPresence.zoom = Number.isFinite(Number(message.zoom)) ? Number(message.zoom) : room.hostPresence.zoom
      // Don't broadcast cursor back to host — they already know their position
      broadcastToPlayers(room, {
        type: 'room:cursor',
        player: {
          id: room.hostPresence.id,
          name: room.hostPresence.name,
          color: room.hostPresence.color,
          x: room.hostPresence.x,
          y: room.hostPresence.y,
          zoom: room.hostPresence.zoom,
          ping: getActivePing(room.hostPresence.ping),
          role: 'host',
        },
      })
      return
    }

    if (message.type === 'host:updateViewport') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.hostPresence.zoom = Number.isFinite(Number(message.zoom)) ? Number(message.zoom) : room.hostPresence.zoom
      // Don't broadcast viewport update back to host
      broadcastToPlayers(room, {
        type: 'room:cursor',
        player: {
          id: room.hostPresence.id,
          name: room.hostPresence.name,
          color: room.hostPresence.color,
          x: room.hostPresence.x,
          y: room.hostPresence.y,
          zoom: room.hostPresence.zoom,
          ping: getActivePing(room.hostPresence.ping),
          role: 'host',
        },
      })
      return
    }

    if (message.type === 'host:updateAudioState') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.audioState = normalizeAudioState(message.audioState)
      broadcastRoom(room, {
        type: 'room:audioState',
        audioState: room.audioState,
      })
      return
    }

    if (message.type === 'host:phoneChatCreateConversation' || message.type === 'player:phoneChatCreateConversation') {
      const room = getRoom(session.roomId)
      const senderIdentityId = room ? getSessionIdentityId(room, session) : null
      if (!room || !senderIdentityId) {
        return
      }

      const requestedParticipantIds = Array.isArray(message.participantIds)
        ? message.participantIds.map((participantId) => String(participantId || '').trim()).filter(Boolean)
        : []
      const externalTargetName = String(message.externalTargetName || '').trim().slice(0, 48)
      const requestedTitle = String(message.title || '').trim().slice(0, 48)

      let conversation = null
      if (externalTargetName && senderIdentityId !== 'host') {
        const participantIds = Array.from(
          new Set(
            [senderIdentityId, 'host']
              .concat(
                requestedParticipantIds.filter((participantId) =>
                  isValidPhoneParticipant(room, participantId),
                ),
              )
              .filter(Boolean),
          ),
        )
        const npcKey = `npc:${senderIdentityId}:${externalTargetName.toLowerCase()}:${participantIds.join(':')}`
        conversation = room.phoneConversations.get(npcKey) || {
          id: npcKey,
          kind: 'npc',
          title: requestedTitle || externalTargetName,
          participantIds,
          creatorId: senderIdentityId,
          externalTargetName,
          createdAt: Date.now(),
        }
      } else {
        const participantIds = Array.from(
          new Set(
            [senderIdentityId]
              .concat(
                requestedParticipantIds.filter((participantId) =>
                  isValidPhoneParticipant(room, participantId),
                ),
              )
              .filter(Boolean),
          ),
        )

        if (participantIds.length < 2) {
          send(socket, { type: 'system:error', message: 'Choisis au moins un destinataire.' })
          return
        }

        if (externalTargetName && senderIdentityId === 'host') {
          const npcKey = `npc:host:${externalTargetName.toLowerCase()}:${participantIds.join(':')}`
          conversation = room.phoneConversations.get(npcKey) || {
            id: npcKey,
            kind: 'npc',
            title: requestedTitle || externalTargetName,
            participantIds,
            creatorId: senderIdentityId,
            externalTargetName,
            createdAt: Date.now(),
          }
        } else {
          const directConversationKey = `direct:${[...participantIds].sort().join(':')}`
          const nextKind = participantIds.length === 2 ? 'direct' : 'group'
          const existingConversation =
            nextKind === 'direct'
              ? room.phoneConversations.get(directConversationKey) || null
              : null

          conversation =
            existingConversation || {
              id: nextKind === 'direct' ? directConversationKey : randomUUID(),
              kind: nextKind,
              title:
                requestedTitle ||
                participantIds
                  .filter((participantId) => participantId !== senderIdentityId)
                  .map((participantId) => getIdentityDisplay(room, participantId).name)
                  .join(', '),
              participantIds,
              creatorId: senderIdentityId,
              externalTargetName: null,
              createdAt: Date.now(),
            }
        }
      }

      room.phoneConversations.set(conversation.id, conversation)

      // Cap conversations to prevent unbounded memory growth (LRU eviction)
      if (room.phoneConversations.size > MAX_PHONE_CONVERSATIONS) {
        const sortedConversations = Array.from(room.phoneConversations.values())
          .sort((a, b) => a.createdAt - b.createdAt)
        const toRemove = sortedConversations.slice(0, room.phoneConversations.size - MAX_PHONE_CONVERSATIONS)
        for (const oldConv of toRemove) {
          room.phoneConversations.delete(oldConv.id)
          // Also clean up messages belonging to this conversation
          for (const [msgId, msg] of room.phoneMessages) {
            if (msg.conversationId === oldConv.id) {
              room.phoneMessages.delete(msgId)
            }
          }
        }
      }

      broadcastPhoneConversation(room, conversation)
      return
    }

    if (message.type === 'host:phoneChatSendMessage' || message.type === 'player:phoneChatSendMessage') {
      const room = getRoom(session.roomId)
      const senderIdentityId = room ? getSessionIdentityId(room, session) : null
      if (!room || !senderIdentityId) {
        return
      }

      const conversationId = String(message.conversationId || '').trim()
      const text = normalizeChatText(message.text)
      const conversation = room.phoneConversations.get(conversationId)
      if (!conversation || !conversation.participantIds.includes(senderIdentityId) || !text) {
        return
      }

      const identity = getIdentityDisplay(room, senderIdentityId)
      const isNpcHostReply = conversation.kind === 'npc' && senderIdentityId === 'host'
      let authorName = isNpcHostReply ? conversation.externalTargetName || conversation.title || identity.name : identity.name
      let authorColor = isNpcHostReply ? '#d48b2a' : identity.color

      if (session.role === 'host' && message.authorOverride) {
        authorName = String(message.authorOverride.name || authorName).trim()
        authorColor = String(message.authorOverride.color || authorColor).trim()
      }
      const phoneMessage = {
        id: randomUUID(),
        conversationId,
        authorId: senderIdentityId,
        authorName,
        authorColor,
        text,
        createdAt: Date.now(),
      }

      room.phoneMessages.set(phoneMessage.id, phoneMessage)

      // Trim old messages for this conversation to cap memory
      const conversationMsgIds = []
      for (const [id, msg] of room.phoneMessages) {
        if (msg.conversationId === conversationId) {
          conversationMsgIds.push({ id, createdAt: msg.createdAt })
        }
      }
      if (conversationMsgIds.length > MAX_PHONE_MESSAGES_PER_CONVERSATION) {
        conversationMsgIds.sort((a, b) => a.createdAt - b.createdAt)
        const toRemove = conversationMsgIds.slice(0, conversationMsgIds.length - MAX_PHONE_MESSAGES_PER_CONVERSATION)
        for (const entry of toRemove) {
          room.phoneMessages.delete(entry.id)
        }
      }

      for (const participantId of conversation.participantIds) {
        if (participantId === 'host') {
          send(room.host, { type: 'room:phoneChatNewMessage', message: phoneMessage })
          continue
        }

        const resolvedPlayerId = resolveTargetPlayerId(room, participantId)
        const participant = resolvedPlayerId ? room.players.get(resolvedPlayerId) : null
        if (participant) {
          send(participant.socket, { type: 'room:phoneChatNewMessage', message: phoneMessage })
        }
      }
      return
    }

    if (message.type === 'player:updateCharacterVitals') {
      const room = getRoom(session.roomId)
      const senderIdentityId = room ? getSessionIdentityId(room, session) : null
      if (!room || !senderIdentityId || session.role !== 'player' || !message.tokenId) {
        return
      }

      if (room.host) {
        send(room.host, {
          type: 'room:updateCharacterVitals',
          tokenId: message.tokenId,
          healthCurrent: message.healthCurrent,
          mentalCurrent: message.mentalCurrent,
          astraCurrent: message.astraCurrent,
          seq: message.seq || 0,
        })
      }
      return
    }

    if (message.type === 'host:broadcastVitals') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host' || !message.tokenId) {
        return
      }

      // Broadcast aux joueurs concernés par ce token
      for (const player of room.players.values()) {
        send(player.socket, {
          type: 'room:vitalsUpdate',
          tokenId: message.tokenId,
          healthCurrent: message.healthCurrent,
          mentalCurrent: message.mentalCurrent,
          astraCurrent: message.astraCurrent,
          seq: message.seq || 0,
        })
      }
      return
    }

    if (message.type === 'player:toggleTurnTrackerPoint') {
      const room = getRoom(session.roomId)
      const senderIdentityId = room ? getSessionIdentityId(room, session) : null
      if (!room || !senderIdentityId || session.role !== 'player') {
        return
      }

      const entryId = String(message.entryId || '').trim()
      const pointType = String(message.pointType || '').trim()

      if (entryId && (pointType === 'action' || pointType === 'movement' || pointType === 'intervention')) {
        const snapshot = serializeTurnTracker(room)
        const targetEntry = snapshot.entries.find(e => e.id === entryId)

        if (targetEntry && targetEntry.kind === 'player' && targetEntry.playerId === senderIdentityId) {
          const currentPoints = room.turnTracker.points?.[entryId] || { action: true, movement: true, intervention: true }
          room.turnTracker.points = {
            ...(room.turnTracker.points || {}),
            [entryId]: {
              ...currentPoints,
              [pointType]: !currentPoints[pointType]
            }
          }
          broadcastTurnTracker(room)
        }
      }
      return
    }

    if (message.type === 'player:updatePhoneState') {
      const room = getRoom(session.roomId)
      const senderIdentityId = room ? getSessionIdentityId(room, session) : null
      if (!room || !senderIdentityId || session.role !== 'player') {
        return
      }

      room.phoneStates.set(senderIdentityId, {
        flashlightEnabled: message.flashlightEnabled === true,
      })
      broadcastPhoneStates(room)
      return
    }

    if (message.type === 'host:ping') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      room.hostPresence.ping = {
        x: Number(message.x) || 0,
        y: Number(message.y) || 0,
        at: Date.now(),
      }

      broadcastRoom(room, {
        type: 'room:ping',
        ping: {
          playerId: room.hostPresence.id,
          x: room.hostPresence.ping.x,
          y: room.hostPresence.ping.y,
          at: room.hostPresence.ping.at,
        },
      })
      return
    }

    if (message.type === 'host:measure') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host' || !message.measure) {
        return
      }

      broadcastRoom(room, {
        type: 'room:measure',
        measure: {
          id: String(message.measure.id ?? randomUUID()),
          playerId: 'host',
          start: message.measure.start,
          end: message.measure.end,
          expiresAt: Date.now() + 3000,
        },
      })
      return
    }

    if (message.type === 'host:rollDice') {
      const room = getRoom(session.roomId)
      if (!room || session.role !== 'host') {
        return
      }

      const entry = buildDiceHistoryEntry(
        room.hostPresence.id,
        room.hostPresence.name,
        room.hostPresence.color,
        message.count,
        message.sides,
        message.modifier,
        message.secret,
        message.reason,
        message.successThreshold
      )
      room.diceHistory = [...room.diceHistory.slice(-(MAX_DICE_HISTORY - 1)), entry]
      broadcastDiceHistoryEntry(room, entry)
      if (!entry.isSecret) {
        broadcastPublicDiceRoll(room, entry)
      } else {
        send(socket, {
          type: 'room:diceRoll',
          roll: serializeDiceEntryForViewer(entry, room.hostPresence.id),
        })
      }
      return
    }

    if (message.type === 'player:join') {
      const roomId = String(message.roomId || '').trim().toUpperCase()
      const room = getRoom(roomId)
      if (!room) {
        send(socket, { type: 'system:error', message: 'Salle introuvable.' })
        return
      }

      const requestedPredeclaredPlayerId = String(message.predeclaredPlayerId || '').trim()
      const claimedPredeclaredPlayer = room.playerRegistry.preallocationEnabled
        ? room.playerRegistry.predeclaredPlayers.find((player) => player.id === requestedPredeclaredPlayerId) ?? null
        : null

      if (room.playerRegistry.preallocationEnabled) {
        if (!claimedPredeclaredPlayer) {
          send(socket, { type: 'system:error', message: 'Choisis un joueur pre-declare pour rejoindre la salle.' })
          return
        }

        const isAlreadyTaken = Array.from(room.players.values()).some(
          (player) => player.predeclaredPlayerId === claimedPredeclaredPlayer.id,
        )
        if (isAlreadyTaken) {
          send(socket, { type: 'system:error', message: 'Ce joueur pre-declare est deja pris.' })
          return
        }
      }

      const playerId = randomUUID()
      const playerCount = room.players.size
      const player = {
        id: playerId,
        socket,
        name: claimedPredeclaredPlayer?.name || String(message.name || 'Joueur').slice(0, 24),
        color: claimedPredeclaredPlayer?.color || normalizePlayerColor(message.color, PLAYER_COLORS[playerCount % PLAYER_COLORS.length]),
        predeclaredPlayerId: claimedPredeclaredPlayer?.id ?? null,
        x: 48,
        y: 48,
        role: 'player',
        ping: undefined,
      }

      room.players.set(playerId, player)
      room.phoneStates.set(player.predeclaredPlayerId || playerId, {
        flashlightEnabled: true,
      })
      session.role = 'player'
      session.roomId = roomId
      session.playerId = playerId

      send(socket, {
        type: 'session:ready',
        role: 'player',
        roomId,
        playerId,
        terrain: room.terrain,
      })

      broadcastRoom(room, { type: 'room:players', players: serializePlayers(room) })
      broadcastRoom(room, { type: 'room:playerRegistry', playerRegistry: serializePlayerRegistry(room) })
      broadcastPhoneStates(room)
      broadcastTurnTracker(room)
      broadcastSharedTimers(room)
      broadcastResolvedViewPolicies(room)
      if (room.terrain) {
        send(socket, { type: 'room:terrain', terrain: room.terrain })
      }
      send(socket, { type: 'room:audioState', audioState: room.audioState })
      send(socket, { type: 'room:phoneVirtualContacts', contacts: serializePhoneVirtualContacts(room) })
      sendPhoneChatState(room, socket, player.predeclaredPlayerId || playerId)
      send(socket, { type: 'room:viewPolicy', policy: room.viewPolicies.get(playerId) ?? null })
      send(socket, { type: 'room:turnTracker', turnTracker: serializeTurnTracker(room) })
      send(socket, { type: 'room:timers', timers: serializeSharedTimers(room) })
      sendDiceHistorySnapshot(room, socket, playerId)
      return
    }

    if (message.type === 'player:cursor') {
      const room = getRoom(session.roomId)
      const player = room?.players.get(session.playerId)
      if (!room || !player) {
        return
      }

      player.x = Number(message.x) || 0
      player.y = Number(message.y) || 0
      broadcastRoom(room, {
        type: 'room:cursor',
        player: {
          id: player.id,
          name: player.name,
          color: player.color,
          x: player.x,
          y: player.y,
          ping: getActivePing(player.ping),
          role: 'player',
        },
      })
      return
    }

    if (message.type === 'player:ping') {
      const room = getRoom(session.roomId)
      const player = room?.players.get(session.playerId)
      if (!room || !player) {
        return
      }

      player.ping = {
        x: Number(message.x) || 0,
        y: Number(message.y) || 0,
        at: Date.now(),
      }

      broadcastRoom(room, {
        type: 'room:ping',
        ping: {
          playerId: player.id,
          x: player.ping.x,
          y: player.ping.y,
          at: player.ping.at,
        },
      })
      return
    }

    if (message.type === 'player:measure') {
      const room = getRoom(session.roomId)
      const player = room?.players.get(session.playerId)
      if (!room || !player || !message.measure) {
        return
      }

      broadcastRoom(room, {
        type: 'room:measure',
        measure: {
          id: String(message.measure.id ?? randomUUID()),
          playerId: player.id,
          start: message.measure.start,
          end: message.measure.end,
          expiresAt: Date.now() + 3000,
        },
      })
      return
    }

    if (message.type === 'player:rollDice') {
      const room = getRoom(session.roomId)
      const player = room?.players.get(session.playerId)
      if (!room || !player) {
        return
      }

      const entry = buildDiceHistoryEntry(player.id, player.name, player.color, message.count, message.sides, message.modifier, message.secret, message.reason, message.successThreshold)
      room.diceHistory = [...room.diceHistory.slice(-(MAX_DICE_HISTORY - 1)), entry]
      broadcastDiceHistoryEntry(room, entry)
      if (!entry.isSecret) {
        broadcastPublicDiceRoll(room, entry)
      } else {
        send(room.host, {
          type: 'room:diceRoll',
          roll: serializeDiceEntryForViewer(entry, room.hostPresence.id),
        })
        send(player.socket, {
          type: 'room:diceRoll',
          roll: serializeDiceEntryForViewer(entry, player.id),
        })
      }
    }
  })

  socket.on('close', () => {
    if (session.role === 'host' && session.roomId) {
      closeRoom(session.roomId)
      return
    }

    if (session.role === 'player' && session.roomId && session.playerId) {
      const room = getRoom(session.roomId)
      if (!room) {
        return
      }

      const player = room.players.get(session.playerId)

      room.players.delete(session.playerId)
      if (player) {
        room.phoneStates.delete(player.predeclaredPlayerId || player.id)
      }
      broadcastRoom(room, { type: 'room:players', players: serializePlayers(room) })
      broadcastRoom(room, { type: 'room:playerRegistry', playerRegistry: serializePlayerRegistry(room) })
      broadcastPhoneStates(room)
      broadcastResolvedViewPolicies(room)
      broadcastTurnTracker(room)
      broadcastSharedTimers(room)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Terrain host server listening on http://localhost:${PORT}`)
  console.log(`[config] Port lu depuis config.json: ${hostConfig.port ?? 'non défini (défaut)'} → ${PORT}`)
})