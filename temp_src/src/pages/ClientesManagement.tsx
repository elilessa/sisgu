
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
  FormControlLabel,
  Checkbox,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, Settings } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { apiRequest } from '../config/api';

interface Prefixo {
  id: string;
  nome: string;
  status: 'ativo' | 'inativo';
}

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
}

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
  prefixoId: string;
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
  contatoAtual?: string; // Nome do contato atual
  contatoFuncao?: string;
  contatoTelefone?: string;
  contatoEmail1?: string;
  administradoraId?: string;
  administradoraNome?: string;
  contatoAdministradoraId?: string;
  contatoAdministradoraNome?: string;
}

interface Produto {
  id: string;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  sku: string;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ClientesManagement() {
  const { userData } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prefixos, setPrefixos] = useState<Prefixo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPrefixoDialog, setOpenPrefixoDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para gerenciamento de prefixos
  const [editingPrefixo, setEditingPrefixo] = useState<Prefixo | null>(null);
  const [formNomePrefixo, setFormNomePrefixo] = useState('');
  const [formStatusPrefixo, setFormStatusPrefixo] = useState<'ativo' | 'inativo'>('ativo');
  const [openDeletePrefixoDialog, setOpenDeletePrefixoDialog] = useState(false);
  const [selectedPrefixo, setSelectedPrefixo] = useState<Prefixo | null>(null);

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
    prefixoId: '',
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
  });

  useEffect(() => {
    loadClientes();
    loadPrefixos();
    loadAdministradoras();
    loadProdutos();
  }, [userData]);

  const loadClientes = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    console.log('[ClientesManagement] Carregando clientes para empresa:', userData.empresaId);
    
    try {
      const response = await apiRequest(`/EMPRESAS/${userData.empresaId}/clientes`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ClientesManagement] Clientes carregados:', result);

      if (result.success) {
        setClientes(result.data);
      } else {
        throw new Error(result.message || 'Erro ao carregar clientes');
      }
    } catch (err: any) {
      console.error('[ClientesManagement] Erro ao carregar clientes:', err);
      setError('Erro ao carregar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContatos = async (clienteId: string) => {
    if (!userData?.empresaId) return;

    try {
      const contatosRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes', clienteId, 'contatos');
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

    try {
      const administradorasRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras');
      const snapshot = await getDocs(administradorasRef);

      const administradorasList: Administradora[] = [];
      snapshot.forEach((doc) => {
        administradorasList.push({ id: doc.id, ...doc.data() } as Administradora);
      });

      setAdministradoras(administradorasList);
    } catch (err: any) {
      setError('Erro ao carregar administradoras: ' + err.message);
    }
  };

  const loadContatosAdministradora = async (administradoraId: string) => {
    if (!userData?.empresaId) return;

    try {
      const contatosRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras', administradoraId, 'contatos');
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

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;

    try {
      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');
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

    try {
      const equipamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes', clienteId, 'equipamentos');
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

  const handleContatoAdministradoraChange = (contatoId: string) => {
    setContatoAdministradoraSelecionadoId(contatoId);
    
    if (contatoId) {
      const contato = contatosAdministradora.find(c => c.id === contatoId);
      setContatoAdministradoraSelecionado(contato || null);
    } else {
      setContatoAdministradoraSelecionado(null);
    }
  };

  const loadPrefixos = async () => {
    if (!userData?.empresaId) return;

    try {
      const prefixosRef = collection(db, 'EMPRESAS', userData.empresaId, 'prefixos');
      const snapshot = await getDocs(prefixosRef);

      const prefixosList: Prefixo[] = [];
      snapshot.forEach((doc) => {
        prefixosList.push({ id: doc.id, ...doc.data() } as Prefixo);
      });

      setPrefixos(prefixosList);
    } catch (err: any) {
      setError('Erro ao carregar prefixos: ' + err.message);
    }
  };

  const handleOpenDialog = async (cliente?: Cliente) => {
    if (cliente) {
      setIsEditing(true);
      setSelectedCliente(cliente);
      setFormData({
        prefixoId: cliente.prefixoId,
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
      });
      loadContatos(cliente.id);
      loadEquipamentos(cliente.id);
      
      // Carregar dados da administradora se existir
      if (cliente.administradoraId) {
        setAdministradoraSelecionadaId(cliente.administradoraId);
        const adm = administradoras.find(a => a.id === cliente.administradoraId);
        setAdministradoraSelecionada(adm || null);
        
        // Carregar contatos da administradora
        try {
          const contatosRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras', cliente.administradoraId, 'contatos');
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
        prefixoId: '',
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
    if (!userData?.empresaId) return;

    if (!formData.prefixoId || !formData.nome || !formData.cidade || !formData.uf) {
      setError('Preencha os campos obrigatórios: Prefixo, Nome, Cidade e UF');
      return;
    }

    if (!formData.pessoaJuridica && !formData.pessoaFisica) {
      setError('Selecione se é Pessoa Jurídica ou Física');
      return;
    }

    console.log('[ClientesManagement] Salvando cliente:', { isEditing, formData });

    try {
      const clienteData: any = {
        ...formData,
      };

      // Adicionar dados da administradora se selecionada
      if (administradoraSelecionadaId) {
        clienteData.administradoraId = administradoraSelecionadaId;
        
        if (contatoAdministradoraSelecionadoId) {
          clienteData.contatoAdministradoraId = contatoAdministradoraSelecionadoId;
        }
      }

      let response;
      
      if (isEditing && selectedCliente) {
        console.log('[ClientesManagement] Atualizando cliente:', selectedCliente.id);
        response = await apiRequest(`/EMPRESAS/${userData.empresaId}/clientes/${selectedCliente.id}`, {
          method: 'PUT',
          body: JSON.stringify(clienteData),
        });
      } else {
        console.log('[ClientesManagement] Criando novo cliente');
        response = await apiRequest(`/EMPRESAS/${userData.empresaId}/clientes`, {
          method: 'POST',
          body: JSON.stringify(clienteData),
        });
      }

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ClientesManagement] Resposta da API:', result);

      if (result.success) {
        setSuccess(result.message);
        handleCloseDialog();
        loadClientes();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.message || 'Erro ao salvar cliente');
      }
    } catch (err: any) {
      console.error('[ClientesManagement] Erro ao salvar cliente:', err);
      setError('Erro ao salvar cliente: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedCliente) return;

    console.log('[ClientesManagement] Excluindo cliente:', selectedCliente.id);

    try {
      const response = await apiRequest(`/EMPRESAS/${userData.empresaId}/clientes/${selectedCliente.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ClientesManagement] Cliente excluído:', result);

      if (result.success) {
        setSuccess(result.message);
        handleCloseDeleteDialog();
        loadClientes();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.message || 'Erro ao excluir cliente');
      }
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
      const contatosRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'contatos');

      // Se marcar como atual, desmarcar os outros
      if (contatoFormData.atual) {
        const atualizacoes = contatos.map(async (c) => {
          if (c.atual) {
            const contatoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'contatos', c.id);
            await updateDoc(contatoDoc, { atual: false });
          }
        });
        await Promise.all(atualizacoes);

        // Atualizar campos de contato no documento principal do cliente
        const clienteDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id);
        await updateDoc(clienteDoc, {
          contatoAtual: contatoFormData.nome,
          contatoFuncao: contatoFormData.funcao,
          contatoTelefone: contatoFormData.telefone || '',
          contatoWhatsapp: contatoFormData.whatsapp || '',
          contatoEmail1: contatoFormData.email1 || '',
          contatoEmail2: contatoFormData.email2 || '',
          atualizadoEm: Timestamp.now(),
        });
      }

      if (isEditingContato && editingContatoIndex !== null) {
        const contatoToEdit = contatos[editingContatoIndex];
        const contatoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'contatos', contatoToEdit.id);
        await updateDoc(contatoDoc, contatoFormData);
        
        // Se o contato era atual e foi desmarcado, limpar os campos do cliente
        if (contatoToEdit.atual && !contatoFormData.atual) {
          const clienteDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id);
          await updateDoc(clienteDoc, {
            contatoAtual: '',
            contatoFuncao: '',
            contatoTelefone: '',
            contatoWhatsapp: '',
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

  const handleDeleteContato = async (contatoId: string) => {
    if (!userData?.empresaId || !selectedCliente) return;

    try {
      // Verificar se o contato a ser excluído é o atual
      const contatoExcluido = contatos.find(c => c.id === contatoId);
      
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'contatos', contatoId));
      
      // Se era o contato atual, limpar os campos no documento do cliente
      if (contatoExcluido?.atual) {
        const clienteDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id);
        await updateDoc(clienteDoc, {
          contatoAtual: '',
          contatoFuncao: '',
          contatoTelefone: '',
          contatoWhatsapp: '',
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

    try {
      const produto = produtos.find(p => p.id === equipamentoFormData.produtoId);
      if (!produto) {
        setError('Produto não encontrado');
        return;
      }

      const equipamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'equipamentos');

      const equipamentoData = {
        produtoId: equipamentoFormData.produtoId,
        produtoNome: `${produto.tipoNome} - ${produto.descricaoNome}${produto.especificacaoNome ? ` - ${produto.especificacaoNome}` : ''}`,
        produtoTipo: produto.tipoNome,
        quantidade: equipamentoFormData.quantidade,
        localizacao: equipamentoFormData.localizacao,
      };

      if (isEditingEquipamento && editingEquipamentoIndex !== null) {
        const equipamentoToEdit = equipamentos[editingEquipamentoIndex];
        const equipamentoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'equipamentos', equipamentoToEdit.id);
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

  const handleDeleteEquipamento = async (equipamentoId: string) => {
    if (!userData?.empresaId || !selectedCliente) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'clientes', selectedCliente.id, 'equipamentos', equipamentoId));
      setSuccess('Equipamento excluído com sucesso!');
      loadEquipamentos(selectedCliente.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir equipamento: ' + err.message);
    }
  };

  // Funções de gerenciamento de Prefixos
  const handleOpenPrefixoDialog = () => {
    setOpenPrefixoDialog(true);
  };

  const handleClosePrefixoDialog = () => {
    setOpenPrefixoDialog(false);
    setEditingPrefixo(null);
    setFormNomePrefixo('');
    setFormStatusPrefixo('ativo');
  };

  const handleEditPrefixo = (prefixo: Prefixo) => {
    setEditingPrefixo(prefixo);
    setFormNomePrefixo(prefixo.nome);
    setFormStatusPrefixo(prefixo.status);
  };

  const handleCancelEditPrefixo = () => {
    setEditingPrefixo(null);
    setFormNomePrefixo('');
    setFormStatusPrefixo('ativo');
  };

  const handleSubmitPrefixo = async () => {
    if (!userData?.empresaId) return;
    if (!formNomePrefixo.trim()) {
      setError('Preencha o nome do prefixo');
      return;
    }

    try {
      const prefixosRef = collection(db, 'EMPRESAS', userData.empresaId, 'prefixos');

      const dataToSave = {
        nome: formNomePrefixo.trim(),
        status: formStatusPrefixo,
      };

      if (editingPrefixo) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'prefixos', editingPrefixo.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Prefixo atualizado com sucesso!');
      } else {
        await addDoc(prefixosRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Prefixo cadastrado com sucesso!');
      }

      handleCancelEditPrefixo();
      loadPrefixos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar prefixo: ' + err.message);
    }
  };

  const handleOpenDeletePrefixoDialog = (prefixo: Prefixo) => {
    setSelectedPrefixo(prefixo);
    setOpenDeletePrefixoDialog(true);
  };

  const handleDeletePrefixo = async () => {
    if (!userData?.empresaId || !selectedPrefixo) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'prefixos', selectedPrefixo.id));
      setSuccess('Prefixo excluído com sucesso!');
      setOpenDeletePrefixoDialog(false);
      setSelectedPrefixo(null);
      loadPrefixos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir prefixo: ' + err.message);
    }
  };

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().startsWith(searchTerm.toLowerCase())
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
          <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
              <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
                <TableRow>
                  <TableCell><strong>Prefixo</strong></TableCell>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>CNPJ/CPF</strong></TableCell>
                  <TableCell><strong>Contato Atual</strong></TableCell>
                  <TableCell><strong>Função</strong></TableCell>
                  <TableCell><strong>Tel</strong></TableCell>
                  <TableCell><strong>E-mail1</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhum cliente encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>{cliente.prefixoNome}</TableCell>
                      <TableCell>{cliente.nome}</TableCell>
                      <TableCell>{cliente.cnpjCpf}</TableCell>
                      <TableCell>{cliente.contatoAtual || '-'}</TableCell>
                      <TableCell>{cliente.contatoFuncao || '-'}</TableCell>
                      <TableCell>{cliente.contatoTelefone || '-'}</TableCell>
                      <TableCell>{cliente.contatoEmail1 || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={cliente.status}
                          color={cliente.status === 'ativo' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenViewDialog(cliente)}
                          title="Visualizar"
                          sx={{ color: '#1976d2' }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(cliente)}
                          title="Editar"
                          sx={{ color: '#ff9800' }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(cliente)}
                          title="Excluir"
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
            <Grid item xs={12} sm={6}>
              <Box className="flex gap-2 items-center">
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Prefixo *"
                  value={formData.prefixoId}
                  onChange={(e) => handleInputChange('prefixoId', e.target.value)}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {prefixos.map((prefixo) => (
                    <MenuItem key={prefixo.id} value={prefixo.id}>
                      {prefixo.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  color="primary"
                  onClick={handleOpenPrefixoDialog}
                  title="Gerenciar Prefixos"
                  sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
                >
                  <Settings />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Cliente *"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12}>
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={getCnpjCpfLabel()}
                value={formData.cnpjCpf}
                onChange={(e) => handleInputChange('cnpjCpf', e.target.value)}
                disabled={!formData.pessoaJuridica && !formData.pessoaFisica}
                placeholder={formData.pessoaJuridica ? '00.000.000/0000-00' : '000.000.000-00'}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo')}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Endereço"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Número"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Complemento"
                value={formData.complemento}
                onChange={(e) => handleInputChange('complemento', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Bairro"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Cidade *"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                select
                label="UF *"
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

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="CEP"
                value={formData.cep}
                onChange={(e) => {
                  const valor = e.target.value;
                  handleInputChange('cep', valor);
                  buscarCEP(valor);
                }}
                placeholder="00000-000"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Observação"
                multiline
                rows={2}
                value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" className="font-bold mb-2">
                Banco
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Box>
                <Typography variant="body2" className="mb-2">
                  Enviar Boletos p/ o Banco?
                </Typography>
                <Box className="flex gap-4">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.enviaBoleto === true}
                        onChange={() => handleInputChange('enviaBoleto', true)}
                      />
                    }
                    label="Sim"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.enviaBoleto === false}
                        onChange={() => handleInputChange('enviaBoleto', false)}
                      />
                    }
                    label="Não"
                  />
                </Box>
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
                            <IconButton
                              size="small"
                              onClick={() => handleEditContato(contato, index)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteContato(contato.id)}
                              title="Excluir"
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
                      <TableCell><strong>Tipo</strong></TableCell>
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
                          <TableCell>{equipamento.produtoNome}</TableCell>
                          <TableCell>{equipamento.produtoTipo}</TableCell>
                          <TableCell>{equipamento.quantidade}</TableCell>
                          <TableCell>{equipamento.localizacao}</TableCell>
                          <TableCell>
                            {equipamento.dataInstalacao?.toDate().toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditEquipamento(equipamento, index)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteEquipamento(equipamento.id)}
                              title="Excluir"
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
            </Box>
          )}

          {tabValue === 3 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" className="mb-4">Administradora do Cliente</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Selecione a Administradora"
                    value={administradoraSelecionadaId}
                    onChange={(e) => handleAdministradoraChange(e.target.value)}
                  >
                    <MenuItem value="">Nenhuma</MenuItem>
                    {administradoras.filter(a => a.status === 'ativa').map((adm) => (
                      <MenuItem key={adm.id} value={adm.id}>
                        {adm.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {administradoraSelecionada && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" className="font-bold mb-2">Dados da Administradora</Typography>
                    </Grid>

                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nome"
                        value={administradoraSelecionada.nome}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Status"
                        value={administradoraSelecionada.status}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Endereço"
                        value={administradoraSelecionada.endereco}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Número"
                        value={administradoraSelecionada.numero}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Complemento"
                        value={administradoraSelecionada.complemento || '-'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bairro"
                        value={administradoraSelecionada.bairro}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cidade"
                        value={administradoraSelecionada.cidade}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="UF"
                        value={administradoraSelecionada.uf}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="CEP"
                        value={administradoraSelecionada.cep || '-'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>

                    {administradoraSelecionada.site && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Site"
                          value={administradoraSelecionada.site}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    )}

                    {administradoraSelecionada.observacao && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Observação"
                          multiline
                          rows={2}
                          value={administradoraSelecionada.observacao}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Divider sx={{ my: 3, borderWidth: 2, borderColor: '#1976d2' }} />
                      <Typography variant="subtitle1" className="font-bold mb-2" sx={{ color: '#1976d2' }}>
                        Contato da Administradora
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
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
                    </Grid>

                    {contatoAdministradoraSelecionado && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Nome do Contato"
                            value={contatoAdministradoraSelecionado.nome}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Cargo"
                            value={contatoAdministradoraSelecionado.cargo}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Telefone"
                            value={contatoAdministradoraSelecionado.telefone || '-'}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Ramal"
                            value={contatoAdministradoraSelecionado.ramal || '-'}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Celular/WhatsApp"
                            value={contatoAdministradoraSelecionado.celular || '-'}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="E-mail"
                            value={contatoAdministradoraSelecionado.email || '-'}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {contatoAdministradoraSelecionado.observacao && (
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Observação"
                              multiline
                              rows={2}
                              value={contatoAdministradoraSelecionado.observacao}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}

                        <Grid item xs={12}>
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
                        </Grid>
                      </>
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
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
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
                    {produto.tipoNome} - {produto.descricaoNome}
                    {produto.especificacaoNome && ` - ${produto.especificacaoNome}`}
                    {produto.sku && ` (SKU: ${produto.sku})`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantidade *"
                value={equipamentoFormData.quantidade}
                onChange={(e) => handleEquipamentoInputChange('quantidade', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Localização"
                value={equipamentoFormData.localizacao}
                onChange={(e) => handleEquipamentoInputChange('localizacao', e.target.value)}
                placeholder="Ex: Portaria, Subsolo, Área de Lazer"
              />
            </Grid>
          </Grid>
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
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Contato *"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Apto"
                value={contatoFormData.apto}
                onChange={(e) => handleContatoInputChange('apto', e.target.value.toUpperCase())}
                placeholder="Ex: 101, 205"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Função *"
                value={contatoFormData.funcao}
                onChange={(e) => handleContatoInputChange('funcao', e.target.value.toUpperCase())}
                placeholder="Ex: Síndico, Subsíndico"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Telefone"
                value={contatoFormData.telefone}
                onChange={(e) => handleContatoInputChange('telefone', e.target.value)}
                placeholder="(00) 0000-0000"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="WhatsApp"
                value={contatoFormData.whatsapp}
                onChange={(e) => handleContatoInputChange('whatsapp', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="E-mail 1"
                type="email"
                value={contatoFormData.email1}
                onChange={(e) => handleContatoInputChange('email1', e.target.value.toLowerCase())}
                placeholder="email@exemplo.com"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="E-mail 2"
                type="email"
                value={contatoFormData.email2}
                onChange={(e) => handleContatoInputChange('email2', e.target.value.toLowerCase())}
                placeholder="email2@exemplo.com"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={contatoFormData.atual}
                    onChange={(e) => handleContatoInputChange('atual', e.target.checked)}
                  />
                }
                label="Marcar como contato atual (será exibido na visualização do cliente)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContatoDialog}>Cancelar</Button>
          <Button onClick={handleSaveContato} variant="contained">
            {isEditingContato ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o cliente <strong>{selectedCliente?.nome}</strong>?
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

      {/* Dialog de Gerenciamento de Prefixos */}
      <Dialog open={openPrefixoDialog} onClose={handleClosePrefixoDialog} maxWidth="md" fullWidth>
        <DialogTitle>Gerenciar Prefixos</DialogTitle>
        <DialogContent>
          <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
            <Typography variant="subtitle1" className="font-bold mb-3">
              {editingPrefixo ? 'Editar Prefixo' : 'Adicionar Novo Prefixo'}
            </Typography>
            <Box className="flex gap-2 items-end">
              <TextField
                size="small"
                label="Nome *"
                value={formNomePrefixo}
                onChange={(e) => setFormNomePrefixo(e.target.value)}
                placeholder="Digite o nome do prefixo"
                sx={{ flex: 2 }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={formStatusPrefixo}
                onChange={(e) => setFormStatusPrefixo(e.target.value as 'ativo' | 'inativo')}
                sx={{ flex: 1 }}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </TextField>
              <Button
                variant="contained"
                onClick={handleSubmitPrefixo}
                startIcon={editingPrefixo ? <Edit /> : <Add />}
              >
                {editingPrefixo ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingPrefixo && (
                <Button onClick={handleCancelEditPrefixo}>
                  Cancelar
                </Button>
              )}
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prefixos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Nenhum prefixo cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  prefixos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditPrefixo(item)}
                          title="Editar"
                          sx={{ color: '#ff9800' }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeletePrefixoDialog(item)}
                          title="Excluir"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrefixoDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Prefixo */}
      <Dialog open={openDeletePrefixoDialog} onClose={() => setOpenDeletePrefixoDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o prefixo <strong>{selectedPrefixo?.nome}</strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeletePrefixoDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeletePrefixo} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}
