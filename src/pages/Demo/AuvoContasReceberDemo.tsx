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
    Card,
    CardContent,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    LinearProgress
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    AttachMoney as MoneyIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    MoreVert as MoreVertIcon,
    ArrowUpward as ArrowUpIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Email as EmailIcon,
    WhatsApp as WhatsAppIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    background: '#F1F5F9',
    textPrimary: '#1E293B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoContasReceberDemo() {
    const bills = [
        { id: 1, client: 'Cond. Jardins', desc: 'OS #2024 - Manutenção', value: 'R$ 1.250,00', due: 'Hoje', status: 'Pendente', method: 'Boleto' },
        { id: 2, client: 'Padaria do João', desc: 'Mensalidade Fev/26', value: 'R$ 350,00', due: '01/02', status: 'Atrasado', method: 'Pix' },
        { id: 3, client: 'TechSolutions', desc: 'Instalação Rede', value: 'R$ 4.500,00', due: '15/02', status: 'Em dia', method: 'Transferência' },
        { id: 4, client: 'Hospital Santa Clara', desc: 'Contrato Anual', value: 'R$ 12.000,00', due: '20/02', status: 'Em dia', method: 'Boleto' },
        { id: 5, client: 'Residência Marcelo', desc: 'Troca de Câmera', value: 'R$ 450,00', due: 'Ontem', status: 'Atrasado', method: 'Cartão' },
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
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.success }}><MoneyIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Contas a Receber</Typography>
                        <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ ml: 'auto' }}>Filtros</Button>
                        <Button variant="contained" startIcon={<ArrowUpIcon />} sx={{ ml: 2, bgcolor: AUVO_COLORS.success }}>Nova Cobrança</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>

                    {/* RÉGUA DE COBRANÇA VISUAL */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={8}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Visão Geral de Recebimentos</Typography>
                                    <Box sx={{ display: 'flex', gap: 4 }}>
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">Vencido</Typography>
                                            <Typography variant="h5" fontWeight={700} color="error">R$ 800,00</Typography>
                                            <Typography variant="caption" color="error">2 Faturas</Typography>
                                        </Box>
                                        <Box sx={{ borderLeft: '1px solid #e2e8f0', pl: 4 }}>
                                            <Typography variant="caption" color="textSecondary">Vence Hoje</Typography>
                                            <Typography variant="h5" fontWeight={700} color="warning.main">R$ 1.250,00</Typography>
                                            <Typography variant="caption" color="warning.main">1 Fatura</Typography>
                                        </Box>
                                        <Box sx={{ borderLeft: '1px solid #e2e8f0', pl: 4 }}>
                                            <Typography variant="caption" color="textSecondary">A Vencer (Fev)</Typography>
                                            <Typography variant="h5" fontWeight={700} color="primary">R$ 16.500,00</Typography>
                                            <Typography variant="caption" color="primary">2 Faturas</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ mt: 3, display: 'flex', gap: 0.5 }}>
                                        <Box sx={{ height: 8, flex: 1, bgcolor: '#EF4444', borderRadius: '4px 0 0 4px' }} title="Vencido" />
                                        <Box sx={{ height: 8, flex: 2, bgcolor: '#F59E0B' }} title="Hoje" />
                                        <Box sx={{ height: 8, flex: 12, bgcolor: '#3B82F6', borderRadius: '0 4px 4px 0' }} title="A Vencer" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%', bgcolor: '#F0F9FF' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={700} color="primary.dark">Eficiência de Cobrança</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                                        <Typography variant="h3" fontWeight={800} color="primary">92%</Typography>
                                    </Box>
                                    <Typography variant="caption" display="block" align="center" color="primary.dark">Das faturas são pagas em dia.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* TABELA DETALHADA */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                                <TableRow>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>Descrição</TableCell>
                                    <TableCell>Vencimento</TableCell>
                                    <TableCell>Valor</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Cobrar</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bills.map((bill) => (
                                    <TableRow key={bill.id} hover>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight={600}>{bill.client}</Typography>
                                            <Typography variant="caption" color="textSecondary">Boleto • Banco X</Typography>
                                        </TableCell>
                                        <TableCell>{bill.desc}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {bill.status === 'Atrasado' && <WarningIcon fontSize="small" color="error" />}
                                                <Typography variant="body2" color={bill.status === 'Atrasado' ? 'error' : 'textPrimary'}>{bill.due}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{bill.value}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={bill.status}
                                                size="small"
                                                color={bill.status === 'Em dia' ? 'success' : (bill.status === 'Pendente' ? 'warning' : 'error')}
                                                variant={bill.status === 'Em dia' ? 'outlined' : 'filled'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="success" title="Enviar WhatsApp"><WhatsAppIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="primary" title="Enviar Email"><EmailIcon fontSize="small" /></IconButton>
                                            <IconButton size="small"><MoreVertIcon fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                </Box>
            </Box>
        </Box>
    );
}
