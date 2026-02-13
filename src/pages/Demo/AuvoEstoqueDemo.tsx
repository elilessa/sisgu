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
    Grid,
    Paper,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    LinearProgress
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Inventory2 as InventoryIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    LocalShipping as TruckIcon,
    Store as HouseIcon,
    Person as PersonIcon,
    SwapHoriz as TransferIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    headerBg: '#FFFFFF',
    background: '#F1F5F9',
    textPrimary: '#1E293B',
    lowStock: '#F59E0B',
    outStock: '#EF4444'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoEstoqueDemo() {
    const stockLocals = [
        {
            id: 'deposito', name: 'Almoxarifado Central', type: 'house', fill: 85, items: [
                { name: 'Cabo Coaxial 4mm', qtd: 2500, unit: 'm', status: 'ok' },
                { name: 'Conector BNC', qtd: 450, unit: 'un', status: 'ok' },
                { name: 'Câmera Bullet 1080p', qtd: 12, unit: 'un', status: 'low' }
            ]
        },
        {
            id: 'tec1', name: 'Carro 01 - Carlos Silva', type: 'truck', fill: 40, items: [
                { name: 'Cabo Coaxial 4mm', qtd: 150, unit: 'm', status: 'ok' },
                { name: 'Conector BNC', qtd: 20, unit: 'un', status: 'low' },
                { name: 'Furadeira Bosch', qtd: 1, unit: 'un', status: 'asset' }
            ]
        },
        {
            id: 'tec2', name: 'Mochila - Roberto Dias', type: 'person', fill: 15, items: [
                { name: 'Alicate Crimper', qtd: 1, unit: 'un', status: 'asset' },
                { name: 'Fita Isolante', qtd: 2, unit: 'un', status: 'ok' }
            ]
        }
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
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><InventoryIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar position="static" elevation={0} sx={{ bgcolor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Gestão de Estoques</Typography>
                        <Button variant="outlined" startIcon={<TransferIcon />} sx={{ ml: 'auto', mr: 2 }}>Transferência</Button>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: AUVO_COLORS.sidebarActive }}>Entrada de Nota</Button>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>

                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2, fontWeight: 600 }}>LOCAIS DE ESTOQUE</Typography>

                    <Grid container spacing={3}>
                        {stockLocals.map((local) => (
                            <Grid item xs={12} md={6} lg={4} key={local.id}>
                                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    {/* Header do Local */}
                                    <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{
                                            width: 40, height: 40, borderRadius: 2,
                                            bgcolor: local.type === 'house' ? '#DBEAFE' : (local.type === 'truck' ? '#FEF3C7' : '#E0E7FF'),
                                            color: local.type === 'house' ? '#1E40AF' : (local.type === 'truck' ? '#92400E' : '#3730A3'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {local.type === 'house' && <HouseIcon />}
                                            {local.type === 'truck' && <TruckIcon />}
                                            {local.type === 'person' && <PersonIcon />}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" fontWeight={700}>{local.name}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinearProgress variant="determinate" value={local.fill} sx={{ width: 60, height: 6, borderRadius: 3 }} />
                                                <Typography variant="caption" color="textSecondary">{local.fill}% cheio</Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Lista de Itens (Compacta) */}
                                    <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                        {local.items.map((item, index) => (
                                            <Box key={index} sx={{
                                                p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                borderBottom: '1px solid #f8fafc',
                                                '&:hover': { bgcolor: '#f8fafc' }
                                            }}>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>{item.name}</Typography>
                                                    {item.status === 'asset' && <Chip label="Patrimônio" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#E0E7FF', color: '#3730A3' }} />}
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="body2" fontWeight={700} color={item.status === 'low' ? 'error' : 'textPrimary'}>
                                                        {item.qtd} <Typography component="span" variant="caption" color="textSecondary">{item.unit}</Typography>
                                                    </Typography>
                                                    {item.status === 'low' && <Typography variant="caption" color="error" display="block">Baixo</Typography>}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>

                                    <Button fullWidth size="small" sx={{ borderTop: '1px solid #f1f5f9', py: 1, color: '#64748B' }}>Ver Inventário Completo</Button>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                </Box>
            </Box>
        </Box>
    );
}
