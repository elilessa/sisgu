import React from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Grid,
    Card,
    CardContent,
    Avatar,
    Switch
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Settings as SettingsIcon,
    Business as BusinessIcon,
    Group as TeamIcon,
    Notifications as BellIcon,
    Description as DocumentIcon,
    CreditCard as CreditCardIcon,
    IntegrationInstructions as ApiIcon,
    ColorLens as ThemeIcon,
    Tune as TuneIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    background: '#F1F5F9',
    textPrimary: '#1E293B'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoConfigDemo() {
    const configGroups = [
        {
            title: 'Geral', items: [
                { name: 'Dados da Empresa', desc: 'CNPJ, Endereço, Logo e Horários', icon: <BusinessIcon />, color: '#3B82F6' },
                { name: 'Equipe e Permissões', desc: 'Gestão de usuários e acessos', icon: <TeamIcon />, color: '#10B981' },
                { name: 'Notificações', desc: 'Email, Push e WhatsApp', icon: <BellIcon />, color: '#F59E0B' }
            ]
        },
        {
            title: 'Operacional', items: [
                { name: 'Modelos de Documentos', desc: 'Personalize seus PDFs de OS', icon: <DocumentIcon />, color: '#8B5CF6' },
                { name: 'Campos Personalizados', desc: 'Crie campos extras para clientes', icon: <TuneIcon />, color: '#EC4899' },
                { name: 'Financeiro', desc: 'Contas bancárias e categorias', icon: <CreditCardIcon />, color: '#14B8A6' }
            ]
        },
        {
            title: 'Avançado', items: [
                { name: 'Integrações (API)', desc: 'Webhooks e Chaves de API', icon: <ApiIcon />, color: '#6366F1' },
                { name: 'Aparência', desc: 'Cores e temas do sistema', icon: <ThemeIcon />, color: '#F43F5E' }
            ]
        }
    ];

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: AUVO_COLORS.background }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: MENU_WIDTH_COLLAPSED,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: MENU_WIDTH_COLLAPSED, bgcolor: AUVO_COLORS.sidebarBg, color: AUVO_COLORS.sidebarText },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><MenuIcon sx={{ color: 'white' }} /></Box>
                <List>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><DashboardIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><SettingsIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Configurações do Sistema</Typography>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 4, flexGrow: 1, overflowY: 'auto' }}>

                    {configGroups.map((group, idx) => (
                        <Box key={idx} sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{group.title}</Typography>
                            <Grid container spacing={3}>
                                {group.items.map((item, i) => (
                                    <Grid item xs={12} sm={6} md={4} key={i}>
                                        <Card elevation={0} sx={{
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', borderColor: '#cbd5e1' }
                                        }}>
                                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                                                <Avatar variant="rounded" sx={{ bgcolor: `${item.color}20`, color: item.color, width: 48, height: 48 }}>
                                                    {item.icon}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                                                    <Typography variant="body2" color="textSecondary">{item.desc}</Typography>
                                                </Box>
                                                <ChevronRightIcon color="action" />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))}

                </Box>
            </Box>
        </Box>
    );
}
