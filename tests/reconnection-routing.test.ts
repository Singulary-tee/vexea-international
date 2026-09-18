import { describe, expect, it, vi, afterEach } from "vitest";
import { registerMatchmakingHandlers } from "../server/transport/handlers/matchmaking-handlers";
import { roomAllocator } from "../server/execution/RoomAllocator";
import { InProcessRoomExecution } from "../server/execution/InProcessRoomExecution";
import { ForkedRoomExecution } from "../server/execution/ForkedRoomExecution";

describe("matchmaking reconnect routing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rebinds a new transport to the stable room player instead of queueing it", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-new",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => {
        listeners.set(event, callback);
      }),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const execution = {
      reconnectPlayer: vi.fn().mockResolvedValue(true),
      onOutbound: vi.fn(),
    };
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };
    const connectionRegistry = {
      register: vi.fn(),
    };

    vi.spyOn(roomAllocator, "getExecution").mockReturnValue(execution as any);

    registerMatchmakingHandlers(
      channel as any,
      "PL_new",
      () => null,
      () => null,
      matchmaker as any,
      connectionRegistry as any,
    );

    await listeners.get("start_match")?.({
      uid: "stable-player",
      matchId: "M_active",
      mapId: "map_1_facility",
    });

    expect(execution.reconnectPlayer).toHaveBeenCalledWith(
      "stable-player",
      "stable-player",
      channel,
    );
    expect((channel as any).roomExecution).toBe(execution);
    expect((channel as any).pState).toMatchObject({
      id: "stable-player",
      reqUid: "stable-player",
    });
    expect(connectionRegistry.register).toHaveBeenCalledWith("stable-player", channel);
    expect(matchmaker.addPlayerToPool).not.toHaveBeenCalled();
  });

  it("uses the stable UID as the dev quick-start room player ID", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-dev",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const room = {
      onShutdown: undefined,
      registerPlayer: vi.fn((id: string, playerChannel: any) => ({
        id,
        reqUid: "stable-dev-uid",
        channel: playerChannel,
        isAlive: true,
        lastSequence: 0,
      })),
    };
    const execution = new InProcessRoomExecution(room as any);
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    const connectionRegistry = { register: vi.fn(), unregister: vi.fn() };
    vi.spyOn(roomAllocator, "allocate").mockResolvedValue(execution);
    registerMatchmakingHandlers(
      channel as any,
      "PL_dev",
      () => null,
      () => null,
      matchmaker as any,
      connectionRegistry as any,
    );

    await listeners.get("start_match")?.({
      uid: "stable-dev-uid",
      matchId: "M_dev",
      isDevQuickStart: true,
    });

    expect(room.registerPlayer).toHaveBeenCalledWith(
      "stable-dev-uid",
      channel,
      null,
      "ASSAULT",
      undefined,
      "stable-dev-uid",
      undefined,
      undefined,
    );
    expect((channel as any).pState.id).toBe("stable-dev-uid");
  });

  it("passes the transport to forked quick-start registration before worker emits", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-forked",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const execution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    execution.registerPlayer = vi.fn().mockResolvedValue(undefined);
    execution.onOutbound = vi.fn();
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };
    const connectionRegistry = { register: vi.fn(), unregister: vi.fn() };

    vi.spyOn(roomAllocator, "allocate").mockResolvedValue(execution);
    registerMatchmakingHandlers(
      channel as any,
      "PL_forked",
      () => null,
      () => null,
      matchmaker as any,
      connectionRegistry as any,
    );

    await listeners.get("start_match")?.({
      uid: "stable-forked-uid",
      matchId: "M_forked",
      isDevQuickStart: true,
    });

    expect(execution.registerPlayer).toHaveBeenCalledWith(
      "stable-forked-uid",
      "ASSAULT",
      undefined,
      "stable-forked-uid",
      undefined,
      undefined,
      "transport-forked",
      channel,
    );
  });

  it("disposes the previous execution listener when quick-start rebinds a channel", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-rebound",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const firstExecution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    const secondExecution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    const unsubscribeFirst = vi.fn();
    firstExecution.registerPlayer = vi.fn().mockResolvedValue(undefined);
    firstExecution.onOutbound = vi.fn().mockReturnValue(unsubscribeFirst);
    secondExecution.registerPlayer = vi.fn().mockResolvedValue(undefined);
    secondExecution.onOutbound = vi.fn().mockReturnValue(vi.fn());
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    vi.spyOn(roomAllocator, "allocate")
      .mockResolvedValueOnce(firstExecution)
      .mockResolvedValueOnce(secondExecution);
    registerMatchmakingHandlers(
      channel as any,
      "PL_rebound",
      () => null,
      () => null,
      matchmaker as any,
      { register: vi.fn(), unregister: vi.fn() } as any,
    );

    await listeners.get("start_match")?.({ uid: "first-player", matchId: "M_first", isDevQuickStart: true });
    await listeners.get("start_match")?.({ uid: "second-player", matchId: "M_second", isDevQuickStart: true });

    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);
  });

  it("removes the previous forked-room player before rebinding the transport", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const previousExecution = { roomId: "M_old", send: vi.fn().mockResolvedValue(undefined) };
    const channel = {
      id: "transport-reused",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
      roomExecution: previousExecution,
      pState: { id: "stable-player", reqUid: "stable-player" },
    };
    const nextExecution = Object.create(ForkedRoomExecution.prototype) as ForkedRoomExecution;
    nextExecution.registerPlayer = vi.fn().mockResolvedValue(undefined);
    nextExecution.onOutbound = vi.fn();
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    vi.spyOn(roomAllocator, "allocate").mockResolvedValue(nextExecution);
    registerMatchmakingHandlers(
      channel as any,
      "PL_reused",
      () => null,
      () => (channel as any).pState,
      matchmaker as any,
      { register: vi.fn(), unregister: vi.fn() } as any,
    );

    await listeners.get("start_match")?.({
      uid: "new-player",
      matchId: "M_new",
      isDevQuickStart: true,
    });

    expect(previousExecution.send).toHaveBeenCalledWith(
      "stable-player",
      { type: "REMOVE_PLAYER" },
    );
  });

  it("does not unregister a newly bound entry when transport and room IDs match", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-same",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const room = {
      onShutdown: undefined,
      registerPlayer: vi.fn((id: string, playerChannel: any) => ({
        id,
        reqUid: id,
        channel: playerChannel,
        isAlive: true,
        lastSequence: 0,
      })),
    };
    const execution = new InProcessRoomExecution(room as any);
    const connectionRegistry = { register: vi.fn(), unregister: vi.fn() };
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    vi.spyOn(roomAllocator, "allocate").mockResolvedValue(execution);
    registerMatchmakingHandlers(
      channel as any,
      "transport-same",
      () => null,
      () => null,
      matchmaker as any,
      connectionRegistry as any,
    );

    await listeners.get("start_match")?.({
      matchId: "M_same",
      isDevQuickStart: true,
    });

    expect(connectionRegistry.register).toHaveBeenCalledWith("transport-same", channel);
    expect(connectionRegistry.unregister).not.toHaveBeenCalled();
  });

  it("rejects a reconnect when the match execution is missing", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-new",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    vi.spyOn(roomAllocator, "getExecution").mockReturnValue(undefined);
    registerMatchmakingHandlers(
      channel as any,
      "PL_new",
      () => null,
      () => null,
      matchmaker as any,
      { register: vi.fn() } as any,
    );

    await listeners.get("start_match")?.({ uid: "stable-player", matchId: "M_missing" });

    expect(matchmaker.addPlayerToPool).not.toHaveBeenCalled();
    expect(channel.emit).toHaveBeenCalledWith("reliable_event", {
      type: "MATCHMAKING_ERROR",
      message: "The requested match is no longer available.",
    });
  });

  it("rejects a wrong or stale identity without queueing it", async () => {
    const listeners = new Map<string, (args: any) => unknown>();
    const channel = {
      id: "transport-stale",
      connected: true,
      on: vi.fn((event: string, callback: (args: any) => unknown) => listeners.set(event, callback)),
      emit: vi.fn(),
      onDisconnect: vi.fn(),
      onRaw: vi.fn(),
      rawEmit: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    const execution = {
      roomId: "M_active",
      getStatus: vi.fn().mockResolvedValue("active"),
      reconnectPlayer: vi.fn().mockResolvedValue(false),
      onOutbound: vi.fn(),
    };
    const matchmaker = {
      addPlayerToPool: vi.fn(),
      removePlayerFromPool: vi.fn(),
      signalPlayerLoadingComplete: vi.fn(),
    };

    vi.spyOn(roomAllocator, "getExecution").mockReturnValue(execution as any);
    registerMatchmakingHandlers(
      channel as any,
      "PL_stale",
      () => null,
      () => null,
      matchmaker as any,
      { register: vi.fn() } as any,
    );

    await listeners.get("start_match")?.({ uid: "wrong-player", matchId: "M_active" });

    expect(execution.reconnectPlayer).toHaveBeenCalledWith("wrong-player", "wrong-player", channel);
    expect(matchmaker.addPlayerToPool).not.toHaveBeenCalled();
    expect(channel.emit).toHaveBeenCalledWith("reliable_event", {
      type: "MATCHMAKING_ERROR",
      message: "The player identity could not be rebound to this match.",
    });
  });
});
