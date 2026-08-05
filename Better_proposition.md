# Strategic Engineering Plan: OpenFeature Infrastructure, Advanced Sentry Observability, and Remote Server-Controlled Architecture

**Document Version:** 1.0.0  
**Status:** Proposition & Architecture Plan  
**Target Systems:** Client (`/client`), Server (`/server`), Shared (`/shared`)  
**Adherence:** Architecture.md compliant, zero-allocation render/tick loop compliant, mobile-first, Doppler-integrated.

---

## 1. Executive Summary & Codebase Evidence Audit

### 1.1 Existing Architecture & Limitations

Direct analysis of the codebase reveals several critical architectural areas requiring standardization and expansion:

1. **Current Sentry Setup (Client & Server):**
   * *Client Sentry (`/client/sentry.ts`, lines 1-36):*
     ```typescript
     import * as Sentry from "@sentry/browser";
     Sentry.init({
       dsn,
       tracesSampleRate: 1.0,
       environment: (import.meta as any).env?.MODE || "development",
       integrations: [
         Sentry.captureConsoleIntegration({ levels: ["error"] }),
       ],
       dataCollection: { userInfo: true },
       debug: false,
     });
     ```
     *Limitation:* Only captures console errors and unhandled exceptions. Lacks distributed tracing, JS self-profiling, metrics emission, session replay, and Sentry User Feedback API integration.
   * *Server Sentry (`/server/sentry.ts`, lines 1-23):*
     ```typescript
     import * as Sentry from "@sentry/node";
     Sentry.init({
       dsn,
       tracesSampleRate: 1.0,
       environment: process.env.NODE_ENV || "development",
       debug: false,
     });
     ```
     *Limitation:* Lacks LLM AI span tracing (`gen_ai.conversation.id`, tool execution spans, token usage metadata), V8 CPU profiling, server metrics (`Sentry.metrics`), and release tracking.

2. **Feature Gate & Configuration Architecture:**
   * *Existing Gate (`/shared/gates/production.gate.ts`, lines 1-27):*
     ```typescript
     export const IS_DEV = false;
     ```
     *Limitation:* Feature flags are currently hardcoded boolean constants without dynamic evaluation, remote provider support, type-safe schema definitions, or client/server boundary separation.
   * *LLM Model Configuration (`/server/ai/LLMCommander.ts`, lines 16-19):*
     ```typescript
     const MAX_DRONES = 40;
     const MAX_LLM_TOKENS_PER_MATCH = 55000;
     const FLASH_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash"];
     ```
     *Limitation:* Model fallbacks, token limits, and AP regen rates are hardcoded in the server bundle rather than remotely manageable via feature flags.

3. **Client-Side Data vs Server Separation:**
   * *Offers (`/client/data/offers.json`, `/client/screens/store-screen.ts`, lines 1-30):*
     Store offers and promotional carousel elements are packaged into the client bundle, preventing dynamic operational rotations or targeted discounts without client redeployments.
   * *Feedback Collection (`/client/screens/main-menu.ts`, lines 1966-2009):*
     Feedback writes directly to Firestore (`collection(getFirestore(), "feedback")`) without integrating Sentry crash/session replay context, breadcrumbs, or device metadata.

4. **Secrets & Environment Injection via Doppler:**
   * *Server Doppler (`/server/doppler.ts`):* Reads `DOPPLER_TOKEN` and fetches secrets via `https://api.doppler.com/v3/configs/config/secrets/download?format=json`.
   * *Client Doppler (`/client/doppler.ts`):* Reads `VITE_DOPPLER_TOKEN` and fetches public/client secrets via `/api/doppler-client-secrets` or direct Doppler endpoint.

---

## 2. Core Architecture Blueprint

```
+---------------------------------------------------------------------------------------+
|                                    DOPPLER SECRETS                                    |
|   (Server: DOPPLER_TOKEN -> SENTRY_DSN, GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT)     |
|   (Client: VITE_DOPPLER_TOKEN -> VITE_SENTRY_DSN, VITE_SERVER_URL)                    |
+------------------------------------------+--------------------------------------------+
                                           |
                  +------------------------+------------------------+
                  |                                                 |
+-----------------v-----------------------+     +-------------------v-------------------+
|             SERVER ENVIRONMENT          |     |           CLIENT ENVIRONMENT          |
|              (Node.js / PM2)            |     |        (Three.js TSL / Mobile Web)    |
+-----------------------------------------+     +---------------------------------------+
| 1. OpenFeature Server SDK               |     | 1. OpenFeature Web SDK                |
|    - Doppler / In-Memory Provider       |     |    - Static / Replicated Provider     |
|    - Server Flag Evaluation Engine      |     |    - Client Flag Cache (Local Storage)|
|    - Context: RoomId, Faction, Region   |     |    - Context: UserId, Platform, Screen|
+-----------------------------------------+     +---------------------------------------+
| 2. Sentry Server Observability          |     | 2. Sentry Client Observability        |
|    - LLM Conversation & AI Spans        |     |    - WebGPU / Canvas Error Tracing    |
|    - Tool Execution Spans               |     |    - JS Self-Profiling Integration    |
|    - CPU Profiler (@sentry/profiling)   |     |    - User Feedback API & Replay Link  |
|    - Sentry Server Metrics (Tick, RTT)  |     |    - Client Metrics (FPS, Frame Time) |
+-----------------------------------------+     +---------------------------------------+
| 3. Authoritative Game & AI State        |     | 3. Client Presentation & UI           |
|    - Dynamic Model Fallbacks & AP Regen |     |    - Main Menu & In-Game HUD          |
|    - Store Offers & Faction Territory   |     |    - Custom Feedback Modal (DS Theme) |
|    - Socket.IO Flag State Replication   |     |    - Remote Store & Faction Renders   |
+-----------------------------------------+     +---------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Phase 0: OpenFeature Architecture & Feature Flag Registry

#### A. SDK Abstraction Layer
* Implement a shared OpenFeature architecture with distinct implementations for Server and Client:
  * Server: `@openfeature/server-sdk` with an in-memory fallback provider initialized with strongly-typed schemas and dynamic Doppler flag hydration.
  * Client: `@openfeature/web-sdk` with a static replicated provider that receives validated, client-safe evaluated flags from the server on handshake (`session_init` / `client_flags`) and updates them on runtime `flag_update` events.
* Provide strict TypeScript typing for all flags using an enumeration and interface contract in `/shared/feature-flags.ts`.

#### B. Flag Registry (`FEATURE_FLAGS.md`)
A dedicated documentation artifact `/FEATURE_FLAGS.md` will catalog every flag. The schema comprises:
1. `Flag Key`: Unique string identifier (e.g. `llm_primary_model`).
2. `Target Machine`: `SERVER`, `CLIENT`, or `SHARED`.
3. `Type`: `BOOLEAN`, `STRING`, `NUMBER`, or `OBJECT`.
4. `Default Value`: Safe fallback value.
5. `Guarded System / File`: Exact path of the file containing the evaluation gate.
6. `Purpose & Operational Trigger`: Detailed description of behavior change when toggled.

---

### 3.2 Phase 1: Sentry Observability Expansion

#### A. LLM Conversations & AI Spans (`/server/ai/LLMCommander.ts`)
* **Span Hierarchy:**
  * Root Transaction: `ai.commander.cycle` (8-second tick).
  * Child Span 1: `ai.input_synthesis` (Zone summaries, group health calculation, fog-of-war culling).
  * Child Span 2: `gen_ai.chat_completions` (The actual Gemini API invocation).
    * Semantic attributes:
      * `gen_ai.system`: `"google_genai"`
      * `gen_ai.request.model`: active model name (e.g. `"gemini-3.5-flash"`)
      * `gen_ai.response.model`: responding model name
      * `gen_ai.conversation.id`: `matchRoom.roomId`
      * `gen_ai.usage.prompt_tokens`: `usageMetadata.promptTokenCount`
      * `gen_ai.usage.completion_tokens`: `usageMetadata.candidatesTokenCount`
      * `gen_ai.usage.total_tokens`: `usageMetadata.totalTokenCount`
  * Child Span 3: `ai.tool_execution` (Iterating through validated tool calls: `spawn_units`, `move_group`, `merge_groups`, `split_group`, `hold_position`, `sustain`).
* **Fallback & Error Tracking:**
  * When a model throws 429/503/RESOURCE_EXHAUSTED, emit a Sentry warning with tag `llm.fallback_triggered: true`, recording original model, target fallback model, and latency overhead.
  * When match token budget (`MAX_LLM_TOKENS_PER_MATCH`) is reached, record a breadcrumb and increment `sentry.metrics.count("ai.token_ceiling_reached")`.

#### B. Releases & Environment Sync
* Extract version from `package.json` (`0.1.0`) combined with build hash/timestamp: `vexea@0.1.0+build.<timestamp>`.
* Set `release` and `environment` identically in both `client/sentry.ts` and `server/sentry.ts`.
* Inject Doppler environment tag (`dev`, `stg`, `prd`) into Sentry initialization.

#### C. Real-Time Engine Metrics (`Sentry.metrics`)
* **Server Metrics (`/server/sentry.ts`):**
  * `Sentry.metrics.distribution("server.tick_duration_ms", duration)`: Measures 60Hz physics and 20Hz network tick loop time.
  * `Sentry.metrics.gauge("server.active_drones", count)`: Tracks active simulated drone instances per match room.
  * `Sentry.metrics.gauge("server.connected_players", count)`: Tracks concurrent connected sockets.
  * `Sentry.metrics.distribution("server.llm_latency_ms", latency)`: Tracks Gemini API round-trip latency.
  * `Sentry.metrics.count("server.hitscan_rejected", 1)`: Counts rejected hitscan events failing backtrack validation (>200ms or velocity mismatch).
* **Client Metrics (`/client/sentry.ts`):**
  * `Sentry.metrics.distribution("client.frame_time_ms", frameDuration)`: Render loop duration.
  * `Sentry.metrics.gauge("client.draw_calls", count)`: Monitored draw calls to enforce the ≤15 draw call budget.
  * `Sentry.metrics.distribution("client.network_rtt_ms", ping)`: Client-to-server socket latency.
  * `Sentry.metrics.count("client.dead_reckoning_snaps", 1)`: Triggered when position divergence exceeds 0.5 units threshold.

#### D. Profiling Integration
* **Server:** Integrate `@sentry/profiling-node` using `nodeProfilingIntegration`. Sample rate controlled via OpenFeature flag `sentry_server_profile_sample_rate` (default 0.1 in production, 1.0 in development).
* **Client:** Configure `browserProfilingIntegration` with JS self-profiling, activated through `Document-Policy: js-profiling` headers and guarded by `sentry_client_profile_enabled`.

#### E. User Feedback Overhaul
* Replace the basic Firestore write with a dual-pipeline feedback system:
  1. Primary: `Sentry.captureFeedback()` including user message, rating (1-5 stars), user ID/email, active screen, and auto-linked Sentry Session Replay / error trace.
  2. Persistence Fallback: If Sentry is unavailable or offline, write to Firestore `feedback` collection as secondary storage.
* Retain the existing custom design system interface (no generic un-styled modals), maintaining strict mobile-first touch targets (≥44px buttons, zero horizontal overflow).

---

### 3.3 Phase 2: Remote Server-Controlled Data & Client Separation

#### A. Architectural Separation Principle
* **Server Authority:** The server owns game balance, matchmaking rules, loot tables, active store offers, faction territory balances, and LLM configuration.
* **Client Role:** The client is an unprivileged presentation and prediction layer. The client never evaluates server flags directly and has zero access to server secret keys.
* **Synchronization Channel:**
  1. On Socket.IO connection, server sends `server_configuration` payload containing client-relevant feature flags and game definitions.
  2. When server feature flags update, server broadcasts `config_update` event to active rooms/clients.

#### B. Server-Controlled Domains
1. **Store Offers (`/server/data/store-catalog.ts` & `/client/screens/store-screen.ts`):**
   * Server dictates active store rotation, discount percentages, and featured promo items.
   * Gated by flags: `store_enabled`, `store_featured_offer_id`, `store_credit_multiplier`.
2. **Faction Warfare (`/server/data/faction-state.ts` & `/client/screens/faction-screen.ts`):**
   * Server maintains authoritative territory percentages, victory multipliers, and event modifiers.
   * Gated by flags: `faction_war_active`, `faction_territory_decay_rate`, `faction_bonus_multiplier`.
3. **LLM Orchestrator Config (`/server/ai/LLMCommander.ts`):**
   * Remote model configuration:
     * `llm_primary_model` (e.g. `"gemini-3.5-flash"`)
     * `llm_fallback_models` (e.g. `["gemini-3.6-flash", "gemini-3.1-flash"]`)
     * `llm_cycle_seconds` (default: 8)
     * `llm_token_ceiling_per_match` (default: 55000)
     * `llm_ap_regen_rate` (default: 10)
4. **Match Difficulty & Game Modes (`/shared/gamemode-configs.ts`, `/server/MatchRoom.ts`):**
   * Flags for dynamic match tuning: `match_difficulty_preset`, `drone_max_speed_scale`, `drone_accuracy_modifier`, `player_respawn_delay_sec`.

---

### 3.4 Phase 3: Senior Engineering Observability & Failure Modes

As a senior game engine implementer, the following critical game-engine specific failure points must be instrumented in Sentry and gated by feature flags:

1. **WebGPU Device Loss & Pipeline Compilations:**
   * Capture `device.lost` events with reason (`destroyed`, `unknown`) and context (allocated buffers, active BatchedMesh count).
   * Track shader pre-warming latency during splash loading. Flag: `telemetry_webgpu_errors`.
2. **Physics Worker Synchronization & Desync Detection:**
   * Track postMessage transfer roundtrip time between main thread and Rapier WASM worker.
   * Flag: `telemetry_physics_worker_latency`.
3. **Anti-Cheat & Exploit Attempt Logging:**
   * Log high-confidence violations: Backtrack window violation (>200ms rewind), impossible movement speed (teleport hack), fire-rate leaky bucket overflow.
   * Captured as Sentry Security Events with player UID and IP hash. Flag: `security_exploit_logging`.
4. **Thermal Throttling & Resolution Step-Downs:**
   * Log dynamic resolution drops (1.0 -> 0.75 -> 0.5) triggered by frame time >20ms.
   * Flag: `telemetry_thermal_events`.

---

## 4. Feature Flag Matrix Summary

| Flag Key | Scope | Type | Default | Guarded File | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sentry_client_enabled` | Client | Boolean | `true` | `/client/sentry.ts` | Master switch for client Sentry initialization |
| `sentry_server_enabled` | Server | Boolean | `true` | `/server/sentry.ts` | Master switch for server Sentry initialization |
| `sentry_client_traces_rate` | Client | Number | `1.0` | `/client/sentry.ts` | Sample rate for client performance tracing |
| `sentry_server_traces_rate` | Server | Number | `1.0` | `/server/sentry.ts` | Sample rate for server performance tracing |
| `sentry_browser_profiling` | Client | Boolean | `true` | `/client/sentry.ts` | Toggles JS self-profiling integration in browser |
| `sentry_node_profiling` | Server | Boolean | `true` | `/server/sentry.ts` | Toggles V8 CPU profiling integration on server |
| `sentry_feedback_enabled` | Client | Boolean | `true` | `/client/screens/main-menu.ts` | Enables Sentry user feedback API on feedback submission |
| `sentry_llm_tracing` | Server | Boolean | `true` | `/server/ai/LLMCommander.ts` | Enables OpenTelemetry AI spans on Gemini calls |
| `sentry_metrics_enabled` | Shared | Boolean | `true` | `/client/sentry.ts`, `/server/sentry.ts` | Controls `Sentry.metrics` emission on client and server |
| `llm_primary_model` | Server | String | `"gemini-3.5-flash"` | `/server/ai/LLMCommander.ts` | Primary Gemini model ID for drone orchestration |
| `llm_fallback_models` | Server | Object | `["gemini-3.6-flash", "gemini-3.1-flash"]` | `/server/ai/LLMCommander.ts` | Ordered fallback model chain for rate-limit failovers |
| `llm_token_ceiling` | Server | Number | `55000` | `/server/ai/LLMCommander.ts` | Maximum token consumption per match before offline fallback |
| `llm_cycle_interval_sec` | Server | Number | `8` | `/server/ai/LLMCommander.ts` | Commander decision interval in seconds |
| `store_dynamic_offers` | Server | Boolean | `true` | `/server/MatchManager.ts`, `/client/screens/store-screen.ts` | Controls server-authoritative store offer delivery |
| `store_discount_active` | Server | Boolean | `false` | `/client/screens/store-screen.ts` | Global store promotional discount modifier |
| `faction_war_multiplier` | Server | Number | `1.0` | `/server/MatchRoom.ts`, `/client/screens/faction-screen.ts` | Credit/XP multiplier applied to active faction sector |
| `match_difficulty_preset` | Server | String | `"STANDARD"` | `/server/MatchRoom.ts`, `/shared/gamemode-configs.ts` | Dynamic difficulty tier scaling drone stats and counts |
| `telemetry_desync_threshold` | Client | Number | `0.5` | `/client/src/systems/NetworkSyncSystem.ts` | Position divergence distance triggering Sentry desync breadcrumb |

---

## 5. Doppler Secrets Contract

The following keys are managed in Doppler and resolved at startup:

| Doppler Key | Environment | Recipient | Usage |
| :--- | :--- | :--- | :--- |
| `SENTRY_DSN` | Server / Production | `/server/sentry.ts` | Ingestion endpoint for server errors, metrics, AI spans, and CPU profiling |
| `VITE_SENTRY_DSN` | Client / Production | `/client/sentry.ts` | Ingestion endpoint for client errors, feedback, and browser profiling |
| `GEMINI_API_KEY` | Server / Production | `/server/ai/LLMCommander.ts` | API authentication for Google Gen AI SDK |
| `FIREBASE_SERVICE_ACCOUNT` | Server / Production | `/server/index.ts` | Admin credentials for authoritative server-side Firestore operations |
| `VITE_SERVER_URL` | Client / Production | `/client/doppler.ts` | Authoritative server WebSocket/HTTP address |
| `DOPPLER_TOKEN` | Server / Container | `/server/doppler.ts` | Doppler service token for server secrets download |
| `VITE_DOPPLER_TOKEN` | Client / Container | `/client/doppler.ts` | Client token for Doppler public configuration retrieval |

---

## 6. Execution Roadmap (From A to Z)

### Milestone A: OpenFeature Infrastructure & Feature Flag Catalog
1. Create `/shared/feature-flags.ts`: Type contracts, enum keys, and schema definitions.
2. Create `/server/flags/flag-service.ts`: Server-side OpenFeature engine with Doppler integration and in-memory defaults.
3. Create `/client/flags/flag-service.ts`: Client-side OpenFeature client with server replication.
4. Create `/FEATURE_FLAGS.md`: Full catalog of every feature flag, data type, guarded file, and operational responsibility.

### Milestone B: Sentry Observability Modernization
1. Update `/server/sentry.ts`:
   * Add `@sentry/profiling-node` integration (`nodeProfilingIntegration`).
   * Add `Sentry.metrics` emission helpers.
   * Add release synchronization and Doppler DSN hydration.
2. Update `/server/ai/LLMCommander.ts`:
   * Wrap Gemini API invocations with OpenTelemetry-compliant AI spans (`gen_ai.chat_completions`, `ai.tool_execution`).
   * Add token usage recording, rate-limit fallback metrics, and conversation ID tags.
3. Update `/client/sentry.ts`:
   * Add `browserProfilingIntegration` with JS self-profiling.
   * Add `Sentry.metrics` client-side aggregation.
   * Add `captureFeedback` helper with Session Replay / breadcrumb attachment.
4. Update `/client/screens/main-menu.ts`:
   * Connect feedback submission button to `captureFeedback` with fallback to Firestore.

### Milestone C: Server-Controlled Remote Data & Socket Synchronization
1. Create `/server/data/store-service.ts`: Authoritative store offers and dynamic bundle management.
2. Create `/server/data/faction-service.ts`: Authoritative sector control and faction battle stats.
3. Update `/server/index.ts` & `/server/transport/adapter.ts`:
   * Expose server configuration and client-safe flag replication upon socket connection (`session_init`).
   * Provide endpoint `/api/config` for HTTP bootstrapping.
4. Update `/client/screens/store-screen.ts` & `/client/screens/faction-screen.ts`:
   * Consume server-authoritative store offers and faction balances rather than local static JSON files.

### Milestone D: Verification, Zero-Allocation Validation & Lint Gates
1. Run `lint_applet` to ensure type cleanliness, zero syntax errors, and standard ESM imports.
2. Audit all tick and render loops (`/client/src/systems/*`, `/server/MatchRoom.ts`) to ensure zero `new`, `{}`, `[]`, or string allocations occur inside 60Hz/20Hz loops.
3. Run `compile_applet` to prove clean production build without bundle bloat.
4. Update `/CODEBASE_INDEX.md` with all new and modified modules according to audit protocol.

---

## 7. Mathematical & Anti-Eyeballing Verification

All visual interface additions (such as the updated feedback modal or store offer widgets) adhere strictly to:
* Viewport-relative math (`clamp()`, `vw`, `vh`, `cqi`).
* Minimum 44px mobile touch targets (`padding: 12px 24px`, `min-height: 44px`).
* Contrast ratios exceeding WCAG AA standards (≥4.5:1 for body text, ≥3.0:1 for large headers).
* Zero text wrapping inside pills, buttons, and badges (`white-space: nowrap`).
* Strict nesting radius formula: `R_inner = R_outer - Padding`.
