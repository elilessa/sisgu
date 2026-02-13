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
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { ActionDelete, ActionKey } from '../../components/TableActions';
import { Add } from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  empresaId: string;
  rotasPermitidas: string[];
}

const ROUTE_GROUPS = [
  { label: 'Dashboard', routes: ['/dashboard'] },
  {
    label: 'Clientes',
    routes: ['/clientes', '/clientes/novo', '/clientes/lista']
  },
  {
    label: 'Agenda',
    routes: [
      '/agenda',
      '/agenda/visualizar',
      '/agenda/abertura-chamado',
      '/agenda/ordens-servico',
      '/agenda/area-tecnica'
    ]
  },
  {
    label: 'Contratos',
    routes: [
      '/contratos',
      '/contratos/lista',
      '/contratos/novo',
      '/contratos/comodato',
      '/contratos/sem-pecas',
      '/contratos/com-pecas',
      '/contratos/ativos',
      '/contratos/cancelados'
    ]
  },
  {
    label: 'Comercial',
    routes: [
      '/comercial',
      '/comercial/propostas',
      '/comercial/orcamentos',
      '/comercial/vendas'
    ]
  },
  {
    label: 'Financeiro',
    routes: [
      '/financeiro',
      '/financeiro/contas-receber',
      '/financeiro/contas-pagar',
      '/financeiro/fluxo-caixa',
      '/financeiro/boleto',
      '/financeiro/nota-fiscal'
    ]
  },
  {
    label: 'Produtos',
    routes: [
      '/produtos',
      '/produtos/cadastro',
      '/produtos/estoque',
      '/produtos/compras',
      '/produtos/fornecedores'
    ]
  },
  {
    label: 'Relatórios',
    routes: [
      '/relatorios',
      '/relatorios/financeiro',
      '/relatorios/clientes',
      '/relatorios/vendas',
      '/relatorios/tecnico'
    ]
  },
  {
    label: 'Configurações',
    routes: [
      '/configuracoes',
      '/configuracoes/usuarios',
      '/configuracoes/administradoras',
      '/configuracoes/administradoras/novo',
      '/configuracoes/administradoras/editar',
      '/configuracoes/administradoras/visualizar',
      '/configuracoes/administradoras/contatos',
      '/configuracoes/banco',
      '/configuracoes/banco/novo',
      '/configuracoes/banco/editar',
      '/configuracoes/banco/visualizar',
      '/configuracoes/parametros-produtos'
    ]
  },
];

export function Usuarios() {
  const { userData, updateUserPermissions } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsuarios();
  }, [userData]);

  const loadUsuarios = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, where('empresaId', '==', userData.empresaId));
      const snapshot = await getDocs(q);

      const usuariosList: Usuario[] = [];
      snapshot.forEach((doc) => {
        usuariosList.push({ id: doc.id, ...doc.data() } as Usuario);
      });

      setUsuarios(usuariosList);
    } catch (err: any) {
      setError('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissions = (usuario: Usuario) => {
    setSelectedUser(usuario);
    setSelectedRoutes(usuario.rotasPermitidas || []);
    setOpenPermissionsDialog(true);
  };

  const handleClosePermissions = () => {
    setOpenPermissionsDialog(false);
    setSelectedUser(null);
    setSelectedRoutes([]);
    setTabValue(0);
  };

  const handleOpenDeleteDialog = (usuario: Usuario) => {
    setSelectedUser(usuario);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleToggleRoute = (rota: string) => {
    setSelectedRoutes((prev) =>
      prev.includes(rota)
        ? prev.filter((r) => r !== rota)
        : [...prev, rota]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      await updateUserPermissions(selectedUser.id, selectedRoutes);
      setSuccess('Permissões atualizadas com sucesso!');
      handleClosePermissions();
      loadUsuarios();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao atualizar permissões: ' + err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteDoc(doc(db, 'usuarios', selectedUser.id));
      setSuccess('Usuário excluído com sucesso!');
      handleCloseDeleteDialog();
      loadUsuarios();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir usuário: ' + err.message);
    }
  };

  return (
    <ProtectedRoute requiredRoute="/configuracoes/usuarios">
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Usuários
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => window.location.href = '/dashboard'}
        >
          Novo Usuário
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
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Permissões</strong></TableCell>
                <TableCell align="right"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.role}
                      color={usuario.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${usuario.rotasPermitidas?.length || 0} rotas`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <ActionKey title="Gerenciar Permissões" onClick={() => handleOpenPermissions(usuario)} />
                      <ActionDelete
                        title="Excluir"
                        onClick={() => handleOpenDeleteDialog(usuario)}
                        disabled={usuario.role === 'admin'}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Permissões */}
      <Dialog open={openPermissionsDialog} onClose={handleClosePermissions} maxWidth="md" fullWidth>
        <DialogTitle>
          Gerenciar Permissões - {selectedUser?.nome}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="mb-4 text-gray-600">
            Selecione as rotas que o usuário pode acessar:
          </Typography>

          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            {ROUTE_GROUPS.map((group, index) => (
              <Tab key={index} label={group.label} />
            ))}
          </Tabs>

          <Box sx={{ minHeight: 300 }}>
            {ROUTE_GROUPS[tabValue] && (
              <Box className="space-y-2">
                {ROUTE_GROUPS[tabValue].routes.map((rota) => (
                  <FormControlLabel
                    key={rota}
                    control={
                      <Checkbox
                        checked={selectedRoutes.includes(rota)}
                        onChange={() => handleToggleRoute(rota)}
                      />
                    }
                    label={rota}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePermissions}>Cancelar</Button>
          <Button onClick={handleSavePermissions} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteUser}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir o usuário <strong>{selectedUser?.nome}</strong>?
          </Typography>
        }
      />
    </ProtectedRoute>
  );
}
