import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BENCHMARK_SCHEMA_VERSION,
  BenchmarkProfile,
  BudgetSpec,
  WorkloadSpec,
} from "./types";

type RecordValue = Record<string, unknown>;

function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as RecordValue;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function numberValue(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${path} must be a finite number >= ${minimum}`);
  }
  return value;
}

function integerValue(value: unknown, path: string, minimum = 0): number {
  const result = numberValue(value, path, minimum);
  if (!Number.isInteger(result)) throw new Error(`${path} must be an integer`);
  return result;
}

function enumValue<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${path} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function workloadValue(value: unknown): WorkloadSpec {
  const input = record(value, "workload");
  return {
    rooms: integerValue(input.rooms, "workload.rooms", 1),
    clientsPerRoom: integerValue(input.clientsPerRoom, "workload.clientsPerRoom"),
    botsPerRoom: integerValue(input.botsPerRoom, "workload.botsPerRoom"),
    dronesPerRoom: integerValue(input.dronesPerRoom, "workload.dronesPerRoom"),
    projectilesPerRoom: integerValue(input.projectilesPerRoom, "workload.projectilesPerRoom"),
    durationMs: integerValue(input.durationMs, "workload.durationMs", 1),
    warmupMs: integerValue(input.warmupMs, "workload.warmupMs"),
    cooldownMs: integerValue(input.cooldownMs, "workload.cooldownMs"),
    inputHz: numberValue(input.inputHz, "workload.inputHz"),
    reliableEventsPerSecond: numberValue(
      input.reliableEventsPerSecond,
      "workload.reliableEventsPerSecond",
    ),
    firePerSecond: numberValue(input.firePerSecond, "workload.firePerSecond"),
    contact: enumValue(input.contact, "workload.contact", ["none", "calm", "persistent", "dense"]),
    seed: integerValue(input.seed, "workload.seed"),
  };
}

function budgetValue(value: unknown): BudgetSpec {
  const input = record(value, "budgets");
  return {
    maxP95TickMs: numberValue(input.maxP95TickMs, "budgets.maxP95TickMs"),
    minTickRate: numberValue(input.minTickRate, "budgets.minTickRate"),
    maxDroppedTicks: integerValue(input.maxDroppedTicks, "budgets.maxDroppedTicks"),
    maxRssBytes: numberValue(input.maxRssBytes, "budgets.maxRssBytes"),
    maxCpuPercent: numberValue(input.maxCpuPercent, "budgets.maxCpuPercent"),
    maxP95RttMs: numberValue(input.maxP95RttMs, "budgets.maxP95RttMs"),
    maxLossRate: numberValue(input.maxLossRate, "budgets.maxLossRate"),
    maxNetworkBytesPerSecond: numberValue(
      input.maxNetworkBytesPerSecond,
      "budgets.maxNetworkBytesPerSecond",
    ),
    headroomPercent: numberValue(input.headroomPercent, "budgets.headroomPercent"),
  };
}

export function validateProfile(value: unknown): BenchmarkProfile {
  const input = record(value, "profile");
  if (input.schemaVersion !== BENCHMARK_SCHEMA_VERSION) {
    throw new Error(`profile.schemaVersion must be ${BENCHMARK_SCHEMA_VERSION}`);
  }

  const server = record(input.server, "server");
  const command = server.command;
  if (!Array.isArray(command) || command.length === 0 || command.some((item) => typeof item !== "string")) {
    throw new Error("server.command must be a non-empty string array");
  }
  const buildCommand = server.buildCommand;
  if (buildCommand !== undefined && (!Array.isArray(buildCommand) || buildCommand.some((item) => typeof item !== "string"))) {
    throw new Error("server.buildCommand must be a string array");
  }

  const map = record(input.map, "map");
  const services = record(input.services, "services");
  const trials = record(input.trials, "trials");
  const confidenceLevel = numberValue(trials.confidenceLevel, "trials.confidenceLevel");
  if (confidenceLevel <= 0 || confidenceLevel >= 1) {
    throw new Error("trials.confidenceLevel must be greater than 0 and less than 1");
  }

  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    id: stringValue(input.id, "id"),
    title: stringValue(input.title, "title"),
    boundary: enumValue(input.boundary, "boundary", ["engine", "server-process", "host", "deployment"]),
    transport: enumValue(input.transport, "transport", ["socketio", "geckos"]),
    server: {
      command: command as string[],
      buildCommand: buildCommand as string[] | undefined,
      port: integerValue(server.port, "server.port", 1),
      readinessPath: stringValue(server.readinessPath, "server.readinessPath"),
      env: server.env === undefined ? undefined : record(server.env, "server.env") as Record<string, string>,
    },
    map: {
      id: stringValue(map.id, "map.id"),
      mode: enumValue(map.mode, "map.mode", ["synthetic", "repository"]),
      expectedHash: map.expectedHash === undefined ? undefined : stringValue(map.expectedHash, "map.expectedHash"),
      allowFallback: map.allowFallback === true,
    },
    services: {
      llm: enumValue(services.llm, "services.llm", ["disabled", "stub", "live"]),
      persistence: enumValue(services.persistence, "services.persistence", ["disabled", "stub", "live"]),
      observability: enumValue(services.observability, "services.observability", ["disabled", "stub", "live"]),
    },
    instrumentation: enumValue(input.instrumentation, "instrumentation", ["off", "counters", "full"]),
    workload: workloadValue(input.workload),
    budgets: budgetValue(input.budgets),
    trials: {
      warmups: integerValue(trials.warmups, "trials.warmups"),
      repetitions: integerValue(trials.repetitions, "trials.repetitions", 1),
      confidenceLevel,
    },
  };
}

export function loadProfile(filePath: string): BenchmarkProfile {
  const absolutePath = resolve(filePath);
  try {
    return validateProfile(JSON.parse(readFileSync(absolutePath, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid benchmark profile ${absolutePath}: ${message}`);
  }
}
