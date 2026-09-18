import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomAllocator } from '../server/execution/RoomAllocator';
import { InProcessRoomExecution } from '../server/execution/InProcessRoomExecution';
import { matchManager } from '../server/MatchManager';

vi.mock('../server/MatchRoom', () => {
  return {
    MatchRoom: class {
      public roomId: string;
      public players = new Map();
      public matchActive = false;
      public onShutdown: any = null;
      constructor(id: string) {
        this.roomId = id;
      }
      shutdown() {
        if (this.onShutdown) this.onShutdown(this.roomId);
      }
      recordPlayerActivity(p: any) {}
      updatePlayerInput(p: any, mask: number, pitch: number, yaw: number) {}
      useUtility(id: string, slot: string) {}
      setObjectiveHold(id: string, hold: boolean) {}
      setPlayerReady(id: string) {}
      handlePlayerAbandonment = vi.fn().mockResolvedValue(undefined);
      handlePlayerDisconnect = vi.fn();
      applyPlayerClassLoadout = vi.fn();
      removePlayer = vi.fn();
    },
    getWeaponReloadTicks: vi.fn().mockReturnValue(60)
  };
});

describe('RoomExecution and RoomAllocator Tests', () => {
  let allocator: RoomAllocator;

  beforeEach(() => {
    const rooms = matchManager.getRooms();
    rooms.forEach(r => matchManager.deleteRoom(r.roomId));
    allocator = new RoomAllocator();
  });

  it('should allocate and return an InProcessRoomExecution', async () => {
    const execution = await allocator.allocate('room-1');
    expect(execution).toBeDefined();
    expect(execution.roomId).toBe('room-1');
    expect(allocator.getActiveRoomCount()).toBe(1);

    const sameExecution = await allocator.allocate('room-1');
    expect(sameExecution).toBe(execution);
    expect(allocator.getActiveRoomCount()).toBe(1);
  });

  it('should support status, outbound listeners and send events', async () => {
    const execution = await allocator.allocate('room-events');
    expect(await execution.getStatus()).toBe('active');

    const outboundEvents: any[] = [];
    execution.onOutbound((target, event) => {
      outboundEvents.push({ target, event });
    });

    const mockPlayer = {
      id: 'p1',
      displayName: 'Player One',
      channel: { emit: vi.fn() },
      isAlive: true,
      weaponState: {
        primary: { fireMode: 'auto', weaponId: 'rifle', currentMag: 30, reserve: 90, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
        secondary: { fireMode: 'semi', weaponId: 'pistol', currentMag: 15, reserve: 45, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
      }
    };

    const room = (execution as InProcessRoomExecution).getRoom();
    room.players.set('p1', mockPlayer);

    // Send chat broadcast
    await execution.send('p1', { type: 'CHAT_MESSAGE', message: 'Hello team' });
    expect(outboundEvents).toHaveLength(1);
    expect(outboundEvents[0].target).toBe('broadcast');
    expect(outboundEvents[0].event).toEqual({
      type: 'CHAT_MESSAGE',
      sender: 'Player One',
      message: 'Hello team',
    });
    expect(mockPlayer.channel.emit).toHaveBeenCalledWith('reliable_event', expect.objectContaining({
      type: 'CHAT_MESSAGE',
      message: 'Hello team'
    }));

    // Send quick comm
    await execution.send('p1', { type: 'QUICK_COMM', optionId: 'AFFIRMATIVE' });
    expect(outboundEvents).toHaveLength(2);
    expect(outboundEvents[1].event).toEqual({
      type: 'QUICK_COMM',
      sender: 'Player One',
      optionId: 'AFFIRMATIVE',
    });

    // Send input
    await execution.send('p1', { type: 'INPUT', seq: 10, inputMask: 1, pitch: 0, yaw: 0 });

    // Send utility
    await execution.send('p1', { type: 'USE_UTILITY', slot: 'utility1' });

    // Send toggle fire mode
    await execution.send('p1', { type: 'TOGGLE_FIRE_MODE' });
    expect(mockPlayer.weaponState.primary.fireMode).toBe('burst');

    // Terminate
    await execution.terminate('match ended');
    expect(await execution.getStatus()).toBe('ending');
    expect(allocator.getActiveRoomCount()).toBe(0);
  });

  it('rejects malformed weapon-slot events without throwing', async () => {
    const execution = await allocator.allocate('room-invalid-weapon-slot');
    const room = (execution as InProcessRoomExecution).getRoom();
    const mockPlayer = {
      id: 'p1',
      channel: { emit: vi.fn() },
      isAlive: true,
      weaponState: {
        primary: { weaponId: 'rifle', currentMag: 30, reserve: 90, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
        secondary: { weaponId: 'pistol', currentMag: 15, reserve: 45, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
      },
    };
    room.players.set('p1', mockPlayer);

    await expect(execution.send('p1', { type: 'RELOAD', weaponSlot: 'tertiary' } as any)).resolves.toBeUndefined();
    await expect(execution.send('p1', { type: 'CANCEL_RELOAD', weaponSlot: 'tertiary' } as any)).resolves.toBeUndefined();
    expect(mockPlayer.weaponState.primary.isReloading).toBe(false);

    await execution.terminate('test cleanup');
  });

  it('ignores a disconnect event from a superseded channel', async () => {
    const execution = await allocator.allocate('room-stale-disconnect');
    const room = (execution as InProcessRoomExecution).getRoom();
    const mockPlayer = {
      id: 'p1',
      channel: { id: 'new-channel', connected: false, emit: vi.fn() },
      isAlive: true,
      weaponState: {
        primary: { weaponId: 'rifle', currentMag: 30, reserve: 90, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
        secondary: { weaponId: 'pistol', currentMag: 15, reserve: 45, isReloading: false, reloadTimer: 0, leakyBucket: 0, lastConfirmedShotT: 0 },
      },
    };
    room.players.set('p1', mockPlayer);

    await execution.send('p1', {
      type: 'PLAYER_DISCONNECT',
      channelId: 'old-channel',
    } as any);

    expect(room.handlePlayerDisconnect).not.toHaveBeenCalled();
    await execution.terminate('test cleanup');
  });

  it('ignores a quit event from a superseded channel', async () => {
    const execution = await allocator.allocate('room-stale-quit');
    const room = (execution as InProcessRoomExecution).getRoom();
    const mockPlayer = {
      id: 'p1',
      channel: { id: 'new-channel', connected: true, emit: vi.fn() },
      isAlive: true,
      weaponState: {
        primary: { weaponId: 'rifle', currentMag: 30, reserve: 90, isReloading: false, reloadTimer: 0 },
        secondary: { weaponId: 'pistol', currentMag: 15, reserve: 45, isReloading: false, reloadTimer: 0 },
      },
    };
    room.players.set('p1', mockPlayer);

    await execution.send('p1', {
      type: 'PLAYER_QUIT',
      channelId: 'old-channel',
    } as any);

    expect(room.handlePlayerAbandonment).not.toHaveBeenCalled();
    await execution.terminate('test cleanup');
  });

  it('rebinds a reconnecting transport to the existing player identity', async () => {
    const execution = await allocator.allocate('room-reconnect-identity');
    const room = (execution as InProcessRoomExecution).getRoom();
    const oldChannel = { id: 'old-channel', connected: false, emit: vi.fn() };
    const newChannel = { id: 'new-channel', connected: true, emit: vi.fn() };
    const player = {
      id: 'stable-player',
      reqUid: 'stable-uid',
      channel: oldChannel,
    };
    room.players.set(player.id, player);
    (room as any).registerPlayer = vi.fn((id: string, channel: any) => {
      player.channel = channel;
      return player;
    });

    await expect(
      execution.reconnectPlayer(player.id, player.reqUid, newChannel as any),
    ).resolves.toBe(true);
    expect(player.channel).toBe(newChannel);
    expect((room as any).registerPlayer).toHaveBeenCalledWith(
      player.id,
      newChannel,
      undefined,
      undefined,
      undefined,
      player.reqUid,
    );

    const duplicateChannel = { id: 'duplicate-channel', connected: true, emit: vi.fn() };
    await expect(
      execution.reconnectPlayer(player.id, player.reqUid, duplicateChannel as any),
    ).resolves.toBe(false);
    expect(player.channel).toBe(newChannel);

    await expect(
      execution.reconnectPlayer(player.id, 'wrong-uid', oldChannel as any),
    ).resolves.toBe(false);
    expect(player.channel).toBe(newChannel);

    await execution.terminate('test cleanup');
  });

  it('should release execution and clean up from allocator', async () => {
    const execution = await allocator.allocate('room-release');
    expect(allocator.getActiveRoomCount()).toBe(1);
    allocator.release('room-release');
    expect(allocator.getActiveRoomCount()).toBe(0);
  });
});
