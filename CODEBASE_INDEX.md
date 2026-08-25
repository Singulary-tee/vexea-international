# VEXEA Codebase Index

This file is the authoritative index of all directories and source files within the VEXEA multiplayer FPS engine. It provides exact descriptions of what each file contains and exports, serving as a strict audit gate. Every single codebase modification must be registered in this index first and last to ensure complete alignment and prevent random modifications.

---

## 1. Directory Structure and Module Index

### 1.1 Server Space (`/server`)

*   **`MatchManager.ts`**
    *   *Purpose:* Orchestrates the lifecycle of all active matches.
    *   *Key Functions/Exports:* `MatchManager` class (exported as default and as `matchManager` instance), `getOrCreateRoom(roomId, geminiKey, mapId)` (returns or provisions rooms), `findMatchmakingRoom(geminiKey)` (allocates players to empty rooms under 10 players), `deleteRoom(roomId)` (initiates cleanup), `getRooms()` and `getRoomCount()`.
*   **`Matchmaker.ts`**
    *   *Purpose:* Real player pooling system with two-tier matchmaking timeout and bot-fill fallback. Groups players into matches and pushes live recurring queue updates.
    *   *Key Functions/Exports:* `Matchmaker` class, `matchmaker` default/named export instance, `MATCHMAKER_MAX_WAIT_SECONDS` (45s constant), `MATCHMAKER_BOT_FILL_WAIT_SECONDS` (90s constant), `addPlayerToPool`, `removePlayerFromPool`, `getQueueSizeForMap`, `signalPlayerLoadingComplete`, `handlePlayerClassChange`.
*   **`connection-registry.ts`**
    *   *Purpose:* Lightweight connection registry for tracking active socket sessions without the resource overhead of a MatchRoom.
    *   *Key Functions/Exports:* `ConnectionRegistry` class, `connectionRegistry` instance, `register`, `unregister`, `get`, `getAll`.
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
*   **`combat/` (Server Combat System)**
    *   **`hitscan.ts`**: Standalone hitscan processing module (`processHitscan`). Handles origin verification, historical AABB rewind lag compensation, drone raycasting, damage calculation with falloff, assist tracking, and event broadcasting.
*   **`dev/` (Server Developer Tools)**
    *   **`dev-commands.ts`**: Developer command registration module (`registerDevCommands`). Registers dev handlers for cheats, bot/drone spawning, physics tuning, credit refills, god mode, infinite ammo, and debug state reporting.
*   **`flags/` (Server Feature Flags)**
    *   **`server-flags.ts`**: Defines server-only feature flag keys (`ServerFeatureFlagKey`), schema (`ServerFeatureFlagSchema`), and default values (`DEFAULT_SERVER_FEATURE_FLAGS`) for Sentry server telemetry, LLM Commander family/model parameters, and security logging.
    *   **`flag-service.ts`**: Resolves server-side feature flags via ConfigCat / OpenFeature server SDK with local fallbacks. Restricted to server and shared flag keys.
*   **`ai/` (Strategic AI)**
    *   **`behavior/` (Extensible Drone Behavior System)**
        *   **`types.ts`**: Interface definitions (`BehaviorContext`, `BehaviorOutput`) for zero-GC modular drone behavior functions.
        *   **`BaseAirBehavior.ts`**: Helper steering functions (`computeAirSteering`, `stabilizeHoverY`, `applyAirPhysics`) for aerial drone flight calculations.
        *   **`BaseGroundBehavior.ts`**: Helper steering functions (`computeGroundSteering`, `applyGroundPhysics`, `checkGrounded`) for ground drone surface movement and gravity physics.
        *   **`DroneBehaviorController.ts`**: Modular drone behavior execution controller (`processDroneBehaviors`, `initBehaviorOutputs`). Dispatches registered behaviors, applies inter-drone repulsion and static obstacle avoidance, enforces speed limits and physics movement, and manages firing & KCC translation updates.
        *   **`index.ts`**: Central behavior registry map (`BEHAVIORS`) mapping `DroneType` to dedicated behavior functions.
        *   **`behaviors/` (Per-Type Behavior Implementations)**
            *   **`RotaryShooterBehavior.ts`**: Specialized behavior for rotary shooter drones (`rotaryShooterBehavior`). Implements combat positioning, explicit retreat away-steering without vector inversion, hold-and-fire hovering, and path waypoint patrol logic.
            *   **`BomberBehavior.ts`**: Specialized behavior for bomber drones (`bomberBehavior`). Implements 3-state machine (`SEEKING` -> `LOCKED` -> `COMMITTED`), target tracking, detonation at `detonationTriggerRadius`, and area explosion damage.
            *   **`ReconBehavior.ts`**: Specialized behavior for unarmed recon drones (`reconBehavior`). Implements retreat on close contact, dynamic perpendicular orbit hovering with sinusoidal oscillation, high-altitude waypoint patrol, and zero weapon firing (`shouldFire` is always false).
            *   **`FixedWingBehavior.ts`**: Specialized behavior for fixed-wing strafing drones (`fixedWingBehavior`). Implements 4-phase strafe state machine (`APPROACH` -> `RUN` -> `EXIT` -> `REPOSITION`) using `DroneConfig` strafe distance thresholds.
            *   **`WheeledBehavior.ts`**: Specialized behavior for wheeled tank drones (`wheeledBehavior`). Implements hold-position combat strategy where body maintains orientation and independent turret handles aiming, retreat at close contact, approach to optimal range, and memory investigation/waypoint patrol.
            *   **`RobotDogBehavior.ts`**: Specialized behavior for robot dog units (`robotDogBehavior`). Implements aggressive pursuit, circle-strafing, non-holding combat movement, Y-axis targeting hints for stair climbing, and memory investigation/waypoint patrol.
            *   **`HumanoidBehavior.ts`**: Specialized behavior for elite tactical humanoid units (`humanoidBehavior`, `findBestCoverPosition`, `isTargetPinned`). Implements 6-state tactical state machine (`HUNT`, `TAKE_COVER`, `IN_COVER`, `FLANK`, `SUPPRESS`, `INVESTIGATE`), cover evaluation & raycast scoring, target pinning detection, and zero-direct-charge combat positioning.
    *   **`CommanderMemory.ts`**: Modular Zero-GC match-state context compression engine for the LLM Commander. Formulates tight (<250 token) situational awareness strings containing match clock, squad composition, drone asset ledger, casualty delta, utility log, objective state, and clean zone summaries.
    *   **`DroneAvoidance.ts`**: Manages dynamic path avoidance and separation steering behaviors for autonomous drone swarms.
    *   **`DroneIntelligence.ts`**: Governs spatial awareness for individual drones. Computes sight lines (3D orientation quaternions to check forward vectors and cone of vision angles), performs static map and dynamic Rapier line-of-sight raycasts, and handles memory decay mechanics.
    *   **`DroneMemory.ts`**: Tracks historical sighting positions, target last-seen timestamps, and spatial memory decay for drones.
    *   **`DronePerception.ts`**: Evaluates line-of-sight, raycasting, and sensory awareness updates for AI agents.
    *   **`GroupTacticalState.ts`**: Centralized zero-GC group tactical state manager (`GroupTacticalState`). Tracks per-group posture state (`ASSAULT`, `SUPPRESS`, `FLANK`, `HOLD`, `RECON`, `RETREAT`, `HARASS`) and validates posture allowlists per drone type.
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
    *   **`handlers/` (Transport Message Handlers)**
        *   **`matchmaking-handlers.ts`**: Handles matchmaking lifecycle events (`request_matchmaking`, `cancel_matchmaking`, `loading_complete`, `player_ready`, `PLAYER_QUIT`).
        *   **`gameplay-handlers.ts`**: Handles in-match gameplay events (`FIRE`, `RELOAD`, `CANCEL_RELOAD`, `USE_UTILITY`, `OBJECTIVE_HOLD`, `TOGGLE_FIRE_MODE`, raw movement updates).
        *   **`social-handlers.ts`**: Handles social and messaging events (`CHAT_MESSAGE`, `QUICK_COMM`).
        *   **`connection-handlers.ts`**: Handles connection quality and player session management (`ping`, `latency_report`, `rewarded_ad`, `select_class`).
*   **`routes/` (Server API Endpoints)**
    *   **`api-routes.ts`**: Configures all server REST endpoints (`/api/health`, `/api/debug-sentry`, `/api/log`, `/api/logs`, `/api/doppler-client-secrets`, `/api/proxy-asset`, `/api/debug`, `/api/test-compile`, `/api/economy/store`, `/api/economy/factions`).
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
    *   *Purpose:* Field utility definitions (`UTILITIES`: Grenade, Flashbang, Med Kit, Revive Tool, Radio, Signal Jammer, Proximity Mine, C4), cooldown constants, charge limits, and utility state creation helpers (`createInitialUtilityState`).
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
    *   *Purpose:* Dynamic local-storage asset cache manager using IndexedDB (`VexeaLocalCache`) and zero-GC blob object URL map (`blobUrlMap`). Provides full path tracing resolution, Cloudflare R2 CDN fetching, image SVG placeholder fallback generation, full cache entry deletion across all asset categories, and cache-busting version audit utilities (`checkAndBustStaleCache`, `invalidateCachedAsset`).
*   **`audio-manifest.ts`**
    *   *Purpose:* Compile-time source of truth for spatial audio and SFX assets, detailing key names, categories, R2 relative paths, and asset version tags.
*   **`image-manifest.ts`**
    *   *Purpose:* Single source of truth for UI, card, background, and promotional image assets hosted on R2.
*   **`model-manifest.ts`**
    *   *Purpose:* Manifest registry for entity, drone, and weapon 3D models (.glb) hosted on R2.
*   **`video-manifest.ts`**
    *   *Purpose:* Manifest registry for main menu, lobby, and UI webm background videos hosted on R2.
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
*   **`ads/` (Client Ad & Transmission Providers)**
    *   **`ad-provider.ts`**: Manages client-side rewarded ad simulation and API transmission playback (`MockAdProvider`), handling daily view cap enforcement (`DAILY_AD_CAP`), loading state delays, progress countdown overlay UI, and fallback verification against `/api/economy/ad-reward`.
*   **`data/` (JSON Data Registries)**
    *   **`catalog.json`**: Store catalog items, cosmetics, blueprints, pricing, and level requirements.
    *   **`challenges.json`**: Daily and weekly operational challenge definitions, targets, and rewards.
    *   **`offers.json`**: Store special promotions, featured bundles, and limited-time offer parameters.
*   **`gates/` (Client Environment & Screen Gates)**
    *   **`platform.gate.ts`**: Mobile vs desktop device detector (`IS_MOBILE`, `IS_DESKTOP`, `initPlatformGate`) applying platform CSS classes to `document.body`. Also exports marker-based DOM traversal input boundary detector `isUIElement()` checking form controls and `data-ui-surface` / `.ui-surface` nodes.
    *   **`screen.gate.ts`**: Centralized screen lock manager (`ScreenGate`) enforcing rotation overlay locks, loading locks, splash locks, UI editor locks, and gameplay input suppression.
*   **`screens/` (Client View Screens)**
    *   **`armory-screen.ts`**: Weapon loadout customization, attachment selection, weapon skin selection, and 3D preview.
    *   **`battle-pass-screen.ts`**: UI system for Battle Pass progression, featuring a high-contrast industrial theme, tier reward claiming, and real-time XP tracking.
    *   **`dev-audio.ts`**: Developer audio inspector listing live audio manifest samples dynamically with audition controls, category filtering, search input, and automatic playback termination rules.
    *   **`dev-entities.ts`**: Developer entity inspector for spawning, tracking, and debugging live match entities.
    *   **`dev-map-editor.ts`**: Level editor interface for placing and editing map colliders, spawn nodes, and zone volumes.
    *   **`energy-modal.ts`**: Insufficient energy modal (`openInsufficientEnergyModal`, `getEnergyRegenCountdown`, `getMaxFreeEnergy`, `getMatchEnergyCost`) providing 3 actionable CTA pathways (Watch Transmission Ad, Commander Resupply in Store, or Wait for Free Regen) with live countdown calculations and zero-leak DOM lifecycle.
    *   **`faction-screen.ts`**: Faction/INTEL screen displaying operative lore, faction data, contractor dossiers, and intelligence updates.
    *   **`lobby.ts`**: Pre-match staging screen handling class selection, ready toggling, friend invites, and game mode info.
    *   **`main-menu.ts`**: Central navigation dashboard containing top bar, user profile, energy reserve bar with live countdown ticker, nav links, and action cards (PLAY, UPDATES, INTEL, LOADOUT, FACTION, STORE, CHALLENGES).
    *   **`map_viewer.ts`**: Interactive 3D map viewer for inspecting level architecture and capture zones.
    *   **`matchmaking-overlay.ts`**: Matchmaking waiting overlay box with pre-match countdown display and cancel option.
    *   **`post-match-screen.ts`**: After-action report screen displaying victory/defeat state, earned XP, credits, kills/deaths, and level progression.
    *   **`screen-manager.ts`**: Screen navigation manager controlling view transitions, active screen lifecycles, and DOM rendering.
    *   **`splash.ts`**: Initial splash screen handling game branding, asset preloading, and system initialization.
    *   **`stats-screen.ts`**: Player statistics dashboard showing career performance metrics, kill/death ratios, and match history.
    *   **`store-screen.ts`**: In-game store screen for purchasing cosmetics, blueprints, and currency refills, including Commander Resupply energy packages and mock purchase flow.
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
        *   **`ui.ts`**: Renders the settings UI panel, sliders, toggles, configuration menus, and quit confirmation modal with duplicate modal guards.
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
        *   **`InputSystem.ts`**: Processes mouse, touch, and joystick inputs, handles touch drag-shoot aiming/firing with pointerType guards, sets rotation values, and triggers the `InputSynchronizer` stream.
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
        *   **`LLMTrackingEffect.ts`**: Governs the 4-phase LLM tracking HUD notification, SVG refraction filters, and staccato scanning animations.
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
    *   *New weapon catalogue SVGs (traced silhouettes):* `smg.svg`, `shotgun.svg`, `lmg.svg`, `sniper.svg` — white-filled hardware-accurate silhouettes wired via `shared/asset-details.ts` `WEAPON_ASSET_DETAILS` (`smg`, `shotgun`, `lmg`, `sniper`) and registered in `client/asset-cache.ts` `ALL_UI_SVGS`.
    *   *Glyph replacements:* `class_assault.svg` replaced with the approved double-chevron class glyph; `fullscreen_exit.svg` uses the opposite corner orientation from `fullscreen.svg` for the exit/collapse state (same 112-grid design family).
---
### Cycle 2026-08-21-01: New Weapon Catalogue SVGs & Approved Glyph Replacements
*   **Target Files:** `client/public/ui_svgs/smg.svg`, `client/public/ui_svgs/shotgun.svg`, `client/public/ui_svgs/lmg.svg`, `client/public/ui_svgs/sniper.svg`, `client/public/ui_svgs/class_assault.svg`, `client/public/ui_svgs/fullscreen_exit.svg`, `client/asset-cache.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized (delivered on branch `manuss-svg-weapon-icons` for manual merge)
*   **Modifications:**
    *   `ui_svgs/smg.svg`, `ui_svgs/shotgun.svg`, `ui_svgs/lmg.svg`, `ui_svgs/sniper.svg`: Created white-filled silhouette SVGs for the four new catalogue weapons (SMG, Shotgun, LMG, Sniper) via AI mockup generation and vector tracing pipeline; paths `svgPath` in `shared/asset-details.ts` required no change.
    *   `ui_svgs/class_assault.svg`: Replaced the rifle glyph with the approved double-chevron class glyph.
    *   `ui_svgs/fullscreen_exit.svg`: Created the exit-fullscreen glyph with the opposite bracket orientation to `fullscreen.svg`, used by `client/src/ui/fullscreen.ts` `getFullscreenIconSrc()`.
    *   `client/asset-cache.ts`: Registered the four new weapon SVGs in `ALL_UI_SVGS` for preload.
*   **Verification:** `tsc --noEmit` passed with 0 errors; contact-sheet renders QA'd against existing `rifle.svg`/`pistol.svg` references; fullscreen_exit verified pixel-against fullscreen.svg design family.

### Cycle 2026-08-21-02: Correct Fullscreen Exit Glyph Orientation
*   **Target Files:** `client/public/ui_svgs/fullscreen_exit.svg`, `CODEBASE_INDEX.md`
*   **Status:** Corrected & QA-verified on branch `manuss-svg-weapon-icons`
*   **Modifications:** Replaced the duplicate entering-fullscreen geometry with the opposite four-bracket collapse geometry shown in the approved reference: entering uses inward-open corners, while exiting uses the reversed orientation.
*   **Verification:** Rendered `fullscreen.svg` and `fullscreen_exit.svg` side by side in Chromium; the two states now visibly use opposite bracket orientations.

### 1.6 Test Suite (`/tests`)

*   **`tests/`**
    *   *Purpose:* Comprehensive suite of unit and integration tests using Vitest. Covers `MatchManager`, `MatchRoom`, `Physics`, `Collision`, `Economy`, `LLMCommander`, and `DroneIntel` logic to ensure architectural stability.

### Cycle 2026-08-12-01: VEXEA Monetization Overhaul Phase 1 — Dual-Currency System & Server-Authoritative Economy
*   **Target Files:** `shared/catalog.json`, `shared/verification/types.ts`, `shared/verification/verifier.ts`, `server/data/economy-service.ts`, `server/routes/api-routes.ts`, `client/screens/store-screen.ts`, `shared/feature-flags.ts`, `client/screens/main-menu.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `shared/catalog.json`: Created single source of truth catalog defining 8 structured store items across cosmetic, blueprint, booster, and bundle categories with credit and energy dual-currency pricing.
    *   `client/data/offers.json` & `client/data/catalog.json`: Deleted redundant/deprecated client catalog files.
    *   `shared/verification/types.ts`: Updated `CatalogItem` schema, `VerifyPurchaseInput` (added `currentEnergy`), `VerifyPurchaseResult` (added `remainingEnergy`), and created `VerifyAdRewardInput` & `VerifyAdRewardResult`.
    *   `shared/verification/verifier.ts`: Updated `verifyPurchase` with dual currency support, added `verifyAdReward` with daily cap validation, and reduced post-match reward rates (5 base CR, 15 win CR, 2 CR/kill).
    *   `server/data/economy-service.ts`: Updated `ServerEconomyService` to read from `shared/catalog.json`, exported `getCatalogItems()` and `getFeaturedItems()`.
    *   `server/routes/api-routes.ts`: Added `/api/economy/purchase`, `/api/economy/claim-daily`, `/api/economy/match-rewards`, `/api/economy/ad-reward`, and `/api/economy/init-player` server-authoritative endpoints, and updated `/api/economy/store`.
    *   `client/screens/store-screen.ts`: Refactored `handleStorePurchase` to eliminate client-side verification bypass/Firestore write vulnerability, routing all purchases through the server `/api/economy/purchase` API.
    *   `shared/feature-flags.ts`: Added monetization feature flags (`MATCH_ENERGY_COST`, `ENERGY_REGEN_MINUTES`, `ENERGY_MAX_FREE`, `AD_REWARD_ENERGY`, `AD_DAILY_CAP`, `NEW_PLAYER_STARTER_CREDITS`, `NEW_PLAYER_STARTER_ENERGY`).
    *   `client/screens/main-menu.ts`: Updated imports to point to `shared/catalog.json` and updated default player profile creation to starter pack defaults (`500 CR`, `10 Energy`).
*   **Verification:** Verified via `compile_applet` and `lint_applet` (`tsc --noEmit`). Build succeeded with 0 errors.

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

### Cycle 2026-08-08-07: Purge Lobby MatchRoom & Implement Lightweight Connection Registry
*   **Target Files:** `server/connection-registry.ts`, `server/index.ts`, `server/Matchmaker.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/connection-registry.ts`: Created new module for zero-overhead socket tracking.
    *   `server/index.ts`: Removed default lobby room creation and registration on connect. Implemented null guards across all event listeners to support menu-state where `currentRoom` and `pState` are null.
    *   `server/Matchmaker.ts`: Integrated `onMatchFormed` callback into match formation logic to synchronize connection state once a game session begins.
*   **Verification:** Verified zero physics/AI/Firestore activity on initial connection. Confirmed dev quick-start remains functional via direct room assignment.

### Cycle 2026-08-09-01: Config Extension — Add Strafing Parameters & ServerDrone Field
*   **Target Files:** `shared/constants.ts`, `server/MatchRoom.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `shared/constants.ts`: Added optional `strafeApproachDistance`, `strafeRunStartDistance`, `strafeExitDistance`, and `strafeRepositionDistance` to `DroneConfig` interface and set specified default values (`150`, `100`, `50`, `200`) on `DRONE_CONFIGS[DroneType.FIXED_WING]`.
    *   `server/MatchRoom.ts`: Added `fixedWingPhase?: 'APPROACH' | 'RUN' | 'EXIT' | 'REPOSITION'` to `ServerDrone` interface and initialized `fixedWingPhase: 'APPROACH'` on preallocated drone structures in `initEntities`.
*   **Verification:** Verified compilation and data structures.

### Cycle 2026-08-09-02: Implement HumanoidBehavior Elite Tactical Unit State Machine
*   **Target Files:** `server/ai/behavior/behaviors/HumanoidBehavior.ts`, `server/MatchRoom.ts`, `server/ai/behavior/index.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/ai/behavior/behaviors/HumanoidBehavior.ts`: Created elite tactical humanoid unit behavior function (`humanoidBehavior`), cover candidate position generator & scorer (`findBestCoverPosition`), and target pinning checker (`isTargetPinned`). Implements 6-state tactical state machine (`HUNT`, `TAKE_COVER`, `IN_COVER`, `FLANK`, `SUPPRESS`, `INVESTIGATE`).
    *   `server/MatchRoom.ts`: Added `humanoidPhase`, `cachedCoverPos`, `coverCacheTick`, `targetLastPos`, `targetLastMoveTick`, `suppressToggle`, `investigateHoldTick`, `flankStartTick` to `ServerDrone` interface and initialized them in `initEntities`.
    *   `server/ai/behavior/index.ts`: Registered `humanoidBehavior` under `DroneType.HUMANOID` in `BEHAVIORS` registry.
*   **Verification:** Verified compilation and behavior registration.

### Cycle 2026-08-09-03: ChatHUD Optimization & Desktop-Only Utility Shortcuts
*   **Target Files:** `client/src/systems/ChatHUDSystem.ts`, `client/src/systems/HUDSystem.ts`, `client/hud_template.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `client/src/systems/ChatHUDSystem.ts`: Removed the initial system greeting message, added dynamic opacity transitions, and implemented a 5-second inactivity fade-out timer.
    *   `client/src/systems/HUDSystem.ts`: Imported `IS_MOBILE` platform detection to completely hide keyboard shortcut badges on mobile, and formatted them to render as clean, static keys on desktop.
    *   `client/hud_template.ts`: Standardized the HTML rendering template of utility shortcut badges as clean, static squared letters ('G' and 'F') without brackets or count numbers.
    *   `CODEBASE_INDEX.md`: Updated cycle audit log.
*   **Verification:** Full linter (`npm run lint`) and compilation (`npm run build`) succeeded.

### Cycle 2026-08-10-01: Fix Drone Muzzle/Light Points, Wheeled Turret, Scale Config, Dead Code, and Sentry Breadcrumbs
*   **Target Files:** `shared/constants.ts`, `client/src/systems/DroneProcedural.ts`, `client/drone_models.ts`, `server/MatchRoom.ts`, `server/sentry.ts`, `tests/shared.test.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `shared/constants.ts`: Updated `getDroneMuzzleWorldPosition` to rotate local offsets by `conf.orientationOffset` before applying body orientation quaternion; added orientationOffset inverse transform in Wheeled IK target space block; exported `getDroneLightWorldPositions`; added `visualScaleTarget: 0.72` and updated `visualRadius: 0.72` for Humanoid drone.
    *   `client/src/systems/DroneProcedural.ts`: Removed `speed > 0.1` gate on turret yaw tracking; added turret pitch tracking using `state.turretPitch` with `config.turretGunAngle` clamping; strictly zero-GC.
    *   `client/drone_models.ts`: Updated Humanoid scale factor calculation to derive from `visualScaleTarget ?? visualRadius` in `DRONE_CONFIGS[DroneType.HUMANOID]` instead of magic number `2.5`.
    *   `server/MatchRoom.ts`: Purged dead function `getDroneColliderRadius`; added `recordDroneColliderInit` breadcrumb call inside `initDronePhysics` for Robot Dog.
    *   `server/sentry.ts`: Exported `recordDroneColliderInit` for recording physics breadcrumbs.
    *   `tests/shared.test.ts`: Added unit tests for `getDroneMuzzleWorldPosition` orientationOffset, `getDroneLightWorldPositions`, Wheeled turret kinematic muzzle calculation, and Humanoid `visualScaleTarget` config.
*   **Verification:** Verified zero lint/type errors (`lint_applet`), full applet build (`compile_applet`), and 100% passing Vitest suite (`vitest run shared.test.ts`).

### Cycle 2026-08-10-02: Implement WheeledBehavior and RobotDogBehavior Systems (Step 3b E2b)
*   **Target Files:** `server/ai/behavior/behaviors/WheeledBehavior.ts`, `server/ai/behavior/behaviors/RobotDogBehavior.ts`, `server/ai/behavior/index.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `server/ai/behavior/behaviors/WheeledBehavior.ts`: Created `wheeledBehavior` for tank units. Implemented hold-position behavior during engagement range where `steerX = 0, steerZ = 0, targetSpeed = 0`, preserving body heading (`forceHeadingX/Z`) while independent turret aims via `getDroneMuzzleWorldPosition`.
    *   `server/ai/behavior/behaviors/RobotDogBehavior.ts`: Created `robotDogBehavior` for agile quadrupeds. Implemented non-holding aggressive pursuit, circle-strafing at close range, Y-axis targeting hints (`drone.targetY`) for stair climbing, and memory investigation.
    *   `server/ai/behavior/index.ts`: Registered `wheeledBehavior` (`DroneType.WHEELED`) and `robotDogBehavior` (`DroneType.ROBOT_DOG`) in `BEHAVIORS` dictionary.
    *   `CODEBASE_INDEX.md`: Registered new behavior modules and audit log.
*   **Verification:** Verified compilation via `compile_applet` and lint validation via `lint_applet`.

### Cycle 2026-08-10-03: Eliminate Asset Load N+1 Blob URL Spans
*   **Target Files:** `client/asset-cache.ts`, `client/screens/splash.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Modifications:**
    *   `client/asset-cache.ts`: Optimized `getCachedOrFetchUrl` to short-circuit and return `blobUrlMap.get(baseName)` directly when present in memory, bypassing redundant IndexedDB reads and `URL.createObjectURL` calls.
    *   `client/screens/splash.ts`: Awaited `populateBlobUrlMap()` at the start of `preloadAll()` to ensure the in-memory `blobUrlMap` is warm before iterating over preloaded asset files.
    *   `CODEBASE_INDEX.md`: Updated cycle audit log.
*   **Verification:** Verified clean linting via `lint_applet` and full build compilation via `compile_applet`.

### Cycle 2026-08-12-01: Remove BriefingRenderer <3 Match Gate
* **Target Files:** `server/player-data/BriefingRenderer.ts`
* **Status:** Verified & Finalized
* **Modifications:** Replaced hard `< 3 matches` gate with graduated tiers: FIRST ENGAGEMENT (0 matches), Early Telemetry (1–2 matches), Full Briefing (3+ matches).
* **Verification:** Verified compilation and that `renderMatchBriefing()` consumes tiered output without modification.

### Cycle 2026-08-13-01: Mobile Full-Screen Look Zone Layout & Touch Handling
* **Target Files:** `client/hud_template.ts`, `client/src/systems/InputSystem.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `client/hud_template.ts`: Replaced `#look-zone-right` with a 100% width/height `#look-zone` element (`z-index: 1`) positioned behind all HUD controls, and raised HUD interactive elements (`#joystick-boundary`, `.btn-action`, `.btn-util`, `#weapon-selector`, `#auto-label`, `#btn-sprint`) to higher stacking order (`z-index: 20` / `100`).
    * `client/src/systems/InputSystem.ts`: Updated touch controls to bind `#look-zone` gated under `IS_DESKTOP`. Added pointerdown guards for mouse pointer types, already-active pointers (`activePointers.has`), and joystick boundary targets (`#joystick-boundary` contains check). Enforced `pointermove` and `pointerup` guards ensuring events only process when `e.pointerId === this.match.lookPointerId` and `this.match.isTouchingLookZone === true`.
    * `CODEBASE_INDEX.md`: Updated cycle audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-13-02: Restore Pointer Events & Touch Bindings for Utility HUD Buttons
* **Target Files:** `client/hud_template.ts`, `client/src/systems/InputSystem.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `client/hud_template.ts`: Added `pointer-events: auto !important;` and `z-index: 20 !important;` to `.btn-util`, `#weapon-slots-wrap`, and `.weapon-slot` CSS rules so pointer events do not fall through to `#look-zone`.
    * `client/src/systems/InputSystem.ts`: Added `e.target !== lookZone` early-return check in `#look-zone` pointerdown handler so touches targeting utility/HUD elements are ignored by camera look. Bound `btn-helmet` using `safeBindTouch`.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-13-03: Dossier Phase 2 — LLM-Generated Commander Assessment
* **Target Files:** `server/player-data/BriefingRenderer.ts`, `client/screens/stats-screen.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `server/player-data/BriefingRenderer.ts`: Added async dossier reader (`getDossier`) checking Firestore `Users/{uid}/dossier` with fallback to Phase 1 template logic. Added `generateDossierForPlayer` using independent `DOSSIER_MODEL` config (capped at 200 tokens via `maxOutputTokens: 200`). Added fire-and-forget `triggerMatchEndDossiers` to run asynchronously at match-end without blocking.
    * `client/screens/stats-screen.ts`: Replaced hardcoded two-string logic in INTEL tab's COMMANDER ASSESSMENT panel with dynamic rendering of LLM dossier text from `Users/{uid}/dossier` (or Phase 1 template fallback). Applied 260-character truncation cap with ellipsis.
    * `CODEBASE_INDEX.md`: Updated cycle audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-13-04: Matchmaker Bot-Fill Fallback & Live Queue Updates
* **Target Files:** `server/Matchmaker.ts`, `client/screens/matchmaking-overlay.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `server/Matchmaker.ts`: Added `MATCHMAKER_BOT_FILL_WAIT_SECONDS = 90` placeholder constant for second-tier matchmaking timeout. Updated `evaluatePool` to trigger match formation with bot-fill when real player count is below 4 after reaching the second timeout. Updated `formMatch` to call `registerBotPlayer()` on target `MatchRoom` to fill the lobby up to 4 total players, with distinct logging for bot-filled matches. Updated `evaluateAllPools` on the 1-second interval to push recurring `MATCHMAKING_STATUS` events with live queue size to all currently waiting players.
    * `client/screens/matchmaking-overlay.ts`: Verified in-place text update behavior of `updateMatchmakingOverlayStatus` for recurring `MATCHMAKING_STATUS` events.
    * `CODEBASE_INDEX.md`: Updated module description and cycle audit log.
* **Verification:** Verified compilation and lint validation.

### Cycle 2026-08-13-05: Remove Dead Yuka Vehicle Test Entity System
* **Target Files:** `server/MatchRoom.ts`, `server/dev/dev-commands.ts`, `client/dev_menu.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `server/MatchRoom.ts`: Removed `spawnTestEntity` method and all associated helper methods (`clearTestEntities`, `setTestEntityMode`, `setTestEntityTarget`, `triggerTestEntitySight`, `triggerTestEntitySound`, `setTestEntityCollisionFilter`, `processTestEntities`) and removed simulation loop call.
    * `server/dev/dev-commands.ts`: Removed dev command handlers for test entities (`dev_spawn_test_entity`, `dev_clear_test_entities`, `dev_test_entity_mode`, `dev_test_entity_target`, `dev_test_entity_sight`, `dev_test_entity_sound`, `dev_test_entity_collision_filter`).
    * `client/dev_menu.ts`: Removed test entity UI rows and event listeners from `ENTITIES` panel while keeping Row 1 (`[ROW 1: VEXEA DRONE SPAWNING]`) untouched.
    * `CODEBASE_INDEX.md`: Updated cycle audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-14-01: Wire Dead Audio Keys & Fix Audio Loading Stage Overlap
* **Target Files:** `client/screens/splash.ts`, `client/audio.ts`, `client/src/systems/InputSystem.ts`, `client/src/systems/CombatSystem.ts`, `client/src/systems/DroneSystem.ts`, `client/src/systems/NetworkSyncSystem.ts`, `client/src/systems/ChatHUDSystem.ts`, `client/screens/post-match-screen.ts`, `client/screens/store-screen.ts`, `client/screens/battle-pass-screen.ts`, `client/screens/screen-manager.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `client/screens/splash.ts`: Filtered initial `EXTENDED_SOUNDS` asset pre-fetching in splash stage to strictly `ui` and `music` categories, preventing premature network congestion and resource competition with gameplay sound downloads.
    * `client/audio.ts`: Added deduplication logic via `inFlightLoads` Map in `loadEntries` to ensure idempotent loading. Implemented helper and state methods: `updateFootsteps` (with raycast ground surface detection across metal, concrete, vent, gravel, dirt, and ground categories), `playJump`, `playJumpLand`, `playDryFire`, `playShotgunPump`, `setHeartbeat` (looping low-health audio indicator), `startMatchAmbience`, `stopMatchAmbience`, `startEmitter`, and `stopEmitter`.
    * `client/src/systems/InputSystem.ts`: Wired ground transitions for jump takeoffs (`jump`), landings (`jump_land`), continuous footsteps (walk/run on detected surfaces), and utility item throw sound triggers (`grenade_throw`).
    * `client/src/systems/CombatSystem.ts`: Wired dry-fire audio trigger (`playDryFire`) when firing with an empty magazine, and shotgun pump audio trigger for pump-action weapons.
    * `client/src/systems/DroneSystem.ts`: Wired positional audio triggers for drone spawn, takeoff, damage hit, death, spatial engine hum loops (`drone_hum`, `drone_wind_loop`), and remote player footstep simulation.
    * `client/src/systems/NetworkSyncSystem.ts`: Wired network events for low health heartbeat, grenade bounce/explosion, flashbang detonation, smoke deployment, and drone shield state events (`drone_shield_hit`, `drone_shield_break`, `drone_shield_up`, `drone_shield_down`).
    * `client/src/systems/ChatHUDSystem.ts`: Wired `notification` audio on incoming chat and tactical quick comm messages.
    * `client/screens/post-match-screen.ts`: Wired `match_end_motif` audio playback upon post-match results screen display.
    * `client/screens/store-screen.ts`: Wired `credits_spend` on successful economy transactions and `error` on failed transactions.
    * `client/screens/battle-pass-screen.ts`: Wired `credits_gain` and `level_up` on reward tier claims.
    * `client/screens/screen-manager.ts`: Wired `join_match` sound and match ambient background loops on transitioning into active game-view.
    * `CODEBASE_INDEX.md`: Updated cycle audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-14-02: Image Loading Stage Split + Remove Silent Asset-Fetch Fallback
* **Target Files:** `client/image-manifest.ts`, `client/asset-cache.ts`, `client/screens/splash.ts`, `client/screens/main-menu.ts`, `client/src/map/LoadingOrchestrator.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `client/image-manifest.ts`: Removed 6 dead card image manifest entries (`feedback_card.png`, `multiplayer_card.png`, `slopInc_card.png`, `statistics_card.png`, `store_card.png`, `vibeCo_card.png`).
    * `client/asset-cache.ts`: Refactored `getCachedOrFetchUrl` to remove silent fallback behavior (removed placeholder SVG generation, `setCachedBlob` poisoning on error, and `localPath` fallback return) and re-throw fetch errors cleanly.
    * `client/screens/splash.ts`: Split image loading into essential splash/first-frame preload (`IMAGES_TO_PRELOAD`) and secondary view textures (`EXTENDED_TEXTURES`).
    * `client/screens/main-menu.ts`: Added background non-blocking fetch triggers for `EXTENDED_TEXTURES` and `EXTENDED_SOUNDS` upon main menu initialization.
    * `client/src/map/LoadingOrchestrator.ts`: Added dedicated `'PRELOADING VFX TEXTURES'` phase preloading all `category: 'vfx'` assets before map building.
    * `CODEBASE_INDEX.md`: Updated cycle audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.

### Cycle 2026-08-14-03: Implement Dynamic Dev Audio Screen
* **Target Files:** `client/screens/dev-audio.ts`, `client/screens/screen-manager.ts`, `client/screens/main-menu.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `client/screens/dev-audio.ts`: Created new dynamic Dev Audio inspector UI (`dev-audio-screen`). Dynamically imports and reads `AUDIO_MANIFEST` at runtime to ensure sample list never gets stale. Displays sample key name, path, category, and loop status. Enforces playback stop rules under all 4 specified conditions (sample end, stop button pressed, playing another sample, or leaving screen). Added category filtering tabs, text search input, and master "STOP ALL AUDIO" control.
    * `client/screens/screen-manager.ts`: Registered `'dev-audio-screen'` in screen transition list, exported `showDevAudio()`, and added automatic `stopDevAudio()` cleanup when transitioning away from the screen or calling `hideAll()`.
    * `client/screens/main-menu.ts`: Added `DEV AUDIO` button alongside dev tools in the main menu card overlay.
    * `CODEBASE_INDEX.md`: Updated codebase index and audit log.
* **Verification:** Verified zero build/lint errors via `lint_applet` and `compile_applet`.






### Cycle 2026-08-21-04: Approved R2 Model Manifest and Preview Binding
*   **Target Files:** `client/model-manifest.ts`, `shared/utilities.ts`, `client/StudioPreviewManager.ts`, `client/screens/armory-screen.ts`, `CODEBASE_INDEX.md`
*   **Status:** Verified & Finalized
*   **Scope:**
    *   `client/model-manifest.ts`: Added 14 additive manifest records for the verified R2 ETC1S GLBs: eight utility/entity models and six weapon models, preserving all existing manifest keys and categories.
    *   `shared/utilities.ts`: Added the typed `UTILITY_MODEL_KEYS` map for all eight existing `UtilityId` values without changing cooldowns, charges, state shape, or hot-loop behavior.
    *   `client/StudioPreviewManager.ts`: Added stable model-key aliases for the approved pistol, shotgun, LMG, sniper, and utility previews, replacing their prior SCAR placeholder routing while preserving the rifle fallback and character-preview path.
    *   `client/screens/armory-screen.ts`: Replaced catalog-level utility placeholders with direct approved model keys for flashbang, revive, signal jammer/EMP, and C4 previews.
    *   `CODEBASE_INDEX.md`: Finalized this registration with the implemented-file summary and post-edit evidence.
*   **Explicit Non-Scope:** `client/weapons_model.ts`, `client/main.ts`, server weapon contracts, HUD slot count, combat-stat selection, and audio slot routing remain unchanged in this slice because the current gameplay contract supports only rifle/pistol slots; expanding those contracts requires a separately registered design and regression pass.
*   **Constraints:** No WebGLRenderer, no React, no changes to Geckos.io, no new allocations in physics/network hot loops, no duplicated gameplay constants, no secret exposure, and no R2 mutation.
*   **Pre-Edit Evidence:** The 14 uploaded objects were verified in R2 at 9,171,028 aggregate bytes; all production-origin worker fetches returned HTTP 200 with exact local SHA-256 matches. The branch is based on current `origin/main` and was clean before this registration.
*   **Post-Edit Status:** Verified. `npm run build` passed; `tsc --noEmit` passed; `npm test` passed with 20/20 test files and 101/101 tests. The corrected outside-repository verifier passed all 14 manifest-key/path checks, all eight utility bindings, preview aliases, protected-file scope, WebGPU guard, and Geckos.io retention. Architectural regression checks confirmed no `THREE.WebGLRenderer`, no hot-loop files changed, and no decoder/transcoder artifacts remain modified.


### Cycle 2026-08-21-05: Semantic Weapon Slots, Class Contracts, and Runtime Asset Connectors
* **Target Files:** `shared/classes.ts`, `shared/constants.ts`, `shared/weapons.ts`, `shared/asset-details.ts`, `shared/utilities.ts`, `GAMEPLAY.md`, `GAMEMODE_CONFIG.md`, `client/MatchController.ts`, `client/main.ts`, `client/weapons_model.ts`, `client/model-manifest.ts`, `client/StudioPreviewManager.ts`, `client/screens/armory-screen.ts`, `client/audio.ts`, `client/src/systems/CombatSystem.ts`, `client/src/systems/InputSystem.ts`, `client/src/systems/NetworkSyncSystem.ts`, `client/src/systems/HUDSystem.ts`, `server/MatchRoom.ts`, `server/combat/hitscan.ts`, `server/transport/handlers/gameplay-handlers.ts`, `tests/weapon-contracts.test.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized.
* **Scope:**
    * Refactor runtime weapon semantics so numeric slot 1 is the primary weapon slot and numeric slot 2 is the secondary weapon slot, with weapon identity resolved from the selected class/loadout instead of slot number. Preserve semantic transport payloads (`primary`/`secondary`) and the existing two-slot HUD/network shape.
    * Reconcile the class contract after the slot refactor: Assault primary Rifle/SMG, Medic primary Rifle/Shotgun, Recon primary Rifle/Sniper, Demolitions primary Rifle/LMG; Pistol remains the current secondary for all classes. Keep authoritative class and armory data aligned.
    * Correct named utility-slot assignments and keep `utility1`/`utility2` identity, cooldown, charge, server validation, HUD, and model binding consistent. The splash-screen preload list and its separate loading path are explicitly excluded.
    * Wire approved GLB keys through runtime model metadata/manifests and first-person/preview bindings without duplicating gameplay constants. Add asset-detail/animation metadata as a single source for model keys and authored animation hooks.
    * Add explicit audio and SVG connector placeholders at their existing integration surfaces, using large searchable `PLACEHOLDER` comments for the audio- and SVG-responsible agents. No actual audio or SVG asset changes are included.
    * Add focused shared-contract regression coverage for class primary pools, secondary defaults, utility slot ordering, and authored-versus-placeholder weapon identities.
* **Constraints:** No `THREE.WebGLRenderer`, no React, no Geckos.io removal, no R2 mutations, no changes to splash preload orchestration, no random duplicated constants, and no new allocations in 60Hz physics or 20Hz network hot loops. Preserve backward compatibility for existing class selection and semantic transport events where possible.
* **Planned Verification:** Build, TypeScript typecheck, full Vitest suite, targeted slot/class/utility contract tests, architectural WebGPU/Geckos/hot-loop checks, and clean diff/index audit before commit.
* **Post-Edit Status:** Verified & Finalized. `npx tsc --noEmit` passed. `npm test -- --run` passed with 21/21 test files and 106/106 tests, including the focused `tests/weapon-contracts.test.ts` coverage. `npm run build` passed in 16.98 seconds; only existing Vite chunk-size/dynamic-import warnings and the pre-existing CJS `import.meta` warning remain. `git diff --check` passed. Architectural guards confirmed no `THREE.WebGLRenderer`, Geckos.io remains present, no added allocation candidates in the touched client/server network or simulation paths, and build-touched decoder/transcoder binaries were restored.
* **Completed Modified Files:**
    * `shared/classes.ts`, `shared/constants.ts`, `shared/weapons.ts`, `shared/asset-details.ts`, and `shared/utilities.ts`: Added the semantic primary/secondary weapon identity authority, class primary pools/defaults, authored-versus-placeholder runtime gating, metadata-driven weapon capacities/reload configuration, and synchronized named utility model/presentation bindings.
    * `client/MatchController.ts`, `client/main.ts`, `client/weapons_model.ts`, `client/src/systems/CombatSystem.ts`, `client/src/systems/InputSystem.ts`, and `client/src/systems/NetworkSyncSystem.ts`: Preserved numeric UI/input slots 1 and 2 as primary/secondary adapters while resolving identities, stats, model keys, HUD state, reloads, audio calls, and authoritative loadout events semantically.
    * `client/audio.ts`, `client/src/systems/HUDSystem.ts`, and `client/screens/armory-screen.ts`: Added searchable audio/SVG connector placeholders, semantic weapon/utility icon routing, named utility ordering fixes, alternate class-primary catalog entries, and guarded semantic equip persistence.
    * `server/MatchRoom.ts`, `server/Matchmaker.ts`, `server/combat/hitscan.ts`, `server/transport/handlers/gameplay-handlers.ts`, and `server/transport/handlers/matchmaking-handlers.ts`: Carried validated primary/secondary identities through matchmaking, authoritative registration, reconnect, respawn, fire, reload, hitscan, and ammo events with metadata-derived stats.
    * `tests/weapon-contracts.test.ts`: Added focused regression tests for class pools, secondary defaults, utility ordering, model bindings, and the SMG authoring gate.
    * `CODEBASE_INDEX.md`: Finalized this cycle registration and evidence.
* **Explicit Non-Scope:** `client/screens/splash.ts`, `client/src/map/LoadingOrchestrator.ts`, and the separate splash/map preload orchestration were not changed. Actual audio and SVG assets remain placeholders for the responsible agents; no R2 mutations were performed.


### Cycle 2026-08-21-06: Measured Weapon and Utility Animation Authoring
*   **Target Files:** `shared/asset-details.ts`, `client/weapons_model.ts`, `tests/weapon-contracts.test.ts`, `CODEBASE_INDEX.md`; external authoring artifacts are maintained outside the repository under `/tmp/vexea_animation_authoring_spec_2026-08-21.md` and `/tmp/vexea-animation-assets/`.
*   **Status:** Verified & Finalized.
*   **Scope:** Inspected all approved utility GLBs; authored measured first-person weapon and utility clips in Blender using the semantic action vocabulary; produced fixed comparison renders and locally testable GLBs; updated shared asset metadata only after structural, visual, export, and runtime contract checks; extended the loader only with a backward-compatible semantic `fire`-to-internal-`shoot` alias and measured muzzle-node preference; kept SMG disabled after the free MP5 candidate failed the project’s structural/quality acceptance gate.
*   **Constraints:** R2 remained read-only; no Studio worktree changes; no splash/loading-orchestration changes; no `THREE.WebGLRenderer`; Geckos.io preserved; no new allocations added to protected physics/network hot loops; no baked arms; modern realistic military-industrial assets only; LMG ammunition remains concealed; healthshot is stab/press only.
*   **Pre-Edit Evidence:** Branch `manus/3d-model-integration` was clean at `3bf80e8`; prior cycles 04 and 05 were finalized. Baseline inspection records for five weapons and eight utilities are saved under `/tmp/vexea-animation-assets/inspection-readable/`; all baseline weapons reported zero authored actions before the local Blender pass.
*   **Completed Modified Files:**
    * `shared/asset-details.ts`: Added measured weapon and utility animation contracts, stable node names, semantic clip names, marker frames, measured dimensions, authored flags, and explicit placeholder audio/SVG connector keys. Signal Jammer is correctly bound to `prc152-optimized.glb`, not the separate Selex radio model.
    * `client/weapons_model.ts`: Resolves authored semantic `fire`/`sprint`/`equip` clips to the existing internal `shoot`/`walk`/`draw` states and prefers the measured `Muzzle` node with legacy fallbacks; no frame-loop or loading-orchestration redesign was made.
    * `tests/weapon-contracts.test.ts`: Added regression assertions for authored clip/marker/node metadata, measured positive dimensions, explicit utility authoring, PRC-152 jammer binding, and SMG gating.
    * `CODEBASE_INDEX.md`: Finalized this cycle registration and evidence.
*   **External Evidence:** `/tmp/vexea-animation-authoring-spec_2026-08-21.md` records the measured inspection and acceptance decisions. `/tmp/vexea-animation-assets/` contains local raw/normalized GLBs, Blender scenes, sidecars, fixed inspection renders, weapon/utility contact sheets, clip probes, and the approval-ready Draco replacement package set under `replacement-packages/`. Five weapon outputs expose exact semantic clips `equip`, `idle`, `sprint`, `ads_enter`, `ads_hold`, `ads_exit`, `fire`, `reload`, and `inspect`; eight utilities plus the separately audited PRC-152 jammer expose measured equip/idle/inspect and action-specific use/throw/place clips. The corrected utility contact sheet is readable for all approved utilities; healthshot uses stab/press only; the LMG magazine is detachable while ammunition remains concealed; Selex is authored as a single rigid presentation; the downloaded free Animated MP5 candidate was not enabled because its local audit did not satisfy the clean weapon-only/animation acceptance gate. The compressed package batch totals 1,821,856 bytes with a 345,780-byte maximum individual package; all packages re-imported with the Draco-enabled probe and R2 remained read-only.
*   **Planned Verification:** Blender structural inspection, fixed-view comparison renders, local GLB re-import through the configured loader path, metadata/clip/marker contract checks, `npx tsc --noEmit`, `npm test -- --run`, `npm run build`, `git diff --check`, architectural guards for WebGPU-only rendering, Geckos.io retention, protected hot-loop allocations, and decoder/transcoder artifact restoration.
*   **Post-Edit Verification:** `npx tsc --noEmit` passed; focused weapon-contract tests passed 5/5; full `npm test -- --run` and `npm run build` passed; `git diff --check` passed after restoring the build-touched decoder/transcoder binaries. Existing Vite chunk-size/dynamic-import warnings and the pre-existing CJS `import.meta` warning remain only.

### Cycle 2026-08-22-01: Dossier Pipeline Architectural Remediation
* **Target Files:** `server/ai/adapters/CommanderAdapter.ts`, `server/ai/adapters/AdapterFactory.ts`, `server/ai/adapters/GeminiAdapter.ts`, `server/ai/adapters/KimiAdapter.ts`, `server/ai/adapters/ClaudeAdapter.ts`, `server/ai/adapters/OpenAIAdapter.ts`, `server/flags/server-flags.ts`, `shared/feature-flags.ts`, `server/player-data/BriefingRenderer.ts`, `server/MatchRoom.ts`, `FEATURE_FLAGS.md`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `server/ai/adapters/CommanderAdapter.ts`: Added `generateText(prompt: string, systemInstruction: string, options?: { maxTokens?: number }): Promise<string>` to `CommanderAdapter` interface.
    * `server/ai/adapters/AdapterFactory.ts`: Added `getAdapterByFamily(family: string, apiKey?: string): CommanderAdapter` factory method.
    * `server/ai/adapters/GeminiAdapter.ts`, `KimiAdapter.ts`, `ClaudeAdapter.ts`, `OpenAIAdapter.ts`: Implemented native `generateText()` text completion per provider SDK without tools.
    * `server/flags/server-flags.ts` & `shared/feature-flags.ts`: Registered server-side dossier flags (`DOSSIER_MODEL_FAMILY`, `DOSSIER_MODEL`, `DOSSIER_FALLBACK_MODELS`, `DOSSIER_MAX_TOKENS_PER_PLAYER`) and added `getServerFlagValue` helper.
    * `server/player-data/BriefingRenderer.ts`: Replaced direct `GoogleGenAI` coupling with `AdapterFactory.getAdapterByFamily()`, fixed `winRate` calculation zero-count divisor guard, and refactored `triggerMatchEndDossiers()` to accept only `players` and fetch `gameProfile/v1` internally.
    * `server/MatchRoom.ts`: Added asynchronous fire-and-forget `BriefingRenderer.triggerMatchEndDossiers()` trigger in `handleMatchEnd()`.
    * `FEATURE_FLAGS.md`: Documented new dossier server feature flags in the registry table.
* **Verification:** Full compilation and lint checks passed with zero errors.

### Cycle 2026-08-22-02: Server & Test Initialization Hardening (VEXEA-SERVER-5, VEXEA-SERVER-6, VEXEA-SERVER-7)
* **Target Files:** `server/index.ts`, `client/src/vfx/LLMTrackingEffect.ts`, `tests/match-room.test.ts`, `tests/setup.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized
* **Modifications:**
    * `server/index.ts` (VEXEA-SERVER-6): Normalized `private_key` with newline replacement (`replace(/\\n/g, '\n')`), guarded `getApps()` against undefined/empty states before accessing `.length`, and added actionable server-side logging for both admin and fallback initialization failures.
    * `client/src/vfx/LLMTrackingEffect.ts` (VEXEA-SERVER-7): Converted DOM construction from eager constructor-level execution to lazy initialization via `initDOM()` guarded by `typeof document !== 'undefined'`, preventing module-load-time DOM mutation crashes in headless test and Node environments.
    * `tests/match-room.test.ts` & `tests/setup.ts` (VEXEA-SERVER-5): Added complete mock definitions for `firebase-admin/app` (including `getApps: vi.fn().mockReturnValue([])`, `initializeApp`, and `cert`) and `firebase-admin/firestore` to prevent mock resolution failures across all test suites.
* **Verification:** `lint_applet` passed (`tsc --noEmit`), `compile_applet` passed, and full Vitest suite passed with 21/21 test files and 106/106 tests passing.


### Cycle 2026-08-23-01: R2 Weapon Audio Manifest, Placeholder Replacement, and Match-Load Integration
* **Target Files:** `client/audio-manifest.ts`, `shared/asset-details.ts`, `client/audio.ts`, `tests/weapon-contracts.test.ts`, `r2_assets_tracker.json`, `r2_assets_tracker.md`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized on branch `manus/audio-r2-weapon-integration`.
* **Scope:** Registered the seven owner-approved R2 weapon audio objects (`lmg_fire`, `lmg_reload`, `shotgun_fire`, `shotgun_reload`, `smg_reload`, `sniper_fire`, `sniper_reload`) in the client manifest; replaced the active weapon audio placeholders in `WEAPON_ASSET_DETAILS`; verified that existing match-entry loading covers the manifest-driven gameplay audio; covered the generic reload-cancellation path; synchronized the verified R2 inventory tracker; and added focused contract coverage.
* **Constraints:** Utility placeholders, deprecated general-tracker audio rows, and unrelated audio remain unchanged; R2 remains the runtime asset source; the already-approved audio objects were not modified; no WebGLRenderer or React was introduced; Geckos.io remains present; no protected simulation/network hot-loop allocations were added; no secrets were exposed.
* **Completed Modified Files:**
    * `client/audio-manifest.ts`: Added the seven canonical gameplay SFX entries under `Audio/Sfx/Weapons/`, extending the derived `AudioKey` union and `AUDIO_PATHS` map.
    * `shared/asset-details.ts`: Replaced the SMG reload, shotgun fire/reload, LMG fire/reload, and sniper fire/reload audio placeholders with their concrete manifest keys.
    * `client/audio.ts`: Extended no-argument reload cancellation to stop the four newly wired reload sounds during weapon switches.
    * `r2_assets_tracker.json` and `r2_assets_tracker.md`: Added the seven verified R2 objects and updated totals from 155 to 162 assets and from 81 to 88 sound assets.
    * `tests/weapon-contracts.test.ts`: Added manifest/path/category assertions and a no-active-weapon-audio-placeholder regression check.
    * `CODEBASE_INDEX.md`: Registered and finalized this cycle.
* **Loading Evidence:** `client/src/map/LoadingOrchestrator.ts` already calls `audioManager.loadGameplayAudio()`, and `client/audio.ts` derives that load set from manifest entries whose category is not `ui` or `music`. The seven new entries are `sfx`, so no separate allowlist or orchestrator code change was required; both standard matchmaking and the existing match-entry path remain delegated through the orchestrator.
* **Post-Edit Verification:** `npx vitest run tests/weapon-contracts.test.ts` passed 6/6; `npx tsc --noEmit` passed; `npm test -- --run` passed 21/21 files and 107/107 tests; `npm run build` passed with only the existing Vite chunk-size/dynamic-import and CJS `import.meta` warnings; the independent 41-check manifest/placeholder/tracker/reload-stop/orchestrator audit passed; `git diff --check` passed; build-touched decoder assets were restored; no deprecated `assets_tracker.*` audio rows were changed.

### Cycle 2026-08-23-02: Muzzle Flash Flipbook Conversion, Zero-GC Muzzle Resolution, and Audio Emitter Lifecycle Hardening
* **Target Files:** `client/src/vfx/firing.ts`, `client/src/systems/VisualsSystem.ts`, `client/weapons_model.ts`, `client/audio.ts`, `client/MatchController.ts`, `client/src/systems/NetworkSyncSystem.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized.
* **Scope:**
    * Task 1: Replaced procedural TSL mesh/shader generation in `client/src/vfx/firing.ts` with `triggerMuzzleFlipbook` from `client/src/vfx/flipbooks.ts`. Preserved the zero-GC pooling structure (`POOL_SIZE = 8`, capped `POOL_LIGHTS_COUNT = 2` PointLights with constant visibility and intensity modulation, player and drone jitter attachment). Removed stale Niagara mesh visibility toggling from `VisualsSystem.ts`.
    * Task 2: Fixed the dynamic muzzle position resolution in `client/weapons_model.ts` (`getMuzzleWorldPosition`), eliminating per-call `new THREE.Vector3()` runtime allocations and applying camera view-space offsets via pre-allocated vector multiplication by `camera.quaternion`.
    * Task 3: Implemented `stopAllEmitters()` in `client/audio.ts` to stop and clear active positional/looped Howl emitters, match ambient sounds, footstep timers, and active reload audio. Wired `stopAllEmitters()` into `MatchController.dispose()` / `stop()` and the `YOU_DIED` event handler in `NetworkSyncSystem.ts`.
* **Constraints:** No WebGLRenderer, no React, WebGPU-only pipeline, zero-GC allocations in tick/render loops, preserved all gameplay mechanics and weapon performance constants.
* **Completed Modified Files:**
    * `client/src/vfx/firing.ts`: Removed procedural TSL `MeshBasicNodeMaterial`, `SphereGeometry`, `ConeGeometry` and replaced flash emission with `triggerMuzzleFlipbook()`, maintaining PointLight pooling and dynamic attachment.
    * `client/src/systems/VisualsSystem.ts`: Cleaned up shader pre-warm loop by removing procedural Niagara mesh references.
    * `client/weapons_model.ts`: Optimized `getMuzzleWorldPosition` to use pre-allocated vectors and accurate view-space transformation via `camera.quaternion`.
    * `client/audio.ts`: Added `stopAllEmitters()` on `AudioManager` for comprehensive audio loop cleanup.
    * `client/MatchController.ts`: Disposes and stops all active audio emitters and updates match state in `dispose()`.
    * `client/src/systems/NetworkSyncSystem.ts`: Stops audio emitters when `YOU_DIED` packet is received.
    * `CODEBASE_INDEX.md`: Registered this cycle and verified changes.
* **Post-Edit Verification:** `lint_applet` passed (`tsc --noEmit`), `compile_applet` passed cleanly.

### Cycle 2026-08-23-03: StudioPreviewManager Mode State Isolation & Async Load Race Guarding
* **Target Files:** `client/StudioPreviewManager.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized.
* **Scope:**
    * Task 1: Refactored `StudioPreviewManager` singleton to isolate per-mode scene graph and presentation state (`Map<StudioMode, StudioModeState>`). Separated `MAIN_MENU`, `LOBBY`, `ARMORY`, and `STORE` state containers (including dedicated model groups, turntable settings, rotation, mixers, and load request counters) to eliminate state bleed between screens.
    * Fixed the asynchronous race condition in `buildShowcaseModel()` by gating state resolution on per-mode `modeState.loadRequestId` across async ticks and during weapon attachment equipping.
    * Preserved single `WebGPURenderer` instance and avoided flickering or redundant model rebuilding when re-attaching already loaded mode assets via `applyModePresentation()`.
* **Constraints:** No React, WebGPU-only pipeline, strict mode isolation, zero-GC per tick.
* **Completed Modified Files:**
    * `client/StudioPreviewManager.ts`: Added `StudioModeState` interface, isolated model groups per mode, updated `attachTo()`, `setShowcaseItem()`, `buildShowcaseModel()`, and input listeners to use per-mode states.
    * `CODEBASE_INDEX.md`: Registered this cycle and verified changes.
* **Post-Edit Verification:** `lint_applet` and `compile_applet` verified.

### Cycle 2026-08-23-04: LoadingOrchestrator Consolidation (Character, Drone, and Weapon Models)
* **Target Files:** `client/src/map/LoadingOrchestrator.ts`, `client/main.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized.
* **Scope:**
    * Consolidated decoupled match-loading calls (`Player_one-optimized.glb` character model load, `initDroneModels`, and `initPlayerWeapons`) directly into `LoadingOrchestrator.orchestrateMatchLoad` ahead of the `player_ready` network dispatch and server sync phase.
    * Added Phase 3 `LOADING COMBAT ASSETS` to `orchestrateMatchLoad` with discrete progress bar tracking.
    * Cleaned up redundant inline `Player_one-optimized.glb` loader in `client/main.ts`'s `initializeLocalMatchScene` and passed active `camera` reference to `orchestrateMatchLoad`.
    * Maintained decoupling for `dev-entities.ts`, `StudioCharacterPreview.ts`, and `StudioPreviewManager.ts`.
* **Constraints:** No React, WebGPU-only pipeline, zero-GC allocations in tick/render loops, preserve all network flow contracts and loading bar accuracy.
* **Completed Modified Files:**
    * `client/src/map/LoadingOrchestrator.ts`: Imported `initDroneModels`, `initPlayerWeapons`, and asset loaders; added Combat Assets loading phase (character GLTF, drone procedural models, weapon models) with progress bar updates prior to shader prewarm and `player_ready` emit.
    * `client/main.ts`: Removed duplicate inline character model GLTFLoader call from `initializeLocalMatchScene`; passed camera to `orchestrateMatchLoad`.
    * `CODEBASE_INDEX.md`: Registered and finalized this cycle.
* **Post-Edit Verification:** `lint_applet` and `compile_applet` verified.

### Cycle 2026-08-23-05: Class Loadout Persistence Unified Integration
* **Target Files:** `client/src/systems/ClassLoadoutPersistence.ts`, `client/screens/lobby.ts`, `client/screens/armory-screen.ts`, `client/StudioPreviewManager.ts`, `server/dev/dev-commands.ts`, `CODEBASE_INDEX.md`
* **Status:** Verified & Finalized.
* **Scope:**
    * Fixed Bug 1: Added `getEquippedClass()` and `setEquippedClass()` methods to `ClassLoadoutPersistence.ts`. Updated `client/screens/lobby.ts` to initialize `selectedClassIdx` from saved class persistence instead of hardcoding `0` (`ASSAULT`). Synchronized `armory-screen.ts` category tab selections to write to `ClassLoadoutPersistence.setEquippedClass()`.
    * Fixed Bug 2: Updated `client/screens/lobby.ts` class selection handler to invoke `StudioPreviewManager.setLobbyLoadout()` on selection changes. Added per-mode held weapon and skin properties to `StudioModeState` in `StudioPreviewManager.ts` to equip and display the exact per-class weapon and skin loadout on the 3D lobby showcase model without altering `MAIN_MENU` behavior.
    * Addressed Bug 3: Preserved dev quick-start baseline in `client/screens/main-menu.ts` without silent alterations, providing formal architectural recommendation.
    * Fixed Bug 4: Implemented missing server-side `dev_set_class` socket event listener in `server/dev/dev-commands.ts` gated to `IS_DEV`. Resolved class weapon loadouts from Firestore/class defaults and invoked `applyPlayerClassLoadout` to re-apply primary/secondary weapons and utility states mid-match.
* **Completed Modified Files:**
    * `client/src/systems/ClassLoadoutPersistence.ts`: Added active class getter and setter (`getEquippedClass`, `setEquippedClass`).
    * `client/screens/lobby.ts`: Initialized lobby class card selection from persistence and triggered `StudioPreviewManager.setLobbyLoadout()` on card click/selection update.
    * `client/screens/armory-screen.ts`: Read and set equipped class on render and category tab switches via `ClassLoadoutPersistence`.
    * `client/StudioPreviewManager.ts`: Added `heldWeaponKey` and `heldSkinId` state to `StudioModeState`, added `setLobbyLoadout()`, updated `loadAndEquipWeaponAlways()` to process custom weapon keys and skins.
    * `server/dev/dev-commands.ts`: Added server-side socket handler for `dev_set_class` with Firestore loadout resolution and mid-match loadout re-application via `applyPlayerClassLoadout()`.
    * `CODEBASE_INDEX.md`: Registered and finalized this cycle.
* **Post-Edit Verification:** `lint_applet` passed (`tsc --noEmit`), `compile_applet` passed cleanly.




### Cycle 2026-08-25-01: Accepted Gameplay VFX and UI Motion Documentation (Planned)
* **Target Files:** `VEXEA_GAMEPLAY_VFX_CONTRACT.md`, `VEXEA_UI_ANIMATION_CONTRACT.md`, `VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md`, `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`, `GEMINI_VEXEA_VFX_UI_IMPLEMENTATION_PROMPT.md`, `VEXEA_UI_MOTION_RESEARCH_AND_PROPOSALS.md`, `VEXEA_UI_REDESIGN_RESEARCH.md`, `VEXEA_UI_CONCEPT_RESET.md`, `VEXEA_APPROVED_MOTION_LANGUAGE.md`, `VEXEA_BP_LOADING_REFRESH_BRIEF.md`, `VEXEA_UI_SVG_AND_CLICKABLE_AUDIT.md`, `VEXEA_SETTINGS_MOTION_AUDIT.md`, `CODEBASE_INDEX.md`
* **Status:** Planned; documentation-only branch preparation. No production implementation files are in scope.
* **Scope:** Register the reconstructed gameplay VFX contract, approved matchmaking and internal UI motion contract, reusable icon/settings/ambient interaction contract, accepted horizontal loading-bar contract, accepted full-season battle-pass contract, and Gemini handoff prompt. Historical rejected visual experiments remain explicitly excluded. Main-menu action cards remain untouched.
* **Verification planned:** `git diff --check`, markdown completeness scan, branch status review, and confirmation that no production source file is modified.

### Cycle 2026-08-25-01: Accepted Gameplay VFX and UI Motion Documentation (Completed)
* **Status:** Completed as a documentation-only branch preparation.
* **Completed Files:** `docs/vexea/README.md`, `docs/vexea/VEXEA_GAMEPLAY_VFX_CONTRACT.md`, `docs/vexea/VEXEA_UI_ANIMATION_CONTRACT.md`, `docs/vexea/VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md`, `docs/vexea/VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`, `docs/vexea/GEMINI_VEXEA_VFX_UI_IMPLEMENTATION_PROMPT.md`, `docs/vexea/VEXEA_UI_MOTION_RESEARCH_AND_PROPOSALS.md`, `docs/vexea/VEXEA_UI_REDESIGN_RESEARCH.md`, `docs/vexea/VEXEA_UI_CONCEPT_RESET.md`, `docs/vexea/VEXEA_APPROVED_MOTION_LANGUAGE.md`, `docs/vexea/VEXEA_BP_LOADING_REFRESH_BRIEF.md`, `docs/vexea/VEXEA_UI_SVG_AND_CLICKABLE_AUDIT.md`, `docs/vexea/VEXEA_SETTINGS_MOTION_AUDIT.md`, `docs/vexea/contract_calibration_review.md`, `docs/vexea/research_motion_sources.md`.
* **Scope Confirmation:** Accepted loading-bar and full-season battle-pass directions are documented. Accepted matchmaking, graph foundation, icon, settings, and quiet-ambient directions are documented. Superseded rejected visual experiments are labeled historical and excluded from implementation guidance. Main-menu action cards and all production implementation files remain unchanged.
* **Verification:** `git diff --check` passed before final index registration. Branch contains documentation files only plus this index registration; no production runtime source was modified.

### Cycle 2026-08-25-02: CSS-First UI Documentation Consolidation (Completed)
* **Target Files:** `docs/vexea/VEXEA_UI_DESIGN_SYSTEM.md`, `docs/vexea/VEXEA_UI_ANIMATION_CONTRACT.md`, `docs/vexea/VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`, `docs/vexea/GEMINI_VEXEA_VFX_UI_IMPLEMENTATION_PROMPT.md`, `docs/vexea/README.md`, `docs/vexea/VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md`, `docs/vexea/VEXEA_SETTINGS_MOTION_AUDIT.md`, `docs/vexea/VEXEA_UI_SVG_AND_CLICKABLE_AUDIT.md`, `CODEBASE_INDEX.md`.
* **Status:** Completed locally on the documentation branch.
* **Scope:** Consolidated recurring UI rules into one CSS-first source of truth. The authoritative stylesheet target is `client/src/ui/styles/vexea-ui.css`; the thin vanilla binder target is `client/src/ui/ui-motion.ts`. Settings-tab and navigation-tab underline behavior is one shared measured primitive. Former audit documents are compatibility pointers rather than duplicate contracts.
* **Scope Exclusions:** No React, CSS-in-JS, JavaScript animation library, screen-local animation stylesheet, main-menu action-card motion, gameplay runtime changes, renderer changes, or networking changes.
* **Verification planned:** `git diff --check`, documentation-only status review, and confirmation that only docs plus this index entry differ from the prior local commit.
