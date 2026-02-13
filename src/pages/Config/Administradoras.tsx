import React, { useState, useEffect } from 'react';
import { customColors } from '../../theme';
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
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { ActionView, ActionEdit, ActionDelete, StatusChip } from '../../components/TableActions';
import { Add, Person, Phone, Email, Star, Print, Close, FilterList } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Administradora {
  id: string;
  nome: string;
  tipo: 'administradora' | 'sindico_profissional';
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  site: string;
  email: string;
  observacao: string;
  status: 'ativa' | 'inativa';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Contato {
  id?: string;
  nome: string;
  cargo: string;
  telefone: string;
  celular: string;
  email: string;
  ramal: string;
  principal: boolean;
  observacao: string;
  ativo: boolean;
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function Administradoras() {
  const { userData } = useAuth();
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openContatoDeleteDialog, setOpenContatoDeleteDialog] = useState(false);
  const [openContatoTempDeleteDialog, setOpenContatoTempDeleteDialog] = useState(false);
  const [selectedAdministradora, setSelectedAdministradora] = useState<Administradora | null>(null);
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [selectedContatoTempIndex, setSelectedContatoTempIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Relatório
  const [openRelatorioDialog, setOpenRelatorioDialog] = useState(false);
  const [relatorioFiltro, setRelatorioFiltro] = useState<'todas' | 'ativas' | 'inativas'>('ativas');
  const [contatosPorAdministradora, setContatosPorAdministradora] = useState<Record<string, Contato[]>>({});
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  // Estados para Contatos
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatosTemporarios, setContatosTemporarios] = useState<Contato[]>([]);
  const [openContatoDialog, setOpenContatoDialog] = useState(false);
  const [isEditingContato, setIsEditingContato] = useState(false);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [editingContatoIndex, setEditingContatoIndex] = useState<number | null>(null);

  // Funções de Máscara
  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove tudo o que não é dígito
      .replace(/^(\d{5})(\d)/, '$1-$2') // Coloca hífen entre o quinto e o sexto dígitos
      .substring(0, 9); // Limita o tamanho
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove tudo o que não é dígito
      .replace(/^(\d{2})(\d)/g, '($1) $2') // Coloca parênteses em volta dos dois primeiros dígitos
      .replace(/(\d)(\d{4})$/, '$1-$2') // Coloca hífen entre o quarto e o quinto dígitos
      .substring(0, 15); // Limita o tamanho
  };

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'administradora' as 'administradora' | 'sindico_profissional',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    site: '',
    email: '',
    observacao: '',
    status: 'ativa' as 'ativa' | 'inativa',
  });

  const [contatoFormData, setContatoFormData] = useState({
    nome: '',
    cargo: '',
    telefone: '',
    celular: '',
    email: '',
    ramal: '',
    principal: false,
    observacao: '',
    ativo: true,
  });

  // Função para buscar CEP
  const checkCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro.toUpperCase(),
          bairro: data.bairro.toUpperCase(),
          cidade: data.localidade.toUpperCase(),
          uf: data.uf,
          complemento: data.complemento ? data.complemento.toUpperCase() : prev.complemento
        }));
      } else {
        setError('CEP não encontrado.');
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
      // Não bloqueia o fluxo, apenas não preenche
    }
  };


  useEffect(() => {
    loadAdministradoras();
  }, [userData]);

  // Limpar mensagens de erro automaticamente
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadAdministradoras = async () => {
    if (!userData?.empresaId) return;

    setLoading(true);
    try {
      const administradorasRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras');
      const q = query(administradorasRef, orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);

      const administradorasList: Administradora[] = [];
      snapshot.forEach((doc) => {
        administradorasList.push({ id: doc.id, ...doc.data() } as Administradora);
      });

      setAdministradoras(administradorasList);
    } catch (err: any) {
      setError('Erro ao carregar administradoras: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (administradora?: Administradora) => {
    setTabValue(0);
    if (administradora) {
      setIsEditing(true);
      setSelectedAdministradora(administradora);
      setFormData({
        nome: administradora.nome,
        tipo: administradora.tipo || 'administradora',
        endereco: administradora.endereco,
        numero: administradora.numero,
        complemento: administradora.complemento,
        bairro: administradora.bairro,
        cidade: administradora.cidade,
        uf: administradora.uf,
        cep: administradora.cep,
        site: administradora.site,
        email: administradora.email || '',
        observacao: administradora.observacao,
        status: administradora.status,
      });
      await loadContatos(administradora.id);
      setContatosTemporarios([]);
    } else {
      setIsEditing(false);
      setSelectedAdministradora(null);
      setFormData({
        nome: '',
        tipo: 'administradora',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        site: '',
        email: '',
        observacao: '',
        status: 'ativa',
      });
      setContatosTemporarios([]);
      setContatos([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAdministradora(null);
    setIsEditing(false);
    setContatosTemporarios([]);
    setContatos([]);
    setTabValue(0);
  };

  const handleOpenViewDialog = async (administradora: Administradora) => {
    setSelectedAdministradora(administradora);
    await loadContatos(administradora.id);
    setOpenViewDialog(true);
  };

  // Funções para Contatos
  const loadContatos = async (administradoraId: string) => {
    if (!userData?.empresaId) return;
    const empresaId = userData.empresaId;

    setLoadingContatos(true);
    try {
      const contatosRef = collection(
        db,
        'EMPRESAS',
        empresaId,
        'administradoras',
        administradoraId,
        'contatos'
      );
      const snapshot = await getDocs(contatosRef);

      const contatosList: Contato[] = [];
      snapshot.forEach((doc) => {
        contatosList.push({ id: doc.id, ...doc.data() } as Contato);
      });

      setContatos(contatosList);
    } catch (err: any) {
      setError('Erro ao carregar contatos: ' + err.message);
    } finally {
      setLoadingContatos(false);
    }
  };

  const handleOpenContatoDialog = (contato?: Contato, index?: number) => {
    if (contato && index !== undefined) {
      setIsEditingContato(true);
      setEditingContatoIndex(index);
      setContatoFormData({
        nome: contato.nome,
        cargo: contato.cargo,
        telefone: contato.telefone,
        celular: contato.celular,
        email: contato.email,
        ramal: contato.ramal,
        principal: contato.principal,
        observacao: contato.observacao,
        ativo: contato.ativo,
      });
    } else {
      setIsEditingContato(false);
      setEditingContatoIndex(null);
      setContatoFormData({
        nome: '',
        cargo: '',
        telefone: '',
        celular: '',
        email: '',
        ramal: '',
        principal: false,
        observacao: '',
        ativo: true,
      });
    }
    setOpenContatoDialog(true);
  };

  const handleCloseContatoDialog = () => {
    setOpenContatoDialog(false);
    setEditingContatoIndex(null);
    setIsEditingContato(false);
  };

  const handleOpenContatoDeleteDialog = (contato: Contato) => {
    setSelectedContato(contato);
    setOpenContatoDeleteDialog(true);
  };

  const handleCloseContatoDeleteDialog = () => {
    setOpenContatoDeleteDialog(false);
    setSelectedContato(null);
  };

  const handleContatoInputChange = (field: string, value: any) => {
    setContatoFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddContatoTemporario = () => {
    // Validação de campos obrigatórios removida


    // Se marcar como principal, desmarcar outros
    let updatedContatos = [...contatosTemporarios];
    if (contatoFormData.principal) {
      updatedContatos = updatedContatos.map(c => ({ ...c, principal: false }));
    }

    if (editingContatoIndex !== null) {
      updatedContatos[editingContatoIndex] = { ...contatoFormData };
    } else {
      updatedContatos.push({ ...contatoFormData });
    }

    setContatosTemporarios(updatedContatos);
    handleCloseContatoDialog();
    setSuccess('Contato adicionado!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleOpenContatoTempDeleteDialog = (index: number) => {
    setSelectedContatoTempIndex(index);
    setOpenContatoTempDeleteDialog(true);
  };

  const handleCloseContatoTempDeleteDialog = () => {
    setOpenContatoTempDeleteDialog(false);
    setSelectedContatoTempIndex(null);
  };

  const handleRemoveContatoTemporario = () => {
    if (selectedContatoTempIndex === null) return;
    const updated = contatosTemporarios.filter((_, i) => i !== selectedContatoTempIndex);
    setContatosTemporarios(updated);
    handleCloseContatoTempDeleteDialog();
    setSuccess('Contato removido!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleSaveContato = async () => {
    if (!userData?.empresaId || !selectedAdministradora) return;
    // Validação de campos obrigatórios removida


    try {
      const empresaId = userData.empresaId;
      const contatosRef = collection(
        db,
        'EMPRESAS',
        empresaId,
        'administradoras',
        selectedAdministradora.id,
        'contatos'
      );

      // Se marcar como principal, desmarcar outros
      if (contatoFormData.principal) {
        const snapshot = await getDocs(contatosRef);
        const updates = snapshot.docs
          .filter(doc => doc.id !== selectedContato?.id)
          .map(doc =>
            updateDoc(doc.ref, { principal: false })
          );
        await Promise.all(updates);
      }

      if (isEditingContato && selectedContato) {
        const docRef = doc(
          db,
          'EMPRESAS',
          empresaId as string,
          'administradoras',
          selectedAdministradora.id,
          'contatos',
          selectedContato.id as string
        );
        await updateDoc(docRef, {
          ...contatoFormData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Contato atualizado com sucesso!');
      } else {
        await addDoc(contatosRef, {
          ...contatoFormData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Contato criado com sucesso!');
      }

      handleCloseContatoDialog();
      await loadContatos(selectedAdministradora.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar contato: ' + err.message);
    }
  };

  const handleDeleteContato = async () => {
    if (!userData?.empresaId || !selectedAdministradora || !selectedContato) return;
    const empresaId = userData.empresaId;

    try {
      await deleteDoc(
        doc(
          db,
          'EMPRESAS',
          empresaId as string,
          'administradoras',
          selectedAdministradora.id,
          'contatos',
          selectedContato.id as string
        )
      );
      setSuccess('Contato excluído com sucesso!');
      handleCloseContatoDeleteDialog();
      await loadContatos(selectedAdministradora.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir contato: ' + err.message);
    }
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedAdministradora(null);
  };

  const handleOpenDeleteDialog = (administradora: Administradora) => {
    setSelectedAdministradora(administradora);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedAdministradora(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userData?.empresaId) return;

    if (!formData.nome || !formData.cidade || !formData.uf) {
      setError('Preencha os campos obrigatórios: Nome, Cidade e UF');
      return;
    }

    try {
      const administradorasRef = collection(db, 'EMPRESAS', userData.empresaId, 'administradoras');

      if (isEditing && selectedAdministradora) {
        const docRef = doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', selectedAdministradora.id);
        await updateDoc(docRef, {
          ...formData,
          atualizadoEm: Timestamp.now(),
        });
        setSuccess('Administradora atualizada com sucesso!');
      } else {
        // Criar nova administradora
        const novaAdmRef = await addDoc(administradorasRef, {
          ...formData,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        });

        // Salvar contatos temporarios
        if (contatosTemporarios.length > 0) {
          const contatosRef = collection(
            db,
            'EMPRESAS',
            userData.empresaId,
            'administradoras',
            novaAdmRef.id,
            'contatos'
          );

          const batch = writeBatch(db);
          contatosTemporarios.forEach((contato) => {
            const newContatoRef = doc(contatosRef);
            batch.set(newContatoRef, {
              ...contato,
              criadoEm: Timestamp.now(),
              atualizadoEm: Timestamp.now(),
            });
          });
          await batch.commit();
        }

        setSuccess('Administradora criada com sucesso!');
      }

      handleCloseDialog();
      loadAdministradoras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar administradora: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!userData?.empresaId || !selectedAdministradora) return;

    try {
      await deleteDoc(doc(db, 'EMPRESAS', userData.empresaId, 'administradoras', selectedAdministradora.id));
      setSuccess('Administradora excluída com sucesso!');
      handleCloseDeleteDialog();
      loadAdministradoras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir administradora: ' + err.message);
    }
  };

  // Funções para Relatório
  const loadAllContatos = async () => {
    if (!userData?.empresaId) return;

    setLoadingRelatorio(true);
    try {
      const contatosMap: Record<string, Contato[]> = {};

      // Filtrar administradoras conforme o filtro selecionado
      const administradorasFiltradas = administradoras.filter(adm => {
        if (relatorioFiltro === 'todas') return true;
        return adm.status === relatorioFiltro.slice(0, -1) as 'ativa' | 'inativa'; // Remove 's' do final
      });

      for (const adm of administradorasFiltradas) {
        const contatosRef = collection(
          db,
          'EMPRESAS',
          userData.empresaId,
          'administradoras',
          adm.id,
          'contatos'
        );

        const q = query(contatosRef, orderBy('nome', 'asc'));
        const snapshot = await getDocs(q);

        contatosMap[adm.id] = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Contato))
          .filter(contato => contato.ativo); // Apenas contatos ativos
      }

      setContatosPorAdministradora(contatosMap);
    } catch (err: any) {
      console.error('Erro ao carregar contatos:', err);
      setError('Erro ao carregar contatos para o relatório');
    } finally {
      setLoadingRelatorio(false);
    }
  };

  const handlePrintRelatorio = () => {
    const element = document.getElementById('relatorio-administradoras');
    if (element) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Relatório de Administradoras</title>
              <style>
                @media print {
                  @page { margin: 1cm; }
                  body { margin: 0; }
                }
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  color: #333;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 3px solid #9c27b0;
                  padding-bottom: 15px;
                }
                .header h1 {
                  color: #9c27b0;
                  margin: 0 0 10px 0;
                }
                .header p {
                  margin: 5px 0;
                  color: #666;
                }
                .card {
                  border: 2px solid #e0e0e0;
                  border-radius: 8px;
                  padding: 20px;
                  margin-bottom: 25px;
                  page-break-inside: avoid;
                  background: #fff;
                }
                .card-header {
                  border-bottom: 3px solid #9c27b0;
                  padding-bottom: 10px;
                  margin-bottom: 15px;
                }
                .card-header h2 {
                  color: #9c27b0;
                  margin: 0 0 5px 0;
                  font-size: 18px;
                }
                .card-header .tipo {
                  color: #666;
                  font-size: 12px;
                  text-transform: uppercase;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 15px;
                  margin-bottom: 15px;
                }
                .info-item {
                  margin-bottom: 10px;
                }
                .info-label {
                  font-size: 11px;
                  color: #666;
                  text-transform: uppercase;
                  font-weight: bold;
                  margin-bottom: 3px;
                }
                .info-value {
                  font-size: 13px;
                  color: #333;
                }
                .divider {
                  border: none;
                  border-top: 1px solid #ddd;
                  margin: 15px 0;
                }
                .contatos-title {
                  font-size: 14px;
                  font-weight: bold;
                  color: #333;
                  margin-bottom: 10px;
                  display: flex;
                  align-items: center;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 12px;
                }
                thead {
                  background-color: #f5f5f5;
                }
                th {
                  padding: 8px;
                  text-align: left;
                  font-weight: bold;
                  border-bottom: 2px solid #ddd;
                }
                td {
                  padding: 8px;
                  border-bottom: 1px solid #eee;
                }
                tr:last-child td {
                  border-bottom: none;
                }
                .no-contatos {
                  text-align: center;
                  color: #999;
                  font-style: italic;
                  padding: 15px;
                }
                .footer {
                  margin-top: 30px;
                  padding-top: 15px;
                  border-top: 2px solid #9c27b0;
                  text-align: center;
                  color: #666;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  // Carregar contatos quando abrir o dialog
  useEffect(() => {
    if (openRelatorioDialog) {
      loadAllContatos();
    }
  }, [openRelatorioDialog, relatorioFiltro]);

  const filteredAdministradoras = administradoras.filter((administradora) =>
    administradora.nome.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRoute="/configuracoes/administradoras">
      <Box className="flex items-center justify-between mb-6">
        <Box className="flex-1" />
        <Typography variant="h4" className="font-bold">
          Gerenciamento de Administradoras
        </Typography>
        <Box className="flex-1 flex justify-end gap-2">
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Print />}
            onClick={() => setOpenRelatorioDialog(true)}
          >
            Relatório
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nova Administradora
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
              label="Buscar por nome"
              placeholder="Digite o nome da administradora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              variant="outlined"
            />
          </Box>
          <TableContainer component={Paper} className="mt-4" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: { xs: 600, md: 750 } }}>
              <TableHead sx={{ backgroundColor: customColors.tableHeader }}>
                <TableRow>
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Cidade</strong></TableCell>
                  <TableCell><strong>UF</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Acões</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAdministradoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhuma administradora encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdministradoras.map((administradora) => (
                    <TableRow key={administradora.id}>
                      <TableCell sx={{ py: 0.25 }}>
                        <Chip
                          label={administradora.tipo === 'sindico_profissional' ? 'Síndico Prof.' : 'Administradora'}
                          color={administradora.tipo === 'sindico_profissional' ? 'secondary' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.25 }}>{administradora.nome}</TableCell>
                      <TableCell sx={{ py: 0.25 }}>{administradora.cidade}</TableCell>
                      <TableCell sx={{ py: 0.25 }}>{administradora.uf}</TableCell>
                      <TableCell sx={{ py: 0.25 }}>
                        <StatusChip status={administradora.status} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.25 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <ActionView onClick={() => handleOpenViewDialog(administradora)} title="Visualizar" />
                          <ActionEdit onClick={() => handleOpenDialog(administradora)} title="Editar" />
                          <ActionDelete
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteDialog(administradora);
                            }}
                            title="Excluir"
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialog de Cadastro/Edição com Abas */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Administradora' : 'Nova Administradora'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Dados da Administradora" />
            <Tab label={`Contatos (${isEditing ? contatos.length : contatosTemporarios.length})`} />
          </Tabs>

          {/* Aba 1: Dados da Administradora */}
          {tabValue === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Tipo de Gestão"
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                >
                  <MenuItem value="administradora">Administradora</MenuItem>
                  <MenuItem value="sindico_profissional">Síndico Profissional</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={formData.tipo === 'sindico_profissional' ? "Nome do Síndico / Razão Social" : "Nome da Administradora *"}
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Endereço"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Número"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Complemento"
                  value={formData.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Cidade *"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="UF *"
                  value={formData.uf}
                  onChange={(e) => handleInputChange('uf', e.target.value)}
                >
                  {UF_OPTIONS.map((uf) => (
                    <MenuItem key={uf} value={uf}>
                      {uf}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="CEP"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', maskCEP(e.target.value))}
                  onBlur={(e) => checkCEP(e.target.value)}
                  placeholder="00000-000"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'ativa' | 'inativa')}
                >
                  <MenuItem value="ativa">Ativa</MenuItem>
                  <MenuItem value="inativa">Inativa</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Site (URL)"
                  type="url"
                  value={formData.site}
                  onChange={(e) => handleInputChange('site', e.target.value.toLowerCase())}
                  placeholder="https://exemplo.com.br"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="E-mail Corporativo"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                  placeholder="contato@empresa.com.br"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Observação"
                  multiline
                  rows={2}
                  value={formData.observacao}
                  onChange={(e) => handleInputChange('observacao', e.target.value.toUpperCase())}
                />
              </Grid>
            </Grid>
          )}

          {/* Aba 2: Contatos */}
          {tabValue === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box className="flex items-center justify-between mb-3">
                <Typography variant="subtitle1" className="font-bold">
                  Lista de Contatos
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => handleOpenContatoDialog()}
                >
                  Adicionar Contato
                </Button>
              </Box>

              {isEditing ? (
                // Modo Edição: Mostra contatos já salvos com todos os campos
                loadingContatos ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress size={30} />
                  </Box>
                ) : contatos.length === 0 ? (
                  <Alert severity="info">Nenhum contato cadastrado</Alert>
                ) : (
                  <Box className="space-y-2">
                    {contatos.map((contato) => (
                      <Card key={contato.id} variant="outlined">
                        <CardContent className="pb-2">
                          <Box className="flex items-start justify-between">
                            <Box className="flex-grow">
                              <Typography variant="subtitle1" className="font-bold">
                                {contato.nome}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" className="mb-2">
                                <strong>Função:</strong> {contato.cargo}
                              </Typography>

                              <Box className="mt-2 space-y-1">
                                {contato.telefone && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Telefone:</strong> {contato.telefone}
                                    {contato.ramal && ` - Ramal: ${contato.ramal}`}
                                  </Typography>
                                )}
                                {contato.celular && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>WhatsApp:</strong> {contato.celular}
                                  </Typography>
                                )}
                                {contato.email && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail:</strong> {contato.email}
                                  </Typography>
                                )}
                                {!contato.telefone && !contato.celular && !contato.email && (
                                  <Typography variant="body2" color="textSecondary">
                                    Nenhum contato informado
                                  </Typography>
                                )}
                              </Box>

                              {contato.observacao && (
                                <Typography variant="body2" className="mt-2 text-gray-600">
                                  <strong>Observação:</strong> {contato.observacao}
                                </Typography>
                              )}
                            </Box>
                            <Box className="flex items-center gap-1">
                              <StatusChip status={contato.ativo ? 'ativo' : 'inativo'} label={contato.ativo ? 'Ativo' : 'Inativo'} />
                              {contato.principal && (
                                <Chip
                                  icon={<Star style={{ fontSize: 16 }} />}
                                  label="Principal"
                                  color="primary"
                                  size="small"
                                />
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                        <CardActions className="pt-0">
                          <ActionEdit
                            onClick={() => {
                              setSelectedContato(contato);
                              setIsEditingContato(true);
                              setContatoFormData({
                                nome: contato.nome,
                                cargo: contato.cargo,
                                telefone: contato.telefone,
                                celular: contato.celular,
                                email: contato.email,
                                ramal: contato.ramal,
                                principal: contato.principal,
                                observacao: contato.observacao,
                                ativo: contato.ativo,
                              });
                              setOpenContatoDialog(true);
                            }}
                            title="Editar"
                          />
                          <ActionDelete
                            onClick={() => handleOpenContatoDeleteDialog(contato)}
                            title="Excluir"
                          />
                        </CardActions>
                      </Card>
                    ))}
                  </Box>
                )
              ) : (
                // Modo Novo: Mostra contatos temporários
                contatosTemporarios.length === 0 ? (
                  <Alert severity="info">Nenhum contato adicionado. Clique em "Adicionar Contato" para começar.</Alert>
                ) : (
                  <List>
                    {contatosTemporarios.map((contato, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                        <CardContent className="pb-2">
                          <Box className="flex items-start justify-between">
                            <Box className="flex-grow">
                              <Typography variant="subtitle2" className="font-bold">
                                {contato.nome}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {contato.cargo}
                              </Typography>
                              <Typography variant="body2" className="mt-1">
                                {contato.telefone && `Tel: ${contato.telefone}`}
                                {contato.celular && ` | Zap: ${contato.celular}`}
                              </Typography>
                            </Box>
                            <Box>
                              <ActionEdit
                                onClick={() => handleOpenContatoDialog(contato, index)}
                                title="Editar"
                              />
                              <ActionDelete
                                onClick={() => handleOpenContatoTempDeleteDialog(index)}
                                title="Remover"
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </List>
                )
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir a administradora <strong>{selectedAdministradora?.nome}</strong>?
          </Typography>
        }
      />

      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes da {selectedAdministradora?.tipo === 'sindico_profissional' ? 'Gestão' : 'Administradora'}</DialogTitle>
        <DialogContent>
          {selectedAdministradora && (
            <Box className="space-y-4 mt-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Tipo de Gestão:</Typography>
                <Chip
                  label={selectedAdministradora.tipo === 'sindico_profissional' ? 'Síndico Profissional' : 'Administradora'}
                  color={selectedAdministradora.tipo === 'sindico_profissional' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Nome:</Typography>
                <Typography>{selectedAdministradora.nome}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Endereço Completo:</Typography>
                <Typography>
                  {selectedAdministradora.endereco}, {selectedAdministradora.numero}
                  {selectedAdministradora.complemento && ` - ${selectedAdministradora.complemento}`}
                </Typography>
                <Typography>
                  {selectedAdministradora.bairro} - {selectedAdministradora.cidade}/{selectedAdministradora.uf}
                </Typography>
                <Typography>CEP: {selectedAdministradora.cep || 'Não informado'}</Typography>
              </Box>

              {selectedAdministradora.site && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Site:</Typography>
                  <Typography>
                    <a href={selectedAdministradora.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedAdministradora.site}
                    </a>
                  </Typography>
                </Box>
              )}

              {selectedAdministradora.email && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">E-mail Corporativo:</Typography>
                  <Typography>
                    <a href={`mailto:${selectedAdministradora.email}`} className="text-blue-600 hover:underline">
                      {selectedAdministradora.email}
                    </a>
                  </Typography>
                </Box>
              )}

              {selectedAdministradora.observacao && (
                <Box>
                  <Typography variant="subtitle2" className="font-bold text-gray-600">Observação:</Typography>
                  <Typography className="whitespace-pre-wrap">{selectedAdministradora.observacao}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" className="font-bold text-gray-600">Status:</Typography>
                <Chip
                  label={selectedAdministradora.status}
                  color={selectedAdministradora.status === 'ativa' ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Seção de Contatos */}
              <Box>
                <Typography variant="h6" className="font-bold mb-3">
                  <Person className="mr-2" style={{ verticalAlign: 'middle' }} />
                  Contatos
                </Typography>

                {loadingContatos ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress size={30} />
                  </Box>
                ) : contatos.length === 0 ? (
                  <Alert severity="info">Nenhum contato cadastrado</Alert>
                ) : (
                  <Box className="space-y-2">
                    {contatos.map((contato) => (
                      <Card key={contato.id} variant="outlined">
                        <CardContent className="pb-2">
                          <Box className="flex items-start justify-between">
                            <Box className="flex-grow">
                              <Typography variant="subtitle1" className="font-bold">
                                {contato.nome}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" className="mb-2">
                                <strong>Função:</strong> {contato.cargo}
                              </Typography>

                              <Box className="mt-2 space-y-1">
                                {contato.telefone && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>Telefone:</strong> {contato.telefone}
                                    {contato.ramal && ` - Ramal: ${contato.ramal}`}
                                  </Typography>
                                )}
                                {contato.celular && (
                                  <Typography variant="body2">
                                    <Phone style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>WhatsApp:</strong> {contato.celular}
                                  </Typography>
                                )}
                                {contato.email && (
                                  <Typography variant="body2">
                                    <Email style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                                    <strong>E-mail:</strong> {contato.email}
                                  </Typography>
                                )}
                                {!contato.telefone && !contato.celular && !contato.email && (
                                  <Typography variant="body2" color="textSecondary">
                                    Nenhum contato informado
                                  </Typography>
                                )}
                              </Box>

                              {contato.observacao && (
                                <Typography variant="body2" className="mt-2 text-gray-600">
                                  <strong>Observação:</strong> {contato.observacao}
                                </Typography>
                              )}
                            </Box>
                            <Box className="flex items-center gap-1">
                              <StatusChip status={contato.ativo ? 'ativo' : 'inativo'} />
                              {contato.principal && (
                                <Chip
                                  icon={<Star style={{ fontSize: 16 }} />}
                                  label="Principal"
                                  color="primary"
                                  size="small"
                                  className="ml-2"
                                />
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cadastro/Edição de Contato (para contatos temporários) */}
      <Dialog open={openContatoDialog} onClose={handleCloseContatoDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingContato ? 'Editar Contato' : 'Novo Contato'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Contato"
                value={contatoFormData.nome}
                onChange={(e) => handleContatoInputChange('nome', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid size={{ xs: 12 }} container alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={contatoFormData.principal}
                    onChange={(e) => handleContatoInputChange('principal', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" style={{ marginRight: 8 }}>
                      Contato Principal
                    </Typography>
                    {contatoFormData.principal && <Star color="primary" fontSize="small" />}
                  </Box>
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Cargo"
                value={contatoFormData.cargo}
                onChange={(e) => handleContatoInputChange('cargo', e.target.value.toUpperCase())}
                placeholder="Ex: Gerente Comercial"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Ramal"
                value={contatoFormData.ramal}
                onChange={(e) => handleContatoInputChange('ramal', e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Telefone"
                value={contatoFormData.telefone}
                onChange={(e) => handleContatoInputChange('telefone', maskPhone(e.target.value))}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="WhatsApp"
                value={contatoFormData.celular}
                onChange={(e) => handleContatoInputChange('celular', maskPhone(e.target.value))}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="E-mail"
                type="email"
                value={contatoFormData.email}
                onChange={(e) => handleContatoInputChange('email', e.target.value.toLowerCase())}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Observação"
                multiline
                rows={2}
                value={contatoFormData.observacao}
                onChange={(e) => handleContatoInputChange('observacao', e.target.value.toUpperCase())}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={contatoFormData.ativo}
                    onChange={(e) => handleContatoInputChange('ativo', e.target.checked)}
                  />
                }
                label="Contato Ativo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContatoDialog}>Cancelar</Button>
          <Button onClick={isEditing ? handleSaveContato : handleAddContatoTemporario} variant="contained">
            {isEditingContato ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Contato */}
      <ConfirmDialog
        open={openContatoDeleteDialog}
        onClose={handleCloseContatoDeleteDialog}
        onConfirm={handleDeleteContato}
        title="Confirmar Exclusão"
        message={
          <Typography component="span">
            Tem certeza que deseja excluir o contato <strong>{selectedContato?.nome}</strong>?
          </Typography>
        }
      />

      <ConfirmDialog
        open={openContatoTempDeleteDialog}
        onClose={handleCloseContatoTempDeleteDialog}
        onConfirm={handleRemoveContatoTemporario}
        title="Confirmar Remoção"
        message={
          <Typography component="span">
            Tem certeza que deseja remover este contato da lista?
          </Typography>
        }
      />

      {/* Dialog de Relatório */}
      <Dialog
        open={openRelatorioDialog}
        onClose={() => setOpenRelatorioDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={900}>
              Relatório de Administradoras
            </Typography>
            <IconButton onClick={() => setOpenRelatorioDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Filtro */}
          <Box sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por Status</InputLabel>
              <Select
                value={relatorioFiltro}
                label="Filtrar por Status"
                onChange={(e) => setRelatorioFiltro(e.target.value as 'todas' | 'ativas' | 'inativas')}
                startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="todas">Todas</MenuItem>
                <MenuItem value="ativas">Apenas Ativas</MenuItem>
                <MenuItem value="inativas">Apenas Inativas</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loadingRelatorio ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box id="relatorio-administradoras">
              {/* Cabeçalho do Relatório */}
              <div className="header">
                <h1>Relatório de Administradoras</h1>
                <p>
                  Gerado em: {new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p>
                  Filtro: {relatorioFiltro === 'todas' ? 'Todas as Administradoras' :
                    relatorioFiltro === 'ativas' ? 'Apenas Ativas' : 'Apenas Inativas'}
                </p>
              </div>

              {/* Cards das Administradoras */}
              {administradoras
                .filter(adm => {
                  if (relatorioFiltro === 'todas') return true;
                  return adm.status === relatorioFiltro.slice(0, -1) as 'ativa' | 'inativa';
                })
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((administradora) => (
                  <div key={administradora.id} className="card">
                    {/* Cabeçalho do Card */}
                    <div className="card-header">
                      <h2>{administradora.nome}</h2>
                      <div className="tipo">
                        {administradora.tipo === 'administradora'
                          ? 'Administradora'
                          : 'Síndico Profissional'}
                      </div>
                    </div>

                    {/* Informações da Administradora */}
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">Endereço</div>
                        <div className="info-value">
                          {administradora.endereco}, {administradora.numero}
                          {administradora.complemento && ` - ${administradora.complemento}`}
                          <br />
                          {administradora.bairro} - {administradora.cidade}/{administradora.uf}
                          <br />
                          CEP: {administradora.cep}
                        </div>
                      </div>

                      {administradora.site && (
                        <div className="info-item">
                          <div className="info-label">Site</div>
                          <div className="info-value">{administradora.site}</div>
                        </div>
                      )}

                      {administradora.email && (
                        <div className="info-item">
                          <div className="info-label">E-mail</div>
                          <div className="info-value">{administradora.email}</div>
                        </div>
                      )}

                      <div className="info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                          {administradora.status === 'ativa' ? '✓ Ativa' : '✗ Inativa'}
                        </div>
                      </div>
                    </div>

                    {administradora.observacao && (
                      <div className="info-item">
                        <div className="info-label">Observações</div>
                        <div className="info-value">{administradora.observacao}</div>
                      </div>
                    )}

                    {/* Divisor */}
                    <hr className="divider" />

                    {/* Contatos */}
                    <div className="contatos-title">📞 Contatos</div>

                    {contatosPorAdministradora[administradora.id]?.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Cargo</th>
                            <th>Telefone</th>
                            <th>Celular</th>
                            <th>E-mail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contatosPorAdministradora[administradora.id].map((contato) => (
                            <tr key={contato.id}>
                              <td>
                                {contato.nome}
                                {contato.principal && ' ⭐'}
                              </td>
                              <td>{contato.cargo}</td>
                              <td>{contato.telefone}</td>
                              <td>{contato.celular}</td>
                              <td>{contato.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-contatos">
                        Nenhum contato cadastrado
                      </div>
                    )}
                  </div>
                ))}

              {/* Rodapé do Relatório */}
              <div className="footer">
                <p>
                  <strong>Total de Administradoras:</strong>{' '}
                  {administradoras.filter(adm => {
                    if (relatorioFiltro === 'todas') return true;
                    return adm.status === relatorioFiltro.slice(0, -1) as 'ativa' | 'inativa';
                  }).length}
                </p>
                <p>Sistema de Gestão - SisGu</p>
              </div>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenRelatorioDialog(false)}>
            Fechar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Print />}
            onClick={handlePrintRelatorio}
            disabled={loadingRelatorio}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}
