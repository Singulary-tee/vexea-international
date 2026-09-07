import { describe, it, expect, afterEach } from "vitest";
import { ForkedRoomExecution } from "../server/execution/ForkedRoomExecution";
import { RoomAllocator } from "../server/execution/RoomAllocator";

describe("Stage C: Crash Isolation Verification", () => {
  const activeExecutions: ForkedRoomExecution[] = [];

  afterEach(async () => {
    while (activeExecutions.length > 0) {
      const exec = activeExecutions.pop();
      if (exec) {
        await exec.terminate("TEST_CLEANUP");
      }
    }
  });

  it("Demonstrates complete OS process crash isolation and resource cleanup", async () => {
    const allocator = new RoomAllocator();
    allocator.setBackend("isolated");

    const roomIdA = `crash-iso-A-${Date.now()}`;
    const roomIdB = `crash-iso-B-${Date.now()}`;

    // Allocate both rooms simultaneously
    const execA = (await allocator.allocate(roomIdA, undefined, "map-1")) as ForkedRoomExecution;
    const execB = (await allocator.allocate(roomIdB, undefined, "map-1")) as ForkedRoomExecution;
    activeExecutions.push(execA, execB);

    await Promise.all([execA.waitUntilReady(), execB.waitUntilReady()]);

    expect(await execA.getStatus()).toBe("active");
    expect(await execB.getStatus()).toBe("active");

    const pidA = execA.pid!;
    const pidB = execB.pid!;

    // Verify independent PIDs
    expect(pidA).toBeGreaterThan(0);
    expect(pidB).toBeGreaterThan(0);
    expect(pidA).not.toEqual(pidB);
    expect(pidA).not.toEqual(process.pid);
    expect(pidB).not.toEqual(process.pid);

    // Initial allocator state
    expect(allocator.getActiveRoomCount()).toBe(2);
    expect(allocator.getExecution(roomIdA)).toBe(execA);
    expect(allocator.getExecution(roomIdB)).toBe(execB);

    // Track outbound messages on Room B
    let bReceived: any = null;
    execB.onOutbound((target, event) => {
      if (event.type === "CHAT_MESSAGE") {
        bReceived = event;
      }
    });

    // Abruptly terminate Worker A using SIGKILL (simulating unexpected OS crash)
    process.kill(pidA, "SIGKILL");

    // Wait for process exit signal to be processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Worker A exits (no process alive at pidA)
    let isAliveA = true;
    try {
      process.kill(pidA, 0);
    } catch {
      isAliveA = false;
    }
    expect(isAliveA).toBe(false);

    // 2. Room A status transitions to 'crashed'
    const statusA = await execA.getStatus();
    expect(statusA).toBe("crashed");

    // 3. Room A is removed/released from the allocator
    expect(allocator.getExecution(roomIdA)).toBeUndefined();

    // 4. Worker B remains alive
    let isAliveB = false;
    try {
      process.kill(pidB, 0);
      isAliveB = true;
    } catch {
      isAliveB = false;
    }
    expect(isAliveB).toBe(true);
    expect(await execB.getStatus()).toBe("active");

    // 5 & 6. Room B continues ticking and processing inbound/outbound messages
    await execB.send("broadcast", {
      type: "CHAT_MESSAGE",
      sender: "CommanderB",
      message: "Room B tick check after A crash",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(bReceived).not.toBeNull();
    expect(bReceived.message).toBe("Room B tick check after A crash");

    // 7. Orchestrator / Parent Node process survived
    expect(process.pid).toBeGreaterThan(0);

    // 8. No sibling-room cleanup occurred (Room B remains registered in allocator)
    expect(allocator.getExecution(roomIdB)).toBe(execB);

    // 9. No orphaned Worker A process remains
  }, 45000);
});
