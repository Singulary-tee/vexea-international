# VEXEA Settings Motion Audit

**Status:** Audited against the fresh repository snapshot at commit `13434039feae1eac9fb332195b66d6e6aa34ae39`. This document defines reusable behavior; it does not alter `client/src/settings/ui.ts`.

## Current problem

The settings owner contains repeated inline timing literals, broad `transition: all` declarations, direct color mutation, and separate response rules for tabs, sliders, toggles, segmented controls, action buttons, keybinding capture, fullscreen, diagnostics, and audio rows. That makes the surface feel inconsistent and encourages each new control to invent another animation.

The design system should own the response tokens and classes. The settings owner should create controls, maintain values, handle events, and select semantic states. It should not own separate transition literals or animate the full settings shell for every local change.

## Shared tokens

| Token | Value | Use |
|---|---:|---|
| Immediate press | `90ms` | Press-down response |
| Standard response | `180ms` | Hover, focus, border, tone, and action response |
| Content transition | `240ms` | Local tab/content replacement |
| Underline travel | `220ms` | One measured active-tab line |
| Easing | `cubic-bezier(.22,.72,.2,1)` | Response and content motion |
| Track height | `2px` | Range-control track |
| Slider thumb | `10px` square | Range-control thumb |
| Slider pressed scale | `1.35` | Thumb only while dragging/pressing |
| Toggle footprint | `30px × 14px` | Orthogonal toggle track |
| Icon rest/active | `.55 / 1` opacity | Image-element state |

These values are below the practical ceiling for frequent UI actions and preserve immediate feedback. The value label must update directly from the input; it must not count through intermediate numbers as a second animation.

## Tab navigation

Settings has four tab families in the current owner: `CONTROLS`, `GRAPHICS`, `AUDIO`, and `HUD & UI`; accessibility and related utility sections remain part of the settings content model where present. The selected title updates immediately. A single 1px underline travels from the previous measured title bounds to the new title over `220ms`. The underline is a shared line primitive and must not become a second thick border or a floating decorative element.

The content body may enter with `opacity: 0 → 1` and `translateY(.22rem)` over `240ms`. Only the changed content body moves. The settings shell, title region, and unrelated controls do not replay their entrance.

## Controls map

| Control family | Current owner seam | Shared behavior | Stop/fallback rule |
|---|---|---|---|
| Tab titles | Tab row and tab selection handler | Immediate title state plus one 220ms underline travel | Reduced motion jumps underline to measured target |
| Sliders | `createSlider` | Real range input; width/value follow input immediately; thumb scales to `1.35` for 90ms on press, returns over 140ms | No lag, no number count-up, static final state under reduced motion |
| Toggles | `createCyberToggle` | Thumb travels across the 30×14px track over 180ms; track tone changes over the same interval | Preserve final checked state without travel under reduced motion |
| Segmented controls | `createSegmentedControl` | Selected edge/tone cross-fades over 180ms; selection itself is immediate | No sliding pill or layout movement |
| Action buttons | Existing settings action rows and diagnostic buttons | Border/background/text response over 180ms; press translates 1px for 90ms | No scale-up, ripple, or bounce |
| Text inputs | Inline input rows | Focus border transitions to focus token over 180ms | Text stays still; focus remains visible |
| Keybinding capture | Capture handler and keybinding row | One 180ms border emphasis at capture start and one return at capture end | No letter-by-letter or key glyph travel |
| Fullscreen/diagnostic audition | Existing action controls | Same button category; one local response only | No full-shell animation |
| Audio rows | Volume and device controls | Same slider/toggle/button categories | Do not animate meters or add continuous decoration |
| HUD/UI rows | Display and HUD options | Same slider/toggle/segmented categories | Preserve immediate setting feedback |
| Accessibility | Reduced-motion and accessibility controls | The reduced-motion switch itself uses the toggle category and immediately applies static behavior | Never conceal the control or animate the preference transition |
| Close/cancel | Settings close action | Standard button response; overlay exit is 180ms | Destroy local listeners after exit; no card-grid treatment |

## Ownership boundary

`client/src/settings/ui.ts` owns state, persistence, event wiring, tab selection, and which controls exist. A shared interaction module beside `client/design-system.ts` owns `bindSettingsTabs`, `bindSettingsSlider`, `bindSettingsToggle`, `bindSegmentedControl`, and `bindActionButton`. The helpers return cleanup functions and use classes/data attributes instead of repeated per-event inline style mutation.

The shared module must not own settings values, Firestore writes, fullscreen policy, graphics diagnostics, audio manager state, or keybinding persistence. It only supplies the visual response contract.

```ts
export function bindSettingsTabs(nav: HTMLElement, content: HTMLElement, render: (id: string) => void): () => void;
export function bindSettingsSlider(input: HTMLInputElement, value: HTMLElement): () => void;
export function bindSettingsToggle(toggle: HTMLButtonElement, checked: boolean, onChange: (value: boolean) => void): () => void;
export function bindSegmentedControl(root: HTMLElement): () => void;
export function bindActionButton(button: HTMLElement): () => void;
```

## Reduced motion and touch

The `prefers-reduced-motion: reduce` media query and the explicit settings preference must disable travel, underline interpolation, content entry, and thumb scale while preserving the final selected value, checked state, focus state, and readable contrast. Touch receives a pressed state on pointer down and returns to rest on pointer up/cancel; it must not leave a hover state behind after a tap. Keyboard focus-visible remains available.

## Acceptance tests

The future implementation should test all four settings tabs plus graphics, audio, HUD/UI, and accessibility-related rows where they are present in the current owner. Tests should cover immediate value updates, press/release cleanup, keyboard focus, toggle `aria-pressed` or `aria-checked`, reduced motion, destroy cleanup, and no layout change. Screenshot review should show the controls below any preview stage and should confirm that no full settings shell replay occurs on every click.

## References

[1]: ../../client/src/settings/ui.ts "Current VEXEA settings owner"
[2]: ../../client/design-system.ts "Current VEXEA design-system tokens"
[3]: VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md "Shared settings-control contract"
[4]: https://emilkowal.ski/ui/7-practical-animation-tips "7 Practical Animation Tips"
[5]: https://emilkowal.ski/ui/you-dont-need-animations "You Don't Need Animations"
[6]: https://github.com/shadcn-ui/ui/issues/1029 "shadcn/ui motion-safe discussion"
