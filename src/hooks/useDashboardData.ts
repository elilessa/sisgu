import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DashboardData, INITIAL_DASHBOARD_DATA } from '../types/DashboardTypes';

export function useDashboardData(empresaId: string | undefined, periodo: string) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData>(INITIAL_DASHBOARD_DATA);

    // Função para calcular datas baseadas no período
    const getDatesFromPeriod = () => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        if (periodo === 'dia') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (periodo === 'semana') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (periodo === 'mes') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        } else if (periodo === 'ano') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        }

        return { start, end };
    };

    const loadData = async () => {
        if (!empresaId) return;
        setLoading(true);

        const { start, end } = getDatesFromPeriod();
        const startTs = Timestamp.fromDate(start);
        const endTs = Timestamp.fromDate(end);

        // Clone para acumular valores
        const newData: DashboardData = JSON.parse(JSON.stringify(INITIAL_DASHBOARD_DATA));

        try {
            // 1. FINANCEIRO (Por Data de Vencimento no Período)
            // Receitas
            const recRef = collection(db, 'EMPRESAS', empresaId, 'contas_receber');
            const recQ = query(recRef, where('dataVencimento', '>=', start.toISOString().split('T')[0]), where('dataVencimento', '<=', end.toISOString().split('T')[0]));
            const recSnap = await getDocs(recQ);

            recSnap.docs.forEach(doc => {
                const d = doc.data();
                const valor = Number(d.valorFinal || 0);
                newData.financeiro.receitaPrevista += valor;
                if (d.status === 'pago') {
                    newData.financeiro.receitaRealizada += valor;
                }
            });

            // Despesas
            const despRef = collection(db, 'EMPRESAS', empresaId, 'contas_pagar');
            const despQ = query(despRef, where('dataVencimento', '>=', start.toISOString().split('T')[0]), where('dataVencimento', '<=', end.toISOString().split('T')[0]));
            const despSnap = await getDocs(despQ);

            despSnap.docs.forEach(doc => {
                const d = doc.data();
                const valor = Number(d.valorFinal || 0);
                newData.financeiro.despesaPrevista += valor;
                if (d.status === 'pago') {
                    newData.financeiro.despesaRealizada += valor;
                }
            });

            // 2. CONTRATOS (Não depende do período selecionado, sempre mostra o *Status Atual*)
            const contRef = collection(db, 'EMPRESAS', empresaId, 'contratos');
            const contSnap = await getDocs(contRef);

            contSnap.docs.forEach(doc => {
                const d = doc.data();
                const valor = Number(d.valorContrato || 0);

                if (d.status === 'excluido') return;

                newData.contratos.total++;
                newData.contratos.valorTotal += valor;

                const status = (d.status || '').toLowerCase();
                if (status === 'ativo' || status === 'aprovado') newData.contratos.ativos++;
                else if (status === 'cancelado') newData.contratos.cancelados++;
                else if (status === 'suspenso') newData.contratos.suspensos++;

                const tipo = d.tipoContrato || '';
                if (tipo === 'com_pecas') newData.contratos.comPecas++;
                else if (tipo === 'sem_pecas') newData.contratos.semPecas++;
                else if (tipo === 'comodato') newData.contratos.comodato++;
            });

            // 3. COMERCIAL (Orçamentos criados no período) - Agora lê de 'orcamentosContratos'
            const orcRef = collection(db, 'EMPRESAS', empresaId, 'orcamentosContratos');
            // Filtrar apenas ORÇAMENTOS (não contratos migrados/criados lá, se houver misturados, mas com o novo padrão, orcamentosContratos tem orçamentos)
            // O padrão de numeração pode ajudar se necessário, mas em tese tudo em orcamentosContratos começa como proposta
            const orcQ = query(orcRef, where('criadoEm', '>=', startTs), where('criadoEm', '<=', endTs));
            const orcSnap = await getDocs(orcQ);

            orcSnap.docs.forEach(doc => {
                const d = doc.data();
                // Ignorar se for um contrato disfarçado (começa com CONT) se quisermos ser puristas, mas para pipeline comercial, consideramos tudo que foi criado ali
                if (d.numero?.startsWith('CONT')) return;

                const valor = Number(d.valorTotal || 0);
                newData.comercial.total++;
                newData.comercial.valorTotalPipeline += valor;

                const status = (d.status || '').toLowerCase();
                if (status.includes('elaboracao') || status.includes('rascunho')) newData.comercial.emElaboracao++;
                else if (status.includes('enviado') || status.includes('aberto')) newData.comercial.enviados++;
                else if (status.includes('aprovado')) newData.comercial.aprovados++;
                else if (status.includes('reprovado') || status.includes('recusado')) newData.comercial.reprovados++;
            });

            // 4. CHAMADOS (Manutenções/OS no período)
            const chamRef = collection(db, 'EMPRESAS', empresaId, 'manutencoes');
            const chamQ = query(chamRef, where('dataAbertura', '>=', start.toISOString()), where('dataAbertura', '<=', end.toISOString()));

            try {
                const chamSnap = await getDocs(chamQ);
                chamSnap.docs.forEach(doc => {
                    const d = doc.data();
                    newData.chamados.total++;
                    const status = (d.status || '').toLowerCase();

                    if (status === 'nova' || status === 'aberta' || status === 'pendente') newData.chamados.abertos++;
                    else if (status === 'andamento' || status === 'execucao') newData.chamados.emAndamento++;
                    else if (status === 'concluida' || status === 'finalizada') newData.chamados.concluidos++;
                });
            } catch (ignored) {
                console.log("Coleção de chamados não encontrada ou erro na query");
            }

            setData(newData);

        } catch (err) {
            console.error("Erro ao carregar dashboard", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [empresaId, periodo]);

    return { data, loading, reload: loadData };
}
