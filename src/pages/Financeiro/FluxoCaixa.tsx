import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Chip,
    IconButton,
    MenuItem,
    Alert,
    Tooltip
} from '@mui/material';
import { TABLE_HEADER_BG_COLOR, tableContainerStyles, tableStyles } from '../../styles/tableStyles';
import {
    Add,
    Remove,
    History,
    Delete,
    Edit,
    AccountBalanceWallet,
    LockOpen,
    Lock,
    Search
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
    collection,
    addDoc,
    updateDoc,
    query,
    orderBy,
    getDocs,
    Timestamp,
    deleteDoc,
    doc,
    where,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface CaixaSessao {
    id: string;
    dataAbertura: Timestamp;
    dataFechamento?: Timestamp;
    saldoInicial: number;
    saldoFinal?: number;
    saldoInformado?: number;
    quebraDeCaixa?: number;
    status: 'aberto' | 'fechado';
    usuarioAberturaId: string;
    usuarioAberturaNome: string;
    usuarioFechamentoId?: string;
    usuarioFechamentoNome?: string;
}

interface MovimentacaoCaixa {
    id: string;
    sessaoId?: string; // Link para a sessão (opcional para compatibilidade com legados)
    data: Timestamp;
    descricao: string;
    tipo: 'entrada' | 'saida' | 'sangria' | 'suprimento';
    valor: number;
    usuarioId: string;
    usuarioNome: string;
}

const CATEGORIAS_SAIDA = [
    'Pagamento Pequeno',
    'Lanche/Refeição',
    'Transporte/Combustível',
    'Material de Escritório',
    'Manutenção Rápida',
    'Sangria (Depósito Banco)',
    'Outros'
];

const CATEGORIAS_ENTRADA = [
    'Venda Balcão',
    'Aporte de Sócio',
    'Suprimento (Saque Banco)',
    'Troco/Devolução',
    'Outros'
];

export function FluxoCaixa() {
    const { userData } = useAuth();

    // Status do Caixa
    const [sessaoAtual, setSessaoAtual] = useState<CaixaSessao | null>(null);
    const [statusCaixa, setStatusCaixa] = useState<'verificando' | 'aberto' | 'fechado'>('verificando');

    // Dados
    const [saldoAtual, setSaldoAtual] = useState(0);
    const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal de Lançamento (Entrada/Saída)
    const [openDialog, setOpenDialog] = useState(false);
    const [tipoOperacao, setTipoOperacao] = useState<'entrada' | 'saida'>('entrada');
    const [formDescricao, setFormDescricao] = useState('');
    const [formCategoria, setFormCategoria] = useState('');
    const [formValor, setFormValor] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Modal de Abertura/Fechamento
    const [openAberturaDialog, setOpenAberturaDialog] = useState(false);
    const [openFechamentoDialog, setOpenFechamentoDialog] = useState(false);
    const [valorControle, setValorControle] = useState(''); // Usado para abrir (saldo inicial) e fechar (conferência)

    // Modal de Confirmação de Exclusão
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, valor: number, tipo: string } | null>(null);

    // Filtros e Visualização
    const [visibilidade, setVisibilidade] = useState<'sessao_atual' | 'historico_geral'>('sessao_atual');
    const [searchTerm, setSearchTerm] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        verificarStatusCaixa();
    }, [userData]);

    useEffect(() => {
        if (userData?.empresaId) {
            loadMovimentacoes();
        }
    }, [userData, sessaoAtual, visibilidade]);

    // 1. Verifica se existe sessão ABERTA
    const verificarStatusCaixa = async () => {
        if (!userData?.empresaId) return;

        try {
            const sessoesRef = collection(db, 'EMPRESAS', userData.empresaId, 'caixa_sessoes');
            // Nota: Removido orderBy para evitar erro de 'Missing Index' no Firestore se o índice composto não existir.
            // Como teoricamente só deve haver uma sessão aberta, pegamos a primeira que encontrarmos.
            const q = query(
                sessoesRef,
                where('status', '==', 'aberto'),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                setSessaoAtual({ id: docSnap.id, ...docSnap.data() } as CaixaSessao);
                setStatusCaixa('aberto');
                setVisibilidade('sessao_atual');
            } else {
                setSessaoAtual(null);
                setStatusCaixa('fechado');
                setVisibilidade('historico_geral');
            }
        } catch (error: any) {
            console.error("Erro ao verificar status do caixa:", error);
            // Se for erro de permissão ou índice, avisa admin
            if (error.code === 'failed-precondition') {
                alert("Erro de configuração do Firebase (Índice ausente). Avise o suporte.");
            }
            setStatusCaixa('fechado');
        }
    };

    // 2. Carrega Movimentações (Baseado na Visibilidade)
    const loadMovimentacoes = async () => {
        if (!userData?.empresaId) return;
        setLoading(true);

        try {
            const caixaRef = collection(db, 'EMPRESAS', userData.empresaId, 'caixa_movimentacoes');
            let q;

            if (visibilidade === 'sessao_atual') {
                if (!sessaoAtual?.id) {
                    // Se não tem sessão aberta validada, não deve mostrar NADA na aba 'Sessão Atual'.
                    // Isso corrige o bug de mostrar dados antigos.
                    setMovimentacoes([]);
                    setSaldoAtual(0);
                    setLoading(false);
                    return;
                }

                // Carrega APENAS registros vinculados a esta sessão específica
                // REMOVIDO orderBy temporariamente para evitar erro de índice e garantir filtro
                q = query(
                    caixaRef,
                    where('sessaoId', '==', sessaoAtual.id)
                );
            } else {
                // Modo Histórico Geral
                q = query(caixaRef, orderBy('data', 'desc'), limit(100));
            }

            const snapshot = await getDocs(q);

            const movs: MovimentacaoCaixa[] = [];
            let entradas = 0;
            let saidas = 0;

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const mov = { id: docSnap.id, ...data } as MovimentacaoCaixa;
                movs.push(mov);

                if (mov.tipo === 'entrada' || mov.tipo === 'suprimento') {
                    entradas += mov.valor;
                } else {
                    saidas += mov.valor;
                }
            });

            // Ordenação em memória para garantir consistência sem exigir índice composto
            movs.sort((a, b) => b.data.seconds - a.data.seconds);

            setMovimentacoes(movs);

            // CÁLCULO DO SALDO
            if (visibilidade === 'sessao_atual' && sessaoAtual) {
                // Saldo da Sessão = Saldo Inicial (Fundo) + Entradas - Saídas
                const saldoSessao = (sessaoAtual.saldoInicial || 0) + (entradas - saidas);
                setSaldoAtual(saldoSessao);
            } else {
                // Saldo do Histórico (Cálculo aproximado baseado no que foi carregado)
                setSaldoAtual(entradas - saidas);
            }

        } catch (error) {
            console.error("Erro ao carregar movimentações:", error);
        } finally {
            setLoading(false);
        }
    };


    // ----- AÇÕES DE ABERTURA E FECHAMENTO -----

    const handleAbrirCaixaConfirm = async () => {
        if (!userData?.empresaId) return;

        if (!valorControle) {
            alert("Por favor, informe o saldo inicial para abrir o caixa.");
            return;
        }

        setSaving(true);
        try {
            const valorInicial = parseFloat(valorControle.replace(',', '.'));

            const novaSessao = {
                dataAbertura: Timestamp.now(),
                saldoInicial: valorInicial,
                status: 'aberto',
                usuarioAberturaId: userData.id,
                usuarioAberturaNome: userData.nome
            };

            const docRef = await addDoc(collection(db, 'EMPRESAS', userData.empresaId, 'caixa_sessoes'), novaSessao);

            // Se houve saldo inicial, cria um registro de "Saldo Inicial" nas movimentações também?
            // Não necessariamente, pois já está no header da sessão. Mas ajuda no extrato.
            // Vamos criar apenas o doc da sessão e usar o campo saldoInicial para o cálculo.

            setOpenAberturaDialog(false);
            setValorControle('');
            verificarStatusCaixa(); // Recarrega estado

        } catch (error) {
            console.error(error);
            alert("Erro ao abrir caixa");
        } finally {
            setSaving(false);
            setVisibilidade('sessao_atual');
        }
    };

    const handleFecharCaixaConfirm = async () => {
        if (!userData?.empresaId || !sessaoAtual) return;

        if (!valorControle) {
            alert("Por favor, realize a contagem e informe o valor em gaveta.");
            return;
        }

        setSaving(true);
        try {
            const saldoInformado = parseFloat(valorControle.replace(',', '.'));
            const diferenca = saldoInformado - saldoAtual; // Quebra de caixa

            // Atualiza sessão
            await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'caixa_sessoes', sessaoAtual.id), {
                dataFechamento: Timestamp.now(),
                saldoFinal: saldoAtual, // O que o sistema calculou
                saldoInformado: saldoInformado, // O que o usuário contou
                quebraDeCaixa: diferenca,
                status: 'fechado',
                usuarioFechamentoId: userData.id,
                usuarioFechamentoNome: userData.nome
            });

            setOpenFechamentoDialog(false);
            setValorControle('');
            setSessaoAtual(null);
            setStatusCaixa('fechado');
            setVisibilidade('historico_geral');
            loadMovimentacoes();

        } catch (error) {
            console.error(error);
            alert("Erro ao fechar caixa");
        } finally {
            setSaving(false);
        }
    };


    // ----- LÓGICA DE FILTRAGEM LOCAL (Para busca e data na tabela atual) -----
    const movimentacoesFiltradas = movimentacoes.filter(mov => {
        const matchText = mov.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mov.valor.toString().includes(searchTerm);

        // Se já estamos vendo histórico e o usuário filtra data:
        let matchDate = true;
        if (dataInicio) {
            const dataMov = mov.data.toDate();
            dataMov.setHours(0, 0, 0, 0);
            const dtIni = new Date(dataInicio + 'T00:00:00');
            matchDate = matchDate && (dataMov >= dtIni);
        }
        if (dataFim) {
            const dataMov = mov.data.toDate();
            dataMov.setHours(0, 0, 0, 0);
            const dtFim = new Date(dataFim + 'T00:00:00');
            matchDate = matchDate && (dataMov <= dtFim);
        }
        return matchText && matchDate;
    });

    // ----- AÇÕES DE LANÇAMENTO (CRUD) -----

    const handleOpenEntrada = () => setupModal('entrada');
    const handleOpenSaida = () => setupModal('saida');

    const setupModal = (tipo: 'entrada' | 'saida', mov?: MovimentacaoCaixa) => {
        if (statusCaixa === 'fechado') {
            alert("O Caixa precisa estar ABERTO para realizar lançamentos.");
            return;
        }

        if (mov) {
            setEditingId(mov.id);
            setTipoOperacao(tipo);
            const match = mov.descricao.match(/(.*) \((.*)\)$/);
            if (match) {
                setFormDescricao(match[1]);
                setFormCategoria(match[2]);
            } else {
                setFormDescricao(mov.descricao);
                setFormCategoria('');
            }
            setFormValor(mov.valor.toString());
        } else {
            setEditingId(null);
            setTipoOperacao(tipo);
            setFormDescricao('');
            setFormCategoria('');
            setFormValor('');
        }
        setOpenDialog(true);
    }

    const handleSalvar = async () => {
        if (!formDescricao || !formValor || Number(formValor) <= 0) return;
        if (!userData?.empresaId) return;

        setSaving(true);
        try {
            const valorNumber = Number(formValor.replace(',', '.'));

            if (tipoOperacao === 'saida' && !editingId && valorNumber > saldoAtual) {
                if (!window.confirm("ATENÇÃO: Este lançamento deixará o caixa NEGATIVO. Deseja continuar?")) {
                    setSaving(false);
                    return;
                }
            }

            const dadosMovimentacao = {
                descricao: formDescricao + (formCategoria ? ` (${formCategoria})` : ''),
                tipo: tipoOperacao,
                valor: valorNumber,
                ...(editingId ? {} : {
                    data: Timestamp.now(),
                    sessaoId: sessaoAtual?.id // Vincula à sessão atual
                }),
                usuarioId: userData.id || '',
                usuarioNome: userData.nome
            };

            if (editingId) {
                await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'caixa_movimentacoes', editingId), dadosMovimentacao);
            } else {
                await addDoc(collection(db, 'EMPRESAS', userData.empresaId, 'caixa_movimentacoes'), dadosMovimentacao);
            }

            setOpenDialog(false);
            setEditingId(null);
            loadMovimentacoes(); // Recarrega para atualizar saldo

        } catch (error: any) {
            console.error("Erro detalhado ao salvar movimentação:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (id: string, valor: number, tipo: string) => {
        if (statusCaixa === 'fechado') {
            alert("Não é possível excluir movimentações de um caixa fechado.");
            return;
        }
        setItemToDelete({ id, valor, tipo });
        setOpenConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete || !userData?.empresaId) return;

        try {
            await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'caixa_movimentacoes', itemToDelete.id));
            setOpenConfirmDialog(false);
            setItemToDelete(null);
            loadMovimentacoes();
        } catch (error) {
            console.error("Erro ao excluir", error);
        }
    };

    return (
        <Box>
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWallet fontSize="large" /> Controle de Caixa
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {statusCaixa === 'aberto'
                            ? `Caixa ABERTO por ${sessaoAtual?.usuarioAberturaNome} em ${sessaoAtual?.dataAbertura.toDate().toLocaleDateString()} às ${sessaoAtual?.dataAbertura.toDate().toLocaleTimeString()}`
                            : "Caixa FECHADO - Abra uma nova sessão para movimentar"}
                    </Typography>
                </Box>
                <Box>
                    {statusCaixa === 'aberto' ? (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Lock />}
                            onClick={() => {
                                setValorControle('');
                                setOpenFechamentoDialog(true);
                            }}
                        >
                            FECHAR CAIXA
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LockOpen />}
                            onClick={() => {
                                setValorControle('0,00');
                                setOpenAberturaDialog(true);
                            }}
                        >
                            ABRIR CAIXA
                        </Button>
                    )}
                </Box>
            </Box>

            {/* CARD DE SALDO */}
            <Box mb={4} display="flex" justifyContent="center">
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        minWidth: 300,
                        bgcolor: saldoAtual >= 0 ? '#e8f5e9' : '#ffebee',
                        border: '1px solid',
                        borderColor: saldoAtual >= 0 ? '#4caf50' : '#f44336',
                        borderRadius: 4,
                        opacity: statusCaixa === 'fechado' ? 0.6 : 1
                    }}
                >
                    <Typography variant="subtitle1" color="text.secondary" fontWeight="bold">
                        {statusCaixa === 'aberto' ? 'SALDO ATUAL EM GAVETA' : 'SALDO ACUMULADO'}
                    </Typography>
                    <Typography variant="h2" fontWeight="bold" color={saldoAtual >= 0 ? 'success.main' : 'error.main'}>
                        {saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Typography>
                    {statusCaixa === 'aberto' && (
                        <Typography variant="caption" color="text.secondary">
                            Iniciado com {sessaoAtual?.saldoInicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                    )}
                </Paper>
            </Box>

            {/* BOTÕES DE AÇÃO */}
            <Box mb={4} display="flex" gap={2} justifyContent="center">
                <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<Add />}
                    onClick={handleOpenEntrada}
                    disabled={statusCaixa === 'fechado'}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                    Entrada
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<Remove />}
                    onClick={handleOpenSaida}
                    disabled={statusCaixa === 'fechado'}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                    Saída
                </Button>
            </Box>

            {/* EXTRATO */}
            <Paper className="mt-4" sx={{ width: '100%', overflow: 'hidden' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" gap={1}>
                        <Button
                            startIcon={<History />}
                            variant={visibilidade === 'sessao_atual' ? 'contained' : 'outlined'}
                            onClick={() => setVisibilidade('sessao_atual')}
                            disabled={statusCaixa === 'fechado'}
                            size="small"
                        >
                            Sessão Atual
                        </Button>
                        <Button
                            startIcon={<Search />}
                            variant={visibilidade === 'historico_geral' ? 'contained' : 'outlined'}
                            onClick={() => setVisibilidade('historico_geral')}
                            size="small"
                        >
                            Histórico Geral
                        </Button>
                    </Box>

                    {/* BARRA DE FILTROS */}
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Buscar..."
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ minWidth: 150 }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                        />
                        <TextField
                            type="date"
                            size="small"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                        />
                    </Box>
                </Box>

                <TableContainer sx={tableContainerStyles}>
                    <Table size="small" sx={tableStyles}>
                        <TableHead sx={{ backgroundColor: TABLE_HEADER_BG_COLOR }}>
                            <TableRow>
                                <TableCell><strong>Data/Hora</strong></TableCell>
                                <TableCell><strong>Descrição</strong></TableCell>
                                <TableCell><strong>Responsável</strong></TableCell>
                                <TableCell><strong>Tipo</strong></TableCell>
                                <TableCell align="right"><strong>Valor</strong></TableCell>
                                <TableCell align="right"><strong>Ações</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress /></TableCell>
                                </TableRow>
                            ) : movimentacoesFiltradas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="textSecondary">
                                            {movimentacoes.length === 0 ? "Nenhuma movimentação nesta sessão." : "Nenhum resultado para o filtro."}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movimentacoesFiltradas.map((mov) => (
                                    <TableRow key={mov.id} hover>
                                        <TableCell sx={{ py: 0.25 }}>{mov.data.toDate().toLocaleString('pt-BR')}</TableCell>
                                        <TableCell sx={{ py: 0.25 }}>{mov.descricao}</TableCell>
                                        <TableCell sx={{ py: 0.25 }}>{mov.usuarioNome}</TableCell>
                                        <TableCell sx={{ py: 0.25 }}>
                                            <Chip
                                                label={mov.tipo.toUpperCase()}
                                                color={mov.tipo === 'entrada' || mov.tipo === 'suprimento' ? 'success' : 'error'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{
                                            py: 0.25,
                                            fontWeight: 'bold',
                                            color: mov.tipo === 'entrada' || mov.tipo === 'suprimento' ? 'success.main' : 'error.main'
                                        }}>
                                            {mov.tipo === 'saida' ? '- ' : '+ '}
                                            {mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 0.25 }}>
                                            <Tooltip title="Editar">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setupModal(mov.tipo === 'entrada' || mov.tipo === 'suprimento' ? 'entrada' : 'saida', mov)}
                                                    disabled={statusCaixa === 'fechado'}
                                                    sx={{ color: '#ff9800', mr: 1 }}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Excluir">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteClick(mov.id, mov.valor, mov.tipo)}
                                                    disabled={statusCaixa === 'fechado'}
                                                    sx={{ color: '#f44336' }}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* MODAL DE LANÇAMENTO (ENTRADA/SAIDA) */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: tipoOperacao === 'entrada' ? '#e8f5e9' : '#ffebee' }}>
                    {editingId ? 'Editar Lançamento' : (tipoOperacao === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída')}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box mt={2} display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Valor (R$)"
                            type="number"
                            fullWidth
                            value={formValor}
                            onChange={(e) => setFormValor(e.target.value)}
                            autoFocus
                        />
                        <TextField
                            select
                            label="Categoria Sugerida"
                            fullWidth
                            value={formCategoria}
                            onChange={(e) => setFormCategoria(e.target.value)}
                        >
                            {(tipoOperacao === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Descrição Detalhada"
                            fullWidth
                            multiline
                            rows={2}
                            value={formDescricao}
                            onChange={(e) => setFormDescricao(e.target.value.toUpperCase())}
                            placeholder={tipoOperacao === 'entrada' ? "EX: VENDA DE CONTROLE REMOTO" : "EX: CAFÉ PARA REUNIÃO"}
                            inputProps={{ style: { textTransform: 'uppercase' } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color={tipoOperacao === 'entrada' ? 'success' : 'error'}
                        onClick={handleSalvar}
                        disabled={saving}
                    >
                        {saving ? 'Processando...' : (editingId ? 'Atualizar' : 'Confirmar')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL ABERTURA DE CAIXA */}
            <Dialog open={openAberturaDialog} onClose={() => setOpenAberturaDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Abrir Caixa</DialogTitle>
                <DialogContent>
                    <Box pt={2}>
                        <Typography variant="body2" gutterBottom>
                            Informe o valor inicial (Fundo de Troco) que está na gaveta agora.
                        </Typography>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Saldo Inicial (R$)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={valorControle}
                            onChange={(e) => setValorControle(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAberturaDialog(false)}>Cancelar</Button>
                    <Button onClick={handleAbrirCaixaConfirm} variant="contained" color="primary">
                        Confirmar Abertura
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL FECHAMENTO DE CAIXA */}
            <Dialog open={openFechamentoDialog} onClose={() => setOpenFechamentoDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Fechar Caixa</DialogTitle>
                <DialogContent>
                    <Box pt={2} display="flex" flexDirection="column" gap={2}>
                        <Alert severity="info">
                            O sistema calculou que deve haver <strong>{saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> em caixa.
                        </Alert>

                        <Typography variant="subtitle1" fontWeight="bold">
                            Conferência Cega
                        </Typography>
                        <Typography variant="body2">
                            Conte o dinheiro na gaveta e digite o valor encontrado abaixo.
                        </Typography>

                        <TextField
                            autoFocus
                            label="Valor Contado (R$)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={valorControle}
                            onChange={(e) => setValorControle(e.target.value)}
                        />

                        {valorControle && (
                            <Box p={2} bgcolor="#f5f5f5" borderRadius={2}>
                                <Typography variant="caption" display="block">Resultado da Conferência:</Typography>
                                <Typography
                                    variant="h6"
                                    color={(parseFloat(valorControle.replace(',', '.')) - saldoAtual) >= 0 ? 'success.main' : 'error.main'}
                                >
                                    {(parseFloat(valorControle.replace(',', '.')) - saldoAtual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    {' '}
                                    {(parseFloat(valorControle.replace(',', '.')) - saldoAtual) === 0
                                        ? '(Batimento Perfeito)'
                                        : (parseFloat(valorControle.replace(',', '.')) - saldoAtual) > 0 ? '(Sobra)' : '(Quebra/Falta)'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFechamentoDialog(false)}>Cancelar</Button>
                    <Button onClick={handleFecharCaixaConfirm} variant="contained" color="error">
                        Encerrar Dia
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            <ConfirmDialog
                open={openConfirmDialog}
                onClose={() => setOpenConfirmDialog(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Lançamento?"
                message={itemToDelete ? (
                    <Typography>
                        Deseja realmente excluir este lançamento de <strong>{itemToDelete.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>?
                        <br /><br />
                        Esta ação alterará o saldo da sessão atual.
                    </Typography>
                ) : ''}
                confirmButtonText="Excluir Definitivamente"
            />
        </Box>
    );
}
