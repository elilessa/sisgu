import React, { useState } from 'react';
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
    Card,
    CardContent,
    Avatar,
    Chip,
    Paper,
    InputBase,
    Divider
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Map as MapIcon,
    Search as SearchIcon,
    MyLocation as MyLocationIcon,
    DirectionsCar as CarIcon,
    Construction as TechIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    mapBg: '#E2E8F0', // Cor de fundo simulando mapa loading
    textPrimary: '#1E293B'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoMapaDemo() {
    const [selectedPin, setSelectedPin] = useState<number | null>(null);

    const locations = [
        { id: 1, lat: '30%', lng: '40%', name: 'Carlos Silva', status: 'Em Rota', type: 'tech', avatar: 'C', task: 'Indo para Cond. Jardins' },
        { id: 2, lat: '60%', lng: '55%', name: 'Ana Souza', status: 'Em Atendimento', type: 'tech', avatar: 'A', task: 'Instalando DVR em Padaria' },
        { id: 3, lat: '45%', lng: '70%', name: 'Roberto Dias', status: 'Parado', type: 'tech', avatar: 'R', task: 'Aguardando Aprovação' },
    ];

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* SIDEBAR */}
            <Drawer
                variant="permanent"
                sx={{
                    width: MENU_WIDTH_COLLAPSED,
                    flexShrink: 0,
                    zIndex: 1201, // Acima do mapa
                    '& .MuiDrawer-paper': { width: MENU_WIDTH_COLLAPSED, bgcolor: AUVO_COLORS.sidebarBg, color: AUVO_COLORS.sidebarText, overflowX: 'hidden' },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><MenuIcon sx={{ color: 'white' }} /></Box>
                <List>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><DashboardIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><MapIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><PeopleIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            {/* MAPA (MOCKUP VISUAL) */}
            <Box sx={{
                flexGrow: 1, position: 'relative', bgcolor: '#CAD2D3', overflow: 'hidden',
                backgroundImage: 'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
                backgroundSize: '100px 100px'
            }}>

                {/* MAP CONTROLS - FLOATING */}
                <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, display: 'flex', gap: 2 }}>
                    <Paper elevation={3} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400, borderRadius: 2 }}>
                        <IconButton sx={{ p: '10px' }}><SearchIcon /></IconButton>
                        <InputBase sx={{ ml: 1, flex: 1 }} placeholder="Buscar técnico ou cliente no mapa" />
                        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                        <IconButton sx={{ p: '10px' }} color="primary"><FilterListIcon /></IconButton>
                    </Paper>
                </Box>

                <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
                    <Paper elevation={3} sx={{ width: 300, borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #eee' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Equipe em Campo (3)</Typography>
                        </Box>
                        <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
                            {locations.map((loc) => (
                                <ListItem key={loc.id} button onClick={() => setSelectedPin(loc.id)} selected={selectedPin === loc.id}>
                                    <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: loc.status === 'Em Atendimento' ? 'orange' : 'primary.main', fontSize: '0.8rem' }}>{loc.avatar}</Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{loc.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">{loc.status}</Typography>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>

                {/* PINS ON MAP */}
                {locations.map((loc) => (
                    <Box key={loc.id} sx={{
                        position: 'absolute',
                        top: loc.lat,
                        left: loc.lng,
                        transform: 'translate(-50%, -100%)',
                        cursor: 'pointer',
                        zIndex: selectedPin === loc.id ? 10 : 1,
                        transition: 'all 0.3s'
                    }}
                        onClick={() => setSelectedPin(loc.id)}
                    >
                        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Info Bubble (Show on hover or select) */}
                            {(selectedPin === loc.id) && (
                                <Paper elevation={4} sx={{ mb: 1, p: 1.5, borderRadius: 2, width: 200, bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" fontWeight={700}>{loc.name}</Typography>
                                    <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1 }}>{loc.task}</Typography>
                                    <Chip label={loc.status} size="small" color={loc.status === 'Em Atendimento' ? 'warning' : 'primary'} sx={{ height: 20, fontSize: '0.65rem' }} />
                                </Paper>
                            )}

                            {/* Pin Icon */}
                            <Box sx={{
                                width: 40, height: 40,
                                bgcolor: loc.status === 'Em Atendimento' ? '#F59E0B' : '#3B82F6',
                                borderRadius: '50%', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                {loc.status === 'Em Rota' ? <CarIcon fontSize="small" /> : <TechIcon fontSize="small" />}
                            </Box>
                            {/* Shadow */}
                            <Box sx={{ width: 10, height: 4, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '50%', mt: 0.5 }} />
                        </Box>
                    </Box>
                ))}

                <Box sx={{ position: 'absolute', bottom: 30, right: 30 }}>
                    <IconButton sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' }, boxShadow: 3 }}><MyLocationIcon /></IconButton>
                </Box>

            </Box>
        </Box>
    );
}
