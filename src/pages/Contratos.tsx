import React from 'react';
import { useState, useEffect } from 'react';
import { customColors } from '../theme';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Grid,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
  TablePagination,
  Collapse,
} from '@mui/material';
import { ActionEdit, ActionDelete, ActionView, ActionPdf, StatusChip } from '../components/TableActions';
import { KeyboardArrowDown, KeyboardArrowUp, Add } from '@mui/icons-material';
import { formatCnpjCpf } from '../utils/masks';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { gerarCabecalhoEmpresaHTML, imprimirHTMLViaIframe, gerarLayoutDocumentoHTML } from '../utils/printUtils';

interface Contrato {
  id: string;
  numero: string;
  titulo: string;
  data: Timestamp;
  tipoContrato: 'com_pecas' | 'sem_pecas' | 'comodato';
  clienteId: string;
  clienteNome: string;
  clienteCnpjCpf: string;
  clienteEndereco: string;
  clienteNumero: string;
  clienteComplemento: string;
  clienteBairro: string;
  clienteCidade: string;
  clienteUf: string;
  clienteCep: string;
  clientePrefixo?: string;
  equipamentosCobertos: EquipamentoContrato[];
  equipamentosNaoCobertos: EquipamentoContrato[];
  valorContrato: number;
  status: string;
  periodicidadePreventiva?: 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral';
  observacao?: string;
  diaBoleto?: number;
  bancoId?: string;
  bancoNome?: string;
  gerarAutomaticamente?: boolean;
  enviarParaBanco?: boolean;
  enviarContatoCliente?: boolean;
  enviarOutroLocal?: boolean;
  enviarPorEmail?: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  vendedorId?: string; // Adicionado
  vendedorNome?: string; // Adicionado
}

interface EquipamentoContrato {
  produtoId: string;
  equipamento: string;
  quantidade: number;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string; // 'admin', 'vendedor', etc.
}

const TIPO_CONTRATO_OPTIONS = [
  { value: 'com_pecas', label: 'Com Peças' },
  { value: 'sem_pecas', label: 'Sem Peças' },
  { value: 'comodato', label: 'Comodato' },
];

const PERIODICIDADE_OPTIONS = [
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
];

const STATUS_CONTRATO_OPTIONS = [
  { value: 'em_elaboracao', label: 'Em Elaboração' },
  { value: 'enviado_ao_cliente', label: 'Enviado ao Cliente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' }, // Adicionado conforme solicitação
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'expirado', label: 'Expirado' },
];

export function Contratos() {
  console.log('[Contratos] 🚀 Componente Contratos iniciado');

  const { userData } = useAuth();
  console.log('[Contratos] 📋 userData:', userData);

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Contrato>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bancos, setBancos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<Usuario[]>([]); // Estado para armazenar vendedores
  const [clientes, setClientes] = useState<any[]>([]); // Estado para armazenar clientes (para prefixo)
  const [tabValue, setTabValue] = useState(0); // Controle de abas

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

  useEffect(() => {
    console.log('[Contratos] 🔄 useEffect executado. userData:', userData);
    loadContratos();
    loadBancos();
    loadVendedores();
    loadClientes();
  }, [userData]);

  const loadBancos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const bancosRef = collection(db, 'EMPRESAS', empresaId, 'bancos');
      const snapshot = await getDocs(bancosRef);
      const bancosList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          numeroBanco: data.numeroBanco || '',
          nomeBanco: data.nomeBanco || '',
          agencia: data.agencia || '',
          contaCorrente: data.contaCorrente || '',
          nomeTitular: data.nomeTitular || '',
          status: data.status || 'ativo',
        };
      });
      console.log('[Contratos] Bancos carregados:', bancosList);
      setBancos(bancosList);
    } catch (err: any) {
      console.error('[Contratos] Erro ao carregar bancos:', err);
    }
  };

  // Nova função para carregar vendedores
  const loadVendedores = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const usuariosRef = collection(db, 'EMPRESAS', empresaId, 'usuarios');
      const q = query(usuariosRef, where('perfil', '==', 'vendedor')); // Filtra apenas vendedores
      const snapshot = await getDocs(q);
      const vendedoresList: Usuario[] = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome || '',
        email: doc.data().email || '',
        perfil: doc.data().perfil || '',
      }));
      console.log('[Contratos] Vendedores carregados:', vendedoresList);
      setVendedores(vendedoresList);
    } catch (err: any) {
      console.error('[Contratos] Erro ao carregar vendedores:', err);
    }
  };

  const loadClientes = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;
    try {
      const clientesRef = collection(db, 'EMPRESAS', empresaId, 'clientes');
      const snapshot = await getDocs(clientesRef);
      const clientesList = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        prefixoNome: doc.data().prefixoNome
      }));
      setClientes(clientesList);
    } catch (err) {
      console.error('[Contratos] Erro ao carregar clientes:', err);
    }
  };

  const loadContratos = async () => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoading(true);
    try {
      const contratosRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
      const snapshot = await getDocs(contratosRef);

      const contratosList: Contrato[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        contratosList.push({ id: docSnap.id, ...data } as Contrato);
      });

      setContratos(contratosList);
    } catch (err: any) {
      console.error('[Contratos] ERRO ao carregar:', err);
      setError('Erro ao carregar contratos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenViewDialog = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedContrato(null);
  };

  const handleOpenEditDialog = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setEditFormData({
      status: contrato.status, // Adicionado status
      periodicidadePreventiva: (contrato.periodicidadePreventiva || '') as any,
      observacao: contrato.observacao || '',
      diaBoleto: contrato.diaBoleto,
      bancoId: contrato.bancoId || '',
      gerarAutomaticamente: contrato.gerarAutomaticamente || false,
      enviarParaBanco: contrato.enviarParaBanco || false,
      enviarContatoCliente: contrato.enviarContatoCliente || false,
      enviarOutroLocal: contrato.enviarOutroLocal || false,
      enviarPorEmail: contrato.enviarPorEmail || false,
      vendedorId: contrato.vendedorId || '',
      vendedorNome: contrato.vendedorNome || '',
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedContrato(null);
    setEditFormData({});
  };

  const handleOpenDeleteDialog = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedContrato(null);
  };

  const handleEditInputChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!userData?.empresaId || !selectedContrato) return;
    const empresaId = userData.empresaId;

    try {
      const contratosRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
      const contratoRef = doc(db, 'EMPRESAS', empresaId, 'contratos', selectedContrato.id);

      const bancoSelecionado = bancos.find(b => b.id === editFormData.bancoId);

      // Removida atualização de vendedor pois o usuário não pode mais alterar.
      // Preserva-se o que está no banco.

      await updateDoc(contratoRef, {
        status: editFormData.status, // Salvar novo Status
        periodicidadePreventiva: editFormData.periodicidadePreventiva || null,
        observacao: editFormData.observacao || '',
        diaBoleto: editFormData.diaBoleto || null,
        bancoId: editFormData.bancoId || null,
        bancoNome: bancoSelecionado ? `${bancoSelecionado.numeroBanco} - ${bancoSelecionado.nomeBanco}` : '',
        bancoTitular: bancoSelecionado?.nomeTitular || '',
        bancoAgencia: bancoSelecionado?.agencia || '',
        bancoConta: bancoSelecionado?.contaCorrente || '',
        gerarAutomaticamente: editFormData.gerarAutomaticamente,
        enviarParaBanco: editFormData.enviarParaBanco,
        enviarContatoCliente: editFormData.enviarContatoCliente,
        enviarOutroLocal: editFormData.enviarOutroLocal,
        enviarPorEmail: editFormData.enviarPorEmail,
        atualizadoEm: Timestamp.now(),
      });

      // ======================================================================
      // Sincronizar Status com o Cliente
      // ======================================================================
      try {
        const clienteId = selectedContrato.clienteId;
        const cliRef = doc(db, 'EMPRESAS', empresaId, 'clientes', clienteId);

        // Buscar todos os contratos deste cliente para determinar o status final
        const q = query(collection(db, 'EMPRESAS', empresaId, 'contratos'), where('clienteId', '==', clienteId));
        const contratosSnap = await getDocs(q);

        // Filtrar contratos ativos (status 'aprovado')
        // Importante: O contrato atual JÁ FOI ATUALIZADO no banco, então o snapshot já reflete o novo status dele.
        const contratosAtivos = contratosSnap.docs.filter(d => d.data().status === 'aprovado');

        let novoStatusContrato = ''; // Default: sem contrato

        if (contratosAtivos.length > 0) {
          novoStatusContrato = 'ativo';
        } else {
          // Se não tem ativos, verificamos se o contrato que acabamos de mexer ficou como cancelado
          // Se ele foi cancelado, e era o único, o status do cliente vira 'cancelado' (ex: churn)
          if (editFormData.status === 'cancelado') {
            novoStatusContrato = 'cancelado';
          }
          // Se foi 'reprovado' ou 'expirado', também pode ser considerado cancelado ou apenas sem contrato.
          // Assumindo 'cancelado' para indicar ex-cliente de contrato.
          else if (['reprovado', 'expirado'].includes(editFormData.status || '')) {
            novoStatusContrato = 'cancelado';
          }
        }

        console.log(`[Contratos] Atualizando cliente ${clienteId} para statusContrato: ${novoStatusContrato}`);
        await updateDoc(cliRef, {
          statusContrato: novoStatusContrato
        });

        // ------------------------------------------------------------------
        // Automação de Centro de Custo (Inativar/Ativar)
        // ------------------------------------------------------------------
        if (novoStatusContrato) {
          const cliSnap = await getDoc(cliRef);
          if (cliSnap.exists()) {
            const ccId = cliSnap.data().centroCustoId;
            if (ccId) {
              const ccRef = doc(db, 'EMPRESAS', empresaId, 'centros_custo', ccId);
              // Se cancelado -> inativa. Se ativo -> ativa.
              const novoEstadoCC = novoStatusContrato === 'ativo';
              await updateDoc(ccRef, {
                ativo: novoEstadoCC,
                atualizadoEm: new Date().toISOString()
              });
              console.log(`[Contratos] Centro de Custo ${ccId} atualizado para ativo: ${novoEstadoCC}`);
            }
          }
        }

      } catch (syncErr) {
        console.error('[Contratos] Erro ao sincronizar status do cliente:', syncErr);
        // Não falha o processo principal, apenas loga
      }

      setSuccess('Contrato atualizado com sucesso!');
      handleCloseEditDialog();
      loadContratos();
    } catch (err: any) {
      setError('Erro ao atualizar contrato: ' + err.message);
    }
  };

  const handleDeleteContrato = async () => {
    if (!userData?.empresaId || !selectedContrato) return;
    const empresaId = userData.empresaId;

    try {
      const contratoRef = doc(db, 'EMPRESAS', empresaId, 'contratos', selectedContrato.id);
      await deleteDoc(contratoRef);

      setSuccess('Contrato excluído com sucesso!');
      handleCloseDeleteDialog();
      loadContratos();
    } catch (err: any) {
      setError('Erro ao excluir contrato: ' + err.message);
    }
  };

  const valorPorExtenso = (valor: number): string => {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dez = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    if (valor === 0) return 'zero reais';
    if (valor === 100) return 'cem reais';

    const partes = valor.toFixed(2).split('.');
    const inteiro = parseInt(partes[0]);
    const centavos = parseInt(partes[1]);

    let extenso = '';

    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;

    if (milhares > 0) {
      if (milhares === 1) {
        extenso += 'mil';
      } else {
        extenso += converterCentenas(milhares) + ' mil';
      }
      if (resto > 0) extenso += ' ';
    }

    if (resto > 0) {
      extenso += converterCentenas(resto);
    }

    extenso += inteiro === 1 ? ' real' : ' reais';

    if (centavos > 0) {
      extenso += ' e ' + converterCentenas(centavos);
      extenso += centavos === 1 ? ' centavo' : ' centavos';
    }

    return extenso;

    function converterCentenas(num: number): string {
      if (num === 0) return '';

      const c = Math.floor(num / 100);
      const d = Math.floor((num % 100) / 10);
      const u = num % 10;

      let resultado = '';

      if (c > 0) {
        resultado += centenas[c];
        if (d > 0 || u > 0) resultado += ' e ';
      }

      if (d === 1) {
        resultado += dez[u];
      } else {
        if (d > 0) {
          resultado += dezenas[d];
          if (u > 0) resultado += ' e ';
        }
        if (u > 0 && d !== 1) {
          resultado += unidades[u];
        }
      }

      return resultado;
    }
  };

  const handleGerarPDF = async (contrato: Contrato) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    try {
      const [modeloSnap, empresaSnap, clienteSnap] = await Promise.all([
        getDoc(doc(db, 'EMPRESAS', empresaId, 'parametrosComerciais', 'modeloContrato')),
        getDoc(doc(db, 'EMPRESAS', empresaId)),
        getDoc(doc(db, 'EMPRESAS', empresaId, 'clientes', contrato.clienteId))
      ]);

      if (!modeloSnap.exists()) {
        setError('Modelo de contrato não configurado. Configure em Parâmetros Comerciais.');
        return;
      }

      const modelo = modeloSnap.data();
      const empresaData = empresaSnap.data() || {};
      const clienteData = clienteSnap.exists() ? clienteSnap.data() : {};

      // Gera cabeçalho padronizado com logo em Base64
      const cabecalhoHTML = await gerarCabecalhoEmpresaHTML(empresaData);

      const prefixoCliente = (contrato as any).clientePrefixo || clienteData.prefixoNome || '';
      const enderecoCompleto = `${contrato.clienteEndereco}, ${contrato.clienteNumero}${contrato.clienteComplemento ? ` - ${contrato.clienteComplemento}` : ''}, ${contrato.clienteBairro}, ${contrato.clienteCidade}/${contrato.clienteUf}${contrato.clienteCep ? ` - CEP: ${contrato.clienteCep}` : ''}`;

      const tipoContratoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label || '';

      // Vou focar apenas na substituição do trecho do logo e do final da impressão

      let tabelaCobertos = `<table class="user-table"><thead style="background-color: #C1E3DB"><tr><th style="width: 10%">Qtd</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>`;
      if (contrato.equipamentosCobertos && contrato.equipamentosCobertos.length > 0) {
        contrato.equipamentosCobertos.forEach(eq => {
          tabelaCobertos += `<tr><td style="text-align:center">${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
        });
      } else {
        tabelaCobertos += '<tr><td colspan="3" style="text-align:center">Nenhum equipamento listado</td></tr>';
      }
      tabelaCobertos += '</tbody></table>';

      let tabelaNaoCobertos = `<table class="user-table"><thead style="background-color: #C1E3DB"><tr><th style="width: 10%">Qtd</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>`;
      if (contrato.equipamentosNaoCobertos && contrato.equipamentosNaoCobertos.length > 0) {
        contrato.equipamentosNaoCobertos.forEach(eq => {
          tabelaNaoCobertos += `<tr><td style="text-align:center">${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
        });
      } else {
        tabelaNaoCobertos += '<tr><td colspan="3" style="text-align:center">Nenhum equipamento listado</td></tr>';
      }
      tabelaNaoCobertos += '</tbody></table>';

      const valorMensalExtenso = valorPorExtenso(contrato.valorContrato);

      let conteudoHTML = modelo.corpo || '';
      // ... replaces ...
      conteudoHTML = conteudoHTML
        .replace(/\{\{NOME_CLIENTE\}\}/g, contrato.clienteNome)
        .replace(/\{\{CNPJ_CPF\}\}/g, formatCnpjCpf(contrato.clienteCnpjCpf))
        .replace(/\{\{ENDERECO_COMPLETO\}\}/g, enderecoCompleto)
        .replace(/\{\{TIPO_CONTRATO\}\}/g, tipoContratoLabel)
        .replace(/\{\{TABELA_EQUIPAMENTOS_COBERTOS\}\}/g, tabelaCobertos)
        .replace(/\{\{TABELA_EQUIPAMENTOS_NAO_COBERTOS\}\}/g, tabelaNaoCobertos)
        .replace(/\{\{DATA_INICIO\}\}/g, contrato.data?.toDate().toLocaleDateString('pt-BR') || '')
        .replace(/\{\{VALOR_MENSAL\}\}/g, `R$ ${contrato.valorContrato.toFixed(2)}`)
        .replace(/\{\{VALOR_MENSAL_EXTENSO\}\}/g, valorMensalExtenso)
        .replace(/\{\{CLIENTE_PREFIXO\}\}/g, prefixoCliente);

      const htmlContent = gerarLayoutDocumentoHTML({
        titulo: `Contrato-${contrato.numero}`,
        cabecalhoHTML,
        rodapeHTML: modelo.rodape || '',
        corpoHTML: conteudoHTML.replace(/<table/g, '<table class="user-table"')
      });

      imprimirHTMLViaIframe(htmlContent);

    } catch (err: any) {
      setError('Erro ao gerar PDF: ' + err.message);
      console.error(err);
    }
  };

  // Lógica de Tabs e Cards
  // Vigentes: Apenas contratos efetivos (Aprovado legados, Ativo, Suspenso)
  // Exclui propostas (em_elaboracao, enviado) e rejeitados/expirados
  const contractStatuses = ['aprovado', 'ativo', 'suspenso'];
  const contratosVigentes = contratos.filter(c =>
    contractStatuses.includes(c.status?.toLowerCase())
  );

  // Cancelados: Apenas contratos cancelados ou encerrados
  // NÃO inclui reprovado/expirado (que são orçamentos falhos)
  const canceledStatuses = ['cancelado', 'encerrado'];
  const contratosCancelados = contratos.filter(c =>
    canceledStatuses.includes(c.status?.toLowerCase())
  );

  const totalVigentes = contratosVigentes.length;
  const valorVigentes = contratosVigentes.reduce((acc, c) => acc + (c.valorContrato || 0), 0);

  const totalCancelados = contratosCancelados.length;
  const valorCancelados = contratosCancelados.reduce((acc, c) => acc + (c.valorContrato || 0), 0);

  const currentList = tabValue === 0 ? contratosVigentes : contratosCancelados;

  const filteredContratos = currentList.filter((contrato) => {
    const matchesSearch =
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contrato.vendedorNome && contrato.vendedorNome.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const displayedContratos = filteredContratos.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  console.log('[Contratos] 🎨 Renderizando componente. Tab:', tabValue, 'Len:', filteredContratos.length);

  return (
    <ProtectedRoute requiredRoute="/contratos">
      <Box sx={{ pb: 4 }}>
        <Box className="flex items-center justify-between mb-6">
          <Box className="flex-1" />
          <Typography variant="h4" className="font-bold">
            Gestão de Contratos
          </Typography>
          <Box className="flex-1" />
        </Box>

        {error && <Alert severity="error" className="mb-4" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Cards Resumo */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Card Vigentes */}
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">CONTRATOS VIGENTES</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h4" fontWeight="bold" color="#1565c0" sx={{ lineHeight: 1 }}>
                {totalVigentes}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="#1976d2" sx={{ mt: 0.5 }}>
                R$ {valorVigentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>

          {/* Card Cancelados */}
          <Paper sx={{ p: 2, bgcolor: '#ffebee', borderLeft: '4px solid #ef5350' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">CONTRATOS CANCELADOS</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h4" fontWeight="bold" color="#d32f2f" sx={{ lineHeight: 1 }}>
                {totalCancelados}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="#ef5350" sx={{ mt: 0.5 }}>
                R$ {valorCancelados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Tabs de Navegação */}
        <Paper square sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary" centered>
            <Tab label={`Vigentes (${totalVigentes})`} />
            <Tab label="Cancelados" />
          </Tabs>
        </Paper>

        {loading ? (
          <Box className="flex justify-center p-8"><CircularProgress /></Box>
        ) : (
          <>
            <Box className="mb-4">
              <TextField
                fullWidth
                size="small"
                label="Buscar por número, cliente ou vendedor"
                placeholder="Digite o número, nome do cliente ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
              />
            </Box>

            <TableContainer component={Paper} sx={{ mb: 4, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                  <TableRow>
                    <TableCell /> {/* Coluna para o botão de expandir */}
                    <TableCell><strong>N° Contrato</strong></TableCell>
                    <TableCell><strong>Data</strong></TableCell>
                    <TableCell><strong>Cliente</strong></TableCell>
                    <TableCell><strong>Vendedor</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell><strong>Valor Mensal</strong></TableCell>
                    <TableCell><strong>Dia Boleto</strong></TableCell>
                    <TableCell><strong>Banco</strong></TableCell>
                    <TableCell align="right"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContratos.length === 0 ? (
                    <TableRow><TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhum contrato encontrado nesta aba
                      </Typography>
                    </TableCell></TableRow>
                  ) : (
                    displayedContratos.map(contrato => {
                      const bancoVinculado = bancos.find(b => b.id === contrato.bancoId);
                      const cliente = clientes.find(c => c.id === contrato.clienteId);

                      return (
                        <Row
                          key={contrato.id}
                          row={contrato}
                          cliente={cliente}
                          banco={bancoVinculado}
                          onEdit={handleOpenEditDialog}
                          onDelete={handleOpenDeleteDialog}
                          onViewPdf={handleGerarPDF}
                          onView={handleOpenViewDialog}
                        />
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Paper sx={{ width: '100%', mb: 2 }}>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredContratos.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              />
            </Paper>
          </>
        )}





        {/* Dialog de Edição */}
        {/* Dialog de Edição */}
        <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Informações do Contrato</DialogTitle>
          <DialogContent>
            {selectedContrato && (
              <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Status, Periodicidade e Dia Boleto (3 Colunas) */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Status do Contrato"
                    value={editFormData.status || ''}
                    onChange={(e) => handleEditInputChange('status', e.target.value)}
                    helperText="Atenção ao alterar status"
                  >
                    {STATUS_CONTRATO_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Periodicidade da Preventiva"
                    value={editFormData.periodicidadePreventiva || ''}
                    onChange={(e) => handleEditInputChange('periodicidadePreventiva', e.target.value)}
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    {PERIODICIDADE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Dia do Boleto"
                    value={editFormData.diaBoleto || ''}
                    onChange={(e) => handleEditInputChange('diaBoleto', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Box>

                <Divider sx={{ my: 1 }}>
                  <Typography variant="button" color="primary">Financeiro e Faturamento</Typography>
                </Divider>

                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Banco para Faturamento"
                  value={editFormData.bancoId || ''}
                  onChange={(e) => handleEditInputChange('bancoId', e.target.value)}
                >
                  <MenuItem value="">Nenhum banco selecionado</MenuItem>
                  {bancos.map((banco) => (
                    <MenuItem key={banco.id} value={banco.id}>
                      {banco.numeroBanco} - {banco.nomeBanco} | Ag: {banco.agencia} | C/C: {banco.contaCorrente}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Opções de Boleto</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editFormData.gerarAutomaticamente || false}
                          onChange={(e) => handleEditInputChange('gerarAutomaticamente', e.target.checked)}
                        />
                      }
                      label="Gerar Automaticamente"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editFormData.enviarParaBanco || false}
                          onChange={(e) => handleEditInputChange('enviarParaBanco', e.target.checked)}
                        />
                      }
                      label="Enviar para o Banco"
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Enviar Para</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <FormControlLabel
                        control={<Checkbox checked={editFormData.enviarContatoCliente || false} onChange={(e) => handleEditInputChange('enviarContatoCliente', e.target.checked)} />}
                        label="Contato do Cliente"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={editFormData.enviarOutroLocal || false} onChange={(e) => handleEditInputChange('enviarOutroLocal', e.target.checked)} />}
                        label="Outro Local"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={editFormData.enviarPorEmail || false} onChange={(e) => handleEditInputChange('enviarPorEmail', e.target.checked)} />}
                        label="Por E-Mail"
                      />
                    </Box>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Observação"
                  value={editFormData.observacao || ''}
                  onChange={(e) => handleEditInputChange('observacao', e.target.value)}
                  variant="outlined"
                />

              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseEditDialog} color="inherit">Cancelar</Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary">
              Salvar Alterações
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ color: '#f44336' }}>
            Confirmar Exclusão
          </DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir o contrato <strong>{selectedContrato?.numero}</strong>?
            </Typography>
            <Typography variant="body2" className="mt-2 text-gray-600">
              Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>
              Cancelar
            </Button>
            <Button onClick={handleDeleteContrato} variant="contained" color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Visualização */}
        <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
          <DialogTitle>Detalhes do Contrato (Somente Leitura)</DialogTitle>
          <DialogContent>
            {selectedContrato && (
              <Box className="space-y-4 mt-2">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número do Contrato"
                      value={selectedContrato.numero}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Data"
                      value={selectedContrato.data?.toDate().toLocaleDateString('pt-BR')}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Título do Contrato"
                      value={selectedContrato.titulo}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Vendedor"
                      value={selectedContrato.vendedorNome || '-'} // Exibir nome do vendedor
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tipo de Contrato"
                      value={TIPO_CONTRATO_OPTIONS.find(t => t.value === selectedContrato.tipoContrato)?.label}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Valor do Contrato (Mensal)"
                      value={`R$ ${selectedContrato.valorContrato.toFixed(2)}`}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Cliente"
                      value={selectedContrato.clienteNome}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CNPJ/CPF"
                      value={selectedContrato.clienteCnpjCpf}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Endereço Completo"
                      value={`${selectedContrato.clienteEndereco}, ${selectedContrato.clienteNumero}${selectedContrato.clienteComplemento ? ` - ${selectedContrato.clienteComplemento}` : ''}, ${selectedContrato.clienteBairro}, ${selectedContrato.clienteCidade}/${selectedContrato.clienteUf}${selectedContrato.clienteCep ? ` - CEP: ${selectedContrato.clienteCep}` : ''}`}
                      InputProps={{ readOnly: true }}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      select
                      label="Periodicidade da Preventiva"
                      value={selectedContrato.periodicidadePreventiva || ''}
                      InputProps={{ readOnly: true }}
                    >
                      {PERIODICIDADE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Dia do Boleto"
                      value={selectedContrato.diaBoleto || ''}
                      InputProps={{ readOnly: true }}
                      inputProps={{ min: 1, max: 31 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={3}
                      label="Observação"
                      value={selectedContrato.observacao || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      select
                      label="Banco"
                      value={selectedContrato.bancoId || ''}
                      InputProps={{ readOnly: true }}
                    >
                      <MenuItem value="">Nenhum banco selecionado</MenuItem>
                      {bancos.map((banco) => (
                        <MenuItem key={banco.id} value={banco.id}>
                          {banco.numeroBanco} - {banco.nomeBanco} | Titular: {banco.nomeTitular} | Ag: {banco.agencia} | C/C: {banco.contaCorrente}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box>
                      <Typography variant="subtitle2" className="font-bold mb-2">
                        Opções de Boleto
                      </Typography>
                      <FormControlLabel
                        control={<Checkbox checked={selectedContrato.gerarAutomaticamente || false} disabled />}
                        label="Gerar Automaticamente"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={selectedContrato.enviarParaBanco || false} disabled />}
                        label="Enviar para o Banco"
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box>
                      <Typography variant="subtitle2" className="font-bold mb-2">
                        Enviar Para
                      </Typography>
                      <FormControlLabel
                        control={<Checkbox checked={selectedContrato.enviarContatoCliente || false} disabled />}
                        label="Contato do Cliente"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={selectedContrato.enviarOutroLocal || false} disabled />}
                        label="Outro Local"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={selectedContrato.enviarPorEmail || false} disabled />}
                        label="Por E-Mail"
                      />
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" className="font-bold mb-2">
                    Equipamentos Cobertos pelo Contrato
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                        <TableRow>
                          <TableCell><strong>Quantidade</strong></TableCell>
                          <TableCell><strong>Equipamento</strong></TableCell>
                          <TableCell><strong>Fabricante</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedContrato.equipamentosCobertos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              Nenhum equipamento
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedContrato.equipamentosCobertos.map((eq, index) => (
                            <TableRow key={index}>
                              <TableCell>{eq.quantidade}</TableCell>
                              <TableCell>{eq.equipamento}</TableCell>
                              <TableCell>{eq.fabricanteNome || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" className="font-bold mb-2">
                    Equipamentos NÃO Cobertos pelo Contrato
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                        <TableRow>
                          <TableCell><strong>Quantidade</strong></TableCell>
                          <TableCell><strong>Equipamento</strong></TableCell>
                          <TableCell><strong>Fabricante</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedContrato.equipamentosNaoCobertos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              Nenhum equipamento
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedContrato.equipamentosNaoCobertos.map((eq, index) => (
                            <TableRow key={index}>
                              <TableCell>{eq.quantidade}</TableCell>
                              <TableCell>{eq.equipamento}</TableCell>
                              <TableCell>{eq.fabricanteNome || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Fechar</Button>
          </DialogActions>
        </Dialog>
        <iframe id="print-frame" title="Print Frame" style={{ width: 0, height: 0, border: 'none', position: 'absolute' }} />
      </Box >
    </ProtectedRoute >
  );
}

// Componente Row definido FORA do componente principal para evitar recriação a cada render e erros de hooks
function Row(props: {
  row: Contrato,
  cliente: any,
  banco: any,
  onEdit: (c: Contrato) => void,
  onDelete: (c: Contrato) => void,
  onViewPdf: (c: Contrato) => void,
  onView: (c: Contrato) => void
}) {
  const { row, cliente, banco, onEdit, onDelete, onViewPdf, onView } = props;
  const [open, setOpen] = useState(false);

  // Helpers de exibição


  const getStatusLabel = (status: string) => {
    return STATUS_CONTRATO_OPTIONS.find(o => o.value === status)?.label || status;
  };

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f5f5f5' : 'inherit' }}>
        <TableCell width={50}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ py: 1, fontWeight: 'bold' }}>
          {row.numero}
        </TableCell>
        <TableCell sx={{ py: 1 }}>{row.data?.toDate ? row.data.toDate().toLocaleDateString('pt-BR') : ''}</TableCell>
        <TableCell sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            {cliente?.prefixoNome ? `${cliente.prefixoNome} ` : ''}{row.clienteNome}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            {formatCnpjCpf(row.clienteCnpjCpf)}
          </Typography>
        </TableCell>
        <TableCell sx={{ py: 1 }}>{row.vendedorNome || '-'}</TableCell>
        <TableCell sx={{ py: 1 }}>
          <StatusChip
            status={row.tipoContrato === 'comodato' ? 'info' : 'ativo'}
            label={TIPO_CONTRATO_OPTIONS.find(t => t.value === row.tipoContrato)?.label}
            variant="outlined"
          />
        </TableCell>
        <TableCell sx={{ py: 1, color: 'green', fontWeight: 'bold' }}>
          R$ {row.valorContrato.toFixed(2)}
        </TableCell>
        <TableCell sx={{ py: 1 }}>{row.diaBoleto || '-'}</TableCell>
        <TableCell sx={{ py: 1 }}>{banco?.nomeTitular ? banco.nomeTitular.split(' ')[0] : '-'}</TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <ActionView title="Visualizar Detalhes" onClick={() => onView(row)} />
            <ActionEdit title="Editar" onClick={() => onEdit(row)} />
            <ActionDelete title="Excluir" onClick={() => onDelete(row)} />
            <ActionPdf title="Gerar PDF" onClick={() => onViewPdf(row)} />
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 1 }}>

              {/* Cabeçalho do Card Expandido com Status Principal */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="h6" gutterBottom component="div" sx={{ color: '#1976d2', mb: 0 }}>
                  Detalhes do Contrato
                </Typography>
                <StatusChip
                  status={row.status}
                  label={getStatusLabel(row.status)}
                />
              </Box>

              <Grid container spacing={3}>
                {/* Coluna 1: Dados Financeiros e Configuração */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 1 }}>
                    Financeiro & Configuração
                  </Typography>
                  <Box sx={{ bgcolor: '#f1f8e9', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="body2"><strong>Valor Mensal:</strong> R$ {row.valorContrato.toFixed(2)}</Typography>
                    <Typography variant="body2"><strong>Dia Vencim.:</strong> {row.diaBoleto || 'N/A'}</Typography>
                    <Typography variant="body2"><strong>Periodicidade:</strong> {row.periodicidadePreventiva || 'N/A'}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2"><strong>Banco:</strong> {row.bancoNome || 'Não selecionado'}</Typography>
                    {banco && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        AG: {banco.agencia} | CC: {banco.contaCorrente}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">Automações:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.gerarAutomaticamente && <Chip label="Gera Boleto Auto" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />}
                        {row.enviarPorEmail && <Chip label="Envia Email" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />}
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Coluna 2: Dados do Cliente (Snapshot) */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                    Dados do Cliente (No Contrato)
                  </Typography>
                  <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="body2"><strong>Nome:</strong> {row.clienteNome}</Typography>
                    <Typography variant="body2"><strong>Endereço:</strong> {row.clienteEndereco}, {row.clienteNumero}</Typography>
                    <Typography variant="body2">{row.clienteBairro} - {row.clienteCidade}/{row.clienteUf}</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      * Estes dados são uma cópia do momento da criação do contrato.
                    </Typography>
                  </Box>
                </Grid>

                {/* Coluna 3: Observações ou Outros */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#ef6c00', mb: 1 }}>
                    Observações
                  </Typography>
                  <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, height: '100%' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {row.observacao || "Nenhuma observação registrada."}
                    </Typography>
                  </Box>
                </Grid>

                {/* Linha Completa: Equipamentos Cobertos */}
                {row.equipamentosCobertos && row.equipamentosCobertos.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#455a64', mb: 1, mt: 1 }}>
                      Equipamentos Cobertos ({row.equipamentosCobertos.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: customColors.tableHeader }}>
                          <TableRow>
                            <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Qtd</strong></TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Equipamento</strong></TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Fabricante</strong></TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Tipo/Modelo</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {row.equipamentosCobertos.map((eq, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.quantidade}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.equipamento}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.fabricanteNome}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.tipoNome}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}
