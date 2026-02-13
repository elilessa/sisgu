
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
  Avatar,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, Image } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface TipoProduto {
  id: string;
  nome: string;
  naturezaId: string;
}

interface DescricaoProduto {
  id: string;
  nome: string;
  tipoId: string;
}

interface EspecificacaoProduto {
  id: string;
  nome: string;
  tipoId: string;
}

interface Fabricante {
  id: string;
  nome: string;
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
  fotoUrl: string;
  datasheetUrl: string;
  status: 'ativo' | 'inativo';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

export function ProdutosManagement() {
  const { userData } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [descricoesProduto, setDescricoesProduto] = useState<DescricaoProduto[]>([]);
  const [especificacoesProduto, setEspecificacoesProduto] = useState<EspecificacaoProduto[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    tipoId: '',
    descricaoId: '',
    especificacaoId: '',
    fabricanteId: '',
    sku: '',
    fotoUrl: '',
    datasheetUrl: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });

  useEffect(() => {
    loadProdutos();
    loadParametros();
  }, [userData]);

  const loadParametros = async () => {
    if (!userData?.empresaId) return;

    try {
      const parametrosRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(parametrosRef);

      const tipos: TipoProduto[] = [];
      const descricoes: DescricaoProduto[] = [];
      const especificacoes: EspecificacaoProduto[] = [];
      const fabricantesData: Fabricante[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'tipo') {
          tipos.push({ id: docSnap.id, ...data } as TipoProduto);
        } else if (data.tipoParametro === 'descricao') {
          descricoes.push({ id: docSnap.id, ...data } as DescricaoProduto);
        } else if (data.tipoParametro === 'especificacao') {
          especificacoes.push({ id: docSnap.id, ...data } as EspecificacaoProduto);
        } else if (data.tipoParametro === 'fabricante') {
          fabricantesData.push({ id: docSnap.id, ...data } as Fabricante);
        }
      });

      setTiposProduto(tipos);
      setDescricoesProduto(descricoes);
      setEspecificacoesProduto(especificacoes);
      setFabricantes(fabricantesData);
    } catch (err: any) {
      setError('Erro ao carregar parâmetros: ' + err.message);
    }
  };

  const loadProdutos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');
      const snapshot = await getDocs(produtosRef);

      const produtosList: Produto[] = [];
      snapshot.forEach((docSnap) => {
        produtosList.push({ id: docSnap.id, ...docSnap.data() } as Produto);
      });

      setProdutos(produtosList);
    } catch (err: any) {
      setError('Erro ao carregar produtos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setIsEditing(true);
      setSelectedProduto(produto);
      setFormData({
        tipoId: produto.tipoId,
        descricaoId: produto.descricaoId,
        especificacaoId: produto.especificacaoId,
        fabricanteId: produto.fabricanteId,
        sku: produto.sku,
        fotoUrl: produto.fotoUrl,
        datasheetUrl: produto.datasheetUrl,
        status: produto.status,
      });
    } else {
      setIsEditing(false);
      setSelectedProduto(null);
      setFormData({
        tipoId: '',
        descricaoId: '',
        especificacaoId: '',
        fabricanteId: '',
        sku: '',
        fotoUrl: '',
        datasheetUrl: '',
        status: 'ativo',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduto(null);
    setIsEditing(false);
  };

  const handleOpenViewDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedProduto(null);
  };

  const handleOpenDeleteDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedProduto(null);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'tipoId') {
      // Limpar descrição e especificação quando mudar o tipo
      setFormData((prev) => ({ 
        ...prev, 
        tipoId: value,
        descricaoId: '', 
        especificacaoId: '' 
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;

    if (!formData.tipoId || !formData.descricaoId) {
      setError('Preencha os campos obrigatórios: Tipo e Descrição');
      return;
    }

    try {
      const tipo = tiposProduto.find(t => t.id === formData.tipoId);
      const descricao = descricoesProduto.find(d => d.id === formData.descricaoId);
      const especificacao = especificacoesProduto.find(e => e.id === formData.especificacaoId);
      const fabricante = fabricantes.find(f => f.id === formData.fabricanteId);

      const produtoData = {
        ...formData,
        tipoNome: tipo?.nome || '',
        descricaoNome: descricao?.nome || '',
        especificacaoNome: especificacao?.nome || '',
        fabricanteNome: fabricante?.nome || '',
        naturezaId: tipo?.naturezaId || '',
      };

      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');

      if (isEditing && selectedProduto) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'produtos', selectedProduto.id);
        await updateDoc(docRef, {
          ...produtoData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Produto atualizado com sucesso!');
      } else {
        await addDoc(produtosRef, {
          ...produtoData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Produto criado com sucesso!');
      }

      handleCloseDialog();
      loadProdutos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar produto: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedProduto) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'produtos', selectedProduto.id));
      setSuccess('Produto excluído com sucesso!');
      handleCloseDeleteDialog();
      loadProdutos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir produto: ' + err.message);
    }
  };

  const descricoesFiltered = descricoesProduto.filter(d => d.tipoId === formData.tipoId);
  const especificacoesFiltered = especificacoesProduto.filter(e => e.tipoId === formData.tipoId);

  return (
    <ProtectedRoute requiredRoute="/produtos/lista">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Lista de Produtos
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Produto
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
        <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
            <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
              <TableRow>
                <TableCell><strong>Foto</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell><strong>Descrição</strong></TableCell>
                <TableCell><strong>Especificação</strong></TableCell>
                <TableCell><strong>Fabricante</strong></TableCell>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    {produto.fotoUrl ? (
                      <Avatar src={produto.fotoUrl} variant="square" sx={{ width: 40, height: 40 }} />
                    ) : (
                      <Avatar variant="square" sx={{ width: 40, height: 40, bgcolor: '#e0e0e0' }}>
                        <Image sx={{ color: '#9e9e9e' }} />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>{produto.tipoNome}</TableCell>
                  <TableCell>{produto.descricaoNome}</TableCell>
                  <TableCell>{produto.especificacaoNome || '-'}</TableCell>
                  <TableCell>{produto.fabricanteNome || '-'}</TableCell>
                  <TableCell>{produto.sku}</TableCell>
                  <TableCell>
                    <Chip
                      label={produto.status}
                      color={produto.status === 'ativo' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenViewDialog(produto)}
                      title="Visualizar"
                      sx={{ color: '#1976d2' }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(produto)}
                      title="Editar"
                      sx={{ color: '#ff9800' }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(produto)}
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

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Tipo de Produto *"
                value={formData.tipoId}
                onChange={(e) => handleInputChange('tipoId', e.target.value)}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {tiposProduto.map((tipo) => (
                  <MenuItem key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Descrição de Produto *"
                value={formData.descricaoId}
                onChange={(e) => handleInputChange('descricaoId', e.target.value)}
                disabled={!formData.tipoId}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {descricoesFiltered.map((desc) => (
                  <MenuItem key={desc.id} value={desc.id}>
                    {desc.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Especificação"
                value={formData.especificacaoId}
                onChange={(e) => handleInputChange('especificacaoId', e.target.value)}
                disabled={!formData.tipoId}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {especificacoesFiltered.map((espec) => (
                  <MenuItem key={espec.id} value={espec.id}>
                    {espec.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Fabricante"
                value={formData.fabricanteId}
                onChange={(e) => handleInputChange('fabricanteId', e.target.value)}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {fabricantes.map((fab) => (
                  <MenuItem key={fab.id} value={fab.id}>
                    {fab.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="SKU"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Código do produto"
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="URL da Foto"
                value={formData.fotoUrl}
                onChange={(e) => handleInputChange('fotoUrl', e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="URL do Datasheet"
                value={formData.datasheetUrl}
                onChange={(e) => handleInputChange('datasheetUrl', e.target.value)}
                placeholder="https://exemplo.com/datasheet.pdf"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Produto</DialogTitle>
        <DialogContent>
          {selectedProduto && (
            <Box className="space-y-4 mt-2">
              {selectedProduto.fotoUrl && (
                <Box className="flex justify-center">
                  <Avatar
                    src={selectedProduto.fotoUrl}
                    variant="square"
                    sx={{ width: 200, height: 200 }}
                  />
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">SKU:</Typography>
                <Typography>{selectedProduto.sku}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Tipo de Produto:</Typography>
                <Typography>{selectedProduto.tipoNome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Descrição:</Typography>
                <Typography>{selectedProduto.descricaoNome}</Typography>
              </Box>

              {selectedProduto.especificacaoNome && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Especificação:</Typography>
                  <Typography>{selectedProduto.especificacaoNome}</Typography>
                </Box>
              )}

              {selectedProduto.fabricanteNome && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Fabricante:</Typography>
                  <Typography>{selectedProduto.fabricanteNome}</Typography>
                </Box>
              )}

              {selectedProduto.datasheetUrl && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Datasheet:</Typography>
                  <Typography>
                    <a href={selectedProduto.datasheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Abrir Datasheet
                    </a>
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <Chip
                  label={selectedProduto.status}
                  color={selectedProduto.status === 'ativo' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o produto <strong>{selectedProduto?.sku}</strong>?
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
    </ProtectedRoute>
  );
}
