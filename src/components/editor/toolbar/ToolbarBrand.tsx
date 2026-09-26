import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { IconButton } from '@mui/material'
import logo from '../../../assets/logo.png'

export type ToolbarBrandProps = {
  onOpenSettings: () => void
}

export function ToolbarBrand({ onOpenSettings }: ToolbarBrandProps) {
  return (
    <div className="toolbar-group toolbar-brand" aria-label="Omega RGE">
      <img src={logo} alt="Logo Omega RGE" className="toolbar-logo" />
      <div className="app-title toolbar-title">Omega RGE</div>
      <IconButton
        size="small"
        title="Ouvrir les réglages"
        aria-label="Ouvrir les réglages"
        onClick={onOpenSettings}
      >
        <SettingsRoundedIcon fontSize="small" />
      </IconButton>
    </div>
  )
}
