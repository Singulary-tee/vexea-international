# VEXEA Feature Flag Registry

This document catalogs all feature flags used in the VEXEA engine, their target scope, data types, default values, and operational purpose. It serves as the single source of truth for the ConfigCat feature flag configuration.

## 1. Governance & Scope Separation
- **Strict Boundary Separation:** Client bundles have zero visibility into server flag keys, defaults, or schemas.
- **Client Flags (`/client/flags/client-flags.ts`):** Evaluated strictly on client/browser using `VITE_CONFIGCAT_SDK_KEY`.
- **Server Flags (`/server/flags/server-flags.ts`):** Evaluated strictly on server/node using `SERVER_CONFIGCAT_SDK_KEY`.
- **Shared Flags (`/shared/feature-flags.ts`):** Evaluated by both Client and Server using `SHARED_CONFIGCAT_SDK_KEY` / `VITE_SHARED_CONFIGCAT_SDK_KEY`.

## 2. ConfigCat Integration
VEXEA uses **ConfigCat** as the primary OpenFeature provider across three SDK keys:
- **Server Key:** `SERVER_CONFIGCAT_SDK_KEY` (used for backend orchestration, LLM models, and server telemetry).
- **Client Key:** `VITE_CONFIGCAT_SDK_KEY` (used for browser UI/UX logic, client Sentry, and WebGPU metrics).
- **Shared Key:** `SHARED_CONFIGCAT_SDK_KEY` / `VITE_SHARED_CONFIGCAT_SDK_KEY` (used for logic required by both Client and Server/Verification services, such as economy multipliers, Battle Pass data, and difficulty presets).

## 3. Flag Matrix

| Flag Key | Scope | Type | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Client Flags** | | | | |
| `sentry_client_enabled` | CLIENT | BOOLEAN | `true` | Master toggle for client-side Sentry initialization. |
| `sentry_client_traces_rate` | CLIENT | NUMBER | `1.0` | Sample rate for client performance monitoring (0.0 to 1.0). |
| `sentry_browser_profiling` | CLIENT | BOOLEAN | `true` | Enables client-side browser profiling for performance analysis. |
| `sentry_feedback_enabled` | CLIENT | BOOLEAN | `true` | Enables the user-facing feedback collection widget. |
| `sentry_client_metrics_enabled` | CLIENT | BOOLEAN | `true` | Toggles collection of client-side Web Vitals and custom metrics. |
| `sentry_replay_enabled` | CLIENT | BOOLEAN | `false` | Enables full session replay recording (high bandwidth/data). |
| `telemetry_webgpu_errors` | CLIENT | BOOLEAN | `true` | Captures WebGPU device and pipeline compilation error traces. |
| `telemetry_physics_worker_latency` | CLIENT | BOOLEAN | `true` | Monitors Rapier physics worker round-trip latency. |
| **Server Flags** | | | | |
| `sentry_server_enabled` | SERVER | BOOLEAN | `true` | Master toggle for server-side Sentry initialization. |
| `sentry_server_traces_rate` | SERVER | NUMBER | `1.0` | Sample rate for server performance monitoring (0.0 to 1.0). |
| `sentry_node_profiling` | SERVER | BOOLEAN | `true` | Enables server-side Node.js profiling. |
| `sentry_server_metrics_enabled` | SERVER | BOOLEAN | `true` | Toggles collection of server-side performance metrics. |
| `sentry_llm_tracing` | SERVER | BOOLEAN | `true` | Enables OpenTelemetry AI spans for LLM API calls. |
| `LLM_COMMANDER_FAMILY` | SERVER | STRING | `"gemini"` | Active AI commander adapter family (gemini, kimi, claude, openai). |
| `llm_primary_model` | SERVER | STRING | `"gemini-3.5-flash"` | Primary Gemini model for drone swarm orchestration. |
| `llm_fallback_models` | SERVER | ARRAY | `["gemini-3.6-flash", "gemini-3.1-flash"]` | Fallback Gemini models on rate limits. |
| `llm_token_ceiling` | SERVER | NUMBER | `55000` | Match token budget ceiling before falling back to offline AI. |
| `llm_cycle_interval_sec` | SERVER | NUMBER | `8` | AI Commander execution cycle interval in seconds. |
| `llm_ap_regen_rate` | SERVER | NUMBER | `10` | AP pool regeneration rate per AI cycle. |
| `kimi_primary_model` | SERVER | STRING | `"kimi-k2.6"` | Primary Kimi model for drone orchestration. |
| `kimi_fallback_models` | SERVER | ARRAY | `["kimi-k2.5"]` | Fallback Kimi models on rate limits. |
| `claude_primary_model` | SERVER | STRING | `"claude-sonnet-4-6"` | Primary Claude model for drone orchestration. |
| `claude_fallback_models` | SERVER | ARRAY | `["claude-opus-4-8", "claude-haiku-4-5-20251001"]` | Fallback Claude models on rate limits. |
| `openai_primary_model` | SERVER | STRING | `"gpt-5.6-sol"` | Primary OpenAI model for drone orchestration. |
| `openai_fallback_models` | SERVER | ARRAY | `["gpt-5.6-terra"]` | Fallback OpenAI models on rate limits. |
| `llm_max_output_tokens_per_cycle` | SERVER | NUMBER | `800` | Max completion tokens allocated per AI step. |
| `llm_max_tool_calls_per_cycle` | SERVER | NUMBER | `6` | Hard limit on tool calls executed per cycle. |
| `security_exploit_logging` | SERVER | BOOLEAN | `true` | Toggles security exploit attempt logging to Sentry. |
| **Shared Flags** | | | | |
| `store_dynamic_offers` | SHARED | BOOLEAN | `true` | Enables store offer rotations (Server/Client/Verification sync). |
| `faction_war_active` | SHARED | BOOLEAN | `true` | Toggles the active Faction Warfare season events. |
| `bp_season_id` | SHARED | STRING | `"SEASON_01"` | Active Battle Pass season identifier. |
| `bp_tier_count` | SHARED | NUMBER | `50` | Total number of tiers in the battle pass. |
| `bp_xp_per_tier` | SHARED | NUMBER | `10` | XP required per tier (cumulative calculation). |
| `match_difficulty_preset` | SHARED | STRING | `"STANDARD"` | Scales drone stats (Speed, Accuracy, Health). |
| `telemetry_desync_threshold` | SHARED | NUMBER | `0.5` | Position divergence threshold before logging dead reckoning snap. |
| `flags_used_enabled` | SHARED | BOOLEAN | `false` | Test flag for architecture analysis. |

---
*Last Updated: 2026-08-08*
