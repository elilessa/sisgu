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
    Grid
} from '@mui/material';
import { ActionEdit, ActionDelete, StatusChip } from '../../components/TableActions';
import {
    Add as AddIcon,
    AccountBalance as AccountBalanceIcon,
    ListAlt as ListAltIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { customColors } from '../../theme';

import { PlanoContaCategoria, PlanoConta, TipoPlanoConta } from '../../types/financeiro';

export function PlanoContas() {
    const { userData } = useAuth();
    const empresaId = userData?.empresaId;

    const [tabIndex, setTabIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Estados de Dados
    const [categorias, setCategorias] = useState<PlanoContaCategoria[]>([]);
    const [contas, setContas] = useState<PlanoConta[]>([]);

    // Dialog Categoria
    const [openCatDialog, setOpenCatDialog] = useState(false);
    const [selectedCat, setSelectedCat] = useState<PlanoContaCategoria | null>(null);
    const [catForm, setCatForm] = useState<Partial<PlanoContaCategoria>>({
        nome: '',
        codigo: '',
        tipo: 'despesa', // Default seguro
        descricao: '',
        ativo: true
    });

    // Dialog Conta
    const [openContaDialog, setOpenContaDialog] = useState(false);
    const [selectedConta, setSelectedConta] = useState<PlanoConta | null>(null);
    const [contaForm, setContaForm] = useState<Partial<PlanoConta>>({
        nome: '',
        categoriaId: '',
        ativo: true
    });

    // Confirmação
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Timer para limpar mensagens
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // ==================== CARREGAMENTO ====================
    useEffect(() => {
        if (empresaId) loadData();
    }, [empresaId]);

    const loadData = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            // Carregar Categorias
            const catSnap = await getDocs(query(
                collection(db, 'EMPRESAS', empresaId, 'plano_contas_categorias'),
                orderBy('codigo')
            ));
            const catData = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanoContaCategoria));
            setCategorias(catData);

            // Carregar Contas Analíticas
            const contaSnap = await getDocs(query(
                collection(db, 'EMPRESAS', empresaId, 'plano_contas'),
                orderBy('codigo')
            ));
            const contaData = contaSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanoConta));
            setContas(contaData);

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar Plano de Contas.');
        } finally {
            setLoading(false);
        }
    };

    // ==================== CATEGORIAS ====================
    const handleOpenCat = (cat?: PlanoContaCategoria) => {
        if (cat) {
            setSelectedCat(cat);
            setCatForm({ ...cat });
        } else {
            setSelectedCat(null);
            setCatForm({
                nome: '',
                codigo: '',
                tipo: 'despesa',
                descricao: '',
                ativo: true
            });
        }
        setOpenCatDialog(true);
    };

    const handleSaveCat = async () => {
        if (!empresaId || !catForm.nome || !catForm.codigo) {
            setError('Nome e Código são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const data = {
                ...catForm,
                codigo: catForm.codigo, // Mantém formatação original (pode conter pontos)
                atualizadoEm: new Date().toISOString()
            };

            if (selectedCat) {
                await updateDoc(doc(db, 'EMPRESAS', empresaId, 'plano_contas_categorias', selectedCat.id), data);

                // Atualizar filhos se mudou nome/código/tipo
                const filhos = contas.filter(c => c.categoriaId === selectedCat.id);
                const batchPromises = filhos.map(filho =>
                    updateDoc(doc(db, 'EMPRESAS', empresaId, 'plano_contas', filho.id), {
                        categoriaNome: data.nome,
                        categoriaCodigo: data.codigo,
                        tipo: data.tipo // Importante: Filhos herdam o tipo da categoria pai
                    })
                );
                await Promise.all(batchPromises);

                setSuccess('Categoria atualizada com sucesso.');
            } else {
                await addDoc(collection(db, 'EMPRESAS', empresaId, 'plano_contas_categorias'), {
                    ...data,
                    empresaId,
                    criadoPor: userData?.email,
                    criadoEm: new Date().toISOString()
                });
                setSuccess('Categoria criada com sucesso!');
            }
            setOpenCatDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar categoria.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCat = (cat: PlanoContaCategoria) => {
        const temFilhos = contas.some(c => c.categoriaId === cat.id);
        if (temFilhos) {
            setError(`Impossível excluir. Existem contas vinculadas à categoria "${cat.nome}".`);
            return;
        }
        setConfirmDialog({
            open: true,
            title: 'Excluir Categoria',
            message: `Deseja excluir a categoria "${cat.nome}"?`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'EMPRESAS', empresaId!, 'plano_contas_categorias', cat.id));
                    setSuccess('Categoria excluída.');
                    loadData();
                } catch (err) { setError('Erro ao excluir.'); }
                setConfirmDialog(p => ({ ...p, open: false }));
            }
        });
    };

    // ==================== CONTAS ANALÍTICAS ====================
    const handleOpenConta = (conta?: PlanoConta) => {
        if (conta) {
            setSelectedConta(conta);
            setContaForm({ ...conta });
        } else {
            setSelectedConta(null);
            setContaForm({
                nome: '',
                categoriaId: '',
                ativo: true
            });
        }
        setOpenContaDialog(true);
    };

    const handleSaveConta = async () => {
        if (!empresaId || !contaForm.nome || !contaForm.categoriaId) {
            setError('Nome e Categoria são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const parentCat = categorias.find(c => c.id === contaForm.categoriaId);
            if (!parentCat) throw new Error("Categoria Pai não encontrada");

            // Geração de Código
            let codigoFinal = contaForm.codigo;
            if (!selectedConta) {
                // Auto-gerar código: CAT.XXX
                const irmaos = contas.filter(c => c.categoriaId === parentCat.id);
                const seq = irmaos.length + 1; // Simplificado. Ideal seria buscar o max(codigo).
                const suffix = seq.toString().padStart(3, '0');
                // Se o pai já tem pontos (1.01), usa ponto. Se não (100), usa ponto.
                codigoFinal = `${parentCat.codigo}.${suffix}`;
            }

            const data = {
                ...contaForm,
                codigo: codigoFinal,
                categoriaNome: parentCat.nome,
                categoriaCodigo: parentCat.codigo,
                tipo: parentCat.tipo, // Herança Rígida
                atualizadoEm: new Date().toISOString()
            };

            if (selectedConta) {
                await updateDoc(doc(db, 'EMPRESAS', empresaId, 'plano_contas', selectedConta.id), data);
                setSuccess('Conta atualizada.');
            } else {
                await addDoc(collection(db, 'EMPRESAS', empresaId, 'plano_contas'), {
                    ...data,
                    empresaId,
                    criadoPor: userData?.email,
                    criadoEm: new Date().toISOString()
                });
                setSuccess(`Conta criada: ${codigoFinal}`);
            }
            setOpenContaDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar conta.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConta = (conta: PlanoConta) => {
        setConfirmDialog({
            open: true,
            title: 'Excluir Conta',
            message: `Confirma excluir a conta analítica "${conta.nome}" (${conta.codigo})? Verifique se não há lançamentos financeiros nela.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'EMPRESAS', empresaId!, 'plano_contas', conta.id));
                    setSuccess('Conta excluída.');
                    loadData();
                } catch (err) { setError('Erro ao excluir.'); }
                setConfirmDialog(p => ({ ...p, open: false }));
            }
        });
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Plano de Contas</Typography>
            </Box>

            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
                    <Tab label="1. Categorias (Sintético)" icon={<ListAltIcon />} iconPosition="start" />
                    <Tab label="2. Contas (Analítico)" icon={<AccountBalanceIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ABA 1: CATEGORIAS */}
            {tabIndex === 0 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCat()}>
                            Nova Categoria
                        </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Estrutura</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Nome da Categoria</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categorias.map((cat) => (
                                    <TableRow key={cat.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{cat.codigo}</TableCell>
                                        <TableCell>{cat.nome}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={cat.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}
                                                color={cat.tipo === 'receita' ? 'success' : 'error'}
                                                size="small" variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <StatusChip status={cat.ativo ? 'ativo' : 'inativo'} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <ActionEdit onClick={() => handleOpenCat(cat)} title="Editar" />
                                                <ActionDelete onClick={() => handleDeleteCat(cat)} title="Excluir" />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categorias.length === 0 && (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Nenhuma categoria cadastrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* ABA 2: CONTAS */}
            {tabIndex === 1 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenConta()}>
                            Nova Conta Analítica
                        </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Classificação</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Conta Analítica</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Categoria</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Natureza</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contas.map(conta => (
                                    <TableRow key={conta.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{conta.codigo}</TableCell>
                                        <TableCell>{conta.nome}</TableCell>
                                        <TableCell>
                                            {conta.categoriaCodigo} - {conta.categoriaNome}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={conta.tipo === 'receita' ? 'REC' : 'DESP'}
                                                color={conta.tipo === 'receita' ? 'success' : 'error'}
                                                size="small"
                                                sx={{ minWidth: 60 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <StatusChip status={conta.ativo ? 'ativo' : 'inativo'} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <ActionEdit onClick={() => handleOpenConta(conta)} title="Editar" />
                                                <ActionDelete onClick={() => handleDeleteConta(conta)} title="Excluir" />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {contas.length === 0 && (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Nenhuma conta analítica cadastrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* DIALOG CATEGORIA */}
            <Dialog open={openCatDialog} onClose={() => setOpenCatDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid size={4}>
                                <TextField label="Código (Nível 1)" fullWidth value={catForm.codigo} onChange={e => setCatForm({ ...catForm, codigo: e.target.value })} helperText="Ex: 1, 2, 11" />
                            </Grid>
                            <Grid size={8}>
                                <TextField label="Nome da Categoria" fullWidth value={catForm.nome} onChange={e => setCatForm({ ...catForm, nome: e.target.value })} />
                            </Grid>
                        </Grid>

                        <TextField
                            select
                            label="Tipo Financeiro (Natureza)"
                            fullWidth
                            value={catForm.tipo}
                            onChange={e => setCatForm({ ...catForm, tipo: e.target.value as TipoPlanoConta })}
                            disabled={!!selectedCat} // Trava edição de tipo para não quebrar histórico
                            helperText="Define se é entrada ou saída de dinheiro."
                        >
                            <MenuItem value="receita">Receita (Entrada)</MenuItem>
                            <MenuItem value="despesa">Despesa (Saída)</MenuItem>
                        </TextField>

                        <TextField label="Descrição / Observação" fullWidth multiline rows={2} value={catForm.descricao} onChange={e => setCatForm({ ...catForm, descricao: e.target.value })} />
                        <FormControlLabel control={<Switch checked={catForm.ativo} onChange={e => setCatForm({ ...catForm, ativo: e.target.checked })} />} label="Categoria Ativa" />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCatDialog(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveCat}>Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG CONTA */}
            <Dialog open={openContaDialog} onClose={() => setOpenContaDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedConta ? 'Editar Conta Analítica' : 'Nova Conta Analítica'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

                        <TextField
                            select
                            label="Categoria Pai (Sintética)"
                            fullWidth
                            value={contaForm.categoriaId}
                            onChange={e => {
                                const cat = categorias.find(c => c.id === e.target.value);
                                setContaForm({ ...contaForm, categoriaId: e.target.value });
                            }}
                            disabled={!!selectedConta}
                        >
                            {categorias.map(cat => (
                                <MenuItem key={cat.id} value={cat.id}>
                                    {cat.codigo} - {cat.nome} ({cat.tipo === 'receita' ? 'REC' : 'DESP'})
                                </MenuItem>
                            ))}
                        </TextField>

                        {contaForm.categoriaId && (
                            <Alert severity={categorias.find(c => c.id === contaForm.categoriaId)?.tipo === 'receita' ? 'success' : 'error'} icon={false} sx={{ py: 0 }}>
                                Natureza da Conta: <strong>{categorias.find(c => c.id === contaForm.categoriaId)?.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}</strong> (Herdado)
                            </Alert>
                        )}

                        <TextField label="Nome da Conta" fullWidth value={contaForm.nome} onChange={e => setContaForm({ ...contaForm, nome: e.target.value })} placeholder="Ex: Combustível, Aluguel, Venda de Serviços" />
                        <FormControlLabel control={<Switch checked={contaForm.ativo} onChange={e => setContaForm({ ...contaForm, ativo: e.target.checked })} />} label="Conta Ativa" />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenContaDialog(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveConta}>Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* CONFIRMAÇÃO */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />

            {loading && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <CircularProgress />
                </Box>
            )}
        </Container>
    );
}
