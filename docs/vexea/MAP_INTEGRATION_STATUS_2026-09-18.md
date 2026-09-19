# Map Integration — Status & What's Left (2026-09-18)

Branch: `agent/facility-glb-map-integration` (rebased onto `main` @`dc8057a`).

## Why this branch exists

The authoring session that produced this work was cut off by an upstream quota
exhaustion (`RESOURCE_EXHAUSTED 429`) before it could branch, commit, or push.
The edits below were sitting uncommitted in the working tree. This branch is the
recovery: it captures exactly that work so it can be reviewed and continued
rather than re-derived.

## What was integrated

Goal: get a real map rendering in-game for a demo gameplay video. The game
previously rendered only a flat dark plane plus a procedural centerpiece — every
`meshFile` in the spec was `null` and there were zero GLB assets in
`client/public/assets/maps/map_1/`.

| File | Change |
|---|---|
| `client/public/assets/maps/map_1/facility-v3.glb` | **New** — 743,644 B, 12 merged meshes / 12 materials, copied from `vexea-authoring/artifacts/` |
| `shared/maps/map_1_facility.spec.json` | Added top-level `"sceneGlb": "facility-v3.glb"` |
| `client/src/map/MapLoader.ts` | Scene-level GLB loading, authoring lighting rig, procedural ground noise, dispose path |
| `docs/vexea/MAP_INTEGRATION_PLAN_2026-09-18.md` | **New** — the recovered integration plan (verbatim) |

`MapLoader.ts` in detail:

- `MapSpec` gains `sceneGlb?: string`.
- `load()` adds `sceneGlb` to `uniqueMeshes` so the `GLTFLoader` path loads it.
- `buildScene()` places the whole GLB group at world center `(wX/2, 0, wZ/2)` and
  skips the procedural centerpiece when `sceneGlb` is present.
- `createNoiseTexture(mean, amp, seed)` — deterministic LCG-seeded value-noise
  canvas texture, ported from the authoring `viewer.html` ground bake.
- `setupEnvironment()` — warm asphalt ground `0x7b7567`, noise + roughness maps,
  ground plane expanded to `max(wX,2200) x max(wZ,1800)`, overcast sky
  `0xa8bdd2`, `FogExp2(0xa8bdd2, 0.0007)`, raking sun `0xfff2dd` intensity `1.8`
  at `(-450+wX/2, 380, 320+wZ/2)`, hemisphere fill `0.35`.
- `dispose()` releases `groundMap` / `groundRoughnessMap`.

## Verified

- `map-registry.ts` already declares
  `assetDirectory: 'client/public/assets/maps/map_1/'`, which matches the copy
  destination. `MapLoader.load()` strips the `client/public/` prefix to build the
  browser URL. **No registry change required** (plan step 5 closed).
- The GLB is fetched through `getCachedOrFetchUrl('/assets/maps/map_1/facility-v3.glb', 'Asset')`
  under a `try/catch` that falls back to the direct public URL, so no
  `MODEL_MANIFEST` / `ASSET_STRUCTURE` entry is strictly required for it to load.
- TypeScript typecheck: `npx tsc --noEmit` exits **0** on the codespace
  (`supreme-space-train-7vr496j4wwxxfx5p7`) — run it there, this VM exhausts its heap. That gate
  found and fixed a build-breaking `error TS2339` at `MapLoader.ts:366` (`.getHex()` called on a
  number literal instead of the `SKY` colour) which the interrupted session had reported as passing.
  See the Cycle entry in `CODEBASE_INDEX.md`.
- **Not** verified: the integration has never been rendered in a browser. No build, test-suite, or
  render-gate result is claimed for it.

## What's left

Ordered, most-blocking first for the demo video.

1. **In-browser visual confirmation** — the integration has never been rendered
   in a browser. Build the client and confirm the GLB actually appears before
   anything else. (The VM cannot run heavy builds; use the codespace.)
2. **Spawn point alignment** — the player spawns at `(384, 5, 10)`, the south
   edge of the 768x768 spec world. The authoring blockout spawn is `(-290, 190)`
   origin-centered, i.e. `(94, 510)` in spec coordinates. Acceptable for a demo
   (open ground) but worth correcting if the video shows the camera start.
3. **Coordinate scale mismatch** — authoring is `920 x 640` m, the spec is
   `768 x 768` m, so the GLB renders roughly 17% larger than the spec zone
   bounds. Physics colliders are derived from spec `buildings[]`, not the GLB, so
   colliders are approximate against the visible mesh. Fine for a demo; see
   Phase 2 of the plan for the two reconciliation options.
4. **Lighting polish** — `setupEnvironment()` approximates the authoring rig but
   the tuning table in the plan (Phase 3) was not fully applied: shadow maps are
   still disabled (`castShadow = receiveShadow = false` on the scene GLB), IBL is
   the HDR path rather than `RoomEnvironment` PMREM @ 0.04, and tone mapping is
   unset against a target of ACES Filmic @ exposure 0.85.
5. **Ground noise parity** — the noise bake is ported, but albedo amplitude
   should be checked against the authoring value (mean `0.75 +/- 0.05`) in-game.
6. **Character poses — not started.** The user scoped this explicitly: map first,
   poses next. This is the remaining blocker for the demo video.
7. **HDRI absent from the game client cache** — `qwantani_dusk_2_puresky_4k.hdr`
   is expected to 404 and fail gracefully; the overcast sky colour is set before
   the HDR attempt so the fallback is already correct.

## Separate, unrelated open item (not this branch)

`vexea-authoring` ground-v2 render gate still fails: `dark 0.009 < 0.01`
(mass 0.347, contrast 173, luma 12-185). Tracked in that repo's
`HANDOFF-map-authoring.md`. It does not affect the game client integration.
