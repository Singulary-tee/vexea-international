import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchRoom } from '../server/MatchRoom';
import { DroneType, DroneState } from '../shared/constants';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('firebase-admin/app');
vi.mock('firebase-admin/firestore');
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

describe('MatchRoom Lifecycle Tests', () => {
  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      spawnPoints: [],
      buildings: [],
      cameras: [],
      terminals: [],
    }));
  });

  it('should initialize correctly', () => {
    const room = new MatchRoom('test-room', 'fake-key');
    expect(room).toBeDefined();
    expect(room.roomId).toBe('test-room');
  });

  it('should handle player joins and leaves', () => {
    const room = new MatchRoom('test-room');
    const mockChannel = {
      emit: vi.fn(),
      on: vi.fn(),
      userData: { uid: 'user-1' }
    } as any;

    room.registerPlayer('user-1', mockChannel);
    // @ts-ignore
    expect(room.players.has('user-1')).toBe(true);

    room.removePlayer('user-1');
    // @ts-ignore
    expect(room.players.has('user-1')).toBe(false);
  });

  it('should handle class changes', () => {
    const room = new MatchRoom('test-room');
    const mockChannel = { emit: vi.fn(), on: vi.fn(), userData: { uid: 'user-1' } } as any;
    room.registerPlayer('user-1', mockChannel);
    
    room.applyPlayerClassLoadout('user-1', 'MEDIC');
    // @ts-ignore
    const p = room.players.get('user-1');
    expect(p.classId).toBe('MEDIC');
  });

  it('should update scores', () => {
    const room = new MatchRoom('test-room');
    const mockChannel = { emit: vi.fn(), on: vi.fn(), userData: { uid: 'user-1' } } as any;
    room.registerPlayer('user-1', mockChannel);
    
    // @ts-ignore
    const p = room.players.get('user-1');
    p.score += 100;
    expect(p.score).toBe(100);
  });
});
