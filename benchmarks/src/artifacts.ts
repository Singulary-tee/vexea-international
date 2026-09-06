import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { BenchmarkProfile, BenchmarkSummary, BenchmarkTrialResult } from "./types";

export interface ArtifactOptions {
  outputDir: string;
  profile: BenchmarkProfile;
  summary: BenchmarkSummary;
  trials: BenchmarkTrialResult[];
  events: Array<Record<string, unknown>>;
  command: string[];
  buildCommand?: string[];
}

function safeProfile(profile: BenchmarkProfile): BenchmarkProfile {
  const sensitive = /(?:token|secret|password|credential|authorization|api[-_]?key)/i;
  const safeCommand = (command: string[] | undefined): string[] | undefined => command?.map((argument, index) => {
    const previous = command[index - 1] || "";
    const flag = argument.split("=", 1)[0];
    return (!previous.includes("=") && sensitive.test(previous)) || (argument.includes("=") && sensitive.test(flag))
      ? "<redacted>"
      : argument;
  });
  return {
    ...profile,
    server: {
      ...profile.server,
      command: safeCommand(profile.server.command)!,
      buildCommand: safeCommand(profile.server.buildCommand),
      env: profile.server.env
        ? Object.fromEntries(Object.keys(profile.server.env).map((key) => [key, "<redacted>"]))
        : undefined,
    },
  };
}

function filesUnder(directory: string, prefix = directory): string[] {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolute = join(directory, entry.name);
      const relative = absolute.slice(prefix.length + 1);
      return entry.isDirectory() ? filesUnder(absolute, prefix) : entry.isFile() ? [relative] : [];
    });
  } catch {
    return [];
  }
}

function writeNdjson(path: string, records: Array<Record<string, unknown>>): void {
  writeFileSync(path, records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""));
}

function trialRecords(trials: BenchmarkTrialResult): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  for (const sample of trials.telemetry || []) records.push({ trial: trials.trial, source: "server", ...sample });
  for (const sample of trials.clients || []) records.push({ trial: trials.trial, source: "client", ...sample });
  for (const sample of trials.process || []) records.push({ trial: trials.trial, source: "server_process", ...sample });
  for (const sample of trials.clientProcess || []) records.push({ trial: trials.trial, source: "client_process", ...sample });
  for (const sample of trials.host || []) records.push({ trial: trials.trial, source: "host", ...sample });
  return records;
}

function markdownSummary(summary: BenchmarkSummary): string {
  const rows = Object.entries(summary.metrics)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, metric]) => `| ${name} | ${metric.unit} | ${metric.median} | ${metric.p95} | ${metric.max} |`)
    .join("\n");
  const failures = summary.slo.failures.length
    ? summary.slo.failures.map((failure) => `- ${failure}`).join("\n")
    : "- none";
  return [
    `# ${summary.profileId}`,
    "",
    `- Boundary: **${summary.boundary}**`,
    `- Transport: **${summary.transport}**`,
    `- Trials: ${summary.validTrials}/${summary.trials} valid`,
    `- SLO: **${summary.slo.passed ? "passed" : "failed"}**`,
    "",
    "## Metrics",
    "",
    "| Metric | Unit | Median | P95 | Max |",
    "| --- | --- | ---: | ---: | ---: |",
    rows || "| none | - | - | - | - |",
    "",
    "## SLO failures",
    "",
    failures,
    "",
    summary.capacityClaim
      ? "## Capacity claim\n\nLargest observed passing configuration only; no extrapolation is made."
      : "## Capacity claim\n\nNo capacity claim is made because the complete SLO gate did not pass.",
    "",
  ].join("\n");
}

function checksums(directory: string, files: string[]): string {
  return files.map((file) => {
    const digest = createHash("sha256").update(readFileSync(join(directory, file))).digest("hex");
    return `${digest}  ${file}`;
  }).join("\n") + "\n";
}

export function writeArtifacts(options: ArtifactOptions): string {
  mkdirSync(options.outputDir, { recursive: true });
  const samples = options.trials.flatMap(trialRecords);
  const events = [
    ...options.events,
    ...options.trials.flatMap((trial) => trial.events.map((event) => ({ trial: trial.trial, ...event }))),
  ];
  const gitStatus = (() => {
    try {
      return execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" });
    } catch {
      return "";
    }
  })();
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: safeProfile(options.profile),
    command: safeProfile(options.profile).server.command,
    buildCommand: safeProfile(options.profile).server.buildCommand,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    gitDirty: gitStatus.length > 0,
    gitStatusSha256: createHash("sha256").update(gitStatus).digest("hex"),
    gitCommit: (() => {
      try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "unknown"; }
    })(),
  };
  writeFileSync(join(options.outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(options.outputDir, "summary.json"), `${JSON.stringify(options.summary, null, 2)}\n`);
  writeFileSync(join(options.outputDir, "summary.md"), markdownSummary(options.summary));
  writeNdjson(join(options.outputDir, "samples.ndjson"), samples);
  writeNdjson(join(options.outputDir, "events.ndjson"), events);

  const files = [
    "manifest.json",
    "summary.json",
    "summary.md",
    "samples.ndjson",
    "events.ndjson",
    ...filesUnder(join(options.outputDir, "trials"), options.outputDir),
  ];
  writeFileSync(join(options.outputDir, "checksums.sha256"), checksums(options.outputDir, files));
  const archive = join(options.outputDir, `${basename(options.outputDir)}.tar.gz`);
  execFileSync("tar", ["-czf", archive, "-C", options.outputDir, ...[...files, "checksums.sha256"]]);
  return archive;
}
