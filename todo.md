# Central de Inteligência SEI!RIO - TODO

## Estrutura Base
- [x] Configurar variáveis de ambiente para GOOGLE_GENERATIVE_AI_API_KEY
- [x] Copiar PDFs da base de conhecimento para o projeto

## Backend - Lógica RAG
- [x] Criar schema de banco para documentos e chunks
- [x] Implementar processamento de PDF (extração de texto e chunking)
- [x] Implementar geração de embeddings para chunks
- [x] Criar procedure tRPC para chat com RAG
- [x] Implementar busca vetorial nos chunks
- [x] Configurar integração com Gemini (google-gemini-1.5-flash)
- [ ] Implementar fallback para busca web (googleSearch)
- [x] Adicionar system prompt com instruções mestras

## Frontend - Landing Page
- [x] Criar design institucional (cores azul escuro/branco do SEI RIO)
- [x] Implementar header com logo e título
- [x] Criar seção hero com descrição do sistema
- [x] Implementar área de chat centralizada
- [x] Adicionar exemplos de perguntas prontas
- [x] Criar painel lateral de base de conhecimento
- [ ] Implementar funcionalidade de upload de PDF

## Chat Interface
- [x] Criar componente de chat com histórico
- [ ] Implementar streaming de respostas
- [x] Adicionar renderização de markdown nas respostas
- [x] Mostrar fontes consultadas nas respostas
- [x] Implementar loading states

## Testes
- [x] Criar testes para procedures do chat
- [x] Testar fluxo completo de RAG

## Atualização do Prompt Mestre
- [x] Implementar novo system prompt com hierarquia de resposta (Nível 1, 2, 3)
- [x] Adicionar regras de formatação e estilo (passo a passo, destaques, citações)
- [x] Implementar guardrails de segurança (proteção de dados, escopo negativo)
- [x] Atualizar identidade do assistente para 4ª CRE

## Correções RAG - Debug & Tuning
- [x] Implementar Multi-Query RAG com expansão automática de consultas
- [x] Classificar intenção da pergunta (CREATE_PROCESS, etc)
- [x] Gerar 3-6 consultas alternativas com sinônimos
- [x] Aumentar Top-K para 12 chunks
- [x] Aumentar tamanho dos chunks para 4000 caracteres com overlap de 500
- [x] Implementar dois passes antes de negar (original + expandida)
- [ ] Implementar fallback web obrigatório com Google Search
- [ ] Restringir busca web a domínios .gov.br
- [x] Atualizar System Prompt para "O Mentor do SEI"
- [x] Adicionar protocolo cognitivo (análise de intenção, tradução técnica)
- [x] Implementar formatação visual obrigatória (listas, negrito, itálico)
- [x] Adicionar dicas de ouro e antecipação de dúvidas

## Fallback de Busca Web
- [x] Criar serviço de busca web com Google Search API
- [x] Restringir busca a domínios governamentais (.gov.br, rio.rj.gov.br, planalto.gov.br)
- [x] Integrar fallback no fluxo RAG após dois passes sem resultado
- [x] Adicionar aviso obrigatório quando resposta vier da web
- [x] Testar fallback com perguntas fora do escopo dos manuais

## Diretrizes de Escopo e Fallback Web Governado (v2)
- [x] Implementar escopo definido: SEI/SEI!RIO, rotinas SME-RJ/4ª CRE, normas correlatas
- [x] Adicionar recusa controlada para temas fora do escopo (saúde, política, esportes)
- [x] Implementar modelo de recusa amigável com sugestão de reformulação
- [x] Atualizar critérios de disparo do web search (confiança baixa, pedido explícito, base normativa)
- [x] Implementar ranking de prioridade de fontes (oficial vs complementar)
- [x] Adicionar rótulo para fontes não oficiais (uso complementar)
- [x] Implementar conversão de perguntas parcialmente fora do escopo
- [x] Adicionar "mapa de navegação" para perguntas amplas
- [x] Citar links e artigos/trechos quando usar normas da web


## Upgrade de Inteligência e Humanização
- [x] Atualizar modelo para gemini-1.5-pro-latest (privilegiar qualidade sobre velocidade)
- [x] Ajustar temperature para 0.5 (equilíbrio precisão técnica e fluidez)
- [x] Adicionar camada de Empatia Cognitiva no system prompt
- [x] Implementar linguagem acolhedora (Entendo sua dúvida, Fique tranquilo)
- [x] Adicionar analogias didáticas antes de comandos técnicos
- [x] Explicar o PORQUÊ de cada ação, não apenas onde clicar


## Upgrade para Gemini 3
- [x] Atualizar modelo para gemini-3-pro-preview
- [x] Configurar thinking_level para 'high'
- [x] Implementar fallback para gemini-1.5-pro-latest em caso de erro
- [x] Testar funcionamento do novo modelo


## Melhorias de UX - Caixa de Input do Chat
- [x] Trocar input simples por textarea expansível
- [x] Aumentar altura mínima (min-h-[80px] ou rows={3})
- [x] Adicionar padding interno generoso (p-4)
- [x] Melhorar contraste com borda visível (border-2 border-slate-300)
- [x] Adicionar sombra suave (shadow-md)
- [x] Implementar estado de foco (focus:border-blue-600 focus:ring-2)
- [x] Garantir fundo branco puro (bg-white)
- [x] Posicionar botão de enviar dentro da caixa com destaque visual


## Notas de Governança e Ressalvas
- [x] Adicionar seção "Sobre este assistente" com texto de ferramenta em desenvolvimento
- [x] Adicionar seção "Ressalva" sobre caráter orientativo das respostas
- [x] Adicionar seção "Limites de atuação e governança" sobre escopo do conteúdo
- [x] Adicionar seção "Complemento por busca externa" sobre filtros de escopo
- [x] Ajustar rodapé para versão neutra ("Projeto em desenvolvimento pela 4ª CRE — Versão de testes")
- [x] Adicionar linha discreta "Uso interno orientativo — sujeito a validação por fontes oficiais"
- [x] Substituir "foi treinado" por "responde com base em" ou "foi alimentado com"
- [x] Remover menções institucionais oficiais (SME, Secretaria Municipal de Educação)
- [x] Manter apenas "4ª CRE" como unidade desenvolvedora
- [x] Usar termos neutros: "iniciativa interna", "projeto em testes", "ferramenta em desenvolvimento"


## Ajustes Estéticos e de Governança (v2)
- [x] Adicionar texto explícito "Este ambiente não constitui canal oficial..." em "Sobre este assistente"
- [x] Atualizar "Limites de atuação" com texto sobre documentação oficial SEI Federal e SEI!RIO
- [x] Atualizar "Busca externa" com texto sobre fontes .gov.br e indicação de links
- [x] Adicionar badge "Versão de testes (Beta)" no header
- [x] Aplicar alinhamento justificado em todos os textos do painel direito
- [x] Padronizar cards com verbos no infinitivo (Abrir, Anexar, Fazer, Consultar)
- [x] Adicionar feedback visual de clique nos cards (hover, sombra, cursor pointer)
- [x] Adicionar 2 exemplos avançados (Assinar/autenticar, Tramitar para outra unidade)
- [x] Adicionar "Base atualizada em: DD/MM/AAAA" na seção Base de Conhecimento
- [x] Aumentar line-height dos parágrafos do painel direito
- [x] Reduzir tamanho do texto de rodapé
- [x] Garantir consistência de títulos (mesmo peso e tamanho)


## Página de Relatório Técnico
- [x] Criar página dedicada /relatorio-tecnico com design profissional
- [x] Implementar navegação entre Home e Relatório Técnico
- [x] Aplicar design institucional consistente com o restante do site
- [x] Incluir todas as 7 seções do relatório com formatação visual
- [x] Adicionar diagrama de arquitetura visual
- [x] Implementar tabelas estilizadas para stack e configurações
- [x] Adicionar botão de impressão/download
- [x] Testar responsividade e salvar checkpoint


## Upgrade A: Ingestão de Documento DOCX
- [x] Implementar suporte a extração de texto de arquivos DOCX
- [x] Preservar headings (H1/H2/H3), listas e tabelas na extração
- [x] Normalizar texto (remover quebras duplicadas, manter títulos e numerações)
- [x] Configurar chunk size de 4000-6000 caracteres com overlap de 500
- [x] Adicionar metadados obrigatórios (source_title, source_type, section_path, updated_at)
- [x] Ingerir documento "ErrosnoSEI-RJCancelamentoeCorreção.docx"
- [ ] Exibir novo documento na UI Base de Conhecimento
- [ ] Criar teste automatizado para busca de termo exclusivo do DOCX

## Upgrade B: Protocolo de Web Fallback Aprimorado
- [x] Adicionar Regra de Ouro: NÃO INVENTAR no System Prompt
- [x] Adicionar Regra Anti-Confusão (SEI Federal vs SEI-Rio vs Processo.Rio)
- [x] Implementar gatilhos obrigatórios para busca web (perguntas comparativas, termos fora da base)
- [x] Adicionar formato de resposta com lacunas (indicar explicitamente o que não foi encontrado)
- [x] Testar com pergunta comparativa "diferença entre SEI-Rio e Processo.Rio"

## Transformação em Site Permanente (Produção)

### Fase 1: Configuração de Produção
- [x] Remover referências institucionais específicas (SME, CRE, SEI RIO)
- [x] Implementar fallback automático Gemini → Forge API
- [x] Corrigir validação de sessionId
- [ ] Configurar variáveis de ambiente de produção
- [ ] Implementar logging estruturado para monitoramento
- [ ] Configurar rate limiting e proteção contra abuso
- [ ] Implementar CORS e segurança de headers

### Fase 2: Persistência de Dados
- [x] Criar tabela de histórico de chats no banco de dados
- [x] Implementar salvar/carregar histórico de conversas
- [x] Adicionar timestamps e metadados de sessão
- [ ] Implementar limpeza automática de sessões antigas (>30 dias)
- [ ] Criar índices para performance de busca

### Fase 3: Otimização de Performance
- [ ] Implementar cache de respostas frequentes
- [ ] Otimizar queries de busca vetorial (HNSW)
- [ ] Implementar compressão de resposta (gzip)
- [ ] Adicionar lazy loading para documentos da base
- [ ] Otimizar bundle size do frontend

### Fase 4: SEO e Metadados
- [ ] Adicionar meta tags (title, description, og:image)
- [ ] Implementar sitemap.xml
- [ ] Adicionar robots.txt
- [ ] Implementar schema.org para rich snippets
- [ ] Configurar Google Analytics

### Fase 5: Funcionalidades Adicionais
- [ ] Implementar feedback de usuário (thumbs up/down)
- [ ] Adicionar exportação de conversa em PDF
- [ ] Implementar busca no histórico de chats
- [ ] Adicionar modo escuro/claro
- [ ] Implementar temas de cores customizáveis

### Fase 6: Documentação e Deploy
- [ ] Criar documentação técnica (README.md)
- [ ] Documentar API endpoints
- [ ] Criar guia de instalação e deployment
- [ ] Configurar CI/CD pipeline
- [ ] Criar checkpoint final
- [ ] Publicar site em produção

### Fase 7: Monitoramento Pós-Launch
- [ ] Configurar alertas de erro
- [ ] Implementar health checks
- [ ] Monitorar latência de resposta
- [ ] Coletar métricas de uso
- [ ] Planejar melhorias baseadas em feedback
