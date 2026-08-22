import { CommanderAdapter } from "./CommanderAdapter";
import { GeminiAdapter } from "./GeminiAdapter";
import { KimiAdapter } from "./KimiAdapter";
import { ClaudeAdapter } from "./ClaudeAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";

export class AdapterFactory {
  static getAdapter(family: string, apiKey?: string): CommanderAdapter {
    switch (family?.toLowerCase()) {
      case "gemini":
        return new GeminiAdapter(apiKey);
      case "kimi":
        return new KimiAdapter(apiKey);
      case "claude":
        return new ClaudeAdapter(apiKey);
      case "openai":
        return new OpenAIAdapter(apiKey);
      default:
        return new GeminiAdapter(apiKey);
    }
  }

  static getAdapterByFamily(family: string, apiKey?: string): CommanderAdapter {
    switch (family?.toLowerCase()) {
      case "gemini":
        return new GeminiAdapter(apiKey);
      case "kimi":
        return new KimiAdapter(apiKey);
      case "claude":
        return new ClaudeAdapter(apiKey);
      case "openai":
        return new OpenAIAdapter(apiKey);
      default:
        return new GeminiAdapter(apiKey);
    }
  }
}
