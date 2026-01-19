import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { chatWithRAG, searchKnowledgeBase, loadKnowledgeBase } from "./rag";
import { 
  getAllDocuments, 
  addChatMessage, 
  getChatHistory,
  getOrCreateChatSession,
  getDb
} from "./db";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,

  // Chat router for RAG-based conversations
  chat: router({
    // Send a message and get AI response
    sendMessage: publicProcedure
      .input(z.object({
        message: z.string().min(1).max(5000),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const sessionId = input.sessionId || nanoid();
        
        try {
          // Get or create session
          await getOrCreateChatSession(sessionId, ctx.user?.id);
          
          // Get conversation history
          const historyMessages = await getChatHistory(sessionId, 10);
          const conversationHistory = historyMessages
            .reverse()
            .map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content
            }));
          
          // Save user message
          await addChatMessage({
            sessionId,
            role: "user",
            content: input.message,
            sources: null
          });
          
          // Get AI response with RAG
          const { response, sources, usedWebSearch } = await chatWithRAG(input.message, conversationHistory);
          
          // Save assistant response
          await addChatMessage({
            sessionId,
            role: "assistant",
            content: response,
            sources
          });
          
          return {
            sessionId,
            response,
            sources,
            usedWebSearch
          };
        } catch (error: any) {
          console.error("[Chat] Error:", error);
          
          // Retornar mensagem amigável em vez de erro genérico
          if (error.message?.includes("API_KEY") || error.message?.includes("not configured")) {
            return {
              sessionId: sessionId,
              response: "⚠️ **Configuração de IA não encontrada.**\n\nO serviço de inteligência artificial não está configurado corretamente. Por favor, configure a variável de ambiente `GOOGLE_GENERATIVE_AI_API_KEY` ou contate o administrador do sistema.",
              sources: [],
              usedWebSearch: false
            };
          }
          
          if (error.message?.includes("Database not available")) {
            return {
              sessionId: sessionId,
              response: "⚠️ **Banco de dados não disponível.**\n\nO sistema não conseguiu conectar ao banco de dados. Por favor, verifique se a variável `DATABASE_URL` está configurada corretamente.",
              sources: [],
              usedWebSearch: false
            };
          }
          
          // Erro genérico
          return {
            sessionId: sessionId,
            response: "⚠️ **Erro ao processar sua pergunta.**\n\nOcorreu um erro inesperado. Por favor, tente novamente em alguns instantes.",
            sources: [],
            usedWebSearch: false
          };
        }
      }),

    // Get chat history for a session
    getHistory: publicProcedure
      .input(z.object({
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const messages = await getChatHistory(input.sessionId, 50);
        return messages.reverse();
      }),

    // Create a new chat session
    createSession: publicProcedure
      .mutation(async ({ ctx }) => {
        const sessionId = nanoid();
        await getOrCreateChatSession(sessionId, ctx.user?.id);
        return { sessionId };
      }),
  }),

  // Documents router for knowledge base management
  documents: router({
    // List all indexed documents
    list: publicProcedure.query(async () => {
      return getAllDocuments();
    }),

    // Search knowledge base
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(5),
      }))
      .query(({ input }) => {
        const results = searchKnowledgeBase(input.query, input.limit);
        return results.map(r => ({
          content: r.content.slice(0, 500) + (r.content.length > 500 ? "..." : ""),
          source: r.source,
          section: r.section
        }));
      }),

    // Reload knowledge base
    reload: publicProcedure.mutation(() => {
      loadKnowledgeBase();
      return { success: true };
    }),
  }),

  // Health check router
  health: router({
    check: publicProcedure.query(async () => {
      const checks = {
        timestamp: new Date().toISOString(),
        status: "ok" as "ok" | "degraded" | "error",
        services: {
          database: false,
          knowledgeBase: false,
          aiService: false,
        },
        errors: [] as string[],
      };
      
      // Verificar banco de dados
      try {
        const db = await getDb();
        checks.services.database = db !== null;
        if (!db) checks.errors.push("DATABASE_URL not configured");
      } catch (e) {
        checks.errors.push("Database connection failed");
      }
      
      // Verificar knowledge base
      const kbResults = searchKnowledgeBase("test", 1);
      const kbLoaded = kbResults.length > 0;
      checks.services.knowledgeBase = kbLoaded;
      if (!kbLoaded) checks.errors.push("Knowledge base not loaded");
      
      // Verificar configuração de IA
      const hasAiKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY);
      checks.services.aiService = hasAiKey;
      if (!hasAiKey) checks.errors.push("AI API key not configured");
      
      // Determinar status geral
      if (checks.errors.length === 0) {
        checks.status = "ok";
      } else if (checks.services.aiService) {
        checks.status = "degraded";
      } else {
        checks.status = "error";
      }
      
      return checks;
    }),
  }),
});

export type AppRouter = typeof appRouter;
