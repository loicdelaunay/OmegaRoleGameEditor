import type { RefObject } from 'react'
import { MapStatusBar } from '../shared/MapStatusBar'

export type PlayerTopBarProps = {
  stageRef: RefObject<HTMLDivElement | null>
  terrainWidth: number
  terrainHeight: number
  zoom: number
}

export function PlayerTopBar({ stageRef, terrainWidth, terrainHeight, zoom }: PlayerTopBarProps) {
  return <MapStatusBar stageRef={stageRef} terrainWidth={terrainWidth} terrainHeight={terrainHeight} zoom={zoom} />
}
