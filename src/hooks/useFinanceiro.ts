import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase'; // Ajuste conforme seu path de config
import { useAuth } from '../contexts/AuthContext';
import { ContaReceber, CreateContaReceberData, UpdateContaReceberData, ContaPagar, CreateContaPagarData, UpdateContaPagarData } from '../types/financeiro';
import { apiRequest } from '../config/api';

export const useFinanceiro = () => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ===========================================
    // CONTAS A RECEBER
    // ===========================================

    // Referência à coleção de contas a receber da empresa atual
    const getCollectionRef = () => {
        if (!userData?.empresaId) throw new Error('Empresa não identificada');
        return collection(db, `EMPRESAS/${userData.empresaId}/contas_receber`);
    };

    // Listar contas a receber com filtros básicos
    const getContasReceber = async (mes?: string, ano?: string, dia?: string) => {
        if (!userData?.empresaId) return [];
        setLoading(true);
        try {
            // Nova implementação via Backend (Replit)
            const queryParams = new URLSearchParams();
            if (mes) queryParams.append('mes', mes);
            if (ano) queryParams.append('ano', ano);
            if (dia) queryParams.append('dia', dia);

            const response = await apiRequest(`/EMPRESAS/${userData.empresaId}/contas_receber?${queryParams.toString()}`);

            if (!response.ok) {
                // Fallback para Firestore direto se API falhar ??
                // Por enquanto lançar erro para manter padrão
                throw new Error('Erro ao buscar contas a receber do servidor');
            }

            const data = await response.json();
            return data.data as ContaReceber[];
        } catch (err: any) {
            console.error('Erro getContasReceber:', err);
            // setError(err.message); // REMOVIDO: Evitar erro na UI se o fallback funcionar

            // FALLBACK FIRESTORE (Se backend offline, ao menos exibe algo)
            if (mes && ano) {
                try {
                    const start = new Date(parseInt(ano), parseInt(mes) - 1, 1);
                    const end = new Date(parseInt(ano), parseInt(mes), 0);
                    const q = query(
                        collection(db, `EMPRESAS/${userData?.empresaId}/contas_receber`),
                        where('dataVencimento', '>=', start.toISOString().split('T')[0]),
                        where('dataVencimento', '<=', end.toISOString().split('T')[0])
                    );
                    const snap = await getDocs(q);
                    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ContaReceber));
                } catch (fallbackErr: any) {
                    console.error('Erro no fallback:', fallbackErr);
                    setError(fallbackErr.message || "Erro ao buscar dados.");
                    return [];
                }
            }

            setError(err.message); // Se não entrou no fallback, aí sim mostra o erro original
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Criar nova conta
    const addContaReceber = async (data: CreateContaReceberData) => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;
        setLoading(true);

        const valorFinal = (data.valorOriginal || 0) + (data.valorAcrescimos || 0) - (data.valorDesconto || 0);

        const novaContaPayload = {
            ...data,
            empresaId,
            valorFinal,
            status: data.dataPagamento ? 'pago' : 'em_aberto',
            criadoPor: userData.id || '',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };

        try {
            // Tenta criar via API BACKEND
            const response = await apiRequest(`/EMPRESAS/${empresaId}/contas_receber`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaContaPayload)
            });

            if (!response.ok) {
                throw new Error('Falha na criação via API');
            }

            const resData = await response.json();
            return resData.id; // Retorna o ID gerado pelo Backend

        } catch (err: any) {
            console.warn('API Backend falhou, usando Fallback Firestore para Contas Receber:', err.message);

            // FALLBACK FIRESTORE
            try {
                const dbRef = getCollectionRef();
                const novaContaFirestore = {
                    ...novaContaPayload,
                    criadoEm: Timestamp.now(),
                    atualizadoEm: Timestamp.now()
                };

                const docRef = await addDoc(dbRef, novaContaFirestore);
                return docRef.id;
            } catch (fallbackErr: any) {
                setError(fallbackErr.message);
                throw fallbackErr;
            }
        } finally {
            setLoading(false);
        }
    };

    // Atualizar conta
    const updateContaReceber = async (id: string, data: UpdateContaReceberData) => {
        setLoading(true);
        try {
            const docRef = doc(db, `EMPRESAS/${userData?.empresaId}/contas_receber`, id);

            // Recalcular valor final se houver alteração de valores
            let updateData: any = { ...data, atualizadoEm: Timestamp.now() };

            // Lógica de cálculo estaria melhor se buscássemos o doc atual, 
            // mas para simplificar assumimos que quem chama passa os dados corretos ou o hook evolui para transaction

            await updateDoc(docRef, updateData);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Dar Baixa (Receber)
    const baixarConta = async (id: string, dadosBaixa: { status: 'pago', valorPago: number, dataPagamento: string, valorAcrescimos?: number, valorDesconto?: number }) => {
        return updateContaReceber(id, {
            status: 'pago',
            valorPago: dadosBaixa.valorPago,
            dataPagamento: dadosBaixa.dataPagamento,
            valorAcrescimos: dadosBaixa.valorAcrescimos ?? 0,
            valorDesconto: dadosBaixa.valorDesconto ?? 0,
            // Recalcular valorFinal baseado no pago ou manter histórico? 
            // Geralmente Valor Final = O que foi efetivamente pago nesta transação
            valorFinal: dadosBaixa.valorPago
        });
    };

    // Excluir conta
    // Excluir conta
    const deleteContaReceber = async (id: string) => {
        setLoading(true);
        try {
            // Tenta excluir via API BACKEND
            const response = await apiRequest(`/EMPRESAS/${userData?.empresaId}/contas_receber/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                // Se der 404, talvez já tenha sido excluido ou não exista no back, tentamos no firestore direto
                console.warn('Falha na exclusão via API (ou 404), tentando fallback local');
                throw new Error('Falha API');
            }
        } catch (err: any) {
            console.warn('API Backend delete falhou, usando Fallback Firestore:', err.message);
            // FALLBACK FIRESTORE
            try {
                const docRef = doc(db, `EMPRESAS/${userData?.empresaId}/contas_receber`, id);
                await deleteDoc(docRef);
            } catch (fallbackErr: any) {
                setError(fallbackErr.message);
                throw fallbackErr;
            }
        } finally {
            setLoading(false);
        }
    };


    // ===========================================
    // CONTAS A PAGAR
    // ===========================================

    const getPagarCollectionRef = () => {
        if (!userData?.empresaId) throw new Error('Empresa não identificada');
        return collection(db, `EMPRESAS/${userData.empresaId}/contas_pagar`);
    };

    const getContasPagar = async (mes?: string, ano?: string) => {
        if (!userData?.empresaId) return [];
        setLoading(true);
        try {
            // Tentativa via API Backend (Otimizada)
            const queryParams = new URLSearchParams();
            if (mes) queryParams.append('mes', mes);
            if (ano) queryParams.append('ano', ano);

            const response = await apiRequest(`/EMPRESAS/${userData.empresaId}/contas_pagar?${queryParams.toString()}`);

            if (!response.ok) {
                // Se der 404 ou 500, lança erro para cair no catch (Fallback)
                throw new Error('Erro ao buscar contas a pagar do servidor');
            }

            const data = await response.json();
            return data.data as ContaPagar[];

        } catch (err: any) {
            console.warn('API Backend falhou, usando Fallback Firestore para Contas Pagar:', err.message);
            // setError(err.message); // Não setar erro global para não assustar usuário se o fallback funcionar

            // FALLBACK FIRESTORE
            try {
                const dbRef = getPagarCollectionRef();
                let q = query(dbRef);

                if (mes && ano) {
                    const start = `${ano}-${mes.padStart(2, '0')}-01`;
                    const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
                    const end = `${ano}-${mes.padStart(2, '0')}-${lastDay}`;

                    q = query(dbRef,
                        where('dataVencimento', '>=', start),
                        where('dataVencimento', '<=', end)
                    );
                }
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, ...d.data() } as ContaPagar));
            } catch (fallbackErr: any) {
                console.error('Até o fallback falhou:', fallbackErr);
                setError(fallbackErr.message);
                return [];
            }
        } finally {
            setLoading(false);
        }
    };

    const addContaPagar = async (data: CreateContaPagarData) => {
        if (!userData?.empresaId) return;
        const empresaId = userData.empresaId;
        setLoading(true);

        const valorFinal = (data.valorOriginal || 0) + (data.valorAcrescimos || 0) - (data.valorDesconto || 0);

        const novaContaPayload = {
            ...data,
            empresaId,
            valorFinal,
            status: data.dataPagamento ? 'pago' : 'em_aberto',
            criadoPor: userData.id || '',
            criadoEm: new Date().toISOString(), // Backend espera ISO String ou Timestamp
            atualizadoEm: new Date().toISOString()
        };

        try {
            // Tenta criar via API BACKEND
            const response = await apiRequest(`/EMPRESAS/${empresaId}/contas_pagar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaContaPayload)
            });

            if (!response.ok) {
                throw new Error('Falha na criação via API');
            }

            const resData = await response.json();
            return resData.id; // Retorna o ID gerado pelo Backend

        } catch (err: any) {
            console.warn('Backend API Add Pagar falhou, usando Fallback Firestore:', err.message);
            // FALLBACK FIRESTORE
            try {
                const dbRef = getPagarCollectionRef();
                // Ajuste para formato Firestore (Timestamp) se necessário, ou mantém ISO string
                // O tipo ContaPagar que definimos usa Timestamp no front type, mas no backend JS usa string.
                // Vamos converter para Timestamp para manter consistencia no Firestore direto
                const novaContaFirestore = {
                    ...novaContaPayload,
                    criadoEm: Timestamp.now(),
                    atualizadoEm: Timestamp.now()
                };
                // @ts-ignore
                const docRef = await addDoc(dbRef, novaContaFirestore);
                return docRef.id;
            } catch (fallbackErr: any) {
                setError(fallbackErr.message);
                throw fallbackErr;
            }
        } finally {
            setLoading(false);
        }
    };

    const updateContaPagar = async (id: string, data: UpdateContaPagarData) => {
        setLoading(true);
        try {
            const docRef = doc(db, `EMPRESAS/${userData?.empresaId}/contas_pagar`, id);
            let updateData: any = { ...data, atualizadoEm: Timestamp.now() };
            await updateDoc(docRef, updateData);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteContaPagar = async (id: string) => {
        setLoading(true);
        try {
            const docRef = doc(db, `EMPRESAS/${userData?.empresaId}/contas_pagar`, id);
            await deleteDoc(docRef);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const baixarContaPagar = async (id: string, dadosBaixa: { status: 'pago', valorPago: number, dataPagamento: string, valorAcrescimos?: number, valorDesconto?: number }) => {
        return updateContaPagar(id, {
            status: 'pago',
            valorPago: dadosBaixa.valorPago,
            dataPagamento: dadosBaixa.dataPagamento,
            valorAcrescimos: dadosBaixa.valorAcrescimos ?? 0,
            valorDesconto: dadosBaixa.valorDesconto ?? 0,
            valorFinal: dadosBaixa.valorPago
        });
    };

    return {
        loading,
        error,
        // Receber
        getContasReceber,
        addContaReceber,
        updateContaReceber,
        deleteContaReceber,
        baixarConta,
        // Pagar
        getContasPagar,
        addContaPagar,
        updateContaPagar,
        deleteContaPagar,
        baixarContaPagar
    };
};
