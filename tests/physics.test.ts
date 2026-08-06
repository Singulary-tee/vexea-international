import { describe, it, expect, vi } from 'vitest';
import { PhysicsWorldManager } from '../server/physics/PhysicsWorldManager';
import RAPIER from '@dimforge/rapier3d-compat';

vi.mock('@dimforge/rapier3d-compat', () => {
  const mockWorld = {
    createRigidBody: vi.fn().mockReturnValue({ handle: 0 }),
    createCollider: vi.fn().mockReturnValue({ handle: 0 }),
    step: vi.fn(),
  };
  const mockRapier = {
    init: vi.fn().mockResolvedValue({}),
    World: vi.fn().mockImplementation(function() {
      return mockWorld;
    }),
    RigidBodyDesc: { 
      fixed: vi.fn().mockReturnThis()
    },
    ColliderDesc: { 
      cuboid: vi.fn().mockReturnThis(),
      setTranslation: vi.fn().mockReturnThis()
    },
  };
  return {
    default: mockRapier,
    World: mockRapier.World,
    RigidBodyDesc: mockRapier.RigidBodyDesc,
    ColliderDesc: mockRapier.ColliderDesc,
    init: mockRapier.init
  };
});

describe('PhysicsWorldManager Tests', () => {
  it('should initialize physics world and boundaries', () => {
    const spec = {
      buildings: [
        { position: { x: 10, y: 0, z: 10 }, size: { x: 5, y: 5, z: 5 } }
      ]
    };
    const manager = new PhysicsWorldManager(spec);
    manager.initPhysics();
    
    expect(RAPIER.World).toHaveBeenCalled();
    expect(RAPIER.RigidBodyDesc.fixed).toHaveBeenCalled();
    expect(RAPIER.ColliderDesc.cuboid).toHaveBeenCalled();
  });
});
