import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import { Settings, Add, Edit, Delete } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface Natureza {
  id: string;
  nome: string;
  status: 'ativo' | 'inativo';
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

interface TipoProduto {
  id: string;
  nome: string;
  naturezaId: string;
  naturezaNome: string;
  status: 'ativo' | 'inativo';
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

interface DescricaoProduto {
  id: string;
  nome: string;
  tipoId: string;
  tipoNome: string;
  status: 'ativo' | 'inativo';
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

interface EspecificacaoProduto {
  id: string;
  nome: string;
  tipoId: string;
  tipoNome: string;
  status: 'ativo' | 'inativo';
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

interface Fabricante {
  id: string;
  nome: string;
  status: 'ativo' | 'inativo';
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

export function ParametrosProdutosManagement() {
  const { userData } = useAuth();
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [descricoesProduto, setDescricoesProduto] = useState<DescricaoProduto[]>([]);
  const [especificacoesProduto, setEspecificacoesProduto] = useState<EspecificacaoProduto[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do dropdown
  const [selectedNaturezaId, setSelectedNaturezaId] = useState('');
  const [selectedTipoId, setSelectedTipoId] = useState('');
  const [selectedDescricaoId, setSelectedDescricaoId] = useState('');
  const [selectedEspecificacaoId, setSelectedEspecificacaoId] = useState('');
  const [selectedFabricanteId, setSelectedFabricanteId] = useState('');

  // Estados do modal Natureza
  const [openModalNatureza, setOpenModalNatureza] = useState(false);
  const [editingNatureza, setEditingNatureza] = useState<Natureza | null>(null);
  const [formNomeNatureza, setFormNomeNatureza] = useState('');
  const [formStatusNatureza, setFormStatusNatureza] = useState<'ativo' | 'inativo'>('ativo');

  // Estados do modal Tipo de Produto
  const [openModalTipo, setOpenModalTipo] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoProduto | null>(null);
  const [formNomeTipo, setFormNomeTipo] = useState('');
  const [formStatusTipo, setFormStatusTipo] = useState<'ativo' | 'inativo'>('ativo');

  // Estados do modal Descrição de Produto
  const [openModalDescricao, setOpenModalDescricao] = useState(false);
  const [editingDescricao, setEditingDescricao] = useState<DescricaoProduto | null>(null);
  const [formNomeDescricao, setFormNomeDescricao] = useState('');
  const [formStatusDescricao, setFormStatusDescricao] = useState<'ativo' | 'inativo'>('ativo');

  // Estados do modal Especificação de Produto
  const [openModalEspecificacao, setOpenModalEspecificacao] = useState(false);
  const [editingEspecificacao, setEditingEspecificacao] = useState<EspecificacaoProduto | null>(null);
  const [formNomeEspecificacao, setFormNomeEspecificacao] = useState('');
  const [formStatusEspecificacao, setFormStatusEspecificacao] = useState<'ativo' | 'inativo'>('ativo');

  // Estados do modal Fabricante
  const [openModalFabricante, setOpenModalFabricante] = useState(false);
  const [editingFabricante, setEditingFabricante] = useState<Fabricante | null>(null);
  const [formNomeFabricante, setFormNomeFabricante] = useState('');
  const [formStatusFabricante, setFormStatusFabricante] = useState<'ativo' | 'inativo'>('ativo');

  // Estado do dialog de exclusão
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Natureza | TipoProduto | DescricaoProduto | EspecificacaoProduto | Fabricante | null>(null);
  const [deleteType, setDeleteType] = useState<'natureza' | 'tipo' | 'descricao' | 'especificacao' | 'fabricante'>('natureza');

  useEffect(() => {
    loadNaturezas();
    loadTiposProduto();
    loadDescricoesProduto();
    loadEspecificacoesProduto();
    loadFabricantes();
  }, [userData]);

  const loadNaturezas = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const naturezasRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(naturezasRef);

      const naturezasList: Natureza[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'natureza') {
          naturezasList.push({ id: docSnap.id, ...data } as Natureza);
        }
      });

      setNaturezas(naturezasList);
    } catch (err: any) {
      setError('Erro ao carregar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTiposProduto = async () => {
    if (!userData?.empresaId) return;

    try {
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(tiposRef);

      const tiposList: TipoProduto[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'tipo') {
          tiposList.push({ id: docSnap.id, ...data } as TipoProduto);
        }
      });

      setTiposProduto(tiposList);
    } catch (err: any) {
      setError('Erro ao carregar tipos: ' + err.message);
    }
  };

  const loadDescricoesProduto = async () => {
    if (!userData?.empresaId) return;

    try {
      const descricoesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(descricoesRef);

      const descricoesList: DescricaoProduto[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'descricao') {
          descricoesList.push({ id: docSnap.id, ...data } as DescricaoProduto);
        }
      });

      setDescricoesProduto(descricoesList);
    } catch (err: any) {
      setError('Erro ao carregar descrições: ' + err.message);
    }
  };

  const loadEspecificacoesProduto = async () => {
    if (!userData?.empresaId) return;

    try {
      const especificacoesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(especificacoesRef);

      const especificacoesList: EspecificacaoProduto[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'especificacao') {
          especificacoesList.push({ id: docSnap.id, ...data } as EspecificacaoProduto);
        }
      });

      setEspecificacoesProduto(especificacoesList);
    } catch (err: any) {
      setError('Erro ao carregar especificações: ' + err.message);
    }
  };

  const loadFabricantes = async () => {
    if (!userData?.empresaId) return;

    try {
      const fabricantesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(fabricantesRef);

      const fabricantesList: Fabricante[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tipoParametro === 'fabricante') {
          fabricantesList.push({ id: docSnap.id, ...data } as Fabricante);
        }
      });

      setFabricantes(fabricantesList);
    } catch (err: any) {
      setError('Erro ao carregar fabricantes: ' + err.message);
    }
  };

  // Funções do modal Natureza
  const handleOpenModalNatureza = () => {
    setOpenModalNatureza(true);
  };

  const handleCloseModalNatureza = () => {
    setOpenModalNatureza(false);
    setEditingNatureza(null);
    setFormNomeNatureza('');
    setFormStatusNatureza('ativo');
  };

  const handleEditNatureza = (item: Natureza) => {
    setEditingNatureza(item);
    setFormNomeNatureza(item.nome);
    setFormStatusNatureza(item.status);
  };

  const handleCancelEditNatureza = () => {
    setEditingNatureza(null);
    setFormNomeNatureza('');
    setFormStatusNatureza('ativo');
  };

  // Funções do modal Tipo de Produto
  const handleOpenModalTipo = () => {
    if (!selectedNaturezaId) {
      setError('Selecione uma Natureza do Produto primeiro');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setOpenModalTipo(true);
  };

  const handleCloseModalTipo = () => {
    setOpenModalTipo(false);
    setEditingTipo(null);
    setFormNomeTipo('');
    setFormStatusTipo('ativo');
  };

  const handleEditTipo = (item: TipoProduto) => {
    setEditingTipo(item);
    setFormNomeTipo(item.nome);
    setFormStatusTipo(item.status);
  };

  const handleCancelEditTipo = () => {
    setEditingTipo(null);
    setFormNomeTipo('');
    setFormStatusTipo('ativo');
  };

  // Funções do modal Descrição de Produto
  const handleCloseModalDescricao = () => {
    setOpenModalDescricao(false);
    setEditingDescricao(null);
    setFormNomeDescricao('');
    setFormStatusDescricao('ativo');
  };

  const handleEditDescricao = (item: DescricaoProduto) => {
    setEditingDescricao(item);
    setFormNomeDescricao(item.nome);
    setFormStatusDescricao(item.status);
  };

  const handleCancelEditDescricao = () => {
    setEditingDescricao(null);
    setFormNomeDescricao('');
    setFormStatusDescricao('ativo');
  };

  // Funções do modal Especificação de Produto
  const handleCloseModalEspecificacao = () => {
    setOpenModalEspecificacao(false);
    setEditingEspecificacao(null);
    setFormNomeEspecificacao('');
    setFormStatusEspecificacao('ativo');
  };

  const handleEditEspecificacao = (item: EspecificacaoProduto) => {
    setEditingEspecificacao(item);
    setFormNomeEspecificacao(item.nome);
    setFormStatusEspecificacao(item.status);
  };

  const handleCancelEditEspecificacao = () => {
    setEditingEspecificacao(null);
    setFormNomeEspecificacao('');
    setFormStatusEspecificacao('ativo');
  };

  // Funções do modal Fabricante
  const handleCloseModalFabricante = () => {
    setOpenModalFabricante(false);
    setEditingFabricante(null);
    setFormNomeFabricante('');
    setFormStatusFabricante('ativo');
  };

  const handleEditFabricante = (item: Fabricante) => {
    setEditingFabricante(item);
    setFormNomeFabricante(item.nome);
    setFormStatusFabricante(item.status);
  };

  const handleCancelEditFabricante = () => {
    setEditingFabricante(null);
    setFormNomeFabricante('');
    setFormStatusFabricante('ativo');
  };

  const handleSubmitNatureza = async () => {
    if (!userData?.empresaId) return;
    if (!formNomeNatureza.trim()) {
      setError('Preencha o nome');
      return;
    }

    try {
      const naturezasRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');

      const dataToSave = {
        tipoParametro: 'natureza',
        nome: formNomeNatureza.trim(),
        status: formStatusNatureza,
      };

      if (editingNatureza) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', editingNatureza.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Atualizado com sucesso!');
      } else {
        await addDoc(naturezasRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Cadastrado com sucesso!');
      }

      handleCancelEditNatureza();
      loadNaturezas();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar: ' + err.message);
    }
  };

  const handleSubmitTipo = async () => {
    if (!userData?.empresaId) return;
    if (!formNomeTipo.trim()) {
      setError('Preencha o nome');
      return;
    }

    const naturezaSelecionada = naturezas.find(n => n.id === selectedNaturezaId);
    if (!naturezaSelecionada) {
      setError('Natureza não encontrada');
      return;
    }

    try {
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');

      const dataToSave = {
        tipoParametro: 'tipo',
        nome: formNomeTipo.trim(),
        naturezaId: selectedNaturezaId,
        naturezaNome: naturezaSelecionada.nome,
        status: formStatusTipo,
      };

      if (editingTipo) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', editingTipo.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Tipo atualizado com sucesso!');
      } else {
        await addDoc(tiposRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Tipo cadastrado com sucesso!');
      }

      handleCancelEditTipo();
      loadTiposProduto();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar tipo: ' + err.message);
    }
  };

  const handleSubmitDescricao = async () => {
    if (!userData?.empresaId) return;
    if (!formNomeDescricao.trim()) {
      setError('Preencha o nome');
      return;
    }

    const tipoSelecionado = tiposProduto.find(t => t.id === selectedTipoId);
    if (!tipoSelecionado) {
      setError('Tipo de Produto não encontrado');
      return;
    }

    try {
      const descricoesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');

      const dataToSave = {
        tipoParametro: 'descricao',
        nome: formNomeDescricao.trim(),
        tipoId: selectedTipoId,
        tipoNome: tipoSelecionado.nome,
        status: formStatusDescricao,
      };

      if (editingDescricao) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', editingDescricao.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Descrição atualizada com sucesso!');
      } else {
        await addDoc(descricoesRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Descrição cadastrada com sucesso!');
      }

      handleCancelEditDescricao();
      loadDescricoesProduto();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar descrição: ' + err.message);
    }
  };

  const handleSubmitEspecificacao = async () => {
    if (!userData?.empresaId) return;
    if (!formNomeEspecificacao.trim()) {
      setError('Preencha o nome');
      return;
    }

    const tipoSelecionado = tiposProduto.find(t => t.id === selectedTipoId);
    if (!tipoSelecionado) {
      setError('Tipo de Produto não encontrado');
      return;
    }

    try {
      const especificacoesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');

      const dataToSave = {
        tipoParametro: 'especificacao',
        nome: formNomeEspecificacao.trim(),
        tipoId: selectedTipoId,
        tipoNome: tipoSelecionado.nome,
        status: formStatusEspecificacao,
      };

      if (editingEspecificacao) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', editingEspecificacao.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Especificação atualizada com sucesso!');
      } else {
        await addDoc(especificacoesRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Especificação cadastrada com sucesso!');
      }

      handleCancelEditEspecificacao();
      loadEspecificacoesProduto();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar especificação: ' + err.message);
    }
  };

  const handleSubmitFabricante = async () => {
    if (!userData?.empresaId) return;
    if (!formNomeFabricante.trim()) {
      setError('Preencha o nome');
      return;
    }

    try {
      const fabricantesRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');

      const dataToSave = {
        tipoParametro: 'fabricante',
        nome: formNomeFabricante.trim(),
        status: formStatusFabricante,
      };

      if (editingFabricante) {
        await updateDoc(
          doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', editingFabricante.id),
          { ...dataToSave, atualizadoEm: Timestamp.now() }
        );
        setSuccess('Fabricante atualizado com sucesso!');
      } else {
        await addDoc(fabricantesRef, {
          ...dataToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Fabricante cadastrado com sucesso!');
      }

      handleCancelEditFabricante();
      loadFabricantes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar fabricante: ' + err.message);
    }
  };

  const handleOpenDeleteDialog = (item: Natureza | TipoProduto | DescricaoProduto | EspecificacaoProduto | Fabricante, type: 'natureza' | 'tipo' | 'descricao' | 'especificacao' | 'fabricante') => {
    setItemToDelete(item);
    setDeleteType(type);
    setOpenDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !itemToDelete) return;

    try {
      await deleteDoc(
        doc(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos', itemToDelete.id)
      );
      setSuccess('Excluído com sucesso!');
      setOpenDeleteDialog(false);
      setItemToDelete(null);

      if (deleteType === 'natureza') {
        if (itemToDelete.id === selectedNaturezaId) {
          setSelectedNaturezaId('');
          setSelectedTipoId('');
          setSelectedDescricaoId('');
        }
        loadNaturezas();
      } else if (deleteType === 'tipo') {
        if (itemToDelete.id === selectedTipoId) {
          setSelectedTipoId('');
          setSelectedDescricaoId('');
        }
        loadTiposProduto();
      } else if (deleteType === 'descricao') {
        if (itemToDelete.id === selectedDescricaoId) {
          setSelectedDescricaoId('');
        }
        loadDescricoesProduto();
      } else if (deleteType === 'especificacao') {
        loadEspecificacoesProduto();
      } else {
        loadFabricantes();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir: ' + err.message);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoute="/configuracoes/parametros-produtos">
        <Box className="flex justify-center items-center h-96">
          <CircularProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoute="/configuracoes/parametros-produtos">
      <Box className="p-6">
        <Typography variant="h4" className="font-bold mb-6">
          Parâmetros de Produtos
        </Typography>

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

        {/* Natureza do Produto: Dropdown + Botão */}
        <Box className="flex gap-2 items-center mb-4" sx={{ maxWidth: 600 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Natureza do Produto"
            value={selectedNaturezaId}
            onChange={(e) => {
              setSelectedNaturezaId(e.target.value);
              setSelectedTipoId('');
            }}
          >
            <MenuItem value="">Selecione...</MenuItem>
            {naturezas.map((nat) => (
              <MenuItem key={nat.id} value={nat.id}>
                {nat.nome}
              </MenuItem>
            ))}
          </TextField>
          <IconButton
            color="primary"
            onClick={handleOpenModalNatureza}
            title="Gerenciar Natureza do Produto"
            sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Tipo de Produto: Dropdown + Botão (sempre visível) */}
        <Box className="flex gap-2 items-center mb-4" sx={{ maxWidth: 600 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Tipo de Produto"
            value={selectedTipoId}
            onChange={(e) => setSelectedTipoId(e.target.value)}
            disabled={!selectedNaturezaId}
          >
            <MenuItem value="">Selecione...</MenuItem>
            {tiposProduto
              .filter(tipo => tipo.naturezaId === selectedNaturezaId)
              .map((tipo) => (
                <MenuItem key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </MenuItem>
              ))}
          </TextField>
          <IconButton
            color="primary"
            onClick={handleOpenModalTipo}
            title="Gerenciar Tipo de Produto"
            sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Descrição de Produto: Dropdown + Botão (sempre visível) */}
        <Box className="flex gap-2 items-center mb-4" sx={{ maxWidth: 600 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Descrição de Produto"
            value={selectedDescricaoId}
            onChange={(e) => setSelectedDescricaoId(e.target.value)}
            disabled={!selectedTipoId}
          >
            <MenuItem value="">Selecione...</MenuItem>
            {descricoesProduto
              .filter(desc => desc.tipoId === selectedTipoId)
              .map((desc) => (
                <MenuItem key={desc.id} value={desc.id}>
                  {desc.nome}
                </MenuItem>
              ))}
          </TextField>
          <IconButton
            color="primary"
            onClick={() => {
              if (!selectedTipoId) {
                setError('Selecione um Tipo de Produto primeiro');
                setTimeout(() => setError(''), 3000);
                return;
              }
              setOpenModalDescricao(true);
            }}
            title="Gerenciar Descrição de Produto"
            sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Especificação de Produto: Dropdown + Botão (sempre visível) */}
        <Box className="flex gap-2 items-center mb-4" sx={{ maxWidth: 600 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Especificação de Produto"
            value={selectedEspecificacaoId}
            onChange={(e) => setSelectedEspecificacaoId(e.target.value)}
            disabled={!selectedTipoId}
          >
            <MenuItem value="">Selecione...</MenuItem>
            {especificacoesProduto
              .filter(espec => espec.tipoId === selectedTipoId)
              .map((espec) => (
                <MenuItem key={espec.id} value={espec.id}>
                  {espec.nome}
                </MenuItem>
              ))}
          </TextField>
          <IconButton
            color="primary"
            onClick={() => {
              if (!selectedTipoId) {
                setError('Selecione um Tipo de Produto primeiro');
                setTimeout(() => setError(''), 3000);
                return;
              }
              setOpenModalEspecificacao(true);
            }}
            title="Gerenciar Especificação de Produto"
            sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Fabricantes: Dropdown + Botão (sempre visível) */}
        <Box className="flex gap-2 items-center mb-4" sx={{ maxWidth: 600 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Fabricantes"
            value={selectedFabricanteId}
            onChange={(e) => setSelectedFabricanteId(e.target.value)}
          >
            <MenuItem value="">Selecione...</MenuItem>
            {fabricantes.map((fab) => (
              <MenuItem key={fab.id} value={fab.id}>
                {fab.nome}
              </MenuItem>
            ))}
          </TextField>
          <IconButton
            color="primary"
            onClick={() => setOpenModalFabricante(true)}
            title="Gerenciar Fabricantes"
            sx={{ bgcolor: '#f5f5f5', flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Modal de Gerenciamento - Natureza */}
        <Dialog open={openModalNatureza} onClose={handleCloseModalNatureza} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar Natureza do Produto</DialogTitle>
          <DialogContent>
            {/* Formulário de Cadastro */}
            <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle1" className="font-bold mb-3">
                {editingNatureza ? 'Editar Natureza' : 'Adicionar Nova Natureza'}
              </Typography>
              <Box className="flex gap-2 items-end">
                <TextField
                  size="small"
                  label="Nome *"
                  value={formNomeNatureza}
                  onChange={(e) => setFormNomeNatureza(e.target.value)}
                  placeholder="Digite o nome"
                  sx={{ flex: 2 }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={formStatusNatureza}
                  onChange={(e) => setFormStatusNatureza(e.target.value as 'ativo' | 'inativo')}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleSubmitNatureza}
                  startIcon={editingNatureza ? <Edit /> : <Add />}
                >
                  {editingNatureza ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingNatureza && (
                  <Button onClick={handleCancelEditNatureza}>
                    Cancelar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabela de Itens Cadastrados */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {naturezas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhum item cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    naturezas.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditNatureza(item)}
                            title="Editar"
                            sx={{ color: '#ff9800' }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteDialog(item, 'natureza')}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModalNatureza}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Gerenciamento - Tipo de Produto */}
        <Dialog open={openModalTipo} onClose={handleCloseModalTipo} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar Tipo de Produto</DialogTitle>
          <DialogContent>
            {/* Formulário de Cadastro */}
            <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle1" className="font-bold mb-3">
                {editingTipo ? 'Editar Tipo' : 'Adicionar Novo Tipo'}
              </Typography>
              <Box className="flex gap-2 items-end mb-3">
                <TextField
                  select
                  size="small"
                  label="Natureza do Produto *"
                  value={selectedNaturezaId}
                  onChange={(e) => setSelectedNaturezaId(e.target.value)}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {naturezas.map((nat) => (
                    <MenuItem key={nat.id} value={nat.id}>
                      {nat.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box className="flex gap-2 items-end">
                <TextField
                  size="small"
                  label="Nome *"
                  value={formNomeTipo}
                  onChange={(e) => setFormNomeTipo(e.target.value)}
                  placeholder="Digite o nome do tipo"
                  sx={{ flex: 2 }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={formStatusTipo}
                  onChange={(e) => setFormStatusTipo(e.target.value as 'ativo' | 'inativo')}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleSubmitTipo}
                  startIcon={editingTipo ? <Edit /> : <Add />}
                >
                  {editingTipo ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingTipo && (
                  <Button onClick={handleCancelEditTipo}>
                    Cancelar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabela de Tipos Cadastrados */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tiposProduto.filter(t => t.naturezaId === selectedNaturezaId).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhum tipo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    tiposProduto
                      .filter(t => t.naturezaId === selectedNaturezaId)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditTipo(item)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteDialog(item, 'tipo')}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModalTipo}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Gerenciamento - Descrição de Produto */}
        <Dialog open={openModalDescricao} onClose={handleCloseModalDescricao} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar Descrição de Produto</DialogTitle>
          <DialogContent>
            {/* Formulário de Cadastro */}
            <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle1" className="font-bold mb-3">
                {editingDescricao ? 'Editar Descrição' : 'Adicionar Nova Descrição'}
              </Typography>
              <Box className="flex gap-2 items-end mb-3">
                <TextField
                  select
                  size="small"
                  label="Tipo de Produto *"
                  value={selectedTipoId}
                  onChange={(e) => setSelectedTipoId(e.target.value)}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {tiposProduto
                    .filter(tipo => tipo.naturezaId === selectedNaturezaId)
                    .map((tipo) => (
                      <MenuItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </MenuItem>
                    ))}
                </TextField>
              </Box>
              <Box className="flex gap-2 items-end">
                <TextField
                  size="small"
                  label="Nome *"
                  value={formNomeDescricao}
                  onChange={(e) => setFormNomeDescricao(e.target.value)}
                  placeholder="Digite o nome da descrição"
                  sx={{ flex: 2 }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={formStatusDescricao}
                  onChange={(e) => setFormStatusDescricao(e.target.value as 'ativo' | 'inativo')}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleSubmitDescricao}
                  startIcon={editingDescricao ? <Edit /> : <Add />}
                >
                  {editingDescricao ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingDescricao && (
                  <Button onClick={handleCancelEditDescricao}>
                    Cancelar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabela de Descrições Cadastradas */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {descricoesProduto.filter(d => d.tipoId === selectedTipoId).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhuma descrição cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    descricoesProduto
                      .filter(d => d.tipoId === selectedTipoId)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditDescricao(item)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteDialog(item, 'descricao' as any)}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModalDescricao}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Gerenciamento - Especificação de Produto */}
        <Dialog open={openModalEspecificacao} onClose={handleCloseModalEspecificacao} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar Especificação de Produto</DialogTitle>
          <DialogContent>
            {/* Formulário de Cadastro */}
            <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle1" className="font-bold mb-3">
                {editingEspecificacao ? 'Editar Especificação' : 'Adicionar Nova Especificação'}
              </Typography>
              <Box className="flex gap-2 items-end mb-3">
                <TextField
                  select
                  size="small"
                  label="Tipo de Produto *"
                  value={selectedTipoId}
                  onChange={(e) => setSelectedTipoId(e.target.value)}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {tiposProduto
                    .filter(tipo => tipo.naturezaId === selectedNaturezaId)
                    .map((tipo) => (
                      <MenuItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </MenuItem>
                    ))}
                </TextField>
              </Box>
              <Box className="flex gap-2 items-end">
                <TextField
                  size="small"
                  label="Nome *"
                  value={formNomeEspecificacao}
                  onChange={(e) => setFormNomeEspecificacao(e.target.value)}
                  placeholder="Digite o nome da especificação"
                  sx={{ flex: 2 }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={formStatusEspecificacao}
                  onChange={(e) => setFormStatusEspecificacao(e.target.value as 'ativo' | 'inativo')}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleSubmitEspecificacao}
                  startIcon={editingEspecificacao ? <Edit /> : <Add />}
                >
                  {editingEspecificacao ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingEspecificacao && (
                  <Button onClick={handleCancelEditEspecificacao}>
                    Cancelar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabela de Especificações Cadastradas */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {especificacoesProduto.filter(e => e.tipoId === selectedTipoId).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhuma especificação cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    especificacoesProduto
                      .filter(e => e.tipoId === selectedTipoId)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditEspecificacao(item)}
                              title="Editar"
                              sx={{ color: '#ff9800' }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteDialog(item, 'especificacao')}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModalEspecificacao}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Gerenciamento - Fabricantes */}
        <Dialog open={openModalFabricante} onClose={handleCloseModalFabricante} maxWidth="md" fullWidth>
          <DialogTitle>Gerenciar Fabricantes</DialogTitle>
          <DialogContent>
            {/* Formulário de Cadastro */}
            <Box className="mb-6 p-4" sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle1" className="font-bold mb-3">
                {editingFabricante ? 'Editar Fabricante' : 'Adicionar Novo Fabricante'}
              </Typography>
              <Box className="flex gap-2 items-end">
                <TextField
                  size="small"
                  label="Nome *"
                  value={formNomeFabricante}
                  onChange={(e) => setFormNomeFabricante(e.target.value)}
                  placeholder="Digite o nome do fabricante"
                  sx={{ flex: 2 }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={formStatusFabricante}
                  onChange={(e) => setFormStatusFabricante(e.target.value as 'ativo' | 'inativo')}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleSubmitFabricante}
                  startIcon={editingFabricante ? <Edit /> : <Add />}
                >
                  {editingFabricante ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingFabricante && (
                  <Button onClick={handleCancelEditFabricante}>
                    Cancelar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabela de Fabricantes Cadastrados */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fabricantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Nenhum fabricante cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fabricantes.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditFabricante(item)}
                            title="Editar"
                            sx={{ color: '#ff9800' }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteDialog(item, 'fabricante')}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModalFabricante}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir <strong>{itemToDelete?.nome}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}