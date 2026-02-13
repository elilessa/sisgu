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
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, Person, Phone, Email, Star } from '@mui/icons-material';
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

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
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Contato {
  id?: string;
  nome: string;
  cargo: string;
  telefone: string;
  celular: string;
  email: string;
  ramal: string;
  principal: boolean;
  observacao: string;
  ativo: boolean;
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function AdministradorasManagement() {
  const { userData } = useAuth();
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedAdministradora, setSelectedAdministradora] = useState<Administradora | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

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
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    site: '',
    observacao: '',
    status: 'ativa' as 'ativa' | 'inativa',
  });

  const [contatoFormData, setContatoFormData] = useState({
    nome: '',
    cargo: '',
    telefone: '',
    celular: '',
    email: '',
    ramal: '',
    principal: false,
    observacao: '',
    ativo: true,
  });

  useEffect(() => {
    loadAdministradoras();
  }, [userData]);

  const loadAdministradoras = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (administradora?: Administradora) => {
    setTabValue(0);
    if (administradora) {
      setIsEditing(true);
      setSelectedAdministradora(administradora);
      setFormData({
        nome: administradora.nome,
        endereco: administradora.endereco,
        numero: administradora.numero,
        complemento: administradora.complemento,
        bairro: administradora.bairro,
        cidade: administradora.cidade,
        uf: administradora.uf,
        cep: administradora.cep,
        site: administradora.site,
        observacao: administradora.observacao,
        status: administradora.status,
      });
      await loadContatos(administradora.id);
      setContatosTemporarios([]);
    } else {
      setIsEditing(false);
      setSelectedAdministradora(null);
      setFormData({
        nome: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        site: '',
        observacao: '',
        status: 'ativa',
      });
      setContatosTemporarios([]);
      setContatos([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAdministradora(null);
    setIsEditing(false);
    setContatosTemporarios([]);
    setContatos([]);
    setTabValue(0);
  };

  const handleOpenViewDialog = async (administradora: Administradora) => {
    setSelectedAdministradora(administradora);
    await loadContatos(administradora.id);
    setOpenViewDialog(true);
  };

  // Funções para Contatos
  const loadContatos = async (administradoraId: string) => {
    if (!userData?.empresaId) return;

    setLoadingContatos(true);
    try {
      const contatosRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'administradoras',
        administradoraId,
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
        cargo: contato.cargo,
        telefone: contato.telefone,
        celular: contato.celular,
        email: contato.email,
        ramal: contato.ramal,
        principal: contato.principal,
        observacao: contato.observacao,
        ativo: contato.ativo,
      });
    } else {
      setIsEditingContato(false);
      setEditingContatoIndex(null);
      setContatoFormData({
        nome: '',
        cargo: '',
        telefone: '',
        celular: '',
        email: '',
        ramal: '',
        principal: false,
        observacao: '',
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
    if (!contatoFormData.nome || !contatoFormData.cargo) {
      setError('Preencha os campos obrigatórios: Nome e Cargo');
      return;
    }

    // Se marcar como principal, desmarcar outros
    let updatedContatos = [...contatosTemporarios];
    if (contatoFormData.principal) {
      updatedContatos = updatedContatos.map(c => ({ ...c, principal: false }));
    }

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
    if (!userData?.empresaId || !selectedAdministradora) return;

    if (!contatoFormData.nome || !contatoFormData.cargo) {
      setError('Preencha os campos obrigatórios: Nome e Cargo');
      return;
    }

    try {
      const contatosRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'administradoras',
        selectedAdministradora.id,
        'contatos'
      );

      // Se marcar como principal, desmarcar outros
      if (contatoFormData.principal) {
        const snapshot = await getDocs(contatosRef);
        const updates = snapshot.docs
          .filter(doc => doc.id !== selectedContato?.id)
          .map(doc =>
            updateDoc(doc.ref, { principal: false })
          );
        await Promise.all(updates);
      }

      if (isEditingContato && selectedContato) {
        const docRef = doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'administradoras',
          selectedAdministradora.id,
          'contatos',
          selectedContato.id
        );
        await updateDoc(docRef, {
          ...contatoFormData,
          atualizadoEm: Timestamp.now(),
        });
        console.log('✅ Contato atualizado no caminho:', docRef.path);
        setSuccess('Contato atualizado com sucesso!');
      } else {
        const novoContato = await addDoc(contatosRef, {
          ...contatoFormData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        console.log('✅ Contato criado no caminho:', novoContato.path);
        setSuccess('Contato criado com sucesso!');
      }

      handleCloseContatoDialog();
      await loadContatos(selectedAdministradora.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar contato: ' + err.message);
    }
  };

  const handleDeleteContato = async () => {
    if (!userData?.empresaId || !selectedAdministradora || !selectedContato) return;

    try {
      await deleteDoc(
        doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'administradoras',
          selectedAdministradora.id,
          'contatos',
          selectedContato.id
        )
      );
      setSuccess('Contato excluído com sucesso!');
      handleCloseContatoDeleteDialog();
      await loadContatos(selectedAdministradora.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir contato: ' + err.message);
    }
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedAdministradora(null);
  };

  const handleOpenDeleteDialog = (administradora: Administradora) => {
    setSelectedAdministradora(administradora);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedAdministradora(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;

    if (!formData.nome || !formData.cidade || !formData.uf) {
      setError('Preencha os campos obrigatórios: Nome, Cidade e UF');
      return;
    }

    try {
      const administradorasRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras');

      if (isEditing && selectedAdministradora) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', selectedAdministradora.id);
        await updateDoc(docRef, {
          ...formData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Administradora atualizada com sucesso!');
      } else {
        // Criar nova administradora
        const novaAdmRef = await addDoc(administradorasRef, {
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
            'administradoras',
            novaAdmRef.id,
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

        setSuccess('Administradora criada com sucesso!');
      }

      handleCloseDialog();
      loadAdministradoras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar administradora: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedAdministradora) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', selectedAdministradora.id));
      setSuccess('Administradora excluída com sucesso!');
      handleCloseDeleteDialog();
      loadAdministradoras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir administradora: ' + err.message);
    }
  };

  const filteredAdministradoras = administradoras.filter((administradora) =>
    administradora.nome.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRoute="/configuracoes/administradoras">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Administradoras
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nova Administradora
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
              placeholder="Digite o nome da administradora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              variant="outlined"
            />
          </Box>
          <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
              <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Cidade</strong></TableCell>
                  <TableCell><strong>UF</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAdministradoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhuma administradora encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdministradoras.map((administradora) => (
                    <TableRow key={administradora.id}>
                      <TableCell>{administradora.nome}</TableCell>
                      <TableCell>{administradora.cidade}</TableCell>
                      <TableCell>{administradora.uf}</TableCell>
                      <TableCell>
                        <Chip
                          label={administradora.status}
                          color={administradora.status === 'ativa' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenViewDialog(administradora)}
                          title="Visualizar"
                          sx={{ color: '#1976d2' }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(administradora)}
                          title="Editar"
                          sx={{ color: '#ff9800' }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(administradora)}
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

      {/* Dialog de Cadastro/Edição com Abas */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Administradora' : 'Nova Administradora'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Dados da Administradora" />
            <Tab label={`Contatos (${isEditing ? contatos.length : contatosTemporarios.length})`} />
          </Tabs>

          {/* Aba 1: Dados da Administradora */}
          {tabValue === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nome da Administradora *"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Endereço"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Número"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
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

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'ativa' | 'inativa')}
                >
                  <MenuItem value="ativa">Ativa</MenuItem>
                  <MenuItem value="inativa">Inativa</MenuItem>
                </TextField>
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

              <Grid item xs={12} sm={2}>
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

              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="CEP"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Site (URL)"
                  type="url"
                  value={formData.site}
                  onChange={(e) => handleInputChange('site', e.target.value.toLowerCase())}
                  placeholder="https://exemplo.com.br"
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
                // Modo Edição: Mostra contatos já salvos com todos os campos
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
                                <strong>Função:</strong> {contato.cargo}
                              </Typography>
                              
                              <Box className="mt-2 space-y-1">
                                {contato.telefone && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Telefone:</strong> {contato.telefone}
                                    {contato.ramal && ` - Ramal: ${contato.ramal}`}
                                  </Typography>
                                )}
                                {contato.celular && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Celular/WhatsApp:</strong> {contato.celular}
                                  </Typography>
                                )}
                                {contato.email && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail:</strong> {contato.email}
                                  </Typography>
                                )}
                                {!contato.telefone && !contato.celular && !contato.email && (
                                  <Typography variant="body2" color="textSecondary">
                                    Nenhum contato informado
                                  </Typography>
                                )}
                              </Box>
                              
                              {contato.observacao && (
                                <Typography variant="body2" className="mt-2 text-gray-600">
                                  <strong>Observação:</strong> {contato.observacao}
                                </Typography>
                              )}
                            </Box>
                            <Box className="flex items-center gap-1">
                              <Chip
                                label={contato.ativo ? 'Ativo' : 'Inativo'}
                                color={contato.ativo ? 'success' : 'default'}
                                size="small"
                              />
                              {contato.principal && (
                                <Chip
                                  icon={<Star style={{ fontSize: 16 }} />}
                                  label="Principal"
                                  color="primary"
                                  size="small"
                                />
                              )}
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
                                cargo: contato.cargo,
                                telefone: contato.telefone,
                                celular: contato.celular,
                                email: contato.email,
                                ramal: contato.ramal,
                                principal: contato.principal,
                                observacao: contato.observacao,
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
                // Modo Novo: Mostra contatos temporários
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
                                {contato.cargo}
                              </Typography>
                              <Typography variant="body2" className="mt-1">
                                {contato.telefone && `Tel: ${contato.telefone}`}
                                {contato.celular && ` | Cel: ${contato.celular}`}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
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
            Tem certeza que deseja excluir a administradora <strong>{selectedAdministradora?.nome}</strong>?
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
        <DialogTitle>Detalhes da Administradora</DialogTitle>
        <DialogContent>
          {selectedAdministradora && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nome:</Typography>
                <Typography>{selectedAdministradora.nome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Endereço Completo:</Typography>
                <Typography>
                  {selectedAdministradora.endereco}, {selectedAdministradora.numero}
                  {selectedAdministradora.complemento && ` - ${selectedAdministradora.complemento}`}
                </Typography>
                <Typography>
                  {selectedAdministradora.bairro} - {selectedAdministradora.cidade}/{selectedAdministradora.uf}
                </Typography>
                <Typography>CEP: {selectedAdministradora.cep || 'Não informado'}</Typography>
              </Box>

              {selectedAdministradora.site && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Site:</Typography>
                  <Typography>
                    <a href={selectedAdministradora.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedAdministradora.site}
                    </a>
                  </Typography>
                </Box>
              )}

              {selectedAdministradora.observacao && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedAdministradora.observacao}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <Chip
                  label={selectedAdministradora.status}
                  color={selectedAdministradora.status === 'ativa' ? 'success' : 'default'}
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
                                <strong>Função:</strong> {contato.cargo}
                              </Typography>
                              
                              <Box className="mt-2 space-y-1">
                                {contato.telefone && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Telefone:</strong> {contato.telefone}
                                    {contato.ramal && ` - Ramal: ${contato.ramal}`}
                                  </Typography>
                                )}
                                {contato.celular && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Celular/WhatsApp:</strong> {contato.celular}
                                  </Typography>
                                )}
                                {contato.email && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail:</strong> {contato.email}
                                  </Typography>
                                )}
                                {!contato.telefone && !contato.celular && !contato.email && (
                                  <Typography variant="body2" color="textSecondary">
                                    Nenhum contato informado
                                  </Typography>
                                )}
                              </Box>
                              
                              {contato.observacao && (
                                <Typography variant="body2" className="mt-2 text-gray-600">
                                  <strong>Observação:</strong> {contato.observacao}
                                </Typography>
                              )}
                            </Box>
                            <Box className="flex items-center">
                              <Chip
                                label={contato.ativo ? 'Ativo' : 'Inativo'}
                                color={contato.ativo ? 'success' : 'default'}
                                size="small"
                              />
                              {contato.principal && (
                                <Chip
                                  icon={<Star style={{ fontSize: 16 }} />}
                                  label="Principal"
                                  color="primary"
                                  size="small"
                                  className="ml-2"
                                />
                              )}
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

      {/* Dialog de Cadastro/Edição de Contato (para contatos temporários) */}
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
                label="Nome Completo *"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Função *"
                value={contatoFormData.cargo}
                onChange={(e) => handleContatoInputChange('cargo', e.target.value.toUpperCase())}
                placeholder="Ex: Gerente de Contas, Síndico"
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
                label="Ramal"
                value={contatoFormData.ramal}
                onChange={(e) => handleContatoInputChange('ramal', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Celular/WhatsApp"
                value={contatoFormData.celular}
                onChange={(e) => handleContatoInputChange('celular', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="E-mail"
                type="email"
                value={contatoFormData.email}
                onChange={(e) => handleContatoInputChange('email', e.target.value.toLowerCase())}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Observação"
                multiline
                rows={2}
                value={contatoFormData.observacao}
                onChange={(e) => handleContatoInputChange('observacao', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contatoFormData.ativo}
                    onChange={(e) => handleContatoInputChange('ativo', e.target.checked)}
                  />
                }
                label="Contato Ativo"
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
    </ProtectedRoute>
  );
}