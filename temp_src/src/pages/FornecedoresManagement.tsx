
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
  Card,
  CardContent,
  CardActions,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  Autocomplete,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, Person, Phone, Email } from '@mui/icons-material';
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
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

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

export function FornecedoresManagement() {
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
  const [novoTipoForm, setNovoTipoForm] = useState({ nome: '', descricao: '' });
  const [savingNovoTipo, setSavingNovoTipo] = useState(false);

  // Estados para pesquisa e filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipoId, setFiltroTipoId] = useState('');

  // Estado para wizard do formulário
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedTipoForCreate, setSelectedTipoForCreate] = useState<TipoFornecedor | null>(null);

  // Lista de tipos que usam formulário simples (apenas nome)
  const TIPOS_SIMPLES = ['CONCESSIONÁRIA', 'CONCESSIONARIA', 'IMPOSTO', 'IMPOSTOS'];
  
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
    if (nome.includes('IMPOSTO')) return 'Nome do Imposto *';
    return 'Nome do Fornecedor *';
  };

  useEffect(() => {
    loadFornecedores();
  }, [userData]);

  useEffect(() => {
    if (!userData?.empresaId) return;

    const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tiposFornecedor');
    const q = query(tiposRef, orderBy('nome', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TipoFornecedor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.ativo) {
          list.push({ 
            id: docSnap.id, 
            nome: data.nome, 
            modoFormulario: data.modoFormulario || 'completo',
            ativo: data.ativo 
          });
        }
      });
      setTiposFornecedor(list);
    });

    return () => unsubscribe();
  }, [userData?.empresaId]);

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

    setLoading(true);
    try {
      const fornecedoresRef = collection(db, 'EMPRESAS', userData.empresaId, 'fornecedores');
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

    setLoadingContatos(true);
    try {
      const contatosRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
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
    setTimeout(() => setSuccess(''), 2000);
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
      const contatosRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'fornecedores',
        selectedFornecedor.id,
        'contatos'
      );

      if (isEditingContato && selectedContato) {
        const docRef = doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'fornecedores',
          selectedFornecedor.id,
          'contatos',
          selectedContato.id
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
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar contato: ' + err.message);
    }
  };

  const handleDeleteContato = async () => {
    if (!userData?.empresaId || !selectedFornecedor || !selectedContato) return;

    try {
      await deleteDoc(
        doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'fornecedores',
          selectedFornecedor.id,
          'contatos',
          selectedContato.id
        )
      );
      setSuccess('Contato excluído com sucesso!');
      handleCloseContatoDeleteDialog();
      await loadContatos(selectedFornecedor.id);
      setTimeout(() => setSuccess(''), 3000);
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

  const handleSaveNovoTipo = async () => {
    if (!userData?.empresaId || !novoTipoForm.nome.trim()) {
      setError('Digite o nome do tipo de fornecedor');
      return;
    }

    setSavingNovoTipo(true);
    try {
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tiposFornecedor');
      const docRef = await addDoc(tiposRef, {
        nome: novoTipoForm.nome.toUpperCase().trim(),
        descricao: novoTipoForm.descricao.toUpperCase().trim(),
        ativo: true,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      });
      
      // Selecionar automaticamente o novo tipo criado
      handleInputChange('tipoFornecedorId', docRef.id);
      handleInputChange('tipoFornecedor', novoTipoForm.nome.toUpperCase().trim());
      
      setSuccess('Tipo de fornecedor criado com sucesso!');
      setOpenNovoTipoDialog(false);
      setNovoTipoForm({ nome: '', descricao: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erro ao criar tipo: ${err.message}`);
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
      const fornecedoresRef = collection(db, 'EMPRESAS', userData.empresaId, 'fornecedores');

      if (isEditing && selectedFornecedor) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'fornecedores', selectedFornecedor.id);
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
            userData.empresaId,
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
      setTimeout(() => setSuccess(''), 3000);
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
      setTimeout(() => setSuccess(''), 3000);
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
            <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
              <TableRow>
                <TableCell><strong>Nome</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell><strong>Cidade</strong></TableCell>
                <TableCell><strong>UF</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Ações</strong></TableCell>
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
                  <TableCell>{fornecedor.nome}</TableCell>
                  <TableCell>{fornecedor.tipoFornecedor || '-'}</TableCell>
                  <TableCell>{fornecedor.cidade}</TableCell>
                  <TableCell>{fornecedor.uf}</TableCell>
                  <TableCell>
                    <Chip
                      label={fornecedor.status}
                      color={fornecedor.status === 'ativo' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenViewDialog(fornecedor)}
                      title="Visualizar"
                      sx={{ color: '#1976d2' }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(fornecedor)}
                      title="Editar"
                      sx={{ color: '#ff9800' }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(fornecedor)}
                      title="Excluir"
                      sx={{ color: '#f44336' }}
                    >
                      <Delete />
                    </IconButton>
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
                  Nenhum tipo de fornecedor cadastrado. Cadastre um tipo em Configurações → Tipos de Fornecedor.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tiposFornecedor.map((tipo) => (
                    <Paper
                      key={tipo.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        '&:hover': { borderColor: '#00c0a3', bgcolor: '#f5f5f5' },
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleSelectTipoAndContinue(tipo)}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {tipo.nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isTipoSimples(tipo.nome) 
                            ? `Campos: ${getLabelNome(tipo.nome).replace(' *', '')}` 
                            : 'Campos: Nome, Endereço, Contatos, etc.'}
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
              {isTipoSimples(formData.tipoFornecedor || selectedTipoForCreate?.nome) ? (
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
                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Nome do Fornecedor *"
                          value={formData.nome}
                          onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Tipo de Fornecedor"
                          value={formData.tipoFornecedor}
                          disabled
                        />
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
                  label="CEP"
                  value={formData.cep}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    handleInputChange('cep', formatted);
                    buscarCEP(formatted);
                  }}
                  placeholder="00000-000"
                  inputProps={{ maxLength: 9 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Cidade *"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
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

              <Grid item xs={12} sm={3}>
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
                              <Chip
                                label={contato.ativo ? 'Ativo' : 'Inativo'}
                                color={contato.ativo ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                          </Box>
                        </CardContent>
                        <CardActions className="pt-0">
                          <IconButton
                            size="small"
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
                            sx={{ color: '#ff9800' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenContatoDeleteDialog(contato)}
                            title="Excluir"
                            sx={{ color: '#f44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    ))}
                  </Box>
                )
              ) : (
                contatosTemporarios.length === 0 ? (
                  <Alert severity="info">Nenhum contato adicionado. Clique em "Adicionar Contato" para começar.</Alert>
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
                              <IconButton
                                size="small"
                                onClick={() => handleOpenContatoDialog(contato, index)}
                                title="Editar"
                                sx={{ color: '#ff9800' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveContatoTemporario(index)}
                                title="Remover"
                                sx={{ color: '#f44336' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
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
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o fornecedor <strong>{selectedFornecedor?.nome}</strong>?
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
                <Chip
                  label={selectedFornecedor.status}
                  color={selectedFornecedor.status === 'ativo' ? 'success' : 'default'}
                  size="small"
                />
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Contato *"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Função *"
                value={contatoFormData.funcao}
                onChange={(e) => handleContatoInputChange('funcao', e.target.value.toUpperCase())}
                placeholder="Ex: Vendedor, Gerente Comercial"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="E-mail 1"
                type="email"
                value={contatoFormData.email1}
                onChange={(e) => handleContatoInputChange('email1', e.target.value.toLowerCase())}
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
      <Dialog open={openContatoDeleteDialog} onClose={handleCloseContatoDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o contato <strong>{selectedContato?.nome}</strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContatoDeleteDialog}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteContato} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Novo Tipo de Fornecedor */}
      <Dialog open={openNovoTipoDialog} onClose={() => setOpenNovoTipoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Novo Tipo de Fornecedor
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Nome do Tipo *"
              value={novoTipoForm.nome}
              onChange={(e) => setNovoTipoForm({ ...novoTipoForm, nome: e.target.value.toUpperCase() })}
              placeholder="Ex: CONCESSIONÁRIAS, IMPOSTOS..."
            />
            <TextField
              fullWidth
              size="small"
              label="Descrição"
              value={novoTipoForm.descricao}
              onChange={(e) => setNovoTipoForm({ ...novoTipoForm, descricao: e.target.value.toUpperCase() })}
              multiline
              rows={2}
            />
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
            {savingNovoTipo ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}
