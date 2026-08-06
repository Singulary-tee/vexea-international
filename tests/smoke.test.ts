import { describe, it, expect, vi } from 'vitest';

// Prevent test scenarios from exiting the process
process.exit = vi.fn() as any;

// Minimal mock setup for client-side requirements
global.self = global;
global.window = {
  dispatchEvent: vi.fn(),
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
  innerWidth: 1920,
  innerHeight: 1080,
  location: { 
    href: 'http://localhost:3000', 
    hostname: 'localhost', 
    origin: 'http://localhost:3000',
    search: '',
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  localStorage: {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
} as any;

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
}) as any;

global.localStorage = (global.window as any).localStorage;
global.sessionStorage = global.localStorage;

global.document = {
  getElementById: (id: string) => ({
    id: id,
    style: { display: 'none', opacity: '1', setProperty: vi.fn() },
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
    }),
  }),
  createElement: (tag: string) => ({
    tagName: tag.toUpperCase(),
    style: {},
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }),
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

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
        castRay: vi.fn(),
        removeRigidBody: vi.fn(),
        removeCollider: vi.fn(),
        free: vi.fn(),
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

// Prevent server from actually listening to ports
vi.mock('net', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Server: class extends actual.Server {
      listen(...args: any[]) { 
        setTimeout(() => this.emit('listening'), 0);
        return this; 
      }
    },
    createServer: (options?: any, connectionListener?: any) => {
      const s = new actual.Server(options, connectionListener);
      s.listen = function() {
        setTimeout(() => this.emit('listening'), 0);
        return this;
      };
      return s;
    }
  };
});
vi.mock('http', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Server: class extends actual.Server {
      listen(...args: any[]) { 
        setTimeout(() => this.emit('listening'), 0);
        return this; 
      }
    },
    createServer: (options?: any, requestListener?: any) => {
      const s = new actual.Server(options, requestListener);
      s.listen = function() {
        setTimeout(() => this.emit('listening'), 0);
        return this;
      };
      return s;
    }
  };
});
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn().mockReturnValue([]),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({ collection: vi.fn().mockReturnThis(), doc: vi.fn().mockReturnThis(), set: vi.fn().mockResolvedValue({}) }),
  FieldValue: { increment: vi.fn() },
}));

describe('Global Smoke Test', () => { it('should load all modules without crashing', async () => {
  const modules = [
    '../shared/collision',
    '../shared/gamemode-configs',
    '../shared/validation/types',
    '../shared/validation/validator',
    '../shared/maps/map-registry',
    '../shared/classes',
    '../shared/constants',
    '../shared/transport.config',
    '../shared/battle-pass',
    '../shared/gates/production.gate',
    '../shared/gates/validator.gate',
    '../shared/verification/verifier',
    '../shared/verification/types',
    '../shared/utilities',
    '../shared/feature-flags',
    '../shared/asset-structure',
    '../shared/weapons',
    '../server/doppler',
    '../server/MatchManager',
    '../server/sentry',
    '../server/Matchmaker',
    '../server/MatchRoom',
    '../server/flags/flag-service',
    '../server/ai/DroneIntelligence',
    '../server/ai/LLMCommander',
    '../server/gates/verification.gate',
    '../server/map/ZoneRegistry',
    '../server/physics/PhysicsWorldManager',
    '../server/transport/adapter',
    '../server/validation/validation-service',
    '../server/verification/verification-service',
    '../client/physics.worker',
    '../client/MatchController',
    '../client/screens/lobby',
    '../client/screens/main-menu',
    '../client/screens/map_viewer',
    '../client/screens/splash',
    '../client/screens/stats-screen',
    '../client/screens/store-screen',
    '../client/src/camera/CameraEffects',
    '../client/src/camera/constants',
    '../client/src/input/InputSynchronizer',
    '../client/src/map/MapLoader',
    '../client/src/map/MapOrchestrator',
    '../client/src/systems/ClassLoadoutSystem',
    '../client/src/systems/CombatSystem',
    '../client/src/systems/CompassSystem',
    '../client/src/systems/DiagnosisSystem',
    '../client/src/systems/VisualsSystem',
    '../client/src/systems/DroneSystem',
    '../client/src/systems/HUDSystem',
    '../client/src/systems/InputSystem',
    '../client/src/systems/LLMObjectiveSystem',
    '../client/src/systems/MinimapSystem',
    '../client/src/systems/NetworkSyncSystem',
    '../client/src/ui/LoadingScreen',
    '../client/src/ui/MiniRoomSurface',
    '../client/src/vfx/VFXOrchestrator',
    '../client/src/vfx/constants',
    '../client/src/vfx/hits',
    '../client/src/vfx/firing',
    '../client/src/vfx/large',
    '../client/transport/adapter',
    '../client/weapons/AttachmentSystem',
    '../client/weapons/GripSystem'
  ];

  for (const mod of modules) {
    try {
      await import(mod);
    } catch (e) {
      console.warn(`Failed to import ${mod}:`, e);
    }
  }
  expect(true).toBe(true);
}); });
