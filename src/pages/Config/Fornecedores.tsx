import React, { useState, useEffect } from 'react';
import { customColors } from '../../theme';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
  Card,
  CardContent,
  CardActions,
  Divider,
  Tabs,
  Tab,
  List,
} from '@mui/material';
import { ActionView, ActionEdit, ActionDelete, StatusChip } from '../../components/TableActions';
import { Add, Person, Phone, Email } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  writeBatch,
  onSnapshot,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface Fornecedor {
  id: string;
  nome: string;
  tipoFornecedor: string;
  tipoFornecedorId: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacao: string;
  status: 'ativo' | 'inativo';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface TipoFornecedor {
  id: string;
  nome: string;
  modoFormulario: 'simples' | 'completo';
  ativo: boolean;
}

interface Contato {
  id?: string;
  nome: string;
  funcao: string;
  telefone: string;
  whatsapp: string;
  email1: string;
  email2: string;
  ativo: boolean;
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

const formatTelefone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export function Fornecedores() {
  const { userData } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [tiposFornecedor, setTiposFornecedor] = useState<TipoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Estados para Contatos
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatosTemporarios, setContatosTemporarios] = useState<Contato[]>([]);
  const [openContatoDialog, setOpenContatoDialog] = useState(false);
  const [openContatoDeleteDialog, setOpenContatoDeleteDialog] = useState(false);
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [isEditingContato, setIsEditingContato] = useState(false);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [editingContatoIndex, setEditingContatoIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    tipoFornecedor: '',
    tipoFornecedorId: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    observacao: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });

  const [contatoFormData, setContatoFormData] = useState({
    nome: '',
    funcao: '',
    telefone: '',
    whatsapp: '',
    email1: '',
    email2: '',
    ativo: true,
  });

  // Estados para criar novo tipo de fornecedor inline
  const [openNovoTipoDialog, setOpenNovoTipoDialog] = useState(false);
  const [novoTipoForm, setNovoTipoForm] = useState({
    nome: '',
    descricao: '',
    modoFormulario: 'completo' as 'simples' | 'completo'
  });
  /* Estados para gestão de tipos (CRUD inline) */
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [openDeleteTipoDialog, setOpenDeleteTipoDialog] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<TipoFornecedor | null>(null);
  const [savingNovoTipo, setSavingNovoTipo] = useState(false);

  // Estados para pesquisa e filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipoId, setFiltroTipoId] = useState('');

  // Estado para wizard do formulário
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedTipoForCreate, setSelectedTipoForCreate] = useState<TipoFornecedor | null>(null);

  // Lista de tipos que usam formulário simples (apenas nome)
  const TIPOS_SIMPLES = ['CONCESSIONÁRIA', 'CONCESSIONARIA'];

  // Função para verificar se é tipo simples baseado no nome
  const isTipoSimples = (tipoNome: string | undefined): boolean => {
    if (!tipoNome) return false;
    return TIPOS_SIMPLES.includes(tipoNome.toUpperCase().trim());
  };

  // Retorna o label do campo nome baseado no tipo
  const getLabelNome = (tipoNome: string | undefined): string => {
    if (!tipoNome) return 'Nome do Fornecedor *';
    const nome = tipoNome.toUpperCase().trim();
    if (nome.includes('CONCESSION')) return 'Nome da Concessionária *';
    return 'Nome do Fornecedor *';
  };

  useEffect(() => {
    loadFornecedores();
  }, [userData]);

  useEffect(() => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    // Referência ao documento único de configuração
    const configDocRef = doc(db, 'EMPRESAS', empresaId, 'configuracoes', 'fornecedores');

    const unsubscribe = onSnapshot(configDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Carrega do array interno
        setTiposFornecedor(data.tipos || []);
      } else {
        // LÓGICA DE MIGRAÇÃO: Se não existir, tenta buscar da coleção antiga para não perder dados
        try {
          console.log("Iniciando migração de Tipos de Fornecedor...");
          const oldCollectionRef = collection(db, 'EMPRESAS', empresaId, 'tiposFornecedor');
          const oldSnap = await getDocs(oldCollectionRef);

          const migratedTipos: TipoFornecedor[] = [];

          if (!oldSnap.empty) {
            oldSnap.forEach((d) => {
              const tData = d.data();
              if (tData.ativo !== false) {
                migratedTipos.push({
                  id: d.id, // Mantém ID antigo
                  nome: tData.nome,
                  modoFormulario: tData.modoFormulario || 'completo',
                  ativo: true
                });
              }
            });
            console.log(`Migrando ${migratedTipos.length} tipos antigos.`);
          } else {
            console.log("Nenhum tipo antigo encontrado. Iniciando zerado.");
          }

          // Cria o documento de configuração com os dados migrados (ou array vazio)
          await setDoc(configDocRef, { tipos: migratedTipos }, { merge: true });

        } catch (e) {
          console.error("Erro na migração automática de tipos:", e);
        }
      }
    });

    return () => unsubscribe();
  }, [userData?.empresaId]);

  // Limpar mensagens automaticamente
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

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

  const loadFornecedores = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoading(true);
    try {
      const fornecedoresRef = collection(db, 'EMPRESAS', empresaId, 'fornecedores');
      const snapshot = await getDocs(fornecedoresRef);

      const fornecedoresList: Fornecedor[] = [];
      snapshot.forEach((doc) => {
        fornecedoresList.push({ id: doc.id, ...doc.data() } as Fornecedor);
      });

      // Ordena alfabeticamente por nome
      fornecedoresList.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setFornecedores(fornecedoresList);
    } catch (err: any) {
      setError('Erro ao carregar fornecedores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (fornecedor?: Fornecedor) => {
    setTabValue(0);
    if (fornecedor) {
      // Edição: pula wizard, vai direto para o formulário
      setIsEditing(true);
      setSelectedFornecedor(fornecedor);
      const tipoSelecionado = tiposFornecedor.find(t => t.id === fornecedor.tipoFornecedorId);
      setSelectedTipoForCreate(tipoSelecionado || null);
      setWizardStep(1); // Pula para formulário
      setFormData({
        nome: fornecedor.nome,
        tipoFornecedor: fornecedor.tipoFornecedor || '',
        tipoFornecedorId: fornecedor.tipoFornecedorId || '',
        endereco: fornecedor.endereco,
        numero: fornecedor.numero,
        complemento: fornecedor.complemento,
        bairro: fornecedor.bairro,
        cidade: fornecedor.cidade,
        uf: fornecedor.uf,
        cep: fornecedor.cep,
        observacao: fornecedor.observacao,
        status: fornecedor.status,
      });
      await loadContatos(fornecedor.id);
      setContatosTemporarios([]);
    } else {
      // Criação: inicia no wizard para selecionar tipo
      setIsEditing(false);
      setSelectedFornecedor(null);
      setSelectedTipoForCreate(null);
      setWizardStep(0); // Começa na seleção de tipo
      setFormData({
        nome: '',
        tipoFornecedor: '',
        tipoFornecedorId: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        observacao: '',
        status: 'ativo',
      });
      setContatosTemporarios([]);
      setContatos([]);
    }
    setOpenDialog(true);
  };

  const handleSelectTipoAndContinue = (tipo: TipoFornecedor) => {
    setSelectedTipoForCreate(tipo);
    setFormData(prev => ({
      ...prev,
      tipoFornecedorId: tipo.id,
      tipoFornecedor: tipo.nome,
    }));
    setWizardStep(1);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFornecedor(null);
    setIsEditing(false);
    setContatosTemporarios([]);
    setContatos([]);
    setTabValue(0);
    setWizardStep(0);
    setSelectedTipoForCreate(null);
  };

  const handleOpenViewDialog = async (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    await loadContatos(fornecedor.id);
    setOpenViewDialog(true);
  };

  // Funções para Contatos
  const loadContatos = async (fornecedorId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoadingContatos(true);
    try {
      const contatosRef = collection(
        db,
        'EMPRESAS',
        empresaId,
        'fornecedores',
        fornecedorId,
        'contatos'
      );
      const snapshot = await getDocs(contatosRef);

      const contatosList: Contato[] = [];
      snapshot.forEach((doc) => {
        contatosList.push({ id: doc.id, ...doc.data() } as Contato);
      });

      setContatos(contatosList);
    } catch (err: any) {
      setError('Erro ao carregar contatos: ' + err.message);
    } finally {
      setLoadingContatos(false);
    }
  };

  const handleOpenContatoDialog = (contato?: Contato, index?: number) => {
    if (contato && index !== undefined) {
      setIsEditingContato(true);
      setEditingContatoIndex(index);
      setContatoFormData({
        nome: contato.nome,
        funcao: contato.funcao,
        telefone: contato.telefone,
        whatsapp: contato.whatsapp,
        email1: contato.email1,
        email2: contato.email2,
        ativo: contato.ativo,
      });
    } else {
      setIsEditingContato(false);
      setEditingContatoIndex(null);
      setContatoFormData({
        nome: '',
        funcao: '',
        telefone: '',
        whatsapp: '',
        email1: '',
        email2: '',
        ativo: true,
      });
    }
    setOpenContatoDialog(true);
  };

  const handleCloseContatoDialog = () => {
    setOpenContatoDialog(false);
    setEditingContatoIndex(null);
    setIsEditingContato(false);
  };

  const handleOpenContatoDeleteDialog = (contato: Contato) => {
    setSelectedContato(contato);
    setOpenContatoDeleteDialog(true);
  };

  const handleCloseContatoDeleteDialog = () => {
    setOpenContatoDeleteDialog(false);
    setSelectedContato(null);
  };

  const handleContatoInputChange = (field: string, value: any) => {
    setContatoFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddContatoTemporario = () => {
    if (!contatoFormData.nome || !contatoFormData.funcao) {
      setError('Preencha os campos obrigatórios: Nome e Função');
      return;
    }

    let updatedContatos = [...contatosTemporarios];

    if (editingContatoIndex !== null) {
      updatedContatos[editingContatoIndex] = { ...contatoFormData };
    } else {
      updatedContatos.push({ ...contatoFormData });
    }

    setContatosTemporarios(updatedContatos);
    handleCloseContatoDialog();
    setSuccess('Contato adicionado!');
  };

  const handleRemoveContatoTemporario = (index: number) => {
    const updated = contatosTemporarios.filter((_, i) => i !== index);
    setContatosTemporarios(updated);
  };

  const handleSaveContato = async () => {
    if (!userData?.empresaId || !selectedFornecedor) return;

    if (!contatoFormData.nome || !contatoFormData.funcao) {
      setError('Preencha os campos obrigatórios: Nome e Função');
      return;
    }

    try {
      const empresaId = userData.empresaId as string;

      const contatosRef = collection(
        db,
        'EMPRESAS',
        empresaId,
        'fornecedores',
        selectedFornecedor.id,
        'contatos'
      );

      if (isEditingContato && selectedContato) {
        const docRef = doc(
          db,
          'EMPRESAS',
          empresaId,
          'fornecedores',
          selectedFornecedor.id,
          'contatos',
          selectedContato.id as string
        );
        await updateDoc(docRef, {
          ...contatoFormData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Contato atualizado com sucesso!');
      } else {
        await addDoc(contatosRef, {
          ...contatoFormData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Contato criado com sucesso!');
      }

      handleCloseContatoDialog();
      await loadContatos(selectedFornecedor.id);
    } catch (err: any) {
      setError('Erro ao salvar contato: ' + err.message);
    }
  };

  const handleDeleteContato = async () => {
    if (!userData?.empresaId || !selectedFornecedor || !selectedContato) return;
    const empresaId = userData.empresaId as string;

    try {
      await deleteDoc(
        doc(
          db,
          'EMPRESAS',
          empresaId,
          'fornecedores',
          selectedFornecedor.id,
          'contatos',
          selectedContato.id as string
        )
      );
      setSuccess('Contato excluído com sucesso!');
      handleCloseContatoDeleteDialog();
      await loadContatos(selectedFornecedor.id);
    } catch (err: any) {
      setError('Erro ao excluir contato: ' + err.message);
    }
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedFornecedor(null);
  };

  const handleOpenDeleteDialog = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedFornecedor(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditTipo = (tipo: TipoFornecedor, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede seleção do card
    setNovoTipoForm({
      nome: tipo.nome,
      descricao: '',
      modoFormulario: tipo.modoFormulario || 'completo'
    });
    setEditingTipoId(tipo.id);
    setOpenNovoTipoDialog(true);
  };

  const handleOpenDeleteTipoDialog = (tipo: TipoFornecedor, e: React.MouseEvent) => {
    e.stopPropagation();
    setTipoToDelete(tipo);
    setOpenDeleteTipoDialog(true);
  };

  const confirmDeleteTipo = async () => {
    if (!userData?.empresaId || !tipoToDelete) return;
    const empresaId = userData.empresaId;

    try {
      const configDocRef = doc(db, 'EMPRESAS', empresaId, 'configuracoes', 'fornecedores');
      const docSnap = await getDoc(configDocRef);

      if (docSnap.exists()) {
        const currentTipos = (docSnap.data().tipos || []) as TipoFornecedor[];
        const updatedTipos = currentTipos.filter(t => t.id !== tipoToDelete.id);
        await updateDoc(configDocRef, { tipos: updatedTipos });
        setSuccess('Tipo de fornecedor excluído com sucesso!');
      }
    } catch (err: any) {
      setError('Erro ao excluir tipo: ' + err.message);
    } finally {
      setOpenDeleteTipoDialog(false);
      setTipoToDelete(null);
    }
  };

  const handleSaveNovoTipo = async () => {
    if (!userData?.empresaId || !novoTipoForm.nome.trim()) {
      setError('Digite o nome do tipo de fornecedor');
      return;
    }
    const empresaId = userData.empresaId;

    setSavingNovoTipo(true);
    try {
      const configDocRef = doc(db, 'EMPRESAS', empresaId, 'configuracoes', 'fornecedores');
      const docSnap = await getDoc(configDocRef);

      if (!docSnap.exists()) {
        await setDoc(configDocRef, { tipos: [] });
      }

      const currentTipos = docSnap.exists() ? (docSnap.data().tipos || []) as TipoFornecedor[] : [];

      if (editingTipoId) {
        // --- MODO EDIÇÃO ---
        const updatedTipos = currentTipos.map(t => {
          if (t.id === editingTipoId) {
            return {
              ...t,
              nome: novoTipoForm.nome.toUpperCase().trim(),
              modoFormulario: novoTipoForm.modoFormulario
            };
          }
          return t;
        });

        await updateDoc(configDocRef, { tipos: updatedTipos });
        setSuccess('Tipo de fornecedor atualizado com sucesso!');
        setOpenNovoTipoDialog(false);
        // Não avança o wizard na edição

      } else {
        // --- MODO CRIAÇÃO ---
        const novoTipo: TipoFornecedor = {
          id: Date.now().toString(),
          nome: novoTipoForm.nome.toUpperCase().trim(),
          modoFormulario: novoTipoForm.modoFormulario,
          ativo: true,
        };

        const novoArray = [...currentTipos, novoTipo];
        await updateDoc(configDocRef, { tipos: novoArray });

        setSuccess('Tipo de fornecedor criado com sucesso!');
        setOpenNovoTipoDialog(false);

        // Na criação, avança para o formulário
        handleInputChange('tipoFornecedorId', novoTipo.id);
        handleInputChange('tipoFornecedor', novoTipo.nome);
        setWizardStep(1);
        setSelectedTipoForCreate(novoTipo);
      }

      setNovoTipoForm({ nome: '', descricao: '', modoFormulario: 'completo' });
      setEditingTipoId(null);
    } catch (err: any) {
      setError(`Erro ao salvar tipo: ${err.message}`);
    } finally {
      setSavingNovoTipo(false);
    }
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;

    // Validação: apenas nome é obrigatório
    if (!formData.nome) {
      setError('Preencha o campo obrigatório: Nome');
      return;
    }

    try {
      const empresaId = userData.empresaId;
      const fornecedoresRef = collection(db, 'EMPRESAS', empresaId, 'fornecedores');

      if (isEditing && selectedFornecedor) {
        const docRef = doc(db, 'EMPRESAS', empresaId, 'fornecedores', selectedFornecedor.id);
        await updateDoc(docRef, {
          ...formData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Fornecedor atualizado com sucesso!');
      } else {
        // Criar novo fornecedor
        const novoFornRef = await addDoc(fornecedoresRef, {
          ...formData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });

        // Salvar contatos temporários
        if (contatosTemporarios.length > 0) {
          const contatosRef = collection(
            db,
            'EMPRESAS',
            empresaId,
            'fornecedores',
            novoFornRef.id,
            'contatos'
          );

          const batch = writeBatch(db);
          contatosTemporarios.forEach((contato) => {
            const newContatoRef = doc(contatosRef);
            batch.set(newContatoRef, {
              ...contato,
              criadoEm: Timestamp.now(),
              atualizadoEm: Timestamp.now(),
            });
          });
          await batch.commit();
        }

        setSuccess('Fornecedor criado com sucesso!');
      }

      handleCloseDialog();
      loadFornecedores();
    } catch (err: any) {
      setError('Erro ao salvar fornecedor: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedFornecedor) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'fornecedores', selectedFornecedor.id));
      setSuccess('Fornecedor excluído com sucesso!');
      handleCloseDeleteDialog();
      loadFornecedores();
    } catch (err: any) {
      setError('Erro ao excluir fornecedor: ' + err.message);
    }
  };

  return (
    <ProtectedRoute requiredRoute="/configuracoes/fornecedores">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Fornecedores
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Fornecedor
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

      {/* Filtros de pesquisa */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Pesquisar fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250 }}
        />
        <TextField
          size="small"
          select
          label="Filtrar por Tipo"
          value={filtroTipoId}
          onChange={(e) => setFiltroTipoId(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          {tiposFornecedor.map((tipo) => (
            <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-8">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
            <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
              <TableRow>
                <TableCell><strong>Nome</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell><strong>Cidade</strong></TableCell>
                <TableCell><strong>UF</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Acões</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fornecedores
                .filter((f) => {
                  const matchSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    f.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    f.tipoFornecedor?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchTipo = !filtroTipoId || f.tipoFornecedorId === filtroTipoId;
                  return matchSearch && matchTipo;
                })
                .map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell sx={{ py: 0.25 }}>{fornecedor.nome}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{fornecedor.tipoFornecedor || '-'}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{fornecedor.cidade}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{fornecedor.uf}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>
                      <StatusChip status={fornecedor.status} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.25 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <ActionView onClick={() => handleOpenViewDialog(fornecedor)} title="Visualizar" />
                        <ActionEdit onClick={() => handleOpenDialog(fornecedor)} title="Editar" />
                        <ActionDelete onClick={() => handleOpenDeleteDialog(fornecedor)} title="Excluir" />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Cadastro/Edição com Abas */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Fornecedor' : (wizardStep === 0 ? 'Selecione o Tipo de Fornecedor' : `Novo Fornecedor - ${selectedTipoForCreate?.nome || ''}`)}
        </DialogTitle>
        <DialogContent>
          {/* Wizard Step 0: Seleção de Tipo */}
          {!isEditing && wizardStep === 0 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Escolha o tipo de fornecedor para ver os campos necessários:
              </Typography>
              {tiposFornecedor.length === 0 ? (
                <Alert severity="info">
                  Nenhum tipo de fornecedor cadastrado. Crie um novo tipo utilizando a opção abaixo.
                </Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                  {/* Cartão para criar NOVO tipo */}
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: '2px dashed #ccc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '100px',
                      '&:hover': { borderColor: '#1976d2', bgcolor: '#f0f7ff' },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setOpenNovoTipoDialog(true)}
                  >
                    <Add sx={{ fontSize: 40, color: '#aaa', mb: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                      CRIAR NOVO TIPO
                    </Typography>
                  </Paper>

                  {/* Tipos Existentes */}
                  {tiposFornecedor.map((tipo) => (
                    <Paper
                      key={tipo.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        position: 'relative',
                        '&:hover': {
                          borderColor: '#00c0a3',
                          bgcolor: '#f5f5f5',
                          '& .action-buttons': { opacity: 1 } // Mostra botões no hover
                        },
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleSelectTipoAndContinue(tipo)}
                    >
                      {/* Botões de Ação (Editar/Excluir) */}
                      <Box
                        className="action-buttons"
                        sx={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          bgcolor: 'rgba(255,255,255,0.8)',
                          borderRadius: 1
                        }}
                      >
                        <ActionEdit
                          onClick={(e) => handleEditTipo(tipo, e)}
                          title="Editar Tipo"
                        />
                        <ActionDelete
                          onClick={(e) => handleOpenDeleteTipoDialog(tipo, e)}
                          title="Excluir Tipo"
                        />
                      </Box>

                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {tipo.nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tipo.modoFormulario === 'simples' || isTipoSimples(tipo.nome)
                            ? `Formulário Simples (Só Nome)`
                            : 'Formulário Completo'}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Wizard Step 1: Formulário de Dados */}
          {(isEditing || wizardStep === 1) && (
            <>
              {(selectedTipoForCreate?.modoFormulario === 'simples' || isTipoSimples(formData.tipoFornecedor || selectedTipoForCreate?.nome)) ? (
                /* Formulário Simples - Apenas Nome */
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={getLabelNome(formData.tipoFornecedor || selectedTipoForCreate?.nome)}
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                  />
                </Box>
              ) : (
                /* Formulário Completo - Todos os campos */
                <>
                  <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tab label="Dados do Fornecedor" />
                    <Tab label={`Contatos (${isEditing ? contatos.length : contatosTemporarios.length})`} />
                  </Tabs>

                  {/* Aba 1: Dados do Fornecedor */}
                  {tabValue === 0 && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 12, sm: 8 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label={getLabelNome(formData.tipoFornecedor)}
                          value={formData.nome}
                          onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      {!isTipoSimples(formData.tipoFornecedor) && (
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="CNPJ / CPF"
                            value={formData.numero} // Usando campo numero provisoriamente para CNPJ se não houver campo especifico
                            onChange={(e) => handleInputChange('numero', e.target.value)}
                          />
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, sm: 8 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Endereço"
                          value={formData.endereco}
                          onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Número"
                          value={formData.numero}
                          onChange={(e) => handleInputChange('numero', e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Complemento"
                          value={formData.complemento}
                          onChange={(e) => handleInputChange('complemento', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 5 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Bairro"
                          value={formData.bairro}
                          onChange={(e) => handleInputChange('bairro', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 5 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Cidade"
                          value={formData.cidade}
                          onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="UF"
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

                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="CEP"
                          value={formData.cep}
                          onChange={(e) => {
                            const val = formatCEP(e.target.value);
                            handleInputChange('cep', val);
                            if (val.length === 9) buscarCEP(val);
                          }}
                          inputProps={{ maxLength: 9 }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Status"
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value as any)}
                        >
                          <MenuItem value="ativo">Ativo</MenuItem>
                          <MenuItem value="inativo">Inativo</MenuItem>
                        </TextField>
                      </Grid>

                      <Grid size={{ xs: 12 }}>
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
                    </Grid>
                  )}
                  {/* Aba 2: Contatos */}
                  {tabValue === 1 && (
                    <Box sx={{ mt: 2 }}>
                      <Box className="flex items-center justify-between mb-3">
                        <Typography variant="subtitle1" className="font-bold">
                          Lista de Contatos
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => handleOpenContatoDialog()}
                        >
                          Adicionar Contato
                        </Button>
                      </Box>

                      {isEditing ? (
                        loadingContatos ? (
                          <Box className="flex justify-center p-4">
                            <CircularProgress size={30} />
                          </Box>
                        ) : contatos.length === 0 ? (
                          <Alert severity="info">Nenhum contato cadastrado</Alert>
                        ) : (
                          <Box className="space-y-2">
                            {contatos.map((contato) => (
                              <Card key={contato.id} variant="outlined">
                                <CardContent className="pb-2">
                                  <Box className="flex items-start justify-between">
                                    <Box className="flex-grow">
                                      <Typography variant="subtitle1" className="font-bold">
                                        {contato.nome}
                                      </Typography>
                                      <Typography variant="body2" color="textSecondary" className="mb-2">
                                        <strong>Função:</strong> {contato.funcao}
                                      </Typography>

                                      <Box className="mt-2 space-y-1">
                                        {contato.telefone && (
                                          <Typography variant="body2">
                                            <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                            <strong>Tel:</strong> {contato.telefone}
                                          </Typography>
                                        )}
                                        {contato.whatsapp && (
                                          <Typography variant="body2">
                                            <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                            <strong>WhatsApp:</strong> {contato.whatsapp}
                                          </Typography>
                                        )}
                                        {contato.email1 && (
                                          <Typography variant="body2">
                                            <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                            <strong>E-mail 1:</strong> {contato.email1}
                                          </Typography>
                                        )}
                                        {contato.email2 && (
                                          <Typography variant="body2">
                                            <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                            <strong>E-mail 2:</strong> {contato.email2}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                    <Box className="flex items-center">
                                      <StatusChip status={contato.ativo ? 'ativo' : 'inativo'} />
                                    </Box>
                                  </Box>
                                </CardContent>
                                <CardActions className="pt-0">
                                  <ActionEdit
                                    onClick={() => {
                                      setSelectedContato(contato);
                                      setIsEditingContato(true);
                                      setContatoFormData({
                                        nome: contato.nome,
                                        funcao: contato.funcao,
                                        telefone: contato.telefone,
                                        whatsapp: contato.whatsapp,
                                        email1: contato.email1,
                                        email2: contato.email2,
                                        ativo: contato.ativo,
                                      });
                                      setOpenContatoDialog(true);
                                    }}
                                    title="Editar"
                                  />
                                  <ActionDelete
                                    onClick={() => handleOpenContatoDeleteDialog(contato)}
                                    title="Excluir"
                                  />
                                </CardActions>
                              </Card>
                            ))}
                          </Box>
                        )
                      ) : (
                        contatosTemporarios.length === 0 ? (
                          <Alert severity="info">Nenhum contato adicionado. Clique em "Adicionar Contato" para comear.</Alert>
                        ) : (
                          <List>
                            {contatosTemporarios.map((contato, index) => (
                              <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent className="pb-2">
                                  <Box className="flex items-start justify-between">
                                    <Box className="flex-grow">
                                      <Typography variant="subtitle2" className="font-bold">
                                        {contato.nome}
                                      </Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        {contato.funcao}
                                      </Typography>
                                      <Typography variant="body2" className="mt-1">
                                        {contato.telefone && `Tel: ${contato.telefone}`}
                                        {contato.whatsapp && ` | WhatsApp: ${contato.whatsapp}`}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <ActionEdit
                                        onClick={() => handleOpenContatoDialog(contato, index)}
                                        title="Editar"
                                      />
                                      <ActionDelete
                                        onClick={() => handleRemoveContatoTemporario(index)}
                                        title="Remover"
                                      />
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </List>
                        )
                      )}
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!isEditing && wizardStep === 0 ? (
            <Button onClick={handleCloseDialog}>Cancelar</Button>
          ) : (
            <>
              <Button onClick={() => !isEditing && wizardStep === 1 ? setWizardStep(0) : handleCloseDialog()}>
                {!isEditing && wizardStep === 1 ? 'Voltar' : 'Cancelar'}
              </Button>
              <Button onClick={handleSave} variant="contained">
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </>
          )}
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
            Tem certeza que deseja excluir o fornecedor <strong>{selectedFornecedor?.nome}</strong>?
          </Typography>
        }
      />

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Fornecedor</DialogTitle>
        <DialogContent>
          {selectedFornecedor && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nome:</Typography>
                <Typography>{selectedFornecedor.nome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Endereço Completo:</Typography>
                <Typography>
                  {selectedFornecedor.endereco}, {selectedFornecedor.numero}
                  {selectedFornecedor.complemento && ` - ${selectedFornecedor.complemento}`}
                </Typography>
                <Typography>
                  {selectedFornecedor.bairro} - {selectedFornecedor.cidade}/{selectedFornecedor.uf}
                </Typography>
                <Typography>CEP: {selectedFornecedor.cep || 'Não informado'}</Typography>
              </Box>

              {selectedFornecedor.observacao && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedFornecedor.observacao}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <StatusChip status={selectedFornecedor.status} />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Seção de Contatos */}
              <Box>
                <Typography variant="h6" className="font-bold mb-3">
                  <Person className="mr-2" style={{ verticalAlign: 'middle' }} />
                  Contatos
                </Typography>

                {loadingContatos ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress size={30} />
                  </Box>
                ) : contatos.length === 0 ? (
                  <Alert severity="info">Nenhum contato cadastrado</Alert>
                ) : (
                  <Box className="space-y-2">
                    {contatos.map((contato) => (
                      <Card key={contato.id} variant="outlined">
                        <CardContent className="pb-2">
                          <Box className="flex items-start justify-between">
                            <Box className="flex-grow">
                              <Typography variant="subtitle1" className="font-bold">
                                {contato.nome}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" className="mb-2">
                                <strong>Função:</strong> {contato.funcao}
                              </Typography>

                              <Box className="mt-2 space-y-1">
                                {contato.telefone && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Tel:</strong> {contato.telefone}
                                  </Typography>
                                )}
                                {contato.whatsapp && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>WhatsApp:</strong> {contato.whatsapp}
                                  </Typography>
                                )}
                                {contato.email1 && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail 1:</strong> {contato.email1}
                                  </Typography>
                                )}
                                {contato.email2 && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail 2:</strong> {contato.email2}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box className="flex items-center">
                              <Chip
                                label={contato.ativo ? 'Ativo' : 'Inativo'}
                                color={contato.ativo ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
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
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Contato *"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Função *"
                value={contatoFormData.funcao}
                onChange={(e) => handleContatoInputChange('funcao', e.target.value.toUpperCase())}
                placeholder="Ex: Vendedor, Gerente Comercial"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Telefone"
                value={contatoFormData.telefone}
                onChange={(e) => handleContatoInputChange('telefone', formatTelefone(e.target.value))}
                placeholder="(00) 0000-0000"
                inputProps={{ maxLength: 15 }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="WhatsApp"
                value={contatoFormData.whatsapp}
                onChange={(e) => handleContatoInputChange('whatsapp', formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="E-mail 1"
                type="email"
                value={contatoFormData.email1}
                onChange={(e) => handleContatoInputChange('email1', e.target.value.toLowerCase())}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="E-mail 2"
                type="email"
                value={contatoFormData.email2}
                onChange={(e) => handleContatoInputChange('email2', e.target.value.toLowerCase())}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContatoDialog}>Cancelar</Button>
          <Button onClick={isEditing ? handleSaveContato : handleAddContatoTemporario} variant="contained">
            {isEditingContato ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Contato */}
      <ConfirmDialog
        open={openContatoDeleteDialog}
        onClose={handleCloseContatoDeleteDialog}
        onConfirm={handleDeleteContato}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir o contato <strong>{selectedContato?.nome}</strong>?
          </Typography>
        }
      />

      {/* Dialog de Novo/Editar Tipo de Fornecedor */}
      <Dialog
        open={openNovoTipoDialog}
        onClose={() => {
          setOpenNovoTipoDialog(false);
          setEditingTipoId(null);
          setNovoTipoForm({ nome: '', descricao: '', modoFormulario: 'completo' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTipoId ? 'Editar Tipo de Fornecedor' : 'Novo Tipo de Fornecedor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Nome do Tipo *"
              value={novoTipoForm.nome}
              onChange={(e) => setNovoTipoForm({ ...novoTipoForm, nome: e.target.value.toUpperCase() })}
              placeholder="Ex: CONCESSIONÁRIAS, DISTRIBUIDORAS..."
            />
            <TextField
              fullWidth
              size="small"
              label="Descrição (Opcional)"
              value={novoTipoForm.descricao}
              onChange={(e) => setNovoTipoForm({ ...novoTipoForm, descricao: e.target.value.toUpperCase() })}
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              size="small"
              select
              label="Modo do Formulário"
              value={novoTipoForm.modoFormulario}
              onChange={(e) => setNovoTipoForm({ ...novoTipoForm, modoFormulario: e.target.value as any })}
              helperText="Defina quais campos serão exibidos no cadastro"
            >
              <MenuItem value="completo">Completo (Endereço, Contatos, Obs)</MenuItem>
              <MenuItem value="simples">Simples (Apenas Nome - Ex: Concessionárias)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNovoTipoDialog(false)} disabled={savingNovoTipo}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveNovoTipo}
            variant="contained"
            disabled={savingNovoTipo || !novoTipoForm.nome.trim()}
            sx={{ bgcolor: '#00c0a3', '&:hover': { bgcolor: '#00a88f' } }}
          >
            {savingNovoTipo ? <CircularProgress size={20} /> : (editingTipoId ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de TIPO */}
      <ConfirmDialog
        open={openDeleteTipoDialog}
        onClose={() => setOpenDeleteTipoDialog(false)}
        onConfirm={confirmDeleteTipo}
        title="Excluir Tipo?"
        message={
          <Typography component="span">
            Deseja excluir o tipo <strong>{tipoToDelete?.nome}</strong>?
            <br />
            <Typography variant="body2" component="span" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
              Atenção: Fornecedores que usam este tipo não serão apagados, mas ficarão sem classificação visual.
            </Typography>
          </Typography>
        }
      />
    </ProtectedRoute>
  );
}
