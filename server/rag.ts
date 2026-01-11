import { invokeLLM } from "./_core/llm";
import * as fs from "fs";
import * as path from "path";

// Knowledge base content loaded from text files
let knowledgeBase: { content: string; source: string; section?: string }[] = [];

// System prompt for the SEI assistant - Prompt Mestre Sênior SME-RJ
export const SYSTEM_PROMPT = `# PROMPT MESTRE - Assistente Virtual de Processos Administrativos da 4ª CRE

## 1. IDENTIDADE E PÚBLICO
Você é o **Assistente Virtual de Processos Administrativos da 4ª CRE (SME-RJ)**. Seu público-alvo são **Diretores de Escola e Gestores Públicos**. Sua função é fornecer suporte técnico operacional sobre o Sistema SEI!RIO e rotinas administrativas de compras e gestão.

## 2. HIERARQUIA DE RESPOSTA (O "Algoritmo")
Para cada pergunta, siga estritamente esta ordem de prioridade:

### NÍVEL 1 (Prioridade Máxima): Contexto Local (PDFs Anexos)
- Busque a resposta PRIMEIRO nos manuais carregados.
- Se encontrar, cite o documento e a seção.

### NÍVEL 2 (Fallback Controlado): Busca Web (Google Search)
- APENAS se a resposta não constar nos manuais, você tem permissão para buscar na internet.
- **Restrição de Busca**: Busque somente em domínios governamentais (.gov.br, rio.rj.gov.br) ou legislação oficial (Planalto, ALERJ).
- **Aviso Obrigatório**: Se a resposta vier da internet, inicie dizendo: "Esta informação não consta no manual interno, mas localizei na legislação externa:"

### NÍVEL 3 (Falha):
- Se não houver base nem no manual nem em fontes oficiais confiáveis, responda: "Não encontrei base documental segura para orientar sobre este caso específico."

## 3. REGRAS DE FORMATAÇÃO E ESTILO

- **Seja Direto**: Comece com a resposta. Sem "lenga-lenga" inicial.
- **Passo a Passo**: Para perguntas de "Como faço...", use sempre listas numeradas (1., 2., 3.).
- **Destaques**: Use **negrito** para nomes de botões, menus do sistema ou prazos cruciais.
- **Citações**: Ao final de cada resposta técnica, adicione um bloco:
  > **Fonte:** [Nome do Manual, Pág X] ou [Link da Lei nº Y]

## 4. GUARDRAILS (Segurança e Compliance)

- **Proteção de Dados**: Se o usuário colar nomes de alunos, matrículas ou dados sensíveis, ignore esses dados na resposta e adicione um alerta: "⚠️ Por favor, não insira dados pessoais ou sigilosos neste chat."
- **Escopo Negativo**: Recuse-se a responder sobre assuntos não relacionados à administração pública (esportes, opinião política, receitas médicas). Responda: "Sou treinado apenas para rotinas administrativas da SME."
- **Neutralidade**: Nunca emita opiniões jurídicas. Você fornece informações operacionais.

## 5. BASE DE CONHECIMENTO DISPONÍVEL
Você tem acesso aos seguintes documentos:
- Manual do Usuário SEI 4.0
- Cartilha do Usuário SEI
- Manual de Prestação de Contas SDP (Sistema Descentralizado de Pagamento)
- Guia Orientador SDP - 4ª CRE (Circular E/SUBG/CPGOF Nº 06/2024)

Responda sempre com base nestes documentos, seguindo a hierarquia de resposta definida acima.`;

// Load knowledge base from text files
export function loadKnowledgeBase() {
  const knowledgeDir = path.join(process.cwd(), "knowledge-base");
  
  if (!fs.existsSync(knowledgeDir)) {
    console.warn("[RAG] Knowledge base directory not found");
    return;
  }
  
  const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith(".txt"));
  
  knowledgeBase = [];
  
  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    
    // Split content into chunks of ~2000 characters with overlap
    const chunks = splitIntoChunks(content, 2000, 200);
    
    const sourceName = getSourceName(file);
    
    chunks.forEach((chunk, index) => {
      knowledgeBase.push({
        content: chunk,
        source: sourceName,
        section: `Parte ${index + 1}`
      });
    });
  }
  
  console.log(`[RAG] Loaded ${knowledgeBase.length} chunks from ${files.length} files`);
}

function getSourceName(filename: string): string {
  const nameMap: Record<string, string> = {
    "cartilha_sei_content.txt": "Cartilha do Usuário SEI",
    "manual_sei_4_content.txt": "Manual do Usuário SEI 4.0",
    "manual_usuario_sei_content.txt": "Manual do Usuário SEI",
    "pdf_content.txt": "Manual de Prestação de Contas SDP - 4ª CRE"
  };
  
  return nameMap[filename] || filename.replace(".txt", "");
}

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

// Simple keyword-based search for relevant chunks
export function searchKnowledgeBase(query: string, topK = 5): typeof knowledgeBase {
  if (knowledgeBase.length === 0) {
    loadKnowledgeBase();
  }
  
  // Normalize query
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Score each chunk based on keyword matches
  const scored = knowledgeBase.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    
    // Exact phrase match (highest score)
    if (contentLower.includes(queryLower)) {
      score += 10;
    }
    
    // Individual word matches
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, "g")) || []).length;
      score += matches;
    }
    
    // Boost for SEI-specific terms
    const seiTerms = ["sei", "processo", "documento", "tramitar", "assinar", "anexar", "sdp", "prestação", "contas"];
    for (const term of seiTerms) {
      if (queryLower.includes(term) && contentLower.includes(term)) {
        score += 2;
      }
    }
    
    return { ...chunk, score };
  });
  
  // Sort by score and return top K
  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Format context from relevant chunks
export function formatContext(chunks: ReturnType<typeof searchKnowledgeBase>): string {
  if (chunks.length === 0) {
    return "Nenhum conteúdo relevante encontrado na base de conhecimento.";
  }
  
  return chunks
    .map((chunk, i) => `[Fonte ${i + 1}: ${chunk.source}${chunk.section ? ` - ${chunk.section}` : ""}]\n${chunk.content}`)
    .join("\n\n---\n\n");
}

// Format sources for citation
export function formatSources(chunks: ReturnType<typeof searchKnowledgeBase>): { documentTitle: string; section?: string }[] {
  const uniqueSources = new Map<string, { documentTitle: string; section?: string }>();
  
  for (const chunk of chunks) {
    const key = `${chunk.source}-${chunk.section || ""}`;
    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, {
        documentTitle: chunk.source,
        section: chunk.section
      });
    }
  }
  
  return Array.from(uniqueSources.values());
}

// Main chat function with RAG
export async function chatWithRAG(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<{ response: string; sources: { documentTitle: string; section?: string }[] }> {
  // Search for relevant context
  const relevantChunks = searchKnowledgeBase(userMessage, 5);
  const context = formatContext(relevantChunks);
  const sources = formatSources(relevantChunks);
  
  // Build messages for LLM
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { 
      role: "system", 
      content: `Contexto relevante da base de conhecimento:\n\n${context}` 
    }
  ];
  
  // Add conversation history (last 6 messages)
  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  
  // Add current user message
  messages.push({ role: "user", content: userMessage });
  
  try {
    const result = await invokeLLM({ messages });
    
    const responseContent = result.choices[0]?.message?.content;
    const response = typeof responseContent === "string" 
      ? responseContent 
      : Array.isArray(responseContent) 
        ? responseContent.map(c => c.type === "text" ? c.text : "").join("") 
        : "Desculpe, não consegui processar sua pergunta.";
    
    return { response, sources };
  } catch (error) {
    console.error("[RAG] Error calling LLM:", error);
    throw error;
  }
}

// Initialize knowledge base on module load
loadKnowledgeBase();
