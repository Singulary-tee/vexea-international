import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeArtifacts } from "../benchmarks/src/artifacts";
import { loadProfile } from "../benchmarks/src/validate";
import { BenchmarkSummary, BenchmarkTrialResult } from "../benchmarks/src/types";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function summary(profileId: string): BenchmarkSummary {
  return {
    schemaVersion: 1,
    profileId,
    boundary: "server-process",
    transport: "socketio",
    trials: 1,
    validTrials: 0,
    metrics: {},
    slo: { passed: false, failures: ["fixture failure"] },
  };
}

function trial(): BenchmarkTrialResult {
  return {
    trial: 1,
    valid: false,
    status: "invalid",
    startedAt: new Date(0).toISOString(),
    durationMs: 1,
    events: [],
  };
}

describe("benchmark artifacts", () => {
  it("redacts commands and records dirty provenance", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "vexea-artifacts-"));
    temporaryDirectories.push(outputDir);
    const profile = loadProfile(resolve("benchmarks/profiles/socketio-baseline.json"));
    const safeProfile = {
      ...profile,
      id: "artifact-redaction",
      server: {
        ...profile.server,
        command: ["node", "server.js", "--token=server-secret", "--password", "server-password"],
        buildCommand: ["npm", "run", "build", "--api-key=build-secret"],
        env: { BENCHMARK_TOKEN: "env-secret", SAFE_SETTING: "also-hidden" },
      },
    };

    writeArtifacts({
      outputDir,
      profile: safeProfile,
      summary: summary(safeProfile.id),
      trials: [trial()],
      events: [],
      command: safeProfile.server.command,
      buildCommand: safeProfile.server.buildCommand,
    });

    const manifest = JSON.parse(readFileSync(join(outputDir, "manifest.json"), "utf8")) as {
      profile: { server: { command: string[]; buildCommand?: string[]; env?: Record<string, string> } };
      command: string[];
      buildCommand?: string[];
      gitDirty: boolean;
      gitStatusSha256: string;
    };
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain("server-secret");
    expect(serialized).not.toContain("server-password");
    expect(serialized).not.toContain("build-secret");
    expect(serialized).not.toContain("env-secret");
    expect(manifest.command).toEqual(["node", "server.js", "<redacted>", "--password", "<redacted>"]);
    expect(manifest.buildCommand).toEqual(["npm", "run", "build", "<redacted>"]);
    expect(manifest.profile.server.env).toEqual({ BENCHMARK_TOKEN: "<redacted>", SAFE_SETTING: "<redacted>" });

    const gitStatus = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" });
    expect(manifest.gitDirty).toBe(gitStatus.length > 0);
    expect(manifest.gitStatusSha256).toBe(createHash("sha256").update(gitStatus).digest("hex"));
  });

  it("checksums and archives generated trial files", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "vexea-artifacts-"));
    temporaryDirectories.push(outputDir);
    const profile = loadProfile(resolve("benchmarks/profiles/socketio-baseline.json"));
    const warmupPath = join(outputDir, "trials", "trial--1", "server.ndjson");
    const trialPath = join(outputDir, "trials", "trial-1", "server.ndjson");
    mkdirSync(join(outputDir, "trials", "trial--1"), { recursive: true });
    mkdirSync(join(outputDir, "trials", "trial-1"), { recursive: true });
    writeFileSync(warmupPath, "{\"type\":\"warmup\"}\n");
    writeFileSync(trialPath, "{\"type\":\"sample\"}\n");

    const archive = writeArtifacts({
      outputDir,
      profile,
      summary: summary(profile.id),
      trials: [trial()],
      events: [],
      command: profile.server.command,
    });

    const relativeTrialPath = "trials/trial-1/server.ndjson";
    const relativeWarmupPath = "trials/trial--1/server.ndjson";
    const checksums = readFileSync(join(outputDir, "checksums.sha256"), "utf8");
    const trialDigest = createHash("sha256").update(readFileSync(trialPath)).digest("hex");
    const warmupDigest = createHash("sha256").update(readFileSync(warmupPath)).digest("hex");
    expect(checksums).toContain(`${trialDigest}  ${relativeTrialPath}`);
    expect(checksums).toContain(`${warmupDigest}  ${relativeWarmupPath}`);

    const archiveEntries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" });
    expect(archiveEntries.split("\n")).toContain(relativeTrialPath);
    expect(archiveEntries.split("\n")).toContain(relativeWarmupPath);
    expect(archiveEntries.split("\n")).toContain("checksums.sha256");
    expect(() => execFileSync("sha256sum", ["-c", "checksums.sha256"], { cwd: outputDir })).not.toThrow();

    const checkedFiles = checksums.trim().split("\n").map((line) => line.slice(line.indexOf("  ") + 2));
    expect(archiveEntries.trim().split("\n").sort()).toEqual([...checkedFiles, "checksums.sha256"].sort());
  });
});
