export type ToolbarDownloadGroupProps = {
  loaded: number
  total: number
  sizeBytes: number
}

export function ToolbarDownloadGroup({ loaded, total, sizeBytes }: ToolbarDownloadGroupProps) {
  const percent = (loaded / Math.max(1, total)) * 100
  return (
    <div className="toolbar-group">
      <span className="toolbar-group-label">Téléchargement</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '150px' }}>
        <div style={{ width: '100%', backgroundColor: 'var(--md-sys-color-surface-container-highest)', borderRadius: '4px', overflow: 'hidden', height: '6px' }}>
          <div style={{ width: `${percent}%`, backgroundColor: 'var(--md-sys-color-primary)', height: '100%', transition: 'width 0.2s ease-out' }}></div>
        </div>
        <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.65rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {loaded} / {total} fichiers ({Math.round((sizeBytes || 0) / 1024 / 1024)} Mo)
        </span>
      </div>
    </div>
  )
}
