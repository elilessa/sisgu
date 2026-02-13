import React, { useState, useEffect } from 'react';
import { Box, Paper, IconButton, Typography, Grid } from '@mui/material';
import { ChevronLeft, ChevronRight, CalendarToday } from '@mui/icons-material';
import { ContaReceber } from '../../types/financeiro';

interface CalendarioResumoProps {
    contas: ContaReceber[];
    dataSelecionada: Date;
    onDataChange: (date: Date) => void;
    onMesChange: (mes: number, ano: number) => void;
}

export const CalendarioResumo: React.FC<CalendarioResumoProps> = ({
    contas,
    dataSelecionada,
    onDataChange,
    onMesChange
}) => {
    const [dataAtual, setDataAtual] = useState(new Date());

    // Navegação de mês
    const alterarMes = (delta: number) => {
        const novaData = new Date(dataAtual);
        novaData.setMonth(novaData.getMonth() + delta);
        setDataAtual(novaData);
        onMesChange(novaData.getMonth() + 1, novaData.getFullYear());
    };

    // Gerar dias do mês atual para exibição
    const getDiasDoMes = () => {
        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();
        const dias = [];

        for (let i = 1; i <= ultimoDia; i++) {
            const data = new Date(ano, mes, i);
            const dataStr = data.toISOString().split('T')[0];

            // Calcular total do dia
            const totalDia = contas
                .filter(c => c.dataVencimento === dataStr && c.status !== 'cancelado')
                .reduce((acc, curr) => acc + curr.valorFinal, 0);

            dias.push({
                dia: i,
                dataStr,
                dataRef: data,
                total: totalDia,
                temPendencia: contas.some(c => c.dataVencimento === dataStr && c.status === 'em_aberto')
            });
        }
        return dias;
    };

    const dias = getDiasDoMes();
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    // Calcular totais do mês
    const totalMensal = contas
        .filter(c => !['cancelado'].includes(c.status))
        .reduce((acc, curr) => acc + (curr.valorFinal || 0), 0);

    const totalRecebido = contas
        .filter(c => c.status === 'pago')
        .reduce((acc, curr) => acc + (curr.valorFinal || 0), 0);

    return (
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            {/* Cabeçalho do Calendário */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={() => alterarMes(-1)} size="small">
                        <ChevronLeft />
                    </IconButton>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize', minWidth: 150, textAlign: 'center' }}>
                        {dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </Typography>
                    <IconButton onClick={() => alterarMes(1)} size="small">
                        <ChevronRight />
                    </IconButton>
                </Box>

                <Box display="flex" gap={3}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Total Previsto</Typography>
                        <Typography variant="subtitle2" color="primary">
                            {totalMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Total Recebido</Typography>
                        <Typography variant="subtitle2" color="success.main">
                            {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Barra de Dias (Scroll Horizontal) */}
            <Box sx={{ overflowX: 'auto', display: 'flex', gap: 1, pb: 1 }} className="hide-scrollbar">
                {dias.map((d) => {
                    const isSelected = d.dataStr === dataSelecionada.toISOString().split('T')[0];
                    const isToday = d.dataStr === new Date().toISOString().split('T')[0];

                    return (
                        <Box
                            key={d.dia}
                            onClick={() => onDataChange(d.dataRef)}
                            sx={{
                                minWidth: 60,
                                p: 1,
                                borderRadius: 2,
                                cursor: 'pointer',
                                bgcolor: isSelected ? 'primary.main' : isToday ? 'primary.50' : 'white',
                                color: isSelected ? 'white' : 'text.primary',
                                border: isSelected ? 'none' : '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 1
                                }
                            }}
                        >
                            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                                {weekDays[d.dataRef.getDay()]}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                                {d.dia}
                            </Typography>
                            {d.total > 0 && (
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', mt: 0.5 }}>
                                    {(d.total / 1000).toFixed(1)}k
                                </Typography>
                            )}
                            {d.temPendencia && !isSelected && (
                                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'warning.main', mx: 'auto', mt: 0.5 }} />
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};
