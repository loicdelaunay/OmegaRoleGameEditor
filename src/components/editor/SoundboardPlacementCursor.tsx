import type { RefObject } from 'react'

export function SoundboardPlacementCursor({
  cursorRef,
  placement,
  editorZoom,
  soundName,
}: {
  cursorRef: RefObject<HTMLDivElement | null>
  placement: { id: string; src: string; defaultRange: number }
  editorZoom: number
  soundName: string
}) {
  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${placement.defaultRange * 2 * editorZoom}px`,
        height: `${placement.defaultRange * 2 * editorZoom}px`,
        transform: 'translate(-50%, -50%)',
        border: '2px dashed var(--md-sys-color-primary)',
        borderRadius: '50%',
        backgroundColor: 'color-mix(in srgb, var(--md-sys-color-primary) 5%, transparent)'
      }} />
      <div style={{
        position: 'absolute',
        left: '15px',
        top: '15px',
        background: 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        🔊 {soundName}
      </div>
    </div>
  )
}
