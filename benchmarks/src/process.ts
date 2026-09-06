import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createWriteStream, readFileSync, WriteStream } from "node:fs";
import { connect } from "node:net";
import { HostResourceSample, ProcessResourceSample } from "./types";

export interface ManagedProcess {
  readonly pid: number;
  readonly child: ChildProcessWithoutNullStreams;
  wait(): Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  onControl(handler: (message: Record<string, unknown>) => void): void;
  terminate(graceMs?: number): Promise<{ forced: boolean; code: number | null; signal: NodeJS.Signals | null }>;
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may have exited between the liveness check and the signal.
    }
  }
}

export function spawnManaged(
  command: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdoutPath: string;
    stderrPath: string;
  },
): ManagedProcess {
  if (command.length === 0) throw new Error("Cannot spawn an empty command");
  const child = spawn(command[0], command.slice(1), {
    cwd: options.cwd,
    env: options.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!child.pid || !child.stdout || !child.stderr) throw new Error(`Failed to start ${command[0]}`);

  const stdout = createWriteStream(options.stdoutPath, { flags: "a", encoding: "utf8" });
  const stderr = createWriteStream(options.stderrPath, { flags: "a", encoding: "utf8" });
  const handlers: Array<(message: Record<string, unknown>) => void> = [];
  let stdoutBuffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout.write(chunk);
    stdoutBuffer += chunk.toString("utf8");
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const handler of handlers) handler(parsed as Record<string, unknown>);
        }
      } catch {
        // Server logs are intentionally human-readable; only JSON control lines are parsed.
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => stderr.write(chunk));

  let settled: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  let resolveWait!: (result: { code: number | null; signal: NodeJS.Signals | null }) => void;
  const waitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    resolveWait = resolve;
  });
  child.once("error", () => {
    if (!settled) {
      settled = { code: 1, signal: null };
      resolveWait(settled);
    }
  });
  child.once("exit", (code, signal) => {
    settled = { code, signal };
    stdout.end();
    stderr.end();
    resolveWait(settled);
  });

  return {
    pid: child.pid,
    child,
    wait: () => waitPromise,
    onControl: (handler) => handlers.push(handler),
    terminate: async (graceMs = 5000) => {
      if (!settled) {
        signalGroup(child.pid!, "SIGTERM");
        await Promise.race([waitPromise, new Promise((resolve) => setTimeout(resolve, graceMs))]);
      }
      let forced = false;
      if (!settled) {
        forced = true;
        signalGroup(child.pid!, "SIGKILL");
        await waitPromise;
      }
      return { forced, ...settled! };
    },
  };
}

export async function waitForReadiness(url: string, timeoutMs: number, intervalMs = 100): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Readiness timeout for ${url}: ${lastError}`);
}

export async function waitForPortClosed(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (!open) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function cgroupValue(fileName: string): number | undefined {
  try {
    const value = readFileSync(`/sys/fs/cgroup/${fileName}`, "utf8").trim();
    return value === "max" ? undefined : Number(value);
  } catch {
    return undefined;
  }
}

function readCgroupCpuThrottledMs(): number | undefined {
  try {
    const line = readFileSync("/sys/fs/cgroup/cpu.stat", "utf8")
      .split("\n")
      .find((entry) => entry.startsWith("throttled_usec "));
    return line ? Number(line.split(/\s+/)[1]) / 1000 : undefined;
  } catch {
    return undefined;
  }
}

function processStat(pid: number): { userMs: number; systemMs: number; rssBytes: number } | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const closeParen = stat.lastIndexOf(")");
    const fields = stat.slice(closeParen + 2).split(/\s+/);
    const clockTicks = 100;
    const rssPages = Number(fields[21]);
    return {
      userMs: (Number(fields[11]) / clockTicks) * 1000,
      systemMs: (Number(fields[12]) / clockTicks) * 1000,
      rssBytes: rssPages * 4096,
    };
  } catch {
    return undefined;
  }
}

function highWaterRss(pid: number): number | undefined {
  try {
    const line = readFileSync(`/proc/${pid}/status`, "utf8")
      .split("\n")
      .find((entry) => entry.startsWith("VmHWM:"));
    return line ? Number(line.replace(/[^0-9]/g, "")) * 1024 : undefined;
  } catch {
    return undefined;
  }
}

export function readProcessSample(pid: number): ProcessResourceSample | undefined {
  const stat = processStat(pid);
  if (!stat) return undefined;
  return {
    timestampMs: Date.now(),
    pid,
    cpuUserMs: stat.userMs,
    cpuSystemMs: stat.systemMs,
    rssBytes: stat.rssBytes,
    highWaterRssBytes: highWaterRss(pid),
    cgroupMemoryBytes: cgroupValue("memory.current"),
    cgroupMemoryPeakBytes: cgroupValue("memory.peak"),
    cgroupCpuThrottledMs: readCgroupCpuThrottledMs(),
  };
}

function hostCpu(): { userMs: number; systemMs: number; idleMs: number } | undefined {
  try {
    const line = readFileSync("/proc/stat", "utf8").split("\n").find((entry) => entry.startsWith("cpu "));
    if (!line) return undefined;
    const values = line.trim().split(/\s+/).slice(1).map(Number);
    return { userMs: values[0] || 0, systemMs: (values[2] || 0) + (values[3] || 0), idleMs: (values[3] || 0) + (values[4] || 0) };
  } catch {
    return undefined;
  }
}

export function readHostSample(): HostResourceSample {
  const cpu = hostCpu();
  let memoryTotalBytes: number | undefined;
  let memoryAvailableBytes: number | undefined;
  try {
    const values = Object.fromEntries(readFileSync("/proc/meminfo", "utf8").split("\n").map((line) => line.split(/:\s+/)).filter(([key, value]) => key && value).map(([key, value]) => [key, Number.parseInt(value, 10) * 1024]));
    memoryTotalBytes = values.MemTotal;
    memoryAvailableBytes = values.MemAvailable;
  } catch {
    // Host metrics are optional on non-Linux runners.
  }
  let load1: number | undefined;
  try {
    load1 = Number(readFileSync("/proc/loadavg", "utf8").split(/\s+/)[0]);
  } catch {
    // Host metrics are optional on non-Linux runners.
  }
  return {
    timestampMs: Date.now(),
    load1,
    memoryTotalBytes,
    memoryAvailableBytes,
    cpuUserMs: cpu?.userMs,
    cpuSystemMs: cpu?.systemMs,
    cpuIdleMs: cpu?.idleMs,
  };
}

export function startProcessSampler(pid: number, intervalMs = 250): { samples: ProcessResourceSample[]; stop(): void } {
  const samples: ProcessResourceSample[] = [];
  const collect = () => {
    const sample = readProcessSample(pid);
    if (sample) samples.push(sample);
  };
  collect();
  const interval = setInterval(collect, intervalMs);
  return { samples, stop: () => { clearInterval(interval); collect(); } };
}

export function startHostSampler(intervalMs = 250): { samples: HostResourceSample[]; stop(): void } {
  const samples: HostResourceSample[] = [];
  const collect = () => samples.push(readHostSample());
  collect();
  const interval = setInterval(collect, intervalMs);
  return { samples, stop: () => { clearInterval(interval); collect(); } };
}
