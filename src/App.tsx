import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { OrcamentosContratos } from './pages/OrcamentosContratos';
import { OrcamentosEquipamentos } from './pages/OrcamentosEquipamentos';
import { Vendas } from './pages/Financeiro/Vendas';
import { Precificacao } from './pages/Precificacao';
import { AgendaTecnica } from './pages/AgendaTecnica';
import { FormularioPublico } from './pages/FormularioPublico';
import { Produtos } from './pages/Produtos';
import { Estoque } from './pages/Estoque';
import { Calendario } from './pages/Calendario';
import { ContasReceber } from './pages/Financeiro/ContasReceber';
import { LancamentosContabeis } from './pages/Financeiro/LancamentosContabeis';
/*
import { AuvoDemo } from './pages/Demo/AuvoDemo';
import { AuvoChamadoDemo } from './pages/Demo/AuvoChamadoDemo';
import { AuvoClientesDemo } from './pages/Demo/AuvoClientesDemo';
import { AuvoTarefasDemo } from './pages/Demo/AuvoTarefasDemo';
import { AuvoEquipamentosDemo } from './pages/Demo/AuvoEquipamentosDemo';
import { AuvoFinanceiroDemo } from './pages/Demo/AuvoFinanceiroDemo';
import { AuvoMapaDemo } from './pages/Demo/AuvoMapaDemo';
import { AuvoContasReceberDemo } from './pages/Demo/AuvoContasReceberDemo';
import { AuvoEstoqueDemo } from './pages/Demo/AuvoEstoqueDemo';
import { AuvoConfigDemo } from './pages/Demo/AuvoConfigDemo';
import { FieldControlTempoDemo } from './pages/Demo/FieldControlTempoDemo';
import { FieldControlCalendarioDemo } from './pages/Demo/FieldControlCalendarioDemo';
import { AuvoCalendarioDemo } from './pages/Demo/AuvoCalendarioDemo';
*/
import { FluxoCaixa } from './pages/Financeiro/FluxoCaixa';
import { ContasPagar } from './pages/Financeiro/ContasPagar';
import { Boletos } from './pages/Financeiro/Boletos';
import { RelatoriosHub } from './pages/Relatorios/RelatoriosHub';
import { theme } from './theme';
import './App.css';
import { CircularProgress, Box } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';

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
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/clientes" element={<Clientes />} />
      <Route path="/orcamentos" element={<OrcamentosContratos />} />
      <Route path="/orcamentos-equipamentos" element={<OrcamentosEquipamentos />} />
      <Route path="/precificacao" element={<Precificacao />} />
      <Route path="/produtos" element={<Produtos />} />
      <Route path="/estoque" element={<Estoque />} />
      <Route path="/vendas" element={<Vendas />} />
      <Route path="/boletos" element={<Boletos />} />

      <Route path="/agenda" element={<Calendario />} />

      <Route path="/agenda-tecnica" element={<AgendaTecnica />} />
      <Route path="/relatorios" element={<RelatoriosHub />} />
      <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
      <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
      <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
      <Route path="/financeiro/lancamentos" element={<LancamentosContabeis />} />
      {/*
      <Route path="/auvo-demo" element={<AuvoDemo />} />
      <Route path="/auvo-chamado" element={<AuvoChamadoDemo />} />
      <Route path="/auvo-clientes" element={<AuvoClientesDemo />} />
      <Route path="/auvo-tarefas" element={<AuvoTarefasDemo />} />
      <Route path="/auvo-equipamentos" element={<AuvoEquipamentosDemo />} />
      <Route path="/auvo-financeiro" element={<AuvoFinanceiroDemo />} />
      <Route path="/auvo-mapa" element={<AuvoMapaDemo />} />
      <Route path="/auvo-contas-receber" element={<AuvoContasReceberDemo />} />
      <Route path="/auvo-estoque" element={<AuvoEstoqueDemo />} />
      <Route path="/auvo-config" element={<AuvoConfigDemo />} />
      <Route path="/auvo-calendario" element={<AuvoCalendarioDemo />} />
      <Route path="/fieldcontrol-tempo" element={<FieldControlTempoDemo />} />
      <Route path="/fieldcontrol-calendario" element={<FieldControlCalendarioDemo />} />
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  console.log('[App] 🚀 App iniciando');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}