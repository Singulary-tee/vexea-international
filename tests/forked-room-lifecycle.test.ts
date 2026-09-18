import { describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({ fork: vi.fn() }));

vi.mock("child_process", () => ({ fork: childProcessMocks.fork }));

import { ForkedRoomExecution } from "../server/execution/ForkedRoomExecution";
import { connectionRegistry } from "../server/connection-registry";

function createFakeChild() {
  const handlers = new Map<string, (...args: any[]) => void>();
  return {
    pid: 4321,
    connected: true,
    handlers,
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      handlers.set(event, callback);
    }),
    send: vi.fn(),
    kill: vi.fn(),
  };
}

describe("ForkedRoomExecution lifecycle", () => {
  it("rejects readiness when the worker exits before ready", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const execution = new ForkedRoomExecution("early-exit-room", { readyTimeoutMs: 1000 });

    execution.start();
    const ready = execution.waitUntilReady().then(() => "resolved", () => "rejected");
    child.handlers.get("exit")?.(1, null);

    await expect(ready).resolves.toBe("rejected");
    expect(execution.currentStatus).toBe("crashed");
  });

  it("notifies shutdown and crash callbacks only once", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const onShutdown = vi.fn();
    const shutdownExecution = new ForkedRoomExecution("shutdown-room", { onShutdown });
    shutdownExecution.start();
    const shutdownReady = shutdownExecution.waitUntilReady();
    child.handlers.get("message")?.({ type: "shutdown", roomId: "shutdown-room" });
    child.handlers.get("exit")?.(0, null);
    await expect(shutdownReady).rejects.toThrow("shut down before becoming ready");
    expect(onShutdown).toHaveBeenCalledTimes(1);

    const crashChild = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(crashChild);
    const onCrash = vi.fn();
    const crashExecution = new ForkedRoomExecution("crash-room", { onCrash });
    crashExecution.start();
    const crashReady = crashExecution.waitUntilReady();
    crashChild.handlers.get("error")?.(new Error("worker failed"));
    crashChild.handlers.get("exit")?.(1, null);
    await expect(crashReady).rejects.toThrow("worker failed");
    expect(onCrash).toHaveBeenCalledTimes(1);
  });

  it("clears the readiness timeout when the worker shuts down before ready", async () => {
    vi.useFakeTimers();
    try {
      const child = createFakeChild();
      childProcessMocks.fork.mockReturnValueOnce(child);
      const execution = new ForkedRoomExecution("shutdown-timeout-room", { readyTimeoutMs: 1000 });
      execution.start();
      const ready = execution.waitUntilReady();

      expect(vi.getTimerCount()).toBe(1);
      child.handlers.get("message")?.({ type: "shutdown", roomId: "shutdown-timeout-room" });

      await expect(ready).rejects.toThrow("shut down before becoming ready");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks an active execution crashed when the worker reports an error", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const onCrash = vi.fn();
    const execution = new ForkedRoomExecution("active-error-room", { onCrash });

    execution.start();
    child.handlers.get("message")?.({
      type: "ready",
      roomId: "active-error-room",
      pid: child.pid,
    });
    await execution.waitUntilReady();

    child.handlers.get("message")?.({
      type: "error",
      roomId: "active-error-room",
      error: "active worker failed",
    });

    expect(execution.currentStatus).toBe("crashed");
    expect(onCrash).toHaveBeenCalledWith("active-error-room", "active worker failed");
  });

  it("routes a crash disconnect to the live replacement channel", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const originalChannel = { id: "original-transport", connected: false, emit: vi.fn() } as any;
    const replacementChannel = { id: "replacement-transport", connected: true, emit: vi.fn() } as any;
    const execution = new ForkedRoomExecution("crash-routing-room");

    connectionRegistry.register("crash-player", originalChannel);
    try {
      execution.start();
      child.handlers.get("message")?.({
        type: "ready",
        roomId: "crash-routing-room",
        pid: child.pid,
      });
      await execution.waitUntilReady();
      await execution.registerPlayer(
        "crash-player",
        "ASSAULT",
        undefined,
        "crash-player",
        undefined,
        undefined,
        originalChannel.id,
        originalChannel,
      );
      connectionRegistry.unregister("crash-player", originalChannel);
      connectionRegistry.register("crash-player", replacementChannel);

      child.handlers.get("exit")?.(1, null);

      expect(replacementChannel.emit).toHaveBeenCalledWith("reliable_event", {
        type: "DISCONNECT",
        reason: "ROOM_CRASHED",
      });
    } finally {
      connectionRegistry.unregister("crash-player", replacementChannel);
    }
  });

  it("routes a worker-error crash to a pending reconnect channel once", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const channel = { id: "pending-reconnect-transport", connected: true, emit: vi.fn() } as any;
    const execution = new ForkedRoomExecution("worker-error-routing-room");

    execution.start();
    child.handlers.get("message")?.({
      type: "ready",
      roomId: "worker-error-routing-room",
      pid: child.pid,
    });
    await execution.waitUntilReady();

    const reconnect = execution.reconnectPlayer("pending-player", "pending-player", channel);
    child.handlers.get("error")?.(new Error("worker failed"));
    await expect(reconnect).resolves.toBe(false);

    expect(channel.emit).toHaveBeenCalledWith("reliable_event", {
      type: "DISCONNECT",
      reason: "ROOM_CRASHED",
    });
    child.handlers.get("exit")?.(1, null);
    expect(channel.emit).toHaveBeenCalledTimes(1);
  });

  it("does not route a removed player after a later room crash", async () => {
    const child = createFakeChild();
    childProcessMocks.fork.mockReturnValueOnce(child);
    const channel = { id: "removed-player-transport", connected: true, emit: vi.fn() } as any;
    const execution = new ForkedRoomExecution("removed-player-routing-room");

    execution.start();
    child.handlers.get("message")?.({
      type: "ready",
      roomId: "removed-player-routing-room",
      pid: child.pid,
    });
    await execution.waitUntilReady();
    await execution.registerPlayer("removed-player", "ASSAULT", undefined, "removed-player", undefined, undefined, channel.id, channel);
    await execution.removePlayer("removed-player");

    child.handlers.get("exit")?.(1, null);

    expect(channel.emit).not.toHaveBeenCalledWith("reliable_event", {
      type: "DISCONNECT",
      reason: "ROOM_CRASHED",
    });
  });

  it("does not rebind a reconnect after the parent timeout", async () => {
    vi.useFakeTimers();
    try {
      const child = createFakeChild();
      childProcessMocks.fork.mockReturnValueOnce(child);
      const execution = new ForkedRoomExecution("late-reconnect-room");
      execution.start();
      child.handlers.get("message")?.({
        type: "ready",
        roomId: "late-reconnect-room",
        pid: child.pid,
      });
      await execution.waitUntilReady();

      const channel = { id: "late-reconnect-transport", connected: true } as any;
      const reconnect = execution.reconnectPlayer("late-player", "late-player", channel);
      const requestId = Array.from((execution as any).pendingReconnects.keys())[0];
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(reconnect).resolves.toBe(false);
      expect(child.send).toHaveBeenCalledWith({
        type: "cancel_reconnect",
        requestId,
        generation: 1,
        playerId: "late-player",
      });

      child.handlers.get("message")?.({
        type: "reconnect_result",
        requestId,
        generation: 1,
        accepted: true,
      });
      expect((execution as any).pendingReconnects.has(requestId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears terminal reconnect tombstones and outbound listeners", async () => {
    vi.useFakeTimers();
    try {
      const child = createFakeChild();
      childProcessMocks.fork.mockReturnValueOnce(child);
      const execution = new ForkedRoomExecution("terminal-cleanup-room");
      const outbound = vi.fn();
      execution.start();
      child.handlers.get("message")?.({
        type: "ready",
        roomId: "terminal-cleanup-room",
        pid: child.pid,
      });
      await execution.waitUntilReady();
      execution.onOutbound(outbound);

      const reconnect = execution.reconnectPlayer(
        "terminal-player",
        "terminal-player",
        { id: "terminal-transport", connected: true } as any,
      );
      const requestId = Array.from((execution as any).pendingReconnects.keys())[0];
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(reconnect).resolves.toBe(false);
      expect((execution as any).invalidatedReconnects.has(requestId)).toBe(true);

      child.handlers.get("error")?.(new Error("terminal worker failure"));

      expect((execution as any).invalidatedReconnects.size).toBe(0);
      child.handlers.get("message")?.({
        type: "outbound",
        roomId: "terminal-cleanup-room",
        targetPlayerId: "broadcast",
        event: { type: "ROOM_STATE", state: {} },
      });
      expect(outbound).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
