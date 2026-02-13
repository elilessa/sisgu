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
    Tabs,
    Tab,
    TextField,
    InputAdornment
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Build as BuildIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Add as AddIcon,
    QrCodeScanner as QrCodeIcon,
    History as HistoryIcon,
    LocationOn as LocationOnIcon,
    MoreVert as MoreVertIcon,
    Router as RouterIcon,
    CameraAlt as CameraIcon,
    SettingsInputHdmi as CableIcon
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

export function AuvoEquipamentosDemo() {
    const equipments = [
        { id: 'EQ-001', name: 'DVR Hikvision 16ch', serial: 'HK-99887766', status: 'Em Uso', location: 'Condomínio Jardins', type: 'dvr', image: 'https://via.placeholder.com/150' },
        { id: 'EQ-002', name: 'Câmera Bullet IP', serial: 'CAM-112233', status: 'Disponível', location: 'Estoque Central', type: 'camera', image: 'https://via.placeholder.com/150' },
        { id: 'EQ-003', name: 'Roteador Cisco', serial: 'CS-554433', status: 'Manutenção', location: 'Assistência Técnica', type: 'rede', image: 'https://via.placeholder.com/150' },
        { id: 'EQ-004', name: 'Câmera Dome 2MP', serial: 'CAM-998811', status: 'Em Uso', location: 'Padaria do João', type: 'camera', image: 'https://via.placeholder.com/150' },
        { id: 'EQ-005', name: 'Nobreak 1200VA', serial: 'NB-777666', status: 'Disponível', location: 'Estoque Central', type: 'energia', image: 'https://via.placeholder.com/150' },
    ];

    const getIconByType = (type: string) => {
        switch (type) {
            case 'camera': return <CameraIcon />;
            case 'dvr': return <SettingsInputHdmiIcon />; // Placeholder
            case 'rede': return <RouterIcon />;
            default: return <BuildIcon />;
        }
    };

    // Quick fix for icon usage
    const SettingsInputHdmiIcon = CableIcon;

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: AUVO_COLORS.background }}>
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
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><BuildIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Gestão de Ativos</Typography>
                        <Button variant="contained" startIcon={<QrCodeIcon />} sx={{ bgcolor: AUVO_COLORS.sidebarActive, textTransform: 'none' }}>Ler QR Code</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>

                    {/* SEARCH BAR MODERN */}
                    <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            placeholder="Buscar por nome, serial ou patrimônio..."
                            size="small"
                            sx={{ bgcolor: 'white' }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                            }}
                        />
                        <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ bgcolor: 'white' }}>Filtros</Button>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>Novo</Button>
                    </Box>

                    <Grid container spacing={3}>
                        {equipments.map((eq) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
                                <Card elevation={0} sx={{
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }
                                }}>
                                    <Box sx={{ height: 6, bgcolor: eq.status === 'Disponível' ? '#10B981' : (eq.status === 'Em Uso' ? '#3B82F6' : '#F59E0B') }} />
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Avatar variant="rounded" sx={{ bgcolor: '#F1F5F9', color: '#64748B' }}>
                                                {getIconByType(eq.type)}
                                            </Avatar>
                                            <IconButton size="small"><MoreVertIcon /></IconButton>
                                        </Box>

                                        <Typography variant="subtitle1" fontWeight={700} noWrap title={eq.name}>{eq.name}</Typography>
                                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>S/N: {eq.serial}</Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: '#64748B' }}>
                                            <LocationOnIcon sx={{ fontSize: 16 }} />
                                            <Typography variant="body2" noWrap>{eq.location}</Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                            <Chip
                                                label={eq.status}
                                                size="small"
                                                sx={{
                                                    bgcolor: eq.status === 'Disponível' ? '#D1FAE5' : (eq.status === 'Em Uso' ? '#DBEAFE' : '#FEF3C7'),
                                                    color: eq.status === 'Disponível' ? '#065F46' : (eq.status === 'Em Uso' ? '#1E40AF' : '#92400E'),
                                                    fontWeight: 600,
                                                    height: 24
                                                }}
                                            />
                                            <Button size="small" startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}>Histórico</Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                </Box>
            </Box>
        </Box>
    );
}
