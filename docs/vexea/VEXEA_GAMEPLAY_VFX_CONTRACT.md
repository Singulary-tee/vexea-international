# VEXEA Gameplay VFX Contract

**Status:** Drafted and visually calibrated; repository import is intentionally deferred until the user gives the signal.

**Purpose:** Provide Gemini with one implementation contract for the gameplay VFX surface: static textures, flipbooks, tracers, muzzle effects, impact dust, decals, explosions, fire, and barrel smoke. The contract is deliberately explicit about scale, duration, opacity, composition, and ownership so the result is not a collection of guessed values or a monolithic effect in `main.ts`.

> **Core rule:** A pool is a concurrency budget, not a command to layer every slot into one event. A single authored event uses one flipbook billboard unless the composition table explicitly adds one static layer or one light layer.

## Source of truth and implementation boundary

All runtime gameplay values belong in `client/src/vfx/constants.ts`. Gemini must not duplicate those values inside `main.ts`, `VFXOrchestrator.ts`, or a screen module. Event entrypoints belong in the existing modular VFX owners: `VFXOrchestrator.ts` routes events, `firing.ts` owns muzzle light attachment, `hits.ts` owns sparks/dust/decals, `large.ts` owns explosion light, and `flipbooks.ts` owns the single-billboard atlas playback. The 60 Hz update paths must retain the existing preallocated typed-array and scratch-object discipline.

The existing legacy `EnvironmentalEffects.ts` particle class is not part of the active contract. Do not revive it as a second effect pipeline. Keep WebGPU/TSL as the renderer path and preserve the existing Geckos.io code even when Socket.IO is the active development transport.

## Exact static and flipbook inventory

The following names and paths are the verified asset manifest to use when the repository is refreshed. They are not aliases. The R2 path is relative to `Images/VFX/Flipbooks/` or `Images/VFX/Static/` as shown.

| Family | Exact asset names | Atlas / blend contract |
|---|---|---|
| Smoke / cloud flipbooks | `cloud_01_8x8_q90.webp`, `cloud_02_8x8_q90.webp` | 8×8, 64 frames, 0.80s, normal alpha |
| Explosion flipbooks | `explosion_01_8x8_q90.webp`, `explosion_02_8x8_q90.webp` | 8×8, 64 frames, 0.75s, additive |
| Explosion smoke | `explosion_smoke_01_8x8_q90.webp` | 8×8, 64 frames, 0.90s, normal alpha |
| Fire flipbooks | `fire_01_8x8_q90.webp` through `fire_04_8x8_q90.webp` | 8×8, 64 frames, 1.00s, luminance-keyed alpha, additive |
| Flame flipbooks | `flame_01_16x4_q90.webp`, `flame_02_15x4_q90.webp` | 16×4/15×4, 64/60 frames, 1.00/0.80s, additive |
| Muzzle flipbook | `muzzle_flash_01_5frame_q90.webp` | 5×1, 5 frames, 0.08s, additive |
| Wispy impact flipbooks | `wispy_smoke_01_8x8_q90.webp`, `wispy_smoke_02_8x8_q90.webp`, `wispy_smoke_03_8x8_q90.webp` | 8×8, 64 frames, 0.65s, normal alpha |
| Static circles | `circle_01_a.webp` through `circle_05_a.webp` | One optional static ground/air layer; normal alpha unless explicitly authored otherwise |
| Static flare | `flare_01_a.webp` | One optional muzzle core layer; additive |
| Static muzzle shapes | `muzzle_01_a.webp` through `muzzle_05_a.webp` | One selected shape per shot; additive, never all five simultaneously |
| Static sparks | `spark_01_a.webp` through `spark_07_a.webp` | One selected shape per authored spark event; additive, not a dense sprite cloud |
| Surface decals | `surface_decal_bullet_hole_01.webp` through `_03.webp`, `surface_decal_scorch_01.webp` | One decal per impact slot; normal alpha, polygon offset |
| Tracer cores | `tracer_cool_core.webp`, `tracer_warm_core.webp`, `tracer_white_core.webp` | One elongated billboard; additive, never a circular dot |

Every atlas cell must use the existing half-texel inset behavior. Do not introduce neighbor bleed, frame interpolation that creates ghosts, or a second texture-loader cache.

## Live versus manifest-available effects

The current repository already routes some of these families through `VFXOrchestrator.ts`, while others are present in the verified manifest but are not yet active in the runtime path. Gemini must keep this distinction explicit during the next integration pass.

| Runtime status | Effect family | Current path / required next action |
|---|---|---|
| Live | Impact wispy smoke, explosion, muzzle, fire/flame flipbooks | Routed through `VFXOrchestrator.ts` into `flipbooks.ts` |
| Live | Tracer cores | Routed through `VFXOrchestrator.spawnTracer()` using three core textures |
| Live | Procedural impact sparks, dust, decals | Routed through `hits.ts` with typed arrays and BatchedMesh |
| Live | Barrel smoke and explosion light | Routed through `VFXOrchestrator.ts` and `large.ts` |
| Manifest available, verify before wiring | `cloud_02`, `wispy_smoke_03`, `fire_02`–`fire_04`, `flame_02` | Add as deliberate variant selection, not extra simultaneous layers |
| Manifest available, verify before wiring | Static circles, static muzzle shapes, static spark shapes | Add as one optional selected support layer per event; do not instantiate all variants together |

The phrase “use every effect provided” means every intended family should have a deliberate event path and quality-tier behavior. It does not mean every texture or pool slot renders at the same time. Record the final mapping in the repository index after visual verification.

## Authoring constants

The first table preserves the values currently consumed by the repository. The normalized seconds column exists to stop frame/second confusion during review; source constants remain the authority.

| Effect | Constant | Value | Visual contract |
|---|---|---:|---|
| Muzzle flash | `FIRING.FLASH_DURATION` | 0.08s | Nearly instantaneous; never reads as a fireball |
| Muzzle flash | `FIRING.FLASH_SCALE_MULTIPLIER` | 1.20 | Applied once to the weapon-family scale |
| Muzzle light | `FIRING.LIGHT_INTENSITY` / `DECAY` / `DISTANCE` | 25 / 2 / 8 | Short warm pulse; no persistent illumination |
| Muzzle shape | `FIRING.SPIKE_COUNT` / `LENGTH` / `WIDTH` | 4 / 1.5 / 0.25 | Four narrow directional spikes at most; static muzzle shape remains the primary silhouette |
| Barrel smoke | `FIRING.SMOKE_LIFETIME` | 30 frames / 0.50s | One small lingering residue, not a second muzzle flash |
| Barrel smoke | `FIRING.SMOKE_GROWTH_SPEED` / `RISE_SPEED` | 0.45 / 0.02 | Slow growth and lift; decay must be visible |
| Impact sparks | `HITS.SPARK_LIFETIME` | 10 frames / 0.167s | Brief, thin contacts; no starburst cloud |
| Impact sparks | `HITS.SPARK_SPEED_MIN/MAX` | 3.0 / 9.0 | Directional hemisphere from the surface normal |
| Impact sparks | `HITS.SPARK_GRAVITY` / `DECAY_RATE` | 9.81 / 0.95 | Arcing falloff, not straight radial dots |
| Impact sparks | `HITS.SPARK_SIZE` | 0.10 world units | Hairline-to-small streak at target distance |
| Impact dust | `HITS.DUST_LIFETIME` | 25 frames / 0.417s | One soft kick that rises and dissipates |
| Impact dust | `HITS.DUST_RISE_SPEED` / `SPREAD_SPEED` | 1.8 / 1.2 | Surface-normal lift with modest lateral spread |
| Impact dust | `HITS.DUST_SIZE_START/END` | 0.15 / 0.55 | Starts tight; reaches a soft palm-sized cloud, not a screen-filling puff |
| Decal | `HITS.DECAL_SIZE` | 0.35 world units | Bullet hole/scorch remains smaller than the dust envelope |
| Decal | `HITS.DECAL_OFFSET_FACTOR` | -5 | Preserve z-fighting protection |
| Explosion | `LARGE.EXPLOSION_LIFETIME` | 0.80s | One readable burst, then smoke/light tail |
| Explosion | `LARGE.EXPLOSION_SPARKS/SMOKE_PLUMES` | 40 / 15 | These are effect budgets, not a reason to create 40 visible sprites at the same silhouette edge |
| Explosion light | `LARGE.EXPLOSION_LIGHT_INTENSITY/DISTANCE` | 80 / 25 | One short environmental response; no bloom wall |
| Explosion | `LARGE.EXPLOSION_EXPANSION_RATE` | 2.0 | Expand quickly at first, then let the atlas shape provide the slowdown |
| Fire | `LARGE.FIRE_PARTICLES` | 12 | If the legacy particle path is retained, treat this as a bounded environment budget; authored fire remains one flipbook event |
| Fire | `LARGE.FIRE_LIFETIME/RISE_SPEED/SIZE` | 40 frames / 0.667s, 0.04, 0.6 | Compact flame, upward drift, quick decay |

## Flipbook defaults and pool policy

| Family | `FLIPBOOKS.DEFAULT_SIZES` | Default playback | Pool caps: High / Medium / Low |
|---|---:|---|---:|
| Impact smoke | 0.80 | One `wispy_smoke` or `cloud` billboard; 0.65–0.80s | 16 / 10 / 6 |
| Explosion | 3.20 | One explosion-family billboard; 0.75–0.90s | 6 / 4 / 2 |
| Muzzle | 0.50 | One 5-frame billboard; 0.08s | 6 / 4 / 2 |
| Fire | 1.20 | One fire/flame billboard; 0.80–1.00s | 8 / 4 / 2 |

Pool entries exist for concurrent world events. They must not be looped together for one event. A bullet impact uses one impact flipbook plus its optional decal; a grenade explosion uses one explosion-family flipbook plus the existing single light envelope; a muzzle shot uses one muzzle flipbook plus the optional single flare/static muzzle layer and the existing light.

The current `triggerFlash()` path must be checked for duplicate muzzle playback: `triggerNiagaraFlash()` already triggers `triggerMuzzleFlipbook()`, while `VFXOrchestrator.triggerFlash()` also calls `triggerMuzzleFlipbook()` afterward. Gemini must make one owner responsible for the flipbook trigger, not both.

## Weapon-family scale contract

These values are authored multipliers relative to the base constants and must be stored in the central VFX configuration, not inside individual weapon click handlers. They are visual calibration values, not gameplay damage values.

| Weapon family | Muzzle scale | Tracer length | Tracer width | Notes |
|---|---:|---:|---:|---|
| Pistol | 0.82 | 3.0 | 0.16 | Short, sharp flash; tracer is still an elongated core |
| SMG | 0.92 | 3.5 | 0.18 | Compact repeat-fire silhouette |
| Rifle | 1.00 | 4.0 | 0.18 | Baseline contract |
| LMG | 1.12 | 4.5 | 0.20 | Larger presence without a larger bloom |
| Shotgun | 1.18 | 2.6 | 0.18 | Short tracer segment; do not turn pellets into a dot wheel |

The tracer must read as a line with a brighter core near its middle or origin and a softer tail. A circular sprite is a contract failure. The muzzle must be attached to the weapon’s actual muzzle socket; never place it at the camera center as a shortcut.

## Composition and visual acceptance

At normal gameplay distance, each effect must have a clear source, a readable peak, and an intentional decay. The source should remain visible when the effect is removed. Smoke and dust use normal alpha and depth-aware fading; muzzle, explosion, fire, flare, static sparks, and tracer cores may use additive blending only where the asset family calls for it. Additive blending is not a substitute for contrast or opacity tuning.

A successful screenshot review must answer “too large or too small?” in relation to a weapon, player, wall, and ground contact. The attached calibration board is not a replacement for in-game review; it is a preflight check that prevents obvious scale errors before the live surface is tested. The final acceptance pass must use the actual repository camera and representative surfaces, at desktop and mobile where the effect is visible through the HUD.

## Gemini implementation instructions

Gemini must first refresh the repository and compare this document’s exact names and values with the latest `VFX_CONSTANTS`, `r2_assets_tracker.md`, `VFXOrchestrator.ts`, `firing.ts`, `hits.ts`, `large.ts`, and `flipbooks.ts`. If the latest repository has changed an asset name or source constant, Gemini must stop and report the mismatch rather than silently creating a second constant.

Implementation must keep effect ownership modular. `main.ts` may route an event but must not contain atlas coordinates, color curves, scale multipliers, or animation timelines. Every effect function must expose a small typed entrypoint and every per-frame function must preserve the zero-GC hot-loop rules. Do not remove Geckos.io, do not use the legacy WebGL renderer, and do not expose secrets or asset credentials.

## References

[1]: ../vexea-repo-motion-20260824/client/src/vfx/constants.ts "Current VEXEA VFX constants"
[2]: ../vexea-repo-motion-20260824/client/src/vfx/VFXOrchestrator.ts "Current VEXEA VFX orchestrator"
[3]: ../vexea-repo-motion-20260824/client/src/vfx/flipbooks.ts "Current VEXEA flipbook system"
[4]: ../vexea-repo-motion-20260824/client/src/vfx/firing.ts "Current muzzle and firing VFX"
[5]: ../vexea-repo-motion-20260824/client/src/vfx/hits.ts "Current sparks, dust, and decals"
[6]: ../vexea-repo-motion-20260824/client/src/vfx/large.ts "Current explosion-light layer"
[7]: ../vexea-repo-motion-20260824/r2_assets_tracker.md "Verified R2 VFX asset inventory"
[8]: ../vexea-repo-motion-20260824/ARCHITECTURE.md "VEXEA rendering and performance constraints"
