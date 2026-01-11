import axios from "axios";

// ============================================================================
// SERVIÇO DE BUSCA WEB - Fallback para domínios governamentais
// ============================================================================

// Domínios governamentais permitidos para busca
const ALLOWED_DOMAINS = [
  "gov.br",
  "rio.rj.gov.br",
  "planalto.gov.br",
  "alerj.rj.gov.br",
  "camara.leg.br",
  "senado.leg.br",
  "tcu.gov.br",
  "cgu.gov.br",
  "educacao.rj.gov.br",
  "sme.rio.rj.gov.br",
];

// Interface para resultados de busca
export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

// Interface para resposta formatada
export interface WebSearchResponse {
  success: boolean;
  results: WebSearchResult[];
  query: string;
  error?: string;
}

/**
 * Realiza busca web usando a API do Google Custom Search
 * Restrita a domínios governamentais brasileiros
 */
export async function searchGovernmentSites(
  query: string,
  maxResults = 5
): Promise<WebSearchResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // Se não tiver as credenciais, usar busca alternativa via scraping
  if (!apiKey || !searchEngineId) {
    console.log("[WebSearch] API keys not configured, using alternative search");
    return await alternativeSearch(query, maxResults);
  }

  try {
    // Adicionar restrição de site à query
    const siteRestriction = ALLOWED_DOMAINS.map(d => `site:${d}`).join(" OR ");
    const restrictedQuery = `${query} (${siteRestriction})`;

    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: restrictedQuery,
          num: maxResults,
          lr: "lang_pt", // Resultados em português
          gl: "br", // Resultados do Brasil
        },
      }
    );

    const items = response.data.items || [];
    const results: WebSearchResult[] = items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: extractDomain(item.link),
    }));

    console.log(`[WebSearch] Found ${results.length} results for: ${query}`);
    return {
      success: true,
      results,
      query,
    };
  } catch (error: any) {
    console.error("[WebSearch] Error:", error.message);
    return {
      success: false,
      results: [],
      query,
      error: error.message,
    };
  }
}

/**
 * Busca alternativa usando DuckDuckGo (não requer API key)
 * Mais limitada mas funciona sem configuração
 */
async function alternativeSearch(
  query: string,
  maxResults = 5
): Promise<WebSearchResponse> {
  try {
    // Usar DuckDuckGo Instant Answer API (limitada mas gratuita)
    const siteRestriction = "site:gov.br OR site:rio.rj.gov.br";
    const searchQuery = encodeURIComponent(`${query} ${siteRestriction}`);
    
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_html=1`,
      { timeout: 5000 }
    );

    const results: WebSearchResult[] = [];
    
    // Extrair resultados do DuckDuckGo
    if (response.data.AbstractText) {
      results.push({
        title: response.data.Heading || "Resultado",
        link: response.data.AbstractURL || "",
        snippet: response.data.AbstractText,
        source: response.data.AbstractSource || "DuckDuckGo",
      });
    }

    // Adicionar resultados relacionados
    if (response.data.RelatedTopics) {
      for (const topic of response.data.RelatedTopics.slice(0, maxResults - 1)) {
        if (topic.Text && topic.FirstURL) {
          // Filtrar apenas domínios governamentais
          if (isGovernmentDomain(topic.FirstURL)) {
            results.push({
              title: topic.Text.split(" - ")[0] || topic.Text,
              link: topic.FirstURL,
              snippet: topic.Text,
              source: extractDomain(topic.FirstURL),
            });
          }
        }
      }
    }

    console.log(`[WebSearch] Alternative search found ${results.length} results`);
    return {
      success: results.length > 0,
      results: results.slice(0, maxResults),
      query,
    };
  } catch (error: any) {
    console.error("[WebSearch] Alternative search error:", error.message);
    return {
      success: false,
      results: [],
      query,
      error: error.message,
    };
  }
}

/**
 * Verifica se a URL é de um domínio governamental permitido
 */
function isGovernmentDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Extrai o domínio de uma URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Formata os resultados da busca web para incluir no contexto do LLM
 */
export function formatWebSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) {
    return "";
  }

  const formattedResults = results
    .map((r, i) => `[Fonte Web ${i + 1}: ${r.source}]\nTítulo: ${r.title}\nLink: ${r.link}\nResumo: ${r.snippet}`)
    .join("\n\n---\n\n");

  return `\n\n## INFORMAÇÕES ENCONTRADAS NA WEB (Domínios Governamentais)\n\n${formattedResults}`;
}

/**
 * Formata as fontes web para exibição
 */
export function formatWebSources(results: WebSearchResult[]): { documentTitle: string; link: string }[] {
  return results.map(r => ({
    documentTitle: `[Web] ${r.title}`,
    link: r.link,
  }));
}
