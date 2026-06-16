import { createTheme } from '@mui/material/styles'

// CortexIE dark "control center" theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c5cff', light: '#9d86ff', dark: '#5a3ee0' },
    secondary: { main: '#19d3c5' },
    success: { main: '#3ddc97' },
    warning: { main: '#ffb547' },
    error: { main: '#ff5d6c' },
    info: { main: '#4aa8ff' },
    background: {
      default: '#0b0e1a',
      paper: '#141a2e',
    },
    text: {
      primary: '#e8ecf6',
      secondary: '#94a0bd',
    },
    divider: 'rgba(148,160,189,0.14)',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter","Segoe UI",Roboto,system-ui,sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(148,160,189,0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(148,160,189,0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
})

export default theme
