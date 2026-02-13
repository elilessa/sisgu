import React, { useState } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    alpha,
    Button,
    Avatar,
    Divider,
    Chip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Assignment as TaskIcon,
    Settings as SettingsIcon,
    Build as BuildIcon,
    Map as MapIcon,
    Notifications as NotificationsIcon,
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

// Cores inspiradas no Auvo (Azul Profundo e Clean White)
const AUVO_COLORS = {
    sidebarBg: '#0F172A', // Azul muito escuro (Slate 900)
    sidebarText: '#94A3B8', // Cinza azulado claro
    sidebarActive: '#3B82F6', // Azul vibrante (Primary)
    sidebarActiveBg: 'rgba(59, 130, 246, 0.1)',
    headerBg: '#FFFFFF',
    background: '#F1F5F9', // Cinza muito claro (Slate 100)
    cardBg: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B'
};

const MENU_WIDTH_EXPANDED = 240;
const MENU_WIDTH_COLLAPSED = 64;

export function AuvoDemo() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: AUVO_COLORS.background }}>
            {/* SIDEBAR */}
            <Drawer
                variant="permanent"
                sx={{
                    width: sidebarOpen ? MENU_WIDTH_EXPANDED : MENU_WIDTH_COLLAPSED,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: sidebarOpen ? MENU_WIDTH_EXPANDED : MENU_WIDTH_COLLAPSED,
                        boxSizing: 'border-box',
                        backgroundColor: AUVO_COLORS.sidebarBg,
                        color: AUVO_COLORS.sidebarText,
                        transition: 'width 0.2s',
                        overflowX: 'hidden'
                    },
                }}
            >
                {/* Logo Area */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarOpen ? 'space-between' : 'center',
                    p: 2,
                    height: 64
                }}>
                    {sidebarOpen && (
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold', letterSpacing: 1 }}>
                            SISGU<span style={{ color: AUVO_COLORS.sidebarActive }}>.FSM</span>
                        </Typography>
                    )}
                    <IconButton onClick={toggleSidebar} sx={{ color: '#fff' }}>
                        <MenuIcon />
                    </IconButton>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Menu Items */}
                <List sx={{ pt: 2 }}>
                    {[
                        { text: 'Painel', icon: <DashboardIcon />, active: true },
                        { text: 'Agenda', icon: <CalendarIcon /> },
                        { text: 'Tarefas', icon: <TaskIcon /> },
                        { text: 'Mapa', icon: <MapIcon /> },
                        { text: 'Equipe', icon: <PeopleIcon /> },
                        { text: 'Clientes', icon: <BuildIcon /> }, // Ícone genérico de serviço/cliente
                        { text: 'Configurações', icon: <SettingsIcon /> },
                    ].map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                            <ListItemButton
                                sx={{
                                    minHeight: 48,
                                    justifyContent: sidebarOpen ? 'initial' : 'center',
                                    px: 2.5,
                                    mx: 1,
                                    borderRadius: 1,
                                    backgroundColor: item.active ? AUVO_COLORS.sidebarActiveBg : 'transparent',
                                    color: item.active ? AUVO_COLORS.sidebarActive : 'inherit',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        color: '#fff'
                                    }
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: sidebarOpen ? 2 : 'auto',
                                        justifyContent: 'center',
                                        color: item.active ? AUVO_COLORS.sidebarActive : 'inherit',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} sx={{ opacity: sidebarOpen ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            {/* MAIN CONTENT AREA */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER / NAVBAR */}
                <AppBar position="static" elevation={0} sx={{ backgroundColor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                            Visão Geral
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                sx={{
                                    backgroundColor: AUVO_COLORS.sidebarActive,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    boxShadow: 'none',
                                    '&:hover': { boxShadow: 'none', backgroundColor: '#2563EB' }
                                }}
                            >
                                Nova Tarefa
                            </Button>
                            <IconButton>
                                <SearchIcon />
                            </IconButton>
                            <IconButton>
                                <NotificationsIcon />
                            </IconButton>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: AUVO_COLORS.sidebarBg }}>E</Avatar>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* DASHBOARD CONTENT */}
                <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>

                    {/* KPI Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {[
                            { title: 'Tarefas Hoje', value: '24', icon: <TaskIcon />, color: '#3B82F6', sub: '+12% vs ontem' },
                            { title: 'Em Andamento', value: '8', icon: <ScheduleIcon />, color: '#F59E0B', sub: '3 atrasadas' },
                            { title: 'Finalizadas', value: '1,240', icon: <CheckCircleIcon />, color: '#10B981', sub: 'Esse mês' },
                            { title: 'Equipe Online', value: '12/15', icon: <PeopleIcon />, color: '#6366F1', sub: '3 offline' },
                        ].map((stat, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                                                    {stat.title}
                                                </Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: AUVO_COLORS.textPrimary }}>
                                                    {stat.value}
                                                </Typography>
                                            </Box>
                                            <Box sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                backgroundColor: alpha(stat.color, 0.1),
                                                color: stat.color
                                            }}>
                                                {stat.icon}
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: stat.title === 'Em Andamento' ? '#EF4444' : '#10B981', mt: 2, display: 'block', fontWeight: 600 }}>
                                            {stat.sub}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Agenda / Lista de Tarefas */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                                <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Agenda de Hoje</Typography>
                                    <Button size="small">Ver todos</Button>
                                </Box>
                                <List>
                                    {[
                                        { client: 'Condomínio Jardins', task: 'Manutenção Preventiva Câmeras', time: '09:00 - 11:00', status: 'Em Andamento', tech: 'Carlos Silva', color: 'warning' },
                                        { client: 'Empresa TechSoluções', task: 'Instalação de Controle de Acesso', time: '13:00 - 16:00', status: 'Pendente', tech: 'Ana Souza', color: 'info' },
                                        { client: 'Residência Marcelo', task: 'Troca de Sensor', time: '08:00 - 09:00', status: 'Finalizado', tech: 'Roberto Dias', color: 'success' },
                                        { client: 'Shopping Central', task: 'Visita Técnica - Orçamento', time: '16:30 - 17:30', status: 'Atrasado', tech: 'Carlos Silva', color: 'error' },
                                    ].map((task, i) => (
                                        <React.Fragment key={i}>
                                            <ListItem alignItems="flex-start" secondaryAction={
                                                <IconButton edge="end">
                                                    <MoreVertIcon />
                                                </IconButton>
                                            }>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{task.task}</Typography>
                                                            <Chip
                                                                label={task.status}
                                                                size="small"
                                                                color={task.color as any}
                                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <React.Fragment>
                                                            <Typography
                                                                sx={{ display: 'block', mt: 0.5 }}
                                                                component="span"
                                                                variant="body2"
                                                                color="text.primary"
                                                            >
                                                                {task.client}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <ScheduleIcon sx={{ fontSize: 14 }} /> {task.time}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <PeopleIcon sx={{ fontSize: 14 }} /> {task.tech}
                                                                </Typography>
                                                            </Box>
                                                        </React.Fragment>
                                                    }
                                                />
                                            </ListItem>
                                            {i < 3 && <Divider component="li" />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Card>
                        </Grid>

                        {/* Mapa Preview */}
                        <Grid item xs={12} md={4}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%', minHeight: 400 }}>
                                <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Equipe no Mapa</Typography>
                                </Box>
                                <Box sx={{
                                    height: '100%',
                                    bgcolor: '#e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    p: 4
                                }}>
                                    <MapIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
                                    <Typography variant="body2" color="textSecondary" align="center">
                                        Visualização do mapa estático (Demo)<br />
                                        Imagine aqui o Google Maps com os pins dos técnicos.
                                    </Typography>
                                    <Button variant="outlined" sx={{ mt: 2, bgcolor: 'white' }}>Expandir Mapa</Button>
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>

                </Box>
            </Box>
        </Box>
    );
}
