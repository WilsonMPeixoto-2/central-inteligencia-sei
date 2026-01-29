import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};
export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const content = ensureArray(message.content).map(normalizeContentPart);

  return {
    role,
    content,
    name,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): ToolChoice | undefined => {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const assertApiKey = () => {
  if (!ENV.googleGenerativeAiApiKey && !ENV.forgeApiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY or BUILT_IN_FORGE_API_KEY is not configured");
  }
};

const shouldUseGeminiDirect = () => {
  return ENV.googleGenerativeAiApiKey && ENV.googleGenerativeAiApiKey.trim().length > 0;
};

// Convert OpenAI-style messages to Gemini format
const convertMessagesToGemini = (messages: Message[]): Content[] => {
  const geminiContents: Content[] = [];
  
  for (const msg of messages) {
    // Skip system messages for now - they will be handled separately
    if (msg.role === "system") continue;
    
    // Map roles: user -> user, assistant -> model
    const role = msg.role === "assistant" ? "model" : "user";
    
    const parts: Part[] = [];
    const contentArray = ensureArray(msg.content);
    
    for (const contentPart of contentArray) {
      if (typeof contentPart === "string") {
        parts.push({ text: contentPart });
      } else if (contentPart.type === "text") {
        parts.push({ text: contentPart.text });
      } else if (contentPart.type === "image_url") {
        // For images, we need base64 data
        // Note: Gemini expects inline data or file references
        console.warn("[LLM] Image content not fully supported in Gemini conversion");
        parts.push({ text: "[Image content]" });
      } else if (contentPart.type === "file_url") {
        console.warn("[LLM] File content not fully supported in Gemini conversion");
        parts.push({ text: "[File content]" });
      }
    }
    
    if (parts.length > 0) {
      geminiContents.push({ role, parts });
    }
  }
  
  return geminiContents;
};

// Invoke LLM using Google Gemini SDK directly
async function invokeGeminiDirect(params: InvokeParams): Promise<InvokeResult> {
  const genAI = new GoogleGenerativeAI(ENV.googleGenerativeAiApiKey);
  
  // Use gemini-2.0-flash as the primary model
  const modelName = "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const { messages } = params;
  
  // Extract system message if present
  const systemMessages = messages.filter(m => m.role === "system");
  let systemInstruction = "";
  if (systemMessages.length > 0) {
    systemInstruction = systemMessages.map(m => {
      const content = ensureArray(m.content);
      return content.map(c => typeof c === "string" ? c : c.type === "text" ? c.text : "").join("\n");
    }).join("\n\n");
  }
  
  // Convert remaining messages to Gemini format
  const geminiContents = convertMessagesToGemini(messages);
  
  if (geminiContents.length === 0) {
    throw new Error("No messages to send to Gemini API");
  }
  
  try {
    // For simplicity, use generateContent instead of chat for single messages
    // This avoids issues with chat history and system instructions
    const allParts: Part[] = [];
    
    // Add system instruction as first text if present
    if (systemInstruction) {
      allParts.push({ text: `System: ${systemInstruction}\n\n` });
    }
    
    // Add all messages
    for (const content of geminiContents) {
      if (content.role === "user") {
        allParts.push({ text: "User: " });
      } else if (content.role === "model") {
        allParts.push({ text: "Assistant: " });
      }
      allParts.push(...content.parts);
      allParts.push({ text: "\n\n" });
    }
    
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: allParts,
      }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 8192,
      },
    });
    
    const response = result.response;
    const text = response.text();
    
    // Convert Gemini response to OpenAI-compatible format
    return {
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: text,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } catch (error: any) {
    console.error("[LLM] Gemini API error:", error);
    throw new Error(`Gemini API error: ${error.message || "Unknown error"}`);
  }
}

// Legacy implementation using Manus Forge proxy
const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

async function invokeForgeProxy(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const PRIMARY_MODEL = "gemini-3-5-sonnet";
  const FALLBACK_MODEL = "gemini-1.5-pro-latest";

  const normalizedMessages = messages.map(normalizeMessage);
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);

  const buildPayload = (model: string) => {
    const payload: any = {
      model,
      messages: normalizedMessages,
      temperature: 0.7,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools.map(tool => ({
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description || "",
          parameters: tool.function.parameters || { type: "object", properties: {} },
        },
      }));

      if (normalizedToolChoice) {
        payload.tool_choice = normalizedToolChoice;
      }
    }

    const normalizedResponseFormat = normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema,
    });

    if (normalizedResponseFormat) {
      payload.response_format = normalizedResponseFormat;
    }

    return payload;
  };

  // Tenta primeiro com o modelo primário (Gemini 3)
  let response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(buildPayload(PRIMARY_MODEL)),
  });

  // Se falhar com erro de cota/disponibilidade, tenta o fallback
  if (!response.ok) {
    const errorText = await response.text();
    const isQuotaOrAvailabilityError = 
      response.status === 429 || // Rate limit / quota exceeded
      response.status === 503 || // Service unavailable
      response.status === 500 || // Internal server error
      errorText.toLowerCase().includes("quota") ||
      errorText.toLowerCase().includes("unavailable") ||
      errorText.toLowerCase().includes("capacity");

    if (isQuotaOrAvailabilityError) {
      console.log(`[LLM] Gemini 3 indisponível (${response.status}), usando fallback gemini-1.5-pro-latest`);
      
      response = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(buildPayload(FALLBACK_MODEL)),
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[LLM] API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Handle error response from API
  if (data.error) {
    throw new Error(`[LLM] API error: ${data.error.message}`);
  }

  // Transform Forge response to standard format
  const choices = data.choices.map((choice: any) => ({
    index: choice.index,
    message: {
      role: choice.message.role,
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    },
    finish_reason: choice.finish_reason,
  }));

  return {
    id: data.id,
    created: data.created,
    model: data.model,
    choices,
    usage: data.usage,
  };
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

import { ENV } from "./env";

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  // Use direct Gemini integration if API key is available
  if (shouldUseGeminiDirect()) {
    console.log("[LLM] Using direct Google Gemini API");
    try {
      return await invokeGeminiDirect(params);
    } catch (error: any) {
      // If Gemini fails due to quota or availability, fallback to Forge
      const errorMessage = error.message || "";
      const isQuotaError = errorMessage.includes("429") || 
                          errorMessage.includes("quota") ||
                          errorMessage.includes("exceeded") ||
                          errorMessage.includes("Too Many Requests");
      
      if (isQuotaError && ENV.forgeApiKey) {
        console.warn("[LLM] Gemini API quota exceeded, falling back to Forge proxy");
        return invokeForgeProxy(params);
      }
      
      throw error;
    }
  }

  // Fallback to Forge proxy if Gemini key not available
  console.log("[LLM] Using Manus Forge proxy");
  return invokeForgeProxy(params);
}
