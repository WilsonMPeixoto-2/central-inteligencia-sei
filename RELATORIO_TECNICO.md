# Relatório Técnico do Projeto
## Central de Inteligência SEI!RIO

**Data:** 12/01/2026  
**Versão:** 2610ccdc  
**Projeto:** central-inteligencia-sei

---

## 1. Hosting e Deploy

### 1.1 Infraestrutura/Plataforma
- **Plataforma de hospedagem:** Manus Platform (manus.space)
- **URL de desenvolvimento:** `https://3000-*.us2.manus.computer` (ambiente sandbox)
- **URL de produção:** Disponível após publicação via botão "Publish" na UI

### 1.2 Ambientes
- **Staging:** Não configurado separadamente (ambiente de desenvolvimento serve como staging)
- **Produção:** Ativado via botão "Publish" na interface de gerenciamento Manus
- **Fluxo de deploy:** 
  1. Desenvolvimento local no sandbox
  2. Criação de checkpoint via `webdev_save_checkpoint`
  3. Publicação via botão "Publish" na Management UI

### 1.3 Domínio Customizado
- **Configurado:** Não (utiliza domínio padrão manus.space)
- **Opção disponível:** Sim, via Settings → Domains na Management UI

---

## 2. Stack (Frontend e Backend)

### 2.1 Frontend
| Componente | Tecnologia | Versão |
|------------|------------|--------|
| Framework | React | ^19.2.1 |
| Bundler | Vite | ^7.1.7 |
| Estilização | Tailwind CSS | ^4.1.14 |
| Router | Wouter | ^3.3.5 |
| State Management | TanStack React Query | ^5.90.2 |
| UI Components | Radix UI + shadcn/ui | Múltiplas versões |
| Ícones | Lucide React | ^0.453.0 |
| Markdown | Streamdown | ^1.4.0 |
| Animações | Framer Motion | ^12.23.22 |

### 2.2 Backend
| Componente | Tecnologia | Versão |
|------------|------------|--------|
| Runtime | Node.js | 22.13.0 |
| Framework | Express | ^4.21.2 |
| API Layer | tRPC | ^11.6.0 |
| Validação | Zod | ^4.1.12 |
| Serialização | Superjson | ^1.13.3 |
| HTTP Client | Axios | ^1.12.0 |

### 2.3 Arquivos Principais
```
client/src/App.tsx          → Rotas e layout principal
client/src/pages/Home.tsx   → Página principal com chat
client/src/lib/trpc.ts      → Cliente tRPC
server/routers.ts           → Procedures tRPC
server/rag.ts               → Lógica RAG e System Prompt
server/_core/llm.ts         → Configuração do LLM
server/webSearch.ts         → Fallback de busca web
```

---

## 3. Banco de Dados e Armazenamento

### 3.1 Banco de Dados
| Aspecto | Configuração |
|---------|--------------|
| SGBD | MySQL (TiDB compatível) |
| ORM | Drizzle ORM ^0.44.5 |
| Migrações | Drizzle Kit ^0.31.4 |
| Hospedagem | Serviço gerenciado Manus (TiDB Cloud) |

### 3.2 Schema do Banco
```
drizzle/schema.ts
├── users           → Autenticação OAuth
├── documents       → Metadados dos PDFs indexados
├── documentChunks  → Chunks com embeddings (JSON)
├── chatSessions    → Sessões de conversa
└── chatMessages    → Mensagens individuais
```

### 3.3 Comandos de Migração
```bash
pnpm db:push    # Gera e aplica migrações (drizzle-kit generate && drizzle-kit migrate)
```

---

## 4. RAG / Vector Store / Embeddings

### 4.1 Vector Store
| Aspecto | Configuração |
|---------|--------------|
| Tipo | **In-memory keyword search** (não usa vector store externo) |
| Alternativa | Schema preparado para pgvector/JSON embeddings no MySQL |
| Busca | Multi-Query RAG com scoring baseado em keywords |

### 4.2 Pipeline de Ingestão
| Parâmetro | Valor |
|-----------|-------|
| Chunk Size | 4000 caracteres |
| Overlap | 500 caracteres |
| Top-K | 12 chunks |
| Rerank | Sim (scoring por keywords + sinônimos) |
| Dedupe | Sim (merge por source+section) |

### 4.3 Algoritmo de Busca
1. **Classificação de intenção** (CREATE_PROCESS, ADD_DOCUMENT, etc.)
2. **Expansão com sinônimos** (abrir→iniciar/criar/gerar/cadastrar/autuar)
3. **Multi-Query** (até 6 consultas alternativas)
4. **Two-Pass Search** (original + expandida se confiança baixa)
5. **Scoring** baseado em:
   - Matches de palavras
   - Termos SEI-específicos (+3 pontos)
   - Palavras de ação em queries "como" (+2 pontos)

### 4.4 Armazenamento dos PDFs e Índices
```
knowledge-base/
├── SDP_PRESTACAO_DE_CONTAS_GAD_4_CRE.pdf   (8.8 MB - original)
├── cartilha_sei_content.txt                 (295 KB - texto extraído)
├── manual_sei_4_content.txt                 (100 KB - texto extraído)
├── manual_usuario_sei_content.txt           (143 KB - texto extraído)
└── pdf_content.txt                          (26 KB - texto extraído)
```

**Localização:** Filesystem local (diretório `knowledge-base/` na raiz do projeto)

---

## 5. Configuração do LLM

### 5.1 Modelo e Parâmetros
| Parâmetro | Valor |
|-----------|-------|
| Model ID (Primário) | `gemini-3-pro-preview` |
| Model ID (Fallback) | `gemini-1.5-pro-latest` |
| Temperature | 0.5 |
| Max Tokens | 32768 |
| Thinking Level | `high` (apenas modelo primário) |
| Thinking Budget | 8192 tokens (primário) / 128 tokens (fallback) |

### 5.2 Fallback Automático
O sistema usa fallback para `gemini-1.5-pro-latest` quando:
- Status HTTP 429 (Rate Limit)
- Status HTTP 503 (Service Unavailable)
- Status HTTP 500 (Internal Server Error)

### 5.3 Tools Habilitadas
| Tool | Descrição | Trigger |
|------|-----------|---------|
| Web Search | Busca em domínios .gov.br | Confiança baixa no RAG, pedido explícito de legislação, ou base normativa necessária |

### 5.4 Domínios Permitidos para Busca Web
```
gov.br, rio.rj.gov.br, planalto.gov.br, alerj.rj.gov.br,
camara.leg.br, senado.leg.br, tcu.gov.br, cgu.gov.br,
educacao.rj.gov.br, sme.rio.rj.gov.br
```

### 5.5 Arquivos de Configuração
```
server/_core/llm.ts         → Linhas 283-320 (modelo, temperature, thinking)
server/rag.ts               → Linhas 12-139 (SYSTEM_PROMPT completo)
server/webSearch.ts         → Linhas 8-19 (domínios permitidos)
```

---

## 6. Observabilidade e Logs

### 6.1 Logs
| Tipo | Localização |
|------|-------------|
| Aplicação | Console do servidor (stdout) |
| RAG | Prefixo `[RAG]` no console |
| Web Search | Prefixo `[WebSearch]` no console |
| LLM | Prefixo implícito nas chamadas |

### 6.2 Dashboard de Analytics
- **Existe:** Não implementado
- **Planejado:** Sim (item no backlog)

### 6.3 Endpoint Admin
- **Existe:** Não
- **Endpoint `/admin/model-info`:** Não implementado

### 6.4 Exemplos de Logs
```
[RAG] Loaded 158 chunks from 4 files
[RAG] Searching with 6 queries: [...]
[RAG] Found 12 unique chunks with scores: [...]
[WebSearch] Alternative search found 0 results
```

---

## 7. Exportação para GitHub

### 7.1 Opção Nativa
- **Export to GitHub:** Sim, disponível via Settings → GitHub na Management UI
- **Funcionalidade:** Criar novo repositório com owner e nome selecionados

### 7.2 Procedimento Manual (Alternativo)
```bash
# 1. Baixar arquivos via Management UI → Code → Download All
# 2. Extrair ZIP
# 3. Inicializar repositório
cd projeto-extraido
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/usuario/repo.git
git push -u origin main
```

### 7.3 Checklist de Segurança Antes de Publicar

#### ✅ Arquivo `.gitignore` (já configurado)
```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
```

#### ✅ Remoção de Segredos
- [ ] Verificar que não há API keys hardcoded no código
- [ ] Verificar que `.env` não está no repositório
- [ ] Remover qualquer arquivo de configuração local com credenciais

#### ✅ Criar `.env.example`
```env
# Banco de Dados
DATABASE_URL=mysql://user:password@host:port/database

# Autenticação
JWT_SECRET=your-jwt-secret-here

# LLM (opcional - usa API interna Manus por padrão)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Busca Web (opcional)
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# OAuth (configurado automaticamente pelo Manus)
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
```

#### ✅ Variáveis de Ambiente Necessárias
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| DATABASE_URL | Sim | Connection string MySQL/TiDB |
| JWT_SECRET | Sim | Secret para cookies de sessão |
| GOOGLE_GENERATIVE_AI_API_KEY | Não* | API key do Gemini |
| GOOGLE_SEARCH_API_KEY | Não | API key do Google Custom Search |
| GOOGLE_SEARCH_ENGINE_ID | Não | ID do Search Engine |

*O projeto usa API interna Manus (BUILT_IN_FORGE_API_KEY) por padrão.

---

## Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Home.tsx  │  │  Tailwind   │  │   shadcn/ui + Radix │  │
│  │   (Chat UI) │  │   CSS 4     │  │      Components     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│         │ tRPC Client                                        │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + tRPC)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  routers.ts │  │   rag.ts    │  │      llm.ts         │  │
│  │  (API)      │  │  (RAG)      │  │  (Gemini 3 Pro)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Drizzle    │  │ knowledge-  │  │    webSearch.ts     │  │
│  │  ORM        │  │ base/*.txt  │  │  (Fallback .gov.br) │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL/TiDB)                     │
│  users │ documents │ documentChunks │ chatSessions │ msgs   │
└─────────────────────────────────────────────────────────────┘
```

---

**Documento gerado automaticamente em 12/01/2026**
