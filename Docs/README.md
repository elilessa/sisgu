# Documentação do Sistema de Gestão (SisGu)

**Última atualização:** 12/02/2026

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Arquitetura de Navegação Interna](#arquitetura-de-navegação-interna)
4. [Instalação e Execução](#instalação-e-execução)
5. [Tecnologias Utilizadas](#tecnologias-utilizadas)
6. [Funcionalidades e Módulos](#funcionalidades-e-módulos)
7. [Autenticação e Permissões](#autenticação-e-permissões)
8. [Padronização de Cores](#padronização-de-cores)
9. [Manutenção e Extensão](#manutenção-e-extensão)

---

## 1. 🎯 Visão Geral

O **SisGu** é um Sistema de Gestão Empresarial (ERP/CRM) robusto e moderno, desenvolvido em React + TypeScript, otimizado para empresas de prestação de serviços técnicos. Ele oferece uma solução integrada para gestão de clientes, orçamentos, contratos, estoque e finanças, com foco em usabilidade e performance.

A arquitetura utiliza o **Firebase** (Firestore, Auth, Storage) como base de dados e autenticação, permitindo escalabilidade e tempo real. Um microserviço em **Node.js** é responsável por tarefas de backend como envio de e-mails via SMTP.

---

## 2. 📁 Estrutura do Projeto

Abaixo, a estrutura de diretórios atualizada refletindo a organização modular do sistema:

```
├── public/                    # Assets estáticos e imagens
├── server/                    # Microserviços (Email)
│   └── email-server.cjs       # Servidor Express de Email
│
├── src/
│   ├── components/            # Componentes UI (Layout, Modais, Tabelas)
│   ├── config/                # Inicialização Firebase e App
│   ├── contexts/              # Gestão de Estado Global (AuthContext)
│   ├── hooks/                 # Hooks Customizados (Navegação, Data Fetching)
│   ├── styles/                # Tokens de Design e Tematização
│   ├── types/                 # Interfaces TypeScript
│   ├── utils/                 # Helpers (Máscaras, Validadores, Datas)
│   │
│   ├── pages/                 # Módulos Funcionais
│   │   ├── Config/            # Painel Administrativo
│   │   │   ├── Administradoras.tsx
│   │   │   ├── Banco.tsx
│   │   │   ├── CentrosCusto.tsx
│   │   │   ├── Empresa.tsx
│   │   │   ├── Fornecedores.tsx
│   │   │   ├── ModelosDocumentos.tsx
│   │   │   ├── ParametrosProdutos.tsx
│   │   │   ├── PlanoContas.tsx
│   │   │   ├── Questionarios.tsx
│   │   │   ├── TipoOrdem.tsx
│   │   │   └── Usuarios.tsx
│   │   │
│   │   ├── Financeiro/        # Gestão Financeira Completa
│   │   │   ├── Boletos.tsx
│   │   │   ├── ContasPagar.tsx
│   │   │   ├── ContasReceber.tsx
│   │   │   ├── FluxoCaixa.tsx
│   │   │   ├── LancamentosContabeis.tsx
│   │   │   └── Vendas.tsx
│   │   │
│   │   ├── Relatorios/        # Hub de BI e Relatórios
│   │   │   ├── RelatoriosHub.tsx
│   │   │   └── RelatorioFinanceiro.tsx
│   │   │
│   │   ├── Demo/              # Protótipos e Integrações (Auvo/FieldControl)
│   │   │
│   │   ├── AgendaComercial.tsx # Gestão de Visitas e Negociações
│   │   ├── AgendaTecnica.tsx   # Gestão de O.S. e Equipes
│   │   ├── AreaTecnica.tsx     # Dashboard Operacional do Técnico
│   │   ├── Calendario.tsx      # Visão Geral de Compromissos
│   │   ├── Clientes.tsx        # CRM e Cadastro de Condomínios
│   │   ├── Contratos.tsx       # Gestão de Contratos de Manutenção
│   │   ├── Dashboard.tsx       # Wrapper Principal do Dashboard
│   │   ├── DashboardHome.tsx   # Painel Inicial com Métricas
│   │   ├── Estoque.tsx         # Controle de Almoxarifado
│   │   ├── Login.tsx           # Tela de Autenticação
│   │   ├── OrcamentosContratos.tsx
│   │   ├── OrcamentosEquipamentos.tsx
│   │   ├── Precificacao.tsx    # Engenharia de Custos
│   │   └── Produtos.tsx        # Catálogo Técnico
│   │
│   ├── App.tsx                # Roteador Principal
│   ├── DashboardConfig.tsx    # Configuração de Navegação Interna
│   └── theme.ts               # Definições de Cores e Estilos MUI
```

---

## 3. 🧭 Arquitetura de Navegação Interna

O SisGu utiliza um padrão de **Dashboard Centralizado**. Diferente de rotas tradicionais para cada pequena ação, o sistema utiliza o componente `DashboardConfig.tsx` e o hook `useDashboardNavigation` para alternar entre os módulos principais dentro do `Layout.tsx`.

Para navegar programaticamente entre as páginas do dashboard, utilize o evento customizado `navigate-to-page`:
```javascript
window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'clientes' }));
```

---

## 4. 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js** v18+
- **NPM** ou **Yarn**
- Projeto **Firebase** (Firestore e Auth ativados)

### Configuração Ambiental (.env)
O arquivo `.env` deve conter as chaves do Firebase e configurações do servidor de e-mail. Utilize o `.env.example` (se disponível) como base.

### Comandos
```bash
# Frontend (Porta 5173)
npm install
npm run dev

# Backend de Email (Porta 3001) - Em terminal separado
node server/email-server.cjs
```

---

## 5. 🛠️ Tecnologias Utilizadas

- **Core:** React 18, TypeScript, Vite 3
- **Styling:** Material UI v7 & Tailwind CSS v4
- **Dados:** Firebase (Real-time NoSQL)
- **Documentos:** jspdf & html2pdf.js
- **Datas:** date-fns

---

## 6. ⚙️ Funcionalidades e Módulos

| Módulo | Descrição |
| :--- | :--- |
| **Dashboards** | Métricas em tempo real e atalhos operacionais. |
| **CRM de Clientes** | Ficha completa de condomínios e contatos técnicos/administrativos. |
| **Vendas & Orçamentos** | Workflow de aprovação de orçamentos e conversão automática em contratos. |
| **Financeiro** | Controle de fluxo, baixa automática de boletos e integração com plano de contas. |
| **Agenda & OS** | Gestão de escala técnica e ordens de serviço mobile-friendly. |

---

## 7. 🔐 Autenticação e Permissões

O acesso é blindado pelo Firebase Auth. O `AuthProvider` gerencia a sessão, enquanto o componente `ProtectedRoute` bloqueia acessos não autorizados. No nível de código, o `useAuth` fornece o perfil do usuário para controle granular de funcionalidades (Ex: apenas Admins podem excluir faturas).

---

## 8. 🎨 Padronização de Cores

Todas as cores do sistema são centralizadas em `src/theme.ts`. 

- **Primária:** `#1a237e`
- **Soft Accent (Tabelas):** `#e0f7f4` 

**Regra de Ouro:** Não utilize cores hexadecimais diretamente nos componentes. Use as definições do `theme` ou as classes do Tailwind configuradas no projeto.

---

## 9. 🔧 Manutenção e Extensão

### Adicionando um Novo Módulo
1. Crie a página em `src/pages/`.
2. Registre-a no `DashboardPageKey` e `DASHBOARD_PAGES` em `src/pages/DashboardConfig.tsx`.
3. Adicione o link no `Layout.tsx` (Menu lateral).

### Geração de PDFs
A lógica de geração de documentos reside principalmente em `OrcamentosContratos.tsx` e `ModelosDocumentos.tsx`. Ao alterar o layout de um contrato, verifique as funções de conversão `html2pdf`.

---

**Desenvolvido por Eli Lessa**
