
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
  Avatar,
  Divider,
} from '@mui/material';
import { Edit, Inventory, LocalShipping, Image, Delete } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  setDoc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface Produto {
  id: string;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
  sku: string;
  fotoUrl: string;
}

interface Estoque {
  id: string;
  produtoId: string;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
  sku: string;
  fotoUrl: string;
  localizacao: string;
  estoqueMinimo: number;
  quantidadeAtual: number;
  atualizadoEm: Timestamp;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Remessa {
  id: string;
  nfe: string;
  lote: string;
  fornecedorId: string;
  fornecedorNome: string;
  quantidade: number;
  precoUnitario: number;
  dataEntrada: Timestamp;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

export function EstoqueManagement() {
  const { userData } = useAuth();
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRemessasDialog, setOpenRemessasDialog] = useState(false);
  const [openRemessaFormDialog, setOpenRemessaFormDialog] = useState(false);
  const [openDeleteRemessaDialog, setOpenDeleteRemessaDialog] = useState(false);
  const [selectedEstoque, setSelectedEstoque] = useState<Estoque | null>(null);
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [selectedRemessa, setSelectedRemessa] = useState<Remessa | null>(null);
  const [isEditingRemessa, setIsEditingRemessa] = useState(false);
  const [loadingRemessas, setLoadingRemessas] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    localizacao: '',
    estoqueMinimo: 0,
  });

  const [remessaFormData, setRemessaFormData] = useState({
    nfe: '',
    lote: '',
    fornecedorId: '',
    quantidade: 0,
    precoUnitario: 0,
    dataEntrada: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    syncEstoqueFromProdutos();
    loadFornecedores();
  }, [userData]);

  const syncEstoqueFromProdutos = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');
      const produtosSnapshot = await getDocs(produtosRef);

      const estoqueRef = collection(db, 'EMPRESAS', userData.empresaId, 'estoque');
      const estoqueSnapshot = await getDocs(estoqueRef);
      
      const estoqueMap = new Map();
      estoqueSnapshot.forEach((doc) => {
        estoqueMap.set(doc.id, doc.data());
      });

      const promises: Promise<void>[] = [];

      produtosSnapshot.forEach((produtoDoc) => {
        const produtoData = produtoDoc.data() as Produto;
        const estoqueData = estoqueMap.get(produtoDoc.id);

        if (!estoqueData) {
          const newEstoque = {
            produtoId: produtoDoc.id,
            tipoNome: produtoData.tipoNome || '',
            descricaoNome: produtoData.descricaoNome || '',
            especificacaoNome: produtoData.especificacaoNome || '',
            fabricanteNome: produtoData.fabricanteNome || '',
            sku: produtoData.sku || '',
            fotoUrl: produtoData.fotoUrl || '',
            localizacao: '',
            estoqueMinimo: 0,
            quantidadeAtual: 0,
            atualizadoEm: Timestamp.now(),
          };
          promises.push(
            setDoc(doc(db, 'EMPRESAS', userData.empresaId, 'estoque', produtoDoc.id), newEstoque)
          );
        } else {
          const updates: any = {};
          if (estoqueData.tipoNome !== produtoData.tipoNome) updates.tipoNome = produtoData.tipoNome || '';
          if (estoqueData.descricaoNome !== produtoData.descricaoNome) updates.descricaoNome = produtoData.descricaoNome || '';
          if (estoqueData.especificacaoNome !== produtoData.especificacaoNome) updates.especificacaoNome = produtoData.especificacaoNome || '';
          if (estoqueData.fabricanteNome !== produtoData.fabricanteNome) updates.fabricanteNome = produtoData.fabricanteNome || '';
          if (estoqueData.sku !== produtoData.sku) updates.sku = produtoData.sku || '';
          if (estoqueData.fotoUrl !== produtoData.fotoUrl) updates.fotoUrl = produtoData.fotoUrl || '';

          if (Object.keys(updates).length > 0) {
            updates.atualizadoEm = Timestamp.now();
            promises.push(
              updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'estoque', produtoDoc.id), updates)
            );
          }
        }
      });

      await Promise.all(promises);
      await loadEstoques();
    } catch (err: any) {
      setError('Erro ao sincronizar estoque: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEstoques = async () => {
    if (!userData?.empresaId) return;

    try {
      const estoqueRef = collection(db, 'EMPRESAS', userData.empresaId, 'estoque');
      const snapshot = await getDocs(estoqueRef);

      const estoquesList: Estoque[] = [];
      snapshot.forEach((docSnap) => {
        estoquesList.push({ id: docSnap.id, ...docSnap.data() } as Estoque);
      });

      setEstoques(estoquesList);
    } catch (err: any) {
      setError('Erro ao carregar estoque: ' + err.message);
    }
  };

  const loadFornecedores = async () => {
    if (!userData?.empresaId) return;

    try {
      const fornecedoresRef = collection(db, 'EMPRESAS', userData.empresaId, 'fornecedores');
      const snapshot = await getDocs(fornecedoresRef);

      const fornecedoresList: Fornecedor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'ativo') {
          fornecedoresList.push({ id: docSnap.id, nome: data.nome });
        }
      });

      setFornecedores(fornecedoresList);
    } catch (err: any) {
      setError('Erro ao carregar fornecedores: ' + err.message);
    }
  };

  const loadRemessas = async (estoqueId: string) => {
    if (!userData?.empresaId) return;

    setLoadingRemessas(true);
    try {
      const remessasRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'estoque',
        estoqueId,
        'remessas'
      );
      const snapshot = await getDocs(remessasRef);

      const remessasList: Remessa[] = [];
      let total = 0;

      snapshot.forEach((docSnap) => {
        const remessa = { id: docSnap.id, ...docSnap.data() } as Remessa;
        remessasList.push(remessa);
        total += remessa.quantidade;
      });

      setRemessas(remessasList);

      const estoqueDocRef = doc(db, 'EMPRESAS', userData.empresaId, 'estoque', estoqueId);
      await updateDoc(estoqueDocRef, {
        quantidadeAtual: total,
        atualizadoEm: Timestamp.now(),
      });

      await loadEstoques();
    } catch (err: any) {
      setError('Erro ao carregar remessas: ' + err.message);
    } finally {
      setLoadingRemessas(false);
    }
  };

  const handleOpenDialog = (estoque: Estoque) => {
    setSelectedEstoque(estoque);
    setFormData({
      localizacao: estoque.localizacao,
      estoqueMinimo: estoque.estoqueMinimo,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEstoque(null);
  };

  const handleOpenRemessasDialog = async (estoque: Estoque) => {
    setSelectedEstoque(estoque);
    await loadRemessas(estoque.id);
    setOpenRemessasDialog(true);
  };

  const handleCloseRemessasDialog = () => {
    setOpenRemessasDialog(false);
    setSelectedEstoque(null);
    setRemessas([]);
  };

  const handleOpenRemessaFormDialog = (remessa?: Remessa) => {
    if (remessa) {
      setIsEditingRemessa(true);
      setSelectedRemessa(remessa);
      setRemessaFormData({
        nfe: remessa.nfe,
        lote: remessa.lote,
        fornecedorId: remessa.fornecedorId,
        quantidade: remessa.quantidade,
        precoUnitario: remessa.precoUnitario,
        dataEntrada: remessa.dataEntrada.toDate().toISOString().split('T')[0],
      });
    } else {
      setIsEditingRemessa(false);
      setSelectedRemessa(null);
      setRemessaFormData({
        nfe: '',
        lote: '',
        fornecedorId: '',
        quantidade: 0,
        precoUnitario: 0,
        dataEntrada: new Date().toISOString().split('T')[0],
      });
    }
    setOpenRemessaFormDialog(true);
  };

  const handleCloseRemessaFormDialog = () => {
    setOpenRemessaFormDialog(false);
    setIsEditingRemessa(false);
    setSelectedRemessa(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemessaInputChange = (field: string, value: any) => {
    setRemessaFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userData?.empresaId || !selectedEstoque) return;

    try {
      const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'estoque', selectedEstoque.id);
      await updateDoc(docRef, {
        localizacao: formData.localizacao,
        estoqueMinimo: formData.estoqueMinimo,
        atualizadoEm: Timestamp.now(),
      });

      setSuccess('Estoque atualizado com sucesso!');
      handleCloseDialog();
      await loadEstoques();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao atualizar estoque: ' + err.message);
    }
  };

  const handleSaveRemessa = async () => {
    if (!userData?.empresaId || !selectedEstoque) return;

    if (!remessaFormData.quantidade || !remessaFormData.precoUnitario || !remessaFormData.dataEntrada) {
      setError('Preencha os campos obrigatórios: Quantidade, Preço Unitário e Data de Entrada');
      return;
    }

    try {
      const fornecedor = fornecedores.find(f => f.id === remessaFormData.fornecedorId);
      const remessasRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'estoque',
        selectedEstoque.id,
        'remessas'
      );

      const remessaData = {
        nfe: remessaFormData.nfe,
        lote: remessaFormData.lote,
        fornecedorId: remessaFormData.fornecedorId,
        fornecedorNome: fornecedor?.nome || '',
        quantidade: Number(remessaFormData.quantidade),
        precoUnitario: Number(remessaFormData.precoUnitario),
        dataEntrada: Timestamp.fromDate(new Date(remessaFormData.dataEntrada)),
      };

      if (isEditingRemessa && selectedRemessa) {
        const docRef = doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'estoque',
          selectedEstoque.id,
          'remessas',
          selectedRemessa.id
        );
        await updateDoc(docRef, {
          ...remessaData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Remessa atualizada com sucesso!');
      } else {
        await addDoc(remessasRef, {
          ...remessaData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Remessa criada com sucesso!');
      }

      handleCloseRemessaFormDialog();
      await loadRemessas(selectedEstoque.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar remessa: ' + err.message);
    }
  };

  const handleOpenDeleteRemessaDialog = (remessa: Remessa) => {
    setSelectedRemessa(remessa);
    setOpenDeleteRemessaDialog(true);
  };

  const handleCloseDeleteRemessaDialog = () => {
    setOpenDeleteRemessaDialog(false);
    setSelectedRemessa(null);
  };

  const handleDeleteRemessa = async () => {
    if (!userData?.empresaId || !selectedEstoque || !selectedRemessa) return;

    try {
      await deleteDoc(
        doc(
          db,
          'EMPRESAS',
          userData.empresaId,
          'estoque',
          selectedEstoque.id,
          'remessas',
          selectedRemessa.id
        )
      );
      setSuccess('Remessa excluída com sucesso!');
      handleCloseDeleteRemessaDialog();
      await loadRemessas(selectedEstoque.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir remessa: ' + err.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('pt-BR');
  };

  const filteredEstoques = estoques.filter((estoque) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      estoque.tipoNome.toLowerCase().includes(searchLower) ||
      estoque.descricaoNome.toLowerCase().includes(searchLower)
    );
  });

  return (
    <ProtectedRoute requiredRoute="/produtos/estoque">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Estoque
        </Typography>
        <Box className="flex-1" />
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
              label="Buscar por tipo ou descrição"
              placeholder="Digite o tipo ou descrição do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
            />
          </Box>
          <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 600, md: 900 } }}>
            <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
              <TableRow>
                <TableCell><strong>Foto</strong></TableCell>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell><strong>Descrição</strong></TableCell>
                <TableCell><strong>Especificação</strong></TableCell>
                <TableCell><strong>Localização</strong></TableCell>
                <TableCell align="center"><strong>Estoque Atual</strong></TableCell>
                <TableCell align="center"><strong>Estoque Mínimo</strong></TableCell>
                <TableCell align="right"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEstoques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum produto encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstoques.map((estoque) => (
                  <TableRow key={estoque.id}>
                  <TableCell>
                    {estoque.fotoUrl ? (
                      <Avatar src={estoque.fotoUrl} variant="square" sx={{ width: 40, height: 40 }} />
                    ) : (
                      <Avatar variant="square" sx={{ width: 40, height: 40, bgcolor: '#e0e0e0' }}>
                        <Image sx={{ color: '#9e9e9e' }} />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>{estoque.sku}</TableCell>
                  <TableCell>{estoque.tipoNome}</TableCell>
                  <TableCell>{estoque.descricaoNome}</TableCell>
                  <TableCell>{estoque.especificacaoNome || '-'}</TableCell>
                  <TableCell>{estoque.localizacao || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={estoque.quantidadeAtual}
                      color={
                        estoque.quantidadeAtual < estoque.estoqueMinimo
                          ? 'error'
                          : estoque.quantidadeAtual === estoque.estoqueMinimo
                          ? 'warning'
                          : 'success'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{estoque.estoqueMinimo}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(estoque)}
                      title="Editar Localização e Estoque Mínimo"
                      sx={{ color: '#ff9800' }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenRemessasDialog(estoque)}
                      title="Gerenciar Remessas"
                      sx={{ color: '#1976d2' }}
                    >
                      <LocalShipping />
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

      {/* Dialog de Edição de Estoque */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Estoque</DialogTitle>
        <DialogContent>
          {selectedEstoque && (
            <Box className="space-y-4 mt-2">
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" className="font-bold text-gray-600 mb-2">
                    Informações do Produto (Somente Leitura)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="SKU"
                        value={selectedEstoque.sku}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tipo"
                        value={selectedEstoque.tipoNome}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Descrição"
                        value={selectedEstoque.descricaoNome}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Especificação"
                        value={selectedEstoque.especificacaoNome || '-'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Fabricante"
                        value={selectedEstoque.fabricanteNome || '-'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Divider />

              <Typography variant="subtitle2" className="font-bold text-gray-600">
                Informações de Estoque (Editável)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Localização"
                    value={formData.localizacao}
                    onChange={(e) => handleInputChange('localizacao', e.target.value)}
                    placeholder="Ex: Depósito A - Prateleira 5"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Estoque Mínimo"
                    value={formData.estoqueMinimo}
                    onChange={(e) => handleInputChange('estoqueMinimo', Number(e.target.value))}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Remessas */}
      <Dialog open={openRemessasDialog} onClose={handleCloseRemessasDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box className="flex items-center justify-between">
            <Typography variant="h6">
              Remessas - {selectedEstoque?.sku}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LocalShipping />}
              onClick={() => handleOpenRemessaFormDialog()}
            >
              Nova Remessa
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEstoque && (
            <Box className="space-y-4 mt-2">
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" className="text-gray-600">
                        <strong>Quantidade Atual:</strong>
                      </Typography>
                      <Chip
                        label={`${selectedEstoque.quantidadeAtual} unidades`}
                        color={
                          selectedEstoque.quantidadeAtual < selectedEstoque.estoqueMinimo
                            ? 'error'
                            : selectedEstoque.quantidadeAtual === selectedEstoque.estoqueMinimo
                            ? 'warning'
                            : 'success'
                        }
                        className="mt-1"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" className="text-gray-600">
                        <strong>Estoque Mínimo:</strong>
                      </Typography>
                      <Typography variant="body1" className="mt-1">
                        {selectedEstoque.estoqueMinimo} unidades
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" className="text-gray-600">
                        <strong>Localização:</strong>
                      </Typography>
                      <Typography variant="body1" className="mt-1">
                        {selectedEstoque.localizacao || 'Não definida'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Divider />

              {loadingRemessas ? (
                <Box className="flex justify-center p-4">
                  <CircularProgress size={30} />
                </Box>
              ) : remessas.length === 0 ? (
                <Alert severity="info">Nenhuma remessa cadastrada</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell><strong>NFe</strong></TableCell>
                        <TableCell><strong>Lote</strong></TableCell>
                        <TableCell><strong>Fornecedor</strong></TableCell>
                        <TableCell align="center"><strong>Quantidade</strong></TableCell>
                        <TableCell align="right"><strong>Preço Unit.</strong></TableCell>
                        <TableCell><strong>Data Entrada</strong></TableCell>
                        <TableCell align="right"><strong>Ações</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {remessas.map((remessa) => (
                        <TableRow key={remessa.id}>
                          <TableCell>{remessa.nfe || '-'}</TableCell>
                          <TableCell>{remessa.lote || '-'}</TableCell>
                          <TableCell>{remessa.fornecedorNome || '-'}</TableCell>
                          <TableCell align="center">{remessa.quantidade}</TableCell>
                          <TableCell align="right">{formatCurrency(remessa.precoUnitario)}</TableCell>
                          <TableCell>{formatDate(remessa.dataEntrada)}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenRemessaFormDialog(remessa)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteRemessaDialog(remessa)}
                              title="Excluir"
                              sx={{ color: '#f44336' }}
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemessasDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cadastro/Edição de Remessa */}
      <Dialog open={openRemessaFormDialog} onClose={handleCloseRemessaFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingRemessa ? 'Editar Remessa' : 'Nova Remessa'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="NFe"
                value={remessaFormData.nfe}
                onChange={(e) => handleRemessaInputChange('nfe', e.target.value)}
                placeholder="Número da Nota Fiscal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Lote"
                value={remessaFormData.lote}
                onChange={(e) => handleRemessaInputChange('lote', e.target.value)}
                placeholder="Número do Lote"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Fornecedor"
                value={remessaFormData.fornecedorId}
                onChange={(e) => handleRemessaInputChange('fornecedorId', e.target.value)}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {fornecedores.map((fornecedor) => (
                  <MenuItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
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
                value={remessaFormData.quantidade}
                onChange={(e) => handleRemessaInputChange('quantidade', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Preço Unitário *"
                value={remessaFormData.precoUnitario}
                onChange={(e) => handleRemessaInputChange('precoUnitario', Number(e.target.value))}
                inputProps={{ step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data de Entrada *"
                value={remessaFormData.dataEntrada}
                onChange={(e) => handleRemessaInputChange('dataEntrada', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemessaFormDialog}>Cancelar</Button>
          <Button onClick={handleSaveRemessa} variant="contained">
            {isEditingRemessa ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Remessa */}
      <Dialog open={openDeleteRemessaDialog} onClose={handleCloseDeleteRemessaDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta remessa?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita e afetará a quantidade em estoque.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteRemessaDialog}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteRemessa} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}
