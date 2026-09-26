import { BatteryFull, ChevronLeft, Flashlight, GripVertical, Home, MessageSquare, Plus, Power, Smartphone, Wifi, X } from 'lucide-react'
import type { CSSProperties, FormEvent, PointerEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { PhoneChatConversation, PhoneChatMessage } from '../types/terrain'

type PhoneContactOption = {
  id: string
  name: string
  color: string
  role: 'host' | 'player' | 'npc'
}

type PhoneModuleProps = {
  role: 'host' | 'player' | 'npc'
  viewerIdentityId: string | null
  isOpen: boolean
  onToggleOpen: () => void
  conversations: PhoneChatConversation[]
  messages: PhoneChatMessage[]
  unreadConversationIds: string[]
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onCreateConversation: (payload: {
    participantIds: string[]
    title: string
    externalTargetName: string
  }) => void
  onSendMessage: (conversationId: string, text: string, authorOverride?: { name: string; color: string }) => void
  contacts: PhoneContactOption[]
  canUseFlashlightApp: boolean
  flashlightEnabled: boolean
  onToggleFlashlight: () => void
  style?: CSSProperties
  onDragHandlePointerDown?: (e: PointerEvent<HTMLElement>) => void
}

type PhoneAppTab = 'chat' | 'flashlight'
type PhoneLauncherAction = PhoneAppTab | 'close'

export function PhoneModule({
  role,
  viewerIdentityId,
  isOpen,
  onToggleOpen,
  conversations,
  messages,
  unreadConversationIds,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onSendMessage,
  contacts,
  canUseFlashlightApp,
  flashlightEnabled,
  onToggleFlashlight,
  style,
  onDragHandlePointerDown,
}: PhoneModuleProps) {
  const [activeApp, setActiveApp] = useState<PhoneAppTab | null>(null)
  const [chatScreen, setChatScreen] = useState<'list' | 'thread' | 'composer'>('list')
  const [groupTitleDraft, setGroupTitleDraft] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [composerSearchDraft, setComposerSearchDraft] = useState('')
  const [composerCustomNames, setComposerCustomNames] = useState<string[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  const hostAvailableIdentities = useMemo(() => {
    if (role !== 'host') return []
    const activeConversation = conversations.find((c) => c.id === activeConversationId)
    if (!activeConversation) return []
    
    const identities: { id: string, name: string, color: string, role: string }[] = [
      { id: 'host', name: 'Maitre du Jeu', color: '#ff8a3d', role: 'host' }
    ]
    
    const hostContact = contacts.find(c => c.id === 'host')
    if (hostContact) {
      identities[0] = { id: 'host', name: hostContact.name, color: hostContact.color, role: 'host' }
    }

    for (const pId of activeConversation.participantIds) {
      const contact = contacts.find(c => c.id === pId && c.role === 'npc')
      if (contact) {
        identities.push({ id: contact.id, name: contact.name, color: contact.color, role: 'npc' })
      }
    }

    if (activeConversation.externalTargetName) {
      const customNames = activeConversation.externalTargetName.split(',').map(n => n.trim()).filter(Boolean)
      for (const name of customNames) {
        if (!identities.some(i => i.name === name)) {
          identities.push({ id: `custom:${name}`, name, color: '#d48b2a', role: 'npc' })
        }
      }
    }

    return identities
  }, [role, activeConversationId, conversations, contacts])

  const [selectedHostIdentityId, setSelectedHostIdentityId] = useState<string>('host')

  useEffect(() => {
    if (hostAvailableIdentities.length > 0 && !hostAvailableIdentities.find(i => i.id === selectedHostIdentityId)) {
      const hasHost = hostAvailableIdentities.find(i => i.id === 'host')
      setSelectedHostIdentityId(hasHost ? 'host' : hostAvailableIdentities[0].id)
    }
  }, [hostAvailableIdentities, selectedHostIdentityId])

  const [phoneClockLabel, setPhoneClockLabel] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  )

  useEffect(() => {
    const updateClock = () => setPhoneClockLabel(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    updateClock()

    const intervalId = window.setInterval(updateClock, 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const sortedConversations = useMemo(() => {
    const lastMessageAtByConversationId = new Map<string, number>()
    for (const message of messages) {
      const currentValue = lastMessageAtByConversationId.get(message.conversationId) ?? 0
      if (message.createdAt > currentValue) {
        lastMessageAtByConversationId.set(message.conversationId, message.createdAt)
      }
    }

    return [...conversations].sort((left, right) => {
      const rightValue = lastMessageAtByConversationId.get(right.id) ?? right.createdAt
      const leftValue = lastMessageAtByConversationId.get(left.id) ?? left.createdAt
      return rightValue - leftValue
    })
  }, [conversations, messages])

  const unreadConversationIdSet = useMemo(() => new Set(unreadConversationIds), [unreadConversationIds])
  const latestMessageByConversationId = useMemo(() => {
    const latestByConversationId = new Map<string, PhoneChatMessage>()
    for (const message of messages) {
      const currentMessage = latestByConversationId.get(message.conversationId)
      if (!currentMessage || message.createdAt > currentMessage.createdAt) {
        latestByConversationId.set(message.conversationId, message)
      }
    }
    return latestByConversationId
  }, [messages])

  const activeConversation = sortedConversations.find((conversation) => conversation.id === activeConversationId) ?? null
  const activeMessages = useMemo(
    () =>
      activeConversation
        ? messages
            .filter((message) => message.conversationId === activeConversation.id)
            .sort((left, right) => left.createdAt - right.createdAt)
        : [],
    [activeConversation, messages],
  )
  const unreadNotificationConversation = useMemo(
    () => sortedConversations.find((conversation) => unreadConversationIdSet.has(conversation.id)) ?? null,
    [sortedConversations, unreadConversationIdSet],
  )
  const unreadCount = unreadConversationIds.length

  useEffect(() => {
    if (activeApp !== 'chat') {
      setChatScreen('list')
      return
    }

    if (chatScreen === 'thread' && !activeConversation) {
      setChatScreen('list')
    }
  }, [activeApp, activeConversation, chatScreen])

  useEffect(() => {
    if (activeApp === 'chat' && chatScreen === 'thread' && activeConversation) {
      onSelectConversation(activeConversation.id)
    }
  }, [activeApp, activeConversation, chatScreen, activeMessages.length, onSelectConversation])

  const visibleApps = useMemo(
    () => [
      {
        id: 'chat' as PhoneLauncherAction,
        label: 'Messages',
        icon: MessageSquare,
        accentClassName: 'chat',
      },
      ...(role === 'player'
        ? [
            {
              id: 'flashlight' as PhoneLauncherAction,
              label: 'Lampe',
              icon: Flashlight,
              accentClassName: 'flashlight',
            },
          ]
        : []),
      {
        id: 'close' as PhoneLauncherAction,
        label: 'Fermer',
        icon: Power,
        accentClassName: 'close',
      },
    ],
    [role],
  )

  function toggleContactSelection(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId) ? current.filter((entry) => entry !== contactId) : [...current, contactId],
    )
  }

  function addCustomName(name: string) {
    if (!name || composerCustomNames.includes(name)) return
    setComposerCustomNames([...composerCustomNames, name])
    setComposerSearchDraft('')
  }

  function removeCustomName(name: string) {
    setComposerCustomNames(current => current.filter(n => n !== name))
  }

  function handleCreateConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (composerCustomNames.length === 0 && selectedContactIds.length === 0) {
      return
    }

    const trimmedTitle = groupTitleDraft.trim()
    const externalTargetName = composerCustomNames.join(', ')

    onCreateConversation({
      participantIds: selectedContactIds,
      title: trimmedTitle || (composerCustomNames.length > 0 ? externalTargetName : ''),
      externalTargetName,
    })
    setChatScreen('list')
    setGroupTitleDraft('')
    setComposerSearchDraft('')
    setComposerCustomNames([])
    setSelectedContactIds([])
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeConversation) {
      return
    }

    const trimmedMessage = messageDraft.trim()
    if (!trimmedMessage) {
      return
    }

    let authorOverride = undefined
    if (role === 'host') {
      const identity = hostAvailableIdentities.find(i => i.id === selectedHostIdentityId)
      if (identity && identity.id !== 'host') {
        authorOverride = { name: identity.name, color: identity.color }
      }
    }

    onSendMessage(activeConversation.id, trimmedMessage, authorOverride)
    setMessageDraft('')
  }

  function openApp(appId: PhoneAppTab) {
    setActiveApp(appId)
    if (appId === 'chat') {
      setChatScreen('list')
    }
  }

  function triggerLauncherAction(actionId: PhoneLauncherAction) {
    if (actionId === 'close') {
      onToggleOpen()
      return
    }

    openApp(actionId)
  }

  function closeCurrentApp() {
    setActiveApp(null)
    setChatScreen('list')
    setGroupTitleDraft('')
    setComposerSearchDraft('')
    setComposerCustomNames([])
    setSelectedContactIds([])
  }

  function handleAppBack() {
    if (activeApp === 'chat' && (chatScreen === 'thread' || chatScreen === 'composer')) {
      setChatScreen('list')
      return
    }

    closeCurrentApp()
  }

  function handleAndroidBack() {
    if (activeApp) {
      handleAppBack()
      return
    }

    onToggleOpen()
  }

  function handleAndroidHome() {
    if (activeApp) {
      closeCurrentApp()
    }
  }

  function openConversation(conversationId: string) {
    onSelectConversation(conversationId)
    setChatScreen('thread')
  }

  function openUnreadNotification() {
    if (!unreadNotificationConversation) {
      return
    }

    setActiveApp('chat')
    openConversation(unreadNotificationConversation.id)
  }

  const chatHeaderTitle = chatScreen === 'thread' && activeConversation ? activeConversation.title : chatScreen === 'composer' ? 'Nouvelle discussion' : 'Messages'
  const chatHeaderKicker = chatScreen === 'thread' ? 'Conversation' : chatScreen === 'composer' ? 'Creation' : 'Application'
  const chatHeaderHelper =
    chatScreen === 'thread' && activeConversation
      ? activeConversation.kind === 'npc'
        ? 'PNJ / MJ'
        : activeConversation.kind === 'group'
          ? 'Groupe'
          : 'Direct'
      : chatScreen === 'composer'
        ? 'Ajouter des participants'
        : unreadCount > 0
          ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
          : role === 'host'
            ? 'Telephone MJ'
            : 'Telephone joueur'

  return (
    <aside className={isOpen ? 'phone-module open' : 'phone-module'} style={style}>
      {!isOpen ? (
        <div className="phone-module-closed-wrapper">
          <div
            className="phone-module-drag-grip"
            onPointerDown={onDragHandlePointerDown}
            title="Déplacer le téléphone"
          >
            <GripVertical width={14} height={14} strokeWidth={2.2} />
          </div>
          <button type="button" className="phone-module-toggle card surface-base" onClick={onToggleOpen}>
            <Smartphone className="phone-toggle-icon" strokeWidth={2.2} />
            <div>
              <span className="phone-module-kicker">Telephone</span>
              <strong>{role === 'host' ? 'MJ' : 'Joueur'}</strong>
              {unreadCount > 0 ? <span className="phone-module-toggle-notification">{unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}</span> : null}
            </div>
            {unreadCount > 0 ? <span className="phone-notification-badge">{unreadCount}</span> : null}
          </button>
        </div>
      ) : (
        <>
          <div className="phone-module-shell card surface-base">
            <div className="phone-module-notch" aria-hidden="true" />
            <div
              className="phone-module-statusbar"
              onPointerDown={onDragHandlePointerDown}
              style={{ cursor: onDragHandlePointerDown ? 'grab' : undefined }}
            >
              <strong>{phoneClockLabel}</strong>
              <div className="phone-module-status-icons" aria-hidden="true">
                <span className="phone-module-status-pill">4G</span>
                <Wifi className="phone-status-icon" strokeWidth={2.2} />
                <BatteryFull className="phone-status-icon" strokeWidth={2.2} />
              </div>
            </div>

            <div className="phone-module-screen">
              {activeApp ? (
                <div className="phone-app-view">
                  <div className="phone-app-header">
                    <button type="button" className="ghost compact-icon-button" onClick={handleAppBack}>
                      <ChevronLeft className="button-icon" strokeWidth={2.2} />
                    </button>
                    <div className="phone-app-header-copy">
                      <span className="phone-module-kicker">{activeApp === 'chat' ? chatHeaderKicker : 'Application'}</span>
                      <strong>{activeApp === 'chat' ? chatHeaderTitle : 'Lampe'}</strong>
                      <span className="phone-app-header-helper">{activeApp === 'chat' ? chatHeaderHelper : 'Lampe de poche'}</span>
                    </div>
                    {activeApp === 'chat' && chatScreen === 'list' ? (
                      <button
                        type="button"
                        className="secondary compact-icon-button"
                        onClick={() => setChatScreen('composer')}
                      >
                        <Plus className="button-icon" strokeWidth={2.2} />
                      </button>
                    ) : (
                      <span className="phone-app-header-spacer" aria-hidden="true" />
                    )}
                  </div>

                  {activeApp === 'chat' ? (
                    <div className="phone-app-body">
                      {chatScreen === 'composer' ? (
                        <div className="phone-chat-composer-view">
                          <form className="phone-chat-composer" onSubmit={handleCreateConversation}>
                            <div className="phone-composer-to-field">
                              <span className="to-label">A :</span>
                              <div className="phone-composer-chips">
                                {selectedContactIds.map(id => {
                                  const contact = contacts.find(c => c.id === id)
                                  return contact ? (
                                    <button key={id} type="button" className="phone-chip" onClick={() => toggleContactSelection(id)}>
                                      <span className="swatch" style={{ backgroundColor: contact.color }} />
                                      <span>{contact.name}</span>
                                      <X size={12} />
                                    </button>
                                  ) : null
                                })}
                                {composerCustomNames.map(name => (
                                  <button key={name} type="button" className="phone-chip npc" onClick={() => removeCustomName(name)}>
                                    <span>{name} (PNJ)</span>
                                    <X size={12} />
                                  </button>
                                ))}
                                <input
                                  value={composerSearchDraft}
                                  placeholder={selectedContactIds.length + composerCustomNames.length === 0 ? "Taper un nom..." : ""}
                                  onChange={(event) => setComposerSearchDraft(event.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && composerSearchDraft.trim()) {
                                      e.preventDefault();
                                      addCustomName(composerSearchDraft.trim());
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            {(selectedContactIds.length + composerCustomNames.length > 1 || composerCustomNames.length > 0) && (
                              <div className="phone-composer-title-field">
                                <input
                                  value={groupTitleDraft}
                                  placeholder="Titre du groupe (optionnel)"
                                  onChange={(event) => setGroupTitleDraft(event.target.value)}
                                />
                              </div>
                            )}

                            <div className="phone-chat-contact-picker">
                              {composerSearchDraft.trim().length > 0 && !composerCustomNames.includes(composerSearchDraft.trim()) && (
                                <button
                                  type="button"
                                  className="phone-chat-contact-option add-custom-npc"
                                  onClick={() => addCustomName(composerSearchDraft.trim())}
                                >
                                  <div className="icon-wrapper"><Plus size={16} /></div>
                                  <div className="contact-info" style={{ flex: 1 }}>
                                    <strong>Ajouter '{composerSearchDraft.trim()}'</strong>
                                    <span>Nouveau contact PNJ</span>
                                  </div>
                                </button>
                              )}

                              {contacts.filter(c => c.name.toLowerCase().includes(composerSearchDraft.toLowerCase())).length === 0 && composerSearchDraft.trim().length === 0 ? (
                                <p className="helper">Aucun contact trouv&eacute;.</p>
                              ) : (
                                contacts
                                  .filter(c => c.name.toLowerCase().includes(composerSearchDraft.toLowerCase()))
                                  .map((contact) => (
                                  <label key={contact.id} className="phone-chat-contact-option">
                                    <span className="swatch" style={{ backgroundColor: contact.color }} />
                                    <div className="contact-info" style={{ flex: 1 }}>
                                      <strong>{contact.name}</strong>
                                      <span>{contact.role === 'host' ? 'Maitre du Jeu' : contact.role === 'npc' ? 'PNJ' : 'Joueur'}</span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={selectedContactIds.includes(contact.id)}
                                      onChange={() => toggleContactSelection(contact.id)}
                                    />
                                  </label>
                                ))
                              )}
                            </div>
                            <div className="action-row phone-composer-actions">
                              <button type="submit" disabled={selectedContactIds.length + composerCustomNames.length === 0} className="primary full-width">
                                Creer
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : chatScreen === 'list' ? (
                        <div className="phone-chat-inbox">

                          <div className="phone-chat-conversation-list phone-chat-conversation-list-full">
                            {sortedConversations.length === 0 ? (
                              <div className="phone-empty-state surface-tonal">
                                <strong>Aucune conversation</strong>
                                <p className="helper">Cree un fil ou attends un nouveau message.</p>
                              </div>
                            ) : (
                              sortedConversations.map((conversation) => {
                                const lastMessage = latestMessageByConversationId.get(conversation.id) ?? null
                                const isUnread = unreadConversationIdSet.has(conversation.id)

                                return (
                                  <button
                                    key={conversation.id}
                                    type="button"
                                    className={conversation.id === activeConversation?.id ? 'phone-chat-thread active' : 'phone-chat-thread'}
                                    onClick={() => openConversation(conversation.id)}
                                  >
                                    <div className="phone-chat-thread-row">
                                      <strong>{conversation.title}</strong>
                                      {lastMessage ? (
                                        <span>
                                          {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="phone-chat-thread-row phone-chat-thread-meta">
                                      <span>
                                        {conversation.kind === 'npc' ? 'PNJ / MJ' : conversation.kind === 'group' ? 'Groupe' : 'Direct'}
                                      </span>
                                      {isUnread ? <span className="phone-chat-unread-dot">Nouveau</span> : null}
                                    </div>
                                    {lastMessage ? (
                                      <p className="phone-chat-thread-preview">
                                        {lastMessage.authorId === viewerIdentityId ? 'Toi: ' : `${lastMessage.authorName}: `}
                                        {lastMessage.text}
                                      </p>
                                    ) : null}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      ) : activeConversation ? (
                        <div className="phone-chat-thread-view">
                          <div className="phone-chat-messages">
                            {activeMessages.length === 0 ? (
                              <p className="helper">Aucun message envoye.</p>
                            ) : (
                              activeMessages.map((message) => {
                                const isOwnMessage = message.authorId === viewerIdentityId

                                return (
                                <article
                                  key={message.id}
                                  className={isOwnMessage ? 'phone-chat-message own' : 'phone-chat-message incoming'}
                                  style={{ background: `color-mix(in srgb, ${message.authorColor} ${isOwnMessage ? '35%' : '15%'}, var(--md-sys-color-surface-container-${isOwnMessage ? 'highest' : 'high'}))` }}
                                >
                                  <header>
                                    <strong style={{ color: message.authorColor }}>{message.authorName}</strong>
                                    <span>
                                      {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </header>
                                  <p>{message.text}</p>
                                </article>
                              )})
                            )}
                          </div>
                          {hostAvailableIdentities.length > 1 && (
                            <div style={{ padding: '0 12px', marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Repondre en tant que :</span>
                              {hostAvailableIdentities.map(idty => (
                                <button
                                  key={idty.id}
                                  type="button"
                                  onClick={() => setSelectedHostIdentityId(idty.id)}
                                  className={`phone-chip ${idty.role === 'npc' || idty.id.startsWith('custom:') ? 'npc' : ''}`}
                                  style={{
                                    border: selectedHostIdentityId === idty.id ? `2px solid ${idty.color}` : undefined,
                                    background: selectedHostIdentityId === idty.id ? `color-mix(in srgb, ${idty.color} 12%, var(--md-sys-color-surface-container-highest))` : undefined,
                                    padding: '2px 8px'
                                  }}
                                >
                                  <div className="swatch" style={{ background: idty.color, width: 8, height: 8 }} />
                                  {idty.name}
                                </button>
                              ))}
                            </div>
                          )}
                          <form className="phone-chat-send-row" onSubmit={handleSendMessage}>
                            <textarea
                              value={messageDraft}
                              onChange={(e) => setMessageDraft(e.target.value)}
                              placeholder="Envoyer un message"
                              rows={Math.min(3, Math.max(1, messageDraft.split('\n').length))}
                              style={{ resize: 'none' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage(e as any)
                                }
                              }}
                            />
                            <button type="submit" disabled={!messageDraft.trim()}>
                              Envoyer
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="phone-empty-state surface-tonal">
                          <strong>Choisis une conversation</strong>
                          <p className="helper">Selectionne un fil de discussion ou cree une nouvelle conversation.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="phone-app-body phone-app-body-centered">
                      <div className="phone-flashlight-app">
                      {canUseFlashlightApp ? (
                        <>
                          <div className={flashlightEnabled ? 'phone-flashlight-icon is-on' : 'phone-flashlight-icon'}>
                            <Flashlight className="phone-app-glyph" strokeWidth={2.2} />
                          </div>
                          <p className="helper">
                            Controle la lampe de poche du telephone. Quand elle est active, la vision de lampe de poche s allume.
                          </p>
                          <button
                            type="button"
                            className={flashlightEnabled ? 'phone-flashlight-toggle is-on' : 'phone-flashlight-toggle'}
                            onClick={onToggleFlashlight}
                          >
                            {flashlightEnabled ? 'Lampe ON' : 'Lampe OFF'}
                          </button>
                        </>
                      ) : (
                        <div className="phone-empty-state surface-tonal">
                          <strong>Lampe indisponible</strong>
                          <p className="helper">Le MJ n a pas active la lampe de poche pour ce personnage.</p>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="phone-home-screen">
                  <div className="phone-home-copy">
                    <span className="phone-module-kicker">Ecran d accueil</span>
                    <strong>{role === 'host' ? 'Telephone MJ' : 'Telephone joueur'}</strong>
                    <span>{phoneClockLabel}</span>
                  </div>
                  {unreadNotificationConversation ? (
                    <button type="button" className="phone-notification-card surface-tonal" onClick={openUnreadNotification}>
                      <span className="phone-notification-card-kicker">Nouveau message</span>
                      <strong>{unreadNotificationConversation.title}</strong>
                      <span>
                        {latestMessageByConversationId.get(unreadNotificationConversation.id)?.authorId === viewerIdentityId
                          ? 'Toi'
                          : latestMessageByConversationId.get(unreadNotificationConversation.id)?.authorName ?? 'Message'}
                      </span>
                    </button>
                  ) : null}
                  <div className="phone-app-grid">
                    {visibleApps.map((app) => {
                      const Icon = app.icon
                      const isChatApp = app.id === 'chat'

                      return (
                        <button
                          key={app.id}
                          type="button"
                          className={`phone-app-tile ${app.accentClassName}`}
                          onClick={() => triggerLauncherAction(app.id)}
                        >
                          <span className="phone-app-icon-shell">
                            <Icon className="phone-app-glyph" strokeWidth={2.2} />
                            {isChatApp && unreadCount > 0 ? <span className="phone-notification-badge">{unreadCount}</span> : null}
                          </span>
                          <span>{app.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="phone-module-nav" aria-label="Navigation telephone">
              <button type="button" className="phone-module-nav-button" onClick={handleAndroidBack}>
                <ChevronLeft className="phone-status-icon" strokeWidth={2.2} />
                <span>Retour</span>
              </button>
              <button type="button" className="phone-module-nav-button" onClick={handleAndroidHome}>
                <Home className="phone-status-icon" strokeWidth={2.2} />
                <span>Home</span>
              </button>
              <button type="button" className="phone-module-nav-button" onClick={onToggleOpen}>
                <X className="phone-status-icon" strokeWidth={2.2} />
                <span>Fermer</span>
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
