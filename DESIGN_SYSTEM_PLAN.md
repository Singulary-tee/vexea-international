# SYSTEMATIC DESIGN TOKEN ARCHITECTURE PLAN (VEXEA DESIGN SYSTEM)

This document establishes the architecture, migration roadmap, and implementation details for a central, multi-file design token system. It is designed to replace all scattered, hardcoded visual properties (colors, typography, margins, paddings, gaps, and border thicknesses) with robust, dynamic primitives in strict compliance with Section 11 of `/ARCHITECTURE.md`.

---

## 1. Statement of Intent (Repeated Goals in Own Words)

To eliminate hardcoded layout calculations and design values across settings, main menu headers, and lobby views, we will execute the following:
1. **Design Token Centralization**: Rather than scattered style injections or magic strings/numbers, we will construct a dedicated folder (`/client/design-system/`) containing highly categorized files representing our core primitives.
2. **Systematic Multi-File Deconstruction**: The design system will be separated into primitive definitions (primitives like colors, sizing scales, border thicknesses) and contextual semantic layers (handling application variations depending on use case: small vs. large screen layouts, HUD elements, etc.).
3. **AAA Video Game Aesthetic Alignment**: Unlike static SaaS grid websites, an AAA video game UI demands cinematic, state-driven, high-performance visual elements. This system will integrate fluid, viewport-relative mathematical guarantees (`vh`, `vw`, `vmax`, `vmin`, and `clamp`) to prevent screen overlap, clipping, or scrolling.
4. **Extraction-First Workflow**: We will first inventory existing hardcoded styles in `/client/src/settings/ui.ts`, `/client/screens/main-menu.ts`, and `/client/screens/lobby.ts` to capture current measurements. We will then standardize those values into our token files and rewrite the client screens to consume the new token imports.
5. **Zero Violations Goal**: By the end of this standardization, all manual layout offsets, eyeballed padding/margins, and literal color hashes will be replaced with modular design tokens, satisfying `/ARCHITECTURE.md` Section 11.

---

## 2. Target Directory & File Structure

The new design token system will reside inside `/client/design-system/` to separate domain concerns cleanly:

```
/client/design-system/
├── primitives/
│   ├── colors.ts       # Absolute base palettes, faction colors, gradients, and transparency maps
│   ├── typography.ts   # Font families, mathematical step sizes, tracking rules, and weights
│   ├── borders.ts      # Border thicknesses, orthographic rules, and corner states (strictly 0px)
│   └── spacing.ts      # Absolute sizing gaps, margins, paddings, and touch-target definitions
├── semantic/
│   ├── settings.ts     # Settings screen-specific viewport-relative layout budgets and dimensions
│   ├── lobby.ts        # Lobby-specific queue slots, player cards, and banner dimensions
│   └── menu.ts         # Top bar header percentages, button clusters, and status trackers
└── index.ts            # Consolidated exports and procedural helper utilities (e.g., RGBA builders)
```

---

## 3. Modular Token Specifications

### 3.1. Primitives: Colors (`primitives/colors.ts`)
*   **Neutral Palette**: Warm/cool black bases with <5% HSB saturation (e.g., `#0A0A0A` and `#111111`) to prevent flat `#000` rendering.
*   **Semantic Alerts**: Distinct colors for `success`, `warning`, `danger`, `info`, and `dev` status monitoring.
*   **Faction & Unit Tones**: Color-aligned variables for game factions and drone-specific categories (`recon`, `rotary`, `bomber`, `ground`).

### 3.2. Primitives: Typography (`primitives/typography.ts`)
*   **Families**: Distinct division between Display/Condensed headers (`Barlow Condensed`) and Technical/Data text (`Rajdhani`, `Roboto Mono`).
*   **Scale**: Perfect Second (1.125) or Perfect Fourth (1.333) scales applied programmatically. Font sizes will be defined for `tiny`, `small`, `medium`, `large`, and `giga` display levels, using `clamp` rules to prevent clipping on small screen ratios.

### 3.3. Primitives: Borders & Shading (`primitives/borders.ts`)
*   **Strict Orthogonality**: No border-radius or rounded corners allowed (`0px`).
*   **Thickness Layers**: Defined rules for thin, thick, and selective panel-accent lines.

### 3.4. Primitives: Spacing & Gaps (`primitives/spacing.ts`)
*   **Rhythmic Gaps**: Scale-based spacing parameters ranging from micro-spacing (2px) to massive sections (32px) to guarantee optical balance.

### 3.5. Semantic Layout Budgets (`semantic/*.ts`)
*   These define responsive percentages and viewport ratios. Instead of arbitrary pixel heights, panels will use formulas like:
    *   `SETTINGS_PANEL_WIDTH = 'clamp(320px, 45vw, 600px)'`
    *   `LOBBY_TEAM_CARD_HEIGHT = '12vh'`
    *   `MENU_TOP_BAR_HEIGHT = '6vh'`

---

## 4. Extraction & Replacement Strategy

1.  **Audit & Collect**:
    *   Parse `/client/src/settings/ui.ts` to catalog all inline layout styles, sizes, and colors.
    *   Parse `/client/screens/main-menu.ts` to locate top-bar header, grid, and navigation panel styling.
    *   Parse `/client/screens/lobby.ts` to locate lobby slots, status tags, and team panels.
2.  **Populate Primitives**: Move all extracted values into `/client/design-system/primitives/` and resolve duplicates by standardizing on cohesive design tokens.
3.  **Refactor Components**: Modify all three target screens to import the specific dynamic variables from `/client/design-system/` rather than defining literal styles inline or inside script segments.
4.  **Mathematical Validation**: Ensure that each view's layout properties sum to $\le 100\%$ of its viewport container to guarantee zero overlaps, zero clipping, and complete responsiveness.
