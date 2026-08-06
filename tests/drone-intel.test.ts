import { describe, it, expect, vi } from 'vitest';
import { getMemoryThreeState, processDroneIntelligence } from '../server/ai/DroneIntelligence';
import { DroneType, DroneState } from '../shared/constants';

describe('Drone Intelligence Tests', () => {
  it('should return correct memory three-state based on confidence', () => {
    expect(getMemoryThreeState(1.0)).toBe('confirmed');
    expect(getMemoryThreeState(0.5)).toBe('last_seen');
    expect(getMemoryThreeState(0.1)).toBe('unknown');
  });

  it('should process drone intelligence and detect players in range', () => {
    const nowMs = Date.now();
    const drones: any[] = [
      {
        id: 'drone-1',
        type: DroneType.HUMANOID,
        state: DroneState.IDLE,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        memoryRecords: [],
      }
    ];

    const players = new Map<string, any>([
      ['player-1', {
        id: 'player-1',
        isAlive: true,
        body: {},
        posX: 0,
        posY: 0,
        posZ: 2,
      }]
    ]);

    const rapierWorld = {
      castRay: vi.fn().mockReturnValue(null),
    } as any;

    const RAPIER_MOD = {
      Ray: vi.fn(),
      QueryFilterFlags: { EXCLUDE_DYNAMIC: 1 },
    } as any;

    processDroneIntelligence(nowMs, drones, players, rapierWorld, RAPIER_MOD, 0.016, null);

    expect(drones[0].memoryRecords.length).toBeGreaterThan(0);
    const record = drones[0].memoryRecords[0];
    expect(record.entityId).toBe('player-1');
    expect(record.confidence).toBe(1.0);
    expect(drones[0].playerInFOV).toBe(true);
  });

  it('should decay confidence when player is not detected', () => {
    const nowMs = Date.now();
    const drones: any[] = [
      {
        id: 'drone-1',
        type: DroneType.HUMANOID,
        state: DroneState.IDLE,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        memoryRecords: [{
          entityId: 'player-1',
          lastSensedPosition: { x: 100, y: 100, z: 100 }, // far away
          timeLastSensed: (nowMs - 1000) / 1000,
          confidence: 0.8,
        }],
      }
    ];

    const players = new Map<string, any>([
      ['player-1', {
        id: 'player-1',
        isAlive: true,
        body: {},
        posX: 100,
        posY: 100,
        posZ: 100,
      }]
    ]);

    // Stage 1 will fail because it's too far (default humanoid sight is small)
    processDroneIntelligence(nowMs, drones, players, null, {} as any, 1.0, null);

    const record = drones[0].memoryRecords[0];
    expect(record.confidence).toBeLessThan(0.8);
  });
});
