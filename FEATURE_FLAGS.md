# VEXEA Feature Flag Registry

This document catalogs all feature flags used in the VEXEA engine, their data types, and operational impact.

## 1. Governance & Architecture
- **Independent Evaluation:** Both the Server and Client evaluate flags independently using their respective ConfigCat SDK keys.
- **No Replication:** Flags are not passed through the server. The client talks directly to ConfigCat.
- **Fallbacks:** Every flag has a strongly-typed default in `DEFAULT_FEATURE_FLAGS` defined in `/shared/feature-flags.ts`.

## 2. ConfigCat Integration
VEXEA uses **ConfigCat** as the primary OpenFeature provider.
- **Server Key:** `SERVER_CONFIGCAT_SDK_KEY` (used for backend-specific architecture).
- **Client Key:** `VITE_CONFIGCAT_SDK_KEY` (used for browser-specific UI/UX logic).
- **Shared Key:** `SHARED_CONFIGCAT_SDK_KEY` / `VITE_SHARED_CONFIGCAT_SDK_KEY` (used for logic that must be known by both Client and Server/Verification services, such as economy multipliers and faction data).

## 3. Flag Matrix

| Flag Key | Target | Type | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `sentry_client_enabled` | CLIENT | BOOLEAN | `true` | Master toggle for client-side Sentry initialization. |
| `sentry_client_traces_rate` | CLIENT | NUMBER | `1.0` | Sample rate for client performance monitoring (0.0 to 1.0). |
| `sentry_browser_profiling` | CLIENT | BOOLEAN | `true` | Enables client-side browser profiling for performance analysis. |
| `sentry_feedback_enabled` | CLIENT | BOOLEAN | `true` | Enables the user-facing feedback collection widget. |
| `sentry_client_metrics_enabled` | CLIENT | BOOLEAN | `true` | Toggles collection of client-side Web Vitals and custom metrics. |
| `sentry_replay_enabled` | CLIENT | BOOLEAN | `false` | Enables full session replay recording (high bandwidth/data). |
| `sentry_server_enabled` | SERVER | BOOLEAN | `true` | Master toggle for server-side Sentry initialization. |
| `sentry_server_traces_rate` | SERVER | NUMBER | `1.0` | Sample rate for server performance monitoring (0.0 to 1.0). |
| `sentry_node_profiling` | SERVER | BOOLEAN | `true` | Enables server-side Node.js profiling. |
| `sentry_server_metrics_enabled` | SERVER | BOOLEAN | `true` | Toggles collection of server-side performance metrics. |
| `sentry_llm_tracing` | SERVER | BOOLEAN | `true` | Enables OpenTelemetry AI spans for Gemini API calls. |
| `llm_primary_model` | SERVER | STRING | `"gemini-3.5-flash"` | Primary model for drone orchestration. |
| `llm_token_ceiling` | SERVER | NUMBER | `55000` | Token budget per match before AI fallback. |
| `store_dynamic_offers` | SHARED | BOOLEAN | `true` | Enables store offer rotations (Server/Client/Verification sync). |
| `faction_war_active` | SHARED | BOOLEAN | `true` | Toggles the active Faction Warfare season events. |
| `match_difficulty_preset`| SERVER | STRING | `"STANDARD"` | Scales drone stats (Speed, Accuracy, Health). |

---
*Last Updated: 2026-08-05*
