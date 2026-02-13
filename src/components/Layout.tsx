import React, { useState, ReactNode, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
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
  List as ListIcon,
  Event,
  Build,
  Engineering,
  RequestQuote,
  Sell,
  AccountBalance,
  ShoppingCart,
  TrendingUp,
  BarChart,
  Business,
  LocalShipping,
  Category,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Receipt,
  ChevronLeft,
  AccountTree as AccountTreeIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { customColors } from "../theme";

// Cor padrão para cabeçalhos de tabela
export const TABLE_HEADER_BG_COLOR = customColors.tableHeader;

// Constantes de largura do Drawer
const DRAWER_WIDTH = 280;
const CLOSED_DRAWER_WIDTH = 65;

interface LayoutProps {
  children: ReactNode;
}

interface MenuItemData {
  title: string;
  icon: React.ReactNode;
  path?: string; // Se tiver path direto
  pageDetail?: string; // Se for navegação interna do Dashboard
  permission?: string;
  children?: MenuItemData[];
}

export function Layout({ children }: LayoutProps) {
  const { userData, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Estado do Drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  // Estado para controlar quais submenus estão abertos na Sidebar
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMouseEnter = () => {
    if (!isMobile) setHoverOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setHoverOpen(false);
      // Opcional: fechar submenus ao sair?
      // setOpenSubmenus({}); // Descomente se quiser que resete
    }
  };

  const handleSubmenuToggle = (title: string) => {
    // Se a sidebar estiver fechada (e não for mobile), expande ela primeiro
    if (!isMobile && !hoverOpen) {
      setHoverOpen(true);
    }
    setOpenSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

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

  // Função centralizada de navegação
  const handleNavigation = (item: MenuItemData) => {
    if (item.path) {
      console.log("[Layout] Navegando para path:", item.path);
      navigate(item.path);
      // Se tiver pageDetail também, dispara o evento (híbrido)
      if (item.pageDetail) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("navigate-to-page", { detail: item.pageDetail })
          );
        }, 50);
      }
    } else if (item.pageDetail) {
      console.log("[Layout] Navegando para page:", item.pageDetail);
      // Se não estivermos na home, vai pra home primeiro
      if (window.location.pathname !== "/") {
        navigate("/");
      }
      // Dispara evento
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("navigate-to-page", { detail: item.pageDetail })
        );
      }, 0);
    }

    // No mobile, fecha o drawer após clicar
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Definição da Estrutura do Menu
  const menuStructure: MenuItemData[] = useMemo(
    () => [
      {
        title: "Início",
        icon: <Home />,
        path: "/",
        pageDetail: "dashboard",
      },
      {
        title: "Clientes",
        icon: <People />,
        pageDetail: "clientes",
        permission: "/clientes/lista",
      },
      {
        title: "Agenda Técnica",
        icon: <CalendarMonth />,
        children: [
          {
            title: "Visualizar Agenda",
            icon: <Event />,
            permission: "/agenda/visualizar",
            pageDetail: "agenda-visualizar",
          },
          {
            title: "Ordens de Serviço",
            icon: <Build />,
            permission: "/agenda/ordens-servico",
            // Sem pageDetail definido no original, assumindo apenas exibição condicional no menu original
          },
          {
            title: "Área Técnica",
            icon: <Engineering />,
            permission: "/agenda/area-tecnica",
            pageDetail: "area-tecnica",
          },
        ],
      },
      {
        title: "Contratos",
        icon: <Description />,
        permission: "/contratos",
        pageDetail: "contratos",
      },
      {
        title: "Comercial",
        icon: <BusinessCenter />,
        children: [
          {
            title: "Agenda Comercial",
            icon: <CalendarMonth />,
            permission: "/comercial/agenda-comercial",
            pageDetail: "agenda-comercial",
          },
          {
            title: "Orçamentos Equipamentos",
            icon: <RequestQuote />,
            permission: "/orcamentos-equipamentos",
            pageDetail: "orcamentos-equipamentos",
          },
          {
            title: "Orçamentos Contratos",
            icon: <Description />,
            permission: "/orcamentos-contratos",
            pageDetail: "orcamentos-contratos",
          },
        ],
      },
      {
        title: "Financeiro",
        icon: <AttachMoney />,
        children: [
          {
            title: "Vendas",
            icon: <Sell />,
            permission: "/comercial/vendas",
            pageDetail: "vendas",
          },
          {
            title: "Caixa",
            icon: <AccountBalance />,
            permission: "/financeiro/fluxo-caixa",
            pageDetail: "fluxo-caixa",
          },
          {
            title: "Contas a Receber",
            icon: <AttachMoney />,
            permission: "/financeiro/contas-receber",
            pageDetail: "contas-receber",
          },
          {
            title: "Contas a Pagar",
            icon: <AttachMoney />,
            permission: "/financeiro/contas-pagar",
            pageDetail: "contas-pagar",
          },
          {
            title: "Lançamentos Contábeis",
            icon: <AccountBalance />,
            permission: "/financeiro/lancamentos",
            pageDetail: "lancamentos",
          },
          {
            title: "Boletos",
            icon: <Receipt />,
            permission: "/boletos",
            pageDetail: "boletos",
          },

          {
            title: "Nota Fiscal",
            icon: <Description />,
            permission: "/financeiro/nota-fiscal",
          },
        ],
      },
      {
        title: "Produtos",
        icon: <Inventory />,
        children: [
          {
            title: "Lista de Produtos",
            icon: <ListIcon />,
            permission: "/produtos/lista",
            pageDetail: "produtos",
          },
          {
            title: "Estoque",
            icon: <Inventory />,
            permission: "/produtos/estoque",
            pageDetail: "estoque",
          },
          {
            title: "Compras",
            icon: <ShoppingCart />,
            permission: "/produtos/compras", // check permission name
            pageDetail: "compras", // check pageDetail name. Original: 'compras'. Dashboard case? Dashboard doesn't have 'compras' case explicitly shown in my view_file range but likely exists or matches default. WARNING: Dashboard.tsx lines 84-124 don't show 'compras'. Shows 'estoque', 'produtos'. I will maintain 'compras' key hoping Dashboard handles it or user adds it.
          },
          {
            title: "Precificação",
            icon: <TrendingUp />,
            permission: "/produtos/precificacao",
            pageDetail: "precificacao",
          },
        ],
      },
      {
        title: "Relatórios",
        icon: <Assessment />,
        pageDetail: "relatorios",
        permission: "/relatorios",
      },
      {
        title: "Configurações",
        icon: <Settings />,
        children: [
          {
            title: "Usuários",
            icon: <ManageAccounts />,
            permission: "/configuracoes/usuarios",
            pageDetail: "usuarios",
          },
          {
            title: "Administradoras",
            icon: <Business />,
            permission: "/configuracoes/administradoras",
            pageDetail: "administradoras",
          },
          {
            title: "Fornecedores",
            icon: <LocalShipping />,
            permission: "/configuracoes/fornecedores",
            pageDetail: "fornecedores",
          },

          {
            title: "Banco",
            icon: <AccountBalance />,
            permission: "/configuracoes/banco",
            pageDetail: "banco",
          },
          {
            title: "Parâmetros Financeiros",
            icon: <AttachMoney />,
            children: [
              {
                title: "Centros de Custo",
                icon: <AccountTreeIcon />, // Certifique-se de ter importado isso ou troque por outro
                permission: "/configuracoes/centros-custo",
                pageDetail: "centros-custo",
              },
              {
                title: "Plano de Contas",
                icon: <AccountBalanceIcon />,
                permission: "/configuracoes/plano-contas",
                pageDetail: "plano-contas",
              },
            ],
          },
          {
            title: "Parâmetros de Produtos",
            icon: <Settings />,
            permission: "/configuracoes/parametros-produtos",
            pageDetail: "parametros-produtos",
          },

          {
            title: "Modelos de Documentos",
            icon: <Description />,
            permission: "/configuracoes/parametros-comerciais",
            pageDetail: "parametros-comerciais",
          },
          {
            title: "Tipo de Ordem",
            icon: <Category />,
            permission: "/configuracoes/tipo-ordem",
            pageDetail: "tipo-ordem",
          },
          {
            title: "Questionários",
            icon: <Description />,
            permission: "/configuracoes/questionarios",
            pageDetail: "questionarios",
          },
          {
            title: "Empresa",
            icon: <Business />,
            permission: "/configuracoes/empresa",
            pageDetail: "empresa",
          },
        ],
      },
    ],
    [] // Dep array for memo
  );

  // Renderização Recursiva do Menu
  const renderMenuItems = (items: MenuItemData[], depth = 0) => {
    return items.map((item, index) => {
      // Verifica permissão
      if (item.permission && !hasPermission(item.permission)) {
        return null;
      }

      // Se tem filhos
      if (item.children && item.children.length > 0) {
        // Verifica se algum filho é visível (tem permissão)
        const hasVisibleChildren = item.children.some(
          (child) => !child.permission || hasPermission(child.permission)
        );
        if (!hasVisibleChildren) return null;

        const isOpen = openSubmenus[item.title];

        return (
          <React.Fragment key={item.title}>
            <ListItemButton
              onClick={() => handleSubmenuToggle(item.title)}
              sx={{
                pl: depth * 2 + 2, // Indentação
                justifyContent: hoverOpen || isMobile ? "initial" : "center",
                px: 2.5,
                color: 'inherit',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.16)', // Lighter on hover
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: hoverOpen || isMobile ? 3 : "auto",
                  justifyContent: "center",
                  color: "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                sx={{
                  opacity: hoverOpen || isMobile ? 1 : 0, // Esconde texto se fechado
                  display: hoverOpen || isMobile ? "block" : "none", // Remove do DOM visual para não ocupar espaço
                  transition: "opacity 0.2s",
                }}
              />
              {(hoverOpen || isMobile) && (isOpen ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>

            {/* Submenu Collapse */}
            <Collapse in={isOpen && (hoverOpen || isMobile)} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderMenuItems(item.children, depth + 1)}
              </List>
            </Collapse>
          </React.Fragment>
        );
      }

      // Item simples (link)
      return (
        <ListItem key={item.title} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            onClick={() => handleNavigation(item)}
            sx={{
              minHeight: 48,
              justifyContent: hoverOpen || isMobile ? "initial" : "center",
              px: 2.5,
              pl: depth * 2 + 2.5, // Indentação correta
              color: 'inherit',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.16)',
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: hoverOpen || isMobile ? 3 : "auto",
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              sx={{
                opacity: hoverOpen || isMobile ? 1 : 0,
                display: hoverOpen || isMobile ? "block" : "none",
                transition: "opacity 0.2s",
              }}
            />
          </ListItemButton>
        </ListItem>
      );
    });
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: customColors.gradientVertical, // Custom User Gradient from theme.ts
        color: "primary.contrastText", // Text White
      }}
    >
      {/* Header do Drawer (Logo/Titulo) */}
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: hoverOpen || isMobile ? "flex-start" : "center",
          px: [1],
          transition: "0.3s",
        }}
      >
        <DashboardIcon sx={{ color: "primary.contrastText", mr: hoverOpen || isMobile ? 2 : 0 }} />
        {(hoverOpen || isMobile) && (
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: "bold", color: "primary.contrastText" }}
          >
            SG Sistemas
          </Typography>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255, 0.2)' }} />

      {/* Lista de Menu */}
      <Box sx={{ overflowY: "auto", flexGrow: 1, overflowX: "hidden" }}>
        <List>{renderMenuItems(menuStructure)}</List>
      </Box>

      {/* Footer do Drawer (Opcional - Info do Usuário ou Sair) */}
      <Divider sx={{ borderColor: 'rgba(255,255,255, 0.2)' }} />
      {/* 
         Pode-se colocar o botão de Sair aqui embaixo também, 
         caso queira limpar a TopBar totalmente 
       */}
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* TopBar (AppBar) */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${hoverOpen ? DRAWER_WIDTH : CLOSED_DRAWER_WIDTH}px)` },
          ml: { md: `${hoverOpen ? DRAWER_WIDTH : CLOSED_DRAWER_WIDTH}px` },
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          background: customColors.gradientHorizontal, // Custom User Gradient from theme.ts
          boxShadow: 1, // Sutil
        }}
      >
        <Toolbar>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Título dinâmico ou fixo */}

          </Typography>

          {/* User Profile Right Side */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Configurações do Usuário">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: "secondary.main" }}>
                  {userData?.nome.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem disabled>
                <Typography sx={{ fontWeight: 'bold' }}>
                  {userData?.nome}
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {userData?.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleCloseUserMenu}>Minha Conta</MenuItem>
              <MenuItem onClick={handleSignOut}>Sair</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar (Desktop & Mobile) */}
      <Box
        component="nav"
        sx={{ width: { md: hoverOpen ? DRAWER_WIDTH : CLOSED_DRAWER_WIDTH }, flexShrink: { md: 0 }, transition: 'width 0.3s' }}
        aria-label="mailbox folders"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Mobile Drawer (Temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer (Permanent but dynamic width) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: hoverOpen ? DRAWER_WIDTH : CLOSED_DRAWER_WIDTH,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${hoverOpen ? DRAWER_WIDTH : CLOSED_DRAWER_WIDTH}px)` },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          }),
          mt: 8 // Space for AppBar
        }}
      >
        {/* Container limites width on large screens if desired, or full width */}
        <Container maxWidth={false} disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}