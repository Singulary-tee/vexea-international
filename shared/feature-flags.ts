/**
 * Shared Feature Flag Definitions and Types
 * Contains ONLY feature flags required by both client and server domains.
 */

export enum SharedFeatureFlagKey {
  // Store & Economy Flags
  STORE_DYNAMIC_OFFERS = 'store_dynamic_offers',

  // Faction Warfare & Territory Flags
  FACTION_WAR_ACTIVE = 'faction_war_active',

  // Battle Pass Flags
  BP_SEASON_ID = 'bp_season_id',
  BP_TIER_COUNT = 'bp_tier_count',
  BP_XP_PER_TIER = 'bp_xp_per_tier',

  // Match Difficulty & Gameplay Tuning Flags
  MATCH_DIFFICULTY_PRESET = 'match_difficulty_preset',
  TELEMETRY_DESYNC_THRESHOLD = 'telemetry_desync_threshold',
  FLAGS_USED_ENABLED = 'flags_used_enabled',
}

/**
  * FeatureFlagKey alias for shared flags and backward compatibility.
  */
export const FeatureFlagKey = {
  ...SharedFeatureFlagKey,
  SENTRY_CLIENT_ENABLED: 'sentry_client_enabled',
  SENTRY_SERVER_ENABLED: 'sentry_server_enabled',
} as const;

export type FeatureFlagValue = boolean | string | number | Record<string, unknown> | unknown[];

export interface SharedFeatureFlagSchema {
  [SharedFeatureFlagKey.STORE_DYNAMIC_OFFERS]: boolean;
  [SharedFeatureFlagKey.FACTION_WAR_ACTIVE]: boolean;
  [SharedFeatureFlagKey.BP_SEASON_ID]: string;
  [SharedFeatureFlagKey.BP_TIER_COUNT]: number;
  [SharedFeatureFlagKey.BP_XP_PER_TIER]: number;
  [SharedFeatureFlagKey.MATCH_DIFFICULTY_PRESET]: 'EASY' | 'STANDARD' | 'HARD' | 'NIGHTMARE';
  [SharedFeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD]: number;
  [SharedFeatureFlagKey.FLAGS_USED_ENABLED]: boolean;
}

export const DEFAULT_SHARED_FEATURE_FLAGS: SharedFeatureFlagSchema = {
  [SharedFeatureFlagKey.STORE_DYNAMIC_OFFERS]: true,
  [SharedFeatureFlagKey.FACTION_WAR_ACTIVE]: true,
  [SharedFeatureFlagKey.BP_SEASON_ID]: 'SEASON_01',
  [SharedFeatureFlagKey.BP_TIER_COUNT]: 50,
  [SharedFeatureFlagKey.BP_XP_PER_TIER]: 10,
  [SharedFeatureFlagKey.MATCH_DIFFICULTY_PRESET]: 'STANDARD',
  [SharedFeatureFlagKey.TELEMETRY_DESYNC_THRESHOLD]: 0.5,
  [SharedFeatureFlagKey.FLAGS_USED_ENABLED]: false,
};

export const DEFAULT_FEATURE_FLAGS = DEFAULT_SHARED_FEATURE_FLAGS;

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
export function getFeatureFlagScope(key: string): FeatureFlagScope {
  const clientKeys: string[] = [
    'sentry_client_enabled',
    'sentry_client_traces_rate',
    'sentry_browser_profiling',
    'sentry_feedback_enabled',
    'sentry_client_metrics_enabled',
    'sentry_replay_enabled',
    'telemetry_webgpu_errors',
    'telemetry_physics_worker_latency',
  ];

  const serverKeys: string[] = [
    'sentry_server_enabled',
    'sentry_server_traces_rate',
    'sentry_node_profiling',
    'sentry_llm_tracing',
    'sentry_server_metrics_enabled',
    'LLM_COMMANDER_FAMILY',
    'llm_primary_model',
    'llm_fallback_models',
    'llm_token_ceiling',
    'llm_cycle_interval_sec',
    'llm_ap_regen_rate',
    'kimi_primary_model',
    'kimi_fallback_models',
    'claude_primary_model',
    'claude_fallback_models',
    'openai_primary_model',
    'openai_fallback_models',
    'llm_max_output_tokens_per_cycle',
    'llm_max_tool_calls_per_cycle',
    'security_exploit_logging',
  ];

  if (clientKeys.includes(key)) {
    return FeatureFlagScope.CLIENT;
  }
  if (serverKeys.includes(key)) {
    return FeatureFlagScope.SERVER;
  }
  return FeatureFlagScope.SHARED;
}
