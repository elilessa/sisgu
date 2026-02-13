import React from 'react';
import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { ActionEdit, ActionDelete, ActionView, ActionPrint, ActionArchive, ActionUnarchive, StatusChip } from '../components/TableActions';
import { Warning, ExpandMore, Schedule, Add, AttachMoney, Receipt, History, AssignmentReturn, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Calendario } from './Calendario';

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
}

interface TipoAtividade {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criadoEm: Timestamp;
}

interface PendenciaFinanceira {
  tipo: 'cobranca' | 'orcamento';
  descricao: string;
  valor?: number;
}

interface PendenciaRetornoTecnico {
  motivo: string;
  descricao: string;
  orcamentoId?: string;
  orcamentoNumero?: string;
  pecasRetiradas?: string;
  localPecas?: string;
}

interface HistoricoOperacao {
  data: Timestamp;
  usuario: string;
  usuarioId: string;
  acao: string;
  detalhes: string;
}

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
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado' | 'pendencia_tecnica' | 'pendencia_financeira' | 'aguardando_devolucao' | 'orcamento_aprovado' | 'orcamento_reprovado' | 'orcamento_em_construcao' | 'orcamento_enviado';
  pendenciaFinanceira?: PendenciaFinanceira;
  pendenciaRetornoTecnico?: PendenciaRetornoTecnico;
  historicoOperacoes?: HistoricoOperacao[];
  agendamentos?: Agendamento[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  arquivado?: boolean;
  arquivadoEm?: Timestamp;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Cliente {
  id: string;
  nome: string;
  numero?: string;
  contatoAtual?: string;
  contatoApto?: string;
  contatoFuncao?: string;
  contatoTelefone?: string;
  contatoWhatsapp?: string;
  contatoEmail1?: string;
  contatoEmail2?: string;
  prefixoNome?: string;
}

const TIPO_CHAMADO_OPTIONS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'comercial', label: 'Comercial' },
];

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto', color: 'info' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'warning' },
  { value: 'concluido', label: 'Concluído', color: 'success' },
  { value: 'cancelado', label: 'Cancelado', color: 'default' },
  { value: 'pendencia_tecnica', label: 'Pendência Técnica', color: 'warning' },
  { value: 'pendencia_financeira', label: 'Orçamento', color: 'info' },
  { value: 'aguardando_devolucao', label: 'Aguardando Devolução', color: 'error' },
  { value: 'orcamento_aprovado', label: 'Orçamento Aprovado', color: 'success' },
  { value: 'orcamento_reprovado', label: 'Orçamento Reprovado', color: 'error' },
  { value: 'orcamento_em_construcao', label: 'Orçamento em Elaboração', color: 'warning' },
  { value: 'orcamento_enviado', label: 'Orçamento Enviado', color: 'info' },
];

export function AgendaTecnica() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAgendamentoDialog, setOpenAgendamentoDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  const [novoTipoAtividade, setNovoTipoAtividade] = useState('');

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
    clienteId: '',
    tipoChamado: 'tecnico' as 'tecnico' | 'comercial',
    urgente: false,
    descricao: '',
    status: 'aberto' as Chamado['status'],
  });

  useEffect(() => {
    console.log('[AgendaTecnica] 📋 userData:', userData);
    if (userData?.empresaId) {
      loadUsuarios();
      loadClientes();
      loadTiposAtividade();
    }
  }, [userData]);

  useEffect(() => {
    if (!userData?.empresaId) {
      console.log('[AgendaTecnica] ⚠️ Sem empresaId');
      return;
    }

    setLoading(true);
    console.log('[AgendaTecnica] 🔄 Configurando listener em tempo real para chamados');
    const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');
    const q = query(chamadosRef, orderBy('numeroOS', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const chamadosList: Chamado[] = [];
        snapshot.forEach((doc) => {
          chamadosList.push({ id: doc.id, ...doc.data() } as Chamado);
        });
        console.log('[AgendaTecnica] ✅ Chamados atualizados em tempo real:', chamadosList.length);
        setChamados(chamadosList);
        setLoading(false);
      },
      (err) => {
        console.error('[AgendaTecnica] ❌ Erro no listener:', err);
        setError('Erro ao carregar chamados: ' + err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('[AgendaTecnica] 🔴 Removendo listener de chamados');
      unsubscribe();
    };
  }, [userData?.empresaId]);

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

  const loadClientes = async () => {
    if (!userData?.empresaId) return;

    try {
      const clientesRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);

      const clientesList: Cliente[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientesList.push({
          id: doc.id,
          nome: data.nome || '',
          numero: data.numero || '',
          contatoAtual: data.contatoAtual || '',
          contatoApto: data.contatoApto || '',
          contatoFuncao: data.contatoFuncao || '',
          contatoTelefone: data.contatoTelefone || '',
          contatoWhatsapp: data.contatoWhatsapp || '',
          contatoEmail1: data.contatoEmail1 || '',
          contatoEmail2: data.contatoEmail2 || '',
          prefixoNome: data.prefixoNome || '',
        } as Cliente);
      });

      setClientes(clientesList);
    } catch (err: any) {
      setError('Erro ao carregar clientes: ' + err.message);
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

  const gerarNumeroOS = async (): Promise<string> => {
    if (!userData?.empresaId) return '';

    const agora = new Date();
    const ano = agora.getFullYear().toString().slice(-2);
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `OS-${ano}${mes}`;

    try {
      const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');
      const q = query(
        chamadosRef,
        where('numeroOS', '>=', prefixo),
        where('numeroOS', '<', `OS-${ano}${mes}99999`),
        orderBy('numeroOS', 'desc')
      );
      const snapshot = await getDocs(q);

      let ultimoNumero = 0;
      if (!snapshot.empty) {
        const ultimoDoc = snapshot.docs[0].data();
        const numeroCompleto = ultimoDoc.numeroOS;
        ultimoNumero = parseInt(numeroCompleto.slice(-5));
      }

      const novoNumero = (ultimoNumero + 1).toString().padStart(5, '0');
      return `${prefixo}${novoNumero}`;
    } catch (err) {
      console.error('Erro ao gerar número de OS:', err);
      return `${prefixo}00001`;
    }
  };

  const handleOpenDialog = async (chamado?: Chamado) => {
    console.log('[AgendaTecnica] 🟢 handleOpenDialog chamado. Editando?', !!chamado);
    setError(''); // Limpa erros ao abrir o modal

    if (chamado) {
      setIsEditing(true);
      setSelectedChamado(chamado);
      setFormData({
        atendenteId: chamado.atendenteId,
        dataHora: chamado.dataHora.toDate().toISOString().slice(0, 16),
        clienteId: chamado.clienteId,
        tipoChamado: chamado.tipoChamado,
        urgente: chamado.urgente,
        descricao: chamado.descricao,
        status: chamado.status,
      });
    } else {
      setIsEditing(false);
      setSelectedChamado(null);
      setFormData({
        atendenteId: '',
        dataHora: new Date().toISOString().slice(0, 16),
        clienteId: '',
        tipoChamado: 'tecnico',
        urgente: false,
        descricao: '',
        status: 'aberto',
      });
    }

    console.log('[AgendaTecnica] 🟢 Abrindo dialog...');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedChamado(null);
    setIsEditing(false);
  };

  const handleOpenViewDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenArchiveDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenArchiveDialog(true);
  };

  const handleCloseArchiveDialog = () => {
    setOpenArchiveDialog(false);
    setSelectedChamado(null);
  };

  const handlePrintChamadoHistorico = (chamado: Chamado) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (timestamp: any) => {
      if (!timestamp) return '-';
      return timestamp.toDate().toLocaleString('pt-BR');
    };

    const getStatusLabel = (status: string) => {
      const opt = STATUS_OPTIONS.find(s => s.value === status);
      return opt?.label || status;
    };

    const getAcaoLabel = (acao: string) => {
      switch (acao) {
        case 'orcamento_aprovado': return 'Orçamento Aprovado';
        case 'orcamento_reprovado': return 'Orçamento Reprovado';
        case 'retorno_tecnico': return 'Retorno Técnico';
        case 'criacao_orcamento': return 'Orçamento Criado';
        case 'envio_orcamento': return 'Orçamento Enviado';
        case 'aprovacao': return 'Aprovação';
        case 'reprovacao': return 'Reprovação';
        default: return acao;
      }
    };

    let historicoHtml = '';
    if (chamado.historicoOperacoes && chamado.historicoOperacoes.length > 0) {
      historicoHtml = chamado.historicoOperacoes
        .sort((a, b) => a.data.toMillis() - b.data.toMillis())
        .map(hist => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(hist.data)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${getAcaoLabel(hist.acao)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${hist.detalhes}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${hist.usuario}</td>
          </tr>
        `).join('');
    }

    let agendamentosHtml = '';
    if (chamado.agendamentos && chamado.agendamentos.length > 0) {
      agendamentosHtml = chamado.agendamentos.map((ag, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(ag.dataAgendamento)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${ag.tipoAtividadeNome}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${ag.tecnicosNomes.join(', ')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${ag.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${ag.observacao || '-'}</td>
        </tr>
      `).join('');
    }

    let pendenciaHtml = '';
    if (chamado.pendenciaRetornoTecnico) {
      pendenciaHtml = `
        <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
          <h3 style="margin: 0 0 10px 0; color: #e65100;">Pendência de Retorno Técnico</h3>
          <p><strong>Motivo:</strong> ${chamado.pendenciaRetornoTecnico.motivo}</p>
          <p><strong>Descrição:</strong> ${chamado.pendenciaRetornoTecnico.descricao}</p>
          ${chamado.pendenciaRetornoTecnico.orcamentoNumero ? `<p><strong>Orçamento:</strong> ${chamado.pendenciaRetornoTecnico.orcamentoNumero}</p>` : ''}
          ${chamado.pendenciaRetornoTecnico.pecasRetiradas ? `<p><strong>Peças Retiradas:</strong> ${chamado.pendenciaRetornoTecnico.pecasRetiradas}</p>` : ''}
          ${chamado.pendenciaRetornoTecnico.localPecas ? `<p><strong>Local das Peças:</strong> ${chamado.pendenciaRetornoTecnico.localPecas}</p>` : ''}
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório Completo - ${chamado.numeroOS}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1976d2; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 15px; font-weight: bold; }
          .status-concluido { background: #e8f5e9; color: #2e7d32; }
          .status-pendencia { background: #fff3e0; color: #e65100; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Relatório Completo do Chamado</h1>
        
        <div class="info-grid">
          <div class="info-box">
            <h3 style="margin: 0 0 10px 0;">Informações do Chamado</h3>
            <p><strong>Nº OS:</strong> ${chamado.numeroOS}</p>
            <p><strong>Data/Hora:</strong> ${formatDate(chamado.dataHora)}</p>
            <p><strong>Status:</strong> <span class="status ${chamado.status === 'concluido' ? 'status-concluido' : 'status-pendencia'}">${getStatusLabel(chamado.status)}</span></p>
            <p><strong>Tipo:</strong> ${chamado.tipoChamado === 'tecnico' ? 'Técnico' : 'Comercial'}</p>
            <p><strong>Atendente:</strong> ${chamado.atendenteNome}</p>
          </div>
          <div class="info-box">
            <h3 style="margin: 0 0 10px 0;">Cliente</h3>
            <p><strong>Nome:</strong> ${chamado.clienteNome}</p>
            ${chamado.clienteContatoNome ? `<p><strong>Contato:</strong> ${chamado.clienteContatoNome}</p>` : ''}
            ${chamado.clienteContatoTelefone ? `<p><strong>Telefone:</strong> ${chamado.clienteContatoTelefone}</p>` : ''}
            ${chamado.clienteContatoEmail ? `<p><strong>Email:</strong> ${chamado.clienteContatoEmail}</p>` : ''}
          </div>
        </div>

        <div class="info-box" style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Descrição do Chamado</h3>
          <p style="white-space: pre-wrap;">${chamado.descricao}</p>
        </div>

        ${pendenciaHtml}

        <h2>Agendamentos Técnicos (${chamado.agendamentos?.length || 0})</h2>
        ${chamado.agendamentos && chamado.agendamentos.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data/Hora</th>
                <th>Tipo Atividade</th>
                <th>Técnicos</th>
                <th>Status</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              ${agendamentosHtml}
            </tbody>
          </table>
        ` : '<p style="color: #666;">Nenhum agendamento registrado.</p>'}

        <h2>Histórico de Operações (${chamado.historicoOperacoes?.length || 0})</h2>
        ${chamado.historicoOperacoes && chamado.historicoOperacoes.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Ação</th>
                <th>Detalhes</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              ${historicoHtml}
            </tbody>
          </table>
        ` : '<p style="color: #666;">Nenhum histórico de operações registrado.</p>'}

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
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
    setError(''); // Limpa erros antes de validar
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
      };

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      const agendamentosAtuais = selectedChamado.agendamentos || [];

      await updateDoc(chamadoRef, {
        agendamentos: [...agendamentosAtuais, novoAgendamento],
        status: 'em_andamento',
        atualizadoEm: Timestamp.now(),
      });

      setSuccess('Agendamento criado com sucesso!');
      handleCloseAgendamentoDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao criar agendamento: ' + err.message);
    }
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(''); // Limpa erros antes de validar
    if (!userData?.empresaId) return;

    if (!formData.clienteId || !formData.descricao.trim()) {
      setError('Preencha os campos obrigatórios: Cliente e Descrição');
      return;
    }

    try {
      const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');

      const cliente = clientes.find(c => c.id === formData.clienteId);

      if (!cliente) {
        setError('Cliente não encontrado');
        return;
      }

      const atendenteId = isEditing ? formData.atendenteId : (userData?.id || '');
      const atendenteNome = isEditing
        ? (usuarios.find(u => u.id === formData.atendenteId)?.nome || userData?.nome || '')
        : (userData?.nome || '');

      const chamadoData = {
        atendenteId: atendenteId,
        atendenteNome: atendenteNome,
        dataHora: Timestamp.fromDate(new Date(formData.dataHora)),
        clienteId: formData.clienteId,
        clienteNome: cliente.nome,
        clienteContatoNome: cliente.contatoAtual || '',
        clienteContatoApto: cliente.numero || '',
        clienteContatoFuncao: cliente.contatoFuncao || '',
        clienteContatoTelefone: cliente.contatoTelefone || '',
        clienteContatoWhatsapp: cliente.contatoWhatsapp || '',
        clienteContatoEmail: cliente.contatoEmail1 || '',
        tipoChamado: formData.tipoChamado,
        urgente: formData.urgente,
        descricao: formData.descricao,
        status: formData.tipoChamado === 'comercial' ? 'pendencia_financeira' : formData.status,
        ...(formData.tipoChamado === 'comercial' && {
          pendenciaFinanceira: {
            tipo: 'orcamento',
            descricao: formData.descricao,
            criadoEm: Timestamp.now(),
          }
        }),
      };

      if (isEditing && selectedChamado) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
        await updateDoc(docRef, {
          ...chamadoData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Chamado atualizado com sucesso!');
      } else {
        const numeroOS = await gerarNumeroOS();
        await addDoc(chamadosRef, {
          numeroOS,
          ...chamadoData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Chamado criado com sucesso!');
      }

      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar chamado: ' + err.message);
    }
  };

  const handleArchive = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    try {
      await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id), {
        arquivado: true,
        arquivadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      });
      setSuccess('Chamado arquivado com sucesso!');
      handleCloseArchiveDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao arquivar chamado: ' + err.message);
    }
  };

  const handleUnarchive = async (chamado: Chamado) => {
    if (!userData?.empresaId) return;

    try {
      await updateDoc(doc(db, 'EMPRESAS', userData.empresaId, 'chamados', chamado.id), {
        arquivado: false,
        arquivadoEm: null,
        atualizadoEm: Timestamp.now(),
      });
      setSuccess('Chamado desarquivado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao desarquivar chamado: ' + err.message);
    }
  };

  const handleOpenDeleteDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedChamado(null);
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id));
      setSuccess('Chamado excluído permanentemente!');
      handleCloseDeleteDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir chamado: ' + err.message);
    }
  };

  const chamadosAtivos = chamados.filter((chamado) =>
    chamado.status !== 'concluido' && chamado.status !== 'cancelado' && !chamado.arquivado
  );

  const chamadosHistorico = chamados.filter((chamado) =>
    (chamado.status === 'concluido' || chamado.status === 'cancelado') && !chamado.arquivado
  );

  const chamadosArquivados = chamados.filter((chamado) => chamado.arquivado === true);

  const currentChamados = tabValue === 0 ? chamadosAtivos : tabValue === 1 ? chamadosHistorico : tabValue === 3 ? chamadosArquivados : [];

  const filteredChamados = currentChamados.filter((chamado) =>
    chamado.numeroOS.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chamado.clienteNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClienteInfo = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId);
  };

  console.log('[AgendaTecnica] 🎨 Renderizando. openDialog:', openDialog, 'Tab:', tabValue);

  return (
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Agenda  - Visualizar Chamados
        </Typography>
        <Box className="flex-1 flex justify-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              console.log('[AgendaTecnica] 🔵 Botão Novo Chamado clicado');
              handleOpenDialog();
            }}
          >
            Novo Chamado
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

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Chamados Ativos (${chamadosAtivos.length})`} />
          <Tab label={`Histórico (${chamadosHistorico.length})`} />
          <Tab label="Calendário" />
          <Tab label={`Arquivados (${chamadosArquivados.length})`} />
        </Tabs>
      </Paper>

      {tabValue === 2 ? (
        <Calendario />
      ) : tabValue === 3 ? (
        loading ? (
          <Box className="flex flex-col items-center justify-center p-8">
            <CircularProgress />
            <Typography variant="body2" className="mt-4" color="textSecondary">
              Carregando chamados arquivados...
            </Typography>
          </Box>
        ) : chamadosArquivados.length === 0 ? (
          <Box className="flex flex-col items-center justify-center p-8">
            <Typography variant="h6" className="mb-2" color="textSecondary">
              Nenhum chamado arquivado
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Chamados arquivados aparecerão aqui
            </Typography>
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
            {filteredChamados.map((chamado) => (
              <Accordion key={chamado.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box className="flex items-center gap-2 w-full">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {chamado.numeroOS}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      - {chamado.clienteNome}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <StatusChip
                      status={chamado.status}
                      label={
                        chamado.status === 'aberto' ? 'Aberto' :
                          chamado.status === 'em_andamento' ? 'Em Andamento' :
                            chamado.status === 'concluido' ? 'Concluído' :
                              chamado.status === 'cancelado' ? 'Cancelado' :
                                chamado.status === 'pendencia_tecnica' ? 'Pend. Técnica' :
                                  chamado.status === 'pendencia_financeira' ? 'Pend. Financeira' : chamado.status
                      }
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Descrição: {chamado.descricao}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <ActionView
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewDialog(chamado);
                          }}
                          title="Visualizar"
                        />
                        <ActionUnarchive
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnarchive(chamado);
                          }}
                          title="Desarquivar"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )
      ) : loading ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <CircularProgress />
          <Typography variant="body2" className="mt-4" color="textSecondary">
            Carregando chamados...
          </Typography>
        </Box>
      ) : currentChamados.length === 0 ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <Typography variant="h6" className="mb-2" color="textSecondary">
            {tabValue === 0 ? 'Nenhum chamado ativo' : 'Nenhum chamado no histórico'}
          </Typography>
          {tabValue === 0 && (
            <Typography variant="body2" color="textSecondary">
              Clique em "Novo Chamado" para criar o primeiro chamado
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
            filteredChamados.map((chamado) => (
              <Accordion
                key={chamado.id}
                expanded={expandedAccordion === chamado.id}
                onChange={handleAccordionChange(chamado.id)}
                sx={{
                  mb: 1,
                  backgroundColor: chamado.urgente ? '#fff3e0' : 'white',
                  '&:before': { display: 'none' },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                    <Typography fontWeight="bold">{chamado.numeroOS}</Typography>
                    {chamado.urgente && <Warning sx={{ fontSize: 18, color: '#f44336' }} />}
                  </Box>
                  <Typography sx={{ color: 'text.secondary', minWidth: 150 }}>
                    {chamado.dataHora.toDate().toLocaleString('pt-BR')}
                  </Typography>
                  <Typography sx={{ flexGrow: 1, minWidth: 200 }}>
                    {(() => {
                      const c = clientes.find(cli => cli.id === chamado.clienteId);
                      return c?.prefixoNome ? `${c.prefixoNome} ${chamado.clienteNome}` : chamado.clienteNome;
                    })()}
                  </Typography>
                  <StatusChip
                    status={chamado.tipoChamado === 'tecnico' ? 'ativo' : 'info'}
                    label={TIPO_CHAMADO_OPTIONS.find(t => t.value === chamado.tipoChamado)?.label}
                    variant="outlined"
                  />
                  <StatusChip
                    status={chamado.status}
                    label={STATUS_OPTIONS.find(s => s.value === chamado.status)?.label}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Informações do Chamado
                          </Typography>
                          <Typography variant="body2"><strong>Atendente:</strong> {chamado.atendenteNome}</Typography>
                          <Typography variant="body2">
                            <strong>Cliente:</strong>{' '}
                            {(() => {
                              const c = clientes.find(cli => cli.id === chamado.clienteId);
                              return c?.prefixoNome ? `${c.prefixoNome} ${chamado.clienteNome}` : chamado.clienteNome;
                            })()}
                          </Typography>
                          {chamado.clienteContatoNome && (
                            <Typography variant="body2"><strong>Contato:</strong> {chamado.clienteContatoNome}</Typography>
                          )}
                          {chamado.clienteContatoTelefone && (
                            <Typography variant="body2"><strong>Telefone:</strong> {chamado.clienteContatoTelefone}</Typography>
                          )}
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Descrição:</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                            {chamado.descricao}
                          </Typography>

                          {chamado.status === 'pendencia_financeira' && chamado.pendenciaFinanceira && (
                            <Alert
                              severity="error"
                              icon={chamado.pendenciaFinanceira.tipo === 'cobranca' ? <AttachMoney /> : <Receipt />}
                              sx={{ mt: 2 }}
                            >
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                {chamado.pendenciaFinanceira.tipo === 'cobranca'
                                  ? 'PENDÊNCIA: COBRANÇA - Encaminhar ao Setor Comercial'
                                  : 'PENDÊNCIA: ORÇAMENTO - Encaminhar ao Setor Comercial'}
                              </Typography>
                              <Typography variant="body2">
                                {chamado.pendenciaFinanceira.descricao}
                              </Typography>
                              {chamado.pendenciaFinanceira.valor && (
                                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                                  Valor: R$ {chamado.pendenciaFinanceira.valor.toFixed(2)}
                                </Typography>
                              )}
                            </Alert>
                          )}

                          {chamado.status === 'aguardando_devolucao' && chamado.pendenciaRetornoTecnico && (
                            <Alert
                              severity="error"
                              icon={<AssignmentReturn />}
                              sx={{
                                mt: 2,
                                border: '2px solid #f44336',
                                '& .MuiAlert-message': { width: '100%' }
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold" color="error">
                                  ORÇAMENTO REPROVADO - AGENDAR DEVOLUÇÃO DE EQUIPAMENTO
                                </Typography>
                                <StatusChip status="error" label="Ação Necessária" />
                              </Box>
                              <Box sx={{ bgcolor: 'rgba(244,67,54,0.1)', p: 1.5, borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Motivo:</strong> {chamado.pendenciaRetornoTecnico.motivo}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Descrição da Reprovação:</strong> {chamado.pendenciaRetornoTecnico.descricao}
                                </Typography>
                                {chamado.pendenciaRetornoTecnico.orcamentoNumero && (
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Orçamento Reprovado:</strong> {chamado.pendenciaRetornoTecnico.orcamentoNumero}
                                  </Typography>
                                )}
                              </Box>
                              {(chamado.pendenciaRetornoTecnico.pecasRetiradas || chamado.pendenciaRetornoTecnico.localPecas) && (
                                <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, border: '1px solid #ff9800' }}>
                                  <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" sx={{ mb: 0.5 }}>
                                    Informações das Peças para Devolução:
                                  </Typography>
                                  {chamado.pendenciaRetornoTecnico.pecasRetiradas && (
                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                      <strong>Peças Retiradas:</strong> {chamado.pendenciaRetornoTecnico.pecasRetiradas}
                                    </Typography>
                                  )}
                                  {chamado.pendenciaRetornoTecnico.localPecas && (
                                    <Typography variant="body2">
                                      <strong>Local das Peças:</strong> {chamado.pendenciaRetornoTecnico.localPecas}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                Agende uma visita técnica para realizar a devolução do equipamento ao cliente.
                              </Typography>
                            </Alert>
                          )}

                          {chamado.status === 'orcamento_aprovado' && chamado.pendenciaRetornoTecnico && (
                            <Alert
                              severity="success"
                              icon={<Schedule />}
                              sx={{
                                mt: 2,
                                border: '2px solid #4caf50',
                                '& .MuiAlert-message': { width: '100%' }
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                                  ORÇAMENTO APROVADO - AGENDAR EXECUÇÃO DO SERVIÇO
                                </Typography>
                                <StatusChip status="success" label="Agendar Execução" />
                              </Box>
                              <Box sx={{ bgcolor: 'rgba(76,175,80,0.1)', p: 1.5, borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Status:</strong> {chamado.pendenciaRetornoTecnico.motivo}
                                </Typography>
                                {chamado.pendenciaRetornoTecnico.orcamentoNumero && (
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Orçamento Aprovado:</strong> {chamado.pendenciaRetornoTecnico.orcamentoNumero}
                                  </Typography>
                                )}
                                {chamado.pendenciaRetornoTecnico.descricao && (
                                  <Typography variant="body2">
                                    <strong>Observações:</strong> {chamado.pendenciaRetornoTecnico.descricao}
                                  </Typography>
                                )}
                              </Box>
                              {(chamado.pendenciaRetornoTecnico.pecasRetiradas || chamado.pendenciaRetornoTecnico.localPecas) && (
                                <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1, border: '1px solid #1976d2' }}>
                                  <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 0.5 }}>
                                    Informações das Peças/Equipamento:
                                  </Typography>
                                  {chamado.pendenciaRetornoTecnico.pecasRetiradas && (
                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                      <strong>Peças:</strong> {chamado.pendenciaRetornoTecnico.pecasRetiradas}
                                    </Typography>
                                  )}
                                  {chamado.pendenciaRetornoTecnico.localPecas && (
                                    <Typography variant="body2">
                                      <strong>Local:</strong> {chamado.pendenciaRetornoTecnico.localPecas}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                Agende uma visita técnica para executar o serviço aprovado pelo cliente.
                              </Typography>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Agendamentos ({chamado.agendamentos?.length || 0})
                          </Typography>
                          {(!chamado.agendamentos || chamado.agendamentos.length === 0) ? (
                            <Typography variant="body2" color="textSecondary">
                              Nenhum agendamento registrado
                            </Typography>
                          ) : (
                            chamado.agendamentos.map((ag, idx) => (
                              <Box key={ag.id} sx={{ mb: 1, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                                <Typography variant="body2">
                                  <strong>{idx + 1}.</strong> {ag.dataAgendamento ? ag.dataAgendamento.toDate().toLocaleString('pt-BR') : 'Aguardando agendamento'}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Tipo:</strong> {ag.tipoAtividadeNome}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Técnicos:</strong> {ag.tecnicosNomes.join(', ')}
                                </Typography>
                                <StatusChip
                                  status={ag.status}
                                  sx={{ mt: 0.5 }}
                                />
                              </Box>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {chamado.historicoOperacoes && chamado.historicoOperacoes.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <History sx={{ color: '#1976d2', fontSize: 20 }} />
                              <Typography variant="subtitle2" color="primary">
                                Histórico de Operações ({chamado.historicoOperacoes.length})
                              </Typography>
                            </Box>
                            {chamado.historicoOperacoes
                              .sort((a, b) => b.data.toMillis() - a.data.toMillis())
                              .map((hist, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    mb: 1,
                                    p: 1,
                                    bgcolor: 'white',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderLeftColor:
                                      hist.acao.includes('aprovado') || hist.acao.includes('aprovacao') ? '#4caf50' :
                                        hist.acao.includes('reprovado') || hist.acao.includes('reprovacao') ? '#f44336' :
                                          hist.acao.includes('retorno') ? '#ff9800' :
                                            '#1976d2'
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                    <StatusChip
                                      status={
                                        hist.acao.includes('aprovado') || hist.acao.includes('aprovacao') ? 'success' :
                                          hist.acao.includes('reprovado') || hist.acao.includes('reprovacao') ? 'error' :
                                            hist.acao.includes('retorno') ? 'warning' :
                                              'info'
                                      }
                                      label={
                                        hist.acao === 'orcamento_aprovado' ? 'Orçamento Aprovado' :
                                          hist.acao === 'orcamento_reprovado' ? 'Orçamento Reprovado' :
                                            hist.acao === 'retorno_tecnico' ? 'Retorno Técnico' :
                                              hist.acao === 'criacao_orcamento' ? 'Orçamento Criado' :
                                                hist.acao === 'envio_orcamento' ? 'Orçamento Enviado' :
                                                  hist.acao
                                      }
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {hist.data.toDate().toLocaleString('pt-BR')}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {hist.detalhes}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Por: {hist.usuario}
                                  </Typography>
                                </Box>
                              ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <ActionView
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewDialog(chamado);
                          }}
                          title="Visualizar"
                        />
                        <ActionDelete
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteDialog(chamado);
                          }}
                          title="Excluir Definitivamente"
                        />
                        {tabValue === 1 && (
                          <ActionPrint
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintChamadoHistorico(chamado);
                            }}
                            title="Imprimir Relatório Completo"
                          />
                        )}
                        {tabValue !== 1 && (
                          <>
                            <ActionEdit
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(chamado);
                              }}
                              title="Editar"
                            />
                            <ActionArchive
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArchiveDialog(chamado);
                              }}
                              title="Arquivar"
                            />
                          </>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </>
      )}

      {/* Dialog de Cadastro/Edição */}
      {/* Dialog de Cadastro/Edição */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          },
        }}
        onTransitionEnd={() => console.log('[AgendaTecnica] 📋 Dialog aberto:', openDialog)}
      >
        {/* Header mais profissional */}
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
              <Warning sx={{ color: '#1976d2' }} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {isEditing ? 'Editar Chamado' : 'Novo Chamado'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Preencha os dados para {isEditing ? 'atualizar' : 'criar'} o chamado técnico
              </Typography>
            </Box>
          </Box>

          {/* Badge de OS quando estiver editando */}
          {isEditing && (
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: '#fff',
                border: '1px solid rgba(0,0,0,0.10)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.1 }}>
                Nº da O.S.
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#1976d2', lineHeight: 1.1 }}>
                {selectedChamado?.numeroOS || '-'}
              </Typography>
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Grid container spacing={2}>

            {/* Seção: Dados do Chamado */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1.25,
                }}
              >
                <Typography sx={{ fontWeight: 800, color: '#1976d2' }}>
                  Dados do Chamado
                </Typography>

                <Button
                  variant={formData.urgente ? 'contained' : 'outlined'}
                  color="error"
                  startIcon={<Warning />}
                  onClick={() => handleInputChange('urgente', !formData.urgente)}
                  sx={{
                    borderRadius: 2,
                    height: 40,
                    px: 2,
                    fontWeight: 800,
                    boxShadow: formData.urgente ? '0 10px 20px rgba(211,47,47,0.25)' : 'none',
                    textTransform: 'none',
                  }}
                >
                  {formData.urgente ? 'URGENTE' : 'Marcar urgente'}
                </Button>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.10)',
                  bgcolor: '#fff',
                }}
              >
                <Grid container spacing={2}>
                  {/* Linha 1: Data/Hora, Tipo de Chamado, Status */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="Data e Hora *"
                      value={formData.dataHora}
                      onChange={(e) => handleInputChange('dataHora', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tipo de Chamado *"
                      value={formData.tipoChamado}
                      onChange={(e) => handleInputChange('tipoChamado', e.target.value)}
                      select
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
                      }}
                    >
                      {TIPO_CHAMADO_OPTIONS.map((tipo) => (
                        <MenuItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      select
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
                      }}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Linha 2: Cliente */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Cliente *"
                      value={formData.clienteId}
                      onChange={(e) => handleInputChange('clienteId', e.target.value)}
                      select
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
                      }}
                    >
                      <MenuItem value="">
                        <Typography sx={{ color: 'text.secondary' }}>Selecione...</Typography>
                      </MenuItem>
                      {clientes.map((cliente) => (
                        <MenuItem key={cliente.id} value={cliente.id}>
                          {cliente.prefixoNome ? `${cliente.prefixoNome} - ` : ''}{cliente.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Seção: Contato do Cliente (apenas se tiver dados) */}
            {formData.clienteId && (() => {
              const cliente = getClienteInfo(formData.clienteId);

              const hasContato =
                cliente &&
                (cliente.contatoAtual ||
                  cliente.numero ||
                  cliente.contatoFuncao ||
                  cliente.contatoTelefone ||
                  cliente.contatoWhatsapp ||
                  cliente.contatoEmail1 ||
                  cliente.contatoEmail2);

              if (!hasContato) return null;

              return (
                <Grid size={{ xs: 12 }}>
                  <Typography sx={{ fontWeight: 800, color: '#1976d2', mb: 1.25 }}>
                    Contato do Cliente
                  </Typography>

                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor: '#f5f5f5',
                      borderRadius: 3,
                      borderColor: 'rgba(0,0,0,0.10)',
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Grid container spacing={1.75}>
                        {cliente.contatoAtual && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Nome"
                              value={cliente.contatoAtual}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.numero && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Apto"
                              value={cliente.numero}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.contatoFuncao && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Função"
                              value={cliente.contatoFuncao}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.contatoTelefone && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Telefone"
                              value={cliente.contatoTelefone}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.contatoWhatsapp && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="WhatsApp"
                              value={cliente.contatoWhatsapp}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.contatoEmail1 && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="E-mail"
                              value={cliente.contatoEmail1}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                        {cliente.contatoEmail2 && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="E-mail 2"
                              value={cliente.contatoEmail2}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })()}

            {/* Seção: Descrição */}
            <Grid size={{ xs: 12 }}>
              <Typography sx={{ fontWeight: 800, color: '#1976d2', mb: 1.25 }}>
                Detalhes do Chamado
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Descrição *"
                multiline
                rows={6}
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descreva o problema ou solicitação..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            bgcolor: '#fff',
            gap: 1,
          }}
        >
          <Button onClick={handleCloseDialog} variant="text" sx={{ fontWeight: 700 }}>
            Cancelar
          </Button>

          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 2.5,
              boxShadow: '0 10px 20px rgba(25,118,210,0.22)',
              textTransform: 'none',
            }}
          >
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Dialog de Visualização (padronizado) */}
      <Dialog
        open={openViewDialog}
        onClose={handleCloseViewDialog}
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
        {/* Header profissional */}
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
              <Warning sx={{ color: '#1976d2' }} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Detalhes do Chamado
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Visualização completa do registro
              </Typography>
            </Box>
          </Box>

          {/* Badge de OS + Urgente */}
          {selectedChamado && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  border: '1px solid rgba(0,0,0,0.10)',
                  minWidth: 110,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.1 }}>
                  Nº da O.S.
                </Typography>
                <Typography sx={{ fontWeight: 800, color: '#1976d2', lineHeight: 1.1 }}>
                  {selectedChamado.numeroOS || '-'}
                </Typography>
              </Box>

              {selectedChamado.urgente && (
                <Chip
                  icon={<Warning />}
                  label="URGENTE"
                  color="error"
                  size='small'
                  sx={{
                    fontWeight: 900,
                    borderRadius: 2,
                    px: 0.5,
                  }}
                />
              )}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {selectedChamado && (
            <Grid container spacing={2.25}>

              {/* Seção: Resumo */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontWeight: 800, color: '#1976d2', mb: 1.25 }}>
                  Resumo
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.10)',
                    bgcolor: '#fff',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Data e Hora
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {selectedChamado.dataHora?.toDate?.()
                          ? selectedChamado.dataHora.toDate().toLocaleString('pt-BR')
                          : '-'}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Atendente
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {selectedChamado.atendenteNome || '-'}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Cliente
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {(() => {
                          const c = clientes.find(cli => cli.id === selectedChamado.clienteId);
                          return c?.prefixoNome ? `${c.prefixoNome} - ${selectedChamado.clienteNome}` : selectedChamado.clienteNome || '-';
                        })()}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Tipo de Chamado
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={
                            TIPO_CHAMADO_OPTIONS.find((t) => t.value === selectedChamado.tipoChamado)?.label || '-'
                          }
                          color={selectedChamado.tipoChamado === 'tecnico' ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ fontWeight: 800, borderRadius: 2 }}
                        />
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={STATUS_OPTIONS.find((s) => s.value === selectedChamado.status)?.label || '-'}
                          color={(STATUS_OPTIONS.find((s) => s.value === selectedChamado.status)?.color as any) || 'default'}
                          size="small"
                          sx={{ fontWeight: 800, borderRadius: 2 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Seção: Contato do Cliente */}
              {(selectedChamado.clienteContatoNome ||
                selectedChamado.clienteContatoApto ||
                selectedChamado.clienteContatoFuncao ||
                selectedChamado.clienteContatoTelefone ||
                selectedChamado.clienteContatoWhatsapp ||
                selectedChamado.clienteContatoEmail) && (
                  <Grid size={{ xs: 12 }}>
                    <Typography sx={{ fontWeight: 800, color: '#1976d2', mb: 1.25 }}>
                      Contato do Cliente
                    </Typography>

                    <Card
                      variant="outlined"
                      sx={{
                        bgcolor: '#f5f5f5',
                        borderRadius: 3,
                        borderColor: 'rgba(0,0,0,0.10)',
                      }}
                    >
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Grid container spacing={1.75}>
                          {selectedChamado.clienteContatoNome && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                Nome
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoNome}
                              </Typography>
                            </Grid>
                          )}

                          {selectedChamado.clienteContatoApto && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                Apto
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoApto}
                              </Typography>
                            </Grid>
                          )}

                          {selectedChamado.clienteContatoFuncao && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                Função
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoFuncao}
                              </Typography>
                            </Grid>
                          )}

                          {selectedChamado.clienteContatoTelefone && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                Telefone
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoTelefone}
                              </Typography>
                            </Grid>
                          )}

                          {selectedChamado.clienteContatoWhatsapp && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                WhatsApp
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoWhatsapp}
                              </Typography>
                            </Grid>
                          )}

                          {selectedChamado.clienteContatoEmail && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                E-mail
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {selectedChamado.clienteContatoEmail}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

              {/* Seção: Descrição */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontWeight: 800, color: '#1976d2', mb: 1.25 }}>
                  Descrição
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.10)',
                    bgcolor: '#fff',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    {selectedChamado.descricao || '-'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            bgcolor: '#fff',
            gap: 1,
          }}
        >
          <Button onClick={handleCloseViewDialog} variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 2.5,
              boxShadow: '0 10px 20px rgba(25,118,210,0.22)',
              textTransform: 'none',
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog >


      {/* Dialog de Confirmação de Arquivamento */}
      < Dialog open={openArchiveDialog} onClose={handleCloseArchiveDialog} maxWidth="xs" fullWidth >
        <DialogTitle sx={{ color: '#757575' }}>
          Confirmar Arquivamento
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja arquivar o chamado <strong>{selectedChamado?.numeroOS}</strong>?
          </Typography>
          <Typography variant="body2" className="mt-2 text-gray-600">
            O chamado será movido para a aba "Arquivados" e poderá ser restaurado posteriormente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseArchiveDialog}>
            Cancelar
          </Button>
          <Button onClick={handleArchive} variant="contained" sx={{ bgcolor: '#757575', '&:hover': { bgcolor: '#616161' } }}>
            Arquivar
          </Button>
        </DialogActions>
      </Dialog >

      {/* Dialog de Confirmação de Exclusão */}
      < Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth >
        <DialogTitle sx={{ color: '#d32f2f' }}>
          Confirmar Exclusão Definitiva
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o chamado <strong>{selectedChamado?.numeroOS}</strong>?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog >

      {/* Dialog de Agendamento de Execução */}
      < Dialog
        open={openAgendamentoDialog}
        onClose={handleCloseAgendamentoDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          },
        }
        }
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.25,
            bgcolor: 'rgba(76,175,80,0.08)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Schedule sx={{ color: '#4caf50' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Agendar Execução
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedChamado?.numeroOS} - {selectedChamado?.clienteNome}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data e Hora do Agendamento *"
                value={agendamentoForm.dataAgendamento}
                onChange={(e) => handleAgendamentoInputChange('dataAgendamento', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                multiple
                options={usuarios}
                getOptionLabel={(option) => option.nome}
                value={usuarios.filter(u => agendamentoForm.tecnicosIds.includes(u.id))}
                onChange={(_, newValue) => {
                  handleAgendamentoInputChange('tecnicosIds', newValue.map(v => v.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Técnicos Responsáveis *"
                    placeholder="Selecione os técnicos"
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
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Tipo de Atividade *
              </Typography>
              <Autocomplete
                freeSolo
                options={tiposAtividade}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.nome}
                value={tiposAtividade.find(t => t.id === agendamentoForm.tipoAtividadeId) || null}
                inputValue={novoTipoAtividade}
                onInputChange={(_, newInputValue) => {
                  setNovoTipoAtividade(newInputValue);
                }}
                onChange={(_, newValue) => {
                  if (newValue && typeof newValue !== 'string') {
                    handleAgendamentoInputChange('tipoAtividadeId', newValue.id);
                    handleAgendamentoInputChange('tipoAtividadeNome', newValue.nome);
                    setNovoTipoAtividade(newValue.nome);
                  } else {
                    handleAgendamentoInputChange('tipoAtividadeId', '');
                    handleAgendamentoInputChange('tipoAtividadeNome', '');
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Selecione ou digite para criar novo tipo"
                    helperText="Digite um nome para criar um novo tipo de atividade"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant="outlined" sx={{ bgcolor: '#f9f9f9', p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#666' }}>
                  Notificações (Em breve)
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={agendamentoForm.notificacaoHabilitada}
                      onChange={(e) => handleAgendamentoInputChange('notificacaoHabilitada', e.target.checked)}
                      disabled
                    />
                  }
                  label="Habilitar notificações para este agendamento"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Funcionalidade em desenvolvimento - notificações serão enviadas aos técnicos e cliente.
                </Typography>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Observação"
                multiline
                rows={3}
                value={agendamentoForm.observacao}
                onChange={(e) => handleAgendamentoInputChange('observacao', e.target.value)}
                placeholder="Adicione observações sobre este agendamento..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            gap: 1,
          }}
        >
          <Button onClick={handleCloseAgendamentoDialog} variant="text" sx={{ fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAgendamento}
            variant="contained"
            color="success"
            startIcon={<Schedule />}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 2.5,
              textTransform: 'none',
            }}
          >
            Criar Agendamento
          </Button>
        </DialogActions>
      </Dialog >
    </Box >
  );
}
