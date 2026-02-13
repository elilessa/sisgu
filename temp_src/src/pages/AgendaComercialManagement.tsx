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
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { 
  Edit, 
  Visibility, 
  Warning, 
  ExpandMore, 
  AttachMoney, 
  Receipt,
  ThumbUp,
  ThumbDown,
  Add,
  History,
  Build,
  LocalShipping,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  query,
  where,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface PendenciaFinanceira {
  tipo: 'cobranca' | 'orcamento';
  descricao: string;
  valor?: number;
  houveRetirada?: boolean;
  pecasRetiradas?: string;
  localPecas?: string;
  criadoEm?: Timestamp;
  resolvido?: boolean;
}

interface HistoricoOperacao {
  id: string;
  data: Timestamp;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  detalhes: string;
}

interface Agendamento {
  id: string;
  dataAgendamento: Timestamp;
  tecnicosNomes: string[];
  tipoAtividadeNome: string;
  status: string;
  tipoFinalizacao?: string;
  pendenciaFinanceira?: PendenciaFinanceira;
  respostasQuestionarios?: any[];
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
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado' | 'pendencia_financeira' | 'orcamento_em_construcao' | 'orcamento_enviado' | 'orcamento_aprovado' | 'orcamento_reprovado' | 'aguardando_devolucao';
  pendenciaFinanceira?: PendenciaFinanceira;
  linkedOrcamentoId?: string;
  historicoOperacoes?: HistoricoOperacao[];
  agendamentos?: Agendamento[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  arquivado?: boolean;
  motivoReprovacao?: string;
  equipamentosDevolver?: boolean;
  detalhesRetornoTecnico?: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Cliente {
  id: string;
  nome: string;
}

const STATUS_OPTIONS = [
  { value: 'pendencia_financeira', label: 'Pendência Financeira', color: 'warning' },
  { value: 'orcamento_em_construcao', label: 'Orçamento em Construção', color: 'info' },
  { value: 'orcamento_enviado', label: 'Orçamento Enviado', color: 'primary' },
  { value: 'orcamento_aprovado', label: 'Orçamento Aprovado', color: 'success' },
  { value: 'orcamento_reprovado', label: 'Orçamento Reprovado', color: 'error' },
  { value: 'aguardando_devolucao', label: 'Aguardando Devolução', color: 'warning' },
  { value: 'concluido', label: 'Concluído', color: 'success' },
  { value: 'cancelado', label: 'Cancelado', color: 'default' },
];

export function AgendaComercialManagement() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openOrcamentoDialog, setOpenOrcamentoDialog] = useState(false);
  const [openReprovacaoDialog, setOpenReprovacaoDialog] = useState(false);
  const [openAprovacaoDialog, setOpenAprovacaoDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [orcamentoForm, setOrcamentoForm] = useState({
    titulo: '',
    observacao: '',
    dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [reprovacaoForm, setReprovacaoForm] = useState({
    motivo: '',
    equipamentosDevolver: false,
    detalhesRetornoTecnico: '',
  });

  useEffect(() => {
    if (userData?.empresaId) {
      const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');
      const q = query(
        chamadosRef,
        where('tipoChamado', '==', 'comercial')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chamadosList: Chamado[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.arquivado !== true) {
            chamadosList.push({ id: docSnap.id, ...data } as Chamado);
          }
        });
        chamadosList.sort((a, b) => b.dataHora.toMillis() - a.dataHora.toMillis());
        setChamados(chamadosList);
        setLoading(false);
      }, (err) => {
        setError('Erro ao carregar chamados comerciais: ' + err.message);
        setLoading(false);
      });

      loadUsuarios();
      loadClientes();
      
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
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const loadClientes = async () => {
    if (!userData?.empresaId) return;

    try {
      const clientesRef = collection(db, 'EMPRESAS', userData.empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);

      const clientesList: Cliente[] = [];
      snapshot.forEach((doc) => {
        clientesList.push({ id: doc.id, ...doc.data() } as Cliente);
      });

      setClientes(clientesList);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const handleOpenViewDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenOrcamentoDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOrcamentoForm({
      titulo: `Orçamento - ${chamado.numeroOS} - ${chamado.clienteNome}`,
      observacao: chamado.pendenciaFinanceira?.descricao || chamado.descricao,
      dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setOpenOrcamentoDialog(true);
  };

  const handleCloseOrcamentoDialog = () => {
    setOpenOrcamentoDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenReprovacaoDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setReprovacaoForm({
      motivo: '',
      equipamentosDevolver: chamado.pendenciaFinanceira?.houveRetirada || false,
      detalhesRetornoTecnico: '',
    });
    setOpenReprovacaoDialog(true);
  };

  const handleCloseReprovacaoDialog = () => {
    setOpenReprovacaoDialog(false);
    setSelectedChamado(null);
  };

  const handleOpenAprovacaoDialog = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setOpenAprovacaoDialog(true);
  };

  const handleCloseAprovacaoDialog = () => {
    setOpenAprovacaoDialog(false);
    setSelectedChamado(null);
  };

  const addHistoricoOperacao = async (chamadoId: string, acao: string, detalhes: string) => {
    if (!userData?.empresaId) return;

    const novaOperacao: HistoricoOperacao = {
      id: `op_${Date.now()}`,
      data: Timestamp.now(),
      usuarioId: userData.id || '',
      usuarioNome: userData.nome || 'Sistema',
      acao,
      detalhes,
    };

    const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', chamadoId);
    await updateDoc(chamadoRef, {
      historicoOperacoes: arrayUnion(novaOperacao),
      atualizadoEm: Timestamp.now(),
    });
  };

  const handleCriarOrcamento = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    if (!orcamentoForm.titulo.trim()) {
      setError('Preencha o título do orçamento');
      return;
    }

    try {
      setSubmitting(true);

      const orcamentosRef = collection(db, 'EMPRESAS', userData.empresaId, 'orcamentos');
      const snapshot = await getDocs(orcamentosRef);
      const nextNumber = snapshot.size + 1;
      const numeroOrcamento = `ORC-${String(nextNumber).padStart(5, '0')}`;

      const novoOrcamento = {
        numero: numeroOrcamento,
        titulo: orcamentoForm.titulo,
        clienteId: selectedChamado.clienteId,
        clienteNome: selectedChamado.clienteNome,
        vendedorId: userData.id,
        vendedorNome: userData.nome,
        itens: [],
        valorTotal: selectedChamado.pendenciaFinanceira?.valor || 0,
        status: 'em_elaboracao',
        dataEmissao: Timestamp.now(),
        dataValidade: Timestamp.fromDate(new Date(orcamentoForm.dataValidade)),
        observacao: orcamentoForm.observacao,
        chamadoId: selectedChamado.id,
        chamadoNumeroOS: selectedChamado.numeroOS,
        pendenciaOrigem: selectedChamado.pendenciaFinanceira,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };

      const orcamentoDoc = await addDoc(orcamentosRef, novoOrcamento);

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      await updateDoc(chamadoRef, {
        status: 'orcamento_em_construcao',
        linkedOrcamentoId: orcamentoDoc.id,
        atualizadoEm: Timestamp.now(),
      });

      await addHistoricoOperacao(
        selectedChamado.id,
        'ORÇAMENTO_INICIADO',
        `Orçamento ${numeroOrcamento} criado para edição. Valor estimado: R$ ${(selectedChamado.pendenciaFinanceira?.valor || 0).toFixed(2)}`
      );

      setSuccess(`Orçamento ${numeroOrcamento} criado! Vá para "Orçamentos de Equipamentos" para completar o orçamento.`);
      handleCloseOrcamentoDialog();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Erro ao criar orçamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAprovarOrcamento = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    try {
      setSubmitting(true);

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      await updateDoc(chamadoRef, {
        status: 'orcamento_aprovado',
        atualizadoEm: Timestamp.now(),
      });

      if (selectedChamado.linkedOrcamentoId) {
        const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedChamado.linkedOrcamentoId);
        await updateDoc(orcamentoRef, {
          status: 'aprovado',
          atualizadoEm: Timestamp.now(),
        });
      }

      await addHistoricoOperacao(
        selectedChamado.id,
        'ORÇAMENTO_APROVADO',
        'Orçamento aprovado pelo cliente. Prosseguir com execução do serviço.'
      );

      setSuccess('Orçamento aprovado com sucesso!');
      handleCloseAprovacaoDialog();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao aprovar orçamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprovarOrcamento = async () => {
    if (!userData?.empresaId || !selectedChamado) return;

    if (!reprovacaoForm.motivo.trim()) {
      setError('Informe o motivo da reprovação');
      return;
    }

    if (reprovacaoForm.equipamentosDevolver && !reprovacaoForm.detalhesRetornoTecnico.trim()) {
      setError('Informe os detalhes para o retorno técnico');
      return;
    }

    try {
      setSubmitting(true);

      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', selectedChamado.id);
      
      const updateData: any = {
        status: reprovacaoForm.equipamentosDevolver ? 'aguardando_devolucao' : 'orcamento_reprovado',
        motivoReprovacao: reprovacaoForm.motivo,
        equipamentosDevolver: reprovacaoForm.equipamentosDevolver,
        atualizadoEm: Timestamp.now(),
      };

      if (reprovacaoForm.equipamentosDevolver) {
        updateData.tipoChamado = 'tecnico';
        updateData.detalhesRetornoTecnico = reprovacaoForm.detalhesRetornoTecnico;
        updateData.pendenciaRetornoTecnico = {
          tipo: 'devolucao_equipamento',
          descricao: reprovacaoForm.detalhesRetornoTecnico,
          motivoReprovacao: reprovacaoForm.motivo,
          pecasRetiradas: selectedChamado.pendenciaFinanceira?.pecasRetiradas,
          localPecas: selectedChamado.pendenciaFinanceira?.localPecas,
          criadoEm: Timestamp.now(),
        };
      }

      await updateDoc(chamadoRef, updateData);

      if (selectedChamado.linkedOrcamentoId) {
        const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'orcamentos', selectedChamado.linkedOrcamentoId);
        await updateDoc(orcamentoRef, {
          status: 'reprovado',
          atualizadoEm: Timestamp.now(),
        });
      }

      await addHistoricoOperacao(
        selectedChamado.id,
        reprovacaoForm.equipamentosDevolver ? 'ORCAMENTO_REPROVADO_COM_DEVOLUCAO' : 'ORÇAMENTO_REPROVADO',
        `Motivo: ${reprovacaoForm.motivo}. ${reprovacaoForm.equipamentosDevolver ? 'Encaminhado para devolução técnica.' : ''}`
      );

      if (reprovacaoForm.equipamentosDevolver) {
        setSuccess('Orçamento reprovado. Chamado retornou para a área técnica para devolução de equipamentos.');
      } else {
        setSuccess('Orçamento reprovado e registrado.');
      }
      
      handleCloseReprovacaoDialog();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Erro ao reprovar orçamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarcarConcluido = async (chamado: Chamado) => {
    if (!userData?.empresaId) return;

    try {
      const chamadoRef = doc(db, 'EMPRESAS', userData.empresaId, 'chamados', chamado.id);
      await updateDoc(chamadoRef, {
        status: 'concluido',
        atualizadoEm: Timestamp.now(),
      });

      await addHistoricoOperacao(
        chamado.id,
        'CONCLUIDO',
        'Chamado comercial concluído.'
      );

      setSuccess('Chamado concluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao concluir chamado: ' + err.message);
    }
  };

  const chamadosPendentes = chamados.filter((c) => 
    (c.status === 'pendencia_financeira' && !c.linkedOrcamentoId) ||
    c.status === 'aberto' ||
    c.status === 'em_andamento'
  );

  const chamadosEmAndamento = chamados.filter((c) => 
    ['orcamento_em_construcao', 'orcamento_enviado', 'orcamento_aprovado', 'aguardando_devolucao'].includes(c.status)
  );

  const chamadosFinalizados = chamados.filter((c) => 
    ['concluido', 'orcamento_reprovado', 'cancelado'].includes(c.status)
  );

  const currentChamados = tabValue === 0 ? chamadosPendentes : tabValue === 1 ? chamadosEmAndamento : chamadosFinalizados;

  const filteredChamados = currentChamados.filter((chamado) =>
    chamado.numeroOS.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chamado.clienteNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusOption = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: 'default' };

  const getPendenciaTipoLabel = (tipo?: string) => {
    if (tipo === 'cobranca') return 'Cobrança';
    if (tipo === 'orcamento') return 'Orçamento';
    return tipo || 'N/A';
  };

  return (
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Typography variant="h4" className="font-bold">
          Agenda Comercial
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
          <Tab label={`Pendentes (${chamadosPendentes.length})`} />
          <Tab label={`Em Andamento (${chamadosEmAndamento.length})`} />
          <Tab label={`Finalizados (${chamadosFinalizados.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <CircularProgress />
          <Typography variant="body2" className="mt-4" color="textSecondary">
            Carregando chamados comerciais...
          </Typography>
        </Box>
      ) : currentChamados.length === 0 ? (
        <Box className="flex flex-col items-center justify-center p-8">
          <Typography variant="h6" className="mb-2" color="textSecondary">
            {tabValue === 0 ? 'Nenhuma pendência financeira' : 
             tabValue === 1 ? 'Nenhum chamado em andamento' : 
             'Nenhum chamado finalizado'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Os chamados comerciais aparecerão aqui quando encaminhados pela área técnica
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
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
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
                  {chamado.urgente && (
                    <Warning sx={{ fontSize: 18, color: '#f44336' }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    - {chamado.clienteNome}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  {chamado.pendenciaFinanceira && (
                    <Chip
                      icon={chamado.pendenciaFinanceira.tipo === 'cobranca' ? <AttachMoney /> : <Receipt />}
                      label={getPendenciaTipoLabel(chamado.pendenciaFinanceira.tipo)}
                      color={chamado.pendenciaFinanceira.tipo === 'cobranca' ? 'warning' : 'info'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  )}
                  <Chip
                    label={getStatusOption(chamado.status).label}
                    color={getStatusOption(chamado.status).color as any}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          Informações do Chamado
                        </Typography>
                        <Typography variant="body2">
                          <strong>Data:</strong> {chamado.dataHora.toDate().toLocaleString('pt-BR')}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Atendente:</strong> {chamado.atendenteNome}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Descrição:</strong> {chamado.descricao}
                        </Typography>
                      </CardContent>
                    </Card>

                    {chamado.pendenciaFinanceira && (
                      <Card variant="outlined" sx={{ bgcolor: '#fff3e0', mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: '#e65100' }}>
                            <AttachMoney sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                            Pendência Financeira - {getPendenciaTipoLabel(chamado.pendenciaFinanceira.tipo)}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Descrição:</strong> {chamado.pendenciaFinanceira.descricao}
                          </Typography>
                          {chamado.pendenciaFinanceira.valor && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Valor Estimado:</strong> R$ {chamado.pendenciaFinanceira.valor.toFixed(2)}
                            </Typography>
                          )}
                          {chamado.pendenciaFinanceira.houveRetirada && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Houve retirada de peças!
                              </Typography>
                              {chamado.pendenciaFinanceira.pecasRetiradas && (
                                <Typography variant="body2">
                                  <strong>Peças:</strong> {chamado.pendenciaFinanceira.pecasRetiradas}
                                </Typography>
                              )}
                              {chamado.pendenciaFinanceira.localPecas && (
                                <Typography variant="body2">
                                  <strong>Local:</strong> {chamado.pendenciaFinanceira.localPecas}
                                </Typography>
                              )}
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    {chamado.agendamentos && chamado.agendamentos.length > 0 && (
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            <Build sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                            Histórico de Atendimentos Técnicos
                          </Typography>
                          {chamado.agendamentos.map((ag, idx) => (
                            <Box key={ag.id || idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                              <Typography variant="body2">
                                <strong>{idx + 1}.</strong> {ag.dataAgendamento?.toDate().toLocaleString('pt-BR') || 'N/A'}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Tipo:</strong> {ag.tipoAtividadeNome}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Técnicos:</strong> {ag.tecnicosNomes?.join(', ') || 'N/A'}
                              </Typography>
                              <Chip 
                                label={ag.status} 
                                size="small" 
                                color={ag.status === 'concluido' ? 'success' : 'info'}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {chamado.historicoOperacoes && chamado.historicoOperacoes.length > 0 && (
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            <History sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                            Histórico de Operações Comerciais
                          </Typography>
                          {chamado.historicoOperacoes.map((op) => (
                            <Box key={op.id} sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1, mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {op.data.toDate().toLocaleString('pt-BR')} - {op.usuarioNome}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {op.acao.replace(/_/g, ' ')}
                              </Typography>
                              <Typography variant="body2">
                                {op.detalhes}
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap', mt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleOpenViewDialog(chamado)}
                      >
                        Detalhes
                      </Button>

                      {chamado.status === 'pendencia_financeira' && chamado.pendenciaFinanceira?.tipo === 'orcamento' && !chamado.linkedOrcamentoId && (
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={<Add />}
                          onClick={() => handleOpenOrcamentoDialog(chamado)}
                        >
                          Criar Orçamento
                        </Button>
                      )}

                      {chamado.status === 'orcamento_enviado' && (
                        <>
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<ThumbUp />}
                            onClick={() => handleOpenAprovacaoDialog(chamado)}
                          >
                            Aprovar
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            color="error"
                            startIcon={<ThumbDown />}
                            onClick={() => handleOpenReprovacaoDialog(chamado)}
                          >
                            Reprovar
                          </Button>
                        </>
                      )}

                      {chamado.status === 'orcamento_aprovado' && (
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleMarcarConcluido(chamado)}
                        >
                          Marcar Concluído
                        </Button>
                      )}

                      {chamado.status === 'pendencia_financeira' && chamado.pendenciaFinanceira?.tipo === 'cobranca' && (
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleMarcarConcluido(chamado)}
                        >
                          Registrar Cobrança e Concluir
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      {/* Dialog de Visualização Detalhada */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Chamado Comercial</DialogTitle>
        <DialogContent>
          {selectedChamado && (
            <Box className="space-y-4 mt-2">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Nº da O.S.:</Typography>
                  <Box className="flex items-center gap-2">
                    <Typography>{selectedChamado.numeroOS}</Typography>
                    {selectedChamado.urgente && (
                      <Chip icon={<Warning />} label="URGENTE" color="error" size="small" />
                    )}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                  <Chip
                    label={getStatusOption(selectedChamado.status).label}
                    color={getStatusOption(selectedChamado.status).color as any}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Cliente:</Typography>
                  <Typography>{selectedChamado.clienteNome}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Atendente:</Typography>
                  <Typography>{selectedChamado.atendenteNome}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Descrição:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedChamado.descricao}</Typography>
                </Grid>
              </Grid>

              {selectedChamado.pendenciaFinanceira && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="warning">
                    <Typography fontWeight="bold" gutterBottom>
                      Pendência: {getPendenciaTipoLabel(selectedChamado.pendenciaFinanceira.tipo)}
                    </Typography>
                    <Typography variant="body2">{selectedChamado.pendenciaFinanceira.descricao}</Typography>
                    {selectedChamado.pendenciaFinanceira.valor && (
                      <Typography variant="body2">Valor: R$ {selectedChamado.pendenciaFinanceira.valor.toFixed(2)}</Typography>
                    )}
                    {selectedChamado.pendenciaFinanceira.houveRetirada && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                        <Typography fontWeight="bold" color="error">Peças Retiradas:</Typography>
                        <Typography variant="body2">{selectedChamado.pendenciaFinanceira.pecasRetiradas}</Typography>
                        {selectedChamado.pendenciaFinanceira.localPecas && (
                          <Typography variant="body2">Local: {selectedChamado.pendenciaFinanceira.localPecas}</Typography>
                        )}
                      </Box>
                    )}
                  </Alert>
                </>
              )}

              {selectedChamado.motivoReprovacao && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="error">
                    <Typography fontWeight="bold">Motivo da Reprovação:</Typography>
                    <Typography variant="body2">{selectedChamado.motivoReprovacao}</Typography>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Criar Orçamento */}
      <Dialog open={openOrcamentoDialog} onClose={handleCloseOrcamentoDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e3f2fd' }}>
          <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
          Criar Orçamento para {selectedChamado?.numeroOS}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Um orçamento será criado vinculado a este chamado. Após a criação, você poderá adicionar os itens na tela de Orçamentos de Equipamentos.
            </Typography>
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Título do Orçamento *"
                value={orcamentoForm.titulo}
                onChange={(e) => setOrcamentoForm(prev => ({ ...prev, titulo: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Cliente"
                value={selectedChamado?.clienteNome || ''}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Data de Validade"
                value={orcamentoForm.dataValidade}
                onChange={(e) => setOrcamentoForm(prev => ({ ...prev, dataValidade: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Observação / Descrição do Serviço"
                value={orcamentoForm.observacao}
                onChange={(e) => setOrcamentoForm(prev => ({ ...prev, observacao: e.target.value }))}
              />
            </Grid>
            {selectedChamado?.pendenciaFinanceira?.valor && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                  <Typography>Valor Estimado (do técnico): R$ {selectedChamado.pendenciaFinanceira.valor.toFixed(2)}</Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrcamentoDialog}>Cancelar</Button>
          <Button 
            onClick={handleCriarOrcamento} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <Add />}
          >
            {submitting ? 'Criando...' : 'Criar Orçamento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Aprovação */}
      <Dialog open={openAprovacaoDialog} onClose={handleCloseAprovacaoDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}>
          <ThumbUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          Aprovar Orçamento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>
            Confirma a aprovação do orçamento do chamado <strong>{selectedChamado?.numeroOS}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O orçamento será marcado como aprovado e o serviço poderá prosseguir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAprovacaoDialog}>Cancelar</Button>
          <Button 
            onClick={handleAprovarOrcamento} 
            variant="contained" 
            color="success"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <ThumbUp />}
          >
            {submitting ? 'Aprovando...' : 'Confirmar Aprovação'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Reprovação */}
      <Dialog open={openReprovacaoDialog} onClose={handleCloseReprovacaoDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ffebee', color: '#c62828' }}>
          <ThumbDown sx={{ mr: 1, verticalAlign: 'middle' }} />
          Reprovar Orçamento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo da Reprovação *"
                value={reprovacaoForm.motivo}
                onChange={(e) => setReprovacaoForm(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Descreva o motivo da reprovação do orçamento..."
              />
            </Grid>
            
            {selectedChamado?.pendenciaFinanceira?.houveRetirada && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography fontWeight="bold">Atenção: Este chamado possui peças retiradas!</Typography>
                  <Typography variant="body2">Peças: {selectedChamado.pendenciaFinanceira.pecasRetiradas}</Typography>
                  {selectedChamado.pendenciaFinanceira.localPecas && (
                    <Typography variant="body2">Local: {selectedChamado.pendenciaFinanceira.localPecas}</Typography>
                  )}
                </Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reprovacaoForm.equipamentosDevolver}
                    onChange={(e) => setReprovacaoForm(prev => ({ ...prev, equipamentosDevolver: e.target.checked }))}
                    color="warning"
                  />
                }
                label={
                  <Typography fontWeight="bold" color="warning.main">
                    <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Há equipamentos/peças a devolver ao cliente?
                  </Typography>
                }
              />
            </Grid>

            {reprovacaoForm.equipamentosDevolver && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Detalhes para o Retorno Técnico *"
                  value={reprovacaoForm.detalhesRetornoTecnico}
                  onChange={(e) => setReprovacaoForm(prev => ({ ...prev, detalhesRetornoTecnico: e.target.value }))}
                  placeholder="Descreva o que o técnico precisa fazer para a devolução..."
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    O chamado será enviado de volta para a área técnica para realizar a devolução dos equipamentos/peças.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReprovacaoDialog}>Cancelar</Button>
          <Button 
            onClick={handleReprovarOrcamento} 
            variant="contained" 
            color="error"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <ThumbDown />}
          >
            {submitting ? 'Processando...' : reprovacaoForm.equipamentosDevolver ? 'Reprovar e Enviar para Técnico' : 'Reprovar Orçamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
