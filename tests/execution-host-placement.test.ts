import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomAllocator } from "../server/execution/RoomAllocator";
import { LocalExecutionHost } from "../server/execution/LocalExecutionHost";
import { InProcessRoomExecution } from "../server/execution/InProcessRoomExecution";
import { matchManager } from "../server/MatchManager";

vi.mock("../server/MatchRoom", () => {
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
      recordPlayerActivity() {}
      updatePlayerInput() {}
      useUtility() {}
      setObjectiveHold() {}
      setPlayerReady() {}
      handlePlayerAbandonment = vi.fn().mockResolvedValue(undefined);
      handlePlayerDisconnect = vi.fn();
      applyPlayerClassLoadout = vi.fn();
      removePlayer = vi.fn();
    },
    getWeaponReloadTicks: vi.fn().mockReturnValue(60),
  };
});

describe("Stage D: Execution Host and Room Placement", () => {
  let allocator: RoomAllocator;

  beforeEach(() => {
    const rooms = matchManager.getRooms();
    rooms.forEach((r) => matchManager.deleteRoom(r.roomId));
    allocator = new RoomAllocator();
  });

  it("1. LocalExecutionHost tracks capacity, slots, and ownership correctly", async () => {
    const host = new LocalExecutionHost({
      id: "host-alpha",
      capacity: 3,
      backendType: "in-process",
    });

    expect(host.id).toBe("host-alpha");
    expect(host.capacity).toBe(3);
    expect(host.getActiveRoomCount()).toBe(0);
    expect(host.getRemainingCapacity()).toBe(3);
    expect(host.hasCapacity()).toBe(true);

    const exec1 = await host.allocateRoom("room-alpha-1");
    expect(exec1).toBeDefined();
    expect(exec1.roomId).toBe("room-alpha-1");
    expect(host.getActiveRoomCount()).toBe(1);
    expect(host.getRemainingCapacity()).toBe(2);
    expect(host.hasRoom("room-alpha-1")).toBe(true);
    expect(host.getRoomExecution("room-alpha-1")).toBe(exec1);

    const metrics = host.getMetrics();
    expect(metrics.activeRooms).toBe(1);
    expect(metrics.capacity).toBe(3);
    expect(metrics.remainingCapacity).toBe(2);
    expect(metrics.backendType).toBe("in-process");

    await host.releaseRoom("room-alpha-1");
    expect(host.getActiveRoomCount()).toBe(0);
    expect(host.getRemainingCapacity()).toBe(3);
    expect(host.hasRoom("room-alpha-1")).toBe(false);
  });

  it("2. RoomAllocator places rooms across multiple hosts using least-loaded strategy", async () => {
    // Clear default host and register two explicit hosts
    const hosts = allocator.getHosts();
    hosts.forEach((h) => allocator.unregisterHost(h.id));

    const hostA = new LocalExecutionHost({ id: "host-A", capacity: 4, backendType: "in-process" });
    const hostB = new LocalExecutionHost({ id: "host-B", capacity: 4, backendType: "in-process" });

    allocator.registerHost(hostA);
    allocator.registerHost(hostB);

    // Allocate 1st room -> should pick hostA (or hostB, both empty)
    const exec1 = await allocator.allocate("match-1");
    const hostForRoom1 = allocator.getHostForRoom("match-1");
    expect(hostForRoom1).toBeDefined();
    const firstHostId = hostForRoom1!.id;

    // Allocate 2nd room -> should pick the other host (least loaded)
    const exec2 = await allocator.allocate("match-2");
    const hostForRoom2 = allocator.getHostForRoom("match-2");
    expect(hostForRoom2).toBeDefined();
    const secondHostId = hostForRoom2!.id;

    expect(firstHostId).not.toEqual(secondHostId);
    expect(hostA.getActiveRoomCount()).toBe(1);
    expect(hostB.getActiveRoomCount()).toBe(1);
    expect(allocator.getActiveRoomCount()).toBe(2);

    // Allocate 3rd and 4th rooms -> load balances across both
    await allocator.allocate("match-3");
    await allocator.allocate("match-4");

    expect(hostA.getActiveRoomCount()).toBe(2);
    expect(hostB.getActiveRoomCount()).toBe(2);
    expect(allocator.getActiveRoomCount()).toBe(4);
  });

  it("3. RoomAllocator handles capacity exhaustion gracefully", async () => {
    const hosts = allocator.getHosts();
    hosts.forEach((h) => allocator.unregisterHost(h.id));

    const tinyHost = new LocalExecutionHost({ id: "tiny-host", capacity: 2, backendType: "in-process" });
    allocator.registerHost(tinyHost);

    await allocator.allocate("room-1");
    await allocator.allocate("room-2");

    expect(tinyHost.hasCapacity()).toBe(false);

    // 3rd allocation must reject with capacity error
    await expect(allocator.allocate("room-3")).rejects.toThrow(/capacity/i);

    // Release one room -> capacity restored
    allocator.release("room-1");
    expect(tinyHost.hasCapacity()).toBe(true);

    const exec3 = await allocator.allocate("room-3");
    expect(exec3.roomId).toBe("room-3");
    expect(allocator.getActiveRoomCount()).toBe(2);
  });

  it("4. RoomAllocator correctly routes to backend-specific hosts", async () => {
    const hosts = allocator.getHosts();
    hosts.forEach((h) => allocator.unregisterHost(h.id));

    const inProcHost = new LocalExecutionHost({ id: "host-inproc", capacity: 5, backendType: "in-process" });
    const forkedHost = new LocalExecutionHost({ id: "host-forked", capacity: 5, backendType: "isolated" });

    allocator.registerHost(inProcHost);
    allocator.registerHost(forkedHost);

    // Request in-process
    const execInProc = await allocator.allocate("room-proc-1", undefined, "map-1", "in-process");
    expect(allocator.getHostForRoom("room-proc-1")?.id).toBe("host-inproc");
    expect(execInProc).toBeInstanceOf(InProcessRoomExecution);
    expect(inProcHost.hasRoom("room-proc-1")).toBe(true);
    expect(forkedHost.hasRoom("room-proc-1")).toBe(false);
  });

  it("5. Host release and termination bookkeeping cleans up allocator mappings", async () => {
    const exec = await allocator.allocate("room-to-terminate");
    expect(allocator.getActiveRoomCount()).toBe(1);
    expect(allocator.getHostForRoom("room-to-terminate")).toBeDefined();

    // Terminate via RoomExecution
    await exec.terminate("MATCH_FINISHED");

    // Allocator and host bookkeeping updated
    expect(allocator.getActiveRoomCount()).toBe(0);
    expect(allocator.getHostForRoom("room-to-terminate")).toBeUndefined();
    expect(allocator.getExecution("room-to-terminate")).toBeUndefined();
  });

  it("6. Host shutdown releases all active rooms", async () => {
    const host = new LocalExecutionHost({ id: "bulk-host", capacity: 5, backendType: "in-process" });
    allocator.registerHost(host);

    await host.allocateRoom("bulk-1");
    await host.allocateRoom("bulk-2");
    await host.allocateRoom("bulk-3");

    expect(host.getActiveRoomCount()).toBe(3);
    await host.shutdown();
    expect(host.getActiveRoomCount()).toBe(0);
    expect(host.getRemainingCapacity()).toBe(5);
  });
});
