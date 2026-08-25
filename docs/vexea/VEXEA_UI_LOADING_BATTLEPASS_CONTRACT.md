# VEXEA Loading and Battle-Pass Motion Contract

**Status:** Accepted visual candidates; ready for implementation guidance after current-repository comparison. This document supersedes the earlier rejected calibration-spine, contour, transfer-assembly, wake-field, crest, rail, ledger, and docket experiments. It describes the final accepted loading-bar and full-season progression-line directions only.

**Scope:** Splash loading, match-entry loading, exit/loading return states, and the internal battle-pass surface. Main-menu action cards remain out of scope. The loading and battle-pass visuals are separate shared categories; they are not a reason to add screen-local timelines or to place animation code in `client/main.ts`.

## Governing visual rule

The final accepted directions use the available surface honestly. Loading keeps the existing horizontal progress bar because that is the correct use of the available space and is driven by real work. Battle pass uses one full-season progression line with reward points attached to actual tier positions; it does not use a card grid or a casual carousel.

> **Design law:** A progress carrier should communicate progress first and earn its authored detail through timing, stroke discipline, and state change—not through extra panels, explanatory copy, or decorative objects.

## Loading bar

### Existing runtime contract

The splash owner currently uses a 7.50rem by 2px horizontal bar. It advances from actual preload completion, then fades after completion before the user can initialize. The match-entry owner uses `LoadingScreen` and `LoadingOrchestrator`. Real stages are `CHECKING CACHE`, `DOWNLOADING ASSETS`, `PRELOADING AUDIO`, `PRELOADING VFX TEXTURES`, `BUILDING MAP`, `LOADING COMBAT ASSETS`, `PREWARMING SHADERS`, and `WAITING FOR SERVER`. The visual layer must never invent a percent while the server-ready phase is waiting.

### Shared motion behavior

The horizontal track remains the sole primary object. The fill responds directly to the real progress value. A 1px leading head identifies the active edge. One narrow, low-opacity sheen passes through the fill once during a meaningful progress movement; it is not a loop and does not leave a trail. The final state holds the measured fill and removes the sheen. Phase text may update immediately from the existing owner, but no new dashboard, route, station, box, spinner, or replacement object is introduced.

| Token | Value | Role |
|---|---:|---|
| Track height | `5px` in the approval fixture; preserve the existing owner’s `2px` splash bar when integrating there | The carrier remains a line, not a panel |
| Track color | `#202827` | Quiet unfilled substrate |
| Fill gradient | `#C9D0C8 → #F4F5F1 → #C77C3B` | Neutral progress with a restrained warm terminal end |
| Leading head | `1px × 13px` | Active edge only; no bloom wall |
| Fill response | direct to progress | Never lags behind real work |
| Approval replay | `1,500ms` to `72%` | Preview-only test of the authored carrier |
| Pass-through sheen | `650ms`, delayed `520ms` in preview | One narrow pass; opacity returns to zero |
| Terminal hold | persistent final width | Do not continue animating while `WAITING FOR SERVER` |
| Reduced motion | static measured fill and phase text | Remove sheen and transitions; preserve state |

For production, the exact `2px` splash height and existing percentage calculation remain source-owned. The preview’s 5px track is a visual calibration surface for the match-entry overlay; it must not be copied into the splash without a screenshot review.

### Ownership and interface

`client/screens/splash.ts` continues to own splash preload progress and click-to-initialize timing. `client/src/ui/LoadingScreen.ts` owns the shared match-entry overlay and its `setPhase(label)` and `setProgress(loaded, total)` interface. `client/src/map/LoadingOrchestrator.ts` remains the authority for phase changes and real progress. A shared visual helper may expose:

```ts
export interface LoadingBarMotionHandle {
  setProgress(value: number): void;
  setPhase(label: string): void;
  complete(): void;
  destroy(): void;
}

export function mountLoadingBarMotion(root: HTMLElement): LoadingBarMotionHandle;
```

The helper owns classes, CSS variables, and the one-shot sheen lifecycle. It must not own preload promises, server timeouts, asset fetches, or fake progress. The `WAITING FOR SERVER` phase may hold the final bar state until the existing server event or timeout resolves.

## Battle pass

### Existing data contract

The current shared season is `BP_SEASON_01`, with indices `0` through `50` inclusive, producing **51 tier positions**. Each tier requires `index * 10` cumulative XP. Existing free-track reward milestones are tiers `5, 10, 15, 20, 25, 30, 35, 40, 45, 50`; the current shared model reserves `premiumReward` for additive future data. The visual contract must show a premium track at the same tier positions so a purchased pass has a defined visual home. Gemini must compare the premium data shape with the latest repository before wiring claims.

The approval candidate uses current XP `120`, current tier `12`, nearest reward tier `15`, and season finale tier `50`. Those values are preview fixtures for visual inspection; production derives them from user data and `calculateLevelMetrics`/battle-pass state rather than hardcoding them.

### Composition

Desktop uses one horizontal line spanning the complete season from tier 0 to tier 50. Every tier position is represented by a measured tick. Only reward milestones receive reward marks. The free track sits above the line; the premium track sits below it. The closest reachable reward is the only warm local focal point, while the tier-50 key reward remains visible at the far endpoint with a distinct but calm terminal treatment. The free and premium tracks must remain visually separate even when the account has not purchased premium.

Mobile uses the same tier order as a vertical progression line. The free and premium reward marks occupy separate lateral lanes around the line. The nearest reward remains apparent without scrolling sideways, and the tier-50 key reward remains the terminal station. The implementation must test the actual final tier bounds and may not rely on a horizontal overflow container.

| Token | Value | Role |
|---|---:|---|
| Tier positions | `51` (`0..50`) | Full season geometry |
| Free reward tiers | `5,10,15,20,25,30,35,40,45,50` | Existing shared free milestones |
| Premium reward tiers | Same milestone positions in preview | Additive purchased-track home; verify latest data before claims |
| Preview current tier | `12` | Current position between tiers 10 and 15 |
| Preview nearest reward | `15` | Primary local focal point |
| Preview finale | `50` | Key reward remains visible at terminal point |
| Desktop line | `1px` base, `3px` reached free segment, `1px` premium segment | Three weights only |
| Desktop reward marks | `31px` base / `43px` nearest / `50px` finale | Deliberate size hierarchy |
| Mobile spine | `1px` base, `3px` reached free segment, `1px` premium segment | Same hierarchy rotated to vertical |
| Full-season reveal | `1,100ms` | One-time line reveal |
| Premium reveal delay | `220ms` | Subordinate to free line |
| Current marker reveal | `260ms` after line | Identifies actual current position |
| Reward mark reveal | `380ms` per milestone with bounded stagger | Do not animate on scroll or every render |
| Nearest/finale labels | one label per semantic focal point | Never duplicate labels for free and premium marks |

### State rules

Claimed rewards are quiet and completed. The nearest reward is `READY` only when the production account can claim it; the fixture uses a focal treatment to make the nearest position apparent, not to authorize claim logic. Future premium-lock state is visually distinct from an unearned free reward, but both remain subordinate to the current/nearest reward. The finale receives a stronger outline and mark, not a large card or persistent pulse.

No tier card may enter or reorder on scroll. No rail may auto-scroll to the current tier. The full line is visible at the intended surface size; at mobile, the vertical version may use the page’s natural vertical space but must remain a single progression surface.

### Ownership and interface

`client/screens/battle-pass-screen.ts` and the `renderBattlePassView` owner inside `client/screens/stats-screen.ts` own season data, claim state, and semantic labels. A shared motion helper owns the progression-line reveal and reward-mark state classes:

```ts
export type BattlePassMotionState = 'rest' | 'revealing' | 'settled';

export interface BattlePassMotionHandle {
  setState(state: BattlePassMotionState): void;
  setCurrentTier(tier: number): void;
  setPremiumOwned(owned: boolean): void;
  destroy(): void;
}

export function mountBattlePassMotion(root: HTMLElement): BattlePassMotionHandle;
```

The helper receives measured tier elements or data attributes from the screen owner; it does not own Firestore writes, claim authorization, premium purchase state, or season generation. It must not use `innerHTML` re-rendering as a substitute for state-safe class updates when a user claims a reward.

## Reduced motion and verification

Under reduced motion, loading displays its current measured fill and phase without the sheen; the battle pass displays the complete line and final state immediately, with no staged reward reveals. Pointer and keyboard behavior remain unchanged.

Verification must include: initial rest, mid-reveal, settled state, replay after completion, a current-tier change, premium-disabled and premium-enabled visual states, 390px width, and desktop width. Check that the loading bar never creates horizontal overflow and that the battle-pass line retains exactly 51 tier positions, 10 free reward positions, 10 premium reward positions, a visible nearest reward, and a visible finale. Check `git diff --check`, lint, and the relevant tests after repository integration.

## Explicit exclusions

The earlier calibration spine, contour/transfer assembly, facility wake, season crest, cut-corner rail, progression ledger, docket, card grid, and carousel concepts are rejected historical candidates. They are not fallback implementations and must not be revived under a new name.

## References

[1]: ../vexea-ui-refresh-20260825/client/screens/splash.ts "Fresh repository splash loading owner"
[2]: ../vexea-ui-refresh-20260825/client/src/ui/LoadingScreen.ts "Fresh repository shared loading overlay"
[3]: ../vexea-ui-refresh-20260825/client/src/map/LoadingOrchestrator.ts "Fresh repository match loading phases"
[4]: ../vexea-ui-refresh-20260825/shared/battle-pass.ts "Fresh repository battle-pass season model"
[5]: ../vexea-ui-refresh-20260825/client/screens/stats-screen.ts "Fresh repository stats and battle-pass owner"
[6]: ../vexea_ui_redesign_gauntlet_v7.html "Accepted loading and full-season progression approval fixture"
[7]: ../vexea_contracts/VEXEA_UI_ANIMATION_CONTRACT.md "Shared internal UI motion contract"
