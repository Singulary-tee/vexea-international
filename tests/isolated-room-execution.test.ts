import { describe, it, expect, afterEach } from "vitest";
import { ForkedRoomExecution } from "../server/execution/ForkedRoomExecution";
import { InProcessRoomExecution } from "../server/execution/InProcessRoomExecution";
import { RoomAllocator } from "../server/execution/RoomAllocator";

describe("Stage C: Isolated Room Execution Backend", () => {
  const activeExecutions: ForkedRoomExecution[] = [];

  afterEach(async () => {
    while (activeExecutions.length > 0) {
      const exec = activeExecutions.pop();
      if (exec) {
        await exec.terminate("TEST_CLEANUP");
      }
    }
  });

  it("1. Room process can start", async () => {
    const roomId = `test-start-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    expect(exec.pid).toBeTypeOf("number");
    expect(exec.pid).toBeGreaterThan(0);
    expect(exec.pid).not.toEqual(process.pid);
  }, 45000);

  it("2. Room reports ready", async () => {
    const roomId = `test-ready-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

    await exec.waitUntilReady();
    const status = await exec.getStatus();
    expect(status).toBe("active");
  }, 45000);

  it("3. RoomExecution.send reaches the correct room", async () => {
    const roomId = `test-send-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

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

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(outboundReceived).not.toBeNull();
    expect(outboundReceived.event.message).toBe("Worker inbound message");
  }, 45000);

  it("4. Outbound events cross back to the parent", async () => {
    const roomId = `test-outbound-${Date.now()}`;
    const exec = new ForkedRoomExecution(roomId, { mapId: "map-1" });
    activeExecutions.push(exec);

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

    await exec.waitUntilReady();
    expect(await exec.getStatus()).toBe("active");

    await exec.terminate("MATCH_COMPLETED");
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(await exec.getStatus()).toBe("ending");
  }, 45000);

  it("10. Existing InProcessRoomExecution backend remains intact", async () => {
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
