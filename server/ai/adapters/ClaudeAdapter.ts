import Anthropic from "@anthropic-ai/sdk";
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

export class ClaudeAdapter implements CommanderAdapter {
  public readonly family = "claude";
  private client: Anthropic | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new Anthropic({
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
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) {
        this.client = new Anthropic({
          apiKey: key,
        });
      }
    }

    if (!this.client) {
      throw new Error("Anthropic API key not configured");
    }

    const candidateModels = [
      "claude-opus-4",
      "claude-sonnet-4",
      "claude-haiku-4",
    ];

    // Flat tool translation format (input_schema, NO type: "function", NO parameters field)
    const formattedTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: "object" as const,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    }));

    let response: any = null;
    let lastError: any = null;
    let usedModel = "";

    for (const modelName of candidateModels) {
      try {
        response = await this.client.messages.create({
          model: modelName,
          max_tokens: 1024,
          system: systemInstructions,
          messages: [{ role: "user", content: payload }],
          tools: formattedTools.length > 0 ? formattedTools : undefined,
        });

        usedModel = modelName;
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (isRateLimitedError(err)) {
          console.warn(`[ClaudeAdapter] Model '${modelName}' rate limited. Attempting fallback model...`);
          continue;
        }
        break;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const toolUseBlocks = (response.content || []).filter(
      (block: any) => block.type === "tool_use"
    );

    const calls: NormalizedToolCall[] = toolUseBlocks.map((block: any) => ({
      name: block.name,
      args: block.input || {},
    }));

    const promptTokens = response.usage?.input_tokens || 0;
    const completionTokens = response.usage?.output_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

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
