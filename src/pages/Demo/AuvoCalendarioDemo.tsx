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
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    CalendarMonth as CalendarIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    background: '#F1F5F9',
    textPrimary: '#1E293B',
};

const MENU_WIDTH_COLLAPSED = 64;

// Mock Data
const eventsData = [
    { id: 1, day: 2, title: 'Aluguel Loja', cat: 'Despesas Fixas', val: '2.000,00', type: 'out', status: 'Pago' },
    { id: 2, day: 4, title: 'Recebimento NF #1020', cat: 'Serviços', val: '500,00', type: 'in', status: 'Pendente' },
    { id: 3, day: 4, title: 'Manutenção Computadores', cat: 'TI', val: '150,00', type: 'out', status: 'Agendado' },
    { id: 4, day: 15, title: 'Folha de Pagamento', cat: 'RH', val: '15.000,00', type: 'out', status: 'Pendente' },
    { id: 5, day: 20, title: 'Cliente TecnoSul', cat: 'Vendas', val: '1.200,00', type: 'in', status: 'Confirmado' },
];

export function AuvoCalendarioDemo() {
    const [selectedDay, setSelectedDay] = useState<number>(4);

    // Helper: Generate calendar slots
    const days = [];
    for (let i = 1; i <= 35; i++) {
        const dayNum = i <= 28 ? i : null;
        days.push({ id: i, num: dayNum, events: eventsData.filter(e => e.day === dayNum) });
    }

    const currentEvents = eventsData.filter(e => e.day === selectedDay);

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: AUVO_COLORS.background }}>
            {/* Sidebar */}
            <Drawer variant="permanent" sx={{ width: MENU_WIDTH_COLLAPSED, flexShrink: 0, '& .MuiDrawer-paper': { width: MENU_WIDTH_COLLAPSED, bgcolor: AUVO_COLORS.sidebarBg } }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><MenuIcon sx={{ color: 'white' }} /></Box>
                <List>
                    <ListItem disablePadding sx={{ display: 'block' }}><ListItemButton sx={{ justifyContent: 'center' }}><DashboardIcon sx={{ color: AUVO_COLORS.sidebarText }} /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block' }}><ListItemButton sx={{ justifyContent: 'center' }}><CalendarIcon sx={{ color: AUVO_COLORS.sidebarActive }} /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>Calendário Financeiro</Typography>
                        <Button variant="contained" startIcon={<AddIcon />}>Novo Lançamento</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, display: 'flex', gap: 3, overflow: 'hidden' }}>

                    {/* Calendar Area (Fixed Width) */}
                    <Paper elevation={0} sx={{ flex: 1.2, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            <IconButton><ChevronLeftIcon /></IconButton>
                            <Typography variant="h6" fontWeight={700}>Fevereiro 2026</Typography>
                            <IconButton><ChevronRightIcon /></IconButton>
                        </Box>

                        {/* Grid Header */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <Box key={d} sx={{ p: 1.5, textAlign: 'center', fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', borderRight: '1px solid #e2e8f0' }}>
                                    {d}
                                </Box>
                            ))}
                        </Box>

                        {/* Grid Body */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flexGrow: 1 }}>
                            {days.map((d, i) => (
                                <Box key={i}
                                    onClick={() => d.num && setSelectedDay(d.num)}
                                    sx={{
                                        borderRight: '1px solid #e2e8f0',
                                        borderBottom: '1px solid #e2e8f0',
                                        p: 1,
                                        bgcolor: selectedDay === d.num ? '#eff6ff' : 'white',
                                        cursor: d.num ? 'pointer' : 'default',
                                        '&:hover': d.num ? { bgcolor: '#f1f5f9' } : {},
                                        position: 'relative'
                                    }}>
                                    {d.num && (
                                        <>
                                            <Typography variant="body2" fontWeight={700} color={selectedDay === d.num ? 'primary' : 'textSecondary'} sx={{ mb: 1, textAlign: 'center' }}>
                                                {d.num}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {d.events.map((ev, idx) => (
                                                    <Box key={idx} sx={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        bgcolor: ev.type === 'in' ? '#22c55e' : '#ef4444',
                                                        mx: 'auto'
                                                    }} title={ev.title} />
                                                ))}
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Side Panel (Table) */}
                    <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="overline" color="textSecondary" fontWeight={700}>DETALHAMENTO</Typography>
                                <Typography variant="h5" fontWeight={800} color="primary.main">{selectedDay} de Fevereiro</Typography>
                            </Box>
                            <Chip label={`${currentEvents.length} Lançamentos`} color="primary" size="small" variant="outlined" />
                        </Box>

                        <TableContainer sx={{ flex: 1 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell>Descrição / Categoria</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {currentEvents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                                <CalendarIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                                                <Typography>Nenhum lançamento neste dia.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentEvents.map((ev) => (
                                            <TableRow key={ev.id} hover>
                                                <TableCell>
                                                    <Avatar sx={{
                                                        width: 32, height: 32,
                                                        bgcolor: ev.type === 'in' ? '#DCFCE7' : '#FEE2E2',
                                                        color: ev.type === 'in' ? '#166534' : '#991B1B'
                                                    }}>
                                                        {ev.type === 'in' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle2" fontWeight={600}>{ev.title}</Typography>
                                                    <Typography variant="caption" color="textSecondary">{ev.cat}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight={700} color={ev.type === 'in' ? 'success.main' : 'error.main'}>
                                                        {ev.type === 'in' ? '+' : '-'} R$ {ev.val}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={ev.status}
                                                        size="small"
                                                        sx={{
                                                            height: 24, fontSize: '0.7rem',
                                                            bgcolor: ev.status === 'Pago' ? '#DCFCE7' : (ev.status === 'Confirmado' ? '#DBEAFE' : '#f3f4f6'),
                                                            color: ev.status === 'Pago' ? '#166534' : (ev.status === 'Confirmado' ? '#1e40af' : '#374151')
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Footer Resumo */}
                        <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#F8FAFC', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="textSecondary">Total Entradas</Typography>
                                <Typography variant="subtitle1" fontWeight={700} color="success.main">R$ 500,00</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="textSecondary">Total Saídas</Typography>
                                <Typography variant="subtitle1" fontWeight={700} color="error.main">R$ 150,00</Typography>
                            </Box>
                        </Box>
                    </Paper>

                </Box>

            </Box>
        </Box>
    );
}
