import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ClientesManagement } from './pages/ClientesManagement';
import { OrcamentosManagement } from './pages/OrcamentosManagement';
import { OrcamentosEquipamentosManagement } from './pages/OrcamentosEquipamentosManagement';
import { ParametrosProdutosManagement } from './pages/ParametrosProdutosManagement';
import { ContratosManagement } from './pages/ContratosManagement';
import { AgendaTecnicaManagement } from './pages/AgendaTecnicaManagement';
import { FormularioPublico } from './pages/FormularioPublico';
import { theme } from './theme';
import './App.css';
import { CircularProgress, Box } from '@mui/material';

function AppContent() {
  const { user, loading } = useAuth();

  console.log('[App] 🎨 AppContent renderizando. User:', !!user, 'Loading:', loading);

  if (loading) {
    return (
      <Box className="min-h-screen flex items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  console.log('[App] 🚀 App iniciando');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/formulario/:token" element={<FormularioPublico />} />
          <Route
            path="/*"
            element={
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}