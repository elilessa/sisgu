// src/pages/Questionarios.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Divider,
  Stack,
  Chip,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { ActionEdit, ActionDelete } from '../../components/TableActions';
import {
  Add,
  ExpandMore,
  Save,
  Close,
  DragIndicator,
  SubdirectoryArrowRight,
  ContentCopy,
  Schedule,
  Event,
} from '@mui/icons-material';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

type TipoResposta =
  | 'booleano'
  | 'verdadeiro_falso'
  | 'texto'
  | 'numerico'
  | 'checkbox'
  | 'upload_fotos'
  | 'assinatura';

type LayoutConfig = {
  perguntasPorLinha: 1 | 2 | 3 | 4;
};

type Pergunta = {
  id: string;
  titulo: string;
  descricao: string;
  tipoResposta: TipoResposta;
  obrigatoria: boolean;
  subPerguntas: Pergunta[];
};

type QuestionarioDoc = {
  id: string;
  nome: string;
  perguntas: Pergunta[];
  layout: LayoutConfig;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  criadoPorId: string;
  criadoPorNome: string;
};

const TIPO_RESPOSTA_OPTIONS: { value: TipoResposta; label: string }[] = [
  { value: 'booleano', label: 'Sim / Não (Booleano)' },
  { value: 'verdadeiro_falso', label: 'Verdadeiro / Falso' },
  { value: 'texto', label: 'Texto' },
  { value: 'numerico', label: 'Numérico' },
  { value: 'checkbox', label: 'Checkbox (múltipla escolha simples)' },
  { value: 'upload_fotos', label: 'Upload de Fotos' },
  { value: 'assinatura', label: 'Assinatura' },
];

const makeId = () => `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function clonePergunta(p: Pergunta): Pergunta {
  return {
    ...p,
    subPerguntas: (p.subPerguntas || []).map(clonePergunta),
  };
}

function reorderArray<T>(arr: T[], fromIndex: number, toIndex: number) {
  const copy = [...arr];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);
  return copy;
}

function getPerguntasByPath(root: Pergunta[], path: number[]) {
  // path aponta para a pergunta (ex: [2,1] => root[2].subPerguntas[1])
  let parentList: Pergunta[] = root;
  let item: Pergunta | null = null;

  for (let i = 0; i < path.length; i++) {
    item = parentList[path[i]];
    if (!item) return { parentList: root, item: null, parentPath: [], index: -1 };
    if (i < path.length - 1) parentList = item.subPerguntas || [];
  }

  return {
    parentList,
    item,
    parentPath: path.slice(0, -1),
    index: path[path.length - 1],
  };
}

function updatePerguntaAtPath(root: Pergunta[], path: number[], newValue: Pergunta) {
  if (path.length === 0) return root;
  const rootCopy = root.map(clonePergunta);

  const { parentPath, index } = getPerguntasByPath(rootCopy, path);
  if (index < 0) return rootCopy;

  if (parentPath.length === 0) {
    rootCopy[index] = newValue;
    return rootCopy;
  }

  // navegar até o pai
  let parent = rootCopy[parentPath[0]];
  for (let i = 1; i < parentPath.length; i++) parent = parent.subPerguntas[parentPath[i]];
  parent.subPerguntas[index] = newValue;
  return rootCopy;
}

function removePerguntaAtPath(root: Pergunta[], path: number[]) {
  const rootCopy = root.map(clonePergunta);
  const { parentPath, index } = getPerguntasByPath(rootCopy, path);
  if (index < 0) return rootCopy;

  if (parentPath.length === 0) {
    rootCopy.splice(index, 1);
    return rootCopy;
  }

  let parent = rootCopy[parentPath[0]];
  for (let i = 1; i < parentPath.length; i++) parent = parent.subPerguntas[parentPath[i]];
  parent.subPerguntas.splice(index, 1);
  return rootCopy;
}

function insertPerguntaAtPath(root: Pergunta[], parentPath: number[], pergunta: Pergunta) {
  const rootCopy = root.map(clonePergunta);

  if (parentPath.length === 0) {
    rootCopy.push(pergunta);
    return rootCopy;
  }

  let parent = rootCopy[parentPath[0]];
  for (let i = 1; i < parentPath.length; i++) parent = parent.subPerguntas[parentPath[i]];
  parent.subPerguntas = parent.subPerguntas || [];
  parent.subPerguntas.push(pergunta);
  return rootCopy;
}

function reorderWithinSameParent(root: Pergunta[], parentPath: number[], fromIndex: number, toIndex: number) {
  const rootCopy = root.map(clonePergunta);

  if (parentPath.length === 0) {
    return reorderArray(rootCopy, fromIndex, toIndex);
  }

  let parent = rootCopy[parentPath[0]];
  for (let i = 1; i < parentPath.length; i++) parent = parent.subPerguntas[parentPath[i]];

  parent.subPerguntas = reorderArray(parent.subPerguntas || [], fromIndex, toIndex);
  return rootCopy;
}

function pathToKey(path: number[]) {
  return path.join('.');
}

export function Questionarios() {
  const { userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [lista, setLista] = useState<QuestionarioDoc[]>([]);
  const [search, setSearch] = useState('');

  const [openEditor, setOpenEditor] = useState(false);
  const [editorTab, setEditorTab] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [layout, setLayout] = useState<LayoutConfig>({ perguntasPorLinha: 2 });

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [openQuestionDeleteDialog, setOpenQuestionDeleteDialog] = useState(false);
  const [selectedQuestionPath, setSelectedQuestionPath] = useState<number[] | null>(null);

  // drag state (HTML5 DnD)
  const [dragSource, setDragSource] = useState<{ parentPathKey: string; fromIndex: number } | null>(null);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.empresaId) return;

    setLoading(true);
    setError('');

    const ref = collection(db, 'EMPRESAS', userData.empresaId, 'questionarios');
    const q = query(ref, orderBy('criadoEm', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: QuestionarioDoc[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) } as QuestionarioDoc));
        setLista(out);
        setLoading(false);
      },
      (err) => {
        setError(`Erro ao carregar questionários: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userData?.empresaId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return lista;
    return lista.filter((q) => (q.nome || '').toLowerCase().includes(s));
  }, [lista, search]);

  const resetEditor = () => {
    setEditingId(null);
    setNome('');
    setPerguntas([]);
    setLayout({ perguntasPorLinha: 2 });
    setEditorTab(0);
    setExpandedKey(null);
    setDragSource(null);
  };

  const openNew = () => {
    resetEditor();
    setOpenEditor(true);
  };

  const openEdit = (q: QuestionarioDoc) => {
    resetEditor();
    setEditingId(q.id);
    setNome(q.nome || '');
    setPerguntas((q.perguntas || []).map(clonePergunta));
    setLayout(q.layout || { perguntasPorLinha: 2 });
    setOpenEditor(true);
  };

  const closeEditor = () => {
    setOpenEditor(false);
    setTimeout(() => resetEditor(), 200);
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;
    if (!nome.trim()) {
      setError('Informe o nome do questionário.');
      return;
    }

    const payload = {
      nome: nome.trim(),
      perguntas,
      layout,
      atualizadoEm: Timestamp.now(),
    };

    try {
      if (editingId) {
        const ref = doc(db, 'EMPRESAS', userData.empresaId, 'questionarios', editingId);
        await updateDoc(ref, payload);
        setSuccess('Questionário atualizado com sucesso!');
      } else {
        const ref = collection(db, 'EMPRESAS', userData.empresaId, 'questionarios');
        await addDoc(ref, {
          ...payload,
          criadoEm: Timestamp.now(),
          criadoPorId: userData?.id || '',
          criadoPorNome: userData?.nome || '',
        });
        setSuccess('Questionário criado com sucesso!');
      }

      setTimeout(() => setSuccess(''), 2500);
      closeEditor();
    } catch (err: any) {
      setError(`Erro ao salvar questionário: ${err.message}`);
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!userData?.empresaId || !itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'questionarios', itemToDelete));
      setSuccess('Questionário excluído com sucesso!');
      setTimeout(() => setSuccess(''), 2500);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setError(`Erro ao excluir questionário: ${err.message}`);
    }
  };

  const addPergunta = (parentPath: number[] = []) => {
    const nova: Pergunta = {
      id: makeId(),
      titulo: '',
      descricao: '',
      tipoResposta: 'texto',
      obrigatoria: false,
      subPerguntas: [],
    };

    setPerguntas((prev) => insertPerguntaAtPath(prev, parentPath, nova));
    // expandir automaticamente
    const key = parentPath.length ? `${pathToKey(parentPath)}.${(getPerguntasByPath(perguntas, parentPath).parentList?.length ?? 0)}` : `${perguntas.length}`;
    setExpandedKey(key);
  };

  const duplicatePergunta = (path: number[]) => {
    const { item, parentPath, index } = getPerguntasByPath(perguntas, path);
    if (!item) return;

    const copy = clonePergunta(item);
    copy.id = makeId();
    copy.titulo = copy.titulo ? `${copy.titulo} (cópia)` : '';

    setPerguntas((prev) => {
      const prevCopy = prev.map(clonePergunta);
      if (parentPath.length === 0) {
        prevCopy.splice(index + 1, 0, copy);
        return prevCopy;
      }
      // navegar até o pai
      let parent = prevCopy[parentPath[0]];
      for (let i = 1; i < parentPath.length; i++) parent = parent.subPerguntas[parentPath[i]];
      parent.subPerguntas.splice(index + 1, 0, copy);
      return prevCopy;
    });
  };

  const updateField = (path: number[], patch: Partial<Pergunta>) => {
    const { item } = getPerguntasByPath(perguntas, path);
    if (!item) return;
    const newItem: Pergunta = { ...item, ...patch };
    setPerguntas((prev) => updatePerguntaAtPath(prev, path, newItem));
  };

  const handleOpenQuestionDeleteDialog = (path: number[]) => {
    setSelectedQuestionPath(path);
    setOpenQuestionDeleteDialog(true);
  };

  const removePergunta = () => {
    if (selectedQuestionPath) {
      setPerguntas((prev) => removePerguntaAtPath(prev, selectedQuestionPath));
    }
    setOpenQuestionDeleteDialog(false);
    setSelectedQuestionPath(null);
  };

  // Drag & Drop (somente reordenação dentro do mesmo nível/pai)
  const onDragStart = (e: React.DragEvent, parentPath: number[], fromIndex: number) => {
    const parentPathKey = pathToKey(parentPath);
    setDragSource({ parentPathKey, fromIndex });
    e.dataTransfer.setData('application/x-questionario-dnd', JSON.stringify({ parentPathKey, fromIndex }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, parentPath: number[], toIndex: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-questionario-dnd');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { parentPathKey: string; fromIndex: number };
      const destParentKey = pathToKey(parentPath);

      // regra: só reorder dentro do mesmo pai
      if (parsed.parentPathKey !== destParentKey) return;
      if (parsed.fromIndex === toIndex) return;

      setPerguntas((prev) => reorderWithinSameParent(prev, parentPath, parsed.fromIndex, toIndex));
    } catch {
      // ignore
    } finally {
      setDragSource(null);
    }
  };

  const renderPerguntas = (list: Pergunta[], parentPath: number[] = []) => {
    if (!list?.length) {
      return (
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.18)' }}>
          <Typography sx={{ fontWeight: 800, color: 'text.secondary' }}>
            Nenhuma pergunta ainda. Clique em “Adicionar pergunta”.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {list.map((p, idx) => {
          const path = [...parentPath, idx];
          const key = pathToKey(path);
          const hasSubs = (p.subPerguntas || []).length > 0;

          return (
            <Accordion
              key={p.id}
              expanded={expandedKey === key}
              onChange={(_, isExp) => setExpandedKey(isExp ? key : null)}
              sx={{
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.10)',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, parentPath, idx)}
                sx={{
                  bgcolor: 'rgba(25,118,210,0.04)',
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.25, flexWrap: 'wrap' },
                }}
              >
                <Box
                  draggable
                  onDragStart={(e) => onDragStart(e, parentPath, idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <DragIndicator sx={{ color: 'rgba(0,0,0,0.35)' }} />
                  <Chip
                    size="small"
                    label={`#${idx + 1}`}
                    sx={{ fontWeight: 900, borderRadius: 2 }}
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 900 }}>
                    {p.titulo?.trim() ? p.titulo : 'Pergunta sem título'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {TIPO_RESPOSTA_OPTIONS.find((x) => x.value === p.tipoResposta)?.label || '—'}
                    {p.obrigatoria ? ' • Obrigatória' : ''}
                    {hasSubs ? ` • ${p.subPerguntas.length} subpergunta(s)` : ''}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ ml: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Duplicar pergunta">
                    <IconButton size="small" onClick={() => duplicatePergunta(path)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Adicionar subpergunta">
                    <IconButton size="small" onClick={() => addPergunta(path)}>
                      <SubdirectoryArrowRight fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Excluir pergunta">
                    <ActionDelete onClick={() => handleOpenQuestionDeleteDialog(path)} title="Excluir pergunta" />
                  </Tooltip>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ bgcolor: '#fff' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Título da pergunta *"
                      value={p.titulo}
                      onChange={(e) => updateField(path, { titulo: e.target.value })}
                      sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Tipo de resposta"
                      value={p.tipoResposta}
                      onChange={(e) => updateField(path, { tipoResposta: e.target.value as TipoResposta })}
                      sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                    >
                      {TIPO_RESPOSTA_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Descrição / orientação"
                      value={p.descricao}
                      onChange={(e) => updateField(path, { descricao: e.target.value })}
                      multiline
                      rows={3}
                      placeholder="Ex: descreva como o técnico deve validar esta etapa..."
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={p.obrigatoria}
                          onChange={(e) => updateField(path, { obrigatoria: e.target.checked })}
                        />
                      }
                      label="Pergunta obrigatória"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 900, color: '#1976d2' }}>
                        Subperguntas
                      </Typography>
                      <Chip
                        size="small"
                        label={`${(p.subPerguntas || []).length}`}
                        sx={{ fontWeight: 900, borderRadius: 2 }}
                        variant="outlined"
                      />
                      <Box sx={{ flex: 1 }} />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => addPergunta(path)}
                        sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none' }}
                      >
                        Adicionar subpergunta
                      </Button>
                    </Stack>

                    <Box sx={{ pl: 1.5 }}>
                      {renderPerguntas(p.subPerguntas || [], path)}
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Questionários
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Construtor de formulários para atividades técnicas (Plano A: EMPRESAS/{'{empresaId}'}/questionarios)
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNew}
          sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none', px: 2.25 }}
        >
          Cadastrar novo questionário
        </Button>
      </Box>

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

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.10)' }} elevation={0}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar questionário"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome do questionário..."
          />
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>Carregando...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 900, color: 'text.secondary' }}>
              Nenhum questionário cadastrado.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid' }}>
            {filtered.map((q) => (
              <Box
                key={q.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography sx={{ fontWeight: 900 }}>{q.nome}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {(q.perguntas || []).length} pergunta(s) • {q.layout?.perguntasPorLinha || 2} por linha
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <ActionEdit onClick={() => openEdit(q)} title="Editar" />
                  <ActionDelete onClick={() => confirmDelete(q.id)} title="Excluir" />
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Editor */}
      <Dialog
        open={openEditor}
        onClose={closeEditor}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.25,
            bgcolor: 'rgba(25,118,210,0.06)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(25,118,210,0.12)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Schedule sx={{ color: '#1976d2' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                {editingId ? 'Editar questionário' : 'Novo questionário'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                Crie perguntas, subperguntas e configure o layout do formulário
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={closeEditor}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={editorTab}
            onChange={(_, v) => setEditorTab(v)}
            sx={{
              px: 2,
              pt: 1.5,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              '& .MuiTab-root': { fontWeight: 900, textTransform: 'none' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
            }}
          >
            <Tab label="Dados" />
            <Tab label="Perguntas" />
            <Tab label="Layout" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {editorTab === 0 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Nome do questionário *"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Check-list de Manutenção Preventiva"
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                />

                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.10)' }}>
                  <Typography sx={{ fontWeight: 900, mb: 0.75 }}>
                    Dica de uso
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.7 }}>
                    Após criar, você poderá selecionar este questionário em uma atividade técnica no agendamento.
                    As perguntas suportam subperguntas e você pode reordenar arrastando (mesmo nível).
                  </Typography>
                </Box>
              </Box>
            )}

            {editorTab === 1 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => addPergunta([])}
                    sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none' }}
                  >
                    Adicionar pergunta
                  </Button>

                  <Chip
                    icon={<DragIndicator />}
                    label="Arraste para reordenar (mesmo nível)"
                    variant="outlined"
                    sx={{ borderRadius: 2, fontWeight: 900, alignSelf: 'flex-start' }}
                  />

                  <Box sx={{ flex: 1 }} />

                  <Chip
                    icon={<Event />}
                    label={`${countPerguntasTotal(perguntas)} pergunta(s) no total`}
                    sx={{ borderRadius: 2, fontWeight: 900 }}
                    variant="outlined"
                  />
                </Stack>

                {renderPerguntas(perguntas, [])}
              </Box>
            )}

            {editorTab === 2 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Quantas perguntas por linha"
                  value={layout.perguntasPorLinha}
                  onChange={(e) => setLayout((prev) => ({ ...prev, perguntasPorLinha: Number(e.target.value) as any }))}
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                >
                  <MenuItem value={1}>1 por linha</MenuItem>
                  <MenuItem value={2}>2 por linha</MenuItem>
                  <MenuItem value={3}>3 por linha</MenuItem>
                  <MenuItem value={4}>4 por linha</MenuItem>
                </TextField>

                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.10)' }}>
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>
                    Prévia de organização (exemplo)
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${layout.perguntasPorLinha}, minmax(0, 1fr))`,
                      gap: 1.25,
                    }}
                  >
                    {Array.from({ length: Math.min(8, Math.max(4, layout.perguntasPorLinha * 2)) }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.12)',
                          bgcolor: '#fff',
                        }}
                      >
                        <Typography sx={{ fontWeight: 900, fontSize: 13 }}>Pergunta {i + 1}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                          Campo de resposta
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 1.5, lineHeight: 1.7 }}>
                    Essa configuração define como o formulário será distribuído visualmente quando o técnico estiver respondendo.
                    (Você pode evoluir depois para regras por seção.)
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            gap: 1,
          }}
        >
          <Button onClick={closeEditor} variant="text" sx={{ fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<Save />}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 2.5,
              textTransform: 'none',
            }}
          >
            Salvar questionário
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={openQuestionDeleteDialog}
        onClose={() => setOpenQuestionDeleteDialog(false)}
        onConfirm={removePergunta}
        title="Excluir Pergunta"
        message="Tem certeza que deseja excluir esta pergunta e todas as suas sub-perguntas?"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={onConfirmDelete}
        title="Excluir Questionário"
        message="Tem certeza que deseja excluir este questionário? Esta ação não pode ser desfeita."
      />
    </Box>
  );
}

function countPerguntasTotal(perguntas: Pergunta[]) {
  let total = 0;
  const walk = (list: Pergunta[]) => {
    for (const p of list) {
      total++;
      if (p.subPerguntas?.length) walk(p.subPerguntas);
    }
  };
  walk(perguntas || []);
  return total;
}
