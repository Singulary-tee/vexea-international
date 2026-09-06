import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSupportedBoundary, resetRunOutputs, resetTrialDirectory, resetTrialOutputs } from "../benchmarks/src/runner";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("benchmark trial output lifecycle", () => {
  it("rejects boundaries without an execution harness", () => {
    expect(() => assertSupportedBoundary({ boundary: "engine" } as any)).toThrow(/direct simulation harness/);
    expect(() => assertSupportedBoundary({ boundary: "deployment" } as any)).toThrow(/external topology/);
  });

  it("truncates reusable telemetry and client outputs before a trial", () => {
    const directory = mkdtempSync(join(tmpdir(), "vexea-benchmark-"));
    temporaryDirectories.push(directory);
    const serverPath = join(directory, "server.ndjson");
    const clientPath = join(directory, "client.ndjson");
    writeFileSync(serverPath, "old-server-record\n");
    writeFileSync(clientPath, "old-client-record\n");

    resetTrialOutputs([serverPath, clientPath]);

    expect(readFileSync(serverPath, "utf8")).toBe("");
    expect(readFileSync(clientPath, "utf8")).toBe("");
  });

  it("removes stale trial directories before reusing an output directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "vexea-benchmark-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "trials", "trial-1"), { recursive: true });
    mkdirSync(join(directory, "trials", "trial-3"), { recursive: true });
    writeFileSync(join(directory, "trials", "trial-3", "server.ndjson"), "stale\n");

    resetTrialDirectory(directory);

    expect(existsSync(join(directory, "trials"))).toBe(false);
  });

  it("invalidates stale finalized artifacts before a rerun", () => {
    const directory = mkdtempSync(join(tmpdir(), "vexea-benchmark-"));
    temporaryDirectories.push(directory);
    const staleFiles = [
      "manifest.json",
      "summary.json",
      "summary.md",
      "samples.ndjson",
      "events.ndjson",
      "checksums.sha256",
      `${basename(directory)}.tar.gz`,
      "build.stdout.log",
      "build.stderr.log",
    ];
    for (const file of staleFiles) {
      writeFileSync(join(directory, file), "stale\n");
    }

    resetRunOutputs(directory);

    for (const file of staleFiles) {
      expect(existsSync(join(directory, file))).toBe(false);
    }
  });
});
