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

  it('should track and decrement hold_position order duration cycles', async () => {
    const outstandingOrders = new Map<string, any>();
    outstandingOrders.set('ALPHA', {
      targetZone: 'HQ',
      cyclesOutstanding: 0,
      holdRemainingCycles: 2, // 2 cycles left
    });

    const room = {
      roomId: 'test-room',
      llmTokensUsedThisMatch: 0,
      commanderAP: 0,
      apiCallCount: 0,
      matchStartTime: Date.now(),
      outstandingOrders,
      drones: [{ groupId: 'ALPHA', zone: 'HQ', state: 1 }],
      players: new Map(),
      failedOperations: [],
      zoneSummary: { HQ: { dronesByGroup: { ALPHA: 1 } } },
      broadcastReliableEvent: vi.fn(),
      offlineSystemFallbackAI: vi.fn()
    } as any;

    const commander = new LLMCommander(room, 'fake-key');
    await commander.executeLLMStep();

    // After 1 step, remaining cycles should be decremented to 1
    expect(outstandingOrders.get('ALPHA')?.holdRemainingCycles).toBe(1);

    // Step 2
    await commander.executeLLMStep();
    // Reached 0 -> order resolved and deleted
    expect(outstandingOrders.has('ALPHA')).toBe(false);
  });
});

