import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Tabs,
    Tab,
    Paper,
    Alert,
    CircularProgress,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem
} from '@mui/material';
import { Add, ReceiptLong, Warning } from '@mui/icons-material';
import { collection, getDocs, getDoc, query, where, orderBy, Timestamp, addDoc, limit, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { customColors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { Boleto } from '../../types/boleto';
import { imprimirHTMLViaIframe } from '../../utils/printUtils';
import { ActionPrint, ActionCancel, ActionDelete } from '../../components/TableActions';

interface Contrato {
    id: string;
    numero: string;
    clienteId: string;
    clienteNome: string;
    prefixoNome?: string;
    clienteCnpjCpf: string;
    clienteEmail?: string;
    valorContrato: number;
    diaBoleto?: number;
    status: string;
    bancoId?: string;
    bancoNome?: string;
}

// Interface unificada para a tabela de geração
interface GenerationItem {
    id: string;
    type: 'contrato' | 'venda';
    descricao: string;
    numeroOrigem: string;
    clienteNome: string;
    clientePrefixo?: string; // Novo campo para prefixo
    vencimento: string; // Display string
    dataVencimentoObj: Date; // Para ordenação
    valor: number;
    originalObj: any;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`boletos-tabpanel-${index}`}
            aria-labelledby={`boletos-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export const Boletos: React.FC = () => {
    const { userData } = useAuth();

    // Estados Gerais
    const [tabValue, setTabValue] = useState(0);
    const [boletos, setBoletos] = useState<Boleto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados da Geração (Tab 0)
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [contratos, setContratos] = useState<Contrato[]>([]);
    const [vendasPendentes, setVendasPendentes] = useState<any[]>([]);
    const [clientesMap, setClientesMap] = useState<Record<string, string>>({}); // Map de ID -> Prefixo

    // Estado unificado de seleção
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filtros da Tabela
    const [filterType, setFilterType] = useState<'todos' | 'contrato' | 'venda'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [existingBoletosMap, setExistingBoletosMap] = useState<Record<string, boolean>>({});
    const [generating, setGenerating] = useState(false);

    // Estados de Exclusão (Tab 1)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedBoletoToDelete, setSelectedBoletoToDelete] = useState<Boleto | null>(null);

    // === CARREGAMENTOS INICIAIS ===

    const getUltimoSequencial = async (mesRef: string) => {
        if (!userData?.empresaId) return 0;
        const empresaId = userData.empresaId;

        try {
            const boletosRef = collection(db, 'EMPRESAS', empresaId, 'boletos');
            const q = query(
                boletosRef,
                where('mesReferencia', '==', mesRef),
                orderBy('criadoEm', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return 0;

            const ultimoBoleto = snapshot.docs[0].data();
            if (ultimoBoleto.numero) {
                // Formato esperado: BOL-YYMM00001
                const sequencialStr = ultimoBoleto.numero.slice(-5);
                return parseInt(sequencialStr) || 0;
            }
            return 0;
        } catch (error) {
            console.error("Erro ao buscar ultimo sequencial:", error);
            return 0;
        }
    };

    const loadClientesMap = async () => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;
        try {
            const clientesRef = collection(db, 'EMPRESAS', empresaId, 'clientes');
            const snapshot = await getDocs(clientesRef);
            const map: Record<string, string> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.tipo === 'pj' && data.razaoSocial) {
                    // Tenta extrair prefixo comum se não tiver campo explícito (mas contrato tem prefixoNome)
                    map[doc.id] = data.prefixoNome || '';
                } else {
                    map[doc.id] = data.prefixoNome || '';
                }
            });
            setClientesMap(map);
        } catch (e) {
            console.error("Erro ao carregar mapa de clientes:", e);
        }
    };

    const loadContratos = async () => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;

        try {
            const contratosRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
            // Busca contratos ativos/aprovados
            const q = query(contratosRef, where('status', 'in', ['aprovado', 'ativo', 'Ativo']));
            const snapshot = await getDocs(q);

            const contratosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Contrato[];

            setContratos(contratosData);
        } catch (err: any) {
            console.error('Erro ao carregar contratos:', err);
            setError('Erro ao carregar contratos: ' + err.message);
        }
    };

    const checkExistingBoletos = async () => {
        if (!userData?.empresaId || !selectedMonth) return;
        const empresaId = userData.empresaId;

        setLoading(true);
        try {
            const boletosRef = collection(db, 'EMPRESAS', empresaId, 'boletos');
            const q = query(boletosRef, where('mesReferencia', '==', selectedMonth));
            const snapshot = await getDocs(q);

            const map: Record<string, boolean> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.contratoId) {
                    map[data.contratoId] = true;
                }
            });

            setExistingBoletosMap(map);
        } catch (err) {
            console.error('Erro ao verificar boletos existentes:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadBoletos = async () => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;

        setLoading(true);
        try {
            const boletosRef = collection(db, 'EMPRESAS', empresaId, 'boletos');
            const q = query(
                boletosRef,
                where('mesReferencia', '==', selectedMonth)
            );

            const snapshot = await getDocs(q);
            const boletosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Boleto[];

            // Ordenar client-side
            boletosData.sort((a, b) => (a.numero > b.numero ? 1 : -1));

            setBoletos(boletosData);
        } catch (err: any) {
            console.error('Erro ao carregar boletos:', err);
            setError('Erro ao carregar boletos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadVendasPendentes = async () => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;

        setLoading(true);
        try {
            const contasRef = collection(db, 'EMPRESAS', empresaId, 'contas_receber');

            // Query simplificada para evitar necessidade de índice composto complexo
            // Trazemos todas as contas em aberto e filtramos o resto em memória
            const q = query(
                contasRef,
                where('status', '==', 'em_aberto')
            );

            const snapshot = await getDocs(q);
            const todasContas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filtro em memória: origem vendas, boleto e sem boleto gerado
            const vendasFiltradas = todasContas.filter((v: any) =>
                v.origem === 'vendas' &&
                (v.formaPagamento === 'boleto' || v.formaPagamento === 'Boleto') && // Case insensitive check just in case
                v.boletoGerado !== true &&
                !v.boletoId // Garantia extra
            );

            setVendasPendentes(vendasFiltradas);
        } catch (err: any) {
            console.error('Erro ao carregar vendas pendentes:', err);
            // Ignora erro de index por enquanto e tenta logar
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContratos();
        loadClientesMap(); // Carrega mapa de clientes
    }, [userData?.empresaId]);

    useEffect(() => {
        // Limpar estados que dependem do mês para evitar flash de dados antigos
        setExistingBoletosMap({});
        setVendasPendentes([]);
        setBoletos([]);

        checkExistingBoletos();
        loadBoletos();
        loadVendasPendentes();
    }, [selectedMonth, userData?.empresaId]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // === LÓGICA DE GERAÇÃO (TAB 0) ===

    // === LÓGICA DE GERAÇÃO (TAB 0) ===

    // Lista unificada para a tabela com filtros e ordenação
    const itemsToGenerate: GenerationItem[] = [
        ...contratos
            .filter(c => !existingBoletosMap[c.id])
            .map(c => ({
                id: c.id,
                type: 'contrato' as const,
                descricao: `Mensalidade`,
                numeroOrigem: c.numero,
                clienteNome: c.clienteNome,
                clientePrefixo: c.prefixoNome,
                vencimento: `Dia ${c.diaBoleto || 10}`,
                dataVencimentoObj: new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, c.diaBoleto || 10),
                valor: c.valorContrato,
                originalObj: c
            })),
        ...vendasPendentes
            .map(v => ({
                id: v.id,
                type: 'venda' as const,
                descricao: v.descricao || `Venda`,
                numeroOrigem: v.orcamentoNumero || v.numero || 'N/A',
                clienteNome: v.clienteNome,
                clientePrefixo: v.prefixoNome || v.clientePrefixo || clientesMap[v.clienteId], // Usa mapa se não tiver no obj
                vencimento: v.dataVencimento ? new Date(v.dataVencimento).toLocaleDateString('pt-BR') : 'A definir',
                dataVencimentoObj: v.dataVencimento ? new Date(v.dataVencimento) : new Date(),
                valor: v.valorFinal || v.valorOriginal || 0,
                originalObj: v
            }))
    ].filter(item => {
        // Filtro de Tipo
        if (filterType !== 'todos' && item.type !== filterType) return false;

        // Filtro de Texto (Nome ou Número)
        const search = searchTerm.toLowerCase();
        return (
            item.clienteNome.toLowerCase().includes(search) ||
            item.numeroOrigem.toLowerCase().includes(search)
        );
    }).sort((a, b) => {
        const timeA = a.dataVencimentoObj instanceof Date && !isNaN(a.dataVencimentoObj.getTime()) ? a.dataVencimentoObj.getTime() : 0;
        const timeB = b.dataVencimentoObj instanceof Date && !isNaN(b.dataVencimentoObj.getTime()) ? b.dataVencimentoObj.getTime() : 0;
        return timeA - timeB;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(itemsToGenerate.map(i => i.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectId = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleGerarBoletosUnificado = async () => {
        if (selectedIds.length === 0 || !userData?.empresaId) return;
        const empresaId = userData.empresaId;
        setGenerating(true);
        setError('');

        try {
            let geradosCount = 0;
            let sequenciaAtual = await getUltimoSequencial(selectedMonth);

            const [anoFull, mes] = selectedMonth.split('-');
            const ano = anoFull.slice(2);
            const prefixo = `BOL-${ano}${mes}`;

            // --- CONFIGURAÇÕES PADRÃO ---
            // Buscar Planos de Contas por CÓDIGO
            let planoContaId_Contrato = null, planoContaNome_Contrato = 'Receita de Contratos';
            let planoContaId_Venda = null, planoContaNome_Venda = 'Receita de Vendas';

            const pcQuery = query(collection(db, 'EMPRESAS', empresaId, 'plano_contas'), where('tipo', '==', 'receita'), where('ativo', '==', true));
            const pcSnap = await getDocs(pcQuery);
            if (!pcSnap.empty) {
                // Contratos: Código 1.001
                const pcContrato = pcSnap.docs.find(d => d.data().codigo === '1.001');
                if (pcContrato) {
                    planoContaId_Contrato = pcContrato.id;
                    planoContaNome_Contrato = pcContrato.data().nome;
                } else {
                    // Fallback
                    const pcFallback = pcSnap.docs.find(d => d.data().nome.toUpperCase().includes('CONTRATO') || d.data().nome.toUpperCase().includes('MENSALIDADE'));
                    if (pcFallback) { planoContaId_Contrato = pcFallback.id; planoContaNome_Contrato = pcFallback.data().nome; }
                }

                // Vendas: Código 1.003 (Default para vendas se não vier definido)
                const pcVenda = pcSnap.docs.find(d => d.data().codigo === '1.003');
                if (pcVenda) {
                    planoContaId_Venda = pcVenda.id;
                    planoContaNome_Venda = pcVenda.data().nome;
                } else {
                    // Fallback
                    const pcFallback = pcSnap.docs.find(d => d.data().nome.toUpperCase().includes('VENDA') && d.data().nome.toUpperCase().includes('EQUIPAMENTO'));
                    if (pcFallback) { planoContaId_Venda = pcFallback.id; planoContaNome_Venda = pcFallback.data().nome; }
                }
            }

            // Cache para evitar buscas repetidas de CC do mesmo cliente
            const clientCCMap: Record<string, { id: string, nome: string }> = {};

            // ------------------------------------------

            for (const id of selectedIds) {
                const item = itemsToGenerate.find(i => i.id === id);
                if (!item) continue;

                sequenciaAtual++;
                const numeroBoleto = `${prefixo}${sequenciaAtual.toString().padStart(5, '0')}`;

                let centroCustoId = '';
                let centroCustoNome = '';

                if (item.type === 'contrato') {
                    // === LÓGICA DE CONTRATO ===
                    const contrato = item.originalObj as Contrato;
                    const dia = Number(contrato.diaBoleto) || 10;
                    const dataVencimento = new Date(parseInt(anoFull), parseInt(mes) - 1, dia, 12, 0, 0);

                    // --- LÓGICA CENTRO DE CUSTO GRANULAR ---
                    if (clientCCMap[contrato.clienteNome]) {
                        centroCustoId = clientCCMap[contrato.clienteNome].id;
                        centroCustoNome = clientCCMap[contrato.clienteNome].nome;
                    } else {
                        // 2. Buscar/Criar CC Específico do Cliente
                        try {
                            // Buscar Grupo CC-CLIENTES
                            const gruposRef = collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos');
                            const qGrupo = query(gruposRef, where('codigo', '==', 'CC-CLIENTES'));
                            const snapGrupo = await getDocs(qGrupo);
                            let grupoId = '';
                            let grupoNome = 'CLIENTES';
                            let grupoCodigo = 'CC-CLIENTES';

                            if (!snapGrupo.empty) {
                                grupoId = snapGrupo.docs[0].id;
                                const grupoData = snapGrupo.docs[0].data();
                                grupoNome = grupoData.nome;

                                // Fix: Atualizar nome se estiver incorreto (ex: "VENDAS DE PRODUTOS" ou "MENSALIDADES DE CONTRATOS")
                                if (grupoNome !== 'CLIENTES') {
                                    console.log(`Corrigindo nome do Grupo CC-CLIENTES de "${grupoNome}" para "CLIENTES"`);
                                    await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centro_custo_grupos', grupoId), {
                                        nome: 'CLIENTES',
                                        atualizadoEm: new Date().toISOString()
                                    });
                                    grupoNome = 'CLIENTES';
                                }
                            } else {
                                const novoGrupo = await addDoc(gruposRef, {
                                    codigo: 'CC-CLIENTES',
                                    nome: 'CLIENTES',
                                    permiteReceita: true,
                                    permiteDespesa: true,
                                    descricao: 'Grupo automático',
                                    criadoEm: new Date().toISOString()
                                });
                                grupoId = novoGrupo.id;
                            }

                            // Gerar Código e Buscar CC
                            const cleanName = contrato.clienteNome
                                .toUpperCase()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^A-Z0-9 ]/g, "")
                                .trim()
                                .replace(/\s+/g, "-");
                            const novoCodigo = `CC-${cleanName}`.substring(0, 30);

                            const ccRef = collection(db, 'EMPRESAS', empresaId, 'centros_custo');
                            const qCC = query(ccRef, where('codigo', '==', novoCodigo));
                            const snapCC = await getDocs(qCC);

                            const nomeCC = contrato.prefixoNome
                                ? `${contrato.prefixoNome} ${contrato.clienteNome}`
                                : contrato.clienteNome;

                            if (!snapCC.empty) {
                                centroCustoId = snapCC.docs[0].id;
                                centroCustoNome = snapCC.docs[0].data().nome; // Usa nome existente
                            } else {
                                const novoCC = await addDoc(ccRef, {
                                    nome: nomeCC,
                                    codigo: novoCodigo,
                                    grupoId,
                                    grupoNome,
                                    grupoCodigo,
                                    permiteReceita: true,
                                    permiteDespesa: true,
                                    origensPermitidas: ['contrato', 'venda', 'manual'],
                                    ativo: true,
                                    criadoEm: new Date().toISOString(),
                                    empresaId
                                });
                                centroCustoId = novoCC.id;
                                centroCustoNome = nomeCC;
                            }

                            // Salvar no cache
                            clientCCMap[contrato.clienteNome] = { id: centroCustoId, nome: centroCustoNome };

                        } catch (errCC) {
                            console.error("Erro ao gerar CC para contrato:", errCC);
                            // Fallback para Geral se der erro
                            centroCustoNome = 'Geral (Fallback)';
                        }
                    }

                    const boletoData = {
                        numero: numeroBoleto,
                        mesReferencia: selectedMonth,
                        anoReferencia: parseInt(anoFull),
                        mesNumero: parseInt(mes),
                        contratoId: contrato.id,
                        contratoNumero: contrato.numero,
                        clienteId: contrato.clienteId,
                        clienteNome: contrato.clienteNome,
                        clientePrefixo: contrato.prefixoNome || '',
                        clienteCnpjCpf: contrato.clienteCnpjCpf || '',
                        clienteEmail: contrato.clienteEmail || '',
                        valor: contrato.valorContrato,
                        dataVencimento: Timestamp.fromDate(dataVencimento),
                        status: 'pendente',
                        bancoId: contrato.bancoId || '',
                        bancoNome: contrato.bancoNome || '',
                        enviadoBanco: false,
                        emailEnviado: false,
                        criadoEm: Timestamp.now(),
                        criadoPor: userData?.id || 'sistema',
                        atualizadoEm: Timestamp.now(),
                    };

                    const docRef = await addDoc(collection(db, 'EMPRESAS', empresaId, 'boletos'), boletoData);

                    const contaReceberData = {
                        empresaId: empresaId,
                        numero: numeroBoleto,
                        tipo: 'boleto',
                        boletoId: docRef.id,
                        contratoId: contrato.id,
                        clienteId: contrato.clienteId,
                        clienteNome: contrato.clienteNome,
                        clientePrefixo: contrato.prefixoNome || '',
                        descricao: `Mensalidade Contrato ${contrato.numero} - ${mes}/${anoFull}`,
                        valorOriginal: contrato.valorContrato,
                        valorAcrescimos: 0,
                        valorDesconto: 0,
                        valorFinal: contrato.valorContrato,
                        dataVencimento: selectedMonth + '-' + dia.toString().padStart(2, '0'),
                        dataEmissao: new Date().toISOString().split('T')[0],
                        formaPagamento: 'boleto',
                        status: 'em_aberto',
                        planoContaId: planoContaId_Contrato,
                        planoContaNome: planoContaNome_Contrato,
                        centroCustoId: centroCustoId,
                        centroCustoNome: centroCustoNome,
                        criadoPor: userData?.id || 'sistema',
                        criadoEm: Timestamp.now(),
                        atualizadoEm: Timestamp.now(),
                        observacoes: `Boleto ${numeroBoleto} gerado via Gestão de Boletos`
                    };

                    await addDoc(collection(db, 'EMPRESAS', empresaId, 'contas_receber'), contaReceberData);

                } else {
                    // === LÓGICA DE VENDA ===
                    const contaVenda = item.originalObj;

                    // Calcular Vencimento
                    let dataVencimento: Date;
                    if (contaVenda.dataVencimento) {
                        const partes = contaVenda.dataVencimento.split('-');
                        dataVencimento = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0);
                    } else {
                        dataVencimento = new Date();
                    }

                    const boletoData = {
                        numero: numeroBoleto,
                        mesReferencia: selectedMonth, // Mantém mês de referência selecionado na tela, ou poderia usar o da venda? Tela manda.
                        anoReferencia: parseInt(anoFull),
                        mesNumero: parseInt(mes),
                        contratoId: null,
                        origem: 'venda',
                        origemId: contaVenda.origemId || null,
                        clienteId: contaVenda.clienteId,
                        clienteNome: contaVenda.clienteNome,
                        clientePrefixo: contaVenda.prefixoNome || '',
                        clienteCnpjCpf: '',
                        valor: contaVenda.valorFinal,
                        dataVencimento: Timestamp.fromDate(dataVencimento),
                        status: 'pendente',
                        bancoId: '',
                        enviadoBanco: false,
                        emailEnviado: false,
                        criadoEm: Timestamp.now(),
                        criadoPor: userData?.id || 'sistema',
                        atualizadoEm: Timestamp.now(),
                    };

                    const docRef = await addDoc(collection(db, 'EMPRESAS', empresaId, 'boletos'), boletoData);

                    // ATUALIZAR CONTA EXISTENTE
                    const contaRef = doc(db, 'EMPRESAS', empresaId, 'contas_receber', contaVenda.id);
                    await updateDoc(contaRef, {
                        boletoId: docRef.id,
                        numero: numeroBoleto,
                        tipo: 'boleto',
                        boletoGerado: true,
                        planoContaId: contaVenda.planoContaId || planoContaId_Venda,
                        planoContaNome: contaVenda.planoContaNome || planoContaNome_Venda,
                        centroCustoId: contaVenda.centroCustoId || centroCustoId,
                        centroCustoNome: contaVenda.centroCustoNome || centroCustoNome,
                        atualizadoEm: Timestamp.now(),
                        observacoes: (contaVenda.observacoes || '') + `\nBoleto ${numeroBoleto} gerado em ${new Date().toLocaleDateString()}`
                    });
                }

                geradosCount++;
            }

            setSuccess(`${geradosCount} boletos gerados com sucesso!`);
            setSelectedIds([]);
            checkExistingBoletos();
            loadBoletos();
            loadVendasPendentes(); // Recarrega para remover os que foram gerados

        } catch (err: any) {
            console.error('Erro ao gerar boletos:', err);
            setError('Erro ao gerar boletos: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    // === AÇÕES DE BOLETO (TAB 1) ===

    const handlePrintBoleto = async (boleto: Boleto) => {
        try {
            setLoading(true);
            if (!userData?.empresaId) return;
            const empresaId = userData.empresaId;

            let logoUrl = '';
            // Tentar logo da empresa
            try {
                const empresaRef = doc(db, 'EMPRESAS', empresaId);
                const empresaSnap = await getDoc(empresaRef);
                if (empresaSnap.exists()) {
                    logoUrl = empresaSnap.data().logoUrl || '';
                }
            } catch (e) {
                console.log("Sem logo de empresa carregado");
            }

            // Tentar template
            let corpoTemplate = '';
            try {
                const modeloRef = doc(db, 'EMPRESAS', empresaId, 'parametrosComerciais', 'modeloBoleto');
                const modeloSnap = await getDoc(modeloRef);
                if (modeloSnap.exists()) {
                    corpoTemplate = modeloSnap.data().corpo || '';
                }
            } catch (e) {
                console.log("Sem template salvo, usando padrao");
            }


            if (!corpoTemplate) {
                // Template Padrão (Simples)
                corpoTemplate = `
<div style="font-family: Arial, sans-serif; font-size: 11px; width: 100%; max-width: 800px; margin: 0 auto; border: 1px dashed #ccc; padding: 20px;">
    <!-- Recibo do Sacado -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="border-bottom: 2px dashed #000; padding: 5px; font-weight: bold; font-size: 14px;">RECIBO DO PAGADOR</td>
        </tr>
    </table>
    
    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
        <tr>
             <td style="border: 1px solid #000; padding: 2px;" width="20%"><div style="font-size:9px">Nosso Número</div><strong>{{BOLETO_NUMERO}}</strong></td>
             <td style="border: 1px solid #000; padding: 2px;" width="20%"><div style="font-size:9px">Vencimento</div><strong>{{VENCIMENTO}}</strong></td>
             <td style="border: 1px solid #000; padding: 2px;" width="60%"><div style="font-size:9px">Agência/Código Cedente</div><strong>{{AGENCIA_CODIGO}}</strong></td>
        </tr>
        <tr>
             <td style="border: 1px solid #000; padding: 2px;" colspan="3"><div style="font-size:9px">Pagador</div>{{NOME_CLIENTE}}</td>
        </tr>
    </table>
    <br/><br/>
    
    <!-- Cabeçalho do Boleto -->
    <table style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 2px;">
        <tr>
            <td style="width: 50px; border-right: 2px solid #000; padding: 5px;"><img src="https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-0.png" style="width: 30px;" /></td>
            <td style="width: 60px; border-right: 2px solid #000; font-size: 20px; font-weight: bold; text-align: center; padding: 5px;">001-9</td>
            <td style="text-align: right; font-size: 14px; font-weight: bold; padding: 5px;">{{DIGITAVEL}}</td>
        </tr>
    </table>

    <!-- Campos do Boleto -->
    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
        <tr>
            <td colspan="5" style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Local de Pagamento</div>
                PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 130px; background: #eee;">
                <div style="font-size: 9px;">Vencimento</div>
                <strong>{{VENCIMENTO}}</strong>
            </td>
        </tr>
        <tr>
            <td colspan="5" style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Beneficiário</div>
                SUA EMPRESA LTDA - CNPJ: 00.000.000/0001-00
            </td>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Agência / Código Cedente</div>
                {{AGENCIA_CODIGO}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Data Documento</div>
                {{DATA_DOCUMENTO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Nº do Documento</div>
                {{NOSSO_NUMERO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 60px;">
                <div style="font-size: 9px;">Espécie Doc.</div>
                {{ESPECIE_DOC}}
            </td>
             <td style="border: 1px solid #000; padding: 2px; width: 40px;">
                <div style="font-size: 9px;">Aceite</div>
                {{ACEITE}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Data Processamento</div>
                {{DATA_DOCUMENTO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Nosso Número</div>
                {{BOLETO_NUMERO}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Uso do Banco</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Carteira</div>
                {{CARTEIRA}}
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Espécie</div>
                R$
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Quantidade</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Valor</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px; background: #eee;">
                <div style="font-size: 9px;">(=) Valor do Documento</div>
                <strong>{{VALOR}}</strong>
            </td>
        </tr>
        <tr>
             <td colspan="5" rowspan="5" style="border: 1px solid #000; padding: 10px; vertical-align: top;">
                <div style="font-size: 9px; margin-bottom: 5px;">Instruções (Texto de responsabilidade do beneficiário)</div>
                {{INSTRUCOES}}
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(-) Desconto / Abatimento</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(-) Outras Deduções</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(+) Mora / Multa</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(+) Outros Acréscimos</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px; background: #eee;">
                <div style="font-size: 9px;">(=) Valor Cobrado</div>
            </td>
        </tr>
         <tr>
             <td colspan="6" style="border: 1px solid #000; padding: 5px;">
                <div style="font-size: 9px;">Pagador</div>
                {{NOME_CLIENTE}} - {{CNPJ_CPF}}<br/>
                {{ENDERECO_COMPLETO}}<br/>
            </td>
        </tr>
    </table>
    <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
        <div style="font-size: 9px; text-align: right;">Autenticação Mecânica</div>
        <br/>
        <!-- Código de Barras Falso (apenas visual) -->
        <div style="height: 50px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 8px); width: 350px;"></div>
    </div>
</div>`;
            }

            const boletoData = {
                boletoNumero: boleto.numero || '?',
                digitavel: '00190.00009 01234.567891 00000.000000 1 00000000015000',
                vencimento: boleto.dataVencimento?.toDate().toLocaleDateString('pt-BR') || '??/??/????',
                valor: formatCurrency(boleto.valor),
                agenciaCodigo: '1234 / 56789-0',
                nossoNumero: boleto.numero.replace(/\D/g, '').slice(-9) || '123456789',
                carteira: '17',
                dataDocumento: boleto.criadoEm?.toDate().toLocaleDateString('pt-BR') || '',
                especieDoc: 'DM',
                aceite: 'N',
                instrucoes: 'Sr. Caixa, cobrar juros de mora de 1% ao mês.<br/>Não receber após 30 dias do vencimento.',
                nomeCliente: boleto.clienteNome || 'Cliente Não Identificado',
                cnpjCpf: boleto.clienteCnpjCpf || '',
                endereco: 'Endereço não cadastrado',
                logoUrl: logoUrl
            };

            const htmlFinal = corpoTemplate
                .replace(/\{\{BOLETO_NUMERO\}\}/g, boletoData.boletoNumero)
                .replace(/\{\{DIGITAVEL\}\}/g, boletoData.digitavel)
                .replace(/\{\{VENCIMENTO\}\}/g, boletoData.vencimento)
                .replace(/\{\{VALOR\}\}/g, boletoData.valor)
                .replace(/\{\{AGENCIA_CODIGO\}\}/g, boletoData.agenciaCodigo)
                .replace(/\{\{NOSSO_NUMERO\}\}/g, boletoData.nossoNumero)
                .replace(/\{\{CARTEIRA\}\}/g, boletoData.carteira)
                .replace(/\{\{DATA_DOCUMENTO\}\}/g, boletoData.dataDocumento)
                .replace(/\{\{ESPECIE_DOC\}\}/g, boletoData.especieDoc)
                .replace(/\{\{ACEITE\}\}/g, boletoData.aceite)
                .replace(/\{\{INSTRUCOES\}\}/g, boletoData.instrucoes)
                .replace(/\{\{NOME_CLIENTE\}\}/g, boletoData.nomeCliente)
                .replace(/\{\{CNPJ_CPF\}\}/g, boletoData.cnpjCpf)
                .replace(/\{\{ENDERECO_COMPLETO\}\}/g, boletoData.endereco);

            imprimirHTMLViaIframe(htmlFinal);

        } catch (err: any) {
            console.error('Erro ao imprimir boleto:', err);
            setError('Erro ao imprimir boleto: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelarBoleto = async (boleto: Boleto) => {
        if (!window.confirm(`Tem certeza que deseja CANCELAR o boleto ${boleto.numero}? Ele permanecerá no sistema como cancelado.`)) return;
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;

        try {
            setLoading(true);
            await updateDoc(doc(db, 'EMPRESAS', empresaId, 'boletos', boleto.id), {
                status: 'cancelado',
                observacao: 'Cancelado pelo usuário',
                atualizadoEm: Timestamp.now()
            });

            const contasRef = collection(db, 'EMPRESAS', empresaId, 'contas_receber');
            const q = query(contasRef, where('boletoId', '==', boleto.id));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const contaDoc = snapshot.docs[0];
                await updateDoc(contaDoc.ref, {
                    status: 'cancelado',
                    observacoes: `Boleto ${boleto.numero} cancelado pelo usuário`,
                    atualizadoEm: Timestamp.now()
                });
            }

            setSuccess(`Boleto ${boleto.numero} cancelado com sucesso.`);
            loadBoletos();
            checkExistingBoletos();

        } catch (err: any) {
            console.error('Erro ao cancelar boleto:', err);
            setError('Erro ao cancelar boleto: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDeleteDialog = (boleto: Boleto) => {
        setSelectedBoletoToDelete(boleto);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setSelectedBoletoToDelete(null);
    };

    const handleExcluirBoleto = async () => {
        if (!selectedBoletoToDelete || !userData?.empresaId) return;
        const empresaId = userData.empresaId;

        try {
            setLoading(true);
            await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'boletos', selectedBoletoToDelete.id));

            const contasRef = collection(db, 'EMPRESAS', empresaId, 'contas_receber');
            const q = query(contasRef, where('boletoId', '==', selectedBoletoToDelete.id));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const contaDoc = snapshot.docs[0];
                await deleteDoc(contaDoc.ref);
            }

            setSuccess(`Boleto ${selectedBoletoToDelete.numero} excluído com sucesso.`);
            loadBoletos();
            checkExistingBoletos();
            handleCloseDeleteDialog();

        } catch (err: any) {
            console.error('Erro ao excluir boleto:', err);
            setError('Erro ao excluir boleto: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            {/* Cabeçalho */}
            <Box className="flex items-center justify-between mb-6">
                <Box className="flex-1" />
                <Typography variant="h4" className="font-bold">
                    Gestão de Boletos (Emissão)
                </Typography>
                <Box className="flex-1" />
            </Box>

            {error && (
                <Alert severity="error" className="mb-4" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" className="mb-4" onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab icon={<Add />} label="Gerar Boletos" />
                    <Tab icon={<ReceiptLong />} label="Boletos Emitidos" />
                </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        type="month"
                        label="Mês de Referência"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        size="small"
                        sx={{ width: 180 }}
                    />

                    <TextField
                        select
                        label="Tipo"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        size="small"
                        sx={{ width: 150 }}
                    >
                        <MenuItem value="todos">Todos</MenuItem>
                        <MenuItem value="contrato">Contratos</MenuItem>
                        <MenuItem value="venda">Vendas</MenuItem>
                    </TextField>

                    <TextField
                        label="Buscar (Cliente ou Nº)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        sx={{ width: 250 }}
                        placeholder="Nome ou Nº Origem"
                    />

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <Add />}
                        onClick={handleGerarBoletosUnificado}
                        disabled={generating || selectedIds.length === 0}
                    >
                        {generating ? 'Gerando...' : `Gerar (${selectedIds.length})`}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : itemsToGenerate.length === 0 ? (
                    <Alert severity="info">Nenhum item encontrado para os filtros selecionados.</Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={itemsToGenerate.length > 0 && selectedIds.length === itemsToGenerate.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell><strong>Origem</strong></TableCell>
                                    <TableCell><strong>Cliente</strong></TableCell>
                                    <TableCell><strong>Vencimento</strong></TableCell>
                                    <TableCell align="right"><strong>Valor</strong></TableCell>
                                    <TableCell align="center"><strong>Tipo</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itemsToGenerate.map((item) => (
                                    <TableRow key={item.id} hover selected={selectedIds.includes(item.id)}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleSelectId(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell><strong>{item.descricao}</strong></TableCell>
                                        <TableCell>
                                            {item.clientePrefixo && `${item.clientePrefixo} `}{item.clienteNome}
                                        </TableCell>
                                        <TableCell>{item.vencimento}</TableCell>
                                        <TableCell align="right">{formatCurrency(item.valor)}</TableCell>
                                        <TableCell align="center">
                                            {item.type === 'venda' ? (
                                                <Chip label="Venda" size="small" color="warning" sx={{ fontWeight: 'bold' }} />
                                            ) : (
                                                <Chip
                                                    label="Contrato"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#ce93d8', // Lilás Claro (MUI Purple 200)
                                                        color: '#ffffff', // Letras Brancas
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <Paper sx={{ p: 3 }}>
                    <Box className="flex flex-col md:flex-row gap-4 mb-6">
                        <TextField
                            type="month"
                            label="Filtrar por Mês"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{ width: 200 }}
                        />
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
                                    <TableRow>
                                        <TableCell><strong>Criação</strong></TableCell>
                                        <TableCell><strong>Número</strong></TableCell>
                                        <TableCell><strong>Cliente</strong></TableCell>
                                        <TableCell><strong>Vencimento</strong></TableCell>
                                        <TableCell><strong>Valor</strong></TableCell>
                                        <TableCell><strong>Status</strong></TableCell>
                                        <TableCell align="right"><strong>Ações</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {boletos.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                Nenhum boleto encontrado para este mês.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        boletos.map((boleto) => (
                                            <TableRow key={boleto.id} hover>
                                                <TableCell sx={{ py: 0.25 }}>
                                                    {boleto.criadoEm?.toDate().toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell sx={{ py: 0.25 }}>{boleto.numero}</TableCell>
                                                <TableCell sx={{ py: 0.25 }}>
                                                    {boleto.clientePrefixo && `${boleto.clientePrefixo} `}{boleto.clienteNome}
                                                </TableCell>
                                                <TableCell sx={{ py: 0.25 }}>
                                                    {boleto.dataVencimento?.toDate().toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell sx={{ py: 0.25 }}>{formatCurrency(boleto.valor)}</TableCell>
                                                <TableCell sx={{ py: 0.25 }}>
                                                    <Chip
                                                        label={boleto.status.toUpperCase()}
                                                        color={
                                                            boleto.status === 'pago' ? 'success' :
                                                                boleto.status === 'cancelado' ? 'error' :
                                                                    boleto.status === 'pendente' ? 'warning' : 'default'
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ py: 0.25 }}>
                                                    <ActionPrint
                                                        title="Imprimir Boleto"
                                                        onClick={() => handlePrintBoleto(boleto)}
                                                    />

                                                    {boleto.status !== 'cancelado' && (
                                                        <ActionCancel
                                                            title="Cancelar Boleto"
                                                            onClick={() => handleCancelarBoleto(boleto)}
                                                        />
                                                    )}

                                                    <ActionDelete
                                                        title="Excluir Registro"
                                                        onClick={() => handleOpenDeleteDialog(boleto)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            </TabPanel>

            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography>
                        Tem certeza que deseja excluir o boleto <strong>{selectedBoletoToDelete?.numero}</strong>?
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Isso também excluirá a conta a receber vinculada no financeiro!
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
                    <Button onClick={handleExcluirBoleto} color="error" variant="contained">Excluir</Button>
                </DialogActions>
            </Dialog>

        </Box >
    );
};


