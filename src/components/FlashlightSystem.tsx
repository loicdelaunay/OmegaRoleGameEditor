import React, { useEffect, useRef } from 'react'
import type { TokenAssignment,  RoomPlayer, TerrainDocument, TerrainItem, ResolvedItem, PlayerPhoneState } from '../types/terrain'
import { clamp, getMapPoint, buildFlashlightConePath } from '../lib/math'

const DEFAULT_TRANSFORM: ResolvedItem = { x: 0, y: 0, scale: 1, rotation: 0 }

function rotatePoint(x: number, y: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

function buildResolvedItemMap(terrain: TerrainDocument) {
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
 * Vérifie rapidement s'il existe au moins une assignment de flashlight active
 * côté éditeur ou côté joueur, pour savoir si la boucle rAF doit tourner.
 */
function hasAnyActiveFlashlight(
  terrainRef: React.MutableRefObject<TerrainDocument>,
  playerTerrainRef: React.MutableRefObject<TerrainDocument>,
  playerPhoneStatesRef: React.MutableRefObject<Record<string, PlayerPhoneState>>,
): boolean {
  // Editor side
  const editorAssignments = terrainRef.current.tokenAssignments || {}
  for (const assignment of Object.values(editorAssignments)) {
    if (assignment.flashlightEnabled === true) return true
  }

  // Player side — need both assignment enabled AND player phone flashlight on
  const playerAssignments = playerTerrainRef.current.tokenAssignments || {}
  for (const assignment of Object.values(playerAssignments)) {
    if (assignment.flashlightEnabled !== true) continue
    const identityId = assignment.playerId
    const isTurnedOn = playerPhoneStatesRef.current[identityId]?.flashlightEnabled !== false
    if (isTurnedOn) return true
  }

  return false
}

export interface FlashlightSystemProps {
  currentPlayerIdentityId: string | null
  roomPlayersRef: React.MutableRefObject<RoomPlayer[]>
  playerTerrainRef: React.MutableRefObject<TerrainDocument>
  terrainRef: React.MutableRefObject<TerrainDocument>
  playerPhoneStatesRef: React.MutableRefObject<Record<string, PlayerPhoneState>>
  resolvedPlayerItemsRef: React.MutableRefObject<Map<string, ResolvedItem>>
  resolvedEditorItemsRef: React.MutableRefObject<Map<string, ResolvedItem>>
  remoteCursorPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>
  lastPlayerPointerRef: React.MutableRefObject<{ x: number; y: number } | null>
  lastEditorPointerRef: React.MutableRefObject<{ x: number; y: number } | null>
  playerStageRef: React.RefObject<HTMLDivElement | null>
  editorStageRef: React.RefObject<HTMLDivElement | null>
  flashlightPathsRef: React.MutableRefObject<Record<string, SVGPathElement | null>>
}

export function FlashlightSystem({
  currentPlayerIdentityId,
  roomPlayersRef,
  playerTerrainRef,
  terrainRef,
  playerPhoneStatesRef,
  resolvedPlayerItemsRef,
  resolvedEditorItemsRef,
  remoteCursorPositionsRef,
  lastPlayerPointerRef,
  lastEditorPointerRef,
  playerStageRef,
  editorStageRef,
  flashlightPathsRef,
}: FlashlightSystemProps) {
  // Cache for resolved item maps — only rebuild when terrain items change
  const editorCacheRef = useRef<{ itemsRef: TerrainItem[] | null; map: Map<string, ResolvedItem> }>({
    itemsRef: null,
    map: new Map(),
  })
  const playerCacheRef = useRef<{ itemsRef: TerrainItem[] | null; map: Map<string, ResolvedItem> }>({
    itemsRef: null,
    map: new Map(),
  })

  function getEditorResolvedMap(): Map<string, ResolvedItem> {
    const items = terrainRef.current.items
    if (editorCacheRef.current.itemsRef === items) return editorCacheRef.current.map
    editorCacheRef.current.itemsRef = items
    editorCacheRef.current.map = buildResolvedItemMap(terrainRef.current)
    return editorCacheRef.current.map
  }

  function getPlayerResolvedMap(): Map<string, ResolvedItem> {
    const items = playerTerrainRef.current.items
    if (playerCacheRef.current.itemsRef === items) return playerCacheRef.current.map
    playerCacheRef.current.itemsRef = items
    playerCacheRef.current.map = buildResolvedItemMap(playerTerrainRef.current)
    return playerCacheRef.current.map
  }

  useEffect(() => {
    let rafId: number
    let idleFrames = 0

    const loop = () => {
      // Fast-path: if no flashlight is active anywhere, skip heavy work.
      // Check every frame but only do it cheaply (no Map allocation).
      const hasFlashlight = hasAnyActiveFlashlight(terrainRef, playerTerrainRef, playerPhoneStatesRef)

      if (!hasFlashlight) {
        // After 3 consecutive idle frames, slow down to ~10fps polling
        idleFrames++
        if (idleFrames > 3) {
          // Clear any stale paths
          const editorAssignments = terrainRef.current.tokenAssignments || {}
          for (const tokenId of Object.keys(editorAssignments)) {
            const gmMaskEl = document.getElementById(`editor-flashlight-preview-${tokenId}`)
            const gmConeEl = document.getElementById(`editor-flashlight-preview-cone-${tokenId}`)
            if (gmMaskEl && gmMaskEl.getAttribute('d') !== '') gmMaskEl.setAttribute('d', '')
            if (gmConeEl && gmConeEl.getAttribute('d') !== '') gmConeEl.setAttribute('d', '')
          }
          for (const pathEl of Object.values(flashlightPathsRef.current)) {
            if (pathEl && pathEl.getAttribute('d') !== '') pathEl.setAttribute('d', '')
          }
          rafId = requestAnimationFrame(loop)
          return
        }
        rafId = requestAnimationFrame(loop)
        return
      }

      idleFrames = 0
      let didChangeMask = false

      // --- 1. Mettre à jour l'aperçu MJ (Vue Éditeur) ---
      // On utilise la source de vérité de l'éditeur : terrainRef
      const editorAssignments = terrainRef.current.tokenAssignments || {}
      const liveEditorResolvedItems = getEditorResolvedMap()

      for (const [tokenId, assignment] of Object.entries(editorAssignments)) {
        const gmMaskEl = document.getElementById(`editor-flashlight-preview-${tokenId}`)
        const gmConeEl = document.getElementById(`editor-flashlight-preview-cone-${tokenId}`)
        const gmOriginEl = document.getElementById(`editor-flashlight-preview-origin-${tokenId}`)

        if (assignment.flashlightEnabled !== true) {
          if (gmMaskEl && gmMaskEl.getAttribute('d') !== '') gmMaskEl.setAttribute('d', '')
          if (gmConeEl && gmConeEl.getAttribute('d') !== '') gmConeEl.setAttribute('d', '')
          continue
        }

        const token = terrainRef.current.items.find((i) => i.id === tokenId)
        const resolved = liveEditorResolvedItems.get(tokenId)
        if (!token || !resolved) {
          if (gmMaskEl && gmMaskEl.getAttribute('d') !== '') gmMaskEl.setAttribute('d', '')
          if (gmConeEl && gmConeEl.getAttribute('d') !== '') gmConeEl.setAttribute('d', '')
          continue
        }

        const originX = resolved.x + (token.width * resolved.scale) / 2
        const originY = resolved.y + (token.height * resolved.scale) / 2
        const distance = clamp(assignment.flashlightDistance ?? 400, 80, 4000)
        const angle = clamp(assignment.flashlightAngle ?? 60, 10, 180)

        let targetX = originX + distance
        let targetY = originY

        const assignedPlayer = roomPlayersRef.current.find(
          (p) => p.id === assignment.playerId || p.predeclaredPlayerId === assignment.playerId
        )

        if (assignedPlayer) {
          targetX = assignedPlayer.x
          targetY = assignedPlayer.y

          const livePos = remoteCursorPositionsRef.current.get(assignedPlayer.id)
          if (livePos) {
            targetX = livePos.x
            targetY = livePos.y
          } else if ((assignedPlayer.predeclaredPlayerId || assignedPlayer.id) === currentPlayerIdentityId) {
            if (lastEditorPointerRef.current && editorStageRef.current) {
              const p = getMapPoint(editorStageRef.current, terrainRef.current.width, terrainRef.current.height, lastEditorPointerRef.current.x, lastEditorPointerRef.current.y)
              targetX = p.x
              targetY = p.y
            }
          }
        }

        const d = buildFlashlightConePath(originX, originY, targetX, targetY, distance, angle)

        if (gmMaskEl && gmMaskEl.getAttribute('d') !== d) gmMaskEl.setAttribute('d', d)
        if (gmConeEl && gmConeEl.getAttribute('d') !== d) gmConeEl.setAttribute('d', d)
        if (gmOriginEl) {
          gmOriginEl.setAttribute('cx', originX.toString())
          gmOriginEl.setAttribute('cy', originY.toString())
        }
      }

      // --- 2. Mettre à jour la vue Joueur ---
      // On utilise la source de vérité des joueurs : playerTerrainRef
      const playerAssignments = playerTerrainRef.current.tokenAssignments || {}
      const livePlayerResolvedItems = getPlayerResolvedMap()

      for (const player of roomPlayersRef.current) {
        const pathEl = flashlightPathsRef.current[player.id]
        if (!pathEl) continue

        const identityId = player.predeclaredPlayerId || player.id
        
        let assignment: (TokenAssignment & { tokenId: string }) | null = null
        for (const [tId, a] of Object.entries(playerAssignments)) {
          if (a.playerId === identityId) {
            assignment = { ...a, tokenId: tId }
            break
          }
        }

        if (!assignment || assignment.flashlightEnabled !== true) {
          if (pathEl.getAttribute('d') !== '') {
            pathEl.setAttribute('d', '')
            didChangeMask = true
          }
          continue
        }

        // Vérifier si le joueur a allumé sa lampe via son téléphone
        const isTurnedOn = playerPhoneStatesRef.current[identityId]?.flashlightEnabled !== false
        if (!isTurnedOn) {
          if (pathEl.getAttribute('d') !== '') {
            pathEl.setAttribute('d', '')
            didChangeMask = true
          }
          continue
        }

        const token = playerTerrainRef.current.items.find((i) => i.id === assignment!.tokenId)
        const resolved = livePlayerResolvedItems.get(assignment.tokenId)
        if (!token || !resolved) {
          if (pathEl.getAttribute('d') !== '') {
            pathEl.setAttribute('d', '')
            didChangeMask = true
          }
          continue
        }

        const originX = resolved.x + (token.width * resolved.scale) / 2
        const originY = resolved.y + (token.height * resolved.scale) / 2
        const distance = clamp(assignment.flashlightDistance ?? 400, 80, 4000)
        const angle = clamp(assignment.flashlightAngle ?? 60, 10, 180)

        let targetX = player.x
        let targetY = player.y

        const livePos = remoteCursorPositionsRef.current.get(player.id)
        if (livePos) {
          targetX = livePos.x
          targetY = livePos.y
        } else if (identityId === currentPlayerIdentityId) {
          if (lastPlayerPointerRef.current && playerStageRef.current) {
            const p = getMapPoint(playerStageRef.current, playerTerrainRef.current.width, playerTerrainRef.current.height, lastPlayerPointerRef.current.x, lastPlayerPointerRef.current.y)
            targetX = p.x
            targetY = p.y
          } else if (lastEditorPointerRef.current && editorStageRef.current) {
            const p = getMapPoint(editorStageRef.current, playerTerrainRef.current.width, playerTerrainRef.current.height, lastEditorPointerRef.current.x, lastEditorPointerRef.current.y)
            targetX = p.x
            targetY = p.y
          }
        }

        const d = buildFlashlightConePath(originX, originY, targetX, targetY, distance, angle)
        if (pathEl.getAttribute('d') !== d) {
          pathEl.setAttribute('d', d)
          didChangeMask = true
        }
      }

      // Hack to force Chrome SVG mask invalidation without opacity glitch
      // ONLY trigger if a path actually changed, otherwise it causes extreme rendering lag!
      if (didChangeMask) {
        const maskInvalidator = document.getElementById(`mask-invalidator-${currentPlayerIdentityId ?? 'anonymous'}`)
        if (maskInvalidator) {
          maskInvalidator.setAttribute('x', maskInvalidator.getAttribute('x') === '0' ? '0.001' : '0')
        }
      }

      rafId = requestAnimationFrame(loop)
    }
    
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [
    currentPlayerIdentityId,
    editorStageRef,
    flashlightPathsRef,
    lastEditorPointerRef,
    lastPlayerPointerRef,
    playerPhoneStatesRef,
    playerStageRef,
    playerTerrainRef,
    remoteCursorPositionsRef,
    resolvedEditorItemsRef,
    resolvedPlayerItemsRef,
    roomPlayersRef,
    terrainRef,
  ])

  return null
}