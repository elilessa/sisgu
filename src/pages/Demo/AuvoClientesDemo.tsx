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
    Tab,
    Tabs,
    TextField,
    Button,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Divider
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Assignment as TaskIcon,
    Map as MapIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Close as CloseIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationOnIcon
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

export function AuvoClientesDemo() {
    const [selectedClient, setSelectedClient] = useState<any | null>(null);

    const clients = [
        { id: 1, name: 'Condomínio Jardins', type: 'Pessoa Jurídica', doc: '12.345.678/0001-90', status: 'Ativo', lastService: '02/02/2026', address: 'Av. Paulista, 1000' },
        { id: 2, name: 'TechSolutions Ltda', type: 'Pessoa Jurídica', doc: '98.765.432/0001-10', status: 'Ativo', lastService: '28/01/2026', address: 'Rua Funchal, 200' },
        { id: 3, name: 'Padaria do João', type: 'Pessoa Jurídica', doc: '45.123.789/0001-50', status: 'Inadimplente', lastService: '15/12/2025', address: 'Rua Augusta, 500' },
        { id: 4, name: 'Maria Silva', type: 'Pessoa Física', doc: '123.456.789-00', status: 'Ativo', lastService: '10/01/2026', address: 'Al. Santos, 45' },
        { id: 5, name: 'Hospital Central', type: 'Pessoa Jurídica', doc: '55.444.333/0001-22', status: 'Ativo', lastService: 'Hoje', address: 'Av. Brasil, 2000' },
    ];

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
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><CalendarIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><TaskIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><MapIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><PeopleIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            {/* MAIN CONTENT */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Base de Clientes</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: AUVO_COLORS.sidebarActive, textTransform: 'none' }}>Novo Cliente</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                    {/* Filtros */}
                    <Card elevation={0} sx={{ mb: 3, border: '1px solid #e2e8f0' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField fullWidth size="small" placeholder="Buscar por nome, documento ou endereço..." InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }} />
                                <Button variant="outlined" startIcon={<FilterListIcon />}>Filtros</Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tabela de Clientes */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                                <TableRow>
                                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Nome / Razão Social</Typography></TableCell>
                                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Documento</Typography></TableCell>
                                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Último Serviço</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Ações</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow
                                        key={client.id}
                                        hover
                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F1F5F9' } }}
                                        onClick={() => setSelectedClient(client)}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: client.id % 2 === 0 ? '#3B82F6' : '#10B981', width: 32, height: 32, fontSize: '0.875rem' }}>{client.name[0]}</Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>{client.name}</Typography>
                                                    <Typography variant="caption" color="textSecondary">{client.type}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{client.doc}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={client.status}
                                                size="small"
                                                color={client.status === 'Ativo' ? 'success' : 'error'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{client.lastService}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small"><MoreVertIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            {/* DRAWER LATERAL DE DETALHES (Estilo Auvo/CRM moderno) */}
            <Drawer
                anchor="right"
                open={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                PaperProps={{ sx: { width: 400, bgcolor: 'white' } }}
            >
                {selectedClient && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', bgcolor: '#F8FAFC' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: '#3B82F6', fontSize: '1.5rem' }}>{selectedClient.name[0]}</Avatar>
                                <IconButton onClick={() => setSelectedClient(null)}><CloseIcon /></IconButton>
                            </Box>
                            <Typography variant="h6" fontWeight={700}>{selectedClient.name}</Typography>
                            <Typography variant="body2" color="textSecondary">{selectedClient.type} • ID #{selectedClient.id}</Typography>

                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Button variant="contained" size="small" disableElevation sx={{ flex: 1, textTransform: 'none' }}>Ver Perfil</Button>
                                <Button variant="outlined" size="small" sx={{ flex: 1, textTransform: 'none' }}>Novo Chamado</Button>
                            </Box>
                        </Box>

                        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Tabs value={0} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                                <Tab label="Visão Geral" sx={{ textTransform: 'none', minWidth: 'auto' }} />
                                <Tab label="Histórico" sx={{ textTransform: 'none', minWidth: 'auto' }} />
                                <Tab label="Equipamentos" sx={{ textTransform: 'none', minWidth: 'auto' }} />
                            </Tabs>

                            <Box sx={{ p: 3 }}>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: AUVO_COLORS.textPrimary }}>Contatos</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                        <PhoneIcon fontSize="small" color="action" />
                                        <Typography variant="body2">(11) 99999-8888</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2">financeiro@{selectedClient.name.split(' ')[0].toLowerCase()}.com</Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 3 }} />

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: AUVO_COLORS.textPrimary }}>Próximas Visitas</Typography>
                                    <Card elevation={0} sx={{ bgcolor: '#F1F5F9', mb: 1 }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="subtitle2" fontWeight={600}>Manutenção Preventiva</Typography>
                                            <Typography variant="caption" display="block">15 Fev • 09:00 - 11:00</Typography>
                                            <Chip label="Agendado" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', mt: 0.5 }} />
                                        </CardContent>
                                    </Card>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: AUVO_COLORS.textPrimary }}>Endereços</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <LocationOnIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{selectedClient.address}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}
