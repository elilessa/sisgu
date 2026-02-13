import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
import { Edit, Delete, Add, Category } from '@mui/icons-material';
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TABLE_HEADER_BG_COLOR } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface TipoFornecedor {
  id: string;
  nome: string;
  descricao?: string;
  modoFormulario: 'simples' | 'completo';
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm?: Timestamp;
}

interface FormData {
  nome: string;
  descricao: string;
  modoFormulario: 'simples' | 'completo';
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  descricao: '',
  modoFormulario: 'completo',
  ativo: true,
};

export function TiposFornecedorManagement() {
  const { userData } = useAuth();
  const [tiposFornecedor, setTiposFornecedor] = useState<TipoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTipoId, setCurrentTipoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<TipoFornecedor | null>(null);

  useEffect(() => {
    if (!userData?.empresaId) return;

    const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tiposFornecedor');
    const q = query(tiposRef, orderBy('nome', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TipoFornecedor[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) } as TipoFornecedor);
        });
        setTiposFornecedor(list);
        setLoading(false);
      },
      (err) => {
        setError(`Erro ao carregar tipos de fornecedor: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData?.empresaId]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setCurrentTipoId(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (tipo: TipoFornecedor) => {
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      modoFormulario: tipo.modoFormulario || 'completo',
      ativo: tipo.ativo,
    });
    setIsEditing(true);
    setCurrentTipoId(tipo.id);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setIsEditing(false);
    setCurrentTipoId(null);
  };

  const handleSubmit = async () => {
    if (!userData?.empresaId) return;

    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setError('');
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tiposFornecedor');

      if (isEditing && currentTipoId) {
        const tipoDoc = doc(tiposRef, currentTipoId);
        await updateDoc(tipoDoc, {
          nome: formData.nome.trim().toUpperCase(),
          descricao: formData.descricao.trim().toUpperCase(),
          modoFormulario: formData.modoFormulario,
          ativo: formData.ativo,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Tipo de fornecedor atualizado com sucesso!');
      } else {
        await addDoc(tiposRef, {
          nome: formData.nome.trim().toUpperCase(),
          descricao: formData.descricao.trim().toUpperCase(),
          modoFormulario: formData.modoFormulario,
          ativo: formData.ativo,
          criadoEm: Timestamp.now(),
        });
        setSuccess('Tipo de fornecedor criado com sucesso!');
      }

      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleDeleteClick = (tipo: TipoFornecedor) => {
    setTipoToDelete(tipo);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userData?.empresaId || !tipoToDelete) return;

    try {
      const tipoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'tiposFornecedor', tipoToDelete.id);
      await deleteDoc(tipoDoc);
      setSuccess('Tipo de fornecedor excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeleteConfirmOpen(false);
      setTipoToDelete(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoute="/configuracoes/tipos-fornecedor">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoute="/configuracoes/tipos-fornecedor">
      <Box className="p-6">
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h5" className="font-bold flex items-center gap-2">
          <Category color="primary" /> Tipos de Fornecedor
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#00c0a3', '&:hover': { bgcolor: '#00a88f' } }}
        >
          Novo Tipo
        </Button>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: TABLE_HEADER_BG_COLOR }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Modo do Formulário</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tiposFornecedor.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Nenhum tipo de fornecedor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              tiposFornecedor.map((tipo) => (
                <TableRow key={tipo.id} hover>
                  <TableCell>{tipo.nome}</TableCell>
                  <TableCell>{tipo.descricao || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={tipo.modoFormulario === 'simples' ? 'Simples' : 'Completo'}
                      color={tipo.modoFormulario === 'simples' ? 'info' : 'primary'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={tipo.ativo ? 'Ativo' : 'Inativo'}
                      color={tipo.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(tipo)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(tipo)}
                      color="error"
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Tipo de Fornecedor' : 'Novo Tipo de Fornecedor'}
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Nome *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              size="small"
            />
            <TextField
              fullWidth
              label="Descrição"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
              size="small"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              select
              label="Modo do Formulário *"
              value={formData.modoFormulario}
              onChange={(e) => setFormData({ ...formData, modoFormulario: e.target.value as 'simples' | 'completo' })}
              size="small"
              helperText={formData.modoFormulario === 'simples' ? 'Apenas nome e observação' : 'Todos os campos (endereço, contatos, etc.)'}
            >
              <MenuItem value="simples">Simples</MenuItem>
              <MenuItem value="completo">Completo</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label="Ativo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ bgcolor: '#00c0a3', '&:hover': { bgcolor: '#00a88f' } }}
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o tipo "{tipoToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ProtectedRoute>
  );
}
