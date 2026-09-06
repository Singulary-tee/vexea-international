import { appendFileSync, readFileSync } from "node:fs";
import { createBenchmarkClientTransport, BenchmarkClientTransport } from "./client-transport";
import { createBenchmarkScenarioDriver } from "./scenario-driver";
import { BenchmarkScenarioDriver } from "./scenario";
import { createClientIdentity, createInput } from "./workload";

interface ClientConfig {
  url: string;
  transport: "socketio" | "geckos";
  mapId: string;
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
  contact: "none" | "calm" | "persistent" | "dense";
  matchIdPrefix: string;
  outputPath: string;
}

interface ClientRecord {
  client: BenchmarkClientTransport;
  scenario: BenchmarkScenarioDriver;
  roomIndex: number;
  index: number;
  ready: boolean;
  sessionInitialized: boolean;
  seq: number;
  connectedAt: number;
}

function config(): ClientConfig {
  const path = process.env.VEXEA_BENCHMARK_CLIENT_CONFIG;
  if (!path) throw new Error("VEXEA_BENCHMARK_CLIENT_CONFIG is required");
  return JSON.parse(readFileSync(path, "utf8")) as ClientConfig;
}

function control(type: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ type, ...fields })}\n`);
}

function writeSample(path: string, clients: ClientRecord[]): void {
  const totals = clients.reduce(
    (result, record) => {
      const stats = record.client.stats;
      result.connected += stats.connected ? 1 : 0;
      result.ready += record.ready ? 1 : 0;
      result.incomingBytes += stats.incomingBytes;
      result.outgoingBytes += stats.outgoingBytes;
      result.wireIncomingBytes += stats.wireIncomingBytes;
      result.wireOutgoingBytes += stats.wireOutgoingBytes;
      result.incomingMessages += stats.incomingMessages;
      result.outgoingMessages += stats.outgoingMessages;
      result.rawIncomingBytes += stats.rawIncomingBytes;
      result.rawOutgoingBytes += stats.rawOutgoingBytes;
      result.stateSyncMessages += stats.stateSyncMessages;
      result.reliableMessages += stats.reliableMessages;
      result.disconnects += stats.disconnects;
      result.errors += stats.errors;
      if (stats.rttMs !== undefined) result.rttMs.push(stats.rttMs);
      return result;
    },
    {
      connected: 0,
      ready: 0,
      incomingBytes: 0,
      outgoingBytes: 0,
      wireIncomingBytes: 0,
      wireOutgoingBytes: 0,
      incomingMessages: 0,
      outgoingMessages: 0,
      rawIncomingBytes: 0,
      rawOutgoingBytes: 0,
      stateSyncMessages: 0,
      reliableMessages: 0,
      disconnects: 0,
      errors: 0,
      rttMs: [] as number[],
    },
  );
  const rtt = totals.rttMs.length
    ? totals.rttMs.reduce((sum, value) => sum + value, 0) / totals.rttMs.length
    : undefined;
  appendFileSync(path, `${JSON.stringify({
    type: "client_sample",
    timestampMs: Date.now(),
    ...totals,
    rttMs: rtt,
  })}\n`);
}

function dronePosition(configValue: ClientConfig, roomIndex: number, index: number): { x: number; y: number; z: number } {
  if (configValue.contact === "none") return { x: 1000 + index * 3, y: 5, z: 1000 + roomIndex * 3 };
  if (configValue.contact === "dense") return { x: index % 3, y: 5, z: 120 + Math.floor(index / 3) };
  if (configValue.contact === "persistent") return { x: (index % 4) * 3, y: 5, z: 122 + Math.floor(index / 4) * 2 };
  return { x: 20 + index * 8, y: 5, z: 160 + roomIndex * 4 };
}

async function waitFor(predicate: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function run(): Promise<void> {
  const profile = config();
  const clients: ClientRecord[] = [];
  for (let roomIndex = 0; roomIndex < profile.rooms; roomIndex += 1) {
    for (let index = 0; index < profile.clientsPerRoom; index += 1) {
      const transport = createBenchmarkClientTransport(profile.transport, profile.url);
      const scenario = createBenchmarkScenarioDriver(transport);
      const record: ClientRecord = {
        client: transport,
        scenario,
        roomIndex,
        index,
        ready: false,
        sessionInitialized: false,
        seq: 0,
        connectedAt: 0,
      };
      scenario.observe("session-initialized", () => {
        record.sessionInitialized = true;
      });
      scenario.observe("match-ready", () => {
        record.ready = true;
      });
      transport.on("pong", () => {
        transport.stats.rttMs = Date.now() - (record as ClientRecord & { pingAt?: number }).pingAt!;
      });
      clients.push(record);
    }
  }

  try {
    await Promise.all(clients.map(async (record) => {
      record.connectedAt = Date.now();
      await record.client.connect();
    }));
    await waitFor(() => clients.every((record) => record.sessionInitialized), 15000, "session initialization");
    for (const record of clients) {
      const identity = createClientIdentity(profile.matchIdPrefix, record.roomIndex, record.index);
      record.scenario.join({ ...identity, mapId: profile.mapId });
      record.scenario.advance({ kind: "loading-complete" });
      record.scenario.advance({ kind: "ready" });
    }
    await waitFor(() => clients.every((record) => record.ready), 15000, "all rooms ready");
    control("ready", { clients: clients.length, rooms: profile.rooms });

    for (let roomIndex = 0; roomIndex < profile.rooms; roomIndex += 1) {
      const owner = clients.find((record) => record.roomIndex === roomIndex && record.index === 0);
      if (!owner) continue;
      owner.scenario.advance({ kind: "disable-ai" });
      if (profile.botsPerRoom > 0) owner.scenario.spawn({ kind: "bots", count: profile.botsPerRoom });
      for (let index = 0; index < profile.dronesPerRoom; index += 1) {
        const position = dronePosition(profile, roomIndex, index);
        owner.scenario.spawn({ kind: "drone", type: 4, position });
      }
    }

    const inputInterval = profile.inputHz > 0
      ? setInterval(() => {
          for (const record of clients) {
            record.scenario.input(createInput(++record.seq, record.index));
          }
        }, Math.max(1, Math.round(1000 / profile.inputHz)))
      : undefined;
    inputInterval?.unref();

    const reliableInterval = profile.reliableEventsPerSecond > 0
      ? setInterval(() => {
          for (const record of clients) record.scenario.reliable({ kind: "objective-hold", holding: true });
        }, Math.max(1, Math.round(1000 / profile.reliableEventsPerSecond)))
      : undefined;
    reliableInterval?.unref();

    const fireInterval = profile.firePerSecond > 0
      ? setInterval(() => {
          for (const record of clients) record.scenario.reliable({ kind: "fire", weaponSlot: "primary" });
        }, Math.max(1, Math.round(1000 / profile.firePerSecond)))
      : undefined;
    fireInterval?.unref();

    const projectileInterval = profile.projectilesPerRoom > 0
      ? setInterval(() => {
          for (let roomIndex = 0; roomIndex < profile.rooms; roomIndex += 1) {
            const owner = clients.find((record) => record.roomIndex === roomIndex && record.index === 0);
            owner?.scenario.spawn({ kind: "projectiles", count: profile.projectilesPerRoom });
          }
        }, 250)
      : undefined;
    projectileInterval?.unref();

    const pingInterval = setInterval(() => {
      for (const record of clients) {
        (record as ClientRecord & { pingAt?: number }).pingAt = Date.now();
        record.scenario.probe();
      }
    }, 1000);
    pingInterval.unref();

    const sampleInterval = setInterval(() => writeSample(profile.outputPath, clients), 1000);
    sampleInterval.unref();
    await new Promise((resolve) => setTimeout(resolve, profile.warmupMs));
    writeSample(profile.outputPath, clients);
    control("measurement_start", { clients: clients.length, rooms: profile.rooms });
    await new Promise((resolve) => setTimeout(resolve, profile.durationMs));
    clearInterval(inputInterval);
    clearInterval(reliableInterval);
    clearInterval(fireInterval);
    clearInterval(projectileInterval);
    clearInterval(pingInterval);
    clearInterval(sampleInterval);
    writeSample(profile.outputPath, clients);
    control("measurement_end", { clients: clients.length, rooms: profile.rooms });
    await new Promise((resolve) => setTimeout(resolve, profile.cooldownMs));
    for (const record of clients) record.client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
    control("complete", { clients: clients.length });
    process.exit(0);
  } catch (error) {
    control("failure", { message: error instanceof Error ? error.message : String(error) });
    for (const record of clients) record.client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.exitCode = 1;
  }
}

run().catch((error) => {
  control("failure", { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
