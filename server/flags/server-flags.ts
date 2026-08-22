/**
 * Server-Only Feature Flag Definitions and Types
 * Strict boundary separation: Server flags are never exposed to the client bundle.
 */

export enum ServerFeatureFlagKey {
  // Sentry Observability & Telemetry Flags (Server)
  SENTRY_SERVER_ENABLED = 'sentry_server_enabled',
  SENTRY_SERVER_TRACES_RATE = 'sentry_server_traces_rate',
  SENTRY_NODE_PROFILING = 'sentry_node_profiling',
  SENTRY_LLM_TRACING = 'sentry_llm_tracing',
  SENTRY_SERVER_METRICS_ENABLED = 'sentry_server_metrics_enabled',

  // LLM AI Commander Flags (Server Authoritative)
  LLM_COMMANDER_FAMILY = 'LLM_COMMANDER_FAMILY',
  LLM_PRIMARY_MODEL = 'llm_primary_model',
  LLM_FALLBACK_MODELS = 'llm_fallback_models',
  LLM_TOKEN_CEILING = 'llm_token_ceiling',
  LLM_CYCLE_INTERVAL_SEC = 'llm_cycle_interval_sec',
  LLM_AP_REGEN_RATE = 'llm_ap_regen_rate',
  KIMI_PRIMARY_MODEL = 'kimi_primary_model',
  KIMI_FALLBACK_MODELS = 'kimi_fallback_models',
  CLAUDE_PRIMARY_MODEL = 'claude_primary_model',
  CLAUDE_FALLBACK_MODELS = 'claude_fallback_models',
  OPENAI_PRIMARY_MODEL = 'openai_primary_model',
  OPENAI_FALLBACK_MODELS = 'openai_fallback_models',
  LLM_MAX_OUTPUT_TOKENS_PER_CYCLE = 'llm_max_output_tokens_per_cycle',
  LLM_MAX_TOOL_CALLS_PER_CYCLE = 'llm_max_tool_calls_per_cycle',

  // Dossier Pipeline Flags
  DOSSIER_MODEL_FAMILY = 'dossier_model_family',
  DOSSIER_MODEL = 'dossier_model',
  DOSSIER_FALLBACK_MODELS = 'dossier_fallback_models',
  DOSSIER_MAX_TOKENS_PER_PLAYER = 'dossier_max_tokens_per_player',

  // Security Flags
  SECURITY_EXPLOIT_LOGGING = 'security_exploit_logging',
}

export interface ServerFeatureFlagSchema {
  [ServerFeatureFlagKey.SENTRY_SERVER_ENABLED]: boolean;
  [ServerFeatureFlagKey.SENTRY_SERVER_TRACES_RATE]: number;
  [ServerFeatureFlagKey.SENTRY_NODE_PROFILING]: boolean;
  [ServerFeatureFlagKey.SENTRY_LLM_TRACING]: boolean;
  [ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED]: boolean;

  [ServerFeatureFlagKey.LLM_COMMANDER_FAMILY]: string;
  [ServerFeatureFlagKey.LLM_PRIMARY_MODEL]: string;
  [ServerFeatureFlagKey.LLM_FALLBACK_MODELS]: string[];
  [ServerFeatureFlagKey.LLM_TOKEN_CEILING]: number;
  [ServerFeatureFlagKey.LLM_CYCLE_INTERVAL_SEC]: number;
  [ServerFeatureFlagKey.LLM_AP_REGEN_RATE]: number;
  [ServerFeatureFlagKey.KIMI_PRIMARY_MODEL]: string;
  [ServerFeatureFlagKey.KIMI_FALLBACK_MODELS]: string[];
  [ServerFeatureFlagKey.CLAUDE_PRIMARY_MODEL]: string;
  [ServerFeatureFlagKey.CLAUDE_FALLBACK_MODELS]: string[];
  [ServerFeatureFlagKey.OPENAI_PRIMARY_MODEL]: string;
  [ServerFeatureFlagKey.OPENAI_FALLBACK_MODELS]: string[];
  [ServerFeatureFlagKey.LLM_MAX_OUTPUT_TOKENS_PER_CYCLE]: number;
  [ServerFeatureFlagKey.LLM_MAX_TOOL_CALLS_PER_CYCLE]: number;

  [ServerFeatureFlagKey.DOSSIER_MODEL_FAMILY]: string;
  [ServerFeatureFlagKey.DOSSIER_MODEL]: string;
  [ServerFeatureFlagKey.DOSSIER_FALLBACK_MODELS]: string[];
  [ServerFeatureFlagKey.DOSSIER_MAX_TOKENS_PER_PLAYER]: number;

  [ServerFeatureFlagKey.SECURITY_EXPLOIT_LOGGING]: boolean;
}

export const DEFAULT_SERVER_FEATURE_FLAGS: ServerFeatureFlagSchema = {
  [ServerFeatureFlagKey.SENTRY_SERVER_ENABLED]: true,
  [ServerFeatureFlagKey.SENTRY_SERVER_TRACES_RATE]: 1.0,
  [ServerFeatureFlagKey.SENTRY_NODE_PROFILING]: true,
  [ServerFeatureFlagKey.SENTRY_LLM_TRACING]: true,
  [ServerFeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED]: true,

  [ServerFeatureFlagKey.LLM_COMMANDER_FAMILY]: 'gemini',
  [ServerFeatureFlagKey.LLM_PRIMARY_MODEL]: 'gemini-3.5-flash',
  [ServerFeatureFlagKey.LLM_FALLBACK_MODELS]: ['gemini-3.6-flash', 'gemini-3.1-flash'],
  [ServerFeatureFlagKey.LLM_TOKEN_CEILING]: 55000,
  [ServerFeatureFlagKey.LLM_CYCLE_INTERVAL_SEC]: 8,
  [ServerFeatureFlagKey.LLM_AP_REGEN_RATE]: 10,
  [ServerFeatureFlagKey.KIMI_PRIMARY_MODEL]: 'kimi-k2.6',
  [ServerFeatureFlagKey.KIMI_FALLBACK_MODELS]: ['kimi-k2.5'],
  [ServerFeatureFlagKey.CLAUDE_PRIMARY_MODEL]: 'claude-sonnet-4-6',
  [ServerFeatureFlagKey.CLAUDE_FALLBACK_MODELS]: ['claude-opus-4-8', 'claude-haiku-4-5-20251001'],
  [ServerFeatureFlagKey.OPENAI_PRIMARY_MODEL]: 'gpt-5.6-sol',
  [ServerFeatureFlagKey.OPENAI_FALLBACK_MODELS]: ['gpt-5.6-terra'],
  [ServerFeatureFlagKey.LLM_MAX_OUTPUT_TOKENS_PER_CYCLE]: 800,
  [ServerFeatureFlagKey.LLM_MAX_TOOL_CALLS_PER_CYCLE]: 6,

  [ServerFeatureFlagKey.DOSSIER_MODEL_FAMILY]: 'gemini',
  [ServerFeatureFlagKey.DOSSIER_MODEL]: 'gemini-3.5-flash',
  [ServerFeatureFlagKey.DOSSIER_FALLBACK_MODELS]: ['gemini-3.6-flash', 'gemini-3.1-flash'],
  [ServerFeatureFlagKey.DOSSIER_MAX_TOKENS_PER_PLAYER]: 200,

  [ServerFeatureFlagKey.SECURITY_EXPLOIT_LOGGING]: true,
};

export function getServerFlagValue<T>(key: ServerFeatureFlagKey, fallback?: T): T {
  if (key in DEFAULT_SERVER_FEATURE_FLAGS) {
    return (DEFAULT_SERVER_FEATURE_FLAGS[key] as unknown as T) ?? (fallback as T);
  }
  return fallback as T;
}
