import React, { useState, useEffect } from 'react';
import { customColors } from '../../theme';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    IconButton,
    Tooltip,
    Grid,
    Divider,
    Alert,
    Collapse,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tabs,
    Tab,
    MenuItem,
    TablePagination,
    InputAdornment,
} from '@mui/material';
import { ActionDelete, StatusChip } from '../../components/TableActions';
import {
    AttachMoney,
    CheckCircle,
    Visibility,
    ReceiptLong,
    CalendarMonth,
    KeyboardArrowDown,
    KeyboardArrowUp,
    Delete,
    WhatsApp,
    Cancel,
    PictureAsPdf,
    Send,
    Edit,
    Search,
    Print,
    Email as EmailIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { ConfirmDialog } from '../../components/ConfirmDialog';

// Interfaces simplificadas para Vendas
interface OrcamentoAprovado {
    id: string;
    numero: string;
    titulo?: string; // Adicionado
    clienteId: string;
    clienteNome: string;
    valorTotal: number;
    desconto?: number; // Adicionado
    observacao?: string; // Adicionado
    dataEmissao: Timestamp;
    status: string;
    vendaGerada?: boolean;
    pagamento?: {
        tipoPagamento: string;
        vista?: { // Adicionado para compatibilidade
            formaPagamentoVista: string;
            dataVencimento: string;
        };
        aVista?: { // Adicionado
            formaPagamento: string;
            dataVencimento: string;
        };
        parcelado?: {
            entrada?: boolean; // Adicionado
            valorEntrada?: number;
            formaPagamentoEntrada?: string; // Adicionado
            numeroParcelas: number;
            formaPagamentoParcelas?: string; // Adicionado
            diaVencimentoEntrada?: number;
            diaVencimentoParcelas?: number;
        }
    };
    prefixoNome?: string; // Adicionado
    itens?: any[];
    dadosCliente?: any; // Snapshot do cliente
    contatosCliente?: any[]; // Snapshot dos contatos
}

interface ParcelaSimulada {
    numero: number;
    dataVencimento: string;
    valor: number;
    formaPagamento: string;
    status: 'pendente';
}

function Row({ row, onFaturar, onDelete }: { row: OrcamentoAprovado; onFaturar: (orc: OrcamentoAprovado) => void; onDelete: (orc: OrcamentoAprovado) => void }) {
    const [open, setOpen] = useState(false);
    const [clienteDetails, setClienteDetails] = useState<any>(null);
    const [loadingClient, setLoadingClient] = useState(false);
    const [clientNotFound, setClientNotFound] = useState(false);
    const [contatos, setContatos] = useState<any[]>([]);
    const { userData } = useAuth(); // Preciso do userData pra saber a empresaId? Sim, mas AuthContext não está disponível fora... vou passar ou usar hook dentro? 
    // Row está fora do componente principal, então useAuth funciona se Row estiver dentro do Provider (que está).

    // Buscar detalhes do cliente ao abrir
    useEffect(() => {
        if (open) {
            // VERIFICAÇÃO 1: Se já tem snapshot (Denormalizado), usa ele
            if (row.dadosCliente) {
                setClienteDetails(row.dadosCliente);
                setContatos(row.contatosCliente || []);
                setLoadingClient(false);
                return;
            }

            // VERIFICAÇÃO 2: Se já carregou ou deu erro antes, não faz nada
            if (clienteDetails || clientNotFound) return;

            if (!userData?.empresaId) return;
            if (!row.clienteId) {
                setClientNotFound(true);
                return;
            }

            const fetchCliente = async () => {
                setLoadingClient(true);
                try {
                    console.log(`Buscando cliente ${row.clienteId} na empresa ${userData.empresaId}`);
                    const docRef = doc(db, 'EMPRESAS', userData.empresaId!, 'clientes', row.clienteId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setClienteDetails(snap.data());

                        // Buscar subcoleção de contatos
                        const contatosRef = collection(db, 'EMPRESAS', userData.empresaId!, 'clientes', row.clienteId, 'contatos');
                        const contatosSnap = await getDocs(contatosRef);
                        const listaContatos = contatosSnap.docs.map(d => d.data());
                        setContatos(listaContatos);
                    } else {
                        console.warn("Cliente não encontrado no Firestore");
                        setClientNotFound(true);
                    }
                } catch (e) {
                    console.error("Erro ao buscar cliente", e);
                } finally {
                    setLoadingClient(false);
                }
            };
            fetchCliente();
        }
    }, [open, row.clienteId, userData?.empresaId, clienteDetails, clientNotFound, row.dadosCliente, row.contatosCliente]);

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
                <TableCell component="th" scope="row" sx={{ py: 0.25, fontWeight: 'bold' }}>
                    {row.numero}
                </TableCell>
                <TableCell sx={{ py: 0.25 }}>{row.clienteNome}</TableCell>
                <TableCell sx={{ py: 0.25 }}>{row.dataEmissao?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                <TableCell align="right" sx={{ py: 0.25, color: 'green', fontWeight: 'bold' }}>
                    {((row.valorTotal || 0) - (row.desconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell align="center" sx={{ py: 0.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<AttachMoney />}
                            onClick={() => onFaturar(row)}
                        >
                            Faturar
                        </Button>
                        <ActionDelete title="Excluir" onClick={() => onDelete(row)} />
                    </Box>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, p: 2, bgcolor: '#f1f8e9', borderRadius: 2, border: '1px solid #c5e1a5' }}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: '#558b2f', fontWeight: 'bold' }}>
                                        Condições de Pagamento
                                    </Typography>

                                    {(() => {
                                        const valorBruto = row.valorTotal;
                                        const desconto = row.desconto || 0;
                                        const valorLiquido = valorBruto - desconto;

                                        return (
                                            <Box>
                                                {desconto > 0 ? (
                                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                        Valor: {valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - <span style={{ color: '#d32f2f' }}>Desconto: - {desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> - <strong>Valor Total: {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                        <strong>Valor Total: {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                                    </Typography>
                                                )}

                                                {row.pagamento?.tipoPagamento === 'parcelado' && row.pagamento.parcelado?.entrada && (
                                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                        Entrada: {(row.pagamento.parcelado.valorEntrada || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - {row.pagamento.parcelado.formaPagamentoEntrada || 'Não informada'} {row.pagamento.parcelado.diaVencimentoEntrada ? `- Dia ${row.pagamento.parcelado.diaVencimentoEntrada}` : ''}
                                                    </Typography>
                                                )}

                                                {row.pagamento?.tipoPagamento === 'parcelado' && row.pagamento.parcelado && (() => {
                                                    const parc = row.pagamento.parcelado;
                                                    const valorEntrada = parc.valorEntrada || 0;
                                                    const saldoFinanciar = valorLiquido - valorEntrada;
                                                    const numParcelas = parc.numeroParcelas || 1;
                                                    const valorParcela = saldoFinanciar / numParcelas;

                                                    return (
                                                        <Typography variant="body2">
                                                            Parcelas: {numParcelas}x de {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - {parc.formaPagamentoParcelas || 'Boleto'} {parc.diaVencimentoParcelas ? `- Dia ${parc.diaVencimentoParcelas}` : ''}
                                                        </Typography>
                                                    );
                                                })()}

                                                {row.pagamento?.tipoPagamento === 'a_vista' && (
                                                    <Typography variant="body2">
                                                        À Vista: {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - {row.pagamento.aVista?.formaPagamento || 'Não informada'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    })()}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                                        Dados do Cliente
                                    </Typography>

                                    {loadingClient && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={16} />
                                            <Typography variant="caption">Buscando dados...</Typography>
                                        </Box>
                                    )}

                                    {!loadingClient && clientNotFound && (
                                        <Typography variant="body2" color="error">
                                            Cliente não encontrado (ID: {row.clienteId || 'N/A'}).
                                        </Typography>
                                    )}

                                    {!loadingClient && clienteDetails && (
                                        <Box>
                                            <Typography variant="body2"><strong>Razão Social:</strong> {clienteDetails.nome}</Typography>
                                            <Typography variant="body2"><strong>CNPJ/CPF:</strong> {clienteDetails.cnpjCpf}</Typography>
                                            <Typography variant="body2"><strong>Endereço:</strong> {clienteDetails.endereco}, {clienteDetails.numero}</Typography>
                                            <Typography variant="body2">{clienteDetails.bairro} - {clienteDetails.uf} - CEP: {clienteDetails.cep}</Typography>
                                        </Box>
                                    )}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                                        Contato Atual
                                    </Typography>

                                    {!loadingClient && clienteDetails && (
                                        <Box>
                                            {contatos && contatos.length > 0 ? (
                                                contatos.map((contato: any, index: number) => (
                                                    <Box key={index} sx={{ mt: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {contato.nome}
                                                            {contato.funcao ? ` - ${contato.funcao}` : ''}
                                                            {contato.departamento ? ` (${contato.departamento})` : ''}
                                                            {contato.apto ? ` - Apto: ${contato.apto}` : ''}
                                                        </Typography>

                                                        <Box sx={{ mt: 0.5 }}>
                                                            {contato.email1 && (
                                                                <Typography variant="caption" display="block">
                                                                    📧 {contato.email1}
                                                                </Typography>
                                                            )}
                                                            {contato.email2 && (
                                                                <Typography variant="caption" display="block">
                                                                    📧 {contato.email2}
                                                                </Typography>
                                                            )}

                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                                {contato.telefone && (
                                                                    <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                                                                        📞 {contato.telefone}
                                                                    </Typography>
                                                                )}

                                                                {contato.whatsapp && (
                                                                    <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                                                                        <WhatsApp sx={{ fontSize: 16, color: '#25D366' }} /> {contato.whatsapp}
                                                                    </Typography>
                                                                )}
                                                            </Box>

                                                            {/* Fallback para campo antigo 'celular' se existir */}
                                                            {!contato.whatsapp && contato.celular && (
                                                                <Typography variant="caption" display="block">
                                                                    📱 {contato.celular}
                                                                </Typography>
                                                            )}

                                                            {/* Fallback para campo antigo 'email' se existir e não tiver email1/2 */}
                                                            {(!contato.email1 && !contato.email2 && contato.email) && (
                                                                <Typography variant="caption" display="block">
                                                                    📧 {contato.email}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ))
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">Nenhum contato cadastrado.</Typography>
                                            )}
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment >
    );
}

export function Vendas() {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const [orcamentos, setOrcamentos] = useState<OrcamentoAprovado[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Controle do Dialog de Faturamento
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoAprovado | null>(null);
    const [parcelas, setParcelas] = useState<ParcelaSimulada[]>([]);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Novo Estado para Dialog de Sucesso com Ação
    const [successDialog, setSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Controle do Dialog de Confirmação de Exclusão
    const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<OrcamentoAprovado | null>(null);
    const [naturezaOperacao, setNaturezaOperacao] = useState<'venda' | 'servico'>('venda');

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tabValue, setTabValue] = useState(0);

    // Carregar vendas pendentes de faturamento (Read Model: Coleção 'vendas')
    const loadOrcamentos = async () => {
        if (!userData?.empresaId) return;
        setLoading(true);
        try {
            const targetStatus = tabValue === 0 ? ['pendente_faturamento', 'pendente', 'aberto'] : ['concluido'];

            let q = query(
                collection(db, 'EMPRESAS', userData.empresaId, 'vendas'),
                where('status', 'in', targetStatus)
            );

            // Se for histórico, limitar para não trazer tudo (opcional)
            if (tabValue === 1) {
                // q = query(q, limit(50));
            }

            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    numero: data.numeroOrcamento,
                    titulo: `Venda ${data.numeroOrcamento}`,
                    clienteId: data.clienteId,
                    clienteNome: data.clienteNome,
                    prefixoNome: data.prefixoNome,
                    valorTotal: data.valorTotal || 0,
                    desconto: data.desconto || 0,
                    status: data.status,
                    dataEmissao: data.dataVenda || Timestamp.now(),
                    pagamento: data.pagamento,
                    itens: data.itens,
                    vendedorNome: data.vendedorNome,
                    vendaGerada: false
                } as any;
            });

            // Ordenação manual para não depender de índice ou campo existente
            list.sort((a, b) => {
                const da = a.dataEmissao?.seconds || 0;
                const db = b.dataEmissao?.seconds || 0;
                return db - da;
            });

            setOrcamentos(list);
        } catch (err) {
            console.error("Erro ao carregar vendas", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrcamentos();
    }, [userData, tabValue]);

    // Abrir Dialog e Simular Parcelas Iniciais
    const handleOpenFaturamento = (orcamento: OrcamentoAprovado) => {
        setSelectedOrcamento(orcamento);

        // Lógica de Simulação Inicial baseada no Orçamento
        const novasParcelas: ParcelaSimulada[] = [];
        const valorBruto = orcamento.valorTotal;
        const desconto = orcamento.desconto || 0;
        const total = valorBruto - desconto;
        const pagto = orcamento.pagamento;

        // Helper para formatar data local YYYY-MM-DD
        const toLocalISOString = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (pagto?.tipoPagamento === 'parcelado' && pagto.parcelado) {
            const qtd = pagto.parcelado.numeroParcelas || 1;
            const entrada = pagto.parcelado.valorEntrada || 0;
            const valorRestante = total - entrada;
            const valorParcela = parseFloat((valorRestante / qtd).toFixed(2));

            // Ajuste de centavos na última parcela se necessário
            const totalParcelado = valorParcela * qtd;
            const diferenca = parseFloat((valorRestante - totalParcelado).toFixed(2));

            // Se tiver entrada
            let dataBaseParcelas = new Date(hoje); // Data de referência para calcular parcelas subsequentes

            if (entrada > 0) {
                let formaEntrada = 'Entrada'; // Default
                const formaOrigem = pagto.parcelado.formaPagamentoEntrada?.toLowerCase() || '';

                if (formaOrigem.includes('transferência') || formaOrigem.includes('transferencia')) formaEntrada = 'Transferência';
                else if (formaOrigem.includes('pix')) formaEntrada = 'Pix';
                else if (formaOrigem.includes('boleto')) formaEntrada = 'Boleto';
                else if (formaOrigem.includes('cartão') || formaOrigem.includes('cartao')) formaEntrada = 'Cartão';

                // Lógica de Data da Entrada Corrigida
                const diaVencEntrada = pagto.parcelado.diaVencimentoEntrada || hoje.getDate();
                let dataEntrada = new Date(hoje);

                // Se o dia escolhido já passou no mês atual, joga para o próximo mês
                if (diaVencEntrada < hoje.getDate()) {
                    dataEntrada.setMonth(dataEntrada.getMonth() + 1);
                }
                dataEntrada.setDate(diaVencEntrada);

                // Define a data da entrada como base para as próximas parcelas
                dataBaseParcelas = new Date(dataEntrada);

                novasParcelas.push({
                    numero: 0, // 0 Indica entrada
                    dataVencimento: toLocalISOString(dataEntrada),
                    valor: parseFloat(entrada.toFixed(2)),
                    formaPagamento: formaEntrada,
                    status: 'pendente'
                });
            }

            const diaVencParcela = pagto.parcelado.diaVencimentoParcelas || hoje.getDate();

            for (let i = 1; i <= qtd; i++) {
                const dataVenc = new Date(dataBaseParcelas); // Usa a data da entrada (ou hoje) como base
                dataVenc.setMonth(dataVenc.getMonth() + i);
                dataVenc.setDate(diaVencParcela); // Força o dia do vencimento escolhido

                // Ajuste para meses mais curtos
                const ultimoDiaMes = new Date(dataVenc.getFullYear(), dataVenc.getMonth() + 1, 0).getDate();
                if (diaVencParcela > ultimoDiaMes) {
                    dataVenc.setDate(ultimoDiaMes);
                } else {
                    dataVenc.setDate(diaVencParcela);
                }

                // Aplicando na última parcela
                const valorFinal = (i === qtd) ? parseFloat((valorParcela + diferenca).toFixed(2)) : valorParcela;

                novasParcelas.push({
                    numero: i,
                    dataVencimento: toLocalISOString(dataVenc),
                    valor: valorFinal,
                    formaPagamento: pagto.parcelado.formaPagamentoParcelas || 'Boleto',
                    status: 'pendente'
                });
            }
        } else {
            // À vista
            let formaVista = 'Boleto'; // Default

            if (pagto) {
                const tipo = (pagto.tipoPagamento || '').toLowerCase();
                // Verifica tanto no objeto estruturado 'vista' quanto 'aVista' e campos legados
                const formaObj = pagto.aVista?.formaPagamento || (pagto as any).vista?.formaPagamentoVista || '';
                const formaLegacy = (pagto as any).formaPagamento || '';

                const checkString = (formaObj + ' ' + formaLegacy + ' ' + tipo).toLowerCase();

                if (checkString.includes('pix')) formaVista = 'Pix';
                else if (checkString.includes('transferência') || checkString.includes('transferencia')) formaVista = 'Transferência';
                else if (checkString.includes('cartão') || checkString.includes('cartao')) formaVista = 'Cartão';
                else if (checkString.includes('dinheiro')) formaVista = 'Dinheiro';
            }

            // Data de Vencimento à Vista
            let dataVencimentoVista = hoje.toISOString().split('T')[0];
            if (pagto?.aVista?.dataVencimento) {
                // Se existe data definida no orçamento, usa ela
                dataVencimentoVista = pagto.aVista.dataVencimento;
            }

            novasParcelas.push({
                numero: 1,
                dataVencimento: dataVencimentoVista,
                valor: parseFloat(total.toFixed(2)),
                formaPagamento: formaVista,
                status: 'pendente'
            });
        }

        setParcelas(novasParcelas);
        setOpenDialog(true);
    };

    const handleUpdateParcela = (index: number, field: keyof ParcelaSimulada, value: any) => {
        const novas = [...parcelas];
        novas[index] = { ...novas[index], [field]: value };
        setParcelas(novas);
    };

    const handleConfirmarVenda = async () => {
        if (!selectedOrcamento || !userData?.empresaId) return;
        setProcessing(true);
        setError('');

        try {
            const empresaId = userData.empresaId;
            const batchPromises = [];

            // 1. Atualizar Venda Existente (status e parcelas confirmadas)
            // selectedOrcamento aqui representa o documento na coleção 'vendas'
            const vendaRef = doc(db, 'EMPRESAS', empresaId, 'vendas', selectedOrcamento.id);

            batchPromises.push(updateDoc(vendaRef, {
                status: 'concluido',
                parcelas: parcelas,
                dataFaturamento: Timestamp.now(),
                faturadoPor: userData.nome || userData.email
            }));

            // --- LÓGICA DE CENTRO DE CUSTO (Resolução Única antes do loop) ---
            let centroCustoResolvedId = '';
            let centroCustoResolvedNome = '';
            let centroCustoResolvedCodigo = '';

            try {
                // 1. Buscar/Criar Grupo Pai 'CC-CLIENTES'
                const gruposRef = collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos');
                const qGrupo = query(gruposRef, where('codigo', '==', 'CC-CLIENTES'));
                const snapGrupo = await getDocs(qGrupo);

                let grupoId = '';
                let grupoNome = 'CLIENTES';
                let grupoCodigo = 'CC-CLIENTES';

                if (!snapGrupo.empty) {
                    grupoId = snapGrupo.docs[0].id;
                    const gData = snapGrupo.docs[0].data();
                    grupoNome = gData.nome;
                    grupoCodigo = gData.codigo;

                    // AUTO-CORREÇÃO DE NOME (Se estiver "MENSALIDADES DE CONTRATOS" ou "VENDAS DE PRODUTOS")
                    if (grupoNome !== 'CLIENTES') {
                        await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centro_custo_grupos', grupoId), {
                            nome: 'CLIENTES'
                        });
                        grupoNome = 'CLIENTES';
                    }
                } else {
                    const novoGrupo = await addDoc(gruposRef, {
                        codigo: 'CC-CLIENTES',
                        nome: 'CLIENTES',
                        permiteReceita: true,
                        permiteDespesa: true,
                        descricao: 'Grupo automático para gestão financeira por cliente',
                        criadoEm: new Date().toISOString(),
                        criadoPor: userData.email,
                        empresaId: empresaId
                    });
                    grupoId = novoGrupo.id;
                }

                // 2. Buscar/Criar CC do Cliente
                if (grupoId) {
                    const cleanName = selectedOrcamento.clienteNome
                        .toUpperCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^A-Z0-9 ]/g, "")
                        .trim()
                        .replace(/\s+/g, "-");

                    const novoCodigo = `CC-${cleanName}`.substring(0, 30);
                    const nomeCompletoCliente = selectedOrcamento.prefixoNome
                        ? `${selectedOrcamento.prefixoNome} ${selectedOrcamento.clienteNome}`
                        : selectedOrcamento.clienteNome;

                    const centrosRef = collection(db, 'EMPRESAS', empresaId, 'centros_custo');
                    const qCheck = query(centrosRef, where('codigo', '==', novoCodigo));
                    const snapCheck = await getDocs(qCheck);

                    if (!snapCheck.empty) {
                        centroCustoResolvedId = snapCheck.docs[0].id;
                        centroCustoResolvedNome = snapCheck.docs[0].data().nome; // Usa nome existente
                        centroCustoResolvedCodigo = novoCodigo;
                        // Atualização preventiva do nome/grupo
                        try {
                            await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centros_custo', centroCustoResolvedId), {
                                nome: nomeCompletoCliente,
                                grupoId,
                                grupoNome,
                                grupoCodigo,
                                clienteId: selectedOrcamento.clienteId,
                                atualizadoEm: new Date().toISOString()
                            });
                        } catch (e) {
                            console.warn("Erro ao atualizar nome do CC existente:", e);
                        }
                    } else {
                        const novoCC = await addDoc(centrosRef, {
                            nome: nomeCompletoCliente,
                            codigo: novoCodigo,
                            grupoId,
                            grupoNome,
                            grupoCodigo,
                            permiteReceita: true,
                            permiteDespesa: true,
                            origensPermitidas: ['venda', 'manual', 'contrato'],
                            ativo: true,
                            criadoEm: new Date().toISOString(),
                            criadoPor: userData.email,
                            empresaId
                        });
                        centroCustoResolvedId = novoCC.id;
                        centroCustoResolvedNome = nomeCompletoCliente;
                        centroCustoResolvedCodigo = novoCodigo;
                    }
                }
            } catch (errCC) {
                console.error('Erro crítico na geração de CC:', errCC);
                // Não bloqueia o faturamento, mas logs
            }

            // 2. Descoberta do Plano de Contas (Natureza)
            // Lógica Única antes do loop também, pois a natureza é da Venda
            let planoContasResolvedId = '';
            let planoContasResolvedNome = '';
            let planoContasResolvedCodigo = '';
            const codigoPC = naturezaOperacao === 'venda' ? '1.003' : '1.002'; // 1.003 = Venda, 1.002 = Serviço

            try {
                const planoRef = collection(db, 'EMPRESAS', empresaId, 'plano_contas');
                const qCode = query(planoRef, where('codigo', '==', codigoPC));
                const snapCode = await getDocs(qCode);

                if (!snapCode.empty) {
                    planoContasResolvedId = snapCode.docs[0].id;
                    planoContasResolvedNome = snapCode.docs[0].data().nome;
                    planoContasResolvedCodigo = snapCode.docs[0].data().codigo;
                } else {
                    // Fallback
                    const termoBusca = naturezaOperacao === 'venda' ? 'Venda' : 'Serviço';
                    const qNome = query(planoRef, where('nome', '>=', termoBusca), where('nome', '<=', termoBusca + '\uf8ff'));
                    const snapNome = await getDocs(qNome);
                    if (!snapNome.empty) {
                        planoContasResolvedId = snapNome.docs[0].id;
                        planoContasResolvedNome = snapNome.docs[0].data().nome;
                        planoContasResolvedCodigo = snapNome.docs[0].data().codigo;
                    }
                }
            } catch (errPC) { console.error('Erro buscando PC:', errPC); }

            // 2. Gerar Contas a Receber (Loop apenas para criar os lançamentos)
            for (const parc of parcelas) {
                // Normalizar forma de pagamento para o padrão do sistema (snake_case)
                let formaNormalizada = parc.formaPagamento.toLowerCase();

                if (formaNormalizada.includes('cartão') || formaNormalizada.includes('cartao')) {
                    formaNormalizada = 'cartao_credito';
                } else if (formaNormalizada.includes('transferência') || formaNormalizada.includes('transferencia')) {
                    formaNormalizada = 'transferencia';
                } else if (formaNormalizada.includes('dinheiro') || formaNormalizada.includes('entrada')) {
                    formaNormalizada = 'dinheiro';
                } else if (formaNormalizada.includes('boleto')) {
                    formaNormalizada = 'boleto';
                } else if (formaNormalizada.includes('pix')) {
                    formaNormalizada = 'pix';
                } else {
                    formaNormalizada = 'outro'; // Default fallback
                }

                const novoRecebimento = {
                    empresaId,
                    clienteId: selectedOrcamento.clienteId,
                    clienteNome: selectedOrcamento.clienteNome,
                    clientePrefixo: selectedOrcamento.prefixoNome || '',
                    vendaId: selectedOrcamento.id,
                    numero: String(selectedOrcamento.numero),
                    descricao: `Venda #${selectedOrcamento.numero} - Parcela ${parc.numero === 0 ? 'Entrada' : parc.numero}`,
                    dataEmissao: new Date().toISOString().split('T')[0],
                    dataVencimento: parc.dataVencimento,
                    valorOriginal: parc.valor,
                    valorFinal: parc.valor,
                    valorPago: 0,
                    status: 'em_aberto',
                    formaPagamento: formaNormalizada,

                    // CC e PC Resolvidos (usando variáveis com 'Resolved')
                    centroCustoId: centroCustoResolvedId || 'CC-PADRAO',
                    centroCustoNome: centroCustoResolvedNome || 'Geral',
                    centroCustoCodigo: centroCustoResolvedCodigo || 'Geral',

                    planoContaId: planoContasResolvedId || '',
                    planoContaNome: planoContasResolvedNome || 'Venda de Equipamentos',
                    planoContaCodigo: planoContasResolvedCodigo || '',

                    origem: 'vendas',
                    origemId: selectedOrcamento.id,
                    orcamentoNumero: selectedOrcamento.numero,
                    boletoGerado: false,

                    criadoEm: new Date().toISOString(),
                    criadoPor: userData.email || 'sistema'
                };

                // Adicionar promise de criação
                batchPromises.push(addDoc(collection(db, 'EMPRESAS', empresaId, 'contas_receber'), novoRecebimento));
            }

            await Promise.all(batchPromises);

            setProcessing(false);
            setOpenDialog(false);

            // Mostrar Dialog de Sucesso com opção de ir para Boletos
            setSuccessMessage('Venda confirmada com sucesso! O financeiro foi gerado.');
            setSuccessDialog(true);

            loadOrcamentos(); // Recarrega a lista para remover o item faturado

        } catch (err: any) {
            console.error(err);
            setError('Erro ao processar venda: ' + err.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccess(''), 4000);
        }
    };



    const handleDeleteClick = (orc: OrcamentoAprovado) => {
        setSelectedToDelete(orc);
        setOpenConfirmDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedToDelete || !userData?.empresaId) return;

        try {
            await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'vendas', selectedToDelete.id));
            setSuccess('Venda excluída com sucesso!');
            loadOrcamentos();
        } catch (error: any) {
            console.error("Erro ao excluir", error);
            setError('Erro ao excluir: ' + error.message);
        } finally {
            setOpenConfirmDelete(false);
            setSelectedToDelete(null);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    return (
        <ProtectedRoute requiredRoute="/vendas">
            <Box sx={{ p: 0 }}>
                <Box className="flex items-center justify-between mb-6">
                    <Box><Typography variant="h4" fontWeight="bold">Faturamento de Vendas</Typography>
                        <Typography variant="body2" color="text.secondary">Confirme os orçamentos aprovados e gere o financeiro</Typography></Box>
                </Box>

                {/* Filtros de Pesquisa */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Buscar por Número ou Cliente"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Digite para filtrar..."
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="De"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Até"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab label="Pendentes de Faturamento" />
                        <Tab label="Histórico de Vendas" />
                    </Tabs>
                </Box>

                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
                            <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell />
                                    <TableCell><strong>Orçamento</strong></TableCell>
                                    <TableCell><strong>Cliente</strong></TableCell>
                                    <TableCell><strong>Emissão</strong></TableCell>
                                    <TableCell align="right"><strong>Valor Total</strong></TableCell>
                                    <TableCell align="center"><strong>Ação</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orcamentos.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center">Nenhum orçamento aprovado pendente de faturamento.</TableCell></TableRow>
                                ) : (
                                    orcamentos
                                        .filter(orc => {
                                            const matchesSearch =
                                                (orc.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (orc.clienteNome || '').toLowerCase().includes(searchTerm.toLowerCase());

                                            let matchesDate = true;
                                            if (startDate || endDate) {
                                                const dataEmissao = orc.dataEmissao?.toDate();
                                                if (dataEmissao) {
                                                    const dateCheck = new Date(dataEmissao);
                                                    dateCheck.setHours(0, 0, 0, 0);

                                                    if (startDate) {
                                                        const start = new Date(startDate + 'T00:00:00');
                                                        if (dateCheck < start) matchesDate = false;
                                                    }
                                                    if (endDate) {
                                                        const end = new Date(endDate + 'T23:59:59');
                                                        if (dateCheck > end) matchesDate = false;
                                                    }
                                                }
                                            }

                                            return matchesSearch && matchesDate;
                                        })
                                        .map((orc) => (
                                            <Row
                                                key={orc.id}
                                                row={orc}
                                                onFaturar={handleOpenFaturamento}
                                                onDelete={handleDeleteClick}
                                            />
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Dialog de Faturamento */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ bgcolor: '#e3f2fd', borderBottom: '1px solid #bbdefb' }}>
                        Conferência Financeira - {selectedOrcamento?.numero}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Box sx={{ mb: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #eee' }}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color="textSecondary">CLIENTE</Typography>
                                    <Typography variant="subtitle1" fontWeight="bold">{selectedOrcamento?.clienteNome}</Typography>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>
                                <Grid size={{ xs: 12 }} sx={{ textAlign: 'right' }}>
                                    {(selectedOrcamento?.desconto || 0) > 0 ? (
                                        <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                                            <span style={{ color: '#000' }}>VALOR DO PEDIDO: {selectedOrcamento?.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> <span style={{ color: '#d32f2f' }}> - Desconto: {(selectedOrcamento?.desconto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> = VALOR TOTAL: {((selectedOrcamento?.valorTotal || 0) - (selectedOrcamento?.desconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </Typography>
                                    ) : (
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">VALOR TOTAL DO PEDIDO</Typography>
                                            <Typography variant="h5" color="primary" fontWeight="bold">
                                                {selectedOrcamento?.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>

                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ReceiptLong fontSize="small" /> Simulação de Parcelas (Contas a Receber)
                        </Typography>
                        <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                            Confira as datas e valores. Ao confirmar, estes lançamentos irão para o Contas a Receber.
                        </Alert>

                        <Box sx={{ mb: 2 }}>
                            <TextField
                                select
                                fullWidth
                                label="Natureza da Operação"
                                value={naturezaOperacao}
                                onChange={(e) => setNaturezaOperacao(e.target.value as 'venda' | 'servico')}
                                helperText="Define a classificação contábil (Venda: 1.003 / Serviço: 1.002)"
                            >
                                <MenuItem value="venda">Venda de Equipamentos (PC 1.003)</MenuItem>
                                <MenuItem value="servico">Serviço Extra / Manutenção (PC 1.002)</MenuItem>
                            </TextField>
                        </Box>

                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#eee' }}>
                                    <TableRow>
                                        <TableCell>Parcela</TableCell>
                                        <TableCell>Data Vencimento</TableCell>
                                        <TableCell>Forma Pagto</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parcelas.map((p, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{p.numero === 0 ? 'Entrada' : `${p.numero}x`}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    type="date"
                                                    size="small"
                                                    value={p.dataVencimento}
                                                    onChange={(e) => handleUpdateParcela(idx, 'dataVencimento', e.target.value)}
                                                    sx={{ width: 150 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    select
                                                    SelectProps={{ native: true }}
                                                    size="small"
                                                    value={p.formaPagamento}
                                                    onChange={(e) => handleUpdateParcela(idx, 'formaPagamento', e.target.value)}
                                                >
                                                    <option value="Boleto">Boleto (Simulado)</option>
                                                    <option value="Pix">Pix</option>
                                                    <option value="Transferência">Transferência</option>
                                                    <option value="Cartão">Cartão</option>
                                                    <option value="Entrada">Entrada (Dinheiro)</option>
                                                </TextField>
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={p.valor}
                                                    onChange={(e) => handleUpdateParcela(idx, 'valor', parseFloat(e.target.value))}
                                                    InputProps={{ startAdornment: 'R$ ' }}
                                                    sx={{ width: 120 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Linha de Total para Conferência */}
                                    <TableRow sx={{ bgcolor: '#fffde7' }}>
                                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total Simulado:</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: Math.abs(parcelas.reduce((a, b) => a + b.valor, 0) - ((selectedOrcamento?.valorTotal || 0) - (selectedOrcamento?.desconto || 0))) < 0.1 ? 'green' : 'red' }}>
                                            {parcelas.reduce((a, b) => a + b.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {/* Aviso se valores não baterem */}
                        {Math.abs(parcelas.reduce((a, b) => a + b.valor, 0) - ((selectedOrcamento?.valorTotal || 0) - (selectedOrcamento?.desconto || 0))) > 0.1 && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                                * O total das parcelas difere do total líquido do pedido. Ajuste os valores.
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
                        <Button
                            onClick={handleConfirmarVenda}
                            variant="contained"
                            color="success"
                            disabled={processing || Math.abs(parcelas.reduce((a, b) => a + b.valor, 0) - ((selectedOrcamento?.valorTotal || 0) - (selectedOrcamento?.desconto || 0))) > 0.1}
                            startIcon={processing ? <CircularProgress size={20} /> : <CheckCircle />}
                        >
                            Confirmar Venda e Gerar Financeiro
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog de Sucesso e Redirecionamento */}
                <Dialog open={successDialog} onClose={() => setSuccessDialog(false)}>
                    <DialogTitle>Sucesso!</DialogTitle>
                    <DialogContent>
                        <Typography>{successMessage}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Deseja emitir os boletos agora?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSuccessDialog(false)}>Fechar</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setSuccessDialog(false);
                                // Navegar via Dashboard (Single Page) para manter Layout
                                window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'boletos' }));
                                // Se estivermos fora do dashboard (no mobile ou rota direta), garantir que vamos para a home
                                if (window.location.pathname !== '/') {
                                    navigate('/');
                                }
                            }}
                            startIcon={<ReceiptLong />}
                        >
                            Ir para Boletos
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={openConfirmDelete}
                    onClose={() => setOpenConfirmDelete(false)}
                    onConfirm={handleConfirmDelete}
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o orçamento ${selectedToDelete?.numero}? Esta ação irá remover o orçamento aprovado do sistema.`}
                />
            </Box>
        </ProtectedRoute>
    );
}
