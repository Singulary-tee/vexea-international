export interface ToolExecutionRecord {
  toolName: string;
  args: Record<string, any>;
  status: 'SUCCESS' | 'REJECTED';
  reason?: string;
  timestamp: number;
}

/**
 * LLMCommanderFeedback
 * Single-responsibility module managing execution feedback logs
 * for Gemini tool calls across LLM decision cycles.
 */
export class LLMCommanderFeedback {
  private executionBuffer: ToolExecutionRecord[] = [];
  private readonly maxHistory: number = 10;

  /**
   * Records the outcome of a tool execution attempt.
   */
  public recordResult(toolName: string, args: Record<string, any>, status: 'SUCCESS' | 'REJECTED', reason?: string): void {
    this.executionBuffer.push({
      toolName,
      args,
      status,
      reason,
      timestamp: Date.now()
    });

    if (this.executionBuffer.length > this.maxHistory) {
      this.executionBuffer.shift();
    }
  }

  /**
   * Clears the execution buffer (e.g. at match start).
   */
  public clear(): void {
    this.executionBuffer = [];
  }

  /**
   * Formats execution buffer records into a structured prompt block for Gemini.
   */
  public formatFeedbackPromptBlock(): string {
    if (this.executionBuffer.length === 0) {
      return "[PREVIOUS CYCLE TOOL EXECUTION RESULTS]\nNo tool calls executed in prior cycle.\n";
    }

    let block = "[PREVIOUS CYCLE TOOL EXECUTION RESULTS]\n";
    for (let i = 0; i < this.executionBuffer.length; i++) {
      const rec = this.executionBuffer[i];
      const argsSummary = JSON.stringify(rec.args);
      if (rec.status === 'SUCCESS') {
        block += `- [SUCCESS] ${rec.toolName}(${argsSummary})\n`;
      } else {
        block += `- [REJECTED] ${rec.toolName}(${argsSummary}): ${rec.reason || 'Operation rejected'}\n`;
      }
    }
    return block + "\n";
  }
}
