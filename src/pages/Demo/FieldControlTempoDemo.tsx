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
    Button,
    Paper,
    Avatar,
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    Menu as MenuIcon,
    EventNote as EventIcon,
    ViewTimeline as TimelineIcon,
    FilterList as FilterIcon,
    ChevronLeft,
    ChevronRight,
    Add as AddIcon,
    Search as SearchIcon,
    AccessTime as ClockIcon,
    LocalShipping as TruckIcon
} from '@mui/icons-material';

const FC_COLORS = {
    primary: '#0052cc', // Azul Field Control style
    secondary: '#ffab00', // Laranja destaque
    bg: '#F4F5F7',
    sidebar: '#FFFFFF',
    text: '#172B4D',
    success: '#36B37E',
    waiting: '#FF991F',
    neutral: '#C1C7D0'
};

const MENU_WIDTH = 64;
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8h to 18h

// Mock Technicians & Tasks
const technicians = [
    { id: 1, name: 'Carlos Silva', avatar: 'C', status: 'online' },
    { id: 2, name: 'Roberto Almeida', avatar: 'R', status: 'busy' },
    { id: 3, name: 'Marcos Dias', avatar: 'M', status: 'offline' },
    { id: 4, name: 'João Souza', avatar: 'J', status: 'online' },
];

const tasks = [
    { id: 101, techId: 1, start: 8.5, duration: 2, title: 'Instalação #4092', client: 'Padaria Central', status: 'done' },
    { id: 102, techId: 1, start: 11, duration: 1.5, title: 'Manutenção #4100', client: 'Escola Modelo', status: 'progress' },
    { id: 103, techId: 1, start: 14, duration: 3, title: 'Rede #4150', client: 'Escritório Advocacia', status: 'todo' },

    { id: 201, techId: 2, start: 9, duration: 4, title: 'Infraestrutura #3900', client: 'Galpão Logístico', status: 'progress' },
    { id: 202, techId: 2, start: 14, duration: 2, title: 'Troca EQ #4200', client: 'Residência Silva', status: 'todo' },

    { id: 301, techId: 3, start: 8, duration: 1, title: 'Visita Técnica #4210', client: 'Shopping', status: 'done' },

    { id: 401, techId: 4, start: 10, duration: 2, title: 'Suporte #4222', client: 'Farmácia Vida', status: 'todo' },
    { id: 402, techId: 4, start: 13, duration: 4, title: 'Cabeamento #4230', client: 'Call Center', status: 'todo' },
];

export function FieldControlTempoDemo() {
    const [currentDate, setCurrentDate] = useState('04/02/2026');

    // Helper to place items on timeline
    const getPosition = (start: number, duration: number) => {
        const startOffset = start - 8; // content starts at 8
        const left = `${(startOffset / 10) * 100}%`;
        const width = `${(duration / 10) * 100}%`;
        return { left, width };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return '#36B37E'; // Green
            case 'progress': return '#0052cc'; // Blue
            case 'todo': return '#6554C0'; // Purple
            default: return '#C1C7D0';
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: FC_COLORS.bg }}>
            {/* Sidebar (Mini) */}
            <Drawer variant="permanent" sx={{ width: MENU_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: MENU_WIDTH, bgcolor: FC_COLORS.sidebar } }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><MenuIcon sx={{ color: FC_COLORS.text }} /></Box>
                <List>
                    <ListItemButton sx={{ justifyContent: 'center', mb: 1 }}><EventIcon /></ListItemButton>
                    <ListItemButton sx={{ justifyContent: 'center', mb: 1, color: FC_COLORS.primary }}><TimelineIcon /></ListItemButton>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header Style "Field" */}
                <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: FC_COLORS.text, borderBottom: '1px solid #DFE1E6' }}>
                    <Toolbar>
                        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: FC_COLORS.primary }}>Linha do Tempo</Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F4F5F7', borderRadius: 1, px: 1, mr: 2 }}>
                            <IconButton size="small"><ChevronLeft /></IconButton>
                            <Typography fontSize="0.9rem" fontWeight={600} sx={{ mx: 2 }}>{currentDate}</Typography>
                            <IconButton size="small"><ChevronRight /></IconButton>
                        </Box>

                        <Button variant="outlined" startIcon={<FilterIcon />} sx={{ mr: 2, textTransform: 'none' }}>Filtros</Button>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: FC_COLORS.success, '&:hover': { bgcolor: '#2B8F65' }, textTransform: 'none' }}>Nova OS</Button>
                    </Toolbar>
                </AppBar>

                {/* Filters / Legend Bar */}
                <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #DFE1E6', display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="textSecondary">LEGENDA:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#36B37E' }} /><Typography variant="caption">Concluído</Typography></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#0052cc' }} /><Typography variant="caption">Em Execução</Typography></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: '#6554C0' }} /><Typography variant="caption">Agendado</Typography></Box>

                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', gap: 1 }}>
                        <ClockIcon fontSize="small" />
                        <Typography variant="caption">Horário Atual: 15:30</Typography>
                    </Box>
                </Box>

                {/* Timeline Content */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
                    <Paper elevation={0} sx={{ flex: 1, display: 'flex', border: '1px solid #DFE1E6', overflow: 'hidden' }}>

                        {/* Left Column: Technicians */}
                        <Box sx={{ width: 220, borderRight: '1px solid #DFE1E6', bgcolor: 'white', zIndex: 2 }}>
                            <Box sx={{ height: 50, borderBottom: '1px solid #DFE1E6', bgcolor: '#FAFBFC', display: 'flex', alignItems: 'center', px: 2, fontWeight: 700, color: '#5E6C84' }}>
                                Técnicos ({technicians.length})
                            </Box>
                            {technicians.map(tech => (
                                <Box key={tech.id} sx={{ height: 80, borderBottom: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', px: 2, gap: 2 }}>
                                    <Avatar sx={{ bgcolor: tech.status === 'online' ? '#36B37E' : (tech.status === 'busy' ? '#FF991F' : '#DFE1E6'), width: 32, height: 32, fontSize: '0.9rem' }}>{tech.avatar}</Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{tech.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">{tech.status === 'online' ? 'Disponível' : (tech.status === 'busy' ? 'Em atendimento' : 'Offline')}</Typography>
                                    </Box>
                                </Box>
                            ))}
                            <Box sx={{ height: 80, display: 'flex', alignItems: 'center', px: 2, color: 'text.secondary', borderBottom: '1px solid #DFE1E6', bgcolor: '#FAFBFC' }}>
                                <Typography variant="body2">+ Adicionar equipe</Typography>
                            </Box>
                        </Box>

                        {/* Right Scrollable Area: Time Slots */}
                        <Box sx={{ flex: 1, overflowX: 'auto', position: 'relative', bgcolor: 'white' }}>
                            <Box sx={{ minWidth: 1000, height: '100%' }}>

                                {/* Time Header */}
                                <Box sx={{ height: 50, borderBottom: '1px solid #DFE1E6', display: 'flex', bgcolor: '#FAFBFC' }}>
                                    {HOURS.map(hour => (
                                        <Box key={hour} sx={{ flex: 1, borderRight: '1px solid #EBECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#5E6C84' }}>
                                            {hour}:00
                                        </Box>
                                    ))}
                                </Box>

                                {/* Grid & Tasks */}
                                <Box sx={{ position: 'relative' }}>
                                    {/* Vertical Grid Lines */}
                                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', pointerEvents: 'none' }}>
                                        {HOURS.map(h => <Box key={h} sx={{ flex: 1, borderRight: '1px solid #F4F5F7' }} />)}
                                    </Box>

                                    {/* Current Time Line (Simulated at 15:30 -> 7.5h into 10h day = 75%) */}
                                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '75%', width: 2, bgcolor: 'red', zIndex: 10, pointerEvents: 'none' }}>
                                        <Box sx={{ position: 'absolute', top: -5, left: -4, width: 10, height: 10, borderRadius: '50%', bgcolor: 'red' }} />
                                    </Box>

                                    {/* Tech Rows */}
                                    {technicians.map(tech => (
                                        <Box key={tech.id} sx={{ height: 80, borderBottom: '1px solid #DFE1E6', position: 'relative', width: '100%' }}>
                                            {tasks.filter(t => t.techId === tech.id).map(task => {
                                                const pos = getPosition(task.start, task.duration);
                                                return (
                                                    <Tooltip key={task.id} title={`${task.title} - ${task.client}`}>
                                                        <Paper
                                                            elevation={2}
                                                            sx={{
                                                                position: 'absolute',
                                                                left: pos.left,
                                                                width: `calc(${pos.width} - 8px)`,
                                                                top: 10,
                                                                height: 60,
                                                                bgcolor: 'white',
                                                                borderLeft: `4px solid ${getStatusColor(task.status)}`,
                                                                borderRadius: 1,
                                                                p: 1,
                                                                cursor: 'pointer',
                                                                overflow: 'hidden',
                                                                ml: '4px', // small margin
                                                                transition: 'transform 0.1s',
                                                                '&:hover': { zIndex: 10, transform: 'scale(1.02)' }
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <Typography variant="caption" fontWeight={700} color="textSecondary">{task.start}:00</Typography>
                                                                {task.status === 'done' && <Typography variant="caption" color="success.main">✔</Typography>}
                                                            </Box>
                                                            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '0.8rem', mb: 0.5 }}>{task.client}</Typography>
                                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</Typography>
                                                        </Paper>
                                                    </Tooltip>
                                                );
                                            })}
                                        </Box>
                                    ))}
                                    {/* Empty row filler */}
                                    <Box sx={{ height: 80, borderBottom: '1px solid #DFE1E6', bgcolor: '#FAFBFC' }} />

                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                </Box>

            </Box>
        </Box>
    );
}
