# VEXEA UI Design System

**Status:** Authoritative CSS-first UI design-system contract for the accepted internal UI pass.

This document consolidates the former icon audit, settings audit, and repeated ambient-motion recipes. It is written for VEXEA’s vanilla HTML and TypeScript frontend. It does not introduce React, a component framework, a CSS-in-JS system, or a JavaScript animation library.

## One source of truth

Create one shared stylesheet at `client/src/ui/styles/vexea-ui.css`. It owns UI motion tokens, colors, icon states, control states, measured tab underline presentation, local content transitions, selected frames, and the accepted quiet ambient classes. Import it once from the existing client stylesheet entrypoint, normally `client/index.css`, without replacing the existing global layout rules.

Create one thin binding module at `client/src/ui/ui-motion.ts`. It owns semantic state attributes, measured geometry that cannot be expressed by CSS alone, event cleanup, and the small number of CSS custom-property writes required for live values. It does not own animation timelines, per-screen style objects, or duplicated transition literals.

> **Rule:** CSS owns what motion looks like. Vanilla TypeScript owns when semantic state changes and how live DOM measurements/data reach CSS.

## File responsibilities

| File | Owns | Must not own |
|---|---|---|
| `client/src/ui/styles/vexea-ui.css` | Tokens, selectors, transitions, keyframes, reduced-motion rules, state presentation | Season data, Firestore, network events, screen routing, arbitrary geometry generated from data |
| `client/src/ui/ui-motion.ts` | Small binders, state attributes, measured tab bounds, cleanup, `--progress` writes | Per-screen animation recipes, inline transition strings, animation orchestration, game state |
| `client/design-system.ts` | Existing shared design tokens and DOM construction helpers | A second copy of motion tokens or screen-specific animation code |
| Screen owners | Data, event wiring, semantic states, render ownership | New hover/press/underline/toggle/entry recipes |
| `client/main.ts` | Existing route/event coordination | UI styling, animation constants, motion timelines |

The implementation must not create a second stylesheet for settings tabs or a second stylesheet for navigation tabs. They use the same classes and binder. Loading and battle-pass have separate domain contracts for their geometry, but their shared state behavior still enters through the same CSS-first ownership model.

## Tokens

Place the following custom properties in `:root` in `vexea-ui.css` and use them everywhere in the shared primitives:

```css
:root {
  --ui-motion-immediate: 90ms;
  --ui-motion-response: 180ms;
  --ui-motion-content: 240ms;
  --ui-motion-underline: 220ms;
  --ui-motion-selection-breathe: 2800ms;
  --ui-motion-faction-edge: 320ms;
  --ui-motion-value-tween: 220ms;
  --ui-motion-skeleton-cadence: 2800ms;
  --ui-motion-trace-cadence: 8000ms;
  --ui-motion-ease: cubic-bezier(.22,.72,.2,1);
  --ui-icon-rest-opacity: .55;
  --ui-icon-active-opacity: 1;
  --ui-icon-disabled-opacity: .24;
  --ui-control-focus: rgba(241,242,239,.72);
  --ui-control-text: #F1F2EF;
  --ui-control-muted: rgba(228,234,230,.55);
  --ui-control-track: #343E3D;
  --ui-control-accent: #C77C3B;
  --ui-control-thumb: 10px;
  --ui-control-track-height: 2px;
  --ui-toggle-width: 30px;
  --ui-toggle-height: 14px;
}
```

Do not introduce a local `100ms`, `120ms`, `150ms`, `all`, or unrelated easing value when one of these categories applies. If a genuinely unique effect needs a different value, it must be recorded as an exception with an owner and visual reason.

## State tagging

Use attributes or classes as the stable CSS contract. The preferred state vocabulary is:

| Semantic state | Markup state |
|---|---|
| Resting | `data-ui-state="resting"` or no active state |
| Hover | native `:hover` enhancement only |
| Keyboard focus | `:focus-visible` |
| Pressed | native `:active` and temporary `data-ui-state="pressed"` when needed for touch |
| Selected | `data-ui-selected="true"` |
| Disabled | `data-ui-disabled="true"` or native `disabled` |
| Pending | `data-ui-pending="true"` |
| Current/ready | `data-ui-state="current"` or `data-ui-state="ready"` |
| Premium locked | `data-ui-state="premium-locked"` |
| Reduced motion | global media query plus the user’s existing reduced-motion preference |

The screen owner applies semantic state. CSS decides the visual result. The same state tag must produce the same response in settings, stats, store, armory, factions, lobby, loading, and battle pass wherever the category is shared.

## Shared CSS primitives

### Clickable icons

Use a real button or link around the image. The image itself changes opacity; wrapper text color does not substitute for image state.

```html
<button class="vexea-icon-button" type="button" aria-label="Settings">
  <img class="vexea-icon-button__icon" src="/ui_svgs/settings.svg" alt="">
</button>
```

```css
.vexea-icon-button__icon {
  opacity: var(--ui-icon-rest-opacity);
  transition: opacity var(--ui-motion-response) var(--ui-motion-ease),
              transform var(--ui-motion-immediate) linear;
}

.vexea-icon-button:hover .vexea-icon-button__icon,
.vexea-icon-button:focus-visible .vexea-icon-button__icon,
.vexea-icon-button[data-ui-state="active"] .vexea-icon-button__icon {
  opacity: var(--ui-icon-active-opacity);
}

.vexea-icon-button:active .vexea-icon-button__icon,
.vexea-icon-button[data-ui-state="pressed"] .vexea-icon-button__icon {
  transform: translateY(1px);
}

.vexea-icon-button:disabled .vexea-icon-button__icon,
.vexea-icon-button[data-ui-disabled="true"] .vexea-icon-button__icon {
  opacity: var(--ui-icon-disabled-opacity);
  transition: none;
}
```

Do not add scale-up, ripple, bounce, travel, or routine glow. Preserve source colors for Google marks, health severity, aim/status indicators, cursor/player-arrow variants, and other semantic multicolor assets. Do not apply this category to main-menu action cards.

### One underline primitive for every tab row

Settings tabs, stats sub-tabs, store filters, and armory category tabs all use the same measured line. There is no separate settings-tab animation and navigation-tab animation.

```html
<nav class="vexea-tab-row" data-ui-tabs>
  <button class="vexea-tab" data-ui-tab="controls">CONTROLS</button>
  <button class="vexea-tab" data-ui-tab="graphics">GRAPHICS</button>
  <span class="vexea-tab-underline" aria-hidden="true"></span>
</nav>
```

The active label changes immediately. TypeScript measures the active button and writes `--ui-underline-x` and `--ui-underline-width`; CSS moves one 1px line over `220ms`. The underline must not become a second thick border, a sliding pill, or a center-stage effect.

```css
.vexea-tab-row { position: relative; }
.vexea-tab-underline {
  position: absolute;
  left: var(--ui-underline-x, 0px);
  bottom: 0;
  width: var(--ui-underline-width, 0px);
  height: 1px;
  background: var(--ui-control-text);
  transition: left var(--ui-motion-underline) var(--ui-motion-ease),
              width var(--ui-motion-underline) var(--ui-motion-ease);
}
```

### Local content transition

When a tab or filter replaces content, only the changed content body enters once. The shell, nav row, and unrelated controls do not replay.

```css
[data-ui-content-transition="enter"] {
  animation: vexea-content-enter var(--ui-motion-content) var(--ui-motion-ease) both;
}
@keyframes vexea-content-enter {
  from { opacity: 0; transform: translateY(.22rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Selection frame

A selected internal card, class, faction, or equipment slot may receive one inset 1px frame with a quiet 2.8s breath. Unselected items are static. The frame cannot alter layout footprint or create a second competing border.

```css
[data-ui-selected="true"] { position: relative; }
[data-ui-selected="true"]::after {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(224,228,226,.62);
  pointer-events: none;
  animation: vexea-selection-breathe var(--ui-motion-selection-breathe) ease-in-out infinite;
}
@keyframes vexea-selection-breathe {
  0%,100% { opacity: .42; }
  50% { opacity: .72; }
}
```

### List contact

An eligible row responds only to explicit hover, focus, or press. It may translate up to 4px toward the contact edge and reveal one 1px edge mark. It must not lift, bounce, or animate merely because the user scrolls.

### Faction edge

Faction selection changes one bounded edge or tint response over `320ms`. The interior remains muted and the response stops at the settled selected state. No full-panel wash and no continuous breathing.

### Value tween

Armory/stat bars interpolate to the new width over `180–240ms`; numeric labels update immediately from data. Never count the number through intermediate values as a second animation.

### Pending skeleton

A pending content group may have one narrow, low-opacity sweep at `2.8s` cadence and opacity no greater than `.08`. Remove it when content resolves. No resolved content may continue to shimmer.

### Background trace

An eligible low-priority surface may have one bounded trace at `8s` cadence and opacity no greater than `.04`. It must be gated off behind critical states and never cross text or controls. This is atmosphere, not a centerpiece.

## Settings mapping

The settings owner uses the shared categories as follows: tab row uses the shared underline; tab body uses the local content transition; `createSlider` binds a real range input and uses the shared thumb response; `createCyberToggle` uses the 30×14px toggle category; `createSegmentedControl` uses an immediate selected edge/tone; action, close, fullscreen, and diagnostic controls use the shared button response; text and keybinding inputs use the shared focus response; audio, HUD/UI, graphics, and accessibility rows reuse the same primitives.

Settings state, persistence, fullscreen policy, audio manager state, graphics diagnostics, and keybinding storage remain in `client/src/settings/ui.ts`. The stylesheet and binder do not own any of those concerns.

## Loading and battle pass boundary

The accepted horizontal loading bar and full-season battle-pass progression line use the shared CSS-first model, but their exact geometry, runtime semantics, and ownership remain in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`. Loading receives real phase/progress values from the existing owners. Battle pass receives current tier, reward milestone, free/premium, and claim state from its screen owner. Neither category belongs in a generic tab or control helper.

## Vanilla TypeScript binding API

The shared binder is intentionally small and typed:

```ts
export function bindIconState(button: HTMLElement, icon: HTMLImageElement, disabled?: boolean): () => void;
export function bindTabs(nav: HTMLElement, content: HTMLElement, render: (id: string) => void): () => void;
export function bindContentEntry(content: HTMLElement): void;
export function bindSelection(element: HTMLElement, selected: boolean): void;
export function bindSlider(input: HTMLInputElement, value: HTMLElement): () => void;
export function bindToggle(toggle: HTMLButtonElement, checked: boolean, onChange: (value: boolean) => void): () => void;
export function bindLoadingBar(root: HTMLElement): LoadingBarMotionHandle;
export function bindBattlePass(root: HTMLElement): BattlePassMotionHandle;
```

Binders may set data attributes and CSS custom properties. They must not use `style.transition = ...` or create a new animation timeline on every pointer event. They return cleanup functions and leave the screen owner’s data/event state intact.

## Reduced motion

The stylesheet must include `@media (prefers-reduced-motion: reduce)` and the existing user preference path. Under reduced motion, remove travel, breathing, sweeps, stagger, and underline interpolation while preserving the final selected, focused, progress, current, premium, and claim states. Touch must receive a pressed response and return to rest after release; it must not leave a hover state behind.

## Scope exclusions

Main-menu action cards are explicitly excluded. Do not modify their layout, entry, hover, selection, or transitions. Do not add a second tab animation category, a second icon-state implementation, a screen-local settings stylesheet, or a JavaScript animation library. Do not place these contracts in `client/main.ts`.

## References

[1]: ../../client/design-system.ts "Current VEXEA design tokens and helpers"
[2]: ../../client/index.css "Current global stylesheet entrypoint"
[3]: ../../client/src/settings/ui.ts "Current settings owner"
[4]: ../../client/screens/stats-screen.ts "Current stats and battle-pass owner"
[5]: ../../client/screens/armory-screen.ts "Current armory owner"
[6]: ../../client/screens/faction-screen.ts "Current faction owner"
[7]: ../../client/screens/store-screen.ts "Current store owner"
[8]: ../../client/screens/main-menu.ts "Main-menu utility controls and excluded action cards"
[9]: VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md "Accepted loading-bar and battle-pass contract"
[10]: VEXEA_UI_ANIMATION_CONTRACT.md "Accepted surface-motion contract"
