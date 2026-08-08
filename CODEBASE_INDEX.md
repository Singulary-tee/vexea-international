# VEXEA Codebase Index

This file is the authoritative index of all directories and source files within the VEXEA multiplayer FPS engine. It provides exact descriptions of what each file contains and exports, serving as a strict audit gate. Every single codebase modification must be registered in this index first and last to ensure complete alignment and prevent random modifications.

---

## 1. Directory Structure and Module Index

### 1.1 Server Space (`/server`)

*   **`MatchManager.ts`**
    *   *Purpose:* Orchestrates the lifecycle of all active matches.
    *   *Key Functions/Exports:* `MatchManager` class (exported as default and as `matchManager` instance), `getOrCreateRoom(roomId, geminiKey, mapId)` (returns or provisions rooms), `findMatchmakingRoom(geminiKey)` (allocates players to empty rooms under 10 players), `deleteRoom(roomId)` (initiates cleanup), `getRooms()` and `getRoomCount()`.
*   **`Matchmaker.ts`**
    *   *Purpose:* Real player pooling system for matchmaking. Groups players into matches without bot-fill.
    *   *Key Functions/Exports:* `Matchmaker` class, `matchmaker` default/named export instance, `MATCHMAKER_MAX_WAIT_SECONDS` (45s constant), `addPlayerToPool`, `removePlayerFromPool`, `signalPlayerLoadingComplete`, `handlePlayerClassChange`.
*   **`MatchRoom.ts`**
    *   *Purpose:* The complete server-side simulation environment. Manages the 60Hz physics update loop, 20Hz state-synchronization packets, autonomous AI events, and per-match token budget tracking (`llmTokensUsedThisMatch`).
    *   *Key Functions/Exports:* `MatchRoom` class, handles player join/leave, bot integration, collision handling, hitscan/rewind raycasting, objective point timers, score accounting, and shutdown processing.
*   **`doppler.ts`**
    *   *Purpose:* Server Doppler secrets manager. Integrates with Doppler REST API to load production environment secrets (`FIREBASE_SERVICE_ACCOUNT`, `SENTRY_DSN`) into `process.env`.
    *   *Key Functions/Exports:* `loadDopplerSecrets()`, `getFirebaseServiceAccount()`.
*   **`index.ts`**
    *   *Purpose:* Primary server entry point. Configures the Express server, initializes WASM physics modules, binds HTTP and Socket.IO ports, hosts developer API endpoints, handles network reconnect tolerances, and serves static files.
*   **`sentry.ts`**
    *   *Purpose:* Server-side Sentry initialization, error tracking, and metrics recording (latency, active units, player counts, security exploits).
    *   *Key Functions/Exports:* `initSentry()`, `recordServerTickDuration(ms)`, `recordServerActiveDrones(count)`, `recordServerConnectedPlayers(count)`, `recordLLMLatency(ms, model)`, `recordHitscanRejected(reason)`, `recordSecurityExploit(exploitType, extra)`.
*   **`flags/` (Server Feature Flags)**
    *   **`server-flags.ts`**: Defines server-only feature flag keys (`ServerFeatureFlagKey`), schema (`ServerFeatureFlagSchema`), and default values (`DEFAULT_SERVER_FEATURE_FLAGS`) for Sentry server telemetry, LLM Commander family/model parameters, and security logging.
    *   **`flag-service.ts`**: Resolves server-side feature flags via ConfigCat / OpenFeature server SDK with local fallbacks. Restricted to server and shared flag keys.
*   **`ai/` (Strategic AI)**
    *   **`CommanderMemory.ts`**: Modular Zero-GC match-state context compression engine for the LLM Commander. Formulates tight (<250 token) situational awareness strings containing match clock, squad composition, drone asset ledger, casualty delta, utility log, objective state, and clean zone summaries.
    *   **`DroneAvoidance.ts`**: Manages dynamic path avoidance and separation steering behaviors for autonomous drone swarms.
    *   **`DroneIntelligence.ts`**: Governs spatial awareness for individual drones. Computes sight lines (3D orientation quaternions to check forward vectors and cone of vision angles), performs static map and dynamic Rapier line-of-sight raycasts, and handles memory decay mechanics.
    *   **`DroneMemory.ts`**: Tracks historical sighting positions, target last-seen timestamps, and spatial memory decay for drones.
    *   **`DronePerception.ts`**: Evaluates line-of-sight, raycasting, and sensory awareness updates for AI agents.
    *   **`LLMCommander.ts`**: High-level strategic controller refactored to be provider-agnostic via `CommanderAdapter`. Formulates formatted prompt strings, delegates execution to provider adapters, manages strategic AP resource pools, and enforces token budget ceilings.
    *   **`LLMCommanderFeedback.ts`**: Processes post-command evaluation, reinforcement feedback, and action success telemetry for the LLM Commander.
    *   **`strategy/` (LLM Strategy Brief Store)**
        *   **`StrategyBriefStore.ts`**: Persistence module (`StrategyBriefStore`, `StrategyBriefDoc`) managing map-scoped dynamic strategic briefs stored at `StrategyBriefs/{mapId}` in Firestore with default skeleton provisioning and token cap enforcement.
    *   **`adapters/` (LLM Commander Provider Adapters)**
        *   **`CommanderAdapter.ts`**: Core adapter interface (`CommanderAdapter`), tool normalization structures (`CommanderTool`, `NormalizedToolCall`), and token usage types (`TokenUsage`).
        *   **`GeminiAdapter.ts`**: Adapter for Gemini models via `@google/genai` with fallback model support and tool format translation.
        *   **`KimiAdapter.ts`**: Adapter for Kimi (Moonshot API) via OpenAI SDK with custom endpoint configuration and tool parsing.
        *   **`ClaudeAdapter.ts`**: Adapter for Anthropic Claude models via `@anthropic-ai/sdk` using flat `input_schema` tool definitions.
        *   **`OpenAIAdapter.ts`**: Adapter for OpenAI models via `openai` package with tool call parsing and token usage normalization.
        *   **`AdapterFactory.ts`**: Factory class (`AdapterFactory`) instantiating the appropriate provider adapter based on the `LLM_COMMANDER_FAMILY` feature flag.
*   **`data/` (Server Data Services)**
    *   **`economy-service.ts`**: Manages player currency balances, credit transactions, and store purchases on the server side.
*   **`gates/` (Server Gates)**
    *   **`verification.gate.ts`**: Encapsulates server-authoritative purchase, reward, and match state verification checks via `ServerVerificationGate`.
*   **`map/` (Spatial Structure)**
    *   **`OutOfBoundsEnforcer.ts`**: Detects and enforces spatial map boundaries, pushing or damaging entities that venture outside valid playable zones.
    *   **`ZoneRegistry.ts`**: Maps geometric boundaries to specific Named Zones (e.g., Core, Warehouse, Bridge), handles player zone occupancy queries, and stores localized waypoint indices.
*   **`physics/` (Server Simulation)**
    *   **`PhysicsWorldManager.ts`**: Direct integration with the `@dimforge/rapier3d-node` engine. Builds rigid bodies, defines player/drone collision geometry bounds, and runs stepped simulation updates.
*   **`player-data/` (Match & Player Telemetry)**
    *   **`BriefingRenderer.ts`**: Pure renderer converting player game profiles (`PlayerGameProfile`) into max 3-sentence tactical intelligence briefings for the LLM Commander.
    *   **`MatchEventCollector.ts`**: Collects match end telemetry data (`archiveMatchEvent`) and writes fire-and-forget archive documents (`MatchArchiveDoc`) to the `"MatchArchives"` Firestore collection with win/loss TTL retention dates.
    *   **`PlayerProfileStore.ts`**: Builds and updates aggregate per-player behavioral profiles (`PlayerGameProfile`) at `Users/{uid}/gameProfile/v1` from match telemetry results, tracking running averages, class selection breakdowns, preferred role, and recent match histories.
*   **`test-scenarios/` (Headless Diagnostic Scripts)**
    *   **`memory-decay-verification.ts`**: Confirms confidence decay scaling under dt variations.
    *   **`movement-test.ts`**: Verifies pathing trajectories across multiple nodes.
    *   **`perception-baseline.ts`**: Evaluates cone-of-vision accuracy limits.
    *   **`run_all_diagnostics.ts`**: Main CLI coordinator for headless performance checks.
    *   **`run_avoidance_test.ts`**: Verifies dynamic pathing adjustment when friendly drone clusters collide.
*   **`transport/` (Server Connectivity)**
    *   **`adapter.ts`**: Defines the unified `ChannelAdapter` and `ServerTransport` interface layer. Implements the `SocketIOServerAdapter`/`SocketIOChannelAdapter` (the active transport, utilizing JSON events and number-array binary emulations) and `GeckosAdapter`/`GeckosChannelAdapter` (inactive/experimental).
*   **`validation/` (Validation Service Wrapper)**
    *   **`validation-service.ts`**: Backwards-compatibility alias re-exporting `VerificationService`.
*   **`verification/` (Server & Worker Verification)**
    *   **`verification-service.ts`**: Server and worker verification handler processing post-match results (`processMatchResults`), store purchases (`processPurchase`), and claim checks (`processClaim`).

---

### 1.2 Shared Space (`/shared`)

*   **`asset-structure.ts`**
    *   *Purpose:* Comprehensive metadata registry (`ASSET_STRUCTURE`) cataloging GLB node hierarchies, bounding boxes, animation sequences, skin joints, and mesh details for all 3D assets (Player, Humanoid, Bomber, Recon, Rotary Shooter, Fixed Wing, Wheeled Drone).
*   **`classes.ts`**
    *   *Purpose:* Operative class definitions (`CLASSES`: Assault, Medic, Recon, Demolitions) and primary/secondary/utility slot mappings.
*   **`collision.ts`**
    *   *Purpose:* Zero-allocation AABB collision system.
    *   *Key Functions/Exports:* `CollisionSystem` class, `globalCollisionSystem` instance, `loadFromSpec(specJson)` (parses building layouts into active boxes), `rayIntersectsAABB` and `rayIntersectsAny` (highly efficient hitscan calculations for projectiles and sight lines).
*   **`constants.ts`**
    *   *Purpose:* Absolute single source of truth for game variables, network sizes, and entity shapes.
    *   *Key Functions/Exports:* `ZONES` registry, `WAYPOINTS` center-points, `TOPOLOGY` adjacency graph, `ZONE_BOUNDS` half-sizes, `DroneState` enum, `DroneType` enum, limits (`PLAYER_MAX_HP`, `CAMERA_MAX_HP`), and the `DRONE_CONFIGS` dictionary containing comprehensive visual, physical, and behavioral parameters per drone type.
*   **`feature-flags.ts`**
    *   *Purpose:* Shared feature flag definitions (`SharedFeatureFlagKey`), `SharedFeatureFlagSchema`, `DEFAULT_SHARED_FEATURE_FLAGS`, `FeatureFlagScope` enum, and `getFeatureFlagScope(key)` helper. Contains strictly flags required by both client and server domains (store dynamic offers, faction war, battle pass parameters, difficulty presets, desync threshold, flags used enabled).
*   **`battle-pass.ts`**
    *   *Purpose:* Shared contracts for the Battle Pass system, including tier structures, reward types (Credits/Cosmetic), and seasonal generation logic (Phase 1).
*   **`gamemode-configs.ts`**
    *   *Purpose:* Governs rulesets, friendly fire options, victory requirements, score scaling, and timer labels.
    *   *Key Functions/Exports:* `GameModeConfig` interface, `GAMEMODES` registry, and the active `ACTIVE_GAMEMODE` constant.
*   **`gate.ts`**
    *   *Purpose:* Gating system designed to separate development-only interfaces and network backdoors from production.
    *   *Key Functions/Exports:* `IS_DEV` environment check, `assertDev(featureName)` (denies execution in production environments).
*   **`transport.config.ts`**
    *   *Purpose:* Static transport router configuration.
    *   *Key Functions/Exports:* `TRANSPORT_MODE` constant (hardcoded to `'socketio'`).
*   **`utilities.ts`**
    *   *Purpose:* Field utility definitions (`UTILITIES`: Grenade, Flashbang, Med Kit, Revive Tool, Radio, Signal Disruptor, EMP, C4), cooldown constants, charge limits, and utility state creation helpers (`createInitialUtilityState`).
*   **`weapons.ts`**
    *   *Purpose:* Stores performance matrices, damage variables, and recoil metrics.
    *   *Key Functions/Exports:* `WeaponPerformance` and `DamageFalloff` definitions, `DETAILED_WEAPONS` dictionary (containing Rifle and Pistol metrics), and `calculateDamageWithFalloff(baseDamage, distance, falloff)` (determines actual hit intensity).
*   **`gates/` (Shared Environment & Content Gates)**
    *   **`production.gate.ts`**: Master environment check (`IS_DEV`) and security assertion function (`assertDev`).
    *   **`validator.gate.ts`**: Input format sanitization and content gate (`ValidatorGate`) validating emails, passwords, codenames, chat messages, and numerical values against XSS injection and profanity.
*   **`maps/` (Spatial Layout JSONs)**
    *   **`map-registry.ts`**: Combines static facility models and inventory registries.
    *   **`map_1_facility.spec.json`**: Structure blueprints (positions, sizes, building heights) of the Facility level.
    *   **`map_1_inventory.json`**: Static placement points for terminal objectives, security cameras, and spawn nodes.
*   **`validation/` (Shared Validation Aliases)**
    *   **`types.ts`**: Re-export alias mapping to verification types.
    *   **`validator.ts`**: Re-export alias mapping to verification logic.
*   **`verification/` (Shared Verification Contracts & Logic)**
    *   **`types.ts`**: Interface contracts for post-match verification (`VerifyPostMatchInput`/`Result`), purchases (`VerifyPurchaseInput`/`Result`), claims (`VerifyClaimInput`/`Result`), level metrics, and catalog items.
    *   **`verifier.ts`**: Pure verification routines auditing post-match rewards (`verifyPostMatchRewards`), store purchases (`verifyPurchase`), claim cooldowns (`verifyClaim`), and level progress metrics (`calculateLevelMetrics`).

---

### 1.3 Client Space (`/client`)

*   **`MatchController.ts`**
    *   *Purpose:* Transitory session controller created upon entering matches and destroyed on termination. Isolates state variables to prevent memory leaks.
    *   *Key Functions/Exports:* `MatchController` class, manages sub-system state machines (minimap, network sync, input processing, visuals, UI, and audio) and tracks player properties (HP, score, ground states, camera recoil, ADS lerp, and ring buffers of drone updates).
*   **`StudioCharacterPreview.ts`**
    *   *Purpose:* Developer overlay controls for adjusting 3D character preview positioning, rotation presets, lighting, and scenic weapon grip pose alignment.
*   **`StudioPreviewManager.ts`**
    *   *Purpose:* Global 3D studio scene manager orchestrating background 3D character and weapon model rendering across menu views (Main Menu, Armory, Store, Lobby).
*   **`asset-cache.ts`**
    *   *Purpose:* Facilitates GLB model and sound file caching, Cloudflare R2 bucket mappings, and preloading routines.
*   **`audio.ts`**
    *   *Purpose:* Handles spatial sound positioning and 2D UI audio playback.
*   **`design-system.ts`**
    *   *Purpose:* Governs UI rendering themes, color palettes, typography specs (Exo 2, Rajdhani, Barlow Condensed), and CSS constants.
*   **`dev_menu.ts`**
    *   *Purpose:* Dev UI for spawning assets, switching maps, and toggling invulnerability.
*   **`dev_visual_diagnosis.ts`**
    *   *Purpose:* Visual overlays rendering raw lines for wireframe colliders, raycast tracks, and velocity vectors.
*   **`doppler.ts`**
    *   *Purpose:* Client-side Doppler integration fetching production secrets (`VITE_SENTRY_DSN`, `VITE_SERVER_URL`) via API/proxy.
    *   *Key Functions/Exports:* `loadClientDopplerSecrets()`, `getClientDopplerSecret()`, `getClientServerUrl()`.
*   **`drone_models.ts`**
    *   *Purpose:* Resolves asset configurations and custom procedural materials for drone glTF structures.
*   **`firebase.ts`**
    *   *Purpose:* Client-side Firebase Authentication, Firestore initialization, Realtime Database (`rtdb`) export, and anonymous account linking helpers (`linkAnonymousAccount`, `signInWithLinkedAccount`).
*   **`hitscan.ts`**
    *   *Purpose:* Standard 3D raycaster implementation for targeting and crosshair alignment.
*   **`hud_snippets.ts`**
    *   *Purpose:* Backup holder for preserved HUD UI snippets (e.g. original top-left squad character avatars).
*   **`hud_template.ts`**
    *   *Purpose:* HTML structures dynamically appended to structure the overlay UI.
*   **`index.css`**
    *   *Purpose:* Central Tailwind loading point, scrollbar suppression rules, font imports, and keyframe animations.
*   **`index.html`**
    *   *Purpose:* Mounts the canvas structure, loads Google Fonts (Exo 2, Rajdhani, Orbitron, Titillium Web), and references `/client/main.ts`.
*   **`input.ts`**
    *   *Purpose:* Captures mouse clicks, screen touch joystick inputs, and key bindings.
*   **`main.ts`**
    *   *Purpose:* Initializer and state coordinator. Preloads screens, instantiates Three.js stages (WebGPU pipeline), and handles connection clicks and socket events (`MATCHMAKING_STATUS`, `MATCH_FOUND`, `PRE_MATCH_COUNTDOWN`).
*   **`map_editor.ts`**
    *   *Purpose:* Level-building sandbox interface.
*   **`physics.worker.ts`**
    *   *Purpose:* Web worker script for client physics predictions.
*   **`platform-gate.ts`**
    *   *Purpose:* Centralizes platform detection (mobile vs. desktop) at initialization. Responsible for gating UI elements, applying platform-specific CSS classes, and managing device-specific default settings.
*   **`sentry.ts`**
    *   *Purpose:* Client-side Sentry initialization, error tracking, and performance metrics (frame time, draw calls, network RTT).
    *   *Key Functions/Exports:* `initClientSentry()`, `recordClientFrameTime(ms)`, `recordClientDrawCalls(count)`, `recordClientNetworkRTT(ms)`, `recordDeadReckoningSnap()`.
*   **`flags/` (Client Feature Flags)**
    *   **`client-flags.ts`**: Defines client-only feature flag keys (`ClientFeatureFlagKey`), schema (`ClientFeatureFlagSchema`), and default values (`DEFAULT_CLIENT_FEATURE_FLAGS`) for client Sentry telemetry, browser profiling, feedback widget, WebGPU error telemetry, and physics worker latency.
    *   **`flag-service.ts`**: Manages client-side feature flags via ConfigCat / OpenFeature Web SDK with local fallbacks. Restricted to client and shared flag keys.
*   **`settings.ts`**
    *   *Purpose:* Volume levels, mouse sensitivity configurations, and dynamic resolution scaling toggles.
*   **`social.ts`**
    *   *Purpose:* Client social module managing Firestore friends graph (`sendFriendRequest`, `respondToFriendRequest`, `getFriendsList`), display name claims and lookups (`claimDisplayName`, `resolveDisplayName`), lobby invites (`sendLobbyInvite`, `getLobbyInvites`), and RTDB presence tracking (`initPresence`).
*   **`state.ts`**
    *   *Purpose:* Local state machine tracking lobby choices, user credentials, and connection status.
*   **`test_measure.ts`**
    *   *Purpose:* Renders diagnostics and framing metrics overlays.
*   **`ui_editor.ts`**
    *   *Purpose:* Panel positioning system for custom HUD configurations.
*   **`public/` (Engine Assets & Decoders)**
    *   **`basis/`**: WebAssembly transcoder modules for Basis Universal texture compression.
    *   **`draco/`**: WebAssembly decoder modules for Draco geometric mesh compression.
    *   **`inverted_plus.svg`**: Specialized crosshair asset.
*   **`weapons_model.ts`**
    *   *Purpose:* Handles first-person weapon meshes, reload animations, and procedural recoil offsets.
*   **`data/` (JSON Data Registries)**
    *   **`catalog.json`**: Store catalog items, cosmetics, blueprints, pricing, and level requirements.
    *   **`challenges.json`**: Daily and weekly operational challenge definitions, targets, and rewards.
    *   **`offers.json`**: Store special promotions, featured bundles, and limited-time offer parameters.
*   **`gates/` (Client Environment & Screen Gates)**
    *   **`platform.gate.ts`**: Mobile vs desktop device detector (`IS_MOBILE`, `IS_DESKTOP`, `initPlatformGate`) applying platform CSS classes to `document.body`.
    *   **`screen.gate.ts`**: Centralized screen lock manager (`ScreenGate`) enforcing rotation overlay locks, loading locks, splash locks, UI editor locks, and gameplay input suppression.
*   **`screens/` (Client View Screens)**
    *   **`armory-screen.ts`**: Weapon loadout customization, attachment selection, weapon skin selection, and 3D preview.
    *   **`battle-pass-screen.ts`**: UI system for Battle Pass progression, featuring a high-contrast industrial theme, tier reward claiming, and real-time XP tracking.
    *   **`dev-entities.ts`**: Developer entity inspector for spawning, tracking, and debugging live match entities.
    *   **`dev-map-editor.ts`**: Level editor interface for placing and editing map colliders, spawn nodes, and zone volumes.
    *   **`faction-screen.ts`**: Faction/INTEL screen displaying operative lore, faction data, contractor dossiers, and intelligence updates.
    *   **`lobby.ts`**: Pre-match staging screen handling class selection, ready toggling, friend invites, and game mode info.
    *   **`main-menu.ts`**: Central navigation dashboard containing top bar, user profile, nav links, and action cards (PLAY, UPDATES, INTEL, LOADOUT, FACTION, STORE, CHALLENGES).
    *   **`map_viewer.ts`**: Interactive 3D map viewer for inspecting level architecture and capture zones.
    *   **`matchmaking-overlay.ts`**: Matchmaking waiting overlay box with pre-match countdown display and cancel option.
    *   **`post-match-screen.ts`**: After-action report screen displaying victory/defeat state, earned XP, credits, kills/deaths, and level progression.
    *   **`screen-manager.ts`**: Screen navigation manager controlling view transitions, active screen lifecycles, and DOM rendering.
    *   **`splash.ts`**: Initial splash screen handling game branding, asset preloading, and system initialization.
    *   **`stats-screen.ts`**: Player statistics dashboard showing career performance metrics, kill/death ratios, and match history.
    *   **`store-screen.ts`**: In-game store screen for purchasing cosmetics, blueprints, and currency refills.
*   **`transport/` (Client Connectivity)**
    *   **`adapter.ts`**: Client-side transport. Implements `SocketIOClientAdapter` and `GeckosClientAdapter` wrappers.
*   **`src/` (Client Subsystems & FX)**
    *   **`camera/`**
        *   **`CameraEffects.ts`**: Computes dynamic camera head bobbing, weapon follow lag, landing jolts, bank tilting, and viewmodel pullback.
        *   **`constants.ts`**: Tuning constants for camera movement, sway, recoil response, and head-bob dynamics.
    *   **`input/`**
        *   **`InputSynchronizer.ts`**: Structures the 20-byte input payload buffer containing sequential numbers, yaw/pitch floats, action codes, and bitmasks to send at monitor refresh speeds.
    *   **`map/`**
        *   **`LoadingOrchestrator.ts`**: Monitors asset load states and handles panoramic 6-directional prewarming.
        *   **`MapLoader.ts`**: Spawns structural walls and facility bounds.
    *   **`settings/`**
        *   **`state.ts`**: Manages reactive state stores for user settings, preferences, and audio/graphics configurations.
        *   **`types.ts`**: TypeScript interface definitions and configuration types for the settings subsystem.
        *   **`ui.ts`**: Renders the settings UI panel, sliders, toggles, and configuration menus.
    *   **`systems/`**
        *   **`ChatHUDSystem.ts`**: Manages in-match text chat overlay, message formatting, input locking, and sanitization.
        *   **`ClassLoadoutPersistence.ts`**: Handles caching and synchronization of player class loadout selections with persistent storage.
        *   **`ClassLoadoutSystem.ts`**: Centralized weapon configuration, custom procedural skin application, model centering, character attachment, and LocalStorage + Firebase persistence.
        *   **`CombatSystem.ts`**: Local visual hit detection, impact spark spawning, ammunition state tracking, and local weapon animations.
        *   **`CompassSystem.ts`**: Zero-allocation horizontal compass tape rendering cardinal directions, degree ticks, and active landmark indicators.
        *   **`DiagnosisSystem.ts`**: Interactive debug box rendering, rendering coordinates, ping monitors, and tick metrics.
        *   **`DroneProcedural.ts`**: Drives local visual loops like rotor spins, wheel rolling, hover bob, and yaw/pitch tracking of turrets.
        *   **`DroneSystem.ts`**: Manages local models, instancing, and material updates for active drones.
        *   **`DynamicResolutionSystem.ts`**: Automatic pixel ratio scaling subsystem maintaining frame rates within performance budgets.
        *   **`HUDSystem.ts`**: Injects real-time status telemetry into the HTML HUD (HP, Ammo, score, countdown timer, and active hold progress).
        *   **`InputSystem.ts`**: Processes inputs, sets rotation values, and triggers the `InputSynchronizer` stream.
        *   **`LLMObjectiveSystem.ts`**: Handles interaction with the rogue LLM Core objective terminal in zone_core (384, 384), proximity detection, hold keybind / mobile pop-up button, progress timer, and server event streaming.
        *   **`MinimapSystem.ts`**: Manages the 2D visual radar map tracking captured zone boundaries and detected targets.
        *   **`NetworkSyncSystem.ts`**: Unpacks global binary server payloads, interpolates remote entities, and tracks historic rewinds.
        *   **`RadialCommSystem.ts`**: Controls the tactile radial quick-communication wheel and radio callout broadcasts during gameplay.
        *   **`ReconnectionSystem.ts`**: Manages reconnect routines.
        *   **`SimulationSystem.ts`**: Implements predictive movement loops.
        *   **`VisualsSystem.ts`**: Handles camera field-of-view zooms, visual sway patterns, and active recoil transitions.
    *   **`ui/`**
        *   **`LoadingScreen.ts`**: Renders structural loading indicators.
        *   **`PanZoomSurface.ts`**: Interactive map controller support.
    *   **`vfx/` (Visual Effects)**
        *   **`VFXOrchestrator.ts`**: Controls pooled particle effects, sparks, and impact dust.
        *   **`constants.ts`**: Constants for particle sizes and decays.
        *   **`firing.ts`**: Controls muzzle flashes and glowing tracers.
        *   **`hits.ts`**: Controls impact sparks and splatter visuals.
        *   **`large.ts`**: Controls explosion particle rings and fireballs.
*   **`weapons/` (Weapons Systems)**
    *   **`AttachmentSystem.ts`**: Preloads optic attachment models (Holosight, ACOG, ATACR) and manages scope attachment/detachment onto weapon meshes.
    *   **`GripSystem.ts`**: Zero-allocation procedural right/left hand grip pose calculations and matrix-based weapon snapping for characters.

---

### 1.4 Root & Configuration Space (`/`)

*   **`package.json` & `package-lock.json`**
    *   *Purpose:* Node project configuration, script definitions (`dev`, `build`), dependencies (`three`, `socket.io`, `@google/genai`, `firebase`), and locked lockfile.
*   **`tsconfig.json`**
    *   *Purpose:* TypeScript compiler choices, module resolution rules, and target specs.
*   **`vite.config.ts`**
    *   *Purpose:* Vite server configuration, port binding (3000), static path aliases, and build output targets.
*   **`vitest.config.ts`**
    *   *Purpose:* Configuration for the Vitest test runner, defining environment setup, globals, and coverage reporting.
*   **`metadata.json`**
    *   *Purpose:* AI Studio application metadata cataloging app name ("VEXEΛ"), description, frame permissions, and major capabilities.
*   **`firestore.rules` & `database.rules.json`**
    *   *Purpose:* Security rules for Firestore collections (`Users`, `usernames`, `lobbyInvites`) and Firebase Realtime Database (`presence`).
*   **`firebase.json` & `firebase-blueprint.json` & `firebase-applet-config.json` & `.firebaserc`**
    *   *Purpose:* Firebase project configuration, database blueprint schema, applet credentials, and deployment settings.
*   **`.env.example`**
    *   *Purpose:* Template environment variable declarations for server and client deployment.
*   **`assets_tracker.json` & `assets_tracker.md`**
    *   *Purpose:* Asset budget log and local GLB model tracking inventory.
*   **`r2_assets_tracker.json` & `r2_assets_tracker.md`**
    *   *Purpose:* Cloudflare R2 bucket asset inventory and URL mapping manifest for background card graphics.
*   **`hud_layout.json`**
    *   *Purpose:* Custom HUD element layout coordinates, scale factors, and visibility toggles.
*   **`FEATURE_FLAGS.md`**
    *   *Purpose:* Registry of all feature flags, documenting evaluation strategies (ConfigCat), data types, and operational impacts.
*   **`Gemini_HUD_Calculator.md`**
    *   *Purpose:* Mathematical specification and audit record for the HUD Editor, enforcing strict sizing protocols and viewport-relative scaling proofs.
*   **`OPTIMIZATION_PLAN.md`**
    *   *Purpose:* System performance audit and optimization roadmap focusing on zero-GC goals and pre-allocation strategies.
*   **`VEXEA — Project Status 394cb9a2be0b81a18b47c4bb300cad49.md`**
    *   *Purpose:* External project status tracking and milestone log (Read-only reference).
*   **`.github/workflows/` (CI/CD Automations)**
    *   **`configcat-scan.yml`**: CI scan for feature flag consistency.
    *   **`deploy.yml`**: Master pipeline handling testing, coverage reporting via Codecov, and Firebase deployment.
*   **`.gitignore` & `.gitattributes`**
    *   *Purpose:* Version control patterns and attribute configurations.
*   **`scripts/` (Build & Maintenance Utility Scripts)**
    *   **`sync-configcat.ts`**: Synchronizes feature flag keys and metadata with ConfigCat REST API.
*   **`parse_glbs.cjs` & `tick_success_box.sh`**
    *   *Purpose:* CLI node script for inspecting GLB node trees and automated shell verification helper.
*   **Architectural Specifications & Project Documents:**
    *   **`AGENTS.md`**: Master agent instructions, user rules, and core project skill references.
    *   **`ARCHITECTURE.md`**: Single-source locked architecture document defining stack, security, zero-GC server pipeline, and LLM commander specifications.
    *   **`CODEBASE_INDEX.md`**: Authoritative index of all directories and source files across the codebase (this document).
    *   **`GAMEMODE_CONFIG.md`**: Rulesets, scoring parameters, and duration specs for game modes.
    *   **`GAMEPLAY.md`**: Game design, movement mechanics, weapon stats, and utility abilities.
    *   **`IMPLEMENTATION_PLAN.md`**: Development roadmap, task checklists, and implementation state.
    *   **`NETWORKING_AUDIT.md`**: Socket.IO transport audit log, payload schemas, and byte offset layouts.
    *   **`PRE_MATCH_OPTIMIZATION_PLAN.md`**: Performance pre-warming and scene loading optimization strategy.
    *   **`WORKSPACE_HYGIENE.md`**: Project cleanliness rules and file organization standards.
    *   **`gemini_wall_of_shame.md`**: Log of identified anti-patterns and prohibited code idioms.

---

### 1.5 UI Assets (`/ui_svgs`)

*   **`ui_svgs/`**
    *   *Purpose:* Collection of production-ready SVG icons for the HUD and menu interfaces (aim, reload, sprint, medkit, weapons, etc.).

---

### 1.6 Test Suite (`/tests`)

*   **`tests/`**
    *   *Purpose:* Comprehensive suite of unit and integration tests using Vitest. Covers `MatchManager`, `MatchRoom`, `Physics`, `Collision`, `Economy`, `LLMCommander`, and `DroneIntel` logic to ensure architectural stability.

---

## 2. Codebase Modification Audit Protocol

Every file change in the VEXEA codebase must follow this strict two-step protocol to prevent random edits:

1.  **Index Consultation:** The assistant must read this file (`/CODEBASE_INDEX.md`) to verify the file purpose and exports before preparing any edits.
2.  **Registration (Post-Change):** Register any newly created file, or core changes. 

---

### Cycle 2026-08-06-04: Integrate Automated Testing and Codecov in CI/CD
*   **Target Files:** `.github/workflows/deploy.yml`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `.github/workflows/deploy.yml`: Integrated `npm run test:coverage` and `codecov/codecov-action@v5` into the deployment pipeline. Deployment to Firebase Hosting is now gated by successful test execution and coverage reporting.
*   **Verification:** Workflow YAML updated and verified for correct step sequencing.

### Cycle 2026-08-07-01: Establish Settings, Screen Headers, and Diagnostic Upgrade Plan
*   **Target Files:** `SETTINGS_UPGRADE_PLAN.md`
*   **Status:** Prepared for Review & User Approval
*   **Modifications:**
    *   `SETTINGS_UPGRADE_PLAN.md`: Formulated comprehensive architectural plan addressing all six audit points: elimination of redundant nested headers, replacement of generic dropdowns with visual SVG selectors and swatches, pruning of non-functional stubs (languages/TTS) with immediate concrete roadmap for colorblind matrix/shake dampener/flash modes, live HUD preview viewport and audio audition feedback, full restoration of regressed Asset Cache Table/Server Telemetry/Renderer GPU metrics, and mathematical 0px-radius 2-column layout adhering strictly to `ARCHITECTURE.md` and `client/design-system.ts`.
*   **Verification:** Plan document authored and ready for user assessment.

### Cycle 2026-08-08-04: Implement Multi-Provider LLM Commander Adapter Architecture
*   **Target Files:** `server/ai/adapters/CommanderAdapter.ts`, `server/ai/adapters/GeminiAdapter.ts`, `server/ai/adapters/KimiAdapter.ts`, `server/ai/adapters/ClaudeAdapter.ts`, `server/ai/adapters/OpenAIAdapter.ts`, `server/ai/adapters/AdapterFactory.ts`, `server/ai/LLMCommander.ts`, `shared/feature-flags.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/ai/adapters/`: Built family adapters for Gemini, Kimi (Moonshot API), Claude, and OpenAI, managed by `AdapterFactory`.
    *   `server/ai/LLMCommander.ts`: Decoupled LLMCommander from provider SDKs, replacing hardcoded Gemini logic with provider-agnostic `CommanderAdapter`.
    *   `shared/feature-flags.ts`: Added `LLM_COMMANDER_FAMILY` feature flag for server-side family routing.
*   **Verification:** Verified zero provider SDK imports in `LLMCommander.ts`, exact Claude flat tool schemas, and verified build/test compilation.

### Cycle 2026-08-08-05: Strict Feature Flag Scope Boundary Separation & FEATURE_FLAGS.md Audit
*   **Target Files:** `server/flags/server-flags.ts`, `client/flags/client-flags.ts`, `shared/feature-flags.ts`, `server/flags/flag-service.ts`, `client/flags/flag-service.ts`, `FEATURE_FLAGS.md`, `.github/workflows/configcat-scan.yml`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/flags/server-flags.ts`: Created server-only feature flag definitions (`ServerFeatureFlagKey`, `ServerFeatureFlagSchema`, `DEFAULT_SERVER_FEATURE_FLAGS`).
    *   `client/flags/client-flags.ts`: Created client-only feature flag definitions (`ClientFeatureFlagKey`, `ClientFeatureFlagSchema`, `DEFAULT_CLIENT_FEATURE_FLAGS`).
    *   `shared/feature-flags.ts`: Refactored to contain strictly shared feature flags required by both client and server domains (`SharedFeatureFlagKey`, `SharedFeatureFlagSchema`, `DEFAULT_SHARED_FEATURE_FLAGS`, `getFeatureFlagScope`).
    *   `server/flags/flag-service.ts` & `client/flags/flag-service.ts`: Updated to consume scoped flags cleanly with strict domain boundaries.
    *   `FEATURE_FLAGS.md`: Created master registry cataloging all feature flags, scopes, types, defaults, and operational purposes.
    *   `.github/workflows/configcat-scan.yml`: Re-disabled `push` trigger to keep scan workflow on `workflow_dispatch` manual trigger.
*   **Verification:** Full `compile_applet` build succeeded with zero errors.

### Cycle 2026-08-08-06: Implement Strategy Brief Skeleton Infrastructure (Batch 5)
*   **Target Files:** `server/ai/strategy/StrategyBriefStore.ts`, `server/ai/LLMCommander.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/ai/strategy/StrategyBriefStore.ts`: Extracted strategy brief store reading/writing map-scoped strategy briefs at `StrategyBriefs/{mapId}` in Firestore with default skeleton generator for `map_1_facility`.
    *   `server/ai/LLMCommander.ts`: Updated systemInstructions construction to append dynamic strategy brief to base prompt once per match, enforcing a 400 token ceiling (~1600 characters) with truncation fallback.
    *   `CODEBASE_INDEX.md`: Registered StrategyBriefStore.ts and cycle audit log.
*   **Verification:** Verified zero build/lint/compile errors and tested with Vitest suite.

