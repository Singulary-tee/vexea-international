/**
 * VEXEA Telemetry & Benchmark Collector
 */

interface MetricEntry {
  type: 'counter' | 'gauge' | 'timer' | 'event';
  name: string;
  value: number;
  timestamp: number;
  details?: any;
}

const metrics: MetricEntry[] = [];
const counters: Map<string, number> = new Map();
const gauges: Map<string, number> = new Map();

let enabled = true;

export function benchmarkInstrumentationEnabled(): boolean {
  return enabled;
}

export function setBenchmarkInstrumentationEnabled(flag: boolean): void {
  enabled = flag;
}

export function benchmarkCounter(name: string, value: number = 1): void {
  if (!enabled) return;
  const current = counters.get(name) || 0;
  counters.set(name, current + value);
  metrics.push({
    type: 'counter',
    name,
    value,
    timestamp: Date.now()
  });
}

export function benchmarkGauge(name: string, value: number): void {
  if (!enabled) return;
  gauges.set(name, value);
  metrics.push({
    type: 'gauge',
    name,
    value,
    timestamp: Date.now()
  });
}

export function benchmarkTimer(name: string, durationMs: number): void {
  if (!enabled) return;
  metrics.push({
    type: 'timer',
    name,
    value: durationMs,
    timestamp: Date.now()
  });
}

export function benchmarkEvent(name: string, details?: any): void {
  if (!enabled) return;
  metrics.push({
    type: 'event',
    name,
    value: 1,
    timestamp: Date.now(),
    details
  });
}

export function getBenchmarkMetrics(): MetricEntry[] {
  return [...metrics];
}

export function getBenchmarkSummary(): { counters: Record<string, number>; gauges: Record<string, number> } {
  const cObj: Record<string, number> = {};
  for (const [k, v] of counters.entries()) {
    cObj[k] = v;
  }
  const gObj: Record<string, number> = {};
  for (const [k, v] of gauges.entries()) {
    gObj[k] = v;
  }
  return { counters: cObj, gauges: gObj };
}

export function resetBenchmarkTelemetry(): void {
  metrics.length = 0;
  counters.clear();
  gauges.clear();
}

export function closeBenchmarkTelemetry(): void {
  // Telemetry cleanup if needed
}
