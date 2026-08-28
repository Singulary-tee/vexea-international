# VEXEA Settings Motion Audit

**Consolidated:** This audit has been merged into `VEXEA_UI_DESIGN_SYSTEM.md`.

The authoritative source now contains the shared settings tokens, one underline primitive for all tab rows, local content entry, slider, toggle, segmented-control, action-button, focus, keybinding, fullscreen, audio, HUD/UI, accessibility, close, touch, and reduced-motion behavior. It also defines the exact ownership boundary: `client/src/settings/ui.ts` owns settings data, persistence, and events; the shared CSS file owns presentation; thin vanilla TypeScript binders apply semantic state and cleanup.

Do not create a settings-specific tab animation or duplicate the navigation underline recipe. Both use the same measured 1px underline class and binder. Use `VEXEA_UI_ANIMATION_CONTRACT.md` for surface placement and `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md` for the independent loading/pass categories.
