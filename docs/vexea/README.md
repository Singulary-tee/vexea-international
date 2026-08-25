# VEXEA VFX and UI Motion Documentation

This directory is the branch-ready documentation bundle for the accepted gameplay VFX and internal UI motion pass. The documents are implementation guidance for a later repository integration pass; they do not themselves modify runtime behavior.

## Current source-of-truth documents

| Document | Purpose | Status |
|---|---|---|
| `VEXEA_GAMEPLAY_VFX_CONTRACT.md` | Static assets, flipbooks, tracers, muzzle, impacts, decals, explosions, fire, scale, blending, pools, and ownership | Accepted reconstructed contract; compare against latest source before implementation |
| `VEXEA_UI_ANIMATION_CONTRACT.md` | Matchmaking radial, reusable internal surface motion, accepted loading/pass category boundaries, and implementation interface | Accepted UI motion contract |
| `VEXEA_UI_DESIGN_SYSTEM_INTERACTIONS.md` | Grey/white icon states, settings primitives, quiet ambient categories, ownership, and reduced motion | Accepted design-system contract |
| `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md` | Final horizontal loading bar and full-season free/premium battle-pass progression line | Accepted final loading and battle-pass contract |
| `GEMINI_VEXEA_VFX_UI_IMPLEMENTATION_PROMPT.md` | Handoff prompt that binds the companion contracts and required verification workflow | Ready for later implementation signal |

## Supporting audit and research

`VEXEA_UI_SVG_AND_CLICKABLE_AUDIT.md` records the current white SVG and forced-white patterns and the main-menu action-card exclusion. `VEXEA_SETTINGS_MOTION_AUDIT.md` maps the settings tabs and control families to shared tokens. `VEXEA_UI_MOTION_RESEARCH_AND_PROPOSALS.md` preserves the external motion research and decision matrix. `VEXEA_BP_LOADING_REFRESH_BRIEF.md` records the current repository semantics and final loading/pass preview verification.

## Historical records

`VEXEA_UI_REDESIGN_RESEARCH.md`, `VEXEA_UI_CONCEPT_RESET.md`, and `VEXEA_APPROVED_MOTION_LANGUAGE.md` retain the design-review history. Their rejected experiments must not be used as fallback implementations. The final accepted loading and battle-pass directions are the horizontal loading bar and full-season progression line specified in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`.

## Delivery boundary

The branch bundle must be compared against the latest repository before code changes. The implementation pass must register source edits in `CODEBASE_INDEX.md` before and after modification, preserve WebGPU/TSL, preserve Geckos.io, avoid React and legacy WebGLRenderer, keep zero-GC hot-loop rules, and leave main-menu action cards unchanged.
