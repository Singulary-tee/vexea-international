import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const temporaryDirectories: string[] = [];
const originalTelemetryPath = process.env.VEXEA_BENCHMARK_TELEMETRY_PATH;
const originalInstrumentation = process.env.VEXEA_BENCHMARK_INSTRUMENTATION;

afterEach(() => {
  if (originalTelemetryPath === undefined) delete process.env.VEXEA_BENCHMARK_TELEMETRY_PATH;
  else process.env.VEXEA_BENCHMARK_TELEMETRY_PATH = originalTelemetryPath;
  if (originalInstrumentation === undefined) delete process.env.VEXEA_BENCHMARK_INSTRUMENTATION;
  else process.env.VEXEA_BENCHMARK_INSTRUMENTATION = originalInstrumentation;
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("benchmark telemetry lifecycle", () => {
  it("flushes the final sample before close resolves and stays idempotent", async () => {
    const directory = mkdtempSync(join(tmpdir(), "vexea-telemetry-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "telemetry.ndjson");
    process.env.VEXEA_BENCHMARK_TELEMETRY_PATH = outputPath;
    process.env.VEXEA_BENCHMARK_INSTRUMENTATION = "counters";
    vi.resetModules();

    const telemetry = await import("../server/benchmark/telemetry");
    telemetry.benchmarkCounter("test.final_flush");
    await telemetry.closeBenchmarkTelemetry();

    const contents = readFileSync(outputPath, "utf8");
    const records = contents.trim().split("\n").map((line) => JSON.parse(line) as Record<string, any>);
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe("sample");
    expect(records[0].counters["test.final_flush"]).toBe(1);

    await telemetry.closeBenchmarkTelemetry();
    expect(readFileSync(outputPath, "utf8")).toBe(contents);
  });
});
