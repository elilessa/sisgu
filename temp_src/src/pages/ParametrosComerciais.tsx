
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Paper,
  Avatar,
  IconButton,
} from '@mui/material';
import { Save, Image as ImageIcon, Upload, Delete } from '@mui/icons-material';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface ModeloContrato {
  logoUrl: string;
  titulo: string;
  corpo: string;
  rodape: string;
  atualizadoEm?: Timestamp;
}

interface ModeloOrcamento {
  logoUrl: string;
  titulo: string;
  corpo: string;
  rodape: string;
  atualizadoEm?: Timestamp;
}

export function ParametrosComerciais() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [uploadingContrato, setUploadingContrato] = useState(false);
  const [uploadingOrcamento, setUploadingOrcamento] = useState(false);
  const fileInputContratoRef = useRef<HTMLInputElement>(null);
  const fileInputOrcamentoRef = useRef<HTMLInputElement>(null);

  // Estados do Modelo de Contrato
  const [modeloContrato, setModeloContrato] = useState<ModeloContrato>({
    logoUrl: '',
    titulo: '',
    corpo: '',
    rodape: '',
  });

  // Estados do Modelo de Orçamento
  const [modeloOrcamento, setModeloOrcamento] = useState<ModeloOrcamento>({
    logoUrl: '',
    titulo: '',
    corpo: '',
    rodape: '',
  });

  useEffect(() => {
    loadParametros();
  }, [userData]);

  const loadParametros = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      // Carregar Modelo de Contrato
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      const contratoSnap = await getDoc(contratoRef);
      
      if (contratoSnap.exists()) {
        setModeloContrato(contratoSnap.data() as ModeloContrato);
      }

      // Carregar Modelo de Orçamento
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloOrcamento');
      const orcamentoSnap = await getDoc(orcamentoRef);
      
      if (orcamentoSnap.exists()) {
        setModeloOrcamento(orcamentoSnap.data() as ModeloOrcamento);
      }
    } catch (err: any) {
      setError('Erro ao carregar parâmetros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContrato = async () => {
    if (!userData?.empresaId) return;

    if (!modeloContrato.corpo) {
      setError('Preencha o campo obrigatório: Corpo do Contrato');
      return;
    }

    try {
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      
      await setDoc(contratoRef, {
        ...modeloContrato,
        atualizadoEm: Timestamp.now(),
      });

      setSuccess('Modelo de Contrato salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar modelo de contrato: ' + err.message);
    }
  };

  const handleSaveOrcamento = async () => {
    if (!userData?.empresaId) return;

    if (!modeloOrcamento.corpo) {
      setError('Preencha o campo obrigatório: Corpo do Orçamento');
      return;
    }

    try {
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloOrcamento');
      
      await setDoc(orcamentoRef, {
        ...modeloOrcamento,
        atualizadoEm: Timestamp.now(),
      });

      setSuccess('Modelo de Orçamento salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar modelo de orçamento: ' + err.message);
    }
  };

  const handleContratoChange = (field: keyof ModeloContrato, value: string) => {
    setModeloContrato((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrcamentoChange = (field: keyof ModeloOrcamento, value: string) => {
    setModeloOrcamento((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadLogoContrato = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userData?.empresaId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida (PNG, JPG, etc.)');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingContrato(true);
    try {
      // Criar referência no Storage: EMPRESAS/{empresaId}/fotologo/logo-contrato.{extensao}
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `EMPRESAS/${userData.empresaId}/fotologo/logo-contrato.${fileExtension}`);
      
      // Upload do arquivo
      await uploadBytes(storageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(storageRef);
      
      // Atualizar estado
      setModeloContrato((prev) => ({ ...prev, logoUrl: downloadURL }));
      setSuccess('Logo do contrato enviado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao enviar logo: ' + err.message);
    } finally {
      setUploadingContrato(false);
      if (fileInputContratoRef.current) {
        fileInputContratoRef.current.value = '';
      }
    }
  };

  const handleUploadLogoOrcamento = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userData?.empresaId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida (PNG, JPG, etc.)');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingOrcamento(true);
    try {
      // Criar referência no Storage: EMPRESAS/{empresaId}/fotologo/logo-orcamento.{extensao}
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `EMPRESAS/${userData.empresaId}/fotologo/logo-orcamento.${fileExtension}`);
      
      // Upload do arquivo
      await uploadBytes(storageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(storageRef);
      
      // Atualizar estado
      setModeloOrcamento((prev) => ({ ...prev, logoUrl: downloadURL }));
      setSuccess('Logo do orçamento enviado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao enviar logo: ' + err.message);
    } finally {
      setUploadingOrcamento(false);
      if (fileInputOrcamentoRef.current) {
        fileInputOrcamentoRef.current.value = '';
      }
    }
  };

  const handleRemoveLogoContrato = async () => {
    if (!userData?.empresaId || !modeloContrato.logoUrl) return;

    try {
      // Tentar deletar a imagem do Storage (se possível)
      // Nota: isso só funciona se a URL for do Firebase Storage
      if (modeloContrato.logoUrl.includes('firebasestorage.googleapis.com')) {
        const url = new URL(modeloContrato.logoUrl);
        const pathMatch = url.pathname.match(/o\/(.+?)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const storageRef = ref(storage, filePath);
          await deleteObject(storageRef);
        }
      }
      
      // Limpar do estado
      setModeloContrato((prev) => ({ ...prev, logoUrl: '' }));
      setSuccess('Logo removido com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao remover logo: ' + err.message);
    }
  };

  const handleRemoveLogoOrcamento = async () => {
    if (!userData?.empresaId || !modeloOrcamento.logoUrl) return;

    try {
      // Tentar deletar a imagem do Storage (se possível)
      if (modeloOrcamento.logoUrl.includes('firebasestorage.googleapis.com')) {
        const url = new URL(modeloOrcamento.logoUrl);
        const pathMatch = url.pathname.match(/o\/(.+?)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const storageRef = ref(storage, filePath);
          await deleteObject(storageRef);
        }
      }
      
      // Limpar do estado
      setModeloOrcamento((prev) => ({ ...prev, logoUrl: '' }));
      setSuccess('Logo removido com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao remover logo: ' + err.message);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoute="/configuracoes/parametros-comerciais">
        <Box className="flex justify-center items-center h-96">
          <CircularProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoute="/configuracoes/parametros-comerciais">
      <Box className="p-6">
        <Typography variant="h4" className="font-bold mb-6">
          Parâmetros Comerciais
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

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="Modelo de Contrato" />
          <Tab label="Modelo de Orçamento" />
        </Tabs>

        {/* Aba: Modelo de Contrato */}
        {tabValue === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" className="font-bold mb-4">
              Configuração do Modelo de Contrato
            </Typography>

            <Grid container spacing={3}>
              {/* Logo */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" className="font-bold mb-2">
                  Logo da Empresa
                </Typography>
                <Box className="flex gap-3 items-start">
                  {modeloContrato.logoUrl && (
                    <Avatar
                      src={modeloContrato.logoUrl}
                      variant="square"
                      sx={{ width: 120, height: 120 }}
                    />
                  )}
                  {!modeloContrato.logoUrl && (
                    <Avatar
                      variant="square"
                      sx={{ width: 120, height: 120, bgcolor: '#e0e0e0' }}
                    >
                      <ImageIcon sx={{ fontSize: 60, color: '#9e9e9e' }} />
                    </Avatar>
                  )}
                  <Box className="flex flex-col gap-2 flex-1">
                    <input
                      ref={fileInputContratoRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogoContrato}
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={uploadingContrato ? <CircularProgress size={20} /> : <Upload />}
                      onClick={() => fileInputContratoRef.current?.click()}
                      disabled={uploadingContrato}
                    >
                      {uploadingContrato ? 'Enviando...' : 'Enviar Logo'}
                    </Button>
                    {modeloContrato.logoUrl && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleRemoveLogoContrato}
                        size="small"
                      >
                        Remover Logo
                      </Button>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      Formatos aceitos: PNG, JPG, JPEG (máx. 2MB)
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Corpo do Contrato */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" className="font-bold mb-1">
                  Corpo do Contrato *
                </Typography>
                <Typography variant="caption" color="textSecondary" className="mb-2 block">
                  Use os placeholders abaixo no texto do contrato:
                  <br />
                  • <code>{'{{NOME_CLIENTE}}'}</code> - Nome do cliente
                  <br />
                  • <code>{'{{CNPJ_CPF}}'}</code> - CNPJ ou CPF do cliente
                  <br />
                  • <code>{'{{ENDERECO_COMPLETO}}'}</code> - Endereço completo (inclui CEP)
                  <br />
                  • <code>{'{{TIPO_CONTRATO}}'}</code> - Com Peças, Sem Peças ou Comodato
                  <br />
                  • <code>{'{{TABELA_EQUIPAMENTOS_COBERTOS}}'}</code> - Tabela HTML com quantidade e equipamentos cobertos
                  <br />
                  • <code>{'{{TABELA_EQUIPAMENTOS_NAO_COBERTOS}}'}</code> - Tabela HTML com quantidade e equipamentos não cobertos
                  <br />
                  • <code>{'{{DATA_INICIO}}'}</code> - Data de início do contrato
                  <br />
                  • <code>{'{{DATA_FIM}}'}</code> - Data de término do contrato
                  <br />
                  • <code>{'{{VALOR_MENSAL}}'}</code> - Valor mensal do contrato
                  <br />
                  • <code>{'{{VALOR_MENSAL_EXTENSO}}'}</code> - Valor mensal por extenso (ex: mil e quinhentos reais)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={15}
                  value={modeloContrato.corpo}
                  onChange={(e) => handleContratoChange('corpo', e.target.value)}
                  placeholder="Cole aqui o corpo do contrato com os placeholders..."
                />
              </Grid>

              {/* Rodapé */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Rodapé do Contrato"
                  value={modeloContrato.rodape}
                  onChange={(e) => handleContratoChange('rodape', e.target.value)}
                  placeholder="Ex: Assinaturas, informações de contato, etc."
                />
              </Grid>

              {/* Botão Salvar */}
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveContrato}
                  size="large"
                >
                  Salvar Modelo de Contrato
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Aba: Modelo de Orçamento */}
        {tabValue === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" className="font-bold mb-4">
              Configuração do Modelo de Orçamento
            </Typography>

            <Grid container spacing={3}>
              {/* Logo */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" className="font-bold mb-2">
                  Logo da Empresa
                </Typography>
                <Box className="flex gap-3 items-start">
                  {modeloOrcamento.logoUrl && (
                    <Avatar
                      src={modeloOrcamento.logoUrl}
                      variant="square"
                      sx={{ width: 120, height: 120 }}
                    />
                  )}
                  {!modeloOrcamento.logoUrl && (
                    <Avatar
                      variant="square"
                      sx={{ width: 120, height: 120, bgcolor: '#e0e0e0' }}
                    >
                      <ImageIcon sx={{ fontSize: 60, color: '#9e9e9e' }} />
                    </Avatar>
                  )}
                  <Box className="flex flex-col gap-2 flex-1">
                    <input
                      ref={fileInputOrcamentoRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogoOrcamento}
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={uploadingOrcamento ? <CircularProgress size={20} /> : <Upload />}
                      onClick={() => fileInputOrcamentoRef.current?.click()}
                      disabled={uploadingOrcamento}
                    >
                      {uploadingOrcamento ? 'Enviando...' : 'Enviar Logo'}
                    </Button>
                    {modeloOrcamento.logoUrl && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleRemoveLogoOrcamento}
                        size="small"
                      >
                        Remover Logo
                      </Button>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      Formatos aceitos: PNG, JPG, JPEG (máx. 2MB)
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Corpo do Orçamento */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" className="font-bold mb-1">
                  Corpo do Orçamento *
                </Typography>
                <Typography variant="caption" color="textSecondary" className="mb-2 block">
                  Use os placeholders abaixo no texto do orçamento:
                  <br />
                  <strong>Dados do Cliente:</strong>
                  <br />
                  • <code>{'{{NOME_CLIENTE}}'}</code> - Nome do cliente
                  <br />
                  • <code>{'{{CNPJ_CPF}}'}</code> - CNPJ ou CPF do cliente
                  <br />
                  • <code>{'{{ENDERECO}}'}</code> - Endereço (rua)
                  <br />
                  • <code>{'{{NUMERO}}'}</code> - Número
                  <br />
                  • <code>{'{{COMPLEMENTO}}'}</code> - Complemento
                  <br />
                  • <code>{'{{BAIRRO}}'}</code> - Bairro
                  <br />
                  • <code>{'{{CIDADE}}'}</code> - Cidade
                  <br />
                  • <code>{'{{UF}}'}</code> - UF
                  <br />
                  • <code>{'{{CEP}}'}</code> - CEP
                  <br />
                  • <code>{'{{ENDERECO_COMPLETO}}'}</code> - Endereço completo formatado
                  <br />
                  <strong>Dados do Orçamento:</strong>
                  <br />
                  • <code>{'{{NUMERO_ORCAMENTO}}'}</code> - Número do orçamento (ex: ORÇ-250100001)
                  <br />
                  • <code>{'{{TITULO_ORCAMENTO}}'}</code> - Título do orçamento
                  <br />
                  • <code>{'{{DATA_EMISSAO}}'}</code> - Data de emissão do orçamento
                  <br />
                  • <code>{'{{DATA_VALIDADE}}'}</code> - Data de validade do orçamento
                  <br />
                  • <code>{'{{STATUS}}'}</code> - Status do orçamento
                  <br />
                  • <code>{'{{VENDEDOR_NOME}}'}</code> - Nome do vendedor responsável pelo orçamento
                  <br />
                  <strong>Dados dos Itens:</strong>
                  <br />
                  • <code>{'{{TABELA_ITENS}}'}</code> - Tabela HTML com itens (Qtd, Produto, Fabricante, Vlr Unit., Vlr Total)
                  <br />
                  <strong>Dados dos Valores:</strong>
                  <br />
                  • <code>{'{{VALOR_TOTAL}}'}</code> - Valor total do orçamento
                  <br />
                  • <code>{'{{VALOR_TOTAL_EXTENSO}}'}</code> - Valor total por extenso
                  <br />
                  <strong>Dados do Contato Atual:</strong>
                  <br />
                  • <code>{'{{CONTATO_NOME}}'}</code> - Nome do contato atual
                  <br />
                  • <code>{'{{CONTATO_APTO}}'}</code> - Apartamento do contato
                  <br />
                  • <code>{'{{CONTATO_FUNCAO}}'}</code> - Função do contato
                  <br />
                  • <code>{'{{CONTATO_TELEFONE}}'}</code> - Telefone do contato
                  <br />
                  • <code>{'{{CONTATO_WHATSAPP}}'}</code> - WhatsApp do contato
                  <br />
                  • <code>{'{{CONTATO_EMAIL1}}'}</code> - E-mail principal
                  <br />
                  • <code>{'{{CONTATO_EMAIL2}}'}</code> - E-mail secundário
                  <br />
                  <strong>Observações:</strong>
                  <br />
                  • <code>{'{{OBSERVACAO}}'}</code> - Observações do orçamento
                  <br />
                  <strong>Dados de Pagamento À Vista:</strong>
                  <br />
                  • <code>{'{{PAGAMENTO_A_VISTA}}'}</code> - Bloco completo de pagamento à vista (só aparece se for à vista)
                  <br />
                  • <code>{'{{DATA_VENCIMENTO_VISTA}}'}</code> - Data de vencimento do pagamento à vista
                  <br />
                  • <code>{'{{FORMA_PAGAMENTO_VISTA}}'}</code> - Forma de pagamento à vista
                  <br />
                  <strong>Dados de Pagamento Parcelado:</strong>
                  <br />
                  • <code>{'{{PAGAMENTO_PARCELADO}}'}</code> - Bloco completo de pagamento parcelado (só aparece se for parcelado)
                  <br />
                  • <code>{'{{PAGAMENTO_ENTRADA}}'}</code> - Bloco de entrada (só aparece se houver entrada)
                  <br />
                  • <code>{'{{VALOR_ENTRADA}}'}</code> - Valor da entrada
                  <br />
                  • <code>{'{{FORMA_PAGAMENTO_ENTRADA}}'}</code> - Forma de pagamento da entrada
                  <br />
                  • <code>{'{{DIA_VENCIMENTO_ENTRADA}}'}</code> - Dia do vencimento da entrada
                  <br />
                  • <code>{'{{NUMERO_PARCELAS}}'}</code> - Número de parcelas
                  <br />
                  • <code>{'{{VALOR_PARCELA}}'}</code> - Valor de cada parcela
                  <br />
                  • <code>{'{{VALOR_RESTANTE}}'}</code> - Valor restante após entrada (se houver entrada)
                  <br />
                  • <code>{'{{FORMA_PAGAMENTO_PARCELAS}}'}</code> - Forma de pagamento das parcelas
                  <br />
                  • <code>{'{{DIA_VENCIMENTO_PARCELAS}}'}</code> - Dia do vencimento das parcelas
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={15}
                  value={modeloOrcamento.corpo}
                  onChange={(e) => handleOrcamentoChange('corpo', e.target.value)}
                  placeholder="Cole aqui o corpo do orçamento com os placeholders..."
                />
              </Grid>

              {/* Rodapé */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Rodapé do Orçamento"
                  value={modeloOrcamento.rodape}
                  onChange={(e) => handleOrcamentoChange('rodape', e.target.value)}
                  placeholder="Ex: Validade da proposta, condições de pagamento, etc."
                />
              </Grid>

              {/* Botão Salvar */}
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveOrcamento}
                  size="large"
                >
                  Salvar Modelo de Orçamento
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    </ProtectedRoute>
  );
}
