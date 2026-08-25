# Gemini Implementation Prompt: VEXEA Gameplay VFX and Internal UI Motion

## Instruction to Gemini

Treat this document and its two companion contracts as an implementation prompt from the user. Do not treat them as loose design suggestions. When the user gives the signal, pull the latest repository state first, create the requested branch, compare the contracts against the current code, and then implement only what is still valid for that latest state.

Companion contracts:

- `VEXEA_GAMEPLAY_VFX_CONTRACT.md`
- `VEXEA_UI_ANIMATION_CONTRACT.md`
- `VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md`
- `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`

Do not pull, branch, commit, push, or edit the repository before the user gives the signal. When the signal arrives, use the branch and remote workflow specified by the user at that time.

## Non-negotiable scope

The objective is to make reusable gameplay VFX and internal UI animation functions that can be dropped into the current VEXEA state without creating monolithic animation code. The final accepted UI set includes the matchmaking radial, horizontal loading bar, full-season battle-pass progression line, grey/white icon states, settings primitives, and accepted quiet ambient categories. Superseded visual experiments remain excluded.

Main-menu action cards are explicitly excluded. Do not touch their layout, hover, entry, selection, or transition behavior. The allowed UI targets are internal lobby surfaces, armory surfaces, stats sub-tabs, faction surfaces, store filters/catalogs, and contained transitions between those internal tabs or content bodies.

Gameplay VFX work covers the supplied and manifest-verified families: muzzle flash, static muzzle support, tracers, impact sparks, dust/smoke, decals, explosions, fire/flame, barrel smoke, static circles, static sparks, and transient light envelopes. “Use every provided effect” means every intended family receives a deliberate event path and quality policy. It does not mean every asset variant or pool slot is rendered simultaneously.

## Required reading and first actions after the signal

1. Pull the latest repository state and read `AGENTS.md`, `ARCHITECTURE.md`, `CODEBASE_INDEX.md`, the current `client/src/vfx/constants.ts`, `VFXOrchestrator.ts`, `firing.ts`, `hits.ts`, `large.ts`, `flipbooks.ts`, the current target screen owners, and the current asset tracker.
2. Compare every contract name, event, path, and numeric value with the latest source. If anything conflicts, stop that portion and report the mismatch. Do not silently create duplicate constants or stale aliases.
3. Register the planned edits in `CODEBASE_INDEX.md` before changing production files.
4. Run the existing lint/test baseline before implementation. Preserve unrelated worktree changes; never reset or overwrite them.
5. Establish a bounded preview fixture or equivalent screenshot path that invokes the real production modules. Do not use a fake duplicate implementation for visual review.

## Gameplay VFX implementation rules

All gameplay values must remain in the single source of truth `client/src/vfx/constants.ts`. Use the exact values in `VEXEA_GAMEPLAY_VFX_CONTRACT.md` unless a fresh screenshot or current-source mismatch proves a correction necessary. If a correction is made, record the reason and the before/after value in the codebase index.

`VFXOrchestrator.ts` may route events, but it must not become the home of atlas coordinates, color curves, scale tables, or per-effect timelines. Keep the ownership split:

| Responsibility | Module boundary |
|---|---|
| Event routing and quality preset selection | `VFXOrchestrator.ts` |
| Muzzle attachment, transient light, and one-shot trigger | `firing.ts` |
| Sparks, dust, decals, and contact alignment | `hits.ts` |
| Explosion light envelope | `large.ts` |
| Atlas material, frame selection, and flipbook pools | `flipbooks.ts` |
| Shared numeric constants | `constants.ts` |

Do not trigger one muzzle flipbook twice through two owners. Do not layer all 60/64 frames or all pool slots into one event. One authored event uses one flipbook billboard unless the composition contract explicitly adds one support layer or one light. Keep half-texel atlas insets, depth-write behavior, blend modes, and WebGPU/TSL material ownership consistent with the current path.

Tracers must remain elongated. Use the current warm/cool/white core assets as line-like billboards, with the family values in the gameplay contract. They must not degrade into circular dots. Muzzle flashes must be short, directional, and attached to the actual muzzle socket. Impact dust must read as a surface response, with the decal smaller than the dust envelope. Explosions must read as one authored event with a bounded light and smoke tail, not a pile of identical sprites.

Do not revive `EnvironmentalEffects.ts` as a competing active pipeline. Do not remove Geckos.io. Do not use legacy `WebGLRenderer`. Do not add allocations, object literals, array spreads, or temporary arrays in 60 Hz physics/network/VFX update paths where the architecture rules prohibit them. Do not print secrets or environment values.

## UI implementation rules

The public interface must follow the UI contract. At minimum, the shared module must expose typed functions equivalent to:

```ts
mountMatchmakingMotion(surface): MatchmakingMotionHandle;
mountCardEntryMotion(surface): void;
setSelectionMotion(surface, selected): void;
transitionTabContent(content, render): void;
clearSurfaceMotion(surface): void;
```

The queue controller owns the approved phases: entering fade and expansion, long sustain, match-found lock, and clean exit. Existing matchmaking events remain authoritative. `MATCHMAKING_STATUS` changes copy. `MATCH_FOUND` begins visual resolution and only then allows the existing game transition. The controller must not fabricate state or move networking logic into animation code.

The queue geometry must retain the target-traced structure: a large faint outer construction circle, smaller dominant primary ring, dense regular ticks with a small clear gap from that primary ring, three inner rings, full-length axes/diagonals, sparse registration nodes, and centered copy. The target-framed measurements in the companion UI contract are the starting values. Verify at the actual screenshot size and on mobile; do not replace them with a generic spinner or an arbitrary minimum stroke width.

Internal entry motion is local and one-shot: 360ms, `translateY(.38rem)`, opacity 0→1, 28ms stagger capped at five intervals, and the specified cubic-bezier easing. Selection frames are restrained: a 1px inset frame with the specified opacity breath; unselected items receive no motion. Stats and store transitions animate only the changed content body or catalog grid, not the entire application shell. Armory, faction, and lobby hooks target only their internal surfaces. The accepted loading-bar and battle-pass contract is in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`: loading keeps the horizontal carrier and real phase ownership; battle pass shows 51 tier positions, visible free and premium tracks, milestone prizes, nearest reward, and tier-50 key reward on desktop and mobile.

Every animation must have a reduced-motion branch. Mobile controls must remain separate from the effect stage. Preview fixtures may expose controls; production surfaces must not inherit preview-only labels or debug UI.

## Visual verification workflow

After implementation, render exact-size evidence for the queue entering, sustain, found, and mobile states, plus one screenshot for each eligible internal surface. Inspect the screenshots by eye. Check whether every effect is too large, too small, too opaque, too faint, too fast, too slow, or spatially detached from the thing it is supposed to explain.

Do not grade a composite using a reference image as its backing plate. Use raw source, authored overlay, and composite evidence separately. If the authored effect only looks correct on black or only looks correct when the source surface is hidden, it has failed integration review.

Before reporting success:

| Verification | Required outcome |
|---|---|
| TypeScript/lint | Pass |
| Relevant tests | Pass, with pre-existing warnings named explicitly |
| `git diff --check` | Pass |
| Main-menu diff | Empty |
| Queue evidence | Entering, sustain, found, mobile captured and inspected |
| Internal-surface evidence | Lobby, armory, stats, faction, store captured and inspected |
| Reduced motion | Static hierarchy remains correct |
| Repository hygiene | No secrets, no unrelated resets, no decoder churn left by tooling |
| Documentation | Constants, ownership, mismatches, and screenshot corrections registered |

If any item fails, report the exact file, line or command, and symptom. Do not call the work finished because the code compiles if the screenshots are wrong.

## Final handoff format

The implementation report must state:

1. Which latest commit was pulled and which branch was created.
2. Which gameplay effect families are live, which are manifest-available but still pending, and which exact contracts they use.
3. Which internal screens were wired and how main-menu exclusion was verified.
4. Which screenshots were inspected and what visual corrections were made.
5. Test/lint/build results and every known runtime limitation.
6. Commit and push identifiers only after the user has explicitly asked for the delivery step.

No score may be inflated by reference artwork, hidden overlays, or unverified composite states.

## Contract references

[1]: VEXEA_GAMEPLAY_VFX_CONTRACT.md "Gameplay VFX contract"
[2]: VEXEA_UI_ANIMATION_CONTRACT.md "Internal UI animation contract"
[3]: VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md "Reusable UI interaction contract"
[4]: VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md "Accepted loading and battle-pass contract"
[5]: ../vexea-repo-motion-20260824/CODEBASE_INDEX.md "Repository audit protocol"
[6]: ../vexea-repo-motion-20260824/ARCHITECTURE.md "Repository architecture constraints"
