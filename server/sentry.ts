import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { ServerFeatureFlagKey } from "./flags/server-flags";
import { serverFlagService } from "./flags/flag-service";

let isSentryInitialized = false;

export async function initSentry(): Promise<void> {
  const isEnabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_ENABLED, undefined, true);
  if (!isEnabled) {
    console.log("[Sentry Server] Disabled via feature flag.");
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  if (isSentryInitialized) {
    return;
  }

  const tracesSampleRate = await serverFlagService.getNumber(ServerFeatureFlagKey.SENTRY_SERVER_TRACES_RATE, undefined, 1.0);
  const enableProfiling = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_NODE_PROFILING, undefined, true);
  const enableLLMTracing = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_LLM_TRACING, undefined, true);

  const integrations: any[] = [];
  if (enableProfiling) {
    integrations.push(nodeProfilingIntegration());
  }
  
  if (enableLLMTracing && (Sentry as any).googleGenAIIntegration) {
    integrations.push((Sentry as any).googleGenAIIntegration());
  }

  Sentry.init({
    dsn,
    tracesSampleRate,
    profilesSampleRate: enableProfiling ? 1.0 : undefined,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || "vexea@0.1.0",
    integrations,
    debug: false,
  });

  isSentryInitialized = true;
  console.log("[Sentry Server] Initialized with DSN, release tracking, metrics, and profiling.");
}

// Initial check at module load
initSentry().catch((e) => console.warn("[Sentry Server] Async initialization error:", e));

/**
 * Real-time Server Metrics Helpers
 */
export async function recordServerTickDuration(durationMs: number): Promise<void> {
  const enabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (!enabled || !isSentryInitialized) return;
  try {
    Sentry.metrics.distribution("server.tick_duration_ms", durationMs);
  } catch (e) {}
}

export async function recordServerActiveDrones(count: number): Promise<void> {
  const enabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (!enabled || !isSentryInitialized) return;
  try {
    Sentry.metrics.gauge("server.active_drones", count);
  } catch (e) {}
}

export async function recordServerConnectedPlayers(count: number): Promise<void> {
  const enabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (!enabled || !isSentryInitialized) return;
  try {
    Sentry.metrics.gauge("server.connected_players", count);
  } catch (e) {}
}

export async function recordServerLLMLatency(latencyMs: number, model: string): Promise<void> {
  const enabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (!enabled || !isSentryInitialized) return;
  try {
    Sentry.metrics.distribution("server.llm_latency_ms", latencyMs, { attributes: { model } });
  } catch (e) {}
}

export async function recordHitscanRejected(reason: string): Promise<void> {
  const enabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (!enabled || !isSentryInitialized) return;
  try {
    Sentry.metrics.count("server.hitscan_rejected", 1, { attributes: { reason } });
  } catch (e) {}
}

export async function recordSecurityExploit(exploitType: string, details: Record<string, unknown>): Promise<void> {
  const loggingEnabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SECURITY_EXPLOIT_LOGGING, undefined, true);
  if (!loggingEnabled) return;

  Sentry.captureMessage(`[Security Alert] Exploit Attempt: ${exploitType}`, {
    level: "warning",
    extra: details,
  });

  const metricsEnabled = await serverFlagService.getBoolean(ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED, undefined, true);
  if (metricsEnabled) {
    Sentry.metrics.count("security.exploit_attempt", 1, { attributes: { exploitType } });
  }
}

export { Sentry };


