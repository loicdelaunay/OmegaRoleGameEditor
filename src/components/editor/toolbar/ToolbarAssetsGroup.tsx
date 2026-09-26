import { CircleDot, FolderOpen, ImagePlus, Layers3, Music, Square, StickyNote } from 'lucide-react'

export type AssetPickerMode = 'add-image' | 'add-token' | 'replace-item' | 'effect-reference'

export type ToolbarAssetsGroupProps = {
  onOpenLibrary: () => void
  onOpenDefaultLibrary: () => void
  onPickAsset: (mode: AssetPickerMode) => void
  onClickMapAudioInput: () => void
  onCreateShadowZone: () => void
  onCreateNoteItem: () => void
}

export function ToolbarAssetsGroup({
  onOpenLibrary,
  onOpenDefaultLibrary,
  onPickAsset,
  onClickMapAudioInput,
  onCreateShadowZone,
  onCreateNoteItem,
}: ToolbarAssetsGroupProps) {
  return (
    <div className="toolbar-group">
      <span className="toolbar-group-label">Assets</span>
      <button
        type="button"
        className="secondary compact-icon-button"
        title="Ouvrir la bibliotheque"
        aria-label="Ouvrir la bibliotheque"
        onClick={onOpenLibrary}
      >
        <FolderOpen className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Default library"
        aria-label="Default library"
        onClick={onOpenDefaultLibrary}
      >
        <Square className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Ajouter des images"
        aria-label="Ajouter des images"
        onClick={() => onPickAsset('add-image')}
      >
        <ImagePlus className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Ajouter des pions"
        aria-label="Ajouter des pions"
        onClick={() => onPickAsset('add-token')}
      >
        <CircleDot className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Ajouter un objet son"
        aria-label="Ajouter un objet son"
        onClick={onClickMapAudioInput}
      >
        <Music className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Creer une zone d ombre"
        aria-label="Creer une zone d ombre"
        onClick={onCreateShadowZone}
      >
        <Layers3 className="button-icon" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="icon-button compact-icon-button"
        title="Creer une note (MJ)"
        aria-label="Creer une note (MJ)"
        onClick={onCreateNoteItem}
      >
        <StickyNote className="button-icon" strokeWidth={2.2} />
      </button>
    </div>
  )
}
