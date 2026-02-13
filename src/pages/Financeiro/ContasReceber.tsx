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
    updateDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { customColors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { CentroCusto, PlanoConta, ContaReceber } from '../../types/financeiro';
import {
    ChevronLeft,
    ChevronRight,
    Today,
    AttachMoney,
    Warning,
    Add,
    Edit,
    Delete,
    Visibility,
    Person,
    Business,
    Description,
    ContactMail,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import {
    format,
    addMonths,
    subMonths,
    addDays,
    isSameDay,
    isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';


import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useFinanceiro } from '../../hooks/useFinanceiro';

// --- HELPERS ---
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
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

const weekDaysLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const formatCurrency = (val?: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- CÉLULA DO DIA ---
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
    const isCurrentMonth = isSameMonth(day, anchorDate);
    const hasValue = totais && totais.total > 0;

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                border: isSelected ? '2px solid #1976d2' : (isToday ? '2px solid rgba(25,118,210,0.5)' : '1px solid rgba(0,0,0,0.12)'),
                bgcolor: isSelected ? 'rgba(25,118,210,0.12)' : (isToday ? 'rgba(25,118,210,0.04)' : '#fff'),
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
                    borderColor: '#1976d2'
                }
            }}
            onClick={onClick}
        >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography sx={{ fontWeight: 900, color: isToday ? '#1976d2' : 'text.secondary', fontSize: 11 }}>
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
                            color: totais!.vencido > 0 ? '#d32f2f' : '#2e7d32',
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
const ContasReceber: React.FC = () => {
    const { getContasReceber, deleteContaReceber, baixarConta, addContaReceber, error: financeiroError } = useFinanceiro();
    const { userData } = useAuth();
    const [contas, setContas] = useState<ContaReceber[]>([]);
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // --- BAIXA MANUAL STATE ---
    const [openBaixaDialog, setOpenBaixaDialog] = useState(false);
    const [formBaixa, setFormBaixa] = useState({
        contaId: '',
        dataPagamento: format(new Date(), 'yyyy-MM-dd'),
        valorPago: ''
    });

    const handleOpenBaixa = (conta: ContaReceber) => {
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
            await baixarConta(formBaixa.contaId, {
                status: 'pago',
                valorPago: valor,
                dataPagamento: formBaixa.dataPagamento
            });

            // Sincronizar com Boleto (se houver)
            const contaAtual = contas.find(c => c.id === formBaixa.contaId);
            if (contaAtual && contaAtual.boletoId && userData?.empresaId) {
                try {
                    const boletoRef = doc(db, 'EMPRESAS', userData.empresaId, 'boletos', contaAtual.boletoId);
                    await updateDoc(boletoRef, {
                        status: 'pago',
                        atualizadoEm: Timestamp.now()
                    });
                    console.log('Boleto vinculado atualizado para PAGO:', contaAtual.boletoId);
                } catch (boletoErr) {
                    console.error('Erro ao atualizar status do boleto vinculado:', boletoErr);
                }
            }
            setOpenBaixaDialog(false);

            // Atualiza lista localmente para refletir mudança imediata
            setContas(prev => prev.map(c => c.id === formBaixa.contaId ? { ...c, status: 'pago', valorPago: valor, dataPagamento: formBaixa.dataPagamento } : c));
            setContasDoMes(prev => prev.map(c => c.id === formBaixa.contaId ? { ...c, status: 'pago', valorPago: valor, dataPagamento: formBaixa.dataPagamento } : c));

        } catch (err) {
            console.error(err);
            alert('Erro ao baixar conta: ' + err);
        } finally {
            setLoadingSave(false);
        }
    };

    // --- EXCLUSÃO (Updated to use ConfirmDialog) ---
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [contaToDelete, setContaToDelete] = useState<ContaReceber | null>(null);

    const handleDeleteClick = (conta: ContaReceber) => {
        setContaToDelete(conta);
        setOpenConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!contaToDelete) return;
        try {
            await deleteContaReceber(contaToDelete.id);
            setContas(prev => prev.filter(c => c.id !== contaToDelete.id));
            setContasDoMes(prev => prev.filter(c => c.id !== contaToDelete.id));
            setOpenConfirmDialog(false);
            setContaToDelete(null);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao excluir: ' + err);
        }
    };

    // --- NOVA RECEITA STATE ---
    const [openDialog, setOpenDialog] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [listas, setListas] = useState<{
        clientes: any[],
        centrosCusto: CentroCusto[],
        planoContas: PlanoConta[]
    }>({ clientes: [], centrosCusto: [], planoContas: [] });

    const [formReceita, setFormReceita] = useState({
        clienteId: '',
        clienteNome: '',
        descricao: '',
        valor: '',
        dataVencimento: format(new Date(), 'yyyy-MM-dd'),
        formaPagamento: 'boleto',
        centroCustoId: '',
        planoContaId: ''
    });

    // --- ESTADOS VISUALIZAÇÃO DETALHADA ---
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [viewConta, setViewConta] = useState<ContaReceber | null>(null);
    const [viewClienteFull, setViewClienteFull] = useState<any>(null);
    const [viewAdministradora, setViewAdministradora] = useState<any>(null);
    const [viewAdministradoraContato, setViewAdministradoraContato] = useState<any>(null);
    const [viewHistoricoBoletos, setViewHistoricoBoletos] = useState<ContaReceber[]>([]);
    const [tabViewValue, setTabViewValue] = useState(0);
    const [loadingView, setLoadingView] = useState(false);

    const handleOpenView = async (conta: ContaReceber) => {
        setViewConta(conta);
        setTabViewValue(0);
        setOpenViewDialog(true);
        setLoadingView(true);
        setViewClienteFull(null);
        setViewHistoricoBoletos([]);

        try {
            if (conta.clienteId && userData?.empresaId) {
                // 1. Dados do Cliente
                const cliRef = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', conta.clienteId);
                const cliSnap = await getDoc(cliRef);
                let clienteData: any = {};

                if (cliSnap.exists()) {
                    const d = cliSnap.data();
                    clienteData = {
                        ...d,
                        // Mapeamento de campos do Cliente (SisGu) para a View
                        nomeContato: d.nomeContato || d.contatoAtual || '',
                        cargoContato: d.cargoContato || d.contatoFuncao || '',
                        email: d.email || d.contatoEmail1 || ''
                    };

                    // BUSCAR DADOS DA ADMINISTRADORA (SE HOUVER ID)
                    if (d.administradoraId) {
                        try {
                            const admRef = doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', d.administradoraId);
                            const admSnap = await getDoc(admRef);
                            if (admSnap.exists()) {
                                setViewAdministradora(admSnap.data());
                            } else {
                                setViewAdministradora(null);
                            }
                        } catch (e) {
                            console.log("Erro ao buscar administradora", e);
                            setViewAdministradora(null);
                        }

                        // BUSCAR CONTATO DA ADMINISTRADORA (SE HOUVER)
                        if (d.contatoAdministradoraId) {
                            try {
                                const contatoRef = doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', d.administradoraId, 'contatos', d.contatoAdministradoraId);
                                const contatoSnap = await getDoc(contatoRef);
                                if (contatoSnap.exists()) {
                                    setViewAdministradoraContato(contatoSnap.data());
                                } else {
                                    setViewAdministradoraContato(null);
                                }
                            } catch (e) {
                                console.log("Erro ao buscar contato da administradora", e);
                                setViewAdministradoraContato(null);
                            }
                        } else {
                            setViewAdministradoraContato(null);
                        }

                    } else {
                        setViewAdministradora(null);
                        setViewAdministradoraContato(null);
                    }
                }

                // 2. Dados de Contato Específicos da Venda/Orçamento (Sobrescrevem o cadastro geral se existirem na venda)
                if (conta.vendaId) {
                    try {
                        const vendaSnap = await getDoc(doc(db, 'EMPRESAS', userData.empresaId, 'vendas', conta.vendaId));
                        if (vendaSnap.exists()) {
                            const vendaData = vendaSnap.data();
                            clienteData = {
                                ...clienteData,
                                nomeContato: vendaData.contatoNome || vendaData.nomeContato || clienteData.nomeContato,
                                email: vendaData.contatoEmail || vendaData.email || clienteData.email,
                                telefone: vendaData.contatoTelefone || vendaData.telefone || clienteData.telefone,
                                cargoContato: vendaData.contatoCargo || vendaData.cargo || clienteData.cargoContato
                            };
                        }
                    } catch (e) { console.log('Erro ao buscar venda vinculada', e); }
                } else if (conta.orcamentoId) {
                    try {
                        // Tenta buscar em orcamentos ou orcamentos_equipamentos (já que temos duas coleções)
                        let orcSnap = await getDoc(doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', conta.orcamentoId));
                        if (!orcSnap.exists()) {
                            orcSnap = await getDoc(doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos_equipamentos', conta.orcamentoId));
                        }

                        if (orcSnap.exists()) {
                            const orcData = orcSnap.data();
                            clienteData = {
                                ...clienteData,
                                nomeContato: orcData.contatoNome || orcData.nomeContato || clienteData.nomeContato,
                                email: orcData.contatoEmail || orcData.email || clienteData.email,
                                telefone: orcData.contatoTelefone || orcData.telefone || clienteData.telefone,
                                cargoContato: orcData.contatoCargo || orcData.cargo || clienteData.cargoContato
                            };
                        }
                    } catch (e) { console.log('Erro ao buscar orçamento vinculado', e); }
                }

                setViewClienteFull(clienteData);

                // 2. Histórico de Boletos do Cliente
                // 2. Histórico de Boletos do Cliente
                // Buscamos sem ordenação no banco para evitar necessidade de índices compostos complexos agora
                const qHistorico = query(
                    collection(db, 'EMPRESAS', userData.empresaId, 'contas_receber'),
                    where('clienteId', '==', conta.clienteId),
                    limit(50)
                );
                const histSnap = await getDocs(qHistorico);
                let historico = histSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContaReceber));

                // Garante valorFinal para exibição correta (sem filtrar nada, conforme solicitado)
                historico = historico.map(h => ({
                    ...h,
                    valorFinal: h.valorFinal || h.valorOriginal || 0
                }));

                // Se a lista vier vazia (pode acontecer delay de indexação em criações recentes), 
                // garantimos pelo menos o boleto atual na lista
                const atualJaExiste = historico.find(h => h.id === conta.id);
                if (!atualJaExiste) {
                    // Garante que o atual também tenha valorFinal antes de empurrar
                    const contaComValor = {
                        ...conta,
                        valorFinal: conta.valorFinal || conta.valorOriginal || 0
                    };
                    historico.push(contaComValor);
                }

                // Ordenação em Memória (Crescente por Vencimento - Pedido do usuário)
                historico.sort((a, b) => {
                    const dateA = new Date(a.dataVencimento).getTime();
                    const dateB = new Date(b.dataVencimento).getTime();
                    return dateA - dateB;
                });

                setViewHistoricoBoletos(historico.slice(0, 15));
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

        if (listas.clientes.length === 0 || listas.centrosCusto.length === 0) {
            try {
                const empId = userData.empresaId;

                const cliSnap = await getDocs(collection(db, 'EMPRESAS', empId, 'clientes'));
                const cliData = cliSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const ccSnap = await getDocs(query(
                    collection(db, 'EMPRESAS', empId, 'centros_custo'),
                    where('ativo', '==', true),
                    where('permiteReceita', '==', true)
                ));
                const ccData = ccSnap.docs.map(d => ({ id: d.id, ...d.data() } as CentroCusto));

                const pcSnap = await getDocs(query(
                    collection(db, 'EMPRESAS', empId, 'plano_contas'),
                    where('tipo', '==', 'receita'),
                    where('ativo', '==', true)
                ));
                const pcData = pcSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanoConta));

                setListas({ clientes: cliData, centrosCusto: ccData, planoContas: pcData });
            } catch (err) {
                console.error("Erro ao carregar listas", err);
            }
        }
    };

    const handleSaveReceita = async () => {
        if (!formReceita.clienteId || !formReceita.valor || !formReceita.descricao) {
            alert('Por favor preencha campos obrigatórios: Cliente, Valor e Descrição');
            return;
        }
        setLoadingSave(true);
        try {
            const valorNumber = parseFloat(formReceita.valor.replace(',', '.'));

            const cliente = listas.clientes.find(c => c.id === formReceita.clienteId);
            const cc = listas.centrosCusto.find(c => c.id === formReceita.centroCustoId);
            const pc = listas.planoContas.find(c => c.id === formReceita.planoContaId);

            if (!cliente) throw new Error("Cliente não encontrado");

            const dadosEnvio = {
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                clientePrefixo: cliente.prefixoNome || '',

                descricao: formReceita.descricao,
                valorOriginal: valorNumber,
                valorAcrescimos: 0,
                valorDesconto: 0,
                // valorFinal calculado no hook

                dataVencimento: formReceita.dataVencimento,
                dataEmissao: format(new Date(), 'yyyy-MM-dd'),

                formaPagamento: formReceita.formaPagamento,
                // status calculado no hook

                centroCustoId: cc?.id || null,
                centroCustoNome: cc?.nome || '',
                planoContaId: pc?.id || null,
                planoContaNome: pc?.nome || '',
            };

            // Chama hook
            const novoId = await addContaReceber(dadosEnvio as any);

            // Atualização Otimista
            const novaContaCompleta: ContaReceber = {
                id: novoId || 'temp-id-' + Date.now(),
                empresaId: userData?.empresaId || '',
                ...dadosEnvio,
                valorFinal: valorNumber, // Assumindo sem descontos/acréscimos iniciais na UI
                status: 'em_aberto',
                criadoEm: new Date().toISOString(), // ou Timestamp, frontend costuma tratar
                atualizadoEm: new Date().toISOString(),
                // Campos opcionais
                criadoPor: userData?.email,
                criadoIn: Timestamp.now() // Compatibilidade legado se ainda usado
            } as any;

            setOpenDialog(false);
            setFormReceita({
                clienteId: '', clienteNome: '', descricao: '', valor: '',
                dataVencimento: format(new Date(), 'yyyy-MM-dd'), formaPagamento: 'boleto',
                centroCustoId: '', planoContaId: ''
            });

            // Força refresh visual se estiver no mesmo mês
            const dateVenc = new Date(formReceita.dataVencimento);
            // Corrige fuso horário para comparação de mês simples
            // Melhor usar a string YYYY-MM
            const mesVenc = dateVenc.getMonth();
            const anoVenc = dateVenc.getFullYear();

            if (mesVenc === anchorDate.getMonth() && anoVenc === anchorDate.getFullYear()) {
                setContasDoMes(prev => [...prev, novaContaCompleta]);

                // Se estiver vendo hoje ou 'todos' (selectedDate null)
                if (!selectedDate) {
                    setContas(prev => [...prev, novaContaCompleta]);
                } else if (isSameDay(dateVenc, selectedDate)) {
                    setContas(prev => [...prev, novaContaCompleta]);
                }
            } else {
                // Se salvou em outro mês, apenas avisa ou muda a data? 
                // Por padrão, deixamos o usuário navegar lá.
                // Mas podemos forçar um reload sutil se quiser.
                // setSelectedDate(prev => prev); 
            }

        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar receita: ' + err.message);
        } finally {
            setLoadingSave(false);
        }
    };

    const handleClienteChange = (event: any, newValue: any) => {
        if (newValue) {
            setFormReceita(prev => ({
                ...prev,
                clienteId: newValue.id,
                clienteNome: newValue.nome,
                centroCustoId: newValue.centroCustoId || prev.centroCustoId
            }));
        } else {
            setFormReceita(prev => ({ ...prev, clienteId: '', clienteNome: '' }));
        }
    };

    const [contasDoMes, setContasDoMes] = useState<ContaReceber[]>([]);

    useEffect(() => {
        const loadMes = async () => {
            const mesStr = (anchorDate.getMonth() + 1).toString().padStart(2, '0');
            const anoStr = anchorDate.getFullYear().toString();
            try {
                const dados = await getContasReceber(mesStr, anoStr) || [];
                setContasDoMes(dados);

                if (!selectedDate) {
                    setContas(dados);
                }
            } catch (err) {
                console.error("Erro ao carregar contas", err);
                setContasDoMes([]);
                setContas([]);
            }
        };
        loadMes();
    }, [anchorDate.getMonth(), anchorDate.getFullYear()]);

    useEffect(() => {
        if (selectedDate) {
            const diaStr = format(selectedDate, 'yyyy-MM-dd');
            // Filtro local pois já temos os dados do mês (igual ContasPagar)
            const filtradas = contasDoMes.filter(c => c.dataVencimento === diaStr);
            setContas(filtradas);
        } else {
            setContas(contasDoMes);
        }
    }, [selectedDate, contasDoMes]);

    const dadosPorDia = useMemo(() => {
        const map: Record<string, { total: number, count: number, vencido: number, pago: number }> = {};
        contasDoMes.forEach(c => {
            const k = c.dataVencimento;
            if (!map[k]) map[k] = { total: 0, count: 0, vencido: 0, pago: 0 };
            const val = c.status === 'pago' ? (c.valorPago || c.valorFinal) : c.valorFinal;
            map[k].total += val;
            map[k].count += 1;
            if (c.status === 'vencido') map[k].vencido += val;
            if (c.status === 'pago') map[k].pago += val;
        });
        return map;
    }, [contasDoMes, anchorDate]);

    const handleDayClick = (day: Date) => {
        if (selectedDate && isSameDay(day, selectedDate)) {
            setSelectedDate(null);
        } else {
            setSelectedDate(day);
        }
    };

    const handlePrev = () => setAnchorDate(subMonths(anchorDate, 1));
    const handleNext = () => setAnchorDate(addMonths(anchorDate, 1));
    const handleToday = () => setAnchorDate(new Date());

    const gridDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);


    return (
        <>
            {financeiroError && (
                <Alert severity="error" sx={{ mb: 2 }}>{financeiroError}</Alert>
            )}
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="900" color="primary.main">
                        Contas a Receber
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Visão Geral de Recebimentos
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
                    Nova Receita
                </Button>
            </Box>

            {/* --- LAYOUT SPLIT-VIEW (AUVO STYLE) --- */}
            <Box display="flex" gap={2} sx={{ height: 'calc(100vh - 180px)', alignItems: 'stretch' }}>

                {/* ESQUERDA: CALENDÁRIO */}
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Header do Calendário */}
                    <Box
                        p={2}
                        bgcolor={customColors.tableHeader}
                        borderBottom="1px solid rgba(0,0,0,0.08)"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center" gap={2}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e0e0e0', display: 'grid', placeItems: 'center' }}>
                                <AttachMoney color="primary" fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="text.primary" textTransform="capitalize" lineHeight={1.1}>
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
                    <Box p={2} borderBottom="1px solid #f0f0f0" bgcolor={customColors.tableHeader}>
                        <Typography variant="overline" color="text.secondary" fontWeight="700">DETALHAMENTO</Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="800" color="primary.main">
                                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Visão do Mês'}
                            </Typography>
                            <Box display="flex" gap={1}>
                                <Chip
                                    label={`${contas.length} itens`}
                                    size="small"
                                    color="primary"
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

                    {/* Tabela Restaurada */}
                    <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: customColors.tableHeader }}>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Venc.</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Cliente / Descrição</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Valor</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">Nenhum lançamento.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    contas.map((conta) => (
                                        <TableRow key={conta.id} hover>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                {format(new Date(conta.dataVencimento + 'T12:00:00'), 'dd/MM')}
                                            </TableCell>

                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="700" noWrap sx={{ maxWidth: 200 }} title={conta.clienteNome}>
                                                        {conta.clientePrefixo ? `${conta.clientePrefixo} ` : ''}{conta.clienteNome || 'Cliente não informado'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                                                        {conta.numero ? `#${conta.numero} - ` : ''}{conta.descricao}
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="700" color={conta.status === 'pago' ? 'success.main' : 'text.primary'}>
                                                    {formatCurrency(conta.valorFinal)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip
                                                    label={conta.status === 'em_aberto' ? 'Aberto' : conta.status}
                                                    size="small"
                                                    sx={{
                                                        height: 20, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700,
                                                        bgcolor: conta.status === 'pago' ? '#dcfce7' : (conta.status === 'vencido' ? '#fee2e2' : '#f1f5f9'),
                                                        color: conta.status === 'pago' ? '#166534' : (conta.status === 'vencido' ? '#991b1b' : '#64748b')
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Stack direction="row" justifyContent="center">
                                                    {conta.status !== 'pago' && (
                                                        <IconButton size="small" onClick={() => handleOpenBaixa(conta)} sx={{ color: '#166534', p: 0.5 }} title="Receber">
                                                            <CheckCircle fontSize="small" />
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
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL DO PERÍODO</Typography>
                            <Typography variant="h6" fontWeight="800" color="primary.main">
                                {formatCurrency(contas.reduce((acc, c) => acc + c.valorFinal, 0))}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Nova Conta a Receber</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                options={listas.clientes}
                                getOptionLabel={(option) => option.prefixoNome ? `${option.prefixoNome} ${option.nome}` : (option.nome || '')}
                                value={listas.clientes.find(c => c.id === formReceita.clienteId) || null}
                                onChange={handleClienteChange}
                                renderInput={(params) => <TextField {...params} label="Cliente *" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Valor *"
                                fullWidth
                                value={formReceita.valor}
                                onChange={e => setFormReceita({ ...formReceita, valor: e.target.value })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Vencimento *"
                                type="date"
                                fullWidth
                                value={formReceita.dataVencimento}
                                onChange={e => setFormReceita({ ...formReceita, dataVencimento: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid size={12}>
                            <TextField
                                label="Descrição do Lançamento *"
                                fullWidth
                                value={formReceita.descricao}
                                onChange={e => setFormReceita({ ...formReceita, descricao: e.target.value })}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Centro de Custo"
                                fullWidth
                                value={formReceita.centroCustoId}
                                onChange={e => setFormReceita({ ...formReceita, centroCustoId: e.target.value })}
                                helperText="Onde o dinheiro entrou (Projeto/Setor)"
                            >
                                {listas.centrosCusto.map(cc => (
                                    <MenuItem key={cc.id} value={cc.id}>
                                        {cc.nome} <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>({cc.grupoNome || 'Sem Grupo'})</Typography>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Plano de Contas (Natureza)"
                                fullWidth
                                value={formReceita.planoContaId}
                                onChange={e => setFormReceita({ ...formReceita, planoContaId: e.target.value })}
                                helperText="O que gerou essa receita?"
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
                                value={formReceita.formaPagamento}
                                onChange={e => setFormReceita({ ...formReceita, formaPagamento: e.target.value })}
                            >
                                <MenuItem value="boleto">Boleto</MenuItem>
                                <MenuItem value="pix">PIX</MenuItem>
                                <MenuItem value="transferencia">Transferência</MenuItem>
                                <MenuItem value="cartao_credito">Cartão Crédito</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveReceita} variant="contained" disabled={loadingSave}>
                        {loadingSave ? <CircularProgress size={24} /> : 'Salvar Receita'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG VISUALIZAÇÃO DETALHADA */}
            <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Description color="primary" />
                        Detalhes do Lançamento
                    </Box>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabViewValue} onChange={(e, v) => setTabViewValue(v)} centered>
                            <Tab label="Dados da Conta" icon={<AttachMoney />} iconPosition="start" />
                            <Tab label="Dados do Cliente" icon={<Person />} iconPosition="start" />
                            <Tab label="ADMINISTRADORA" icon={<ContactMail />} iconPosition="start" />
                        </Tabs>
                    </Box>

                    {loadingView ? (
                        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
                    ) : (
                        <>
                            {/* TAB 0: CONTA */}
                            <Box role="tabpanel" hidden={tabViewValue !== 0} sx={{ p: 3 }}>
                                {viewConta && (
                                    <Grid container spacing={2}>
                                        <Grid size={12}>
                                            <Divider />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Descrição</Typography>
                                            <Typography variant="body1">{viewConta.descricao}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Valor Final</Typography>
                                            <Typography variant="h6" color="primary">{formatCurrency(viewConta.valorFinal)}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Data Vencimento</Typography>
                                            <Typography variant="body1">
                                                {viewConta.dataVencimento ? format(new Date(viewConta.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Data Emissão</Typography>
                                            <Typography variant="body1">
                                                {viewConta.dataEmissao ? format(new Date(viewConta.dataEmissao + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Centro de Custo</Typography>
                                            <Typography variant="body1">
                                                {(() => {
                                                    const ccName = viewConta.centroCustoNome || viewConta.centroCustoId || '-';
                                                    // Tenta usar o prefixo salvo na conta ou o do cadastro atual do cliente (fallback para antigos)
                                                    const prefixo = viewConta.clientePrefixo || viewClienteFull?.prefixoNome || '';

                                                    if (prefixo && !ccName.startsWith(prefixo)) {
                                                        return `${prefixo} ${ccName}`;
                                                    }
                                                    return ccName;
                                                })()}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Plano de Contas</Typography>
                                            <Typography variant="body1">
                                                {viewConta.planoContaNome || (viewConta as any).planoContasNome || viewConta.planoContaId || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid size={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                                Histórico Financeiro (Últimos Lançamentos)
                                            </Typography>

                                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: customColors.tableHeader }}>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Boleto</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Vlr. Previsto</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Data Pagto</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Vlr. Pago</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {viewHistoricoBoletos.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={6} align="center">Nenhum histórico encontrado.</TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            viewHistoricoBoletos.map((hist) => (
                                                                <TableRow key={hist.id} hover selected={hist.id === viewConta.id}>
                                                                    <TableCell sx={{ fontSize: '0.75rem' }}>{hist.numero || '-'}</TableCell>
                                                                    <TableCell sx={{ fontSize: '0.75rem' }}>
                                                                        {hist.dataVencimento ? format(new Date(hist.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontSize: '0.75rem' }}>{formatCurrency(hist.valorFinal)}</TableCell>
                                                                    <TableCell sx={{ fontSize: '0.75rem' }}>
                                                                        {hist.dataPagamento ? format(new Date(hist.dataPagamento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: hist.valorPago ? 'bold' : 'normal', color: hist.valorPago ? 'green' : 'inherit' }}>
                                                                        {hist.valorPago ? formatCurrency(hist.valorPago) : '-'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={hist.status === 'em_aberto' ? 'Aberto' : hist.status}
                                                                            size="small"
                                                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                                                            color={(hist.status === 'pago' || hist.status === 'em_aberto') ? 'success' : (hist.status === 'vencido' || hist.status === 'em_atraso') ? 'error' : 'default'}
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Grid>
                                    </Grid>
                                )}
                            </Box>

                            {/* TAB 1: CLIENTE */}
                            <Box role="tabpanel" hidden={tabViewValue !== 1} sx={{ p: 3 }}>
                                {viewClienteFull ? (
                                    <Grid container spacing={2}>
                                        <Grid size={12}>
                                            <Typography variant="caption" color="text.secondary">Nome / Razão Social - CNPJ</Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {viewClienteFull.prefixoNome ? `${viewClienteFull.prefixoNome} ` : ''}
                                                {viewClienteFull.nomeFantasia || viewClienteFull.razaoSocial || viewClienteFull.nome || '-'}
                                                {' - '}
                                                {viewClienteFull.cnpjCpf || viewClienteFull.cpfCnpj || '-'}
                                            </Typography>
                                        </Grid>

                                        <Grid size={12}>
                                            <Typography variant="caption" color="text.secondary">Endereço Completo</Typography>
                                            <Typography variant="body1">
                                                {viewClienteFull.endereco}, {viewClienteFull.numero} {viewClienteFull.complemento} - {viewClienteFull.bairro}, {viewClienteFull.cidade}/{viewClienteFull.uf} - CEP: {viewClienteFull.cep}
                                            </Typography>
                                        </Grid>

                                        <Grid size={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="subtitle2" color="primary">Dados de Contato</Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Nome do Contato</Typography>
                                            <Typography variant="body1">{viewClienteFull.nomeContato || '-'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Função/Cargo</Typography>
                                            <Typography variant="body1">{viewClienteFull.cargoContato || '-'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Email</Typography>
                                            <Typography variant="body1">{viewClienteFull.email || '-'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Telefone</Typography>
                                            <Typography variant="body1">{viewClienteFull.telefone || '-'}</Typography>
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Typography color="text.secondary" align="center">Dados do cliente não carregados ou não encontrados.</Typography>
                                )}
                            </Box>

                            {/* TAB 2: ADMINISTRADORA */}
                            <Box role="tabpanel" hidden={tabViewValue !== 2} sx={{ p: 3 }}>
                                {viewAdministradora ? (
                                    <Grid container spacing={2}>
                                        <Grid size={12}>
                                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                                <Typography variant="h6" color="primary">{viewAdministradora.nome}</Typography>
                                                {viewAdministradora.cnpj && <Typography variant="caption" color="text.secondary">CNPJ: {viewAdministradora.cnpj}</Typography>}
                                            </Box>
                                            <Divider />
                                        </Grid>

                                        <Grid size={12}>
                                            <Typography variant="caption" color="text.secondary">Endereço</Typography>
                                            <Typography variant="body1">
                                                {viewAdministradora.endereco}, {viewAdministradora.numero} {viewAdministradora.complemento} - {viewAdministradora.bairro}, {viewAdministradora.cidade}/{viewAdministradora.uf} - CEP: {viewAdministradora.cep}
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Telefone / Celular</Typography>
                                            <Typography variant="body1">
                                                {viewAdministradora.telefone || '-'} {viewAdministradora.celular ? `/ ${viewAdministradora.celular}` : ''}
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Email</Typography>
                                            <Typography variant="body1">{viewAdministradora.email || '-'}</Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Site</Typography>
                                            <Typography variant="body1">{viewAdministradora.site || '-'}</Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Site</Typography>
                                            <Typography variant="body1">{viewAdministradora.site || '-'}</Typography>
                                        </Grid>

                                        {viewAdministradoraContato && (
                                            <Grid size={12}>
                                                <Box mt={2} mb={1}>
                                                    <Divider />
                                                </Box>
                                                <Typography variant="subtitle2" color="primary" gutterBottom>Contato na Administradora</Typography>
                                                <Grid container spacing={2}>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">Nome do Contato</Typography>
                                                        <Typography variant="body1" fontWeight="bold">{viewAdministradoraContato.nome || '-'}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">Cargo/Função</Typography>
                                                        <Typography variant="body1">{viewAdministradoraContato.cargo || '-'}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">Email</Typography>
                                                        <Typography variant="body1">{viewAdministradoraContato.email || '-'}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <Typography variant="caption" color="text.secondary">Telefone / Ramal</Typography>
                                                        <Typography variant="body1">
                                                            {viewAdministradoraContato.telefone || '-'}
                                                            {viewAdministradoraContato.ramal ? ` (Ramal: ${viewAdministradoraContato.ramal})` : ''}
                                                            {viewAdministradoraContato.celular ? ` / ${viewAdministradoraContato.celular}` : ''}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        )}
                                    </Grid>
                                ) : (
                                    <Box textAlign="center" py={4}>
                                        <Typography color="text.secondary" gutterBottom>
                                            Nenhuma administradora vinculada ou dados não encontrados.
                                        </Typography>
                                        {viewClienteFull?.administradora && (
                                            <Typography variant="body2" fontWeight="bold">
                                                Nome vinculado: {viewClienteFull.administradora}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenViewDialog(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openBaixaDialog} onClose={() => setOpenBaixaDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Registrar Recebimento</DialogTitle>
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
                            label="Valor Recebido (R$)"
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
                        {loadingSave ? <CircularProgress size={24} /> : 'Confirmar Recebimento'}
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={openConfirmDialog}
                onClose={() => setOpenConfirmDialog(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Receita"
                message={
                    <span>
                        Tem certeza que deseja excluir o lançamento <strong>{contaToDelete?.descricao}</strong>?
                    </span>
                }
            />
        </>
    );
};

export { ContasReceber };
