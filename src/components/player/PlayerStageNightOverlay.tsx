import type { MutableRefObject } from 'react'
import { buildGeneratedAssetDataUrl } from '../../lib/terrain'
import { DEFAULT_TRANSFORM } from '../../lib/stageMath'
import type { ResolvedItem, RoomPlayer, TerrainItem } from '../../types/terrain'

export type PlayerStageNightOverlayProps = {
  isActive: boolean
  terrainWidth: number
  terrainHeight: number
  flashlightMaskId: string
  flashlightPathsRef: MutableRefObject<Record<string, SVGPathElement | null>>
  currentPlayerIdentityId: string | null
  roomPlayers: RoomPlayer[]
  lightItems: TerrainItem[]
  resolvedItems: Map<string, ResolvedItem>
  currentPlayerId: string | null
  overlayOpacity: number
}

export function PlayerStageNightOverlay({
  isActive,
  terrainWidth,
  terrainHeight,
  flashlightMaskId,
  flashlightPathsRef,
  currentPlayerIdentityId,
  roomPlayers,
  lightItems,
  resolvedItems,
  currentPlayerId,
  overlayOpacity,
}: PlayerStageNightOverlayProps) {
  if (!isActive) return null

  return (
    <svg
      className="player-night-overlay"
      viewBox={`0 0 ${terrainWidth} ${terrainHeight}`}
      aria-hidden="true"
    >
      <defs>
        <mask id={flashlightMaskId}>
          <rect x="0" y="0" width={terrainWidth} height={terrainHeight} fill="white" />
          <rect id={`mask-invalidator-${currentPlayerIdentityId ?? 'anonymous'}`} x="0" y="0" width="1" height="1" fill="white" />
          {roomPlayers.map((player) => (
            <path
              key={player.id}
              ref={(el) => { flashlightPathsRef.current[player.id] = el }}
              fill="black"
              d=""
            />
          ))}
          {lightItems.map((item) => {
            const resolved = resolvedItems.get(item.id) ?? DEFAULT_TRANSFORM
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
        id={`player-flashlight-mask-${currentPlayerId ?? 'anonymous'}-target`}
        x="0"
        y="0"
        width={terrainWidth}
        height={terrainHeight}
        fill={`rgba(0, 0, 0, ${isActive ? overlayOpacity : 0})`}
        mask={`url(#${flashlightMaskId})`}
      />
    </svg>
  )
}
