# VEXEA UI Animation Contract

**Status:** Accepted visual directions for matchmaking, loading, battle-pass progression, icons, settings, and quiet ambient interactions; repository delivery is intentionally deferred until the user gives the signal.

**Purpose:** Define a reusable animation layer for internal VEXEA surfaces without hardcoding motion into `client/main.ts` or turning each screen into a monolith. The approved matchmaking sequence is the reference implementation. The same discipline applies to lobby internals, armory, stats, factions, store, and contained tab/filter transitions. Main-menu action cards are explicitly excluded.

**Visual decision update:** The pentagon graph direction, final horizontal loading-bar direction, and final full-season battle-pass progression direction are accepted. The earlier calibration-spine, contour/transfer, wake-field, crest, rail, ledger, docket, and card-grid experiments remain rejected historical candidates and must not be implemented. The accepted icon, settings, and quiet-ambient primitives are owned by `VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md`. Exact loading and battle-pass geometry is specified in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

> **Design law:** Subtlety, elegance, nuance. Motion supports the existing screen surface. It must not invent a new dashboard, add decorative glow for its own sake, or make every detail equally loud.

## Ownership and scope

| Surface | Allowed motion | Owner |
|---|---|---|
| Main menu action cards | **None in this contract** | Existing main-menu owner remains unchanged |
| Lobby internals | Class-card entry and selected class frame | `client/screens/lobby.ts` |
| Armory internals | Category-tab entry, equipment-slot entry, selected loadout frame | `client/screens/armory-screen.ts` |
| Stats internals | Sub-tab content transition and active-tab treatment | `client/screens/stats-screen.ts` |
| Factions internals | Faction-panel entry and active-affiliation frame | `client/screens/faction-screen.ts` |
| Store internals | Filtered catalog entry after category change | `client/screens/store-screen.ts` |
| Root-screen navigation | Existing root fade remains the owner; do not centralize these effects here | `client/screens/screen-manager.ts` |
| Matchmaking queue | Long-form system sequence and found-state resolution | `client/screens/matchmaking-overlay.ts` + dedicated motion module |
| Splash and match loading | Horizontal progress carrier, phase updates, terminal hold | `client/screens/splash.ts` / `client/src/ui/LoadingScreen.ts` + loading-bar motion module |
| Battle pass | Full-season progression line, free/premium tracks, nearest and finale reward emphasis | `client/screens/battle-pass-screen.ts` / `client/screens/stats-screen.ts` + battle-pass motion module |

A screen owner mounts motion immediately after it creates the eligible internal children. A global router may select a screen, but it must not know card geometry, atlas coordinates, timing curves, or visual constants.

## Public motion interface

The reusable module must expose typed, small functions. The exact interface is:

```ts
export type MatchmakingMotionState =
  | 'entering'
  | 'sustaining'
  | 'found'
  | 'exiting';

export interface MatchmakingMotionHandle {
  setState(state: MatchmakingMotionState): void;
  setStatus(text: string): void;
  destroy(): void;
}

export function mountMatchmakingMotion(surface: HTMLElement): MatchmakingMotionHandle;
export function mountCardEntryMotion(surface: HTMLElement): void;
export function setSelectionMotion(surface: HTMLElement, selected: boolean): void;
export function transitionTabContent(content: HTMLElement, render: () => void): void;
export function clearSurfaceMotion(surface: HTMLElement): void;

export interface LoadingBarMotionHandle {
  setProgress(value: number): void;
  setPhase(label: string): void;
  complete(): void;
  destroy(): void;
}

export function mountLoadingBarMotion(root: HTMLElement): LoadingBarMotionHandle;

export type BattlePassMotionState = 'rest' | 'revealing' | 'settled';

export interface BattlePassMotionHandle {
  setState(state: BattlePassMotionState): void;
  setCurrentTier(tier: number): void;
  setPremiumOwned(owned: boolean): void;
  destroy(): void;
}

export function mountBattlePassMotion(root: HTMLElement): BattlePassMotionHandle;
```

`mountMatchmakingMotion` requires a `[data-mm-panel]` element and uses a dedicated controller-owned SVG system. It returns a handle so the surface owner can drive state without reaching into CSS internals. `mountCardEntryMotion` operates only on direct children of the surface passed to it. `setSelectionMotion` marks one eligible internal item. `transitionTabContent` wraps the existing render callback; it does not own tab state. `clearSurfaceMotion` removes motion attributes when a surface is disposed.

The API must not accept arbitrary style objects, effect-specific geometry blobs, or a global registry of unrelated animations. Those shapes encourage hardcoding and make screenshot review impossible to reason about.

## Approved matchmaking sequence

The queue is a long-duration waiting state. The user should see a quiet construction field first, discover more details during the wait, and receive a clear visual resolution when the server reports a match. The animation is not a spinner.

| Phase | Duration / cadence | Behavior | Exit condition |
|---|---:|---|---|
| Enter | 460ms surface fade; 920ms system expansion | Surface fades in; radial field grows from 0.58 to 1.015 and settles at 1.0 | Mount or queue entry |
| Sustain | Up to 60s | Primary ring remains stable; inner group counter-rotates over 18s; primary arc orbits over 9s; outer boundary breathes over 7s | `MATCH_FOUND` or cancel |
| Found lock | 620ms lock pulse; 760ms owner hold before game transition | Primary arc becomes longer and faster; system settles with a small 1.018 scale emphasis | Existing `MATCH_FOUND` event |
| Exit | 360ms reverse | Surface and system reverse the entry envelope when cancelled or removed | Cancel / cleanup |
| Reduced motion | Immediate static state | Disable all keyframes; preserve final hierarchy and selected state | `prefers-reduced-motion: reduce` |

The existing reliable event flow remains authoritative. `MATCHMAKING_STATUS` updates text only. `MATCH_FOUND` calls the resolver owned by `matchmaking-overlay.ts`, which sets `found`, waits the 760ms resolution window, removes the overlay, and then opens the game screen. The queue animation must never fabricate a match or replace server state.

## Matchmaking geometry contract

The system is authored in a normalized 0–100 SVG viewBox so its proportions survive desktop and mobile. These values were traced from the 979×814 target-framed screenshot and must not be replaced with generic circle defaults.

| Element | Normalized value | Visual role |
|---|---:|---|
| Outer construction circle | radius 49.2 | Very large, faint boundary; may clip near the stage edge |
| Primary ring | radius 37.0 | Dominant continuous structural ring |
| Inner ring 1 | radius 24.7 | Faint interior cadence |
| Inner ring 2 | radius 18.3 | Faint interior cadence |
| Inner ring 3 | radius 10.2 | Smallest visible construction ring |
| Tick inner radius | 38.9 | Starts just outside the primary ring |
| Tick outer radius | 40.35 | Ends with a narrow visible gap from the primary ring; never touches it |
| Registration nodes | (15,15), (85,15), (15,85), (85,85) | Four small diagonal construction anchors |
| Axis endpoints | Horizontal/vertical full field; diagonals 15→85 | Faint, full-length construction lines |

The tick band contains **72 marks at 5° increments**. The marks are hairline, short, and regular. They must not become a circular dot wheel, a thick saw blade, or a large gap away from the primary ring. The correct relationship is “measuring instrument around the ring,” with a small dark separation clearly visible at the target frame.

## Matchmaking contrast contract

Contrast carries the hierarchy. Opacity values are not interchangeable with arbitrary glow or blur.

| Layer | Stroke / visual value | Motion rule |
|---|---:|---|
| Primary ring | `rgba(225,229,227,.86)`, width `.62` | Stable; this is the strongest structure |
| Moving primary arc | `rgba(239,241,240,.94)`, width `.72` | 34/198 dash in sustain; 78/154 in found |
| Tick marks | `rgba(222,226,224,.56)`, width `.42` | Stable measurement band |
| Outer circle | `rgba(213,219,217,.40)`, width `.46` | Slow 7s breathing only |
| Inner ring 1 | `rgba(202,210,207,.22)`, width `.34` | Counter-rotate with inner group |
| Inner ring 2 | `rgba(202,210,207,.22)`, width `.34` | Counter-rotate with inner group |
| Inner ring 3 | `rgba(202,210,207,.38)`, width `.42` | Counter-rotate with inner group |
| Axes | `rgba(210,216,214,.18)`, width `.32` | Static, full length |
| Nodes | `rgba(219,224,222,.62)`, radius `.42` | Static registration points |

The field must remain legible over the actual screen substrate without a broad opaque mask. The overlay should not hide the source screen merely to make the authored geometry look stronger.

## Center copy and status

The center copy is part of the measured geometry. Use `QUICK MATCH` as the title and keep it centered on the same 50/50 origin as the radial system. At the target-framed 979×814 capture, the title is approximately 36px high in the condensed face; use a responsive clamp that preserves this proportion rather than a fixed mobile size. Supporting status is small and quiet: `FACILITY / 1–10 / MIN 4` is the preview format, while live queue values come from `MATCHMAKING_STATUS`.

The cancel control is the only interactive control in the production overlay. It sits below the radial field, not over the center copy, and must retain a mobile-safe hit area. Preview controls used for screenshot inspection are not production UI.

## Accepted loading-bar contract

The loading bar remains the sole primary loading object. `splash.ts` keeps its existing 7.50rem by 2px carrier and real preload completion. `LoadingScreen` keeps its phase and progress interface, while the shared loading-bar helper owns only the leading head, one-shot sheen, and terminal hold. The match-entry orchestrator remains authoritative for cache, asset, audio, VFX, map, combat, shader, and server-ready phases. The helper must never fabricate progress or add a replacement object. Exact values and responsive rules are in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

## Accepted battle-pass progression contract

The battle pass uses one full-season progression line with 51 tier positions from 0 through 50. Reward marks attach to the existing reward milestones on both the free and premium tracks. The current position, closest reachable reward, and tier-50 key reward have distinct hierarchy; empty tiers remain measured ticks. Desktop is horizontal, mobile is vertical, and no casual horizontal scrolling or card-grid reordering is permitted. Exact values, state semantics, and ownership are in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

## Internal entry transition contract

Internal cards, panels, and catalog items may enter with a small physical movement tied to their existing layout.

| Parameter | Value |
|---|---:|
| Entry duration | 360ms |
| Initial offset | `translateY(.38rem)` |
| Initial opacity | 0 |
| Final opacity | 1 |
| Easing | `cubic-bezier(.22,.72,.2,1)` |
| Stagger | 28ms per direct child |
| Stagger cap | 5 intervals |

The entry is a one-time presentation of newly created internal content. It must not loop, scale cards aggressively, or move the card away from its actual surface. The lobby class grid, armory slot row, faction panels, and store catalog grid are valid targets. The main-menu action-card grid is not.

## Selection-frame contract

A selected internal item receives a restrained perimeter frame, not a glowing badge. The existing selected color and state text remain authoritative.

| Parameter | Value |
|---|---:|
| Frame inset | 4px inside the selected item |
| Frame stroke | `1px solid rgba(224,228,226,.62)` |
| Breath cadence | 2.8s ease-in-out |
| Breath opacity | .42 → .72 → .42 |
| Selected state | `data-motion-selection="selected"` |
| Unselected state | Attribute removed; no animation |

The frame must not change the layout footprint or create a second competing border. Do not add bloom, particle sprites, orange outlines, or permanent motion to unselected items.

## Contained tab and filter transitions

Stats sub-tabs and store/armory category filters own their state and rendering. The shared helper only wraps the content replacement.

| Parameter | Value |
|---|---:|
| Content transition duration | 240ms |
| Initial offset | `translateY(.22rem)` |
| Initial opacity | 0 |
| Final opacity | 1 |
| Easing | `cubic-bezier(.22,.72,.2,1)` |
| Trigger | Existing tab/filter click and re-render |
| Scope | New content body or catalog grid only |

Do not fade the complete application shell for an internal tab change. Do not animate the main-menu navigation cards. Do not move the selected tab underline away from the existing button; the tab-content transition supplies the motion while the button state remains immediate and clear.

## Mobile and accessibility rules

The stage and controls must be separate. Production cancel controls sit below the radial field in the overlay flow; screenshot-preview state buttons are not a production pattern. The radial field uses `min(82vw, 94vh, 56rem)` with a lower bound that keeps the construction system readable without forcing a horizontal scroll. Internal surfaces stack naturally below the queue field on narrow screens.

All keyframes have a reduced-motion branch. When reduced motion is requested, keep the final hierarchy and selected frame but remove rotation, breathing, expansion, and stagger. Interactive elements retain their existing keyboard and pointer behavior. The motion module must not capture input, change ScreenGate policy, or alter server/network timing except for the visual found-state hold explicitly owned by the matchmaking overlay.

## Integration examples

The production screen owners should follow this pattern:

```ts
const classCardsContainer = document.createElement('div');
// create internal lobby cards here
mountCardEntryMotion(classCardsContainer);

cards.forEach((card, index) => {
  setSelectionMotion(card, index === selectedClassIdx);
});
```

Stats should keep its existing render callback and use:

```ts
transitionTabContent(contentBody, () => {
  contentBody.innerHTML = '';
  renderActiveStatsView(contentBody, registeredUserData);
});
```

Matchmaking should remain event-driven:

```ts
const motion = mountMatchmakingMotion(backdrop);
// MATCHMAKING_STATUS -> motion.setStatus(...)
// MATCH_FOUND -> motion.setState('found'), then resolve and transition
```

These examples are contracts, not invitations to duplicate the implementation in every screen. Shared behavior belongs in the motion module. Screen-specific state remains in the screen owner.

## Acceptance criteria

The contract is accepted only when a fresh screenshot review confirms that the implementation:

1. Uses the actual internal screen surface and does not invent a main-menu card treatment.
2. Shows a visible primary ring, a regular dense tick band with a small gap, faint but discoverable inner construction, a large outer boundary, and full-length axes.
3. Distinguishes entering, sustain, found, and reduced-motion states without turning the queue into a spinner.
4. Keeps the selected frame restrained and does not add glow for its own sake.
5. Keeps tab/filter motion local to the changed content body or grid.
6. Remains readable at 390px mobile width with controls separated from the effect field.
7. Passes `npm run lint`, the relevant Vitest suite, and `git diff --check`.
8. Leaves `client/main.ts` as a router of existing events rather than a container for animation constants.
9. Leaves main-menu action-card code unchanged.
10. Uses the accepted horizontal loading bar without replacing it with a separate progress object.
11. Shows all 51 battle-pass tier positions, free and premium tracks, the nearest reward, and the tier-50 key reward without a card grid or rail dependency.

## Gemini implementation instructions

When the user gives the repository signal, Gemini must pull the latest repository first, then compare this contract with the current screen modules and `CODEBASE_INDEX.md`. If a source surface, event name, asset name, or constant has changed, Gemini must report the mismatch before implementing. It must not blindly paste stale code into a newer branch.

Gemini must keep these documents as implementation guidance and use the exact values unless screenshot review proves a target-specific correction necessary. Any correction must be recorded beside the value and verified at desktop and mobile sizes. The queue implementation must remain in its dedicated module; internal surface functions must remain reusable; `client/main.ts` must only route existing events. No monolithic index animation, no main-menu card motion, no renderer fallback changes, no Geckos.io removal, and no R2 guard bypass.

## References

[1]: ../vexea-repo-motion-20260824/client/src/ui/animations/matchmaking-motion.ts "Target queue motion module"
[2]: ../vexea-repo-motion-20260824/client/src/ui/animations/surface-motion.ts "Reusable internal surface motion module"
[3]: ../vexea-repo-motion-20260824/client/screens/matchmaking-overlay.ts "Matchmaking surface owner"
[4]: ../vexea-repo-motion-20260824/client/main.ts "Existing matchmaking event routing"
[5]: ../vexea-repo-motion-20260824/client/screens/lobby.ts "Lobby internal selection surface"
[6]: ../vexea-repo-motion-20260824/client/screens/armory-screen.ts "Armory internal selection surface"
[7]: ../vexea-repo-motion-20260824/client/screens/stats-screen.ts "Stats contained sub-tab surface"
[8]: ../vexea-repo-motion-20260824/client/screens/faction-screen.ts "Faction internal affiliation surface"
[9]: ../vexea-repo-motion-20260824/client/screens/store-screen.ts "Store internal filter surface"
[10]: ../vexea_contracts/assets/queue_target_framed_v2.png "Visually verified target-framed queue reconstruction"
[11]: ../vexea_contracts/assets/queue_tick_gap_final.png "Visually verified narrow tick-to-ring gap"
