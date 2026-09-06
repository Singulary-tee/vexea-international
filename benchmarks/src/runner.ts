import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { buildSummary } from "./metrics";
import { writeArtifacts } from "./artifacts";
import { ManagedProcess, spawnManaged, startHostSampler, startProcessSampler, waitForPortClosed, waitForReadiness } from "./process";
import { BenchmarkProfile, BenchmarkSummary, BenchmarkTrialResult, ClientSample, MeasurementWindow, ProcessResourceSample, TelemetrySample } from "./types";

interface RunnerOptions {
  outputDir: string;
  cwd?: string;
  skipBuild?: boolean;
  repetitions?: number;
}

interface TrialRuntime {
  server: ManagedProcess;
  client?: ManagedProcess;
  serverSamples: ProcessResourceSample[];
  clientSamples: ProcessResourceSample[];
  hostSamples: ReturnType<typeof startHostSampler>["samples"];
  stop(): void;
}

export function assertSupportedBoundary(profile: BenchmarkProfile): void {
  if (profile.boundary === "engine") {
    throw new Error("The engine boundary requires a direct simulation harness and is not implemented");
  }
  if (profile.boundary === "deployment") {
    throw new Error("The deployment boundary requires an external topology and is not implemented");
  }
}

function parseNdjson(path: string): Array<Record<string, unknown>> {
  try {
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}

export function resetTrialOutputs(paths: string[]): void {
  for (const path of paths) writeFileSync(path, "");
}

export function resetTrialDirectory(outputDir: string): void {
  rmSync(join(outputDir, "trials"), { recursive: true, force: true });
}

export function resetRunOutputs(outputDir: string): void {
  resetTrialDirectory(outputDir);
  for (const file of [
    "manifest.json",
    "summary.json",
    "summary.md",
    "samples.ndjson",
    "events.ndjson",
    "checksums.sha256",
    `${basename(outputDir)}.tar.gz`,
    "build.stdout.log",
    "build.stderr.log",
  ]) {
    rmSync(join(outputDir, file), { force: true });
  }
}

function clientCommand(): string[] {
  return [process.execPath, resolve("node_modules/tsx/dist/cli.mjs"), resolve("benchmarks/src/client-worker.ts")];
}

async function runCommand(command: string[], cwd: string, outputDir: string, env: NodeJS.ProcessEnv): Promise<void> {
  const processHandle = spawnManaged(command, {
    cwd,
    env,
    stdoutPath: join(outputDir, "build.stdout.log"),
    stderrPath: join(outputDir, "build.stderr.log"),
  });
  const result = await processHandle.wait();
  if (result.code !== 0) throw new Error(`Command failed (${command.join(" ")}) with code ${result.code}`);
}

async function waitForProcessOrTimeout(
  processHandle: ManagedProcess,
  timeoutMs: number,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  let timeout: NodeJS.Timeout | undefined;
  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("client timeout")), timeoutMs);
    processHandle.wait().then(
      (result) => {
        if (timeout) clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        if (timeout) clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function trialResult(
  profile: BenchmarkProfile,
  trial: number,
  startedAt: string,
  durationMs: number,
  runtime: TrialRuntime,
  telemetryPath: string,
  clientPath: string,
  events: Array<Record<string, unknown>>,
  valid: boolean,
  measurement: MeasurementWindow | undefined,
  failureReason?: string,
): BenchmarkTrialResult {
  const telemetryRecords = parseNdjson(telemetryPath);
  const clientRecords = parseNdjson(clientPath);
  const telemetry = telemetryRecords.filter((record) => record.type === "sample") as unknown as TelemetrySample[];
  const serverEvents = telemetryRecords.filter((record) => record.type === "event" || record.type === "failure");
  const clients = clientRecords
    .filter((record) => record.type === "client_sample")
    .map((record) => {
      const { type: _type, ...sample } = record;
      return sample as unknown as ClientSample;
    });
  return {
    trial,
    valid,
    status: valid ? "passed" : "invalid",
    failureReason,
    startedAt,
    durationMs,
    measurement,
    process: runtime.serverSamples,
    clientProcess: runtime.clientSamples,
    host: runtime.hostSamples,
    telemetry,
    clients,
    events: [...events, ...serverEvents],
  };
}

async function runServerTrial(
  profile: BenchmarkProfile,
  trial: number,
  outputDir: string,
  cwd: string,
  seed: number,
): Promise<BenchmarkTrialResult> {
  const trialDir = join(outputDir, "trials", `trial-${trial}`);
  mkdirSync(trialDir, { recursive: true });
  const telemetryPath = join(trialDir, "server.ndjson");
  const clientPath = join(trialDir, "client.ndjson");
  const clientConfigPath = join(trialDir, "client.json");
  resetTrialOutputs([
    telemetryPath,
    clientPath,
    join(trialDir, "server.stdout.log"),
    join(trialDir, "server.stderr.log"),
    join(trialDir, "client.stdout.log"),
    join(trialDir, "client.stderr.log"),
  ]);
  writeFileSync(clientConfigPath, `${JSON.stringify({
    url: `http://127.0.0.1:${profile.server.port}`,
    transport: profile.transport,
    mapId: profile.map.id,
    ...profile.workload,
    matchIdPrefix: `benchmark-${profile.id}-${trial}`,
    outputPath: clientPath,
  }, null, 2)}\n`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...profile.server.env,
    NODE_ENV: "production",
    PORT: String(profile.server.port),
    VEXEA_TRANSPORT: profile.transport,
    VEXEA_BENCHMARK_SEED: String(seed),
    VEXEA_BENCHMARK_INSTRUMENTATION: profile.instrumentation,
    VEXEA_BENCHMARK_TELEMETRY_PATH: telemetryPath,
    VEXEA_BENCHMARK_CONTROL: "true",
    VEXEA_BENCHMARK_DISABLE_SENTRY: "true",
  };
  const server = spawnManaged(profile.server.command, {
    cwd,
    env,
    stdoutPath: join(trialDir, "server.stdout.log"),
    stderrPath: join(trialDir, "server.stderr.log"),
  });
  let serverSampler: ReturnType<typeof startProcessSampler> | undefined;
  let clientSampler: ReturnType<typeof startProcessSampler> | undefined;
  let hostSampler: ReturnType<typeof startHostSampler> | undefined;
  let client: ManagedProcess | undefined;
  const events: Array<Record<string, unknown>> = [];
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  let clientReady = false;
  let clientComplete = false;
  let clientFailure: string | undefined;
  let measurementStartMs: number | undefined;
  let measurementEndMs: number | undefined;
  try {
    await waitForReadiness(`http://127.0.0.1:${profile.server.port}${profile.server.readinessPath}`, 30000);
    serverSampler = startProcessSampler(server.pid);
    hostSampler = profile.boundary === "host" || profile.boundary === "deployment" ? startHostSampler() : undefined;
    client = spawnManaged(clientCommand(), {
      cwd,
      env: { ...process.env, VEXEA_BENCHMARK_CLIENT_CONFIG: clientConfigPath },
      stdoutPath: join(trialDir, "client.stdout.log"),
      stderrPath: join(trialDir, "client.stderr.log"),
    });
    clientSampler = startProcessSampler(client.pid);
    client.onControl((message) => {
      const timestampMs = Date.now();
      events.push({ timestampMs, source: "client", ...message });
      if (message.type === "ready") clientReady = true;
      if (message.type === "complete") clientComplete = true;
      if (message.type === "failure") clientFailure = String(message.message || "client failure");
      if (message.type === "measurement_start") measurementStartMs = timestampMs;
      if (message.type === "measurement_end") measurementEndMs = timestampMs;
    });
    const clientResult = await waitForProcessOrTimeout(
      client,
      profile.workload.warmupMs + profile.workload.durationMs + profile.workload.cooldownMs + 30000,
    );
    if (clientResult.code !== 0) clientFailure = clientFailure || `client exited with code ${clientResult.code}`;
  } catch (error) {
    clientFailure = clientFailure || (error instanceof Error ? error.message : String(error));
  } finally {
    if (client) {
      const clientResult = await client.terminate();
      if (clientResult.forced) clientFailure = clientFailure || "client required forced termination";
    }
    serverSampler?.stop();
    clientSampler?.stop();
    hostSampler?.stop();
  }

  const serverResult = await server.terminate();
  const portClosed = await waitForPortClosed(profile.server.port, 5000);
  const measurement = measurementStartMs !== undefined && measurementEndMs !== undefined && measurementEndMs > measurementStartMs
    ? { startMs: measurementStartMs, endMs: measurementEndMs, durationMs: measurementEndMs - measurementStartMs }
    : undefined;
  const runtime: TrialRuntime = {
    server,
    client,
    serverSamples: serverSampler?.samples || [],
    clientSamples: clientSampler?.samples || [],
    hostSamples: hostSampler?.samples || [],
    stop: () => undefined,
  };
  const valid = Boolean(clientReady && clientComplete && !clientFailure && !serverResult.forced && portClosed);
  const failures = [
    !clientReady ? "client did not reach the ready barrier" : undefined,
    !clientComplete ? "client did not complete its workload" : undefined,
    clientFailure,
    serverResult.forced ? "server required forced termination" : undefined,
    !portClosed ? "server port remained open after teardown" : undefined,
    !measurement ? "client did not report a valid measurement window" : undefined,
  ].filter((value): value is string => Boolean(value));
  return trialResult(profile, trial, startedAt, Date.now() - startedMs, runtime, telemetryPath, clientPath, events, valid && Boolean(measurement), measurement, failures.join("; ") || undefined);
}

export async function runProfile(profile: BenchmarkProfile, options: RunnerOptions): Promise<{ summary: BenchmarkSummary; archive: string }> {
  assertSupportedBoundary(profile);
  const cwd = options.cwd || process.cwd();
  mkdirSync(options.outputDir, { recursive: true });
  resetRunOutputs(options.outputDir);
  if (!options.skipBuild && profile.server.buildCommand) {
    await runCommand(profile.server.buildCommand, cwd, options.outputDir, { ...process.env, NODE_ENV: "production" });
  }

  const warmups = profile.trials.warmups;
  for (let trial = 0; trial < warmups; trial += 1) {
    const result = await runServerTrial(profile, -(trial + 1), options.outputDir, cwd, profile.workload.seed + trial);
    if (!result.valid) throw new Error(`Warmup trial failed: ${result.failureReason || "unknown failure"}`);
  }

  const repetitions = options.repetitions || profile.trials.repetitions;
  const trials: BenchmarkTrialResult[] = [];
  for (let trial = 1; trial <= repetitions; trial += 1) {
    trials.push(await runServerTrial(profile, trial, options.outputDir, cwd, profile.workload.seed + trial));
  }
  const summary = buildSummary({ ...profile, trials: { ...profile.trials, repetitions } }, trials);
  const archive = writeArtifacts({
    outputDir: options.outputDir,
    profile: { ...profile, trials: { ...profile.trials, repetitions } },
    summary,
    trials,
    events: [],
    command: profile.server.command,
    buildCommand: profile.server.buildCommand,
  });
  return { summary, archive };
}
