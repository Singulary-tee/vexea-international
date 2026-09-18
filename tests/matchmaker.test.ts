import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Matchmaker } from '../server/Matchmaker';
import { roomAllocator } from '../server/execution/RoomAllocator';
import { ForkedRoomExecution } from '../server/execution/ForkedRoomExecution';
import { InProcessRoomExecution } from '../server/execution/InProcessRoomExecution';
import { connectionRegistry } from '../server/connection-registry';

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
      }),
    deleteRoom: vi.fn(),
  },
  matchManager: {
      getOrCreateRoom: vi.fn().mockReturnValue({
        roomId: 'test-room',
        registerPlayer: vi.fn(),
        applyPlayerClassLoadout: vi.fn(),
        broadcastReliableEvent: vi.fn(),
        triggerStartMatch: vi.fn(),
      }),
    deleteRoom: vi.fn(),
  }
}));

describe('Matchmaker Tests', () => {
  let matchmaker: Matchmaker;

  beforeEach(() => {
    vi.useFakeTimers();
    matchmaker = new Matchmaker();
  });

  afterEach(() => {
    matchmaker.shutdown();
    vi.restoreAllMocks();
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

  it('does not queue the same stable UID on a new transport', async () => {
    const firstChannel = { emit: vi.fn() } as any;
    const secondChannel = { emit: vi.fn() } as any;

    await matchmaker.addPlayerToPool('transport-1', 'stable-uid', firstChannel, 'map-1');
    await matchmaker.addPlayerToPool('transport-2', 'stable-uid', secondChannel, 'map-1');

    expect(matchmaker.getQueueSizeForMap('map-1')).toBe(1);
    expect((matchmaker as any).queue[0].id).toBe('transport-2');
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

  it('broadcasts forked pre-match countdowns without an in-process room', () => {
    const channels = [{ emit: vi.fn() }, { emit: vi.fn() }];
    const pending = {
      matchId: 'forked-match',
      mapId: 'map-1',
      room: null,
      execution: { send: vi.fn().mockResolvedValue(undefined) },
      players: channels.map((channel, index) => ({ id: `user-${index}`, channel })),
      loadingComplete: new Set(),
      countdownTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };

    expect(() => (matchmaker as any).startPreMatchCountdown(pending)).not.toThrow();
    expect(channels[0].emit).toHaveBeenCalledWith(
      'reliable_event',
      expect.objectContaining({ type: 'PRE_MATCH_COUNTDOWN', countdownSeconds: 10 }),
    );
  });

  it('starts a forked match through its execution boundary', () => {
    const execution = { send: vi.fn().mockResolvedValue(undefined) };
    const pending = {
      matchId: 'forked-match',
      room: null,
      execution,
      players: [],
      countdownTimer: null,
      countdownRemaining: 0,
      hasStartedCountdown: true,
    };

    (matchmaker as any).launchMatch(pending);

    expect(execution.send).toHaveBeenCalledWith('broadcast', { type: 'START_MATCH' });
  });

  it('spawns bot fill through a forked execution boundary', async () => {
    const channel = { id: 'human-transport', emit: vi.fn() } as any;
    const execution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    execution.registerPlayer = vi.fn().mockResolvedValue(undefined);
    execution.spawnBots = vi.fn().mockResolvedValue(undefined);
    execution.onOutbound = vi.fn();
    vi.spyOn(roomAllocator, 'getExecution').mockReturnValue(execution);
    vi.spyOn(roomAllocator, 'allocate').mockResolvedValue(execution);

    await (matchmaker as any).formMatch([
      {
        id: 'human-player',
        reqUid: 'human-player',
        channel,
        joinedTimestamp: 0,
        mapId: 'map-1',
        classId: 'ASSAULT',
        primaryWeaponId: 'rifle',
        secondaryWeaponId: 'pistol',
      },
    ], 'map-1', 3);

    expect(execution.spawnBots).toHaveBeenCalledWith(3);
  });

  it('cancels a pending countdown when its execution has crashed', () => {
    const channels = [{ connected: true, emit: vi.fn() }];
    const pending = {
      matchId: 'crashed-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'crashed', send: vi.fn().mockResolvedValue(undefined) },
      players: channels.map((channel, index) => ({ id: `user-${index}`, channel })),
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).startPreMatchCountdown(pending);

    expect((matchmaker as any).pendingMatches.has(pending.matchId)).toBe(false);
    expect(channels[0].emit).not.toHaveBeenCalled();
  });

  it('disposes the pending execution listener when a match is cancelled', () => {
    const unsubscribeOutbound = vi.fn();
    const pending = {
      matchId: 'cancelled-listener-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'crashed', send: vi.fn() },
      players: [],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
      unsubscribeOutbound,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).cancelPendingMatch(pending);

    expect(unsubscribeOutbound).toHaveBeenCalledTimes(1);
    expect(pending.unsubscribeOutbound).toBeUndefined();
  });

  it('releases an allocated execution when all pending players disconnect', () => {
    const release = vi.spyOn(roomAllocator, 'release').mockImplementation(() => undefined);
    const pending = {
      matchId: 'orphaned-pending-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'active', send: vi.fn() },
      players: [{ id: 'user-1', channel: { connected: false, emit: vi.fn() } }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
      unsubscribeOutbound: undefined,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).broadcastPendingEvent(pending, { type: 'PRE_MATCH_COUNTDOWN' });

    expect(release).toHaveBeenCalledWith(pending.matchId);
  });

  it('does not install a countdown timer after all pending players disconnect', () => {
    const pending = {
      matchId: 'empty-countdown-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'active', send: vi.fn() },
      players: [{ id: 'user-1', channel: { connected: false, emit: vi.fn() } }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
      unsubscribeOutbound: undefined,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).startPreMatchCountdown(pending);
    vi.advanceTimersByTime(11_000);

    expect(pending.execution.send).not.toHaveBeenCalled();
    expect((matchmaker as any).pendingMatches.has(pending.matchId)).toBe(false);
  });

  it('does not launch an in-process pending match after all players disconnect', () => {
    const room = { triggerStartMatch: vi.fn(), broadcastReliableEvent: vi.fn() };
    const pending = {
      matchId: 'disconnected-in-process-match',
      mapId: 'map-1',
      room,
      execution: { currentStatus: 'active', send: vi.fn() },
      players: [{ id: 'user-1', channel: { connected: false, emit: vi.fn() } }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 0,
      hasStartedCountdown: true,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).launchMatch(pending);

    expect(room.triggerStartMatch).not.toHaveBeenCalled();
    expect((matchmaker as any).pendingMatches.has(pending.matchId)).toBe(false);
  });

  it('cancels a forked countdown when the last channel disconnects during setup', () => {
    const channel = {
      connected: true,
      emit: vi.fn(() => {
        channel.connected = false;
      }),
    };
    const pending = {
      matchId: 'disconnect-during-countdown-setup',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'active', send: vi.fn() },
      players: [{ id: 'user-1', channel }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
      unsubscribeOutbound: undefined,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).startPreMatchCountdown(pending);

    expect((matchmaker as any).pendingMatches.has(pending.matchId)).toBe(false);
    expect(pending.countdownTimer).toBeNull();
    vi.advanceTimersByTime(10_000);
    expect(pending.execution.send).not.toHaveBeenCalledWith('broadcast', { type: 'START_MATCH' });
  });

  it('releases an execution that finishes allocating after shutdown', async () => {
    let resolveAllocation!: (execution: any) => void;
    const allocation = new Promise<any>((resolve) => {
      resolveAllocation = resolve;
    });
    const release = vi.spyOn(roomAllocator, 'release').mockImplementation(() => undefined);
    vi.spyOn(roomAllocator, 'getExecution').mockReturnValue(undefined);
    vi.spyOn(roomAllocator, 'allocate').mockReturnValue(allocation as any);

    const channel = { id: 'late-allocation-transport', connected: true, emit: vi.fn() } as any;
    const formPromise = (matchmaker as any).formMatch([
      {
        id: 'late-allocation-player',
        reqUid: 'late-allocation-player',
        channel,
        joinedTimestamp: 0,
        mapId: 'map-1',
        classId: 'ASSAULT',
        primaryWeaponId: 'rifle',
        secondaryWeaponId: 'pistol',
      },
    ], 'map-1', 0);

    await Promise.resolve();
    matchmaker.shutdown();
    resolveAllocation({
      roomId: 'late-allocation-room',
      currentStatus: 'active',
      onOutbound: vi.fn().mockReturnValue(vi.fn()),
      send: vi.fn(),
    });
    await formPromise;

    expect(release).toHaveBeenCalledWith(expect.stringMatching(/^M_POOL_/));
    expect(release).toHaveBeenCalledTimes(1);
    const pending = Array.from((matchmaker as any).pendingMatches.values())[0];
    if (pending) (matchmaker as any).cancelPendingMatch(pending, false);
  });

  it('releases an allocation when room creation rejects', async () => {
    const release = vi.spyOn(roomAllocator, 'release').mockImplementation(() => undefined);
    vi.spyOn(roomAllocator, 'getExecution').mockReturnValue(undefined);
    vi.spyOn(roomAllocator, 'allocate').mockRejectedValue(new Error('allocation failed'));

    await expect((matchmaker as any).formMatch([], 'map-1', 0)).resolves.toBeUndefined();

    expect(release).toHaveBeenCalledWith(expect.stringMatching(/^M_POOL_/));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does not queue a replacement transport for a UID already in a pending match', async () => {
    const channels = Array.from({ length: 10 }, (_, index) => ({
      id: `transport-${index}`,
      connected: true,
      emit: vi.fn(),
    }));

    await matchmaker.addPlayerToPool('transport-0', 'stable-pending-uid', channels[0] as any, 'map-1');
    for (let index = 1; index < channels.length; index += 1) {
      await matchmaker.addPlayerToPool(`player-${index}`, `uid-${index}`, channels[index] as any, 'map-1');
    }
    await Promise.resolve();

    const replacement = { id: 'transport-replacement', connected: true, emit: vi.fn() } as any;
    await matchmaker.addPlayerToPool('transport-replacement', 'stable-pending-uid', replacement, 'map-1');

    const pendingPlayers = Array.from((matchmaker as any).pendingMatches.values())
      .flatMap((pending: any) => pending.players)
      .filter((player: any) => player.reqUid === 'stable-pending-uid');
    expect(matchmaker.getQueueSizeForMap('map-1')).toBe(0);
    expect(pendingPlayers).toHaveLength(1);
    expect(pendingPlayers[0].channel).toBe(replacement);
  });

  it('cleans the previous pending transport binding when a stable UID is replaced', async () => {
    const previousCleanup = vi.fn();
    const previousChannel = {
      id: 'previous-transport',
      emit: vi.fn(),
      roomExecutionOutboundCleanup: previousCleanup,
    } as any;
    const replacementChannel = {
      id: 'replacement-transport',
      emit: vi.fn(),
      bindRoomExecution: vi.fn((_execution: unknown, state: unknown) => {
        connectionRegistry.register((state as any).id, replacementChannel);
      }),
    } as any;
    const room = {
      registerPlayer: vi.fn((id: string, channel: any) => ({
        id,
        reqUid: id,
        channel,
        isAlive: true,
        lastSequence: 0,
      })),
    };
    const pending = {
      matchId: 'stable-replacement-match',
      mapId: 'map-1',
      room,
      execution: { currentStatus: 'active' },
      players: [{
        id: previousChannel.id,
        reqUid: 'stable-replacement-uid',
        channel: previousChannel,
      }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };
    connectionRegistry.register('stable-replacement-uid', previousChannel);
    connectionRegistry.register(previousChannel.id, previousChannel);
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    try {
      await matchmaker.addPlayerToPool(
        replacementChannel.id,
        'stable-replacement-uid',
        replacementChannel,
        'map-1',
      );

      expect(previousCleanup).toHaveBeenCalledTimes(1);
      expect(connectionRegistry.get('stable-replacement-uid')).toBe(replacementChannel);
      expect(connectionRegistry.get(previousChannel.id)).toBeUndefined();
    } finally {
      connectionRegistry.unregister('stable-replacement-uid', replacementChannel);
      connectionRegistry.unregister(previousChannel.id, previousChannel);
    }
  });

  it('does not advertise a forked replacement before registration succeeds', async () => {
    const execution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    (execution as any).status = 'active';
    execution.registerPlayer = vi.fn().mockRejectedValue(new Error('worker registration failed'));
    const previousChannel = { id: 'forked-previous-transport', emit: vi.fn() } as any;
    const replacementChannel = { id: 'forked-replacement-transport', emit: vi.fn() } as any;
    const pending = {
      matchId: 'forked-replacement-match',
      mapId: 'map-1',
      room: null,
      execution,
      players: [{
        id: previousChannel.id,
        reqUid: 'forked-replacement-uid',
        channel: previousChannel,
      }],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    await matchmaker.addPlayerToPool(
      replacementChannel.id,
      'forked-replacement-uid',
      replacementChannel,
      'map-1',
    );

    expect(execution.registerPlayer).toHaveBeenCalledWith(
      'forked-replacement-uid',
      'ASSAULT',
      undefined,
      'forked-replacement-uid',
      'rifle',
      'pistol',
      replacementChannel.id,
      replacementChannel,
    );
    expect(pending.players[0].channel).toBe(previousChannel);
    expect(replacementChannel.emit).not.toHaveBeenCalledWith(
      'reliable_event',
      expect.objectContaining({ type: 'MATCH_FOUND' }),
    );
  });

  it('does not launch a pending countdown after an in-process execution ends', async () => {
    const room = {
      roomId: 'ended-room',
      onShutdown: undefined,
      shutdown: vi.fn(),
    };
    const execution = new InProcessRoomExecution(room as any);
    await execution.terminate('TEST_END');

    const pending = {
      matchId: 'ended-match',
      mapId: 'map-1',
      room,
      execution,
      players: [],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };

    expect((matchmaker as any).isExecutionUsable(pending)).toBe(false);
  });

  it('clears allocation bookkeeping when a pending match launches', () => {
    const pending = {
      matchId: 'launched-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'active', send: vi.fn().mockResolvedValue(undefined) },
      players: [],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 0,
      hasStartedCountdown: true,
    };
    (matchmaker as any).allocationStates.set(pending.matchId, { settled: true, released: false });
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).launchMatch(pending);

    expect((matchmaker as any).allocationStates.has(pending.matchId)).toBe(false);
  });

  it('does not launch a pending match after cancellation wins the race', () => {
    const pending = {
      matchId: 'cancel-before-launch-match',
      mapId: 'map-1',
      room: null,
      execution: { currentStatus: 'active', send: vi.fn().mockResolvedValue(undefined) },
      players: [],
      loadingComplete: new Set(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 0,
      hasStartedCountdown: true,
    };
    (matchmaker as any).pendingMatches.set(pending.matchId, pending);

    (matchmaker as any).cancelPendingMatch(pending);
    (matchmaker as any).launchMatch(pending);

    expect(pending.execution.send).not.toHaveBeenCalled();
  });
});
