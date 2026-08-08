export interface CommanderTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export interface NormalizedToolCall {
  name: string;
  args: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CommanderAdapterOptions {
  roomId?: string;
  primaryModel?: string;
  fallbackModels?: string[];
}

export interface CommanderAdapter {
  readonly family: string;
  execute(
    payload: string,
    systemInstructions: string,
    tools: CommanderTool[],
    options?: CommanderAdapterOptions
  ): Promise<{
    calls: NormalizedToolCall[];
    usage: TokenUsage;
    modelUsed: string;
  }>;
}
