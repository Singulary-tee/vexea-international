/**
 * Shared Feature Flag Definitions and Types
 * Strict OpenFeature schema and separation boundaries between Server and Client.
 */

export enum FeatureFlagKey {
  // Sentry Observability & Telemetry Flags
  SENTRY_CLIENT_ENABLED = 'sentry_client_enabled',
  SENTRY_SERVER_ENABLED = 'sentry_server_enabled',
  SENTRY_CLIENT_TRACES_RATE = 'sentry_client_traces_rate',
  SENTRY_SERVER_TRACES_RATE = 'sentry_server_traces_rate',
  SENTRY_BROWSER_PROFILING = 'sentry_browser_profiling',
  SENTRY_NODE_PROFILING = 'sentry_node_profiling',
  SENTRY_FEEDBACK_ENABLED = 'sentry_feedback_enabled',
  SENTRY_LLM_TRACING = 'sentry_llm_tracing',
  SENTRY_CLIENT_METRICS_ENABLED = 'sentry_client_metrics_enabled',
  SENTRY_SERVER_METRICS_ENABLED = 'sentry_server_metrics_enabled',
  SENTRY_REPLAY_ENABLED = 'sentry_replay_enabled',

  // LLM AI Commander Flags (Server Authoritative)
  LLM_PRIMARY_MODEL = 'llm_primary_model',
  LLM_FALLBACK_MODELS = 'llm_fallback_models',
  LLM_TOKEN_CEILING = 'llm_token_ceiling',
  LLM_CYCLE_INTERVAL_SEC = 'llm_cycle_interval_sec',
  LLM_AP_REGEN_RATE = 'llm_ap_regen_rate',

  // Store & Economy Flags
  STORE_DYNAMIC_OFFERS = 'store_dynamic_offers',
  STORE_DISCOUNT_ACTIVE = 'store_discount_active',
  STORE_CREDIT_MULTIPLIER = 'store_credit_multiplier',

  // Faction Warfare & Territory Flags
  FACTION_WAR_ACTIVE = 'faction_war_active',
  FACTION_WAR_MULTIPLIER = 'faction_war_multiplier',
  FACTION_TERRITORY_DECAY_RATE = 'faction_territory_decay_rate',

  // Battle Pass Flags (Shared)
  BP_SEASON_ID = 'bp_season_id',
  BP_TIER_COUNT = 'bp_tier_count',
  BP_XP_PER_TIER = 'bp_xp_per_tier',

  // Match Difficulty & Gameplay Tuning Flags
  MATCH_DIFFICULTY_PRESET = 'match_difficulty_preset',
  TELEMETRY_WEBGPU_ERRORS = 'telemetry_webgpu_errors',
  TELEMETRY_PHYSICS_WORKER_LATENCY = 'telemetry_physics_worker_latency',
  SECURITY_EXPLOIT_LOGGING = 'security_exploit_logging',
  TELEMETRY_DESYNC_THRESHOLD = 'telemetry_desync_threshold',
  FLAGS_USED_ENABLED = 'flags_used_enabled',
}

export type FeatureFlagValue = boolean | string | number | Record<string, unknown> | unknown[];

export interface FeatureFlagSchema {
  [FeatureFlagKey.SENTRY_CLIENT_ENABLED]: boolean;
  [FeatureFlagKey.SENTRY_SERVER_ENABLED]: boolean;
  [FeatureFlagKey.SENTRY_CLIENT_TRACES_RATE]: number;
  [FeatureFlagKey.SENTRY_SERVER_TRACES_RATE]: number;
  [FeatureFlagKey.SENTRY_BROWSER_PROFILING]: boolean;
  [FeatureFlagKey.SENTRY_NODE_PROFILING]: boolean;
  [FeatureFlagKey.SENTRY_FEEDBACK_ENABLED]: boolean;
  [FeatureFlagKey.SENTRY_LLM_TRACING]: boolean;
  [FeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED]: boolean;
  [FeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED]: boolean;
  [FeatureFlagKey.SENTRY_REPLAY_ENABLED]: boolean;

  [FeatureFlagKey.LLM_PRIMARY_MODEL]: string;
  [FeatureFlagKey.LLM_FALLBACK_MODELS]: string[];
  [FeatureFlagKey.LLM_TOKEN_CEILING]: number;
  [FeatureFlagKey.LLM_CYCLE_INTERVAL_SEC]: number;
  [FeatureFlagKey.LLM_AP_REGEN_RATE]: number;

  [FeatureFlagKey.STORE_DYNAMIC_OFFERS]: boolean;
  [FeatureFlagKey.STORE_DISCOUNT_ACTIVE]: boolean;
  [FeatureFlagKey.STORE_CREDIT_MULTIPLIER]: number;

  [FeatureFlagKey.FACTION_WAR_ACTIVE]: boolean;
  [FeatureFlagKey.FACTION_WAR_MULTIPLIER]: number;
  [FeatureFlagKey.FACTION_TERRITORY_DECAY_RATE]: number;

  [FeatureFlagKey.BP_SEASON_ID]: string;
  [FeatureFlagKey.BP_TIER_COUNT]: number;
  [FeatureFlagKey.BP_XP_PER_TIER]: number;

  [FeatureFlagKey.MATCH_DIFFICULTY_PRESET]: 'EASY' | 'STANDARD' | 'HARD' | 'NIGHTMARE';
  [FeatureFlagKey.TELEMETRY_WEBGPU_ERRORS]: boolean;
  [FeatureFlagKey.TELEMETRY_PHYSICS_WORKER_LATENCY]: boolean;
  [FeatureFlagKey.SECURITY_EXPLOIT_LOGGING]: boolean;
  [FeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD]: number;
  [FeatureFlagKey.FLAGS_USED_ENABLED]: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagSchema = {
  [FeatureFlagKey.SENTRY_CLIENT_ENABLED]: true,
  [FeatureFlagKey.SENTRY_SERVER_ENABLED]: true,
  [FeatureFlagKey.SENTRY_CLIENT_TRACES_RATE]: 1.0,
  [FeatureFlagKey.SENTRY_SERVER_TRACES_RATE]: 1.0,
  [FeatureFlagKey.SENTRY_BROWSER_PROFILING]: true,
  [FeatureFlagKey.SENTRY_NODE_PROFILING]: true,
  [FeatureFlagKey.SENTRY_FEEDBACK_ENABLED]: true,
  [FeatureFlagKey.SENTRY_LLM_TRACING]: true,
  [FeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED]: true,
  [FeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED]: true,
  [FeatureFlagKey.SENTRY_REPLAY_ENABLED]: false,

  [FeatureFlagKey.LLM_PRIMARY_MODEL]: 'gemini-3.5-flash',
  [FeatureFlagKey.LLM_FALLBACK_MODELS]: ['gemini-3.6-flash', 'gemini-3.1-flash'],
  [FeatureFlagKey.LLM_TOKEN_CEILING]: 55000,
  [FeatureFlagKey.LLM_CYCLE_INTERVAL_SEC]: 8,
  [FeatureFlagKey.LLM_AP_REGEN_RATE]: 10,

  [FeatureFlagKey.STORE_DYNAMIC_OFFERS]: true,
  [FeatureFlagKey.STORE_DISCOUNT_ACTIVE]: false,
  [FeatureFlagKey.STORE_CREDIT_MULTIPLIER]: 1.0,

  [FeatureFlagKey.FACTION_WAR_ACTIVE]: true,
  [FeatureFlagKey.FACTION_WAR_MULTIPLIER]: 1.0,
  [FeatureFlagKey.FACTION_TERRITORY_DECAY_RATE]: 0.05,

  [FeatureFlagKey.BP_SEASON_ID]: 'SEASON_01',
  [FeatureFlagKey.BP_TIER_COUNT]: 50,
  [FeatureFlagKey.BP_XP_PER_TIER]: 10,

  [FeatureFlagKey.MATCH_DIFFICULTY_PRESET]: 'STANDARD',
  [FeatureFlagKey.TELEMETRY_WEBGPU_ERRORS]: true,
  [FeatureFlagKey.TELEMETRY_PHYSICS_WORKER_LATENCY]: true,
  [FeatureFlagKey.SECURITY_EXPLOIT_LOGGING]: true,
  [FeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD]: 0.5,
  [FeatureFlagKey.FLAGS_USED_ENABLED]: false,
};

export interface FlagEvaluationContext {
  userId?: string;
  roomId?: string;
  faction?: string;
  platform?: 'mobile' | 'desktop';
  environment?: string;
  [key: string]: unknown;
}

export enum FeatureFlagScope {
  CLIENT = 'client',
  SERVER = 'server',
  SHARED = 'shared',
}

/**
 * Determines the architectural scope of a feature flag.
 * Used by FlagServices to select the correct ConfigCat SDK Key.
 */
export function getFeatureFlagScope(key: FeatureFlagKey): FeatureFlagScope {
  switch (key) {
    case FeatureFlagKey.SENTRY_CLIENT_ENABLED:
    case FeatureFlagKey.SENTRY_CLIENT_TRACES_RATE:
    case FeatureFlagKey.SENTRY_BROWSER_PROFILING:
    case FeatureFlagKey.SENTRY_FEEDBACK_ENABLED:
    case FeatureFlagKey.SENTRY_CLIENT_METRICS_ENABLED:
    case FeatureFlagKey.SENTRY_REPLAY_ENABLED:
    case FeatureFlagKey.TELEMETRY_WEBGPU_ERRORS:
    case FeatureFlagKey.TELEMETRY_PHYSICS_WORKER_LATENCY:
      return FeatureFlagScope.CLIENT;

    case FeatureFlagKey.SENTRY_SERVER_ENABLED:
    case FeatureFlagKey.SENTRY_SERVER_TRACES_RATE:
    case FeatureFlagKey.SENTRY_NODE_PROFILING:
    case FeatureFlagKey.SENTRY_LLM_TRACING:
    case FeatureFlagKey.SENTRY_SERVER_METRICS_ENABLED:
    case FeatureFlagKey.LLM_PRIMARY_MODEL:
    case FeatureFlagKey.LLM_FALLBACK_MODELS:
    case FeatureFlagKey.LLM_TOKEN_CEILING:
    case FeatureFlagKey.LLM_CYCLE_INTERVAL_SEC:
    case FeatureFlagKey.LLM_AP_REGEN_RATE:
    case FeatureFlagKey.SECURITY_EXPLOIT_LOGGING:
      return FeatureFlagScope.SERVER;

    case FeatureFlagKey.STORE_DYNAMIC_OFFERS:
    case FeatureFlagKey.STORE_DISCOUNT_ACTIVE:
    case FeatureFlagKey.STORE_CREDIT_MULTIPLIER:
    case FeatureFlagKey.FACTION_WAR_ACTIVE:
    case FeatureFlagKey.FACTION_WAR_MULTIPLIER:
    case FeatureFlagKey.FACTION_TERRITORY_DECAY_RATE:
    case FeatureFlagKey.BP_SEASON_ID:
    case FeatureFlagKey.BP_TIER_COUNT:
    case FeatureFlagKey.BP_XP_PER_TIER:
    case FeatureFlagKey.MATCH_DIFFICULTY_PRESET:
    case FeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD:
      return FeatureFlagScope.SHARED;

    default:
      return FeatureFlagScope.SHARED;
  }
}
