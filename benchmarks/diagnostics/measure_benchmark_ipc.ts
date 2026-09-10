import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runProfile } from "../src/runner";
import { loadProfile } from "../src/validate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest(profilePath: string, envOverrides: Record<string, string> = {}) {
  const absolutePath = path.resolve(profilePath);
  const profile = loadProfile(absolutePath);
  
  // Merge env overrides
  profile.server.env = {
    ...profile.server.env,
    ...envOverrides,
  };
  
  // Single repetition for forensic diagnostic
  profile.trials.repetitions = 1;
  profile.trials.warmups = 0;
  
  const outputDir = path.resolve(`.benchmark-artifacts/diagnostics-${Date.now()}`);
  const { summary } = await runProfile(profile, {
    outputDir,
    profile: profile.id,
    skipBuild: true,
  });

  return { summary, outputDir };
}

async function main() {
  console.log("=== Running Forensic IPC & Telemetry Benchmark Suite ===");
  
  // 1. Run 1 Room Forked Standard
  console.log("\n[1/5] Running 1 Room Forked Baseline...");
  const run1 = await runTest("benchmarks/profiles/rule-compliant-1room.json");
  console.log("1 Room Forked Result:", JSON.stringify({
    cpuProcessPercent: run1.summary.metrics["cpu.process_percent"],
    tickP95Ms: run1.summary.metrics["tick.p95_ms"],
    droppedTicks: run1.summary.metrics["tick.dropped_ticks"],
    rssBytes: run1.summary.metrics["memory.rss_bytes"],
    networkBytesPerSec: run1.summary.metrics["network.logical_bytes_per_second"],
  }, null, 2));

  // 2. Run 2 Rooms Forked Standard
  console.log("\n[2/5] Running 2 Rooms Forked Baseline...");
  const run2 = await runTest("benchmarks/profiles/rule-compliant-2rooms.json");
  console.log("2 Rooms Forked Result:", JSON.stringify({
    cpuProcessPercent: run2.summary.metrics["cpu.process_percent"],
    tickP95Ms: run2.summary.metrics["tick.p95_ms"],
    droppedTicks: run2.summary.metrics["tick.dropped_ticks"],
    rssBytes: run2.summary.metrics["memory.rss_bytes"],
  }, null, 2));

  // 3. Run 3 Rooms Forked Standard
  console.log("\n[3/5] Running 3 Rooms Forked Baseline...");
  const run3 = await runTest("benchmarks/profiles/rule-compliant-3rooms.json");
  console.log("3 Rooms Forked Result:", JSON.stringify({
    cpuProcessPercent: run3.summary.metrics["cpu.process_percent"],
    tickP95Ms: run3.summary.metrics["tick.p95_ms"],
    droppedTicks: run3.summary.metrics["tick.dropped_ticks"],
    rssBytes: run3.summary.metrics["memory.rss_bytes"],
  }, null, 2));

  // 4. Run 3 Rooms In-Process Comparison
  console.log("\n[4/5] Running 3 Rooms In-Process Baseline...");
  const run3InProcess = await runTest("benchmarks/profiles/rule-compliant-3rooms-inprocess.json");
  console.log("3 Rooms In-Process Result:", JSON.stringify({
    cpuProcessPercent: run3InProcess.summary.metrics["cpu.process_percent"],
    tickP95Ms: run3InProcess.summary.metrics["tick.p95_ms"],
    droppedTicks: run3InProcess.summary.metrics["tick.dropped_ticks"],
    rssBytes: run3InProcess.summary.metrics["memory.rss_bytes"],
  }, null, 2));

  // 5. Run 3 Rooms Forked with Telemetry Disabled (counters only vs none)
  console.log("\n[5/5] Running 3 Rooms Forked with Telemetry Disabled...");
  const run3NoTelemetry = await runTest("benchmarks/profiles/rule-compliant-3rooms.json", {
    VEXEA_BENCHMARK_NO_TELEMETRY: "true",
  });
  console.log("3 Rooms Forked (No Telemetry) Result:", JSON.stringify({
    cpuProcessPercent: run3NoTelemetry.summary.metrics["cpu.process_percent"],
    tickP95Ms: run3NoTelemetry.summary.metrics["tick.p95_ms"],
    droppedTicks: run3NoTelemetry.summary.metrics["tick.dropped_ticks"],
    rssBytes: run3NoTelemetry.summary.metrics["memory.rss_bytes"],
  }, null, 2));

  fs.writeFileSync(
    path.join(__dirname, "benchmark_forensic_suite_results.json"),
    JSON.stringify({ run1, run2, run3, run3InProcess, run3NoTelemetry }, null, 2)
  );
  console.log("\nAll runs complete! Saved to benchmark_forensic_suite_results.json");
}

main().catch(console.error);
