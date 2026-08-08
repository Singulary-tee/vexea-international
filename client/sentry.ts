import * as Sentry from "@sentry/browser";
import { ClientFeatureFlagKey } from "./flags/client-flags";
import { SharedFeatureFlagKey } from "../shared/feature-flags";
import { clientFlagService } from "./flags/flag-service";

import { getClientDopplerSecret } from "./doppler";

export let isClientSentryInitialized = false;

export function getSentryDSN(): string | undefined {
  return getClientDopplerSecret("VITE_SENTRY_DSN") ||
    getClientDopplerSecret("SENTRY_DSN") ||
    (import.meta as any).env?.VITE_SENTRY_DSN ||
    (import.meta as any).env?.SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env?.SENTRY_DSN : undefined);
}

export function initClientSentry(customDsn?: string): void {
  const isEnabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_ENABLED, true);
  if (!isEnabled) {
    console.log("[Sentry Client] Disabled via feature flag.");
    return;
  }

  const dsn =
    customDsn ||
    (import.meta as any).env?.VITE_SENTRY_DSN ||
    (import.meta as any).env?.SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env?.SENTRY_DSN : undefined);

  if (!dsn) {
    return;
  }

  if (isClientSentryInitialized) {
    return;
  }

  const tracesSampleRate = clientFlagService.getNumber(ClientFeatureFlagKey.SENTRY_CLIENT_TRACES_RATE, 1.0);
  const enableProfiling = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_BROWSER_PROFILING, true);
  const enableReplay = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_REPLAY_ENABLED, false);

  const integrations: any[] = [
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      autoInject: false, // We use our own UI in the main menu
      showBranding: false,
    }),
  ];

  if (enableProfiling) {
    integrations.push(Sentry.browserProfilingIntegration());
  }

  if (enableReplay && typeof (Sentry as any).replayIntegration === 'function') {
    integrations.push((Sentry as any).replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }));
  }

  Sentry.init({
    dsn,
    // Tracing
    tracesSampleRate,
    tracePropagationTargets: ["localhost", /^https:\/\/[^/]+\/api/],
    // Profiling
    profileSessionSampleRate: enableProfiling ? 1.0 : 0,
    profilesSampleRate: enableProfiling ? 1.0 : 0,
    // Replays
    replaysSessionSampleRate: enableReplay ? 0.1 : 0,
    replaysOnErrorSampleRate: enableReplay ? 1.0 : 0,
    environment: (import.meta as any).env?.MODE || "development",
    release: (import.meta as any).env?.VITE_RELEASE || "vexea@0.1.0",
    integrations,
    dataCollection: {
      userInfo: true,
    },
    debug: false,
  });

  isClientSentryInitialized = true;
  console.log("[Sentry Client] Initialized with DSN, release tracking, metrics, and profiling.");
}

// Initial check at module load - REMOVED to wait for flags in main.ts
// initClientSentry();

/**
 * Capture user feedback with session metadata and optional rating.
 */
export async function sendUserFeedback(params: {
  message: string;
  name?: string;
  email?: string;
  rating?: number;
  screen?: string;
}): Promise<boolean> {
  const feedbackEnabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_FEEDBACK_ENABLED, true);
  if (!feedbackEnabled || !isClientSentryInitialized) {
    return false;
  }

  try {
    const formattedMessage = `[Screen: ${params.screen || 'unknown'} | Rating: ${params.rating || 'N/A'}/5]\n${params.message}`;
    Sentry.captureFeedback({
      message: formattedMessage,
      name: params.name || 'Anonymous Operative',
      email: params.email || undefined,
      url: window.location.href,
    });
    return true;
  } catch (err) {
    console.warn("[Sentry Feedback] Failed to dispatch via Sentry API:", err);
  }
  return false;
}

/**
 * Client-Side Performance & Telemetry Metric Helpers
 */
export function recordClientFrameTime(frameTimeMs: number): void {
  const enabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED, true);
  if (!enabled || !isClientSentryInitialized) return;
  try {
    Sentry.metrics.distribution("client.frame_time_ms", frameTimeMs);
  } catch (e) {}
}

export function recordClientDrawCalls(drawCalls: number): void {
  const enabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED, true);
  if (!enabled || !isClientSentryInitialized) return;
  try {
    Sentry.metrics.gauge("client.draw_calls", drawCalls);
  } catch (e) {}
}

export function recordClientNetworkRTT(rttMs: number): void {
  const enabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED, true);
  if (!enabled || !isClientSentryInitialized) return;
  try {
    Sentry.metrics.distribution("client.network_rtt_ms", rttMs);
  } catch (e) {}
}

export function recordDesyncSnap(divergenceDistance: number): void {
  const threshold = clientFlagService.getNumber(SharedFeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD, 0.5);
  if (divergenceDistance < threshold) return;

  Sentry.addBreadcrumb({
    category: "telemetry.desync",
    message: `Client dead reckoning snapped by ${divergenceDistance.toFixed(2)} units`,
    level: "warning",
    data: { divergenceDistance },
  });

  const enabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED, true);
  if (enabled) {
    Sentry.metrics.count("client.dead_reckoning_snaps", 1);
  }
}

export function recordWebGPUError(error: unknown, context?: Record<string, unknown>): void {
  const enabled = clientFlagService.getBoolean(ClientFeatureFlagKey.TELEMETRY_WEBGPU_ERRORS, true);
  if (!enabled) return;

  Sentry.captureException(error, {
    tags: { subsystem: "webgpu" },
    extra: context,
  });
}

export { Sentry };


