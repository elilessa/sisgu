import React, { useState } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Button,
    Divider,
    TextField,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Avatar,
    Paper,
    Chip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    CalendarMonth as CalendarIcon,
    Assignment as TaskIcon,
    Settings as SettingsIcon,
    Map as MapIcon,
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    LocationOn as LocationOnIcon,
    Person as PersonIcon,
    Build as BuildIcon
} from '@mui/icons-material';

const AUVO_COLORS = {
    sidebarBg: '#0F172A',
    sidebarText: '#94A3B8',
    sidebarActive: '#3B82F6',
    sidebarActiveBg: 'rgba(59, 130, 246, 0.1)',
    headerBg: '#FFFFFF',
    background: '#F8FAFC',
    cardBg: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B'
};

const MENU_WIDTH_COLLAPSED = 64;

export function AuvoChamadoDemo() {
    const [checklist, setChecklist] = useState({
        item1: false,
        item2: false,
        item3: false,
        item4: false
    });

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: AUVO_COLORS.background }}>
            {/* MINI SIDEBAR (Para focar no conteúdo) */}
            <Drawer
                variant="permanent"
                sx={{
                    width: MENU_WIDTH_COLLAPSED,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: MENU_WIDTH_COLLAPSED,
                        boxSizing: 'border-box',
                        backgroundColor: AUVO_COLORS.sidebarBg,
                        color: AUVO_COLORS.sidebarText,
                        overflowX: 'hidden'
                    },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <MenuIcon sx={{ color: 'white' }} />
                </Box>
                <List>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><DashboardIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><CalendarIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center', color: AUVO_COLORS.sidebarActive }}><TaskIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><MapIcon /></ListItemButton></ListItem>
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}><ListItemButton sx={{ justifyContent: 'center' }}><PeopleIcon /></ListItemButton></ListItem>
                </List>
            </Drawer>

            {/* MAIN CONTENT */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <AppBar position="static" elevation={0} sx={{ backgroundColor: AUVO_COLORS.headerBg, color: AUVO_COLORS.textPrimary, borderBottom: '1px solid #e2e8f0' }}>
                    <Toolbar>
                        <IconButton edge="start" sx={{ mr: 2 }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                            Nova Ordem de Serviço #OS-2026-045
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            sx={{
                                backgroundColor: '#10B981', // Verde Sucesso
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: 'none',
                                '&:hover': { boxShadow: 'none', backgroundColor: '#059669' }
                            }}
                        >
                            Salvar e Agendar
                        </Button>
                    </Toolbar>
                </AppBar>

                {/* CONTENT SCROLLABLE */}
                <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
                    <Grid container spacing={3}>

                        {/* COLUNA ESQUERDA: DADOS PRINCIPAIS */}
                        <Grid item xs={12} md={8}>

                            {/* Card Cliente */}
                            <Card elevation={0} sx={{ mb: 3, border: '1px solid #e2e8f0' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <PersonIcon sx={{ color: AUVO_COLORS.sidebarActive }} />
                                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Cliente e Local</Typography>
                                    </Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={8}>
                                            <TextField fullWidth label="Buscar Cliente" placeholder="Digite nome, CPF ou CNPJ..." size="small" defaultValue="Condomínio Jardins das Flores" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField fullWidth label="Contato no Local" size="small" defaultValue="Zelador João" />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                                                <LocationOnIcon sx={{ color: '#64748B', mt: 0.5 }} />
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Endereço Principal</Typography>
                                                    <Typography variant="body2" color="textSecondary">Av. Paulista, 1000 - Bela Vista, São Paulo - SP</Typography>
                                                </Box>
                                                <Button size="small" sx={{ ml: 'auto' }}>Trocar</Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Card Serviço e Checklist */}
                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <BuildIcon sx={{ color: AUVO_COLORS.sidebarActive }} />
                                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Serviço e Checklist</Typography>
                                    </Box>

                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField select fullWidth label="Tipo de Serviço" size="small" defaultValue="manutencao">
                                                <MenuItem value="manutencao">Manutenção Preventiva</MenuItem>
                                                <MenuItem value="instalacao">Instalação Nova</MenuItem>
                                                <MenuItem value="visita">Visita Técnica</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField select fullWidth label="Equipamento" size="small" defaultValue="camera">
                                                <MenuItem value="camera">Câmera Bullet IP Hikvision</MenuItem>
                                                <MenuItem value="dvr">DVR 16 Canais</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                        Checklist Obrigatório
                                    </Typography>

                                    <Box>
                                        <Accordion elevation={0} sx={{ border: '1px solid #e2e8f0', mb: 1, '&:before': { display: 'none' } }}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography sx={{ fontWeight: 500 }}>Etapa 1: Verificação Inicial</Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <FormControlLabel control={<Checkbox checked={checklist.item1} onChange={(e) => setChecklist({ ...checklist, item1: e.target.checked })} />} label="Verificar alimentação (12V)" />
                                                <FormControlLabel control={<Checkbox checked={checklist.item2} onChange={(e) => setChecklist({ ...checklist, item2: e.target.checked })} />} label="Checar conectores BNC/RJ45" />
                                            </AccordionDetails>
                                        </Accordion>
                                        <Accordion elevation={0} sx={{ border: '1px solid #e2e8f0', '&:before': { display: 'none' } }} defaultExpanded>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography sx={{ fontWeight: 500 }}>Etapa 2: Execução</Typography>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <FormControlLabel control={<Checkbox checked={checklist.item3} onChange={(e) => setChecklist({ ...checklist, item3: e.target.checked })} />} label="Limpeza da lente" />
                                                <FormControlLabel control={<Checkbox checked={checklist.item4} onChange={(e) => setChecklist({ ...checklist, item4: e.target.checked })} />} label="Ajuste de foco e ângulo" />
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Foto do Equipamento (Obrigatório)</Typography>
                                                    <Button variant="outlined" component="label" size="small" startIcon={<CheckCircleIcon />}>
                                                        Anexar Foto
                                                        <input hidden accept="image/*" multiple type="file" />
                                                    </Button>
                                                </Box>
                                            </AccordionDetails>
                                        </Accordion>
                                    </Box>

                                </CardContent>
                            </Card>

                        </Grid>

                        {/* COLUNA DIREITA: AGENDAMENTO E TÉCNICO */}
                        <Grid item xs={12} md={4}>

                            <Card elevation={0} sx={{ mb: 3, border: '1px solid #e2e8f0' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <AccessTimeIcon sx={{ color: '#F59E0B' }} />
                                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Agendamento</Typography>
                                    </Box>

                                    <TextField fullWidth type="date" label="Data de Início" size="small" sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} defaultValue="2026-02-05" />

                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <TextField fullWidth type="time" label="Hora Início" size="small" InputLabelProps={{ shrink: true }} defaultValue="09:00" />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField fullWidth type="time" label="Hora Fim" size="small" InputLabelProps={{ shrink: true }} defaultValue="11:00" />
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#FFF7ED', color: '#B45309', borderRadius: 1, fontSize: '0.875rem' }}>
                                        ⚠️ Este horário entra em conflito com a pausa de almoço.
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <PeopleIcon sx={{ color: '#3B82F6' }} />
                                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Equipe</Typography>
                                    </Box>

                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Técnico Responsável</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 1, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                                        <Avatar sx={{ bgcolor: '#3B82F6' }}>C</Avatar>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Carlos Silva</Typography>
                                            <Typography variant="caption" color="textSecondary">Disponível</Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ ml: 'auto' }}><ExpandMoreIcon /></IconButton>
                                    </Box>

                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Ajudantes</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="Roberto Dias" onDelete={() => { }} avatar={<Avatar>R</Avatar>} />
                                        <Chip label="+ Adicionar" onClick={() => { }} variant="outlined" clickable />
                                    </Box>

                                </CardContent>
                            </Card>

                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}
