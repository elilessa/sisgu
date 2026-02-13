import React from 'react';
import { useState, useEffect } from 'react';
import { customColors } from '../theme';

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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  MenuItem,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  Collapse,
  Tooltip,
} from '@mui/material';
import { Add, ExpandMore, CheckCircle, Cancel, KeyboardArrowDown, KeyboardArrowUp, WhatsApp } from '@mui/icons-material';
import { formatCnpjCpf, formatTelefone } from '../utils/masks';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  arrayUnion,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { gerarCabecalhoEmpresaHTML, gerarLayoutDocumentoHTML, imprimirHTMLViaIframe } from '../utils/printUtils';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ActionEdit, ActionDelete, ActionSend, ActionPdf, StatusChip } from '../components/TableActions';
import { sendOrcamentoEmail } from '../services/emailService';
import { gerarPDFBase64 } from '../utils/printUtils';

export interface OrcamentoEquipamento {
  id: string;
  numero: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  prefixoNome?: string; // Padronizado com Clientes
  vendedorId?: string;
  vendedorNome?: string;
  itens: ItemOrcamento[];
  valorTotal: number;
  desconto?: number;
  status: 'em_elaboracao' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado';
  dataEmissao: Timestamp;
  dataValidade: Timestamp;
  observacao: string;
  nomeContato?: string;
  emailContato?: string;
  telefoneContato?: string;
  cargoContato?: string;
  vendaGerada?: boolean;
  pagamento?: PagamentoData;
  chamadoId?: string;
  chamadoNumeroOS?: string;
  pendenciaOrigem?: any;
  historicoOperacoes?: HistoricoOperacao[];
  motivoReprovacao?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface PagamentoData {
  tipoPagamento: 'a_vista' | 'parcelado';
  aVista?: {
    dataVencimento: string;
    formaPagamento: string;
  };
  parcelado?: {
    entrada: boolean;
    valorEntrada?: number;
    formaPagamentoEntrada?: string;
    diaVencimentoEntrada?: number;
    numeroParcelas: number;
    formaPagamentoParcelas: string;
    diaVencimentoParcelas: number;
  };
}

interface ItemOrcamento {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  fabricanteNome: string;
  descricaoLivre?: string;
  equipamentoTextoLivre?: string;
}

interface HistoricoOperacao {
  data: Timestamp;
  usuario: string;
  usuarioId: string;
  acao: string;
  detalhes?: string;
}

interface Cliente {
  id: string;
  nome: string;
  prefixoNome?: string;
  cnpjCpf: string;
  contatoAtual?: string;
  contatoFuncao?: string;
  contatoTelefone?: string;
  contatoWhatsapp?: string;
  contatoApto?: string; // Novo campo
  contatoEmail1?: string;
  contatoEmail2?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

interface Produto {
  id: string;
  partNumber: string;
  nome: string;
  categoriaId: string;
  fabricanteId: string;
  fabricanteNome: string; // Resolvido via join
  precoVenda: number; // Resolvido via Precificação
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
}

const STATUS_OPTIONS = [
  { value: 'em_elaboracao', label: 'Em Elaboração', color: 'warning' },
  { value: 'enviado', label: 'Enviado', color: 'info' },
  { value: 'aprovado', label: 'Aprovado', color: 'success' },
  { value: 'reprovado', label: 'Reprovado', color: 'error' },
  { value: 'expirado', label: 'Expirado', color: 'default' },
];

const FORMAS_PAGAMENTO = [
  'Pix',
  'Transferência Bancária',
  'Cartão de Crédito',
  'Dinheiro',
  'Cartão de Débito',
  'Boleto',
];

const valorPorExtenso = (v: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

export function OrcamentosEquipamentos() {
  const { userData } = useAuth();
  const [orcamentos, setOrcamentos] = useState<OrcamentoEquipamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoEquipamento | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabDialogValue, setTabDialogValue] = useState(0);
  const [tabValue, setTabValue] = useState(0); // Controle de abas principais

  // Estados para envio de email
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [orcamentoParaEmail, setOrcamentoParaEmail] = useState<OrcamentoEquipamento | null>(null);

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    clienteId: '',
    clienteNome: '',
    prefixoNome: '',
    nomeContato: '',
    emailContato: '',
    telefoneContato: '',
    cargoContato: '',
    vendedorId: '',
    vendedorNome: '',
    itens: [] as ItemOrcamento[],
    valorTotal: 0,
    desconto: 0,
    status: 'em_elaboracao' as OrcamentoEquipamento['status'],
    dataEmissao: new Date().toISOString().split('T')[0],
    dataValidade: '',
    observacao: '',
    pagamento: {
      tipoPagamento: 'a_vista' as 'a_vista' | 'parcelado',
      aVista: {
        dataVencimento: '',
        formaPagamento: '',
      },
      parcelado: {
        entrada: false,
        valorEntrada: 0,
        formaPagamentoEntrada: '',
        diaVencimentoEntrada: 1,
        numeroParcelas: 1,
        formaPagamentoParcelas: '',
        diaVencimentoParcelas: 1,
      },
    },
  });

  const [itemFormData, setItemFormData] = useState({
    produtoId: '',
    quantidade: 1,
    valorUnitario: 0,
    descricaoLivre: '',
    equipamentoTextoLivre: '',
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [expandedOrcamento, setExpandedOrcamento] = useState<string | false>(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [hasEquipamentoRetirado, setHasEquipamentoRetirado] = useState(false);
  const [itemType, setItemType] = useState<'produto' | 'servico'>('produto');
  const [migrating, setMigrating] = useState(false);

  // Filtros Avançados
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleMigrarDeContratos = async () => {
    if (!userData?.empresaId) return;
    if (!window.confirm("Isso vai buscar os Orçamentos de Equipamentos que estavam misturados na coleção 'Contratos' e copiá-los para a nova coleção organizada. Continuar?")) return;

    setMigrating(true);
    try {
      const empresaId = userData.empresaId;
      // FONTE: Contratos (Conforme orientação do usuário)
      const sourceRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
      const snap = await getDocs(sourceRef);
      let count = 0;

      for (const d of snap.docs) {
        const data = d.data();

        // FILTRO INTELIGENTE:
        // Se tem 'equipamentosCobertos', é CONTRATO -> Pula.
        // Se tem 'itens' e NÃO tem 'equipamentosCobertos', é EQUIPAMENTO -> Copia.
        if (data.equipamentosCobertos || data.tipoContrato) continue;
        if (!data.itens) continue; // Ignora lixo ou dados incompletos

        const newRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos', d.id);
        const exists = await getDoc(newRef);

        if (!exists.exists()) {
          // Copia e marca migração
          await setDoc(newRef, { ...data, migradoDe: 'contratos', migradoEm: Timestamp.now() });
          count++;
        }
      }
      setSuccess(`${count} orçamentos recuperados de 'Contratos' com sucesso!`);
      loadOrcamentos();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao migrar: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    loadOrcamentos();
    loadClientes();
    loadProdutos();
    loadUsuarios();
    loadEmpresaData();
  }, [userData]);

  const loadEmpresaData = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;
    try {
      const docRef = doc(db, 'EMPRESAS', empresaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setEmpresaData(docSnap.data());
    } catch (error) { console.error('Erro ao carregar empresa:', error); }
  };

  const loadOrcamentos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoading(true);
    try {
      // ATUALIZADO: Usando a coleção dedicada
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos');
      const snapshot = await getDocs(orcamentosRef);

      const orcamentosList: OrcamentoEquipamento[] = [];
      snapshot.forEach((doc) => {
        orcamentosList.push({ id: doc.id, ...doc.data() } as OrcamentoEquipamento);
      });

      setOrcamentos(orcamentosList);
    } catch (err: any) {
      setError('Erro ao carregar orçamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const clientesRef = collection(db, 'EMPRESAS', empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);

      const clientesList: Cliente[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientesList.push({
          id: doc.id,
          nome: data.nome || '',
          prefixoNome: data.prefixoNome,
          cnpjCpf: data.cnpjCpf || '',
          contatoAtual: data.contatoAtual || '',
          contatoFuncao: data.contatoFuncao || '',
          contatoTelefone: data.contatoTelefone || '',
          contatoWhatsapp: data.contatoWhatsapp || '',
          contatoEmail1: data.contatoEmail1 || '',
          contatoEmail2: data.contatoEmail2 || '',
          contatoApto: data.contatoApto || '', // Added per request
          endereco: data.endereco || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          cep: data.cep || '',
        });
      });

      setClientes(clientesList.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;

    try {
      const dbRef = db;
      const empresaId = userData.empresaId;

      // Buscar Coleções em Paralelo
      const [prodSnap, fabSnap, precSnap] = await Promise.all([
        getDocs(collection(dbRef, 'EMPRESAS', empresaId, 'produtos')),
        getDocs(collection(dbRef, 'EMPRESAS', empresaId, 'fabricantes')),
        getDocs(collection(dbRef, 'EMPRESAS', empresaId, 'precificacao'))
      ]);

      // Mapas para Lookup
      const fabricantesMap = new Map<string, string>();
      fabSnap.docs.forEach(d => fabricantesMap.set(d.id, d.data().nome));

      const precosMap = new Map<string, number>();
      precSnap.docs.forEach(d => {
        // Assume que o ID do doc de precificação é o mesmo do produto
        // Usa valorTotal como preço de venda sugerido
        precosMap.set(d.id, d.data().valorTotal || 0);
      });

      const produtosList: Produto[] = [];
      prodSnap.docs.forEach((doc) => {
        const data = doc.data();
        produtosList.push({
          id: doc.id,
          partNumber: data.partNumber || '',
          nome: data.nome || 'Produto sem nome',
          categoriaId: data.categoriaId || '',
          fabricanteId: data.fabricanteId || '',
          fabricanteNome: data.fabricanteId ? (fabricantesMap.get(data.fabricanteId) || 'N/A') : (data.fabricanteNome || 'N/A'),
          precoVenda: precosMap.get(doc.id) || 0
        } as Produto);
      });

      setProdutos(produtosList);
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const loadUsuarios = async () => {
    if (!userData?.empresaId) return;

    try {
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, where('empresaId', '==', userData.empresaId));
      const snapshot = await getDocs(q);

      const usuariosList: Usuario[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usuariosList.push({
          id: doc.id,
          nome: data.nome || '',
          email: data.email || '',
          role: data.role || '',
        });
      });

      setUsuarios(usuariosList);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const gerarNumeroOrcamento = async (): Promise<string> => {
    if (!userData?.empresaId) return '';
    const empresaId = userData.empresaId;

    const now = new Date();
    const ano = now.getFullYear().toString().slice(-2);
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `ORÇ-${ano}${mes}`;

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos');
      const q = query(
        orcamentosRef,
        where('numero', '>=', prefixo),
        where('numero', '<', `ORÇ-${ano}${mes}99999`),
        orderBy('numero', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      let proximoNumero = 1;
      if (!snapshot.empty) {
        const ultimoNumero = snapshot.docs[0].data().numero;
        const sequencial = parseInt(ultimoNumero.slice(-5));
        proximoNumero = sequencial + 1;
      }

      return `${prefixo}${proximoNumero.toString().padStart(5, '0')}`;
    } catch (err) {
      console.error('Erro ao gerar número do orçamento:', err);
      return `${prefixo}00001`;
    }
  };

  const handleOpenDialog = async (orcamento?: OrcamentoEquipamento) => {
    setError('');
    setTabDialogValue(0);
    if (orcamento) {
      setIsEditing(true);
      setSelectedOrcamento(orcamento);
      setFormData({
        numero: orcamento.numero,
        titulo: orcamento.titulo,
        clienteId: orcamento.clienteId,
        clienteNome: orcamento.clienteNome,
        prefixoNome: orcamento.prefixoNome || '',
        nomeContato: orcamento.nomeContato || '',
        emailContato: orcamento.emailContato || '',
        telefoneContato: orcamento.telefoneContato || '',
        cargoContato: orcamento.cargoContato || '',
        vendedorId: orcamento.vendedorId || '',
        vendedorNome: orcamento.vendedorNome || '',
        itens: orcamento.itens,
        valorTotal: orcamento.valorTotal,
        desconto: orcamento.desconto || 0,
        status: orcamento.status,
        dataEmissao: orcamento.dataEmissao.toDate().toISOString().split('T')[0],
        dataValidade: orcamento.dataValidade.toDate().toISOString().split('T')[0],
        observacao: orcamento.observacao,
        pagamento: {
          tipoPagamento: orcamento.pagamento?.tipoPagamento || 'a_vista',
          aVista: {
            dataVencimento: orcamento.pagamento?.aVista?.dataVencimento || '',
            formaPagamento: orcamento.pagamento?.aVista?.formaPagamento || '',
          },
          parcelado: {
            entrada: orcamento.pagamento?.parcelado?.entrada || false,
            valorEntrada: orcamento.pagamento?.parcelado?.valorEntrada || 0,
            formaPagamentoEntrada: orcamento.pagamento?.parcelado?.formaPagamentoEntrada || '',
            diaVencimentoEntrada: orcamento.pagamento?.parcelado?.diaVencimentoEntrada || 1,
            numeroParcelas: orcamento.pagamento?.parcelado?.numeroParcelas || 1,
            formaPagamentoParcelas: orcamento.pagamento?.parcelado?.formaPagamentoParcelas || '',
            diaVencimentoParcelas: orcamento.pagamento?.parcelado?.diaVencimentoParcelas || 1,
          }
        },
      });
    } else {
      setIsEditing(false);
      setSelectedOrcamento(null);
      const novoNumero = await gerarNumeroOrcamento();
      setFormData({
        numero: novoNumero,
        titulo: '',
        clienteId: '',
        clienteNome: '',
        prefixoNome: '',
        nomeContato: '',
        emailContato: '',
        telefoneContato: '',
        cargoContato: '',
        vendedorId: '',
        vendedorNome: '',
        itens: [],
        valorTotal: 0,
        desconto: 0,
        status: 'em_elaboracao',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataValidade: '',
        observacao: '',
        pagamento: {
          tipoPagamento: 'a_vista',
          aVista: {
            dataVencimento: '',
            formaPagamento: '',
          },
          parcelado: {
            entrada: false,
            valorEntrada: 0,
            formaPagamentoEntrada: '',
            diaVencimentoEntrada: 1,
            numeroParcelas: 1,
            formaPagamentoParcelas: '',
            diaVencimentoParcelas: 1,
          },
        },
      });
    }
    setOpenDialog(true);
  };


  const handleEdit = (orcamento: OrcamentoEquipamento) => {
    handleOpenDialog(orcamento);
  };

  const handleViewPdf = (orcamento: OrcamentoEquipamento) => {
    handleGerarPDF(orcamento);
  };

  const handleDeleteClick = (orcamento: OrcamentoEquipamento) => {
    handleOpenDeleteDialog(orcamento);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const orcamento = orcamentos.find(o => o.id === id);
    if (!orcamento) return;

    if (newStatus === 'aprovado') {
      setSelectedOrcamento(orcamento);
      setOpenApproveDialog(true);
      return;
    }

    if (newStatus === 'rejeitado') {
      setSelectedOrcamento(orcamento);
      setOpenRejectDialog(true);
      return;
    }

    try {
      if (!userData?.empresaId) return;
      const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentosEquipamentos', id);
      await updateDoc(docRef, {
        status: newStatus,
        atualizadoEm: Timestamp.now()
      });
      setSuccess('Status atualizado com sucesso!');
      loadOrcamentos();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleCloseDialog = () => {
    setError('');
    setOpenDialog(false);
    setSelectedOrcamento(null);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      handleInputChange('clienteId', clienteId);
      handleInputChange('clienteNome', cliente.nome);
      handleInputChange('prefixoNome', cliente.prefixoNome || '');

      // Preencher dados de contato iniciais baseados no cadastro do cliente
      handleInputChange('nomeContato', cliente.contatoAtual || cliente.nome || '');
      handleInputChange('emailContato', cliente.contatoEmail1 || '');
      handleInputChange('telefoneContato', cliente.contatoTelefone || '');
      handleInputChange('cargoContato', cliente.contatoFuncao || '');
    }
  };

  const handleOpenItemDialog = (index?: number) => {
    if (index !== undefined) {
      const item = formData.itens[index];
      setItemFormData({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        descricaoLivre: item.descricaoLivre || '',
        equipamentoTextoLivre: item.equipamentoTextoLivre || '',
      });
      setEditingItemIndex(index);
      setItemType(item.produtoId ? 'produto' : 'servico');
    } else {
      setItemFormData({
        produtoId: '',
        quantidade: 1,
        valorUnitario: 0,
        descricaoLivre: '',
        equipamentoTextoLivre: '',
      });
      setEditingItemIndex(null);
      setItemType('produto');
    }
    setOpenItemDialog(true);
  };

  const handleProdutoChange = (produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (produto) {
      setItemFormData((prev) => ({
        ...prev,
        produtoId,
        valorUnitario: produto.precoVenda || 0,
      }));
    }
  };

  const handleSaveItem = () => {
    if (itemType === 'servico') {
      if (!itemFormData.descricaoLivre?.trim()) {
        setError('Informe a descrição do produto/serviço');
        return;
      }

      const novoItem: ItemOrcamento = {
        produtoId: '',
        produtoNome: itemFormData.descricaoLivre,
        quantidade: itemFormData.quantidade,
        valorUnitario: itemFormData.valorUnitario,
        valorTotal: itemFormData.quantidade * itemFormData.valorUnitario,
        fabricanteNome: '',
        descricaoLivre: itemFormData.descricaoLivre,
        equipamentoTextoLivre: itemFormData.equipamentoTextoLivre || '',
      };

      const novosItens = [...formData.itens];
      if (editingItemIndex !== null) {
        novosItens[editingItemIndex] = novoItem;
      } else {
        novosItens.push(novoItem);
      }

      const novoValorTotal = novosItens.reduce((sum, item) => sum + item.valorTotal, 0);
      handleInputChange('itens', novosItens);
      handleInputChange('valorTotal', novoValorTotal);
      setOpenItemDialog(false);
      return;
    }

    // Se for Produto
    if (!itemFormData.produtoId) {
      setError('Selecione um produto');
      return;
    }

    const produto = produtos.find((p) => p.id === itemFormData.produtoId);
    if (!produto) return;

    // Apenas o nome do produto, sem partNumber
    const produtoNome = produto.nome;

    const novoItem: ItemOrcamento = {
      produtoId: itemFormData.produtoId,
      produtoNome,
      quantidade: itemFormData.quantidade,
      valorUnitario: itemFormData.valorUnitario,
      valorTotal: itemFormData.quantidade * itemFormData.valorUnitario,
      fabricanteNome: produto.fabricanteNome || '',
      descricaoLivre: itemFormData.descricaoLivre || '',
      equipamentoTextoLivre: itemFormData.equipamentoTextoLivre || '',
    };

    const novosItens = [...formData.itens];
    if (editingItemIndex !== null) {
      novosItens[editingItemIndex] = novoItem;
    } else {
      novosItens.push(novoItem);
    }

    const novoValorTotal = novosItens.reduce((sum, item) => sum + item.valorTotal, 0);

    handleInputChange('itens', novosItens);
    handleInputChange('valorTotal', novoValorTotal);
    setOpenItemDialog(false);
  };

  const handleDeleteItem = (index: number) => {
    const novosItens = formData.itens.filter((_, i) => i !== index);
    const novoValorTotal = novosItens.reduce((sum, item) => sum + item.valorTotal, 0);

    handleInputChange('itens', novosItens);
    handleInputChange('valorTotal', novoValorTotal);
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;
    setError('');

    if (!formData.numero || !formData.titulo || !formData.clienteId || !formData.dataEmissao || !formData.dataValidade) {
      setError('Preencha os campos obrigatórios: Número, Título, Cliente, Data de Emissão e Validade');
      return;
    }

    if (formData.itens.length === 0) {
      setError('Adicione pelo menos um item ao orçamento');
      return;
    }

    try {
      const empresaId = userData.empresaId;
      // ATUALIZADO: Salvando na coleção dedicada
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos');

      const orcamentoData = {
        numero: formData.numero,
        titulo: formData.titulo,
        clienteId: formData.clienteId,
        clienteNome: formData.clienteNome,
        prefixoNome: formData.prefixoNome,
        nomeContato: formData.nomeContato || '',
        emailContato: formData.emailContato || '',
        telefoneContato: formData.telefoneContato || '',
        cargoContato: formData.cargoContato || '',
        vendedorId: formData.vendedorId,
        vendedorNome: formData.vendedorNome,
        itens: formData.itens,
        valorTotal: formData.valorTotal,
        desconto: formData.desconto || 0,
        status: formData.status,
        dataEmissao: Timestamp.fromDate(new Date(formData.dataEmissao)),
        dataValidade: Timestamp.fromDate(new Date(formData.dataValidade)),
        observacao: formData.observacao,
        pagamento: formData.pagamento,
        tipo: 'equipamento',
        atualizadoEm: Timestamp.now(),
      };

      if (isEditing && selectedOrcamento) {
        const docRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos', selectedOrcamento.id);
        await updateDoc(docRef, orcamentoData);
        setSuccess('Orçamento atualizado com sucesso!');
      } else {
        await addDoc(orcamentosRef, {
          ...orcamentoData,
          criadoEm: Timestamp.now(),
        });
        setSuccess('Orçamento criado com sucesso!');
      }

      handleCloseDialog();
      loadOrcamentos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar orçamento: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedOrcamento) return;
    const empresaId = userData.empresaId;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos', selectedOrcamento.id));
      setSuccess('Orçamento excluído com sucesso!');
      handleCloseDeleteDialog();
      loadOrcamentos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir orçamento: ' + err.message);
    }
  };

  const handleFinalizarEnviar = async (orcamento: OrcamentoEquipamento) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    if (orcamento.itens.length === 0) {
      setError('Adicione pelo menos um item ao orçamento antes de finalizar');
      return;
    }

    try {
      const orcamentoRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos', orcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'enviado',
        dataEnvio: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      });

      if (orcamento.chamadoId) {
        const chamadoRef = doc(db, 'EMPRESAS', empresaId, 'chamados', orcamento.chamadoId);
        await updateDoc(chamadoRef, {
          status: 'orcamento_enviado',
          atualizadoEm: Timestamp.now(),
        });
      }

      setSuccess(`Orçamento ${orcamento.numero} finalizado e enviado ao cliente!`);
      loadOrcamentos();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Erro ao finalizar orçamento: ' + err.message);
    }
  };

  const handleOpenApproveDialog = (orcamento: OrcamentoEquipamento) => {
    setSelectedOrcamento(orcamento);
    setOpenApproveDialog(true);
  };

  const handleOpenRejectDialog = (orcamento: OrcamentoEquipamento) => {
    setSelectedOrcamento(orcamento);
    setRejectMotivo('');
    setHasEquipamentoRetirado(orcamento.pendenciaOrigem?.pecasRetiradas ? true : false);
    setOpenRejectDialog(true);
  };

  const handleApprove = async () => {
    if (!userData?.empresaId || !selectedOrcamento) return;
    const empresaId = userData.empresaId;

    try {
      const novoHistorico: HistoricoOperacao = {
        data: Timestamp.now(),
        usuario: userData.nome || userData.email || '',
        usuarioId: userData.id || '',
        acao: 'aprovacao',
        detalhes: 'Orçamento aprovado pelo cliente',
      };

      // PASSO 1: Preparar Snapshot do Cliente
      let clienteSnapshot: any = {};
      if (selectedOrcamento.clienteId) {
        try {
          const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedOrcamento.clienteId);
          const cliSnap = await getDoc(cliRef);
          if (cliSnap.exists()) {
            const cliData = cliSnap.data();
            clienteSnapshot = {
              id: selectedOrcamento.clienteId,
              nome: cliData.nome || '',
              cnpjCpf: cliData.cnpjCpf || '',
              email: cliData.email || '',
              telefone: cliData.telefone || '',
              endereco: cliData.endereco || '',
              numero: cliData.numero || '',
              complemento: cliData.complemento || '',
              bairro: cliData.bairro || '',
              cidade: cliData.cidade || '',
              uf: cliData.uf || '',
              cep: cliData.cep || '',
              prefixoNome: cliData.prefixoNome || ''
            };

            // Buscar contatos
            try {
              const contatosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', selectedOrcamento.clienteId, 'contatos');
              const contatosSnap = await getDocs(contatosRef);
              clienteSnapshot.contatos = contatosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
              console.warn("Erro ao buscar contatos", e);
              clienteSnapshot.contatos = [];
            }
          }
        } catch (e) {
          console.error("Erro ao buscar cliente", e);
        }
      }

      // PASSO 2: CRIAR VENDA (ANTES DE APROVAR O ORÇAMENTO)
      try {
        const vendasRef = collection(db, 'EMPRESAS', empresaId, 'vendas');
        console.log("🔵 Tentando criar venda em:", `EMPRESAS/${empresaId}/vendas`);

        const novaVenda = {
          orcamentoOrigemId: selectedOrcamento.id,
          numeroOrcamento: selectedOrcamento.numero,
          dataVenda: Timestamp.now(),
          status: 'pendente_faturamento',

          clienteId: selectedOrcamento.clienteId,
          clienteNome: selectedOrcamento.clienteNome,
          prefixoNome: selectedOrcamento.prefixoNome || '',

          nomeContato: selectedOrcamento.nomeContato || '',
          contatoNome: selectedOrcamento.nomeContato || '',
          email: selectedOrcamento.emailContato || '',
          contatoEmail: selectedOrcamento.emailContato || '',
          telefone: selectedOrcamento.telefoneContato || '',
          contatoTelefone: selectedOrcamento.telefoneContato || '',
          cargoContato: selectedOrcamento.cargoContato || '',
          contatoCargo: selectedOrcamento.cargoContato || '',

          itens: selectedOrcamento.itens || [],
          pagamento: selectedOrcamento.pagamento || {},

          valorTotal: selectedOrcamento.valorTotal || 0,
          desconto: selectedOrcamento.desconto || 0,

          vendedorId: selectedOrcamento.vendedorId || '',
          vendedorNome: selectedOrcamento.vendedorNome || '',

          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now()
        };

        console.log("🔵 Dados da venda:", novaVenda);
        const docRef = await addDoc(vendasRef, novaVenda);
        console.log("✅ VENDA CRIADA COM SUCESSO! ID:", docRef.id);
        alert(`✅ Venda criada! ID: ${docRef.id}\nCaminho: EMPRESAS/${empresaId}/vendas/${docRef.id}`);
      } catch (errVenda: any) {
        console.error("❌ ERRO AO CRIAR VENDA:", errVenda);
        alert(`❌ ERRO: ${errVenda.message}`);
        throw new Error("Falha ao criar venda: " + errVenda.message);
      }

      // PASSO 3: Atualizar status do Orçamento (SÓ DEPOIS DA VENDA)
      const orcamentoRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosEquipamentos', selectedOrcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'aprovado',
        vendaGerada: true,
        historicoOperacoes: [...(selectedOrcamento.historicoOperacoes || []), novoHistorico],
        atualizadoEm: Timestamp.now(),
      });

      // O Dialog de aprovação fecha e carrega a lista
      // ...


      // ======================================================================
      // AUTOMAÇÃO: ATUALIZAR CLIENTE (Setar Contrato + Criar CC se necessário)
      // ======================================================================
      if (selectedOrcamento.clienteId) {
        try {
          const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedOrcamento.clienteId);
          const cliSnap = await getDoc(cliRef);

          if (cliSnap.exists()) {
            const cliData = cliSnap.data();
            const updates: any = { temContrato: true }; // Marca que agora tem contrato

            let ccIdParaUso = cliData.centroCustoId;
            let ccPrecisouCriar = false;

            // 1. Se já tem CC, verifica se precisa reativar
            if (ccIdParaUso) {
              try {
                const existingCCRef = doc(db, 'EMPRESAS', empresaId, 'centros_custo', ccIdParaUso);
                const existingCCSnap = await getDoc(existingCCRef);

                if (existingCCSnap.exists()) {
                  // Sempre atualiza o nome para garantir padrão (caso tenha mudado prefixo) e reativa
                  const nomeCorreto = `${cliData.prefixoNome ? cliData.prefixoNome + ' ' : ''}${cliData.nome}`;

                  console.log("[Auto] Atualizando/Reativando Centro de Custo existente:", ccIdParaUso);
                  await updateDoc(existingCCRef, {
                    nome: nomeCorreto,
                    ativo: true,
                    atualizadoEm: new Date().toISOString(),
                    reativadoPorAuto: true
                  });
                } else {
                  // ID existe no cliente mas doc não existe (removido?) -> Forçar criação de novo
                  console.log("[Auto] CC vinculado não encontrado no banco. Criando novo...");
                  ccIdParaUso = null;
                }
              } catch (err) {
                console.error("Erro ao verificar CC existente", err);
                ccIdParaUso = null; // Falha na verificação, tenta criar
              }
            }

            // 2. Se não tem CC (ou falhou acima), cria um agora
            // 2. Se não tem CC (ou falhou acima), cria um agora
            if (!ccIdParaUso) {
              console.log("[Auto] Criando Centro de Custo para o cliente aprovado...");

              // 1. Buscar Grupo Pai 'CC-CLIENTES'
              const gruposRef = collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos');
              const qGrupo = query(gruposRef, where('codigo', '==', 'CC-CLIENTES'));
              const gruposSnap = await getDocs(qGrupo);
              let grupoId = '';
              let grupoNome = 'Clientes (Vendas e Contratos)';
              let grupoCodigo = 'CC-CLIENTES';

              if (!gruposSnap.empty) {
                grupoId = gruposSnap.docs[0].id;
                grupoNome = gruposSnap.docs[0].data().nome;
                grupoCodigo = gruposSnap.docs[0].data().codigo;
              } else {
                // Criar Grupo se não existir
                const novoGrupo = await addDoc(gruposRef, {
                  codigo: 'CC-CLIENTES',
                  nome: 'Clientes (Vendas e Contratos)',
                  permiteReceita: true,
                  permiteDespesa: true,
                  descricao: 'Grupo automático para gestão financeira por cliente',
                  criadoEm: new Date().toISOString()
                });
                grupoId = novoGrupo.id;
              }

              if (grupoId) {
                // 2. Gerar Código para o novo CC (Slugify)
                const cleanName = cliData.nome
                  .toUpperCase()
                  .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
                  .replace(/[^A-Z0-9 ]/g, "") // Tira especiais
                  .trim()
                  .replace(/\s+/g, "-"); // Espaço vira traço

                const novoCodigo = `CC-${cleanName}`.substring(0, 30);

                // Verificar existência antes de criar
                const qCheck = query(collection(db, 'EMPRESAS', empresaId, 'centros_custo'), where('codigo', '==', novoCodigo));
                const snapCheck = await getDocs(qCheck);

                const nomeCC = `${cliData.prefixoNome ? cliData.prefixoNome + ' ' : ''}${cliData.nome}`;

                if (!snapCheck.empty) {
                  ccIdParaUso = snapCheck.docs[0].id;
                  console.log("Automação: Centro de Custo já existente encontrado na aprovação:", novoCodigo);

                  // Atualizar o nome do CC encontrado para garantir que tenha o prefixo correto
                  try {
                    const existingCCRef = doc(db, 'EMPRESAS', empresaId, 'centros_custo', ccIdParaUso);
                    await updateDoc(existingCCRef, {
                      nome: nomeCC,
                      atualizadoEm: new Date().toISOString(),
                      grupoId, // Garante grupo certo
                      grupoNome,
                      grupoCodigo
                    });
                    console.log("[Auto] Nome do Centro de Custo existente atualizado para:", nomeCC);
                  } catch (updateErr) {
                    console.error("[Auto] Erro ao atualizar nome do CC existente:", updateErr);
                  }
                } else {
                  const novoCCData = {
                    empresaId,
                    grupoId,
                    grupoNome,
                    grupoCodigo,
                    nome: nomeCC,
                    codigo: novoCodigo,
                    permiteReceita: true,
                    permiteDespesa: true,
                    origensPermitidas: ['contrato', 'chamado', 'os', 'manual', 'venda'],
                    ativo: true,
                    criadoEm: new Date().toISOString(),
                    criadoPor: 'SISTEMA_AUTO_APROVACAO'
                  };

                  const ccRef = await addDoc(collection(db, 'EMPRESAS', empresaId, 'centros_custo'), novoCCData);
                  ccIdParaUso = ccRef.id;
                  ccPrecisouCriar = true;
                  console.log("[Auto] Centro de Custo criado:", novoCodigo);
                }

                updates.centroCustoId = ccIdParaUso;
                updates.centroCustoNome = nomeCC;
                updates.centroCustoCodigo = novoCodigo;
              }
            }

            await updateDoc(cliRef, updates);
            console.log(`[Auto] Cliente atualizado. Tem Contrato: Sim. CC: ${ccIdParaUso} (Criado: ${ccPrecisouCriar})`);
          }
        } catch (autoErr) {
          console.error("Erro na automação Cliente/CC:", autoErr);
        }
      }

      if (selectedOrcamento.chamadoId) {
        const novoHistoricoChamado = {
          data: Timestamp.now(),
          usuario: userData.nome || userData.email || '',
          usuarioId: userData.id || '',
          acao: 'orcamento_aprovado',
          detalhes: `Orçamento ${selectedOrcamento.numero} aprovado pelo cliente. Retornando para área técnica para agendamento da execução.`,
        };

        const itensDescricao = selectedOrcamento.itens
          ?.map(item => `${item.descricaoLivre || item.produtoNome} (Qtd: ${item.quantidade})`)
          .join('; ') || 'Itens do orçamento';

        const chamadoRef = doc(db, 'EMPRESAS', empresaId, 'chamados', selectedOrcamento.chamadoId);
        await updateDoc(chamadoRef, {
          tipoChamado: 'tecnico',
          status: 'orcamento_aprovado',
          pendenciaRetornoTecnico: {
            motivo: 'Orçamento aprovado - Agendar execução do serviço',
            descricao: `Cliente aprovou o orçamento ${selectedOrcamento.numero}. Valor total: R$ ${selectedOrcamento.valorTotal?.toFixed(2) || '0,00'}. Itens: ${itensDescricao}`,
            orcamentoId: selectedOrcamento.id,
            orcamentoNumero: selectedOrcamento.numero,
            pecasRetiradas: selectedOrcamento.pendenciaOrigem?.pecasRetiradas,
            localPecas: selectedOrcamento.pendenciaOrigem?.localPecas,
          },
          atualizadoEm: Timestamp.now(),
          historicoOperacoes: arrayUnion(novoHistoricoChamado),
        });
      }

      setSuccess(`Orçamento ${selectedOrcamento.numero} aprovado! OS retornada para área técnica para agendamento da execução.`);
      setOpenApproveDialog(false);
      setSelectedOrcamento(null);
      loadOrcamentos();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Erro ao aprovar orçamento: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!userData?.empresaId || !selectedOrcamento || !rejectMotivo.trim()) {
      setError('Informe o motivo da reprovação');
      return;
    }

    try {
      const novoHistorico: HistoricoOperacao = {
        data: Timestamp.now(),
        usuario: userData.nome || userData.email || '',
        usuarioId: userData.id || '',
        acao: 'reprovacao',
        detalhes: `Motivo: ${rejectMotivo}${hasEquipamentoRetirado ? ' | Equipamento será devolvido' : ''}`,
      };

      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId!, 'orcamentosEquipamentos', selectedOrcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'reprovado',
        motivoReprovacao: rejectMotivo,
        historicoOperacoes: [...(selectedOrcamento.historicoOperacoes || []), novoHistorico],
        atualizadoEm: Timestamp.now(),
      });

      if (selectedOrcamento.chamadoId) {
        const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId!, 'chamados', selectedOrcamento.chamadoId);

        if (hasEquipamentoRetirado) {
          const novoHistoricoChamado = {
            data: Timestamp.now(),
            usuario: userData.nome || userData.email || '',
            usuarioId: userData.id || '',
            acao: 'retorno_tecnico',
            detalhes: `Orçamento ${selectedOrcamento.numero} reprovado. Equipamento deve ser devolvido.`,
          };

          await updateDoc(chamadoRef, {
            tipoChamado: 'tecnico',
            status: 'aguardando_devolucao',
            pendenciaRetornoTecnico: {
              motivo: 'Devolução de equipamento - Orçamento reprovado',
              descricao: rejectMotivo,
              orcamentoId: selectedOrcamento.id,
              orcamentoNumero: selectedOrcamento.numero,
              pecasRetiradas: selectedOrcamento.pendenciaOrigem?.pecasRetiradas,
              localPecas: selectedOrcamento.pendenciaOrigem?.localPecas,
            },
            atualizadoEm: Timestamp.now(),
            historicoOperacoes: arrayUnion(novoHistoricoChamado),
          });
        } else {
          const novoHistoricoChamado = {
            data: Timestamp.now(),
            usuario: userData.nome || userData.email || '',
            usuarioId: userData.id || '',
            acao: 'orcamento_reprovado',
            detalhes: `Orçamento ${selectedOrcamento.numero} reprovado. Motivo: ${rejectMotivo}`,
          };

          await updateDoc(chamadoRef, {
            status: 'orcamento_reprovado',
            atualizadoEm: Timestamp.now(),
            historicoOperacoes: arrayUnion(novoHistoricoChamado),
          });
        }
      }

      setSuccess(`Orçamento ${selectedOrcamento.numero} reprovado!${hasEquipamentoRetirado ? ' Chamado retornado para área técnica.' : ''}`);
      setOpenRejectDialog(false);
      setSelectedOrcamento(null);
      setRejectMotivo('');
      loadOrcamentos();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Erro ao reprovar orçamento: ' + err.message);
    }
  };

  const checkAndUpdateExpiredOrcamentos = async () => {
    if (!userData?.empresaId) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let updated = false;

    for (const orcamento of orcamentos) {
      if (orcamento.status === 'enviado' && orcamento.dataValidade) {
        const validade = orcamento.dataValidade.toDate();
        validade.setHours(0, 0, 0, 0);

        if (validade < hoje) {
          try {
            const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId!, 'orcamentosEquipamentos', orcamento.id);
            await updateDoc(orcamentoRef, {
              status: 'expirado',
              atualizadoEm: Timestamp.now(),
            });
            updated = true;
          } catch (err) {
            console.error('Erro ao atualizar orçamento expirado:', err);
          }
        }
      }
    }

    if (updated) {
      loadOrcamentos();
    }
  };

  useEffect(() => {
    if (orcamentos.length > 0) {
      checkAndUpdateExpiredOrcamentos();
    }
  }, [orcamentos]);

  const handleAccordionChange = (orcamentoId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedOrcamento(isExpanded ? orcamentoId : false);
  };

  const handleOpenViewDialog = (orcamento: OrcamentoEquipamento) => {
    setSelectedOrcamento(orcamento);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedOrcamento(null);
  };

  const handleOpenDeleteDialog = (orcamento: OrcamentoEquipamento) => {
    setSelectedOrcamento(orcamento);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedOrcamento(null);
  };

  // Função auxiliar para converter número em valor por extenso
  const valorPorExtenso = (valor: number): string => {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dez = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const converterCentenas = (num: number): string => {
      if (num === 0) return '';

      const c = Math.floor(num / 100);
      const d = Math.floor((num % 100) / 10);
      const u = num % 10;

      let resultado = '';

      if (c > 0) {
        resultado += centenas[c];
        if (d > 0 || u > 0) resultado += ' e ';
      }

      if (d === 1) {
        resultado += dez[u];
      } else {
        if (d > 0) {
          resultado += dezenas[d];
          if (u > 0) resultado += ' e ';
        }
        if (u > 0 && d !== 1) {
          resultado += unidades[u];
        }
      }

      return resultado;
    };

    if (valor === 0) return 'zero reais';
    if (valor === 100) return 'cem reais';

    const partes = valor.toFixed(2).split('.');
    const inteiro = parseInt(partes[0]);
    const centavos = parseInt(partes[1]);

    let extenso = '';

    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;

    if (milhares > 0) {
      if (milhares === 1) {
        extenso += 'mil';
      } else {
        extenso += converterCentenas(milhares) + ' mil';
      }
      if (resto > 0) extenso += ' ';
    }

    if (resto > 0) {
      extenso += converterCentenas(resto);
    }

    extenso += inteiro === 1 ? ' real' : ' reais';

    if (centavos > 0) {
      extenso += ' e ' + converterCentenas(centavos);
      extenso += centavos === 1 ? ' centavo' : ' centavos';
    }

    return extenso;
  };

  const handleGerarPDF = async (orcamento: OrcamentoEquipamento) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const modeloRef = doc(db, 'EMPRESAS', empresaId, 'parametrosComerciais', 'modeloOrcamento');
      const modeloSnap = await getDoc(modeloRef);

      if (!modeloSnap.exists()) {
        setError('Modelo de orçamento não configurado. Configure em Parâmetros Comerciais.');
        return;
      }

      const modelo = modeloSnap.data();
      const cliente = clientes.find((c) => c.id === orcamento.clienteId);

      if (!cliente) {
        setError('Cliente não encontrado');
        return;
      }

      // Preparação de dados de contato (Fallback para dados legados)
      let contatoApto = cliente.contatoApto || '';
      let contatoEmail1 = cliente.contatoEmail1 || '';
      let contatoEmail2 = cliente.contatoEmail2 || '';

      if (!contatoApto) {
        try {
          const contatosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', cliente.id, 'contatos');
          const q = query(contatosRef, where('atual', '==', true));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const dados = snapshot.docs[0].data();
            contatoApto = dados.apto || '';
            if (!contatoEmail1) contatoEmail1 = dados.email1 || '';
            if (!contatoEmail2) contatoEmail2 = dados.email2 || '';
          }
        } catch (e) {
          console.error('Erro ao buscar contato detalhado:', e);
        }
      }

      const valorTotalExtenso = valorPorExtenso(orcamento.valorTotal);

      let tabelaItens = `
        <table class="user-table" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #C1E3DB;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 7%;">Qtd</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Produto / Serviço</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 15%;">Fabricante</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 13%;">Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      orcamento.itens?.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#fff' : '#fcfcfc';
        tabelaItens += `
          <tr style="background-color: ${bg};">
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantidade}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.produtoNome}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.fabricanteNome || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${item.valorTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      tabelaItens += `
            <tr style="background-color: #C1E3DB; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">TOTAL:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${orcamento.valorTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;

      let enderecoCompleto = '';
      if (cliente.endereco) {
        enderecoCompleto = `${cliente.endereco}, ${cliente.numero}${cliente.complemento ? ` - ${cliente.complemento}` : ''}, ${cliente.bairro}, ${cliente.cidade}/${cliente.uf}${cliente.cep ? ` - CEP: ${cliente.cep}` : ''}`;
      }

      let contatoHTML = '';
      if (cliente.contatoAtual || cliente.contatoFuncao || cliente.contatoTelefone || cliente.contatoWhatsapp || cliente.contatoEmail1) {
        contatoHTML = `<div class="info-section" style="margin: 8px 0; padding: 6px 8px; background-color: #f8f9fa; border-left: 3px solid #42D1D6;">`;
        contatoHTML += `<p style="margin: 0 0 4px 0; font-weight: bold; color: #42D1D6; font-size: 10pt;">Contato Atual</p>`;

        if (cliente.contatoAtual) {
          contatoHTML += `<p style="margin: 2px 0;"><strong>Nome:</strong> ${cliente.contatoAtual}`;
          if (cliente.contatoFuncao) contatoHTML += ` - ${cliente.contatoFuncao}`;
          contatoHTML += '</p>';
        }

        if (cliente.contatoTelefone) {
          contatoHTML += `<p style="margin: 2px 0;"><strong>Tel:</strong> ${cliente.contatoTelefone}`;
          if (cliente.contatoWhatsapp) contatoHTML += ` | <strong>WhatsApp:</strong> ${cliente.contatoWhatsapp}`;
          contatoHTML += '</p>';
        }

        if (cliente.contatoEmail1) {
          contatoHTML += `<p style="margin: 2px 0;"><strong>E-mail:</strong> ${cliente.contatoEmail1}`;
          if (cliente.contatoEmail2) contatoHTML += ` | ${cliente.contatoEmail2}`;
          contatoHTML += '</p>';
        }

        contatoHTML += '</div>';
      }

      const statusLabel = STATUS_OPTIONS.find((s) => s.value === orcamento.status)?.label || orcamento.status;

      const processarTexto = (texto: string): string => {
        return texto ? texto.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') : '';
      };

      const fmtMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      // Gerar Condições de Pagamento Unificado
      const pagamento = orcamento.pagamento;
      let condicoesPagamentoHTML = '';
      if (pagamento) {
        condicoesPagamentoHTML = '<div style="margin: 15px 0; padding: 12px; background-color: #e8f5e9; border: 1px solid #c8e6c9; font-family: Arial, sans-serif;">';
        condicoesPagamentoHTML += '<div style="font-weight: bold; color: #2e7d32; border-bottom: 1px solid #a5d6a7; margin-bottom: 8px; padding-bottom: 4px;">Condições de Pagamento</div>';

        if (pagamento.tipoPagamento === 'a_vista' && pagamento.aVista) {
          condicoesPagamentoHTML += `
            <div><strong>Modalidade:</strong> À Vista</div>
            <div><strong>Forma de Pagamento:</strong> ${pagamento.aVista.formaPagamento}</div>
            <div><strong>Vencimento:</strong> ${pagamento.aVista.dataVencimento ? new Date(pagamento.aVista.dataVencimento).toLocaleDateString('pt-BR') : '-'}</div>
            <div style="margin-top: 5px;"><strong>Valor Total:</strong> ${fmtMoeda(orcamento.valorTotal)}</div>
          `;
        } else if (pagamento.tipoPagamento === 'parcelado' && pagamento.parcelado) {
          const p = pagamento.parcelado;
          condicoesPagamentoHTML += `<div><strong>Modalidade:</strong> Parcelado (${p.numeroParcelas}x)</div>`;

          if (p.entrada && p.valorEntrada) {
            condicoesPagamentoHTML += `
              <div style="margin-top: 8px; padding: 5px; background-color: #fff; border: 1px solid #ddd;">
                <div><strong>Entrada:</strong> ${fmtMoeda(p.valorEntrada)} (${p.formaPagamentoEntrada}) - Vencimento ${p.diaVencimentoEntrada}</div>
              </div>
            `;
          }

          const valorRestante = orcamento.valorTotal - (p.entrada ? (p.valorEntrada || 0) : 0);
          const valorParcela = valorRestante / (p.numeroParcelas || 1);

          condicoesPagamentoHTML += `
            <div style="margin-top: 8px; padding: 5px; background-color: #fff; border: 1px solid #ddd;">
              <div><strong>Parcelas:</strong> ${p.numeroParcelas}x de ${fmtMoeda(valorParcela)}</div>
              <div>Forma: ${p.formaPagamentoParcelas}</div>
              <div>Vencimento: Todo dia ${p.diaVencimentoParcelas}</div>
            </div>
            <div style="margin-top: 5px;"><strong>Valor Total:</strong> ${fmtMoeda(orcamento.valorTotal)}</div>
          `;
        }
        condicoesPagamentoHTML += '</div>';
      }

      // Função auxiliar de substituição unificada
      const substituirPlaceholders = (html: string) => {
        if (!html) return '';
        let res = html;
        res = res.replace(/{{NUMERO_ORCAMENTO}}/g, orcamento.numero || '');
        res = res.replace(/{{TITULO_ORCAMENTO}}/g, orcamento.titulo || '');
        res = res.replace(/{{DATA_EMISSAO}}/g, orcamento.dataEmissao ? orcamento.dataEmissao.toDate().toLocaleDateString('pt-BR') : '');
        res = res.replace(/{{DATA_VALIDADE}}/g, orcamento.dataValidade ? orcamento.dataValidade.toDate().toLocaleDateString('pt-BR') : '');

        // Padrão ModelosDocumentos (Contratos/Orçamentos)
        res = res.replace(/{{NOME_CLIENTE}}/g, orcamento.clienteNome || '');
        res = res.replace(/{{CNPJ_CPF}}/g, formatCnpjCpf(cliente.cnpjCpf || ''));
        res = res.replace(/{{ENDERECO_COMPLETO}}/g, enderecoCompleto || '');
        res = res.replace(/{{CONTATO_NOME}}/g, cliente.contatoAtual || '');
        res = res.replace(/{{CONTATO_FUNCAO}}/g, cliente.contatoFuncao || '');
        res = res.replace(/{{CONTATO_TELEFONE}}/g, formatTelefone(cliente.contatoTelefone || ''));
        res = res.replace(/{{CONTATO_WHATSAPP}}/g, formatTelefone(cliente.contatoWhatsapp || ''));
        res = res.replace(/{{CONTATO_APTO}}/g, contatoApto);
        res = res.replace(/{{CONTATO_EMAIL}}/g, contatoEmail1); // Mantendo compatibilidade
        res = res.replace(/{{CONTATO_EMAIL1}}/g, contatoEmail1);
        res = res.replace(/{{CONTATO_EMAIL2}}/g, contatoEmail2);
        res = res.replace(/{{CLIENTE_PREFIXO}}/g, cliente.prefixoNome || '');

        // Específicos de Orçamento
        res = res.replace(/{{CLIENTE_CONTATO}}/g, contatoHTML || '');
        res = res.replace(/{{STATUS}}/g, statusLabel || '');

        res = res.replace(/{{VENDEDOR_NOME}}/g, orcamento.vendedorNome || '');
        res = res.replace(/{{OBSERVACAO}}/g, processarTexto(orcamento.observacao || ''));

        res = res.replace(/{{ITENS_ORCAMENTO}}/g, tabelaItens).replace(/{{TABELA_ITENS}}/g, tabelaItens);
        // Usa a nova variável condicoesPagamentoHTML gerada acima
        res = res.replace(/{{CONDICOES_PAGAMENTO}}/g, condicoesPagamentoHTML);
        res = res.replace(/{{VALOR_TOTAL}}/g, fmtMoeda(orcamento.valorTotal));
        res = res.replace(/{{VALOR_EXTENSO}}/g, valorTotalExtenso || '').replace(/{{VALOR_TOTAL_EXTENSO}}/g, valorTotalExtenso || '');

        return res;
      };



      // Gera cabeçalho via utilitário centralizado
      const cabecalhoHTML = await gerarCabecalhoEmpresaHTML(empresaData);

      const corpoHTML = substituirPlaceholders(modelo.corpo || '');
      const rodapeHTML = substituirPlaceholders(modelo.rodape || '');


      const htmlCompleto = gerarLayoutDocumentoHTML({
        titulo: `Orçamento ${orcamento.numero}`,
        cabecalhoHTML,
        rodapeHTML,
        corpoHTML
      });

      imprimirHTMLViaIframe(htmlCompleto);
    } catch (err: any) {
      setError('Erro ao gerar PDF: ' + err.message);
    }
  };






  const handleOpenEmailDialog = (orcamento: OrcamentoEquipamento) => {
    const cliente = clientes.find(c => c.id === orcamento.clienteId);
    setOrcamentoParaEmail(orcamento);
    setEmailTo(orcamento.emailContato || cliente?.contatoEmail1 || cliente?.contatoEmail2 || '');
    setOpenEmailDialog(true);
  };

  const handleSendEmail = async () => {
    if (!orcamentoParaEmail || !userData?.empresaId || !emailTo) {
      setError('E-mail destinatário inválido.');
      return;
    }

    setSendingEmail(true);
    try {
      const empresaId = userData.empresaId;
      const modeloRef = doc(db, 'EMPRESAS', empresaId, 'parametrosComerciais', 'modeloOrcamento');
      const modeloSnap = await getDoc(modeloRef);

      if (!modeloSnap.exists()) {
        throw new Error('Modelo de orçamento não configurado.');
      }

      const modelo = modeloSnap.data();
      const cliente = clientes.find((c) => c.id === orcamentoParaEmail.clienteId);
      if (!cliente) throw new Error('Cliente não encontrado');

      const empresaDoc = await getDoc(doc(db, 'EMPRESAS', empresaId));
      const empresaData = empresaDoc.data();

      // Funções auxiliares locais (cópias simplificadas)
      const valorPorExtenso = (valor: number) => {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); // Simplificado
      };

      let tabelaItens = `
        <table class="user-table" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #C1E3DB;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 7%;">Qtd</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Produto / Serviço</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 15%;">Fabricante</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 13%;">Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      orcamentoParaEmail.itens?.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#fff' : '#fcfcfc';
        tabelaItens += `
          <tr style="background-color: ${bg};">
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantidade}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.produtoNome}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.fabricanteNome || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${item.valorTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      tabelaItens += `
            <tr style="background-color: #C1E3DB; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">TOTAL:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${orcamentoParaEmail.valorTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;

      const substituirPlaceholders = (html: string) => {
        if (!html) return '';
        let res = html;
        res = res.replace(/{{NUMERO_ORCAMENTO}}/g, orcamentoParaEmail.numero || '');
        res = res.replace(/{{TITULO_ORCAMENTO}}/g, orcamentoParaEmail.titulo || '');
        res = res.replace(/{{NOME_CLIENTE}}/g, orcamentoParaEmail.clienteNome || '');
        res = res.replace(/{{ITENS_ORCAMENTO}}/g, tabelaItens).replace(/{{TABELA_ITENS}}/g, tabelaItens);
        res = res.replace(/{{VALOR_TOTAL}}/g, orcamentoParaEmail.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

        // Adicionando substituições faltantes para evitar erros visuais
        res = res.replace(/{{DATA_EMISSAO}}/g, orcamentoParaEmail.dataEmissao?.toDate().toLocaleDateString('pt-BR') || '');
        res = res.replace(/{{DATA_VALIDADE}}/g, orcamentoParaEmail.dataValidade?.toDate().toLocaleDateString('pt-BR') || '');
        res = res.replace(/{{VENDEDOR_NOME}}/g, orcamentoParaEmail.vendedorNome || '');
        res = res.replace(/{{OBSERVACAO}}/g, orcamentoParaEmail.observacao || '');

        return res;
      };

      const cabecalhoHTML = await gerarCabecalhoEmpresaHTML(empresaData);
      const corpoHTML = substituirPlaceholders(modelo.corpo || '');
      const rodapeHTML = substituirPlaceholders(modelo.rodape || '');

      const htmlCompleto = gerarLayoutDocumentoHTML({
        titulo: `Orçamento ${orcamentoParaEmail.numero}`,
        cabecalhoHTML,
        rodapeHTML,
        corpoHTML
      });

      const pdfBase64 = await gerarPDFBase64(htmlCompleto);
      console.log(`PDF Gerado. Tamanho: ${pdfBase64.length} caracteres.`);

      await sendOrcamentoEmail({
        to: emailTo,
        subject: `Orçamento #${orcamentoParaEmail.numero} - ${empresaData?.nomeFantasia || 'SisGu'}`,
        orcamento: orcamentoParaEmail,
        clienteNome: orcamentoParaEmail.clienteNome,
        pdfBase64: pdfBase64
      });

      setSuccess(`E-mail enviado para ${emailTo} com sucesso!`);

      if (orcamentoParaEmail.status === 'em_elaboracao') {
        onUpdateStatus(orcamentoParaEmail.id, 'enviado');
      }

      setOpenEmailDialog(false);
      setOrcamentoParaEmail(null);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar e-mail: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  // Categorização para Abas e Cards
  const orcamentosEmAberto = orcamentos.filter(o => ['em_elaboracao', 'enviado'].includes(o.status));
  const orcamentosAprovados = orcamentos.filter(o => o.status === 'aprovado');
  const orcamentosArquivados = orcamentos.filter(o => ['reprovado', 'expirado', 'cancelado'].includes(o.status));

  const totalEmAberto = orcamentosEmAberto.length;
  const valorEmAberto = orcamentosEmAberto.reduce((acc, o) => acc + (o.valorTotal || 0), 0);

  const totalAprovados = orcamentosAprovados.length;
  const valorAprovados = orcamentosAprovados.reduce((acc, o) => acc + (o.valorTotal || 0), 0);

  const totalArquivados = orcamentosArquivados.length;
  const valorArquivados = orcamentosArquivados.reduce((acc, o) => acc + (o.valorTotal || 0), 0);

  let currentList: OrcamentoEquipamento[] = [];
  if (tabValue === 0) currentList = orcamentosEmAberto;
  else if (tabValue === 1) currentList = orcamentosAprovados;
  else currentList = orcamentosArquivados;

  const filteredOrcamentos = currentList.filter((orcamento) => {
    const matchesSearch =
      orcamento.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (startDate || endDate) {
      const dataRef = orcamento.dataEmissao?.toDate();
      if (dataRef) {
        dataRef.setHours(0, 0, 0, 0);

        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (dataRef < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (dataRef > end) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesDate;
  });

  // Componente ROW interno para tabela
  interface RowProps {
    row: OrcamentoEquipamento;
    cliente: any;
    onEdit: (row: OrcamentoEquipamento) => void;
    onDelete: (row: OrcamentoEquipamento) => void;
    onViewPdf: (row: OrcamentoEquipamento) => void;
    onUpdateStatus: (id: string, newStatus: string) => void;
    onSendEmail: (row: OrcamentoEquipamento) => void;
  }

  function Row({ row, cliente, onEdit, onDelete, onViewPdf, onUpdateStatus, onSendEmail }: RowProps) {
    const [openRow, setOpenRow] = useState(false);
    const [contatos, setContatos] = useState<any[]>([]);
    const [loadingContatos, setLoadingContatos] = useState(false);

    useEffect(() => {
      if (openRow && cliente && userData?.empresaId) {
        const fetchContatos = async () => {
          setLoadingContatos(true);
          try {
            const contatosRef = collection(db, 'EMPRESAS', userData.empresaId!, 'clientes', cliente.id, 'contatos');
            const snap = await getDocs(contatosRef);
            const lista = snap.docs.map(d => d.data());
            setContatos(lista);
          } catch (e) {
            console.error(e);
          } finally {
            setLoadingContatos(false);
          }
        };
        fetchContatos();
      }
    }, [openRow, cliente, userData?.empresaId]);

    return (
      <React.Fragment>
        <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
          <TableCell width={50}>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpenRow(!openRow)}
            >
              {openRow ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row" sx={{ py: 0.5, fontWeight: 'bold' }}>
            {row.numero}
          </TableCell>
          <TableCell sx={{ py: 0.5 }}>
            {cliente?.prefixoNome ? `${cliente.prefixoNome} ` : ''}{row.clienteNome}
            {row.chamadoNumeroOS && (
              <Typography variant="caption" display="block" color="textSecondary">
                OS: {row.chamadoNumeroOS}
              </Typography>
            )}
          </TableCell>
          <TableCell sx={{ py: 0.5 }}>{row.dataEmissao?.toDate().toLocaleDateString('pt-BR')}</TableCell>
          <TableCell sx={{ py: 0.5 }}>
            <StatusChip
              status={row.status}
              label={STATUS_OPTIONS.find((s) => s.value === row.status)?.label || row.status}
            />
          </TableCell>
          <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold', color: 'green' }}>
            {row.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell align="center" sx={{ py: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {row.status === 'em_elaboracao' && (
                <ActionSend title="Enviar ao Cliente" onClick={() => onSendEmail(row)} />
              )}
              <ActionPdf title="Visualizar PDF" onClick={() => onViewPdf(row)} />
              <ActionEdit title="Editar" onClick={() => onEdit(row)} />
              <ActionDelete title="Excluir" onClick={() => onDelete(row)} />
            </Box>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
            <Collapse in={openRow} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 1 }}>

                {/* Chips de Ação no Topo Direito */}
                {row.status === 'enviado' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                    <Chip
                      label="Aprovado"
                      color="success"
                      onClick={() => onUpdateStatus(row.id, 'aprovado')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      icon={<CheckCircle />}
                    />
                    <Chip
                      label="Reprovado"
                      color="error"
                      onClick={() => onUpdateStatus(row.id, 'rejeitado')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      icon={<Cancel />}
                    />
                  </Box>
                )}

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 1 }}>
                      Condições de Pagamento
                    </Typography>
                    <Box sx={{ bgcolor: '#f1f8e9', p: 1.5, borderRadius: 1, minHeight: '100px' }}>
                      {(() => {
                        const valorBruto = row.valorTotal;
                        const desconto = row.desconto || 0;
                        const valorLiquido = valorBruto - desconto;

                        return (
                          <Box>
                            {desconto > 0 ? (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                Valor: {valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - <span style={{ color: '#d32f2f' }}>Desc: - {desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> <br />
                                <strong>Total: {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Total: {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                              </Typography>
                            )}

                            {row.pagamento?.tipoPagamento === 'parcelado' && row.pagamento.parcelado?.entrada && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                Entrada: {(row.pagamento.parcelado.valorEntrada || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({row.pagamento.parcelado.formaPagamentoEntrada || 'Pix'})
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
                                  Pac: {numParcelas}x de {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - {parc.formaPagamentoParcelas || 'Boleto'} {parc.diaVencimentoParcelas ? `- Dia ${parc.diaVencimentoParcelas}` : ''}
                                </Typography>
                              );
                            })()}

                            {row.pagamento?.tipoPagamento === 'a_vista' && (
                              <Typography variant="body2">
                                À Vista: {row.pagamento.aVista?.formaPagamento || 'Não informada'}
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}

                      {row.observacao && (
                        <Typography variant="caption" sx={{ mt: 1, fontStyle: 'italic', color: '#666', display: 'block' }}>
                          Obs: "{row.observacao}"
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                      Dados do Cliente
                    </Typography>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1, minHeight: '100px' }}>
                      {cliente ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{cliente.prefixoNome ? `${cliente.prefixoNome} ` : ''}{cliente.nome}</Typography>
                          <Typography variant="body2"><strong>CNPJ/CPF:</strong> {cliente.cnpjCpf}</Typography>
                          <Typography variant="body2"><strong>Endereço:</strong> {cliente.endereco}, {cliente.numero}</Typography>
                          <Typography variant="body2">{cliente.bairro} - {cliente.uf}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Cliente não encontrado.</Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#ef6c00', mb: 1 }}>
                      Contato Atual
                    </Typography>
                    <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, minHeight: '100px' }}>
                      {loadingContatos ? (
                        <Typography variant="caption" color="text.secondary">Carregando contatos...</Typography>
                      ) : contatos && contatos.length > 0 ? (
                        contatos.map((contato: any, index: number) => (
                          <Box key={index} sx={{ mb: 1, pb: 1, borderBottom: index < contatos.length - 1 ? '1px dashed #efcc9a' : 'none' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {contato.nome} {contato.apto ? `(Apto: ${contato.apto})` : ''}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1 }}>
                              {contato.whatsapp && (
                                <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                                  <WhatsApp sx={{ fontSize: 14, color: '#25D366' }} /> {contato.whatsapp}
                                </Typography>
                              )}
                              {contato.email1 && (
                                <Typography variant="caption" display="block">📧 {contato.email1}</Typography>
                              )}
                              {contato.funcao && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{contato.funcao}</Typography>
                              )}
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box>
                          {cliente && (
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {cliente.contatoAtual || row.clienteNome}
                              </Typography>
                              {cliente.contatoWhatsapp && (
                                <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                                  <WhatsApp sx={{ fontSize: 14, color: '#25D366' }} /> {cliente.contatoWhatsapp}
                                </Typography>
                              )}
                              {cliente.contatoEmail1 && <Typography variant="caption" display="block">📧 {cliente.contatoEmail1}</Typography>}
                              {cliente.contatoFuncao && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{cliente.contatoFuncao}</Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#455a64', mb: 1 }}>
                    Itens do Orçamento ({row.itens.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'white' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                        <TableRow>
                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Item / Produto</strong></TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Qtd</strong></TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Unitário</strong></TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {row.itens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ py: 0.5 }}>
                              <Typography variant="caption" fontWeight="bold" display="block">{item.produtoNome}</Typography>
                              {item.descricaoLivre && <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.65rem' }}>{item.descricaoLivre}</Typography>}
                              {item.equipamentoTextoLivre && <Typography variant="caption" display="block" color="primary" sx={{ fontSize: '0.65rem' }}>Equip: {item.equipamentoTextoLivre}</Typography>}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>{item.quantidade}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>{(item.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>{(item.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Faturado Action Only if Approved */}
                {row.status === 'aprovado' && !row.vendaGerada && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="small" color="secondary" onClick={() => onUpdateStatus(row.id, 'faturado')}>
                      Marcar Faturado
                    </Button>
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell >
        </TableRow >
      </React.Fragment >
    );
  }

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
    return statusOption?.color || 'default';
  };

  return (
    <ProtectedRoute requiredRoute="/orcamentos-equipamentos">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Orçamentos
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Orçamento
          </Button>
        </Box>
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

      {/* Cards Resumo */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Card Em Aberto */}
        <Paper sx={{ p: 2, bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary">EM ABERTO</Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="#e65100" sx={{ lineHeight: 1 }}>
              {totalEmAberto}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="#ff9800" sx={{ mt: 0.5 }}>
              R$ {valorEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Paper>

        {/* Card Aprovados */}
        <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #43a047' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary">APROVADOS</Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="#1b5e20" sx={{ lineHeight: 1 }}>
              {totalAprovados}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="#43a047" sx={{ mt: 0.5 }}>
              R$ {valorAprovados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Paper>

        {/* Card Arquivados */}
        <Paper sx={{ p: 2, bgcolor: '#e0e0e0', borderLeft: '4px solid #757575' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary">ARQUIVADOS</Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="#424242" sx={{ lineHeight: 1 }}>
              {totalArquivados}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="#757575" sx={{ mt: 0.5 }}>
              R$ {valorArquivados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Tabs de Navegação */}
      <Paper square sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary" centered>
          <Tab label={`Em Aberto (${totalEmAberto})`} />
          <Tab label={`Aprovados (${totalAprovados})`} />
          <Tab label={`Arquivados (${totalArquivados})`} />
        </Tabs>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" className="font-semibold text-gray-700">
          {tabValue === 0 ? 'Orçamentos em Aberto' : (tabValue === 1 ? 'Orçamentos Aprovados' : 'Arquivo Morto - Reprovados/Expirados')}
        </Typography>
      </Box>

      {/* ÁREA DE FILTROS COM PAPER E GRID */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Buscar por número ou cliente"
              placeholder="Digite para filtrar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
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

      {/* TABELA DE DADOS (Substituindo Accordion) */}
      {loading ? (
        <Box className="flex justify-center p-8">
          <CircularProgress />
        </Box>
      ) : filteredOrcamentos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Nenhum orçamento encontrado
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: customColors.tableHeader }}>
              <TableRow>
                <TableCell />
                <TableCell><strong>Número</strong></TableCell>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Data</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Valor Total</strong></TableCell>
                <TableCell align="center"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrcamentos.map((orcamento) => {
                const cliente = clientes.find((c) => c.id === orcamento.clienteId);
                return (
                  <Row
                    key={orcamento.id}
                    row={orcamento}
                    cliente={cliente}
                    onEdit={handleOpenDialog}
                    onDelete={handleOpenDeleteDialog}
                    onViewPdf={handleGerarPDF}
                    onUpdateStatus={handleUpdateStatus}
                    onSendEmail={handleOpenEmailDialog}
                  />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento de Equipamento'}</DialogTitle>
        <DialogContent>
          <Tabs value={tabDialogValue} onChange={(e, v) => setTabDialogValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Dados Gerais" />
            <Tab label="Itens" />
            <Tab label="Pagamento" />
          </Tabs>

          {tabDialogValue === 0 && (() => {
            const selectedCliente = clientes.find(c => c.id === formData.clienteId);
            return (
              <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2} sx={{ mt: 1 }}>
                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Número do Orçamento"
                    value={formData.numero}
                    InputProps={{ readOnly: true }}
                    helperText="Gerado automaticamente"
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Título do Orçamento *"
                    value={formData.titulo}
                    onChange={(e) => handleInputChange('titulo', e.target.value.toUpperCase())}
                    placeholder="Ex: Proposta de Fornecimento de Equipamentos de Segurança"
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Cliente *"
                    value={formData.clienteId}
                    onChange={(e) => {
                      const cliente = clientes.find((c) => c.id === e.target.value);
                      handleInputChange('clienteId', e.target.value);
                      handleInputChange('clienteNome', cliente?.nome || '');
                    }}
                  >
                    <MenuItem value="">Selecione um cliente</MenuItem>
                    {clientes.map((cliente) => (
                      <MenuItem key={cliente.id} value={cliente.id}>
                        {cliente.prefixoNome ? `${cliente.prefixoNome} - ` : ''}{cliente.nome} - {cliente.cnpjCpf}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Vendedor"
                    value={formData.vendedorId}
                    onChange={(e) => {
                      const vendedor = usuarios.find((u) => u.id === e.target.value);
                      handleInputChange('vendedorId', e.target.value);
                      handleInputChange('vendedorNome', vendedor?.nome || '');
                    }}
                  >
                    <MenuItem value="">Selecione um vendedor</MenuItem>
                    {usuarios.map((usuario) => (
                      <MenuItem key={usuario.id} value={usuario.id}>
                        {usuario.nome} - {usuario.email}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box gridColumn="span 12">
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Dados de Contato (Para este Orçamento)
                  </Typography>
                </Box>

                <Box gridColumn="span 12">
                  <Paper variant="outlined" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                    {selectedCliente ? (
                      <Box>
                        {/* Linha 1: Identificação */}
                        <Box display="flex" flexWrap="wrap" gap={2} mb={1} alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Nome</Typography>
                            <Typography variant="body2" fontWeight="bold">{selectedCliente.contatoAtual || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Função</Typography>
                            <Typography variant="body2">{selectedCliente.contatoFuncao || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Apto</Typography>
                            <Typography variant="body2">{selectedCliente.contatoApto || '-'}</Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                        {/* Linha 2: Contato */}
                        <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">E-mails</Typography>
                            <Typography variant="body2">
                              {selectedCliente.contatoEmail1 ? selectedCliente.contatoEmail1 : ''}
                              {selectedCliente.contatoEmail1 && selectedCliente.contatoEmail2 ? ' / ' : ''}
                              {selectedCliente.contatoEmail2 ? selectedCliente.contatoEmail2 : ''}
                              {!selectedCliente.contatoEmail1 && !selectedCliente.contatoEmail2 ? '-' : ''}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Telefones</Typography>
                            <Typography variant="body2">
                              {selectedCliente.contatoTelefone ? `Fixo: ${selectedCliente.contatoTelefone}` : ''}
                              {selectedCliente.contatoTelefone && selectedCliente.contatoWhatsapp ? ' | ' : ''}
                              {selectedCliente.contatoWhatsapp ? `WhatsApp: ${selectedCliente.contatoWhatsapp}` : ''}
                              {!selectedCliente.contatoTelefone && !selectedCliente.contatoWhatsapp ? '-' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        Selecione um cliente para visualizar os dados de contato.
                      </Typography>
                    )}
                  </Paper>
                </Box>


                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Data de Emissão *"
                    type="date"
                    value={formData.dataEmissao}
                    onChange={(e) => handleInputChange('dataEmissao', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Data de Validade *"
                    type="date"
                    value={formData.dataValidade}
                    onChange={(e) => handleInputChange('dataValidade', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>



                <Box gridColumn="span 12">
                  <TextField
                    fullWidth
                    label="Observação"
                    multiline
                    rows={2}
                    value={formData.observacao}
                    onChange={(e) => handleInputChange('observacao', e.target.value)}
                  />
                </Box>
              </Box>
            );
          })()
          }

          {
            tabDialogValue === 1 && (
              <Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="subtitle2" className="font-bold">
                    Itens do Orçamento
                  </Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => handleOpenItemDialog()}>
                    Adicionar Item
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableRow>
                        <TableCell><strong>Quantidade</strong></TableCell>
                        <TableCell><strong>Produto</strong></TableCell>
                        <TableCell><strong>Fabricante</strong></TableCell>
                        <TableCell><strong>Valor Unit.</strong></TableCell>
                        <TableCell><strong>Valor Total</strong></TableCell>
                        <TableCell align="right"><strong>Ações</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.itens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        formData.itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell>{item.produtoNome}</TableCell>
                            <TableCell>{item.fabricanteNome || '-'}</TableCell>
                            <TableCell>R$ {item.valorUnitario.toFixed(2)}</TableCell>
                            <TableCell>R$ {item.valorTotal.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <ActionEdit title="Editar Item" onClick={() => handleOpenItemDialog(index)} />
                              <ActionDelete title="Excluir Item" onClick={() => handleDeleteItem(index)} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {formData.itens.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="right"><strong>Total:</strong></TableCell>
                          <TableCell><strong>R$ {formData.valorTotal.toFixed(2)}</strong></TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )
          }

          {
            tabDialogValue === 2 && (
              <Box sx={{ mt: 2 }}>
                <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>
                  <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Valor dos Itens"
                      value={`R$ ${formData.valorTotal.toFixed(2)}`}
                      InputProps={{ readOnly: true }}
                      sx={{ bgcolor: '#f5f5f5' }}
                    />
                  </Box>

                  <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Desconto"
                      type="number"
                      value={formData.desconto}
                      onChange={(e) => handleInputChange('desconto', parseFloat(e.target.value) || 0)}
                      InputProps={{ startAdornment: 'R$' }}
                      sx={{ bgcolor: '#fce4ec' }}
                    />
                  </Box>

                  <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Valor Final"
                      value={`R$ ${(formData.valorTotal - (formData.desconto || 0)).toFixed(2)}`}
                      InputProps={{ readOnly: true }}
                      sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold' }}
                    />
                  </Box>

                  <Box gridColumn="span 12">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      label="Tipo de Pagamento *"
                      value={formData.pagamento.tipoPagamento}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          pagamento: {
                            ...prev.pagamento,
                            tipoPagamento: e.target.value as 'a_vista' | 'parcelado',
                          },
                        }));
                      }}
                    >
                      <MenuItem value="a_vista">À Vista</MenuItem>
                      <MenuItem value="parcelado">Parcelado</MenuItem>
                    </TextField>
                  </Box>

                  {formData.pagamento.tipoPagamento === 'a_vista' && (
                    <>
                      <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Data de Vencimento *"
                          type="date"
                          value={formData.pagamento.aVista?.dataVencimento || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                aVista: {
                                  ...prev.pagamento.aVista,
                                  dataVencimento: e.target.value,
                                },
                              },
                            }));
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>

                      <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Forma de Pagamento *"
                          value={formData.pagamento.aVista?.formaPagamento || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                aVista: {
                                  ...prev.pagamento.aVista,
                                  formaPagamento: e.target.value,
                                },
                              },
                            }));
                          }}
                        >
                          <MenuItem value="">Selecione...</MenuItem>
                          {FORMAS_PAGAMENTO.map((forma) => (
                            <MenuItem key={forma} value={forma}>
                              {forma}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </>
                  )}

                  {formData.pagamento.tipoPagamento === 'parcelado' && (
                    <>
                      <Box gridColumn="span 12">
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Entrada *"
                          value={formData.pagamento.parcelado?.entrada ? 'sim' : 'nao'}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                parcelado: {
                                  ...prev.pagamento.parcelado!,
                                  entrada: e.target.value === 'sim',
                                },
                              },
                            }));
                          }}
                        >
                          <MenuItem value="nao">Não</MenuItem>
                          <MenuItem value="sim">Sim</MenuItem>
                        </TextField>
                      </Box>

                      {formData.pagamento.parcelado?.entrada && (
                        <>
                          <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Valor da Entrada *"
                              value={formData.pagamento.parcelado?.valorEntrada || 0}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  pagamento: {
                                    ...prev.pagamento,
                                    parcelado: {
                                      ...prev.pagamento.parcelado!,
                                      valorEntrada: parseFloat(e.target.value) || 0,
                                    },
                                  },
                                }));
                              }}
                              InputProps={{ startAdornment: 'R$' }}
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </Box>

                          <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                            <TextField
                              fullWidth
                              size="small"
                              select
                              label="Forma de Pagamento Entrada *"
                              value={formData.pagamento.parcelado?.formaPagamentoEntrada || ''}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  pagamento: {
                                    ...prev.pagamento,
                                    parcelado: {
                                      ...prev.pagamento.parcelado!,
                                      formaPagamentoEntrada: e.target.value,
                                    },
                                  },
                                }));
                              }}
                            >
                              <MenuItem value="">Selecione...</MenuItem>
                              {FORMAS_PAGAMENTO.map((forma) => (
                                <MenuItem key={forma} value={forma}>
                                  {forma}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>

                          <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Dia do Vencimento Entrada *"
                              value={formData.pagamento.parcelado?.diaVencimentoEntrada || 1}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  pagamento: {
                                    ...prev.pagamento,
                                    parcelado: {
                                      ...prev.pagamento.parcelado!,
                                      diaVencimentoEntrada: parseInt(e.target.value) || 1,
                                    },
                                  },
                                }));
                              }}
                              inputProps={{ min: 1, max: 31 }}
                            />
                          </Box>
                        </>
                      )}

                      <Box gridColumn="span 12">
                        <Typography variant="subtitle2" className="font-bold mb-2" sx={{ mt: 2 }}>
                          Parcelas
                        </Typography>
                      </Box>

                      <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Nº de Parcelas *"
                          value={formData.pagamento.parcelado?.numeroParcelas || 1}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                parcelado: {
                                  ...prev.pagamento.parcelado!,
                                  numeroParcelas: parseInt(e.target.value) || 1,
                                },
                              },
                            }));
                          }}
                          inputProps={{ min: 1, max: 120 }}
                        />
                      </Box>

                      <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Forma de Pagamento *"
                          value={formData.pagamento.parcelado?.formaPagamentoParcelas || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                parcelado: {
                                  ...prev.pagamento.parcelado!,
                                  formaPagamentoParcelas: e.target.value,
                                },
                              },
                            }));
                          }}
                        >
                          <MenuItem value="">Selecione...</MenuItem>
                          {FORMAS_PAGAMENTO.map((forma) => (
                            <MenuItem key={forma} value={forma}>
                              {forma}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      <Box gridColumn={{ xs: "span 12", sm: "span 4" }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Dia do Vencimento *"
                          value={formData.pagamento.parcelado?.diaVencimentoParcelas || 1}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              pagamento: {
                                ...prev.pagamento,
                                parcelado: {
                                  ...prev.pagamento.parcelado!,
                                  diaVencimentoParcelas: parseInt(e.target.value) || 1,
                                },
                              },
                            }));
                          }}
                          inputProps={{ min: 1, max: 31 }}
                        />
                      </Box>

                      {formData.pagamento.parcelado?.entrada && (
                        <Box gridColumn="span 12">
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" className="font-bold mb-2">
                              Cálculos
                            </Typography>
                            <Typography variant="body2">
                              <strong>Valor Total:</strong> R$ {(formData.valorTotal - (formData.desconto || 0)).toFixed(2)}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Entrada:</strong> R$ {(formData.pagamento.parcelado?.valorEntrada || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#1976d2' }}>
                              <strong>Valor Restante (a ser parcelado):</strong> R$ {(formData.valorTotal - (formData.desconto || 0) - (formData.pagamento.parcelado?.valorEntrada || 0)).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#2e7d32' }}>
                              <strong>Valor de cada parcela ({formData.pagamento.parcelado?.numeroParcelas || 1}x):</strong> R$ {((formData.valorTotal - (formData.desconto || 0) - (formData.pagamento.parcelado?.valorEntrada || 0)) / (formData.pagamento.parcelado?.numeroParcelas || 1)).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {!formData.pagamento.parcelado?.entrada && formData.pagamento.parcelado?.numeroParcelas && (
                        <Box gridColumn="span 12">
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" className="font-bold mb-2">
                              Cálculos
                            </Typography>
                            <Typography variant="body2">
                              <strong>Valor Total:</strong> R$ {(formData.valorTotal - (formData.desconto || 0)).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#2e7d32' }}>
                              <strong>Valor de cada parcela ({formData.pagamento.parcelado?.numeroParcelas || 1}x):</strong> R$ {((formData.valorTotal - (formData.desconto || 0)) / (formData.pagamento.parcelado?.numeroParcelas || 1)).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            )
          }
        </DialogContent >
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Dialog de Item */}
      < Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="md" fullWidth >
        <DialogTitle>{editingItemIndex !== null ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2} sx={{ mt: 1 }}>
            <Box gridColumn="span 12">
              <Tabs
                value={itemType}
                onChange={(e, v) => setItemType(v)}
                variant="fullWidth"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Produto do Estoque" value="produto" />
                <Tab label="Serviço / Avulso" value="servico" />
              </Tabs>
            </Box>

            {itemType === 'servico' ? (
              <Box gridColumn="span 12">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Descrição do Serviço/Item *"
                  value={itemFormData.descricaoLivre}
                  onChange={(e) => setItemFormData((prev) => ({
                    ...prev,
                    descricaoLivre: e.target.value.toUpperCase(),
                    produtoNome: e.target.value.toUpperCase(), // Mantém compatibilidade visual na tabela
                  }))}
                  placeholder="Descreva o serviço a ser realizado ou item avulso..."
                />
              </Box>
            ) : (
              <Box gridColumn="span 12">
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Produto *"
                  value={itemFormData.produtoId}
                  onChange={(e) => handleProdutoChange(e.target.value)}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {produtos.map((produto) => (
                    <MenuItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}

            <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={itemFormData.quantidade}
                onChange={(e) => setItemFormData((prev) => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            </Box>

            <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Valor Unitário *"
                value={itemFormData.valorUnitario}
                onChange={(e) => setItemFormData((prev) => ({ ...prev, valorUnitario: parseFloat(e.target.value) || 0 }))}
                InputProps={{ startAdornment: 'R$' }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>

            <Box gridColumn="span 12">
              <TextField
                fullWidth
                size="small"
                label="Valor Total"
                value={(itemFormData.quantidade * itemFormData.valorUnitario).toFixed(2)}
                InputProps={{ readOnly: true, startAdornment: 'R$' }}
              />
            </Box>

            {selectedOrcamento?.chamadoId && (
              <>
                <Box gridColumn="span 12">
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Informações Adicionais
                  </Typography>
                </Box>
                <Box gridColumn="span 12">
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Equipamento (Texto Livre)"
                    value={itemFormData.equipamentoTextoLivre}
                    onChange={(e) => setItemFormData((prev) => ({ ...prev, equipamentoTextoLivre: e.target.value }))}
                    placeholder="Descrição do equipamento em texto livre..."
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenItemDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {editingItemIndex !== null ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Dialog de Visualização */}
      < Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth >
        <DialogTitle>Detalhes do Orçamento</DialogTitle>
        <DialogContent>
          {selectedOrcamento && (() => {
            const cliente = clientes.find((c) => c.id === selectedOrcamento.clienteId);
            return (
              <Box className="space-y-4 mt-2">
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Número:</Typography>
                  <Typography>{selectedOrcamento.numero}</Typography>
                </Box>

                {selectedOrcamento.titulo && (
                  <Box>
                    <Typography variant="subtitle2" className="font-bold text-gray-600">Título:</Typography>
                    <Typography>{selectedOrcamento.titulo}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Cliente:</Typography>
                  <Typography>{selectedOrcamento.clienteNome}</Typography>
                  {cliente?.cnpjCpf && (
                    <Typography variant="body2" color="textSecondary">CNPJ/CPF: {cliente.cnpjCpf}</Typography>
                  )}
                </Box>

                {selectedOrcamento.vendedorNome && (
                  <Box>
                    <Typography variant="subtitle2" className="font-bold text-gray-600">Vendedor:</Typography>
                    <Typography>{selectedOrcamento.vendedorNome}</Typography>
                  </Box>
                )}

                {cliente && (cliente.endereco || cliente.numero || cliente.bairro || cliente.cidade || cliente.uf || cliente.cep) && (
                  <Box>
                    <Typography variant="subtitle2" className="font-bold text-gray-600">Endereço:</Typography>
                    <Typography variant="body2">
                      {cliente.endereco && `${cliente.endereco}`}
                      {cliente.numero && `, ${cliente.numero}`}
                      {cliente.complemento && ` - ${cliente.complemento}`}
                      <br />
                      {cliente.bairro && `${cliente.bairro}, `}
                      {cliente.cidade && `${cliente.cidade}`}
                      {cliente.uf && `/${cliente.uf}`}
                      {cliente.cep && ` - CEP: ${cliente.cep}`}
                    </Typography>
                  </Box>
                )}

                {cliente && (cliente.contatoAtual || cliente.contatoFuncao || cliente.contatoTelefone || cliente.contatoWhatsapp || cliente.contatoEmail1 || cliente.contatoEmail2) && (
                  <Box>
                    <Typography variant="subtitle2" className="font-bold text-gray-600">Contato Atual:</Typography>
                    {cliente.contatoAtual && (
                      <Typography variant="body2"><strong>Nome:</strong> {cliente.contatoAtual}</Typography>
                    )}
                    {cliente.contatoFuncao && (
                      <Typography variant="body2"><strong>Função:</strong> {cliente.contatoFuncao}</Typography>
                    )}
                    {cliente.contatoTelefone && (
                      <Typography variant="body2"><strong>Telefone:</strong> {cliente.contatoTelefone}</Typography>
                    )}
                    {cliente.contatoWhatsapp && (
                      <Typography variant="body2"><strong>WhatsApp:</strong> {cliente.contatoWhatsapp}</Typography>
                    )}
                    {cliente.contatoEmail1 && (
                      <Typography variant="body2"><strong>E-mail:</strong> {cliente.contatoEmail1}</Typography>
                    )}
                    {cliente.contatoEmail2 && (
                      <Typography variant="body2"><strong>E-mail 2:</strong> {cliente.contatoEmail2}</Typography>
                    )}
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                  <Chip
                    label={STATUS_OPTIONS.find((s) => s.value === selectedOrcamento.status)?.label}
                    color={getStatusColor(selectedOrcamento.status) as any}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Data de Emissão:</Typography>
                  <Typography>{selectedOrcamento.dataEmissao?.toDate().toLocaleDateString('pt-BR')}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Validade:</Typography>
                  <Typography>{selectedOrcamento.dataValidade?.toDate().toLocaleDateString('pt-BR')}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Itens:</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                        <TableRow>
                          <TableCell><strong>Qtd</strong></TableCell>
                          <TableCell><strong>Produto</strong></TableCell>
                          <TableCell><strong>Fabricante</strong></TableCell>
                          <TableCell><strong>Vlr Unit.</strong></TableCell>
                          <TableCell><strong>Vlr Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrcamento.itens?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell>{item.produtoNome}</TableCell>
                            <TableCell>{item.fabricanteNome || '-'}</TableCell>
                            <TableCell>R$ {item.valorUnitario.toFixed(2)}</TableCell>
                            <TableCell>R$ {item.valorTotal.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Valor Total:</Typography>
                  <Typography variant="h6">R$ {selectedOrcamento.valorTotal.toFixed(2)}</Typography>
                </Box>
                {selectedOrcamento.observacao && (
                  <Box>
                    <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                    <Typography className="whitespace-pre-wrap">{selectedOrcamento.observacao}</Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog >

      {/* Dialog de Confirmação de Exclusão */}
      < ConfirmDialog
        open={openDeleteDialog}
        title="Confirmar exclusão"
        message={`Deseja realmente excluir o orçamento ${selectedOrcamento?.numero}?`}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
      />

      {/* Dialog de Envio de Email */}
      <Dialog open={openEmailDialog} onClose={() => !sendingEmail && setOpenEmailDialog(false)}>
        <DialogTitle>Enviar Orçamento por E-mail</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, minWidth: 300 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              O orçamento <strong>{orcamentoParaEmail?.numero}</strong> será gerado em PDF e enviado em anexo.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="E-mail do Destinatário"
              type="email"
              fullWidth
              variant="outlined"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              disabled={sendingEmail}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEmailDialog(false)} disabled={sendingEmail}>Cancelar</Button>
          <Button onClick={handleSendEmail} variant="contained" disabled={sendingEmail} startIcon={sendingEmail ? <CircularProgress size={20} /> : null}>
            {sendingEmail ? 'Enviando...' : 'Enviar Agora'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Aprovação */}
      <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#4caf50' }}>Aprovar Orçamento</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Confirmar aprovação do orçamento <strong>{selectedOrcamento?.numero}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Cliente: {selectedOrcamento?.clienteNome}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Valor Total: R$ {selectedOrcamento?.valorTotal.toFixed(2)}
          </Typography>
          {selectedOrcamento?.chamadoId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Este orçamento está vinculado à OS {selectedOrcamento.chamadoNumeroOS}.
              O chamado também será atualizado para "Orçamento Aprovado".
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproveDialog(false)}>Cancelar</Button>
          <Button onClick={handleApprove} variant="contained" color="success" startIcon={<CheckCircle />}>
            Aprovar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Reprovação */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>Reprovar Orçamento</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Reprovar orçamento <strong>{selectedOrcamento?.numero}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Cliente: {selectedOrcamento?.clienteNome}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo da Reprovação *"
            value={rejectMotivo}
            onChange={(e) => setRejectMotivo(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Informe o motivo da reprovação..."
          />

          {selectedOrcamento?.chamadoId && selectedOrcamento?.pendenciaOrigem?.pecasRetiradas && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Atenção: Há equipamento retirado!
              </Typography>
              <Typography variant="body2">
                Peças: {selectedOrcamento.pendenciaOrigem.pecasRetiradas}
              </Typography>
              {selectedOrcamento.pendenciaOrigem.localPecas && (
                <Typography variant="body2">
                  Local: {selectedOrcamento.pendenciaOrigem.localPecas}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                O chamado será retornado para a área técnica para devolução do equipamento.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            disabled={!rejectMotivo.trim()}
          >
            Reprovar
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute >
  );
}
