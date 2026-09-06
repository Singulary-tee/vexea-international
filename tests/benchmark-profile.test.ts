import { describe, expect, it } from "vitest";
import { validateProfile } from "../benchmarks/src/validate";

const profile = {
  schemaVersion: 1,
  id: "test",
  title: "Test profile",
  boundary: "server-process",
  transport: "socketio",
  server: {
    command: ["node", "server.js"],
    port: 3000,
    readinessPath: "/",
  },
  map: { id: "benchmark_synthetic", mode: "synthetic", allowFallback: true },
  services: { llm: "disabled", persistence: "disabled", observability: "disabled" },
  instrumentation: "counters",
  workload: {
    rooms: 1,
    clientsPerRoom: 2,
    botsPerRoom: 0,
    dronesPerRoom: 0,
    projectilesPerRoom: 0,
    durationMs: 1000,
    warmupMs: 0,
    cooldownMs: 0,
    inputHz: 20,
    reliableEventsPerSecond: 0,
    firePerSecond: 0,
    contact: "none",
    seed: 1,
  },
  budgets: {
    maxP95TickMs: 16.6,
    minTickRate: 55,
    maxDroppedTicks: 0,
    maxRssBytes: 1000,
    maxCpuPercent: 100,
    maxP95RttMs: 250,
    maxLossRate: 0.01,
    maxNetworkBytesPerSecond: 1000,
    headroomPercent: 10,
  },
  trials: { warmups: 0, repetitions: 1, confidenceLevel: 0.95 },
};

describe("benchmark profile validation", () => {
  it("accepts a complete semantic profile", () => {
    expect(validateProfile(profile).workload.clientsPerRoom).toBe(2);
  });

  it("rejects unsupported transport values", () => {
    expect(() => validateProfile({ ...profile, transport: "fake" })).toThrow(/transport/);
  });

  it("rejects missing workload dimensions", () => {
    const invalid = { ...profile, workload: { ...profile.workload, dronesPerRoom: undefined } };
    expect(() => validateProfile(invalid)).toThrow(/dronesPerRoom/);
  });

  it("rejects invalid confidence levels", () => {
    expect(() => validateProfile({ ...profile, trials: { ...profile.trials, confidenceLevel: 1 } })).toThrow(/confidenceLevel/);
  });
});
