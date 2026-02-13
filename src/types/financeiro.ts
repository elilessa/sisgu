import { Timestamp } from 'firebase/firestore';

export type FormaPagamento =
    | 'boleto'
    | 'pix'
    | 'cartao_credito'
    | 'cartao_debito'
    | 'transferencia'
    | 'dinheiro'
    | 'outro';

export type StatusFinanceiro =
    | 'em_aberto'
    | 'pago'
    | 'vencido'
    | 'em_atraso'
    | 'cancelado';

export interface ContaReceber {
    id: string;
    empresaId: string;
    numero?: string;    // Número identificador (ex: Boleto)

    // Vínculos
    clienteId: string;
    clienteNome: string;
    clientePrefixo?: string;
    contratoId?: string;
    osId?: string;
    orcamentoId?: string;
    vendaId?: string;
    boletoId?: string;

    // Dados Financeiros
    descricao: string;
    valorOriginal: number;
    valorAcrescimos: number; // Juros/Multa
    valorDesconto: number;
    valorFinal: number;   // Calculado (Original + Acrescimos - Desconto)
    valorPago?: number;   // Preenchido na baixa

    dataVencimento: string; // ISO Date YYYY-MM-DD
    dataEmissao: string;    // ISO Date YYYY-MM-DD
    dataPagamento?: string; // ISO Date YYYY-MM-DD (Preenchido na baixa)

    formaPagamento: FormaPagamento;
    status: StatusFinanceiro;

    // Classificação
    // Classificação
    planoContaId?: string;
    planoContaNome?: string; // Cache
    centroCustoId?: string;
    centroCustoNome?: string; // Cache

    // Metadados
    numeroParcela?: number;
    totalParcelas?: number;
    observacoes?: string;

    criadoPor: string;
    criadoEm: Timestamp;
    atualizadoEm: Timestamp;
}

export interface ContaPagar {
    id: string;
    empresaId: string;
    numero?: string;    // Número identificador (ex: Nota Fiscal)

    // Vínculos
    fornecedorId: string;
    fornecedorNome: string;

    contratoId?: string; // Contrato de Despesa (se houver)
    osId?: string;       // OS de Terceiro (se houver)

    // Dados Financeiros
    descricao: string;
    valorOriginal: number;
    valorAcrescimos: number; // Juros/Multa
    valorDesconto: number;
    valorFinal: number;   // Calculado (Original + Acrescimos - Desconto)
    valorPago?: number;   // Preenchido na baixa

    dataVencimento: string; // ISO Date YYYY-MM-DD
    dataEmissao: string;    // ISO Date YYYY-MM-DD
    dataPagamento?: string; // ISO Date YYYY-MM-DD (Preenchido na baixa)

    formaPagamento: FormaPagamento;
    status: StatusFinanceiro;

    // Classificação
    planoContaId?: string;
    planoContaNome?: string; // Cache
    centroCustoId?: string;
    centroCustoNome?: string; // Cache

    // Metadados
    numeroParcela?: number;
    totalParcelas?: number;
    observacoes?: string;
    linkComprovante?: string; // URL

    criadoPor: string;
    criadoEm: Timestamp;
    atualizadoEm: Timestamp;
}

export type CreateContaPagarData = Omit<ContaPagar, 'id' | 'empresaId' | 'valorFinal' | 'status' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateContaPagarData = Partial<Omit<ContaPagar, 'id' | 'empresaId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>>;

// Interface para criação (omitindo campos gerados automaticamente)
export type CreateContaReceberData = Omit<ContaReceber, 'id' | 'empresaId' | 'valorFinal' | 'status' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;

// Interface para atualização
export type UpdateContaReceberData = Partial<Omit<ContaReceber, 'id' | 'empresaId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>>;

// ============================================================================
// MÓDULO CENTRO DE CUSTO
// ============================================================================

export type OrigemCentroCusto =
    | 'chamado'
    | 'os'
    | 'abastecimento'
    | 'beneficios'
    | 'contrato'
    | 'venda'
    | 'manual'
    | 'outros';

export interface CentroCustoGrupo {
    id: string;
    empresaId: string;
    nome: string;           // Ex: Contratos, Administrativo
    codigo: string;         // Ex: CC-CONTRATO, CC-ADM
    permiteReceita: boolean;
    permiteDespesa: boolean;
    descricao?: string;

    criadoPor?: string;
    criadoEm?: Timestamp | string;
    atualizadoEm?: Timestamp | string;
}

export interface CentroCusto {
    id: string;
    empresaId: string;
    grupoId: string;        // Vínculo com Grupo Pai

    // Dados Desnormalizados (Herdados do Grupo para performance em queries)
    grupoNome: string;
    grupoCodigo: string;
    permiteReceita: boolean;
    permiteDespesa: boolean;

    nome: string;           // Ex: Contrato Cliente X, Veículo ABC-1234
    codigo: string;         // Ex: CC-CONTRATO-001 (Gerado auto)

    origensPermitidas: OrigemCentroCusto[]; // Checkbox múltiplo
    ativo: boolean;

    criadoPor?: string;
    criadoEm?: Timestamp | string;
    atualizadoEm?: Timestamp | string;
}

export type CreateCentroCustoGrupo = Omit<CentroCustoGrupo, 'id' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;
export type CreateCentroCusto = Omit<CentroCusto, 'id' | 'grupoNome' | 'grupoCodigo' | 'permiteReceita' | 'permiteDespesa' | 'codigo' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;

// ============================================================================
// MÓDULO PLANO DE CONTAS
// ============================================================================

export type TipoPlanoConta = 'receita' | 'despesa';

export interface PlanoContaCategoria {
    id: string;
    empresaId: string;
    nome: string;           // Ex: Despesas Operacionais, Receita de Vendas
    codigo: string;         // Ex: 1, 2, 1.01
    tipo: TipoPlanoConta;
    descricao?: string;
    ativo: boolean;

    criadoPor?: string;
    criadoEm?: Timestamp | string;
    atualizadoEm?: Timestamp | string;
}

export interface PlanoConta {
    id: string;
    empresaId: string;
    categoriaId: string;    // Pai (Categoria)

    // Dados Desnormalizados
    categoriaNome: string;
    categoriaCodigo: string;
    tipo: TipoPlanoConta;

    nome: string;           // Ex: Combustível, Salários, Venda de Produto
    codigo: string;         // Ex: 1.01.001
    descricao?: string;
    ativo: boolean;

    criadoPor?: string;
    criadoEm?: Timestamp | string;
    atualizadoEm?: Timestamp | string;
}

export type CreatePlanoCategoria = Omit<PlanoContaCategoria, 'id' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;
export type CreatePlanoConta = Omit<PlanoConta, 'id' | 'categoriaNome' | 'categoriaCodigo' | 'tipo' | 'codigo' | 'criadoPor' | 'criadoEm' | 'atualizadoEm'>;
