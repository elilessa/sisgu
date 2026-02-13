import React, { useState } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Button,
    Paper,
    Chip,
    LinearProgress,
    Avatar
} from '@mui/material';
import {
    Menu as MenuIcon,
    EventNote as EventIcon,
    ViewTimeline as TimelineIcon,
    ChevronLeft,
    ChevronRight,
    Add as AddIcon,
    Map as MapIcon,
    Place as PlaceIcon,
    LocalShipping as TruckIcon,
    CheckCircle as DoneIcon
} from '@mui/icons-material';

const FC_COLORS = {
    primary: '#0052cc',
    bg: '#F4F5F7',
    sidebar: '#FFFFFF',
    text: '#172B4D',
};

const MENU_WIDTH = 64;

// Mock Data: Operational focus
const daysData = [
    { day: 2, capacity: 40, totalOS: 4, pending: 0, technicians: 2 },
    { day: 4, capacity: 90, totalOS: 12, pending: 3, technicians: 5 }, // Today (Busy)
    { day: 15, capacity: 10, totalOS: 1, pending: 1, technicians: 1 },
];

const routeData = [
    { id: 1, time: '08:00', client: 'Padaria Central', type: 'Instalação', status: 'done' },
    { id: 2, time: '10:30', client: 'Escola Modelo', type: 'Manutenção', status: 'progress' },
    { id: 3, time: '14:00', client: 'Shopping Plaza', type: 'Visita', status: 'pending' },
    { id: 4, time: '16:30', client: 'Cond. Jardins', type: 'Rede', status: 'pending' },
];

export function FieldControlCalendarioDemo() {
    const [selectedDay, setSelectedDay] = useState<number>(4);

    // Helper: Create grid slots
    const calendarSlots = [];
    for (let i = 1; i <= 35; i++) {
        const dayNum = i <= 28 ? i : null;
        const data = daysData.find(d => d.day === dayNum);
        calendarSlots.push({ id: i, day: dayNum, data });
    }

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: FC_COLORS.bg }}>
            <Drawer variant="permanent" sx={{ width: MENU_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: MENU_WIDTH, bgcolor: FC_COLORS.sidebar } }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><MenuIcon sx={{ color: FC_COLORS.text }} /></Box>
                <List>
                    <ListItemButton sx={{ justifyContent: 'center', mb: 1, color: FC_COLORS.primary }}><EventIcon /></ListItemButton>
                    <ListItemButton sx={{ justifyContent: 'center', mb: 1 }}><TimelineIcon /></ListItemButton>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: FC_COLORS.text, borderBottom: '1px solid #DFE1E6' }}>
                    <Toolbar>
                        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: FC_COLORS.primary }}>Gestão de Escalas</Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F4F5F7', borderRadius: 1, px: 1, mr: 2 }}>
                            <IconButton size="small"><ChevronLeft /></IconButton>
                            <Typography fontSize="0.9rem" fontWeight={600} sx={{ mx: 2 }}>Fevereiro 2026</Typography>
                            <IconButton size="small"><ChevronRight /></IconButton>
                        </Box>
                        <Button variant="outlined" startIcon={<MapIcon />} sx={{ mr: 2 }}>Mapa Geral</Button>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#36B37E' }}>Nova Rota</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflow: 'hidden', display: 'flex', gap: 3 }}>

                    {/* Calendar Grid (CSS GRID FIX) */}
                    <Paper elevation={0} sx={{ flex: 1.5, border: '1px solid #EBECF0', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: '#FAFBFC', borderBottom: '1px solid #EBECF0' }}>
                            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                                <Box key={d} sx={{ p: 1.5, textAlign: 'center', fontWeight: 'bold', color: '#5E6C84', fontSize: '0.75rem', borderRight: '1px solid #EBECF0' }}>
                                    {d}
                                </Box>
                            ))}
                        </Box>

                        {/* Body */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flexGrow: 1 }}>
                            {calendarSlots.map((slot) => (
                                <Box key={slot.id}
                                    onClick={() => slot.day && setSelectedDay(slot.day)}
                                    sx={{
                                        borderRight: '1px solid #EBECF0',
                                        borderBottom: '1px solid #EBECF0',
                                        bgcolor: selectedDay === slot.day ? '#DEEBFF' : 'white',
                                        p: 1,
                                        cursor: slot.day ? 'pointer' : 'default',
                                        position: 'relative',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        '&:hover': slot.day ? { bgcolor: '#F4F5F7' } : {}
                                    }}
                                >
                                    {slot.day && (
                                        <>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" fontWeight={700} color={selectedDay === slot.day ? 'primary' : 'textSecondary'}>{slot.day}</Typography>
                                                {slot.data && (
                                                    <Chip label={`${slot.data.totalOS} OS`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#EBECF0', color: '#42526E' }} />
                                                )}
                                            </Box>

                                            {slot.data && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption" color="textSecondary">Lotação</Typography>
                                                        <Typography variant="caption" fontWeight={700} color={slot.data.capacity > 80 ? 'error' : 'primary'}>{slot.data.capacity}%</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={slot.data.capacity}
                                                        sx={{
                                                            height: 6, borderRadius: 3,
                                                            bgcolor: '#EBECF0',
                                                            '& .MuiLinearProgress-bar': { bgcolor: slot.data.capacity > 80 ? '#BF2600' : '#36B37E' }
                                                        }}
                                                    />
                                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                                        {slot.data.technicians} Técnicos
                                                    </Typography>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Right Panel: Route Logistics */}
                    <Paper elevation={0} sx={{ flex: 1, border: '1px solid #EBECF0', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid #EBECF0', bgcolor: '#FAFBFC' }}>
                            <Typography variant="overline" color="textSecondary" fontWeight={700}>ROTA DO DIA</Typography>
                            <Typography variant="h5" fontWeight={700} color={FC_COLORS.primary}>{selectedDay} de Fevereiro</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip icon={<TruckIcon fontSize="small" />} label="5 Técnicos em Campo" size="small" color="primary" variant="outlined" />
                                <Chip icon={<CheckCircleOutline fontSize="small" />} label="90% Ocupado" size="small" color="warning" variant="outlined" />
                            </Box>
                        </Box>

                        <Box sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
                            {/* Timeline Vertical */}
                            <Box sx={{ p: 2 }}>
                                {routeData.map((stop, index) => (
                                    <Box key={stop.id} sx={{ display: 'flex', mb: 0 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                                            <Avatar sx={{
                                                width: 24, height: 24, fontSize: '0.8rem', bgcolor: stop.status === 'done' ? '#36B37E' : '#B3BAC5',
                                                color: 'white'
                                            }}>
                                                {index + 1}
                                            </Avatar>
                                            {index < routeData.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: '#EBECF0', my: 0.5 }} />}
                                        </Box>
                                        <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #EBECF0', mb: 2, bgcolor: stop.status === 'done' ? '#F4F5F7' : 'white' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" fontWeight={700} color="textSecondary">{stop.time}</Typography>
                                                <Chip label={stop.status} size="small" sx={{ height: 16, fontSize: '0.6rem', textTransform: 'uppercase' }} />
                                            </Box>
                                            <Typography variant="subtitle2" fontWeight={700}>{stop.client}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                <PlaceIcon fontSize="inherit" color="action" />
                                                <Typography variant="caption" color="textSecondary">Rua das Flores, 123 - Centro</Typography>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Button fullWidth variant="contained" sx={{ borderRadius: 0, py: 2 }}>Otimizar Rotas (IA)</Button>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}

function CheckCircleOutline(props: any) {
    return <DoneIcon {...props} />;
}
