# VEXEA — Project Status

Last update: Day 67. Pure state tracker — working / broken / unbuilt only. Process rules, session narrative, and failure patterns don't live here.

# Confirmed Working — Core Systems (pre-Day 52, still holding)

- Player collision vs. buildings, other players, drones (real KCC-vs-KCC)
- Client + server physics worker (SharedArrayBuffer gate fixed)
- Server-client position reconciliation (move-speed mismatch + dead `moveHistory` fixed Day 50/51)
- Sight Perception, Memory/confidence decay, Mode transitions (NORMAL↔COMBAT) — confirmed working end-to-end
- LOS raycast Stage 3, drone-type FOV/detection-radius config collision, Drone Arrival/turn-rate — all fixed and confirmed
- Dev Entities collider/muzzle/scale unification, mobile-first layout, real JSON export
- Client architecture: `client/main.ts` split into InputSystem/DroneSystem/CombatSystem/HUDSystem/VisualsSystem under `MatchController`
- Turret system: server-side IK against real muzzle point
- Fixed Wing corrected as missile-firing long-range attacker (not a bomber)
- Muzzle offset war resolved — `shared/constants.ts` is single source
- Render (free tier) confirmed as real hosting answer, still never load-tested

# Confirmed Working — New Since Day 52

- Friends/Presence system, fully real, end-to-end verified. Squad Raid correctly separated — lobby-only action.
- Matchmaker — real, standalone `/server/Matchmaker.ts`. Real pool (4-10), edge cases handled, wired end-to-end client+server, Dev Quick Start bypasses correctly.
- Full utility pipeline, all 8, real server-authoritative logic in `MatchRoom.ts`'s `useUtility()`.
- Dynamic Resolution Scaling — real, wired into the render loop.
- Post-match screen — real, honestly distinguishes tracked vs. dead stat fields.
- Classes — real system, full server chain verified.
- Asset pipeline: Draco/KTX2 decoder configuration fixed project-wide; AI Studio workspace corruption on decoder files fixed via `vite-plugin-static-copy` from `node_modules`.
- All 8 planned final GLBs delivered (Player_one, Humanoid, 3 quadcopters, UAV, UGV, Robot Dog), Draco+KTX2 compressed, ~90MB→14MB. `/shared/asset-structure.ts` is real single source of truth for all node/mesh names, including 6 real weapon GLBs with real grip/muzzle/trigger tag nodes.
- Humanoid render freeze — root cause found and fixed: one texture at 1024×1023, not divisible by 4, silently broke KTX2 transcoding.
- Server-crash/hang cluster (uncaught TypeError tearing down matches, Settings Cancel button, Dev Quick Start hang) — confirmed resolved, was downstream of the Humanoid texture bug.
- LLM Commander four-part upgrade — confirmed landed via direct code inspection. Unit-type descriptions added to the static prompt. `spawn_units` expanded from 2 types to all real 7, with a genuinely new AP-cost check (spawning was previously free) and Fixed Wing's 1-per-match cap enforced. Outstanding-order flagging added. `playerPresence`'s 3-state field replaced with a single 0–1 confidence float, both Recon Drone and Signal Disruptor overrides confirmed preserved.
- LLM commander token budget — real, enforced ~55,000 token/match ceiling, using real API `usageMetadata`.
- Weapon-to-hand attachment — real two-point orientation constraint implemented (left hand anchors grip, right hand drives rotation). Cosmetic clipping at some camera angles remains, worked around via fixed camera framing, not fixed.
- Texture/GLTF loading error saga — fully, permanently resolved. Real root cause: a filename was being wrapped in an object/array accessor instead of passed as a bare string, breaking every downstream cache lookup.
- Rigid-transform baking — confirmed done, verified via direct code read. Real 128-entry precomputed sine table (`SINE_TABLE`) in `DroneProcedural.ts` used for hover sway/bob. Propeller spin correctly left as direct computation (no table needed, confirmed correct per original reasoning). Recoil, steering, turret-tracking, banking all confirmed untouched, still real-time/reactive as intended.
- New infrastructure, all real and live: Doppler (real secrets fetch, confirmed working, source of live `SENTRY_DSN`), Sentry (real org, Seer root-cause analysis, actively surfacing issues), ConfigCat-backed feature flags (`/shared/feature-flags.ts`, documented in `/FEATURE_FLAGS.md`), [Architecture.md](http://Architecture.md) Section 11 (mathematical UI sizing, zero-overlap guarantee, no eyeballing — standing law).
- Battle Pass Phase 1 (free-track) — real schema/tier structure landed, but confirmed to contain fabricated reward content (invented item IDs/names, no basis in the codebase) and a broken season date (2024, already expired). Fix prompt sent, combined with a new separate permanent Level field and wiring for 4 dead telemetry fields — result not yet verified.
- Account registration & Google Auth session management: fixed, Firebase Auth state fully wired, authenticated profile card overlay & logout built (Section 11 compliant).
- Faction war active feature flag: fixed, wired to `clientFlagService.getBoolean(FeatureFlagKey.FACTION_WAR_ACTIVE)`, enforcing ceasefire badges & locking enlistment buttons when inactive.
- Store "Inspect" 3D modal viewport adaptation and touch/soft-lock safety fixed (Section 11 compliant with Escape/backdrop close fail-safes).
- Minimap bot and remote player marker rendering integrated (20Hz zero-GC loop reading remotePlayersTargetData with team/hostile styling).
- Hit VFX dust particle birth matrix delay resolved (immediate instance matrix transform set on spawn).
- Positional audio distance rolloff and spatial attenuation implemented in AudioManager with `spatialAudio` settings toggle integration.
- The actual win condition (disabling the LLM): Fully implemented via a dedicated client-side `LLMObjectiveSystem` and server-side MatchRoom validation loop.
- N+1 API call pattern flagged by Sentry: Resolved using client-side cache and chunked document batch fetching for user profiles in `main-menu.ts`.
- Firebase Hosting SPA Routing Configuration: Serves single-page application (SPA) paths correctly by routing non-file traffic to index.html in firebase.json.
- Screens disappearing timing/transitions & asset prewarming (Issue #1): fixed, transition durations consolidated in design-system, DOM image prewarming active, and 3D model loading state preserved.
- Formal Repulsive Potential Field avoidance (`calculateDroneAvoidance` in `DroneAvoidance.ts`): obstacle & inter-drone repulsion vectors derived from physical bounds, verified via unit tests.
- Sound perception isolated from optical sight (`evaluateDronePerception` in `DronePerception.ts`): sound capped at 0.75 confidence (`last_seen`), verified via unit tests.
- LLM Commander order tracking & hold position duration decay (`LLMCommander.ts`): outstanding order tracking, hold cycle duration countdown, and group split/merge order updates verified via unit tests.
- Automated testing suite: Vitest runner configured with 97 passing tests across 20 test suites covering perception, potential field avoidance, LLM commander orders, match room lifecycle, physics, collision, LLM commander execution feedback loop, and out-of-bounds spatial enforcement systems.
- Gemini LLM Commander Execution Feedback Loop: Implemented dedicated `LLMCommanderFeedback` system to maintain a rolling execution log (`ToolExecutionRecord[]`), actionable corrective hints, and LLM-friendly prompt block injection with full test coverage.
- Out-of-Bounds & Restricted Gate Spatial Enforcement System: Implemented dedicated `OutOfBoundsEnforcer` managing player OOB states, issuing a 3.0-second grace warning state (`out_of_bounds_warning` client event), and applying 35.0 DPS continuous damage, fully integrated into `MatchRoom.ts` with extensive unit tests.
- Dynamic Map Configuration Registry & Fallback Cleanup: Pruned all stale default hardcoded string fallbacks to `map_0_dev` across `MatchRoom.ts`, `Matchmaker.ts`, and `index.ts`, ensuring correct modularity with dynamic spec registration.
- Class Loadout Persistence, Validation & Purchase Verification: Implemented a local cache with optimistic local storage updates, strict validation that equips are actually unlocked via Firestore/LocalStorage cache check, 2-second debounced background Firestore updates, and verification of cosmetic purchases via VerificationService API before applying Firestore write updates.
- Server-Authoritative Hitscan Origin Verification: Added deterministic origin vector checking against the server's authoritative player physics position, rejecting anomalous origin discrepancies to prevent wall-clipping and telemetry hacks.
- In-Match Text Chat & Tactical Radial Quick-Comm System: Implemented mathematically audited chat overlay (`hud-chat-log`), centered radial quick-comm wheel (`radial-comm-wheel`), input locking, UI layout editor integration, settings panel persistence, and server-authoritative rate-limiting and sanitization in `ChatSystem.ts`.

# Actively Broken / Known Issues (Sentry-confirmed, live)

- `429` on `draco_decoder.wasm` fetch — low volume so far [UNSUITABLE FOR GEMINI TO FIX]
- `Failed to fetch dynamically imported module: StudioCharacterPreview.ts` — 1 occurrence, not yet investigated [UNSUITABLE FOR GEMINI TO FIX]
- `[Cache] CDN fetch failed for medkit via proxy fallback: 404` — real missing asset reference [UNSUITABLE FOR GEMINI TO FIX]
- Perceived input latency since the reconciliation fix — likely [Socket.IO/JSON](http://Socket.IO/JSON) transport overhead [UNSUITABLE FOR GEMINI TO FIX]
- Drones sinking below the floor — real, live collision/positioning bug [UNSUITABLE FOR GEMINI TO FIX]
- Real, unspecified spawn and disconnection bugs [UNSUITABLE FOR GEMINI TO FIX]
- Assets not showcasing well in Lobby/Armory/Store (presentation problem) [UNSUITABLE FOR GEMINI TO FIX]

# Needs Retest / Never Independently Confirmed

- Whether server reconciliation overrides client position after a disconnect [UNSUITABLE FOR GEMINI TO FIX]

# Confirmed Broken

- First-person weapon rendering: fixed / confirmed working for local player
- Local player's own drone GLB rendering: not confirmed working [UNSUITABLE FOR GEMINI TO FIX]
- No centralized input-guard system (later reported implemented with "some edge cases" — never re-verified) [UNSUITABLE FOR GEMINI TO FIX]
- Drone death/despawn: instant, no animation, smoke, or delay [UNSUITABLE FOR GEMINI TO FIX]
- FPS pistol/rifle rigs have visually mismatched arms [UNSUITABLE FOR GEMINI TO FIX]
- First-person arms are a completely separate, disconnected asset from the actual player model — visually inconsistent [UNSUITABLE FOR GEMINI TO FIX]

# Confirmed Unbuilt Scope

- Main menu / lobby further polish, class-select visual refinement [UNSUITABLE FOR GEMINI TO FIX]
- Player animation: no walk/run distinction, no weapon sway — fixed / confirmed working
- Store, monetization/payment processing (battle pass Phase 2 depends on this) [UNSUITABLE FOR GEMINI TO FIX]
- `query_zone`/`recall_group` tools — discarded
- Per-type COMBAT behavior — perception/memory/mode-switching is real, tactical behavior per type is not built [UNSUITABLE FOR GEMINI TO FIX]
- Full facility map: hand-built in Godot Mobile, ~1.6M triangles, unfinished
- Lightmap/environment baking pipeline unproven; fallback is full primitive/cube map
- File/codebase organization pass
- Voice chat — blocked on "other players visible to each other" not yet being built (In-match text chat implemented)
- Cross-match player behavior profiling/aggregation — deliberately deferred until real per-match telemetry exists [UNSUITABLE FOR GEMINI TO FIX]
- Faction war active feature flag — fixed (wired to flag service and UI)
- Most class utilities exist only as buttons with no real visual/functional implementation [UNSUITABLE FOR GEMINI TO FIX]
- Drone intelligence system — real work still needed beyond current perception/memory foundation [UNSUITABLE FOR GEMINI TO FIX]
- Not a single full match has been played start-to-finish against a real LLM commander [UNSUITABLE FOR GEMINI TO FIX]

# Deployment & Optimization Backlog

- Render confirmed as the real hosting plan but never actually load-tested
- JS minification, minimap static-bake, per-map spec precomputation [DEFERRED UNTIL DEPLOYMENT IS CLOSE]
- Draco/KTX2 pipeline is now real and correct project-wide — closed, not backlog

# Road to Launch — Large, Undesigned Scope (Day 67)

This section is a map of what's ahead, not confirmed state. Nothing here is started unless noted. Update individual lines to the sections above as pieces get finished — do not let this section silently go stale.

**Deployment & infrastructure readiness**

- Real deployment to SmarterASP hasn't happened — first real test of [Geckos.io](http://Geckos.io) as the actual production transport (currently [Socket.IO](http://Socket.IO) in AI Studio due to its UDP restriction)
- Verification-service architecture decided — integrated server-side VerificationService with client-side verification and security checking, resolved
- Automated testing: Vitest suite active with 86 tests passing across 17 test files.

**Player data pipeline (undesigned, foundational) [UNSUITABLE FOR GEMINI TO FIX]**

- What gets gathered per player, who gathers it, where it's stored, where it's sorted/processed, where Deepnote fits in, and how raw numeric data gets rephrased into real sentences for the LLM commander instead of vague numbers. Explicitly core architecture, not a nice-to-have — this is what the cross-match player profiling work (already deferred above) actually depends on. [UNSUITABLE FOR GEMINI TO FIX]

**Business layer**

- No payment pipeline, no real financial tracking, no security beyond a Firestore document and one verification service

**Launch & growth**

- No demo/trailer prepared
- Real chicken-and-egg risk named explicitly: a multiplayer game with one player is a dead game — audience-building has to happen before or alongside finishing, not strictly after
- Named competitive risk: once shipped, copycats using agentic coding tools become a real threat