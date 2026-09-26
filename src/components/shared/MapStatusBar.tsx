import { useEffect, useRef } from 'react'
import { getMapPoint } from '../../lib/math'

export function MapStatusBar({
  stageRef,
  terrainWidth,
  terrainHeight,
  zoom,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>
  terrainWidth: number
  terrainHeight: number
  zoom: number
}) {
  const coordsRef = useRef<HTMLSpanElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !coordsRef.current) return
    const handleMove = (e: PointerEvent) => {
      if (coordsRef.current) {
        const p = getMapPoint(stage, terrainWidth, terrainHeight, e.clientX, e.clientY)
        coordsRef.current.textContent = `X: ${Math.round(p.x)} Y: ${Math.round(p.y)}`
      }
    }
    stage.addEventListener('pointermove', handleMove, { passive: true })
    return () => {
      stage.removeEventListener('pointermove', handleMove)
    }
  }, [stageRef, terrainWidth, terrainHeight])

  useEffect(() => {
    const el = fpsRef.current;
    if (!el) return;

    let frameId: number;
    let frames = 0;
    let lastTime = performance.now();

    const loop = (time: number) => {
      frames++;
      if (time - lastTime >= 1000) {
        el.textContent = `FPS: ${frames}`;
        frames = 0;
        lastTime = time;
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="map-status-bar surface-tonal" style={{ position: 'absolute', top: 16, right: 16, padding: '4px 8px', borderRadius: 6, fontSize: 12, zIndex: 1000, pointerEvents: 'none', opacity: 0.8, fontFamily: 'monospace', display: 'flex', gap: '8px' }}>
      <span ref={coordsRef}>X: 0 Y: 0</span>
      <span>|</span>
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      <span>|</span>
      <span ref={fpsRef}>FPS: 0</span>
    </div>
  )
}
