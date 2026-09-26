import { FicheDropdown, type WorkfolderFile } from '../../FicheDropdown'

export type ToolbarFicheGroupProps = {
  files: WorkfolderFile[]
  workfolderHandle: FileSystemDirectoryHandle | null
  onOpenImport: () => void
  onOpenFile: (fileName: string) => void
}

export function ToolbarFicheGroup({
  files,
  workfolderHandle,
  onOpenImport,
  onOpenFile,
}: ToolbarFicheGroupProps) {
  return (
    <div className="toolbar-group toolbar-fiche-group">
      <FicheDropdown
        files={files}
        workfolderHandle={workfolderHandle}
        onOpenImport={onOpenImport}
        onOpenFile={onOpenFile}
      />
    </div>
  )
}
