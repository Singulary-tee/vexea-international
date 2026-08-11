# VEXEA: UI & UX Implementation Plan (Expanded)

This document maps the identified issues to technical investigations and proposed fixes, adhering strictly to `ARCHITECTURE.md`.

---

### Issue #1: "The chat box is in the wrong position and i can't move it because it doesn't appear in the hud editor." [unresolved]
- **Investigation**: `client/ui_editor.ts` maintains a `FRIENDLY_NAMES` map for editable elements. Currently, the chat container `#hud-chat-log` is missing from this registry. The `initUIEditor` function also selects elements once at startup, which might miss dynamically initialized components.
- **Proposed Fix**: 
    - Add `"hud-chat-log": "Chat Log"` to `FRIENDLY_NAMES` in `client/ui_editor.ts`.
    - Ensure `#hud-chat-log` is included in the `editableIds` array for selection.
- **Post-Attempt Feedback**:
    - Wasn't fixed. Still doesn't appear in the HUD editor. Keep in mind that the chat box fades out during normal gameplay.

### Issue #2: "If i click outside the chat box it doesn't disappear. It still waits for me to enter a message." [unresolved]
- **Investigation**: `client/src/systems/ChatHUDSystem.ts` manages the chat's `isActive` state. It listens for the 'Enter' key to activate/deactivate but lacks a listener for clicks outside the container.
- **Proposed Fix**: 
    - Add a `pointerdown` listener to `document` in `ChatHUDSystem.ts`.
    - If `isActive` is true and the click target is not within `this.inputContainer` or `this.chatBtn`, call `this.deactivateInput()` and ensure the UI container is hidden/reset as per the "disappear" requirement.
- **Post-Attempt Feedback**:
    - Wasn't fixed. If a message isn't sent, the chat box still doesn't disappear no matter where the user clicks.

### Issue #3: "The chat box doesn't use my actual account name it's using some 'PL_92873' or whatever." [unresolved]
- **Investigation**: `server/index.ts` generates random `PL_` IDs in its `MATCH_CONNECT` handler. The client in `main.ts` does not pass the user's Firebase Auth `displayName` during the connection phase.
- **Proposed Fix**: 
    - Modify `client/main.ts` to extract `auth.currentUser.displayName` and pass it in the initial connection payload.
    - Update the server's connection logic to use this name if provided, falling back to the random ID only if necessary.
- **Post-Attempt Feedback**:
    - Wasn't fixed. Still displaying as `PL_****`.

### Issue #4: "The left side shooting button doesn't work. Infact every pixel in the left side of the screen registers as shooting for some reason except for the literal shooting button..." [unresolved]
- **Investigation**: The current mobile firing implementation uses broad screen areas rather than strictly binding to the specific HUD buttons. Desktop players get their mouse captured in match: meaning they don't get to click on anything, there is no cursor on screen, they move their mouse to look around, each mouse button is keybinded to an action, and there is no "Left side of the screen" for Desktop users (making any click-based area checks a pointless invocation for desktop).
- **Proposed Fix**: 
    - Remove any broad area-based firing logic from `InputSystem.ts` for mobile touch input.
    - Strictly bind firing events (`triggerFireStart`, `triggerFireEnd`) to the mobile HUD buttons (`btn-fire-left` and `btn-fire-right`) using `PointerEvents`.
    - Document that desktop users have their mouse captured in-match with no cursor on screen, mouse movement used for looking around, mouse buttons keybinded to actions, and no "Left side of the screen" click interactions.
- **Post-Attempt Feedback**:
    - Wasn't fixed and actively regressed. Almost every touch triggers firing (clicking left side of screen, health bar, minimap, in/out of minimap, settings, close button, etc.).

### Issue #9: "The hud editor's in editor box has incredibly buggy dragging logic. Sometimes it drags sometimes it jumps..." [unresolved]
- **Investigation**: Current dragging in `ui_editor.ts` needs a unified approach for both mobile and desktop.
- **Proposed Fix**: 
    - Implement dragging using **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`) to natively support both touch and mouse interactions.
    - Capture the pointer offset relative to the element's top-left corner on `pointerdown` to eliminate jumping.
    - Use percentage-based positioning (`vw`/`vh`) for final coordinate storage to maintain layout across device resolutions.
- **Post-Attempt Feedback**:
    - Wasn't fixed. Definitely affected by a broken input lock interfering with dragging logic.

### Issue #18: "Settings quit button disappears after tab switching while in match" [open]
- **Investigation**: When clicking settings while in match, the quit button is visible on the match tab. Switching to another settings tab and returning to the match tab causes the quit button to disappear.
- **Proposed Fix**:
    - Ensure the quit button state and in-match context are preserved dynamically whenever tabs are switched inside the settings modal.

### Issue #19: "Additional Fullscreen toggle buttons" [open]
- **Requirement**:
    - Add a Fullscreen toggle HUD button in the gameplay HUD next to the 3 utility buttons near the minimap (replicated from the button in the main menu top bar) and hook it up to the UI editor logic.
    - Add a "Toggle Fullscreen" button inside the Controls tab in settings.
