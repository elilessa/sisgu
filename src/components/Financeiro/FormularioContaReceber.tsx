import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    InputAdornment,
    Box,
    Typography,
    Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers'; // Assumindo existÊncia ou usando input date nativo por simplicidade inicial
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useFinanceiro } from '../../hooks/useFinanceiro';
import { ContaReceber, CreateContaReceberData } from '../../types/financeiro';

interface FormularioContaReceberProps {
    open: boolean;
    onClose: () => void;
    contaParaEditar?: ContaReceber;
    onSuccess: () => void;
}

const FORMAS_PAGAMENTO = [
    { value: 'boleto', label: 'Boleto Bancário' },
    { value: 'pix', label: 'PIX' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'outro', label: 'Outro' },
];

export const FormularioContaReceber: React.FC<FormularioContaReceberProps> = ({
    open,
    onClose,
    contaParaEditar,
    onSuccess
}) => {
    const { addContaReceber, updateContaReceber, loading } = useFinanceiro();
    const [formData, setFormData] = useState<any>({
        descricao: '',
        clienteId: '', // Idealmente seria um Autocomplete
        clienteNome: '',
        valorOriginal: 0,
        dataVencimento: new Date().toISOString().split('T')[0],
        dataEmissao: new Date().toISOString().split('T')[0],
        formaPagamento: 'boleto',
        planoContas: '',
        centroCusto: '',
        observacoes: ''
    });
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (contaParaEditar) {
            setFormData({
                ...contaParaEditar,
                // Garantir formatos de data para inputs
                dataVencimento: contaParaEditar.dataVencimento,
                dataEmissao: contaParaEditar.dataEmissao
            });
        } else {
            // Reset
            setFormData({
                descricao: '',
                clienteNome: '',
                valorOriginal: 0,
                dataVencimento: new Date().toISOString().split('T')[0],
                dataEmissao: new Date().toISOString().split('T')[0],
                formaPagamento: 'boleto',
                planoContas: 'Receitas de Vendas', // Default
                centroCusto: 'Comercial' // Default
            });
        }
    }, [contaParaEditar, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, valorOriginal: Number(e.target.value) }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro(null);

        // Validação básica
        if (!formData.descricao || !formData.clienteNome || !formData.valorOriginal) {
            setErro('Preencha os campos obrigatórios (Cliente, Descrição, Valor).');
            return;
        }

        if (formData.valorOriginal <= 0) {
            setErro('O valor deve ser maior que zero.');
            return;
        }

        try {
            const payload = {
                ...formData,
                valorAcrescimos: 0,
                valorDesconto: 0,
                // IDs falsos para protótipo, depois conectar com cadastro real
                clienteId: formData.clienteId || 'temp_id',
            } as any;

            if (contaParaEditar) {
                await updateContaReceber(contaParaEditar.id, payload);
            } else {
                await addContaReceber(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setErro('Erro ao salvar: ' + err.message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {contaParaEditar ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
                </DialogTitle>
                <DialogContent dividers>
                    {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

                    <Grid container spacing={2}>
                        {/* Linha 1: Cliente e Descrição */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Cliente"
                                name="clienteNome"
                                value={formData.clienteNome}
                                onChange={handleChange}
                                fullWidth
                                required
                                placeholder="Nome do cliente"
                                helperText="Digite o nome (Futuro: Busca automática)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Descrição / Motivo"
                                name="descricao"
                                value={formData.descricao}
                                onChange={handleChange}
                                fullWidth
                                required
                            />
                        </Grid>

                        {/* Linha 2: Valores e Datas */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Valor (R$)"
                                name="valorOriginal"
                                type="number"
                                value={formData.valorOriginal}
                                onChange={handleValorChange}
                                fullWidth
                                required
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Data de Emissão"
                                type="date"
                                name="dataEmissao"
                                value={formData.dataEmissao}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Data de Vencimento"
                                type="date"
                                name="dataVencimento"
                                value={formData.dataVencimento}
                                onChange={handleChange}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                                error={new Date(formData.dataVencimento!) < new Date(new Date().setHours(0, 0, 0, 0))}
                                helperText={new Date(formData.dataVencimento!) < new Date(new Date().setHours(0, 0, 0, 0)) ? "Atenção: Data retroativa" : ""}
                            />
                        </Grid>

                        {/* Linha 3: Classificação */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                label="Forma de Pagamento"
                                name="formaPagamento"
                                value={formData.formaPagamento}
                                onChange={handleChange}
                                fullWidth
                            >
                                {FORMAS_PAGAMENTO.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Plano de Contas"
                                name="planoContas"
                                value={formData.planoContas}
                                onChange={handleChange}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Centro de Custo"
                                name="centroCusto"
                                value={formData.centroCusto}
                                onChange={handleChange}
                                fullWidth
                                disabled // Calculado automaticamente na regra de negócio (mas aqui deixo visual)
                                helperText="Herdado do contexto (Ex: Comercial)"
                            />
                        </Grid>

                        {/* Linha 4: Observações */}
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Observações"
                                name="observacoes"
                                value={formData.observacoes}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Lançamento'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
