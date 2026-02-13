import { useState, useEffect } from 'react';
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
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, PictureAsPdf, Send, ExpandMore, CheckCircle, Cancel } from '@mui/icons-material';
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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface OrcamentoEquipamento {
  id: string;
  numero: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  vendedorId?: string;
  vendedorNome?: string;
  itens: ItemOrcamento[];
  valorTotal: number;
  status: 'em_elaboracao' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado';
  dataEmissao: Timestamp;
  dataValidade: Timestamp;
  observacao: string;
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
  cnpjCpf: string;
  contatoAtual?: string;
  contatoFuncao?: string;
  contatoTelefone?: string;
  contatoWhatsapp?: string;
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
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
  precoVenda?: number;
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

export function OrcamentosEquipamentosManagement() {
  const { userData } = useAuth();
  const [orcamentos, setOrcamentos] = useState<OrcamentoEquipamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    clienteId: '',
    clienteNome: '',
    vendedorId: '',
    vendedorNome: '',
    itens: [] as ItemOrcamento[],
    valorTotal: 0,
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

  useEffect(() => {
    loadOrcamentos();
    loadClientes();
    loadProdutos();
    loadUsuarios();
  }, [userData]);

  const loadOrcamentos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');
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

    try {
      const clientesRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);

      const clientesList: Cliente[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientesList.push({
          id: doc.id,
          nome: data.nome || '',
          cnpjCpf: data.cnpjCpf || '',
          contatoAtual: data.contatoAtual || '',
          contatoFuncao: data.contatoFuncao || '',
          contatoTelefone: data.contatoTelefone || '',
          contatoWhatsapp: data.contatoWhatsapp || '',
          contatoEmail1: data.contatoEmail1 || '',
          contatoEmail2: data.contatoEmail2 || '',
          endereco: data.endereco || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          cep: data.cep || '',
        });
      });

      setClientes(clientesList);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;

    try {
      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');
      const snapshot = await getDocs(produtosRef);

      const produtosList: Produto[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        produtosList.push({
          id: doc.id,
          tipoNome: data.tipoNome || '',
          descricaoNome: data.descricaoNome || '',
          especificacaoNome: data.especificacaoNome || '',
          fabricanteNome: data.fabricanteNome || '',
          precoVenda: data.precoVenda || 0,
        });
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

    const now = new Date();
    const ano = now.getFullYear().toString().slice(-2);
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `ORÇ-${ano}${mes}`;

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');
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
    setTabDialogValue(0);
    if (orcamento) {
      setIsEditing(true);
      setSelectedOrcamento(orcamento);
      setFormData({
        numero: orcamento.numero,
        titulo: orcamento.titulo || '',
        clienteId: orcamento.clienteId,
        clienteNome: orcamento.clienteNome,
        vendedorId: orcamento.vendedorId || '',
        vendedorNome: orcamento.vendedorNome || '',
        itens: orcamento.itens || [],
        valorTotal: orcamento.valorTotal,
        status: orcamento.status,
        dataEmissao: orcamento.dataEmissao?.toDate().toISOString().split('T')[0] || '',
        dataValidade: orcamento.dataValidade?.toDate().toISOString().split('T')[0] || '',
        observacao: orcamento.observacao || '',
        pagamento: orcamento.pagamento || {
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
    } else {
      setIsEditing(false);
      setSelectedOrcamento(null);
      const novoNumero = await gerarNumeroOrcamento();
      setFormData({
        numero: novoNumero,
        titulo: '',
        clienteId: '',
        clienteNome: '',
        vendedorId: '',
        vendedorNome: '',
        itens: [],
        valorTotal: 0,
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

  const handleCloseDialog = () => {
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
    } else {
      setItemFormData({
        produtoId: '',
        quantidade: 1,
        valorUnitario: 0,
        descricaoLivre: '',
        equipamentoTextoLivre: '',
      });
      setEditingItemIndex(null);
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
    const isOsLinked = !!selectedOrcamento?.chamadoId;
    
    if (isOsLinked) {
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

    if (!itemFormData.produtoId) {
      setError('Selecione um produto');
      return;
    }

    const produto = produtos.find((p) => p.id === itemFormData.produtoId);
    if (!produto) return;

    const produtoNome = `${produto.tipoNome} - ${produto.descricaoNome}${produto.especificacaoNome ? ` - ${produto.especificacaoNome}` : ''}`;

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

    if (!formData.numero || !formData.titulo || !formData.clienteId || !formData.dataEmissao || !formData.dataValidade) {
      setError('Preencha os campos obrigatórios: Número, Título, Cliente, Data de Emissão e Validade');
      return;
    }

    if (formData.itens.length === 0) {
      setError('Adicione pelo menos um item ao orçamento');
      return;
    }

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');

      const orcamentoData = {
        numero: formData.numero,
        titulo: formData.titulo,
        clienteId: formData.clienteId,
        clienteNome: formData.clienteNome,
        vendedorId: formData.vendedorId,
        vendedorNome: formData.vendedorNome,
        itens: formData.itens,
        valorTotal: formData.valorTotal,
        status: formData.status,
        dataEmissao: Timestamp.fromDate(new Date(formData.dataEmissao)),
        dataValidade: Timestamp.fromDate(new Date(formData.dataValidade)),
        observacao: formData.observacao,
        pagamento: formData.pagamento,
        atualizadoEm: Timestamp.now(),
      };

      if (isEditing && selectedOrcamento) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedOrcamento.id);
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
      setError('Erro ao salvar orçamento: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedOrcamento) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedOrcamento.id));
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

    if (orcamento.itens.length === 0) {
      setError('Adicione pelo menos um item ao orçamento antes de finalizar');
      return;
    }

    try {
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', orcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'enviado',
        dataEnvio: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      });

      if (orcamento.chamadoId) {
        const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', orcamento.chamadoId);
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

    try {
      const novoHistorico: HistoricoOperacao = {
        data: Timestamp.now(),
        usuario: userData.nome || userData.email || '',
        usuarioId: userData.id || '',
        acao: 'aprovacao',
        detalhes: 'Orçamento aprovado pelo cliente',
      };

      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedOrcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'aprovado',
        historicoOperacoes: [...(selectedOrcamento.historicoOperacoes || []), novoHistorico],
        atualizadoEm: Timestamp.now(),
      });

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
        
        const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedOrcamento.chamadoId);
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

      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedOrcamento.id);
      await updateDoc(orcamentoRef, {
        status: 'reprovado',
        motivoReprovacao: rejectMotivo,
        historicoOperacoes: [...(selectedOrcamento.historicoOperacoes || []), novoHistorico],
        atualizadoEm: Timestamp.now(),
      });

      if (selectedOrcamento.chamadoId) {
        const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedOrcamento.chamadoId);
        
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

    for (const orcamento of orcamentos) {
      if (orcamento.status === 'enviado' && orcamento.dataValidade) {
        const validade = orcamento.dataValidade.toDate();
        validade.setHours(0, 0, 0, 0);
        
        if (validade < hoje) {
          try {
            const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', orcamento.id);
            await updateDoc(orcamentoRef, {
              status: 'expirado',
              atualizadoEm: Timestamp.now(),
            });
          } catch (err) {
            console.error('Erro ao atualizar orçamento expirado:', err);
          }
        }
      }
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

    try {
      const modeloRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloOrcamento');
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

      const valorTotalExtenso = valorPorExtenso(orcamento.valorTotal);

      let tabelaItens = `
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">Qtd</th>
              <th style="width: 45%; text-align: left;">Produto</th>
              <th style="width: 20%; text-align: left;">Fabricante</th>
              <th style="width: 13%; text-align: right;">Vlr Unit.</th>
              <th style="width: 14%; text-align: right;">Vlr Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      orcamento.itens?.forEach((item) => {
        tabelaItens += `
          <tr>
            <td style="text-align: center;">${item.quantidade}</td>
            <td>${item.produtoNome}</td>
            <td>${item.fabricanteNome || '-'}</td>
            <td style="text-align: right;">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td style="text-align: right;">R$ ${item.valorTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      tabelaItens += `
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL:</td>
              <td style="text-align: right; font-weight: bold;">R$ ${orcamento.valorTotal.toFixed(2)}</td>
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
        contatoHTML = '<div class="info-section" style="margin: 8px 0; padding: 6px 8px; background-color: #f8f9fa; border-left: 3px solid #1976d2;">';
        contatoHTML += '<p style="margin: 0 0 4px 0; font-weight: bold; color: #1976d2; font-size: 10pt;">Contato Atual</p>';

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
        return texto
          .split('\n\n')
          .map(paragrafo => `<p>${paragrafo.replace(/\n/g, '<br>')}</p>`)
          .join('');
      };

      // Preparar dados de pagamento
      const pagamento = orcamento.pagamento;
      let pagamentoAVistaHTML = '';
      let pagamentoParceladoHTML = '';
      let pagamentoEntradaHTML = '';

      if (pagamento?.tipoPagamento === 'a_vista' && pagamento.aVista) {
        pagamentoAVistaHTML = `
          <div class="info-section" style="margin: 0px 0; padding: 8px; background-color: #e8f5e9; border-left: 3px solid #4caf50; line-height: 0.8;">
            <p style="margin: 0 0 0px 0; font-weight: bold; color: #2e7d32; font-size: 11pt;">Condições de Pagamento - À Vista</p>
            <p style="margin: 0;"><strong>Forma de Pagamento:</strong> ${pagamento.aVista.formaPagamento}</p>
            <p style="margin: 0;"><strong>Data de Vencimento:</strong> ${new Date(pagamento.aVista.dataVencimento).toLocaleDateString('pt-BR')}</p>
            <p style="margin: 0;"><strong>Valor Total:</strong> R$ ${orcamento.valorTotal.toFixed(2)}</p>
          </div>
        `;
      }

      if (pagamento?.tipoPagamento === 'parcelado' && pagamento.parcelado) {
        const { entrada, valorEntrada, formaPagamentoEntrada, diaVencimentoEntrada, numeroParcelas, formaPagamentoParcelas, diaVencimentoParcelas } = pagamento.parcelado;

        let valorRestante = orcamento.valorTotal;
        let valorParcela = orcamento.valorTotal;

        if (entrada && valorEntrada) {
          valorRestante = orcamento.valorTotal - valorEntrada;
          valorParcela = valorRestante / (numeroParcelas || 1);

          pagamentoEntradaHTML = `
            <div class="info-section" style="margin: 0px 0; padding: 8px; background-color: #fff3e0; border-left: 3px solid #ff9800; line-height: 0.8;">
              <p style="margin: 0 0 0px 0; font-weight: bold; color: #e65100; font-size: 10pt;">Entrada</p>
              <p style="margin: 0;"><strong>Valor da Entrada:</strong> R$ ${valorEntrada.toFixed(2)}</p>
              <p style="margin: 0;"><strong>Forma de Pagamento:</strong> ${formaPagamentoEntrada}</p>
              <p style="margin: 0;"><strong>Vencimento:</strong> Dia ${diaVencimentoEntrada}</p>
              <p style="margin: 0;"><strong>Valor Restante a Parcelar:</strong> R$ ${valorRestante.toFixed(2)}</p>
            </div>
          `;
        } else {
          valorParcela = orcamento.valorTotal / (numeroParcelas || 1);
        }

        pagamentoParceladoHTML = `
          <div class="info-section" style="margin: 0px 0; padding: 8px; background-color: #e3f2fd; border-left: 3px solid #2196f3; line-height: 0.8;">
            <p style="margin: 0 0 1px 0; font-weight: bold; color: #1976d2; font-size: 11pt;">Condições de Pagamento - Parcelado</p>
            ${pagamentoEntradaHTML}
            <div style="margin-top: 0px; padding: 6px; background-color: #f5f5f5; border-radius: 4px; line-height: 0.8;">
              <p style="margin: 0 0 0px 0; font-weight: bold; font-size: 10pt;">Parcelas</p>
              <p style="margin: 0;"><strong>Número de Parcelas:</strong> ${numeroParcelas}x</p>
              <p style="margin: 0;"><strong>Valor de cada Parcela:</strong> R$ ${valorParcela.toFixed(2)}</p>
              <p style="margin: 0;"><strong>Forma de Pagamento:</strong> ${formaPagamentoParcelas}</p>
              <p style="margin: 0;"><strong>Vencimento:</strong> Todo dia ${diaVencimentoParcelas}</p>
            </div>
            <p style="margin: 6px 0 0 0; font-weight: bold; color: #1976d2;"><strong>Valor Total do Orçamento:</strong> R$ ${orcamento.valorTotal.toFixed(2)}</p>
          </div>
        `;
      }

      let conteudoHTML = modelo.corpo
        .replace(/\{\{NOME_CLIENTE\}\}/g, cliente.nome || '')
        .replace(/\{\{CNPJ_CPF\}\}/g, cliente.cnpjCpf || '')
        .replace(/\{\{ENDERECO\}\}/g, cliente.endereco || '')
        .replace(/\{\{NUMERO\}\}/g, cliente.numero || '')
        .replace(/\{\{COMPLEMENTO\}\}/g, cliente.complemento || '')
        .replace(/\{\{BAIRRO\}\}/g, cliente.bairro || '')
        .replace(/\{\{CIDADE\}\}/g, cliente.cidade || '')
        .replace(/\{\{UF\}\}/g, cliente.uf || '')
        .replace(/\{\{CEP\}\}/g, cliente.cep || '')
        .replace(/\{\{ENDERECO_COMPLETO\}\}/g, enderecoCompleto)
        .replace(/\{\{NUMERO_ORCAMENTO\}\}/g, orcamento.numero)
        .replace(/\{\{TITULO_ORCAMENTO\}\}/g, orcamento.titulo || '')
        .replace(/\{\{DATA_EMISSAO\}\}/g, orcamento.dataEmissao?.toDate().toLocaleDateString('pt-BR') || '')
        .replace(/\{\{DATA_VALIDADE\}\}/g, orcamento.dataValidade?.toDate().toLocaleDateString('pt-BR') || '')
        .replace(/\{\{STATUS\}\}/g, statusLabel)
        .replace(/\{\{VENDEDOR_NOME\}\}/g, orcamento.vendedorNome || '')
        .replace(/\{\{VALOR_TOTAL\}\}/g, `R$ ${orcamento.valorTotal.toFixed(2)}`)
        .replace(/\{\{VALOR_TOTAL_EXTENSO\}\}/g, valorTotalExtenso)
        .replace(/\{\{CONTATO_ATUAL\}\}/g, contatoHTML)
        .replace(/\{\{CONTATO_NOME\}\}/g, cliente.contatoAtual || '')
        .replace(/\{\{CONTATO_APTO\}\}/g, cliente.numero || '')
        .replace(/\{\{CONTATO_FUNCAO\}\}/g, cliente.contatoFuncao || '')
        .replace(/\{\{CONTATO_TELEFONE\}\}/g, cliente.contatoTelefone || '')
        .replace(/\{\{CONTATO_WHATSAPP\}\}/g, cliente.contatoWhatsapp || '')
        .replace(/\{\{CONTATO_EMAIL1\}\}/g, cliente.contatoEmail1 || '')
        .replace(/\{\{CONTATO_EMAIL2\}\}/g, cliente.contatoEmail2 || '')
        .replace(/\{\{OBSERVACAO\}\}/g, orcamento.observacao || '')
        // Placeholders de pagamento
        .replace(/\{\{PAGAMENTO_A_VISTA\}\}/g, pagamentoAVistaHTML)
        .replace(/\{\{PAGAMENTO_PARCELADO\}\}/g, pagamentoParceladoHTML)
        .replace(/\{\{PAGAMENTO_ENTRADA\}\}/g, pagamentoEntradaHTML)
        .replace(/\{\{DATA_VENCIMENTO_VISTA\}\}/g, pagamento?.aVista?.dataVencimento ? new Date(pagamento.aVista.dataVencimento).toLocaleDateString('pt-BR') : '')
        .replace(/\{\{FORMA_PAGAMENTO_VISTA\}\}/g, pagamento?.aVista?.formaPagamento || '')
        .replace(/\{\{VALOR_ENTRADA\}\}/g, pagamento?.parcelado?.valorEntrada ? `R$ ${pagamento.parcelado.valorEntrada.toFixed(2)}` : '')
        .replace(/\{\{FORMA_PAGAMENTO_ENTRADA\}\}/g, pagamento?.parcelado?.formaPagamentoEntrada || '')
        .replace(/\{\{DIA_VENCIMENTO_ENTRADA\}\}/g, pagamento?.parcelado?.diaVencimentoEntrada?.toString() || '')
        .replace(/\{\{NUMERO_PARCELAS\}\}/g, pagamento?.parcelado?.numeroParcelas?.toString() || '')
        .replace(/\{\{VALOR_PARCELA\}\}/g, pagamento?.parcelado ? `R$ ${((pagamento.parcelado.entrada ? orcamento.valorTotal - (pagamento.parcelado.valorEntrada || 0) : orcamento.valorTotal) / (pagamento.parcelado.numeroParcelas || 1)).toFixed(2)}` : '')
        .replace(/\{\{VALOR_RESTANTE\}\}/g, pagamento?.parcelado?.valorEntrada ? `R$ ${(orcamento.valorTotal - pagamento.parcelado.valorEntrada).toFixed(2)}` : '')
        .replace(/\{\{FORMA_PAGAMENTO_PARCELAS\}\}/g, pagamento?.parcelado?.formaPagamentoParcelas || '')
        .replace(/\{\{DIA_VENCIMENTO_PARCELAS\}\}/g, pagamento?.parcelado?.diaVencimentoParcelas?.toString() || '');

      conteudoHTML = processarTexto(conteudoHTML);
      conteudoHTML = conteudoHTML.replace(/\{\{TABELA_ITENS\}\}/g, tabelaItens);
      const rodapeFormatado = processarTexto(modelo.rodape || '');

      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Orçamento ${orcamento.numero}</title>
          <style>
            @page {
              margin: 2cm;
            }
            body { 
              font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
            }
            .page-container {
              position: relative;
              min-height: 20mm;
            }
            .header { 
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px solid #333;
              page-break-inside: avoid;
            }
            .header img { 
              max-width: 150px;
              max-height: 70px;
              margin-bottom: 8px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .contract-number {
              text-align: right;
              font-size: 10pt;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            h1 { 
              font-size: 14pt;
              font-weight: bold;
              margin: 8px 0;
              text-transform: uppercase;
              color: #1976d2;
            }
            .content { 
              margin: 15px 0;
              font-size: 10pt;
            }
            .content p {
              margin: 8px 0;
              text-align: justify;
              line-height: 1.5;
            }
            .content p:first-of-type {
              text-indent: 0;
            }
            .content p:empty {
              display: none;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              font-size: 9pt;
              page-break-inside: avoid;
            }
            table th {
              background-color: #e3f2fd;
              border: 1px solid #90caf9;
              padding: 6px 8px;
              text-align: center;
              font-weight: bold;
              font-size: 9pt;
            }
            table td {
              border: 1px solid #ddd;
              padding: 5px 8px;
              vertical-align: middle;
            }
            table tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            table tbody tr:last-child {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .footer { 
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #333;
              font-size: 9pt;
              page-break-inside: avoid;
            }
            .footer p {
              margin: 5px 0;
              line-height: 1.4;
            }
            .info-section {
              margin: 5px 0;
              padding: 6px 8px;
              background-color: #f8f9fa;
              border-left: 3px solid #1976d2;
              page-break-inside: avoid;
            }
            .info-section p {
              margin: 2px 0;
              line-height: 1.3;
            }
            .info-section strong {
              color: #1976d2;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .page-container {
                page-break-after: auto;
              }
              .no-print {
                display: none;
              }
              @page {
                margin: 15mm 20mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="contract-number">Nº ${orcamento.numero}</div>
            <div class="header">
              ${modelo.logoUrl ? `<img src="${modelo.logoUrl}" alt="Logo" />` : ''}
              <h1>${orcamento.titulo}</h1>
            </div>
            <div class="content">
              ${conteudoHTML}
            </div>
            <div class="footer">
              ${rodapeFormatado}
            </div>
          </div>
        </body>
        </html>
      `;

      const novaJanela = window.open('', '_blank');
      if (novaJanela) {
        novaJanela.document.write(htmlCompleto);
        novaJanela.document.close();
        novaJanela.focus();
        setTimeout(() => {
          novaJanela.print();
        }, 250);
      }
    } catch (err: any) {
      setError('Erro ao gerar PDF: ' + err.message);
    }
  };

  const filteredOrcamentos = orcamentos.filter((orcamento) => {
    const matchesSearch =
      orcamento.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
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

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" className="font-semibold text-gray-700">
          Orçamentos de Equipamentos ({orcamentos.length})
        </Typography>
      </Box>

      <Box className="mb-4">
        <TextField
          fullWidth
          size="small"
          label="Buscar por número ou cliente"
          placeholder="Digite o número ou nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          variant="outlined"
        />
      </Box>

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
        <Box sx={{ mt: 2 }}>
          {filteredOrcamentos.map((orcamento) => {
            const cliente = clientes.find((c) => c.id === orcamento.clienteId);
            return (
              <Accordion 
                key={orcamento.id}
                expanded={expandedOrcamento === orcamento.id}
                onChange={handleAccordionChange(orcamento.id)}
                sx={{ 
                  mb: 1,
                  backgroundColor: orcamento.chamadoId ? '#e3f2fd' : 'white',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="subtitle2" fontWeight="bold">{orcamento.numero}</Typography>
                      {orcamento.chamadoNumeroOS && (
                        <Typography variant="caption" color="primary">OS: {orcamento.chamadoNumeroOS}</Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2">{orcamento.clienteNome}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="body2" fontWeight="bold">R$ {orcamento.valorTotal.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 90 }}>
                      <Typography variant="caption">Val: {orcamento.dataValidade?.toDate().toLocaleDateString('pt-BR')}</Typography>
                    </Box>
                    <Chip
                      label={STATUS_OPTIONS.find((s) => s.value === orcamento.status)?.label}
                      color={getStatusColor(orcamento.status) as any}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Dados do Cliente</Typography>
                      <Typography variant="body2">Cliente: {orcamento.clienteNome}</Typography>
                      <Typography variant="body2">Contato: {cliente?.contatoAtual || '-'}</Typography>
                      <Typography variant="body2">Telefone: {cliente?.contatoTelefone || '-'}</Typography>
                      <Typography variant="body2">Função: {cliente?.contatoFuncao || '-'}</Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 200px' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Dados do Orçamento</Typography>
                      <Typography variant="body2">Vendedor: {orcamento.vendedorNome || '-'}</Typography>
                      <Typography variant="body2">Emissão: {orcamento.dataEmissao?.toDate().toLocaleDateString('pt-BR')}</Typography>
                      <Typography variant="body2">Validade: {orcamento.dataValidade?.toDate().toLocaleDateString('pt-BR')}</Typography>
                      <Typography variant="body2">Itens: {orcamento.itens?.length || 0}</Typography>
                    </Box>
                    {orcamento.chamadoId && orcamento.pendenciaOrigem && (
                      <Box sx={{ flex: '1 1 250px', backgroundColor: '#fff3e0', p: 1, borderRadius: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>
                          Pendência Original
                        </Typography>
                        <Typography variant="body2">Tipo: {orcamento.pendenciaOrigem.tipoPendencia === 'orcamento' ? 'Orçamento' : 'Cobrança'}</Typography>
                        <Typography variant="body2">Descrição: {orcamento.pendenciaOrigem.descricao}</Typography>
                        {orcamento.pendenciaOrigem.pecasRetiradas && (
                          <Typography variant="body2" color="error">Peças Retiradas: {orcamento.pendenciaOrigem.pecasRetiradas}</Typography>
                        )}
                      </Box>
                    )}
                  </Box>

                  {orcamento.itens && orcamento.itens.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Itens do Orçamento</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                              <TableCell>Qtd</TableCell>
                              <TableCell>Produto</TableCell>
                              <TableCell>Fabricante</TableCell>
                              <TableCell>Vlr Unit.</TableCell>
                              <TableCell>Vlr Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orcamento.itens.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell>
                                  {item.produtoNome}
                                  {item.descricaoLivre && (
                                    <Typography variant="caption" display="block" color="textSecondary">
                                      {item.descricaoLivre}
                                    </Typography>
                                  )}
                                  {item.equipamentoTextoLivre && (
                                    <Typography variant="caption" display="block" color="primary">
                                      Equip: {item.equipamentoTextoLivre}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>{item.fabricanteNome}</TableCell>
                                <TableCell>R$ {item.valorUnitario.toFixed(2)}</TableCell>
                                <TableCell>R$ {item.valorTotal.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {orcamento.historicoOperacoes && orcamento.historicoOperacoes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Histórico de Operações</Typography>
                      <Paper variant="outlined" sx={{ p: 1 }}>
                        {orcamento.historicoOperacoes.map((hist, idx) => (
                          <Box key={idx} sx={{ py: 0.5, borderBottom: idx < orcamento.historicoOperacoes!.length - 1 ? '1px solid #eee' : 'none' }}>
                            <Typography variant="caption">
                              {hist.data?.toDate().toLocaleString('pt-BR')} - {hist.usuario} - {hist.acao}
                              {hist.detalhes && `: ${hist.detalhes}`}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => handleOpenViewDialog(orcamento)}>
                      Visualizar
                    </Button>
                    <Button size="small" variant="outlined" color="warning" startIcon={<Edit />} onClick={() => handleOpenDialog(orcamento)}>
                      Editar
                    </Button>
                    {orcamento.status === 'em_elaboracao' && (
                      <Button size="small" variant="contained" color="success" startIcon={<Send />} onClick={() => handleFinalizarEnviar(orcamento)}>
                        Finalizar e Enviar
                      </Button>
                    )}
                    {orcamento.status === 'enviado' && (
                      <>
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => handleOpenApproveDialog(orcamento)}>
                          Aprovar
                        </Button>
                        <Button size="small" variant="contained" color="error" startIcon={<Cancel />} onClick={() => handleOpenRejectDialog(orcamento)}>
                          Reprovar
                        </Button>
                      </>
                    )}
                    <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} onClick={() => handleGerarPDF(orcamento)}>
                      Gerar PDF
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleOpenDeleteDialog(orcamento)}>
                      Excluir
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento de Equipamento'}</DialogTitle>
        <DialogContent>
          <Tabs value={tabDialogValue} onChange={(e, v) => setTabDialogValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Dados Gerais" />
            <Tab label="Itens" />
            <Tab label="Pagamento" />
          </Tabs>

          {tabDialogValue === 0 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Número do Orçamento"
                value={formData.numero}
                InputProps={{ readOnly: true }}
                helperText="Gerado automaticamente"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Título do Orçamento *"
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value.toUpperCase())}
                placeholder="Ex: Proposta de Fornecimento de Equipamentos de Segurança"
              />
            </Grid>

            <Grid item xs={12}>
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
                    {cliente.nome} - {cliente.cnpjCpf}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
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
            </Grid>

            {formData.clienteId && (() => {
              const clienteSelecionado = clientes.find((c) => c.id === formData.clienteId);
              if (clienteSelecionado && clienteSelecionado.contatoAtual) {
                return (
                  <Grid item xs={12}>
                    <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, mt: -1 }}>
                      <Typography variant="subtitle2" className="font-bold mb-1" sx={{ fontSize: '0.875rem' }}>
                        Contato Atual
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Nome"
                            value={clienteSelecionado.contatoAtual}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        {clienteSelecionado.numero && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Apto"
                              value={clienteSelecionado.numero}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {clienteSelecionado.contatoFuncao && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Função"
                              value={clienteSelecionado.contatoFuncao}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {clienteSelecionado.contatoTelefone && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Telefone"
                              value={clienteSelecionado.contatoTelefone}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {clienteSelecionado.contatoWhatsapp && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="WhatsApp"
                              value={clienteSelecionado.contatoWhatsapp}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {clienteSelecionado.contatoEmail1 && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="E-mail"
                              value={clienteSelecionado.contatoEmail1}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {clienteSelecionado.contatoEmail2 && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="E-mail 2"
                              value={clienteSelecionado.contatoEmail2}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Grid>
                );
              }
              return null;
            })()}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Data de Emissão *"
                type="date"
                value={formData.dataEmissao}
                onChange={(e) => handleInputChange('dataEmissao', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Data de Validade *"
                type="date"
                value={formData.dataValidade}
                onChange={(e) => handleInputChange('dataValidade', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>



            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observação"
                multiline
                rows={6}
                value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value)}
              />
            </Grid>
          </Grid>
          )}

          {tabDialogValue === 1 && (
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
                          <IconButton size="small" onClick={() => handleOpenItemDialog(index)} sx={{ color: '#ff9800' }}>
                            <Edit />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteItem(index)} sx={{ color: '#f44336' }}>
                            <Delete />
                          </IconButton>
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
          )}

          {tabDialogValue === 2 && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Valor Total"
                  value={`R$ ${formData.valorTotal.toFixed(2)}`}
                  InputProps={{ readOnly: true }}
                  sx={{ bgcolor: '#f5f5f5' }}
                />
              </Grid>

              <Grid item xs={12}>
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
              </Grid>

              {formData.pagamento.tipoPagamento === 'a_vista' && (
                <>
                  <Grid item xs={12} sm={6}>
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
                  </Grid>

                  <Grid item xs={12} sm={6}>
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
                  </Grid>
                </>
              )}

              {formData.pagamento.tipoPagamento === 'parcelado' && (
                <>
                  <Grid item xs={12}>
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
                  </Grid>

                  {formData.pagamento.parcelado?.entrada && (
                    <>
                      <Grid item xs={12} sm={4}>
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
                      </Grid>

                      <Grid item xs={12} sm={4}>
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
                      </Grid>

                      <Grid item xs={12} sm={4}>
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
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" className="font-bold mb-2" sx={{ mt: 2 }}>
                      Parcelas
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
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
                  </Grid>

                  <Grid item xs={12} sm={4}>
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
                  </Grid>

                  <Grid item xs={12} sm={4}>
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
                  </Grid>

                  {formData.pagamento.parcelado?.entrada && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="subtitle2" className="font-bold mb-2">
                          Cálculos
                        </Typography>
                        <Typography variant="body2">
                          <strong>Valor Total:</strong> R$ {formData.valorTotal.toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Entrada:</strong> R$ {(formData.pagamento.parcelado?.valorEntrada || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#1976d2' }}>
                          <strong>Valor Restante (a ser parcelado):</strong> R$ {(formData.valorTotal - (formData.pagamento.parcelado?.valorEntrada || 0)).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#2e7d32' }}>
                          <strong>Valor de cada parcela ({formData.pagamento.parcelado?.numeroParcelas || 1}x):</strong> R$ {((formData.valorTotal - (formData.pagamento.parcelado?.valorEntrada || 0)) / (formData.pagamento.parcelado?.numeroParcelas || 1)).toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {!formData.pagamento.parcelado?.entrada && formData.pagamento.parcelado?.numeroParcelas && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="subtitle2" className="font-bold mb-2">
                          Cálculos
                        </Typography>
                        <Typography variant="body2">
                          <strong>Valor Total:</strong> R$ {formData.valorTotal.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontSize: '1rem', color: '#2e7d32' }}>
                          <strong>Valor de cada parcela ({formData.pagamento.parcelado?.numeroParcelas || 1}x):</strong> R$ {(formData.valorTotal / (formData.pagamento.parcelado?.numeroParcelas || 1)).toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Item */}
      <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItemIndex !== null ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedOrcamento?.chamadoId ? (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Orçamento vinculado a OS - Use descrição livre para os itens
                </Alert>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Descrição do Produto/Serviço *"
                  value={itemFormData.descricaoLivre}
                  onChange={(e) => setItemFormData((prev) => ({ 
                    ...prev, 
                    descricaoLivre: e.target.value,
                    produtoNome: e.target.value,
                  }))}
                  placeholder="Descreva o produto ou serviço a ser incluído no orçamento..."
                  helperText="Campo de texto livre para descrição do item"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
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
                      {produto.tipoNome} - {produto.descricaoNome}
                      {produto.especificacaoNome ? ` - ${produto.especificacaoNome}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={itemFormData.quantidade}
                onChange={(e) => setItemFormData((prev) => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Valor Total"
                value={(itemFormData.quantidade * itemFormData.valorUnitario).toFixed(2)}
                InputProps={{ readOnly: true, startAdornment: 'R$' }}
              />
            </Grid>

            {selectedOrcamento?.chamadoId && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Informações Adicionais
                  </Typography>
                </Grid>
                <Grid item xs={12}>
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
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenItemDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {editingItemIndex !== null ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
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
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{selectedOrcamento?.numero}</strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Excluir
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
    </ProtectedRoute>
  );
}