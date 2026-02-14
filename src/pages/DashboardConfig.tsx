import React from 'react';
import { Usuarios } from './Config/Usuarios';
import { Administradoras } from './Config/Administradoras';
import { Banco } from './Config/Banco';
import { ParametrosProdutos } from './Config/ParametrosProdutos';
import { Fornecedores } from './Config/Fornecedores';
import { Produtos } from './Produtos';
import { Estoque } from './Estoque';
import { Precificacao } from './Precificacao';
import { Clientes } from './Clientes';
import { ModelosDocumentos } from './Config/ModelosDocumentos';
import { OrcamentosContratos } from './OrcamentosContratos';
import { OrcamentosEquipamentos } from './OrcamentosEquipamentos';
import { Contratos } from './Contratos';
import { AgendaTecnica } from './AgendaTecnica';
import { AreaTecnica } from './AreaTecnica';
import { AgendaComercial } from './AgendaComercial';
import { TipoOrdem } from './Config/TipoOrdem';
import { Questionarios } from './Config/Questionarios';
import { EmpresaConfig } from './Config/Empresa';
import { CentrosCusto } from './Config/CentrosCusto';
import { PlanoContas } from './Config/PlanoContas';
import { Boletos } from './Financeiro/Boletos';
import { ContasReceber } from './Financeiro/ContasReceber';
import { FluxoCaixa } from './Financeiro/FluxoCaixa';
import { ContasPagar } from './Financeiro/ContasPagar';
import { LancamentosContabeis } from './Financeiro/LancamentosContabeis';
import { RelatoriosHub } from './Relatorios/RelatoriosHub';
import { RelatorioFinanceiro } from './Relatorios/RelatorioFinanceiro';
import { DashboardMain } from './DashboardMain';
import { Vendas } from './Financeiro/Vendas';

// Definição do Tipo para as Chaves das Páginas
export type DashboardPageKey =
    | 'dashboard'
    | 'usuarios'
    | 'administradoras'
    | 'banco'
    | 'parametros-produtos'
    | 'fornecedores'
    | 'produtos'
    | 'estoque'
    | 'precificacao'
    | 'parametros-comerciais'
    | 'clientes'
    | 'orcamentos-equipamentos'
    | 'orcamentos-contratos'
    | 'vendas'
    | 'contratos'
    | 'boletos'
    | 'agenda-visualizar'
    | 'tipo-ordem'
    | 'questionarios'
    | 'area-tecnica'
    | 'agenda-comercial'
    | 'empresa'
    | 'centros-custo'
    | 'plano-contas'
    | 'fluxo-caixa'
    | 'contas-receber'
    | 'contas-pagar'
    | 'lancamentos'
    | 'relatorios'
    | 'relatorio-financeiro';

// Mapeamento Centralizado: Chave -> Componente
export const DASHBOARD_PAGES: Record<DashboardPageKey, React.ComponentType> = {
    'dashboard': DashboardMain,
    'usuarios': Usuarios,
    'administradoras': Administradoras,
    'banco': Banco,
    'parametros-produtos': ParametrosProdutos,
    'fornecedores': Fornecedores,
    'produtos': Produtos,
    'estoque': Estoque,
    'precificacao': Precificacao,
    'parametros-comerciais': ModelosDocumentos,
    'clientes': Clientes,
    'orcamentos-equipamentos': OrcamentosEquipamentos,
    'vendas': Vendas,
    'orcamentos-contratos': OrcamentosContratos,
    'contratos': Contratos,
    'boletos': Boletos,
    'fluxo-caixa': FluxoCaixa,
    'contas-receber': ContasReceber,
    'contas-pagar': ContasPagar,
    'lancamentos': LancamentosContabeis,
    'agenda-visualizar': AgendaTecnica,
    'area-tecnica': AreaTecnica,
    'agenda-comercial': AgendaComercial,
    'tipo-ordem': TipoOrdem,
    'questionarios': Questionarios,
    'empresa': EmpresaConfig,
    'centros-custo': CentrosCusto,
    'plano-contas': PlanoContas,
    'relatorios': RelatoriosHub,
    'relatorio-financeiro': RelatorioFinanceiro,
};
