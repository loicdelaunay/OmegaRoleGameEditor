import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

type InspectorSectionTone = 'identity' | 'asset' | 'structure' | 'geometry' | 'token' | 'note' | 'settings' | 'action'

type InspectorSectionProps = {
  title?: ReactNode | string
  tone: InspectorSectionTone
  className?: string
  children: ReactNode
}

export function InspectorSection({ title, tone, className, children }: InspectorSectionProps) {
  const storageKey = title ? `omega-inspector-collapse-${title}` : null
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (!storageKey) return false
    const stored = localStorage.getItem(storageKey)
    return stored === 'true'
  })

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(isCollapsed))
    }
  }, [isCollapsed, storageKey])

  return (
    <section className={className ? `inspector-section ${tone} ${className}` : `inspector-section ${tone}`}>
      {title && (
        <div 
          className="inspector-section-header" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingBottom: isCollapsed ? 0 : '8px', userSelect: 'none' }}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={2.2} /> : <ChevronDown size={18} strokeWidth={2.2} />}
          <strong style={{ marginLeft: '4px', flex: 1, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--md-sys-color-on-surface-variant)' }}>{title}</strong>
        </div>
      )}
      <div style={{ display: isCollapsed ? 'none' : 'block' }}>
        {children}
      </div>
    </section>
  )
}