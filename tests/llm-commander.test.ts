import { describe, it, expect, vi } from 'vitest';
import { LLMCommander } from '../server/ai/LLMCommander';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify([{ type: 'Move', droneId: 'd1', target: { x: 10, y: 0, z: 10 } }])
          }
        })
      };
    }
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER' }
}));

describe('LLMCommander Tests', () => {
  it('should generate strategic commands via executeLLMStep', async () => {
    // We need a real room or a good mock
    const room = {
      roomId: 'test-room',
      llmTokensUsedThisMatch: 0,
      commanderAP: 0,
      apiCallCount: 0,
      matchStartTime: Date.now(),
      outstandingOrders: new Map(),
      zoneSummary: {},
      failedOperations: [],
      broadcastReliableEvent: vi.fn(),
      offlineSystemFallbackAI: vi.fn(),
      drones: []
    } as any;
    
    const commander = new LLMCommander(room, 'fake-key');
    await commander.executeLLMStep();
    
    expect(room.apiCallCount).toBe(1);
  });

  it('should respect token budget', async () => {
     const room = {
       roomId: 'test-room',
       llmTokensUsedThisMatch: 60000,
       offlineSystemFallbackAI: vi.fn()
     } as any;
     const commander = new LLMCommander(room, 'fake-key');
     await commander.executeLLMStep();
     expect(room.offlineSystemFallbackAI).toHaveBeenCalled();
  });
});
