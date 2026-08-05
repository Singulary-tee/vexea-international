# Gemini HUD Calculator & Architecture Section 11 Analysis

## Overview
This document serves as the mathematical specification and audit record for the VEXEA HUD Editor (`client/ui_editor.ts`) evaluated against **Architecture.md Section 11: Strict Sizing Mathematization & Anti-Eyeballing Protocol**.

## Review of UI Editor Findings (`client/ui_editor.ts`)

1. **Absolute Pixel Hardcoding & Eyeballing Risks in Panel Layouts:**
   - The UI editor bar uses fixed pixel widths (`width: 320px`), absolute positioning (`top: 50px`, `left: 50px`), and fixed padding (`20px`).
   - Range inputs and numeric controls use hardcoded ranges (e.g., `min="0" max="1920"`, `min="0" max="1080"`) without viewport-relative scaling (`vw`, `vh`, `clamp`).
   - Element scaling and coordinate repositioning within the HUD editor rely on direct pixel mutation (`leftPx`, `topPx`, `scale`) without mathematical container constraint proofs across different aspect ratios.

2. **Compliance with Architecture.md Section 11:**
   - **Absolute Ban on Eyeballing:** The current UI editor allows manual dragging and arbitrary pixel offset adjustments (`leftPx`, `topPx`), which directly violates Section 11's ban on arbitrary sizing and eyeballing unless constrained by strict proportional/ratio mathematical proofs.
   - **Zero-Overlapping Guarantee:** The HUD elements manipulated via `ui_editor.ts` do not mathematically enforce bounding box collision detection or grid-relative snapping guarantees that prevent UI overlapping on smaller mobile or ultra-wide viewport resolutions.

## Mathematical Constraints for HUD Elements
- All HUD containers and interactive touch overlays must be bounded within viewport percentage coordinates (`vw`/`vh`) or strict fractional flex grids.
- Snapping logic (`getGridSnap`) must be tied to deterministic scale ratios rather than arbitrary pixel increments.

## Device Measurements Note
These measurements have been manually placed by me on my device which in landscape is exactly "The active canvas space is 1080 height pixels x 2287 pixels width".
