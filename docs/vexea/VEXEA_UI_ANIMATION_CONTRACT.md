# VEXEA UI Animation Contract

**Status:** Accepted surface-motion contract. Shared UI presentation is owned by `VEXEA_UI_DESIGN_SYSTEM.md`; this document records only surface ownership, unique motion categories, and the boundary between screen semantics and reusable CSS.

## Governing rule

VEXEA uses vanilla HTML and TypeScript. Every recurring interaction is a shared CSS category. A screen owner provides semantic state and data; the stylesheet supplies the visual response. Do not create separate settings-tab, navigation-tab, icon, or ambient animation recipes. Main-menu action cards are explicitly excluded.

The authoritative stylesheet is `client/src/ui/styles/vexea-ui.css`. The thin binder is `client/src/ui/ui-motion.ts`. The binder applies classes, data attributes, measured underline bounds, and live CSS custom properties; it does not own animation timelines or duplicated inline transition strings.

## Surface ownership

| Surface | Shared category or unique motion | Owner |
|---|---|---|
| Main-menu action cards | None in this contract | Existing main-menu owner; unchanged |
| Main-menu utility icons | Shared icon state | `client/screens/main-menu.ts` |
| Lobby internals | Shared entry and selection frame | `client/screens/lobby.ts` |
| Armory internals | Shared icon, entry, selection frame, and value tween | `client/screens/armory-screen.ts` |
| Stats internals | One shared tab underline, local content entry, pentagon graph candidate, and battle-pass category | `client/screens/stats-screen.ts` |
| Factions | Shared icon, entry, selection frame, and faction edge | `client/screens/faction-screen.ts` |
| Store | Shared icon, filter underline/content entry, and catalog entry | `client/screens/store-screen.ts` |
| Settings | Same shared tab underline and control primitives as every other tab row | `client/src/settings/ui.ts` |
| Splash and match loading | Accepted horizontal loading-bar category | `client/screens/splash.ts`, `client/src/ui/LoadingScreen.ts` |
| Battle pass | Accepted full-season progression-line category | `client/screens/battle-pass-screen.ts`, `client/screens/stats-screen.ts` |
| Matchmaking queue | Unique long-form radial sequence | `client/screens/matchmaking-overlay.ts` plus a dedicated motion module |

A router may choose a screen, but it must not know card geometry, animation constants, or CSS state rules.

## Shared categories

The CSS-first design-system contract owns the following categories and their exact tokens: grey-to-white clickable icon state; one measured 1px underline for every tab row; local content entry; restrained selection frame; list contact; faction edge; armory value tween; pending skeleton sweep; background instrument trace; sliders; toggles; segmented controls; action buttons; input focus; keybinding capture; and settings entry/exit.

The shared tab underline is one category. Settings, stats, store, armory, and any future internal tab row use the same class and binder. The active label changes immediately; the measured line travels to the new title over `220ms`. Do not add a second navigation-specific or settings-specific variant.

## Approved matchmaking sequence

The matchmaking radial is the approved long-form reference. It is not a generic spinner. It uses a `460ms` surface fade, `920ms` radial expansion, a stable primary ring, an 18s inner counter-rotation, a 9s primary arc orbit, a 7s outer-boundary breath, a `620ms` found lock, a `760ms` terminal hold, and a `360ms` reverse exit. Reduced motion keeps the final hierarchy static.

The normalized field contains an outer circle at radius `49.2`, primary ring `37.0`, inner rings `24.7`, `18.3`, and `10.2`, tick band from `38.9` to `40.35`, 72 hairline ticks at 5° intervals, four registration nodes at `(15,15)`, `(85,15)`, `(15,85)`, `(85,85)`, and full axes/diagonals. The tick band must preserve a small clear gap from the primary ring. The primary ring is `rgba(225,229,227,.86)` at width `.62`; the moving arc is `rgba(239,241,240,.94)` at width `.72`; inner and outer structures are lower-opacity and subordinate. Exact queue state semantics remain event-driven by existing matchmaking events.

## Accepted loading and battle pass

The final accepted horizontal loading bar and full-season battle-pass progression line are specified only in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`. That document owns their exact geometry, timing, real runtime inputs, responsive behavior, reduced-motion behavior, and state semantics. Do not duplicate those values in this contract.

Loading keeps the horizontal carrier and receives real phase/progress updates. Battle pass shows 51 positions from tier 0 through 50, milestone prizes on free and premium tracks, nearest reward emphasis, and tier-50 key reward emphasis. Desktop is horizontal; mobile is vertical without casual horizontal scrolling.

## Graph status

The pentagon graph remains the only palatable stats-graph foundation identified during visual review. Its role is a five-attribute combat comparison, not a decorative instrument. This contract does not promote a new graph geometry beyond that foundation until a final graph candidate is explicitly approved and captured against the current stats surface.

## Public boundary

The shared CSS design system exposes visual classes and custom properties. The vanilla TypeScript binder may expose small typed functions equivalent to:

```ts
export function bindIconState(button: HTMLElement, icon: HTMLImageElement, disabled?: boolean): () => void;
export function bindTabs(nav: HTMLElement, content: HTMLElement, render: (id: string) => void): () => void;
export function bindContentEntry(content: HTMLElement): void;
export function bindSelection(element: HTMLElement, selected: boolean): void;
export function bindSlider(input: HTMLInputElement, value: HTMLElement): () => void;
export function bindToggle(toggle: HTMLButtonElement, checked: boolean, onChange: (value: boolean) => void): () => void;
export function bindLoadingBar(root: HTMLElement): LoadingBarMotionHandle;
export function bindBattlePass(root: HTMLElement): BattlePassMotionHandle;
export function mountMatchmakingMotion(surface: HTMLElement): MatchmakingMotionHandle;
```

The binders return cleanup functions. They do not own Firestore, audio, fullscreen, network, loading promises, claim authorization, premium purchase state, or screen routing. They must preserve keyboard and touch behavior, must not allocate per pointer event, and must not put style or animation timelines into `client/main.ts`.

## Verification boundary

The integration pass must compare every contract name and value with the latest repository before implementation. It must capture queue entering/sustain/found/reduced-motion states, internal surface states, accepted loading states, and battle-pass states at desktop and 390px mobile sizes. It must run lint, relevant tests, `git diff --check`, and confirm that main-menu action-card code is unchanged.

## References

[1]: VEXEA_UI_DESIGN_SYSTEM.md "Authoritative CSS-first UI design-system contract"
[2]: VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md "Accepted loading-bar and battle-pass contract"
[3]: ../../client/screens/matchmaking-overlay.ts "Current matchmaking surface owner"
[4]: ../../client/screens/stats-screen.ts "Current stats and battle-pass owner"
[5]: ../../client/screens/battle-pass-screen.ts "Current dedicated battle-pass owner"
[6]: ../../client/screens/splash.ts "Current splash loading owner"
[7]: ../../client/src/ui/LoadingScreen.ts "Current match-entry loading owner"
[8]: ../../client/src/map/LoadingOrchestrator.ts "Current loading phase owner"
