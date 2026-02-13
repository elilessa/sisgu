import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  FormControl,
  FormLabel,
  InputAdornment,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Save,
  CheckCircle,
  CloudUpload,
  Delete,
  CameraAlt,
  ArrowBack,
  Warning,
  AttachMoney,
  Build,
} from '@mui/icons-material';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useParams } from 'react-router-dom';

type TipoResposta =
  | 'booleano'
  | 'verdadeiro_falso'
  | 'texto'
  | 'numerico'
  | 'checkbox'
  | 'upload_fotos'
  | 'assinatura';

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
  layout: { perguntasPorLinha: 1 | 2 | 3 | 4 };
};

type RespostaQuestionario = {
  questionarioId: string;
  questionarioNome: string;
  respostas: Record<string, any>;
  preenchidoEm: Timestamp;
  assinaturas: Record<string, string>;
  fotos: Record<string, string[]>;
};

type TipoFinalizacao = 'sem_pendencia' | 'pendencia_tecnica' | 'pendencia_financeira';

interface PendenciaFinanceira {
  tipo: 'cobranca' | 'orcamento';
  descricao: string;
  valor?: number;
  houveRetirada?: boolean;
  pecasRetiradas?: string;
  localPecas?: string;
}

interface AgendamentoPublico {
  id: string;
  empresaId: string;
  chamadoId: string;
  tokenPublico: string;
  questionariosIds: string[];
  tipoAtividadeNome: string;
  dataAgendamento: Timestamp;
  status: string;
  respostasQuestionarios?: RespostaQuestionario[];
  clienteNome?: string;
  clientePrefixo?: string;
}

export function FormularioPublico() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agendamento, setAgendamento] = useState<AgendamentoPublico | null>(null);
  const [questionarios, setQuestionarios] = useState<QuestionarioDoc[]>([]);
  const [respostas, setRespostas] = useState<Record<string, Record<string, any>>>({});
  const [assinaturas, setAssinaturas] = useState<Record<string, Record<string, string>>>({});
  const [fotos, setFotos] = useState<Record<string, Record<string, File[]>>>({});
  const [fotosPreview, setFotosPreview] = useState<Record<string, Record<string, string[]>>>({});
  const [currentQuestionarioIndex, setCurrentQuestionarioIndex] = useState(0);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [showFinalizacaoStep, setShowFinalizacaoStep] = useState(false);
  const [tipoFinalizacao, setTipoFinalizacao] = useState<TipoFinalizacao>('sem_pendencia');
  const [pendenciaTecnicaDescricao, setPendenciaTecnicaDescricao] = useState('');
  const [pendenciaFinanceira, setPendenciaFinanceira] = useState<PendenciaFinanceira>({
    tipo: 'cobranca',
    descricao: '',
    valor: undefined,
    houveRetirada: false,
    pecasRetiradas: '',
    localPecas: '',
  });

  useEffect(() => {
    if (token) {
      loadAgendamentoByToken(token);
    }
  }, [token]);

  const loadAgendamentoByToken = async (tokenPublico: string) => {
    try {
      setLoading(true);
      setError('');

      const tokensQuery = query(
        collection(db, 'tokensPublicos'),
        where('token', '==', tokenPublico)
      );
      const tokensSnap = await getDocs(tokensQuery);

      if (tokensSnap.empty) {
        setError('Link inválido ou expirado. Verifique o link e tente novamente.');
        setLoading(false);
        return;
      }

      const tokenDoc = tokensSnap.docs[0].data();
      const { empresaId, chamadoId, agendamentoId, questionariosIds, tipoAtividadeNome, clienteNome } = tokenDoc;

      const chamadoRef = doc(db, 'EMPRESAS', empresaId, 'chamados', chamadoId);
      const chamadoSnap = await getDoc(chamadoRef);

      if (!chamadoSnap.exists()) {
        setError('Chamado não encontrado. Verifique o link e tente novamente.');
        setLoading(false);
        return;
      }

      const chamadoData = chamadoSnap.data();
      const agendamentos = chamadoData.agendamentos || [];
      const agendamentoData = agendamentos.find((ag: any) => ag.id === agendamentoId || ag.tokenPublico === tokenPublico);

      if (!agendamentoData) {
        setError('Agendamento não encontrado. Verifique o link e tente novamente.');
        setLoading(false);
        return;
      }

      // Buscar prefixo do cliente se não estiver no chamado
      let clientePrefixo = chamadoData.clientePrefixo;
      if (!clientePrefixo && chamadoData.clienteId) {
        try {
          const clienteRef = doc(db, 'EMPRESAS', empresaId, 'clientes', chamadoData.clienteId);
          const clienteSnap = await getDoc(clienteRef);
          if (clienteSnap.exists()) {
            clientePrefixo = clienteSnap.data().prefixoNome;
          }
        } catch (err) {
          console.error('Erro ao buscar cliente:', err);
        }
      }

      const foundAgendamento: AgendamentoPublico = {
        ...agendamentoData,
        id: agendamentoData.id || agendamentoId,
        empresaId,
        chamadoId,
        tokenPublico,
        questionariosIds: agendamentoData.questionariosIds || questionariosIds,
        tipoAtividadeNome: agendamentoData.tipoAtividadeNome || tipoAtividadeNome,
        clienteNome: chamadoData.clienteNome || clienteNome,
        clientePrefixo: clientePrefixo
      };

      if (foundAgendamento.status === 'concluido') {
        setError('Este formulário já foi preenchido e finalizado.');
        setLoading(false);
        return;
      }

      setAgendamento(foundAgendamento);

      const questionariosLoaded: QuestionarioDoc[] = [];
      for (const qId of foundAgendamento.questionariosIds) {
        const qDoc = await getDoc(doc(db, 'EMPRESAS', foundAgendamento.empresaId, 'questionarios', qId));
        if (qDoc.exists()) {
          questionariosLoaded.push({ id: qDoc.id, ...qDoc.data() } as QuestionarioDoc);
        }
      }

      setQuestionarios(questionariosLoaded);

      const initialRespostas: Record<string, Record<string, any>> = {};
      const initialAssinaturas: Record<string, Record<string, string>> = {};
      const initialFotos: Record<string, Record<string, File[]>> = {};
      const initialFotosPreview: Record<string, Record<string, string[]>> = {};

      questionariosLoaded.forEach((q) => {
        initialRespostas[q.id] = {};
        initialAssinaturas[q.id] = {};
        initialFotos[q.id] = {};
        initialFotosPreview[q.id] = {};
      });

      if (foundAgendamento.respostasQuestionarios) {
        foundAgendamento.respostasQuestionarios.forEach((rq) => {
          if (initialRespostas[rq.questionarioId]) {
            initialRespostas[rq.questionarioId] = rq.respostas || {};
            initialAssinaturas[rq.questionarioId] = rq.assinaturas || {};
          }
        });
      }

      setRespostas(initialRespostas);
      setAssinaturas(initialAssinaturas);
      setFotos(initialFotos);
      setFotosPreview(initialFotosPreview);

    } catch (err) {
      console.error('Erro ao carregar agendamento:', err);
      setError('Erro ao carregar o formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespostaChange = (questionarioId: string, perguntaId: string, valor: any) => {
    setRespostas((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: valor,
      },
    }));
  };

  const handleFotoUpload = (questionarioId: string, perguntaId: string, files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    setFotos((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: [...(prev[questionarioId]?.[perguntaId] || []), ...newFiles],
      },
    }));

    const previews = newFiles.map((file) => URL.createObjectURL(file));
    setFotosPreview((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: [...(prev[questionarioId]?.[perguntaId] || []), ...previews],
      },
    }));
  };

  const removeFoto = (questionarioId: string, perguntaId: string, index: number) => {
    setFotos((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: prev[questionarioId]?.[perguntaId]?.filter((_, i) => i !== index) || [],
      },
    }));
    setFotosPreview((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: prev[questionarioId]?.[perguntaId]?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvasId: string) => {
    setIsDrawing(true);
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvasId: string) => {
    if (!isDrawing) return;
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (questionarioId: string, perguntaId: string) => {
    setIsDrawing(false);
    const canvasId = `${questionarioId}-${perguntaId}`;
    const canvas = canvasRefs.current[canvasId];
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setAssinaturas((prev) => ({
        ...prev,
        [questionarioId]: {
          ...prev[questionarioId],
          [perguntaId]: dataUrl,
        },
      }));
    }
  };

  const clearSignature = (questionarioId: string, perguntaId: string) => {
    const canvasId = `${questionarioId}-${perguntaId}`;
    const canvas = canvasRefs.current[canvasId];
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setAssinaturas((prev) => ({
      ...prev,
      [questionarioId]: {
        ...prev[questionarioId],
        [perguntaId]: '',
      },
    }));
  };

  const uploadFotosToStorage = async (questionarioId: string): Promise<Record<string, string[]>> => {
    const fotosUrls: Record<string, string[]> = {};
    const questionarioFotos = fotos[questionarioId] || {};

    for (const [perguntaId, files] of Object.entries(questionarioFotos)) {
      fotosUrls[perguntaId] = [];
      for (const file of files) {
        const storageRef = ref(
          storage,
          `formularios/${agendamento?.empresaId}/${agendamento?.chamadoId}/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        fotosUrls[perguntaId].push(url);
      }
    }

    return fotosUrls;
  };

  const getAllPerguntas = (perguntas: Pergunta[]): Pergunta[] => {
    const result: Pergunta[] = [];
    for (const p of perguntas) {
      result.push(p);
      if (p.subPerguntas?.length > 0) {
        result.push(...getAllPerguntas(p.subPerguntas));
      }
    }
    return result;
  };

  const validateRespostas = (): { valid: boolean; erros: string[] } => {
    const erros: string[] = [];

    for (const questionario of questionarios) {
      const todasPerguntas = getAllPerguntas(questionario.perguntas);
      const respostasQ = respostas[questionario.id] || {};
      const assinaturasQ = assinaturas[questionario.id] || {};
      const fotosQ = fotos[questionario.id] || {};

      for (const pergunta of todasPerguntas) {
        if (!pergunta.obrigatoria) continue;

        const resposta = respostasQ[pergunta.id];
        const assinatura = assinaturasQ[pergunta.id];
        const fotosP = fotosQ[pergunta.id];

        let preenchido = false;

        switch (pergunta.tipoResposta) {
          case 'texto':
          case 'numerico':
            preenchido = resposta !== undefined && resposta !== null && String(resposta).trim() !== '';
            break;
          case 'booleano':
          case 'verdadeiro_falso':
            preenchido = resposta !== undefined && resposta !== null && resposta !== '';
            break;
          case 'checkbox':
            preenchido = resposta === true;
            break;
          case 'upload_fotos':
            preenchido = fotosP?.length > 0;
            break;
          case 'assinatura':
            preenchido = !!assinatura && assinatura.length > 100;
            break;
          default:
            preenchido = resposta !== undefined && resposta !== null;
        }

        if (!preenchido) {
          erros.push(`"${pergunta.titulo}" em "${questionario.nome}"`);
        }
      }
    }

    return { valid: erros.length === 0, erros };
  };

  const handleGoToFinalizacao = () => {
    const validation = validateRespostas();
    if (!validation.valid) {
      setError(`Preencha os campos obrigatórios: ${validation.erros.slice(0, 3).join(', ')}${validation.erros.length > 3 ? ` e mais ${validation.erros.length - 3}...` : ''}`);
      return;
    }
    setError('');
    setShowFinalizacaoStep(true);
  };

  const handleSubmit = async () => {
    if (!agendamento) return;

    if (tipoFinalizacao === 'pendencia_tecnica' && !pendenciaTecnicaDescricao.trim()) {
      setError('Descreva a pendência técnica antes de finalizar.');
      return;
    }

    if (tipoFinalizacao === 'pendencia_financeira' && !pendenciaFinanceira.descricao.trim()) {
      setError('Descreva a pendência financeira antes de finalizar.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const respostasQuestionarios: RespostaQuestionario[] = [];

      for (const questionario of questionarios) {
        const fotosUrls = await uploadFotosToStorage(questionario.id);

        respostasQuestionarios.push({
          questionarioId: questionario.id,
          questionarioNome: questionario.nome,
          respostas: respostas[questionario.id] || {},
          preenchidoEm: Timestamp.now(),
          assinaturas: assinaturas[questionario.id] || {},
          fotos: fotosUrls,
        });
      }

      const chamadoRef = doc(db, 'EMPRESAS', agendamento.empresaId, 'chamados', agendamento.chamadoId);
      const chamadoSnap = await getDoc(chamadoRef);

      if (chamadoSnap.exists()) {
        const chamadoData = chamadoSnap.data();
        const agendamentos = chamadoData.agendamentos || [];

        const updatedAgendamentos = agendamentos.map((ag: any) => {
          if (ag.tokenPublico === agendamento.tokenPublico) {
            const finalizacaoData: any = {
              ...ag,
              respostasQuestionarios,
              status: 'concluido',
              tipoFinalizacao,
              concluidoEm: Timestamp.now(),
            };

            if (tipoFinalizacao === 'pendencia_tecnica') {
              finalizacaoData.pendenciaTecnica = {
                descricao: pendenciaTecnicaDescricao,
                criadoEm: Timestamp.now(),
                resolvido: false,
              };
            }

            if (tipoFinalizacao === 'pendencia_financeira') {
              finalizacaoData.pendenciaFinanceira = {
                tipo: pendenciaFinanceira.tipo,
                descricao: pendenciaFinanceira.descricao,
                valor: pendenciaFinanceira.valor || null,
                houveRetirada: pendenciaFinanceira.houveRetirada || false,
                pecasRetiradas: pendenciaFinanceira.pecasRetiradas || null,
                localPecas: pendenciaFinanceira.localPecas || null,
                criadoEm: Timestamp.now(),
                resolvido: false,
              };
            }

            return finalizacaoData;
          }
          return ag;
        });

        const chamadoUpdate: any = {
          agendamentos: updatedAgendamentos,
          atualizadoEm: Timestamp.now(),
        };

        if (tipoFinalizacao === 'sem_pendencia') {
          chamadoUpdate.status = 'concluido';
        } else if (tipoFinalizacao === 'pendencia_tecnica') {
          chamadoUpdate.status = 'pendencia_tecnica';
          chamadoUpdate.pendenciaTecnica = {
            descricao: pendenciaTecnicaDescricao,
            criadoEm: Timestamp.now(),
            resolvido: false,
          };
        } else if (tipoFinalizacao === 'pendencia_financeira') {
          chamadoUpdate.status = 'pendencia_financeira';
          chamadoUpdate.tipoChamado = 'comercial';
          chamadoUpdate.pendenciaFinanceira = {
            tipo: pendenciaFinanceira.tipo,
            descricao: pendenciaFinanceira.descricao,
            valor: pendenciaFinanceira.valor || null,
            houveRetirada: pendenciaFinanceira.houveRetirada || false,
            pecasRetiradas: pendenciaFinanceira.pecasRetiradas || null,
            localPecas: pendenciaFinanceira.localPecas || null,
            criadoEm: Timestamp.now(),
            resolvido: false,
          };
        }

        await updateDoc(chamadoRef, chamadoUpdate);
      }

      setSuccess(true);
    } catch (err) {
      console.error('Erro ao salvar respostas:', err);
      setError('Erro ao salvar as respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPergunta = (questionarioId: string, pergunta: Pergunta, depth = 0) => {
    const resposta = respostas[questionarioId]?.[pergunta.id];
    const canvasId = `${questionarioId}-${pergunta.id}`;

    return (
      <Box key={pergunta.id} sx={{ ml: depth * 3, mb: 2 }}>
        <Card variant="outlined" sx={{ bgcolor: depth > 0 ? 'grey.50' : 'white' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {pergunta.titulo}
              {pergunta.obrigatoria && <span style={{ color: 'red' }}> *</span>}
            </Typography>
            {pergunta.descricao && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pergunta.descricao}
              </Typography>
            )}

            {pergunta.tipoResposta === 'booleano' && (
              <RadioGroup
                value={resposta ?? ''}
                onChange={(e) => handleRespostaChange(questionarioId, pergunta.id, e.target.value)}
              >
                <FormControlLabel value="sim" control={<Radio />} label="Sim" />
                <FormControlLabel value="nao" control={<Radio />} label="Não" />
              </RadioGroup>
            )}

            {pergunta.tipoResposta === 'verdadeiro_falso' && (
              <RadioGroup
                value={resposta ?? ''}
                onChange={(e) => handleRespostaChange(questionarioId, pergunta.id, e.target.value)}
              >
                <FormControlLabel value="verdadeiro" control={<Radio />} label="Verdadeiro" />
                <FormControlLabel value="falso" control={<Radio />} label="Falso" />
              </RadioGroup>
            )}

            {pergunta.tipoResposta === 'texto' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                value={resposta || ''}
                onChange={(e) => handleRespostaChange(questionarioId, pergunta.id, e.target.value)}
                placeholder="Digite sua resposta..."
              />
            )}

            {pergunta.tipoResposta === 'numerico' && (
              <TextField
                type="number"
                fullWidth
                value={resposta || ''}
                onChange={(e) => handleRespostaChange(questionarioId, pergunta.id, e.target.value)}
                placeholder="Digite um número..."
              />
            )}

            {pergunta.tipoResposta === 'checkbox' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={resposta === true}
                    onChange={(e) => handleRespostaChange(questionarioId, pergunta.id, e.target.checked)}
                  />
                }
                label="Marcar"
              />
            )}

            {pergunta.tipoResposta === 'upload_fotos' && (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CameraAlt />}
                >
                  Adicionar Fotos
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFotoUpload(questionarioId, pergunta.id, e.target.files)}
                  />
                </Button>
                {fotosPreview[questionarioId]?.[pergunta.id]?.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {fotosPreview[questionarioId][pergunta.id].map((preview, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <img
                          src={preview}
                          alt={`Foto ${index + 1}`}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                          }}
                          onClick={() => removeFoto(questionarioId, pergunta.id, index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {pergunta.tipoResposta === 'assinatura' && (
              <Box>
                <Box
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    bgcolor: '#fff',
                    touchAction: 'none',
                  }}
                >
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[canvasId] = el;
                      if (el && !el.dataset.initialized) {
                        const ctx = el.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#fff';
                          ctx.fillRect(0, 0, el.width, el.height);
                        }
                        el.dataset.initialized = 'true';
                      }
                    }}
                    width={300}
                    height={150}
                    style={{ display: 'block', width: '100%', maxWidth: 300, cursor: 'crosshair' }}
                    onMouseDown={(e) => startDrawing(e, canvasId)}
                    onMouseMove={(e) => draw(e, canvasId)}
                    onMouseUp={() => stopDrawing(questionarioId, pergunta.id)}
                    onMouseLeave={() => stopDrawing(questionarioId, pergunta.id)}
                    onTouchStart={(e) => startDrawing(e, canvasId)}
                    onTouchMove={(e) => draw(e, canvasId)}
                    onTouchEnd={() => stopDrawing(questionarioId, pergunta.id)}
                  />
                </Box>
                <Button
                  size="small"
                  color="secondary"
                  onClick={() => clearSignature(questionarioId, pergunta.id)}
                  sx={{ mt: 1 }}
                >
                  Limpar Assinatura
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {pergunta.subPerguntas?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {pergunta.subPerguntas.map((sub) => renderPergunta(questionarioId, sub, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', p: 2 }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Formulário Enviado!
          </Typography>
          <Typography color="text.secondary">
            Suas respostas foram salvas com sucesso. Você pode fechar esta página.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!agendamento || questionarios.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        <Alert severity="warning">Nenhum questionário encontrado para este agendamento.</Alert>
      </Box>
    );
  }

  const currentQuestionario = questionarios[currentQuestionarioIndex];

  if (showFinalizacaoStep) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 2, px: 1 }}>
        <Paper sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <IconButton onClick={() => setShowFinalizacaoStep(false)}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ color: '#00c0a3' }}>
              Finalizar Atividade
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Selecione como deseja finalizar esta atividade:
          </Typography>

          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <RadioGroup
              value={tipoFinalizacao}
              onChange={(e) => setTipoFinalizacao(e.target.value as TipoFinalizacao)}
            >
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: tipoFinalizacao === 'sem_pendencia' ? '#e8f5e9' : 'white',
                  borderColor: tipoFinalizacao === 'sem_pendencia' ? '#4caf50' : undefined
                }}
              >
                <CardContent>
                  <FormControlLabel
                    value="sem_pendencia"
                    control={<Radio color="success" />}
                    label={
                      <Box>
                        <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle color="success" fontSize="small" />
                          Finalizar sem pendência
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          A atividade foi concluída com sucesso, sem nenhuma pendência.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                </CardContent>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: tipoFinalizacao === 'pendencia_tecnica' ? '#fff3e0' : 'white',
                  borderColor: tipoFinalizacao === 'pendencia_tecnica' ? '#ff9800' : undefined
                }}
              >
                <CardContent>
                  <FormControlLabel
                    value="pendencia_tecnica"
                    control={<Radio color="warning" />}
                    label={
                      <Box>
                        <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Build color="warning" fontSize="small" />
                          Finalizar com pendência técnica
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          A atividade precisa de retorno técnico (peças, ajustes, etc).
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                  {tipoFinalizacao === 'pendencia_tecnica' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Descreva a pendência técnica *"
                      value={pendenciaTecnicaDescricao}
                      onChange={(e) => setPendenciaTecnicaDescricao(e.target.value)}
                      placeholder="Ex: Necessário retorno para substituição de peça X..."
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: tipoFinalizacao === 'pendencia_financeira' ? '#e3f2fd' : 'white',
                  borderColor: tipoFinalizacao === 'pendencia_financeira' ? '#2196f3' : undefined
                }}
              >
                <CardContent>
                  <FormControlLabel
                    value="pendencia_financeira"
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachMoney color="primary" fontSize="small" />
                          Finalizar com pendência financeira
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Há cobrança adicional ou orçamento pendente.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                  {tipoFinalizacao === 'pendencia_financeira' && (
                    <Box sx={{ mt: 2 }}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <FormLabel>Tipo de pendência</FormLabel>
                        <Select
                          value={pendenciaFinanceira.tipo}
                          onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, tipo: e.target.value as 'cobranca' | 'orcamento' }))}
                          size="small"
                        >
                          <MenuItem value="cobranca">Cobrança (serviço/peça realizada)</MenuItem>
                          <MenuItem value="orcamento">Orçamento (aprovar com cliente)</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Descrição da pendência *"
                        value={pendenciaFinanceira.descricao}
                        onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Ex: Troca de peça não coberta pelo contrato..."
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Valor estimado (opcional)"
                        value={pendenciaFinanceira.valor || ''}
                        onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, valor: e.target.value ? Number(e.target.value) : undefined }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                        sx={{ mb: 2 }}
                      />

                      {pendenciaFinanceira.tipo === 'orcamento' && (
                        <Box sx={{ p: 2, bgcolor: '#fff8e1', borderRadius: 2, border: '1px solid #ffcc80' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={pendenciaFinanceira.houveRetirada || false}
                                onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, houveRetirada: e.target.checked }))}
                                color="warning"
                              />
                            }
                            label={
                              <Typography fontWeight="bold" sx={{ color: '#e65100' }}>
                                Houve retirada de peças?
                              </Typography>
                            }
                          />
                          {pendenciaFinanceira.houveRetirada && (
                            <Box sx={{ mt: 1, pl: 4 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Quais peças foram retiradas?"
                                value={pendenciaFinanceira.pecasRetiradas || ''}
                                onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, pecasRetiradas: e.target.value }))}
                                placeholder="Ex: Compressor, placa eletrônica, motor..."
                                sx={{ mb: 2 }}
                              />
                              <TextField
                                fullWidth
                                label="Local das peças (opcional)"
                                value={pendenciaFinanceira.localPecas || ''}
                                onChange={(e) => setPendenciaFinanceira(prev => ({ ...prev, localPecas: e.target.value }))}
                                placeholder="Ex: Na oficina, com o cliente..."
                              />
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => setShowFinalizacaoStep(false)}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : 'Confirmar e Enviar'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 2, px: 1 }}>
      <Paper sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#00c0a3' }}>
            {agendamento.tipoAtividadeNome}
          </Typography>
          {agendamento.clienteNome && (
            <Typography variant="body2" color="text.secondary">
              Cliente: {agendamento.clientePrefixo ? `${agendamento.clientePrefixo} ` : ''}{agendamento.clienteNome}
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />

          {questionarios.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {questionarios.map((q, index) => (
                <Chip
                  key={q.id}
                  label={q.nome}
                  color={index === currentQuestionarioIndex ? 'primary' : 'default'}
                  onClick={() => setCurrentQuestionarioIndex(index)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          )}

          <Typography variant="h6" gutterBottom>
            {currentQuestionario.nome}
          </Typography>
        </Box>

        {currentQuestionario.perguntas.map((pergunta) =>
          renderPergunta(currentQuestionario.id, pergunta)
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          {currentQuestionarioIndex > 0 && (
            <Button
              variant="outlined"
              onClick={() => setCurrentQuestionarioIndex((prev) => prev - 1)}
            >
              Anterior
            </Button>
          )}

          {currentQuestionarioIndex < questionarios.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => setCurrentQuestionarioIndex((prev) => prev + 1)}
              sx={{ ml: 'auto' }}
            >
              Próximo
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleGoToFinalizacao}
              sx={{ ml: 'auto' }}
            >
              Continuar para Finalização
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
