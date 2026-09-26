import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createAppMuiTheme } from './lib/muiTheme'
import './index.css'
import App from './App.tsx'
import { CharacterSheetTestHarness } from './CharacterSheetTestHarness'

/** Détecte le mode de thème courant depuis le DOM et réagit aux changements. */
function useThemeMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.dataset.theme as 'light' | 'dark') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = (document.documentElement.dataset.theme as 'light' | 'dark') || 'dark'
      setMode(next)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return mode
}

function Root() {
  const mode = useThemeMode()
  const muiTheme = createAppMuiTheme(mode)
  // Harnais de test : monté uniquement si l'URL contient ?testCharSheet=1
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('testCharSheet') === '1') {
    return (
      <StrictMode>
        <CharacterSheetTestHarness />
      </StrictMode>
    )
  }
  return (
    <StrictMode>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
