import { describe, expect, it } from "vitest";
import {
  bootstrapConfidence,
  buildSummary,
  evaluateSlo,
  measureTrial,
  percentile,
  summarizeValues,
} from "../benchmarks/src/metrics";
import { BenchmarkProfile, BenchmarkTrialResult, TelemetrySample } from "../benchmarks/src/types";

const profile: BenchmarkProfile = {
  schemaVersion: 1,
  id: "metrics-test",
  title: "Metrics test",
  boundary: "server-process",
  transport: "socketio",
  server: { command: ["node", "server.js"], port: 3000, readinessPath: "/" },
  map: { id: "benchmark_synthetic", mode: "synthetic", allowFallback: true },
  services: { llm: "disabled", persistence: "disabled", observability: "disabled" },
  instrumentation: "counters",
  workload: {
    rooms: 1,
    clientsPerRoom: 1,
    botsPerRoom: 0,
    dronesPerRoom: 0,
    projectilesPerRoom: 0,
    durationMs: 3000,
    warmupMs: 1000,
    cooldownMs: 1000,
    inputHz: 0,
    reliableEventsPerSecond: 0,
    firePerSecond: 0,
    contact: "none",
    seed: 1,
  },
  budgets: {
    maxP95TickMs: 1,
    minTickRate: 60,
    maxDroppedTicks: 0,
    maxRssBytes: 1,
    maxCpuPercent: 1,
    maxP95RttMs: 1,
    maxLossRate: 0,
    maxNetworkBytesPerSecond: 1,
    headroomPercent: 0,
  },
  trials: { warmups: 0, repetitions: 1, confidenceLevel: 0.95 },
};

function clientSample(timestampMs: number, incomingBytes: number, outgoingBytes = 0) {
  return {
    timestampMs,
    connected: 1,
    ready: 1,
    incomingBytes,
    outgoingBytes,
    wireIncomingBytes: incomingBytes,
    wireOutgoingBytes: outgoingBytes,
    incomingMessages: incomingBytes,
    outgoingMessages: outgoingBytes,
    rawIncomingBytes: 0,
    rawOutgoingBytes: 0,
    stateSyncMessages: incomingBytes,
    reliableMessages: 0,
    disconnects: 0,
    errors: 0,
    rttMs: 0,
  };
}

function telemetrySample(
  timestampMs: number,
  intervalStartMs: number,
  intervalEndMs: number,
  ticks: number,
  realized: { rooms?: number; players?: number; bots?: number; drones?: number; projectiles?: number } = {},
): TelemetrySample {
  return {
    type: "sample",
    timestampMs,
    intervalStartMs,
    intervalEndMs,
    counters: {
      "simulation.ticks": ticks,
      ...(realized.rooms === undefined ? {} : { "rooms.created": realized.rooms }),
      ...(realized.players === undefined ? {} : { "players.registered": realized.players }),
      ...(realized.bots === undefined ? {} : { "bots.spawned": realized.bots }),
      ...(realized.drones === undefined ? {} : { "drones.spawned": realized.drones }),
      ...(realized.projectiles === undefined ? {} : { "projectiles.spawned": realized.projectiles }),
    },
    gauges: {
      "entities.clients": realized.players || 0,
      "entities.bots": realized.bots || 0,
      "entities.drones": realized.drones || 0,
      "entities.projectiles": realized.projectiles || 0,
    },
    timers: {
      "simulation.tick": { count: ticks, sumMs: 0, maxMs: 0, p95Ms: 0 },
    },
  };
}

function trial(
  telemetry: TelemetrySample[],
  realized: { rooms?: number; players?: number; bots?: number; drones?: number; projectiles?: number },
  valid = true,
): BenchmarkTrialResult {
  return {
    trial: 1,
    valid,
    status: valid ? "passed" : "invalid",
    startedAt: new Date(0).toISOString(),
    durationMs: 5000,
    measurement: { startMs: 1000, endMs: 4000, durationMs: 3000 },
    process: [
      { timestampMs: 1000, pid: 1, cpuUserMs: 0, cpuSystemMs: 0, rssBytes: 1 },
      { timestampMs: 4000, pid: 1, cpuUserMs: 0, cpuSystemMs: 0, rssBytes: 1 },
    ],
    clients: [clientSample(1000, 0), clientSample(4000, 300)],
    telemetry: telemetry.length ? telemetry : [telemetrySample(1500, 1000, 1500, 60, realized)],
    events: [],
  };
}

describe("benchmark metric reduction", () => {
  it("computes deterministic percentiles", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([4, 1, 3, 2], 0.95)).toBe(4);
  });

  it("reports trial summaries and a stable bootstrap interval", () => {
    const summary = summarizeValues([10, 20, 30], "ms", 0.95, 7);
    expect(summary.median).toBe(20);
    expect(summary.max).toBe(30);
    expect(summary.confidence95).toEqual(bootstrapConfidence([10, 20, 30], 0.95, 7));
  });

  it("uses the active measurement window for rates instead of setup and teardown", () => {
    const measured = measureTrial(trial([
      telemetrySample(500, 0, 1000, 60),
      telemetrySample(1500, 1000, 2000, 60),
      telemetrySample(2500, 2000, 3000, 60),
      telemetrySample(3500, 3000, 4000, 60),
      telemetrySample(4500, 4000, 5000, 60),
    ], {}));

    expect(measured.metrics["tick.rate_hz"]?.value).toBe(60);
    expect(measured.metrics["network.logical_bytes_per_second"]?.value).toBe(100);
  });

  it("does not dilute tick rates when boundary flushes are partial", () => {
    const measuredTrial = trial([
      telemetrySample(1500, 1000, 2000, 60),
      telemetrySample(2500, 2000, 3000, 60),
    ], {});
    measuredTrial.measurement = { startMs: 900, endMs: 3100, durationMs: 2200 };

    expect(measureTrial(measuredTrial).metrics["tick.rate_hz"]?.value).toBe(60);
  });

  it("computes timer percentiles from raw observations across telemetry buckets", () => {
    const first = telemetrySample(1500, 1000, 1500, 1);
    const second = telemetrySample(2500, 2000, 2500, 1);
    first.timers["simulation.tick"] = {
      count: 100,
      sumMs: 100,
      maxMs: 1,
      p95Ms: 1,
      samples: Array.from({ length: 100 }, () => 1),
    };
    second.timers["simulation.tick"] = {
      count: 1,
      sumMs: 1000,
      maxMs: 1000,
      p95Ms: 1000,
      samples: [1000],
    };

    expect(measureTrial(trial([first, second], {})).metrics["tick.p95_ms"]?.value).toBe(1);
  });

  it("retains event-loop and scheduler stall maxima in the trial summary", () => {
    const stalled = telemetrySample(1500, 1000, 1500, 1);
    stalled.eventLoop = { delayMaxMs: 405 };
    stalled.timers["simulation.scheduler_lateness"] = {
      count: 1,
      sumMs: 400,
      maxMs: 400,
      p95Ms: 400,
      samples: [400],
    };

    const measured = measureTrial(trial([stalled], {}));

    expect(measured.metrics["event_loop.delay_max_ms"]?.value).toBe(405);
    expect(measured.metrics["scheduler.lateness_max_ms"]?.value).toBe(400);
  });

  it("keeps legitimate zero metrics present while leaving absent telemetry missing", () => {
    const zero = measureTrial(trial([
      telemetrySample(1500, 1000, 1500, 0),
    ], { rooms: 1, players: 1 }));

    expect(zero.metrics["tick.dropped"]?.value).toBe(0);
    expect(zero.metrics["tick.p95_ms"]?.value).toBe(0);
    expect(measureTrial({
      ...trial([], {}),
      telemetry: [],
      clients: [],
    }).metrics["tick.dropped"]).toBeUndefined();
  });

  it("fails SLO evaluation for a zero-valued metric only when it is actually absent", () => {
    const metrics = {
      "tick.p95_ms": { unit: "ms", count: 1, median: 0, p95: 0, max: 0 },
      "cpu.process_percent": { unit: "%", count: 1, median: 0, p95: 0, max: 0 },
      "memory.rss_bytes": { unit: "bytes", count: 1, median: 0, p95: 0, max: 0 },
      "network.rtt_p95_ms": { unit: "ms", count: 1, median: 0, p95: 0, max: 0 },
      "network.loss_rate": { unit: "ratio", count: 1, median: 0, p95: 0, max: 0 },
      "network.logical_bytes_per_second": { unit: "bytes/s", count: 1, median: 0, p95: 0, max: 0 },
      "tick.rate_hz": { unit: "Hz", count: 1, median: 60, p95: 60, max: 60 },
      "tick.dropped": { unit: "ticks", count: 1, median: 0, p95: 0, max: 0 },
    };
    expect(evaluateSlo(profile, metrics, 1, 1, {
      rooms: 1,
      players: 1,
      bots: 0,
      drones: 0,
      projectiles: 0,
    }).passed).toBe(true);
    expect(evaluateSlo(profile, { ...metrics, "tick.rate_hz": undefined }, 1, 1, {
      rooms: 1,
      players: 1,
      bots: 0,
      drones: 0,
      projectiles: 0,
    }).failures).toContain("missing tick rate metric (tick.rate_hz)");
  });

  it("requires every valid trial to realize the declared workload", () => {
    const complete = trial([
      telemetrySample(1500, 1000, 1500, 60, { rooms: 1, players: 1, bots: 0, drones: 0, projectiles: 0 }),
    ], { rooms: 1, players: 1, bots: 0, drones: 0, projectiles: 0 });
    const underRealized = trial([
      telemetrySample(1500, 1000, 1500, 60, { rooms: 1, players: 0, bots: 0, drones: 0, projectiles: 0 }),
    ], { rooms: 1, players: 0, bots: 0, drones: 0, projectiles: 0 });
    const summary = buildSummary({
      ...profile,
      workload: { ...profile.workload, clientsPerRoom: 1 },
      budgets: { ...profile.budgets, maxRssBytes: 10, maxCpuPercent: 100, maxNetworkBytesPerSecond: 1000 },
      trials: { ...profile.trials, repetitions: 2 },
    }, [complete, { ...underRealized, trial: 2 }]);

    expect(summary.slo.failures).toContain("workload realization players 0 is below target 1");
  });

  it("does not make a capacity claim from a single passing trial", () => {
    const complete = trial([], { rooms: 1, players: 1, bots: 0, drones: 0, projectiles: 0 });
    const summary = buildSummary({
      ...profile,
      budgets: { ...profile.budgets, maxRssBytes: 10, maxCpuPercent: 100, maxNetworkBytesPerSecond: 1000 },
    }, [complete]);

    expect(summary.slo.passed).toBe(true);
    expect(summary.capacityClaim).toBeUndefined();
  });
});
