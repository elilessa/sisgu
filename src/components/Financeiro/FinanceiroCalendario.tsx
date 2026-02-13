import React, { useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    useMediaQuery,
    Tabs,
    Tab
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    Today,
    Warning,
    AttachMoney
} from '@mui/icons-material';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameMonth,
    isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContaReceber, ContaPagar } from '../../types/financeiro';

/* === HELPERS DE DATA IGUAIS AO AGENDA === */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 domingo
    const diff = day === 0 ? -6 : 1 - day; // segunda
    d.setDate(d.getDate() + diff);
    return startOfDay(d);
};

const getMonthGridDays = (date: Date) => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const start = getMonday(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

const weekDaysLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Formata valor compactado (1.5k)
const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return Math.round(value).toString();
};


interface FinanceiroCalendarioProps {
    dataSelecionada: Date;
    onChange: (d: Date) => void;
    contas: (ContaReceber | ContaPagar)[];
    tipo: 'receber' | 'pagar';
}

export function FinanceiroCalendario({ dataSelecionada, onChange, contas, tipo }: FinanceiroCalendarioProps) {
    const [view, setView] = useState<'mes' | 'semana'>('mes');
    // Estado local para navegação do calendário (pode ser diferente da data selecionada)
    const [anchorDate, setAnchorDate] = useState(dataSelecionada);
    const isDownSm = useMediaQuery('(max-width:600px)');

    // Sincronizar anchor com seleção se mudar drasticamente? Não, melhor independente.

    // Calcular totais
    const totalsByDay = useMemo(() => {
        const map: Record<string, { total: number, count: number, hasVencido: boolean, hasPago: boolean }> = {};
        contas.forEach(c => {
            const k = c.dataVencimento; // YYYY-MM-DD
            if (!map[k]) map[k] = { total: 0, count: 0, hasVencido: false, hasPago: false };

            const val = c.status === 'pago' ? (c.valorPago || c.valorFinal) : c.valorFinal;
            map[k].total += val;
            map[k].count += 1;
            if (c.status === 'vencido') map[k].hasVencido = true;
            if (c.status === 'pago') map[k].hasPago = true;
        });
        return map;
    }, [contas]);

    const handlePrev = () => {
        if (view === 'mes') setAnchorDate(subMonths(anchorDate, 1));
        else setAnchorDate(addDays(anchorDate, -7));
    };

    const handleNext = () => {
        if (view === 'mes') setAnchorDate(addMonths(anchorDate, 1));
        else setAnchorDate(addDays(anchorDate, 7));
    };

    const handleToday = () => {
        const hoje = new Date();
        setAnchorDate(hoje);
        onChange(hoje);
    };

    const monthDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);

    // Grid da semana
    const weekStart = getMonday(anchorDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const daysToRender = view === 'mes' ? monthDays : weekDays;

    // CORES DINÂMICAS
    const colorPrimary = tipo === 'receber' ? '#1976d2' : '#d32f2f'; // Azul vs Vermelho
    const colorBgSelected = tipo === 'receber' ? '#e3f2fd' : '#ffebee';
    const colorTodayBg = tipo === 'receber' ? 'rgba(25,118,210,0.06)' : 'rgba(211,47,47,0.06)';

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.10)',
                overflow: 'hidden',
                bgcolor: '#fff'
            }}
        >
            {/* Header / Toolbar */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: tipo === 'receber' ? 'rgba(25,118,210,0.06)' : 'rgba(211,47,47,0.06)',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography sx={{ fontWeight: 900, color: colorPrimary }}>
                        {format(anchorDate, view === 'mes' ? 'MMMM yyyy' : "'Semana' d MMM", { locale: ptBR }).toUpperCase()}
                    </Typography>
                    <Box>
                        <IconButton onClick={handlePrev} size="small" sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.1)', mr: 0.5 }}><ChevronLeft fontSize="small" /></IconButton>
                        <IconButton onClick={handleToday} size="small" sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.1)', mr: 0.5 }}><Today fontSize="small" /></IconButton>
                        <IconButton onClick={handleNext} size="small" sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}><ChevronRight fontSize="small" /></IconButton>
                    </Box>
                </Box>
                <Tabs
                    value={view}
                    onChange={(_, v) => setView(v)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 36,
                        '& .MuiTab-root': {
                            minHeight: 36,
                            fontWeight: 800,
                            textTransform: 'none',
                            color: 'text.secondary',
                            '&.Mui-selected': { color: colorPrimary }
                        },
                        '& .MuiTabs-indicator': {
                            bgcolor: colorPrimary
                        }
                    }}
                >
                    <Tab value="mes" label="Mês" />
                    <Tab value="semana" label="Semana" />
                </Tabs>
            </Box>

            {/* Grid Days Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 0.5,
                    p: 1,
                    pb: 0
                }}
            >
                {weekDaysLabels.map((w) => (
                    <Typography key={w} sx={{ fontWeight: 900, color: 'text.secondary', fontSize: 11, textAlign: 'center' }}>
                        {w}
                    </Typography>
                ))}
            </Box>

            {/* Grid Days Body */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 0.5,
                    p: 1
                }}
            >
                {daysToRender.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const info = totalsByDay[dateKey];
                    const isSelected = isSameDay(day, dataSelecionada);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, anchorDate) || view === 'semana';

                    // Lógica de Cor do Valor
                    let valueColor = '#757575'; // Neutro
                    if (info) {
                        if (tipo === 'receber') {
                            if (info.hasVencido) valueColor = '#d32f2f'; // Receber Vencido é Ruim
                            else valueColor = '#2e7d32'; // Receber em dia é Bom
                        } else {
                            // Pagar
                            // Se tá vencido é PERIGO (Vermelho Forte)
                            // Se tá em aberto é ALERTA (Laranja/Vermelho Suave)
                            // Se pago, Verde (resolvido) ou Cinza (neutro)
                            if (info.hasVencido) valueColor = '#d32f2f';
                            else if (info.hasPago && info.total > 0) valueColor = '#2e7d32'; // Pago
                            else valueColor = '#ef5350'; // A Pagar (Aberto) -> Vermelho mais suave
                        }
                    }

                    return (
                        <Paper
                            key={day.toISOString()}
                            elevation={0}
                            onClick={() => onChange(day)}
                            sx={{
                                aspectRatio: '1/1',
                                borderRadius: 2,
                                border: isSelected ? `2px solid ${colorPrimary}` : '1px solid rgba(0,0,0,0.10)',
                                bgcolor: isToday ? colorTodayBg : (isSelected ? colorBgSelected : '#fff'),
                                cursor: 'pointer',
                                opacity: isCurrentMonth ? 1 : 0.4,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.04)',
                                    transform: 'scale(1.05)',
                                    transition: '0.2s'
                                }
                            }}
                        >
                            <Typography sx={{ fontWeight: 900, color: isToday || isSelected ? colorPrimary : 'text.primary', fontSize: 13 }}>
                                {day.getDate()}
                            </Typography>

                            {info && info.total > 0 && (
                                <Box sx={{ mt: 0.5, textAlign: 'center' }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: '0.65rem',
                                            color: valueColor,
                                            lineHeight: 1
                                        }}
                                    >
                                        {formatCurrencyCompact(info.total)}
                                    </Typography>
                                    {/* Bolinha indicadora */}
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            bgcolor: valueColor,
                                            mx: 'auto',
                                            mt: 0.25,
                                            display: info.count > 1 ? 'block' : 'none'
                                        }}
                                    />
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </Box>
        </Paper>
    );
}
