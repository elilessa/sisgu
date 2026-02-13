
// src/services/emailService.ts
import { OrcamentoEquipamento } from '../pages/OrcamentosEquipamentos'; // Ajuste o import conforme necessário
import { gerarLayoutDocumentoHTML } from '../utils/printUtils';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:8080/api/send-orcamento' : '/api/send-orcamento';

interface SendEmailParams {
    to: string;
    subject?: string;
    orcamento: OrcamentoEquipamento;
    pdfBase64: string;
    clienteNome: string;
}

export const sendOrcamentoEmail = async (params: SendEmailParams) => {
    try {
        console.log("Iniciando envio para:", API_URL); // Log para debug

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: params.to,
                subject: params.subject,
                clienteNome: params.clienteNome,
                numeroOrcamento: params.orcamento.numero,
                valorTotal: params.orcamento.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                pdfBase64: params.pdfBase64,
                linkAprovacao: ''
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Erro ao enviar e-mail');
        }

        return data;
    } catch (error: any) {
        console.error('Erro no serviço de e-mail:', error);
        throw error;
    }
};
