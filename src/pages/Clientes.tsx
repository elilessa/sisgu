import React from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

import { useState, useEffect, useMemo } from 'react';
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
  FormControlLabel,
  Checkbox,
  Divider,
  Tabs,
  Tab,
  TablePagination,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { formatCnpjCpf, formatTelefone, formatCep } from '../utils/masks';
import { Add, Search, OpenInNew } from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { customColors } from '../theme';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ActionEdit, ActionDelete, ActionView, StatusChip } from '../components/TableActions';
import { apiRequest } from '../config/api';

// Interface Prefixo removida - agora usamos Autocomplete freeSolo

interface Contato {
  id: string;
  nome: string;
  apto: string;
  funcao: string;
  telefone: string;
  whatsapp: string;
  email1: string;
  email2: string;
  atual: boolean;
}

interface Administradora {
  id: string;
  nome: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  site: string;
  observacao: string;
  status: 'ativa' | 'inativa';
  telefone1?: string;
  telefone2?: string;
  ramal1?: string;
  ramal2?: string;
  email?: string;
}

// Função formatCnpjCpf removida pois agora usamos a importada de utils/masks

interface ContatoAdministradora {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  celular: string;
  email: string;
  ramal: string;
  principal: boolean;
  observacao: string;
  ativo: boolean;
}

interface EquipamentoInstalado {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoTipo: string;
  quantidade: number;
  localizacao: string;
  dataInstalacao: Timestamp;
}

interface Cliente {
  id: string;
  prefixoNome: string;
  nome: string;
  pessoaJuridica: boolean;
  pessoaFisica: boolean;
  cnpjCpf: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacao: string;
  enviaBoleto: boolean;
  status: 'ativo' | 'inativo';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  administradoraId?: string;
  contatoAdministradoraId?: string;
  administradoraNome?: string;
  contatoAdministradoraNome?: string;
  contatoAtual?: string;
  contatoFuncao?: string;
  contatoTelefone?: string;
  contatoWhatsapp?: string;
  contatoApto?: string;
  contatoEmail1?: string;
  contatoEmail2?: string;
  temContrato?: boolean;
  statusContrato?: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  centroCustoCodigo?: string;
}

interface CentroCustoOption {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
}

interface Produto {
  id: string;
  nome: string;
  partNumber?: string;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function Clientes() {
  const { userData } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [deleteContatoId, setDeleteContatoId] = useState<string | null>(null);
  const [deleteEquipamentoId, setDeleteEquipamentoId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Estados para gerenciamento de contatos do cliente
  const [tabValue, setTabValue] = useState(0);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [openContatoDialog, setOpenContatoDialog] = useState(false);
  const [isEditingContato, setIsEditingContato] = useState(false);
  const [editingContatoIndex, setEditingContatoIndex] = useState<number | null>(null);
  const [contatoFormData, setContatoFormData] = useState({
    nome: '',
    apto: '',
    funcao: '',
    telefone: '',
    whatsapp: '',
    email1: '',
    email2: '',
    atual: false,
  });

  // Estados para gerenciamento de administradoras
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [administradoraSelecionadaId, setAdministradoraSelecionadaId] = useState('');
  const [administradoraSelecionada, setAdministradoraSelecionada] = useState<Administradora | null>(null);
  const [contatosAdministradora, setContatosAdministradora] = useState<ContatoAdministradora[]>([]);
  const [contatoAdministradoraSelecionadoId, setContatoAdministradoraSelecionadoId] = useState('');
  const [contatoAdministradoraSelecionado, setContatoAdministradoraSelecionado] = useState<ContatoAdministradora | null>(null);

  // Estados Financeiros
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoOption[]>([]);

  // Estados para gerenciamento de equipamentos instalados
  const [equipamentos, setEquipamentos] = useState<EquipamentoInstalado[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [openEquipamentoDialog, setOpenEquipamentoDialog] = useState(false);
  const [isEditingEquipamento, setIsEditingEquipamento] = useState(false);
  const [editingEquipamentoIndex, setEditingEquipamentoIndex] = useState<number | null>(null);
  const [equipamentoFormData, setEquipamentoFormData] = useState({
    produtoId: '',
    quantidade: 1,
    localizacao: '',
  });

  const [formData, setFormData] = useState({
    prefixoNome: '',
    nome: '',
    pessoaJuridica: false,
    pessoaFisica: false,
    cnpjCpf: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    observacao: '',
    enviaBoleto: false,
    status: 'ativo' as 'ativo' | 'inativo',
    contatoTelefone: '',
    administradoraId: '',
    contatoAdministradoraId: '',
    temContrato: false,
    statusContrato: '',
    centroCustoId: '',
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingReceita, setLoadingReceita] = useState(false);

  const handleConsultarDocumento = async (valorManual?: string) => {
    // Usa o valor passado ou o do estado
    const valorParaChecar = valorManual !== undefined ? valorManual : formData.cnpjCpf;
    const docLimpo = valorParaChecar.replace(/\D/g, '');

    if (formData.pessoaFisica) {
      if (docLimpo.length !== 11) {
        if (!valorManual) setError('CPF incompleto para consulta.');
        return;
      }
      // CPF: Link externo (apenas via clique do botão, não automático)
      if (!valorManual) {
        window.open('https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp', '_blank');
        setSuccess('Consulta de CPF aberta em nova aba.');
      }
      return;
    }

    // CNPJ: BrasilAPI
    if (docLimpo.length !== 14) {
      if (!valorManual) setError('CNPJ incompleto para consulta.');
      return;
    }

    setLoadingReceita(true);
    setError('');

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docLimpo}`);

      if (!response.ok) {
        if (response.status === 404) throw new Error('CNPJ não encontrado na base de dados.');
        throw new Error('Erro ao consultar CNPJ.');
      }

      const data = await response.json();

      // Mapeamento de dados
      setFormData(prev => ({
        ...prev,
        cnpjCpf: valorParaChecar, // Garante que o input mantenha o valor
        nome: data.razao_social || data.nome_fantasia || '',
        prefixoNome: '',
        cep: data.cep ? formatCep(data.cep) : prev.cep,
        endereco: data.logradouro || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio || prev.cidade,
        uf: data.uf || prev.uf,
        contatoTelefone: data.ddd_telefone_1 ? formatTelefone(`${data.ddd_telefone_1}`) : prev.contatoTelefone,
        observacao: prev.observacao ? prev.observacao : (data.nome_fantasia ? `Fantasia: ${data.nome_fantasia}` : '')
      }));

      setSuccess('Dados do CNPJ carregados com sucesso!');

    } catch (err: any) {
      console.error('Erro BrasilAPI:', err);
      // Apenas mostra erro se foi manual, para não spammar no automático
      if (!valorManual) setError('Erro ao buscar CNPJ: ' + err.message);
    } finally {
      setLoadingReceita(false);
    }
  };

  const handleCepChange = async (cep: string) => {
    const valor = formatCep(cep);
    handleInputChange('cep', valor);
    if (valor.length === 9) {
      setLoadingCep(true);
      // Simulação de busca ou implementação real se existir buscarCEP
      try {
        const response = await fetch(`https://viacep.com.br/ws/${valor.replace('-', '')}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro.toUpperCase(),
            bairro: data.bairro.toUpperCase(),
            cidade: data.localidade.toUpperCase(),
            uf: data.uf,
            complemento: prev.complemento || data.complemento.toUpperCase()
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Extrair prefixos únicos dos clientes existentes para sugestões
  const prefixosSugeridos = useMemo(() => {
    // Prefixos padrão que sempre aparecem
    const prefixosPadrao = ['VILA', 'RES.', 'COND.', 'SR', 'SRª', 'DR', 'DRª'];

    // Prefixos dos clientes existentes
    const prefixosClientes = clientes
      .map(c => c.prefixoNome)
      .filter(p => p && p.trim());

    // Combinar e remover duplicatas
    const todosPrefixos = [...prefixosPadrao, ...prefixosClientes]
      .filter((p, i, arr) => arr.indexOf(p) === i);

    return todosPrefixos.sort();
  }, [clientes]);

  useEffect(() => {
    loadClientes();
    loadAdministradoras();
    loadProdutos();
    loadCentrosCusto();
  }, [userData]);

  const loadClientes = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoading(true);
    console.log('[ClientesManagement] Carregando clientes via API Replit para empresa:', empresaId);

    try {
      // Consumindo API do Replit em vez do Firestore direto
      const response = await apiRequest(`/EMPRESAS/${empresaId}/clientes`);

      if (!response.ok) throw new Error(`Erro API: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Erro desconhecido na API');

      const clientesList = result.data.map((data: any) => {
        return { ...data };
      });

      // Ordenar localmente
      const clientesOrdenados = clientesList.sort((a: any, b: any) =>
        (a.nome || '').localeCompare(b.nome || '')
      );
      setClientes(clientesOrdenados as Cliente[]);

    } catch (err: any) {
      console.error('[ClientesManagement] Erro ao carregar clientes:', err);
      setError('Erro ao carregar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContatos = async (clienteId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const contatosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', clienteId, 'contatos');
      const snapshot = await getDocs(contatosRef);

      const contatosList: Contato[] = [];
      snapshot.forEach((doc) => {
        contatosList.push({ id: doc.id, ...doc.data() } as Contato);
      });

      setContatos(contatosList);
    } catch (err: any) {
      setError('Erro ao carregar contatos: ' + err.message);
    }
  };

  const loadAdministradoras = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const administradorasRef = collection(db, 'EMPRESAS', empresaId, 'administradoras');
      const snapshot = await getDocs(administradorasRef);

      const administradorasList: Administradora[] = [];
      snapshot.forEach((doc) => {
        administradorasList.push({ id: doc.id, ...doc.data() } as Administradora);
      });

      administradorasList.sort((a, b) => a.nome.localeCompare(b.nome));

      setAdministradoras(administradorasList);
    } catch (err: any) {
      setError('Erro ao carregar administradoras: ' + err.message);
    }
  };

  const loadContatosAdministradora = async (administradoraId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const contatosRef = collection(db, 'EMPRESAS', empresaId, 'administradoras', administradoraId, 'contatos');
      const snapshot = await getDocs(contatosRef);

      const contatosList: ContatoAdministradora[] = [];
      snapshot.forEach((doc) => {
        contatosList.push({ id: doc.id, ...doc.data() } as ContatoAdministradora);
      });

      setContatosAdministradora(contatosList);
    } catch (err: any) {
      setError('Erro ao carregar contatos da administradora: ' + err.message);
    }
  };

  const handleContatoAdministradoraFieldChange = (field: keyof ContatoAdministradora, value: string) => {
    if (contatoAdministradoraSelecionado) {
      setContatoAdministradoraSelecionado({ ...contatoAdministradoraSelecionado, [field]: value });
    }
  };

  const loadCentrosCusto = async () => {
    if (!userData?.empresaId) return;
    try {
      const q = collection(db, 'EMPRESAS', userData.empresaId, 'centros_custo');
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CentroCustoOption[];
      // Filtrar apenas ativos
      setCentrosCusto(lista.filter(c => c.ativo !== false));
    } catch (err) {
      console.error("Erro ao carregar centros de custo", err);
    }
  };

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;
    setLoading(true);
    try {
      const produtosRef = collection(db, 'EMPRESAS', empresaId, 'produtos');
      const snapshot = await getDocs(produtosRef);

      const produtosList: Produto[] = [];
      snapshot.forEach((doc) => {
        produtosList.push({ id: doc.id, ...doc.data() } as Produto);
      });

      setProdutos(produtosList);
    } catch (err: any) {
      setError('Erro ao carregar produtos: ' + err.message);
    }
  };

  const loadEquipamentos = async (clienteId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const equipamentosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', clienteId, 'equipamentos');
      const snapshot = await getDocs(equipamentosRef);

      const equipamentosList: EquipamentoInstalado[] = [];
      snapshot.forEach((doc) => {
        equipamentosList.push({ id: doc.id, ...doc.data() } as EquipamentoInstalado);
      });

      setEquipamentos(equipamentosList);
    } catch (err: any) {
      setError('Erro ao carregar equipamentos: ' + err.message);
    }
  };

  const handleAdministradoraChange = async (administradoraId: string) => {
    setAdministradoraSelecionadaId(administradoraId);

    if (administradoraId) {
      const adm = administradoras.find(a => a.id === administradoraId);
      setAdministradoraSelecionada(adm || null);
      await loadContatosAdministradora(administradoraId);
      setContatoAdministradoraSelecionadoId('');
      setContatoAdministradoraSelecionado(null);
    } else {
      setAdministradoraSelecionada(null);
      setContatosAdministradora([]);
      setContatoAdministradoraSelecionadoId('');
      setContatoAdministradoraSelecionado(null);
    }
  };

  const handleAdministradoraFieldChange = (field: keyof Administradora, value: string) => {
    if (administradoraSelecionada) {
      setAdministradoraSelecionada({ ...administradoraSelecionada, [field]: value });
    }
  };

  const handleContatoAdministradoraChange = (contatoId: string) => {
    setContatoAdministradoraSelecionadoId(contatoId);

    if (contatoId) {
      const contato = contatosAdministradora.find(c => c.id === contatoId);
      setContatoAdministradoraSelecionado(contato || null);
    } else {
      setContatoAdministradoraSelecionado(null);
    }
  };



  const handleOpenDialog = async (cliente?: Cliente) => {
    setError('');
    if (cliente) {
      setIsEditing(true);
      setSelectedCliente(cliente);
      setFormData({
        prefixoNome: cliente.prefixoNome || '',
        nome: cliente.nome,
        pessoaJuridica: cliente.pessoaJuridica,
        pessoaFisica: cliente.pessoaFisica,
        cnpjCpf: cliente.cnpjCpf,
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        uf: cliente.uf,
        cep: cliente.cep,
        observacao: cliente.observacao,
        enviaBoleto: cliente.enviaBoleto || false,
        status: cliente.status,
        contatoTelefone: cliente.contatoTelefone || '',
        administradoraId: cliente.administradoraId || '',
        contatoAdministradoraId: cliente.contatoAdministradoraId || '',
        temContrato: cliente.temContrato || false,
        statusContrato: cliente.statusContrato || '',
        centroCustoId: cliente.centroCustoId || '',
      });
      loadContatos(cliente.id);
      loadEquipamentos(cliente.id);

      // Carregar dados da administradora se existir
      if (cliente.administradoraId && userData?.empresaId) {
        setAdministradoraSelecionadaId(cliente.administradoraId);
        const empresaId = userData.empresaId;
        const adm = administradoras.find(a => a.id === cliente.administradoraId);
        setAdministradoraSelecionada(adm || null);

        // Carregar contatos da administradora
        try {
          const contatosRef = collection(db, 'EMPRESAS', empresaId, 'administradoras', cliente.administradoraId, 'contatos');
          const snapshot = await getDocs(contatosRef);
          const contatosList: ContatoAdministradora[] = [];
          snapshot.forEach((doc) => {
            contatosList.push({ id: doc.id, ...doc.data() } as ContatoAdministradora);
          });
          setContatosAdministradora(contatosList);

          // Definir contato selecionado se existir
          if (cliente.contatoAdministradoraId) {
            setContatoAdministradoraSelecionadoId(cliente.contatoAdministradoraId);
            const contato = contatosList.find(c => c.id === cliente.contatoAdministradoraId);
            setContatoAdministradoraSelecionado(contato || null);
          } else {
            setContatoAdministradoraSelecionadoId('');
            setContatoAdministradoraSelecionado(null);
          }
        } catch (err) {
          console.error('Erro ao carregar contatos da administradora:', err);
        }
      } else {
        setAdministradoraSelecionadaId('');
        setAdministradoraSelecionada(null);
        setContatosAdministradora([]);
        setContatoAdministradoraSelecionadoId('');
        setContatoAdministradoraSelecionado(null);
      }
    } else {
      setIsEditing(false);
      setSelectedCliente(null);
      setContatos([]);
      setFormData({
        prefixoNome: '',
        nome: '',
        pessoaJuridica: false,
        pessoaFisica: false,
        cnpjCpf: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        observacao: '',
        enviaBoleto: false,
        status: 'ativo',
        contatoTelefone: '',
        administradoraId: '',
        contatoAdministradoraId: '',
        temContrato: false,
        statusContrato: '',
        centroCustoId: '',
      });
      setAdministradoraSelecionadaId('');
      setAdministradoraSelecionada(null);
      setContatosAdministradora([]);
      setContatoAdministradoraSelecionadoId('');
      setContatoAdministradoraSelecionado(null);
    }
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCliente(null);
    setIsEditing(false);
    setAdministradoraSelecionadaId('');
    setAdministradoraSelecionada(null);
    setContatosAdministradora([]);
    setContatoAdministradoraSelecionadoId('');
    setContatoAdministradoraSelecionado(null);
  };

  const handleOpenViewDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    loadContatos(cliente.id);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedCliente(null);
  };

  const handleOpenDeleteDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedCliente(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro?.toUpperCase() || prev.endereco,
            bairro: data.bairro?.toUpperCase() || prev.bairro,
            cidade: data.localidade?.toUpperCase() || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handlePessoaChange = (tipo: 'juridica' | 'fisica') => {
    if (tipo === 'juridica') {
      setFormData((prev) => ({
        ...prev,
        pessoaJuridica: !prev.pessoaJuridica,
        pessoaFisica: false,
        cnpjCpf: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        pessoaFisica: !prev.pessoaFisica,
        pessoaJuridica: false,
        cnpjCpf: '',
      }));
    }
  };

  const handleSave = async () => {
    setError('');
    if (!userData?.empresaId) return;

    if (!formData.prefixoNome?.trim() || !formData.nome || !formData.cidade || !formData.uf) {
      setError('Preencha os campos obrigatórios: Prefixo, Nome, Cidade e UF');
      return;
    }

    if (!formData.pessoaJuridica && !formData.pessoaFisica) {
      setError('Selecione se é Pessoa Jurídica ou Física');
      return;
    }

    if (!formData.cnpjCpf) {
      setError('Preencha o campo obrigatório: CNPJ/CPF');
      return;
    }

    console.log('[ClientesManagement] Salvando cliente:', { isEditing, formData });

    try {
      const clienteData: any = {
        ...formData,
        prefixoNome: formData.prefixoNome.trim().toUpperCase(), // Normalizar para maiúsculas
      };

      // Adicionar dados da administradora se selecionada
      if (administradoraSelecionadaId) {
        clienteData.administradoraId = administradoraSelecionadaId;

        if (contatoAdministradoraSelecionadoId) {
          clienteData.contatoAdministradoraId = contatoAdministradoraSelecionadoId;
        }

        // Salvar alterações na Administradora se estiver editando
        if (administradoraSelecionada) {
          try {
            console.log("Tentando atualizar administradora URL:", `/EMPRESAS/${userData.empresaId}/administradoras/${administradoraSelecionada.id}`);
            const response = await apiRequest(`/EMPRESAS/${userData.empresaId}/administradoras/${administradoraSelecionada.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                ...administradoraSelecionada,
                atualizadoEm: Timestamp.now()
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`${response.status} - ${errorData.message || response.statusText}`);
            }

            console.log("Administradora atualizada com sucesso via Cadastro de Cliente (Backend)");
            loadAdministradoras(); // Recarregar lista
          } catch (e: any) {
            console.error("Erro ao atualizar administradora:", e);
            setError(`Erro ao salvar Administradora: ${e.message}`);
          }

          // Salvar alterações no Contato da Administradora
          if (contatoAdministradoraSelecionadoId && contatoAdministradoraSelecionado) {
            try {
              console.log("Tentando atualizar contato URL:", `/EMPRESAS/${userData.empresaId}/administradoras/${administradoraSelecionada.id}/contatos/${contatoAdministradoraSelecionado.id}`);
              const responseContato = await apiRequest(`/EMPRESAS/${userData.empresaId}/administradoras/${administradoraSelecionada.id}/contatos/${contatoAdministradoraSelecionado.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  ...contatoAdministradoraSelecionado,
                  atualizadoEm: Timestamp.now()
                })
              });

              if (!responseContato.ok) {
                const errorData = await responseContato.json();
                console.warn(`Erro API Contato: ${responseContato.status} - ${errorData.message || responseContato.statusText}`);
              } else {
                console.log("Contato da Administradora atualizado com sucesso (Backend)");
              }
            } catch (e) {
              console.error("Erro ao atualizar contato da administradora:", e);
            }
          }
        }
      }

      // Adicionar Cache Nome CC
      if (formData.centroCustoId) {
        const selectedCC = centrosCusto.find(c => c.id === formData.centroCustoId);
        if (selectedCC) {
          clienteData.centroCustoNome = selectedCC.nome;
          clienteData.centroCustoCodigo = selectedCC.codigo;
        }
      }

      // Adicionar timestamp
      clienteData.atualizadoEm = Timestamp.now();

      const empresaId = userData.empresaId;

      // ======================================================================
      // AUTOMAÇÃO: CRIAR CENTRO DE CUSTO SE C.C. NÃO DEFINIDO E TEM CONTRATO
      // ======================================================================
      if (formData.temContrato && !formData.centroCustoId) {
        try {
          console.log("Automação: Buscando grupo CC-CLIENTES para criar Centro de Custo...");

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
            const cleanName = formData.nome
              .toUpperCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
              .replace(/[^A-Z0-9 ]/g, "") // Tira especiais
              .trim()
              .replace(/\s+/g, "-"); // Espaço vira traço

            const novoCodigo = `CC-${cleanName}`.substring(0, 30);

            // Verificar se já existe CC com esse código para evitar duplicidade
            const qCheck = query(collection(db, 'EMPRESAS', empresaId, 'centros_custo'), where('codigo', '==', novoCodigo));
            const snapCheck = await getDocs(qCheck);

            let ccId = '';
            const nomeCC = formData.prefixoNome
              ? `${formData.prefixoNome} ${formData.nome}`
              : formData.nome;

            if (!snapCheck.empty) {
              // Já existe, usa o existente
              ccId = snapCheck.docs[0].id;
              console.log("Automação: Centro de Custo já existente encontrado:", novoCodigo);
            } else {
              // 3. Criar o Centro de Custo
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
                criadoPor: 'SISTEMA_AUTO'
              };

              const ccRef = await addDoc(collection(db, 'EMPRESAS', empresaId, 'centros_custo'), novoCCData);
              ccId = ccRef.id;
              console.log("Automação: Centro de Custo criado ID", ccId);
            }

            // 4. Vincular ao Cliente
            clienteData.centroCustoId = ccId;
            clienteData.centroCustoNome = nomeCC;
            clienteData.centroCustoCodigo = novoCodigo;

            // Atualizar state local para refletir na UI sem reload
            setFormData(prev => ({ ...prev, centroCustoId: ccId }));
          }
        } catch (autoErr) {
          console.error("Erro na automação de Centro de Custo:", autoErr);
        }
      }

      if (isEditing && selectedCliente) {
        console.log('[ClientesManagement] Atualizando cliente via API Replit:', selectedCliente.id);

        const response = await apiRequest(`/EMPRESAS/${empresaId}/clientes/${selectedCliente.id}`, {
          method: 'PUT',
          body: JSON.stringify(clienteData)
        });

        if (!response.ok) throw new Error(`Erro na API (PUT): ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Erro ao atualizar cliente');

        setSuccess('Cliente atualizado com sucesso');
      } else {
        console.log('[ClientesManagement] Criando novo cliente via API Replit');

        // Data de criação será gerada pelo backend, mas enviamos se necessário
        // clienteData.criadoEm = ... (Backend sobrescreve ou mantém)

        const response = await apiRequest(`/EMPRESAS/${empresaId}/clientes`, {
          method: 'POST',
          body: JSON.stringify(clienteData)
        });

        if (!response.ok) throw new Error(`Erro na API (POST): ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Erro ao criar cliente');

        setSuccess('Cliente cadastrado com sucesso');
      }

      handleCloseDialog();
      loadClientes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ClientesManagement] Erro ao salvar cliente:', err);
      setError('Erro ao salvar cliente: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedCliente) return;

    console.log('[ClientesManagement] Excluindo cliente via API Replit:', selectedCliente.id);
    const empresaId = userData.empresaId;

    try {
      const response = await apiRequest(`/EMPRESAS/${empresaId}/clientes/${selectedCliente.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`Erro na API (DELETE): ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Erro ao excluir cliente');

      setSuccess('Cliente excluído com sucesso');
      handleCloseDeleteDialog();
      loadClientes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ClientesManagement] Erro ao excluir cliente:', err);
      setError('Erro ao excluir cliente: ' + err.message);
    }
  };

  // Funções de gerenciamento de contatos
  const handleOpenContatoDialog = () => {
    setIsEditingContato(false);
    setEditingContatoIndex(null);
    setContatoFormData({
      nome: '',
      apto: '',
      funcao: '',
      telefone: '',
      whatsapp: '',
      email1: '',
      email2: '',
      atual: false,
    });
    setOpenContatoDialog(true);
  };

  const handleCloseContatoDialog = () => {
    setOpenContatoDialog(false);
    setIsEditingContato(false);
    setEditingContatoIndex(null);
  };

  const handleContatoInputChange = (field: string, value: any) => {
    setContatoFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditContato = (contato: Contato, index: number) => {
    setIsEditingContato(true);
    setEditingContatoIndex(index);
    setContatoFormData({
      nome: contato.nome,
      apto: contato.apto,
      funcao: contato.funcao,
      telefone: contato.telefone,
      whatsapp: contato.whatsapp,
      email1: contato.email1,
      email2: contato.email2,
      atual: contato.atual,
    });
    setOpenContatoDialog(true);
  };

  const handleSaveContato = async () => {
    if (!contatoFormData.nome || !contatoFormData.funcao) {
      setError('Preencha os campos obrigatórios: Nome e Função');
      return;
    }

    if (!userData?.empresaId || !selectedCliente) return;

    try {
      const empresaId = userData.empresaId;
      const contatosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'contatos');

      // Se marcar como atual, desmarcar os outros
      if (contatoFormData.atual) {
        const atualizacoes = contatos.map(async (c) => {
          if (c.atual) {
            const contatoDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'contatos', c.id);
            await updateDoc(contatoDoc, { atual: false });
          }
        });
        await Promise.all(atualizacoes);

        // Atualizar campos de contato no documento principal do cliente
        const clienteDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id);
        await updateDoc(clienteDoc, {
          contatoAtual: contatoFormData.nome,
          contatoFuncao: contatoFormData.funcao,
          contatoTelefone: contatoFormData.telefone || '',
          contatoWhatsapp: contatoFormData.whatsapp || '',
          contatoApto: contatoFormData.apto || '',
          contatoEmail1: contatoFormData.email1 || '',
          contatoEmail2: contatoFormData.email2 || '',
          atualizadoEm: Timestamp.now(),
        });
      }

      if (isEditingContato && editingContatoIndex !== null) {
        const contatoToEdit = contatos[editingContatoIndex];
        const contatoDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'contatos', contatoToEdit.id);
        await updateDoc(contatoDoc, contatoFormData);

        // Se o contato era atual e foi desmarcado, limpar os campos do cliente
        if (contatoToEdit.atual && !contatoFormData.atual) {
          const clienteDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id);
          await updateDoc(clienteDoc, {
            contatoAtual: '',
            contatoFuncao: '',
            contatoTelefone: '',
            contatoWhatsapp: '',
            contatoApto: '',
            contatoEmail1: '',
            contatoEmail2: '',
            atualizadoEm: Timestamp.now(),
          });
        }

        setSuccess('Contato atualizado com sucesso!');
      } else {
        await addDoc(contatosRef, contatoFormData);
        setSuccess('Contato adicionado com sucesso!');
      }

      handleCloseContatoDialog();
      loadContatos(selectedCliente.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar contato: ' + err.message);
    }
  };

  const handleDeleteContato = (contatoId: string) => {
    setDeleteContatoId(contatoId);
  };

  const confirmDeleteContato = async () => {
    if (!userData?.empresaId || !selectedCliente || !deleteContatoId) return;
    const empresaId = userData.empresaId;
    const contatoId = deleteContatoId;

    try {
      // Verificar se o contato a ser excluído é o atual
      const contatoExcluido = contatos.find(c => c.id === contatoId);

      await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'contatos', contatoId));

      // Se era o contato atual, limpar os campos no documento do cliente
      if (contatoExcluido?.atual) {
        const clienteDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id);
        await updateDoc(clienteDoc, {
          contatoAtual: '',
          contatoFuncao: '',
          contatoTelefone: '',
          contatoWhatsapp: '',
          contatoApto: '',
          contatoEmail1: '',
          contatoEmail2: '',
          atualizadoEm: Timestamp.now(),
        });
      }

      setSuccess('Contato excluído com sucesso!');
      loadContatos(selectedCliente.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir contato: ' + err.message);
    } finally {
      setDeleteContatoId(null);
    }
  };

  // Funções de gerenciamento de equipamentos
  const handleOpenEquipamentoDialog = () => {
    setIsEditingEquipamento(false);
    setEditingEquipamentoIndex(null);
    setEquipamentoFormData({
      produtoId: '',
      quantidade: 1,
      localizacao: '',
    });
    setOpenEquipamentoDialog(true);
  };

  const handleCloseEquipamentoDialog = () => {
    setOpenEquipamentoDialog(false);
    setIsEditingEquipamento(false);
    setEditingEquipamentoIndex(null);
  };

  const handleEquipamentoInputChange = (field: string, value: any) => {
    setEquipamentoFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditEquipamento = (equipamento: EquipamentoInstalado, index: number) => {
    setIsEditingEquipamento(true);
    setEditingEquipamentoIndex(index);
    setEquipamentoFormData({
      produtoId: equipamento.produtoId,
      quantidade: equipamento.quantidade,
      localizacao: equipamento.localizacao,
    });
    setOpenEquipamentoDialog(true);
  };

  const handleSaveEquipamento = async () => {
    if (!equipamentoFormData.produtoId) {
      setError('Preencha o campo obrigatório: Equipamento');
      return;
    }

    if (!userData?.empresaId || !selectedCliente) return;
    const empresaId = userData.empresaId;

    try {
      const produto = produtos.find(p => p.id === equipamentoFormData.produtoId);
      if (!produto) {
        setError('Produto não encontrado');
        return;
      }

      const equipamentosRef = collection(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'equipamentos');

      const equipamentoData = {
        produtoId: equipamentoFormData.produtoId,
        produtoNome: produto.nome,
        // Mantendo compatibilidade com campo antigo se necessário, ou removendo
        produtoTipo: 'Equipamento',
        quantidade: equipamentoFormData.quantidade,
        localizacao: equipamentoFormData.localizacao,
      };

      if (isEditingEquipamento && editingEquipamentoIndex !== null) {
        const equipamentoToEdit = equipamentos[editingEquipamentoIndex];
        const equipamentoDoc = doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'equipamentos', equipamentoToEdit.id);
        await updateDoc(equipamentoDoc, equipamentoData);
        setSuccess('Equipamento atualizado com sucesso!');
      } else {
        await addDoc(equipamentosRef, {
          ...equipamentoData,
          dataInstalacao: Timestamp.now(),
        });
        setSuccess('Equipamento adicionado com sucesso!');
      }

      handleCloseEquipamentoDialog();
      loadEquipamentos(selectedCliente.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar equipamento: ' + err.message);
    }
  };

  const handleDeleteEquipamento = (equipamentoId: string) => {
    setDeleteEquipamentoId(equipamentoId);
  };

  const confirmDeleteEquipamento = async () => {
    if (!userData?.empresaId || !selectedCliente || !deleteEquipamentoId) return;
    const empresaId = userData.empresaId;
    const equipamentoId = deleteEquipamentoId;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'clientes', selectedCliente.id, 'equipamentos', equipamentoId));
      setSuccess('Equipamento excluído com sucesso!');
      loadEquipamentos(selectedCliente.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir equipamento: ' + err.message);
    } finally {
      setDeleteEquipamentoId(null);
    }
  };



  const filteredClientes = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  const displayedClientes = filteredClientes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getCnpjCpfLabel = () => {
    if (formData.pessoaJuridica) return 'CNPJ *';
    if (formData.pessoaFisica) return 'CPF *';
    return 'CNPJ/CPF';
  };

  return (
    <ProtectedRoute requiredRoute="/clientes/lista">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Lista de Clientes
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Cliente
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
              label="Buscar por nome"
              placeholder="Digite o nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              variant="outlined"
            />
          </Box>
          <Paper sx={{ width: '100%', mb: 2 }}>
            <TableContainer sx={{ overflowX: 'auto', maxHeight: 600 }}>
              <Table size="small" stickyHeader sx={{ minWidth: { xs: 600, md: 750 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>Nome</strong></TableCell>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>CNPJ/CPF</strong></TableCell>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>Contato Atual</strong></TableCell>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>Função</strong></TableCell>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>Tel/WhatsApp</strong></TableCell>
                    <TableCell sx={{ bgcolor: customColors.tableHeader }}><strong>E-mail1</strong></TableCell>
                    <TableCell align="right" sx={{ bgcolor: customColors.tableHeader }}><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum cliente encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell sx={{ py: 0.25 }}>
                          {cliente.prefixoNome && `${cliente.prefixoNome} `}{cliente.nome}
                          {cliente.statusContrato === 'cancelado' && (
                            <Chip
                              label="CANCELADO"
                              size="small"
                              sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: '#ffebee', color: '#c62828' }}
                            />
                          )}
                          {cliente.statusContrato === 'ativo' && (
                            <Chip
                              label="CONTRATO"
                              size="small"
                              color="secondary"
                              variant="filled"
                              sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.25 }}>{cliente.cnpjCpf}</TableCell>
                        <TableCell sx={{ py: 0.25 }}>{cliente.contatoAtual || '-'}</TableCell>
                        <TableCell sx={{ py: 0.25 }}>{cliente.contatoFuncao || '-'}</TableCell>
                        <TableCell sx={{ py: 0.25 }}>
                          {[cliente.contatoTelefone, cliente.contatoWhatsapp].filter(Boolean).join(' / ') || '-'}
                        </TableCell>
                        <TableCell sx={{ py: 0.25 }}>{cliente.contatoEmail1 || '-'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.25 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <ActionView title="Visualizar" onClick={() => handleOpenViewDialog(cliente)} />
                            <ActionEdit title="Editar" onClick={() => handleOpenDialog(cliente)} />
                            <ActionDelete title="Excluir" onClick={() => handleOpenDeleteDialog(cliente)} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 75, 100]}
              component="div"
              count={filteredClientes.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            />
          </Paper>
        </>
      )}

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab label="Dados do Cliente" />
            <Tab label="Contatos" disabled={!isEditing} />
            <Tab label="Equipamentos Instalados" disabled={!isEditing} />
            <Tab label="Administradora" />
          </Tabs>

          {tabValue === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Autocomplete
                  freeSolo
                  options={prefixosSugeridos}
                  value={formData.prefixoNome}
                  onChange={(event, newValue) => {
                    handleInputChange('prefixoNome', newValue || '');
                  }}
                  onInputChange={(event, newInputValue) => {
                    handleInputChange('prefixoNome', newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      label="Prefixo"
                      placeholder="Ex: VILA, COND."
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nome do Cliente *"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box className="flex gap-4">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.pessoaJuridica}
                        onChange={() => handlePessoaChange('juridica')}
                      />
                    }
                    label="Pessoa Jurídica"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.pessoaFisica}
                        onChange={() => handlePessoaChange('fisica')}
                      />
                    }
                    label="Pessoa Física"
                  />
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={formData.pessoaJuridica ? 'CNPJ' : 'CPF'}
                  value={formData.cnpjCpf}
                  onChange={(e) => {
                    const val = formatCnpjCpf(e.target.value);
                    if (val.length <= 18) {
                      handleInputChange('cnpjCpf', val);
                      if (formData.pessoaJuridica) {
                        const clean = val.replace(/\D/g, '');
                        if (clean.length === 14) {
                          handleConsultarDocumento(val);
                        }
                      }
                    }
                  }}
                  InputProps={{
                    endAdornment: formData.pessoaJuridica ? (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleConsultarDocumento()}
                          disabled={loadingReceita || (!formData.cnpjCpf)}
                          title="Buscar dados na Receita"
                          color="primary"
                        >
                          {loadingReceita ? <CircularProgress size={24} /> : <Search />}
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  placeholder={formData.pessoaJuridica ? '00.000.000/0000-00' : '000.000.000-00'}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="CEP"
                  value={formData.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  inputProps={{ maxLength: 9 }}
                >
                  {loadingCep && <CircularProgress size={20} />}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Endereço"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Número"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Complemento"
                  value={formData.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Cidade"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Estado"
                  value={formData.uf}
                  onChange={(e) => handleInputChange('uf', e.target.value)}
                >
                  {UF_OPTIONS.map((uf) => (
                    <MenuItem key={uf} value={uf}>
                      {uf}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Telefone"
                  value={formData.contatoTelefone}
                  onChange={(e) => handleInputChange('contatoTelefone', formatTelefone(e.target.value))}
                  placeholder="(00) 0000-0000"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Observação"
                  multiline
                  rows={3}
                  value={formData.observacao}
                  onChange={(e) => handleInputChange('observacao', e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" className="font-bold mb-2">
                  Banco
                </Typography>
                <Box>
                  <Typography variant="body2" className="mb-2">
                    Enviar Boletos p/ o Banco?
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.enviaBoleto}
                        onChange={(e) => handleInputChange('enviaBoleto', e.target.checked)}
                      />
                    }
                    label="Sim"
                  />
                </Box>
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Box>
              <Box className="flex justify-between items-center mb-4">
                <Box>
                  <Typography variant="h6">Contatos do Cliente</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {contatos.length} {contatos.length === 1 ? 'contato cadastrado' : 'contatos cadastrados'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleOpenContatoDialog}
                >
                  Novo Contato
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                    <TableRow>
                      <TableCell><strong>Nome</strong></TableCell>
                      <TableCell><strong>Apto</strong></TableCell>
                      <TableCell><strong>Função</strong></TableCell>
                      <TableCell><strong>Telefone</strong></TableCell>
                      <TableCell><strong>Atual</strong></TableCell>
                      <TableCell align="right"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contatos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhum contato cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      contatos.map((contato, index) => (
                        <TableRow key={contato.id}>
                          <TableCell>{contato.nome}</TableCell>
                          <TableCell>{contato.apto}</TableCell>
                          <TableCell>{contato.funcao}</TableCell>
                          <TableCell>{contato.telefone}</TableCell>
                          <TableCell>
                            {contato.atual && (
                              <Chip label="Atual" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <ActionEdit title="Editar" onClick={() => handleEditContato(contato, index)} />
                            <ActionDelete title="Excluir" onClick={() => handleDeleteContato(contato.id)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Box className="flex justify-between items-center mb-4">
                <Box>
                  <Typography variant="h6">Equipamentos Instalados</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {equipamentos.length} {equipamentos.length === 1 ? 'equipamento instalado' : 'equipamentos instalados'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleOpenEquipamentoDialog}
                >
                  Novo Equipamento
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                    <TableRow>
                      <TableCell><strong>Equipamento</strong></TableCell>
                      {/* <TableCell><strong>Tipo</strong></TableCell> Removido pois nome já é completo */}
                      <TableCell><strong>Part Number / Cód</strong></TableCell>
                      <TableCell><strong>Quantidade</strong></TableCell>
                      <TableCell><strong>Localização</strong></TableCell>
                      <TableCell><strong>Data Instalação</strong></TableCell>
                      <TableCell align="right"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhum equipamento cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      equipamentos.map((equipamento, index) => (
                        <TableRow key={equipamento.id}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{equipamento.produtoNome}</TableCell>
                          {/* <TableCell>{equipamento.produtoTipo}</TableCell> */}
                          <TableCell>
                            {produtos.find(p => p.id === equipamento.produtoId)?.partNumber || '-'}
                          </TableCell>
                          <TableCell>{equipamento.quantidade}</TableCell>
                          <TableCell>{equipamento.localizacao}</TableCell>
                          <TableCell>
                            {equipamento.dataInstalacao?.toDate().toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell align="right">
                            <ActionEdit title="Editar" onClick={() => handleEditEquipamento(equipamento, index)} />
                            <ActionDelete title="Excluir" onClick={() => handleDeleteEquipamento(equipamento.id)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 3 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" className="mb-4">Administradora do Cliente</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                <Box sx={{ gridColumn: 'span 12' }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Selecione a Administradora"
                    value={formData.administradoraId || ''}
                    onChange={(e) => handleAdministradoraChange(e.target.value)}
                  >
                    <MenuItem value="">Nenhuma</MenuItem>
                    {administradoras.map((adm) => (
                      <MenuItem key={adm.id} value={adm.id}>
                        {adm.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {administradoraSelecionada && (
                  <>
                    <Box sx={{ gridColumn: 'span 12' }}>
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" className="font-bold">Dados da Administradora</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 8' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Logradouro"
                        value={administradoraSelecionada.endereco || ''}
                        onChange={(e) => handleAdministradoraFieldChange('endereco', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Número"
                        value={administradoraSelecionada.numero || ''}
                        onChange={(e) => handleAdministradoraFieldChange('numero', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Complemento"
                        value={administradoraSelecionada.complemento || ''}
                        onChange={(e) => handleAdministradoraFieldChange('complemento', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bairro"
                        value={administradoraSelecionada.bairro || ''}
                        onChange={(e) => handleAdministradoraFieldChange('bairro', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cidade"
                        value={administradoraSelecionada.cidade || ''}
                        onChange={(e) => handleAdministradoraFieldChange('cidade', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Estado"
                        value={administradoraSelecionada.uf || ''}
                        onChange={(e) => handleAdministradoraFieldChange('uf', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Telefone 1"
                        value={administradoraSelecionada.telefone1 || ''}
                        onChange={(e) => handleAdministradoraFieldChange('telefone1', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ramal"
                        value={administradoraSelecionada.ramal1 || ''}
                        onChange={(e) => handleAdministradoraFieldChange('ramal1', e.target.value)}
                      />
                    </Box>

                    <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="CEP"
                        value={administradoraSelecionada.cep || ''}
                        onChange={(e) => handleAdministradoraFieldChange('cep', e.target.value)}
                      />
                    </Box>

                    {administradoraSelecionada.site && (
                      <Box sx={{ gridColumn: 'span 12' }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Site"
                          value={administradoraSelecionada.site}
                        />
                      </Box>
                    )}

                    {administradoraSelecionada.observacao && (
                      <Box sx={{ gridColumn: 'span 12' }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Observação"
                          multiline
                          rows={2}
                          value={administradoraSelecionada.observacao}
                        />
                      </Box>
                    )}

                    <Box sx={{ gridColumn: 'span 12' }}>
                      <Divider sx={{ my: 3, borderWidth: 2, borderColor: '#1976d2' }} />
                      <Typography variant="subtitle1" className="font-bold mb-2" sx={{ color: '#1976d2' }}>
                        Contato da Administradora
                      </Typography>
                    </Box>

                    <Box sx={{ gridColumn: 'span 12' }}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Selecione o Contato"
                        value={contatoAdministradoraSelecionadoId || ''}
                        onChange={(e) => handleContatoAdministradoraChange(e.target.value)}
                      >
                        <MenuItem value="">Nenhum</MenuItem>
                        {contatosAdministradora.filter(c => c.ativo).map((contato) => (
                          <MenuItem key={contato.id} value={contato.id}>
                            {contato.nome} {contato.cargo ? `- ${contato.cargo}` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>

                    {contatoAdministradoraSelecionado && (
                      <>
                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Nome do Contato"
                            value={contatoAdministradoraSelecionado.nome || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('nome', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Cargo"
                            value={contatoAdministradoraSelecionado.cargo || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('cargo', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Telefone"
                            value={contatoAdministradoraSelecionado.telefone || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('telefone', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 2' } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Ramal"
                            value={contatoAdministradoraSelecionado.ramal || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('ramal', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Celular/WhatsApp"
                            value={contatoAdministradoraSelecionado.celular || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('celular', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: 'span 12' }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="E-mail"
                            value={contatoAdministradoraSelecionado.email || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('email', e.target.value)}
                          />
                        </Box>

                        {/* Observação removida ou ajustada se necessário, mantendo editável */}
                        <Box sx={{ gridColumn: 'span 12' }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Observação"
                            multiline
                            rows={2}
                            value={contatoAdministradoraSelecionado.observacao || ''}
                            onChange={(e) => handleContatoAdministradoraFieldChange('observacao', e.target.value)}
                          />
                        </Box>

                        <Box sx={{ gridColumn: 'span 12' }}>
                          <Box className="flex gap-2">
                            <Chip
                              label={contatoAdministradoraSelecionado.ativo ? 'Ativo' : 'Inativo'}
                              color={contatoAdministradoraSelecionado.ativo ? 'success' : 'default'}
                              size="small"
                            />
                            {contatoAdministradoraSelecionado.principal && (
                              <Chip
                                label="Principal"
                                color="primary"
                                size="small"
                              />
                            )}
                          </Box>
                        </Box>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Box>

          )}

          {/* Seção Financeira */}
          <Box sx={{ mt: 3, gridColumn: 'span 12' }}>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">CLASSIFICAÇÃO FINANCEIRA</Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper variant="outlined" sx={{ p: 1, bgcolor: formData.temContrato ? '#f3e5f5' : 'transparent', borderColor: formData.temContrato ? '#9c27b0' : 'rgba(0, 0, 0, 0.12)' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.temContrato}
                        onChange={(e) => handleInputChange('temContrato', e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={<Typography fontWeight={formData.temContrato ? 'bold' : 'normal'} color={formData.temContrato ? 'secondary' : 'inherit'} variant="body2">Possui Contrato Ativo</Typography>}
                  />
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Centro de Custo Padrão"
                  value={formData.centroCustoId}
                  onChange={(e) => handleInputChange('centroCustoId', e.target.value)}
                  helperText="Vincula automaticamente chamados e lançamentos a este centro de custo."
                >
                  <MenuItem value=""><em>Nenhum (Usar Genérico/Manual)</em></MenuItem>
                  {centrosCusto.map((cc) => (
                    <MenuItem key={cc.id} value={cc.id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" fontWeight="bold">{cc.codigo}</Typography>
                        <Typography variant="caption">{cc.nome}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar Cliente' : 'Criar Cliente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cadastro/Edição de Equipamento */}
      <Dialog open={openEquipamentoDialog} onClose={handleCloseEquipamentoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="Equipamento *"
              value={equipamentoFormData.produtoId}
              onChange={(e) => handleEquipamentoInputChange('produtoId', e.target.value)}
            >
              <MenuItem value="">Selecione...</MenuItem>
              {produtos.map((produto) => (
                <MenuItem key={produto.id} value={produto.id}>
                  {produto.nome}
                  {produto.partNumber && ` (PN: ${produto.partNumber})`}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={equipamentoFormData.quantidade}
                onChange={(e) => handleEquipamentoInputChange('quantidade', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
              />

              <TextField
                fullWidth
                size="small"
                label="Localização"
                value={equipamentoFormData.localizacao}
                onChange={(e) => handleEquipamentoInputChange('localizacao', e.target.value)}
                placeholder="Ex: Portaria, Subsolo, Área de Lazer"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEquipamentoDialog}>Cancelar</Button>
          <Button onClick={handleSaveEquipamento} variant="contained">
            {isEditingEquipamento ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Cliente</DialogTitle>
        <DialogContent>
          {selectedCliente && (
            <Box className="space-y-3 mt-2">
              <Box>
                <Typography variant="body1">
                  <strong>Prefixo:</strong> {selectedCliente.prefixoNome}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body1">
                  <strong>Nome:</strong> {selectedCliente.nome}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body1">
                  <strong>Pessoa:</strong> {selectedCliente.pessoaJuridica ? 'Jurídica' : 'Física'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body1">
                  <strong>{selectedCliente.pessoaJuridica ? 'CNPJ:' : 'CPF:'}</strong> {selectedCliente.cnpjCpf || 'Não informado'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body1" className="font-bold text-gray-700 mb-1">Endereço Completo:</Typography>
                <Typography variant="body2">
                  {selectedCliente.endereco && `${selectedCliente.endereco}, ${selectedCliente.numero}`}
                  {selectedCliente.complemento && ` - ${selectedCliente.complemento}`}
                </Typography>
                {selectedCliente.bairro && (
                  <Typography variant="body2">
                    {selectedCliente.bairro} - {selectedCliente.cidade}/{selectedCliente.uf}
                  </Typography>
                )}
                <Typography variant="body2">CEP: {selectedCliente.cep || 'Não informado'}</Typography>
              </Box>

              {selectedCliente.observacao && (
                <Box>
                  <Typography variant="body1">
                    <strong>Observação:</strong>
                  </Typography>
                  <Typography variant="body2" className="whitespace-pre-wrap mt-1">{selectedCliente.observacao}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body1">
                  <strong>Enviar boletos p/ o banco?</strong> {selectedCliente.enviaBoleto ? 'Sim' : 'Não'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body1" component="span">
                  <strong>Status:</strong>{' '}
                </Typography>
                <Chip
                  label={selectedCliente.status}
                  color={selectedCliente.status === 'ativo' ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              {selectedCliente.administradoraNome && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="body1">
                      <strong>Administradora:</strong> {selectedCliente.administradoraNome}
                    </Typography>
                  </Box>

                  {selectedCliente.contatoAdministradoraNome && (
                    <Box>
                      <Typography variant="body1">
                        <strong>Contato da Administradora:</strong> {selectedCliente.contatoAdministradoraNome}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {contatos.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="body1" className="font-bold text-gray-700 mb-2">Contato Atual:</Typography>
                    {(() => {
                      const contatoAtual = contatos.find(c => c.atual);
                      if (contatoAtual) {
                        return (
                          <Box className="space-y-1">
                            <Typography variant="body2"><strong>Nome:</strong> {contatoAtual.nome}</Typography>
                            {contatoAtual.apto && <Typography variant="body2"><strong>Apto:</strong> {contatoAtual.apto}</Typography>}
                            <Typography variant="body2"><strong>Função:</strong> {contatoAtual.funcao}</Typography>
                            {contatoAtual.telefone && <Typography variant="body2"><strong>Telefone:</strong> {contatoAtual.telefone}</Typography>}
                            {contatoAtual.whatsapp && <Typography variant="body2"><strong>WhatsApp:</strong> {contatoAtual.whatsapp}</Typography>}
                            {contatoAtual.email1 && <Typography variant="body2"><strong>E-mail:</strong> {contatoAtual.email1}</Typography>}
                            {contatoAtual.email2 && <Typography variant="body2"><strong>E-mail 2:</strong> {contatoAtual.email2}</Typography>}
                          </Box>
                        );
                      }
                      return <Typography variant="body2" color="textSecondary">Nenhum contato marcado como atual</Typography>;
                    })()}
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cadastro/Edição de Contato */}
      <Dialog open={openContatoDialog} onClose={handleCloseContatoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingContato ? 'Editar Contato' : 'Novo Contato'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 2' } }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Contato *"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Apto"
              value={contatoFormData.apto}
              onChange={(e) => handleContatoInputChange('apto', e.target.value.toUpperCase())}
              placeholder="Ex: 101, 205"
            />

            <Autocomplete
              freeSolo
              options={[
                'ADMINISTRADOR(A)',
                'PROPRIETÁRIO(A)',
                'RESPONSÁVEL',
                'SÍNDICO(A)',
                'SÍNDICO(A) PROF'
              ]}
              value={contatoFormData.funcao}
              onChange={(e, newValue) => handleContatoInputChange('funcao', (newValue || '').toUpperCase())}
              onInputChange={(e, newInputValue) => {
                if (e && e.type === 'change') {
                  handleContatoInputChange('funcao', newInputValue.toUpperCase());
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Função *"
                  placeholder="Selecione ou digite"
                />
              )}
            />

            <TextField
              fullWidth
              size="small"
              label="Telefone"
              value={contatoFormData.telefone}
              onChange={(e) => handleContatoInputChange('telefone', formatTelefone(e.target.value))}
              placeholder="(00) 0000-0000"
            />

            <TextField
              fullWidth
              size="small"
              label="WhatsApp"
              value={contatoFormData.whatsapp}
              onChange={(e) => handleContatoInputChange('whatsapp', formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
            />

            <TextField
              fullWidth
              size="small"
              label="E-mail 1"
              type="email"
              value={contatoFormData.email1}
              onChange={(e) => handleContatoInputChange('email1', e.target.value.toLowerCase())}
              placeholder="email@exemplo.com"
            />

            <TextField
              fullWidth
              size="small"
              label="E-mail 2"
              type="email"
              value={contatoFormData.email2}
              onChange={(e) => handleContatoInputChange('email2', e.target.value.toLowerCase())}
              placeholder="email2@exemplo.com"
            />

            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 2' } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={contatoFormData.atual}
                    onChange={(e) => handleContatoInputChange('atual', e.target.checked)}
                  />
                }
                label="Marcar como contato atual (será exibido na visualização do cliente)"
                sx={{ color: 'error.main' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContatoDialog}>Cancelar</Button>
          <Button onClick={handleSaveContato} variant="contained">
            {isEditingContato ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir o cliente <strong>{selectedCliente?.nome}</strong>?
          </Typography>
        }
      />

      <ConfirmDialog
        open={!!deleteContatoId}
        onClose={() => setDeleteContatoId(null)}
        onConfirm={confirmDeleteContato}
        title="Confirmar Exclusão de Contato"
        message={
          <Typography>
            Tem certeza que deseja excluir este contato?
          </Typography>
        }
      />

      <ConfirmDialog
        open={!!deleteEquipamentoId}
        onClose={() => setDeleteEquipamentoId(null)}
        onConfirm={confirmDeleteEquipamento}
        title="Confirmar Exclusão de Equipamento"
        message={
          <Typography>
            Tem certeza que deseja excluir este equipamento?
          </Typography>
        }
      />

    </ProtectedRoute >
  );
}

