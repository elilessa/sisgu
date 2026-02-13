import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { customColors } from '../theme';
import {
  collection,
  query,
  getDocs,
  addDoc,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  InputAdornment,
  Tooltip,
  IconButton,
  Chip,
  CircularProgress,
  Collapse,
  Autocomplete,
  TablePagination
} from '@mui/material';
import {
  AddBox as AddBoxIcon,
  AllInbox as AllInboxIcon,
  Search as SearchIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Delete as DeleteIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';

// --- Interfaces ---

interface Produto { // Renamed from Componente to match system entity
  id: string;
  nome: string;
  partNumber: string;
  categoriaId: string;
  fabricanteId: string;
  estoqueMinimo?: number;
  disponivelParaVenda?: boolean;
  maiorCusto?: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Remessa {
  id: string;
  componenteId: string; // Keeps the name but refers to Produto ID
  quantidadeAtual: number;
  precoCusto: number;
  nfe: string;
  lote: string;
  dataEntrada: any; // Timestamp
  fornecedorId?: string;
  fornecedorNome?: string;
  criadoEm: any;
}

// --- Componente da Linha (Row) para Expansão ---
function Row(props: {
  row: Produto,
  saldo: number,
  remessas: Remessa[],
  onAdd: (p: Produto) => void,
  onDeleteRemessa: (id: string, nome: string) => void
}) {
  const { row, saldo, remessas, onAdd, onDeleteRemessa } = props;
  const [open, setOpen] = useState(false);
  const min = row.estoqueMinimo || 0;
  const isLow = min > 0 && saldo < min;

  // Ordenar remessas da mais recente para a mais antiga
  const sortedRemessas = [...remessas].sort((a, b) => {
    const dateA = a.dataEntrada?.toDate ? a.dataEntrada.toDate() : new Date(a.dataEntrada);
    const dateB = b.dataEntrada?.toDate ? b.dataEntrada.toDate() : new Date(b.dataEntrada);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <>
      <TableRow hover sx={{ bgcolor: isLow ? '#fff4e5' : 'inherit' }}>
        <TableCell sx={{ py: 0.25 }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', py: 0.25 }}>{row.partNumber || '-'}</TableCell>
        <TableCell sx={{ fontWeight: 'bold', py: 0.25 }}>{row.nome}</TableCell>
        <TableCell align="center" sx={{ py: 0.25 }}>{min > 0 ? min : '-'}</TableCell>
        <TableCell align="center" sx={{ py: 0.25 }}>
          <Typography sx={{
            fontWeight: 'bold',
            color: saldo > 0 ? 'success.main' : (min > 0 ? 'error.main' : 'text.secondary')
          }} component="span">
            {saldo}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 0.25 }}>
          {row.maiorCusto ?
            row.maiorCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
            '-'}
        </TableCell>
        <TableCell align="center" sx={{ py: 0.25 }}>
          {row.disponivelParaVenda && (
            <Tooltip title="Disponível para Venda">
              <MonetizationOnIcon color="success" fontSize="small" />
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="center" sx={{ py: 0.25 }}>
          {saldo === 0 ?
            <Chip label="Sem Estoque" size="small" color="default" variant="outlined" /> :
            (isLow ? <Chip label="Baixo Estoque" size="small" color="warning" /> : <Chip label="OK" size="small" color="success" variant="outlined" />)
          }
        </TableCell>
        <TableCell align="right" sx={{ py: 0.25 }}>
          <Tooltip title="Nova Entrada">
            <Button
              variant="contained"
              size="small"
              startIcon={<AddBoxIcon />}
              onClick={() => onAdd(row)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Entrada
            </Button>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Detalhes das Entradas (Remessas)
              </Typography>
              {sortedRemessas.length > 0 ? (
                <Table size="small" aria-label="purchases">
                  <TableHead sx={{ backgroundColor: '#f1f8e9' }}> {/* A slightly different but coordinating color for nested table */}
                    <TableRow>
                      <TableCell><strong>Data Entrada</strong></TableCell>
                      <TableCell><strong>Fornecedor</strong></TableCell>
                      <TableCell><strong>NFe</strong></TableCell>
                      <TableCell><strong>Lote</strong></TableCell>
                      <TableCell align="right"><strong>Custo Un.</strong></TableCell>
                      <TableCell align="right"><strong>Qtd. Lote</strong></TableCell>
                      <TableCell align="center"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedRemessas.map((remessa) => {
                      const dataFormatada = remessa.dataEntrada?.toDate
                        ? remessa.dataEntrada.toDate().toLocaleDateString('pt-BR')
                        : new Date(remessa.dataEntrada).toLocaleDateString('pt-BR');

                      return (
                        <TableRow key={remessa.id}>
                          <TableCell component="th" scope="row" sx={{ py: 0.25 }}>{dataFormatada}</TableCell>
                          <TableCell sx={{ py: 0.25 }}>{remessa.fornecedorNome || '-'}</TableCell>
                          <TableCell sx={{ py: 0.25 }}>{remessa.nfe || '-'}</TableCell>
                          <TableCell sx={{ py: 0.25 }}>{remessa.lote || '-'}</TableCell>
                          <TableCell align="right" sx={{ py: 0.25 }}>{remessa.precoCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                          <TableCell align="right" sx={{ py: 0.25 }}>{remessa.quantidadeAtual}</TableCell>
                          <TableCell align="center" sx={{ py: 0.25 }}>
                            <Tooltip title="Excluir Remessa (Teste)">
                              <IconButton size="small" color="error" onClick={() => onDeleteRemessa(remessa.id, `${remessa.lote} - ${remessa.nfe}`)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ py: 2, display: 'block' }}>
                  Nenhuma entrada ativa encontrada para este item.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// --- Componente Principal ---
export function Estoque() {
  const { userData } = useAuth();
  const empresaId = userData?.empresaId;

  // Estados de Dados
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [remessasMapping, setRemessasMapping] = useState<Record<string, Remessa[]>>({}); // Mapa: produtoId -> Array de Remessas
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [custos, setCustos] = useState<Record<string, number>>({});

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [remessaToDelete, setRemessaToDelete] = useState<{ id: string, identificacao: string } | null>(null);

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Estado do Formulário de Entrada
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    fornecedor: null as Fornecedor | null,
    nfe: "",
    lote: "",
    precoCusto: "",
    quantidade: "",
    dataEntrada: new Date().toISOString().split('T')[0]
  });

  // 1. Carregar Dados
  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);

    // Queries - Updated to use 'produtos' instead of 'componentes'
    const qProd = query(collection(db, "EMPRESAS", empresaId, "produtos"), orderBy("nome"));
    const qForn = query(collection(db, "EMPRESAS", empresaId, "fornecedores"), orderBy("nome"));
    const qRemessas = query(collection(db, "EMPRESAS", empresaId, "remessas"), where("quantidadeAtual", ">", 0));

    // Carregar Estáticos (Produtos e Fornecedores)
    Promise.all([getDocs(qProd), getDocs(qForn)]).then(([snapProd, snapForn]) => {
      setProdutos(snapProd.docs.map(d => ({ id: d.id, ...d.data() } as Produto)));
      setFornecedores(snapForn.docs.map(d => ({ id: d.id, ...d.data() } as Fornecedor)));

      // Listener de Remessas
      const unsubscribe = onSnapshot(qRemessas, (remessaSnap) => {
        const mapRemessas: Record<string, Remessa[]> = {};
        const mapSaldos: Record<string, number> = {};
        const mapCustos: Record<string, number> = {};

        remessaSnap.docs.forEach(d => {
          const data = d.data() as Remessa;
          const prodId = data.componenteId;
          const remessaObj = { ...data, id: d.id };

          // Agrupar Remessas
          if (!mapRemessas[prodId]) mapRemessas[prodId] = [];
          mapRemessas[prodId].push(remessaObj);

          // Calcular Saldos
          mapSaldos[prodId] = (mapSaldos[prodId] || 0) + data.quantidadeAtual;
          mapCustos[prodId] = (mapCustos[prodId] || 0) + (data.quantidadeAtual * data.precoCusto);
        });

        setRemessasMapping(mapRemessas);
        setSaldos(mapSaldos);
        setCustos(mapCustos);
        setLoading(false);
      });

      return () => unsubscribe();
    }).catch(err => {
      console.error(err);
      setError("Erro ao carregar dados.");
      setLoading(false);
    });

  }, [empresaId]);

  // Handlers
  const handleOpenEntrada = (prod: Produto) => {
    setSelectedProduto(prod);
    setFormData({
      fornecedor: null, // Resetar fornecedor
      nfe: "",
      lote: "",
      precoCusto: "",
      quantidade: "",
      dataEntrada: new Date().toISOString().split('T')[0]
    });
    setError("");
    setSuccess("");
    setOpenDialog(true);
  };

  const handleSaveEntrada = async () => {
    if (!empresaId || !selectedProduto || !formData.quantidade || !formData.precoCusto || !formData.fornecedor) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    try {
      const qtd = parseInt(formData.quantidade);
      const preco = parseFloat(formData.precoCusto.replace(',', '.'));

      const novaRemessa = {
        empresaId,
        componenteId: selectedProduto.id, // Using the same field name for compatibility, but it refers to Produto
        nomeComponenteSnapshot: selectedProduto.nome,
        partNumberSnapshot: selectedProduto.partNumber,
        nfe: formData.nfe.toUpperCase(),
        lote: formData.lote.toUpperCase(),
        precoCusto: preco,
        quantidadeEntrada: qtd,
        quantidadeAtual: qtd,
        dataEntrada: Timestamp.fromDate(new Date(formData.dataEntrada)),
        fornecedorId: formData.fornecedor.id,
        fornecedorNome: formData.fornecedor.nome,
        criadoEm: Timestamp.now()
      };

      await addDoc(collection(db, "EMPRESAS", empresaId, "remessas"), novaRemessa);

      // Verificar e atualizar o Maior Custo do Produto
      const custoAtual = selectedProduto.maiorCusto || 0;
      if (preco > custoAtual) {
        // Updating 'produtos' collection now
        await updateDoc(doc(db, "EMPRESAS", empresaId, "produtos", selectedProduto.id), {
          maiorCusto: preco
        });

        // Atualiza o estado local para a UI refletir imediatamente
        setProdutos(prev => prev.map(c =>
          c.id === selectedProduto.id ? { ...c, maiorCusto: preco } : c
        ));
      }

      setSuccess(`Entrada registrada com sucesso!`);
      setOpenDialog(false);
    } catch (err) {
      setError("Erro ao salvar entrada.");
    }
  };

  const handleDeleteRemessa = async (id: string, identificacao: string) => {
    setRemessaToDelete({ id, identificacao });
  };

  const confirmDeleteRemessa = async () => {
    if (!remessaToDelete) return;
    try {
      await deleteDoc(doc(db, "EMPRESAS", empresaId!, "remessas", remessaToDelete.id));
      setSuccess("Remessa excluída.");
    } catch (err) {
      setError("Erro ao excluir remessa.");
    } finally {
      setRemessaToDelete(null);
    }
  };

  // Filtros e Totais
  const filteredProdutos = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return produtos.filter(c =>
      c.nome.toUpperCase().includes(term) ||
      (c.partNumber || "").toUpperCase().includes(term)
    );
  }, [produtos, searchTerm]);

  const globalTotalItens = Object.values(saldos).reduce((a, b) => a + b, 0);
  const globalTotalValor = Object.values(custos).reduce((a, b) => a + b, 0);

  // Dados da página atual
  const displayedProdutos = filteredProdutos.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Controle de Estoque
        </Typography>
        <Box className="flex-1" />
      </Box>

      {/* Cards Totais - Converted to Box CSS Grid to avoid MUI Grid version conflicts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">ITENS EM ESTOQUE</Typography>
          <Typography variant="h5" fontWeight="bold">
            {loading ? <CircularProgress size={20} /> : globalTotalItens.toLocaleString()}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">VALOR TOTAL ESTIMADO</Typography>
          <Typography variant="h5" fontWeight="bold">
            {loading ? <CircularProgress size={20} /> : globalTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Typography>
        </Paper>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Filtros de pesquisa */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Buscar Produto (Nome ou Part Number)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0); // Resetar página ao buscar
          }}
          sx={{ minWidth: 250 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }}
        />
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer sx={{ boxShadow: 0, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
              <TableRow>
                <TableCell width="50" />
                <TableCell><strong>Part Number</strong></TableCell>
                <TableCell><strong>Produto</strong></TableCell>
                <TableCell align="center"><strong>Estoque Mín.</strong></TableCell>
                <TableCell align="center"><strong>Saldo Atual</strong></TableCell>
                <TableCell align="center"><strong>Maior Custo</strong></TableCell>
                <TableCell align="center"><strong>Venda</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedProdutos.map((prod) => (
                <Row
                  key={prod.id}
                  row={prod}
                  saldo={saldos[prod.id] || 0}
                  remessas={remessasMapping[prod.id] || []}
                  onAdd={handleOpenEntrada}
                  onDeleteRemessa={handleDeleteRemessa}
                />
              ))}
              {filteredProdutos.length === 0 && !loading && (
                <TableRow><TableCell colSpan={9} align="center">Nenhum produto encontrado.</TableCell></TableRow>
              )}
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
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        />
      </Paper>

      {/* DIALOG DE ENTRADA */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f5f5f5' }}>
          <AddBoxIcon color="primary" /> Nova Entrada
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3, mt: 1, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="caption" color="primary" fontWeight="bold">ENTRADA PARA:</Typography>
            <Typography variant="subtitle1" fontWeight="bold">{selectedProduto?.nome}</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>PN: {selectedProduto?.partNumber}</Typography>
          </Box>

          {/* Replaced Grid size syntax with Box grid to resolve MUI version issues */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
            <Box sx={{ gridColumn: { xs: '1fr', sm: '1 / -1' } }}>
              <Autocomplete
                options={fornecedores}
                getOptionLabel={(option) => option.nome}
                value={formData.fornecedor}
                onChange={(_, newValue) => setFormData({ ...formData, fornecedor: newValue })}
                renderInput={(params) => <TextField {...params} label="Fornecedor *" size="small" required fullWidth />}
              />
            </Box>

            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 1 (auto)' } }}>
              <TextField
                label="NFe *"
                fullWidth
                size="small"
                required
                value={formData.nfe}
                onChange={(e) => setFormData({ ...formData, nfe: e.target.value })}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 1 (auto)' } }}>
              <TextField
                label="Lote *"
                fullWidth
                size="small"
                required
                value={formData.lote}
                onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 1 (auto)' } }}>
              <TextField
                label="Data Entrada *"
                type="date"
                fullWidth
                size="small"
                required
                InputLabelProps={{ shrink: true }}
                value={formData.dataEntrada}
                onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value })}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 1 (auto)' } }}>
              <TextField
                label="Quantidade *"
                type="number"
                fullWidth
                required
                size="small"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1fr', sm: 'span 1 (auto)' } }}>
              <TextField
                label="Custo Unitário *"
                fullWidth
                required
                size="small"
                value={formData.precoCusto}
                onChange={(e) => setFormData({ ...formData, precoCusto: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEntrada}>Salvar Entrada</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!remessaToDelete}
        onClose={() => setRemessaToDelete(null)}
        onConfirm={confirmDeleteRemessa}
        title="Confirmar Exclusão de Remessa"
        message={
          <Typography>
            Tem certeza que deseja excluir a remessa <strong>{remessaToDelete?.identificacao}</strong>?
            <br />
            O estoque será deduzido.
          </Typography>
        }
      />
    </Box >
  );
}
