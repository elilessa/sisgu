# replit.md

## Overview

This is a multi-tenant business management system (Sistema de Gestão Empresarial) built with React, TypeScript, and Firebase. The application provides comprehensive business operations management including client management, contracts, quotes, inventory, technical scheduling, and user access control with permission-based routing.

The system is designed for service companies that need to manage clients, equipment, contracts, quotes (orçamentos), technical team scheduling, and product inventory with pricing management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18 with TypeScript** - Core frontend framework
- **Vite** - Build tool and dev server (runs on port 5000)
- **React Router DOM v7** - Client-side routing with protected routes

### UI/Styling
- **Material-UI (MUI) v7** - Primary component library with custom theme
- **Tailwind CSS v4** - Utility-first CSS (configured with PostCSS)
- **Emotion** - CSS-in-JS for MUI styling
- Custom theme with primary color `#00c0a3` (teal/green)

### State Management
- **React Context API** - AuthContext handles authentication state, user data, and permissions
- Component-level state with useState/useEffect hooks

### Multi-Tenant Architecture
- All data is scoped by `empresaId` (company ID)
- Users belong to a specific company and can only access that company's data
- Permission-based route protection using `rotasPermitidas` array per user

### Page/Module Structure
The application follows a pattern where each business module has a dedicated management page:
- `ClientesManagement` - Client CRUD with contacts, equipment, and prefixes
- `ContratosManagement` - Contract management
- `OrcamentosManagement` / `OrcamentosEquipamentosManagement` - Quotes management
- `AgendaTecnicaManagement` - Technical team scheduling with Chamados Ativos, Histórico, Calendário, and Arquivados tabs; includes archiving functionality instead of deletion
- `AreaTecnicaManagement` - Technical area with scheduling execution modal, public link generation, and real-time updates
- `TipoOrdemManagement` - CRUD for activity types (tipoAtividades subcollection)
- `Calendario` - Calendar component with month/week/day views for scheduling visualization
- `ProdutosManagement` / `EstoqueManagement` / `PrecificacaoManagement` - Inventory and pricing
- `FornecedoresManagement` - Supplier management with type classification, address autocomplete via CEP
  - **Search & Filter**: Text search field + type filter dropdown in listing
  - **Two-Step Wizard**: New suppliers start with type selection (Step 0), then conditional form (Step 1)
  - **Conditional Forms**: Simple mode (only name/observation) vs Complete mode (full tabbed interface)
  - **Conditional Validation**: Simple mode requires only name, Complete mode requires name/cidade/UF
- `TiposFornecedorManagement` - CRUD for supplier type categories (Concessionárias, Impostos, etc.)
  - **Form Mode Selection**: Each type has `modoFormulario` field (Simples/Completo) determining form complexity
- `UserManagement` - User and permission management
- `FormularioPublico` - Public form page for field technicians (accessible via token-based links without authentication)
- `Questionarios` - Questionnaire builder for creating forms with various field types
- Various parameter management pages for system configuration

### Public Forms System (Field Technicians)
- When scheduling activities in `AreaTecnicaManagement`, a unique public token is generated
- Token data is stored in `tokensPublicos` collection for efficient lookup
- Public link format: `/formulario/{token}` - accessible without authentication
- Supports all question types: text, numeric, boolean, true/false, checkbox, photo upload, and signature
- Validates required fields before submission
- Responses saved to agendamento with timestamps
- **Finalization Options**: Three types of completion:
  - Sem pendência (without pending issues) - marks both agendamento and chamado as "concluído"
  - Pendência técnica (technical pending) - requires description, marks agendamento as "concluído" and chamado as "pendencia_tecnica"
  - Pendência financeira (financial pending) - requires type (cobrança/orçamento), description, optional value; marks chamado as "pendencia_financeira" and automatically converts tipoChamado from "tecnico" to "comercial" for routing to commercial sector
  - **Parts Tracking for Orçamento**: When finalizing with "pendência orçamento", includes checkbox "Houve retirada de peças?" with optional fields for listing parts removed and their location (for equipment awaiting approval)
- **Report System**: View and download questionnaire responses in AreaTecnicaManagement
  - Dialog shows all responses, photos, signatures, and pending issue details
  - Download generates structured .txt file with UTF-8 encoding
- **Technical Return System**: Create follow-up appointments for pending issues
  - Button appears ONLY on completed agendamentos with TECHNICAL pending issues (not financial)
  - Opens configurable dialog allowing selection of: activity type, date/time, technicians, questionnaires, and observations
  - Creates new agendamento in the same chamado with `tipoRetorno` and `agendamentoOrigemId` fields
  - Automatically generates new public token and link
  - Real-time updates via Firestore onSnapshot listener
  - Visual indicator (badge) shows "Retorno" on return appointments
- **Financial Pending Alerts in AgendaTecnicaManagement**: When chamado has financial pending status
  - Alert box shows in chamado details with clear indication for attendant
  - Displays "PENDÊNCIA: COBRANÇA - Encaminhar ao Setor Comercial" or "PENDÊNCIA: ORÇAMENTO - Encaminhar ao Setor Comercial"
  - Shows description and optional value for commercial team follow-up
- **Improved Agendamento Visualization**: Uses MUI Accordion component for expandable/collapsible view
  - State managed via `expandedAgendamentos` object
  - Different background colors for completed (green), return (orange), and pending (gray) appointments
  - Summary shows date, return badge, and status chip
  - Details contain full information, actions, and pending issue alerts
- **PDF Printing**: Generate comprehensive PDF reports for service orders
  - Print button on each chamado in the actions area
  - Includes OS data, client info, description, all pending issues
  - Full agendamento history with status and finalization details
  - Uses jsPDF library for generation
- **History Tab (Read-Only Mode)**:
  - Tab index 1 displays only view and print actions
  - No edit, archive, or management buttons available in history
  - Print function (handlePrintChamadoHistorico) generates HTML report with complete operation history
- **Equipment Return Alerts**: Visual indicators for OS returning from commercial area
  - Red border alert for `aguardando_devolucao` (rejected budget - schedule equipment return)
  - Green border alert for `orcamento_aprovado` (approved budget - schedule service execution)
  - Displays all pendenciaRetornoTecnico details including items, value, and parts info
- **Email Notification System**: Automatic email dispatch to technicians when scheduling
  - Uses custom Node.js/Express backend server (server/email-server.cjs) with Nodemailer and Gmail SMTP
  - Sends email after creating new agendamento or technical return
  - Email includes: OS number, client name, date/time, activity type, technicians, observations
  - Call-to-action button with direct link to public form
  - Error handling: If email fails, agendamento still succeeds with warning message
  - Requires environment variables: GMAIL_USER (Gmail address) and GMAIL_APP_PASSWORD (Gmail App Password)
  - API endpoint: POST /api/send-email (proxied via Vite to port 3001)

### Commercial Area Workflow (AgendaComercialManagement)
- **Three-tab structure**: Pendentes, Em Andamento, Finalizados
- **Receives chamados** from technical area with `tipoChamado: 'comercial'` and `status: 'pendencia_financeira'`
- **Displays financial pending details**: Type (cobrança/orçamento), description, value, parts removed, location
- **Budget Creation (Two-Stage Process)**:
  1. **Draft Creation**: Creates budget in `orcamentos` collection with status `em_elaboracao`
     - Auto-generates budget number (ORC-XXXXX)
     - Links budget to chamado via `chamadoId`, `chamadoNumeroOS`, and `pendenciaOrigem` fields
     - Changes chamado status to `orcamento_em_construcao`
  2. **Completion & Sending**: User edits budget in OrcamentosEquipamentosManagement
     - "Finalizar e Enviar" button (Send icon) visible for `em_elaboracao` status
     - Updates budget status to `enviado` and chamado status to `orcamento_enviado`
     - Blue background highlight indicates budgets linked to chamados
- **Budget Approval/Rejection workflow**:
  - Approve: Changes status to `orcamento_aprovado`, returns to technical area with pendenciaRetornoTecnico (includes items, value, parts info) for execution scheduling
  - Reject: Captures reason, optionally flags equipment to return
  - Both approval and rejection routes back to `tipoChamado: 'tecnico'` with appropriate status and pendenciaRetornoTecnico details
- **OS-Linked Budget Items**: Free-text product descriptions (descricaoLivre) instead of product database lookup when chamadoId exists
- **Operation History**: `historicoOperacoes` array tracks all commercial actions with user, timestamp, action type, and details
- **Real-time updates**: Uses Firestore onSnapshot for live synchronization

### Chamado Status Types
- `aberto` - Open/new service order
- `em_andamento` - In progress
- `concluido` - Completed successfully
- `cancelado` - Cancelled
- `pendencia_tecnica` - Completed with technical pending issues
- `pendencia_financeira` - Completed with financial pending issues (routes to commercial)
- `orcamento_em_construcao` - Budget being created/edited (draft stage)
- `orcamento_enviado` - Budget sent to client for approval
- `orcamento_aprovado` - Budget approved by client
- `orcamento_reprovado` - Budget rejected by client
- `aguardando_devolucao` - Waiting for equipment return (routes back to technical)

### Component Patterns
- `Layout.tsx` - Main application shell with navigation
- `ProtectedRoute.tsx` - HOC for permission-based route protection
- Each management page follows similar CRUD patterns with dialogs for create/edit/view

## External Dependencies

### Firebase Services
- **Firebase Authentication** - User authentication with email/password
- **Cloud Firestore** - Primary database for all business data
- **Firebase Storage** - File storage for logos and documents

Firebase configuration is loaded from environment variables (Replit Secrets):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### External Backend API
- The application connects to an external REST API backend
- Backend URL configured via `VITE_URL_DESENVOLVIMENTO` environment variable
- API helper in `src/config/api.ts` handles requests with logging
- Used for client management operations (see `Docs/API_CLIENTES.md`)

### Key NPM Packages
- `firebase` - Firebase SDK
- `react-router-dom` - Routing
- `@mui/material` + `@mui/icons-material` - UI components
- `@emotion/react` + `@emotion/styled` - Styling
- `tailwindcss` with `@tailwindcss/postcss` - Utility CSS