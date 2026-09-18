import { describe, it, expect, afterEach, vi } from "vitest";
import { ForkedRoomExecution, resolveWorkerPath } from "../server/execution/ForkedRoomExecution";
import { InProcessRoomExecution } from "../server/execution/InProcessRoomExecution";
import { RoomAllocator } from "../server/execution/RoomAllocator";
import { connectionRegistry } from "../server/connection-registry";
import RAPIER from "@dimforge/rapier3d-compat";

describe("Stage C: Isolated Room Execution Backend", () => {
  const activeExecutions: ForkedRoomExecution[] = [];

  it("uses the TypeScript worker from a source checkout", () => {
    expect(resolveWorkerPath().scriptPath).toMatch(/[\\/]server[\\/]execution[\\/]room-worker\.ts$/);
  });

  afterEach(async () => {
    while (activeExecutions.length > 0) {
      const exec = activeExecutions.pop();
      if (exec) {
        void exec.waitUntilReady().catch(() => undefined);
        await exec.terminate("TEST_CLEANUP");
      }
    }
  });

  it("1. Room process can start", async () => {
    const roomId = `test-start-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    expect(exec.pid).toBeTypeOf("number");
    expect(exec.pid).toBeGreaterThan(0);
    expect(exec.pid).not.toEqual(process.pid);
  }, 45000);

  it("2. Room reports ready", async () => {
    const roomId = `test-ready-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    await exec.waitUntilReady();
    const status = await exec.getStatus();
    expect(status).toBe("active");
  }, 45000);

  it("3. RoomExecution.send reaches the correct room", async () => {
    const roomId = `test-send-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    await exec.waitUntilReady();

    let outboundReceived: any = null;
    exec.onOutbound((target, event) => {
      if (event.type === "CHAT_MESSAGE") {
        outboundReceived = { target, event };
      }
    });

    await exec.send("broadcast", {
      type: "CHAT_MESSAGE",
      sender: "TestSender",
      message: "Worker inbound message",
    });

    const deadline = Date.now() + 3000;
    while (!outboundReceived && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(outboundReceived).not.toBeNull();
    expect(outboundReceived.event.message).toBe("Worker inbound message");
  }, 45000);

  it("replicates authoritative player pitch through the forked state sync", async () => {
    const roomId = `test-pitch-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const events: any[] = [];
    connectionRegistry.register("pitch-player", {
      id: "pitch-player",
      connected: true,
      emit: (_event: string, data: any) => events.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    } as any);

    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer("pitch-player");
      await exec.send("pitch-player", { type: "PLAYER_READY" });
      await exec.send("pitch-player", { type: "INPUT", seq: 1, inputMask: 0, pitch: 0.37, yaw: 0.2 });

      const deadline = Date.now() + 3000;
      let state: any;
      while (Date.now() < deadline) {
        state = events.find((event) => event?.type === "state_sync");
        if (state) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(state?.players?.find((player: any) => player.id === "pitch-player")?.pitch).toBeCloseTo(0.37, 5);
    } finally {
      connectionRegistry.unregister("pitch-player");
    }
  }, 45000);

  it("replicates authoritative active weapon through the forked state sync", async () => {
    const roomId = `test-weapon-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const events: any[] = [];
    connectionRegistry.register("weapon-player", {
      id: "weapon-player",
      connected: true,
      emit: (_event: string, data: any) => events.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    } as any);

    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer("weapon-player");
      await exec.send("weapon-player", { type: "PLAYER_READY" });
      await exec.send("weapon-player", { type: "SELECT_WEAPON", slot: "secondary" });

      const deadline = Date.now() + 3000;
      let state: any;
      while (Date.now() < deadline) {
        state = events.find(
          (event) =>
            event?.type === "state_sync" &&
            event.players?.find((player: any) => player.id === "weapon-player")?.currentWeapon === "pistol",
        );
        if (state) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(state?.players?.find((player: any) => player.id === "weapon-player")).toMatchObject({
        currentWeapon: "pistol",
        weaponEquipSequence: 1,
      });
      expect(state?.players?.find((player: any) => player.id === "weapon-player")?.weaponEquipTimestamp).toBeGreaterThan(0);
    } finally {
      connectionRegistry.unregister("weapon-player");
    }
  }, 45000);

  it("replicates authoritative utility state through the forked state sync", async () => {
    const roomId = `test-utility-state-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const events: any[] = [];
    connectionRegistry.register("utility-player", {
      id: "utility-player",
      connected: true,
      emit: (_event: string, data: any) => events.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    } as any);

    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer("utility-player");
      await exec.send("utility-player", { type: "PLAYER_READY" });
      await exec.send("utility-player", { type: "USE_UTILITY", slot: "utility1" });

      const deadline = Date.now() + 3000;
      let state: any;
      while (Date.now() < deadline) {
        state = events.find((event) => {
          const player = event?.type === "state_sync"
            ? event.players?.find((entry: any) => entry.id === "utility-player")
            : undefined;
          return player?.utilityState?.utility1?.charges === 1;
        });
        if (state) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(state?.players?.find((player: any) => player.id === "utility-player")?.utilityState).toMatchObject({
        utility1: {
          id: "Grenade",
          charges: 1,
          maxCharges: 2,
        },
      });
      expect(
        state?.players?.find((player: any) => player.id === "utility-player")?.utilityState?.utility1?.cooldownRemaining,
      ).toBeGreaterThan(0);
    } finally {
      connectionRegistry.unregister("utility-player");
    }
  }, 45000);

  it("rebinds a disconnected player through the forked worker", async () => {
    const roomId = `test-reconnect-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const oldEvents: any[] = [];
    const oldChannel = {
      id: "transport-old",
      connected: true,
      emit: (_event: string, data: any) => oldEvents.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    };
    const newEvents: any[] = [];
    const newChannel = {
      id: "transport-new",
      connected: true,
      emit: (_event: string, data: any) => newEvents.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    };

    connectionRegistry.register("reconnect-player", oldChannel as any);
    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer(
        "reconnect-player",
        "ASSAULT",
        "Reconnect Player",
        "reconnect-uid",
        undefined,
        undefined,
        "transport-old",
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      await exec.send("reconnect-player", {
        type: "PLAYER_DISCONNECT",
        channelId: "transport-old",
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      connectionRegistry.unregister("reconnect-player", oldChannel as any);
      await expect(
        exec.reconnectPlayer("reconnect-player", "reconnect-uid", newChannel as any),
      ).resolves.toBe(true);

      expect(newEvents.some((event) => event?.id === "reconnect-player")).toBe(true);
      await expect(
        exec.reconnectPlayer("reconnect-player", "reconnect-uid", {
          ...newChannel,
          id: "transport-duplicate",
        } as any),
      ).resolves.toBe(false);
    } finally {
      connectionRegistry.unregister("reconnect-player");
    }
  }, 45000);

  it("settles a queued reconnect when termination happens before the worker is ready", async () => {
    const exec = new ForkedRoomExecution(`test-reconnect-termination-${Date.now()}`, { mapId: "map-1" });
    activeExecutions.push(exec);
    void exec.waitUntilReady().catch(() => undefined);

    const reconnect = exec.reconnectPlayer("pending-player", "pending-uid", {
      id: "pending-transport",
      connected: true,
    } as any);

    await exec.terminate("TEST_TERMINATION");

    await expect(reconnect).resolves.toBe(false);
    expect(await exec.getStatus()).toBe("ending");
  });

  it("does not flush a reconnect after its startup request timed out", async () => {
    vi.useFakeTimers();
    try {
      const exec = new ForkedRoomExecution(`test-reconnect-timeout-${Date.now()}`, { mapId: "map-1" });
      const reconnect = exec.reconnectPlayer("pending-player", "pending-uid", {
        id: "pending-transport",
        connected: true,
      } as any);

      await vi.advanceTimersByTimeAsync(5000);

      await expect(reconnect).resolves.toBe(false);
      expect((exec as any).pendingMessages).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tombstones a timed-out reconnect and asks the worker to cancel it", async () => {
    vi.useFakeTimers();
    try {
      const exec = new ForkedRoomExecution(`test-reconnect-cancel-${Date.now()}`, { mapId: "map-1" });
      const send = vi.fn();
      (exec as any).status = "active";
      (exec as any).child = { connected: true, send };

      const reconnect = exec.reconnectPlayer("pending-player", "pending-uid", {
        id: "pending-transport",
        connected: true,
      } as any);
      const requestId = Array.from((exec as any).pendingReconnects.keys())[0];

      await vi.advanceTimersByTimeAsync(5000);

      await expect(reconnect).resolves.toBe(false);
      expect(send).toHaveBeenCalledWith({
        type: "cancel_reconnect",
        requestId,
        generation: 1,
        playerId: "pending-player",
      });
      expect((exec as any).invalidatedReconnects.has(requestId)).toBe(true);

      (exec as any).handleChildMessage({
        type: "reconnect_result",
        requestId,
        generation: 1,
        accepted: true,
      }, setTimeout(() => undefined, 1000));
      expect((exec as any).pendingReconnects.has(requestId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not resurrect a terminated execution on a late ready message", () => {
    const exec = new ForkedRoomExecution(`test-late-ready-${Date.now()}`, { mapId: "map-1" });
    const send = vi.fn();
    const readyResolve = vi.fn();
    const timer = setTimeout(() => undefined, 1000);

    (exec as any).status = "ending";
    (exec as any).child = { connected: true, pid: 123, send };
    (exec as any).readyResolve = readyResolve;
    (exec as any).pendingMessages = [{ type: "register_player", playerId: "late-player" }];

    (exec as any).handleChildMessage({
      type: "ready",
      roomId: exec.roomId,
      pid: 123,
    }, timer);

    expect((exec as any).status).toBe("ending");
    expect(readyResolve).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect((exec as any).pendingMessages).toEqual([]);
  });

  it("replicates animation-driving state through the forked state sync", async () => {
    const roomId = `test-animation-state-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const events: any[] = [];
    connectionRegistry.register("animation-player", {
      id: "animation-player",
      connected: true,
      emit: (_event: string, data: any) => events.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    } as any);

    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer("animation-player");
      await exec.send("animation-player", { type: "PLAYER_READY" });
      await exec.send("animation-player", { type: "SET_AIM", aiming: true });
      await exec.send("animation-player", {
        type: "INPUT",
        seq: 1,
        inputMask: 0x70,
        pitch: 0.1,
        yaw: 0.2,
      });
      await exec.send("animation-player", { type: "FIRE", weaponSlot: "primary" });

      const deadline = Date.now() + 3000;
      let state: any;
      while (Date.now() < deadline) {
        state = events.find(
          (event) =>
            event?.type === "state_sync" &&
            event.players?.find(
              (player: any) =>
                player.id === "animation-player" &&
                player.isFiring &&
                player.isAiming &&
                player.isCrouching &&
                player.isSprinting,
            ),
        );
        if (state) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const player = state?.players?.find((entry: any) => entry.id === "animation-player");
      expect(player).toMatchObject({
        isFiring: true,
        isAiming: true,
        isCrouching: true,
        isSprinting: true,
      });
    } finally {
      connectionRegistry.unregister("animation-player");
    }
  }, 45000);

  it("does not auto-register gameplay input for a removed player", async () => {
    const roomId = `test-removed-input-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    const events: any[] = [];
    const makeChannel = (id: string) => ({
      id,
      connected: true,
      emit: (_event: string, data: any) => events.push(data),
      rawEmit: () => undefined,
      on: () => undefined,
      onRaw: () => undefined,
      onDisconnect: () => undefined,
      removeAllListeners: () => undefined,
    });
    connectionRegistry.register("removed-player", makeChannel("removed-transport") as any);
    connectionRegistry.register("remaining-player", makeChannel("remaining-transport") as any);

    try {
      exec.start();
      await exec.waitUntilReady();
      await exec.registerPlayer("removed-player", "ASSAULT", undefined, "removed-player", undefined, undefined, "removed-transport");
      await exec.registerPlayer("remaining-player", "ASSAULT", undefined, "remaining-player", undefined, undefined, "remaining-transport");
      await exec.send("remaining-player", { type: "PLAYER_READY" });
      await new Promise((resolve) => setTimeout(resolve, 100));
      events.length = 0;

      await exec.removePlayer("removed-player");
      await exec.send("removed-player", {
        type: "INPUT",
        seq: 1,
        inputMask: 1,
        pitch: 0.2,
        yaw: 0.3,
      });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const state = events.find((event) => event?.type === "state_sync");
      expect(state?.players?.some((player: any) => player.id === "removed-player")).toBe(false);
    } finally {
      connectionRegistry.unregister("removed-player");
      connectionRegistry.unregister("remaining-player");
    }
  }, 45000);

  it("4. Outbound events cross back to the parent", async () => {
    const roomId = `test-outbound-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    await exec.waitUntilReady();

    let outboundTarget: string | null = null;
    let outboundEvent: any = null;
    exec.onOutbound((target, event) => {
      if (event.type === "QUICK_COMM") {
        outboundTarget = target;
        outboundEvent = event;
      }
    });

    await exec.send("broadcast", {
      type: "QUICK_COMM",
      sender: "CommanderA",
      optionId: "ATTACK_OBJECTIVE",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(outboundTarget).toBe("broadcast");
    expect(outboundEvent).not.toBeNull();
    expect(outboundEvent.type).toBe("QUICK_COMM");
    expect(outboundEvent.optionId).toBe("ATTACK_OBJECTIVE");
  }, 45000);

  it("5. Multiple room executions have independent OS processes (PIDs)", async () => {
    const roomIdA = `test-multi-A-${Date.now()}`;
    const roomIdB = `test-multi-B-${Date.now()}`;

    const execA = new ForkedRoomExecution(roomIdA, { mapId: "map-1" });
    const execB = new ForkedRoomExecution(roomIdB, { mapId: "map-1" });
    activeExecutions.push(execA, execB);
    execA.start();
    execB.start();

    await Promise.all([execA.waitUntilReady(), execB.waitUntilReady()]);

    expect(execA.pid).toBeTypeOf("number");
    expect(execB.pid).toBeTypeOf("number");
    expect(execA.pid).not.toEqual(execB.pid);
    expect(process.pid).not.toEqual(execA.pid);
    expect(process.pid).not.toEqual(execB.pid);
  }, 45000);

  it("6. Terminating one room does not terminate another", async () => {
    const roomIdA = `test-term-A-${Date.now()}`;
    const roomIdB = `test-term-B-${Date.now()}`;

    const execA = new ForkedRoomExecution(roomIdA, { mapId: "map-1" });
    const execB = new ForkedRoomExecution(roomIdB, { mapId: "map-1" });
    activeExecutions.push(execA, execB);
    execA.start();
    execB.start();

    await Promise.all([execA.waitUntilReady(), execB.waitUntilReady()]);

    // Terminate room A normally
    await execA.terminate("NORMAL_TERMINATION");
    await new Promise((resolve) => setTimeout(resolve, 200));

    const statusA = await execA.getStatus();
    const statusB = await execB.getStatus();

    expect(statusA).toBe("ending");
    expect(statusB).toBe("active");

    // Room B remains fully operational
    let bReceived: any = null;
    execB.onOutbound((target, event) => {
      if (event.type === "CHAT_MESSAGE") bReceived = event;
    });

    await execB.send("broadcast", {
      type: "CHAT_MESSAGE",
      sender: "CommanderB",
      message: "Room B still alive",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(bReceived).not.toBeNull();
    expect(bReceived.message).toBe("Room B still alive");
  }, 45000);

  it("7. Unexpected child exit produces 'crashed'", async () => {
    const roomId = `test-crash-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    await exec.waitUntilReady();
    expect(await exec.getStatus()).toBe("active");

    const pid = exec.pid!;
    process.kill(pid, "SIGKILL");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const status = await exec.getStatus();
    expect(status).toBe("crashed");
  }, 45000);

  it("8. Allocator removes/releases dead executions", async () => {
    const allocator = new RoomAllocator();
    allocator.setBackend("isolated");

    const roomId = `test-alloc-release-${Date.now()}`;
    const exec = (await allocator.allocate(roomId, undefined, "map-1")) as ForkedRoomExecution;
    activeExecutions.push(exec);
    void exec.waitUntilReady().catch(() => undefined);

    expect(allocator.getActiveRoomCount()).toBe(1);
    expect(allocator.getExecution(roomId)).toBe(exec);

    // Simulate child crash
    const pid = exec.pid!;
    process.kill(pid, "SIGKILL");

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Allocator release hook cleans up execution
    expect(allocator.getActiveRoomCount()).toBe(0);
    expect(allocator.getExecution(roomId)).toBeUndefined();
  }, 45000);

  it("9. Normal room shutdown produces the expected lifecycle", async () => {
    const roomId = `test-shutdown-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);
    exec.start();

    await exec.waitUntilReady();
    expect(await exec.getStatus()).toBe("active");

    await exec.terminate("MATCH_COMPLETED");
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(await exec.getStatus()).toBe("ending");
  }, 45000);

  it("10. Existing InProcessRoomExecution backend remains intact", async () => {
    await RAPIER.init();
    const allocator = new RoomAllocator();
    allocator.setBackend("in-process");

    const roomId = `test-inproc-${Date.now()}`;
    const exec = await allocator.allocate(roomId, undefined, "map-1");

    expect(exec).toBeInstanceOf(InProcessRoomExecution);
    expect(await exec.getStatus()).toBe("active");
    expect(allocator.getActiveRoomCount()).toBe(1);

    allocator.release(roomId);
    expect(allocator.getActiveRoomCount()).toBe(0);
  }, 45000);
});
