# VEXEA Comprehensive UI & Navigation System Plan

## 1. Visual & Aesthetic Architecture (Anti-Slop & Architecture Compliance)

### 1.1 Strict Visual Rules (Anti-Slop Compliance)
*   **NO Glassmorphism / NO Backdrop Blur**: All cards, modals, and headers use **solid, opaque matte black/obsidian panels** (`#000000` / `#0D0D0D` / `#121212`).
*   **Panels & Borders**: Sharp, rectangular tactical containers with minimal border radius (0px to 4px max) framed by crisp, low-luminance solid borders (`#222222` / `#2A2A2A`).
*   **Color Palette**:
    *   **Primary Accent**: High-visibility Tactical Orange (`#FF4500` / `#FF5500`) for active tab indicators, primary CTA buttons (`QUICK MATCH`), active selections, and progress fills.
    *   **Background Canvas**: Dark ambient tactical backdrop featuring high-contrast operative silhouette and cityscape atmosphere.
    *   **Text & Indicators**:
        *   Headings: Crisp, uppercase `Barlow Condensed` with high tracking (`letter-spacing: 2px`).
        *   Stats / Monospace Data: `Roboto Mono` for crisp alignment of currencies (`CR 100`, `EN 100`), levels, timer countdowns, and weapon specs.
*   **Framework & Engine Rule**: Vanilla JS + HTML overlay only (**No React**). Render engine is strictly Three.js WebGPU with TSL (Three Shading Language). No `THREE.WebGLRenderer`.

### 1.2 Persistent Top Navigation Shell (64px)
Retained across all menu screens:
*   **Left**: `VEXEΛ` high-visibility orange wordmark + Currency pills (`CR 100` in orange border pill, `EN 100` in secondary neutral pill).
*   **Center Tabs** (5 top navigation tabs):
    1. **START** (Active home screen grid + pre-match Lobby deployment).
    2. **ARMORY** (Fixed class loadouts, stat breakdown, and 3D weapon skin/texture inspector).
    3. **STATS** (Contractor Profile, LLM Commander Intel, Challenges, and Leaderboard).
    4. **FACTION** (Strategic Faction War: Vibe Co. vs Slop Inc.).
    5. **STORE** (Marketplace with prioritized Offers, class/slot filters, and 3D skin previews).
*   **Right Profile & Quick Controls**: Player Callsign (`ZNZN`), Level badge with progress bar, Grid/Friends/Messages icons, and Settings gear.

---

## 2. Detailed Screen Breakdown & System Integration

### 2.1 `START` Tab & Pre-Match Lobby Flow (`main-menu.ts` & `lobby.ts`)
*   **Home View (`main-menu.ts`)**:
    *   **Hero Card**: `INFILTRATION` gamemode feature card with prominent orange `QUICK MATCH` button.
    *   **Sub-Grid Cards**: Solid black cards with top/bottom labels:
        *   `UPDATES`: Beta patch notes and system status.
        *   `LEADERBOARD`: Quick jump to Stats -> Leaderboard sub-tab.
        *   `INTEL`: Quick jump to Stats -> Intel sub-tab.
        *   `SQUAD RAID`: Quick start a match with friends (party match lobby, NOT a separate game mode).
    *   **Bottom Cards**: `CHALLENGES` card with countdown reset timer + `OFFERS` card featuring featured skin offers.
*   **Lobby Integration (`/client/screens/lobby.ts`)**:
    *   **Transition**: Clicking `QUICK MATCH` or selecting a deployment mode transitions the view into the lobby overlay while keeping the top navigation shell intact.
    *   **Existing `lobby.ts` Reuse**: Preserves game mode rules (`INFILTRATION` / `HARDCORE`), AP regen modifiers, class selection (`ASSAULT`, `MEDIC`, `RECON`, `DEMOLITIONS`), and readiness state logic.
    *   **Deploy Action**: Large solid orange `DEPLOY / READY` CTA button triggers asset pre-loading (`ensureAssetsDownloaded`) and launches into match via `MatchController`.
    *   **Back Navigation**: "← BACK" button in top left returns directly to the main menu `START` grid.

---

## 2.2 `ARMORY` Tab (`/client/screens/armory-screen.ts`)
*   **Class Loadout Constraint (Strict Gameplay Compliance)**:
    *   Weapon & equipment loadouts are **FIXED per class** (`ASSAULT`, `MEDIC`, `RECON`, `DEMOLITIONS`) as dictated by `GAMEPLAY.md`. Custom weapon swapping or dynamic attachment editing is forbidden.
    *   **Skin Swap Rule**: Skin texture selection IS allowed per item slot per class (Primary, Secondary, Utility 1, Utility 2). Selecting a slot allows hot-swapping cosmetic textures on that specific weapon/item, NOT changing the weapon/tool type itself.
*   **Layout Structure**:
    *   **Left Column (1/3 Width)**:
        *   4 Class Selector Tabs (`ASSAULT`, `MEDIC`, `RECON`, `DEMOLITIONS`).
        *   Fixed Loadout Slot Cards: Primary Weapon, Secondary Weapon, Utility Tool 1, Utility Tool 2.
    *   **Top-Left Floating HUD**:
        *   Weapon Designation (e.g., `M4 RIFLE`), Archetype badge, Fixed Stat Bars (Damage, Rate of Fire, Capacity, Range), and currently equipped Skin Name.
    *   **Right 3D Inspection Canvas (2/3 Width)**:
        *   Full-height Three.js WebGPU viewport rendering the 3D model of the selected slot item.
        *   Supports touch/mouse drag-to-rotate and zoom.
    *   **Bottom Cosmetics Palette**:
        *   Horizontal row of skin cards (`HAZARD`, `TACTICAL BLACK`, `CYBER NEON`, `TITANIUM`) applying instant texture hot-swapping to the active slot model.

---

## 2.3 `STATS` Tab (`/client/screens/stats-screen.ts`)
The `STATS` tab operates as a multi-system tactical terminal housing 4 distinct sub-navigation views (NOT a post-match overlay):

1.  **PROFILE (Contractor Career Overview)**:
    *   Contractor Callsign (`ZNZN`), Faction Badge, Rank Level, and XP progression curve.
    *   Career Performance Grid: Matches Played, Win Rate %, K/D Ratio, Accuracy %, Average Score, Total Damage Dealt.
    *   Class Expertise breakdown (time played and efficiency per class).
    *   Recent Match History log.
2.  **INTEL (LLM Adaptive Analysis Terminal)**:
    *   Hosted within the `STATS` tab terminal (NOT a post-match screen).
    *   Displays what the LLM commander has learned about contractor habits (favorite combat zones, camera evasion frequency, direct combat accuracy, disruption rating).
    *   System diagnostic feed simulating AI memory decay and threat level analysis.
3.  **CHALLENGES (Daily & Weekly Contracts)**:
    *   Sourced directly from `client/data/challenges.json`.
    *   Card progress list for objectives ("DRONE SWARM DISPATCH", "HARDPOINT HOLDER", "PRECISION SHOTS").
    *   Claim Reward buttons granting `CR` or `EN`.
4.  **LEADERBOARD (Contractor Standings)**:
    *   Global contractor rank table sorted by Score, Kills, Wins, or Faction Points.
    *   Top 3 podium display with contractor callsigns and rank badges.

---

## 2.4 `FACTION` Tab (`/client/screens/faction-screen.ts`)
*   **Data Source**: Sourced from `GAMEMODE_CONFIG.md` (Section 1 - Faction War System).
*   **Layout**:
    *   **Dual Faction Comparison**: Solid black split panels comparing **Vibe Co.** (Minimalist Tech / Cyber Neon) vs **Slop Inc.** (Gritty Tactical Industry).
    *   **Territory Control Bar**: Global influence progress indicator showing territory control breakdown (e.g., 52% Vibe Co. vs 48% Slop Inc.).
    *   **Contractor Affiliation & Buffs**: Active player faction card showing active combat perks (+10% AP Regen on Facility Map, +15% CR rewards for Infiltration matches).
    *   **War Effort Contracts**: Faction-wide objective contributions.

---

## 2.5 `STORE` Tab (`/client/screens/store-screen.ts`)
*   **Layout**:
    *   **Top Priority Area (Featured Offers)**: Prominent banner featuring time-limited discounted skin bundles from `client/data/offers.json`.
    *   **Filter Bar**: Class filters (`ALL`, `ASSAULT`, `MEDIC`, `RECON`, `DEMOLITIONS`) and Slot filters (`PRIMARY`, `SECONDARY`, `UTILITY`, `SKINS`).
    *   **Compact Store Grid**: Solid black grid cards featuring item PNG preview with skin texture, weapon/item name, tier badge, and currency cost (`CR`).
    *   **3D Skin Preview Modal**: Clicking any store card opens an overlay modal with the live Three.js WebGPU 3D model wearing that skin texture, allowing 360-degree rotation before purchase.

---

## 3. Implementation Plan
1.  **Acknowledge Plan**: Specifications verified against `ARCHITECTURE.md`, `GAMEPLAY.md`, and `GAMEMODE_CONFIG.md`.
2.  **Create Screen Modules (Vanilla JS / HTML Overlay)**:
    *   `/client/screens/armory-screen.ts`
    *   `/client/screens/stats-screen.ts`
    *   `/client/screens/faction-screen.ts`
    *   `/client/screens/store-screen.ts`
3.  **Refine Existing Navigation Flow**:
    *   Update `/client/screens/lobby.ts` to nest smoothly into the `START` tab pre-match flow.
    *   Update `/client/screens/screen-manager.ts` and `/client/screens/main-menu.ts` to handle top navigation tabs while maintaining the persistent shell.
