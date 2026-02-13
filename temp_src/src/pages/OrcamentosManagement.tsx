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
} from '@mui/material';
import { Edit, Delete, Add, Visibility, PictureAsPdf } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface Orcamento {
  id: string;
  tipo: 'equipamento' | 'contrato';
  numero: string;
  clienteId: string;
  clienteNome: string;
  valorTotal: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'expirado';
  dataEmissao: Timestamp;
  dataValidade: Timestamp;
  observacao: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Contrato {
  id: string;
  numero: string;
  titulo: string;
  data: Timestamp;
  tipoContrato: 'com_pecas' | 'sem_pecas' | 'comodato';
  clienteId: string;
  clienteNome: string;
  clienteCnpjCpf: string;
  clienteEndereco: string;
  clienteNumero: string;
  clienteComplemento: string;
  clienteBairro: string;
  clienteCidade: string;
  clienteUf: string;
  clienteCep: string;
  vendedorId?: string;
  vendedorNome?: string;
  equipamentosCobertos: EquipamentoContrato[];
  equipamentosNaoCobertos: EquipamentoContrato[];
  valorContrato: number;
  status: 'em_elaboracao' | 'enviado_ao_cliente' | 'aprovado' | 'reprovado' | 'expirado';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface EquipamentoContrato {
  produtoId: string;
  equipamento: string;
  quantidade: number;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
}

interface Cliente {
  id: string;
  nome: string;
  cnpjCpf: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

interface Produto {
  id: string;
  tipoId: string;
  tipoNome: string;
  descricaoId: string;
  descricaoNome: string;
  especificacaoId: string;
  especificacaoNome: string;
  fabricanteId: string;
  fabricanteNome: string;
  sku: string;
  naturezaId: string;
}

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'warning' },
  { value: 'aprovado', label: 'Aprovado', color: 'success' },
  { value: 'rejeitado', label: 'Rejeitado', color: 'error' },
  { value: 'expirado', label: 'Expirado', color: 'default' },
];

const TIPO_CONTRATO_OPTIONS = [
  { value: 'com_pecas', label: 'Com Peças' },
  { value: 'sem_pecas', label: 'Sem Peças' },
  { value: 'comodato', label: 'Comodato' },
];

const STATUS_CONTRATO_OPTIONS = [
  { value: 'em_elaboracao', label: 'Em Elaboração', color: 'warning' },
  { value: 'enviado_ao_cliente', label: 'Enviado ao Cliente', color: 'info' },
  { value: 'aprovado', label: 'Aprovado', color: 'success' },
  { value: 'reprovado', label: 'Reprovado', color: 'error' },
  { value: 'expirado', label: 'Expirado', color: 'secondary' },
];

interface OrcamentosManagementProps {
  initialTab?: number;
}

export function OrcamentosManagement({ initialTab = 0 }: OrcamentosManagementProps) {
  const { userData } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabDialogValue, setTabDialogValue] = useState(0);

  // Estados para gerenciamento de equipamentos cobertos
  const [openEquipamentoCobertosDialog, setOpenEquipamentoCobertosDialog] = useState(false);
  const [equipamentoCobertosFormData, setEquipamentoCobertosFormData] = useState({
    produtoId: '',
    quantidade: 1,
  });
  const [editingEquipamentoCobertosIndex, setEditingEquipamentoCobertosIndex] = useState<number | null>(null);

  // Estados para gerenciamento de equipamentos não cobertos
  const [openEquipamentoNaoCobertosDialog, setOpenEquipamentoNaoCobertosDialog] = useState(false);
  const [equipamentoNaoCobertosFormData, setEquipamentoNaoCobertosFormData] = useState({
    produtoId: '',
    quantidade: 1,
  });
  const [editingEquipamentoNaoCobertosIndex, setEditingEquipamentoNaoCobertosIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    tipo: 'equipamento' as 'equipamento' | 'contrato',
    numero: '',
    clienteId: '',
    clienteNome: '',
    valorTotal: 0,
    status: 'pendente' as 'pendente' | 'aprovado' | 'rejeitado' | 'expirado',
    dataEmissao: '',
    dataValidade: '',
    observacao: '',
  });

  const [contratoFormData, setContratoFormData] = useState({
    numero: '',
    titulo: '',
    data: new Date().toISOString().split('T')[0],
    tipoContrato: 'com_pecas' as 'com_pecas' | 'sem_pecas' | 'comodato',
    clienteId: '',
    vendedorId: '',
    equipamentosCobertos: [] as EquipamentoContrato[],
    equipamentosNaoCobertos: [] as EquipamentoContrato[],
    valorContrato: 0,
    status: 'em_elaboracao' as 'em_elaboracao' | 'enviado_ao_cliente' | 'aprovado' | 'reprovado' | 'expirado',
  });

  useEffect(() => {
    loadOrcamentos();
    loadContratos();
    loadClientes();
    loadProdutos();
    loadUsuarios();
  }, [userData]);

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
          nome: data.nome,
          cnpjCpf: data.cnpjCpf || '',
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
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        produtosList.push({
          id: docSnap.id,
          tipoId: data.tipoId || '',
          tipoNome: data.tipoNome || '',
          descricaoId: data.descricaoId || '',
          descricaoNome: data.descricaoNome || '',
          especificacaoId: data.especificacaoId || '',
          especificacaoNome: data.especificacaoNome || '',
          fabricanteId: data.fabricanteId || '',
          fabricanteNome: data.fabricanteNome || '',
          sku: data.sku || '',
          naturezaId: data.naturezaId || '',
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

      const usuariosList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usuariosList.push({
          id: docSnap.id,
          nome: data.nome || '',
          email: data.email || '',
        });
      });

      setUsuarios(usuariosList);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const loadOrcamentos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');
      const snapshot = await getDocs(orcamentosRef);

      const orcamentosList: Orcamento[] = [];
      snapshot.forEach((doc) => {
        orcamentosList.push({ id: doc.id, ...doc.data() } as Orcamento);
      });

      setOrcamentos(orcamentosList);
    } catch (err: any) {
      setError('Erro ao carregar orçamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContratos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const contratosRef = collection(db, 'EMPRESAS', userData.empresaId, 'contratos');
      const snapshot = await getDocs(contratosRef);

      const contratosList: Contrato[] = [];
      snapshot.forEach((doc) => {
        contratosList.push({ id: doc.id, ...doc.data() } as Contrato);
      });

      setContratos(contratosList);
    } catch (err: any) {
      setError('Erro ao carregar contratos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarNumeroContrato = async (): Promise<string> => {
    if (!userData?.empresaId) return '';

    const now = new Date();
    const ano = now.getFullYear().toString().slice(-2);
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `CONT-${ano}${mes}`;

    try {
      const contratosRef = collection(db, 'EMPRESAS', userData.empresaId, 'contratos');
      const q = query(
        contratosRef,
        where('numero', '>=', prefixo),
        where('numero', '<', `CONT-${ano}${mes}9999`),
        orderBy('numero', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      let proximoNumero = 1;
      if (!snapshot.empty) {
        const ultimoNumero = snapshot.docs[0].data().numero;
        const sequencial = parseInt(ultimoNumero.slice(-4));
        proximoNumero = sequencial + 1;
      }

      return `${prefixo}${proximoNumero.toString().padStart(4, '0')}`;
    } catch (err) {
      console.error('Erro ao gerar número do contrato:', err);
      return `${prefixo}0001`;
    }
  };

  const handleOpenDialog = async (orcamento?: Orcamento, tipo?: 'equipamento' | 'contrato') => {
    if (orcamento) {
      setIsEditing(true);
      setSelectedOrcamento(orcamento);
      setFormData({
        tipo: orcamento.tipo,
        numero: orcamento.numero,
        clienteId: orcamento.clienteId,
        clienteNome: orcamento.clienteNome,
        valorTotal: orcamento.valorTotal,
        status: orcamento.status,
        dataEmissao: orcamento.dataEmissao?.toDate().toISOString().split('T')[0] || '',
        dataValidade: orcamento.dataValidade?.toDate().toISOString().split('T')[0] || '',
        observacao: orcamento.observacao,
      });
    } else {
      setIsEditing(false);
      setSelectedOrcamento(null);
      setFormData({
        tipo: tipo || 'equipamento',
        numero: '',
        clienteId: '',
        clienteNome: '',
        valorTotal: 0,
        status: 'pendente',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataValidade: '',
        observacao: '',
      });
    }
    setOpenDialog(true);
  };

  const handleOpenContratoDialog = async (contrato?: Contrato) => {
    setTabDialogValue(0);
    if (contrato) {
      setIsEditing(true);
      setSelectedContrato(contrato);
      setContratoFormData({
        numero: contrato.numero,
        titulo: contrato.titulo || '',
        data: contrato.data?.toDate().toISOString().split('T')[0] || '',
        tipoContrato: contrato.tipoContrato,
        clienteId: contrato.clienteId,
        vendedorId: contrato.vendedorId || '',
        equipamentosCobertos: contrato.equipamentosCobertos || [],
        equipamentosNaoCobertos: contrato.equipamentosNaoCobertos || [],
        valorContrato: contrato.valorContrato,
        status: contrato.status,
      });
    } else {
      setIsEditing(false);
      setSelectedContrato(null);
      const novoNumero = await gerarNumeroContrato();
      setContratoFormData({
        numero: novoNumero,
        titulo: '',
        data: new Date().toISOString().split('T')[0],
        tipoContrato: 'com_pecas',
        clienteId: '',
        vendedorId: '',
        equipamentosCobertos: [],
        equipamentosNaoCobertos: [],
        valorContrato: 0,
        status: 'em_elaboracao',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOrcamento(null);
    setSelectedContrato(null);
    setIsEditing(false);
  };

  const handleOpenViewDialog = (item: Orcamento | Contrato) => {
    if ('tipo' in item) {
      setSelectedOrcamento(item);
    } else {
      setSelectedContrato(item);
    }
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedOrcamento(null);
    setSelectedContrato(null);
  };

  const handleOpenDeleteDialog = (item: Orcamento | Contrato) => {
    if ('tipo' in item) {
      setSelectedOrcamento(item);
    } else {
      setSelectedContrato(item);
    }
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedOrcamento(null);
    setSelectedContrato(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContratoInputChange = (field: string, value: any) => {
    setContratoFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      handleContratoInputChange('clienteId', clienteId);
    }
  };

  // Funções para equipamentos cobertos
  const handleOpenEquipamentoCobertosDialog = () => {
    setEquipamentoCobertosFormData({
      produtoId: '',
      quantidade: 1
    });
    setEditingEquipamentoCobertosIndex(null);
    setOpenEquipamentoCobertosDialog(true);
  };

  const handleEditEquipamentoCobertos = (index: number) => {
    const equip = contratoFormData.equipamentosCobertos[index];
    setEquipamentoCobertosFormData({
      produtoId: equip.produtoId,
      quantidade: equip.quantidade
    });
    setEditingEquipamentoCobertosIndex(index);
    setOpenEquipamentoCobertosDialog(true);
  };

  const handleSaveEquipamentoCobertos = () => {
    if (!equipamentoCobertosFormData.produtoId) {
      setError('Selecione o Equipamento');
      return;
    }

    const produto = produtos.find(p => p.id === equipamentoCobertosFormData.produtoId);
    if (!produto) {
      setError('Produto não encontrado');
      return;
    }

    let nomeEquipamento = `${produto.tipoNome} - ${produto.descricaoNome}`;
    if (produto.especificacaoNome) nomeEquipamento += ` - ${produto.especificacaoNome}`;

    const novosEquipamentos = [...contratoFormData.equipamentosCobertos];
    const equipamentoData = {
      produtoId: produto.id,
      equipamento: nomeEquipamento,
      quantidade: equipamentoCobertosFormData.quantidade,
      tipoNome: produto.tipoNome,
      descricaoNome: produto.descricaoNome,
      especificacaoNome: produto.especificacaoNome || '',
      fabricanteNome: produto.fabricanteNome || '',
    };

    if (editingEquipamentoCobertosIndex !== null) {
      novosEquipamentos[editingEquipamentoCobertosIndex] = equipamentoData;
    } else {
      novosEquipamentos.push(equipamentoData);
    }

    handleContratoInputChange('equipamentosCobertos', novosEquipamentos);
    setOpenEquipamentoCobertosDialog(false);
  };

  const handleDeleteEquipamentoCobertos = (index: number) => {
    const novosEquipamentos = contratoFormData.equipamentosCobertos.filter((_, i) => i !== index);
    handleContratoInputChange('equipamentosCobertos', novosEquipamentos);
  };

  // Funções para equipamentos não cobertos
  const handleOpenEquipamentoNaoCobertosDialog = () => {
    setEquipamentoNaoCobertosFormData({
      produtoId: '',
      quantidade: 1
    });
    setEditingEquipamentoNaoCobertosIndex(null);
    setOpenEquipamentoNaoCobertosDialog(true);
  };

  const handleEditEquipamentoNaoCobertos = (index: number) => {
    const equip = contratoFormData.equipamentosNaoCobertos[index];
    setEquipamentoNaoCobertosFormData({
      produtoId: equip.produtoId,
      quantidade: equip.quantidade
    });
    setEditingEquipamentoNaoCobertosIndex(index);
    setOpenEquipamentoNaoCobertosDialog(true);
  };

  const handleSaveEquipamentoNaoCobertos = () => {
    if (!equipamentoNaoCobertosFormData.produtoId) {
      setError('Selecione o Equipamento');
      return;
    }

    const produto = produtos.find(p => p.id === equipamentoNaoCobertosFormData.produtoId);
    if (!produto) {
      setError('Produto não encontrado');
      return;
    }

    let nomeEquipamento = `${produto.tipoNome} - ${produto.descricaoNome}`;
    if (produto.especificacaoNome) nomeEquipamento += ` - ${produto.especificacaoNome}`;

    const novosEquipamentos = [...contratoFormData.equipamentosNaoCobertos];
    const equipamentoData = {
      produtoId: produto.id,
      equipamento: nomeEquipamento,
      quantidade: equipamentoNaoCobertosFormData.quantidade,
      tipoNome: produto.tipoNome,
      descricaoNome: produto.descricaoNome,
      especificacaoNome: produto.especificacaoNome || '',
      fabricanteNome: produto.fabricanteNome || '',
    };

    if (editingEquipamentoNaoCobertosIndex !== null) {
      novosEquipamentos[editingEquipamentoNaoCobertosIndex] = equipamentoData;
    } else {
      novosEquipamentos.push(equipamentoData);
    }

    handleContratoInputChange('equipamentosNaoCobertos', novosEquipamentos);
    setOpenEquipamentoNaoCobertosDialog(false);
  };

  const handleDeleteEquipamentoNaoCobertos = (index: number) => {
    const novosEquipamentos = contratoFormData.equipamentosNaoCobertos.filter((_, i) => i !== index);
    handleContratoInputChange('equipamentosNaoCobertos', novosEquipamentos);
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;

    if (!formData.numero || !formData.clienteNome || !formData.dataEmissao || !formData.dataValidade) {
      setError('Preencha os campos obrigatórios: Número, Cliente, Data de Emissão e Validade');
      return;
    }

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');

      const orcamentoData = {
        ...formData,
        dataEmissao: Timestamp.fromDate(new Date(formData.dataEmissao)),
        dataValidade: Timestamp.fromDate(new Date(formData.dataValidade)),
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

  const handleSaveContrato = async () => {
    if (!userData?.empresaId) return;

    if (!contratoFormData.numero || !contratoFormData.titulo || !contratoFormData.clienteId || !contratoFormData.data) {
      setError('Preencha os campos obrigatórios: Número, Título, Cliente e Data');
      return;
    }

    try {
      const cliente = clientes.find(c => c.id === contratoFormData.clienteId);
      if (!cliente) {
        setError('Cliente não encontrado');
        return;
      }

      const contratosRef = collection(db, 'EMPRESAS', userData.empresaId, 'contratos');

      // Log do status ANTES de processar
      console.log('[SAVE] Status ANTES:', contratoFormData.status, 'Tipo:', typeof contratoFormData.status);

      const statusFinal = contratoFormData.status.toLowerCase();
      console.log('[SAVE] Status DEPOIS do toLowerCase:', statusFinal);

      const vendedor = usuarios.find(u => u.id === contratoFormData.vendedorId);

      const contratoData = {
        numero: contratoFormData.numero,
        titulo: contratoFormData.titulo,
        data: Timestamp.fromDate(new Date(contratoFormData.data)),
        tipoContrato: contratoFormData.tipoContrato,
        clienteId: contratoFormData.clienteId,
        clienteNome: cliente.nome,
        clienteCnpjCpf: cliente.cnpjCpf,
        clienteEndereco: cliente.endereco,
        clienteNumero: cliente.numero,
        clienteComplemento: cliente.complemento,
        clienteBairro: cliente.bairro,
        clienteCidade: cliente.cidade,
        clienteUf: cliente.uf,
        clienteCep: cliente.cep,
        vendedorId: contratoFormData.vendedorId || '',
        vendedorNome: vendedor?.nome || '',
        equipamentosCobertos: contratoFormData.equipamentosCobertos,
        equipamentosNaoCobertos: contratoFormData.equipamentosNaoCobertos,
        valorContrato: contratoFormData.valorContrato,
        status: statusFinal,
        atualizadoEm: Timestamp.now(),
      };

      console.log('[SAVE] Dados completos que serão salvos:', contratoData);

      if (isEditing && selectedContrato) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'contratos', selectedContrato.id);
        await updateDoc(docRef, contratoData);
        setSuccess('Contrato atualizado com sucesso!');
      } else {
        await addDoc(contratosRef, {
          ...contratoData,
          criadoEm: Timestamp.now(),
        });
        setSuccess('Contrato criado com sucesso!');
      }

      handleCloseDialog();
      loadContratos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar contrato: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId) return;

    try {
      if (selectedOrcamento) {
        await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedOrcamento.id));
        setSuccess('Orçamento excluído com sucesso!');
        loadOrcamentos();
      } else if (selectedContrato) {
        await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'contratos', selectedContrato.id));
        setSuccess('Contrato excluído com sucesso!');
        loadContratos();
      }

      handleCloseDeleteDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir: ' + err.message);
    }
  };

  // Função para converter valor numérico em extenso
  const valorPorExtenso = (valor: number): string => {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dez = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (valor === 0) return 'zero reais';
    if (valor === 100) return 'cem reais';

    const partes = valor.toFixed(2).split('.');
    const inteiro = parseInt(partes[0]);
    const centavos = parseInt(partes[1]);

    let extenso = '';

    // Processar milhares
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

    // Processar centenas, dezenas e unidades
    if (resto > 0) {
      extenso += converterCentenas(resto);
    }

    // Adicionar "reais"
    extenso += inteiro === 1 ? ' real' : ' reais';

    // Processar centavos
    if (centavos > 0) {
      extenso += ' e ' + converterCentenas(centavos);
      extenso += centavos === 1 ? ' centavo' : ' centavos';
    }

    return extenso;

    function converterCentenas(num: number): string {
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
    }
  };

  const handleGerarPDF = async (contrato: Contrato) => {
    if (!userData?.empresaId) return;

    try {
      // Buscar modelo de contrato
      const modeloRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      const modeloSnap = await getDoc(modeloRef);

      if (!modeloSnap.exists()) {
        setError('Modelo de contrato não configurado. Configure em Parâmetros Comerciais.');
        return;
      }

      const modelo = modeloSnap.data();

      // Preparar dados do contrato
      const enderecoCompleto = `${contrato.clienteEndereco}, ${contrato.clienteNumero}${contrato.clienteComplemento ? ` - ${contrato.clienteComplemento}` : ''}, ${contrato.clienteBairro}, ${contrato.clienteCidade}/${contrato.clienteUf}${contrato.clienteCep ? ` - CEP: ${contrato.clienteCep}` : ''}`;

      const tipoContratoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label || '';

      // Gerar tabela de equipamentos cobertos
      let tabelaCobertos = '<table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><thead><tr><th>Quantidade</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>';
      contrato.equipamentosCobertos.forEach(eq => {
        tabelaCobertos += `<tr><td>${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
      });
      tabelaCobertos += '</tbody></table>';

      // Gerar tabela de equipamentos não cobertos
      let tabelaNaoCobertos = '<table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><thead><tr><th>Quantidade</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>';
      contrato.equipamentosNaoCobertos.forEach(eq => {
        tabelaNaoCobertos += `<tr><td>${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
      });
      tabelaNaoCobertos += '</tbody></table>';

      // Função para processar texto e preservar formatação
      const processarTexto = (texto: string): string => {
        return texto
          // Substituir quebras de linha duplas por parágrafos
          .split('\n\n')
          .map(paragrafo => `<p>${paragrafo.replace(/\n/g, '<br>')}</p>`)
          .join('');
      };

      // Substituir placeholders no corpo do contrato
      const valorMensalExtenso = valorPorExtenso(contrato.valorContrato);

      let conteudoHTML = modelo.corpo
        .replace(/\{\{NOME_CLIENTE\}\}/g, contrato.clienteNome)
        .replace(/\{\{CNPJ_CPF\}\}/g, contrato.clienteCnpjCpf)
        .replace(/\{\{ENDERECO_COMPLETO\}\}/g, enderecoCompleto)
        .replace(/\{\{TIPO_CONTRATO\}\}/g, tipoContratoLabel)
        .replace(/\{\{TABELA_EQUIPAMENTOS_COBERTOS\}\}/g, tabelaCobertos)
        .replace(/\{\{TABELA_EQUIPAMENTOS_NAO_COBERTOS\}\}/g, tabelaNaoCobertos)
        .replace(/\{\{DATA_INICIO\}\}/g, contrato.data?.toDate().toLocaleDateString('pt-BR') || '')
        .replace(/\{\{VALOR_MENSAL\}\}/g, `R$ ${contrato.valorContrato.toFixed(2)}`)
        .replace(/\{\{VALOR_MENSAL_EXTENSO\}\}/g, valorMensalExtenso);

      // Processar formatação do corpo
      conteudoHTML = processarTexto(conteudoHTML);

      // Processar formatação do rodapé
      const rodapeFormatado = processarTexto(modelo.rodape || '');

      // Criar HTML completo para impressão
      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Contrato ${contrato.numero}</title>
          <style>
            @page {
              margin: 2cm;
            }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              position: relative;
            }
            .contract-number {
              position: absolute;
              top: 0;
              right: 0;
              font-size: 11pt;
              font-weight: bold;
              color: #333;
            }
            .logo { 
              max-width: 200px; 
              max-height: 100px;
              margin-bottom: 10px;
            }
            h1 { 
              font-size: 18pt;
              font-weight: bold;
              margin: 10px 0;
              text-transform: uppercase;
              color: #1976d2;
            }
            .content {
              margin: 20px 0;
            }
            p {
              margin: 12px 0;
              text-align: justify;
              text-indent: 2em;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              page-break-inside: avoid;
            }
            th, td { 
              border: 1px solid #333; 
              padding: 10px; 
              text-align: left;
              font-size: 11pt;
            }
            th { 
              background-color: #f5f5f5;
              font-weight: bold;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              padding-top: 5px;
              border-top: 2px solid #333;
            }
            .footer p {
              text-indent: 0;
              margin: 8px 0;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="contract-number">Nº ${contrato.numero}</div>
            ${modelo.logoUrl ? `<img src="${modelo.logoUrl}" class="logo" alt="Logo">` : ''}
            <h1>${contrato.titulo}</h1>
          </div>
          <div class="content">
            ${conteudoHTML}
          </div>
          <div class="footer">
            ${rodapeFormatado}
          </div>
        </body>
        </html>
      `;

      // Abrir em nova janela para impressão/PDF
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
    const matchesTipo = orcamento.tipo === 'equipamento';
    const matchesSearch =
      orcamento.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTipo && matchesSearch;
  });

  const filteredContratos = contratos.filter((contrato) => {
    const matchesSearch =
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption?.color || 'default';
  };

  const getStatusContratoColor = (status: string) => {
    const statusOption = STATUS_CONTRATO_OPTIONS.find(opt => opt.value === status);
    return statusOption?.color || 'default';
  };

  return (
    <ProtectedRoute requiredRoute="/orcamentos-contratos">
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Contratos
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenContratoDialog()}
          >
            Novo Orçamento de Contrato
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
          Orçamentos de Contratos ({contratos.length})
        </Typography>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-8">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box className="mb-4">
            <TextField
              fullWidth
              size="small"
              label={`Buscar por número ou cliente`}
              placeholder="Digite o número ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              variant="outlined"
            />
          </Box>

          <TableContainer component={Paper} className="mt-4">
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
                  <TableRow>
                    <TableCell><strong>Número</strong></TableCell>
                    <TableCell><strong>Data</strong></TableCell>
                    <TableCell><strong>Cliente</strong></TableCell>
                    <TableCell><strong>Vendedor</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell><strong>Valor</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContratos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum contrato encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContratos.map((contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell>{contrato.numero}</TableCell>
                        <TableCell>{contrato.data?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{contrato.clienteNome}</TableCell>
                        <TableCell>{contrato.vendedorNome || '-'}</TableCell>
                        <TableCell>
                          {TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label}
                        </TableCell>
                        <TableCell>R$ {contrato.valorContrato.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_CONTRATO_OPTIONS.find(s => s.value === contrato.status)?.label}
                            color={getStatusContratoColor(contrato.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenViewDialog(contrato)}
                            title="Visualizar"
                            sx={{ color: '#1976d2' }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenContratoDialog(contrato)}
                            title="Editar"
                            sx={{ color: '#ff9800' }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteDialog(contrato)}
                            title="Excluir"
                            sx={{ color: '#f44336' }}
                          >
                            <Delete />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleGerarPDF(contrato)}
                            title="Gerar PDF"
                            sx={{ color: '#4caf50' }}
                          >
                            <PictureAsPdf />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
      )}

      {/* Dialog de Cadastro/Edição de Contrato */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Orçamento de Contrato' : 'Novo Orçamento de Contrato'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabDialogValue} onChange={(e, v) => setTabDialogValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Dados Gerais" />
            <Tab label="Itens" />
          </Tabs>

          {tabDialogValue === 0 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Número do Contrato"
                value={contratoFormData.numero}
                InputProps={{ readOnly: true }}
                helperText="Gerado automaticamente"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Data *"
                type="date"
                value={contratoFormData.data}
                onChange={(e) => handleContratoInputChange('data', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Título do Contrato *"
                value={contratoFormData.titulo}
                onChange={(e) => handleContratoInputChange('titulo', e.target.value.toUpperCase())}
                placeholder="Ex: CONTRATO DE PRESTAÇÃO DE SERVIÇOS"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Tipo de Contrato *"
                value={contratoFormData.tipoContrato}
                onChange={(e) => handleContratoInputChange('tipoContrato', e.target.value)}
              >
                {TIPO_CONTRATO_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={contratoFormData.status}
                onChange={(e) => handleContratoInputChange('status', e.target.value)}
              >
                {STATUS_CONTRATO_OPTIONS.map((option) => (
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
                select
                label="Cliente *"
                value={contratoFormData.clienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
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
                value={contratoFormData.vendedorId}
                onChange={(e) => handleContratoInputChange('vendedorId', e.target.value)}
              >
                <MenuItem value="">Selecione um vendedor</MenuItem>
                {usuarios.map((usuario) => (
                  <MenuItem key={usuario.id} value={usuario.id}>
                    {usuario.nome} - {usuario.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {contratoFormData.clienteId && (() => {
              const clienteSelecionado = clientes.find(c => c.id === contratoFormData.clienteId);
              if (clienteSelecionado) {
                const enderecoCompleto = `${clienteSelecionado.endereco}, ${clienteSelecionado.numero}${clienteSelecionado.complemento ? ` - ${clienteSelecionado.complemento}` : ''}, ${clienteSelecionado.bairro}, ${clienteSelecionado.cidade}/${clienteSelecionado.uf}${clienteSelecionado.cep ? ` - CEP: ${clienteSelecionado.cep}` : ''}`;
                return (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Endereço Completo"
                      value={enderecoCompleto}
                      InputProps={{ readOnly: true }}
                      multiline
                      rows={2}
                    />
                  </Grid>
                );
              }
              return null;
            })()}

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Valor do Contrato (Mensal)"
                type="number"
                value={contratoFormData.valorContrato}
                onChange={(e) => handleContratoInputChange('valorContrato', parseFloat(e.target.value) || 0)}
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
          </Grid>
          )}

          {tabDialogValue === 1 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="subtitle2" className="font-bold">
                    Equipamentos Cobertos pelo Contrato
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={handleOpenEquipamentoCobertosDialog}
                  >
                    Adicionar
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableRow>
                        <TableCell><strong>Quantidade</strong></TableCell>
                        <TableCell><strong>Equipamento</strong></TableCell>
                        <TableCell><strong>Fabricante</strong></TableCell>
                        <TableCell align="right"><strong>Ações</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contratoFormData.equipamentosCobertos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            Nenhum equipamento adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        contratoFormData.equipamentosCobertos.map((eq, index) => (
                          <TableRow key={index}>
                            <TableCell>{eq.quantidade}</TableCell>
                            <TableCell>{eq.equipamento}</TableCell>
                            <TableCell>{eq.fabricanteNome || '-'}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditEquipamentoCobertos(index)}
                                sx={{ color: '#ff9800' }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEquipamentoCobertos(index)}
                                sx={{ color: '#f44336' }}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="subtitle2" className="font-bold">
                    Equipamentos NÃO Cobertos pelo Contrato
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={handleOpenEquipamentoNaoCobertosDialog}
                  >
                    Adicionar
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableRow>
                        <TableCell><strong>Quantidade</strong></TableCell>
                        <TableCell><strong>Equipamento</strong></TableCell>
                        <TableCell><strong>Fabricante</strong></TableCell>
                        <TableCell align="right"><strong>Ações</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contratoFormData.equipamentosNaoCobertos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            Nenhum equipamento adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        contratoFormData.equipamentosNaoCobertos.map((eq, index) => (
                          <TableRow key={index}>
                            <TableCell>{eq.quantidade}</TableCell>
                            <TableCell>{eq.equipamento}</TableCell>
                            <TableCell>{eq.fabricanteNome || '-'}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditEquipamentoNaoCobertos(index)}
                                sx={{ color: '#ff9800' }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEquipamentoNaoCobertos(index)}
                                sx={{ color: '#f44336' }}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveContrato} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para adicionar Equipamento Coberto */}
      <Dialog open={openEquipamentoCobertosDialog} onClose={() => setOpenEquipamentoCobertosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEquipamentoCobertosIndex !== null ? 'Editar Equipamento' : 'Adicionar Equipamento Coberto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Equipamento *"
                value={equipamentoCobertosFormData.produtoId}
                onChange={(e) => setEquipamentoCobertosFormData(prev => ({ ...prev, produtoId: e.target.value }))}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {produtos.map((produto) => (
                  <MenuItem key={produto.id} value={produto.id}>
                    {produto.tipoNome} - {produto.descricaoNome}{produto.especificacaoNome ? ` - ${produto.especificacaoNome}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={equipamentoCobertosFormData.quantidade}
                onChange={(e) => setEquipamentoCobertosFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEquipamentoCobertosDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveEquipamentoCobertos} variant="contained">
            {editingEquipamentoCobertosIndex !== null ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para adicionar Equipamento Não Coberto */}
      <Dialog open={openEquipamentoNaoCobertosDialog} onClose={() => setOpenEquipamentoNaoCobertosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEquipamentoNaoCobertosIndex !== null ? 'Editar Equipamento' : 'Adicionar Equipamento Não Coberto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Equipamento *"
                value={equipamentoNaoCobertosFormData.produtoId}
                onChange={(e) => setEquipamentoNaoCobertosFormData(prev => ({ ...prev, produtoId: e.target.value }))}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {produtos.map((produto) => (
                  <MenuItem key={produto.id} value={produto.id}>
                    {produto.tipoNome} - {produto.descricaoNome}{produto.especificacaoNome ? ` - ${produto.especificacaoNome}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={equipamentoNaoCobertosFormData.quantidade}
                onChange={(e) => setEquipamentoNaoCobertosFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEquipamentoNaoCobertosDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveEquipamentoNaoCobertos} variant="contained">
            {editingEquipamentoNaoCobertosIndex !== null ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes</DialogTitle>
        <DialogContent>
          {selectedOrcamento && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Tipo:</Typography>
                <Chip label="Orçamento de Equipamento" color="primary" size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Número:</Typography>
                <Typography>{selectedOrcamento.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Cliente:</Typography>
                <Typography>{selectedOrcamento.clienteNome}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Valor Total:</Typography>
                <Typography>R$ {selectedOrcamento.valorTotal.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <Chip
                  label={STATUS_OPTIONS.find(s => s.value === selectedOrcamento.status)?.label}
                  color={getStatusColor(selectedOrcamento.status) as any}
                  size="small"
                />
              </Box>
              {selectedOrcamento.observacao && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedOrcamento.observacao}</Typography>
                </Box>
              )}
            </Box>
          )}

          {selectedContrato && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Número:</Typography>
                <Typography>{selectedContrato.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Título:</Typography>
                <Typography>{selectedContrato.titulo}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Data:</Typography>
                <Typography>{selectedContrato.data?.toDate().toLocaleDateString('pt-BR')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Tipo:</Typography>
                <Typography>{TIPO_CONTRATO_OPTIONS.find(t => t.value === selectedContrato.tipoContrato)?.label}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Cliente:</Typography>
                <Typography>{selectedContrato.clienteNome}</Typography>
                <Typography variant="body2" color="textSecondary">{selectedContrato.clienteCnpjCpf}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Vendedor:</Typography>
                <Typography>{selectedContrato.vendedorNome || 'Não informado'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Endereço:</Typography>
                <Typography variant="body2">
                  {selectedContrato.clienteEndereco}, {selectedContrato.clienteNumero}
                  {selectedContrato.clienteComplemento && ` - ${selectedContrato.clienteComplemento}`}
                  <br />
                  {selectedContrato.clienteBairro}, {selectedContrato.clienteCidade}/{selectedContrato.clienteUf}
                  {selectedContrato.clienteCep && ` - CEP: ${selectedContrato.clienteCep}`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Equipamentos Cobertos:</Typography>
                {selectedContrato.equipamentosCobertos.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">Nenhum</Typography>
                ) : (
                  <ul>
                    {selectedContrato.equipamentosCobertos.map((eq, i) => (
                      <li key={i}><Typography variant="body2">{eq.quantidade}x {eq.equipamento} - {eq.fabricanteNome || 'Sem fabricante'}</Typography></li>
                    ))}
                  </ul>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Equipamentos NÃO Cobertos:</Typography>
                {selectedContrato.equipamentosNaoCobertos.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">Nenhum</Typography>
                ) : (
                  <ul>
                    {selectedContrato.equipamentosNaoCobertos.map((eq, i) => (
                      <li key={i}><Typography variant="body2">{eq.quantidade}x {eq.equipamento} - {eq.fabricanteNome || 'Sem fabricante'}</Typography></li>
                    ))}
                  </ul>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Valor:</Typography>
                <Typography>R$ {selectedContrato.valorContrato.toFixed(2)} / mês</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <Chip
                  label={STATUS_CONTRATO_OPTIONS.find(s => s.value === selectedContrato.status)?.label}
                  color={getStatusContratoColor(selectedContrato.status) as any}
                  size="small"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir{' '}
            <strong>
              {selectedOrcamento ? selectedOrcamento.numero : selectedContrato?.numero}
            </strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ProtectedRoute>
  );
}