# VEXEA UI Motion Research and Proposals

**Status:** Research-backed proposal set with an explicit visual decision split. Icon states, settings response, and the quiet ambient set are acceptable directions with refinements welcome. The pentagon graph is the only palatable redesign direction so far and remains approval-gated. The loading contour and battle-pass ledger are explicitly rejected and stopped; they are not active candidates and have no contract path.

## Research basis

The central research finding is that animation should explain a state, preserve spatial continuity, confirm an action, or add rare delight. It should not be present merely because a component can move. Emil Kowalski’s guidance recommends removing motion from interactions seen tens or hundreds of times per day and keeping routine UI animation generally under 300ms [1]. His companion article gives a concrete 180ms versus 400ms comparison and argues that frequent actions should remain immediate rather than theatrical [2].

The shadcn/ui motion-safe discussion reinforces the accessibility requirement: reusable entering animations should provide a reduced-motion path rather than assuming all users want motion [3]. For VEXEA, these principles are stronger than a generic “make the UI feel alive” instruction. The game can carry more atmosphere than a conventional business application, but frequent controls still need to feel immediate and operational.

## What should become a prespecified category

The design system should own all recurring UI motion. The categories below are the allowed vocabulary. A surface selects a category and supplies semantic state; it does not invent its own animation timeline.

| Category | Allowed use | Default envelope | Do not do |
|---|---|---:|---|
| Icon contrast response | Clickable SVGs and utility icons | 180ms color/opacity; 90ms press | Do not bounce, rotate, or glow routine icons |
| Button response | Action buttons, close, apply, reset | 180ms hover/focus; 90ms pressed | Do not scale the whole button or delay action |
| Selected frame | One active internal card/panel/item | 180ms state change; optional 2.8s low-amplitude breath | Do not animate unselected items |
| Tab title portal | Internal tabs and sub-tabs | 220ms 1px underline travel | Do not make the selected title lag |
| Content settle | Newly rendered local content | 240ms opacity + `translateY(.22rem)` | Do not fade the whole application shell |
| Slider weight | Settings sliders | 90ms thumb press; 140ms release | Do not animate the value label through every number |
| Toggle travel | Settings toggles | 180ms thumb travel | Do not flash the entire row |
| Card entry | Newly created internal cards | 360ms, `.38rem` offset, 28ms stagger capped at five | Do not replay on every hover or scroll |
| Value tween | Armory stats and similar numeric bars | 180–240ms bar width interpolation | Do not delay the text value or use a large pulse |
| Pending skeleton sweep | Data that is actually loading | 2.8s low-opacity sweep; stop on resolve | Do not loop after data is ready |
| Instrument trace | Background low-priority atmosphere | 8s cadence, opacity ≤ .04 | Do not cross critical text or become a focal point |
| Rare resolution | Match found, claim, extraction success | 620–900ms staged event | Do not use for routine settings or tab changes |

## Specific proposals for VEXEA

### Grey-default, white-on-interaction SVG system

The current repository’s production SVGs are mostly white-filled, and several wrappers force them white using `brightness(0) invert(1)`. The proposed system keeps the source assets but renders them at approximately `.55` opacity by default. Hover, keyboard focus, pointer press, and touch press raise the icon to full dirty white. The change is communicated by contrast, not by travel or bloom. This is suitable for the utility icon cluster, internal armory slots, faction icons, store icons, settings controls, and similar clickable glyphs. Main-menu action cards remain excluded.

This is a low-risk, high-frequency primitive and is ready for design-system documentation and implementation after the latest-state repository pull.

### Settings response layer

The current settings surface has tabs, sliders, toggles, segmented controls, text inputs, keybinding capture, fullscreen, graphics diagnostics, and audio audition rows, but they each carry local motion literals. The proposed system centralizes them:

- Tabs use an immediate title state plus a single 1px underline that travels in 220ms.
- Settings content changes locally in 240ms; the shell does not re-enter.
- Sliders keep a 2px track and 10px thumb, with a restrained 1.35× thumb response only while pressed.
- Toggles move a 30×14px thumb in 180ms and shift track color with it.
- Action buttons respond through border/color/background only.
- Keybinding capture gets one short border emphasis and no text animation.

This makes the settings menu feel responsive without decorating every row. It is ready for a design-system contract.

### Spider graph: instrument profile

The current stats graph is a 110px five-axis polygon with dashed inner polygons, orange gradient fill, 2.5px orange nodes, and no motion. The proposed graph uses a larger responsive SVG, thinner neutral grid, smaller nodes, muted olive data fill, an 820ms draw-in on first profile render, and one 3.8s low-opacity sweep. The sweep is not a continuously bright ring; it is a quiet discovery detail. The graph’s values remain immediately legible even when reduced motion is enabled.

This candidate is rejected. The polygon, lines, dots, and fill remain too close to a paint.exe construction even after the restrained motion pass. A future redesign must establish a stronger instrument language, deliberate hierarchy, and better use of authored geometry before it can be reconsidered.

### Loading screens: final horizontal loading bar

The splash screen currently owns a 2px fill bar and `CHARGING SYSTEM CACHE...` text. The runtime `LoadingScreen` owns a 4px bar, percentage, phase label, and rotating tips. The proposed category keeps the line as the primary progress carrier, adding only two faint guide rails, four measured ticks, a small moving head, and a phase readout. The splash version uses neutral white; the match transition/exit version may use a restrained warm instrument accent.

The final accepted direction keeps the horizontal progress carrier. The authored detail is limited to a measured leading head, one narrow pass-through sheen, direct response to real progress, and a terminal hold during the existing server-ready wait. There is no replacement object, spinner, route, box, or dashboard scaffolding. Exact values are in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

### Battle pass: final full-season progression line

The dedicated screen currently uses plain rectangular tier cards, a basic horizontal rail, text-only rewards, and a broad `all .2s ease` transition. The proposed shape is a cut-corner reward plate with a separate progress spine and a small number of active/ready accents. Tier entrance uses a short stagger once per rail render. The ready reward plate may breathe slowly; locked tiers remain still. Claiming draws the reward plate edge once, then rests.

The final accepted direction is a full-season progression line using the current shared 0–50 season model. It shows measured tier positions, reward marks at actual milestone points, a visible free track and premium track, a focal nearest reward, and a distinct season-finale reward. Desktop is horizontal; mobile is vertical with the same ordering and no casual horizontal scrolling. Exact values are in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

### Accepted quiet ambient effects

The user accepted the six low-priority candidates as a reusable direction, while explicitly welcoming refinements. They are approved as small design-system categories, not as permission for each screen to invent a local variant.

| Candidate | Decision | Runtime guard |
|---|---|---|
| Sliding tab underline | Accept | One measured 1px line, 220–260ms travel; title state changes immediately |
| 4px list settle on explicit hover/press | Accept | One 4px contact offset plus a short edge mark; no card lift or scroll replay |
| Faction edge tint interaction | Accept | Respond with edge/tint only; interior fill remains muted and bounded |
| Armory stat-bar tween | Accept | Bar interpolates for 180–240ms while the numeric label updates immediately |
| Skeleton sweep | Accept | One low-opacity sweep only while data is pending; stop on resolve |
| Background instrument trace | Accept with cap | One low-opacity, low-cadence trace behind content; never cross critical text or become a focal point |

## What not to add

Do not animate every navigation tab as a center-stage event. Do not add a ripple to every click. Do not stagger a list every time it scrolls. Do not animate keyboard-driven selection highlights with a visible delay. Do not keep skeleton sweeps running after data has resolved. Do not add persistent ambient particles or a full-screen background loop to settings, stats, or the store. Do not turn faction colors into gradients that wash across text. Do not use sparkle except for rare rewards or a clear extraction-success state.

The practical rule is that repeated actions should become faster and quieter, not more expressive. Rare state changes can be more authored because they carry more meaning and occur less often.

## Proposed implementation order

1. Promote grey-default icon states and settings primitives into the shared design system and replace repeated local rules.
2. Promote the accepted quiet ambient categories into the same shared interaction module, using the caps in the table above.
3. Port the approved matchmaking queue sequence into the dedicated queue module, preserving its own rare-resolution category.
4. Add the accepted horizontal loading-bar and full-season battle-pass categories through dedicated helpers, after comparing current source names and data with the new contract.
5. Capture repeated-trigger screenshots at desktop and mobile sizes and remove any ambient category that becomes visually competitive. Keep all superseded loading and battle-pass experiments excluded.

Each step requires a raw source, authored-only, and composite capture where applicable. A screenshot that hides the source surface or uses a reference artwork as the backing plate does not count as integration proof.

## Approval status

| Direction | Visual candidate | Contract status |
|---|---|---|
| Grey icon states | Reviewed desktop/mobile; accepted | Ready for design-system contract |
| Settings local response | Reviewed desktop/mobile; accepted | Ready for design-system contract |
| Spider graph | Reviewed desktop/mobile comparison; rejected | Redesign required; no contract |
| Final horizontal loading bar | Reviewed desktop/mobile; accepted | Ready for accepted loading-bar contract |
| Final full-season battle-pass progression line | Reviewed desktop/mobile; accepted | Ready for accepted battle-pass contract |
| Quiet ambient set | Reviewed desktop/mobile; accepted with refinements welcome | Ready for shared-category contract |
| Pentagon graph foundation | Only palatable graph direction so far | Candidate foundation; keep approval status as previously recorded |
| Calibration spine / loading contour / transfer assembly / wake field | Explicitly rejected historical experiments | Excluded; no contract |
| Rail / ledger / docket / crest / card-grid / carousel battle pass | Explicitly rejected historical experiments | Excluded; no contract |

## References

[1]: https://emilkowal.ski/ui/7-practical-animation-tips "7 Practical Animation Tips"
[2]: https://emilkowal.ski/ui/you-dont-need-animations "You Don't Need Animations"
[3]: https://github.com/shadcn-ui/ui/issues/1029 "shadcn/ui motion-safe animations discussion"
[4]: ../vexea-ui-audit-20260824/client/design-system.ts "Current VEXEA design-system tokens"
[5]: ../vexea-ui-audit-20260824/client/src/settings/ui.ts "Current VEXEA settings surface"
[6]: ../vexea-ui-audit-20260824/client/screens/stats-screen.ts "Current VEXEA stats and radar surface"
[7]: ../vexea-ui-audit-20260824/client/src/ui/LoadingScreen.ts "Current VEXEA runtime loading overlay"
[8]: ../vexea-ui-refresh-20260825/client/screens/splash.ts "Fresh VEXEA splash loading owner"
[9]: ../vexea-ui-refresh-20260825/client/src/map/LoadingOrchestrator.ts "Fresh VEXEA match loading phase owner"
[10]: ../vexea-ui-refresh-20260825/shared/battle-pass.ts "Fresh VEXEA battle-pass season model"
[11]: VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md "Accepted loading-bar and battle-pass motion contract"
