import { useCallback, useRef, useState } from 'react'
import type {
  PlayerPhoneState,
  RoomPhoneChatState,
  PhoneChatMessage,
  PhoneChatConversation,
} from '../types/terrain'

export interface UsePhoneOptions {
  /** Returns the current WebSocket ref (or null) */
  getSocket: () => WebSocket | null
  /** Returns the current role ('host' | 'player' | null) */
  getRole: () => 'host' | 'player' | null
  /** Returns the current player identity id (for host: 'host', for player: their predeclaredPlayerId or id) */
  getCurrentPlayerIdentityId: () => string | null
  /** Returns the current player view policy (for flashlight toggle check) */
  getActivePlayerViewPolicy: () => { flashlightEnabled?: boolean } | null
  /** Set the phone open state in the parent */
  setIsPhoneOpen: (open: boolean) => void
  /** Set the active phone conversation id in the parent */
  setActivePhoneConversationId: (id: string | null | ((prev: string | null) => string | null)) => void
}

export function usePhone({
  getSocket,
  getRole,
  getCurrentPlayerIdentityId,
  getActivePlayerViewPolicy,
  setIsPhoneOpen,
  setActivePhoneConversationId,
}: UsePhoneOptions) {
  const [roomPhoneChatState, setRoomPhoneChatState] = useState<RoomPhoneChatState>({ conversations: [], messages: [] })
  const [phoneUnreadConversationIds, setPhoneUnreadConversationIds] = useState<string[]>([])
  const [playerPhoneStates, setPlayerPhoneStates] = useState<Record<string, PlayerPhoneState>>({})
  const [phoneVirtualContacts, setPhoneVirtualContacts] = useState<any[]>([])

  const phoneChatInitializedRef = useRef(false)
  const phoneViewerIdentityIdRef = useRef<string | null>(null)

  // --- Set the viewer identity id (called by parent when role/identity changes) ---
  const setPhoneViewerIdentityId = useCallback((id: string | null) => {
    phoneViewerIdentityIdRef.current = id
  }, [])

  // --- Open a conversation and mark it as read ---
  const openPhoneConversation = useCallback((conversationId: string) => {
    setActivePhoneConversationId(conversationId)
    setPhoneUnreadConversationIds((current) => current.filter((entry) => entry !== conversationId))
  }, [setActivePhoneConversationId])

  // --- Create a conversation via WebSocket ---
  const createPhoneConversation = useCallback((payload: {
    participantIds: string[]
    title: string
    externalTargetName: string
  }) => {
    const role = getRole()
    const socket = getSocket()
    if (!role || !socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    setIsPhoneOpen(true)
    setActivePhoneConversationId(null)

    socket.send(
      JSON.stringify({
        type: role === 'host' ? 'host:phoneChatCreateConversation' : 'player:phoneChatCreateConversation',
        participantIds: payload.participantIds,
        title: payload.title,
        externalTargetName: payload.externalTargetName,
      }),
    )
  }, [getSocket, getRole, setIsPhoneOpen, setActivePhoneConversationId])

  // --- Send a chat message via WebSocket ---
  const sendPhoneChatMessage = useCallback((conversationId: string, text: string, authorOverride?: { name: string; color: string }) => {
    const role = getRole()
    const socket = getSocket()
    if (!role || !socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(
      JSON.stringify({
        type: role === 'host' ? 'host:phoneChatSendMessage' : 'player:phoneChatSendMessage',
        conversationId,
        text,
        authorOverride,
      }),
    )
  }, [getSocket, getRole])

  // --- Virtual contact management (host only) ---
  const handleCreateVirtualContact = useCallback((name: string, color: string) => {
    const socket = getSocket()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'host:phoneCreateVirtualContact', name, color }))
    }
  }, [getSocket])

  const handleUpdateVirtualContact = useCallback((id: string, name: string, color: string) => {
    const socket = getSocket()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'host:phoneUpdateVirtualContact', id, name, color }))
    }
  }, [getSocket])

  const handleDeleteVirtualContact = useCallback((id: string) => {
    const socket = getSocket()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'host:phoneDeleteVirtualContact', id }))
    }
  }, [getSocket])

  // --- Toggle player phone flashlight ---
  const togglePlayerPhoneFlashlight = useCallback(() => {
    const role = getRole()
    const identityId = getCurrentPlayerIdentityId()
    const socket = getSocket()
    if (role !== 'player' || !identityId || !socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    const policy = getActivePlayerViewPolicy()
    if (policy?.flashlightEnabled !== true) {
      return
    }

    const currentValue = playerPhoneStates[identityId]?.flashlightEnabled ?? false
    const nextValue = !currentValue
    setPlayerPhoneStates((current) => ({
      ...current,
      [identityId]: {
        playerId: identityId,
        flashlightEnabled: nextValue,
      },
    }))
    socket.send(
      JSON.stringify({
        type: 'player:updatePhoneState',
        flashlightEnabled: nextValue,
      }),
    )
  }, [getSocket, getRole, getCurrentPlayerIdentityId, getActivePlayerViewPolicy, playerPhoneStates])

  // --- Handle incoming phone-related server messages ---
  const handlePhoneServerMessage = useCallback((message: Record<string, unknown>): boolean => {
    if (message.type === 'room:phoneStates' && Array.isArray(message.states)) {
      const nextStates: Record<string, PlayerPhoneState> = {}
      for (const s of message.states as any[]) {
        if (s && s.playerId) {
          nextStates[s.playerId] = { playerId: s.playerId, flashlightEnabled: s.flashlightEnabled === true }
        }
      }
      setPlayerPhoneStates(nextStates)
      return true
    }

    if (message.type === 'room:phoneVirtualContacts' && Array.isArray(message.contacts)) {
      setPhoneVirtualContacts(message.contacts as any[])
      return true
    }

    if (message.type === 'room:phoneChatNewMessage' && message.message) {
      const newMessage = message.message as PhoneChatMessage
      setRoomPhoneChatState((current) => {
        setPhoneUnreadConversationIds((currentUnread) => {
          const viewerIdentityId = phoneViewerIdentityIdRef.current
          if (!phoneChatInitializedRef.current || !viewerIdentityId) {
            return currentUnread
          }
          if (newMessage.authorId !== viewerIdentityId && !currentUnread.includes(newMessage.conversationId)) {
            return [...currentUnread, newMessage.conversationId]
          }
          return currentUnread
        })

        return {
          ...current,
          messages: [...current.messages, newMessage],
        }
      })
      return true
    }

    if (message.type === 'room:phoneChatState' && message.chatState) {
      const nextChatState = message.chatState as RoomPhoneChatState
      setRoomPhoneChatState((current) => {
        const validConversationIds = new Set(nextChatState.conversations.map((conversation) => conversation.id))
        setPhoneUnreadConversationIds((currentUnread) => {
          const nextUnread = currentUnread.filter((conversationId) => validConversationIds.has(conversationId))
          const viewerIdentityId = phoneViewerIdentityIdRef.current

          if (!phoneChatInitializedRef.current || !viewerIdentityId) {
            return nextUnread
          }

          const previousLatestByConversationId = new Map<string, PhoneChatMessage>()
          for (const entry of current.messages) {
            const currentLatest = previousLatestByConversationId.get(entry.conversationId)
            if (!currentLatest || entry.createdAt > currentLatest.createdAt) {
              previousLatestByConversationId.set(entry.conversationId, entry)
            }
          }

          const nextLatestByConversationId = new Map<string, PhoneChatMessage>()
          for (const entry of nextChatState.messages) {
            const currentLatest = nextLatestByConversationId.get(entry.conversationId)
            if (!currentLatest || entry.createdAt > currentLatest.createdAt) {
              nextLatestByConversationId.set(entry.conversationId, entry)
            }
          }

          for (const [conversationId, nextLatest] of nextLatestByConversationId.entries()) {
            const previousLatest = previousLatestByConversationId.get(conversationId)
            if ((!previousLatest || nextLatest.createdAt > previousLatest.createdAt) && nextLatest.authorId !== viewerIdentityId) {
              nextUnread.push(conversationId)
            }
          }

          return Array.from(new Set(nextUnread))
        })

        return nextChatState
      })
      if (!phoneChatInitializedRef.current) {
        phoneChatInitializedRef.current = true
      }
      setActivePhoneConversationId((current) =>
        current && nextChatState.conversations.some((conversation) => conversation.id === current)
          ? current
          : nextChatState.conversations.reduce<PhoneChatConversation | null>(
            (latestConversation, conversation) =>
              !latestConversation || conversation.createdAt > latestConversation.createdAt
                ? conversation
                : latestConversation,
            null,
          )?.id ?? null,
      )
      return true
    }

    return false
  }, [setActivePhoneConversationId])

  // --- Reset on disconnect ---
  const resetPhone = useCallback(() => {
    setRoomPhoneChatState({ conversations: [], messages: [] })
    setPhoneUnreadConversationIds([])
    setPlayerPhoneStates({})
    setActivePhoneConversationId(null)
    phoneChatInitializedRef.current = false
    phoneViewerIdentityIdRef.current = null
  }, [setActivePhoneConversationId])

  return {
    roomPhoneChatState,
    phoneUnreadConversationIds,
    playerPhoneStates,
    setPlayerPhoneStates,
    phoneVirtualContacts,
    setPhoneVirtualContacts,
    phoneChatInitializedRef,
    phoneViewerIdentityIdRef,
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
  }
}

export type UsePhoneReturn = ReturnType<typeof usePhone>