# VEXEA UI Design-System Interaction Contract

**Status:** Ready for implementation guidance after visual preflight. This document covers reusable icon-state, settings-control, accepted quiet-ambient primitives, and the design-system ownership boundary for the accepted loading-bar and battle-pass motion categories. It does not authorize one-off screen effects, and it does not touch main-menu action cards. Exact loading and battle-pass values live in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

## Design-system ownership rule

Every recurring interaction belongs to a prespecified design-system category. A screen may select a category and provide semantic state, but it may not invent a new hover, press, toggle, slider, tab, or icon animation in its own file. A one-off is acceptable only when the surface has a genuinely unique communication problem and the exception is recorded with a reason, owner, timing, and visual approval.

The design system owns tokens and behavior. Surface owners own data, event wiring, and which element is selected. `client/main.ts` owns neither interaction styling nor animation timelines.

## Monochrome clickable icon states

The current production SVG assets are mostly hardcoded white fills, while several wrappers force the same white treatment with `filter: brightness(0) invert(1)`. That makes resting icons louder than their context and means wrapper text color does not actually control the `<img>`.

The reusable `.vexea-icon-button` state is:

| State | Icon appearance | Wrapper appearance | Duration |
|---|---|---|---:|
| Resting | White source asset at `opacity: .55` | `color: rgba(228,234,230,.55)` | — |
| Hover | `opacity: 1` | `color: #F1F2EF` | 180ms |
| Keyboard focus | `opacity: 1` plus a 1px offset focus rule | `color: #F1F2EF` | 180ms |
| Pressed | `opacity: 1`, `translateY(1px)` only while active | `color: #F1F2EF` | 90ms down / 140ms release |
| Disabled | `opacity: .24` | `color: rgba(228,234,230,.24)` | No motion |

The preferred implementation uses the SVG as an image with opacity and transform on the image itself. Do not use a broad `brightness(0) invert(1)` filter on a white SVG unless the asset’s source fill requires normalization. Do not add scale-up, glow, bounce, ripple, or travel to a routine icon. `mouseenter` is an enhancement; pointer and keyboard activation must produce the same state without hover.

The state contract applies to clickable utility icons, internal screen icon tabs, armory equipment icons, faction icons, store item icons, fullscreen/messages/friends/settings controls, and similar controls. It does **not** apply to the main-menu action-card surfaces.

The icon source can remain white for now. If the asset pipeline later converts these SVGs to `currentColor`, keep the same state tokens and remove the opacity workaround without changing the public interaction API.

```ts
export type IconInteractionState = 'resting' | 'hover' | 'focus' | 'pressed' | 'disabled';
export function bindIconState(button: HTMLElement, icon: HTMLImageElement, disabled?: boolean): () => void;
```

`bindIconState` must return a cleanup function and must not allocate per pointer event. It should use CSS classes or data attributes for state, not inline style mutation in each screen owner.

## Settings control primitives

The settings surface currently repeats direct inline CSS and motion literals across tabs, buttons, segmented controls, toggles, sliders, text inputs, keybinding capture, fullscreen, graphics diagnostics, and audio rows. The following primitives replace that repetition.

### Tokens

```ts
export const UI_MOTION = {
  immediateMs: 90,
  responseMs: 180,
  contentMs: 240,
  underlineMs: 220,
  reducedMotion: 'prefers-reduced-motion: reduce',
  responseEase: 'cubic-bezier(.22,.72,.2,1)',
  contentEase: 'cubic-bezier(.22,.72,.2,1)',
} as const;

export const UI_CONTROL = {
  iconRestOpacity: 0.55,
  iconActiveOpacity: 1,
  focusLine: 'rgba(241,242,239,.72)',
  controlText: '#F1F2EF',
  controlMuted: 'rgba(228,234,230,.55)',
  controlDisabled: 'rgba(228,234,230,.24)',
  controlTrack: '#343e3d',
  controlAccent: '#C77C3B',
  thumbPx: 10,
  trackPx: 2,
  toggleWidthPx: 30,
  toggleHeightPx: 14,
} as const;
```

These values are the starting design-system tokens. They are deliberately below the 300ms ceiling recommended for frequent UI interactions [1] and preserve immediate response for repeated controls [2]. If a live screenshot proves a token too weak or too strong, update the token once and record the evidence; do not create a per-control exception.

### Settings tabs

The active tab title changes immediately on input. A single 1px underline travels from the old title to the new title in 220ms. The tab body may use a local 240ms opacity/`translateY(.22rem)` transition, but the full settings shell must not animate again for each tab change. The underline never becomes a second thick border, and the active title does not turn orange by default merely because it is active; accent is reserved for an operational emphasis or a validated selected state.

```ts
export function bindSettingsTabs(nav: HTMLElement, content: HTMLElement, render: (id: string) => void): () => void;
```

### Sliders

The track remains 2px high and the thumb remains 10px square. During drag or pointer press only, the thumb scales to `1.35` over 90ms and returns over 140ms. The value label updates immediately as the input changes; it does not count up through every intermediate number with a separate text animation. The filled portion may transition its color over 120ms, but width follows the input directly so the control never lags behind the user’s finger.

The slider must use a real `<input type="range">` for keyboard, pointer, and assistive-technology behavior. The visual thumb response is the only pressed emphasis.

```ts
export function bindSettingsSlider(input: HTMLInputElement, value: HTMLElement): () => void;
```

### Toggles

The track uses a 30×14px orthogonal footprint. The thumb moves the mathematically defined distance from its off coordinate to its on coordinate in 180ms. Track color shifts from muted grey to the selected operational accent at the same duration. Do not flash the row, scale the entire switch, or add an icon inside a tiny track.

```ts
export function bindSettingsToggle(toggle: HTMLButtonElement, checked: boolean, onChange: (value: boolean) => void): () => void;
```

The control must expose `aria-pressed` or `aria-checked`, depending on the element semantics. Reduced motion removes the travel animation but preserves the final thumb position and color.

### Segmented controls and action buttons

Segmented-control selection is immediate. A 1px active edge or a small background tone may cross-fade in 180ms. Action buttons use only border/color/background response: 180ms on hover/focus, 90ms pressed response, and no scale-up. The `CLOSE`, `RESET`, `APPLY`, and diagnostic audition controls all use the same category.

### Text input and keybinding capture

Focus changes the border to the focus token in 180ms. Keybinding capture may use one short 180ms border emphasis when capture begins and one 180ms return when it ends. The input text itself must not slide, bounce, or animate letter by letter.

### Settings surface entry and exit

The settings overlay may use one 240ms surface entry and one 180ms exit when opened or closed. It must not replay a shell entrance on every control change. The existing full-screen geometry remains owned by `client/src/settings/ui.ts`; the design system owns only the interaction classes and tokens.

## Accepted quiet ambient categories

The user accepted the following ambient behaviors as a direction, with refinements welcome. They are shared categories, not screen-local timelines. Each surface selects one category and supplies semantic state; the design system owns the geometry, duration, and stop conditions.

| Category | Authoring target | Trigger and stop condition | Repetition limit |
|---|---|---|---|
| Tab underline travel | One 1px line measured from the active title; `220ms`, `responseEase` | On tab selection; title changes immediately and the line travels to the new measured bounds | One line only; no center-stage replay |
| List contact settle | `translateX(4px)` maximum plus one 1px edge mark; `180–240ms` | Explicit hover, pointer press, or focus on an eligible row; returns on release/blur | No scroll-triggered stagger; no card lift |
| Faction edge response | One bounded edge/tint response; `320ms`; interior fill remains muted | Faction panel hover, focus, or selected-state change; stops at the settled edge state | One response per state change; no continuous breathing |
| Armory value tween | Bar width follows data over `180–240ms`; numeric label updates immediately | Equipment or loadout selection changes a stat value; ends at the new value | No loop and no count-up animation through every number |
| Pending skeleton sweep | Narrow low-opacity sweep, `2.8s` cadence, opacity `≤ .08` | Only while content is genuinely pending; stop and remove sweep when content resolves | At most one sweep layer per pending group |
| Background instrument trace | Bounded low-opacity trace, `8s` cadence, opacity `≤ .04` | Low-priority idle atmosphere behind an eligible surface; gate off during dense or critical states | One trace per surface; never across critical text or controls |

The fixture’s accepted ambient demonstrations are visual references for these values. Production implementation must keep the same category names and stop conditions, and must not create a new local variant because a surface owner prefers a different flourish.

```ts
export type AmbientMotionKind =
  | 'tab-underline'
  | 'list-contact'
  | 'faction-edge'
  | 'value-tween'
  | 'pending-skeleton'
  | 'instrument-trace';

export function bindAmbientMotion(root: HTMLElement, kind: AmbientMotionKind, active: boolean): () => void;
```

`bindAmbientMotion` must use shared classes or data attributes, must stop cleanly when `active` becomes false, and must not allocate a new animation timeline on every pointer event. The trace and skeleton categories must be absent or static under reduced motion; the remaining categories preserve their final state without travel.

## Accepted loading and battle-pass categories

The design system owns the reusable behavior category for the accepted horizontal loading bar and full-season battle-pass progression line. Loading-bar behavior includes direct progress response, a one-shot sheen, and terminal hold; the loading owners retain real phase and server timing. Battle-pass behavior includes measured tier positions, free/premium track state classes, nearest-reward emphasis, and finale emphasis; the screen owners retain season data, claim state, and premium ownership. Exact geometry and timing are specified in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

## Rejected historical candidates

The calibration-spine loading treatment, contour/transfer assembly, facility wake, season crest, cut-corner rail, progression ledger, docket, card-grid, and carousel experiments were explicitly rejected in visual review. They remain outside this contract. Do not implement their geometry, timing, or visual hierarchy as a fallback. The accepted loading-bar and full-season progression-line directions are distinct final candidates and are documented separately.

## Reduced motion and touch behavior

All primitives must include a reduced-motion branch. Touch input receives the pressed response on pointer down/up and returns to the resting state after release; it must not remain visually “hovered” after a tap. Focus-visible remains available for keyboard users. No interaction depends solely on a mouse hover.

## Implementation and acceptance

The next repository pass should promote `UI_MOTION` and `UI_CONTROL` into `client/design-system.ts`, add a dedicated interaction helper module beside it, and replace repeated inline settings and icon state rules. The pass must not modify main-menu action-card behavior. It should add tests for state transitions and screenshot captures at desktop and mobile sizes.

Acceptance requires that resting icons are visibly greyish, hover/focus/press states become clean white, settings controls respond locally within the stated timing, no control changes layout, reduced motion preserves state, and the same primitive produces the same result in armory, faction, store, stats, and settings.

## References

[1]: https://emilkowal.ski/ui/7-practical-animation-tips "7 Practical Animation Tips"
[2]: https://emilkowal.ski/ui/you-dont-need-animations "You Don't Need Animations"
[3]: https://github.com/shadcn-ui/ui/issues/1029 "shadcn/ui motion-safe animations discussion"
[4]: ../vexea-ui-audit-20260824/client/design-system.ts "Current VEXEA design-system tokens"
[5]: ../vexea-ui-audit-20260824/client/src/settings/ui.ts "Current settings surface owner"
[6]: ../vexea-ui-audit-20260824/client/public/ui_svgs/messages.svg "Example current white SVG asset"
[7]: VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md "Accepted loading-bar and full-season battle-pass motion contract"
