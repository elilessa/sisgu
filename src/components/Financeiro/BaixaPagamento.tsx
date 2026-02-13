import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    InputAdornment,
    Alert,
    Box,
    Divider
} from '@mui/material';
import { useFinanceiro } from '../../hooks/useFinanceiro';
import { ContaReceber } from '../../types/financeiro';

interface BaixaPagamentoProps {
    open: boolean;
    onClose: () => void;
    conta: ContaReceber | null;
    onSuccess: () => void;
}

export const BaixaPagamento: React.FC<BaixaPagamentoProps> = ({
    open,
    onClose,
    conta,
    onSuccess
}) => {
    const { baixarConta, loading } = useFinanceiro();

    // Estados locais do formulário de baixa
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [valorPago, setValorPago] = useState<number>(0);
    const [acrescimos, setAcrescimos] = useState<number>(0);
    const [desconto, setDesconto] = useState<number>(0);
    const [observacaoBaixa, setObservacaoBaixa] = useState('');

    useEffect(() => {
        if (conta) {
            setValorPago(conta.valorFinal); // Sugere o valor total
            setAcrescimos(0);
            setDesconto(0);
            setDataPagamento(new Date().toISOString().split('T')[0]);
        }
    }, [conta, open]);

    // Recalcula diferença automática quando usuário muda o valor total pago
    // Ou usuário preenche acréscimos/descontos e calculamos valor pago?
    // Abordagem escolhida: Usuário preenche tudo explicitamente para maior controle contábil.
    const valorLiquidoCalculado = (conta?.valorOriginal || 0) + acrescimos - desconto;

    const handleSubmit = async () => {
        if (!conta) return;

        // Validação
        if (valorPago <= 0) {
            alert("O valor pago deve ser maior que zero.");
            return;
        }

        // Verifica divergência
        if (Math.abs(valorPago - valorLiquidoCalculado) > 0.01) {
            if (!window.confirm(`O valor informado (R$ ${valorPago}) é diferente do calculado (R$ ${valorLiquidoCalculado}). Deseja prosseguir assim mesmo?`)) {
                return;
            }
        }

        try {
            await baixarConta(conta.id, {
                status: 'pago',
                valorPago: valorPago,
                dataPagamento: dataPagamento,
                valorAcrescimos: acrescimos,
                valorDesconto: desconto
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            alert('Erro ao baixar: ' + err.message);
        }
    };

    if (!conta) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Baixa de Título
                <Typography variant="body2" color="text.secondary">
                    {conta.descricao} - {conta.clienteNome}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Valor Original: <strong>{conta.valorOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><br />
                            Vencimento: {new Date(conta.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </Alert>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="Data do Pagamento"
                            type="date"
                            fullWidth
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="Valor Pago (Total)"
                            type="number"
                            fullWidth
                            value={valorPago}
                            onChange={(e) => setValorPago(Number(e.target.value))}
                            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                            sx={{ input: { fontWeight: 'bold', color: 'green' } }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1 }}>Detalhamento da Baixa</Divider>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label="Juros / Multa / Acréscimos"
                            type="number"
                            fullWidth
                            value={acrescimos}
                            onChange={(e) => setAcrescimos(Number(e.target.value))}
                            InputProps={{ startAdornment: <InputAdornment position="start">+</InputAdornment> }}
                            color="warning"
                        />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label="Descontos"
                            type="number"
                            fullWidth
                            value={desconto}
                            onChange={(e) => setDesconto(Number(e.target.value))}
                            InputProps={{ startAdornment: <InputAdornment position="start">-</InputAdornment> }}
                            color="success"
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                            * O Valor Liquido Calculado (Original + Extras - Descontos) é: <b>{valorLiquidoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
                        </Typography>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="success" disabled={loading}>
                    Confirmar Recebimento
                </Button>
            </DialogActions>
        </Dialog>
    );
};
