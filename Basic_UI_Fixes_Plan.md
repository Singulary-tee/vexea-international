# VEXEA: UI & UX Implementation Plan (Expanded)

This document maps the identified issues to technical investigations and proposed fixes, adhering strictly to `ARCHITECTURE.md`.

---

### Issue #1: "The chat box is in the wrong position and i can't move it because it doesn't appear in the hud editor."
- **Investigation**: `client/ui_editor.ts` maintains a `FRIENDLY_NAMES` map for editable elements. Currently, the chat container `#hud-chat-log` is missing from this registry. The `initUIEditor` function also selects elements once at startup, which might miss dynamically initialized components.
- **Proposed Fix**: 
    - Add `"hud-chat-log": "Chat Log"` to `FRIENDLY_NAMES` in `client/ui_editor.ts`.
    - Ensure `#hud-chat-log` is included in the `editableIds` array for selection.

### Issue #2: "If i click outside the chat box it doesn't disappear. It still waits for me to enter a message."
- **Investigation**: `client/src/systems/ChatHUDSystem.ts` manages the chat's `isActive` state. It listens for the 'Enter' key to activate/deactivate but lacks a listener for clicks outside the container.
- **Proposed Fix**: 
    - Add a `pointerdown` listener to `document` in `ChatHUDSystem.ts`.
    - If `isActive` is true and the click target is not within `this.inputContainer` or `this.chatBtn`, call `this.deactivateInput()` and ensure the UI container is hidden/reset as per the "disappear" requirement.

### Issue #3: "The chat box doesn't use my actual account name it's using some 'PL_92873' or whatever."
- **Investigation**: `server/index.ts` generates random `PL_` IDs in its `MATCH_CONNECT` handler. The client in `main.ts` does not pass the user's Firebase Auth `displayName` during the connection phase.
- **Proposed Fix**: 
    - Modify `client/main.ts` to extract `auth.currentUser.displayName` and pass it in the initial connection payload.
    - Update the server's connection logic to use this name if provided, falling back to the random ID only if necessary.

### Issue #4: "The left side shooting button doesn't work. Infact every pixel in the left side of the screen registers as shooting for some reason except for the literal shooting button..."
- **Investigation**: The current mobile firing implementation uses broad screen areas rather than strictly binding to the specific HUD buttons.
- **Proposed Fix**: 
    - Remove any area-based firing logic from `InputSystem.ts` for mobile.
    - Strictly bind firing events (`triggerFireStart`, `triggerFireEnd`) to the `btn-fire-left` and `btn-fire-right` elements using `PointerEvents`.
    - Ensure `canvasContainer` click listeners for firing are gated strictly to `IS_DESKTOP`.

### Issue #5: "The keyboard shortcuts appear in the hud editor for mobile users when they shouldn't... issue extends to Desktop users seeing joysticks..."
- **Investigation**: `client/hud_template.ts` renders all controls regardless of platform.
- **Proposed Fix**: 
    - Reuse existing platform visibility logic: apply `platform-mobile` and `platform-desktop` CSS classes to elements in `hud_template.ts`.
    - `ui_editor.ts` must use these existing platform-gate markers to filter the `editableIds` list, ensuring only platform-appropriate elements are listed for editing. Do not implement a second platform-hiding system.

### Issue #6: "The utility usage triggers some sort of a Blackbox around it with a timer... Changing the colour of the svg with a visual indicator instead of a literal countdown would be better."
- **Investigation**: `HUDSystem.ts` updates the `textContent` of `#util-1-cooldown` and `#util-2-cooldown`, which are currently styled as black boxes in the template.
- **Proposed Fix**: 
    - Remove the text labels and background boxes from the HUD template.
    - In `HUDSystem.ts`, update `updateUtilities` to apply a grayscale filter (`filter: grayscale(1)`) and reduced opacity to the SVG icons when on cooldown.

### Issue #7: "The firing mode toggle from auto to burst doesn't work for the rifle for some reason."
- **Investigation**: `InputSystem.ts` handles the `TOGGLE_FIRE_MODE` event. The rifle state synchronization between the client's `MatchController` and the server's `MatchRoom` needs verification for fire mode updates.
- **Proposed Fix**: 
    - Debug the rifle's fire mode state transition in `InputSystem.ts` and ensure the server acknowledges the change.
    - Add a visual confirmation (text update or icon change) in the weapon HUD.

### Issue #8: "I can still trigger going back to the settings screen if i click on the 3 utility buttons while I'm in the hud editor."
- **Investigation**: HUD interactions are not correctly gated when the UI editor is active.
- **Proposed Fix**: 
    - Utilize the existing **Input Locker** logic. Update `InputSystem.isGameInputLocked()` (or the equivalent check in individual button handlers) to correctly recognize the active UI editor state.
    - Ensure all HUD interaction handlers in `InputSystem.ts` and `HUDSystem.ts` respect this input lock to prevent accidental triggers while editing.

### Issue #9: "The hud editor's in editor box has incredibly buggy dragging logic. Sometimes it drags sometimes it jumps..."
- **Investigation**: Current dragging in `ui_editor.ts` needs a unified approach for both mobile and desktop.
- **Proposed Fix**: 
    - Implement dragging using **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`) to natively support both touch and mouse interactions.
    - Capture the pointer offset relative to the element's top-left corner on `pointerdown` to eliminate jumping.
    - Use percentage-based positioning (`vw`/`vh`) for final coordinate storage to maintain layout across device resolutions.

### Issue #10: "The 'export as json' buttons must be gated behind the dev gate... Clicking 'close' without saving their preferences shouldn't automatically save their changes."
- **Investigation**: `ui_editor.ts` development features are exposed to production.
- **Proposed Fix**: 
    - Gate the export buttons using `IS_DEV` and `assertDev` from the existing **Production Gate** (`shared/gates/production.gate.ts`).
    - Modify the "Close" button logic to discard unsaved state changes by reloading the last confirmed layout from `localStorage`.

### Issue #11: "Opening the hud editor in the main menu then exiting and starting a match locks up the controls."
- **Investigation**: The `inputManager.setInputLocked(true)` state persists if the editor is opened in the menu and the match starts before it is closed, or if the exit cleanup fails to run.
- **Proposed Fix**: 
    - Ensure `inputManager.setInputLocked(false)` is explicitly called in the `ScreenManager` transition logic when entering a match or closing any menu-level editor.

### Issue #12: "The compass is using actual area names plus it uses numbers... The compass is too small and the numbers overlap..."
- **Investigation**: `CompassSystem.ts` renders degree numbers and area name strings in its canvas update loop.
- **Proposed Fix**: 
    - Remove the rendering calls for degrees and area names.
    - Simplify the visual to only cardinal letters (N, E, S, W, etc.) and tick marks to improve clarity in the small viewport.

### Issue #13: "the joystick transitions from walking to running extremely quickly. The players shouldn't simply drag it up to run they should drag it way up."
- **Investigation**: `InputSystem.ts` currently triggers sprinting when the joystick vertical normalization `normY` exceeds `0.8`.
- **Proposed Fix**: 
    - Increase the `normY` threshold to `0.95` to require a full extension of the joystick to activate sprinting.

### Issue #14: "The text under the minimap should change depending on the actual location the player is in instead of being hardcoded to 'core'"
- **Investigation**: `MinimapSystem.ts` has a hardcoded string update for the `#minimap-label`.
- **Proposed Fix**: 
    - Implement a coordinate-to-zone lookup in `MinimapSystem.ts` using the map's zone definitions.
    - Update the label dynamically based on which zone contains the player's current position.

### Issue #15: "VFX System Expansion (Non-Monolithic)"
- **Investigation**: `ARCHITECTURE.md` prohibits monolithic files. Upcoming effects need dedicated modular systems.
- **Proposed Fix**: 
    - Create `client/src/vfx/DamageIndicators.ts` for directional UI hit markers.
    - Create `client/src/vfx/EnvironmentalEffects.ts` for explosion particulates and dust.

### Issue #16: "LLM Note Notification Skeleton"
- **Investigation**: This requires a lightweight HUD notification system that reacts to server-sent events.
- **Proposed Fix**: 
    - Implement `client/src/systems/LLMNoteVisualSystem.ts` as a pure listener.
    - It must listen for a specific event sent by the server (e.g., `NEW_LLM_NOTE` via socket) and trigger a simple CSS/HTML-based fading icon animation. No expensive client-side logic or state management.

### Issue #17: "SVG Folder for Vexea Assets"
- **Investigation**: Need a structured directory for project-specific branded assets.
- **Proposed Fix**: 
    - Create `/ui_svgs/vexea/` directory to house upcoming branded SVG components.
