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
    Avatar,
    Card,
    CardContent,
    Grid,
    Chip,
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Assignment as TaskIcon,
    Map as MapIcon,
    FilterList as FilterListIcon,
    Add as AddIcon,
    AccessTime as AccessTimeIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    MoreHoriz as MoreHorizIcon
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

export function AuvoTarefasDemo() {
    const technicians = [
        {
            id: 1, name: 'Carlos Silva', avatar: 'C', tasks: [
                { id: 101, title: 'Manutenção Preventiva', client: 'Condomínio Jardins', time: '09:00 - 11:00', status: 'Em Andamento', type: 'preventiva' },
                { id: 102, title: 'Instalação DVR', client: 'Shopping Central', time: '13:00 - 16:00', status: 'Pendente', type: 'instalacao' }
            ]
        },
        {
            id: 2, name: 'Ana Souza', avatar: 'A', tasks: [
                { id: 201, title: 'Visita Técnica', client: 'Padaria do João', time: '08:30 - 09:30', status: 'Finalizado', type: 'visita' },
                { id: 202, title: 'Configuração Remota', client: 'TechSolutions', time: '10:00 - 12:00', status: 'Pendente', type: 'remoto' },
                { id: 203, title: 'Troca de Sensor', client: 'Residência Marcelo', time: '14:00 - 15:00', status: 'Pendente', type: 'corretiva' }
            ]
        },
        { id: 3, name: 'Roberto Dias', avatar: 'R', tasks: [] } // Técnico livre
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Finalizado': return 'success';
            case 'Em Andamento': return 'primary';
            case 'Pendente': return 'default';
            default: return 'default';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'preventiva': return '#3B82F6';
            case 'instalacao': return '#8B5CF6';
            case 'visita': return '#F59E0B';
            case 'corretiva': return '#EF4444';
            default: return '#64748B';
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: AUVO_COLORS.background }}>
            {/* SIDEBAR */}
            <Drawer
                variant="permanent"
                sx={{
                    width: MENU_WIDTH_COLLAPSED,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: MENU_WIDTH_COLLAPSED, bgcolor: AUVO_COLORS.sidebarBg, color: AUVO_COLORS.sidebarText, overflowX: 'hidden' },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><MenuIcon sx={{ color: 'white' }} /></Box>
                <List>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><DashboardIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><CalendarIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><TaskIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><MapIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><PeopleIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            {/* MAIN CONTENT */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Agenda de Equipes - Hoje (04/02)</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined" startIcon={<FilterListIcon />}>Filtrar</Button>
                            <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: AUVO_COLORS.sidebarActive, textTransform: 'none' }}>Nova Tarefa</Button>
                        </Box>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowX: 'auto' }}>

                    {/* LINHA DO TEMPO POR TÉCNICO */}
                    <Grid container spacing={3}>
                        {technicians.map((tech) => (
                            <Grid item xs={12} md={4} key={tech.id}>
                                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, height: '100%', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                                    {/* Header do Técnico */}
                                    <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', bgcolor: 'white', borderTopLeftRadius: 8, borderTopRightRadius: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: tech.tasks.length === 0 ? '#CBD5E1' : '#3B82F6' }}>{tech.avatar}</Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700}>{tech.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">{tech.tasks.length} Tarefas • 85% Ocupado</Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ ml: 'auto' }}><MoreHorizIcon /></IconButton>
                                    </Box>

                                    {/* Área de Tarefas */}
                                    <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {tech.tasks.length === 0 ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.5 }}>
                                                <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
                                                <Typography variant="body2">Livre hoje</Typography>
                                            </Box>
                                        ) : (
                                            tech.tasks.map((task) => (
                                                <Card key={task.id} elevation={0} sx={{
                                                    border: '1px solid #E2E8F0',
                                                    position: 'relative',
                                                    overflow: 'visible',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                                                }}>
                                                    {/* Faixa lateral colorida indicando tipo */}
                                                    <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: getTypeColor(task.type) }} />

                                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, pl: 3 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Chip label={task.type.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: getTypeColor(task.type), color: 'white' }} />
                                                            <Chip label={task.status} size="small" color={getStatusColor(task.status) as any} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                        </Box>

                                                        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.5 }}>{task.title}</Typography>
                                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1, fontSize: '0.85rem' }}>{task.client}</Typography>

                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B' }}>
                                                            <AccessTimeIcon sx={{ fontSize: 16 }} />
                                                            <Typography variant="caption" fontWeight={600}>{task.time}</Typography>
                                                        </Box>

                                                        {task.status === 'Em Andamento' && (
                                                            <Box sx={{ mt: 1.5 }}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                                    <Typography variant="caption" color="primary" fontWeight={600}>Em execução...</Typography>
                                                                    <Typography variant="caption">45m</Typography>
                                                                </Box>
                                                                <LinearProgress variant="determinate" value={60} sx={{ height: 6, borderRadius: 3 }} />
                                                            </Box>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}
