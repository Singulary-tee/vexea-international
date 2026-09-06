import { describe, expect, it } from "vitest";
import { createClientIdentity, createInput, payloadSize } from "../benchmarks/src/workload";

describe("benchmark workload helpers", () => {
  it("creates stable identities for paired room/client seeds", () => {
    expect(createClientIdentity("trial-7", 2, 3)).toEqual({
      roomIndex: 2,
      clientIndex: 3,
      matchId: "trial-7-2",
      uid: "benchmark-2-3",
      displayName: "benchmark-2-3",
    });
  });

  it("creates semantic input without depending on the wire packet layout", () => {
    expect(createInput(42, 3)).toMatchObject({ sequence: 42, moveForward: false, pitch: 0 });
    expect(createInput(42, 3).yaw).toBeCloseTo(0.6);
  });

  it("measures binary and structured payloads without throwing", () => {
    expect(payloadSize(new Uint8Array([1, 2, 3]))).toBe(3);
    expect(payloadSize({ type: "state_sync" })).toBeGreaterThan(0);
  });
});
