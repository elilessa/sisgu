// @ts-nocheck
import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { AccessTime, AttachMoney, Business, Assignment, TrendingUp, TrendingDown, ErrorOutline, Engineering, Description, MonetizationOn } from '@mui/icons-material';
import { useDashboardData } from '../hooks/useDashboardData';
import { SummaryCard } from '../components/Dashboard/SummaryCard';
import { TrendUp } from '../components/Icons/CustomIcons';

const DashboardHome: React.FC = () => {
    const { userData } = useAuth();
    const [periodo, setPeriodo] = useState('mes'); // dia, semana, mes, ano

    // Hook customizado que traz os dados
    const { data, loading } = useDashboardData(userData?.empresaId, periodo);

    // Função auxiliar de formatação
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // Exemplo de como era o SummaryCard aqui... agora importado.


    return (
        <Box className="w-full space-y-6">

            {/* CABEÇALHO E FILTROS */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="text.primary">
                        Visão Geral
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Bem-vindo, {userData?.nome}
                    </Typography>
                </Box>

                <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
                    <InputLabel id="periodo-label">Período</InputLabel>
                    <Select
                        labelId="periodo-label"
                        value={periodo}
                        label="Período"
                        onChange={(e) => setPeriodo(e.target.value)}
                    >
                        <MenuItem value="dia">Hoje</MenuItem>
                        <MenuItem value="semana">Esta Semana</MenuItem>
                        <MenuItem value="mes">Este Mês</MenuItem>
                        <MenuItem value="ano">Este Ano</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* LINHA 1: CHAMADOS TÉCNICOS */}
            <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Engineering color="action" />
                    <Typography variant="h6" color="text.secondary">Chamados Técnicos</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Total Chamados"
                            value={data.chamados.total}
                            icon={<Assignment sx={{ color: '#555' }} />}
                            color="#555"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Em Aberto"
                            value={data.chamados.abertos}
                            percent={data.chamados.total ? Math.round((data.chamados.abertos / data.chamados.total) * 100) : 0}
                            icon={<ErrorOutline sx={{ color: '#EF4444' }} />} // Vermelho alerta
                            color="#EF4444"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Em Andamento"
                            value={data.chamados.emAndamento}
                            percent={data.chamados.total ? Math.round((data.chamados.emAndamento / data.chamados.total) * 100) : 0}
                            icon={<AccessTime sx={{ color: '#3B82F6' }} />} // Azul
                            color="#3B82F6"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Concluídos"
                            value={data.chamados.concluidos}
                            percent={data.chamados.total ? Math.round((data.chamados.concluidos / data.chamados.total) * 100) : 0}
                            icon={<Engineering sx={{ color: '#10B981' }} />} // Verde
                            color="#10B981"
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* LINHA 2: COMERCIAL */}
            <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2} mt={2}>
                    <Description color="action" />
                    <Typography variant="h6" color="text.secondary">Comercial</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4} lg={3}>
                        <SummaryCard
                            title="Pipeline Total"
                            value={formatCurrency(data.comercial.valorTotalPipeline)}
                            subvalue={`${data.comercial.total} orçamentos`}
                            icon={<MonetizationOn sx={{ color: '#8B5CF6' }} />}
                            color="#8B5CF6"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <SummaryCard
                            title="Em Elaboração"
                            value={data.comercial.emElaboracao}
                            percent={data.comercial.total ? Math.round((data.comercial.emElaboracao / data.comercial.total) * 100) : 0}
                            icon={<Description sx={{ color: '#3B82F6' }} />}
                            color="#3B82F6"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <SummaryCard
                            title="Enviados"
                            value={data.comercial.enviados}
                            percent={data.comercial.total ? Math.round((data.comercial.enviados / data.comercial.total) * 100) : 0}
                            icon={<TrendUp sx={{ color: '#F59E0B' }} />} // Amarelo
                            color="#F59E0B"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <SummaryCard
                            title="Aprovados"
                            value={data.comercial.aprovados}
                            percent={data.comercial.total ? Math.round((data.comercial.aprovados / data.comercial.total) * 100) : 0}
                            icon={<TrendingUp sx={{ color: '#10B981' }} />}
                            color="#10B981"
                        />
                    </Grid>
                </Grid>
            </Box>


            {/* LINHA 3: CONTRATOS */}
            <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2} mt={2}>
                    <Business color="action" />
                    <Typography variant="h6" color="text.secondary">Contratos (Base Total)</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4} lg={3}>
                        <SummaryCard
                            title="Receita Recorrente (MRR)"
                            value={formatCurrency(data.contratos.valorTotal)}
                            subvalue={`${data.contratos.total} contratos totais`}
                            icon={<AttachMoney sx={{ color: '#0EA5E9' }} />}
                            color="#0EA5E9"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Ativos"
                            value={data.contratos.ativos}
                            percent={data.contratos.total ? Math.round((data.contratos.ativos / data.contratos.total) * 100) : 0}
                            icon={<Business sx={{ color: '#10B981' }} />}
                            color="#10B981"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3} lg={2}>
                        <SummaryCard
                            title="Suspensos"
                            value={data.contratos.suspensos}
                            percent={data.contratos.total ? Math.round((data.contratos.suspensos / data.contratos.total) * 100) : 0}
                            icon={<ErrorOutline sx={{ color: '#F59E0B' }} />}
                            color="#F59E0B"
                        />
                    </Grid>
                    {/* Chips Internos de Peças (Conforme Sugestão) e COMODATO */}
                    <Grid item xs={12} sm={6} md={4} lg={3}>
                        <Paper elevation={2} sx={{ p: 2, height: '100%', borderLeft: '4px solid #6366F1' }}>
                            <Typography variant="body2" color="text.secondary" fontWeight="bold">MODALIDADES</Typography>
                            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                                <Chip label={`Com Peças: ${data.contratos.comPecas}`} color="primary" size="small" variant={data.contratos.comPecas > 0 ? "filled" : "outlined"} />
                                <Chip label={`Sem Peças: ${data.contratos.semPecas}`} color="default" size="small" variant={data.contratos.semPecas > 0 ? "filled" : "outlined"} />
                                <Chip label={`Comodato: ${data.contratos.comodato}`} color="secondary" size="small" variant={data.contratos.comodato > 0 ? "filled" : "outlined"} />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>


            {/* LINHA 4: FINANCEIRO */}
            <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2} mt={2}>
                    <AttachMoney color="action" />
                    <Typography variant="h6" color="text.secondary">Financeiro ({periodo === 'mes' ? 'Este Mês' : periodo})</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={6} lg={3}>
                        <SummaryCard
                            title="Receita Realizada"
                            value={formatCurrency(data.financeiro.receitaRealizada)}
                            subvalue={`De ${formatCurrency(data.financeiro.receitaPrevista)} previsto`}
                            percent={data.financeiro.receitaPrevista ? Math.round((data.financeiro.receitaRealizada / data.financeiro.receitaPrevista) * 100) : 0}
                            icon={<TrendingUp sx={{ color: '#10B981' }} />}
                            color="#10B981"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={6} lg={3}>
                        <SummaryCard
                            title="Despesa Realizada"
                            value={formatCurrency(data.financeiro.despesaRealizada)}
                            subvalue={`De ${formatCurrency(data.financeiro.despesaPrevista)} previsto`}
                            percent={data.financeiro.despesaPrevista ? Math.round((data.financeiro.despesaRealizada / data.financeiro.despesaPrevista) * 100) : 0}
                            icon={<TrendingDown sx={{ color: '#EF4444' }} />}
                            color="#EF4444"
                        />
                    </Grid>
                    <Grid item xs={12} sm={12} md={12} lg={6}>
                        <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC' }}>
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                [O Gráfico de Fluxo de Caixa Anual proposto entraria aqui]
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

        </Box>
    );
};

export { DashboardHome };
