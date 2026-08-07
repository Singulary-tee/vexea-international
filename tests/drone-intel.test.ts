import { describe, it, expect, vi } from 'vitest';
import { getMemoryThreeState, processDroneIntelligence } from '../server/ai/DroneIntelligence';
import { calculateDroneAvoidance } from '../server/ai/DroneAvoidance';
import { DroneType, DroneState } from '../shared/constants';

describe('Drone Intelligence & Perception Tests', () => {
  it('should return correct memory three-state based on confidence', () => {
    expect(getMemoryThreeState(1.0)).toBe('confirmed');
    expect(getMemoryThreeState(0.75)).toBe('last_seen');
    expect(getMemoryThreeState(0.5)).toBe('last_seen');
    expect(getMemoryThreeState(0.1)).toBe('unknown');
  });

  it('should process drone intelligence and grant optical sight confidence 1.0 (confirmed) when in FOV and LOS', () => {
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
    expect(record.confidence).toBe(1.0); // Optical sight -> confirmed
    expect(getMemoryThreeState(record.confidence)).toBe('confirmed');
    expect(drones[0].playerInFOV).toBe(true);
  });

  it('should isolate sound perception from sight and cap confidence at 0.75 (last_seen)', () => {
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
        rotW: 1, // Facing forward (+Z)
        memoryRecords: [],
      }
    ];

    // Player behind drone (-Z), out of vision cone, but fired weapon this tick
    const players = new Map<string, any>([
      ['player-1', {
        id: 'player-1',
        isAlive: true,
        body: {},
        posX: 0,
        posY: 0,
        posZ: -3,
        firedThisTick: true,
      }]
    ]);

    processDroneIntelligence(nowMs, drones, players, null, {} as any, 0.016, null);

    expect(drones[0].memoryRecords.length).toBe(1);
    const record = drones[0].memoryRecords[0];
    expect(record.entityId).toBe('player-1');
    expect(record.confidence).toBe(0.75); // Sound perception capped at 0.75
    expect(getMemoryThreeState(record.confidence)).toBe('last_seen'); // NOT 'confirmed'
    expect(drones[0].playerInFOV).toBe(false);
  });

  it('should calculate drone avoidance potential field vector away from nearby drones', () => {
    const droneA: any = { id: 'd1', type: DroneType.HUMANOID, state: DroneState.IDLE, posX: 0, posZ: 0 };
    const droneB: any = { id: 'd2', type: DroneType.HUMANOID, state: DroneState.IDLE, posX: 1, posZ: 0 }; // Close on +X

    const avoidance = calculateDroneAvoidance(droneA, [droneA, droneB]);

    // Force on droneA should point away from droneB (towards -X)
    expect(avoidance.avoidX).toBeLessThan(0);
    expect(avoidance.avoidZ).toBeCloseTo(0, 1);
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
          lastSensedPosition: { x: 100, y: 100, z: 100 },
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

    processDroneIntelligence(nowMs, drones, players, null, {} as any, 1.0, null);

    const record = drones[0].memoryRecords[0];
    expect(record.confidence).toBeLessThan(0.8);
  });
});

