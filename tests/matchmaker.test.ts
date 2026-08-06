import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Matchmaker } from '../server/Matchmaker';

vi.mock('@dimforge/rapier3d-compat', () => {
  const mockRapier = {
    init: vi.fn().mockResolvedValue({}),
    World: vi.fn().mockImplementation(function() {
      return {
        createRigidBody: vi.fn().mockReturnValue({ 
          setTranslation: vi.fn(), 
          setRotation: vi.fn(), 
          translation: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
          rotation: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, w: 1 }),
          handle: 0
        }),
        createCollider: vi.fn().mockReturnValue({ handle: 0 }),
        step: vi.fn(),
        createCharacterController: vi.fn().mockReturnValue({ 
          computeColliderMovement: vi.fn(), 
          getComputedMovement: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
          setUp: vi.fn(),
          setApplyImpulsesToDynamicBodies: vi.fn(),
          dirty: false
        }),
        removeRigidBody: vi.fn(),
        removeCollider: vi.fn(),
        castRay: vi.fn(),
      };
    }),
    Quaternion: vi.fn().mockImplementation(function() { return { x: 0, y: 0, z: 0, w: 1 }; }),
    Vector3: vi.fn().mockImplementation(function() { return { x: 0, y: 0, z: 0 }; }),
    RigidBodyDesc: { 
      dynamic: vi.fn().mockReturnThis(), 
      fixed: vi.fn().mockReturnThis(),
      kinematicPositionBased: vi.fn().mockReturnThis(),
      setTranslation: vi.fn().mockReturnThis() 
    },
    ColliderDesc: { 
      cuboid: vi.fn().mockReturnThis(), 
      ball: vi.fn().mockReturnThis(), 
      capsule: vi.fn().mockReturnThis(),
      setSensor: vi.fn().mockReturnThis(),
      setTranslation: vi.fn().mockReturnThis()
    },
  };
  return {
    default: mockRapier,
    ...mockRapier
  };
});

vi.mock('../server/MatchManager', () => ({
  default: {
    getOrCreateRoom: vi.fn().mockReturnValue({ 
      roomId: 'test-room',
      registerPlayer: vi.fn(),
      applyPlayerClassLoadout: vi.fn(),
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
    })
  },
  matchManager: {
    getOrCreateRoom: vi.fn().mockReturnValue({ 
      roomId: 'test-room',
      registerPlayer: vi.fn(),
      applyPlayerClassLoadout: vi.fn(),
      broadcastReliableEvent: vi.fn(),
      triggerStartMatch: vi.fn(),
    })
  }
}));

describe('Matchmaker Tests', () => {
  let matchmaker: Matchmaker;

  beforeEach(() => {
    vi.useFakeTimers();
    matchmaker = new Matchmaker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add and remove players from the pool', () => {
    const mockChannel = { emit: vi.fn() } as any;
    matchmaker.addPlayerToPool('user-1', 'req-1', mockChannel, 'map-1');
    
    expect(matchmaker.getQueueSizeForMap('map-1')).toBe(1);
    expect(mockChannel.emit).toHaveBeenCalledWith('reliable_event', expect.objectContaining({ type: 'MATCHMAKING_STATUS', status: 'QUEUED' }));

    matchmaker.removePlayerFromPool('user-1');
    expect(matchmaker.getQueueSizeForMap('map-1')).toBe(0);
  });

  it('should handle class changes for pending matches', () => {
    const mockChannel = { emit: vi.fn() } as any;
    // To get a pending match, we need to form one. 
    // We can add 10 players to trigger evaluatePool(mapId) -> formMatch
    for (let i = 0; i < 10; i++) {
      matchmaker.addPlayerToPool(`user-${i}`, `req-${i}`, mockChannel, 'map-1', 'ASSAULT');
    }
    
    // Check if match was formed (we mocked MatchManager.getOrCreateRoom to return { roomId: 'test-room' })
    // The matchId will be M_POOL_...
    // @ts-ignore
    const matchId = Array.from(matchmaker.pendingMatches.keys())[0];
    expect(matchId).toBeDefined();

    matchmaker.handlePlayerClassChange(matchId, 'user-0', 'MEDIC');
    
    // The room's applyPlayerClassLoadout should be called. 
    // Since we mocked the room in formMatch via MatchManager, we should verify it.
    // In Matchmaker.ts: targetRoom.registerPlayer(p.reqUid || p.id, p.channel, null, p.classId);
    // @ts-ignore
    const pending = matchmaker.pendingMatches.get(matchId);
    expect(pending.room.applyPlayerClassLoadout).toHaveBeenCalledWith('user-0', 'MEDIC');
  });
});
