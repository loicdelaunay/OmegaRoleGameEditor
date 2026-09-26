import { X } from 'lucide-react'
import { memo } from 'react'

const changelogsRecord = import.meta.glob('../../changelogs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

type ChangelogDialogProps = {
  isOpen: boolean
  onClose: () => void
}

function parseMarkdown(text: string) {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []

  const commitList = () => {
    if (inList && listItems.length > 0) {
      result.push(<ul key={`ul-${result.length}`} className="changelog-list">{listItems}</ul>)
      listItems = []
      inList = false
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) {
      commitList()
      return
    }

    if (trimmed.startsWith('- ')) {
      inList = true
      let content = trimmed.substring(2)
      // Basic bold parsing: *text*
      const parts = content.split(/(\*[^*]+\*)/g).map((part, j) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={j}>{part.slice(1, -1)}</strong>
        }
        return part
      })
      listItems.push(<li key={i}>{parts}</li>)
    } else if (trimmed.startsWith('# ')) {
      commitList()
      result.push(<h1 key={i}>{trimmed.substring(2)}</h1>)
    } else if (trimmed.startsWith('## ')) {
      commitList()
      result.push(<h2 key={i}>{trimmed.substring(3)}</h2>)
    } else if (trimmed.startsWith('### ')) {
      commitList()
      result.push(<h3 key={i}>{trimmed.substring(4)}</h3>)
    } else {
      commitList()
      result.push(<p key={i}>{trimmed}</p>)
    }
  })
  commitList()

  return result
}

export const ChangelogDialog = memo(function ChangelogDialog({ isOpen, onClose }: ChangelogDialogProps) {
  if (!isOpen) return null

  // Sort versions naturally (v10 > v2)
  const versions = Object.keys(changelogsRecord).sort((a, b) => {
    const nameA = a.split('/').pop()?.replace('.md', '').replace('v', '') || '0'
    const nameB = b.split('/').pop()?.replace('.md', '').replace('v', '') || '0'
    return parseInt(nameB, 10) - parseInt(nameA, 10)
  })

  return (
    <div className="dialog-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <section 
        className="dialog conn-dialog card surface-base settings-dialog" 
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '800px', width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <header className="dialog-header">
          <div className="dialog-title-container">
            <h2>Changelogs</h2>
          </div>
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={onClose} aria-label="Fermer">
              <X className="button-icon" />
            </button>
          </div>
        </header>
        <div className="conn-dialog-body" style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          <div className="changelogs-container">
            {versions.map((path) => {
              const version = path.split('/').pop()?.replace('.md', '')
              return (
                <div key={path} className="changelog-entry surface-tonal" style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--color-primary)' }}>Version {version?.replace('v', '')}</h3>
                  <div className="changelog-content" style={{ lineHeight: '1.6' }}>
                    {parseMarkdown(changelogsRecord[path] || '')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
})
