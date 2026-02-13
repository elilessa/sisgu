// src/components/Agenda.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Divider,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Warning,
  Event as EventIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

type AgendaView = 'mes' | 'semana' | 'dia';

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
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';
  agendamentos?: Agendamento[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  naturezaId?: string;
  naturezaNome?: string;
  tipoProdutoId?: string;
  tipoProdutoNome?: string;
  tecnicoId?: string;
  tecnicoNome?: string;
}

type AgendaEventStatus = Agendamento['status'] | 'sem_agendamento';

interface AgendaEvent {
  id: string;
  chamadoId: string;
  agendamentoId: string;
  numeroOS: string;
  clienteNome: string;
  tipoChamado: Chamado['tipoChamado'];
  urgente: boolean;
  descricao: string;

  data: Date;
  status: AgendaEventStatus;

  tipoAtividadeId: string;
  tipoAtividadeNome: string;

  tecnicosIds: string[];
  tecnicosNomes: string[];

  observacao?: string;
  criadoPorNome?: string;

  chamadoStatus: Chamado['status'];
  chamadoDataHora: Date;
  atendenteNome: string;
  clienteContatoNome?: string;
  clienteContatoFuncao?: string;
  clienteContatoTelefone?: string;
  clienteContatoWhatsapp?: string;
  clienteContatoEmail?: string;
  clienteContatoApto?: string;
  naturezaNome?: string;
  tipoProdutoNome?: string;
  tecnicoNomeChamado?: string;
}

/** ===== Helpers de datas (sem libs externas) ===== */
const pad2 = (n: number) => String(n).padStart(2, '0');

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDateBR = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

const formatTimeBR = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const getMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 domingo, 1 segunda...
  const diff = day === 0 ? -6 : 1 - day; // voltar para segunda
  d.setDate(d.getDate() + diff);
  return startOfDay(d);
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const getMonthGridStart = (date: Date) => {
  // início do grid: segunda-feira da semana que contém o 1º do mês
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return getMonday(first);
};

const getMonthGridDays = (date: Date) => {
  const start = getMonthGridStart(date);
  // grid 6 semanas * 7 dias = 42
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

const monthTitleBR = (date: Date) => {
  const month = date.toLocaleString('pt-BR', { month: 'long' });
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${date.getFullYear()}`;
};

const weekTitleBR = (anchor: Date) => {
  const monday = getMonday(anchor);
  const sunday = addDays(monday, 6);
  return `${formatDateBR(monday)} • ${formatDateBR(sunday)}`;
};

const dayTitleBR = (date: Date) => {
  const weekday = date.toLocaleString('pt-BR', { weekday: 'long' });
  const w = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${w} • ${formatDateBR(date)}`;
};

const getStatusChipColor = (status: AgendaEventStatus): any => {
  if (status === 'agendado') return 'info';
  if (status === 'em_execucao') return 'warning';
  if (status === 'concluido') return 'success';
  if (status === 'sem_agendamento') return 'secondary';
  return 'default';
};

const getStatusLabel = (status: AgendaEventStatus) => {
  if (status === 'agendado') return 'Agendado';
  if (status === 'em_execucao') return 'Em execução';
  if (status === 'concluido') return 'Concluído';
  if (status === 'sem_agendamento') return 'Sem Agendamento';
  return 'Cancelado';
};

const weekDaysLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function Agenda() {
  const { userData } = useAuth();

  const isDownMd = useMediaQuery('(max-width:900px)');
  const isDownSm = useMediaQuery('(max-width:600px)');

  const [view, setView] = useState<AgendaView>('mes');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const [loading, setLoading] = useState<boolean>(true);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [error, setError] = useState<string>('');

  // Filtros
  const [tipoAtividadeFilter, setTipoAtividadeFilter] = useState<string>(''); // tipoAtividadeId
  const [tipoChamadoFilter, setTipoChamadoFilter] = useState<string>(''); // tecnico/comercial
  const [statusAgendamentoFilter, setStatusAgendamentoFilter] = useState<string>(''); // status do agendamento
  const [tecnicoFilter, setTecnicoFilter] = useState<string>(''); // nome do técnico (simples)

  // Dialog detalhes do evento
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

  useEffect(() => {
    if (!userData?.empresaId) return;

    setLoading(true);
    setError('');

    const chamadosRef = collection(db, 'EMPRESAS', userData.empresaId, 'chamados');
    const q = query(chamadosRef, orderBy('numeroOS', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Chamado[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) } as Chamado);
        });
        setChamados(list);
        setLoading(false);
      },
      (err) => {
        setError(`Erro ao carregar chamados: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userData?.empresaId]);

  const eventsAll: AgendaEvent[] = useMemo(() => {
    const out: AgendaEvent[] = [];

    for (const ch of chamados) {
      const ags = ch.agendamentos || [];
      const chamadoDataHora =
        ch.dataHora?.toDate?.() instanceof Date
          ? ch.dataHora.toDate()
          : new Date();

      if (ags.length === 0) {
        out.push({
          id: `${ch.id}__sem_agendamento`,
          chamadoId: ch.id,
          agendamentoId: 'sem_agendamento',
          numeroOS: ch.numeroOS,
          clienteNome: ch.clienteNome,
          tipoChamado: ch.tipoChamado,
          urgente: !!ch.urgente,
          descricao: ch.descricao,
          data: chamadoDataHora,
          status: 'sem_agendamento',
          tipoAtividadeId: '',
          tipoAtividadeNome: '',
          tecnicosIds: [],
          tecnicosNomes: [],
          observacao: '',
          criadoPorNome: '',
          chamadoStatus: ch.status,
          chamadoDataHora,
          atendenteNome: ch.atendenteNome || '',
          clienteContatoNome: ch.clienteContatoNome,
          clienteContatoFuncao: ch.clienteContatoFuncao,
          clienteContatoTelefone: ch.clienteContatoTelefone,
          clienteContatoWhatsapp: ch.clienteContatoWhatsapp,
          clienteContatoEmail: ch.clienteContatoEmail,
          clienteContatoApto: ch.clienteContatoApto,
          naturezaNome: ch.naturezaNome,
          tipoProdutoNome: ch.tipoProdutoNome,
          tecnicoNomeChamado: ch.tecnicoNome,
        });
      } else {
        for (const ag of ags) {
          const data =
            ag.dataAgendamento?.toDate?.() instanceof Date
              ? ag.dataAgendamento.toDate()
              : new Date();

          out.push({
            id: `${ch.id}__${ag.id}`,
            chamadoId: ch.id,
            agendamentoId: ag.id,
            numeroOS: ch.numeroOS,
            clienteNome: ch.clienteNome,
            tipoChamado: ch.tipoChamado,
            urgente: !!ch.urgente,
            descricao: ch.descricao,
            data,
            status: ag.status,
            tipoAtividadeId: ag.tipoAtividadeId,
            tipoAtividadeNome: ag.tipoAtividadeNome,
            tecnicosIds: ag.tecnicosIds || [],
            tecnicosNomes: ag.tecnicosNomes || [],
            observacao: ag.observacao || '',
            criadoPorNome: ag.criadoPorNome || '',
            chamadoStatus: ch.status,
            chamadoDataHora,
            atendenteNome: ch.atendenteNome || '',
            clienteContatoNome: ch.clienteContatoNome,
            clienteContatoFuncao: ch.clienteContatoFuncao,
            clienteContatoTelefone: ch.clienteContatoTelefone,
            clienteContatoWhatsapp: ch.clienteContatoWhatsapp,
            clienteContatoEmail: ch.clienteContatoEmail,
            clienteContatoApto: ch.clienteContatoApto,
            naturezaNome: ch.naturezaNome,
            tipoProdutoNome: ch.tipoProdutoNome,
            tecnicoNomeChamado: ch.tecnicoNome,
          });
        }
      }
    }

    // ordena por data asc
    out.sort((a, b) => a.data.getTime() - b.data.getTime());
    return out;
  }, [chamados]);

  const tiposAtividadeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of eventsAll) {
      if (ev.tipoAtividadeId) map.set(ev.tipoAtividadeId, ev.tipoAtividadeNome || ev.tipoAtividadeId);
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [eventsAll]);

  const tecnicosOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of eventsAll) {
      for (const nome of ev.tecnicosNomes || []) {
        if (nome?.trim()) set.add(nome.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [eventsAll]);

  const eventsFiltered = useMemo(() => {
    return eventsAll.filter((ev) => {
      if (tipoAtividadeFilter && ev.tipoAtividadeId !== tipoAtividadeFilter) return false;
      if (tipoChamadoFilter && ev.tipoChamado !== tipoChamadoFilter) return false;
      if (statusAgendamentoFilter && ev.status !== statusAgendamentoFilter) return false;
      if (tecnicoFilter && !(ev.tecnicosNomes || []).some((n) => n === tecnicoFilter)) return false;
      return true;
    });
  }, [eventsAll, tipoAtividadeFilter, tipoChamadoFilter, statusAgendamentoFilter, tecnicoFilter]);

  const handleOpenEvent = (ev: AgendaEvent) => {
    setSelectedEvent(ev);
    setOpenEventDialog(true);
  };

  const handleCloseEvent = () => {
    setOpenEventDialog(false);
    setSelectedEvent(null);
  };

  const headerTitle = useMemo(() => {
    if (view === 'mes') return monthTitleBR(anchorDate);
    if (view === 'semana') return weekTitleBR(anchorDate);
    return dayTitleBR(anchorDate);
  }, [view, anchorDate]);

  const handlePrev = () => {
    if (view === 'mes') setAnchorDate((d) => addMonths(d, -1));
    else if (view === 'semana') setAnchorDate((d) => addDays(d, -7));
    else setAnchorDate((d) => addDays(d, -1));
  };

  const handleNext = () => {
    if (view === 'mes') setAnchorDate((d) => addMonths(d, 1));
    else if (view === 'semana') setAnchorDate((d) => addDays(d, 7));
    else setAnchorDate((d) => addDays(d, 1));
  };

  const handleToday = () => setAnchorDate(new Date());

  const monthDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => getMonday(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsForDay = (day: Date) =>
    eventsFiltered.filter((ev) => isSameDay(ev.data, day));

  const eventsInRange = (start: Date, end: Date) =>
    eventsFiltered.filter((ev) => ev.data.getTime() >= start.getTime() && ev.data.getTime() <= end.getTime());

  const visibleEvents = useMemo(() => {
    if (view === 'mes') {
      // mês = qualquer evento dentro do grid visível (42 dias)
      const start = startOfDay(monthDays[0]);
      const end = endOfDay(monthDays[monthDays.length - 1]);
      return eventsInRange(start, end);
    }
    if (view === 'semana') {
      const start = startOfDay(weekDays[0]);
      const end = endOfDay(weekDays[6]);
      return eventsInRange(start, end);
    }
    // dia
    const start = startOfDay(anchorDate);
    const end = endOfDay(anchorDate);
    return eventsInRange(start, end);
  }, [view, anchorDate, monthDays, weekDays, eventsFiltered]);

  const stats = useMemo(() => {
    const total = visibleEvents.length;
    const urgentes = visibleEvents.filter((e) => e.urgente).length;
    const agendados = visibleEvents.filter((e) => e.status === 'agendado').length;
    const exec = visibleEvents.filter((e) => e.status === 'em_execucao').length;
    const concl = visibleEvents.filter((e) => e.status === 'concluido').length;
    return { total, urgentes, agendados, exec, concl };
  }, [visibleEvents]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Bar / Header */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.10)',
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.25,
            bgcolor: 'rgba(25,118,210,0.06)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 260 }}>
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
              <EventIcon sx={{ color: '#1976d2' }} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                Agenda Técnica
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Visualização por mês, semana e dia com filtros por atividade
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Tooltip title="Anterior">
              <IconButton onClick={handlePrev} sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.10)' }}>
                <ChevronLeft />
              </IconButton>
            </Tooltip>

            <Tooltip title="Hoje">
              <IconButton onClick={handleToday} sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.10)' }}>
                <Today />
              </IconButton>
            </Tooltip>

            <Tooltip title="Próximo">
              <IconButton onClick={handleNext} sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.10)' }}>
                <ChevronRight />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: '#fff',
                border: '1px solid rgba(0,0,0,0.10)',
                minWidth: isDownSm ? 180 : 260,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 900, color: '#1976d2', lineHeight: 1.1 }}>
                {headerTitle}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Tabs + Filtros */}
        <Box sx={{ px: 3, py: 2 }}>
          <GridLikeRow gap={isDownMd ? 1.25 : 2}>
            <Box sx={{ minWidth: isDownMd ? '100%' : 320 }}>
              <Tabs
                value={view}
                onChange={(_, v) => setView(v)}
                variant={isDownMd ? 'fullWidth' : 'standard'}
                sx={{
                  '& .MuiTab-root': { fontWeight: 900, textTransform: 'none', minHeight: 44 },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
                }}
              >
                <Tab value="mes" label="Mês" />
                <Tab value="semana" label="Semana" />
                <Tab value="dia" label="Dia" />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isDownMd ? '1fr' : 'repeat(4, minmax(200px, 1fr))',
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                <TextField
                  label="Tipo de Atividade"
                  value={tipoAtividadeFilter}
                  onChange={(e) => setTipoAtividadeFilter(e.target.value)}
                  select
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                >
                  <MenuItem value="">
                    <Typography sx={{ color: 'text.secondary' }}>Todos</Typography>
                  </MenuItem>
                  {tiposAtividadeOptions.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nome}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Tipo do Chamado"
                  value={tipoChamadoFilter}
                  onChange={(e) => setTipoChamadoFilter(e.target.value)}
                  select
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                >
                  <MenuItem value="">
                    <Typography sx={{ color: 'text.secondary' }}>Todos</Typography>
                  </MenuItem>
                  <MenuItem value="tecnico">Técnico</MenuItem>
                  <MenuItem value="comercial">Comercial</MenuItem>
                </TextField>

                <TextField
                  label="Status do Agendamento"
                  value={statusAgendamentoFilter}
                  onChange={(e) => setStatusAgendamentoFilter(e.target.value)}
                  select
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                >
                  <MenuItem value="">
                    <Typography sx={{ color: 'text.secondary' }}>Todos</Typography>
                  </MenuItem>
                  <MenuItem value="agendado">Agendado</MenuItem>
                  <MenuItem value="em_execucao">Em execução</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </TextField>

                <TextField
                  label="Técnico"
                  value={tecnicoFilter}
                  onChange={(e) => setTecnicoFilter(e.target.value)}
                  select
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
                  sx={{ '& .MuiInputBase-root': { minHeight: 56 } }}
                >
                  <MenuItem value="">
                    <Typography sx={{ color: 'text.secondary' }}>Todos</Typography>
                  </MenuItem>
                  {tecnicosOptions.map((nome) => (
                    <MenuItem key={nome} value={nome}>
                      {nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          </GridLikeRow>

          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Total: ${stats.total}`}
                size="small"
                sx={{ fontWeight: 900, borderRadius: 2 }}
              />
              <Chip
                icon={<Warning />}
                label={`Urgentes: ${stats.urgentes}`}
                color={stats.urgentes > 0 ? 'error' : 'default'}
                size="small"
                sx={{ fontWeight: 900, borderRadius: 2 }}
              />
              <Chip
                label={`Agendados: ${stats.agendados}`}
                color="info"
                size="small"
                sx={{ fontWeight: 900, borderRadius: 2 }}
              />
              <Chip
                label={`Em execução: ${stats.exec}`}
                color="warning"
                size="small"
                sx={{ fontWeight: 900, borderRadius: 2 }}
              />
              <Chip
                label={`Concluídos: ${stats.concl}`}
                color="success"
                size="small"
                sx={{ fontWeight: 900, borderRadius: 2 }}
              />
              {(tipoAtividadeFilter || tipoChamadoFilter || statusAgendamentoFilter || tecnicoFilter) && (
                <Chip
                  label="Limpar filtros"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setTipoAtividadeFilter('');
                    setTipoChamadoFilter('');
                    setStatusAgendamentoFilter('');
                    setTecnicoFilter('');
                  }}
                  sx={{ fontWeight: 900, borderRadius: 2 }}
                />
              )}
            </Stack>
          </Box>
        </Box>

        <Divider />

        {/* Conteúdo */}
        <Box sx={{ p: 2.25 }}>
          {loading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Typography sx={{ color: 'error.main', fontWeight: 800 }}>{error}</Typography>
            </Box>
          ) : (
            <>
              {view === 'mes' && (
                <MonthView
                  anchorDate={anchorDate}
                  monthDays={monthDays}
                  eventsForDay={eventsForDay}
                  onOpenEvent={handleOpenEvent}
                />
              )}

              {view === 'semana' && (
                <WeekView
                  weekDays={weekDays}
                  eventsForDay={eventsForDay}
                  onOpenEvent={handleOpenEvent}
                />
              )}

              {view === 'dia' && (
                <DayView
                  day={anchorDate}
                  events={eventsForDay(anchorDate)}
                  onOpenEvent={handleOpenEvent}
                />
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Dialog Detalhes do Agendamento */}
      <Dialog
        open={openEventDialog}
        onClose={handleCloseEvent}
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
              <AssignmentIcon sx={{ color: '#1976d2' }} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                Detalhes do Agendamento
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Informações do chamado e da atividade técnica
              </Typography>
            </Box>
          </Box>

          {selectedEvent?.urgente && (
            <Chip
              icon={<Warning />}
              label="URGENTE"
              color="error"
              size="small"
              sx={{ fontWeight: 900, borderRadius: 2, px: 0.5 }}
            />
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {selectedEvent && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography sx={{ fontWeight: 900, color: '#1976d2', fontSize: '1rem', borderBottom: '2px solid #1976d2', pb: 0.5 }}>
                Dados do Chamado
              </Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.10)',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: isDownSm ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                    gap: 2,
                  }}
                >
                  <InfoBlock label="Nº da O.S." value={selectedEvent.numeroOS} />
                  <InfoBlock
                    label="Data/Hora Abertura"
                    value={`${formatDateBR(selectedEvent.chamadoDataHora)} • ${formatTimeBR(selectedEvent.chamadoDataHora)}`}
                  />
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900 }}>
                      Status Chamado
                    </Typography>
                    <Box sx={{ mt: 0.75 }}>
                      <Chip
                        label={selectedEvent.chamadoStatus === 'aberto' ? 'Aberto' : selectedEvent.chamadoStatus === 'em_andamento' ? 'Em Andamento' : selectedEvent.chamadoStatus === 'concluido' ? 'Concluído' : 'Cancelado'}
                        color={selectedEvent.chamadoStatus === 'aberto' ? 'info' : selectedEvent.chamadoStatus === 'em_andamento' ? 'warning' : selectedEvent.chamadoStatus === 'concluido' ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 900, borderRadius: 2 }}
                      />
                    </Box>
                  </Box>

                  <InfoBlock label="Cliente" value={selectedEvent.clienteNome || '-'} />
                  <InfoBlock label="Tipo do Chamado" value={selectedEvent.tipoChamado === 'tecnico' ? 'Técnico' : 'Comercial'} />
                  <InfoBlock label="Atendente" value={selectedEvent.atendenteNome || '-'} />
                  
                  <InfoBlock label="Natureza" value={selectedEvent.naturezaNome || '-'} />
                  <InfoBlock label="Tipo Produto" value={selectedEvent.tipoProdutoNome || '-'} />
                  <InfoBlock label="Técnico Responsável" value={selectedEvent.tecnicoNomeChamado || '-'} />
                </Box>
              </Box>

              <Card
                variant="outlined"
                sx={{
                  bgcolor: '#e3f2fd',
                  borderRadius: 3,
                  borderColor: 'rgba(0,0,0,0.10)',
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography sx={{ fontWeight: 900, color: '#1976d2', mb: 1.25 }}>
                    Contato do Cliente
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: isDownSm ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    <InfoBlock label="Nome" value={selectedEvent.clienteContatoNome || '-'} />
                    <InfoBlock label="Função" value={selectedEvent.clienteContatoFuncao || '-'} />
                    <InfoBlock label="Apto/Unidade" value={selectedEvent.clienteContatoApto || '-'} />
                    <InfoBlock label="Telefone" value={selectedEvent.clienteContatoTelefone || '-'} />
                    <InfoBlock label="WhatsApp" value={selectedEvent.clienteContatoWhatsapp || '-'} />
                    <InfoBlock label="Email" value={selectedEvent.clienteContatoEmail || '-'} />
                  </Box>
                </CardContent>
              </Card>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.10)',
                  bgcolor: '#fff',
                }}
              >
                <Typography sx={{ fontWeight: 900, color: '#1976d2', mb: 1.25 }}>
                  Descrição do Chamado
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', fontWeight: 700, lineHeight: 1.6 }}>
                  {selectedEvent.descricao || '-'}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography sx={{ fontWeight: 900, color: '#00c0a3', fontSize: '1rem', borderBottom: '2px solid #00c0a3', pb: 0.5 }}>
                Dados do Agendamento
              </Typography>

              {selectedEvent.status === 'sem_agendamento' ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(0,0,0,0.10)',
                    bgcolor: '#fafafa',
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Este chamado ainda não possui agendamento.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid rgba(0,192,163,0.30)',
                      bgcolor: 'rgba(0,192,163,0.04)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: isDownSm ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                        gap: 2,
                      }}
                    >
                      <InfoBlock
                        label="Data/Hora Agendamento"
                        value={`${formatDateBR(selectedEvent.data)} • ${formatTimeBR(selectedEvent.data)}`}
                      />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900 }}>
                          Status Agendamento
                        </Typography>
                        <Box sx={{ mt: 0.75 }}>
                          <Chip
                            label={getStatusLabel(selectedEvent.status)}
                            color={getStatusChipColor(selectedEvent.status)}
                            size="small"
                            sx={{ fontWeight: 900, borderRadius: 2 }}
                          />
                        </Box>
                      </Box>
                      <InfoBlock label="Tipo de Atividade" value={selectedEvent.tipoAtividadeNome || '-'} />
                      <InfoBlock label="Criado Por" value={selectedEvent.criadoPorNome || '-'} />
                    </Box>
                  </Box>

                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor: '#f5f5f5',
                      borderRadius: 3,
                      borderColor: 'rgba(0,0,0,0.10)',
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography sx={{ fontWeight: 900, color: '#00c0a3', mb: 1.25 }}>
                        Técnicos do Agendamento
                      </Typography>

                      {selectedEvent.tecnicosNomes?.length ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {selectedEvent.tecnicosNomes.map((n) => (
                            <Chip key={n} label={n} size="small" sx={{ fontWeight: 800, borderRadius: 2 }} />
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
                          Nenhum técnico informado.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  {(selectedEvent.observacao || '').trim() && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid rgba(0,192,163,0.30)',
                        bgcolor: 'rgba(0,192,163,0.04)',
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, color: '#00c0a3', mb: 1.25 }}>
                        Observação do Agendamento
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap', fontWeight: 700, lineHeight: 1.6 }}>
                        {selectedEvent.observacao}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
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
          <Button
            onClick={handleCloseEvent}
            variant="contained"
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
      </Dialog>
    </Box>
  );
}

/** ===== Subcomponentes ===== */

function GridLikeRow({
  children,
  gap,
}: {
  children: React.ReactNode;
  gap: number;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      {children}
    </Box>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>{value}</Typography>
    </Box>
  );
}

function MonthView({
  anchorDate,
  monthDays,
  eventsForDay,
  onOpenEvent,
}: {
  anchorDate: Date;
  monthDays: Date[];
  eventsForDay: (d: Date) => AgendaEvent[];
  onOpenEvent: (ev: AgendaEvent) => void;
}) {
  const isDownSm = useMediaQuery('(max-width:600px)');

  return (
    <Box>
      {/* Cabeçalho dos dias da semana */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          mb: 1,
        }}
      >
        {weekDaysLabels.map((w) => (
          <Box key={w} sx={{ px: 1, py: 0.75 }}>
            <Typography sx={{ fontWeight: 900, color: 'text.secondary', fontSize: 12 }}>
              {w}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Grid do mês */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
        }}
      >
        {monthDays.map((day) => {
          const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
          const dayEvents = eventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Paper
              key={day.toISOString()}
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: '1px solid rgba(0,0,0,0.10)',
                p: 1,
                minHeight: isDownSm ? 96 : 132,
                bgcolor: isToday ? 'rgba(25,118,210,0.06)' : '#fff',
                opacity: isCurrentMonth ? 1 : 0.55,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontWeight: 900, color: isToday ? '#1976d2' : 'text.primary', fontSize: 13 }}>
                  {day.getDate()}
                </Typography>
                {dayEvents.some((e) => e.urgente) && (
                  <Tooltip title="Há eventos urgentes">
                    <Warning sx={{ fontSize: 16, color: 'error.main' }} />
                  </Tooltip>
                )}
              </Box>

              <Box sx={{ display: 'grid', gap: 0.5 }}>
                {dayEvents.slice(0, isDownSm ? 2 : 3).map((ev) => (
                  <Box
                    key={ev.id}
                    onClick={() => onOpenEvent(ev)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <Chip
                      label={`${formatTimeBR(ev.data)} • ${ev.tipoAtividadeNome || 'Atividade'} • ${ev.clienteNome}`}
                      size="small"
                      color={getStatusChipColor(ev.status)}
                      variant="outlined"
                      sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        fontWeight: 800,
                        '& .MuiChip-label': {
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    />
                  </Box>
                ))}

                {dayEvents.length > (isDownSm ? 2 : 3) && (
                  <Typography sx={{ color: 'text.secondary', fontWeight: 900, fontSize: 12, mt: 0.25 }}>
                    +{dayEvents.length - (isDownSm ? 2 : 3)} evento(s)
                  </Typography>
                )}

                {!dayEvents.length && (
                  <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 12 }}>
                    —
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

function WeekView({
  weekDays,
  eventsForDay,
  onOpenEvent,
}: {
  weekDays: Date[];
  eventsForDay: (d: Date) => AgendaEvent[];
  onOpenEvent: (ev: AgendaEvent) => void;
}) {
  const isDownMd = useMediaQuery('(max-width:900px)');

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isDownMd ? '1fr' : 'repeat(7, 1fr)',
        gap: 1.25,
      }}
    >
      {weekDays.map((day, idx) => {
        const list = eventsForDay(day);
        const isToday = isSameDay(day, new Date());

        return (
          <Paper
            key={day.toISOString()}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.10)',
              overflow: 'hidden',
              bgcolor: '#fff',
            }}
          >
            <Box
              sx={{
                px: 1.25,
                py: 1,
                bgcolor: isToday ? 'rgba(25,118,210,0.06)' : 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <Typography sx={{ fontWeight: 900, color: isToday ? '#1976d2' : 'text.primary' }}>
                {weekDaysLabels[idx]} • {day.getDate()}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                {formatDateBR(day)}
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, display: 'grid', gap: 0.75, minHeight: 120 }}>
              {list.length ? (
                list.map((ev) => (
                  <Paper
                    key={ev.id}
                    elevation={0}
                    onClick={() => onOpenEvent(ev)}
                    sx={{
                      p: 1,
                      borderRadius: 2.5,
                      border: '1px solid rgba(0,0,0,0.10)',
                      cursor: 'pointer',
                      transition: 'transform 120ms ease, box-shadow 120ms ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 900, color: '#1976d2' }}>
                        {formatTimeBR(ev.data)}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {ev.urgente && (
                          <Tooltip title="Urgente">
                            <Warning sx={{ fontSize: 18, color: 'error.main' }} />
                          </Tooltip>
                        )}
                        <Chip
                          label={getStatusLabel(ev.status)}
                          color={getStatusChipColor(ev.status)}
                          size="small"
                          sx={{ fontWeight: 900, borderRadius: 2 }}
                        />
                      </Stack>
                    </Stack>

                    <Typography sx={{ fontWeight: 900, mt: 0.5 }}>
                      {ev.tipoAtividadeNome || 'Atividade'} • {ev.clienteNome}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
                      OS: {ev.numeroOS} • Técnicos: {(ev.tecnicosNomes || []).join(', ') || '-'}
                    </Typography>
                  </Paper>
                ))
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  Sem eventos
                </Typography>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

function DayView({
  day,
  events,
  onOpenEvent,
}: {
  day: Date;
  events: AgendaEvent[];
  onOpenEvent: (ev: AgendaEvent) => void;
}) {
  const sorted = useMemo(() => {
    const list = [...events];
    list.sort((a, b) => a.data.getTime() - b.data.getTime());
    return list;
  }, [events]);

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {sorted.length ? (
        sorted.map((ev) => (
          <Paper
            key={ev.id}
            elevation={0}
            onClick={() => onOpenEvent(ev)}
            sx={{
              p: 1.5,
              borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.10)',
              cursor: 'pointer',
              transition: 'transform 120ms ease, box-shadow 120ms ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 900, color: '#1976d2' }}>
                  {formatTimeBR(ev.data)}
                </Typography>
                <Chip
                  label={getStatusLabel(ev.status)}
                  color={getStatusChipColor(ev.status)}
                  size="small"
                  sx={{ fontWeight: 900, borderRadius: 2 }}
                />
                {ev.urgente && (
                  <Chip
                    icon={<Warning />}
                    label="URGENTE"
                    color="error"
                    size="small"
                    sx={{ fontWeight: 900, borderRadius: 2 }}
                  />
                )}
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                OS: {ev.numeroOS}
              </Typography>
            </Stack>

            <Typography sx={{ fontWeight: 900, mt: 0.75 }}>
              {ev.tipoAtividadeNome || 'Atividade'} • {ev.clienteNome}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
              Técnicos: {(ev.tecnicosNomes || []).join(', ') || '-'}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {ev.descricao || '-'}
            </Typography>
          </Paper>
        ))
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid rgba(0,0,0,0.10)',
            bgcolor: '#fff',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 900, color: '#1976d2' }}>
            Nenhuma atividade para {formatDateBR(day)}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
            Ajuste os filtros ou navegue para outro dia.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
