/**
 * Client-Only Feature Flag Definitions and Types
 * Strict boundary separation: Client flags are isolated from server code.
 */

export enum ClientFeatureFlagKey {
  // Sentry Observability & Telemetry Flags (Client)
  SENTRY_CLIENT_ENABLED = 'sentry_client_enabled',
  SENTRY_CLIENT_TRACES_RATE = 'sentry_client_traces_rate',
  SENTRY_BROWSER_PROFILING = 'sentry_browser_profiling',
  SENTRY_FEEDBACK_ENABLED = 'sentry_feedback_enabled',
  SENTRY_CLIENT_METRICS_ENABLED = 'sentry_client_metrics_enabled',
  SENTRY_REPLAY_ENABLED = 'sentry_replay_enabled',

  // Telemetry & Diagnostic Flags
  TELEMETRY_WEBGPU_ERRORS = 'telemetry_webgpu_errors',
  TELEMETRY_PHYSICS_WORKER_LATENCY = 'telemetry_physics_worker_latency',
}

export interface ClientFeatureFlagSchema {
  [ClientFeatureFlagKey.SENTRY_CLIENT_ENABLED]: boolean;
  [ClientFeatureFlagKey.SENTRY_CLIENT_TRACES_RATE]: number;
  [ClientFeatureFlagKey.SENTRY_BROWSER_PROFILING]: boolean;
  [ClientFeatureFlagKey.SENTRY_FEEDBACK_ENABLED]: boolean;
  [ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED]: boolean;
  [ClientFeatureFlagKey.SENTRY_REPLAY_ENABLED]: boolean;

  [ClientFeatureFlagKey.TELEMETRY_WEBGPU_ERRORS]: boolean;
  [ClientFeatureFlagKey.TELEMETRY_PHYSICS_WORKER_LATENCY]: boolean;
}

export const DEFAULT_CLIENT_FEATURE_FLAGS: ClientFeatureFlagSchema = {
  [ClientFeatureFlagKey.SENTRY_CLIENT_ENABLED]: true,
  [ClientFeatureFlagKey.SENTRY_CLIENT_TRACES_RATE]: 1.0,
  [ClientFeatureFlagKey.SENTRY_BROWSER_PROFILING]: true,
  [ClientFeatureFlagKey.SENTRY_FEEDBACK_ENABLED]: true,
  [ClientFeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED]: true,
  [ClientFeatureFlagKey.SENTRY_REPLAY_ENABLED]: false,

  [ClientFeatureFlagKey.TELEMETRY_WEBGPU_ERRORS]: true,
  [ClientFeatureFlagKey.TELEMETRY_PHYSICS_WORKER_LATENCY]: true,
};
