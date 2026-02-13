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
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    AttachMoney as MoneyIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    FilterList as FilterListIcon,
    Download as DownloadIcon,
    Receipt as ReceiptIcon,
    Visibility as EyeIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    background: '#F1F5F9', // Slate 100
    textPrimary: '#1E293B',
    success: '#10B981',
    danger: '#EF4444'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoFinanceiroDemo() {
    const transactions = [
        { id: 1, desc: 'Manutenção Padrão - Cond. Jardins', type: 'receita', value: 'R$ 1.250,00', date: '04/02/2026', status: 'Pago', category: 'Serviços' },
        { id: 2, desc: 'Instalação Câmeras - Shopping', type: 'receita', value: 'R$ 4.500,00', date: '03/02/2026', status: 'Pendente', category: 'Projetos' },
        { id: 3, desc: 'Compra de Cabos e Conectores', type: 'despesa', value: 'R$ 850,00', date: '02/02/2026', status: 'Pago', category: 'Material' },
        { id: 4, desc: 'Combustível Frota', type: 'despesa', value: 'R$ 320,00', date: '02/02/2026', status: 'Pago', category: 'Transporte' },
        { id: 5, desc: 'Mensalidade Monitoramento - Padaria', type: 'receita', value: 'R$ 180,00', date: '01/02/2026', status: 'Atrasado', category: 'Recorrente' },
    ];

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
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.success }}><MoneyIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Controle Financeiro</Typography>
                        <Button startIcon={<DownloadIcon />} sx={{ mr: 1, textTransform: 'none' }}>Exportar</Button>
                        <Button variant="contained" startIcon={<ReceiptIcon />} sx={{ bgcolor: AUVO_COLORS.sidebarActive, textTransform: 'none' }}>Novo Lançamento</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>

                    {/* KPI CARDS */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={4}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600} textTransform="uppercase">Entradas (Fev)</Typography>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: AUVO_COLORS.success, mt: 1, mb: 1 }}>R$ 15.420,00</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TrendingUpIcon fontSize="small" color="success" />
                                        <Typography variant="body2" color="success.main" fontWeight={600}>+12%</Typography>
                                        <Typography variant="caption" color="textSecondary">vs. mês anterior</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600} textTransform="uppercase">Saídas (Fev)</Typography>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: AUVO_COLORS.danger, mt: 1, mb: 1 }}>R$ 4.250,50</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TrendingDownIcon fontSize="small" color="error" />
                                        <Typography variant="body2" color="error.main" fontWeight={600}>+5%</Typography>
                                        <Typography variant="caption" color="textSecondary">vs. mês anterior</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', height: '100%' }}>
                                <CardContent>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600} textTransform="uppercase">Saldo Previsto</Typography>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: '#3B82F6', mt: 1, mb: 1 }}>R$ 11.169,50</Typography>
                                    <Box sx={{ width: '100%', mt: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption">Meta Mensal</Typography>
                                            <Typography variant="caption">65%</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={65} sx={{ height: 6, borderRadius: 3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* TABLE */}
                    <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                            <Typography variant="subtitle1" fontWeight={700}>Movimentações Recentes</Typography>
                            <Button startIcon={<FilterListIcon />} size="small">Filtros</Button>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                                    <TableRow>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell>Categoria</TableCell>
                                        <TableCell>Data</TableCell>
                                        <TableCell>Valor</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id} hover>
                                            <TableCell sx={{ fontWeight: 500 }}>{t.desc}</TableCell>
                                            <TableCell><Chip label={t.category} size="small" variant="outlined" /></TableCell>
                                            <TableCell>{t.date}</TableCell>
                                            <TableCell sx={{ color: t.type === 'receita' ? AUVO_COLORS.success : AUVO_COLORS.danger, fontWeight: 700 }}>
                                                {t.type === 'despesa' ? '- ' : ''}{t.value}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={t.status}
                                                    size="small"
                                                    color={t.status === 'Pago' ? 'success' : (t.status === 'Pendente' ? 'warning' : 'error')}
                                                    sx={{ borderRadius: 1, height: 24, fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Ver Comprovante/Detalhes">
                                                    <IconButton size="small"><EyeIcon /></IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>

                </Box>
            </Box>
        </Box>
    );
}
