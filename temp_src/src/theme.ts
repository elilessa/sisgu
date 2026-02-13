
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#00c0a3',
      light: '#4dd4bf',
      dark: '#00ae91',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#80e0d1',
      light: '#b3ece3',
      dark: '#4dd4bf',
      contrastText: '#000000',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});
