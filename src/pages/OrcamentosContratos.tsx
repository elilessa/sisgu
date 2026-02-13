import React from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  Autocomplete,
  Collapse,
  Tooltip,
  Divider,
  Grid,
} from '@mui/material';
import { formatCnpjCpf } from '../utils/masks';
import { Add, KeyboardArrowDown, KeyboardArrowUp, CheckCircle, Cancel } from '@mui/icons-material';
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
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ActionEdit, ActionDelete, ActionSend, ActionPdf, StatusChip } from '../components/TableActions';
// @ts-ignore
// import html2pdf from 'html2pdf.js';
import { gerarCabecalhoEmpresaHTML, gerarLayoutDocumentoHTML, imprimirHTMLViaIframe } from '../utils/printUtils';
import { Orcamento, EquipamentoContrato } from '../types/orcamento';
import { Contrato } from '../types/contrato';

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
  prefixoNome?: string;
  nomeContato?: string;
  emailContato?: string;
  telefoneContato?: string;
  cargoContato?: string;
  contatoApto?: string;
  contatoEmail2?: string;
  contatoWhatsapp?: string;
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
  partNumber?: string;
  categoriaId?: string;
  nome?: string;
  precoVenda?: number;
}

const STATUS_OPTIONS = [
  { value: 'em_elaboracao', label: 'Em Elaboração', color: 'warning' },
  { value: 'enviado', label: 'Enviado', color: 'info' },
  { value: 'aprovado', label: 'Aprovado', color: 'success' },
  { value: 'reprovado', label: 'Reprovado', color: 'error' },
  { value: 'expirado', label: 'Expirado', color: 'default' },
];

const TIPO_CONTRATO_OPTIONS = [
  { value: 'com_pecas', label: 'Com Peças' },
  { value: 'sem_pecas', label: 'Sem Peças' },
  { value: 'comodato', label: 'Comodato' },
];

const STATUS_CONTRATO_OPTIONS = [
  { value: 'em_elaboracao', label: 'Em Elaboração', color: 'warning' },
  { value: 'enviado', label: 'Enviado', color: 'info' },
  { value: 'aprovado', label: 'Aprovado', color: 'success' },
  { value: 'reprovado', label: 'Reprovado', color: 'error' },
  { value: 'expirado', label: 'Expirado', color: 'secondary' },
];

const TITULO_CONTRATO_OPTIONS = [
  'CONTRATO DE MANUTENÇÃO EM COMODATO',
  'CONTRATO DE MANUTENÇÃO COM PEÇAS',
  'CONTRATO DE MANUTENÇÃO SEM PEÇAS',
];

interface OrcamentosManagementProps {
  initialTab?: number;
}

export function OrcamentosContratos({ initialTab = 0 }: OrcamentosManagementProps) {
  const { userData, user } = useAuth();
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

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
    prefixoNome: '',
    valorTotal: 0,
    status: 'em_elaboracao' as 'em_elaboracao' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado',
    dataEmissao: '',
    dataValidade: '',
    observacao: '',
    // Campos de Contato (Histórico)
    nomeContato: '',
    emailContato: '',
    telefoneContato: '',
    cargoContato: '',
    contatoApto: '',
    contatoEmail2: '',
    contatoWhatsapp: '',
  });

  const [contratoFormData, setContratoFormData] = useState({
    numero: '',
    titulo: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataValidade: '',
    observacao: '',
    prefixoNome: '',
    tipoContrato: 'com_pecas' as 'com_pecas' | 'sem_pecas' | 'comodato',
    clienteId: '',
    vendedorId: '',
    equipamentosCobertos: [] as EquipamentoContrato[],
    equipamentosNaoCobertos: [] as EquipamentoContrato[],
    valorContrato: 0,
    status: 'em_elaboracao' as 'em_elaboracao' | 'enviado_ao_cliente' | 'aprovado' | 'reprovado' | 'expirado',
    // Campos de Contato (Histórico)
    nomeContato: '',
    emailContato: '',
    telefoneContato: '',
    cargoContato: '',
    contatoApto: '',
    contatoEmail2: '',
    contatoWhatsapp: '',
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
    const empresaId = userData.empresaId;

    try {
      const clientesRef = collection(db, 'EMPRESAS', empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);

      const clientesList: Cliente[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientesList.push({
          id: doc.id,
          nome: data.nome || 'Sem Nome',
          cnpjCpf: data.cnpjCpf || '',
          endereco: data.endereco || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          cep: data.cep || '',
          prefixoNome: data.prefixoNome,
          nomeContato: data.contatoAtual || data.nomeContato || data.contato || '',
          emailContato: data.contatoEmail1 || data.emailContato || data.email || '',
          telefoneContato: data.contatoTelefone || data.telefoneContato || data.telefone || data.whatsapp || '',
          cargoContato: data.contatoFuncao || data.cargoContato || '',
          contatoApto: data.contatoApto || data.apto || '',
          contatoEmail2: data.contatoEmail2 || data.email2 || '',
          contatoWhatsapp: data.contatoWhatsapp || data.whatsapp || '',
        });
      });

      // Ordenar clientes alfabeticamente por nome
      clientesList.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      setClientes(clientesList);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const produtosRef = collection(db, 'EMPRESAS', empresaId, 'produtos');
      const fabricantesRef = collection(db, 'EMPRESAS', empresaId, 'fabricantes');
      const precificacaoRef = collection(db, 'EMPRESAS', empresaId, 'precificacao');

      const [produtosSnap, fabricantesSnap, precificacaoSnap] = await Promise.all([
        getDocs(produtosRef),
        getDocs(fabricantesRef),
        getDocs(precificacaoRef)
      ]);

      const fabricantesMap = new Map();
      fabricantesSnap.forEach((doc) => {
        fabricantesMap.set(doc.id, doc.data().nome);
      });

      const precosMap = new Map();
      precificacaoSnap.forEach((doc) => {
        const data = doc.data();
        if (data.produtoId) {
          precosMap.set(data.produtoId, data.precoVenda || 0);
        }
      });

      const produtosList: Produto[] = [];
      produtosSnap.forEach((docSnap) => {
        const data = docSnap.data();

        // Gera o nome inteligente do produto
        const nomeGerado = data.nome || [data.tipoNome, data.descricaoNome, data.especificacaoNome]
          .filter(Boolean)
          .join(' - ') || 'Produto sem nome';

        produtosList.push({
          id: docSnap.id,
          tipoId: data.tipoId || '',
          tipoNome: data.tipoNome || '',
          descricaoId: data.descricaoId || '',
          descricaoNome: data.descricaoNome || '',
          especificacaoId: data.especificacaoId || '',
          especificacaoNome: data.especificacaoNome || '',
          fabricanteId: data.fabricanteId || '',
          fabricanteNome: fabricantesMap.get(data.fabricanteId) || '',
          sku: data.sku || '',
          naturezaId: data.naturezaId || '',
          partNumber: data.partNumber || '',
          categoriaId: data.categoriaId || '',
          nome: nomeGerado,
          precoVenda: precosMap.get(docSnap.id) || 0,
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
    const empresaId = userData.empresaId;

    setLoading(true);
    try {
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosContratos');
      const snapshot = await getDocs(orcamentosRef);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const orcamentosList: Orcamento[] = [];

      // Processar cada documento
      const promises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        let status = data.status;

        // Verificar expiração para status 'enviado'
        if (status === 'enviado' && data.dataValidade) {
          const validade = data.dataValidade.toDate ? data.dataValidade.toDate() : new Date(data.dataValidade);
          if (validade < now) {
            status = 'expirado';
            // Atualizar no banco em background
            await updateDoc(doc(db, 'EMPRESAS', empresaId, 'orcamentosContratos', docSnapshot.id), {
              status: 'expirado',
              atualizadoEm: Timestamp.now()
            });
          }
        }
        return { id: docSnapshot.id, ...data, status } as Orcamento;
      });

      const results = await Promise.all(promises);
      setOrcamentos(results);
    } catch (err: any) {
      setError('Erro ao carregar orçamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContratos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoading(true);
    try {
      const orcamentosList: Contrato[] = [];

      // 1. Buscar novos orçamentos (Coleção: orcamentosContratos)
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosContratos');
      const orcamentosSnap = await getDocs(orcamentosRef);
      orcamentosSnap.forEach((doc) => {
        orcamentosList.push({ id: doc.id, ...doc.data() } as Contrato);
      });

      // 2. Legacy loading removed per user request (Dev mode clean start)

      // Ordenar por data de criação (desc)
      orcamentosList.sort((a, b) => {
        const dateA = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
        const dateB = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setContratos(orcamentosList);
    } catch (err: any) {
      setError('Erro ao carregar orçamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarNumeroContrato = async (): Promise<string> => {
    if (!userData?.empresaId) return '';
    const empresaId = userData.empresaId;

    const now = new Date();
    const ano = now.getFullYear().toString().slice(-2);
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');

    // Mudança de padrão: CONT -> ORC
    const prefixo = `ORC-${ano}${mes}`;

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosContratos');
      const q = query(
        orcamentosRef,
        where('numero', '>=', prefixo),
        where('numero', '<', `ORC-${ano}${mes}999`),
        orderBy('numero', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      let proximoNumero = 1;
      if (!snapshot.empty) {
        const ultimoNumero = snapshot.docs[0].data().numero;
        // Tenta extrair sequencial do final (ex: ORC-2402001 -> 001)
        const sequencial = parseInt(ultimoNumero.slice(-3));
        if (!isNaN(sequencial)) {
          proximoNumero = sequencial + 1;
        }
      }

      return `${prefixo}${proximoNumero.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Erro ao gerar número do orçamento:', err);
      return `${prefixo}001`;
    }
  };

  const handleOpenDialog = async (orcamento?: Orcamento, tipo?: 'equipamento' | 'contrato') => {
    if (orcamento) {
      setIsEditing(true);
      setSelectedOrcamento(orcamento);
      setFormData({
        tipo: (orcamento.tipo as any),
        numero: orcamento.numero,
        clienteId: orcamento.clienteId,
        clienteNome: orcamento.clienteNome,
        prefixoNome: orcamento.prefixoNome || '',
        valorTotal: orcamento.valorContrato,
        status: orcamento.status as any,
        dataEmissao: orcamento.dataEmissao?.toDate().toISOString().split('T')[0] || '',
        dataValidade: orcamento.dataValidade?.toDate().toISOString().split('T')[0] || '',
        observacao: orcamento.observacao || '',
        nomeContato: orcamento.nomeContato || '',
        emailContato: orcamento.emailContato || '',
        telefoneContato: orcamento.telefoneContato || '',
        cargoContato: orcamento.cargoContato || '',
        contatoApto: orcamento.contatoApto || '',
        contatoEmail2: orcamento.contatoEmail2 || '',
        contatoWhatsapp: orcamento.contatoWhatsapp || '',
      });
    } else {
      setIsEditing(false);
      setSelectedOrcamento(null);
      setFormData({
        tipo: tipo || 'equipamento',
        numero: '',
        clienteId: '',
        clienteNome: '',
        prefixoNome: '',
        valorTotal: 0,
        status: 'em_elaboracao',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataValidade: '',
        observacao: '',
        nomeContato: '',
        emailContato: '',
        telefoneContato: '',
        cargoContato: '',
        contatoApto: '',
        contatoEmail2: '',
        contatoWhatsapp: '',
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
        dataEmissao: contrato.dataEmissao?.toDate().toISOString().split('T')[0] || contrato.data?.toDate().toISOString().split('T')[0] || '',
        dataValidade: contrato.dataValidade?.toDate().toISOString().split('T')[0] || '',
        observacao: contrato.observacao || '',
        prefixoNome: contrato.prefixoNome || '',
        tipoContrato: contrato.tipoContrato,
        clienteId: contrato.clienteId,
        vendedorId: contrato.vendedorId || '',
        equipamentosCobertos: contrato.equipamentosCobertos || [],
        equipamentosNaoCobertos: contrato.equipamentosNaoCobertos || [],
        valorContrato: contrato.valorContrato,
        status: contrato.status as any,
        // Populate fields
        nomeContato: contrato.nomeContato || '',
        emailContato: contrato.emailContato || '',
        telefoneContato: contrato.telefoneContato || '',
        cargoContato: contrato.cargoContato || '',
        contatoApto: contrato.contatoApto || '',
        contatoEmail2: contrato.contatoEmail2 || '',
        contatoWhatsapp: contrato.contatoWhatsapp || '',
      });
    } else {
      setIsEditing(false);
      setSelectedContrato(null);
      const novoNumero = await gerarNumeroContrato();
      setContratoFormData({
        numero: novoNumero,
        titulo: '',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataValidade: '',
        observacao: '',
        prefixoNome: '',
        tipoContrato: 'com_pecas',
        clienteId: '',
        vendedorId: '',
        equipamentosCobertos: [],
        equipamentosNaoCobertos: [],
        valorContrato: 0,
        status: 'em_elaboracao',
        nomeContato: '',
        emailContato: '',
        telefoneContato: '',
        cargoContato: '',
        contatoApto: '',
        contatoEmail2: '',
        contatoWhatsapp: '',
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
      setSelectedOrcamento(item as Orcamento);
    } else {
      setSelectedContrato(item as Contrato);
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
      setSelectedOrcamento(item as Orcamento);
    } else {
      setSelectedContrato(item as Contrato);
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
      handleContratoInputChange('clienteNome', cliente.nome);
      handleContratoInputChange('prefixoNome', cliente.prefixoNome || '');

      // Auto-preencher dados de contato
      handleContratoInputChange('nomeContato', cliente.nomeContato || '');
      handleContratoInputChange('emailContato', cliente.emailContato || '');
      handleContratoInputChange('telefoneContato', cliente.telefoneContato || '');
      handleContratoInputChange('cargoContato', cliente.cargoContato || '');
      handleContratoInputChange('contatoApto', cliente.contatoApto || '');
      handleContratoInputChange('contatoEmail2', cliente.contatoEmail2 || '');
      handleContratoInputChange('contatoWhatsapp', cliente.contatoWhatsapp || '');

      // Para o formulário de orçamento também (se estiver usando formData compartilhado ou setFormData diretamente)
      // O handleContratoInputChange parece ser para contratos, preciso verificar se atualiza o formData do orçamento.
      // Verificando o código, handleInputChange é o usado para o form de orçamento.
      handleInputChange('clienteId', clienteId);
      handleInputChange('clienteNome', cliente.nome);
      handleInputChange('prefixoNome', cliente.prefixoNome || '');
      handleInputChange('nomeContato', cliente.nomeContato || '');
      handleInputChange('emailContato', cliente.emailContato || '');
      handleInputChange('telefoneContato', cliente.telefoneContato || '');
      handleInputChange('cargoContato', cliente.cargoContato || '');
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

    let nomeEquipamento = (produto.nome || '').trim();

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

    let nomeEquipamento = (produto.nome || '').trim();
    // if (produto.partNumber) nomeEquipamento = `[${produto.partNumber}] ${nomeEquipamento}`;

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
    const empresaId = userData.empresaId;

    if (!formData.numero || !formData.clienteNome || !formData.dataEmissao || !formData.dataValidade) {
      setError('Preencha os campos obrigatórios: Número, Cliente, Data de Emissão e Validade');
      return;
    }

    try {
      const orcamentosRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosContratos');

      const orcamentoData = {
        ...formData,
        dataEmissao: Timestamp.fromDate(new Date(formData.dataEmissao)),
        dataValidade: Timestamp.fromDate(new Date(formData.dataValidade)),
        atualizadoEm: Timestamp.now(),
      };

      if (isEditing && selectedOrcamento) {
        const docRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosContratos', selectedOrcamento.id);
        await updateDoc(docRef, orcamentoData);
        setSuccess('Orçamento atualizado com sucesso!');
      } else {
        await addDoc(orcamentosRef, {
          ...orcamentoData,
          criadoEm: Timestamp.now(),
          criadoPor: userData.id || user?.uid || 'sistema',
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
    const empresaId = userData.empresaId;

    if (!contratoFormData.numero || !contratoFormData.titulo || !contratoFormData.clienteId || !contratoFormData.dataEmissao || !contratoFormData.dataValidade) {
      setError('Preencha os campos obrigatórios: Número, Título, Cliente, Data de Emissão e Validade');
      return;
    }

    try {
      const cliente = clientes.find(c => c.id === contratoFormData.clienteId);
      if (!cliente) {
        setError('Cliente não encontrado');
        return;
      }

      // Determinar coleção (Apenas nova coleção agora)
      const targetCollection = 'orcamentosContratos';

      const collectionRef = collection(db, 'EMPRESAS', empresaId, targetCollection);

      // Log do status ANTES de processar
      console.log('[SAVE] Status ANTES:', contratoFormData.status, 'Tipo:', typeof contratoFormData.status);

      const statusFinal = contratoFormData.status.toLowerCase();
      console.log('[SAVE] Status DEPOIS do toLowerCase:', statusFinal);

      const vendedor = usuarios.find(u => u.id === contratoFormData.vendedorId);

      // --- AUTO-DETECÇÃO DO TIPO DE CONTRATO ---
      let tipoContratoFinal = contratoFormData.tipoContrato;
      if (contratoFormData.titulo) {
        const tUpper = contratoFormData.titulo.toUpperCase();
        if (tUpper.includes('COMODATO')) {
          tipoContratoFinal = 'comodato';
        } else if (tUpper.includes('SEM PEÇAS')) {
          tipoContratoFinal = 'sem_pecas';
        } else if (tUpper.includes('COM PEÇAS')) {
          tipoContratoFinal = 'com_pecas';
        }
      }

      const contratoData = {
        numero: contratoFormData.numero,
        titulo: contratoFormData.titulo,
        dataEmissao: Timestamp.fromDate(new Date(contratoFormData.dataEmissao)), // Padronizado para dataEmissao
        dataValidade: Timestamp.fromDate(new Date(contratoFormData.dataValidade)),
        observacao: contratoFormData.observacao,
        tipoContrato: tipoContratoFinal,
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
        prefixoNome: cliente.prefixoNome || '',
        vendedorId: contratoFormData.vendedorId || '',
        vendedorNome: vendedor?.nome || '',
        equipamentosCobertos: contratoFormData.equipamentosCobertos,
        equipamentosNaoCobertos: contratoFormData.equipamentosNaoCobertos,
        valorContrato: contratoFormData.valorContrato,
        status: statusFinal,
        // Campos de Contato
        nomeContato: contratoFormData.nomeContato,
        emailContato: contratoFormData.emailContato,
        telefoneContato: contratoFormData.telefoneContato,
        cargoContato: contratoFormData.cargoContato,
        contatoApto: contratoFormData.contatoApto,
        contatoEmail2: contratoFormData.contatoEmail2,
        contatoWhatsapp: contratoFormData.contatoWhatsapp,
        atualizadoEm: Timestamp.now(),
      };

      console.log('[SAVE] Dados completos que serão salvos em', targetCollection, ':', contratoData);

      if (isEditing && selectedContrato) {
        const docRef = doc(db, 'EMPRESAS', empresaId, targetCollection, selectedContrato.id);
        await updateDoc(docRef, contratoData);
        setSuccess('Orçamento atualizado com sucesso!');
      } else {
        await addDoc(collectionRef, {
          ...contratoData,
          criadoEm: Timestamp.now(),
          criadoPor: userData.id || user?.uid || 'sistema',
        });
        setSuccess('Orçamento criado com sucesso!');
      }

      // ======================================================================
      // AUTOMAÇÃO: Se Aprovado -> Garantir Cliente com Contrato + CC
      // ======================================================================
      if (statusFinal === 'aprovado') {
        try {
          console.log("[Auto] Contrato Aprovado - Verificando Cliente...");
          const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', contratoFormData.clienteId);
          const cliSnap = await getDoc(cliRef);

          if (cliSnap.exists()) {
            const cliData = cliSnap.data();
            const updates: any = {};
            let needsUpdate = false;


            // Lógica unificada: Apenas cria CC se necessário. Status é gerido mais abaixo.


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
                    reativadoPorAuto: true,
                    clienteId: contratoFormData.clienteId // Vínculo Forte
                  });
                  window.alert(`INFO: O Centro de Custo deste cliente JÁ EXISTIA (ID: ${ccIdParaUso}) e foi atualizado/reativado com o nome: ${nomeCorreto}`);
                } else {
                  // ID existe no cliente mas doc não existe (removido?) -> Forçar criação de novo
                  console.log("[Auto] CC vinculado não encontrado no banco. Criando novo...");
                  ccIdParaUso = null;
                }
              } catch (err) {
                console.error("Erro ao verificar CC existente", err);
                ccIdParaUso = null;
              }
            }

            // 2. Criar Centro de Custo se não tiver (ou falhou verificação)
            if (!ccIdParaUso) {
              console.log("[Auto] Cliente sem CC. Buscando/Criando grupo CC-CLIENTES...");

              try {
                // 1. Buscar Grupo Pai 'CC-CLIENTES'
                const gruposRef = collection(db, 'EMPRESAS', empresaId, 'centro_custo_grupos');
                const qGrupo = query(gruposRef, where('codigo', '==', 'CC-CLIENTES'));
                const snapGrupo = await getDocs(qGrupo);
                let grupoId = '';
                let grupoNome = 'Clientes (Vendas e Contratos)';
                let grupoCodigo = 'CC-CLIENTES';

                if (!snapGrupo.empty) {
                  grupoId = snapGrupo.docs[0].id;
                  grupoNome = snapGrupo.docs[0].data().nome;
                  grupoCodigo = snapGrupo.docs[0].data().codigo;
                } else {
                  // Criar Grupo se não existir
                  const novoGrupo = await addDoc(gruposRef, {
                    codigo: 'CC-CLIENTES',
                    nome: 'Clientes (Vendas e Contratos)',
                    permiteReceita: true,
                    permiteDespesa: true,
                    descricao: 'Grupo automático para gestão financeira por cliente',
                    criadoEm: new Date().toISOString(),
                    criadoPor: 'SISTEMA_AUTO_CONTRATO',
                    empresaId: empresaId
                  });
                  grupoId = novoGrupo.id;
                }

                if (grupoId) {
                  // 2. Gerar Código para o CC (Slugify)
                  const cleanName = cliData.nome
                    .toUpperCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
                    .replace(/[^A-Z0-9 ]/g, "") // Tira especiais
                    .trim()
                    .replace(/\s+/g, "-"); // Espaço vira traço

                  const novoCodigo = `CC-${cleanName}`.substring(0, 30);

                  // 3. Verificar existência pelo CÓDIGO (Slug)
                  const centrosRef = collection(db, 'EMPRESAS', empresaId, 'centros_custo');
                  const qCheck = query(centrosRef, where('codigo', '==', novoCodigo));
                  const snapCheck = await getDocs(qCheck);

                  const nomeCC = `${cliData.prefixoNome ? cliData.prefixoNome + ' ' : ''}${cliData.nome}`;

                  if (!snapCheck.empty) {
                    // Já existe, usa e atualiza nome se necessário
                    const existingDoc = snapCheck.docs[0];
                    ccIdParaUso = existingDoc.id;

                    // Atualização preventiva
                    await updateDoc(doc(db, 'EMPRESAS', empresaId, 'centros_custo', ccIdParaUso), {
                      nome: nomeCC,
                      grupoId,
                      grupoNome,
                      grupoCodigo,
                      atualizadoEm: new Date().toISOString()
                    });
                    // Atualiza no cliente também
                    updates.centroCustoId = ccIdParaUso;
                    updates.centroCustoNome = nomeCC;
                    updates.centroCustoCodigo = novoCodigo;
                    needsUpdate = true;

                  } else {
                    // Não existe, cria novo
                    const novoCCData = {
                      empresaId,
                      grupoId,
                      grupoNome,
                      grupoCodigo,
                      nome: nomeCC,
                      codigo: novoCodigo,
                      permiteReceita: true,
                      permiteDespesa: true,
                      origensPermitidas: ['contrato', 'venda', 'manual'],
                      ativo: true,
                      criadoEm: new Date().toISOString(),
                      criadoPor: 'SISTEMA_AUTO_CONTRATO'
                    };

                    const ccRef = await addDoc(centrosRef, novoCCData);
                    ccIdParaUso = ccRef.id;

                    updates.centroCustoId = ccIdParaUso;
                    updates.centroCustoNome = nomeCC;
                    updates.centroCustoCodigo = novoCodigo;
                    needsUpdate = true;

                    console.log("[Auto] CC Criado:", novoCodigo);
                    window.alert(`SUCESSO: Novo Centro de Custo criado para o cliente: ${nomeCC}`);
                  }
                }
              } catch (err) {
                console.error("[Auto] Erro crítico ao criar CC-CLIENTES:", err);
                window.alert("ERRO: Falha ao criar Centro de Custo automático. Verifique o console.");
              }
            }

            if (needsUpdate) {
              await updateDoc(cliRef, updates);
              console.log("[Auto] Cliente atualizado com sucesso.");
            }
          }
        } catch (autoErr) {
          console.error("Erro na automação Cliente/CC (Contrato):", autoErr);
        }
      }

      handleCloseDialog();
      loadContratos();
      setTimeout(() => setSuccess(''), 3000);
      // ======================================================================
      // AUTOMAÇÃO DE STATUS: Cancelado / Aprovado
      // ======================================================================
      if (statusFinal === 'cancelado' || statusFinal === 'aprovado') {
        try {
          const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', contratoFormData.clienteId);
          const contratosRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
          const q = query(contratosRef, where('clienteId', '==', contratoFormData.clienteId));
          const snap = await getDocs(q);

          const contratosCliente = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

          // Existem contratos aprovados (ativos)?
          // Nota: Se estamos cancelando o atual, ele ainda pode constar como aprovado no banco se a txn não comitou, 
          // mas aqui 'contratosCliente' lê do banco. O 'contratoData' é o que ACABAMOS de mandar salvar.

          // Vamos considerar o estado FINAL desejado.
          const ativosRestantes = contratosCliente.filter(c =>
            c.id !== (selectedContrato?.id || 'new') && // Ignora o atual (olhamos o statusFinal dele)
            c.status === 'aprovado'
          );

          let novoStatusContrato = ''; // '' = sem contrato, 'ativo', 'cancelado'

          if (statusFinal === 'aprovado' || ativosRestantes.length > 0) {
            novoStatusContrato = 'ativo';
          } else if (statusFinal === 'cancelado') {
            novoStatusContrato = 'cancelado';
          }

          if (novoStatusContrato) {
            await updateDoc(cliRef, {
              temContrato: novoStatusContrato === 'ativo',
              statusContrato: novoStatusContrato
            });
            console.log("[Auto] Status Contrato Cliente atualizado para:", novoStatusContrato);
          } else {
            // Caso tenha ficado vazio (ex: teoricamente não deveria cair aqui nessa lógica específica de statusFinal, mas por segurança)
          }

        } catch (statusErr) {
          console.error("Erro ao atualizar status do cliente:", statusErr);
        }
      }

    } catch (err: any) {
      setError('Erro ao salvar contrato: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      if (selectedOrcamento) {
        await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'orcamentosContratos', selectedOrcamento.id));
        setSuccess('Orçamento excluído com sucesso!');
        loadOrcamentos();
      } else if (selectedContrato) {
        // Contratos agora também vivem em 'orcamentosContratos' nesta tela
        await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'orcamentosContratos', selectedContrato.id));
        setSuccess('Item excluído com sucesso!');
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

  const handleGerarPDFContrato = async (contrato: Contrato) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      // Buscar modelo de contrato
      const modeloRef = doc(db, 'EMPRESAS', empresaId, 'parametrosComerciais', 'modeloContrato');
      const modeloSnap = await getDoc(modeloRef);
      const empresaRef = doc(db, 'EMPRESAS', empresaId);
      const empresaSnap = await getDoc(empresaRef);

      if (!modeloSnap.exists()) {
        setError('Modelo de contrato não configurado. Configure em Parâmetros Comerciais.');
        return;
      }

      const modelo = modeloSnap.data();
      const empresaData = empresaSnap.exists() ? empresaSnap.data() : {};
      const logoUrl = empresaData.logoUrl || '';

      // Preparar dados do contrato
      // ✅ USAR SNAPSHOT - NÃO buscar dados atuais do cliente!
      const prefixoCliente = contrato.prefixoNome || '';

      const enderecoCompleto = `${contrato.clienteEndereco}, ${contrato.clienteNumero}${contrato.clienteComplemento ? ` - ${contrato.clienteComplemento}` : ''}, ${contrato.clienteBairro}, ${contrato.clienteCidade}/${contrato.clienteUf}${contrato.clienteCep ? ` - CEP: ${contrato.clienteCep}` : ''}`;
      const tipoContratoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label || '';

      // Gerar tabela de equipamentos cobertos
      let tabelaCobertos = `<table class="user-table"><thead style="background-color: #C1E3DB"><tr><th style="width: 15%">Qtd</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>`;
      if (contrato.equipamentosCobertos && contrato.equipamentosCobertos.length > 0) {
        contrato.equipamentosCobertos.forEach(eq => {
          tabelaCobertos += `<tr><td style="text-align: center;">${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
        });
      } else {
        tabelaCobertos += '<tr><td colspan="3" style="text-align: center;">Nenhum equipamento listado</td></tr>';
      }
      tabelaCobertos += '</tbody></table>';

      // Gerar tabela de equipamentos não cobertos
      let tabelaNaoCobertos = `<table class="user-table"><thead style="background-color: #C1E3DB"><tr><th style="width: 15%">Qtd</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>`;
      if (contrato.equipamentosNaoCobertos && contrato.equipamentosNaoCobertos.length > 0) {
        contrato.equipamentosNaoCobertos.forEach(eq => {
          tabelaNaoCobertos += `<tr><td style="text-align: center;">${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
        });
      } else {
        tabelaNaoCobertos += '<tr><td colspan="3" style="text-align: center;">Nenhum equipamento listado</td></tr>';
      }
      tabelaNaoCobertos += '</tbody></table>';

      // Substituir placeholders
      const valorMensalExtenso = valorPorExtenso(contrato.valorContrato);

      const substituirPlaceholders = (texto: string) => {
        if (!texto) return '';
        return texto
          .replace(/\{\{TITULO_CONTRATO\}\}/g, contrato.titulo || '')
          .replace(/\{\{NOME_CLIENTE\}\}/g, contrato.clienteNome)
          .replace(/\{\{CNPJ_CPF\}\}/g, formatCnpjCpf(contrato.clienteCnpjCpf))
          .replace(/\{\{ENDERECO_COMPLETO\}\}/g, enderecoCompleto)
          .replace(/\{\{TIPO_CONTRATO\}\}/g, tipoContratoLabel)
          .replace(/\{\{TABELA_EQUIPAMENTOS_COBERTOS\}\}/g, tabelaCobertos)
          .replace(/\{\{TABELA_EQUIPAMENTOS_NAO_COBERTOS\}\}/g, tabelaNaoCobertos)
          .replace(/\{\{DATA_INICIO\}\}/g, (contrato.dataInicio || (contrato as any).data)?.toDate().toLocaleDateString('pt-BR') || '')
          .replace(/\{\{VALOR_MENSAL\}\}/g, `R$ ${contrato.valorContrato.toFixed(2)}`)
          .replace(/\{\{VALOR_MENSAL_EXTENSO\}\}/g, valorMensalExtenso)
          .replace(/\{\{VALOR_MENSAL_EXTENSO\}\}/g, valorMensalExtenso)
          .replace(/\{\{CLIENTE_PREFIXO\}\}/g, prefixoCliente);
      };

      const corpoHTML = substituirPlaceholders(modelo.corpo || '');
      const rodapeHTML = substituirPlaceholders(modelo.rodape || '');

      // 3. Wrapper com Utilitários Centralizados
      const cabecalhoHTML = await gerarCabecalhoEmpresaHTML(empresaData);

      const htmlCompleto = gerarLayoutDocumentoHTML({
        titulo: `Contrato - ${contrato.numero}`,
        cabecalhoHTML,
        rodapeHTML,
        corpoHTML: corpoHTML.replace(/<table/g, '<table class="user-table"')
      });

      imprimirHTMLViaIframe(htmlCompleto);

    } catch (err: any) {
      setError('Erro ao gerar PDF: ' + err.message);
    }
  };



  const handleGerarPDFOrcamento = async (orcamento: Orcamento) => {
    // Implementação futura ou se necessário
    console.log('Gerar PDF Orçamento:', orcamento);
  };

  const handleUpdateStatus = async (contratoId: string, newStatus: string) => {
    if (!userData?.empresaId) return;

    try {
      // Se estiver aprovando, criar contrato
      if (newStatus === 'aprovado') {
        await criarContratoDeOrcamento(contratoId);
        return; // criarContratoDeOrcamento já atualiza o status
      }

      // Para outros status, verificar em qual coleção o documento está
      // (compatibilidade com dados antigos em 'contratos')
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentosContratos', contratoId);
      await updateDoc(orcamentoRef, {
        status: newStatus,
        atualizadoEm: Timestamp.now(),
      });

      setSuccess(`Status atualizado com sucesso!`);
      loadContratos();
    } catch (err: any) {
      setError('Erro ao atualizar status: ' + err.message);
    }
  };

  const criarContratoDeOrcamento = async (orcamentoId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;
    const contratosRef = collection(db, 'EMPRESAS', empresaId, 'contratos');

    try {
      // 1. Buscar orçamento na coleção CORRETA
      const orcamentoRef = doc(db, 'EMPRESAS', empresaId, 'orcamentosContratos', orcamentoId);
      const orcamentoSnap = await getDoc(orcamentoRef);

      if (!orcamentoSnap.exists()) {
        throw new Error('Orçamento não encontrado');
      }

      const orcamento = { id: orcamentoSnap.id, ...orcamentoSnap.data() } as Orcamento;

      // 2. Gerar número do contrato BASEADO NO ORÇAMENTO
      // Ex: ORC-2602001 -> CONT-2602001
      // Se não tiver prefixo ORC, adiciona CONT- no início
      let numeroContrato = orcamento.numero.replace('ORC', 'CONT');
      if (!numeroContrato.startsWith('CONT')) {
        numeroContrato = `CONT-${orcamento.numero}`;
      }

      // 3. Criar contrato (CÓPIA COMPLETA do orçamento)
      const contratoData = {
        numero: numeroContrato,

        // Referência ao orçamento
        orcamentoId: orcamento.id,
        orcamentoNumero: orcamento.numero,

        // Snapshot COMPLETO (duplicado)
        titulo: orcamento.titulo,
        dataEmissao: orcamento.dataEmissao,
        dataValidade: orcamento.dataValidade,
        tipoContrato: orcamento.tipoContrato,

        // Cliente (snapshot duplicado)
        clienteId: orcamento.clienteId,
        clienteNome: orcamento.clienteNome,
        clienteCnpjCpf: orcamento.clienteCnpjCpf,
        clienteEndereco: orcamento.clienteEndereco,
        clienteNumero: orcamento.clienteNumero,
        clienteComplemento: orcamento.clienteComplemento,
        clienteBairro: orcamento.clienteBairro,
        clienteCidade: orcamento.clienteCidade,
        clienteUf: orcamento.clienteUf,
        clienteCep: orcamento.clienteCep,
        prefixoNome: orcamento.prefixoNome,

        // Vendedor (snapshot duplicado)
        vendedorId: orcamento.vendedorId,
        vendedorNome: orcamento.vendedorNome,

        // Equipamentos (snapshot duplicado)
        equipamentosCobertos: orcamento.equipamentosCobertos,
        equipamentosNaoCobertos: orcamento.equipamentosNaoCobertos,

        // Valores
        valorContrato: orcamento.valorContrato,

        // Status inicial do contrato
        status: 'ativo',

        // Datas do contrato
        dataInicio: Timestamp.now(),
        data: Timestamp.now(), // Para compatibilidade

        // Observações
        observacao: orcamento.observacao,

        // Auditoria
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
        criadoPor: userData.id || user?.uid || 'sistema',
        aprovadoEm: Timestamp.now(),
        aprovadoPor: userData.id || user?.uid || 'sistema',

        // Contato (Transferido do Orçamento)
        nomeContato: orcamento.nomeContato || '',
        emailContato: orcamento.emailContato || '',
        telefoneContato: orcamento.telefoneContato || '',
        cargoContato: orcamento.cargoContato || '',
        contatoApto: orcamento.contatoApto || '',
        contatoEmail2: orcamento.contatoEmail2 || '',
        contatoWhatsapp: orcamento.contatoWhatsapp || '',
      };

      // 4. Salvar contrato
      const novoContratoRef = await addDoc(contratosRef, contratoData);

      // 5. Atualizar status do orçamento para 'aprovado'
      await updateDoc(orcamentoRef, {
        status: 'aprovado',
        atualizadoEm: Timestamp.now(),
      });

      // 6. Automação: Criar/Ativar Centro de Custo
      try {
        const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', orcamento.clienteId);
        const cliSnap = await getDoc(cliRef);

        if (cliSnap.exists()) {
          const cliData = cliSnap.data();
          let ccIdParaUso = cliData.centroCustoId;

          // Se já tem CC, reativar
          if (ccIdParaUso) {
            const existingCCRef = doc(db, 'EMPRESAS', empresaId, 'centros_custo', ccIdParaUso);
            const existingCCSnap = await getDoc(existingCCRef);

            if (existingCCSnap.exists()) {
              const nomeCorreto = `${cliData.prefixoNome ? cliData.prefixoNome + ' ' : ''}${cliData.nome}`;
              await updateDoc(existingCCRef, {
                nome: nomeCorreto,
                ativo: true,
                atualizadoEm: new Date().toISOString(),
              });
            }
          } else {
            // Criar novo Centro de Custo (lógica simplificada)
            console.log('Centro de Custo será criado posteriormente');
          }

          // Atualizar status do cliente
          await updateDoc(cliRef, {
            statusCliente: 'com_contrato',
            contratoId: novoContratoRef.id,
            atualizadoEm: Timestamp.now(),
          });
        }
      } catch (ccErr) {
        console.error('Erro ao processar Centro de Custo:', ccErr);
        // Não falhar a criação do contrato por causa do CC
      }

      setSuccess(`Contrato ${numeroContrato} criado com sucesso!`);
      loadContratos();

    } catch (err: any) {
      setError('Erro ao criar contrato: ' + err.message);
      throw err;
    }
  };



  // Filtros de Abas (3 tabs: Em Aberto, Aprovados, Arquivados)
  const contratosEmAberto = contratos.filter(c => ['em_elaboracao', 'enviado'].includes(c.status?.toLowerCase() || ''));
  const contratosAprovados = contratos.filter(c => c.status?.toLowerCase() === 'aprovado');
  const contratosArquivados = contratos.filter(c => ['reprovado', 'expirado', 'cancelado'].includes(c.status?.toLowerCase() || ''));

  // Define as listas para cada aba
  let currentList: Contrato[] = [];
  if (tabValue === 0) currentList = contratosEmAberto;
  else if (tabValue === 1) currentList = contratosAprovados;
  else currentList = contratosArquivados;

  // Totais para os Cards
  const totalEmAberto = contratosEmAberto.length;
  const valorEmAberto = contratosEmAberto.reduce((acc, c) => acc + (c.valorContrato || 0), 0);

  const totalAprovados = contratosAprovados.length;
  const valorAprovados = contratosAprovados.reduce((acc, c) => acc + (c.valorContrato || 0), 0);

  const totalArquivados = contratosArquivados.length;
  const valorArquivados = contratosArquivados.reduce((acc, c) => acc + (c.valorContrato || 0), 0);

  const filteredOrcamentos: Orcamento[] = []; // Inutilizado nesta view focada em Contratos

  const filteredContratos = currentList.filter((contrato) => {
    const matchesSearch =
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));

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
      <Box sx={{ pb: 4 }}>
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
              Novo Contrato
            </Button>

          </Box>
        </Box>

        {/* Cards Resumo */}
        {/* Cards Resumo */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Card Em Aberto Consolidado */}
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">EM ABERTO</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h4" fontWeight="bold" color="#1565c0" sx={{ lineHeight: 1 }}>
                {totalEmAberto}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="#1976d2" sx={{ mt: 0.5 }}>
                R$ {valorEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>

          {/* Card Aprovados */}
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">APROVADOS</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h4" fontWeight="bold" color="#2e7d32" sx={{ lineHeight: 1 }}>
                {totalAprovados}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="#4caf50" sx={{ mt: 0.5 }}>
                R$ {valorAprovados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>

          {/* Card Arquivados */}
          <Paper sx={{ p: 2, bgcolor: '#ffebee', borderLeft: '4px solid #ef5350' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">ARQUIVADOS</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h4" fontWeight="bold" color="#d32f2f" sx={{ lineHeight: 1 }}>
                {totalArquivados}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="#ef5350" sx={{ mt: 0.5 }}>
                R$ {valorArquivados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Tabs */}
        <Paper square sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary" centered>
            <Tab label={`Em Aberto (${totalEmAberto})`} />
            <Tab label={`Aprovados (${totalAprovados})`} />
            <Tab label={`Arquivados (${totalArquivados})`} />
          </Tabs>
        </Paper>

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

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                  <TableRow>
                    <TableCell />
                    <TableCell sx={{ fontWeight: 'bold' }}>Número</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Emissão</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Vendedor</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Contrato</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Valor Mensal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', paddingRight: '40px' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContratos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum contrato encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContratos.map((contrato) => (
                      <ContratoRow
                        key={contrato.id}
                        row={contrato}
                        clientes={clientes}
                        onEdit={handleOpenContratoDialog}
                        onDelete={handleOpenDeleteDialog}
                        onViewPdf={handleGerarPDFContrato}
                        onUpdateStatus={handleUpdateStatus}
                      />
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
              <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2} sx={{ mt: 1 }}>
                <Box gridColumn={{ xs: "span 12", sm: "span 3" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Número do Contrato"
                    value={contratoFormData.numero}
                    InputProps={{ readOnly: true }}
                    helperText="Gerado automaticamente"
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 9" }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Título do Orçamento *"
                    value={contratoFormData.titulo || ''}
                    onChange={(e) => handleContratoInputChange('titulo', e.target.value)}
                  >
                    {TITULO_CONTRATO_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <Autocomplete
                    options={clientes}
                    getOptionLabel={(option) => option.prefixoNome ? `${option.prefixoNome} ${option.nome}` : option.nome || ''}
                    value={clientes.find((c) => c.id === contratoFormData.clienteId) || null}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        handleClienteChange(newValue.id);
                      } else {
                        handleContratoInputChange('clienteId', '');
                        handleContratoInputChange('clienteNome', '');
                        handleContratoInputChange('prefixoNome', '');
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Cliente *" size="small" />}
                  />
                </Box>

                {/* Campo Solicitante removido conforme solicitação */}

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <Autocomplete
                    options={usuarios}
                    getOptionLabel={(option) => option.nome || ''}
                    value={usuarios.find((u) => u.id === contratoFormData.vendedorId) || null}
                    onChange={(_, newValue) => {
                      handleContratoInputChange('vendedorId', newValue?.id || '');
                      handleContratoInputChange('vendedorNome', newValue?.nome || '');
                    }}
                    renderInput={(params) => <TextField {...params} label="Vendedor" size="small" />}
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 3" }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Data de Emissão *"
                    value={contratoFormData.dataEmissao || ''}
                    onChange={(e) => handleContratoInputChange('dataEmissao', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 3" }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Validade *"
                    value={contratoFormData.dataValidade || ''}
                    onChange={(e) => handleContratoInputChange('dataValidade', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box gridColumn={{ xs: "span 12", sm: "span 6" }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Valor do Contrato (Mensal) *"
                    value={contratoFormData.valorContrato || ''}
                    onChange={(e) => handleContratoInputChange('valorContrato', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#e8f5e9',
                      }
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>

                <Box gridColumn="span 12">
                  <TextField
                    fullWidth
                    size="small"
                    label="Observações"
                    multiline
                    rows={2}
                    value={contratoFormData.observacao || ''}
                    onChange={(e) => handleContratoInputChange('observacao', e.target.value)}
                  />
                </Box>



                {contratoFormData.clienteId && (() => {
                  const clienteSelecionado = clientes.find(c => c.id === contratoFormData.clienteId);
                  if (clienteSelecionado) {
                    const enderecoCompleto = `${clienteSelecionado.endereco}, ${clienteSelecionado.numero}${clienteSelecionado.complemento ? ` - ${clienteSelecionado.complemento}` : ''}, ${clienteSelecionado.bairro}, ${clienteSelecionado.cidade}/${clienteSelecionado.uf}${clienteSelecionado.cep ? ` - CEP: ${clienteSelecionado.cep}` : ''}`;
                    return (
                      <>
                        <Box gridColumn="span 12">
                          <TextField
                            fullWidth
                            size="small"
                            label="Endereço Completo"
                            value={enderecoCompleto}
                            InputProps={{ readOnly: true }}
                            multiline
                            rows={2}
                            sx={{ bgcolor: '#f5f5f5' }}
                          />
                        </Box>

                        {/* Dados de Contato (Read-Only style like OrcamentosEquipamentos) */}
                        <Box gridColumn="span 12">
                          <Box sx={{ mt: 1, mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              Dados de Contato (Histórico)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Estes dados são copiados do cadastro do cliente e ficarão salvos neste contrato.
                            </Typography>
                          </Box>

                          <Paper variant="outlined" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                            <Box>
                              {/* Linha 1: Identificação */}
                              <Box display="flex" flexWrap="wrap" gap={2} mb={1} alignItems="center">
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Nome</Typography>
                                  <Typography variant="body2" fontWeight="bold">{contratoFormData.nomeContato || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Cargo/Função</Typography>
                                  <Typography variant="body2">{contratoFormData.cargoContato || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Apto/Sala</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    {contratoFormData.contatoApto || '-'}
                                  </Typography>
                                </Box>
                              </Box>

                              <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                              {/* Linha 2: Contato */}
                              <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">E-mails</Typography>
                                  <Typography variant="body2">
                                    {(contratoFormData.emailContato || contratoFormData.contatoEmail2) ? (
                                      <>
                                        {contratoFormData.emailContato}
                                        {contratoFormData.emailContato && contratoFormData.contatoEmail2 && ' / '}
                                        {contratoFormData.contatoEmail2}
                                      </>
                                    ) : '-'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">Telefones</Typography>
                                  <Typography variant="body2">
                                    {(contratoFormData.telefoneContato || contratoFormData.contatoWhatsapp) ? (
                                      <>
                                        {contratoFormData.telefoneContato && `Fixo: ${contratoFormData.telefoneContato}`}
                                        {contratoFormData.telefoneContato && contratoFormData.contatoWhatsapp && ' | '}
                                        {contratoFormData.contatoWhatsapp && `WhatsApp: ${contratoFormData.contatoWhatsapp}`}
                                      </>
                                    ) : '-'}
                                  </Typography>
                                </Box>
                              </Box>


                            </Box>
                          </Paper>
                        </Box>
                      </>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}

            {tabDialogValue === 1 && (
              <Box>
                <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>
                  <Box gridColumn="span 12">
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
                        <TableHead sx={{ bgcolor: customColors.tableHeader }}>
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
                                  <ActionEdit title="Editar Item" onClick={() => handleEditEquipamentoCobertos(index)} />
                                  <ActionDelete title="Excluir Item" onClick={() => handleDeleteEquipamentoCobertos(index)} />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  <Box gridColumn="span 12">
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
                        <TableHead sx={{ bgcolor: customColors.tableHeader }}>
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
                                  <ActionEdit title="Editar Item" onClick={() => handleEditEquipamentoNaoCobertos(index)} />
                                  <ActionDelete title="Excluir Item" onClick={() => handleDeleteEquipamentoNaoCobertos(index)} />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveContrato} variant="contained">
              {isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog >

        {/* Dialog para adicionar Equipamento Coberto */}
        < Dialog open={openEquipamentoCobertosDialog} onClose={() => setOpenEquipamentoCobertosDialog(false)
        } maxWidth="sm" fullWidth >
          <DialogTitle>
            {editingEquipamentoCobertosIndex !== null ? 'Editar Equipamento' : 'Adicionar Equipamento Coberto'}
          </DialogTitle>
          <DialogContent>
            <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2} sx={{ mt: 1 }}>
              <Box gridColumn="span 12">
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
                      {produto.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box gridColumn="span 12">
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Quantidade *"
                  value={equipamentoCobertosFormData.quantidade}
                  onChange={(e) => setEquipamentoCobertosFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEquipamentoCobertosDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEquipamentoCobertos} variant="contained">
              {editingEquipamentoCobertosIndex !== null ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogActions>
        </Dialog >

        {/* Dialog para adicionar Equipamento Não Coberto */}
        < Dialog open={openEquipamentoNaoCobertosDialog} onClose={() => setOpenEquipamentoNaoCobertosDialog(false)} maxWidth="sm" fullWidth >
          <DialogTitle>
            {editingEquipamentoNaoCobertosIndex !== null ? 'Editar Equipamento' : 'Adicionar Equipamento Não Coberto'}
          </DialogTitle>
          <DialogContent>
            <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2} sx={{ mt: 1 }}>
              <Box gridColumn="span 12">
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
                      {produto.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box gridColumn="span 12">
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Quantidade *"
                  value={equipamentoNaoCobertosFormData.quantidade}
                  onChange={(e) => setEquipamentoNaoCobertosFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEquipamentoNaoCobertosDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEquipamentoNaoCobertos} variant="contained">
              {editingEquipamentoNaoCobertosIndex !== null ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogActions>
        </Dialog >

        {/* Dialog de Visualização */}
        < Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth >
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
                  <Typography>R$ {selectedOrcamento.valorContrato.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                  <StatusChip status={selectedOrcamento.status} label={STATUS_OPTIONS.find(s => s.value === selectedOrcamento.status)?.label} />
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
                  <Typography>{(selectedContrato.dataInicio || (selectedContrato as any).data)?.toDate().toLocaleDateString('pt-BR')}</Typography>
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
                  <StatusChip status={selectedContrato.status} label={STATUS_CONTRATO_OPTIONS.find(s => s.value === selectedContrato.status)?.label} />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Fechar</Button>
          </DialogActions>
        </Dialog >

        {/* Dialog de Confirmação de Exclusão */}
        <ConfirmDialog
          open={openDeleteDialog}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDelete}
          title="Confirmar Exclusão"
          message={
            <Typography component="span">
              Tem certeza que deseja excluir <strong>{selectedOrcamento ? selectedOrcamento.numero : selectedContrato?.numero}</strong>?
            </Typography>
          }
        />
      </Box >
    </ProtectedRoute >
  );
}

// Componente Row definido FORA do componente principal para evitar recriação a cada render
function ContratoRow(props: {
  row: Contrato,
  clientes: Cliente[],
  onEdit: (c: Contrato) => void,
  onDelete: (c: Contrato) => void,
  onViewPdf: (c: Contrato) => void,
  onUpdateStatus: (id: string, status: string) => void
}) {
  const { row, clientes, onEdit, onDelete, onViewPdf, onUpdateStatus } = props;
  const [open, setOpen] = useState(false);

  const cliente = clientes.find(c => c.id === row.clienteId);
  const clienteDisplay = cliente?.prefixoNome ? `${cliente.prefixoNome} ${row.clienteNome}` : row.clienteNome;

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f5f5f5' : 'inherit' }}>
        <TableCell width={50}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ py: 0.25 }}>{row.numero}</TableCell>
        <TableCell sx={{ py: 0.25 }}>{(row.dataEmissao || row.data)?.toDate().toLocaleDateString('pt-BR')}</TableCell>
        <TableCell sx={{ py: 0.25 }}>{clienteDisplay}</TableCell>
        <TableCell sx={{ py: 0.25 }}>{row.vendedorNome || '-'}</TableCell>
        <TableCell sx={{ py: 0.25 }}>
          {TIPO_CONTRATO_OPTIONS.find(t => t.value === row.tipoContrato)?.label}
        </TableCell>
        <TableCell sx={{ py: 0.25 }}>R$ {row.valorContrato.toFixed(2)}</TableCell>
        <TableCell sx={{ py: 0.25 }}>
          <StatusChip
            status={row.status}
            label={STATUS_CONTRATO_OPTIONS.find(s => s.value === row.status)?.label}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 0.25 }}>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {(row.status as string) === 'em_elaboracao' && (
              <ActionSend title="Enviar ao Cliente" onClick={() => onUpdateStatus(row.id, 'enviado')} />
            )}
            <ActionPdf title="Visualizar PDF" onClick={() => onViewPdf(row)} />
            <ActionEdit title="Editar" onClick={() => onEdit(row)} />
            <ActionDelete title="Excluir" onClick={() => onDelete(row)} />
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 1 }}>
              {/* Chips de Ação no Topo Direito */}
              {((row.status as unknown) as string) === 'enviado' && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                  <StatusChip
                    status={row.status}
                    label="Aprovado"
                    onClick={() => onUpdateStatus(row.id, 'aprovado')}
                    sx={{ cursor: 'pointer' }}
                    icon={<CheckCircle />}
                  />
                  <StatusChip
                    status="reprovado"
                    label="Reprovado"
                    onClick={() => onUpdateStatus(row.id, 'reprovado')}
                    sx={{ cursor: 'pointer' }}
                    icon={<Cancel />}
                  />
                </Box>
              )}

              <Grid container spacing={3}>
                {/* 1. Informações Gerais - Verde */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 1 }}>
                    Informações Gerais
                  </Typography>
                  <Box sx={{ bgcolor: '#f1f8e9', p: 1.5, borderRadius: 1, minHeight: '120px' }}>
                    <Typography variant="body2"><strong>Título:</strong> {row.titulo}</Typography>
                    <Typography variant="body2"><strong>Tipo:</strong> {TIPO_CONTRATO_OPTIONS.find(t => t.value === row.tipoContrato)?.label}</Typography>
                    <Typography variant="body2"><strong>Valor Mensal:</strong> R$ {row.valorContrato?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Typography>
                    {row.observacao && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic', color: '#666' }}>
                        Obs: "{row.observacao}"
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* 2. Dados do Cliente - Azul */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                    Dados do Cliente
                  </Typography>
                  <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1, minHeight: '120px' }}>
                    <Typography variant="body2"><strong>Razão Social:</strong> {row.clienteNome}</Typography>
                    <Typography variant="body2"><strong>CNPJ/CPF:</strong> {formatCnpjCpf(row.clienteCnpjCpf)}</Typography>
                    <Typography variant="body2"><strong>Endereço:</strong> {row.clienteEndereco}, {row.clienteNumero}</Typography>
                    <Typography variant="body2">{row.clienteBairro} - {row.clienteCidade}/{row.clienteUf}</Typography>
                  </Box>
                </Grid>

                {/* 3. Contato Atual - Laranja */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#ef6c00', mb: 1 }}>
                    Contato Atual
                  </Typography>
                  <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, minHeight: '120px' }}>
                    {row.nomeContato ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {row.nomeContato} {row.contatoApto ? `(Apto: ${row.contatoApto})` : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1, mt: 0.5 }}>
                          {row.contatoWhatsapp ? (
                            <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                              📞 {row.contatoWhatsapp}
                            </Typography>
                          ) : row.telefoneContato && (
                            <Typography variant="caption">📞 {row.telefoneContato}</Typography>
                          )
                          }
                          {row.emailContato && (
                            <Typography variant="caption" display="block">📧 {row.emailContato}</Typography>
                          )}
                          {row.cargoContato && (
                            <Typography variant="caption" color="text.secondary">{row.cargoContato}</Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Nenhum contato salvo.</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Tabela Cobertos */}
                <Grid size={{ xs: 12, md: (row.equipamentosNaoCobertos?.length > 0) ? 6 : 12 }}>
                  {row.equipamentosCobertos && row.equipamentosCobertos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#455a64', mb: 1 }}>
                        Equipamentos Cobertos pelo Contrato ({row.equipamentosCobertos.length})
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'white' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                            <TableRow>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Qtd</strong></TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Equipamento</strong></TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Fabricante</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {row.equipamentosCobertos.map((eq, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.quantidade}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.equipamento}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.fabricanteNome}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Grid>

                {/* Tabela NÃO Cobertos */}
                <Grid size={{ xs: 12, md: (row.equipamentosCobertos?.length > 0) ? 6 : 12 }}>
                  {row.equipamentosNaoCobertos && row.equipamentosNaoCobertos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#455a64', mb: 1 }}>
                        Equipamentos NÃO Cobertos pelo Contrato ({row.equipamentosNaoCobertos.length})
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'white' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                            <TableRow>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Qtd</strong></TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Equipamento</strong></TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Fabricante</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {row.equipamentosNaoCobertos.map((eq, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.quantidade}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.equipamento}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.fabricanteNome}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
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
}
