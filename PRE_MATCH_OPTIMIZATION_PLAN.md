# Pre-Match Navigation & Studio Preview Optimization Plan

## 1. Code Audit Findings (Pre-Match & Studio Preview)

A thorough investigation of `StudioPreviewManager.ts`, `main-menu.ts`, `armory-screen.ts`, `splash.ts`, and `screen-manager.ts` against `ARCHITECTURE.md` revealed the root causes of pre-match stuttering and delayed transitions:

### Finding 1: On-Demand GLTF Parsing & Material Instantiation during Navigation
- **Location**: `StudioPreviewManager.ts` (lines 123–200)
- **Mechanism**: Every time the player switches a showcase item or skin in the Armory, Store, or Main Menu, `StudioPreviewManager.setShowcaseItem()` calls:
  - `loader.loadAsync(...)` via `getCachedOrFetchUrl(...)` to fetch and parse GLTF meshes dynamically (`smg_fps_animations.glb`, `animated_pistol.glb`, `grenade.glb`).
  - `gltf.scene.clone()` and `new THREE.MeshStandardNodeMaterial(...)` on demand.
  - `new THREE.TextureLoader().load(...)` for skin images mid-transition.
- **Impact**: Synchronous GLTF parsing, material construction, and GPU texture uploading stall the render thread during menu interaction.

### Finding 2: Uncompiled WebGPU / TSL Pipeline Shaders
- **Location**: `StudioPreviewManager.ts` & `main.ts`
- **Mechanism**: `StudioPreviewManager` creates `studioScene` and `studioCamera` (using `three/webgpu`). However, when a new 3D showcase model is attached to the scene, its WebGPU TSL node materials have not been pre-compiled.
- **Impact**: The main `WebGPURenderer` triggers driver-level WebGPU pipeline compilation on the first frame the model appears, causing frame drop/stutter.

### Finding 3: Re-building Screen DOM Nodes & Un-cached UI Textures
- **Location**: `screen-manager.ts`, `main-menu.ts`, `armory-screen.ts`
- **Mechanism**: Screen navigation destroys/re-renders DOM markup on the fly and fetches SVG/PNG icon assets on demand instead of reusing pre-instantiated DOM trees and pre-cached texture assets.
- **Impact**: Browser layout reflows and dynamic image loading lag behind user clicks.

### Finding 4: Artificial 600ms Double Timeout Lag in Screen Manager & Tab Delay
- **Location**: `screen-manager.ts` (lines 17-20 & 36-46) & `main-menu.ts` (lines 1385-1394)
- **Mechanism**:
  - `screen-manager.ts` uses sequential `300ms` `setTimeout` calls when switching screens: `hideAll()` sets `setTimeout(300)` for outgoing elements while `showScreen()` delays showing incoming elements by `setTimeout(300)`. This produces a combined **600ms artificial transition delay**.
  - `main-menu.ts` wraps `renderRightPanel()` content clearing and re-rendering in an additional `100ms` `setTimeout`.
- **Impact**: Forced 600ms delay between screen transitions and 100ms tab latency, causing artificial input lag when clicking tabs or navigating screens.

---

## 2. Architecture & Performance Alignment

Per system guidelines and mobile-first engine requirements:

1. **Splash Screen (Pre-Match Allocation)**:
   - Load and parse **standard base assets**:
     - Standard base UI textures & navigation icons.
     - Default standard 3D showcase models (Base Rifle `smg_fps_animations.glb`, Base Pistol `animated_pistol.glb`, Standard Grenade `grenade.glb`).
   - Run `renderer.compileAsync(studioScene, studioCamera)` during Splash Screen so WebGPU node pipelines are pre-warmed before the user reaches the Main Menu.

2. **Match-Time Loading Screen (In-Match Allocation)**:
   - Downloadable skin packages, full map geometries (`MapLoader.ts`), match physics world (`physics.worker.ts`), weapon impact VFX (`VFXOrchestrator.ts`), and match audio streams (`audioManager.loadAll()`) stay strictly in the **Match Loading Screen** (`LoadingOrchestrator.ts` / `LoadingScreen.ts`).

---

## 3. Action Plan & Task Breakdown

### Phase 1: Eliminate Artificial Timeout Lag
- **Screen Manager (`screen-manager.ts`)**: Remove the sequential 300ms + 300ms `setTimeout` delays. Switch screens instantly or perform direct non-blocking CSS transitions (`opacity` cross-fade without delaying element display).
- **Tab Switching (`main-menu.ts`)**: Remove the artificial `100ms` `setTimeout` in `renderRightPanel()`. Execute DOM panel rendering synchronously on frame.

### Phase 2: Pre-Parse Base Showcase Models & Pre-Warm Pipelines
- Pre-load standard GLTF models (`smg_fps_animations.glb`, `animated_pistol.glb`, `grenade.glb`) into IndexedDB via `getCachedOrFetchUrl()` during Splash Screen initialization (`splash.ts`).
- Instantiation pool in `StudioPreviewManager.ts`: keep pre-parsed, cloned base models in memory rather than re-fetching GLTF on every tab switch.
- Pre-compile `studioScene` with `renderer.compileAsync(studioScene, studioCamera)` during the Splash Screen loading progress.

### Phase 3: Instant UI Screen & DOM Retention
- In `screen-manager.ts`, retain pre-rendered menu screen containers in DOM.
- Use instant CSS layer toggling (`display: none` / `display: flex`) for pre-match screens (`main-menu`, `armory`, `store`, `lobby`).
- Pre-cache all standard UI icons (`ui_svgs/*`) so pre-match UI buttons render instantly without image loading flashes.

### Phase 4: Instant Skin Texture Swap
- In `StudioPreviewManager.ts`, pre-warm base standard skin textures (`STANDARD` & `HAZARD`).
- When switching skins in the Armory, perform immediate texture node swaps on the existing pre-instantiated mesh material without re-instantiating the GLTF hierarchy or re-creating node materials.

### Phase 5: Verification
- Verify sub-16ms screen and tab transitions across Main Menu, Armory, Store, and Faction screens.
- Confirm complete elimination of artificial 600ms screen delays and 100ms tab delays.
- Confirm zero runtime allocations or GLTF fetches during pre-match menu navigation.

---

## 4. Additional Findings: Splash → Lobby (Before Match Start)

### Finding 5: Splash Preload Queue Uses O(n) `shift()` Loop + Per-Asset Layout Churn
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/splash.ts` (lines 232–241, 225–229)
- **Mechanism**:
  - Worker preload loop repeatedly calls `queue.shift()` inside `while (queue.length > 0)`.
  - Progress UI writes (`loadingBarInner.style.width`, `initText.textContent`) execute on every asset completion.
- **Impact**: Extra CPU work and repeated style/layout updates during boot on slower devices.

### Finding 6: Screen Manager Re-queries DOM and Allocates Timers on Every Transition
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/screen-manager.ts` (lines 9–21, 35–47)
- **Mechanism**:
  - `hideAll()` calls `document.getElementById(...)` for each screen every time.
  - Per-screen `setTimeout` timers are re-created for each transition cycle.
- **Impact**: Avoidable transition overhead and timer churn in pre-match navigation.

### Finding 7: Main Menu Rebuilds Right Panel Tree Repeatedly
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/main-menu.ts` (lines 1413–1444)
- **Mechanism**:
  - `renderRightPanel()` clears `innerHTML` and reconstructs large DOM blocks for each mode change.
  - A `setTimeout` delay wraps each rebuild pass.
- **Impact**: High pre-match CPU/layout spikes when switching tabs before lobby.

### Finding 8: Redundant Main Menu Re-render Trigger on `show-main-menu`
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/screen-manager.ts` (line 56) + `/home/runner/work/vexea-international/vexea-international/client/screens/main-menu.ts` (lines 2986–2993)
- **Mechanism**:
  - Screen manager dispatches `show-main-menu`; listener calls `renderRightPanel()` again.
  - Main menu flow already performs panel rendering in normal setup paths.
- **Impact**: Duplicate work during splash → main menu transition.

### Finding 9: Offer Carousel Runs on Interval Even When Not Visible
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/main-menu.ts` (lines 996–1003)
- **Mechanism**:
  - `setInterval` + nested `setTimeout` keep mutating card UI continuously.
  - Updates keep firing regardless of whether the card/screen is visible.
- **Impact**: Idle CPU usage and unnecessary paint activity before match start.

### Finding 10: Lobby Selection Updates Re-query DOM Per Click
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/lobby.ts` (lines 390–409)
- **Mechanism**:
  - `updateSelection()` uses `querySelectorAll('.lobby-card-ability')` on every card every selection change.
- **Impact**: Avoidable repeated DOM queries in lobby interaction.

### Finding 11: Repeated Asset-Gating Calls for Lobby Entry
- **Location**: `/home/runner/work/vexea-international/vexea-international/client/screens/main-menu.ts` (lines 933, 1848)
- **Mechanism**:
  - `ensureAssetsDownloaded(() => screenManager.showLobby(), getDefaultMap().id)` is invoked from multiple entry points.
- **Impact**: Duplicate pre-lobby gate checks and callback setup overhead.

---

## 5. Action Plan Extension (Splash → Lobby Path)

### Phase 6: Splash Preload Pipeline Tightening
- Replace queue `shift()`-based worker loop with index-based consumption.
- Coalesce splash progress bar/text updates to animation-frame cadence (instead of every single asset completion).

### Phase 7: Transition Path Caching
- Cache screen element references once in `screen-manager.ts` and reuse them for hide/show operations.
- Replace timer-heavy hide/show flow with a single deterministic transition path per screen switch.

### Phase 8: Main Menu Render Path Stabilization
- Introduce persistent right-panel containers for major modes (`DEFAULT`, `PLAY`, `LOADOUT`, `STORE`, `INTEL`) and toggle visibility.
- Remove redundant re-render triggers on `show-main-menu` when no state has changed.
- Pause/stop offer carousel when screen/card is inactive; resume only when visible.

### Phase 9: Lobby Interaction Micro-Optimizations
- Cache per-card ability element references during lobby construction and update styles without repeated selector queries.
- Deduplicate lobby entry pre-download logic using a single in-flight promise for map asset gating.

### Phase 10: Verification (Pre-Match Path Only)
- Measure splash-to-main-menu and main-menu-to-lobby transition latency before/after optimization.
- Confirm no redundant right-panel rebuilds on main menu re-entry.
- Confirm reduced idle timers/interval activity while user remains in pre-match screens.
