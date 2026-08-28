# VEXEA SVG and Clickable-Control Audit

**Consolidated:** This audit has been merged into `VEXEA_UI_DESIGN_SYSTEM.md`.

The authoritative source now records the fresh-repository finding that most UI SVG assets are white-filled and that several owners force white with `brightness(0) invert(1)`. It defines the image-element state contract: greyish at rest, clean white on hover/focus/press, brief 1px press displacement, disabled opacity, semantic-color exceptions, state attributes, and the thin vanilla `bindIconState` API.

The same contract lists the eligible owners—armory, factions, store, stats, settings, and main-menu utility controls—and explicitly excludes main-menu action cards. Do not maintain separate icon-state rules here or use wrapper text color as a substitute for changing the image itself.
