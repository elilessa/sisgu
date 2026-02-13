import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Stack,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Autocomplete,
    Grid,
    InputAdornment,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
    Alert
} from '@mui/material';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    limit,
    Timestamp,
    addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CentroCusto, PlanoConta, ContaPagar } from '../../types/financeiro';
import {
    ChevronLeft,
    ChevronRight,
    Today,
    MoneyOff,
    Warning,
    Add,
    Edit,
    Delete,
    Visibility,
    Business,
    Description,
    CheckCircle
} from '@mui/icons-material';
import {
    format,
    addMonths,
    subMonths,
    isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';


import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useFinanceiro } from '../../hooks/useFinanceiro';

// --- HELPERS E COMPONENTES VISUAIS (In-File para garantir layout idêntico ao Receber) ---

const weekDaysLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const getMonthGridDays = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const start = getMonday(firstDay);
    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

const DayCell = ({
    day,
    anchorDate,
    totais,
    onClick,
    isSelected
}: {
    day: Date,
    anchorDate: Date,
    totais?: { total: number, count: number, vencido: number, pago: number },
    onClick?: () => void,
    isSelected?: boolean
}) => {
    const isToday = isSameDay(day, new Date());
    const isCurrentMonth = day.getMonth() === anchorDate.getMonth(); // Simple check
    const hasValue = totais && totais.total > 0;

    // CORES PARA CONTAS A PAGAR (Despesas)
    // Hoje: Fundo Vermelho claro
    // Selecionado: Borda Vermelha forte
    // Texto Valor: Vermelho se vencido/aberto, Verde se pago (mas aqui mostramos total a pagar, então foco no vermelho)

    // Cor do Texto de Valor:
    // Se tiver vencido > 0 -> Vermelho Escuro Forte (Alerta)
    // Se tiver apenas pago -> Verde (Resolvido)
    // Se aberto normal -> Vermelho (Despesa prevista)

    let valueColor = '#d32f2f'; // Padrão Despesa (Vermelho)
    if (totais) {
        if (totais.vencido > 0) valueColor = '#b71c1c'; // Vencido (Vinho/Vermelho Escuro)
        else if (totais.total === totais.pago) valueColor = '#2e7d32'; // Tudo pago (Verde)
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                border: isSelected ? '2px solid #d32f2f' : (isToday ? '2px solid rgba(211, 47, 47, 0.5)' : '1px solid rgba(0,0,0,0.12)'),
                bgcolor: isSelected ? 'rgba(211, 47, 47, 0.12)' : (isToday ? 'rgba(211, 47, 47, 0.04)' : '#fff'),
                minHeight: 50,
                p: 0.5,
                opacity: isCurrentMonth ? 1 : 0.5,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    borderColor: '#d32f2f'
                }
            }}
            onClick={onClick}
        >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography sx={{ fontWeight: 900, color: isToday ? '#d32f2f' : 'text.secondary', fontSize: 11 }}>
                    {day.getDate()}
                </Typography>
                {totais && totais.vencido > 0 && (
                    <Tooltip title="Existem contas vencidas!">
                        <Warning color="error" sx={{ fontSize: 12 }} />
                    </Tooltip>
                )}
            </Box>

            {hasValue && (
                <Box>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 900,
                            color: valueColor,
                            fontSize: '0.75rem',
                            mb: 0,
                            lineHeight: 1
                        }}
                    >
                        {formatCurrency(totais!.total)}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

// --- PÁGINA ---
const ContasPagar: React.FC = () => {
    const { getContasPagar, addContaPagar, deleteContaPagar, baixarContaPagar, error: financeiroError } = useFinanceiro();
    const { userData } = useAuth();

    // Lista principal e filtros de data
    const [contas, setContas] = useState<ContaPagar[]>([]);
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [contasDoMes, setContasDoMes] = useState<ContaPagar[]>([]);

    // Cálculos para o Calendário (Totais por dia)
    const dadosPorDia = useMemo(() => {
        const map: Record<string, { total: number, count: number, vencido: number, pago: number }> = {};
        contasDoMes.forEach(c => {
            const k = c.dataVencimento; // YYYY-MM-DD
            if (!map[k]) map[k] = { total: 0, count: 0, vencido: 0, pago: 0 };
            const val = c.status === 'pago' ? (c.valorPago || c.valorFinal) : c.valorFinal;

            map[k].total += val;
            map[k].count += 1;

            if (c.status === 'vencido') map[k].vencido += val;
            if (c.status === 'pago') map[k].pago += val;
        });
        return map;
    }, [contasDoMes, anchorDate]); // Recalcula se mudar a lista do mês

    const handleDayClick = (day: Date) => {
        const k = format(day, 'yyyy-MM-dd');
        // const hasData = dadosPorDia[k] && dadosPorDia[k].count > 0;

        if (selectedDate && isSameDay(day, selectedDate)) {
            setSelectedDate(null);
        } else {
            // Permite clicar em qualquer dia, mesmo vazio, para filtrar (ex: adicionar novo nesse dia)
            setSelectedDate(day);
        }
    };

    const gridDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);

    // --- BAIXA MANUAL STATE ---
    const [openBaixaDialog, setOpenBaixaDialog] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [formBaixa, setFormBaixa] = useState({
        contaId: '',
        dataPagamento: format(new Date(), 'yyyy-MM-dd'),
        valorPago: ''
    });

    const handleOpenBaixa = (conta: ContaPagar) => {
        setFormBaixa({
            contaId: conta.id,
            dataPagamento: format(new Date(), 'yyyy-MM-dd'),
            valorPago: conta.valorFinal.toFixed(2)
        });
        setOpenBaixaDialog(true);
    };

    const handleSaveBaixa = async () => {
        if (!formBaixa.contaId || !formBaixa.valorPago) return;
        setLoadingSave(true);
        try {
            const valor = parseFloat(formBaixa.valorPago.replace(',', '.'));
            await baixarContaPagar(formBaixa.contaId, {
                status: 'pago',
                valorPago: valor,
                dataPagamento: formBaixa.dataPagamento
            });
            setOpenBaixaDialog(false);

            // Atualiza lista localmente
            const updateLocal = (prev: ContaPagar[]) => prev.map(c => c.id === formBaixa.contaId ? {
                ...c,
                status: 'pago',
                valorPago: valor,
                dataPagamento: formBaixa.dataPagamento
            } as ContaPagar : c);

            setContas(updateLocal);
            setContasDoMes(updateLocal);

        } catch (err: any) {
            console.error(err);
            alert('Erro ao baixar conta: ' + err);
        } finally {
            setLoadingSave(false);
        }
    };

    // --- EXCLUSÃO (Updated to use ConfirmDialog) ---
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [contaToDelete, setContaToDelete] = useState<ContaPagar | null>(null);

    const handleDeleteClick = (conta: ContaPagar) => {
        setContaToDelete(conta);
        setOpenConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!contaToDelete) return;
        try {
            await deleteContaPagar(contaToDelete.id);
            setContas(prev => prev.filter(c => c.id !== contaToDelete.id));
            setContasDoMes(prev => prev.filter(c => c.id !== contaToDelete.id));
            setOpenConfirmDialog(false);
            setContaToDelete(null);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao excluir: ' + err);
        }
    };

    // --- NOVA DESPESA STATE ---
    const [openDialog, setOpenDialog] = useState(false);
    const [listas, setListas] = useState<{
        fornecedores: any[],
        centrosCusto: CentroCusto[],
        planoContas: PlanoConta[]
    }>({ fornecedores: [], centrosCusto: [], planoContas: [] });

    const [formDespesa, setFormDespesa] = useState({
        fornecedorId: '',
        fornecedorNome: '',
        descricao: '',
        valor: '',
        dataVencimento: format(new Date(), 'yyyy-MM-dd'),
        formaPagamento: 'boleto',
        centroCustoId: '',
        planoContaId: ''
    });

    // --- ESTADOS VISUALIZAÇÃO DETALHADA ---
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [viewConta, setViewConta] = useState<ContaPagar | null>(null);
    const [viewFornecedorFull, setViewFornecedorFull] = useState<any>(null);
    const [viewHistorico, setViewHistorico] = useState<ContaPagar[]>([]);
    const [tabViewValue, setTabViewValue] = useState(0);
    const [loadingView, setLoadingView] = useState(false);

    const handleOpenView = async (conta: ContaPagar) => {
        setViewConta(conta);
        setTabViewValue(0);
        setOpenViewDialog(true);
        setLoadingView(true);
        setViewFornecedorFull(null);
        setViewHistorico([]);

        try {
            if (conta.fornecedorId && userData?.empresaId) {
                // 1. Dados do Fornecedor
                // Supondo coleção 'fornecedores' ou 'clientes' com flag fornecedor?
                // Vou assumir 'fornecedores' na collection 'EMPRESAS/{id}/fornecedores'
                // Se não tiver coleção fornecedores específica, ajustar depois.
                // Geralmente Sistemas usam tabela unificada PESSOAS ou separada.
                // Mas como o user pediu "Fornecedor (dropdown vinculado ao cadastro de fornecedores)",
                // vou assumir que existe collection 'fornecedores'. Se der erro, corrigimos.

                const fornecRef = doc(db, 'EMPRESAS', userData.empresaId, 'fornecedores', conta.fornecedorId);
                const fornecSnap = await getDoc(fornecRef);
                if (fornecSnap.exists()) {
                    setViewFornecedorFull(fornecSnap.data());
                }

                // 2. Histórico
                const qHistorico = query(
                    collection(db, 'EMPRESAS', userData.empresaId, 'contas_pagar'),
                    where('fornecedorId', '==', conta.fornecedorId),
                    limit(20)
                );
                const histSnap = await getDocs(qHistorico);
                let historico = histSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContaPagar));

                // Ordenação Desc Vencimento
                historico.sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime());
                setViewHistorico(historico);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingView(false);
        }
    };

    const handleOpenDialog = async () => {
        setOpenDialog(true);
        if (!userData?.empresaId) return;

        if (listas.fornecedores.length === 0 || listas.centrosCusto.length === 0) {
            try {
                const empId = userData.empresaId;

                // Carregar Fornecedores
                // Vou tentar carregar de 'fornecedores'. Se falhar ou vazio, tento 'clientes' com tipo 'fornecedor'?
                // Vou assumir collection 'fornecedores' por enquanto.
                const fSnap = await getDocs(collection(db, 'EMPRESAS', empId, 'fornecedores'));
                const fData = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Carregar Centros de Custo (Permite Despesa)
                const ccSnap = await getDocs(query(
                    collection(db, 'EMPRESAS', empId, 'centros_custo'),
                    where('ativo', '==', true),
                    where('permiteDespesa', '==', true)
                ));
                const ccData = ccSnap.docs.map(d => ({ id: d.id, ...d.data() } as CentroCusto));

                // Carregar Plano de Contas (Tipo Despesa)
                const pcSnap = await getDocs(query(
                    collection(db, 'EMPRESAS', empId, 'plano_contas'),
                    where('tipo', '==', 'despesa'),
                    where('ativo', '==', true)
                ));
                const pcData = pcSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanoConta));

                setListas({ fornecedores: fData, centrosCusto: ccData, planoContas: pcData });
            } catch (err) {
                console.error("Erro ao carregar listas", err);
            }
        }
    };

    const handleSaveDespesa = async () => {
        if (!formDespesa.fornecedorId || !formDespesa.valor || !formDespesa.descricao) {
            alert('Atenção: Preencha Fornecedor, Valor e Descrição para continuar.');
            return;
        }
        setLoadingSave(true);
        try {
            const valorNumber = parseFloat(formDespesa.valor.replace(',', '.'));

            const fornecedor = listas.fornecedores.find(c => c.id === formDespesa.fornecedorId);
            if (!fornecedor) {
                throw new Error("Fornecedor não encontrado. Recarregue a página e tente novamente.");
            }
            const cc = listas.centrosCusto.find(c => c.id === formDespesa.centroCustoId);
            const pc = listas.planoContas.find(c => c.id === formDespesa.planoContaId);

            // Objeto de dados para envio
            const dadosEnvio: any = {
                fornecedorId: fornecedor.id,
                fornecedorNome: fornecedor.nome || fornecedor.razaoSocial,
                descricao: formDespesa.descricao,
                valorOriginal: valorNumber,
                valorAcrescimos: 0,
                valorDesconto: 0,
                dataVencimento: formDespesa.dataVencimento,
                formaPagamento: formDespesa.formaPagamento,
                centroCustoId: cc?.id || null,
                centroCustoNome: cc?.nome || '',
                planoContaId: pc?.id || null,
                planoContaNome: pc?.nome || '',
            };

            // Hook agora retorna o ID
            // @ts-ignore - Hook update pode não estar refletido por types, mas retorna string
            const novoId = await addContaPagar(dadosEnvio);

            // Atualização Otimista da UI
            const novaContaCompleta: ContaPagar = {
                id: novoId || 'temp-id',
                empresaId: userData?.empresaId || '',
                ...dadosEnvio,
                valorFinal: valorNumber,
                status: 'em_aberto',
                criadoEm: Timestamp.now(),
                atualizadoEm: Timestamp.now(),
                criadoPor: userData?.email || ''
            };

            setContasDoMes(prev => [...prev, novaContaCompleta]);

            // Se estiver filtrando pelo dia da nova conta, atualiza a lista visualizada
            if (selectedDate && format(selectedDate, 'yyyy-MM-dd') === formDespesa.dataVencimento) {
                setContas(prev => [...prev, novaContaCompleta]);
            } else if (!selectedDate) {
                // Se vendo mês todo, atualiza também
                setContas(prev => [...prev, novaContaCompleta]);
            }

            setOpenDialog(false);
            setFormDespesa({
                fornecedorId: '', fornecedorNome: '', descricao: '', valor: '',
                dataVencimento: format(new Date(), 'yyyy-MM-dd'), formaPagamento: 'boleto',
                centroCustoId: '', planoContaId: ''
            });

        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar despesa: ' + err.message);
        } finally {
            setLoadingSave(false);
        }
    };

    useEffect(() => {
        const loadMes = async () => {
            const mesStr = (anchorDate.getMonth() + 1).toString().padStart(2, '0');
            const anoStr = anchorDate.getFullYear().toString();
            const dados = await getContasPagar(mesStr, anoStr);
            setContasDoMes(dados);

            if (!selectedDate) {
                setContas(dados);
            }
        };
        loadMes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorDate.getMonth(), anchorDate.getFullYear()]);

    useEffect(() => {
        if (selectedDate) {
            const diaStr = format(selectedDate, 'yyyy-MM-dd');
            // Filtro local pois já temos os dados do mês
            const filtradas = contasDoMes.filter(c => c.dataVencimento === diaStr);
            setContas(filtradas);
        } else {
            setContas(contasDoMes);
        }
    }, [selectedDate, contasDoMes]);

    const handlePrev = () => setAnchorDate(subMonths(anchorDate, 1));
    const handleNext = () => setAnchorDate(addMonths(anchorDate, 1));
    const handleToday = () => setAnchorDate(new Date());

    return (
        <>
            {financeiroError && (
                <Alert severity="error" sx={{ mb: 2 }}>{financeiroError}</Alert>
            )}
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="900" color="error.main">
                        Contas a Pagar
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestão de Despesas e Obrigações
                    </Typography>
                </Box>
                <Button variant="contained" color="error" startIcon={<Add />} onClick={handleOpenDialog}>
                    Nova Despesa
                </Button>
            </Box>

            {/* --- LAYOUT SPLIT-VIEW (AUVO STYLE - DESPESAS) --- */}
            <Box display="flex" gap={2} sx={{ height: 'calc(100vh - 180px)', alignItems: 'stretch' }}>

                {/* ESQUERDA: CALENDÁRIO */}
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Header do Calendário */}
                    <Box
                        p={2}
                        bgcolor="rgba(211, 47, 47, 0.04)"
                        borderBottom="1px solid rgba(0,0,0,0.08)"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center" gap={2}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fff', border: '1px solid #ffcdd2', display: 'grid', placeItems: 'center' }}>
                                <MoneyOff color="error" fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="error.main" textTransform="capitalize" lineHeight={1.1}>
                                    {format(anchorDate, 'MMMM yyyy', { locale: ptBR })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {gridDays.length} dias visíveis
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5} sx={{ bgcolor: '#fff', borderRadius: 8, border: '1px solid #eee', p: 0.5 }}>
                            <IconButton size="small" onClick={handlePrev}><ChevronLeft fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={handleToday}><Today fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={handleNext}><ChevronRight fontSize="small" /></IconButton>
                        </Stack>
                    </Box>

                    {/* Labels da Semana */}
                    <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" sx={{ borderBottom: '1px solid #f0f0f0', bgcolor: '#fafafa' }}>
                        {weekDaysLabels.map(d => (
                            <Typography key={d} align="center" variant="caption" fontWeight="bold" color="text.secondary" sx={{ py: 1.5 }}>
                                {d.toUpperCase()}
                            </Typography>
                        ))}
                    </Box>

                    {/* Grade de Dias */}
                    <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gridAutoRows="1fr" sx={{ flex: 1, overflowY: 'auto', p: 1, gap: 1 }}>
                        {gridDays.map(day => (
                            <DayCell
                                key={day.toISOString()}
                                day={day}
                                anchorDate={anchorDate}
                                totais={dadosPorDia[format(day, 'yyyy-MM-dd')]}
                                onClick={() => handleDayClick(day)}
                                isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
                            />
                        ))}
                    </Box>
                </Paper>

                {/* DIREITA: DETALHES / TABELA */}
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, display: 'flex', flexDirection: 'column', bgcolor: '#fff', overflow: 'hidden' }}>

                    {/* Header Lateral */}
                    <Box p={2} borderBottom="1px solid #f0f0f0" bgcolor="#f8fafc">
                        <Typography variant="overline" color="text.secondary" fontWeight="700">DESPESAS DO PERÍODO</Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="800" color="error.main">
                                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Visão do Mês'}
                            </Typography>
                            <Box display="flex" gap={1}>
                                <Chip
                                    label={`${contas.length} itens`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{ borderRadius: 1, fontWeight: 600 }}
                                />
                                {selectedDate && (
                                    <Chip
                                        label="X"
                                        size="small"
                                        onDelete={() => setSelectedDate(null)}
                                        onClick={() => setSelectedDate(null)}
                                        sx={{ minWidth: 32 }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* Tabela Restaurada (Compacta) */}
                    <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }}>Venc.</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }}>Fornecedor / Descrição</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Valor</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Status</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">Nenhuma despesa para este período.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    contas.map((conta) => (
                                        <TableRow key={conta.id} hover>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                {format(new Date(conta.dataVencimento), 'dd/MM')}
                                            </TableCell>

                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="700" noWrap sx={{ maxWidth: 200 }} title={conta.fornecedorNome}>
                                                        {conta.fornecedorNome || 'Fornecedor não informado'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                                                        {conta.numero ? `#${conta.numero} - ` : ''}{conta.descricao}
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="700" color={conta.status === 'pago' ? 'success.main' : 'error.main'}>
                                                    {formatCurrency(conta.valorFinal)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip
                                                    label={conta.status === 'em_aberto' ? 'Aberto' : conta.status}
                                                    size="small"
                                                    sx={{
                                                        height: 20, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700,
                                                        bgcolor: conta.status === 'pago' ? '#dcfce7' : (conta.status === 'vencido' ? '#fee2e2' : '#fef9c3'),
                                                        color: conta.status === 'pago' ? '#166534' : (conta.status === 'vencido' ? '#991b1b' : '#854d0e')
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center">
                                                    {conta.status !== 'pago' && (
                                                        <IconButton size="small" onClick={() => handleOpenBaixa(conta)} sx={{ color: '#c62828', p: 0.5 }} title="Pagar">
                                                            <MoneyOff fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                    <IconButton size="small" onClick={() => handleOpenView(conta)} sx={{ color: '#3730a3', p: 0.5 }} title="Ver Detalhes">
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteClick(conta)} sx={{ color: '#991b1b', p: 0.5 }} title="Excluir">
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Footer Totais */}
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e0e0e0' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL A PAGAR</Typography>
                            <Typography variant="h6" fontWeight="800" color="error.main">
                                {formatCurrency(contas.reduce((acc, c) => acc + c.valorFinal, 0))}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            {/* DIALOG ADD DESPESA */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Nova Despesa (Conta a Pagar)</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                options={listas.fornecedores}
                                getOptionLabel={(option) => option.nome || option.razaoSocial || option.nomeFantasia || ''}
                                value={listas.fornecedores.find(c => c.id === formDespesa.fornecedorId) || null}
                                onChange={(_, newValue) => {
                                    if (newValue) setFormDespesa({ ...formDespesa, fornecedorId: newValue.id, fornecedorNome: newValue.nome });
                                    else setFormDespesa({ ...formDespesa, fornecedorId: '', fornecedorNome: '' });
                                }}
                                renderInput={(params) => <TextField {...params} label="Fornecedor *" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Valor (R$) *"
                                fullWidth
                                value={formDespesa.valor}
                                onChange={e => setFormDespesa({ ...formDespesa, valor: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Vencimento *"
                                type="date"
                                fullWidth
                                value={formDespesa.dataVencimento}
                                onChange={e => setFormDespesa({ ...formDespesa, dataVencimento: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Descrição da Despesa *"
                                fullWidth
                                value={formDespesa.descricao}
                                onChange={e => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Centro de Custo"
                                fullWidth
                                value={formDespesa.centroCustoId}
                                onChange={e => setFormDespesa({ ...formDespesa, centroCustoId: e.target.value })}
                                helperText="Onde foi gasto (Setor/Contrato)"
                            >
                                {listas.centrosCusto.map(cc => (
                                    <MenuItem key={cc.id} value={cc.id}>
                                        {cc.nome}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Natureza (Plano de Contas)"
                                fullWidth
                                value={formDespesa.planoContaId}
                                onChange={e => setFormDespesa({ ...formDespesa, planoContaId: e.target.value })}
                                helperText="O que é esse gasto? (Ex: Luz, Aluguel)"
                            >
                                {listas.planoContas.map(pc => (
                                    <MenuItem key={pc.id} value={pc.id}>
                                        {pc.codigo} - {pc.nome}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                label="Forma de Pagamento"
                                fullWidth
                                value={formDespesa.formaPagamento}
                                onChange={e => setFormDespesa({ ...formDespesa, formaPagamento: e.target.value })}
                            >
                                <MenuItem value="boleto">Boleto</MenuItem>
                                <MenuItem value="pix">PIX</MenuItem>
                                <MenuItem value="transferencia">Transferência</MenuItem>
                                <MenuItem value="cartao_credito">Cartão Crédito</MenuItem>
                                <MenuItem value="dinheiro">Dinheiro</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveDespesa} variant="contained" color="error" disabled={loadingSave}>
                        {loadingSave ? <CircularProgress size={24} /> : 'Salvar Despesa'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openBaixaDialog} onClose={() => setOpenBaixaDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Registrar Pagamento (Baixa)</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Data do Pagamento"
                            type="date"
                            fullWidth
                            value={formBaixa.dataPagamento}
                            onChange={e => setFormBaixa({ ...formBaixa, dataPagamento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Valor Pago (R$)"
                            fullWidth
                            value={formBaixa.valorPago}
                            onChange={e => setFormBaixa({ ...formBaixa, valorPago: e.target.value })}
                            type="number"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenBaixaDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveBaixa} variant="contained" color="success" disabled={loadingSave}>
                        Confirmar Pagamento
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={openConfirmDialog}
                onClose={() => setOpenConfirmDialog(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Despesa"
                message={
                    <span>
                        Tem certeza que deseja excluir a despesa <strong>{contaToDelete?.descricao}</strong>?
                    </span>
                }
            />
        </>
    );
};

export { ContasPagar };
