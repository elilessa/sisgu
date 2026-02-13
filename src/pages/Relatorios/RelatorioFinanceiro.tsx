import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip,
    Card,
    CardContent,
    Collapse,
    IconButton
} from '@mui/material';
import { DateRange, Search, AttachMoney, TrendingUp, TrendingDown, AccountBalance, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { customColors } from '../../theme';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinanceiroItem {
    id: string;
    descricao: string;
    valor: number;
    data: string; // Vencimento ou Pagamento
    tipo: 'receita' | 'despesa';
    centroCustoNome: string;
    status: string;
}

interface CentroCustoSummary {
    nome: string;
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    itens: FinanceiroItem[];
}

const RelatorioFinanceiro: React.FC = () => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filtros
    const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // Dados
    const [dadosAgrupados, setDadosAgrupados] = useState<CentroCustoSummary[]>([]);
    const [totalGeral, setTotalGeral] = useState({ receitas: 0, despesas: 0, saldo: 0 });

    const fetchDados = async () => {
        if (!userData?.empresaId) return;
        setLoading(true);
        setError('');

        try {
            const empId = userData.empresaId;

            // Converter datas para string comparável (YYYY-MM-DD)
            // Firestore queries por datas string YYYY-MM-DD funcionam bem lexicograficamente

            // 1. Buscar Receitas (Contas a Receber)
            const qReceitas = query(
                collection(db, 'EMPRESAS', empId, 'contas_receber'),
                where('dataVencimento', '>=', dataInicio),
                where('dataVencimento', '<=', dataFim)
            );
            const snapReceitas = await getDocs(qReceitas);

            // 2. Buscar Despesas (Contas a Pagar)
            const qDespesas = query(
                collection(db, 'EMPRESAS', empId, 'contas_pagar'),
                where('dataVencimento', '>=', dataInicio),
                where('dataVencimento', '<=', dataFim)
            );
            const snapDespesas = await getDocs(qDespesas);

            // Processamento
            const agrupamento: Record<string, CentroCustoSummary> = {};

            // Helper para normalizar nome do CC
            const getNomeCC = (nome?: string) => nome ? nome.toUpperCase().trim() : 'SEM CENTRO DE CUSTO';

            // Processar Receitas
            snapReceitas.forEach(doc => {
                const data = doc.data();
                const valor = data.valorFinal || data.valor || 0;
                const ccNome = getNomeCC(data.centroCustoNome);

                if (!agrupamento[ccNome]) {
                    agrupamento[ccNome] = { nome: ccNome, totalReceitas: 0, totalDespesas: 0, saldo: 0, itens: [] };
                }

                agrupamento[ccNome].totalReceitas += valor;
                agrupamento[ccNome].saldo += valor;
                agrupamento[ccNome].itens.push({
                    id: doc.id,
                    descricao: data.descricao || 'Sem descrição',
                    valor: valor,
                    data: data.dataVencimento || '',
                    tipo: 'receita',
                    centroCustoNome: ccNome,
                    status: data.status || 'pendente'
                });
            });

            // Processar Despesas
            snapDespesas.forEach(doc => {
                const data = doc.data();
                const valor = data.valorFinal || data.valor || 0;
                const ccNome = getNomeCC(data.centroCustoNome);

                if (!agrupamento[ccNome]) {
                    agrupamento[ccNome] = { nome: ccNome, totalReceitas: 0, totalDespesas: 0, saldo: 0, itens: [] };
                }

                agrupamento[ccNome].totalDespesas += valor;
                agrupamento[ccNome].saldo -= valor;
                agrupamento[ccNome].itens.push({
                    id: doc.id,
                    descricao: data.descricao || 'Sem descrição',
                    valor: valor,
                    data: data.dataVencimento || '',
                    tipo: 'despesa',
                    centroCustoNome: ccNome,
                    status: data.status || 'pendente'
                });
            });

            // Converter para Array e Ordenar
            const listaOrdenada = Object.values(agrupamento).sort((a, b) => b.saldo - a.saldo); // Maior saldo primeiro

            // Calcular Totais Gerais
            const totais = listaOrdenada.reduce((acc, item) => ({
                receitas: acc.receitas + item.totalReceitas,
                despesas: acc.despesas + item.totalDespesas,
                saldo: acc.saldo + item.saldo
            }), { receitas: 0, despesas: 0, saldo: 0 });

            setDadosAgrupados(listaOrdenada);
            setTotalGeral(totais);

        } catch (err: any) {
            console.error("Erro ao carregar relatório:", err);
            setError('Erro ao carregar dados: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDados();
    }, []); // Carrega inicial (mês atual)

    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = () => {
        fetchDados();
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const filteredData = useMemo(() => {
        return dadosAgrupados.filter(item =>
            item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [dadosAgrupados, searchTerm]);

    // Componente Row expansível
    const Row = ({ item }: { item: CentroCustoSummary }) => {
        const [open, setOpen] = useState(false);
        const margem = item.totalReceitas > 0 ? (item.saldo / item.totalReceitas) * 100 : 0;

        const receitas = item.itens.filter(i => i.tipo === 'receita');
        const despesas = item.itens.filter(i => i.tipo === 'despesa');

        return (
            <React.Fragment>
                <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                    <TableCell width={50}>
                        <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => setOpen(!open)}
                        >
                            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>{item.nome}</TableCell>
                    <TableCell align="right" sx={{ color: '#2e7d32' }}>{formatCurrency(item.totalReceitas)}</TableCell>
                    <TableCell align="right" sx={{ color: '#d32f2f' }}>{formatCurrency(item.totalDespesas)}</TableCell>
                    <TableCell align="right">
                        <Chip
                            label={formatCurrency(item.saldo)}
                            color={item.saldo >= 0 ? 'success' : 'error'}
                            variant={item.saldo >= 0 ? 'outlined' : 'filled'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        />
                    </TableCell>
                    <TableCell align="center">
                        <Typography variant="caption" fontWeight="bold" color={margem >= 0 ? 'text.primary' : 'error.main'}>
                            {margem.toFixed(1)}%
                        </Typography>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                                <Grid container spacing={3}>
                                    {/* Receitas */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TrendingUp fontSize="small" /> Receitas ({receitas.length})
                                        </Typography>
                                        {receitas.length === 0 ? (
                                            <Typography variant="caption" color="text.secondary">Nenhuma receita neste período</Typography>
                                        ) : (
                                            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                {receitas.map((r, idx) => (
                                                    <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid #e8f5e9' }}>
                                                        <Typography variant="caption" display="block" fontWeight="bold">{r.descricao}</Typography>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="caption" color="text.secondary">{r.data}</Typography>
                                                            <Typography variant="caption" fontWeight="bold" color="#2e7d32">{formatCurrency(r.valor)}</Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Grid>

                                    {/* Despesas */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: '#d32f2f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TrendingDown fontSize="small" /> Despesas ({despesas.length})
                                        </Typography>
                                        {despesas.length === 0 ? (
                                            <Typography variant="caption" color="text.secondary">Nenhuma despesa neste período</Typography>
                                        ) : (
                                            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                {despesas.map((d, idx) => (
                                                    <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid #ffebee' }}>
                                                        <Typography variant="caption" display="block" fontWeight="bold">{d.descricao}</Typography>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="caption" color="text.secondary">{d.data}</Typography>
                                                            <Typography variant="caption" fontWeight="bold" color="#d32f2f">{formatCurrency(d.valor)}</Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        );
    };

    return (
        <Box>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="900" color="primary.main" gutterBottom>
                    Relatório Financeiro por Centro de Custo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Analise a rentabilidade de cada Cliente/Projeto no período selecionado.
                </Typography>
            </Box>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 4, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <TextField
                            label="Data Início"
                            type="date"
                            fullWidth
                            size="small"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <TextField
                            label="Data Fim"
                            type="date"
                            fullWidth
                            size="small"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                        <TextField
                            label="Filtrar por Cliente / CC"
                            fullWidth
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Digite o nome..."
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<Search />}
                            fullWidth
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            Filtrar
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Cards de Resumo */}
            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <TrendingUp color="success" />
                                <Typography variant="overline" fontWeight="bold" color="text.secondary">TOTAL RECEITAS</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="900" color="#2e7d32">
                                {formatCurrency(totalGeral.receitas)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #d32f2f' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <TrendingDown color="error" />
                                <Typography variant="overline" fontWeight="bold" color="text.secondary">TOTAL DESPESAS</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="900" color="#d32f2f">
                                {formatCurrency(totalGeral.despesas)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AccountBalance color="primary" />
                                <Typography variant="overline" fontWeight="bold" color="text.secondary">RESULTADO LÍQUIDO</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="900" color={totalGeral.saldo >= 0 ? '#1976d2' : '#d32f2f'}>
                                {formatCurrency(totalGeral.saldo)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Tabela Detalhada */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: customColors.tableHeader }}>
                            <TableCell sx={{ fontWeight: 'bold' }} />
                            <TableCell sx={{ fontWeight: 'bold' }}>Centro de Custo / Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Receitas</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Despesas</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Resultado (Saldo)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Margem %</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell>
                            </TableRow>
                        ) : filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">Nenhum dado encontrado para o filtro.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item, index) => <Row key={index} item={item} />)
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export { RelatorioFinanceiro };
