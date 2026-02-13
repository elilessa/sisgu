# Roadmap e Dívidas Técnicas - SisGu

## Arquitetura Multi-tenant e Financeiro

### Padronização de Plano de Contas e Centro de Custo
**Situação Atual:**
- Na geração de Boletos (`Boletos.tsx`), o sistema busca por aproximação de nome (keywords: "CONTRATO", "MENSALIDADE", "OPERACIONAL") para definir o Plano de Contas e Centro de Custo.
- Isso é uma solução temporária para evitar configuração manual na empresa atual.

**Solução Futura (Para implementar antes do lançamento Multi-tenant):**
- [ ] **Seed Automático:** Ao criar uma nova empresa (Tenant), o sistema deve criar automaticamente os registros fundamentais:
    - Plano de Contas: `MENSALIDADES DE CONTRATOS` (Tipo: Receita, Travado/Sistema)
    - Centro de Custo: `OPERACIONAL` (Travado/Sistema)
- [ ] **Padrão de Nomenclatura:** Adotar estritamente os nomes usados no sistema atual como padrão oficial.
- [ ] **Refatoração:** Alterar `Boletos.tsx` para buscar por uma TAG de sistema (ex: `is_system_default: true` e `system_tag: 'CONTRACT_REVENUE'`) em vez de buscar por nome string solta.
- [ ] **Configuração:** Se optarmos por flexibilidade, criar aba "Parâmetros Financeiros" em `Empresa.tsx` para o admin apontar ID diferentes, caso deseje sair do padrão.

## Outras Pendências
- [ ] **Retorno Bancário:** Implementar leitura de arquivo CNAB para baixa automática de boletos.
