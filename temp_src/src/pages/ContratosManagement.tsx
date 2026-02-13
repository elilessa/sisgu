import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Visibility, PictureAsPdf, Edit, Delete } from '@mui/icons-material';
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

export function ContratosManagement() {
  console.log('[Contratos] 🚀 Componente ContratosManagement iniciado');

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

  useEffect(() => {
    console.log('[Contratos] 🔄 useEffect executado. userData:', userData);
    loadContratos();
    loadBancos();
    loadVendedores(); // Carregar vendedores ao montar o componente
  }, [userData]);

  const loadBancos = async () => {
    if (!userData?.empresaId) return;

    try {
      const bancosRef = collection(db, 'EMPRESAS', userData.empresaId, 'bancos');
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

    try {
      const usuariosRef = collection(db, 'EMPRESAS', userData.empresaId, 'usuarios');
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

  const loadContratos = async () => {
    if (!userData?.empresaId) {
      console.log('[Contratos] userData.empresaId não disponível');
      return;
    }

    console.log('[Contratos] Iniciando carregamento. EmpresaId:', userData.empresaId);
    setLoading(true);
    try {
      const contratosRef = collection(db, 'EMPRESAS', userData.empresaId, 'contratos');
      console.log('[Contratos] Buscando documentos...');
      const snapshot = await getDocs(contratosRef);
      console.log('[Contratos] Total de documentos no Firestore:', snapshot.size);

      const contratosList: Contrato[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('[Contratos] Documento:', docSnap.id);
        console.log('[Contratos]   - Status original:', data.status, 'Tipo:', typeof data.status);
        console.log('[Contratos]   - Status toLowerCase:', data.status?.toLowerCase());
        console.log('[Contratos]   - Comparação com "aprovado":', data.status?.toLowerCase() === 'aprovado');

        // Filtrar apenas contratos com status 'aprovado' (case insensitive)
        if (data.status?.toLowerCase() === 'aprovado') {
          console.log('[Contratos]   ✅ INCLUÍDO na lista');
          contratosList.push({ id: docSnap.id, ...data } as Contrato);
        } else {
          console.log('[Contratos]   ❌ EXCLUÍDO da lista');
        }
      });
      console.log('[Contratos] Total de contratos APROVADOS encontrados:', contratosList.length);
      console.log('[Contratos] Lista final:', contratosList);

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
      periodicidadePreventiva: contrato.periodicidadePreventiva,
      observacao: contrato.observacao || '',
      diaBoleto: contrato.diaBoleto,
      bancoId: contrato.bancoId || '',
      gerarAutomaticamente: contrato.gerarAutomaticamente || false,
      enviarParaBanco: contrato.enviarParaBanco || false,
      enviarContatoCliente: contrato.enviarContatoCliente || false,
      enviarOutroLocal: contrato.enviarOutroLocal || false,
      enviarPorEmail: contrato.enviarPorEmail || false,
      vendedorId: contrato.vendedorId || '', // Adicionado para edição
      vendedorNome: contrato.vendedorNome || '', // Adicionado para edição
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

    try {
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'contratos', selectedContrato.id);

      const bancoSelecionado = bancos.find(b => b.id === editFormData.bancoId);
      const vendedorSelecionado = vendedores.find(v => v.id === editFormData.vendedorId); // Obter vendedor selecionado

      await updateDoc(contratoRef, {
        periodicidadePreventiva: editFormData.periodicidadePreventiva,
        observacao: editFormData.observacao,
        diaBoleto: editFormData.diaBoleto,
        bancoId: editFormData.bancoId,
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
        vendedorId: editFormData.vendedorId, // Salvar ID do vendedor
        vendedorNome: vendedorSelecionado ? vendedorSelecionado.nome : '', // Salvar nome do vendedor
      });

      setSuccess('Contrato atualizado com sucesso!');
      handleCloseEditDialog();
      loadContratos();
    } catch (err: any) {
      setError('Erro ao atualizar contrato: ' + err.message);
    }
  };

  const handleDeleteContrato = async () => {
    if (!userData?.empresaId || !selectedContrato) return;

    try {
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'contratos', selectedContrato.id);
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

    try {
      const modeloRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      const modeloSnap = await getDoc(modeloRef);

      if (!modeloSnap.exists()) {
        setError('Modelo de contrato não configurado. Configure em Parâmetros Comerciais.');
        return;
      }

      const modelo = modeloSnap.data();

      const enderecoCompleto = `${contrato.clienteEndereco}, ${contrato.clienteNumero}${contrato.clienteComplemento ? ` - ${contrato.clienteComplemento}` : ''}, ${contrato.clienteBairro}, ${contrato.clienteCidade}/${contrato.clienteUf}${contrato.clienteCep ? ` - CEP: ${contrato.clienteCep}` : ''}`;

      const tipoContratoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label || '';

      let tabelaCobertos = '<table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><thead><tr><th>Quantidade</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>';
      contrato.equipamentosCobertos.forEach(eq => {
        tabelaCobertos += `<tr><td>${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
      });
      tabelaCobertos += '</tbody></table>';

      let tabelaNaoCobertos = '<table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><thead><tr><th>Quantidade</th><th>Equipamento</th><th>Fabricante</th></tr></thead><tbody>';
      contrato.equipamentosNaoCobertos.forEach(eq => {
        tabelaNaoCobertos += `<tr><td>${eq.quantidade}</td><td>${eq.equipamento}</td><td>${eq.fabricanteNome || '-'}</td></tr>`;
      });
      tabelaNaoCobertos += '</tbody></table>';

      const processarTexto = (texto: string): string => {
        return texto
          .split('\n\n')
          .map(paragrafo => `<p>${paragrafo.replace(/\n/g, '<br>')}</p>`)
          .join('');
      };

      const valorMensalExtenso = valorPorExtenso(contrato.valorContrato);

      let conteudoHTML = modelo.corpo
        .replace(/\{\{NOME_CLIENTE\}\}/g, contrato.clienteNome)
        .replace(/\{\{CNPJ_CPF\}\}/g, contrato.clienteCnpjCpf)
        .replace(/\{\{ENDERECO_COMPLETO\}\}/g, enderecoCompleto)
        .replace(/\{\{TIPO_CONTRATO\}\}/g, tipoContratoLabel)
        .replace(/\{\{TABELA_EQUIPAMENTOS_COBERTOS\}\}/g, tabelaCobertos)
        .replace(/\{\{TABELA_EQUIPAMENTOS_NAO_COBERTOS\}\}/g, tabelaNaoCobertos)
        .replace(/\{\{DATA_INICIO\}\}/g, contrato.data?.toDate().toLocaleDateString('pt-BR') || '')
        .replace(/\{\{VALOR_MENSAL\}\}/g, `R$ ${contrato.valorContrato.toFixed(2)}`)
        .replace(/\{\{VALOR_MENSAL_EXTENSO\}\}/g, valorMensalExtenso);

      conteudoHTML = processarTexto(conteudoHTML);
      const rodapeFormatado = processarTexto(modelo.rodape || '');

      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Contrato ${contrato.numero}</title>
          <style>
            @page { margin: 2cm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              position: relative;
            }
            .contract-number {
              position: absolute;
              top: 0;
              right: 0;
              font-size: 11pt;
              font-weight: bold;
              color: #333;
            }
            .logo { 
              max-width: 200px; 
              max-height: 100px;
              margin-bottom: 10px;
            }
            h1 { 
              font-size: 18pt;
              font-weight: bold;
              margin: 10px 0;
              text-transform: uppercase;
              color: #1976d2;
            }
            .content { margin: 20px 0; }
            p {
              margin: 12px 0;
              text-align: justify;
              text-indent: 2em;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              page-break-inside: avoid;
            }
            th, td { 
              border: 1px solid #333; 
              padding: 10px; 
              text-align: left;
              font-size: 11pt;
            }
            th { 
              background-color: #f5f5f5;
              font-weight: bold;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              padding-top: 5px;
              border-top: 2px solid #333;
            }
            .footer p {
              text-indent: 0;
              margin: 8px 0;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="contract-number">Nº ${contrato.numero}</div>
            ${modelo.logoUrl ? `<img src="${modelo.logoUrl}" class="logo" alt="Logo">` : ''}
            <h1>${contrato.titulo}</h1>
          </div>
          <div class="content">
            ${conteudoHTML}
          </div>
          <div class="footer">
            ${rodapeFormatado}
          </div>
        </body>
        </html>
      `;

      const novaJanela = window.open('', '_blank');
      if (novaJanela) {
        novaJanela.document.write(htmlCompleto);
        novaJanela.document.close();
        novaJanela.focus();
        setTimeout(() => {
          novaJanela.print();
        }, 250);
      }

    } catch (err: any) {
      setError('Erro ao gerar PDF: ' + err.message);
    }
  };

  const filteredContratos = contratos.filter((contrato) => {
    const matchesSearch =
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contrato.vendedorNome && contrato.vendedorNome.toLowerCase().includes(searchTerm.toLowerCase())); // Buscar também pelo nome do vendedor
    return matchesSearch;
  });

  console.log('[Contratos] 🎨 Renderizando componente. Contratos:', contratos.length, 'Filtrados:', filteredContratos.length);

  return (
    <ProtectedRoute requiredRoute="/contratos">
    <Box>
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gestão de Contratos Aprovados
        </Typography>
        <Box className="flex-1" />
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

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" className="font-semibold text-gray-700">
          Contratos Aprovados ({contratos.length})
        </Typography>
      </Box>

      {loading ? (
        <Box className="flex justify-center p-8">
          <CircularProgress />
        </Box>
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

          <TableContainer component={Paper} className="mt-4">
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#e0f7f4' }}>
                <TableRow>
                  <TableCell><strong>Número</strong></TableCell>
                  <TableCell><strong>Data</strong></TableCell>
                  <TableCell><strong>Cliente</strong></TableCell>
                  <TableCell><strong>Vendedor</strong></TableCell> {/* Cabeçalho Vendedor adicionado */}
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell><strong>Valor Mensal</strong></TableCell>
                  <TableCell><strong>Dia Boleto</strong></TableCell>
                  <TableCell><strong>Titular Conta</strong></TableCell>
                  <TableCell align="right"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center"> {/* Colspan atualizado para 9 */}
                      <Typography variant="body2" color="textSecondary">
                        Nenhum contrato aprovado encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContratos.map((contrato) => {
                    const bancoVinculado = bancos.find(b => b.id === contrato.bancoId);
                    return (
                      <TableRow key={contrato.id}>
                        <TableCell>{contrato.numero}</TableCell>
                        <TableCell>{contrato.data?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{contrato.clienteNome}</TableCell>
                        <TableCell>{contrato.vendedorNome || '-'}</TableCell> {/* Célula Vendedor adicionada */}
                        <TableCell>
                          {TIPO_CONTRATO_OPTIONS.find(t => t.value === contrato.tipoContrato)?.label}
                        </TableCell>
                        <TableCell>R$ {contrato.valorContrato.toFixed(2)}</TableCell>
                        <TableCell>{contrato.diaBoleto || '-'}</TableCell>
                        <TableCell>{bancoVinculado?.nomeTitular || '-'}</TableCell>
                        <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenViewDialog(contrato)}
                          title="Visualizar"
                          sx={{ color: '#1976d2' }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(contrato)}
                          title="Editar"
                          sx={{ color: '#ff9800' }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(contrato)}
                          title="Excluir"
                          sx={{ color: '#f44336' }}
                        >
                          <Delete />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleGerarPDF(contrato)}
                          title="Gerar PDF"
                          sx={{ color: '#4caf50' }}
                        >
                          <PictureAsPdf />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialog de Edição */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Editar Informações do Contrato</DialogTitle>
        <DialogContent>
          {selectedContrato && (
            <Box className="space-y-4 mt-2">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Vendedor"
                    value={editFormData.vendedorId || ''}
                    onChange={(e) => handleEditInputChange('vendedorId', e.target.value)}
                  >
                    <MenuItem value="">Selecione o Vendedor</MenuItem>
                    {vendedores.map((vendedor) => ( // Opções de vendedor
                      <MenuItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
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
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Dia do Boleto"
                    value={editFormData.diaBoleto || ''}
                    onChange={(e) => handleEditInputChange('diaBoleto', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    label="Observação"
                    value={editFormData.observacao || ''}
                    onChange={(e) => handleEditInputChange('observacao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Banco"
                    value={editFormData.bancoId || ''}
                    onChange={(e) => handleEditInputChange('bancoId', e.target.value)}
                  >
                    <MenuItem value="">Nenhum banco selecionado</MenuItem>
                    {bancos.map((banco) => (
                      <MenuItem key={banco.id} value={banco.id}>
                        {banco.numeroBanco} - {banco.nomeBanco} | Titular: {banco.nomeTitular} | Ag: {banco.agencia} | C/C: {banco.contaCorrente}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" className="font-bold mb-2">
                      Opções de Boleto
                    </Typography>
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
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" className="font-bold mb-2">
                      Enviar Para
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editFormData.enviarContatoCliente || false}
                          onChange={(e) => handleEditInputChange('enviarContatoCliente', e.target.checked)}
                        />
                      }
                      label="Contato do Cliente"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editFormData.enviarOutroLocal || false}
                          onChange={(e) => handleEditInputChange('enviarOutroLocal', e.target.checked)}
                        />
                      }
                      label="Outro Local"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editFormData.enviarPorEmail || false}
                          onChange={(e) => handleEditInputChange('enviarPorEmail', e.target.checked)}
                        />
                      }
                      label="Por E-Mail"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Número do Contrato"
                    value={selectedContrato.numero}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Data"
                    value={selectedContrato.data?.toDate().toLocaleDateString('pt-BR')}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Título do Contrato"
                    value={selectedContrato.titulo}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Vendedor"
                    value={selectedContrato.vendedorNome || '-'} // Exibir nome do vendedor
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tipo de Contrato"
                    value={TIPO_CONTRATO_OPTIONS.find(t => t.value === selectedContrato.tipoContrato)?.label}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Valor do Contrato (Mensal)"
                    value={`R$ ${selectedContrato.valorContrato.toFixed(2)}`}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cliente"
                    value={selectedContrato.clienteNome}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="CNPJ/CPF"
                    value={selectedContrato.clienteCnpjCpf}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12}>
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
                <Grid item xs={12}>
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
                <Grid item xs={12}>
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
                <Grid item xs={12}>
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
    </Box>
    </ProtectedRoute>
  );
}