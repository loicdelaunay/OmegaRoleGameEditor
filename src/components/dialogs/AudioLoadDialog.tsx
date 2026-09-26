import type { RefObject } from 'react'
import { Bookmark, Pencil, Play, Search, Star, X } from 'lucide-react'
import type { TerrainDocument } from '../../types/terrain'

export type AudioLoadDialogProps = {
  isOpen: boolean
  terrain: TerrainDocument
  youtubeUrlRef: RefObject<HTMLInputElement | null>
  youtubeBookmarkSearch: string
  editingYoutubeTitle: string | null
  onClose: () => void
  onChooseLocalFile: () => void
  onLoadYouTubeUrl: (url: string) => void
  onYoutubeBookmarkSearchChange: (value: string) => void
  onStartEditYoutubeTitle: (url: string) => void
  onUpdateYoutubeTitle: (url: string, title: string) => void
  onStopEditYoutubeTitle: () => void
  onToggleYoutubeBookmark: (url: string) => void
  onRemoveYoutubeHistory: (url: string) => void
}

export function AudioLoadDialog({
  isOpen,
  terrain,
  youtubeUrlRef,
  youtubeBookmarkSearch,
  editingYoutubeTitle,
  onClose,
  onChooseLocalFile,
  onLoadYouTubeUrl,
  onYoutubeBookmarkSearchChange,
  onStartEditYoutubeTitle,
  onUpdateYoutubeTitle,
  onStopEditYoutubeTitle,
  onToggleYoutubeBookmark,
  onRemoveYoutubeHistory,
}: AudioLoadDialogProps) {
  if (!isOpen) return null

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <section className="dialog conn-dialog card surface-base" onClick={(e) => e.stopPropagation()} style={{ width: '600px', maxWidth: '90vw' }}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Charger une musique</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body" style={{ padding: '16px' }}>
          <button type="button" className="secondary" style={{ width: '100%', marginBottom: '16px' }} onClick={onChooseLocalFile}>
            Choisir un fichier audio local
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--md-sys-color-outline-variant)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>OU</span>
            <div style={{ flex: 1, borderTop: '1px solid var(--md-sys-color-outline-variant)' }}></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Lien YouTube</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={youtubeUrlRef}
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                className="surface-container-highest"
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onLoadYouTubeUrl(e.currentTarget.value.trim())
                  }
                }}
              />
              <button type="button" className="primary" onClick={() => {
                onLoadYouTubeUrl(youtubeUrlRef.current?.value.trim() || '')
              }}>Charger</button>
            </div>

            {terrain.youtubeBookmarks && terrain.youtubeBookmarks.length > 0 ? (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bookmark size={14} /> Favoris
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--md-sys-color-surface-container)', padding: '2px 8px', borderRadius: '4px' }}>
                    <Search size={12} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={youtubeBookmarkSearch}
                      onChange={(e) => onYoutubeBookmarkSearchChange(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--md-sys-color-on-surface)', fontSize: '0.8rem', width: '120px', outline: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {terrain.youtubeBookmarks
                    .filter(url => {
                      const search = youtubeBookmarkSearch.toLowerCase()
                      if (!search) return true
                      const title = (terrain.youtubeTitles?.[url] || url).toLowerCase()
                      return title.includes(search) || url.toLowerCase().includes(search)
                    })
                    .map((url, i) => (
                      <div key={`bm-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', backgroundColor: 'var(--md-sys-color-surface-container)', padding: '6px 12px', borderRadius: '6px' }}>
                        {editingYoutubeTitle === url ? (
                          <input
                            autoFocus
                            defaultValue={terrain.youtubeTitles?.[url] || url}
                            onBlur={(e) => {
                              onUpdateYoutubeTitle(url, e.target.value.trim() || url)
                              onStopEditYoutubeTitle()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateYoutubeTitle(url, e.currentTarget.value.trim() || url)
                                onStopEditYoutubeTitle()
                              } else if (e.key === 'Escape') {
                                onStopEditYoutubeTitle()
                              }
                            }}
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--md-sys-color-primary)', backgroundColor: 'var(--md-sys-color-surface-container-highest)', color: 'var(--md-sys-color-on-surface)' }}
                          />
                        ) : (
                          <span
                            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={terrain.youtubeTitles?.[url] || url}
                          >
                            {terrain.youtubeTitles?.[url] || url}
                          </span>
                        )}
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onLoadYouTubeUrl(url)} title="Jouer">
                          <Play className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onStartEditYoutubeTitle(url)} title="Editer">
                          <Pencil className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onToggleYoutubeBookmark(url)} title="Retirer des favoris">
                          <Star className="button-icon" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-primary)', fill: 'var(--md-sys-color-primary)' }} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {terrain.youtubeHistory && terrain.youtubeHistory.length > 0 ? (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px' }}>Historique récent</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {terrain.youtubeHistory.map((url, i) => {
                    const isBookmarked = terrain.youtubeBookmarks?.includes(url)
                    return (
                      <div key={`hist-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', backgroundColor: 'var(--md-sys-color-surface-container-highest)', padding: '6px 12px', borderRadius: '6px' }}>
                        {editingYoutubeTitle === url ? (
                          <input
                            autoFocus
                            defaultValue={terrain.youtubeTitles?.[url] || url}
                            onBlur={(e) => {
                              onUpdateYoutubeTitle(url, e.target.value.trim() || url)
                              onStopEditYoutubeTitle()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateYoutubeTitle(url, e.currentTarget.value.trim() || url)
                                onStopEditYoutubeTitle()
                              } else if (e.key === 'Escape') {
                                onStopEditYoutubeTitle()
                              }
                            }}
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--md-sys-color-primary)', backgroundColor: 'var(--md-sys-color-surface-container-highest)', color: 'var(--md-sys-color-on-surface)' }}
                          />
                        ) : (
                          <span
                            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={terrain.youtubeTitles?.[url] || url}
                          >
                            {terrain.youtubeTitles?.[url] || url}
                          </span>
                        )}
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onLoadYouTubeUrl(url)} title="Jouer">
                          <Play className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onStartEditYoutubeTitle(url)} title="Editer">
                          <Pencil className="button-icon" strokeWidth={2.2} />
                        </button>
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onToggleYoutubeBookmark(url)} title={isBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}>
                          <Star className="button-icon" strokeWidth={2.2} style={isBookmarked ? { color: 'var(--md-sys-color-primary)', fill: 'var(--md-sys-color-primary)' } : { color: 'var(--md-sys-color-on-surface-variant)' }} />
                        </button>
                        <button type="button" className="ghost compact-icon-button" style={{ padding: 4 }} onClick={() => onRemoveYoutubeHistory(url)} title="Supprimer de l'historique">
                          <X className="button-icon" strokeWidth={2.2} style={{ color: 'var(--md-sys-color-error)' }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </section>
    </div>
  )
}
