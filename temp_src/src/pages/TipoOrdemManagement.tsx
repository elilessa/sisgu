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

interface TipoAtividade {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm?: Timestamp;
}

interface FormData {
  nome: string;
  descricao: string;
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  descricao: '',
  ativo: true,
};

export function TipoOrdemManagement() {
  const { userData } = useAuth();
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTipoId, setCurrentTipoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<TipoAtividade | null>(null);

  useEffect(() => {
    if (!userData?.empresaId) return;

    const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades');
    const q = query(tiposRef, orderBy('nome', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TipoAtividade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) } as TipoAtividade);
        });
        setTiposAtividade(list);
        setLoading(false);
      },
      (err) => {
        setError(`Erro ao carregar tipos de ordem: ${err.message}`);
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

  const handleOpenEdit = (tipo: TipoAtividade) => {
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
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
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades');

      if (isEditing && currentTipoId) {
        const tipoDoc = doc(tiposRef, currentTipoId);
        await updateDoc(tipoDoc, {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          ativo: formData.ativo,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Tipo de ordem atualizado com sucesso!');
      } else {
        await addDoc(tiposRef, {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          ativo: formData.ativo,
          criadoEm: Timestamp.now(),
        });
        setSuccess('Tipo de ordem criado com sucesso!');
      }

      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleDeleteClick = (tipo: TipoAtividade) => {
    setTipoToDelete(tipo);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userData?.empresaId || !tipoToDelete) return;

    try {
      const tipoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades', tipoToDelete.id);
      await deleteDoc(tipoDoc);
      setSuccess('Tipo de ordem excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeleteConfirmOpen(false);
      setTipoToDelete(null);
    }
  };

  const handleToggleAtivo = async (tipo: TipoAtividade) => {
    if (!userData?.empresaId) return;

    try {
      const tipoDoc = doc(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades', tipo.id);
      await updateDoc(tipoDoc, {
        ativo: !tipo.ativo,
        atualizadoEm: Timestamp.now(),
      });
    } catch (err: any) {
      setError(`Erro ao alterar status: ${err.message}`);
    }
  };

  return (
      <Box sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.10)',
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2.25,
              bgcolor: 'rgba(0, 192, 163, 0.06)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(0, 192, 163, 0.12)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Category sx={{ color: '#00c0a3' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                  Tipos de Ordem
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Gerencie os tipos de atividades para agendamentos técnicos
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: '#00c0a3',
                '&:hover': { bgcolor: '#00a88f' },
                fontWeight: 700,
              }}
            >
              Novo Tipo
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : tiposAtividade.length === 0 ? (
              <Alert severity="info">
                Nenhum tipo de ordem cadastrado. Clique em "Novo Tipo" para adicionar.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: TABLE_HEADER_BG_COLOR }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">
                        Status
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">
                        Ações
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tiposAtividade.map((tipo) => (
                      <TableRow key={tipo.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{tipo.nome}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {tipo.descricao || '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={tipo.ativo ? 'Ativo' : 'Inativo'}
                            color={tipo.ativo ? 'success' : 'default'}
                            size="small"
                            onClick={() => handleToggleAtivo(tipo)}
                            sx={{ cursor: 'pointer', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(tipo)}
                            sx={{ color: '#1976d2' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(tipo)}
                            sx={{ color: '#d32f2f' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isEditing ? 'Editar Tipo de Ordem' : 'Novo Tipo de Ordem'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
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
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
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
              Tem certeza que deseja excluir o tipo de ordem "{tipoToDelete?.nome}"?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}
