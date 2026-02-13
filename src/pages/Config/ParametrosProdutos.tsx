import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  MenuItem,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { customColors } from '../../theme';
import { ActionEdit, ActionDelete } from '../../components/TableActions';

// ==================== INTERFACES ====================
interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  templateNome: string;
}

interface AtributoValor {
  id: string;
  nome: string;
  categorias: string[]; // IDs das categorias vinculadas
}

interface Atributo {
  id: string;
  nome: string;
  unidade?: string;
  valores: AtributoValor[];
  categorias: string[]; // Todas as categorias que usam este atributo
  templateVar?: string;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ParametrosProdutos() {
  const { userData } = useAuth();
  const empresaId = userData?.empresaId;

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Estados de dados
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [atributos, setAtributos] = useState<Atributo[]>([]);

  // Dialog Categorias
  const [openCatDialog, setOpenCatDialog] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Categoria | null>(null);
  const [catForm, setCatForm] = useState({ nome: '', descricao: '', templateNome: '' });

  // Dialog de Confirmação de Exclusão
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  // Dialog Atributos
  const [openAtribDialog, setOpenAtribDialog] = useState(false);
  const [selectedAtrib, setSelectedAtrib] = useState<Atributo | null>(null);
  const [atribForm, setAtribForm] = useState({
    nome: '',
    templateVar: '',
    valores: [] as AtributoValor[]
  });

  // Estados para adicionar novo valor
  const [newValorNome, setNewValorNome] = useState('');
  const [newValorCategorias, setNewValorCategorias] = useState<string[]>([]);

  // Filtro na visualização de valores
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');


  // ==================== CARREGAMENTO DE DADOS ====================
  useEffect(() => {
    if (empresaId) loadData();
  }, [empresaId]);

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

  const loadData = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [catSnap, atribSnap] = await Promise.all([
        getDocs(query(collection(db, 'EMPRESAS', empresaId, 'categorias'), orderBy('nome'))),
        getDocs(query(collection(db, 'EMPRESAS', empresaId, 'atributos'), orderBy('nome')))
      ]);

      setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Categoria)));
      setAtributos(atribSnap.docs.map(d => ({ id: d.id, ...d.data() } as Atributo)));
    } catch (err) {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPERS ====================
  const generateVar = (name: string) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  // ==================== CATEGORIA CRUD ====================
  const handleOpenCat = (cat?: Categoria) => {
    setSelectedCat(cat || null);
    setCatForm(cat ? { ...cat } : { nome: '', descricao: '', templateNome: '' });
    setOpenCatDialog(true);
  };

  const handleSaveCat = async () => {
    if (!empresaId || !catForm.nome) return;
    try {
      setLoading(true);
      const data = { ...catForm, nome: catForm.nome.toUpperCase() };
      if (selectedCat) {
        await updateDoc(doc(db, 'EMPRESAS', empresaId, 'categorias', selectedCat.id), data);
        setSuccess('Categoria atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'EMPRESAS', empresaId, 'categorias'), data);
        setSuccess('Categoria criada com sucesso!');
      }
      setOpenCatDialog(false);
      loadData();
    } catch (err) {
      setError('Erro ao salvar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCat = async (id: string, nome: string) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Categoria',
      message: `Tem certeza que deseja excluir a categoria "${nome}"?`,
      onConfirm: async () => {
        if (!empresaId) return;
        try {
          await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'categorias', id));
          setSuccess('Categoria excluída com sucesso!');
          loadData();
        } catch (err) {
          setError('Erro ao excluir categoria.');
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  // ==================== ATRIBUTO CRUD ====================
  const handleOpenAtrib = (atrib?: Atributo) => {
    setSelectedAtrib(atrib || null);
    setAtribForm(atrib ? {
      nome: atrib.nome,
      templateVar: atrib.templateVar || generateVar(atrib.nome),
      valores: atrib.valores || []
    } : { nome: '', templateVar: '', valores: [] });

    setNewValorNome('');
    setNewValorCategorias([]);
    setOpenAtribDialog(true);
  };

  const handleSaveAtrib = async () => {
    if (!empresaId || !atribForm.nome) {
      setError('Nome do atributo é obrigatório');
      return;
    }
    try {
      setLoading(true);

      const categoriasUnicas = Array.from(
        new Set(atribForm.valores.flatMap(v => v.categorias))
      );

      const data = {
        nome: atribForm.nome.toUpperCase(),
        templateVar: atribForm.templateVar || generateVar(atribForm.nome),
        valores: atribForm.valores,
        categorias: categoriasUnicas
      };

      if (selectedAtrib) {
        await updateDoc(doc(db, 'EMPRESAS', empresaId, 'atributos', selectedAtrib.id), data);
        setSuccess('Atributo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'EMPRESAS', empresaId, 'atributos'), data);
        setSuccess('Atributo criado com sucesso!');
      }

      setOpenAtribDialog(false);
      await loadData();
    } catch (err: any) {
      setError('Erro ao salvar atributo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAtrib = (atrib: Atributo) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Atributo',
      message: `Tem certeza que deseja excluir o atributo "${atrib.nome}"?`,
      onConfirm: async () => {
        if (!empresaId) return;
        try {
          await deleteDoc(doc(db, 'EMPRESAS', empresaId, 'atributos', atrib.id));
          setSuccess('Atributo excluído com sucesso!');
          loadData();
        } catch (err) {
          setError('Erro ao excluir atributo.');
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  }


  // ==================== GESTÃO DE VALORES ====================
  const handleAddValor = () => {
    if (!newValorNome.trim() || newValorCategorias.length === 0) return;

    const novoValor: AtributoValor = {
      id: Date.now().toString(),
      nome: newValorNome,
      categorias: newValorCategorias
    };

    setAtribForm({
      ...atribForm,
      valores: [...atribForm.valores, novoValor]
    });

    setNewValorNome('');
    setNewValorCategorias([]);
  };

  const handleRemoveValor = (valor: AtributoValor) => {
    setConfirmDialog({
      open: true,
      title: 'Remover Valor',
      message: `Tem certeza que deseja remover o valor "${valor.nome}"?`,
      onConfirm: () => {
        setAtribForm({
          ...atribForm,
          valores: atribForm.valores.filter(v => v.id !== valor.id)
        });
        setConfirmDialog(p => ({ ...p, open: false }));
      }
    });
  };

  const toggleCategoriaInNew = (catId: string) => {
    setNewValorCategorias(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };


  // ==================== RENDER ====================
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Parâmetros de Produtos</Typography>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} textColor="primary" indicatorColor="primary">
          <Tab label="Categorias" icon={<CategoryIcon />} iconPosition="start" />
          <Tab label="Atributos" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ==================== TAB CATEGORIAS ==================== */}
      {tabIndex === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCat()}>
              Nova Categoria
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Template Nome</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">Nenhuma categoria cadastrada</TableCell>
                  </TableRow>
                ) : (
                  categorias.map((cat) => (
                    <TableRow key={cat.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{cat.nome}</TableCell>
                      <TableCell><code style={{ color: '#1976d2' }}>{cat.templateNome || '-'}</code></TableCell>
                      <TableCell align="right">
                        <ActionEdit title="Editar Categoria" onClick={() => handleOpenCat(cat)} />
                        <ActionDelete title="Excluir Categoria" onClick={() => handleDeleteCat(cat.id, cat.nome)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ==================== TAB ATRIBUTOS ==================== */}
      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenAtrib()}>
              Novo Atributo
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Atributo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Variável</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Categorias</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {atributos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">Nenhum atributo cadastrado</TableCell>
                  </TableRow>
                ) : (
                  atributos.map((atrib) => (
                    <TableRow key={atrib.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{atrib.nome}</TableCell>
                      <TableCell>
                        <Chip label={`$${atrib.templateVar}`} size="small" variant="filled" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {atrib.categorias?.map(cid => (
                            <Chip
                              key={cid}
                              label={categorias.find(c => c.id === cid)?.nome || '???'}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <ActionEdit title="Editar Atributo" onClick={() => handleOpenAtrib(atrib)} />
                        <ActionDelete title="Excluir Atributo" onClick={() => handleDeleteAtrib(atrib)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ==================== DIALOG CATEGORIA ==================== */}
      <Dialog open={openCatDialog} onClose={() => setOpenCatDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Configurar Categoria</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Nome da Categoria"
              fullWidth
              size="small"
              value={catForm.nome}
              onChange={e => setCatForm({ ...catForm, nome: e.target.value.toUpperCase() })}
            />
            <TextField
              label="Template de Nome"
              fullWidth
              size="small"
              value={catForm.templateNome}
              onChange={e => setCatForm({ ...catForm, templateNome: e.target.value })}
              helperText="Ex: $categoria $valor $unidade"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCatDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveCat} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== DIALOG ATRIBUTO ==================== */}
      <Dialog open={openAtribDialog} onClose={() => setOpenAtribDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" /> Configurar Atributo
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              {/* Nome do Atributo */}
              <Box sx={{ flex: 2 }}>
                <TextField
                  label="Nome do Atributo"
                  fullWidth
                  size="small"
                  value={atribForm.nome}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setAtribForm({ ...atribForm, nome: val, templateVar: generateVar(val) });
                  }}
                />
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', mt: 0.5, display: 'block' }}>
                  Variável sugerida: ${generateVar(atribForm.nome)}
                </Typography>
              </Box>

              {/* Filtro Dropdown */}
              <Box sx={{ flex: 1 }}>
                <TextField
                  select
                  label="Filtrar Valores"
                  size="small"
                  fullWidth
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categorias.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            <Divider>
              <Typography variant="button" color="primary" fontWeight="bold">
                Adicionar Valores
              </Typography>
            </Divider>

            <Grid container spacing={2} alignItems="flex-start">
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  label="Valor"
                  fullWidth
                  size="small"
                  value={newValorNome}
                  onChange={e => setNewValorNome(e.target.value)}
                  placeholder="Ex: kO, 0805"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Categorias:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {categorias.map(cat => (
                    <Chip
                      key={cat.id}
                      label={cat.nome}
                      size="small"
                      variant={newValorCategorias.includes(cat.id) ? "filled" : "outlined"}
                      color={newValorCategorias.includes(cat.id) ? "primary" : "default"}
                      onClick={() => toggleCategoriaInNew(cat.id)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleAddValor}
                  disabled={!newValorNome.trim() || newValorCategorias.length === 0}
                >
                  Adicionar
                </Button>
              </Grid>
            </Grid>

            {/* Tabela de Valores */}
            <TableContainer component={Paper} sx={{ maxHeight: 300, mt: 2, border: '1px solid #ddd' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: customColors.tableHeader }}>Valor</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: customColors.tableHeader }}>Categorias</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: customColors.tableHeader }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {atribForm.valores
                    .filter(v => !filtroCategoria || v.categorias.includes(filtroCategoria))
                    .map((valor) => (
                      <TableRow key={valor.id}>
                        <TableCell>{valor.nome}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {valor.categorias.map(catId => (
                              <Chip
                                key={catId}
                                label={categorias.find(c => c.id === catId)?.nome || '???'}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <ActionDelete onClick={() => handleRemoveValor(valor)} title="Remover Valor" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {atribForm.valores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Nenhum valor cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAtribDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleSaveAtrib}
            variant="contained"
            color="success"
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(255,255,255,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </Container>
  );
};
