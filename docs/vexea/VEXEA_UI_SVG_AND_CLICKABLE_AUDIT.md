# VEXEA SVG and Clickable-Control Audit

**Status:** Audited against the fresh repository snapshot at commit `13434039feae1eac9fb332195b66d6e6aa34ae39`. This is an implementation audit, not a production change.

## Finding

The current UI icon treatment is louder than the intended resting hierarchy. Most files under `client/public/ui_svgs/` use white source fills. Several screen owners also force white through `filter: brightness(0) invert(1)`, which normalizes arbitrary source colors but cannot express a grey resting state when the source asset is already white. Changing only wrapper text color therefore does not change the image itself.

The reusable rule is to leave the source asset intact and control the image element: resting icons use `opacity: .55`, hover and keyboard focus use `opacity: 1`, press adds only a short `translateY(1px)`, and disabled uses `opacity: .24`. The transition is `180ms` for hover/focus and `90ms` down / `140ms` release for press. No scale-up, bounce, ripple, persistent glow, or per-screen inline animation is allowed.

## Audited source and owners

| Owner | Current treatment | Required design-system category |
|---|---|---|
| `client/screens/main-menu.ts` utility controls | Utility images for messages, friends, and settings use forced-white filtering while wrapper states mostly affect adjacent text | Shared icon state may be applied to the utility controls only |
| `client/screens/armory-screen.ts` | Class and equipment-slot SVGs use white-filtered image treatment and immediate selected styles | Shared icon state plus selected-frame category |
| `client/screens/faction-screen.ts` | Faction SVGs use white-filtered images and direct selection color/border mutation | Shared icon state plus faction-edge category |
| `client/screens/store-screen.ts` | Coin and energy icons use white-filtered treatment in catalog/currency surfaces | Shared icon state; store filter remains the screen owner |
| `client/src/settings/ui.ts` | Settings controls contain inline white labels and direct control styling; icon controls must be audited through the same image-element rule where present | Shared icon state, settings-control primitives, and focus response |
| `client/screens/stats-screen.ts` | Stats navigation and battle-pass reward icons are local render output | Shared icon state for clickable controls; battle-pass reward state is owned by the accepted progression contract |
| `client/src/ui/LoadingScreen.ts` and `client/screens/splash.ts` | Text and progress carrier are not clickable icon controls | Loading-bar contract, not icon-state category |

## Asset classes and exceptions

The grey-default/white-interaction rule applies to monochrome clickable utility icons, internal screen icon tabs, armory equipment icons, faction icons, store item/currency icons, and similar controls. It does not mean that every image in `ui_svgs` must be recolored.

| Asset class | Treatment |
|---|---|
| Monochrome white utility or equipment SVG | Opacity-controlled image state; do not add a broad filter when opacity is sufficient |
| Google sign-in mark | Preserve its source colors; use wrapper focus and pressed response without forcing white |
| Cursor, eye, player arrow, and other status/aim indicators | Preserve semantic source color and do not apply generic clickable icon treatment unless the element is truly interactive |
| Health-status variants and health-plus | Preserve semantic severity colors; a disabled state may reduce opacity but must not erase meaning |
| Faction marks | Preserve faction identity color where the asset is a status mark; clickable monochrome variants may use the shared state helper |
| Loading and progress imagery | Owned by the loading contract; do not normalize into a generic icon button |

## Required implementation seam

The future implementation should add a shared `bindIconState(button, icon, disabled?)` helper beside the design-system interaction module. It should set data attributes or classes on the button and image, return a cleanup function, and use CSS for the state transitions. Pointer and keyboard activation must reach the same pressed/focus semantics. The helper must not allocate per pointer event.

Screen owners remain responsible for semantic state and event wiring. They must not repeat `filter: brightness(0) invert(1)`, `transition: all`, or separate hover/press timelines. The helper must not receive arbitrary style objects or screen-specific geometry.

## Explicit exclusion

The main-menu action-card surfaces are out of scope. Their layout, hover, entry, selection, and transition behavior must not be changed. The main-menu utility icons are listed only as a shared icon-state audit target; they must not be used as a reason to animate the action-card grid.

## Verification checklist

A production pass should capture resting, hover/focus, pressed, disabled, and reduced-motion states for at least one eligible control in armory, faction, store, stats/settings, and the main-menu utility strip. The captures must prove that the image itself changes from greyish to clean white, that no layout footprint changes, and that action-card diffs remain empty. The pass must also confirm that non-monochrome and semantic status assets retain their intended colors.

## References

[1]: ../../client/design-system.ts "Current VEXEA design-system tokens"
[2]: ../../client/screens/main-menu.ts "Main-menu utility controls and excluded action cards"
[3]: ../../client/screens/armory-screen.ts "Armory icon and selection owner"
[4]: ../../client/screens/faction-screen.ts "Faction icon and selection owner"
[5]: ../../client/screens/store-screen.ts "Store icon and filter owner"
[6]: ../../client/src/settings/ui.ts "Settings control owner"
[7]: ../../client/screens/stats-screen.ts "Stats navigation and reward icon owner"
[8]: VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md "Shared icon-state contract"
