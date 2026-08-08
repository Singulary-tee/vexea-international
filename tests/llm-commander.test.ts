import { describe, it, expect, vi } from 'vitest';
import { LLMCommander } from '../server/ai/LLMCommander';
import { StrategyBriefStore } from '../server/ai/strategy/StrategyBriefStore';

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

  it('should generate valid default brief format for map_1_facility', async () => {
    const brief = await StrategyBriefStore.ensureDefaultBrief('map_1_facility');
    expect(brief.mapId).toBe('map_1_facility');
    expect(brief.content).toContain('[STRATEGY BRIEF — Facility]');
    expect(brief.content).toContain('AP ECONOMY:');
    expect(brief.content).toContain('ZONE PRIORITY:');
    expect(brief.content).toContain('UNIT COMPOSITION:');
    expect(brief.content).toContain('COUNTER-UTILITY:');
    expect(brief.content).toContain('ENDGAME:');
    expect(brief.content).toContain('No validated heuristics yet.');
  });

  it('should load strategy brief once per match in LLMCommander', async () => {
    const room = {
      roomId: 'test-room-brief',
      mapId: 'map_1_facility',
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
    expect(commander.isStrategyBriefLoaded).toBe(false);
    await commander.executeLLMStep();
    expect(commander.isStrategyBriefLoaded).toBe(true);
    expect(commander.loadedStrategyBrief).toBeDefined();
  });
});

