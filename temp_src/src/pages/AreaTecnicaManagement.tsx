import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Divider,
  Stack,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  Warning,
  ExpandMore,
  PlayArrow,
  Schedule,
  Assignment,
  Settings,
  Build,
  AttachFile,
  ContentCopy,
  Link as LinkIcon,
  CheckCircle,
  Description,
  Download,
  Close,
  AttachMoney,
  Print,
  Replay,
  History,
  AssignmentReturn,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface Chamado {
  id: string;
  numeroOS: string;
  atendenteId: string;
  atendenteNome: string;
  dataHora: Timestamp;
  clienteId: string;
  clienteNome: string;
  clienteContatoNome?: string;
  clienteContatoApto?: string;
  clienteContatoFuncao?: string;
  clienteContatoTelefone?: string;
  clienteContatoWhatsapp?: string;
  clienteContatoEmail?: string;
  tipoChamado: 'tecnico' | 'comercial';
  urgente: boolean;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado' | 'pendencia_tecnica' | 'pendencia_financeira' | 'orcamento_aprovado' | 'aguardando_devolucao';
  tecnicoId?: string;
  tecnicoNome?: string;
  naturezaId?: string;
  naturezaNome?: string;
  tipoProdutoId?: string;
  tipoProdutoNome?: string;
  agendamentos?: Agendamento[];
  pendenciaTecnica?: PendenciaTecnica;
  pendenciaFinanceira?: PendenciaFinanceira;
  pendenciaRetornoTecnico?: PendenciaRetornoTecnico;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Natureza {
  id: string;
  nome: string;
  status: string;
}

interface TipoProduto {
  id: string;
  nome: string;
  naturezaId: string;
  status: string;
}

interface TipoAtividade {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: Timestamp;
}

interface RespostaQuestionario {
  questionarioId: string;
  questionarioNome: string;
  respostas: Record<string, any>;
  preenchidoEm: Timestamp;
  assinaturas: Record<string, string>;
  fotos: Record<string, string[]>;
}

interface PendenciaTecnica {
  descricao: string;
  criadoEm: Timestamp;
  resolvido: boolean;
  resolvidoEm?: Timestamp;
}

interface PendenciaFinanceira {
  tipo: 'cobranca' | 'orcamento';
  descricao: string;
  valor?: number;
  criadoEm: Timestamp;
  resolvido: boolean;
  resolvidoEm?: Timestamp;
  houveRetirada?: boolean;
  pecasRetiradas?: string;
  localPecas?: string;
}

interface PendenciaRetornoTecnico {
  motivo: string;
  descricao: string;
  orcamentoId?: string;
  orcamentoNumero?: string;
  pecasRetiradas?: string;
  localPecas?: string;
}

interface Agendamento {
  id: string;
  dataAgendamento: Timestamp;
  tecnicosIds: string[];
  tecnicosNomes: string[];
  tipoAtividadeId: string;
  tipoAtividadeNome: string;
  questionariosIds: string[];
  observacao: string;
  notificacaoHabilitada: boolean;
  status: 'agendado' | 'em_execucao' | 'concluido' | 'cancelado';
  criadoEm: Timestamp;
  criadoPorId: string;
  criadoPorNome: string;
  tokenPublico?: string;
  linkPublico?: string;
  respostasQuestionarios?: RespostaQuestionario[];
  concluidoEm?: Timestamp;
  tipoFinalizacao?: 'sem_pendencia' | 'pendencia_tecnica' | 'pendencia_financeira';
  pendenciaTecnica?: PendenciaTecnica;
  pendenciaFinanceira?: PendenciaFinanceira;
  tipoRetorno?: boolean;
  agendamentoOrigemId?: string;
}

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

interface Questionario {
  id: string;
  nome: string;
}

interface GestaoChamadoForm {
  dataAgendamento: string;
  tecnicosIds: string[];
  tipoAtividadeId: string;
  tipoAtividadeNome: string;
  questionariosIds: string[];
  descricao: string;
  equipamentosIds: string[];
  anexos: File[];
}

interface EquipamentoInstalado {
  id: string;
  nome: string;
  modelo?: string;
  serie?: string;
  dataInstalacao?: Timestamp;
  produtoNome?: string;
  produtoTipo?: string;
  localizacao?: string;
  quantidade?: number;
}

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto', color: 'info' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'warning' },
  { value: 'concluido', label: 'Concluído', color: 'success' },
  { value: 'cancelado', label: 'Cancelado', color: 'default' },
  { value: 'pendencia_tecnica', label: 'Pendência Técnica', color: 'error' },
  { value: 'pendencia_financeira', label: 'Pendência Financeira', color: 'secondary' },
  { value: 'orcamento_aprovado', label: 'Orçamento Aprovado', color: 'success' },
  { value: 'aguardando_devolucao', label: 'Aguardando Devolução', color: 'error' },
];

export function AreaTecnicaManagement() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  const [openAgendamentoDialog, setOpenAgendamentoDialog] = useState(false);
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [novoTipoAtividade, setNovoTipoAtividade] = useState('');
  const [questionarios, setQuestionarios] = useState<Questionario[]>([]);
  // ===== NOVO: abas dentro de cada chamado (por id)
  const [abaChamadoPorId, setAbaChamadoPorId] = useState<Record<string, number>>({});
  
  // ===== NOVO: Dialog para visualizar respostas do questionário
  const [openRelatorioDialog, setOpenRelatorioDialog] = useState(false);
  const [selectedAgendamentoRespostas, setSelectedAgendamentoRespostas] = useState<Agendamento | null>(null);
  const [questionariosMap, setQuestionariosMap] = useState<Record<string, any>>({});

  // ===== NOVO: Dialog para retorno técnico
  const [openRetornoDialog, setOpenRetornoDialog] = useState(false);
  const [retornoChamado, setRetornoChamado] = useState<Chamado | null>(null);
  const [retornoAgendamentoOrigem, setRetornoAgendamentoOrigem] = useState<Agendamento | null>(null);
  const [retornoForm, setRetornoForm] = useState({
    dataAgendamento: '',
    tecnicosIds: [] as string[],
    tipoAtividadeId: '',
    questionariosIds: [] as string[],
    observacao: '',
  });

  // ===== NOVO: Accordion de agendamentos expandidos
  const [expandedAgendamentos, setExpandedAgendamentos] = useState<Record<string, boolean>>({});

  // ===== NOVO: Form de gerenciamento por chamado
  const [gestaoFormPorChamado, setGestaoFormPorChamado] = useState<Record<string, GestaoChamadoForm>>({});

  // ===== NOVO: Equipamentos por clienteId
  const [equipamentosPorCliente, setEquipamentosPorCliente] = useState<Record<string, EquipamentoInstalado[]>>({});
  const [equipamentosLoadingPorCliente, setEquipamentosLoadingPorCliente] = useState<Record<string, boolean>>({});
  const [agendamentoForm, setAgendamentoForm] = useState({
    dataAgendamento: new Date().toISOString().slice(0, 16),
    tecnicosIds: [] as string[],
    tipoAtividadeId: '',
    tipoAtividadeNome: '',
    questionariosIds: [] as string[],
    observacao: '',
    notificacaoHabilitada: false,
  });

  const [formData, setFormData] = useState({
    atendenteId: '',
    dataHora: new Date().toISOString().slice(0, 16),
    urgente: false,
    descricao: '',
    status: 'aberto' as 'aberto' | 'em_andamento' | 'concluido' | 'cancelado' | 'pendencia_tecnica' | 'pendencia_financeira' | 'orcamento_aprovado' | 'aguardando_devolucao',
    tecnicoId: '',
    naturezaId: '',
    tipoProdutoId: '',
  });

  useEffect(() => {
    if (userData?.empresaId) {
      loadUsuarios();
      loadNaturezas();
      loadTiposProduto();
      loadTiposAtividade();
      loadQuestionarios();

      // Real-time listener para chamados
      const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');
      const q = query(chamadosRef, where('tipoChamado', '==', 'tecnico'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chamadosList: Chamado[] = [];
        snapshot.forEach((doc) => {
          chamadosList.push({ id: doc.id, ...doc.data() } as Chamado);
        });
        chamadosList.sort((a, b) => a.numeroOS.localeCompare(b.numeroOS));
        setChamados(chamadosList);
        setLoading(false);
      }, (err) => {
        setError('Erro ao carregar chamados técnicos: ' + err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [userData]);

  const loadUsuarios = async () => {
    if (!userData?.empresaId) return;

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
    }
  };

  const loadNaturezas = async () => {
    if (!userData?.empresaId) return;

    try {
      const parametrosRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(parametrosRef);

      const naturezasList: Natureza[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipoParametro === 'natureza' && data.status === 'ativo') {
          naturezasList.push({ id: doc.id, ...data } as Natureza);
        }
      });

      setNaturezas(naturezasList);
    } catch (err: any) {
      setError('Erro ao carregar naturezas: ' + err.message);
    }
  };

  const loadTiposProduto = async () => {
    if (!userData?.empresaId) return;

    try {
      const parametrosRef = collection(db, 'EMPRESAS', userData.empresaId, 'parametrosProdutos');
      const snapshot = await getDocs(parametrosRef);

      const tiposList: TipoProduto[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipoParametro === 'tipo' && data.status === 'ativo') {
          tiposList.push({ id: doc.id, ...data } as TipoProduto);
        }
      });

      setTiposProduto(tiposList);
    } catch (err: any) {
      setError('Erro ao carregar tipos de produto: ' + err.message);
    }
  };

  const loadTiposAtividade = async () => {
    if (!userData?.empresaId) return;

    try {
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades');
      const snapshot = await getDocs(tiposRef);

      const tiposList: TipoAtividade[] = [];
      snapshot.forEach((doc) => {
        tiposList.push({ id: doc.id, ...doc.data() } as TipoAtividade);
      });

      setTiposAtividade(tiposList);
    } catch (err: any) {
      console.error('Erro ao carregar tipos de atividade:', err);
    }
  };

  const loadQuestionarios = async () => {
    if (!userData?.empresaId) return;

    try {
      const questionariosRef = collection(db, 'EMPRESAS', userData.empresaId, 'questionarios');
      const snapshot = await getDocs(questionariosRef);

      const questionariosList: Questionario[] = [];
      const qMap: Record<string, any> = {};
      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        questionariosList.push(data as Questionario);
        qMap[docSnap.id] = data;
      });

      setQuestionarios(questionariosList);
      setQuestionariosMap(qMap);
    } catch (err: any) {
      console.error('Erro ao carregar questionários:', err);
    }
  };

  const handleOpenRelatorio = (agendamento: Agendamento) => {
    setSelectedAgendamentoRespostas(agendamento);
    setOpenRelatorioDialog(true);
  };

  const handleCloseRelatorio = () => {
    setOpenRelatorioDialog(false);
    setSelectedAgendamentoRespostas(null);
  };

  const formatarResposta = (perguntaId: string, resposta: any, questionarioId: string): string => {
    if (resposta === undefined || resposta === null) return '-';
    if (typeof resposta === 'boolean') return resposta ? 'Sim' : 'Não';
    if (resposta === 'sim' || resposta === 'nao') return resposta === 'sim' ? 'Sim' : 'Não';
    if (resposta === 'verdadeiro' || resposta === 'falso') return resposta === 'verdadeiro' ? 'Verdadeiro' : 'Falso';
    return String(resposta);
  };

  const gerarTextoRelatorio = (agendamento: Agendamento): string => {
    let texto = '';
    texto += '='.repeat(60) + '\n';
    texto += 'RELATÓRIO DE RESPOSTAS DO AGENDAMENTO\n';
    texto += '='.repeat(60) + '\n\n';
    
    texto += 'INFORMAÇÕES DO AGENDAMENTO\n';
    texto += '-'.repeat(40) + '\n';
    texto += `Tipo: ${agendamento.tipoAtividadeNome}\n`;
    texto += `Data: ${agendamento.dataAgendamento?.toDate?.()?.toLocaleString('pt-BR') || '-'}\n`;
    texto += `Técnicos: ${agendamento.tecnicosNomes?.join(', ') || '-'}\n`;
    if (agendamento.concluidoEm) {
      texto += `Concluído em: ${agendamento.concluidoEm.toDate().toLocaleString('pt-BR')}\n`;
    }
    texto += `Tipo de Finalização: ${
      agendamento.tipoFinalizacao === 'sem_pendencia' ? 'Sem pendência' :
      agendamento.tipoFinalizacao === 'pendencia_tecnica' ? 'Com pendência técnica' :
      agendamento.tipoFinalizacao === 'pendencia_financeira' ? 'Com pendência financeira' : 'Não informado'
    }\n`;
    
    if (agendamento.pendenciaTecnica) {
      texto += '\n*** PENDÊNCIA TÉCNICA ***\n';
      texto += agendamento.pendenciaTecnica.descricao + '\n';
    }
    
    if (agendamento.pendenciaFinanceira) {
      texto += `\n*** PENDÊNCIA FINANCEIRA (${agendamento.pendenciaFinanceira.tipo === 'cobranca' ? 'Cobrança' : 'Orçamento'}) ***\n`;
      texto += agendamento.pendenciaFinanceira.descricao + '\n';
      if (agendamento.pendenciaFinanceira.valor) {
        texto += `Valor: R$ ${agendamento.pendenciaFinanceira.valor.toFixed(2)}\n`;
      }
    }
    
    if (agendamento.respostasQuestionarios && agendamento.respostasQuestionarios.length > 0) {
      agendamento.respostasQuestionarios.forEach((rq, idx) => {
        texto += '\n' + '='.repeat(60) + '\n';
        texto += `QUESTIONÁRIO: ${rq.questionarioNome}\n`;
        texto += '-'.repeat(40) + '\n';
        if (rq.preenchidoEm) {
          texto += `Preenchido em: ${rq.preenchidoEm.toDate().toLocaleString('pt-BR')}\n`;
        }
        texto += '\n';
        
        const questionarioCompleto = questionariosMap[rq.questionarioId];
        if (questionarioCompleto?.perguntas) {
          const formatarPerguntaTexto = (pergunta: any, depth = 0): string => {
            let resultado = '';
            const indent = '  '.repeat(depth);
            resultado += `${indent}${pergunta.titulo}${pergunta.obrigatoria ? ' *' : ''}\n`;
            
            const resposta = rq.respostas[pergunta.id];
            const assinatura = rq.assinaturas?.[pergunta.id];
            const fotosP = rq.fotos?.[pergunta.id] || [];
            
            if (pergunta.tipoResposta === 'assinatura' && assinatura) {
              resultado += `${indent}  → [Assinatura registrada]\n`;
            } else if (pergunta.tipoResposta === 'upload_fotos' && fotosP.length > 0) {
              resultado += `${indent}  → [${fotosP.length} foto(s) anexada(s)]\n`;
              fotosP.forEach((url: string, i: number) => {
                resultado += `${indent}    Foto ${i + 1}: ${url}\n`;
              });
            } else {
              const valorResposta = formatarResposta(pergunta.id, resposta, rq.questionarioId);
              resultado += `${indent}  → ${valorResposta}\n`;
            }
            
            if (pergunta.subPerguntas?.length > 0) {
              pergunta.subPerguntas.forEach((sub: any) => {
                resultado += formatarPerguntaTexto(sub, depth + 1);
              });
            }
            
            return resultado;
          };
          
          questionarioCompleto.perguntas.forEach((pergunta: any) => {
            texto += formatarPerguntaTexto(pergunta);
          });
        } else {
          texto += 'Respostas: ' + JSON.stringify(rq.respostas, null, 2) + '\n';
        }
      });
    }
    
    texto += '\n' + '='.repeat(60) + '\n';
    texto += `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    
    return texto;
  };

  const handleDownloadRelatorio = () => {
    if (!selectedAgendamentoRespostas) return;
    
    const texto = gerarTextoRelatorio(selectedAgendamentoRespostas);
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${selectedAgendamentoRespostas.tipoAtividadeNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess('Relatório baixado com sucesso!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleOpenRetornoDialog = (chamado: Chamado, agendamentoOrigem: Agendamento) => {
    setRetornoChamado(chamado);
    setRetornoAgendamentoOrigem(agendamentoOrigem);
    setRetornoForm({
      dataAgendamento: '',
      tecnicosIds: agendamentoOrigem.tecnicosIds || [],
      tipoAtividadeId: agendamentoOrigem.tipoAtividadeId || '',
      questionariosIds: agendamentoOrigem.questionariosIds || [],
      observacao: `Retorno técnico referente ao agendamento de ${agendamentoOrigem.dataAgendamento?.toDate?.()?.toLocaleDateString('pt-BR') || '-'}`,
    });
    setOpenRetornoDialog(true);
  };

  const handleCloseRetornoDialog = () => {
    setOpenRetornoDialog(false);
    setRetornoChamado(null);
    setRetornoAgendamentoOrigem(null);
  };

  const handleConfirmarRetornoTecnico = async () => {
    if (!userData?.empresaId || !retornoChamado || !retornoAgendamentoOrigem) return;

    try {
      const token = generateToken();
      const baseUrl = window.location.origin;
      const linkPublico = `${baseUrl}/formulario/${token}`;

      const tipoAtividade = tiposAtividade.find(t => t.id === retornoForm.tipoAtividadeId);
      const tecnicosNomes = usuarios.filter(u => retornoForm.tecnicosIds.includes(u.id)).map(u => u.nome);

      const novoAgendamento: any = {
        id: `ag_${Date.now()}`,
        dataAgendamento: retornoForm.dataAgendamento ? Timestamp.fromDate(new Date(retornoForm.dataAgendamento)) : null,
        tecnicosIds: retornoForm.tecnicosIds,
        tecnicosNomes,
        tipoAtividadeId: retornoForm.tipoAtividadeId,
        tipoAtividadeNome: tipoAtividade?.nome || '',
        questionariosIds: retornoForm.questionariosIds,
        observacao: retornoForm.observacao,
        notificacaoHabilitada: false,
        status: 'agendado',
        criadoEm: Timestamp.now(),
        criadoPorId: userData.id || '',
        criadoPorNome: userData.nome || 'Sistema',
        tokenPublico: token,
        linkPublico,
        agendamentoOrigemId: retornoAgendamentoOrigem.id,
        tipoRetorno: true,
      };

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', retornoChamado.id);
      const agendamentosAtuais = retornoChamado.agendamentos || [];

      await updateDoc(chamadoRef, {
        agendamentos: [...agendamentosAtuais, novoAgendamento],
        status: 'em_andamento',
        atualizadoEm: Timestamp.now(),
      });

      const tokensRef = collection(db, 'tokensPublicos');
      await addDoc(tokensRef, {
        token,
        empresaId: userData.empresaId,
        chamadoId: retornoChamado.id,
        agendamentoId: novoAgendamento.id,
        criadoEm: Timestamp.now(),
        usado: false,
      });

      let emailEnviado = false;
      const tecnicosEmails = retornoForm.tecnicosIds
        .map(id => usuarios.find(u => u.id === id)?.email)
        .filter((email): email is string => !!email);

      if (tecnicosEmails.length > 0) {
        try {
          const dataFormatada = retornoForm.dataAgendamento 
            ? new Date(retornoForm.dataAgendamento).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'A definir';

          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: tecnicosEmails,
              subject: `Retorno Técnico Agendado - OS #${retornoChamado.numeroOS} - ${retornoChamado.clienteNome}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Retorno Técnico Agendado</h1>
                  </div>
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #333; margin-top: 0;">Detalhes do Retorno</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>OS:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">#${retornoChamado.numeroOS}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cliente:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${retornoChamado.clienteNome}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Data/Hora:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dataFormatada}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tipo de Atividade:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tipoAtividade?.nome || '-'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Técnicos:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tecnicosNomes.join(', ')}</td>
                      </tr>
                      ${retornoForm.observacao ? `
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Observação:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${retornoForm.observacao}</td>
                      </tr>
                      ` : ''}
                    </table>
                    <div style="margin-top: 20px; text-align: center;">
                      <a href="${linkPublico}" 
                         style="display: inline-block; background-color: #ff9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        Acessar Formulário de Atendimento
                      </a>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 12px; text-align: center;">
                      Este é um email automático. Por favor, não responda.
                    </p>
                  </div>
                </div>
              `
            })
          });
          const emailData = await emailResponse.json();
          emailEnviado = emailData.success;
        } catch (emailError) {
          console.error('Erro ao enviar email de retorno:', emailError);
        }
      }

      handleCloseRetornoDialog();
      if (tecnicosEmails.length > 0 && !emailEnviado) {
        setError('Retorno técnico criado, mas falha ao enviar email. Notifique os técnicos manualmente.');
      } else {
        setSuccess('Retorno técnico criado com sucesso!' + (emailEnviado ? ' Email enviado aos técnicos.' : ''));
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao criar retorno técnico:', err);
      setError('Erro ao criar retorno técnico. Tente novamente.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleGerarPDF = (chamado: Chamado) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;
    const lineHeight = 7;
    const margin = 15;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ORDEM DE SERVICO', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`OS: ${chamado.numeroOS}`, margin, yPos);
    yPos += lineHeight;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Data de Abertura: ${chamado.dataHora?.toDate?.()?.toLocaleDateString('pt-BR') || '-'}`, margin, yPos);
    yPos += lineHeight;
    pdf.text(`Status: ${formatarStatusChamado(chamado.status)}`, margin, yPos);
    yPos += lineHeight * 1.5;

    pdf.setFont('helvetica', 'bold');
    pdf.text('DADOS DO CLIENTE', margin, yPos);
    yPos += lineHeight;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Cliente: ${chamado.clienteNome}`, margin, yPos);
    yPos += lineHeight;
    if (chamado.clienteContatoNome) {
      pdf.text(`Contato: ${chamado.clienteContatoNome}`, margin, yPos);
      yPos += lineHeight;
    }
    if (chamado.clienteContatoTelefone) {
      pdf.text(`Telefone: ${chamado.clienteContatoTelefone}`, margin, yPos);
      yPos += lineHeight;
    }
    if (chamado.clienteContatoEmail) {
      pdf.text(`Email: ${chamado.clienteContatoEmail}`, margin, yPos);
      yPos += lineHeight;
    }
    yPos += lineHeight;

    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRICAO DO CHAMADO', margin, yPos);
    yPos += lineHeight;
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(chamado.descricao || 'Sem descricao', pageWidth - margin * 2);
    pdf.text(descLines, margin, yPos);
    yPos += descLines.length * lineHeight;
    yPos += lineHeight;

    if (chamado.pendenciaTecnica) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 100, 0);
      pdf.text('PENDENCIA TECNICA', margin, yPos);
      yPos += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const pendTecLines = pdf.splitTextToSize(chamado.pendenciaTecnica.descricao || '', pageWidth - margin * 2);
      pdf.text(pendTecLines, margin, yPos);
      yPos += pendTecLines.length * lineHeight + lineHeight;
    }

    if (chamado.pendenciaFinanceira) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 100, 200);
      pdf.text(`PENDENCIA FINANCEIRA (${chamado.pendenciaFinanceira.tipo === 'cobranca' ? 'Cobranca' : 'Orcamento'})`, margin, yPos);
      yPos += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const pendFinLines = pdf.splitTextToSize(chamado.pendenciaFinanceira.descricao || '', pageWidth - margin * 2);
      pdf.text(pendFinLines, margin, yPos);
      yPos += pendFinLines.length * lineHeight;
      if (chamado.pendenciaFinanceira.valor) {
        pdf.text(`Valor: R$ ${chamado.pendenciaFinanceira.valor.toFixed(2)}`, margin, yPos);
        yPos += lineHeight;
      }
      yPos += lineHeight;
    }

    if (chamado.agendamentos && chamado.agendamentos.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('HISTORICO DE AGENDAMENTOS', margin, yPos);
      yPos += lineHeight * 1.5;

      chamado.agendamentos.forEach((ag, idx) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${idx + 1}. ${ag.tipoAtividadeNome} ${ag.tipoRetorno ? '(RETORNO)' : ''}`, margin, yPos);
        yPos += lineHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`   Data: ${ag.dataAgendamento?.toDate?.()?.toLocaleDateString('pt-BR') || 'Nao agendado'}`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`   Tecnicos: ${ag.tecnicosNomes?.join(', ') || '-'}`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`   Status: ${ag.status}`, margin, yPos);
        yPos += lineHeight;

        if (ag.tipoFinalizacao) {
          pdf.text(`   Finalizacao: ${
            ag.tipoFinalizacao === 'sem_pendencia' ? 'Sem pendencia' :
            ag.tipoFinalizacao === 'pendencia_tecnica' ? 'Com pendencia tecnica' :
            'Com pendencia financeira'
          }`, margin, yPos);
          yPos += lineHeight;
        }

        if (ag.pendenciaTecnica) {
          pdf.setTextColor(255, 100, 0);
          const ptLines = pdf.splitTextToSize(`   Pend. Tecnica: ${ag.pendenciaTecnica.descricao}`, pageWidth - margin * 2);
          pdf.text(ptLines, margin, yPos);
          yPos += ptLines.length * lineHeight;
          pdf.setTextColor(0, 0, 0);
        }

        if (ag.pendenciaFinanceira) {
          pdf.setTextColor(0, 100, 200);
          const pfLines = pdf.splitTextToSize(`   Pend. Financeira (${ag.pendenciaFinanceira.tipo}): ${ag.pendenciaFinanceira.descricao}`, pageWidth - margin * 2);
          pdf.text(pfLines, margin, yPos);
          yPos += pfLines.length * lineHeight;
          if (ag.pendenciaFinanceira.valor) {
            pdf.text(`   Valor: R$ ${ag.pendenciaFinanceira.valor.toFixed(2)}`, margin, yPos);
            yPos += lineHeight;
          }
          pdf.setTextColor(0, 0, 0);
        }

        yPos += lineHeight;
      });
    }

    pdf.setFontSize(8);
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 285);

    pdf.save(`OS_${chamado.numeroOS}_${new Date().toISOString().split('T')[0]}.pdf`);
    setSuccess('PDF gerado com sucesso!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const formatarStatusChamado = (status: string) => {
    const statusMap: Record<string, string> = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluido',
      'cancelado': 'Cancelado',
      'pendencia_tecnica': 'Pendencia Tecnica',
      'pendencia_financeira': 'Pendencia Financeira',
    };
    return statusMap[status] || status;
  };

  const renderPerguntaRelatorio = (pergunta: any, respostas: Record<string, any>, assinaturas: Record<string, string>, fotos: Record<string, string[]>, depth = 0): React.ReactNode => {
    const resposta = respostas[pergunta.id];
    const assinatura = assinaturas?.[pergunta.id];
    const fotosP = fotos?.[pergunta.id] || [];

    return (
      <Box key={pergunta.id} sx={{ ml: depth * 2, mb: 1.5 }}>
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: depth > 0 ? '#f9f9f9' : '#fff', border: '1px solid #eee', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
            {pergunta.titulo}
            {pergunta.obrigatoria && <span style={{ color: 'red' }}> *</span>}
          </Typography>
          
          {pergunta.tipoResposta === 'assinatura' && assinatura ? (
            <Box>
              <Typography variant="caption" color="text.secondary">Assinatura:</Typography>
              <img src={assinatura} alt="Assinatura" style={{ maxWidth: 200, border: '1px solid #ddd', borderRadius: 4 }} />
            </Box>
          ) : pergunta.tipoResposta === 'upload_fotos' && fotosP.length > 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary">Fotos ({fotosP.length}):</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                {fotosP.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Foto ${idx + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                  </a>
                ))}
              </Stack>
            </Box>
          ) : (
            <Typography variant="body2" color="text.primary" sx={{ bgcolor: '#f5f5f5', p: 0.75, borderRadius: 1 }}>
              {formatarResposta(pergunta.id, resposta, pergunta.id) || <em style={{ color: '#999' }}>Não respondido</em>}
            </Typography>
          )}
        </Paper>
        
        {pergunta.subPerguntas?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {pergunta.subPerguntas.map((sub: any) => renderPerguntaRelatorio(sub, respostas, assinaturas, fotos, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const criarTipoAtividade = async (nome: string): Promise<TipoAtividade | null> => {
    if (!userData?.empresaId || !nome.trim()) return null;

    try {
      const tiposRef = collection(db, 'EMPRESAS', userData.empresaId, 'tipoAtividades');
      const docRef = await addDoc(tiposRef, {
        nome: nome.trim(),
        ativo: true,
        criadoEm: Timestamp.now(),
      });

      const novoTipo: TipoAtividade = {
        id: docRef.id,
        nome: nome.trim(),
        ativo: true,
        criadoEm: Timestamp.now(),
      };

      setTiposAtividade(prev => [...prev, novoTipo]);
      return novoTipo;
    } catch (err: any) {
      setError('Erro ao criar tipo de atividade: ' + err.message);
      return null;
    }
  };

  const handleOpenAgendamentoDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setAgendamentoForm({
      dataAgendamento: new Date().toISOString().slice(0, 16),
      tecnicosIds: [],
      tipoAtividadeId: '',
      tipoAtividadeNome: '',
      questionariosIds: [],
      observacao: '',
      notificacaoHabilitada: false,
    });
    setNovoTipoAtividade('');
    setOpenAgendamentoDialog(true);
  };

  const handleCloseAgendamentoDialog = () => {
    setOpenAgendamentoDialog(false);
    setSelectedChamado(null);
    setNovoTipoAtividade('');
  };

  const handleAgendamentoInputChange = (field: string, value: any) => {
    setAgendamentoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAgendamento = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    if (!agendamentoForm.dataAgendamento || agendamentoForm.tecnicosIds.length === 0) {
      setError('Preencha os campos obrigatórios: Data/Hora e Técnicos');
      return;
    }

    if (!agendamentoForm.tipoAtividadeId && !novoTipoAtividade.trim()) {
      setError('Selecione ou crie um tipo de atividade');
      return;
    }

    try {
      let tipoAtividadeId = agendamentoForm.tipoAtividadeId;
      let tipoAtividadeNome = agendamentoForm.tipoAtividadeNome;

      if (!tipoAtividadeId && novoTipoAtividade.trim()) {
        const novoTipo = await criarTipoAtividade(novoTipoAtividade);
        if (novoTipo) {
          tipoAtividadeId = novoTipo.id;
          tipoAtividadeNome = novoTipo.nome;
        } else {
          return;
        }
      }

      const tecnicosNomes = agendamentoForm.tecnicosIds.map(id => 
        usuarios.find(u => u.id === id)?.nome || ''
      );

      const token = generateToken();
      const linkPublico = `${window.location.origin}/formulario/${token}`;

      const novoAgendamento: Agendamento = {
        id: `ag-${Date.now()}`,
        dataAgendamento: Timestamp.fromDate(new Date(agendamentoForm.dataAgendamento)),
        tecnicosIds: agendamentoForm.tecnicosIds,
        tecnicosNomes: tecnicosNomes,
        tipoAtividadeId: tipoAtividadeId,
        tipoAtividadeNome: tipoAtividadeNome,
        questionariosIds: agendamentoForm.questionariosIds,
        observacao: agendamentoForm.observacao,
        notificacaoHabilitada: agendamentoForm.notificacaoHabilitada,
        status: 'agendado',
        criadoEm: Timestamp.now(),
        criadoPorId: userData?.id || '',
        criadoPorNome: userData?.nome || '',
        tokenPublico: token,
        linkPublico: linkPublico,
      };

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      const agendamentosAtuais = selectedChamado.agendamentos || [];
      
      await updateDoc(chamadoRef, {
        agendamentos: [...agendamentosAtuais, novoAgendamento],
        status: 'em_andamento',
        atualizadoEm: Timestamp.now(),
      });

      await addDoc(collection(db, 'tokensPublicos'), {
        token: token,
        empresaId: userData.empresaId,
        chamadoId: selectedChamado.id,
        agendamentoId: novoAgendamento.id,
        questionariosIds: agendamentoForm.questionariosIds,
        tipoAtividadeNome: tipoAtividadeNome,
        clienteNome: selectedChamado.clienteNome,
        criadoEm: Timestamp.now(),
        status: 'ativo',
      });

      let emailEnviado = false;
      console.log('[Email] Iniciando processo de envio de email...');
      console.log('[Email] Técnicos selecionados IDs:', agendamentoForm.tecnicosIds);
      console.log('[Email] Usuários disponíveis:', usuarios.map(u => ({ id: u.id, nome: u.nome, email: u.email })));
      
      const tecnicosEmails = agendamentoForm.tecnicosIds
        .map(id => {
          const usuario = usuarios.find(u => u.id === id);
          console.log(`[Email] Técnico ID ${id}: ${usuario?.nome || 'não encontrado'}, email: ${usuario?.email || 'sem email'}`);
          return usuario?.email;
        })
        .filter((email): email is string => !!email);

      console.log('[Email] Emails encontrados para envio:', tecnicosEmails);

      if (tecnicosEmails.length > 0) {
        console.log('[Email] Preparando envio de email...');
        try {
          const dataFormatada = new Date(agendamentoForm.dataAgendamento).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          console.log('[Email] Enviando requisição para /api/send-email...');
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: tecnicosEmails,
              subject: `Nova OS Agendada - #${selectedChamado.numeroOS} - ${selectedChamado.clienteNome}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #00c0a3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Nova OS Agendada</h1>
                  </div>
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #333; margin-top: 0;">Detalhes do Atendimento</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>OS:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">#${selectedChamado.numeroOS}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cliente:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${selectedChamado.clienteNome}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Data/Hora:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dataFormatada}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tipo de Atividade:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tipoAtividadeNome}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Técnicos:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${tecnicosNomes.join(', ')}</td>
                      </tr>
                      ${agendamentoForm.observacao ? `
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Observação:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${agendamentoForm.observacao}</td>
                      </tr>
                      ` : ''}
                      ${selectedChamado.descricao ? `
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Descrição:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${selectedChamado.descricao}</td>
                      </tr>
                      ` : ''}
                    </table>
                    <div style="margin-top: 20px; text-align: center;">
                      <a href="${linkPublico}" 
                         style="display: inline-block; background-color: #00c0a3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        Acessar Formulário de Atendimento
                      </a>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 12px; text-align: center;">
                      Este é um email automático. Por favor, não responda.
                    </p>
                  </div>
                </div>
              `
            })
          });
          const emailData = await emailResponse.json();
          console.log('[Email] Resposta do servidor:', emailData);
          emailEnviado = emailData.success;
          console.log('[Email] Email enviado com sucesso:', emailEnviado);
        } catch (emailError) {
          console.error('[Email] Erro ao enviar email:', emailError);
        }
      } else {
        console.log('[Email] Nenhum email para enviar - técnicos sem email cadastrado');
      }

      if (tecnicosEmails.length > 0 && !emailEnviado) {
        setError('Agendamento criado, mas falha ao enviar email. Notifique os técnicos manualmente.');
      } else {
        setSuccess('Agendamento criado com sucesso!' + (emailEnviado ? ' Email enviado aos técnicos.' : ''));
      }
      handleCloseAgendamentoDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao criar agendamento: ' + err.message);
    }
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleOpenViewDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenEditDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    
    // Pré-selecionar "Equipamento" se não houver natureza definida
    let naturezaIdToUse = chamado.naturezaId || '';
    if (!naturezaIdToUse) {
      const equipamentoNatureza = naturezas.find(nat => 
        nat.nome.toLowerCase().includes('equipamento')
      );
      if (equipamentoNatureza) {
        naturezaIdToUse = equipamentoNatureza.id;
      }
    }
    
    setFormData({
      atendenteId: chamado.atendenteId,
      dataHora: chamado.dataHora.toDate().toISOString().slice(0, 16),
      urgente: chamado.urgente,
      descricao: chamado.descricao,
      status: chamado.status,
      tecnicoId: chamado.tecnicoId || '',
      naturezaId: naturezaIdToUse,
      tipoProdutoId: chamado.tipoProdutoId || '',
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenDeleteDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedChamado(null);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'naturezaId') {
      // Limpar tipo de produto quando mudar a natureza
      setFormData((prev) => ({ ...prev, naturezaId: value, tipoProdutoId: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };
  /** =========================
   *  HELPERS: FORM POR CHAMADO
   *  ========================= */
  const ensureGestaoForm = (chamado: Chamado) => {
    setGestaoFormPorChamado((prev) => {
      if (prev[chamado.id]) return prev;

      return {
        ...prev,
        [chamado.id]: {
          titulo: `Execução • ${chamado.numeroOS}`,
          tipoAtividadeId: '',
          tipoAtividadeNome: '',
          dataAgendamento: new Date().toISOString().slice(0, 16),
          questionariosIds: [],
          descricao: chamado.descricao || '',
          tecnicosIds: [],
          equipamentosIds: [],
          anexos: [],
        },
      };
    });
  };
  const handleUpdate = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    if (!formData.atendenteId || !formData.descricao.trim()) {
      setError('Preencha os campos obrigatórios: Atendente e Descrição');
      return;
    }

    try {
      const atendente = usuarios.find(u => u.id === formData.atendenteId);
      if (!atendente) {
        setError('Atendente não encontrado');
        return;
      }

      const tecnico = formData.tecnicoId ? usuarios.find(u => u.id === formData.tecnicoId) : null;
      const natureza = formData.naturezaId ? naturezas.find(n => n.id === formData.naturezaId) : null;
      const tipoProduto = formData.tipoProdutoId ? tiposProduto.find(t => t.id === formData.tipoProdutoId) : null;

      const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      await updateDoc(docRef, {
        atendenteId: formData.atendenteId,
        atendenteNome: atendente.nome,
        dataHora: Timestamp.fromDate(new Date(formData.dataHora)),
        urgente: formData.urgente,
        descricao: formData.descricao,
        status: formData.status,
        tecnicoId: formData.tecnicoId || null,
        tecnicoNome: tecnico?.nome || null,
        naturezaId: formData.naturezaId || null,
        naturezaNome: natureza?.nome || null,
        tipoProdutoId: formData.tipoProdutoId || null,
        tipoProdutoNome: tipoProduto?.nome || null,
        atualizadoEm: Timestamp.now(),
      });

      setSuccess('Chamado atualizado com sucesso!');
      handleCloseEditDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao atualizar chamado: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id));
      setSuccess('Chamado excluído com sucesso!');
      handleCloseDeleteDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir chamado: ' + err.message);
    }
  };

  const chamadosAtivos = chamados.filter((chamado) => 
    chamado.status !== 'concluido' && chamado.status !== 'cancelado'
  );

  const chamadosHistorico = chamados.filter((chamado) => 
    chamado.status === 'concluido' || chamado.status === 'cancelado'
  );

  const currentChamados = tabValue === 0 ? chamadosAtivos : chamadosHistorico;

  const filteredChamados = currentChamados.filter((chamado) =>
    chamado.numeroOS.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chamado.clienteNome.toLowerCase().includes(searchTerm.toLowerCase())
  );
  /** =========================
   *  EQUIPAMENTOS DO CLIENTE (ABA 3)
   *  /EMPRESAS/{empresaId}/clientes/{clienteId}/equipamentos
   *  ========================= */
  const loadEquipamentosCliente = async (clienteId: string) => {
    if (!userData?.empresaId || !clienteId) return;

    // cache
    if (equipamentosPorCliente[clienteId]?.length) return;

    setEquipamentosLoadingPorCliente((prev) => ({ ...prev, [clienteId]: true }));
    try {
      const ref = collection(db, 'EMPRESAS', userData.empresaId, 'clientes', clienteId, 'equipamentos');
      const snap = await getDocs(ref);

      const list: EquipamentoInstalado[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));

      setEquipamentosPorCliente((prev) => ({ ...prev, [clienteId]: list }));
    } catch (err: any) {
      setError('Erro ao carregar equipamentos do cliente: ' + err.message);
    } finally {
      setEquipamentosLoadingPorCliente((prev) => ({ ...prev, [clienteId]: false }));
    }
  };

 

  const updateGestaoForm = (chamadoId: string, patch: Partial<GestaoChamadoForm>) => {
    setGestaoFormPorChamado((prev) => ({
      ...prev,
      [chamadoId]: {
        ...(prev[chamadoId] || {
          titulo: '',
          tipoAtividadeId: '',
          tipoAtividadeNome: '',
          dataAgendamento: new Date().toISOString().slice(0, 16),
          questionariosIds: [],
          descricao: '',
          tecnicosIds: [],
          equipamentosIds: [],
          anexos: [],
        }),
        ...patch,
      },
    }));
  };

  const handleSelectAnexos = (chamadoId: string, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const atual = gestaoFormPorChamado[chamadoId]?.anexos || [];
    updateGestaoForm(chamadoId, { anexos: [...atual, ...arr] });
  };

  const removeAnexo = (chamadoId: string, index: number) => {
    const atual = gestaoFormPorChamado[chamadoId]?.anexos || [];
    const novo = atual.filter((_, i) => i !== index);
    updateGestaoForm(chamadoId, { anexos: novo });
  };

return (
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Typography variant="h4" className="font-bold">
          Área Técnica - Gerenciamento
        </Typography>
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

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Chamados Ativos (${chamadosAtivos.length})`} />
          <Tab label={`Histórico (${chamadosHistorico.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <CircularProgress />
          <Typography variant="body2" className="mt-4" color="textSecondary">
            Carregando chamados técnicos...
          </Typography>
        </Box>
      ) : currentChamados.length === 0 ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <Typography variant="h6" className="mb-2" color="textSecondary">
            {tabValue === 0 ? 'Nenhum chamado ativo' : 'Nenhum chamado no histórico'}
          </Typography>
          {tabValue === 0 && (
            <Typography variant="body2" color="textSecondary">
              Os chamados técnicos aparecerão aqui automaticamente quando criados na Agenda
            </Typography>
          )}
        </Box>
      ) : (
        <>
          <Box className="mb-4">
            <TextField
              fullWidth
              size="small"
              label="Buscar por Nº OS ou Cliente"
              placeholder="Digite o número da OS ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
            />
          </Box>

          {filteredChamados.length === 0 ? (
            <Typography variant="body2" color="textSecondary" className="py-4 text-center">
              Nenhum chamado encontrado com o termo "{searchTerm}"
            </Typography>
          ) : (
            filteredChamados.map((chamado) => {
              const abaAtual = abaChamadoPorId[chamado.id] ?? 0;
              const gestao = gestaoFormPorChamado[chamado.id];

              return (
                <Accordion
                  key={chamado.id}
                  expanded={expandedAccordion === chamado.id}
                  onChange={handleAccordionChange(chamado.id)}
                  sx={{
                    mb: 1,
                    backgroundColor: chamado.status === 'orcamento_aprovado' 
                      ? '#e8f5e9' 
                      : chamado.status === 'aguardando_devolucao' 
                        ? '#ffebee' 
                        : chamado.urgente 
                          ? '#fff3e0' 
                          : 'white',
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: chamado.status === 'orcamento_aprovado' 
                      ? '2px solid #4caf50' 
                      : chamado.status === 'aguardando_devolucao' 
                        ? '2px solid #f44336'
                        : 'none',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                      <Typography fontWeight="bold">{chamado.numeroOS}</Typography>
                      {chamado.urgente && <Warning sx={{ fontSize: 18, color: '#f44336' }} />}
                    </Box>
                    <Typography sx={{ color: 'text.secondary', minWidth: 150 }}>
                      {chamado.dataHora.toDate().toLocaleString('pt-BR')}
                    </Typography>
                    <Typography sx={{ flexGrow: 1, minWidth: 200 }}>{chamado.clienteNome}</Typography>
                    
                    {chamado.status === 'orcamento_aprovado' && chamado.pendenciaRetornoTecnico && (
                      <Chip
                        icon={<Schedule sx={{ fontSize: 16 }} />}
                        label="AGENDAR EXECUÇÃO"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                    {chamado.status === 'aguardando_devolucao' && chamado.pendenciaRetornoTecnico && (
                      <Chip
                        icon={<AssignmentReturn sx={{ fontSize: 16 }} />}
                        label="AGENDAR DEVOLUÇÃO"
                        color="error"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                    
                    <Chip
                      label={STATUS_OPTIONS.find((s) => s.value === chamado.status)?.label}
                      color={STATUS_OPTIONS.find((s) => s.value === chamado.status)?.color as any}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Visualizar">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewDialog(chamado);
                          }}
                          sx={{ color: '#1976d2' }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(chamado);
                          }}
                          sx={{ color: '#ff9800' }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteDialog(chamado);
                          }}
                          sx={{ color: '#f44336' }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Imprimir PDF">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGerarPDF(chamado);
                          }}
                          sx={{ color: '#00c0a3' }}
                        >
                          <Print />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ pt: 0 }}>
                    {/* Abas internas */}
                    <Box
                      sx={{
                        position: 'sticky',
                        top: 0,
                        bgcolor: '#fff',
                        zIndex: 2,
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      <Tabs
                        value={abaAtual}
                        onChange={(_, v) => {
                          setAbaChamadoPorId((prev) => ({ ...prev, [chamado.id]: v }));

                          // ao entrar na aba Equipamentos, buscar do cliente
                          if (v === 2) {
                            loadEquipamentosCliente(chamado.clienteId);
                          }

                          // garante form
                          ensureGestaoForm(chamado);
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                          px: 1,
                          '& .MuiTab-root': { fontWeight: 900, textTransform: 'none', minHeight: 48 },
                          '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
                        }}
                      >
                        <Tab icon={<Assignment />} iconPosition="start" label="Chamado" />
                        <Tab icon={<Settings />} iconPosition="start" label="Gerenciamento" />
                        <Tab icon={<Build />} iconPosition="start" label="Equipamentos instalados" />
                        <Tab icon={<AttachFile />} iconPosition="start" label="Anexos" />
                      </Tabs>
                    </Box>

                    {/* Conteúdo das abas */}
                    <Box sx={{ p: 2 }}>
                      {/* ABA 1: INFORMAÇÕES DO CHAMADO */}
                      {abaAtual === 0 && (
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1976d2', mb: 1 }}>
                                  Informações do Chamado
                                </Typography>
                                <Stack spacing={0.75}>
                                  <Typography variant="body2"><strong>Atendente:</strong> {chamado.atendenteNome}</Typography>
                                  <Typography variant="body2"><strong>Técnico:</strong> {chamado.tecnicoNome || '-'}</Typography>
                                  <Typography variant="body2"><strong>Cliente:</strong> {chamado.clienteNome}</Typography>
                                  {chamado.clienteContatoNome && (
                                    <Typography variant="body2"><strong>Contato:</strong> {chamado.clienteContatoNome}</Typography>
                                  )}
                                  {chamado.clienteContatoTelefone && (
                                    <Typography variant="body2"><strong>Telefone:</strong> {chamado.clienteContatoTelefone}</Typography>
                                  )}
                                  {chamado.naturezaNome && (
                                    <Typography variant="body2"><strong>Natureza:</strong> {chamado.naturezaNome}</Typography>
                                  )}
                                  {chamado.tipoProdutoNome && (
                                    <Typography variant="body2"><strong>Tipo Produto:</strong> {chamado.tipoProdutoNome}</Typography>
                                  )}
                                </Stack>

                                <Divider sx={{ my: 1.5 }} />

                                <Typography variant="body2" sx={{ fontWeight: 900, mb: 0.5 }}>
                                  Descrição
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: 'pre-wrap',
                                    bgcolor: '#f5f5f5',
                                    p: 1,
                                    borderRadius: 1.5,
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {chamado.descricao}
                                </Typography>

                                {chamado.status === 'orcamento_aprovado' && chamado.pendenciaRetornoTecnico && (
                                  <Alert 
                                    severity="success" 
                                    icon={<Schedule />}
                                    sx={{ mt: 2, border: '2px solid #4caf50' }}
                                  >
                                    <Typography variant="subtitle2" fontWeight="bold" color="success.dark" gutterBottom>
                                      ORÇAMENTO APROVADO - AGENDAR EXECUÇÃO DO SERVIÇO
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Motivo:</strong> {chamado.pendenciaRetornoTecnico.motivo}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Detalhes:</strong> {chamado.pendenciaRetornoTecnico.descricao}
                                    </Typography>
                                    {chamado.pendenciaRetornoTecnico.orcamentoNumero && (
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>Orçamento:</strong> {chamado.pendenciaRetornoTecnico.orcamentoNumero}
                                      </Typography>
                                    )}
                                    {chamado.pendenciaRetornoTecnico.pecasRetiradas && (
                                      <Typography variant="body2" sx={{ mb: 1, color: '#ff9800', fontWeight: 'bold' }}>
                                        <strong>Peças Retiradas:</strong> {chamado.pendenciaRetornoTecnico.pecasRetiradas}
                                      </Typography>
                                    )}
                                    {chamado.pendenciaRetornoTecnico.localPecas && (
                                      <Typography variant="body2">
                                        <strong>Local das Peças:</strong> {chamado.pendenciaRetornoTecnico.localPecas}
                                      </Typography>
                                    )}
                                  </Alert>
                                )}

                                {chamado.status === 'aguardando_devolucao' && chamado.pendenciaRetornoTecnico && (
                                  <Alert 
                                    severity="error" 
                                    icon={<AssignmentReturn />}
                                    sx={{ mt: 2, border: '2px solid #f44336' }}
                                  >
                                    <Typography variant="subtitle2" fontWeight="bold" color="error" gutterBottom>
                                      ORÇAMENTO REPROVADO - AGENDAR DEVOLUÇÃO DE EQUIPAMENTO
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Motivo:</strong> {chamado.pendenciaRetornoTecnico.motivo}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Detalhes:</strong> {chamado.pendenciaRetornoTecnico.descricao}
                                    </Typography>
                                    {chamado.pendenciaRetornoTecnico.orcamentoNumero && (
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>Orçamento Reprovado:</strong> {chamado.pendenciaRetornoTecnico.orcamentoNumero}
                                      </Typography>
                                    )}
                                    {chamado.pendenciaRetornoTecnico.pecasRetiradas && (
                                      <Typography variant="body2" sx={{ mb: 1, bgcolor: '#fff3e0', p: 1, borderRadius: 1, border: '1px solid #ff9800' }}>
                                        <strong>Peças Retiradas:</strong> {chamado.pendenciaRetornoTecnico.pecasRetiradas}
                                      </Typography>
                                    )}
                                    {chamado.pendenciaRetornoTecnico.localPecas && (
                                      <Typography variant="body2">
                                        <strong>Local das Peças:</strong> {chamado.pendenciaRetornoTecnico.localPecas}
                                      </Typography>
                                    )}
                                  </Alert>
                                )}

                                {(chamado.pendenciaFinanceira?.houveRetirada || chamado.pendenciaFinanceira?.pecasRetiradas) && (
                                  <Alert 
                                    severity="warning" 
                                    icon={<Build />}
                                    sx={{ mt: 2, border: '2px solid #ff9800', bgcolor: '#fff3e0' }}
                                  >
                                    <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" gutterBottom>
                                      PEÇAS/EQUIPAMENTO RETIRADO
                                    </Typography>
                                    {chamado.pendenciaFinanceira?.pecasRetiradas && (
                                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem' }}>
                                        <strong>Peças:</strong> {chamado.pendenciaFinanceira?.pecasRetiradas}
                                      </Typography>
                                    )}
                                    {chamado.pendenciaFinanceira?.localPecas && (
                                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        <strong>Local:</strong> {chamado.pendenciaFinanceira?.localPecas}
                                      </Typography>
                                    )}
                                  </Alert>
                                )}

                                {chamado.pendenciaRetornoTecnico?.pecasRetiradas && 
                                  chamado.status !== 'orcamento_aprovado' && 
                                  chamado.status !== 'aguardando_devolucao' && (
                                  <Alert 
                                    severity="warning" 
                                    icon={<Build />}
                                    sx={{ mt: 2, border: '2px solid #ff9800', bgcolor: '#fff3e0' }}
                                  >
                                    <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" gutterBottom>
                                      PEÇAS/EQUIPAMENTO RETIRADO (Retorno Técnico)
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem' }}>
                                      <strong>Peças:</strong> {chamado.pendenciaRetornoTecnico?.pecasRetiradas}
                                    </Typography>
                                    {chamado.pendenciaRetornoTecnico?.localPecas && (
                                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        <strong>Local:</strong> {chamado.pendenciaRetornoTecnico?.localPecas}
                                      </Typography>
                                    )}
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>

                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1976d2', mb: 1 }}>
                                  Agendamentos ({chamado.agendamentos?.length || 0})
                                </Typography>

                                {(!chamado.agendamentos || chamado.agendamentos.length === 0) ? (
                                  <Typography variant="body2" color="textSecondary">
                                    Nenhum agendamento registrado
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                                    {chamado.agendamentos.map((ag, idx) => {
                                      const agKey = `${chamado.id}-${ag.id}`;
                                      const isExpanded = expandedAgendamentos[agKey] ?? false;
                                      
                                      return (
                                      <Accordion
                                        key={ag.id}
                                        expanded={isExpanded}
                                        onChange={() => setExpandedAgendamentos(prev => ({ ...prev, [agKey]: !isExpanded }))}
                                        sx={{
                                          boxShadow: 'none',
                                          border: '1px solid rgba(0,0,0,0.10)',
                                          borderRadius: '8px !important',
                                          bgcolor: ag.status === 'concluido' ? '#e8f5e9' : ag.tipoRetorno ? '#fff3e0' : '#fafafa',
                                          '&:before': { display: 'none' },
                                          '&.Mui-expanded': { margin: 0 },
                                        }}
                                      >
                                        <AccordionSummary
                                          expandIcon={<ExpandMore />}
                                          sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                                        >
                                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 1 }} flexWrap="wrap" gap={1}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                                {idx + 1}. {ag.dataAgendamento ? ag.dataAgendamento.toDate().toLocaleString('pt-BR') : 'Aguardando agendamento'}
                                              </Typography>
                                              {ag.tipoRetorno && (
                                                <Chip icon={<Replay fontSize="small" />} label="Retorno" size="small" color="warning" sx={{ height: 20 }} />
                                              )}
                                            </Box>
                                            <Chip
                                              label={ag.status === 'concluido' ? 'Concluído' : ag.status === 'agendado' ? 'Agendado' : ag.status === 'em_execucao' ? 'Em Execução' : ag.status}
                                              size="small"
                                              color={
                                                ag.status === 'concluido'
                                                  ? 'success'
                                                  : ag.status === 'agendado'
                                                    ? 'info'
                                                    : ag.status === 'em_execucao'
                                                      ? 'warning'
                                                      : 'default'
                                              }
                                              sx={{ fontWeight: 900, borderRadius: 2 }}
                                            />
                                          </Stack>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                                            {ag.status !== 'concluido' && ag.linkPublico && (
                                              <>
                                                <Tooltip title="Abrir formulário">
                                                  <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => window.open(ag.linkPublico, '_blank')}
                                                  >
                                                    <PlayArrow fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Copiar link">
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(ag.linkPublico || '');
                                                      setSuccess('Link copiado para a área de transferência!');
                                                      setTimeout(() => setSuccess(''), 2000);
                                                    }}
                                                  >
                                                    <ContentCopy fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              </>
                                            )}
                                            {ag.status === 'concluido' && (
                                              <>
                                                <Tooltip title="Ver relatório de respostas">
                                                  <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenRelatorio(ag)}
                                                  >
                                                    <Description fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Formulário preenchido">
                                                  <CheckCircle fontSize="small" color="success" />
                                                </Tooltip>
                                              </>
                                            )}
                                          </Stack>
                                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            <strong>Tipo:</strong> {ag.tipoAtividadeNome}
                                          </Typography>
                                          <Typography variant="body2">
                                            <strong>Técnicos:</strong> {ag.tecnicosNomes?.join(', ') || '-'}
                                          </Typography>

                                          {ag.questionariosIds?.length > 0 && (
                                            <Typography variant="body2">
                                              <strong>Questionários:</strong> {ag.questionariosIds.length} selecionado(s)
                                            </Typography>
                                          )}

                                          {ag.linkPublico && ag.status !== 'concluido' && (
                                            <Box sx={{ mt: 1, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <LinkIcon fontSize="small" color="primary" />
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  flex: 1,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap',
                                                  fontFamily: 'monospace',
                                                }}
                                              >
                                                {ag.linkPublico}
                                              </Typography>
                                            </Box>
                                          )}

                                          {ag.status === 'concluido' && ag.concluidoEm && (
                                            <Typography variant="caption" color="success.dark" sx={{ mt: 1, display: 'block' }}>
                                              Preenchido em: {ag.concluidoEm.toDate().toLocaleString('pt-BR')}
                                            </Typography>
                                          )}

                                          {ag.tipoFinalizacao === 'pendencia_tecnica' && ag.pendenciaTecnica && (
                                            <Alert severity="warning" sx={{ mt: 1 }} icon={<Build fontSize="small" />}>
                                              <Typography variant="caption" fontWeight="bold">Pendência Técnica:</Typography>
                                              <Typography variant="caption" display="block">{ag.pendenciaTecnica.descricao}</Typography>
                                            </Alert>
                                          )}

                                          {ag.tipoFinalizacao === 'pendencia_financeira' && ag.pendenciaFinanceira && (
                                            <Alert severity="info" sx={{ mt: 1 }} icon={<AttachMoney fontSize="small" />}>
                                              <Typography variant="caption" fontWeight="bold">
                                                Pendência Financeira ({ag.pendenciaFinanceira.tipo === 'cobranca' ? 'Cobrança' : 'Orçamento'}):
                                              </Typography>
                                              <Typography variant="caption" display="block">{ag.pendenciaFinanceira.descricao}</Typography>
                                              {ag.pendenciaFinanceira.valor && (
                                                <Typography variant="caption" display="block" fontWeight="bold">
                                                  Valor: R$ {ag.pendenciaFinanceira.valor.toFixed(2)}
                                                </Typography>
                                              )}
                                            </Alert>
                                          )}

                                          {ag.status === 'concluido' && ag.tipoFinalizacao === 'pendencia_tecnica' && (
                                            <Box sx={{ mt: 1.5 }}>
                                              <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<Replay />}
                                                onClick={() => handleOpenRetornoDialog(chamado, ag)}
                                                sx={{ 
                                                  bgcolor: '#ff9800', 
                                                  '&:hover': { bgcolor: '#f57c00' },
                                                  textTransform: 'none',
                                                  fontWeight: 'bold',
                                                }}
                                              >
                                                Gerar Retorno Técnico
                                              </Button>
                                            </Box>
                                          )}
                                        </AccordionDetails>
                                      </Accordion>
                                      );
                                    })}
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      )}

                      {/* ABA 2: GERENCIAMENTO (campos do agendamento/tarefa) */}
                      {abaAtual === 1 && (
                        <Box>
                          {!gestao ? (
                            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : (
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Box
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: '1px solid rgba(0,0,0,0.10)',
                                    bgcolor: '#f5f5f5',
                                    minHeight: 56,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                    Título do Chamado
                                  </Typography>
                                  <Typography sx={{ fontWeight: 800 }}>
                                    {chamado.descricao?.substring(0, 50) || chamado.numeroOS}{chamado.descricao?.length > 50 ? '...' : ''}
                                  </Typography>
                                </Box>
                              </Grid>

                              <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                  fullWidth
                                  type="datetime-local"
                                  label="Data do Agendamento"
                                  value={gestao.dataAgendamento}
                                  onChange={(e) => updateGestaoForm(chamado.id, { dataAgendamento: e.target.value })}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                                />
                              </Grid>

                              <Grid size={{ xs: 12 }}>
                                <Autocomplete
                                  options={tiposAtividade}
                                  getOptionLabel={(o) => o.nome}
                                  value={tiposAtividade.find((t) => t.id === gestao.tipoAtividadeId) || null}
                                  onChange={(_, newValue) => {
                                    updateGestaoForm(chamado.id, { 
                                      tipoAtividadeId: newValue?.id || '', 
                                      tipoAtividadeNome: newValue?.nome || '' 
                                    });
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Tipo de Tarefa (Atividade)"
                                      placeholder="Selecione o tipo de atividade"
                                      sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid size={{ xs: 12 }}>
                                <Autocomplete
                                  multiple
                                  options={questionarios}
                                  getOptionLabel={(o) => o.nome}
                                  value={questionarios.filter((q) => gestao.questionariosIds.includes(q.id))}
                                  onChange={(_, newValue) => updateGestaoForm(chamado.id, { questionariosIds: newValue.map((v) => v.id) })}
                                  noOptionsText="Nenhum questionário cadastrado"
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Questionários"
                                      placeholder="Selecione os questionários"
                                      sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                                    />
                                  )}
                                  renderOption={(props, option, { selected }) => (
                                    <li {...props}>
                                      <Checkbox checked={selected} sx={{ mr: 1 }} />
                                      {option.nome}
                                    </li>
                                  )}
                                />
                              </Grid>

                              <Grid size={{ xs: 12 }}>
                                <Autocomplete
                                  multiple
                                  options={usuarios}
                                  getOptionLabel={(o) => o.nome}
                                  value={usuarios.filter((u) => gestao.tecnicosIds.includes(u.id))}
                                  onChange={(_, newValue) => updateGestaoForm(chamado.id, { tecnicosIds: newValue.map((v) => v.id) })}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Técnicos na Atividade"
                                      placeholder="Selecione os técnicos"
                                      sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                                    />
                                  )}
                                  renderOption={(props, option, { selected }) => (
                                    <li {...props}>
                                      <Checkbox checked={selected} sx={{ mr: 1 }} />
                                      {option.nome}
                                    </li>
                                  )}
                                />
                              </Grid>

                              <Grid size={{ xs: 12 }}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={5}
                                  label="Descrição"
                                  value={gestao.descricao}
                                  onChange={(e) => updateGestaoForm(chamado.id, { descricao: e.target.value })}
                                  sx={{ '& .MuiInputBase-root': { minHeight: 120 } }}
                                />
                              </Grid>

                            </Grid>
                          )}
                        </Box>
                      )}

                      {/* ABA 3: EQUIPAMENTOS INSTALADOS (busca no cliente/equipamentos) */}
                      {abaAtual === 2 && (
                        <Box>
                          {!gestao ? (
                            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : (
                            <>
                              <Typography sx={{ fontWeight: 900, color: '#1976d2', mb: 1 }}>
                                Equipamentos instalados do cliente
                              </Typography>

                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  border: '1px solid rgba(0,0,0,0.10)',
                                  bgcolor: '#fff',
                                }}
                              >
                                {equipamentosLoadingPorCliente[chamado.clienteId] ? (
                                  <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                                    <CircularProgress />
                                  </Box>
                                ) : (equipamentosPorCliente[chamado.clienteId]?.length || 0) === 0 ? (
                                  <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                    Nenhum equipamento encontrado em:
                                    <br />
                                    <code>
                                      /EMPRESAS/{userData?.empresaId}/clientes/{chamado.clienteId}/equipamentos
                                    </code>
                                  </Typography>
                                ) : (
                                  <List dense sx={{ p: 0 }}>
                                    {(equipamentosPorCliente[chamado.clienteId] || []).map((eq) => {
                                      const checked = gestao.equipamentosIds.includes(eq.id);
                                      const dataInst = eq.dataInstalacao?.toDate?.()
                                        ? eq.dataInstalacao.toDate().toLocaleString('pt-BR')
                                        : '-';

                                      return (
                                        <ListItem
                                          key={eq.id}
                                          sx={{
                                            borderRadius: 2,
                                            mb: 0.75,
                                            border: '1px solid rgba(0,0,0,0.08)',
                                          }}
                                          secondaryAction={
                                            <Checkbox
                                              edge="end"
                                              checked={checked}
                                              onChange={(e) => {
                                                const next = e.target.checked
                                                  ? [...gestao.equipamentosIds, eq.id]
                                                  : gestao.equipamentosIds.filter((x) => x !== eq.id);
                                                updateGestaoForm(chamado.id, { equipamentosIds: next });
                                              }}
                                            />
                                          }
                                        >
                                          <ListItemIcon>
                                            <Build sx={{ color: '#1976d2' }} />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={
                                              <Typography sx={{ fontWeight: 900 }}>
                                                {eq.produtoNome || 'Equipamento'}{' '}
                                                <Typography component="span" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                  ({eq.produtoTipo || 'tipo'})
                                                </Typography>
                                              </Typography>
                                            }
                                            secondary={
                                              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                                Local: {eq.localizacao || '-'} • Qtd: {eq.quantidade ?? '-'} • Instalação: {dataInst}
                                              </Typography>
                                            }
                                          />
                                        </ListItem>
                                      );
                                    })}
                                  </List>
                                )}
                              </Paper>

                              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Chip
                                  label={`Selecionados: ${gestao.equipamentosIds.length}`}
                                  color={gestao.equipamentosIds.length ? 'primary' : 'default'}
                                  sx={{ fontWeight: 900, borderRadius: 2 }}
                                />
                              </Box>
                            </>
                          )}
                        </Box>
                      )}

                      {/* ABA 4: ANEXOS */}
                      {abaAtual === 3 && (
                        <Box>
                          {!gestao ? (
                            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : (
                            <>
                              <Typography sx={{ fontWeight: 900, color: '#1976d2', mb: 1 }}>
                                Anexos para análise do técnico (manuais, fotos, PDFs)
                              </Typography>

                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  border: '1px solid rgba(0,0,0,0.10)',
                                  bgcolor: '#fff',
                                }}
                              >
                                <Button
                                  component="label"
                                  variant="outlined"
                                  startIcon={<AttachFile />}
                                  sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none' }}
                                >
                                  Selecionar arquivos
                                  <input
                                    type="file"
                                    hidden
                                    multiple
                                    onChange={(e) => handleSelectAnexos(chamado.id, e.target.files)}
                                  />
                                </Button>

                                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontWeight: 700 }}>
                                  (Upload para o Storage não está implementado aqui. Se quiser, eu já conecto o upload e salvo URLs no agendamento.)
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                {(gestao.anexos || []).length === 0 ? (
                                  <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                    Nenhum anexo selecionado.
                                  </Typography>
                                ) : (
                                  <List dense sx={{ p: 0 }}>
                                    {gestao.anexos.map((file, idx) => (
                                      <ListItem
                                        key={`${file.name}_${idx}`}
                                        sx={{ borderRadius: 2, mb: 0.75, border: '1px solid rgba(0,0,0,0.08)' }}
                                        secondaryAction={
                                          <Button
                                            color="error"
                                            size="small"
                                            onClick={() => removeAnexo(chamado.id, idx)}
                                            sx={{ fontWeight: 900, textTransform: 'none' }}
                                          >
                                            Remover
                                          </Button>
                                        }
                                      >
                                        <ListItemIcon>
                                          <AttachFile sx={{ color: '#1976d2' }} />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={<Typography sx={{ fontWeight: 900 }}>{file.name}</Typography>}
                                          secondary={
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                              {(file.size / 1024).toFixed(1)} KB
                                            </Typography>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Paper>

                              {tabValue === 0 && chamado.status !== 'concluido' && (
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<PlayArrow />}
                                    onClick={async () => {
                                      if (!userData?.empresaId || !gestao) return;
                                      
                                      if (!gestao.dataAgendamento || gestao.dataAgendamento.trim() === '') {
                                        setError('Por favor, preencha a Data/Hora do Agendamento na aba Gerenciamento.');
                                        return;
                                      }
                                      
                                      if (!gestao.tipoAtividadeId || gestao.tipoAtividadeId.trim() === '') {
                                        setError('Por favor, selecione um Tipo de Atividade na aba Gerenciamento.');
                                        return;
                                      }
                                      
                                      const dataAgendamento = new Date(gestao.dataAgendamento);
                                      if (isNaN(dataAgendamento.getTime())) {
                                        setError('Data/Hora do Agendamento inválida. Por favor, corrija na aba Gerenciamento.');
                                        return;
                                      }
                                      
                                      const token = generateToken();
                                      const linkPublico = `${window.location.origin}/formulario/${token}`;

                                      const novoAgendamento: Agendamento = {
                                        id: `ag_${Date.now()}`,
                                        dataAgendamento: Timestamp.fromDate(dataAgendamento),
                                        tecnicosIds: gestao.tecnicosIds,
                                        tecnicosNomes: usuarios.filter((u) => gestao.tecnicosIds.includes(u.id)).map((u) => u.nome),
                                        tipoAtividadeId: gestao.tipoAtividadeId,
                                        tipoAtividadeNome: gestao.tipoAtividadeNome,
                                        questionariosIds: gestao.questionariosIds,
                                        observacao: gestao.descricao,
                                        notificacaoHabilitada: true,
                                        status: 'agendado',
                                        criadoEm: Timestamp.now(),
                                        criadoPorId: userData.id || '',
                                        criadoPorNome: userData.nome || '',
                                        tokenPublico: token,
                                        linkPublico: linkPublico,
                                      };

                                      const agendamentosAtuais = chamado.agendamentos || [];
                                      
                                      try {
                                        await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'chamados', chamado.id), {
                                          agendamentos: [...agendamentosAtuais, novoAgendamento],
                                          status: 'em_andamento',
                                          atualizadoEm: Timestamp.now(),
                                        });

                                        await addDoc(collection(db, 'tokensPublicos'), {
                                          token: token,
                                          empresaId: userData.empresaId,
                                          chamadoId: chamado.id,
                                          agendamentoId: novoAgendamento.id,
                                          questionariosIds: gestao.questionariosIds,
                                          tipoAtividadeNome: gestao.tipoAtividadeNome,
                                          clienteNome: chamado.clienteNome,
                                          criadoEm: Timestamp.now(),
                                          status: 'ativo',
                                        });

                                        setSuccess('Agendamento criado e status atualizado para Em Andamento!');
                                        setTimeout(() => setSuccess(''), 3000);
                                        setAbaChamadoPorId((prev) => ({ ...prev, [chamado.id]: 0 }));
                                      } catch (err: any) {
                                        setError('Erro ao criar agendamento: ' + err.message);
                                      }
                                    }}
                                    sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none', px: 3 }}
                                  >
                                    Agendar Execução
                                  </Button>
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </>
      )}

      {/* ==========================================
          DIALOGS (mantive os seus; aqui só deixei o View + Delete)
          Ajuste/mescle com seus dialogs existentes
         ========================================== */}

      {/* Dialog de Visualização (seu original) */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Chamado Técnico</DialogTitle>
        <DialogContent>
          {selectedChamado && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Nº da O.S.:
                </Typography>
                <Box className="flex items-center gap-2">
                  <Typography>{selectedChamado.numeroOS}</Typography>
                  {selectedChamado.urgente && (
                    <Chip icon={<Warning />} label="URGENTE" color="error" size="small" />
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Data e Hora:
                </Typography>
                <Typography>{selectedChamado.dataHora.toDate().toLocaleString('pt-BR')}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Atendente:
                </Typography>
                <Typography>{selectedChamado.atendenteNome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Cliente:
                </Typography>
                <Typography>{selectedChamado.clienteNome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Status:
                </Typography>
                <Chip
                  label={STATUS_OPTIONS.find((s) => s.value === selectedChamado.status)?.label}
                  color={STATUS_OPTIONS.find((s) => s.value === selectedChamado.status)?.color as any}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">
                  Descrição:
                </Typography>
                <Typography className="whitespace-pre-wrap">{selectedChamado.descricao}</Typography>
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
        <DialogTitle sx={{ color: '#f44336' }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o chamado <strong>{selectedChamado?.numeroOS}</strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Agendamento (seu existente) - mantenha o seu aqui */}
      <Dialog
        open={openAgendamentoDialog}
        onClose={handleCloseAgendamentoDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Agendar Execução (mantenha seu dialog atual aqui)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Você pode optar por migrar esse fluxo para a aba "Gerenciamento" (mais moderno).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAgendamentoDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edição (seu existente) - mantenha o seu aqui */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Editar Chamado Técnico (mantenha seu dialog atual aqui)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cole aqui seu dialog de edição atual.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Retorno Técnico */}
      <Dialog open={openRetornoDialog} onClose={handleCloseRetornoDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Replay color="warning" />
            Configurar Retorno Técnico
          </Box>
          <IconButton onClick={handleCloseRetornoDialog} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {retornoAgendamentoOrigem && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Criando retorno técnico referente ao agendamento de{' '}
                  <strong>{retornoAgendamentoOrigem.dataAgendamento?.toDate?.()?.toLocaleDateString('pt-BR') || 'data não definida'}</strong>
                </Typography>
                {retornoAgendamentoOrigem.pendenciaTecnica && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Pendência:</strong> {retornoAgendamentoOrigem.pendenciaTecnica.descricao}
                  </Typography>
                )}
                {retornoAgendamentoOrigem.pendenciaFinanceira && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Pendência:</strong> {retornoAgendamentoOrigem.pendenciaFinanceira.descricao}
                  </Typography>
                )}
              </Alert>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Data e Hora do Retorno"
                    type="datetime-local"
                    fullWidth
                    value={retornoForm.dataAgendamento}
                    onChange={(e) => setRetornoForm({ ...retornoForm, dataAgendamento: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Deixe em branco se ainda não definido"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Tipo de Atividade"
                    fullWidth
                    value={retornoForm.tipoAtividadeId}
                    onChange={(e) => setRetornoForm({ ...retornoForm, tipoAtividadeId: e.target.value })}
                  >
                    {tiposAtividade.filter(t => t.ativo).map((tipo) => (
                      <MenuItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={usuarios}
                    getOptionLabel={(option) => option.nome}
                    value={usuarios.filter(u => retornoForm.tecnicosIds.includes(u.id))}
                    onChange={(_, newValue) => setRetornoForm({ ...retornoForm, tecnicosIds: newValue.map(u => u.id) })}
                    renderInput={(params) => (
                      <TextField {...params} label="Técnicos Responsáveis" placeholder="Selecione os técnicos" />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        {option.nome}
                      </li>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={questionarios}
                    getOptionLabel={(option) => option.nome}
                    value={questionarios.filter(q => retornoForm.questionariosIds.includes(q.id))}
                    onChange={(_, newValue) => setRetornoForm({ ...retornoForm, questionariosIds: newValue.map(q => q.id) })}
                    renderInput={(params) => (
                      <TextField {...params} label="Questionários" placeholder="Selecione os questionários" />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        {option.nome}
                      </li>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Observação"
                    fullWidth
                    multiline
                    rows={3}
                    value={retornoForm.observacao}
                    onChange={(e) => setRetornoForm({ ...retornoForm, observacao: e.target.value })}
                    placeholder="Detalhes adicionais sobre o retorno técnico..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRetornoDialog}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<Replay />}
            onClick={handleConfirmarRetornoTecnico}
            disabled={!retornoForm.tipoAtividadeId || retornoForm.tecnicosIds.length === 0}
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
          >
            Confirmar Retorno
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Relatório de Respostas */}
      <Dialog open={openRelatorioDialog} onClose={handleCloseRelatorio} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description color="primary" />
            Relatório de Respostas
          </Box>
          <IconButton onClick={handleCloseRelatorio} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAgendamentoRespostas && (
            <Box>
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Informações do Agendamento
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {selectedAgendamentoRespostas.tipoAtividadeNome}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data:</strong> {selectedAgendamentoRespostas.dataAgendamento?.toDate?.()?.toLocaleString('pt-BR') || '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Técnicos:</strong> {selectedAgendamentoRespostas.tecnicosNomes?.join(', ') || '-'}
                  </Typography>
                  {selectedAgendamentoRespostas.concluidoEm && (
                    <Typography variant="body2">
                      <strong>Concluído em:</strong> {selectedAgendamentoRespostas.concluidoEm.toDate().toLocaleString('pt-BR')}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Tipo de Finalização:</strong>{' '}
                    {selectedAgendamentoRespostas.tipoFinalizacao === 'sem_pendencia' ? 'Sem pendência' :
                     selectedAgendamentoRespostas.tipoFinalizacao === 'pendencia_tecnica' ? 'Com pendência técnica' :
                     selectedAgendamentoRespostas.tipoFinalizacao === 'pendencia_financeira' ? 'Com pendência financeira' : 'Não informado'}
                  </Typography>
                </Stack>

                {selectedAgendamentoRespostas.pendenciaTecnica && (
                  <Alert severity="warning" sx={{ mt: 2 }} icon={<Build fontSize="small" />}>
                    <Typography variant="body2" fontWeight="bold">Pendência Técnica:</Typography>
                    <Typography variant="body2">{selectedAgendamentoRespostas.pendenciaTecnica.descricao}</Typography>
                  </Alert>
                )}

                {selectedAgendamentoRespostas.pendenciaFinanceira && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={<AttachMoney fontSize="small" />}>
                    <Typography variant="body2" fontWeight="bold">
                      Pendência Financeira ({selectedAgendamentoRespostas.pendenciaFinanceira.tipo === 'cobranca' ? 'Cobrança' : 'Orçamento'}):
                    </Typography>
                    <Typography variant="body2">{selectedAgendamentoRespostas.pendenciaFinanceira.descricao}</Typography>
                    {selectedAgendamentoRespostas.pendenciaFinanceira.valor && (
                      <Typography variant="body2" fontWeight="bold">
                        Valor: R$ {selectedAgendamentoRespostas.pendenciaFinanceira.valor.toFixed(2)}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {(!selectedAgendamentoRespostas.respostasQuestionarios || selectedAgendamentoRespostas.respostasQuestionarios.length === 0) ? (
                <Alert severity="info">Nenhuma resposta de questionário registrada.</Alert>
              ) : (
                selectedAgendamentoRespostas.respostasQuestionarios.map((rq, idx) => {
                  const questionarioCompleto = questionariosMap[rq.questionarioId];
                  
                  return (
                    <Box key={idx} sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#00c0a3', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment fontSize="small" />
                        {rq.questionarioNome}
                      </Typography>
                      {rq.preenchidoEm && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                          Preenchido em: {rq.preenchidoEm.toDate().toLocaleString('pt-BR')}
                        </Typography>
                      )}
                      
                      {questionarioCompleto?.perguntas ? (
                        questionarioCompleto.perguntas.map((pergunta: any) => 
                          renderPerguntaRelatorio(pergunta, rq.respostas, rq.assinaturas, rq.fotos)
                        )
                      ) : (
                        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Respostas registradas (questionário não encontrado para exibição completa):
                          </Typography>
                          <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                            {JSON.stringify(rq.respostas, null, 2)}
                          </pre>
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownloadRelatorio}
            color="primary"
          >
            Baixar Relatório
          </Button>
          <Button onClick={handleCloseRelatorio}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}