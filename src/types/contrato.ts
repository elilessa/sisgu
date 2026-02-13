import { Timestamp } from 'firebase/firestore';
import { EquipamentoContrato } from './OrcamentoType';

export interface Contrato {
    id: string;
    numero: string; // CTR-2024-001
    data?: Timestamp; // Para compatibilidade legada

    // Referência ao Orçamento Original
    orcamentoId: string;
    orcamentoNumero: string;

    // Snapshot COMPLETO do Orçamento (duplicado)
    titulo: string;
    dataEmissao: Timestamp;
    dataValidade: Timestamp;
    tipoContrato: 'com_pecas' | 'sem_pecas' | 'comodato';

    // Snapshot do Cliente (duplicado do orçamento)
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
    prefixoNome?: string;

    // Snapshot do Vendedor (duplicado)
    vendedorId?: string;
    vendedorNome?: string;

    // Equipamentos (duplicado)
    equipamentosCobertos: EquipamentoContrato[];
    equipamentosNaoCobertos: EquipamentoContrato[];

    // Valores
    valorContrato: number;

    // Status do Contrato
    status: 'ativo' | 'suspenso' | 'cancelado' | 'encerrado';

    // Datas do Contrato
    dataInicio: Timestamp;
    dataFim?: Timestamp;

    // Dados Específicos do Contrato
    periodicidadePreventiva?: 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral';

    // Dados Financeiros
    diaBoleto?: number;
    bancoId?: string;
    bancoNome?: string;
    gerarAutomaticamente?: boolean;
    enviarParaBanco?: boolean;
    enviarContatoCliente?: boolean;
    enviarOutroLocal?: boolean;
    enviarPorEmail?: boolean;

    // Observações
    observacao?: string;

    // Snapshot do Contato
    nomeContato?: string;
    emailContato?: string;
    telefoneContato?: string;
    cargoContato?: string;
    contatoApto?: string;
    contatoEmail2?: string;
    contatoWhatsapp?: string;

    // Auditoria
    criadoEm: Timestamp;
    atualizadoEm: Timestamp;
    criadoPor?: string;
    aprovadoEm?: Timestamp;
    aprovadoPor?: string;
}
