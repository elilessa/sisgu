import { useState } from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from './UserManagement';
import { AdministradorasManagement } from './AdministradorasManagement';
import { BancoManagement } from './BancoManagement';
import { ParametrosProdutosManagement } from './ParametrosProdutosManagement';
import { FornecedoresManagement } from './FornecedoresManagement';
import { ProdutosManagement } from './ProdutosManagement';
import { EstoqueManagement } from './EstoqueManagement';
import { PrecificacaoManagement } from './PrecificacaoManagement';
import { ClientesManagement } from './ClientesManagement';
import { ParametrosComerciais } from './ParametrosComerciais';
import { OrcamentosManagement } from './OrcamentosManagement';
import { OrcamentosEquipamentosManagement } from './OrcamentosEquipamentosManagement';
import { ContratosManagement } from './ContratosManagement';
import { AgendaTecnicaManagement } from './AgendaTecnicaManagement';
import { AreaTecnicaManagement } from './AreaTecnicaManagement';
import { AgendaComercialManagement } from './AgendaComercialManagement';
import { TipoOrdemManagement } from './TipoOrdemManagement';
import { TiposFornecedorManagement } from './TiposFornecedorManagement';
import Questionarios from './Questionarios';

import { Layout, TABLE_HEADER_BG_COLOR } from '../components/Layout';

export function Dashboard() {
  const { userData } = useAuth();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'usuarios' | 'administradoras' | 'banco' | 'parametros-produtos' | 'fornecedores' | 'tipos-fornecedor' | 'produtos' | 'estoque' | 'precificacao' | 'parametros-comerciais' | 'clientes' | 'orcamentos-equipamentos' | 'orcamentos-contratos' | 'contratos' | 'agenda-visualizar' | 'tipo-ordem' | 'questionarios' | 'area-tecnica' | 'agenda-comercial'>('dashboard');

  // Listener para navegação customizada
  useState(() => {
    const handleCustomNavigation = (event: CustomEvent) => {
      setCurrentPage(event.detail);
    };
    window.addEventListener('navigate-to-page' as any, handleCustomNavigation);
    return () => window.removeEventListener('navigate-to-page' as any, handleCustomNavigation);
  });

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Box className="w-full">
            <Typography variant="h4" className="mb-6 font-bold text-gray-800">
              Bem-vindo, {userData?.nome}!
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper elevation={2} className="p-4 hover:shadow-lg transition-shadow">
                  <Typography variant="subtitle1" className="mb-1 text-gray-700 font-semibold">
                    Total de Clientes
                  </Typography>
                  <Typography variant="h4" className="text-primary-600 font-bold">
                    0
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper elevation={2} className="p-4 hover:shadow-lg transition-shadow">
                  <Typography variant="subtitle1" className="mb-1 text-gray-700 font-semibold">
                    Contratos Ativos
                  </Typography>
                  <Typography variant="h4" className="text-primary-600 font-bold">
                    0
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper elevation={2} className="p-4 hover:shadow-lg transition-shadow">
                  <Typography variant="subtitle1" className="mb-1 text-gray-700 font-semibold">
                    Receita do Mês
                  </Typography>
                  <Typography variant="h4" className="text-primary-600 font-bold">
                    R$ 0
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );
      case 'usuarios':
        return <UserManagement />;
      case 'administradoras':
        return <AdministradorasManagement />;
      case 'banco':
        return <BancoManagement />;
      case 'parametros-produtos':
        return <ParametrosProdutosManagement />;
      case 'fornecedores':
        return <FornecedoresManagement />;
      case 'produtos':
        return <ProdutosManagement />;
      case 'estoque':
        return <EstoqueManagement />;
      case 'precificacao':
        return <PrecificacaoManagement />;
      case 'parametros-comerciais':
        return <ParametrosComerciais />;
      case 'clientes':
        return <ClientesManagement />;
      case 'orcamentos-equipamentos':
        return <OrcamentosEquipamentosManagement />;
      case 'orcamentos-contratos':
        return <OrcamentosManagement initialTab={1} />;
      case 'contratos':
        return <ContratosManagement />;
      case 'agenda-visualizar':
        return <AgendaTecnicaManagement />;
      case 'area-tecnica':
        return <AreaTecnicaManagement />;
      case 'agenda-comercial':
        return <AgendaComercialManagement />;
      case 'tipo-ordem':
        return <TipoOrdemManagement />;
      case 'tipos-fornecedor':
        return <TiposFornecedorManagement />;
      case 'questionarios':
        return <Questionarios />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}