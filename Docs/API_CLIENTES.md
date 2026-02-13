# API de Clientes - Documentação para Backend

## Visão Geral

Esta documentação descreve todos os endpoints necessários para o CRUD completo do módulo de **Clientes**, incluindo seus relacionamentos com **Prefixos**, **Contatos**, **Equipamentos Instalados** e **Administradoras**.

**IMPORTANTE:** Este sistema é **multi-tenant**. Todos os endpoints devem incluir o `empresaId` no caminho da URL.

## Configuração

**Base URL:** Configurada através da variável de ambiente `VITE_URL_DESENVOLVIMENTO` no Secrets do Replit.

**Exemplo:** `https://seu-backend.replit.dev/api`

## Estrutura de Dados

### Cliente

```typescript
interface Cliente {
  id: string;                      // UUID gerado pelo backend
  prefixoId: string;               // ID do prefixo selecionado
  prefixoNome: string;             // Nome do prefixo (denormalizado)
  nome: string;                    // Nome do cliente
  pessoaJuridica: boolean;         // Se é pessoa jurídica
  pessoaFisica: boolean;           // Se é pessoa física
  cnpjCpf: string;                 // CNPJ ou CPF
  endereco: string;                // Endereço
  numero: string;                  // Número do endereço
  complemento: string;             // Complemento
  bairro: string;                  // Bairro
  cidade: string;                  // Cidade
  uf: string;                      // Estado (sigla)
  cep: string;                     // CEP
  observacao: string;              // Observações gerais
  enviaBoleto: boolean;            // Se envia boletos para o banco
  status: 'ativo' | 'inativo';     // Status do cliente
  administradoraId?: string;       // ID da administradora (opcional)
  administradoraNome?: string;     // Nome da administradora (denormalizado)
  contatoAdministradoraId?: string; // ID do contato da administradora (opcional)
  contatoAdministradoraNome?: string; // Nome do contato (denormalizado)
  criadoEm: string;                // ISO 8601 timestamp
  atualizadoEm: string;            // ISO 8601 timestamp
}
```

### Contato do Cliente

```typescript
interface ContatoCliente {
  id: string;                      // UUID gerado pelo backend
  clienteId: string;               // ID do cliente pai
  nome: string;                    // Nome do contato
  apto: string;                    // Apartamento
  funcao: string;                  // Função do contato
  telefone: string;                // Telefone
  whatsapp: string;                // WhatsApp
  email1: string;                  // Email principal
  email2: string;                  // Email secundário
  atual: boolean;                  // Se é o contato atual do cliente
}
```

### Equipamento Instalado

```typescript
interface EquipamentoInstalado {
  id: string;                      // UUID gerado pelo backend
  clienteId: string;               // ID do cliente pai
  produtoId: string;               // ID do produto
  produtoNome: string;             // Nome completo do produto (denormalizado)
  produtoTipo: string;             // Tipo do produto (denormalizado)
  quantidade: number;              // Quantidade instalada
  localizacao: string;             // Localização do equipamento
  dataInstalacao: string;          // ISO 8601 timestamp
}
```

### Prefixo

```typescript
interface Prefixo {
  id: string;                      // UUID gerado pelo backend
  nome: string;                    // Nome do prefixo
  status: 'ativo' | 'inativo';     // Status
  criadoEm: string;                // ISO 8601 timestamp
  atualizadoEm: string;            // ISO 8601 timestamp
}
```

## Endpoints

### 1. Listar Todos os Clientes

**Endpoint:** `GET /EMPRESAS/:empresaId/clientes`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `search` (opcional): Filtrar por nome (startsWith)
- `status` (opcional): Filtrar por status ('ativo' | 'inativo')

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cliente-uuid-1",
      "prefixoId": "prefixo-uuid-1",
      "prefixoNome": "COND",
      "nome": "Condomínio Exemplo",
      "pessoaJuridica": true,
      "pessoaFisica": false,
      "cnpjCpf": "12.345.678/0001-90",
      "endereco": "Rua das Flores",
      "numero": "123",
      "complemento": "",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP",
      "cep": "01234-567",
      "observacao": "",
      "enviaBoleto": true,
      "status": "ativo",
      "administradoraId": "adm-uuid-1",
      "administradoraNome": "Administradora ABC",
      "contatoAdministradoraId": "contato-adm-uuid-1",
      "contatoAdministradoraNome": "João Silva",
      "contatoAtual": "Maria Santos",
      "contatoFuncao": "Síndica",
      "contatoTelefone": "(11) 98765-4321",
      "contatoEmail1": "maria@exemplo.com",
      "criadoEm": "2024-01-15T10:30:00.000Z",
      "atualizadoEm": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response 401:** Não autorizado
**Response 500:** Erro interno

---

### 2. Buscar Cliente por ID

**Endpoint:** `GET /EMPRESAS/:empresaId/clientes/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "cliente-uuid-1",
    "prefixoId": "prefixo-uuid-1",
    "prefixoNome": "COND",
    "nome": "Condomínio Exemplo",
    // ... todos os campos do cliente
  }
}
```

**Response 404:** Cliente não encontrado
**Response 401:** Não autorizado
**Response 500:** Erro interno

---

### 3. Criar Novo Cliente

**Endpoint:** `POST /EMPRESAS/:empresaId/clientes`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "prefixoId": "prefixo-uuid-1",
  "nome": "Condomínio Novo",
  "pessoaJuridica": true,
  "pessoaFisica": false,
  "cnpjCpf": "12.345.678/0001-90",
  "endereco": "Rua das Palmeiras",
  "numero": "456",
  "complemento": "Bloco A",
  "bairro": "Jardins",
  "cidade": "São Paulo",
  "uf": "SP",
  "cep": "01234-567",
  "observacao": "Cliente VIP",
  "enviaBoleto": true,
  "status": "ativo",
  "administradoraId": "adm-uuid-1",
  "contatoAdministradoraId": "contato-adm-uuid-1"
}
```

**Validações Obrigatórias:**
- `prefixoId`: Deve existir e estar ativo
- `nome`: Não pode ser vazio
- `cidade`: Não pode ser vazio
- `uf`: Deve ser uma sigla válida de estado brasileiro
- `pessoaJuridica` OU `pessoaFisica`: Pelo menos um deve ser true

**Response 201:**
```json
{
  "success": true,
  "message": "Cliente criado com sucesso",
  "data": {
    "id": "cliente-uuid-novo",
    "prefixoId": "prefixo-uuid-1",
    "prefixoNome": "COND",
    // ... todos os campos do cliente criado
    "criadoEm": "2024-01-15T10:30:00.000Z",
    "atualizadoEm": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response 400:** Dados inválidos
**Response 401:** Não autorizado
**Response 500:** Erro interno

---

### 4. Atualizar Cliente

**Endpoint:** `PUT /EMPRESAS/:empresaId/clientes/:id`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:** (mesmo formato do POST)

**Response 200:**
```json
{
  "success": true,
  "message": "Cliente atualizado com sucesso",
  "data": {
    "id": "cliente-uuid-1",
    // ... todos os campos atualizados
    "atualizadoEm": "2024-01-15T14:45:00.000Z"
  }
}
```

**Response 400:** Dados inválidos
**Response 404:** Cliente não encontrado
**Response 401:** Não autorizado
**Response 500:** Erro interno

---

### 5. Excluir Cliente

**Endpoint:** `DELETE /EMPRESAS/:empresaId/clientes/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Importante:** Esta operação deve também excluir em cascata:
- Todos os contatos do cliente
- Todos os equipamentos instalados do cliente

**Response 200:**
```json
{
  "success": true,
  "message": "Cliente excluído com sucesso"
}
```

**Response 404:** Cliente não encontrado
**Response 401:** Não autorizado
**Response 500:** Erro interno

---

## Contatos do Cliente

### 6. Listar Contatos de um Cliente

**Endpoint:** `GET /EMPRESAS/:empresaId/clientes/:clienteId/contatos`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "contato-uuid-1",
      "clienteId": "cliente-uuid-1",
      "nome": "Maria Santos",
      "apto": "101",
      "funcao": "Síndica",
      "telefone": "(11) 98765-4321",
      "whatsapp": "(11) 98765-4321",
      "email1": "maria@exemplo.com",
      "email2": "maria.santos@exemplo.com",
      "atual": true
    }
  ]
}
```

---

### 7. Criar Contato do Cliente

**Endpoint:** `POST /EMPRESAS/:empresaId/clientes/:clienteId/contatos`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "João Silva",
  "apto": "205",
  "funcao": "Subsíndico",
  "telefone": "(11) 91234-5678",
  "whatsapp": "(11) 91234-5678",
  "email1": "joao@exemplo.com",
  "email2": "",
  "atual": false
}
```

**Validações:**
- `nome`: Obrigatório
- `funcao`: Obrigatório
- Se `atual` for `true`, desmarcar todos os outros contatos do mesmo cliente como `atual = false`

**Response 201:**
```json
{
  "success": true,
  "message": "Contato criado com sucesso",
  "data": {
    "id": "contato-uuid-novo",
    "clienteId": "cliente-uuid-1",
    // ... todos os campos do contato
  }
}
```

---

### 8. Atualizar Contato do Cliente

**Endpoint:** `PUT /EMPRESAS/:empresaId/clientes/:clienteId/contatos/:contatoId`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:** (mesmo formato do POST)

**Response 200:**
```json
{
  "success": true,
  "message": "Contato atualizado com sucesso",
  "data": {
    "id": "contato-uuid-1",
    // ... campos atualizados
  }
}
```

---

### 9. Excluir Contato do Cliente

**Endpoint:** `DELETE /EMPRESAS/:empresaId/clientes/:clienteId/contatos/:contatoId`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Contato excluído com sucesso"
}
```

---

## Equipamentos Instalados

### 10. Listar Equipamentos de um Cliente

**Endpoint:** `GET /EMPRESAS/:empresaId/clientes/:clienteId/equipamentos`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "equipamento-uuid-1",
      "clienteId": "cliente-uuid-1",
      "produtoId": "produto-uuid-1",
      "produtoNome": "Câmera IP - Intelbras VIP 1220D - Full HD",
      "produtoTipo": "Câmera IP",
      "quantidade": 8,
      "localizacao": "Portaria Principal",
      "dataInstalacao": "2024-01-10T00:00:00.000Z"
    }
  ]
}
```

---

### 11. Criar Equipamento Instalado

**Endpoint:** `POST /EMPRESAS/:empresaId/clientes/:clienteId/equipamentos`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "produtoId": "produto-uuid-1",
  "quantidade": 5,
  "localizacao": "Subsolo"
}
```

**Validações:**
- `produtoId`: Obrigatório e deve existir
- `quantidade`: Obrigatório, maior que 0
- Backend deve buscar os dados do produto (nome, tipo) para denormalizar

**Response 201:**
```json
{
  "success": true,
  "message": "Equipamento adicionado com sucesso",
  "data": {
    "id": "equipamento-uuid-novo",
    "clienteId": "cliente-uuid-1",
    "produtoId": "produto-uuid-1",
    "produtoNome": "DVR - Intelbras MHDX 1116 - 16 Canais",
    "produtoTipo": "DVR",
    "quantidade": 5,
    "localizacao": "Subsolo",
    "dataInstalacao": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 12. Atualizar Equipamento Instalado

**Endpoint:** `PUT /EMPRESAS/:empresaId/clientes/:clienteId/equipamentos/:equipamentoId`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:** (mesmo formato do POST)

**Response 200:**
```json
{
  "success": true,
  "message": "Equipamento atualizado com sucesso",
  "data": {
    "id": "equipamento-uuid-1",
    // ... campos atualizados
  }
}
```

---

### 13. Excluir Equipamento Instalado

**Endpoint:** `DELETE /EMPRESAS/:empresaId/clientes/:clienteId/equipamentos/:equipamentoId`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Equipamento excluído com sucesso"
}
```

---

## Prefixos

### 14. Listar Prefixos

**Endpoint:** `GET /EMPRESAS/:empresaId/prefixos`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (opcional): Filtrar por status

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prefixo-uuid-1",
      "nome": "COND",
      "status": "ativo",
      "criadoEm": "2024-01-01T00:00:00.000Z",
      "atualizadoEm": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 15. Criar Prefixo

**Endpoint:** `POST /EMPRESAS/:empresaId/prefixos`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "EDIF",
  "status": "ativo"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Prefixo criado com sucesso",
  "data": {
    "id": "prefixo-uuid-novo",
    "nome": "EDIF",
    "status": "ativo",
    "criadoEm": "2024-01-15T10:30:00.000Z",
    "atualizadoEm": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 16. Atualizar Prefixo

**Endpoint:** `PUT /EMPRESAS/:empresaId/prefixos/:id`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "COND",
  "status": "inativo"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Prefixo atualizado com sucesso",
  "data": {
    "id": "prefixo-uuid-1",
    "nome": "COND",
    "status": "inativo",
    "atualizadoEm": "2024-01-15T14:45:00.000Z"
  }
}
```

---

### 17. Excluir Prefixo

**Endpoint:** `DELETE /EMPRESAS/:empresaId/prefixos/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Importante:** Verificar se há clientes usando este prefixo antes de excluir.

**Response 200:**
```json
{
  "success": true,
  "message": "Prefixo excluído com sucesso"
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Não é possível excluir. Existem clientes usando este prefixo."
}
```

---

## Códigos de Erro Padrão

```json
{
  "success": false,
  "message": "Mensagem de erro detalhada",
  "errors": [
    {
      "field": "nome",
      "message": "O campo nome é obrigatório"
    }
  ]
}
```

## Autenticação

Todas as requisições devem incluir um token de autenticação no header:

```
Authorization: Bearer {token}
```

O token JWT deve conter:
- `empresaId`: ID da empresa do usuário logado (será validado contra o :empresaId da URL)
- `userId`: ID do usuário logado
- Permissões de acesso

**Validação de Segurança:**
- O backend DEVE validar que o `empresaId` do token corresponde ao `empresaId` da URL
- Se não corresponder, retornar erro 403 Forbidden

## Notas de Implementação

1. **Multi-Tenant:**
   - TODAS as rotas devem incluir `empresaId` no caminho
   - O backend deve validar que o usuário pertence à empresa especificada
   - Nunca permitir acesso cross-tenant

2. **Estrutura Firebase/MongoDB:**
   - `/EMPRESAS/:empresaId/clientes`
   - `/EMPRESAS/:empresaId/clientes/:clienteId/contatos`
   - `/EMPRESAS/:empresaId/clientes/:clienteId/equipamentos`
   - `/EMPRESAS/:empresaId/prefixos`

3. **Denormalização de Dados:**
   - Ao criar/atualizar cliente, buscar e salvar dados denormalizados dentro do escopo da empresa
   - Prefixos, produtos e administradoras devem ser buscados na subcoleção da empresa

4. **Validações:**
   - Validar que prefixoId, administradoraId, produtoId existem na mesma empresa
   - Validar UF contra lista de estados brasileiros
   - Validar que `pessoaJuridica` OU `pessoaFisica` está marcado

5. **Cascata:**
   - Ao excluir cliente, excluir subcoleções (contatos, equipamentos)

6. **Logs de Console:**
   - Backend deve fazer log do empresaId em cada requisição para auditoria

## Estados Brasileiros Válidos

```
AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO