# Studio Preview & UI Layout Architecture Plan

## Core Architecture Principles
1. **Single Persistent Studio WebGPU Canvas**:
   - Initialize a single shared WebGPU scene (`THREE.WebGPURenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`) at application startup.
   - Maintain and reuse this same canvas/renderer context seamlessly across menu screens (Main Menu, Armory, Store, Lobby).
   - Do NOT create or destroy the WebGPU context when switching between menu tabs (complying strictly with `ARCHITECTURE.md`).
   - Canvas context teardown & garbage collection (GC) occurs exclusively during major match transition screens (e.g. Loading Screen when entering/exiting a match).

2. **No Playable Drone Classes or Roleplay Mechanics**:
   - Drones are LLM/AI-controlled autonomous entities, NOT playable human character classes.
   - Unrecognized class designations ("Striker, Recon, Titan, Engineer") are strictly omitted.
   - The Armory and Store focus strictly on actual catalog equipment, weapons, attachments, map assets, and LLM configuration loadouts.

---

## Screen-by-Screen Layout Specification

### 1. Main Menu (`client/screens/main-menu.ts`)
- **Strict Preservation Rule**: The Main Menu design, layout, styling, and navigation structure will NOT be modified beyond embedding the 3D studio viewport into the right panel container below the top header bar.
- **3D Canvas Allocation**: Placed inside the existing right panel area directly below the top header bar.
- **Left Panel & Controls**: Kept intact as currently designed (navigation tabs, quick match, user profile, server status).

### 2. Armory Screen (`client/screens/armory-screen.ts`)
- **3D Canvas Allocation**: Occupies the majority of the central/right screen area, presenting a high-fidelity 3D studio view of selected weapons/equipment.
- **Left Panel**: Item list, weapon categories, stats, and attachment selection.
- **Right Panel**: Detailed item specs, unlock criteria, and equip controls (filling side margins).

### 3. Store / Shop Screen (`client/screens/store-screen.ts`)
- **3D Canvas Allocation**: Activated for 3D inspection when the user clicks on a inspectable catalog entry.
- **Left/Right Panels**: Expanded layout utilizing the full screen width with structured item grids, filters, transaction details, and credit balance.

### 4. Lobby Screen (`client/screens/lobby-screen.ts`)
- **3D Canvas Allocation**: Occupies most of the screen area, rendering 3D environment/map previews or lobby backdrops.
- **Left/Right Overlays**: Player readiness list, match settings, chat, and launch controls.

### 5. Remaining Screens & Tabs
- Expand left and right side margins across all auxiliary panels (Settings, Feedback, Leaderboards, Map Editor) to eliminate bare/empty side spacing and maintain visual consistency.
