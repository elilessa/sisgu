// Interfaces para os dados do Dashboard

export interface DashboardData {
    financeiro: {
        receitaPrevista: number;
        receitaRealizada: number;
        despesaPrevista: number;
        despesaRealizada: number;
    };
    contratos: {
        total: number;
        ativos: number;
        cancelados: number;
        suspensos: number;
        valorTotal: number;
        comPecas: number;
        semPecas: number;
        comodato: number;
    };
    comercial: {
        total: number;
        emElaboracao: number;
        enviados: number;
        aprovados: number;
        reprovados: number;
        valorTotalPipeline: number;
    };
    chamados: {
        total: number;
        abertos: number; // Pendente
        emAndamento: number;
        concluidos: number;
        atrasados: number;
    };
}

export const INITIAL_DASHBOARD_DATA: DashboardData = {
    financeiro: { receitaPrevista: 0, receitaRealizada: 0, despesaPrevista: 0, despesaRealizada: 0 },
    contratos: { total: 0, ativos: 0, cancelados: 0, suspensos: 0, valorTotal: 0, comPecas: 0, semPecas: 0, comodato: 0 },
    comercial: { total: 0, emElaboracao: 0, enviados: 0, aprovados: 0, reprovados: 0, valorTotalPipeline: 0 },
    chamados: { total: 0, abertos: 0, emAndamento: 0, concluidos: 0, atrasados: 0 }
};
