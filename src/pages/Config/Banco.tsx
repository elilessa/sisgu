import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Grid,
} from '@mui/material';
import { ActionView, ActionEdit, ActionDelete, StatusChip } from '../../components/TableActions';
import { Add } from '@mui/icons-material';
import { customColors } from '../../theme';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Banco {
  id: string;
  numeroBanco: string;
  nomeBanco: string;
  agencia: string;
  contaCorrente: string;
  nomeTitular: string;
  status: 'ativo' | 'inativo';
  observacao?: string;
}

export function Banco() {
  const { userData } = useAuth();
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    numeroBanco: '',
    nomeBanco: '',
    agencia: '',
    contaCorrente: '',
    nomeTitular: '',
    observacao: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });

  useEffect(() => {
    loadBancos();
  }, [userData]);

  // Limpar mensagens de erro/sucesso automaticamente
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);


  const loadBancos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const bancosRef = collection(db, 'EMPRESAS', userData.empresaId, 'bancos');
      const snapshot = await getDocs(bancosRef);

      const bancosList: Banco[] = [];
      snapshot.forEach((doc) => {
        bancosList.push({ id: doc.id, ...doc.data() } as Banco);
      });

      setBancos(bancosList);
    } catch (err: any) {
      setError('Erro ao carregar bancos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (banco?: Banco) => {
    if (banco) {
      setIsEditing(true);
      setSelectedBanco(banco);
      setFormData({
        numeroBanco: banco.numeroBanco,
        nomeBanco: banco.nomeBanco,
        agencia: banco.agencia,
        contaCorrente: banco.contaCorrente,
        nomeTitular: banco.nomeTitular,
        observacao: banco.observacao || '',
        status: banco.status,
      });
    } else {
      setIsEditing(false);
      setSelectedBanco(null);
      setFormData({
        numeroBanco: '',
        nomeBanco: '',
        agencia: '',
        contaCorrente: '',
        nomeTitular: '',
        observacao: '',
        status: 'ativo',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBanco(null);
    setIsEditing(false);
  };

  const handleOpenViewDialog = (banco: Banco) => {
    setSelectedBanco(banco);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedBanco(null);
  };

  const handleOpenDeleteDialog = (banco: Banco) => {
    setSelectedBanco(banco);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedBanco(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!userData?.empresaId) return;

    if (!formData.numeroBanco || !formData.nomeBanco || !formData.agencia || !formData.contaCorrente || !formData.nomeTitular) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const bancosRef = collection(db, 'EMPRESAS', userData.empresaId, 'bancos');

      if (isEditing && selectedBanco) {
        await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'bancos', selectedBanco.id), formData);
        setSuccess('Banco atualizado com sucesso!');
      } else {
        await addDoc(bancosRef, formData);
        setSuccess('Banco cadastrado com sucesso!');
      }

      handleCloseDialog();
      loadBancos();
    } catch (err: any) {
      setError('Erro ao salvar banco: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedBanco) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'bancos', selectedBanco.id));
      setSuccess('Banco excluído com sucesso!');
      handleCloseDeleteDialog();
      loadBancos();
    } catch (err: any) {
      setError('Erro ao excluir banco: ' + err.message);
    }
  };

  return (
    <ProtectedRoute requiredRoute="/configuracoes/banco">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Bancos
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Banco
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
        <Box className="flex justify-center py-8">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: customColors.tableHeader }}>
                <TableCell><strong>Nº do Banco</strong></TableCell>
                <TableCell><strong>Nome do Banco</strong></TableCell>
                <TableCell><strong>Agência</strong></TableCell>
                <TableCell><strong>Conta Corrente</strong></TableCell>
                <TableCell><strong>Titular</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Acões</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bancos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum banco cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                bancos.map((banco) => (
                  <TableRow key={banco.id} hover>
                    <TableCell sx={{ py: 0.25 }}>{banco.numeroBanco}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{banco.nomeBanco}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{banco.agencia}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{banco.contaCorrente}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>{banco.nomeTitular}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>
                      <StatusChip status={banco.status} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.25 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <ActionView onClick={() => handleOpenViewDialog(banco)} title="Visualizar" />
                        <ActionEdit onClick={() => handleOpenDialog(banco)} title="Editar" />
                        <ActionDelete onClick={() => handleOpenDeleteDialog(banco)} title="Excluir" />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEditing ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Nº do Banco *"
                value={formData.numeroBanco}
                onChange={(e) => handleInputChange('numeroBanco', e.target.value)}
                placeholder="Ex: 001, 237, 104"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Banco *"
                value={formData.nomeBanco}
                onChange={(e) => handleInputChange('nomeBanco', e.target.value.toUpperCase())}
                placeholder="Ex: Banco do Brasil, Bradesco"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Agência *"
                value={formData.agencia}
                onChange={(e) => handleInputChange('agencia', e.target.value)}
                placeholder="Ex: 1234-5"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Conta Corrente *"
                value={formData.contaCorrente}
                onChange={(e) => handleInputChange('contaCorrente', e.target.value)}
                placeholder="Ex: 12345-6"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Titular *"
                value={formData.nomeTitular}
                onChange={(e) => handleInputChange('nomeTitular', e.target.value.toUpperCase())}
                placeholder="Nome completo do titular da conta"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Status"
                select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Observação"
                multiline
                rows={3}
                value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value.toUpperCase())}
                placeholder="Informações adicionais sobre a conta"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {isEditing ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Visualizar */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Banco</DialogTitle>
        <DialogContent>
          {selectedBanco && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nº do Banco:</Typography>
                <Typography>{selectedBanco.numeroBanco}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nome do Banco:</Typography>
                <Typography>{selectedBanco.nomeBanco}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Agência:</Typography>
                <Typography>{selectedBanco.agencia}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Conta Corrente:</Typography>
                <Typography>{selectedBanco.contaCorrente}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nome do Titular:</Typography>
                <Typography>{selectedBanco.nomeTitular}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <StatusChip status={selectedBanco.status} />
              </Box>

              {selectedBanco.observacao && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedBanco.observacao}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir o banco <strong>{selectedBanco?.nomeBanco}</strong>?
          </Typography>
        }
      />
    </ProtectedRoute>
  );
}
