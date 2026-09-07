import { appendFileSync, createWriteStream, readFileSync, WriteStream } from "node:fs";
import { monitorEventLoopDelay, PerformanceObserver, performance } from "node:perf_hooks";
import v8 from "node:v8";

export interface MetricEntry {
  type: "counter" | "gauge" | "timer" | "event";
  name: string;
  value: number;
  timestamp: number;
  details?: unknown;
}

type TimerBucket = { count: number; sumMs: number; maxMs: number; samples: number[] };

const outputPath = process.env.VEXEA_BENCHMARK_TELEMETRY_PATH;
const mode = process.env.VEXEA_BENCHMARK_INSTRUMENTATION || "off";
const telemetryConfigured = Boolean(outputPath) && mode !== "off";
let enabled = telemetryConfigured;
const counters = new Map<string, number>();
const totalCounters = new Map<string, number>();
const gauges = new Map<string, number>();
const timers = new Map<string, TimerBucket>();
const metrics: MetricEntry[] = [];
let stream: WriteStream | undefined;
let eventLoopBaseline = performance.eventLoopUtilization();
let intervalStartMs = Date.now();
const eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
let gcObserver: PerformanceObserver | undefined;
let flushInterval: NodeJS.Timeout | undefined;
let closePromise: Promise<void> | undefined;

const isWorker = process.env.IS_ROOM_WORKER === "true";
const workerRoomId = process.env.ROOM_ID;

function flushWorkerTelemetry(): void {
  const timerOutput: Record<string, { count: number; sumMs: number; maxMs: number; p95Ms: number; samples: number[] }> = {};
  for (const [name, bucket] of timers) {
    timerOutput[name] = {
      count: bucket.count,
      sumMs: bucket.sumMs,
      maxMs: bucket.maxMs,
      p95Ms: p95(bucket.samples),
      samples: [...bucket.samples],
    };
    bucket.count = 0;
    bucket.sumMs = 0;
    bucket.maxMs = 0;
    bucket.samples.length = 0;
  }

  const memory = process.memoryUsage();
  const usage = process.resourceUsage();
  const workerGauges = new Map(gauges);
  workerGauges.set("worker.pid", process.pid);
  workerGauges.set("worker.rss_bytes", memory.rss);
  workerGauges.set("worker.heap_used_bytes", memory.heapUsed);
  workerGauges.set("worker.heap_total_bytes", memory.heapTotal);
  workerGauges.set("worker.cpu_user_ms", usage.userCPUTime / 1000);
  workerGauges.set("worker.cpu_system_ms", usage.systemCPUTime / 1000);

  if (process.send) {
    process.send({
      type: "telemetry",
      roomId: workerRoomId,
      counters: Object.fromEntries(counters),
      gauges: Object.fromEntries(workerGauges),
      timers: timerOutput,
    });
  }
  counters.clear();
}

if (telemetryConfigured) {
  eventLoopDelay.enable();
  if (mode === "full") {
    gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        benchmarkCounter("gc.collections");
        benchmarkTimer("gc.pause", entry.duration);
      }
    });
    gcObserver.observe({ entryTypes: ["gc"] });
  }

  if (isWorker) {
    flushInterval = setInterval(flushWorkerTelemetry, 1000);
    flushInterval.unref();
    process.once("beforeExit", flushWorkerTelemetry);
  } else if (outputPath) {
    stream = createWriteStream(outputPath, { flags: "a", encoding: "utf8" });
    flushInterval = setInterval(flushBenchmarkTelemetry, 1000);
    flushInterval.unref();
    process.once("beforeExit", flushBenchmarkTelemetry);
  }
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function write(record: Record<string, unknown>): void {
  if (!outputPath) return;
  try {
    appendFileSync(outputPath, `${JSON.stringify(record)}\n`);
  } catch {
    // Suppress filesystem write errors during benchmark teardown
  }
}

function recordMetric(entry: MetricEntry): void {
  metrics.push(entry);
}

function cgroupValue(fileName: string): number | undefined {
  try {
    const value = readFileSync(`/sys/fs/cgroup/${fileName}`, "utf8").trim();
    return value === "max" ? undefined : Number(value);
  } catch {
    return undefined;
  }
}

function cgroupCpuThrottledMs(): number | undefined {
  try {
    const line = readFileSync("/sys/fs/cgroup/cpu.stat", "utf8")
      .split("\n")
      .find((entry) => entry.startsWith("throttled_usec "));
    return line ? Number(line.split(/\s+/)[1]) / 1000 : undefined;
  } catch {
    return undefined;
  }
}

export function benchmarkInstrumentationEnabled(): boolean {
  return enabled;
}

export function setBenchmarkInstrumentationEnabled(flag: boolean): void {
  enabled = flag;
}

export function benchmarkCounter(name: string, value = 1): void {
  if (!enabled) return;
  counters.set(name, (counters.get(name) || 0) + value);
  totalCounters.set(name, (totalCounters.get(name) || 0) + value);
  recordMetric({ type: "counter", name, value, timestamp: Date.now() });
}

export function benchmarkGauge(name: string, value: number, sourceId?: string): void {
  if (!enabled || !Number.isFinite(value)) return;
  if (sourceId) {
    let roomMap = workerGauges.get(sourceId);
    if (!roomMap) {
      roomMap = new Map<string, number>();
      workerGauges.set(sourceId, roomMap);
    }
    roomMap.set(name, value);
    recomputeAggregatedGauges();
  } else {
    gauges.set(name, value);
  }
  recordMetric({ type: "gauge", name, value, timestamp: Date.now() });
}

export function benchmarkTimer(name: string, durationMs: number): void {
  if (!enabled || !Number.isFinite(durationMs)) return;
  const bucket = timers.get(name) || { count: 0, sumMs: 0, maxMs: 0, samples: [] };
  bucket.count += 1;
  bucket.sumMs += durationMs;
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  if (bucket.samples.length < 6000) bucket.samples.push(durationMs);
  timers.set(name, bucket);
  recordMetric({ type: "timer", name, value: durationMs, timestamp: Date.now() });
}

export function benchmarkEvent(name: string, details: unknown = {}): void {
  if (!enabled) return;
  const fields = details && typeof details === "object" && !Array.isArray(details)
    ? details as Record<string, unknown>
    : { details };
  recordMetric({ type: "event", name, value: 1, timestamp: Date.now(), details });
  if (isWorker && process.send) {
    process.send({
      type: "benchmark_event",
      event: { type: "event", timestampMs: Date.now(), name, ...fields },
    });
  } else {
    write({ type: "event", timestampMs: Date.now(), name, ...fields });
  }
}

export function writeBenchmarkEventRecord(record: Record<string, unknown>): void {
  write(record);
}

const workerGauges = new Map<string, Map<string, number>>();

function recomputeAggregatedGauges(): void {
  const entitySums = new Map<string, number>();
  let totalWorkerRss = 0;
  for (const [sourceId, roomGauges] of workerGauges) {
    for (const [name, val] of roomGauges) {
      if (name.startsWith("entities.")) {
        entitySums.set(name, (entitySums.get(name) || 0) + val);
      } else if (name.startsWith("worker.")) {
        gauges.set(`workers.${sourceId}.${name.slice(7)}`, val);
        if (name === "worker.rss_bytes") {
          totalWorkerRss += val;
        }
      } else {
        gauges.set(name, val);
      }
    }
  }
  for (const [name, sum] of entitySums) {
    gauges.set(name, sum);
  }
  gauges.set("workers.total_rss_bytes", totalWorkerRss);
  gauges.set("workers.active_count", workerGauges.size);
}

export function removeWorkerTelemetry(sourceId: string): void {
  workerGauges.delete(sourceId);
  recomputeAggregatedGauges();
}

export function recordRemoteTelemetry(
  remoteCounters?: Record<string, number>,
  remoteGauges?: Record<string, number>,
  remoteTimers?: Record<string, { count: number; sumMs: number; maxMs: number; p95Ms: number; samples: number[] }>,
  sourceId?: string
): void {
  if (remoteCounters) {
    for (const [name, val] of Object.entries(remoteCounters)) {
      counters.set(name, (counters.get(name) || 0) + val);
      totalCounters.set(name, (totalCounters.get(name) || 0) + val);
    }
  }
  if (remoteGauges) {
    if (sourceId) {
      let roomMap = workerGauges.get(sourceId);
      if (!roomMap) {
        roomMap = new Map<string, number>();
        workerGauges.set(sourceId, roomMap);
      }
      for (const [name, val] of Object.entries(remoteGauges)) {
        roomMap.set(name, val);
      }
      recomputeAggregatedGauges();
    } else {
      for (const [name, val] of Object.entries(remoteGauges)) {
        gauges.set(name, val);
      }
    }
  }
  if (remoteTimers) {
    for (const [name, bucket] of Object.entries(remoteTimers)) {
      const existing = timers.get(name) || { count: 0, sumMs: 0, maxMs: 0, samples: [] };
      existing.count += bucket.count;
      existing.sumMs += bucket.sumMs;
      existing.maxMs = Math.max(existing.maxMs, bucket.maxMs);
      if (bucket.samples) {
        existing.samples.push(...bucket.samples);
      }
      timers.set(name, existing);
    }
  }
}

export function getBenchmarkMetrics(): MetricEntry[] {
  return [...metrics];
}

export function getBenchmarkSummary(): { counters: Record<string, number>; gauges: Record<string, number> } {
  return { counters: Object.fromEntries(totalCounters), gauges: Object.fromEntries(gauges) };
}

export function resetBenchmarkTelemetry(): void {
  metrics.length = 0;
  counters.clear();
  totalCounters.clear();
  gauges.clear();
  timers.clear();
}

export function flushBenchmarkTelemetry(): void {
  if (!telemetryConfigured) return;
  const timestampMs = Date.now();
  const memory = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const usage = process.resourceUsage();
  const eventLoop = performance.eventLoopUtilization(eventLoopBaseline);
  eventLoopBaseline = performance.eventLoopUtilization();
  const timerOutput: Record<string, { count: number; sumMs: number; maxMs: number; p95Ms: number; samples: number[] }> = {};

  for (const [name, bucket] of timers) {
    timerOutput[name] = {
      count: bucket.count,
      sumMs: bucket.sumMs,
      maxMs: bucket.maxMs,
      p95Ms: p95(bucket.samples),
      samples: [...bucket.samples],
    };
    bucket.count = 0;
    bucket.sumMs = 0;
    bucket.maxMs = 0;
    bucket.samples.length = 0;
  }

  write({
    type: "sample",
    timestampMs,
    intervalStartMs,
    intervalEndMs: timestampMs,
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    timers: timerOutput,
    process: {
      cpuUserMs: usage.userCPUTime / 1000,
      cpuSystemMs: usage.systemCPUTime / 1000,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      heapLimitBytes: heap.heap_size_limit,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers,
      nativeBytes: Math.max(0, memory.rss - memory.heapUsed - memory.external),
      cgroupMemoryBytes: cgroupValue("memory.current"),
      cgroupMemoryPeakBytes: cgroupValue("memory.peak"),
      cgroupCpuThrottledMs: cgroupCpuThrottledMs(),
    },
    eventLoop: {
      utilization: eventLoop.utilization,
      activeMs: eventLoop.active,
      idleMs: eventLoop.idle,
      delayMeanMs: eventLoopDelay.mean / 1e6,
      delayP95Ms: eventLoopDelay.percentile(95) / 1e6,
      delayMaxMs: eventLoopDelay.max / 1e6,
    },
  });
  intervalStartMs = timestampMs;
  eventLoopDelay.reset();
  counters.clear();
}

export function closeBenchmarkTelemetry(): Promise<void> {
  if (!telemetryConfigured || !outputPath) return Promise.resolve();
  if (closePromise) return closePromise;
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = undefined;
  }
  flushBenchmarkTelemetry();
  eventLoopDelay.disable();
  gcObserver?.disconnect();
  gcObserver = undefined;
  const writable = stream;
  stream = undefined;
  closePromise = new Promise<void>((resolve) => {
    if (!writable) {
      resolve();
      return;
    }
    writable.once("error", () => resolve());
    writable.end(() => resolve());
  });
  return closePromise;
}

export function writeBenchmarkFailure(message: string): void {
  if (!outputPath) return;
  try {
    appendFileSync(outputPath, `${JSON.stringify({ type: "failure", timestampMs: Date.now(), message })}\n`);
  } catch {
    // Benchmark failure must not hide the original process failure.
  }
}
