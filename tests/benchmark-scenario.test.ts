import { describe, expect, it } from "vitest";
import { createBenchmarkScenarioDriver, encodeInputPacket } from "../benchmarks/src/scenario-driver";
import { BenchmarkClientTransport } from "../benchmarks/src/client-transport";

function transport(): { client: BenchmarkClientTransport; calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client: BenchmarkClientTransport = {
    stats: {} as BenchmarkClientTransport["stats"],
    connect: async () => undefined,
    on: (event, callback) => calls.push({ method: `on:${event}`, args: [callback] }),
    emit: (event, data) => calls.push({ method: "emit", args: [event, data] }),
    emitReliable: (event, data) => calls.push({ method: "emitReliable", args: [event, data] }),
    rawEmit: (data) => calls.push({ method: "rawEmit", args: [data] }),
    disconnect: () => calls.push({ method: "disconnect", args: [] }),
  };
  return { client, calls };
}

describe("benchmark semantic scenario driver", () => {
  it("keeps protocol names and packet encoding inside the adapter", () => {
    const { client, calls } = transport();
    const driver = createBenchmarkScenarioDriver(client);

    driver.observe("session-initialized", () => undefined);
    driver.join({
      roomIndex: 0,
      clientIndex: 0,
      matchId: "trial-0",
      uid: "benchmark-0-0",
      displayName: "benchmark-0-0",
      mapId: "benchmark_synthetic",
    });
    driver.advance({ kind: "loading-complete" });
    driver.advance({ kind: "ready" });
    driver.spawn({ kind: "drone", type: 4, position: { x: 1, y: 2, z: 3 } });
    driver.input({ sequence: 42, moveForward: false, pitch: 0, yaw: 0.6 });
    driver.reliable({ kind: "fire", weaponSlot: "primary" });
    driver.probe();

    expect(calls.map(({ method, args }) => [method, args[0]])).toEqual([
      ["on:session_init", expect.any(Function)],
      ["emit", "start_match"],
      ["emit", "loading_complete"],
      ["emit", "player_ready"],
      ["emit", "dev_spawn_drone"],
      ["rawEmit", expect.any(Uint8Array)],
      ["emitReliable", "reliable_event"],
      ["emit", "ping"],
    ]);
    expect(calls[1].args[1]).toMatchObject({ isDevQuickStart: true, mapId: "benchmark_synthetic" });
    expect(calls[2].args[1]).toEqual({ matchId: "trial-0" });
    expect(calls[4].args[1]).toEqual({ type: 4, x: 1, y: 2, z: 3 });
    expect(calls[6].args[1]).toEqual({ type: "FIRE", weaponSlot: "primary" });
  });

  it("encodes semantic input at the protocol boundary", () => {
    const packet = encodeInputPacket({ sequence: 42, moveForward: false, pitch: 0, yaw: 0.6 });
    const view = new DataView(packet.buffer);
    expect(packet.byteLength).toBe(20);
    expect(view.getUint32(0, true)).toBe(42);
    expect(view.getUint8(4)).toBe(0);
    expect(view.getFloat32(5, true)).toBe(0);
    expect(view.getFloat32(9, true)).toBeCloseTo(0.6);
  });
});
