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
    Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { ContaPagar, ContaReceber } from '../../types/financeiro';
import {
    ChevronLeft,
    ChevronRight,
    Today,
    AccountBalance, // Icone principal
    ArrowUpward,
    ArrowDownward,
    Warning
} from '@mui/icons-material';
import {
    format,
    addMonths,
    subMonths,
    isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';


import { useFinanceiro } from '../../hooks/useFinanceiro';

// --- TIPO UNIFICADO ---
type Lancamento = (ContaReceber | ContaPagar) & { tipo: 'receita' | 'despesa' };

// --- HELPERS VISUAIS ---

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
    saldo,
    totais,
    onClick,
    isSelected
}: {
    day: Date,
    anchorDate: Date,
    saldo?: number,
    totais?: { receita: number, despesa: number, count: number },
    onClick?: () => void,
    isSelected?: boolean
}) => {
    const isToday = isSameDay(day, new Date());
    const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
    const hasValue = totais && totais.count > 0;

    // CORES PARA LANÇAMENTOS
    // Saldo Positivo: Verde
    // Saldo Negativo: Vermelho
    // Neutro: Cinza

    let valueColor = 'text.secondary';
    if (saldo !== undefined) {
        if (saldo > 0) valueColor = '#2e7d32'; // Verde
        else if (saldo < 0) valueColor = '#d32f2f'; // Vermelho
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                border: isSelected ? '2px solid #1976d2' : (isToday ? '2px solid rgba(25, 118, 210, 0.5)' : '1px solid rgba(0,0,0,0.12)'),
                bgcolor: isSelected ? 'rgba(25, 118, 210, 0.12)' : (isToday ? 'rgba(25, 118, 210, 0.04)' : '#fff'),
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
                {/* Aqui poderíamos mostrar indicadores, mas saldo já é informativo */}
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
                        {formatCurrency(saldo || 0)}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

// --- PÁGINA ---
const LancamentosContabeis: React.FC = () => {
    const { getContasPagar, getContasReceber, error: financeiroError } = useFinanceiro();
    // Não precisamos de delete/add aqui por enquanto, pois é uma visão consolidada.

    // Lista principal e filtros
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [lancamentosDoMes, setLancamentosDoMes] = useState<Lancamento[]>([]);

    // Cálculos para o Calendário (Saldo do dia)
    const dadosPorDia = useMemo(() => {
        const map: Record<string, { receita: number, despesa: number, saldo: number, count: number }> = {};

        lancamentosDoMes.forEach(lm => {
            const k = lm.dataVencimento; // YYYY-MM-DD
            if (!map[k]) map[k] = { receita: 0, despesa: 0, saldo: 0, count: 0 };

            // Considerar valorFinal
            const val = lm.valorFinal;

            if (lm.tipo === 'receita') {
                map[k].receita += val;
            } else {
                map[k].despesa += val;
            }
            map[k].count += 1;
        });

        // Calcular saldos
        Object.keys(map).forEach(k => {
            map[k].saldo = map[k].receita - map[k].despesa;
        });

        return map;
    }, [lancamentosDoMes, anchorDate]);

    const handleDayClick = (day: Date) => {
        // Lógica de ContasPagar (permitir clicar vazio)
        if (selectedDate && isSameDay(day, selectedDate)) {
            setSelectedDate(null);
        } else {
            setSelectedDate(day);
        }
    };

    const gridDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);

    useEffect(() => {
        const loadMes = async () => {
            const mesStr = (anchorDate.getMonth() + 1).toString().padStart(2, '0');
            const anoStr = anchorDate.getFullYear().toString();

            try {
                // Buscar ambas as pontas com segurança
                const [pagar, receber] = await Promise.all([
                    getContasPagar(mesStr, anoStr).catch(() => []) || [],
                    getContasReceber(mesStr, anoStr).catch(() => []) || []
                ]);

                // Unificar e normalizar
                const listaPagar = (pagar || []).map(p => ({ ...p, tipo: 'despesa' } as Lancamento));
                const listaReceber = (receber || []).map(r => ({ ...r, tipo: 'receita' } as Lancamento));

                const unificados = [...listaPagar, ...listaReceber];

                // Ordenar por Vencimento
                unificados.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

                setLancamentosDoMes(unificados);

                if (!selectedDate) {
                    setLancamentos(unificados);
                }
            } catch (err) {
                console.error("Erro ao carregar lançamentos", err);
                setLancamentosDoMes([]);
                setLancamentos([]);
            }
        };
        loadMes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorDate.getMonth(), anchorDate.getFullYear()]);

    useEffect(() => {
        if (selectedDate) {
            const diaStr = format(selectedDate, 'yyyy-MM-dd');
            const filtradas = lancamentosDoMes.filter(c => c.dataVencimento === diaStr);
            setLancamentos(filtradas);
        } else {
            setLancamentos(lancamentosDoMes);
        }
    }, [selectedDate, lancamentosDoMes]);

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
                    <Typography variant="h4" fontWeight="900" color="primary.main">
                        Lançamentos Contábeis
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Visão consolidada de Receitas e Despesas
                    </Typography>
                </Box>
            </Box>

            {/* --- LAYOUT SPLIT-VIEW (AUVO STYLE - MISTO) --- */}
            <Box display="flex" gap={2} sx={{ height: 'calc(100vh - 180px)', alignItems: 'stretch' }}>

                {/* ESQUERDA: CALENDÁRIO */}
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Header do Calendário */}
                    <Box
                        p={2}
                        bgcolor="rgba(25, 118, 210, 0.04)"
                        borderBottom="1px solid rgba(0,0,0,0.08)"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center" gap={2}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e0e0e0', display: 'grid', placeItems: 'center' }}>
                                <AccountBalance color="primary" fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="primary.main" textTransform="capitalize" lineHeight={1.1}>
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
                        {gridDays.map(day => {
                            const k = format(day, 'yyyy-MM-dd');
                            const dados = dadosPorDia[k];
                            return (
                                <DayCell
                                    key={day.toISOString()}
                                    day={day}
                                    anchorDate={anchorDate}
                                    saldo={dados ? dados.saldo : undefined}
                                    totais={dados}
                                    onClick={() => handleDayClick(day)}
                                    isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
                                />
                            );
                        })}
                    </Box>
                </Paper>

                {/* DIREITA: DETALHES / TABELA */}
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, display: 'flex', flexDirection: 'column', bgcolor: '#fff', overflow: 'hidden' }}>

                    {/* Header Lateral */}
                    <Box p={2} borderBottom="1px solid #f0f0f0" bgcolor="#f8fafc">
                        <Typography variant="overline" color="text.secondary" fontWeight="700">Fluxo Diário</Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="800" color="text.primary">
                                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Visão do Mês'}
                            </Typography>
                            <Box display="flex" gap={1}>
                                <Chip
                                    label={`${lancamentos.length} ops`}
                                    size="small"
                                    color="default"
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
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} width={40}>T</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }}>Data</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }}>Descrição</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Valor</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', fontSize: '0.75rem' }} align="center">St</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lancamentos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">Nenhum movimento registrado.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    lancamentos.map((l) => (
                                        <TableRow key={l.id} hover>
                                            <TableCell sx={{ py: 0.5, px: 1 }}>
                                                {l.tipo === 'receita' ? (
                                                    <ArrowUpward sx={{ fontSize: 16, color: '#2e7d32' }} />
                                                ) : (
                                                    <ArrowDownward sx={{ fontSize: 16, color: '#d32f2f' }} />
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                {format(new Date(l.dataVencimento), 'dd/MM')}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: 220 }} title={l.descricao}>
                                                    {l.descricao}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {/* @ts-ignore */}
                                                    {l.tipo === 'receita' ? l.clienteNome : l.fornecedorNome} | {l.planoContaNome}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="700" color={l.tipo === 'receita' ? '#1b5e20' : '#b71c1c'}>
                                                    {formatCurrency(l.valorFinal)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box
                                                    sx={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        bgcolor: l.status === 'pago' ? '#2e7d32' : (l.status === 'vencido' ? '#d32f2f' : '#fbbf24'),
                                                        mx: 'auto'
                                                    }}
                                                    title={l.status}
                                                />
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
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">SALDO SELECIONADO</Typography>
                            <Typography variant="h6" fontWeight="800" color={lancamentos.reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valorFinal : -l.valorFinal), 0) >= 0 ? 'success.main' : 'error.main'}>
                                {formatCurrency(lancamentos.reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valorFinal : -l.valorFinal), 0))}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </>
    );
};

export { LancamentosContabeis };
