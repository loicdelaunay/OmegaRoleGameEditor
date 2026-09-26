import { DEFAULT_TRANSFORM, pointInPolygon } from '../../lib/stageMath'
import type { ResolvedItem, TerrainItem } from '../../types/terrain'

export type PlayerStageShadowZonesProps = {
  shadowItems: TerrainItem[]
  resolvedItems: Map<string, ResolvedItem>
  terrainWidth: number
  terrainHeight: number
  assignedToken: TerrainItem | null
  assignedTokenResolved: ResolvedItem | null
}

export function PlayerStageShadowZones({
  shadowItems,
  resolvedItems,
  terrainWidth,
  terrainHeight,
  assignedToken,
  assignedTokenResolved,
}: PlayerStageShadowZonesProps) {
  return (
    <>
      {shadowItems.map((shadowItem) => {
        const resolved = resolvedItems.get(shadowItem.id) ?? DEFAULT_TRANSFORM
        const points = shadowItem.shadowPoints ?? []

        if (points.length < 3) return null

        const assignedTokenPos = assignedTokenResolved
          ? {
            x: assignedTokenResolved.x + (assignedToken!.width * assignedTokenResolved.scale) / 2,
            y: assignedTokenResolved.y + (assignedToken!.height * assignedTokenResolved.scale) / 2,
          }
          : null

        const worldSpacePoints = points.map((p) => ({
          x: resolved.x + p.x * resolved.scale,
          y: resolved.y + p.y * resolved.scale,
        }))

        const isTokenInside = assignedTokenPos && pointInPolygon(assignedTokenPos, worldSpacePoints)
        if (isTokenInside) return null

        const polygonPoints = worldSpacePoints.map((p) => `${p.x},${p.y}`).join(' ')

        return (
          <svg
            key={`shadow-${shadowItem.id}`}
            className="shadow-zone-overlay"
            viewBox={`0 0 ${terrainWidth} ${terrainHeight}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 17,
            }}
            aria-hidden="true"
          >
            <polygon points={polygonPoints} fill="rgba(0, 0, 0, 1)" />
          </svg>
        )
      })}
    </>
  )
}
