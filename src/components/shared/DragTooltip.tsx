import { forwardRef } from 'react'

export const DragTooltip = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        display: 'none',
        backgroundColor: 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        pointerEvents: 'none',
        zIndex: 99999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    />
  )
})

DragTooltip.displayName = 'DragTooltip'
