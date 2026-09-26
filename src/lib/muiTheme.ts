import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Thème MUI synchronisé avec les variables CSS Material Design 3
 * définies dans index.css (--md-sys-color-*).
 *
 * MUI createTheme ne supporte pas les var() dans la palette (il décompose
 * les couleurs), on utilise donc des valeurs concrètes pour chaque mode.
 *
 * createAppMuiTheme(mode) retourne un thème MUI cohérent avec l'app.
 */

interface M3Colors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
}

const LIGHT: M3Colors = {
  primary: '#672885',
  onPrimary: '#ffffff',
  primaryContainer: '#f1d9ff',
  onPrimaryContainer: '#250034',
  secondary: '#655a6f',
  onSecondary: '#ffffff',
  secondaryContainer: '#ecddf7',
  onSecondaryContainer: '#20182a',
  tertiary: '#7f4c5f',
  onTertiary: '#ffffff',
  tertiaryContainer: '#ffd8e5',
  onTertiaryContainer: '#32111f',
  error: '#ba1a1a',
  onError: '#ffffff',
  surface: '#fff7fb',
  surfaceDim: '#e3d7e4',
  surfaceBright: '#fff7fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fdf0fd',
  surfaceContainer: '#f7ebf8',
  surfaceContainerHigh: '#f1e5f2',
  surfaceContainerHighest: '#ecdfee',
  onSurface: '#1d1a20',
  onSurfaceVariant: '#4d4353',
  outline: '#7f7384',
  outlineVariant: '#d1c2d4',
};

const DARK: M3Colors = {
  primary: '#e7b6ff',
  onPrimary: '#3a0054',
  primaryContainer: '#4f116d',
  onPrimaryContainer: '#f7d8ff',
  secondary: '#cfc1da',
  onSecondary: '#362d40',
  secondaryContainer: '#4d4357',
  onSecondaryContainer: '#ecddf7',
  tertiary: '#f3b7cc',
  onTertiary: '#4b2133',
  tertiaryContainer: '#64384a',
  onTertiaryContainer: '#ffd8e5',
  error: '#ffb4ab',
  onError: '#690005',
  surface: '#151218',
  surfaceDim: '#151218',
  surfaceBright: '#2f2a31',
  surfaceContainerLowest: '#100d13',
  surfaceContainerLow: '#1d1a20',
  surfaceContainer: '#211d24',
  surfaceContainerHigh: '#2b2730',
  surfaceContainerHighest: '#36313b',
  onSurface: '#e9e0e9',
  onSurfaceVariant: '#d3c1d7',
  outline: '#998c9d',
  outlineVariant: '#4d4353',
};

function buildTheme(c: M3Colors, mode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.secondary, contrastText: c.onSecondary },
      error: { main: c.error, contrastText: c.onError },
      background: {
        default: c.surface,
        paper: c.surfaceContainer,
      },
      text: {
        primary: c.onSurface,
        secondary: c.onSurfaceVariant,
      },
      divider: c.outlineVariant,
      action: {
        active: c.onSurfaceVariant,
        selected: c.secondaryContainer,
        disabled: c.onSurfaceVariant,
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "'Roboto', system-ui, sans-serif",
      fontSize: 14,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: c.surface,
            color: c.onSurface,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            color: c.onSurface,
            backgroundColor: c.surfaceContainer,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.outlineVariant },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.primary },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.primary },
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: c.outlineVariant },
            '&.Mui-disabled input': {
              color: c.onSurfaceVariant,
              WebkitTextFillColor: 'unset',
            },
          },
          input: {
            color: c.onSurface,
            '&::placeholder': { color: c.onSurfaceVariant, opacity: 0.7 },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: c.onSurfaceVariant,
            '&.Mui-focused': { color: c.primary },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: { color: c.onSurface },
          icon: { color: c.onSurfaceVariant },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: c.surfaceContainer,
            color: c.onSurface,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: c.surfaceContainer,
            color: c.onSurface,
            border: `1px solid ${c.outlineVariant}`,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: c.onSurface,
            '&:hover': { backgroundColor: c.surfaceContainerHigh },
            '&.Mui-selected': {
              backgroundColor: c.secondaryContainer,
              color: c.onSecondaryContainer,
            },
            '&.Mui-selected:hover': { backgroundColor: c.secondaryContainer },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: c.surfaceContainerHigh,
            color: c.onSurface,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          // Le popper de MUI hérite d'un z-index par défaut de 1500, ce qui
          // le place SOUS les FloatingDialog (10000) et le RarityPicker
          // popover (11000). On force un z-index élevé pour que les
          // infobulles restent visibles par-dessus n'importe quel dialog.
          // La valeur 12000 est volontairement supérieure au dialog (10000)
          // mais reste cohérente avec la palette z-index du projet
          // (cf. App.css : dialog-backdrop = 10000, rarity-picker-popover = 11000).
          popper: {
            zIndex: 12000,
          },
          tooltip: {
            backgroundColor: c.surfaceContainerHighest,
            color: c.onSurface,
            border: `1px solid ${c.outlineVariant}`,
            fontSize: '0.75rem',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { color: c.onSurfaceVariant },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
    },
  });
}

export function createAppMuiTheme(mode: 'light' | 'dark' = 'dark'): Theme {
  return buildTheme(mode === 'dark' ? DARK : LIGHT, mode);
}