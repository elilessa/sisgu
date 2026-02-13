import { Timestamp } from 'firebase/firestore';

export interface Boleto {
    // Identificação
    id: string;
    numero: string; // BOL-AAMMNNNNN (ex: BOL-260100001)

    // Índices Temporais (para consultas rápidas)
    mesReferencia: string;    // "2026-01"
    anoReferencia: number;    // 2026
    mesNumero: number;        // 1
    dataVencimento: Timestamp;

    // Referências
    contratoId: string;
    contratoNumero: string;
    clienteId: string;
    clienteNome: string;
    clientePrefixo?: string;
    clienteCnpjCpf: string;
    clienteEmail: string;

    // Valores
    valor: number;
    dataPagamento?: Timestamp;

    // Status
    status: 'pendente' | 'enviado_banco' | 'pago' | 'atrasado' | 'cancelado';

    // Dados Bancários
    bancoId?: string;
    bancoNome?: string;

    // Controle de Envio (Futuro)
    enviadoBanco: boolean;
    dataEnvioBanco?: Timestamp;
    emailEnviado: boolean;
    dataEnvioEmail?: Timestamp;

    // Auditoria
    criadoEm: Timestamp;
    criadoPor: string;
    atualizadoEm: Timestamp;
    observacao?: string;
}
