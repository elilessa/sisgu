import React from 'react';

import { useState, useEffect, useRef } from 'react';
import { customColors } from '../theme';
import {
  Box,
  Grid,
  Divider,
  Avatar,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs, doc, setDoc, getDoc, Timestamp, addDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ActionView, ActionEdit, ActionHistory, ActionDelete } from '../components/TableActions';

interface Produto {
  id: string;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
  sku: string;
  fotoUrl: string;
}

interface Remessa {
  precoUnitario: number;
  quantidade?: number;
}

interface Precificacao {
  id: string;
  produtoId: string;
  sku: string;
  tipoNome: string;
  descricaoNome: string;
  especificacaoNome: string;
  fabricanteNome: string;
  fotoUrl: string;

  // Cálculos automáticos
  custoBase: number;
  quantidadeEmEstoque: number;

  // Campos editáveis
  custosIndiretos: number; // %
  metodoPrecificacao: 'margem' | 'markup';
  margemLucro: number; // %
  markup: number; // %
  imposto: number; // %
  frete: number; // R$

  // Resultados calculados
  precoBase: number;
  valorComImpostoFrete: number;
  valorTotal: number;
  lucroEstimado: number;
  margemLucroFinal: number; // %

  atualizadoEm: Timestamp;
}

interface HistoricoPrecificacao {
  id: string;
  produtoId: string;

  // Valores anteriores
  custoBaseAnterior: number;
  valorTotalAnterior: number;

  // Valores novos
  custoBaseNovo: number;
  valorTotalNovo: number;

  // Análise da mudança
  diferencaValor: number;
  percentualAumento: number;

  // Parâmetros utilizados
  custosIndiretos: number;
  metodoPrecificacao: 'margem' | 'markup';
  margemLucro: number;
  markup: number;
  imposto: number;
  frete: number;

  // Resultados calculados
  precoBase: number;
  lucroEstimado: number;
  margemLucroFinal: number;

  // Rastreamento
  motivo: string;
  tipoAlteracao: 'remessa' | 'edicao_manual';

  // Auditoria
  criadoEm: Timestamp;
}

export function Precificacao() {
  const { userData } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [precificacoes, setPrecificacoes] = useState<Precificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedPrecificacao, setSelectedPrecificacao] = useState<Precificacao | null>(null);
  const [historico, setHistorico] = useState<HistoricoPrecificacao[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lock para evitar múltiplas chamadas concorrentes a loadPrecificacoes
  const isLoadingPrecificacoes = useRef(false);

  const [formData, setFormData] = useState({
    custosIndiretos: 0,
    metodoPrecificacao: 'margem' as 'margem' | 'markup',
    margemLucro: 0,
    markup: 0,
    imposto: 0,
    frete: 0,
  });

  useEffect(() => {
    if (userData?.empresaId) {
      loadProdutos();
    }
  }, [userData]);

  const loadProdutos = async () => {
    if (!userData?.empresaId || isLoadingPrecificacoes.current) return;

    try {
      setLoading(true);
      const produtosRef = collection(db, 'EMPRESAS', userData.empresaId, 'produtos');
      const snapshot = await getDocs(produtosRef);

      const produtosList: Produto[] = [];
      snapshot.forEach((docSnap) => {
        produtosList.push({ id: docSnap.id, ...docSnap.data() } as Produto);
      });

      setProdutos(produtosList);
      await loadPrecificacoes(produtosList);
    } catch (err: any) {
      setError('Erro ao carregar produtos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPrecificacoes = async (produtosList: Produto[]) => {
    if (!userData?.empresaId) return;

    // Evitar múltiplas chamadas concorrentes
    if (isLoadingPrecificacoes.current) return;
    isLoadingPrecificacoes.current = true;

    try {
      const precificacoesList: Precificacao[] = [];

      for (const produto of produtosList) {
        // Buscar precificação existente
        const precificacaoRef = doc(db, 'EMPRESAS', userData.empresaId, 'precificacao', produto.id);
        const precificacaoDoc = await getDoc(precificacaoRef);

        // Buscar estoque e remessas para calcular o maior preço
        const estoqueRef = doc(db, 'EMPRESAS', userData.empresaId, 'estoque', produto.id);
        const estoqueDoc = await getDoc(estoqueRef);

        let maiorPreco = 0;
        let quantidadeTotal = 0;

        if (estoqueDoc.exists()) {
          const remessasRef = collection(db, 'EMPRESAS', userData.empresaId, 'estoque', produto.id, 'remessas');
          const remessasSnapshot = await getDocs(remessasRef);

          remessasSnapshot.forEach((remessaDoc) => {
            const remessa = remessaDoc.data() as Remessa;
            if (remessa.precoUnitario > maiorPreco) {
              maiorPreco = remessa.precoUnitario;
            }
            quantidadeTotal += remessa.quantidade || 0;
          });
        }

        if (precificacaoDoc.exists()) {
          const data = precificacaoDoc.data();

          // Precificação anterior (antes de atualizar o custo base)
          const precificacaoAnterior = {
            id: produto.id,
            produtoId: produto.id,
            sku: produto.sku,
            tipoNome: produto.tipoNome,
            descricaoNome: produto.descricaoNome,
            especificacaoNome: produto.especificacaoNome,
            fabricanteNome: produto.fabricanteNome,
            fotoUrl: produto.fotoUrl,
            custoBase: data.custoBase || 0,
            quantidadeEmEstoque: quantidadeTotal,
            custosIndiretos: data.custosIndiretos || 0,
            metodoPrecificacao: data.metodoPrecificacao || 'margem',
            margemLucro: data.margemLucro || 0,
            markup: data.markup || 0,
            imposto: data.imposto || 0,
            frete: data.frete || 0,
            precoBase: 0,
            valorComImpostoFrete: 0,
            valorTotal: 0,
            lucroEstimado: 0,
            margemLucroFinal: 0,
            atualizadoEm: data.atualizadoEm,
          };
          const calculatedAnterior = calcularPrecificacao(precificacaoAnterior);

          // Nova precificação (com o novo custo base)
          const precificacao = {
            ...precificacaoAnterior,
            custoBase: maiorPreco,
          };
          const calculated = calcularPrecificacao(precificacao);

          // Se o custo base mudou e o valor total aumentou, criar histórico
          // Verificar se já não foi criado histórico para este custo base
          const ultimoHistoricoCriado = data.ultimoCustoBaseHistorico || 0;

          console.log(`Produto ${produto.sku}:`, {
            maiorPreco,
            custoBaseAtual: data.custoBase || 0,
            valorTotalNovo: calculated.valorTotal,
            valorTotalAnterior: calculatedAnterior.valorTotal,
            ultimoHistoricoCriado
          });

          // Verificar se realmente houve mudança significativa
          const houveMudancaCusto = maiorPreco > (data.custoBase || 0);
          const houveAumentoValor = calculated.valorTotal > calculatedAnterior.valorTotal;
          const jaCriouHistorico = maiorPreco === ultimoHistoricoCriado;

          if (houveMudancaCusto && houveAumentoValor && !jaCriouHistorico) {
            console.log(`✅ Criando histórico para ${produto.sku} - Aumento de R$ ${calculatedAnterior.valorTotal.toFixed(2)} para R$ ${calculated.valorTotal.toFixed(2)}`);

            await criarHistorico(
              calculatedAnterior,
              calculated,
              'Nova remessa com preço maior detectada',
              'remessa'
            );

            // Atualizar o custo base no Firestore e marcar que já criou histórico
            await setDoc(precificacaoRef, {
              ...data,
              custoBase: maiorPreco,
              ultimoCustoBaseHistorico: maiorPreco,
              atualizadoEm: Timestamp.now(),
            }, { merge: true });
          } else {
            // Apenas atualizar custo base se mudou, mas sem criar histórico
            if (houveMudancaCusto) {
              console.log(`⏭️ Pulando criação de histórico para ${produto.sku} - Já foi criado para este valor`);
              await setDoc(precificacaoRef, {
                ...data,
                custoBase: maiorPreco,
                atualizadoEm: Timestamp.now(),
              }, { merge: true });
            }
          }

          precificacoesList.push(calculated);
        } else {
          // Criar precificação padrão
          const precificacao: Precificacao = {
            id: produto.id,
            produtoId: produto.id,
            sku: produto.sku,
            tipoNome: produto.tipoNome,
            descricaoNome: produto.descricaoNome,
            especificacaoNome: produto.especificacaoNome,
            fabricanteNome: produto.fabricanteNome,
            fotoUrl: produto.fotoUrl,
            custoBase: maiorPreco,
            quantidadeEmEstoque: quantidadeTotal,
            custosIndiretos: 0,
            metodoPrecificacao: 'margem',
            margemLucro: 0,
            markup: 0,
            imposto: 0,
            frete: 0,
            precoBase: 0,
            valorComImpostoFrete: 0,
            valorTotal: 0,
            lucroEstimado: 0,
            margemLucroFinal: 0,
            atualizadoEm: Timestamp.now(),
          };

          const calculated = calcularPrecificacao(precificacao);
          precificacoesList.push(calculated);
        }
      }

      setPrecificacoes(precificacoesList);
    } catch (err: any) {
      setError('Erro ao carregar precificações: ' + err.message);
    } finally {
      isLoadingPrecificacoes.current = false;
    }
  };

  const calcularPrecificacao = (prec: Precificacao): Precificacao => {
    const custoComIndiretos = prec.custoBase * (1 + prec.custosIndiretos / 100);

    let precoBase = 0;
    if (prec.metodoPrecificacao === 'margem') {
      // Margem de Lucro: Preço = Custo / (1 - Margem/100)
      precoBase = custoComIndiretos / (1 - prec.margemLucro / 100);
    } else {
      // Markup: Preço = Custo * (1 + Markup/100)
      precoBase = custoComIndiretos * (1 + prec.markup / 100);
    }

    const valorComImpostoFrete = precoBase * (1 + prec.imposto / 100) + prec.frete;
    const valorTotal = valorComImpostoFrete;
    const lucroEstimado = valorTotal - prec.custoBase - prec.frete;
    const margemLucroFinal = prec.custoBase > 0 ? (lucroEstimado / valorTotal) * 100 : 0;

    return {
      ...prec,
      precoBase,
      valorComImpostoFrete,
      valorTotal,
      lucroEstimado,
      margemLucroFinal,
    };
  };

  const handleOpenDialog = (precificacao: Precificacao) => {
    setSelectedPrecificacao(precificacao);
    setFormData({
      custosIndiretos: precificacao.custosIndiretos,
      metodoPrecificacao: precificacao.metodoPrecificacao,
      margemLucro: precificacao.margemLucro,
      markup: precificacao.markup,
      imposto: precificacao.imposto,
      frete: precificacao.frete,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPrecificacao(null);
    setFormData({
      custosIndiretos: 0,
      metodoPrecificacao: 'margem',
      margemLucro: 0,
      markup: 0,
      imposto: 0,
      frete: 0,
    });
  };

  const handleOpenViewDialog = (precificacao: Precificacao) => {
    setSelectedPrecificacao(precificacao);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedPrecificacao(null);
  };

  const handleOpenHistoryDialog = async (precificacao: Precificacao) => {
    setSelectedPrecificacao(precificacao);
    setOpenHistoryDialog(true);
    await loadHistorico(precificacao.id);
  };

  const handleCloseHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setSelectedPrecificacao(null);
    setHistorico([]);
  };

  const loadHistorico = async (produtoId: string) => {
    if (!userData?.empresaId) return;

    try {
      setLoadingHistory(true);
      const historicoRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'precificacao',
        produtoId,
        'historico'
      );

      const q = query(historicoRef, orderBy('criadoEm', 'desc'), limit(50));
      const snapshot = await getDocs(q);

      const historicoList: HistoricoPrecificacao[] = [];
      snapshot.forEach((docSnap) => {
        historicoList.push({ id: docSnap.id, ...docSnap.data() } as HistoricoPrecificacao);
      });

      setHistorico(historicoList);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistorico = async (historicoId: string) => {
    if (!userData?.empresaId || !selectedPrecificacao) return;

    if (!window.confirm('Deseja realmente excluir este registro do histórico?')) {
      return;
    }

    try {
      const historicoDocRef = doc(
        db,
        'EMPRESAS',
        userData.empresaId,
        'precificacao',
        selectedPrecificacao.id,
        'historico',
        historicoId
      );

      await deleteDoc(historicoDocRef);

      setSuccess('Registro do histórico excluído com sucesso!');
      await loadHistorico(selectedPrecificacao.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir registro: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const criarHistorico = async (
    precificacaoAnterior: Precificacao,
    precificacaoNova: Precificacao,
    motivo: string,
    tipoAlteracao: 'remessa' | 'edicao_manual'
  ) => {
    if (!userData?.empresaId) return;

    try {
      // Só criar histórico se o valor total aumentou
      if (precificacaoNova.valorTotal <= precificacaoAnterior.valorTotal) {
        console.log(`⏭️ Histórico não criado - Valor não aumentou`);
        return;
      }

      const historicoRef = collection(
        db,
        'EMPRESAS',
        userData.empresaId,
        'precificacao',
        precificacaoAnterior.id,
        'historico'
      );

      // Verificar se já existe histórico recente com os mesmos valores (últimos 5 registros)
      const q = query(historicoRef, orderBy('criadoEm', 'desc'), limit(5));
      const ultimosHistoricos = await getDocs(q);

      // Procurar duplicata exata nos últimos registros
      for (const doc of ultimosHistoricos.docs) {
        const ultimo = doc.data() as HistoricoPrecificacao;
        // Comparar custo base novo E valor total novo para evitar duplicatas
        if (ultimo.custoBaseNovo === precificacaoNova.custoBase &&
          Math.abs(ultimo.valorTotalNovo - precificacaoNova.valorTotal) < 0.01) {
          console.log(`⏭️ Histórico duplicado evitado - Já existe com custo base ${precificacaoNova.custoBase} e valor ${precificacaoNova.valorTotal}`);
          return;
        }
      }

      const diferencaValor = precificacaoNova.valorTotal - precificacaoAnterior.valorTotal;
      const percentualAumento = (diferencaValor / precificacaoAnterior.valorTotal) * 100;

      const historicoData: Omit<HistoricoPrecificacao, 'id'> = {
        produtoId: precificacaoAnterior.produtoId,
        custoBaseAnterior: precificacaoAnterior.custoBase,
        valorTotalAnterior: precificacaoAnterior.valorTotal,
        custoBaseNovo: precificacaoNova.custoBase,
        valorTotalNovo: precificacaoNova.valorTotal,
        diferencaValor,
        percentualAumento,
        custosIndiretos: precificacaoNova.custosIndiretos,
        metodoPrecificacao: precificacaoNova.metodoPrecificacao,
        margemLucro: precificacaoNova.margemLucro,
        markup: precificacaoNova.markup,
        imposto: precificacaoNova.imposto,
        frete: precificacaoNova.frete,
        precoBase: precificacaoNova.precoBase,
        lucroEstimado: precificacaoNova.lucroEstimado,
        margemLucroFinal: precificacaoNova.margemLucroFinal,
        motivo,
        tipoAlteracao,
        criadoEm: Timestamp.now(),
      };

      await addDoc(historicoRef, historicoData);
      console.log(`✅ Histórico criado com sucesso para custo base ${precificacaoNova.custoBase}`);
    } catch (err: any) {
      console.error('Erro ao criar histórico:', err);
    }
  };

  const handleSave = async () => {
    if (!userData?.empresaId || !selectedPrecificacao) return;

    try {
      const precificacaoRef = doc(db, 'EMPRESAS', userData.empresaId, 'precificacao', selectedPrecificacao.id);

      // Calcular nova precificação
      const novaPrecificacao = calcularPrecificacao({
        ...selectedPrecificacao,
        ...formData,
      });

      const dataToSave = {
        produtoId: selectedPrecificacao.produtoId,
        sku: selectedPrecificacao.sku,
        tipoNome: selectedPrecificacao.tipoNome,
        descricaoNome: selectedPrecificacao.descricaoNome,
        especificacaoNome: selectedPrecificacao.especificacaoNome,
        fabricanteNome: selectedPrecificacao.fabricanteNome,
        fotoUrl: selectedPrecificacao.fotoUrl,
        custosIndiretos: formData.custosIndiretos,
        metodoPrecificacao: formData.metodoPrecificacao,
        margemLucro: formData.margemLucro,
        markup: formData.markup,
        imposto: formData.imposto,
        frete: formData.frete,
        atualizadoEm: Timestamp.now(),
      };

      await setDoc(precificacaoRef, dataToSave);

      // Criar histórico se o valor aumentou
      await criarHistorico(
        selectedPrecificacao,
        novaPrecificacao,
        'Edição manual dos parâmetros de precificação',
        'edicao_manual'
      );

      setSuccess('Precificação atualizada com sucesso!');
      handleCloseDialog();
      loadProdutos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erro ao salvar precificação: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <Box className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-6">
      <Typography variant="h4" className="mb-6 font-bold text-gray-800">
        Precificação de Produtos
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

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: customColors.tableHeader }}>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Descrição</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Especificação</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Custo Base</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Valor Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Margem %</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Estoque</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 0.5 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {precificacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            ) : (
              precificacoes.map((prec) => (
                <TableRow key={prec.id} hover>
                  <TableCell sx={{ py: 0.25 }}>{prec.sku || '-'}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{prec.tipoNome}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{prec.descricaoNome}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{prec.especificacaoNome || '-'}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>R$ {prec.custoBase.toFixed(2)}</TableCell>
                  <TableCell sx={{ py: 0.25 }}>
                    <Chip
                      label={`R$ ${prec.valorTotal.toFixed(2)}`}
                      sx={{ bgcolor: '#2e7d32', color: 'white', fontWeight: 'bold' }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.25 }}>{prec.margemLucroFinal.toFixed(1)}%</TableCell>
                  <TableCell sx={{ py: 0.25 }}>{prec.quantidadeEmEstoque}</TableCell>
                  <TableCell align="center" sx={{ py: 0.25 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <ActionView title="Visualizar" onClick={() => handleOpenViewDialog(prec)} />
                      <ActionEdit title="Editar" onClick={() => handleOpenDialog(prec)} />
                      <ActionHistory title="Histórico" onClick={() => handleOpenHistoryDialog(prec)} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box>
            <Typography variant="h6">
              Precificação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedPrecificacao?.descricaoNome}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* CUSTO BASE */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Custo Base
              </Typography>

              <TextField
                fullWidth
                label="Maior preço da remessa"
                value={`R$ ${selectedPrecificacao?.custoBase.toFixed(2) || '0.00'}`}
                disabled
                variant="filled"
              />
            </Paper>

            {/* PARÂMETROS */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Parâmetros de Precificação
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="Custos indiretos (%)"
                    fullWidth
                    value={formData.custosIndiretos}
                    onChange={(e) =>
                      handleInputChange('custosIndiretos', parseFloat(e.target.value) || 0)
                    }
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Método de precificação"
                    fullWidth
                    value={formData.metodoPrecificacao}
                    onChange={(e) =>
                      handleInputChange('metodoPrecificacao', e.target.value)
                    }
                  >
                    <MenuItem value="margem">Margem de lucro</MenuItem>
                    <MenuItem value="markup">Markup</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  {formData.metodoPrecificacao === 'margem' ? (
                    <TextField
                      type="number"
                      label="Margem de lucro (%)"
                      fullWidth
                      value={formData.margemLucro}
                      onChange={(e) =>
                        handleInputChange('margemLucro', parseFloat(e.target.value) || 0)
                      }
                      inputProps={{ step: 0.01, min: 0, max: 100 }}
                    />
                  ) : (
                    <TextField
                      type="number"
                      label="Markup (%)"
                      fullWidth
                      value={formData.markup}
                      onChange={(e) =>
                        handleInputChange('markup', parseFloat(e.target.value) || 0)
                      }
                      inputProps={{ step: 0.01, min: 0 }}
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="Imposto (%)"
                    fullWidth
                    value={formData.imposto}
                    onChange={(e) =>
                      handleInputChange('imposto', parseFloat(e.target.value) || 0)
                    }
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="Frete (R$)"
                    fullWidth
                    value={formData.frete}
                    onChange={(e) =>
                      handleInputChange('frete', parseFloat(e.target.value) || 0)
                    }
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* RESULTADO */}
            {selectedPrecificacao && (() => {
              const preview = calcularPrecificacao({
                ...selectedPrecificacao,
                ...formData,
              });

              return (
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Resultado da Precificação
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">Preço base</Typography>
                      <Typography fontWeight="bold">
                        R$ {preview.precoBase.toFixed(2)}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">
                        Imposto + frete
                      </Typography>
                      <Typography fontWeight="bold">
                        R$ {preview.valorComImpostoFrete.toFixed(2)}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">Lucro estimado</Typography>
                      <Typography fontWeight="bold">
                        R$ {preview.lucroEstimado.toFixed(2)}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">
                        Margem final
                      </Typography>
                      <Typography fontWeight="bold">
                        {preview.margemLucroFinal.toFixed(2)}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          bgcolor: 'success.dark',
                          borderRadius: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="body2">
                          Valor total
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          R$ {preview.valorTotal.toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })()}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>


      {/* Dialog de Visualização */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes da Precificação</DialogTitle>
        <DialogContent>
          {selectedPrecificacao && (
            <Box className="mt-4 space-y-3">
              <Box>
                <Typography variant="caption" className="text-gray-600">SKU</Typography>
                <Typography variant="body1">{selectedPrecificacao.sku || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Produto</Typography>
                <Typography variant="body1">
                  {selectedPrecificacao.tipoNome} - {selectedPrecificacao.descricaoNome}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Custo Base</Typography>
                <Typography variant="body1">R$ {selectedPrecificacao.custoBase.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Custos Indiretos</Typography>
                <Typography variant="body1">{selectedPrecificacao.custosIndiretos}%</Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Método</Typography>
                <Typography variant="body1">
                  {selectedPrecificacao.metodoPrecificacao === 'margem' ? 'Margem de Lucro' : 'Markup'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Imposto</Typography>
                <Typography variant="body1">{selectedPrecificacao.imposto}%</Typography>
              </Box>
              <Box>
                <Typography variant="caption" className="text-gray-600">Frete</Typography>
                <Typography variant="body1">R$ {selectedPrecificacao.frete.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ borderTop: '2px solid #e0e0e0', pt: 2, mt: 2 }}>
                <Typography variant="h6" className="mb-2">Resultado</Typography>
                <Box className="space-y-1">
                  <Typography>Preço Base: R$ {selectedPrecificacao.precoBase.toFixed(2)}</Typography>
                  <Typography>Valor Total: R$ {selectedPrecificacao.valorTotal.toFixed(2)}</Typography>
                  <Typography>Lucro Estimado: R$ {selectedPrecificacao.lucroEstimado.toFixed(2)}</Typography>
                  <Typography>Margem: {selectedPrecificacao.margemLucroFinal.toFixed(2)}%</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={openHistoryDialog} onClose={handleCloseHistoryDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box>
            <Typography variant="h6">Histórico de Precificação</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedPrecificacao?.descricaoNome}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box className="flex items-center justify-center p-8">
              <CircularProgress />
            </Box>
          ) : historico.length === 0 ? (
            <Box className="text-center p-8">
              <Typography color="text.secondary">
                Nenhum histórico de aumento de preço registrado
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Valor Anterior</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Novo Valor</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Diferença</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Motivo</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.map((hist) => (
                    <TableRow key={hist.id} hover>
                      <TableCell>
                        {hist.criadoEm.toDate().toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>R$ {hist.valorTotalAnterior.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={`R$ ${hist.valorTotalNovo.toFixed(2)}`}
                          size="small"
                          sx={{ bgcolor: '#4caf50', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`+R$ ${hist.diferencaValor.toFixed(2)} (+${hist.percentualAumento.toFixed(1)}%)`}
                          size="small"
                          sx={{ bgcolor: '#2196f3', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {hist.motivo}
                        </Typography>
                        <Chip
                          label={hist.tipoAlteracao === 'remessa' ? 'Nova Remessa' : 'Edição Manual'}
                          size="small"
                          sx={{ mt: 0.5, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <ActionDelete title="Excluir" onClick={() => handleDeleteHistorico(hist.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

