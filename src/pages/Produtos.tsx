import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { customColors } from "../theme";
import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  updateDoc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { FileUpload } from '../components/FileUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Alert,
  InputAdornment,
  MenuItem,

  Divider,
  Stack,
  Tooltip,
  Checkbox,
  FormControlLabel,
  TablePagination,
  CircularProgress
} from "@mui/material";
import { formatCnpjCpf, formatTelefone, formatCep } from '../utils/masks';
import { ActionEdit, ActionDelete } from '../components/TableActions';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Smartphone as SmartphoneIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';

// --- Interfaces ---
interface Categoria {
  id: string;
  nome: string;
  templateNome?: string;
}

interface AtributoValor {
  id: string;
  nome: string;
  categorias: string[];
}

interface Atributo {
  id: string;
  nome: string;
  unidade?: string;
  valores: AtributoValor[];
  categorias: string[];
  templateVar?: string;
}

interface Produto {
  id: string;
  partNumber: string; // SKU ou Código do Fabricante
  nome: string;
  categoriaId: string;
  fabricanteId: string;
  atributosValores: Record<string, string>;
  fotos?: string[];
  datasheets?: string[];
  localizacao?: string;
  estoqueMinimo?: number;
  disponivelParaVenda?: boolean;
  observacao?: string;
  empresaId: string;
  criadoEm: string;
}

interface Fabricante {
  id: string;
  nome: string;
}

export function Produtos() {
  const { userData } = useAuth();
  const empresaId = userData?.empresaId;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openFab, setOpenFab] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    partNumber: "",
    nome: "",
    categoriaId: "",
    fabricanteId: "",
    atributosValores: {} as Record<string, string>,
    fotos: [] as string[],
    datasheets: [] as string[],
    localizacao: "",
    estoqueMinimo: 0,
    disponivelParaVenda: true, // Default true para produtos
    observacao: ""
  });

  // Fabricante Rápido
  const [newFabName, setNewFabName] = useState("");
  const [editingFabId, setEditingFabId] = useState<string | null>(null);
  const [editingFabName, setEditingFabName] = useState("");

  useEffect(() => {
    if (empresaId) loadInitialData();
  }, [empresaId]);

  const loadInitialData = async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const [catSnap, atribSnap, fabSnap, prodSnap] = await Promise.all([
        getDocs(query(collection(db, "EMPRESAS", empresaId, "categorias"), orderBy("nome"))),
        getDocs(query(collection(db, "EMPRESAS", empresaId, "atributos"), orderBy("nome"))),
        getDocs(query(collection(db, "EMPRESAS", empresaId, "fabricantes"), orderBy("nome"))),
        getDocs(query(collection(db, "EMPRESAS", empresaId, "produtos"), orderBy("nome")))
      ]);

      setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Categoria)));
      setAtributos(atribSnap.docs.map(d => ({ id: d.id, ...d.data() } as Atributo)));
      setFabricantes(fabSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fabricante)));
      setProdutos(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Produto)));
    } catch (err: any) {
      setError("Erro ao carregar dados.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Nome Automático Inteligente (Core Logic) ---
  useEffect(() => {
    if (!formData.categoriaId) {
      // Se não tem categoria, não gera nome automático (ou limpar?)
      // setFormData(prev => ({ ...prev, nome: "" })); 
      return;
    }

    const categoria = categorias.find(c => c.id === formData.categoriaId);
    if (!categoria) return;

    // Mapa de substituições
    const replacements: Record<string, string> = { categoria: categoria.nome };

    // Adiciona valores dos atributos ao mapa
    atributos.forEach(atrib => {
      // Gera nome da variável (normalizado)
      const vName = atrib.templateVar || atrib.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

      const valorRaw = formData.atributosValores[atrib.id];
      if (valorRaw) {
        const unidade = atrib.unidade || "";
        // Se o valor já contém a unidade, não duplica
        replacements[vName] = (valorRaw.endsWith(unidade)) ? valorRaw : `${valorRaw}${unidade}`;
      }
    });

    // Adiciona Fabricante ao mapa (se selecionado)
    const fabricante = fabricantes.find(f => f.id === formData.fabricanteId);
    if (fabricante) {
      replacements['fab'] = fabricante.nome;
      replacements['fabricante'] = fabricante.nome;
    }

    let template = categoria.templateNome?.trim() || "";
    let autoNome = "";

    if (template !== "") {
      // Substitui variáveis do template (ex: $tipo, $fab)
      autoNome = template.replace(/\$([a-z0-9]+)/gi, (_match, p1) => {
        const key = p1.toLowerCase();
        return replacements[key] !== undefined && replacements[key] !== "" ? replacements[key] + " " : "";
      });
      // Limpa sobras de template
      autoNome = autoNome.replace(/\s+/g, " ").trim();
    }

    // Fallback: Se não tem template ou resultado vazio, concatena Categoria + Atributos
    if (!autoNome || template === "") {
      const partes = [categoria.nome];
      if (fabricante) partes.push(fabricante.nome);

      atributos.filter(a => a.categorias.includes(categoria.id)).forEach(atrib => {
        const valor = formData.atributosValores[atrib.id];
        if (valor) {
          const unidade = atrib.unidade || "";
          partes.push((valor.endsWith(unidade)) ? valor : `${valor}${unidade}`);
        }
      });
      autoNome = partes.join(" ");
    }

    setFormData(prev => ({ ...prev, nome: autoNome }));
  }, [formData.atributosValores, formData.categoriaId, formData.fabricanteId, categorias, atributos, fabricantes]);

  const handleOpenDialog = (prod?: Produto) => {
    if (prod) {
      setSelectedProduto(prod);
      setFormData({
        partNumber: prod.partNumber || "",
        nome: prod.nome,
        categoriaId: prod.categoriaId,
        fabricanteId: prod.fabricanteId || "",
        atributosValores: prod.atributosValores || {},
        fotos: prod.fotos || [],
        datasheets: prod.datasheets || [],
        localizacao: prod.localizacao || "",
        estoqueMinimo: prod.estoqueMinimo || 0,
        disponivelParaVenda: prod.disponivelParaVenda ?? true,
        observacao: prod.observacao || ""
      });
    } else {
      setSelectedProduto(null);
      setFormData({
        partNumber: "",
        nome: "",
        categoriaId: "",
        fabricanteId: "",
        atributosValores: {},
        fotos: [],
        datasheets: [],
        localizacao: "",
        estoqueMinimo: 0,
        disponivelParaVenda: true,
        observacao: ""
      });
    }
    setOpen(true);
    setError("");
  };

  const handleSave = async () => {
    if (!empresaId || !formData.categoriaId || !formData.nome) {
      setError("Categoria e Nome são obrigatórios");
      return;
    }
    try {
      setLoading(true);

      const { fotos, datasheets, ...baseData } = formData;
      const data = {
        ...baseData,
        empresaId,
        atualizadoEm: new Date().toISOString(),
        fotos: fotos || [],
        datasheets: datasheets || []
      };

      if (selectedProduto) {
        await updateDoc(doc(db, "EMPRESAS", empresaId, "produtos", selectedProduto.id), data);
      } else {
        await addDoc(collection(db, "EMPRESAS", empresaId, "produtos"), {
          ...data,
          criadoEm: new Date().toISOString()
        });
      }

      setOpen(false);
      loadInitialData();
      setSuccess("Produto salvo com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar produto.");
    } finally {
      setLoading(false);
      setProdutoToDelete(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setProdutoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!empresaId || !produtoToDelete) return;
    try {
      setDeleteDialogOpen(false);
      await deleteDoc(doc(db, "EMPRESAS", empresaId, "produtos", produtoToDelete));
      loadInitialData();
      setSuccess("Produto excluído!");
    } catch (err) {
      setError("Erro ao excluir.");
    }
  };

  // --- Gestão de Fabricantes ---
  const handleQuickFab = async () => {
    if (!empresaId || !newFabName) return;
    try {
      const docRef = await addDoc(collection(db, "EMPRESAS", empresaId, "fabricantes"), { nome: newFabName.toUpperCase() });
      setFabricantes(prev => [...prev, { id: docRef.id, nome: newFabName.toUpperCase() }].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData(prev => ({ ...prev, fabricanteId: docRef.id }));
      setNewFabName("");
    } catch (err) { setError("Erro ao criar fabricante."); }
  };

  const handleUpdateFab = async (id: string) => {
    if (!empresaId || !editingFabName) return;
    try {
      await updateDoc(doc(db, "EMPRESAS", empresaId, "fabricantes", id), { nome: editingFabName.toUpperCase() });
      setFabricantes(prev => prev.map(f => f.id === id ? { ...f, nome: editingFabName.toUpperCase() } : f));
      setEditingFabId(null);
      setEditingFabName("");
    } catch (err) { setError("Erro ao atualizar fabricante."); }
  };

  const handleDeleteFab = async (id: string) => {
    if (!empresaId) return;
    if (!window.confirm("Excluir este fabricante? Ação arriscada se houver produtos vinculados.")) return;
    try {
      await deleteDoc(doc(db, "EMPRESAS", empresaId, "fabricantes", id));
      setFabricantes(prev => prev.filter(f => f.id !== id));
    } catch (err) { setError("Erro ao excluir fabricante."); }
  };

  // --- Renderização Tabela ---
  const filteredProdutos = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return produtos.filter(p => p.nome.toUpperCase().includes(term) || p.partNumber?.toUpperCase().includes(term));
  }, [produtos, searchTerm]);

  const displayedProdutos = filteredProdutos.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon fontSize="large" sx={{ color: '#1976d2' }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>Produtos / Equipamentos</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadInitialData}>Atualizar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Novo Produto</Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL DE PRODUTOS</Typography>
            <Typography variant="h5" fontWeight="bold">
              {loading ? <CircularProgress size={20} /> : produtos.length}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por Nome ou Part Number..."
          fullWidth size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }}
        />
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer sx={{ boxShadow: 0, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Cód/Part Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nome (Padrão)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fabricante</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Venda</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Anexos</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedProdutos.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#555', py: 0.25 }}>
                    {item.partNumber || '-'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', py: 0.25 }}>{item.nome}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{categorias.find(c => c.id === item.categoriaId)?.nome || '-'}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{fabricantes.find(f => f.id === item.fabricanteId)?.nome || '-'}</TableCell>
                  <TableCell align="center" sx={{ py: 0.25 }}>
                    {item.disponivelParaVenda ? (
                      <Tooltip title="Disponível para Venda">
                        <CheckCircleIcon color="success" fontSize="small" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Uso Interno">
                        <CancelIcon color="action" sx={{ opacity: 0.3 }} fontSize="small" />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 0.25 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {(item.fotos?.length || 0) > 0 && <ImageIcon fontSize="small" color="primary" />}
                      {(item.datasheets?.length || 0) > 0 && <PdfIcon fontSize="small" color="error" />}
                      {(!item.fotos?.length && !item.datasheets?.length) && "-"}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.25 }}>
                    <ActionEdit title="Editar Produto" onClick={() => handleOpenDialog(item)} />
                    <ActionDelete title="Excluir Produto" onClick={() => handleDeleteClick(item.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredProdutos.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas/pág:"
        />
      </Paper>

      {/* DIALOG CADASTRO */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{selectedProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Nome Automático */}
            <Paper sx={{ p: 2, bgcolor: '#f0f7ff', border: '1px solid #1976d2' }}>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>NOME AUTOMÁTICO (Prévia):</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formData.nome || "Aguardando informações..."}</Typography>
            </Paper>

            {/* Grid Form */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>

              <TextField
                label="Part Number / SKU"
                fullWidth
                size="small"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
              />

              <TextField
                select
                label="Categoria *"
                fullWidth
                size="small"
                value={formData.categoriaId}
                onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                required
              >
                {categorias.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
              </TextField>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  label="Fabricante"
                  fullWidth
                  size="small"
                  value={formData.fabricanteId}
                  onChange={(e) => setFormData({ ...formData, fabricanteId: e.target.value })}
                >
                  <MenuItem value="">- Selecione -</MenuItem>
                  {fabricantes.map(fab => <MenuItem key={fab.id} value={fab.id}>{fab.nome}</MenuItem>)}
                </TextField>
                <Tooltip title="Gerenciar Fabricantes">
                  <IconButton color="primary" onClick={() => setOpenFab(true)} sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <TextField
                label="Localização"
                fullWidth
                size="small"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value.toUpperCase() })}
                placeholder="Ex: PRATELEIRA A3"
              />

              <TextField
                label="Estoque Mínimo"
                type="number"
                fullWidth
                size="small"
                value={formData.estoqueMinimo}
                onChange={(e) => setFormData({ ...formData, estoqueMinimo: parseInt(e.target.value) || 0 })}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.disponivelParaVenda}
                    onChange={(e) => setFormData({ ...formData, disponivelParaVenda: e.target.checked })}
                    color="success"
                  />
                }
                label="Disponível para Venda"
                sx={{ border: '1px solid #ddd', borderRadius: 1, m: 0, px: 2, width: '100%', color: formData.disponivelParaVenda ? 'success.main' : 'text.secondary' }}
              />

              {/* Observação - Full Width */}
              <Box sx={{ gridColumn: { xs: '1fr', sm: '1 / -1' } }}>
                <TextField
                  label="Observação"
                  fullWidth
                  size="small"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  multiline
                  rows={2}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 1 }}>
              <Typography variant="button" color="primary">Atributos da Categoria</Typography>
            </Divider>

            {!formData.categoriaId && <Typography variant="caption" color="text.secondary">Selecione uma categoria para ver os atributos.</Typography>}

            {/* Atributos Grid (3 colunas) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              {atributos.filter(a => a.categorias.includes(formData.categoriaId)).map(atrib => (
                <TextField
                  key={atrib.id}
                  select
                  label={atrib.nome}
                  fullWidth size="small"
                  value={formData.atributosValores[atrib.id] || ""}
                  onChange={(e) => setFormData({ ...formData, atributosValores: { ...formData.atributosValores, [atrib.id]: e.target.value } })}
                >
                  <MenuItem value="">- Nenhum -</MenuItem>
                  {atrib.valores?.filter(v => v.categorias.includes(formData.categoriaId)).map(v => (
                    <MenuItem key={v.id} value={v.nome}>{v.nome}</MenuItem>
                  ))}
                </TextField>
              ))}
            </Box>

            {/* Fotos */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="button" color="primary">Fotos</Typography>
            </Divider>
            {!selectedProduto && (
              <Alert severity="info" sx={{ mb: 2 }}>
                💡 <strong>Dica:</strong> Salve o produto primeiro antes de adicionar fotos para evitar problemas.
              </Alert>
            )}
            <FileUpload
              empresaId={empresaId!}
              componenteId={selectedProduto?.id || `temp-${Date.now()}`}
              tipo="fotos"
              arquivos={formData.fotos}
              onUpdate={(novos) => setFormData({ ...formData, fotos: novos })}
            />

            {/* Datasheets */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="button" color="primary">Datasheets / Documentação</Typography>
            </Divider>
            {!selectedProduto && (
              <Alert severity="info" sx={{ mb: 2 }}>
                💡 <strong>Dica:</strong> Salve o produto primeiro antes de adicionar datasheets para evitar problemas.
              </Alert>
            )}
            <FileUpload
              empresaId={empresaId!}
              componenteId={selectedProduto?.id || `temp-${Date.now()}`}
              tipo="datasheets"
              arquivos={formData.datasheets}
              onUpdate={(novos) => setFormData({ ...formData, datasheets: novos })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>Salvar Produto</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG FABRICANTES */}
      <Dialog open={openFab} onClose={() => { setOpenFab(false); setNewFabName(""); setEditingFabId(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Gerenciar Fabricantes</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, mt: 1 }}>
            <TextField
              label="Novo Fabricante"
              fullWidth
              size="small"
              value={newFabName}
              onChange={(e) => setNewFabName(e.target.value.toUpperCase())}
            />
            <Button variant="contained" onClick={handleQuickFab} disabled={!newFabName.trim()}>
              <AddIcon />
            </Button>
          </Box>
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {fabricantes.map(fab => (
              <Box key={fab.id} sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
                {editingFabId === fab.id ? (
                  <>
                    <TextField size="small" value={editingFabName} onChange={e => setEditingFabName(e.target.value.toUpperCase())} sx={{ bgcolor: 'white' }} />
                    <Box>
                      <IconButton color="success" onClick={() => handleUpdateFab(fab.id)}><CheckCircleIcon /></IconButton>
                      <IconButton color="error" onClick={() => setEditingFabId(null)}><CancelIcon /></IconButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography sx={{ px: 1 }}>{fab.nome}</Typography>
                    <Box>
                      <ActionEdit size="small" title="Editar Fabricante" onClick={() => { setEditingFabId(fab.id); setEditingFabName(fab.nome); }} />
                      <ActionDelete size="small" title="Excluir Fabricante" onClick={() => handleDeleteFab(fab.id)} />
                    </Box>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenFab(false)}>Fechar</Button></DialogActions>
      </Dialog>

      {/* DIALOG DELETE */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        message={
          <Typography>Tem certeza que deseja excluir este produto?</Typography>
        }
      />
    </Box>
  );
}
