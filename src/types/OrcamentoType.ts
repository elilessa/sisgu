import { Timestamp } from 'firebase/firestore';

export interface EquipamentoContrato {
    produtoId: string;
    equipamento: string;
    quantidade: number;
    tipoNome: string;
    descricaoNome: string;
    especificacaoNome: string;
    fabricanteNome: string;
}

export interface Orcamento {
    id: string;
    numero: string; // ORC-2024-001
    titulo: string;
    tipo?: 'equipamento' | 'contrato'; // Para compatibilidade com orçamentos de equipamentos
    data?: Timestamp; // Para compatibilidade legada

    // Datas
    dataEmissao: Timestamp;
    dataValidade: Timestamp;

    // Tipo
    tipoContrato: 'com_pecas' | 'sem_pecas' | 'comodato';

    // Snapshot do Cliente
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

    // Snapshot do Vendedor
    vendedorId?: string;
    vendedorNome?: string;

    // Equipamentos (Snapshot)
    equipamentosCobertos: EquipamentoContrato[];
    equipamentosNaoCobertos: EquipamentoContrato[];

    // Valores
    valorContrato: number;

    // Status do Orçamento
    status: 'em_elaboracao' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado';

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
}
