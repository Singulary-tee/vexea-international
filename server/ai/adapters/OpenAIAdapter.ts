import OpenAI from "openai";
import {
  CommanderAdapter,
  CommanderAdapterOptions,
  CommanderTool,
  NormalizedToolCall,
  TokenUsage,
} from "./CommanderAdapter";

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
    msg.includes("too many requests")
  );
}

export class OpenAIAdapter implements CommanderAdapter {
  public readonly family = "openai";
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.client = new OpenAI({
        apiKey: key,
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
      const key = process.env.OPENAI_API_KEY;
      if (key) {
        this.client = new OpenAI({
          apiKey: key,
        });
      }
    }

    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    const candidateModels = ["gpt-5", "gpt-4.5"];

    const formattedTools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    let response: any = null;
    let lastError: any = null;
    let usedModel = "";

    for (const modelName of candidateModels) {
      try {
        response = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: payload },
          ],
          tools: formattedTools.length > 0 ? formattedTools : undefined,
        });

        usedModel = modelName;
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (isRateLimitedError(err)) {
          console.warn(`[OpenAIAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          continue;
        }
        break;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const rawCalls = response.choices[0]?.message?.tool_calls || [];
    const calls: NormalizedToolCall[] = rawCalls.map((tc: any) => {
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments || {};
      } catch (e) {
        console.error(`[OpenAIAdapter] Failed to parse tool arguments for ${tc.function.name}:`, e);
      }
      return {
        name: tc.function.name,
        args: parsedArgs,
      };
    });

    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens ?? (promptTokens + completionTokens);

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
