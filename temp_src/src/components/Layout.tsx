import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
} from "@mui/material";

// Cor padrão para cabeçalhos de tabela
export const TABLE_HEADER_BG_COLOR = '#e0f7f4';
import {
  Dashboard as DashboardIcon,
  Home,
  People,
  CalendarMonth,
  Description,
  BusinessCenter,
  AttachMoney,
  Inventory,
  Assessment,
  Settings,
  ManageAccounts,
  KeyboardArrowDown,
  PersonAdd,
  List,
  Event,
  Add,
  Build,
  Engineering,
  NoteAdd,
  Assignment,
  RequestQuote,
  Sell,
  Receipt,
  AccountBalance,
  ShoppingCart,
  LocalShipping,
  BarChart,
  Business,
  TrendingUp,
  Category,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { userData, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElClientes, setAnchorElClientes] = useState<null | HTMLElement>(
    null,
  );
  const [anchorElAgenda, setAnchorElAgenda] = useState<null | HTMLElement>(
    null,
  );
  const [anchorElContratos, setAnchorElContratos] =
    useState<null | HTMLElement>(null);
  const [anchorElComercial, setAnchorElComercial] =
    useState<null | HTMLElement>(null);
  const [anchorElFinanceiro, setAnchorElFinanceiro] = useState<null | HTMLElement>(
    null,
  );
  const [anchorElProdutos, setAnchorElProdutos] = useState<null | HTMLElement>(
    null,
  );
  const [anchorElRelatorios, setAnchorElRelatorios] =
    useState<null | HTMLElement>(null);
  const [anchorElConfiguracoes, setAnchorElConfiguracoes] =
    useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleSignOut = async () => {
    await signOut();
    handleCloseUserMenu();
  };

  const handleNavigation = (path: string) => {
    console.log('[Layout] Navegando para:', path);
    navigate(path);
  };

  return (
    <Box className="min-h-screen bg-gray-50">
      <AppBar position="static" className="bg-primary-600">
        <Container maxWidth={false} className="px-4">
          <Toolbar disableGutters className="min-h-[64px]">
            <DashboardIcon className="mr-2" />
            <Typography
              variant="h6"
              noWrap
              component="div"
              className="mr-4 font-bold"
            >
              SG Sistemas
            </Typography>

            <Box className="flex-grow flex flex-wrap gap-2 items-center">
              {/* Menu Início */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  px: { xs: 1, sm: 2 },
                }}
                startIcon={
                  <Home
                    sx={{
                      color: "white",
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  />
                }
                onClick={() => handleNavigation("/")}
              >
                <Box sx={{ display: { xs: "none", md: "block" } }}>Início</Box>
              </Button>

              {/* Menu Clientes */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<People sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElClientes(e.currentTarget)}
              >
                Clientes
              </Button>
              <Menu
                anchorEl={anchorElClientes}
                open={Boolean(anchorElClientes)}
                onClose={() => setAnchorElClientes(null)}
              >
                {hasPermission("/clientes/lista") && (
                  <MenuItem onClick={() => {
                      setAnchorElClientes(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'clientes' })), 0);
                    }}>
                    <List className="mr-2" /> Lista de Clientes
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Agenda Técnica */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<CalendarMonth sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElAgenda(e.currentTarget)}
              >
                Agenda Técnica
              </Button>
              <Menu
                anchorEl={anchorElAgenda}
                open={Boolean(anchorElAgenda)}
                onClose={() => setAnchorElAgenda(null)}
              >
                {hasPermission("/agenda/visualizar") && (
                  <MenuItem onClick={() => {
                    setAnchorElAgenda(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'agenda-visualizar' })), 0);
                  }}>
                    <Event className="mr-2" /> Visualizar Agenda
                  </MenuItem>
                )}
                {hasPermission("/agenda/ordens-servico") && (
                  <MenuItem onClick={() => setAnchorElAgenda(null)}>
                    <Build className="mr-2" /> Ordens de Serviço
                  </MenuItem>
                )}
                {hasPermission("/agenda/area-tecnica") && (
                  <MenuItem onClick={() => {
                    setAnchorElAgenda(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'area-tecnica' })), 0);
                  }}>
                    <Engineering className="mr-2" /> Área Técnica
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Contratos */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<Description sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElContratos(e.currentTarget)}
              >
                Contratos
              </Button>
              <Menu
                anchorEl={anchorElContratos}
                open={Boolean(anchorElContratos)}
                onClose={() => setAnchorElContratos(null)}
              >
                {hasPermission("/contratos") && (
                  <MenuItem onClick={() => {
                      setAnchorElContratos(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'contratos' })), 0);
                    }}>
                    <List className="mr-2" /> Contratos Aprovados
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Comercial */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<BusinessCenter sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElComercial(e.currentTarget)}
              >
                Comercial
              </Button>
              <Menu
                anchorEl={anchorElComercial}
                open={Boolean(anchorElComercial)}
                onClose={() => setAnchorElComercial(null)}
              >
                {hasPermission("/comercial/agenda-comercial") && (
                  <MenuItem onClick={() => {
                      setAnchorElComercial(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'agenda-comercial' })), 0);
                    }}>
                    <CalendarMonth className="mr-2" /> Agenda Comercial
                  </MenuItem>
                )}
                {hasPermission("/orcamentos-equipamentos") && (
                  <MenuItem onClick={() => {
                      setAnchorElComercial(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'orcamentos-equipamentos' })), 0);
                    }}>
                    <RequestQuote className="mr-2" /> Orçamentos de Equipamentos
                  </MenuItem>
                )}
                {hasPermission("/orcamentos-contratos") && (
                  <MenuItem onClick={() => {
                      setAnchorElComercial(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'orcamentos-contratos' })), 0);
                    }}>
                    <Description className="mr-2" /> Orçamentos de Contratos
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Financeiro */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<AttachMoney sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElFinanceiro(e.currentTarget)}
              >
                Financeiro
              </Button>
              <Menu
                anchorEl={anchorElFinanceiro}
                open={Boolean(anchorElFinanceiro)}
                onClose={() => setAnchorElFinanceiro(null)}
              >
                {hasPermission("/comercial/vendas") && (
                  <MenuItem onClick={() => setAnchorElComercial(null)}>
                    <Sell className="mr-2" /> Vendas
                  </MenuItem>
                )}
                {hasPermission("/financeiro/fluxo-caixa") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <AccountBalance className="mr-2" /> Caixa
                  </MenuItem>
                )}
                {hasPermission("/financeiro/fluxo-caixa") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <AccountBalance className="mr-2" /> Fluxo de Caixa
                  </MenuItem>
                )}
                {hasPermission("/financeiro/contas-receber") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <AttachMoney className="mr-2" /> Contas a Receber
                  </MenuItem>
                )}
                {hasPermission("/financeiro/contas-pagar") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <AttachMoney className="mr-2" /> Contas a Pagar
                  </MenuItem>
                )}
                {hasPermission("/financeiro/contas-pagar") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <AttachMoney className="mr-2" /> Lançamentos Contábeis
                  </MenuItem>
                )}
                {hasPermission("/financeiro/boleto") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <Receipt className="mr-2" /> Boleto
                  </MenuItem>
                )}
                {hasPermission("/financeiro/nota-fiscal") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <Description className="mr-2" /> Nota Fiscal
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Produtos */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<Inventory sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElProdutos(e.currentTarget)}
              >
                Produtos
              </Button>
              <Menu
                anchorEl={anchorElProdutos}
                open={Boolean(anchorElProdutos)}
                onClose={() => setAnchorElProdutos(null)}
              >
                {hasPermission("/produtos/lista") && (
                  <MenuItem onClick={() => {
                      setAnchorElProdutos(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'produtos' })), 0);
                    }}>
                      <List className="mr-2" /> Lista de Produtos
                    </MenuItem>
                )}
                {hasPermission("/produtos/estoque") && (
                  <MenuItem onClick={() => {
                      setAnchorElProdutos(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'estoque' })), 0);
                    }}>
                    <Inventory className="mr-2" /> Estoque
                  </MenuItem>
                )}
                {hasPermission("/produtos/compras") && (
                  <MenuItem onClick={() => {
                      setAnchorElProdutos(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'compras' })), 0);
                    }}>
                    <ShoppingCart className="mr-2" /> Compras
                  </MenuItem>
                )}
                {hasPermission("/produtos/precificacao") && (
                  <MenuItem onClick={() => {
                      setAnchorElProdutos(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'precificacao' })), 0);
                    }}>
                    <TrendingUp className="mr-2" /> Precificação
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Relatórios */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<Assessment sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElRelatorios(e.currentTarget)}
              >
                Relatórios
              </Button>
              <Menu
                anchorEl={anchorElRelatorios}
                open={Boolean(anchorElRelatorios)}
                onClose={() => setAnchorElRelatorios(null)}
              >
                {hasPermission("/relatorios/financeiro") && (
                  <MenuItem onClick={() => setAnchorElRelatorios(null)}>
                    <BarChart className="mr-2" /> Relatório Financeiro
                  </MenuItem>
                )}
                {hasPermission("/relatorios/clientes") && (
                  <MenuItem onClick={() => setAnchorElRelatorios(null)}>
                    <People className="mr-2" /> Relatório de Clientes
                  </MenuItem>
                )}
                {hasPermission("/relatorios/vendas") && (
                  <MenuItem onClick={() => setAnchorElRelatorios(null)}>
                    <Assessment className="mr-2" /> Relatório de Vendas
                  </MenuItem>
                )}
                {hasPermission("/relatorios/tecnico") && (
                  <MenuItem onClick={() => setAnchorElRelatorios(null)}>
                    <Engineering className="mr-2" /> Relatório Técnico
                  </MenuItem>
                )}
              </Menu>

              {/* Menu Configurações */}
              <Button
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(0, 174, 145, 0.9)" },
                }}
                startIcon={<Settings sx={{ color: "white" }} />}
                endIcon={<KeyboardArrowDown sx={{ color: "white" }} />}
                onClick={(e) => setAnchorElConfiguracoes(e.currentTarget)}
              >
                Configurações
              </Button>
              <Menu
                anchorEl={anchorElConfiguracoes}
                open={Boolean(anchorElConfiguracoes)}
                onClose={() => setAnchorElConfiguracoes(null)}
              >
                {hasPermission("/configuracoes/usuarios") && (
                  <MenuItem
                    onClick={() => {
                      setAnchorElConfiguracoes(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'usuarios' })), 0);
                    }}
                  >
                    <ManageAccounts className="mr-2" /> Usuários
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/administradoras") && (
                  <MenuItem
                    onClick={() => {
                      setAnchorElConfiguracoes(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'administradoras' })), 0);
                    }}
                  >
                    <Business className="mr-2" /> Administradoras
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/fornecedores") && (
                  <MenuItem
                    onClick={() => {
                      setAnchorElConfiguracoes(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'fornecedores' })), 0);
                    }}
                  >
                    <LocalShipping className="mr-2" /> Fornecedores
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/tipos-fornecedor") && (
                  <MenuItem
                    onClick={() => {
                      setAnchorElConfiguracoes(null);
                      handleNavigation('/');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'tipos-fornecedor' })), 0);
                    }}
                  >
                    <Category className="mr-2" /> Tipos de Fornecedor
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/banco") && (
                  <MenuItem onClick={() => {
                    setAnchorElConfiguracoes(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'banco' })), 0);
                  }}>
                    <AccountBalance className="mr-2" /> Banco
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/parametros-produtos") && (
                  <MenuItem onClick={() => {
                    setAnchorElConfiguracoes(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'parametros-produtos' })), 0);
                  }}>
                    <Settings className="mr-2" /> Parâmetros de Produtos
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/parametros-comerciais") && (
                  <MenuItem onClick={() => {
                    setAnchorElConfiguracoes(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'parametros-comerciais' })), 0);
                  }}>
                    <Description className="mr-2" /> Parâmetros Comerciais
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/tipo-ordem") && (
                  <MenuItem onClick={() => {
                    setAnchorElConfiguracoes(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'tipo-ordem' })), 0);
                  }}>
                    <Category className="mr-2" /> Tipo de Ordem
                  </MenuItem>
                )}
                {hasPermission("/configuracoes/questionarios") && (
                  <MenuItem onClick={() => {
                    setAnchorElConfiguracoes(null);
                    handleNavigation('/');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'questionarios' })), 0);
                  }}>
                    <Description className="mr-2" /> Questionários
                  </MenuItem>
                )}
                {hasPermission("/financeiro/contas-pagar") && (
                  <MenuItem onClick={() => setAnchorElFinanceiro(null)}>
                    <Description className="mr-2" /> Empresa
                  </MenuItem>
                )}
              </Menu>
            </Box>

            {/* Menu do Usuário */}
            <Box className="flex-grow-0 ml-auto">
              <Tooltip title="Abrir configurações">
                <IconButton onClick={handleOpenUserMenu} className="p-0">
                  <Avatar className="bg-primary-800">
                    {userData?.nome.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorElUser}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem disabled>
                  <Typography className="font-bold">
                    {userData?.nome}
                  </Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="body2" className="text-gray-600">
                    {userData?.email}
                  </Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="caption" className="text-gray-500">
                    Role: {userData?.role}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleCloseUserMenu}>Meu Perfil</MenuItem>
                <MenuItem onClick={handleSignOut}>Sair</MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Conteúdo das páginas */}
      <Container maxWidth={false} className="px-4 py-6 md:px-6 lg:px-8">
        <Box className="max-w-full">{children}</Box>
      </Container>
    </Box>
  );
}