import { GoogleGenAI, Type } from "@google/genai";
import {
  CommanderAdapter,
  CommanderAdapterOptions,
  CommanderTool,
  NormalizedToolCall,
  TokenUsage,
} from "./CommanderAdapter";
import { serverFlagService } from "../../flags/flag-service";
import { ServerFeatureFlagKey } from "../../flags/server-flags";
import { Sentry } from "../../sentry";

function isRateLimitedError(err: any): boolean {
  const code = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.error?.message || err?.message || err).toLowerCase();
  return (
    code === 429 ||
    code === 503 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("throttled") ||
    msg.includes("too many requests") ||
    msg.includes("freetier")
  );
}

export class GeminiAdapter implements CommanderAdapter {
  public readonly family = "gemini";
  private client: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.client = new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
    }
  }

  public async execute(
    payload: string,
    systemInstructions: string,
    tools: CommanderTool[],
    options?: CommanderAdapterOptions
  ): Promise<{
    calls: NormalizedToolCall[];
    usage: TokenUsage;
    modelUsed: string;
  }> {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        this.client = new GoogleGenAI({
          apiKey: key,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });
      }
    }

    if (!this.client) {
      throw new Error("Gemini API key not configured");
    }

    const roomId = options?.roomId;
    const primaryModel = options?.primaryModel || await serverFlagService.getString(
      ServerFeatureFlagKey.LLM_PRIMARY_MODEL,
      { roomId },
      "gemini-3.5-flash"
    );
    const fallbackList = options?.fallbackModels || await serverFlagService.getObject<string[]>(
      ServerFeatureFlagKey.LLM_FALLBACK_MODELS,
      { roomId },
      ["gemini-3.6-flash", "gemini-3.1-flash"]
    );

    const candidateModels = [primaryModel, ...(Array.isArray(fallbackList) ? fallbackList : [])];
    const uniqueModels = Array.from(new Set(candidateModels));

    const maxOutputTokens = await serverFlagService.getNumber(
      ServerFeatureFlagKey.LLM_MAX_OUTPUT_TOKENS_PER_CYCLE,
      { roomId },
      800
    );

    // Convert tools to Gemini functionDeclarations format
    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: Type.OBJECT,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    }));

    let response: any = null;
    let lastError: any = null;
    let usedModel = "";

    for (const modelName of uniqueModels) {
      try {
        const modelCallFn = async () => {
          return await this.client!.models.generateContent({
            model: modelName,
            contents: payload,
            config: {
              systemInstruction: systemInstructions,
              tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
              maxOutputTokens,
            },
          });
        };

        const tracingEnabled = await serverFlagService.getBoolean(
          ServerFeatureFlagKey.SENTRY_LLM_TRACING,
          { roomId },
          true
        );

        if (tracingEnabled && typeof (Sentry as any).startSpan === "function") {
          response = await (Sentry as any).startSpan(
            {
              name: "gen_ai.chat_completions",
              op: "gen_ai.chat_completions",
              attributes: {
                "gen_ai.system": "google_genai",
                "gen_ai.request.model": modelName,
                "gen_ai.conversation.id": roomId || "",
              },
            },
            async (span: any) => {
              const res = await modelCallFn();
              if (span && res?.usageMetadata) {
                span.setAttribute("gen_ai.usage.prompt_tokens", res.usageMetadata.promptTokenCount || 0);
                span.setAttribute("gen_ai.usage.completion_tokens", res.usageMetadata.candidatesTokenCount || 0);
                span.setAttribute("gen_ai.usage.total_tokens", res.usageMetadata.totalTokenCount || 0);
                span.setAttribute("gen_ai.response.model", modelName);
              }
              return res;
            }
          );
        } else {
          response = await modelCallFn();
        }

        usedModel = modelName;
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (isRateLimitedError(err)) {
          console.warn(`[GeminiAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          Sentry.addBreadcrumb({
            category: "ai.fallback",
            message: `Rate limit encountered on ${modelName}`,
            level: "warning",
          });
          continue;
        }
        break;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const rawCalls = response?.functionCalls || [];
    const calls: NormalizedToolCall[] = rawCalls.map((fc: any) => ({
      name: fc.name,
      args: fc.args || {},
    }));

    const promptTokens = response?.usageMetadata?.promptTokenCount || 0;
    const completionTokens = response?.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = response?.usageMetadata?.totalTokenCount ?? (promptTokens + completionTokens);

    return {
      calls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      modelUsed: usedModel,
    };
  }
}
