export const BENCHMARK_SCHEMA_VERSION = 1 as const;

export type BenchmarkBoundary = "engine" | "server-process" | "host" | "deployment";
export type TransportMode = "socketio" | "geckos";
export type InstrumentationMode = "off" | "counters" | "full";
export type ExternalServiceMode = "disabled" | "stub" | "live";
export type ContactProfile = "none" | "calm" | "persistent" | "dense";

export interface WorkloadSpec {
  rooms: number;
  clientsPerRoom: number;
  botsPerRoom: number;
  dronesPerRoom: number;
  projectilesPerRoom: number;
  durationMs: number;
  warmupMs: number;
  cooldownMs: number;
  inputHz: number;
  reliableEventsPerSecond: number;
  firePerSecond: number;
  contact: ContactProfile;
  seed: number;
}

export interface BudgetSpec {
  maxP95TickMs: number;
  minTickRate: number;
  maxDroppedTicks: number;
  maxRssBytes: number;
  maxCpuPercent: number;
  maxP95RttMs: number;
  maxLossRate: number;
  maxNetworkBytesPerSecond: number;
  headroomPercent: number;
}

export interface BenchmarkProfile {
  schemaVersion: typeof BENCHMARK_SCHEMA_VERSION;
  id: string;
  title: string;
  boundary: BenchmarkBoundary;
  transport: TransportMode;
  server: {
    command: string[];
    buildCommand?: string[];
    port: number;
    readinessPath: string;
    env?: Record<string, string>;
  };
  map: {
    id: string;
    mode: "synthetic" | "repository";
    expectedHash?: string;
    allowFallback: boolean;
  };
  services: {
    llm: ExternalServiceMode;
    persistence: ExternalServiceMode;
    observability: ExternalServiceMode;
  };
  instrumentation: InstrumentationMode;
  workload: WorkloadSpec;
  budgets: BudgetSpec;
  trials: {
    warmups: number;
    repetitions: number;
    confidenceLevel: number;
  };
}

export interface ProcessResourceSample {
  timestampMs: number;
  pid: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  rssBytes: number;
  highWaterRssBytes?: number;
  heapUsedBytes?: number;
  heapTotalBytes?: number;
  heapLimitBytes?: number;
  externalBytes?: number;
  arrayBuffersBytes?: number;
  nativeBytes?: number;
  cgroupMemoryBytes?: number;
  cgroupMemoryPeakBytes?: number;
  cgroupCpuThrottledMs?: number;
}

export interface HostResourceSample {
  timestampMs: number;
  load1?: number;
  memoryTotalBytes?: number;
  memoryAvailableBytes?: number;
  cpuUserMs?: number;
  cpuSystemMs?: number;
  cpuIdleMs?: number;
}

export interface ClientSample {
  timestampMs: number;
  connected: number;
  ready: number;
  incomingBytes: number;
  outgoingBytes: number;
  wireIncomingBytes: number;
  wireOutgoingBytes: number;
  incomingMessages: number;
  outgoingMessages: number;
  rawIncomingBytes: number;
  rawOutgoingBytes: number;
  stateSyncMessages: number;
  reliableMessages: number;
  disconnects: number;
  errors: number;
  rttMs?: number;
}

export interface MeasurementWindow {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface TelemetrySample {
  type: "sample";
  timestampMs: number;
  intervalStartMs?: number;
  intervalEndMs?: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  timers: Record<string, { count: number; sumMs: number; maxMs: number; p95Ms: number; samples?: number[] }>;
  process?: Record<string, number>;
  eventLoop?: Record<string, number>;
}

export interface BenchmarkTrialResult {
  trial: number;
  valid: boolean;
  status: "passed" | "failed" | "invalid";
  failureReason?: string;
  startedAt: string;
  durationMs: number;
  measurement?: MeasurementWindow;
  process?: ProcessResourceSample[];
  clientProcess?: ProcessResourceSample[];
  host?: HostResourceSample[];
  clients?: ClientSample[];
  telemetry?: TelemetrySample[];
  metrics?: Record<string, number>;
  events: Array<Record<string, unknown>>;
}

export interface BenchmarkSummary {
  schemaVersion: typeof BENCHMARK_SCHEMA_VERSION;
  profileId: string;
  boundary: BenchmarkBoundary;
  transport: TransportMode;
  trials: number;
  validTrials: number;
  metrics: Record<string, {
    unit: string;
    count: number;
    median: number;
    p95: number;
    max: number;
    confidence95?: [number, number];
  }>;
  slo: {
    passed: boolean;
    failures: string[];
  };
  capacityClaim?: {
    largestObservedPassingConfiguration: WorkloadSpec;
    extrapolation: "none";
  };
}
