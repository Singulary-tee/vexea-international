import {
  BenchmarkProfile,
  BenchmarkSummary,
  BenchmarkTrialResult,
  ClientSample,
  TelemetrySample,
} from "./types";

export interface MetricValue {
  value: number;
  unit: string;
}

type RealizationName = "rooms" | "players" | "bots" | "drones" | "projectiles";
type Realization = Partial<Record<RealizationName, number>>;

export interface TrialMeasurements {
  metrics: Record<string, MetricValue>;
  counters: Record<string, number>;
  realization: Realization;
  activeRealization: Realization;
}

export function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(quantile * sorted.length) - 1));
  return sorted[index];
}

export function bootstrapConfidence(
  values: number[],
  confidenceLevel: number,
  seed: number,
  iterations = 1000,
): [number, number] {
  if (values.length === 0) return [Number.NaN, Number.NaN];
  if (values.length === 1) return [values[0], values[0]];

  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const medians: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      sample.push(values[Math.floor(next() * values.length)]);
    }
    medians.push(percentile(sample, 0.5));
  }
  const alpha = (1 - confidenceLevel) / 2;
  return [percentile(medians, alpha), percentile(medians, 1 - alpha)];
}

export function summarizeValues(
  values: number[],
  unit: string,
  confidenceLevel: number,
  seed: number,
): BenchmarkSummary["metrics"][string] {
  if (values.length === 0) {
    throw new Error(`Cannot summarize an empty metric series (${unit})`);
  }
  return {
    unit,
    count: values.length,
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: Math.max(...values),
    confidence95: bootstrapConfidence(values, confidenceLevel, seed),
  };
}

function sumCounter(samples: TelemetrySample[], name: string): number | undefined {
  if (samples.length === 0) return undefined;
  return samples.reduce((sum, sample) => {
    const value = sample.counters[name];
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function aggregateCounters(samples: TelemetrySample[]): Record<string, number> {
  const counters: Record<string, number> = {};
  for (const sample of samples) {
    for (const [name, value] of Object.entries(sample.counters)) {
      if (Number.isFinite(value)) counters[name] = (counters[name] || 0) + value;
    }
  }
  return counters;
}

function maxGauge(samples: TelemetrySample[], name: string): number | undefined {
  const values = samples
    .map((sample) => sample.gauges[name])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function timerPercentile(samples: TelemetrySample[], name: string): number | undefined {
  const values: number[] = [];
  for (const sample of samples) {
    const timer = sample.timers[name];
    if (!timer) continue;
    if (timer.samples) {
      values.push(...timer.samples.filter((value) => Number.isFinite(value)));
    } else if (Number.isFinite(timer.p95Ms)) {
      values.push(timer.p95Ms);
    }
  }
  return values.length > 0 ? percentile(values, 0.95) : undefined;
}

function timerMax(samples: TelemetrySample[], name: string): number | undefined {
  const values = samples
    .map((sample) => sample.timers[name]?.maxMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function maxProcess(samples: BenchmarkTrialResult["process"], field: string): number | undefined {
  const values = (samples || [])
    .map((sample) => sample[field as keyof typeof sample])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function maxTelemetryProcess(samples: TelemetrySample[], field: string): number | undefined {
  const values = samples
    .map((sample) => sample.process?.[field])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function maxDefined(...values: Array<number | undefined>): number | undefined {
  const present = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  return present.length > 0 ? Math.max(...present) : undefined;
}

function minHost(samples: BenchmarkTrialResult["host"], field: string): number | undefined {
  const values = (samples || [])
    .map((sample) => sample[field as keyof typeof sample])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.min(...values) : undefined;
}

function maxHost(samples: BenchmarkTrialResult["host"], field: string): number | undefined {
  const values = (samples || [])
    .map((sample) => sample[field as keyof typeof sample])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function hostCpuPercent(samples: BenchmarkTrialResult["host"]): number | undefined {
  const ordered = [...(samples || [])].sort((left, right) => left.timestampMs - right.timestampMs);
  if (ordered.length < 2) return undefined;
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const user = (last.cpuUserMs || 0) - (first.cpuUserMs || 0);
  const system = (last.cpuSystemMs || 0) - (first.cpuSystemMs || 0);
  const idle = (last.cpuIdleMs || 0) - (first.cpuIdleMs || 0);
  const total = user + system + idle;
  return total > 0 ? Math.max(0, ((user + system) / total) * 100) : undefined;
}

function measurementWindow(trial: BenchmarkTrialResult): { startMs: number; endMs: number } | undefined {
  const window = trial.measurement;
  if (!window || !Number.isFinite(window.startMs) || !Number.isFinite(window.endMs) || window.endMs <= window.startMs) {
    return undefined;
  }
  return { startMs: window.startMs, endMs: window.endMs };
}

function telemetryInWindow(
  samples: TelemetrySample[],
  window: { startMs: number; endMs: number } | undefined,
): TelemetrySample[] {
  if (!window) return samples;
  return samples.filter((sample) => {
    if (sample.intervalStartMs !== undefined && sample.intervalEndMs !== undefined) {
      return sample.intervalStartMs >= window.startMs && sample.intervalEndMs <= window.endMs;
    }
    return sample.timestampMs >= window.startMs && sample.timestampMs <= window.endMs;
  });
}

function telemetryDurationSeconds(samples: TelemetrySample[], fallbackMs: number): number {
  const intervalMs = samples.reduce((sum, sample) => {
    if (sample.intervalStartMs === undefined || sample.intervalEndMs === undefined) return sum;
    return sum + Math.max(0, sample.intervalEndMs - sample.intervalStartMs);
  }, 0);
  return Math.max(0.001, (intervalMs || fallbackMs) / 1000);
}

function processInWindow(
  samples: BenchmarkTrialResult["process"],
  window: { startMs: number; endMs: number } | undefined,
): NonNullable<BenchmarkTrialResult["process"]> {
  const values = samples || [];
  return window
    ? values.filter((sample) => sample.timestampMs >= window.startMs && sample.timestampMs <= window.endMs)
    : values;
}

function processCpuPercent(
  samples: BenchmarkTrialResult["process"],
  window: { startMs: number; endMs: number } | undefined,
): number | undefined {
  const selected = processInWindow(samples, window);
  if (selected.length < 2) return undefined;
  const ordered = [...selected].sort((left, right) => left.timestampMs - right.timestampMs);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const wallMs = last.timestampMs - first.timestampMs;
  if (wallMs <= 0) return undefined;
  const cpuMs = (last.cpuUserMs + last.cpuSystemMs) - (first.cpuUserMs + first.cpuSystemMs);
  return Math.max(0, (cpuMs / wallMs) * 100);
}

function numericClientValue(sample: ClientSample, field: string): number | undefined {
  const value = sample[field as keyof ClientSample];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clientCounter(
  samples: BenchmarkTrialResult["clients"],
  field: string,
  window: { startMs: number; endMs: number } | undefined,
): number | undefined {
  const values = samples || [];
  if (values.length === 0) return undefined;
  if (!window) {
    const totals = values.map((sample) => numericClientValue(sample, field)).filter((value): value is number => value !== undefined);
    return totals.length > 0 ? Math.max(...totals) : undefined;
  }

  const ordered = [...values].sort((left, right) => left.timestampMs - right.timestampMs);
  const startSample = [...ordered].reverse().find((sample) => sample.timestampMs <= window.startMs);
  const endSample = [...ordered].reverse().find((sample) => sample.timestampMs <= window.endMs);
  const startValue = startSample ? numericClientValue(startSample, field) : undefined;
  const endValue = endSample ? numericClientValue(endSample, field) : undefined;
  if (startValue === undefined || endValue === undefined) return undefined;
  return Math.max(0, endValue - startValue);
}

function clientGaugeMax(
  samples: BenchmarkTrialResult["clients"],
  field: string,
  window: { startMs: number; endMs: number } | undefined,
): number | undefined {
  const values = (samples || [])
    .filter((sample) => !window || (sample.timestampMs >= window.startMs && sample.timestampMs <= window.endMs))
    .map((sample) => numericClientValue(sample, field))
    .filter((value): value is number => value !== undefined);
  return values.length > 0 ? Math.max(...values) : undefined;
}

function clientRttValues(
  samples: BenchmarkTrialResult["clients"],
  window: { startMs: number; endMs: number } | undefined,
): number[] {
  return (samples || [])
    .filter((sample) => !window || (sample.timestampMs >= window.startMs && sample.timestampMs <= window.endMs))
    .map((sample) => sample.rttMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function measureTrial(trial: BenchmarkTrialResult, rooms = 1): TrialMeasurements {
  const allTelemetry = trial.telemetry || [];
  const window = measurementWindow(trial);
  const activeTelemetry = telemetryInWindow(allTelemetry, window);
  const durationSeconds = Math.max(
    0.001,
    (window ? window.endMs - window.startMs : trial.durationMs) / 1000,
  );
  const tickDurationSeconds = telemetryDurationSeconds(
    activeTelemetry,
    window ? window.endMs - window.startMs : trial.durationMs,
  );
  const counters = aggregateCounters(activeTelemetry);
  const metrics: Record<string, MetricValue> = {};
  const add = (name: string, value: number | undefined, unit: string) => {
    if (value !== undefined && Number.isFinite(value)) metrics[name] = { value, unit };
  };

  add("tick.p95_ms", timerPercentile(activeTelemetry, "simulation.tick"), "ms");
  const ticks = sumCounter(activeTelemetry, "simulation.ticks");
  const tickRate = ticks === undefined ? undefined : ticks / tickDurationSeconds;
  add("tick.rate_hz", tickRate, "Hz");
  add("tick.rate_per_room_hz", tickRate === undefined ? undefined : tickRate / Math.max(1, rooms), "Hz");
  add("tick.dropped", sumCounter(activeTelemetry, "simulation.dropped_ticks"), "ticks");
  add("tick.catch_up_steps", sumCounter(activeTelemetry, "simulation.catch_up_steps"), "steps");
  add("tick.discarded_time_ms", sumCounter(activeTelemetry, "simulation.discarded_time_ms"), "ms");
  add("cpu.process_percent", processCpuPercent(trial.process, window), "%");

  const activeProcess = processInWindow(trial.process, window);
  const orchestratorRss = maxDefined(maxProcess(activeProcess, "rssBytes"), maxTelemetryProcess(activeTelemetry, "rssBytes"));
  add("memory.rss_bytes", orchestratorRss, "bytes");
  add("memory.orchestrator_rss_bytes", orchestratorRss, "bytes");
  add("memory.heap_used_bytes", maxDefined(maxProcess(activeProcess, "heapUsedBytes"), maxTelemetryProcess(activeTelemetry, "heapUsedBytes")), "bytes");
  add("memory.heap_total_bytes", maxDefined(maxProcess(activeProcess, "heapTotalBytes"), maxTelemetryProcess(activeTelemetry, "heapTotalBytes")), "bytes");
  add("memory.heap_limit_bytes", maxDefined(maxProcess(activeProcess, "heapLimitBytes"), maxTelemetryProcess(activeTelemetry, "heapLimitBytes")), "bytes");
  add("memory.external_bytes", maxDefined(maxProcess(activeProcess, "externalBytes"), maxTelemetryProcess(activeTelemetry, "externalBytes")), "bytes");
  add("memory.array_buffers_bytes", maxDefined(maxProcess(activeProcess, "arrayBuffersBytes"), maxTelemetryProcess(activeTelemetry, "arrayBuffersBytes")), "bytes");
  add("memory.native_bytes", maxDefined(maxProcess(activeProcess, "nativeBytes"), maxTelemetryProcess(activeTelemetry, "nativeBytes")), "bytes");
  add("memory.cgroup_bytes", maxDefined(maxProcess(activeProcess, "cgroupMemoryBytes"), maxTelemetryProcess(activeTelemetry, "cgroupMemoryBytes")), "bytes");

  const workerIds = new Set<string>();
  for (const sample of activeTelemetry) {
    if (sample.gauges) {
      for (const key of Object.keys(sample.gauges)) {
        if (key.startsWith("workers.") && key.endsWith(".rss_bytes") && key !== "workers.total_rss_bytes") {
          const parts = key.split(".");
          if (parts.length === 3) {
            workerIds.add(parts[1]);
          }
        }
      }
    }
  }

  let workerRssTotal = 0;
  for (const wId of workerIds) {
    const rss = maxGauge(activeTelemetry, `workers.${wId}.rss_bytes`);
    const pid = maxGauge(activeTelemetry, `workers.${wId}.pid`);
    if (rss !== undefined) {
      add(`memory.worker.${wId}.rss_bytes`, rss, "bytes");
      workerRssTotal += rss;
    }
    if (pid !== undefined) {
      add(`worker.${wId}.pid`, pid, "pid");
    }
  }

  const maxSampledTotalWorkerRss = maxGauge(activeTelemetry, "workers.total_rss_bytes");
  if (workerRssTotal === 0 && maxSampledTotalWorkerRss !== undefined) {
    workerRssTotal = maxSampledTotalWorkerRss;
  }

  add("memory.worker_rss_total_bytes", workerRssTotal, "bytes");
  const totalHostRss = (orchestratorRss || 0) + workerRssTotal;
  add("memory.total_host_rss_bytes", totalHostRss, "bytes");
  const activeRoomCount = Math.max(1, workerIds.size, rooms);
  add("memory.worker_rss_per_room_bytes", workerRssTotal / activeRoomCount, "bytes");

  const eventLoop = activeTelemetry
    .map((sample) => sample.eventLoop?.utilization)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  add("event_loop.utilization", eventLoop.length ? percentile(eventLoop, 0.95) : undefined, "ratio");
  const eventLoopDelay = activeTelemetry
    .map((sample) => sample.eventLoop?.delayP95Ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  add("event_loop.delay_p95_ms", percentile(eventLoopDelay, 0.95), "ms");
  const eventLoopDelayMax = activeTelemetry
    .map((sample) => sample.eventLoop?.delayMaxMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  add("event_loop.delay_max_ms", eventLoopDelayMax.length ? Math.max(...eventLoopDelayMax) : undefined, "ms");
  add("scheduler.lateness_max_ms", timerMax(activeTelemetry, "simulation.scheduler_lateness"), "ms");
  add("gc.collections", sumCounter(activeTelemetry, "gc.collections"), "collections");
  add("gc.pause_p95_ms", timerPercentile(activeTelemetry, "gc.pause"), "ms");

  const activeHost = (trial.host || []).filter((sample) => !window || (sample.timestampMs >= window.startMs && sample.timestampMs <= window.endMs));
  add("host.load1", maxHost(activeHost, "load1"), "load");
  add("host.memory_available_bytes", minHost(activeHost, "memoryAvailableBytes"), "bytes");
  add("host.cpu_percent", hostCpuPercent(activeHost), "%");

  const incomingBytes = clientCounter(trial.clients, "incomingBytes", window);
  const outgoingBytes = clientCounter(trial.clients, "outgoingBytes", window);
  const wireIncomingBytes = clientCounter(trial.clients, "wireIncomingBytes", window);
  const wireOutgoingBytes = clientCounter(trial.clients, "wireOutgoingBytes", window);
  add(
    "network.logical_bytes_per_second",
    incomingBytes === undefined || outgoingBytes === undefined
      ? undefined
      : (incomingBytes + outgoingBytes) / durationSeconds,
    "bytes/s",
  );
  add(
    "network.wire_bytes_per_second",
    wireIncomingBytes === undefined || wireOutgoingBytes === undefined
      ? undefined
      : (wireIncomingBytes + wireOutgoingBytes) / durationSeconds,
    "bytes/s",
  );
  add("network.rtt_p95_ms", percentile(clientRttValues(trial.clients, window), 0.95), "ms");
  const connected = clientGaugeMax(trial.clients, "connected", window);
  const disconnects = clientCounter(trial.clients, "disconnects", window);
  const errors = clientCounter(trial.clients, "errors", window);
  add(
    "network.loss_rate",
    connected === undefined || connected <= 0 || disconnects === undefined || errors === undefined
      ? undefined
      : (disconnects + errors) / connected,
    "ratio",
  );
  add("network.disconnects", disconnects, "events");
  add("network.errors", errors, "events");

  for (const name of ["network.state_sync.messages", "network.reliable.events", "network.raw.bytes"]) {
    const value = sumCounter(activeTelemetry, name);
    add(
      name === "network.state_sync.messages"
        ? "workload.state_sync_messages"
        : name === "network.reliable.events"
          ? "workload.reliable_messages"
          : "workload.raw_bytes",
      value,
      name.endsWith("bytes") ? "bytes" : "messages",
    );
  }

  const realization: Realization = {
    rooms: sumCounter(allTelemetry, "rooms.created"),
    players: sumCounter(allTelemetry, "players.registered"),
    bots: sumCounter(allTelemetry, "bots.spawned"),
    drones: sumCounter(allTelemetry, "drones.spawned"),
    projectiles: sumCounter(allTelemetry, "projectiles.spawned"),
  };
  const activeRealization: Realization = {
    rooms: realization.rooms,
    players: maxGauge(allTelemetry, "entities.clients"),
    bots: maxGauge(allTelemetry, "entities.bots"),
    drones: maxGauge(allTelemetry, "entities.drones"),
    projectiles: maxGauge(allTelemetry, "entities.projectiles"),
  };
  for (const name of ["rooms", "players", "bots", "drones", "projectiles"] as const) {
    add(`workload.realized.${name}`, realization[name], "entities");
    add(`workload.active.${name}`, activeRealization[name], "entities");
  }

  for (const name of ["rooms.created", "players.registered", "bots.spawned", "drones.spawned", "projectiles.spawned"]) {
    add(`workload.${name}`, sumCounter(allTelemetry, name), "entities");
  }

  return { metrics, counters, realization, activeRealization };
}

function headroomLimit(value: number, headroomPercent: number): number {
  return value * Math.max(0, 1 - headroomPercent / 100);
}

export function evaluateSlo(
  profile: BenchmarkProfile,
  summaryMetrics: BenchmarkSummary["metrics"],
  validTrials: number,
  expectedTrials: number,
  realization: Record<string, number | undefined>,
  activeRealization: Record<string, number | undefined> = realization,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (validTrials !== expectedTrials) failures.push(`expected ${expectedTrials} valid trials, observed ${validTrials}`);

  const maxChecks: Array<[string, number, string, "p95" | "max"]> = [
    ["tick.p95_ms", profile.budgets.maxP95TickMs, "p95 tick duration", "p95"],
    ["cpu.process_percent", profile.budgets.maxCpuPercent, "process CPU", "max"],
    ["memory.rss_bytes", profile.budgets.maxRssBytes, "RSS", "max"],
    ["network.rtt_p95_ms", profile.budgets.maxP95RttMs, "p95 RTT", "p95"],
    ["network.loss_rate", profile.budgets.maxLossRate, "loss rate", "max"],
    ["network.logical_bytes_per_second", profile.budgets.maxNetworkBytesPerSecond, "logical network rate", "max"],
  ];
  for (const [name, budget, label, statistic] of maxChecks) {
    const metric = summaryMetrics[name];
    if (metric === undefined) {
      failures.push(`missing ${label} metric (${name})`);
    } else if (metric[statistic] > headroomLimit(budget, profile.budgets.headroomPercent)) {
      failures.push(`${label} ${metric[statistic]} exceeds headroom budget ${headroomLimit(budget, profile.budgets.headroomPercent)}`);
    }
  }

  const tickRate = summaryMetrics["tick.rate_per_room_hz"] ?? summaryMetrics["tick.rate_hz"];
  const tickRateMinimum = profile.budgets.minTickRate;
  if (tickRate === undefined) failures.push("missing tick rate metric (tick.rate_hz)");
  else if (tickRate.median < tickRateMinimum) failures.push(`tick rate ${tickRate.median} is below headroom minimum ${tickRateMinimum}`);

  const dropped = summaryMetrics["tick.dropped"];
  if (dropped === undefined) failures.push("missing dropped tick metric (tick.dropped)");
  else if (dropped.max > profile.budgets.maxDroppedTicks) failures.push(`dropped ticks ${dropped.max} exceeds ${profile.budgets.maxDroppedTicks}`);

  const expected: Record<RealizationName, number> = {
    rooms: profile.workload.rooms,
    players: profile.workload.rooms * profile.workload.clientsPerRoom,
    bots: profile.workload.rooms * profile.workload.botsPerRoom,
    drones: profile.workload.rooms * profile.workload.dronesPerRoom,
    projectiles: profile.workload.rooms * profile.workload.projectilesPerRoom,
  };
  for (const [name, target] of Object.entries(expected) as Array<[RealizationName, number]>) {
    const observed = realization[name];
    if (observed === undefined) failures.push(`missing workload realization ${name}`);
    else if (observed < target) failures.push(`workload realization ${name} ${observed} is below target ${target}`);

    const activeObserved = activeRealization[name];
    if (activeObserved === undefined) failures.push(`missing active workload realization ${name}`);
    else if (activeObserved < target) failures.push(`active workload realization ${name} ${activeObserved} is below target ${target}`);
  }

  return { passed: failures.length === 0, failures };
}

function minimumRealization(measurements: TrialMeasurements[], name: RealizationName): number | undefined {
  const values = measurements.map((measurement) => measurement.realization[name]);
  return values.every((value): value is number => value !== undefined) ? Math.min(...values) : undefined;
}

function minimumActiveRealization(measurements: TrialMeasurements[], name: RealizationName): number | undefined {
  const values = measurements.map((measurement) => measurement.activeRealization[name]);
  return values.every((value): value is number => value !== undefined) ? Math.min(...values) : undefined;
}

export function buildSummary(profile: BenchmarkProfile, trials: BenchmarkTrialResult[]): BenchmarkSummary {
  const measured = trials.map((trial) => measureTrial(trial, profile.workload.rooms));
  const validTrials = trials.filter((trial) => trial.valid).length;
  const validMeasurements = measured.filter((_, index) => trials[index]?.valid);
  const metricNames = new Set(validMeasurements.flatMap((trial) => Object.keys(trial.metrics)));
  const metrics: BenchmarkSummary["metrics"] = {};
  for (const name of metricNames) {
    const values = validMeasurements
      .map((trial) => trial.metrics[name]?.value)
      .filter((value): value is number => value !== undefined && Number.isFinite(value));
    if (values.length > 0) {
      const first = validMeasurements.find((trial) => trial.metrics[name]);
      metrics[name] = summarizeValues(values, first!.metrics[name].unit, profile.trials.confidenceLevel, profile.workload.seed + name.length);
    }
  }

  const realization: Record<string, number | undefined> = {};
  const activeRealization: Record<string, number | undefined> = {};
  for (const name of ["rooms", "players", "bots", "drones", "projectiles"] as const) {
    realization[name] = minimumRealization(validMeasurements, name);
    activeRealization[name] = minimumActiveRealization(validMeasurements, name);
  }
  const slo = evaluateSlo(profile, metrics, validTrials, trials.length, realization, activeRealization);
  return {
    schemaVersion: 1,
    profileId: profile.id,
    boundary: profile.boundary,
    transport: profile.transport,
    trials: trials.length,
    validTrials,
    metrics,
    slo,
    ...(slo.passed && profile.trials.repetitions >= 3 && validTrials >= 3
      ? { capacityClaim: { largestObservedPassingConfiguration: profile.workload, extrapolation: "none" as const } }
      : {}),
  };
}
