# Implementation Plan: 3D Studio Model & Scene Architecture Overhaul

## 1. Problem Diagnosis & Root Cause Analysis

Based on investigation of `ARCHITECTURE.md`, `StudioPreviewManager.ts`, `StudioCharacterPreview.ts`, `main-menu.ts`, `screen-manager.ts`, `armory-screen.ts`, `store-screen.ts`, and `lobby.ts`, the root causes for the reported rendering defects are:

### A. Weapons Lying Down & Too Small (Armory & Store)
* **Root Cause:** Weapons loaded from GLTF files (`scar_l-optimized.glb`, `smg_fps_animations.glb`, `animated_pistol.glb`, `grenade.glb`, etc.) have local GLTF mesh orientations lying flat. `StudioPreviewManager.ts` applied a simple Y-axis rotation `(0, -Math.PI / 2, 0)` which left weapons flat/lying down on their side.
* **Scale / Distance:** Weapons were scaled to `0.65m` with camera placed at distance $Z = 2.2m$ with a $45^\circ$ FOV. This caused guns to take up less than $10\%$ of viewport height, making them appear tiny and distant.

### B. Player Model Behind Camera / Invisible (Lobby & Studio Character Preview)
* **Root Cause:** In `StudioPreviewManager.ts`, `model.position.sub(centerLocal)` calculated the bounding box center of `Player_one-optimized.glb`. Due to skeleton bone offsets or unskinned mesh roots in the GLTF file, `centerLocal.z` evaluated to $+2.5$ to $+3.5$ meters. Subtracting this shifted the character model $3.5$ meters backward to $Z = -3.0$, placing the player model **behind the camera** ($Z = 2.0 \text{ to } 2.8$) or clipped out of view.

### C. Tab-Switching Glitches & Model Leakage (Sticking Around, Appearing Late, Breaking Other Models)
* **Root Cause 1 (Async Race Conditions):** `buildShowcaseModel()` is asynchronous without a request cancellation token. Rapid tab switching triggers multiple concurrent GLTF loads. Older requests finish later and inject stale models into `activeModelGroup`, overwriting active tab models or leaving zombie models behind.
* **Root Cause 2 (No Synchronous Reset):** Switching modes via `attachTo()` did not synchronously wipe `activeModelGroup`, stop animation mixers, or reset light parameters before starting new async loads.
* **Root Cause 3 (DOM Reparenting & Undetached Canvas):** `main-menu.ts` wiped innerHTML (`rightPanelContent.innerHTML = ''`) without safely detaching or preserving the canvas container `#canvas-container`. When switching to non-3D tabs (e.g., STATS, FACTION, FEEDBACK), `StudioPreviewManager` was left attached in an orphaned or stale state.

---

## 2. Proposed Architecture & Remediation Plan

### Step 1: Request Token Tracking & Synchronous Reset (`StudioPreviewManager.ts`)
* Introduce an auto-incrementing `currentLoadRequestId` token to `StudioPreviewManager`.
* On any `attachTo()`, `setShowcaseItem()`, or mode change:
  1. Increment `currentLoadRequestId`.
  2. Synchronously clear `activeModelGroup` children (disposing geometry/materials).
  3. Stop active animation mixers immediately.
  4. Hide `activeModelGroup` or set temporary loading placeholder until the matching request completes.
* In `buildShowcaseModel()`, capture `const requestId = ++this.currentLoadRequestId`. After `await loader.loadAsync()`, check if `requestId !== this.currentLoadRequestId`. If mismatched, immediately discard the loaded GLTF scene and abort.

### Step 2: Correct Weapon Orientation & Auto-Framing (Armory & Store)
* Implement dedicated showcase Euler rotations for weapons:
  * Default Showcase Angle: Tilt weapon diagonally (`Pitch = 15° to 20°`, `Yaw = -35° to -45°`, `Roll = 5° to 10°`) so the receiver, barrel, and magazine face the camera in an upright 3D showcase pose.
* Implement Camera Auto-Framing / Dynamic Distance Scaling:
  * Compute object bounding box in showcase rotation.
  * Calculate exact camera distance $Z$ required based on vertical and horizontal FOV:
    $$d = \frac{\text{max}(\text{size.y}, \text{size.x} / \text{aspect})}{2 \cdot \tan(\text{fov} / 2)} \times \text{paddingFactor}$$
  * Adjust camera position and `lookAt` to target weapon center, ensuring the weapon occupies $60-70\%$ of viewport.

### Step 3: Correct Player Model Positioning & Camera (Lobby & Main Menu)
* Fix character model centering math:
  * Do **NOT** subtract raw bounding box Z-offset for humanoid character models. Lock character root at $Z = 0$, $X = 0$, and align Y so character feet rest at $Y = -1.1m$.
  * Set camera position to $[0, 0.3, 2.5]$ looking at $[0, 0.1, 0]$ (or mode-specific framing) so player model is framed from head to knees/feet in front of camera.
* Normalize character bone/skinned mesh bindings via `fixSkinnedMeshBones()` without corrupting local transforms.

### Step 4: Robust Canvas Lifecycle & Tab-Switching Handling (`screen-manager.ts` & `main-menu.ts`)
* Add explicit `detach()` calls when navigating to tabs that do not require 3D rendering (e.g., STATS, FACTION, FEEDBACK, MAP_EDITOR).
* In `main-menu.ts` `setActiveCard()` and `renderRightPanel()`:
  * Before clearing container `innerHTML`, safely reparent `#canvas-container` back to `#vexea-view` or hidden background parent.
  * Call `StudioPreviewManager.attachTo()` cleanly when entering ARMORY or STORE, and `StudioPreviewManager.detach()` when leaving 3D tabs.

### Step 5: Verification & Testing Checklist
* Test switching rapidly between all 5 main menu tabs (START, ARMORY, STATS, FACTION, STORE) and LOBBY. Verify zero model leakage, zero console errors, zero models sticking around or appearing late.
* Verify weapons in Armory and Store stand upright at diagonal showcase angles and fill the viewport nicely.
* Verify player model in Lobby and Studio character preview stands in front of camera, fully visible.
* Run `lint_applet` and `compile_applet` to confirm zero compilation errors.

---
