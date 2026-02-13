
import { createTheme } from '@mui/material/styles';

/**
 * Custom colors used throughout the application.
 * Centralized here for easy maintenance and consistency.
 * To change a color, simply update the value here and it will reflect everywhere.
 */
export const customColors = {
  // Table headers background (light cyan)
  // Used in: Administradoras, Clientes, ContasReceber, etc.
  tableHeader: '#e0f7f4',

  // Dashboard gradient (cyan to blue)
  // Used in: Layout.tsx (sidebar and header backgrounds)
  gradientStart: '#42D1D6',   // Light cyan
  gradientMiddle: '#41b8d5',  // Medium cyan-blue
  gradientEnd: '#2d8bba',     // Dark blue

  // Pre-built gradients for easy use
  gradientVertical: 'linear-gradient(to bottom, #42D1D6, #41b8d5, #2d8bba)',
  gradientHorizontal: 'linear-gradient(to right, #42D1D6, #41b8d5, #2d8bba)',

  // Icon colors (matching theme palette for consistency)
  iconView: '#1976d2',      // Blue - View/Visualizar action
  iconEdit: '#ff9800',      // Orange - Edit/Editar action
  iconDelete: '#f44336',    // Red - Delete/Excluir action
  iconPrint: '#1976d2',     // Blue - Print action
  iconSuccess: '#4caf50',   // Green - Success/Approve action
  iconCancel: '#757575',    // Grey - Cancel/Neutral action
  iconEmail: '#9c27b0',     // Purple - Email/Send action
  iconWhatsapp: '#25D366',  // Green - Whatsapp action
  iconPdf: '#e53935',       // Red - PDF action
  iconHistory: '#9c27b0',   // Purple - History action
  iconKey: '#00ae91',       // Teal - Permissions/Key action
  iconArchive: '#757575',    // Grey - Archive action
  iconUnarchive: '#4caf50',  // Green - Unarchive action
};

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue standard (MUI default) - used for View/Action
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0', // Purple (MUI default) - good contrast for secondary actions
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336', // Red - used for Delete/Reject and important highlights (e.g., Clientes.tsx contact checkbox)
    },
    warning: {
      main: '#ff9800', // Orange - used for Edit
      contrastText: '#ffffff', // Ensure readability on orange buttons
    },
    info: {
      main: '#0288d1', // Light Blue
    },
    success: {
      main: '#4caf50', // Green - used for PDF/Approve
      contrastText: '#ffffff',
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
