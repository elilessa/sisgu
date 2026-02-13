import { useState, useEffect } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp,
    where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    Container,
    Typography,
    Box,
    Paper,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    FormControlLabel,
    Switch,
    MenuItem,
    Checkbox,
    FormGroup,
    FormLabel,
    FormControl,
    Grid,
    Autocomplete
} from '@mui/material';
import { ActionEdit, ActionDelete, StatusChip } from '../../components/TableActions';
import {
    Add as AddIcon,
    Business as BusinessIcon,
    AccountTree as AccountTreeIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { customColors } from '../../theme';

import { CentroCustoGrupo, CentroCusto, OrigemCentroCusto } from '../../types/financeiro';

// ==================== HELPERS ====================
const ORIGENS_DISPONIVEIS: { value: OrigemCentroCusto; label: string }[] = [
    { value: 'chamado', label: 'Chamado Técnico' },
    { value: 'os', label: 'Ordem de Serviço' },
    { value: 'abastecimento', label: 'Abastecimento/Frota' },
    { value: 'beneficios', label: 'Benefícios/RH' },
    { value: 'contrato', label: 'Faturamento de Contrato' },
    { value: 'venda', label: 'Venda Avulsa' },
    { value: 'manual', label: 'Lançamento Manual (Restrito)' }
];

export function CentrosCusto() {
    const { userData } = useAuth();
    const empresaId = userData?.empresaId;

    const [tabIndex, setTabIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Estados de Dados
    const [grupos, setGrupos] = useState<CentroCustoGrupo[]>([]);
    const [centros, setCentros] = useState<CentroCusto[]>([]);
    const [clientesList, setClientesList] = useState<any[]>([]);

    // Dialog Grupo
    const [openGrupoDialog, setOpenGrupoDialog] = useState(false);
    const [selectedGrupo, setSelectedGrupo] = useState<CentroCustoGrupo | null>(null);
    const [grupoForm, setGrupoForm] = useState<Partial<CentroCustoGrupo>>({
        nome: '',
        codigo: '',
        permiteReceita: false,
        permiteDespesa: true,
        descricao: ''
    });

    // Dialog Centro Operacional
    const [openCentroDialog, setOpenCentroDialog] = useState(false);
    const [selectedCentro, setSelectedCentro] = useState<CentroCusto | null>(null);
    const [centroForm, setCentroForm] = useState<Partial<CentroCusto>>({
        nome: '',
        grupoId: '',
        origensPermitidas: ['manual'], // Manual sempre ativo por padrão
        ativo: true
    });

    // Dialog Confirmação
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // ==================== CARREGAMENTO ====================
    useEffect(() => {
        if (empresaId) {
            loadData();
            loadClientes();
        }
    }, [empresaId]);

    const loadData = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            // Carregar Grupos
            const gruposSnap = await getDocs(query(
                collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos'),
                orderBy('codigo')
            ));
            const gruposData = gruposSnap.docs.map(d => ({ id: d.id, ...d.data() } as CentroCustoGrupo));
            setGrupos(gruposData);

            // Carregar Centros Operacionais
            const centrosSnap = await getDocs(query(
                collection(db, 'EMPRESAS', empresaId, 'centros_custo'),
                orderBy('codigo')
            ));
            const centrosData = centrosSnap.docs.map(d => ({ id: d.id, ...d.data() } as CentroCusto));
            setCentros(centrosData);

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar dados de Centro de Custo.');
        } finally {
            setLoading(false);
        }
    };

    const loadClientes = async () => {
        if (!empresaId) return;
        try {
            const snap = await getDocs(collection(db, 'EMPRESAS', empresaId, 'clientes'));
            setClientesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Erro ao carregar clientes", e);
        }
    };

    // ==================== GRUPOS ====================
    const handleOpenGrupo = (grupo?: CentroCustoGrupo) => {
        if (grupo) {
            setSelectedGrupo(grupo);
            setGrupoForm({ ...grupo });
        } else {
            setSelectedGrupo(null);
            setGrupoForm({
                nome: '',
                codigo: '',
                permiteReceita: false,
                permiteDespesa: true,
                descricao: ''
            });
        }
        setOpenGrupoDialog(true);
    };

    const handleSaveGrupo = async () => {
        if (!empresaId || !grupoForm.nome || !grupoForm.codigo) {
            setError('Nome e Código são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const data = {
                ...grupoForm,
                codigo: grupoForm.codigo.toUpperCase(),
                atualizadoEm: new Date().toISOString()
            };

            if (selectedGrupo) {
                await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centro_custo_grupos', selectedGrupo.id), data);

                // Atualizar também os filhos (Centros Operacionais) para manter consistência
                // Isso é uma operação pesada, idealmente feita com Cloud Functions, mas faremos simples aqui
                const filhos = centros.filter(c => c.grupoId === selectedGrupo.id);
                const batchPromises = filhos.map(filho =>
                    updateDoc(doc(db, 'EMPRESAS', empresaId, 'centros_custo', filho.id), {
                        grupoNome: data.nome,
                        grupoCodigo: data.codigo,
                        permiteReceita: data.permiteReceita,
                        permiteDespesa: data.permiteDespesa
                    })
                );
                await Promise.all(batchPromises);

                setSuccess('Grupo atualizado com sucesso. Regras replicadas para os centros vinculados.');
            } else {
                await addDoc(collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos'), {
                    ...data,
                    empresaId,
                    criadoPor: userData?.email,
                    criadoEm: new Date().toISOString()
                });
                setSuccess('Grupo criado com sucesso!');
            }
            setOpenGrupoDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar Grupo.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGrupo = (grupo: CentroCustoGrupo) => {
        // Verificar se tem filhos
        const temFilhos = centros.some(c => c.grupoId === grupo.id);
        if (temFilhos) {
            setError(`Não é possível excluir o grupo "${grupo.nome}" pois existem Centros de Custo vinculados a ele.`);
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Excluir Grupo',
            message: `Tem certeza que deseja excluir o grupo "${grupo.nome}"?`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'EMPRESAS', empresaId!, 'centro_custo_grupos', grupo.id));
                    setSuccess('Grupo excluído com sucesso.');
                    loadData();
                } catch (err) {
                    setError('Erro ao excluir grupo.');
                }
                setConfirmDialog(prev => ({ ...prev, open: false }));
            }
        });
    };

    // ==================== CENTROS OPERACIONAIS ====================
    const handleOpenCentro = (centro?: CentroCusto) => {
        if (centro) {
            setSelectedCentro(centro);
            setCentroForm({ ...centro });
        } else {
            setSelectedCentro(null);
            setCentroForm({
                nome: '',
                grupoId: '',
                origensPermitidas: ['manual'],
                ativo: true
            });
        }
        setOpenCentroDialog(true);
    };

    const handleSaveCentro = async () => {
        if (!empresaId || !centroForm.nome || !centroForm.grupoId) {
            setError('Nome e Grupo são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const grupoPai = grupos.find(g => g.id === centroForm.grupoId);
            if (!grupoPai) throw new Error("Grupo não encontrado");

            // Geração de Código Automático (Sequencial Simples baseada no count atual do grupo ou timestamp)
            // Para simplificar e evitar colisão, vamos usar CodigoGrupo + Random ou Count
            let codigoGerado = centroForm.codigo;

            if (!selectedCentro) {
                // Lógica de geração de código nova
                const countDoGrupo = centros.filter(c => c.grupoId === grupoPai.id).length + 1;
                const sufixo = countDoGrupo.toString().padStart(3, '0');
                codigoGerado = `${grupoPai.codigo}-${sufixo}`;
            }

            const data = {
                ...centroForm,
                // Herdando dados do pai para performance
                grupoNome: grupoPai.nome,
                grupoCodigo: grupoPai.codigo,
                permiteReceita: grupoPai.permiteReceita,
                permiteDespesa: grupoPai.permiteDespesa,
                codigo: codigoGerado,
                atualizadoEm: new Date().toISOString()
            };

            if (selectedCentro) {
                await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centros_custo', selectedCentro.id), data);
                setSuccess('Centro de Custo atualizado com sucesso!');
            } else {
                await addDoc(collection(db, 'EMPRESAS', empresaId, 'centros_custo'), {
                    ...data,
                    empresaId,
                    criadoPor: userData?.email,
                    criadoEm: new Date().toISOString()
                });
                setSuccess(`Centro de Custo criado com código: ${codigoGerado}`);
            }
            setOpenCentroDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar Centro de Custo.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCentro = (centro: CentroCusto) => {
        setConfirmDialog({
            open: true,
            title: 'Excluir Centro de Custo',
            message: `Tem certeza que deseja excluir "${centro.nome}" (${centro.codigo})? Verifique se não há lançamentos financeiros vinculados a ele antes de excluir.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'EMPRESAS', empresaId!, 'centros_custo', centro.id));
                    setSuccess('Centro de Custo excluído.');
                    loadData();
                } catch (err) {
                    setError('Erro ao excluir.');
                }
                setConfirmDialog(prev => ({ ...prev, open: false }));
            }
        });
    };

    const toggleOrigem = (origem: OrigemCentroCusto) => {
        const atuais = centroForm.origensPermitidas || [];
        if (atuais.includes(origem)) {
            setCentroForm({ ...centroForm, origensPermitidas: atuais.filter(o => o !== origem) });
        } else {
            setCentroForm({ ...centroForm, origensPermitidas: [...atuais, origem] });
        }
    };


    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Centros de Custo</Typography>
            </Box>

            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
                    <Tab label="1. Grupos de Centro de Custo (Estrutural)" icon={<BusinessIcon />} iconPosition="start" />
                    <Tab label="2. Centros Operacionais (Analítico)" icon={<AccountTreeIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ==============================================================================================
          ABA 1: GRUPOS
         ============================================================================================== */}
            {tabIndex === 0 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenGrupo()}>
                            Novo Grupo
                        </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Nome do Grupo</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Permissões</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {grupos.map((grupo) => (
                                    <TableRow key={grupo.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{grupo.codigo}</TableCell>
                                        <TableCell>{grupo.nome}</TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                {grupo.permiteReceita && <Chip label="Receita" size="small" color="success" variant="outlined" />}
                                                {grupo.permiteDespesa && <Chip label="Despesa" size="small" color="error" variant="outlined" />}
                                                {!grupo.permiteReceita && !grupo.permiteDespesa && <Chip label="Sem Regra" size="small" />}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{grupo.descricao}</TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <ActionEdit onClick={() => handleOpenGrupo(grupo)} title="Editar" />
                                                <ActionDelete onClick={() => handleDeleteGrupo(grupo)} title="Excluir" />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {grupos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Nenhum grupo cadastrado. Comece criando um Grupo Macro (ex: ADM, FROTA, CONTRATOS).
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* ==============================================================================================
          ABA 2: CENTROS OPERACIONAIS
         ============================================================================================== */}
            {tabIndex === 1 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCentro()}>
                            Novo Centro de Custo
                        </Button>
                    </Box>

                    <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Nome Operacional</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Grupo Pai</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Origens Permitidas</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {centros.map((centro) => (
                                    <TableRow key={centro.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{centro.codigo}</TableCell>
                                        <TableCell>{centro.nome}</TableCell>
                                        <TableCell>
                                            <Chip label={centro.grupoCodigo} size="small" sx={{ mr: 1, borderRadius: 1 }} />
                                            {centro.grupoNome}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {centro.origensPermitidas.slice(0, 3).map(o => (
                                                    <Chip key={o} label={o} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                                ))}
                                                {centro.origensPermitidas.length > 3 && (
                                                    <Chip label={`+${centro.origensPermitidas.length - 3}`} size="small" variant="outlined" />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <StatusChip status={centro.ativo ? "ativo" : "inativo"} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <ActionEdit onClick={() => handleOpenCentro(centro)} title="Editar" />
                                                <ActionDelete onClick={() => handleDeleteCentro(centro)} title="Excluir" />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {centros.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Nenhum centro de custo operacional cadastrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* ==============================================================================================
          DIALOG GRUPO
         ============================================================================================== */}
            <Dialog open={openGrupoDialog} onClose={() => setOpenGrupoDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {selectedGrupo ? 'Editar Grupo' : 'Novo Grupo de Centro de Custo'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid size={4}>
                                <TextField
                                    label="Código (Prefixo)"
                                    fullWidth
                                    value={grupoForm.codigo}
                                    onChange={e => setGrupoForm({ ...grupoForm, codigo: e.target.value.toUpperCase() })}
                                    helperText="Ex: ADM, FROTA"
                                />
                            </Grid>
                            <Grid size={8}>
                                <TextField
                                    label="Nome do Grupo"
                                    fullWidth
                                    value={grupoForm.nome}
                                    onChange={e => setGrupoForm({ ...grupoForm, nome: e.target.value })}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            label="Descrição"
                            fullWidth
                            multiline
                            rows={2}
                            value={grupoForm.descricao}
                            onChange={e => setGrupoForm({ ...grupoForm, descricao: e.target.value })}
                        />

                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">Natureza Financeira Permitida</Typography>
                            <Typography variant="caption" display="block" color="text.secondary" paragraph>
                                Todos os centros operacionais deste grupo herdarão estas regras rigidamente.
                            </Typography>
                            <FormGroup row>
                                <FormControlLabel
                                    control={<Switch checked={grupoForm.permiteReceita} onChange={e => setGrupoForm({ ...grupoForm, permiteReceita: e.target.checked })} color="success" />}
                                    label="Permite Receita"
                                />
                                <FormControlLabel
                                    control={<Switch checked={grupoForm.permiteDespesa} onChange={e => setGrupoForm({ ...grupoForm, permiteDespesa: e.target.checked })} color="error" />}
                                    label="Permite Despesa"
                                />
                            </FormGroup>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenGrupoDialog(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveGrupo}>Salvar Grupo</Button>
                </DialogActions>
            </Dialog>

            {/* ==============================================================================================
          DIALOG CENTRO OPERACIONAL
         ============================================================================================== */}
            <Dialog open={openCentroDialog} onClose={() => setOpenCentroDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {selectedCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo Operacional'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

                        {/* Seleção de Grupo */}
                        <TextField
                            select
                            label="Grupo Pertencente (Pai)"
                            fullWidth
                            value={centroForm.grupoId}
                            onChange={e => {
                                const g = grupos.find(x => x.id === e.target.value);
                                setCentroForm({
                                    ...centroForm,
                                    grupoId: e.target.value,
                                    // Resetar campos visuais se mudar o grupo (opcional)
                                });
                            }}
                            disabled={!!selectedCentro} // Não permite mudar grupo na edição para não quebrar histórico/código
                            helperText={selectedCentro ? "O grupo não pode ser alterado após a criação." : "Selecione o grupo macro para herdar as regras."}
                        >
                            {grupos.map(g => (
                                <MenuItem key={g.id} value={g.id}>
                                    {g.codigo} - {g.nome}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Informações Visuais de Herança */}
                        {centroForm.grupoId && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1 }}>
                                <ArrowForwardIcon color="action" />
                                <Typography variant="body2">
                                    Permissões herdadas do Grupo:
                                    <strong style={{ marginLeft: 8, color: grupos.find(g => g.id === centroForm.grupoId)?.permiteReceita ? 'green' : 'gray' }}>
                                        {grupos.find(g => g.id === centroForm.grupoId)?.permiteReceita ? 'RECEITA SIM' : 'RECEITA NÃO'}
                                    </strong>
                                    <span style={{ margin: '0 8px' }}>|</span>
                                    <strong style={{ color: grupos.find(g => g.id === centroForm.grupoId)?.permiteDespesa ? 'red' : 'gray' }}>
                                        {grupos.find(g => g.id === centroForm.grupoId)?.permiteDespesa ? 'DESPESA SIM' : 'DESPESA NÃO'}
                                    </strong>
                                </Typography>
                            </Box>
                        )}

                        {/* Autocomplete Auxiliar de Cliente */}
                        <Grid container spacing={0} sx={{ mb: 2 }}>
                            <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">
                                    Preenchimento Rápido (Opcional):
                                </Typography>
                                <Autocomplete
                                    options={clientesList}
                                    getOptionLabel={(option) => option.prefixoNome ? `${option.prefixoNome} ${option.nome}` : (option.nome || '')}
                                    onChange={(_, newValue) => {
                                        if (newValue) {
                                            const nomePadrao = `${newValue.prefixoNome ? newValue.prefixoNome + ' ' : ''}${newValue.nome}`;
                                            setCentroForm(prev => ({ ...prev, nome: nomePadrao }));
                                        }
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Buscar Cliente para Nomear Centro de Custo" size="small" />}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            label="Nome do Centro de Custo (Analítico)"
                            fullWidth
                            placeholder="Ex: Contrato Hospital São Lucas, Veículo PLACA-1234"
                            value={centroForm.nome}
                            onChange={e => setCentroForm({ ...centroForm, nome: e.target.value })}
                        />

                        {/* Origens */}
                        <FormControl component="fieldset" variant="standard">
                            <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>Origens Automáticas Permitidas</FormLabel>
                            <FormGroup row>
                                {ORIGENS_DISPONIVEIS.map(origem => (
                                    <FormControlLabel
                                        key={origem.value}
                                        control={
                                            <Checkbox
                                                checked={centroForm.origensPermitidas?.includes(origem.value)}
                                                onChange={() => toggleOrigem(origem.value)}
                                                name={origem.value}
                                            />
                                        }
                                        label={<Typography variant="body2">{origem.label}</Typography>}
                                        sx={{ width: '48%' }}
                                    />
                                ))}
                            </FormGroup>
                        </FormControl>

                        <FormControlLabel
                            control={<Switch checked={centroForm.ativo} onChange={e => setCentroForm({ ...centroForm, ativo: e.target.checked })} />}
                            label="Cadastro Ativo"
                        />

                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenCentroDialog(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveCentro}>Salvar Centro de Custo</Button>
                </DialogActions>
            </Dialog>

            {/* ==============================================================================================
          CONFIRMAÇÃO E LOADING
         ============================================================================================== */}
            {loading && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <CircularProgress />
                </Box>
            )}

            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />

        </Container>
    );
}
