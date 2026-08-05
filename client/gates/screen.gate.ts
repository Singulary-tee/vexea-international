/**
 * Screen Gate — Centralized Client Screen Locks & Input Interaction Suppressor
 * Manages:
 * 1. Hard Screen Locks: rotate_device_lock, loading_lock, splash_lock
 * 2. Selective Input Suppression: ui_editor_active_lock, overlay_modal_lock
 */

export interface ScreenGateState {
  rotateDeviceLocked: boolean;
  loadingLocked: boolean;
  splashLocked: boolean;
  uiEditorActive: boolean;
  activeOverlayModal: string | null;
}

class ScreenGateManager {
  private state: ScreenGateState = {
    rotateDeviceLocked: false,
    loadingLocked: false,
    splashLocked: false,
    uiEditorActive: false,
    activeOverlayModal: null
  };

  private screenLockGroups: Set<string> = new Set();

  public lockScreenGroup(groupId: string) {
    this.screenLockGroups.add(groupId);
    this.setOverlayModal(groupId);
  }

  public unlockScreenGroup(groupId: string) {
    this.screenLockGroups.delete(groupId);
    if (this.state.activeOverlayModal === groupId) {
      this.setOverlayModal(this.screenLockGroups.size > 0 ? Array.from(this.screenLockGroups)[0] : null);
    }
  }

  public isScreenLocked(): boolean {
    return this.screenLockGroups.size > 0 || this.isGameplayInputBlocked();
  }

  public setRotateDeviceLock(locked: boolean) {
    this.state.rotateDeviceLocked = locked;
    const rotateEl = document.getElementById("rotate-device-overlay");
    if (rotateEl) {
      rotateEl.style.display = locked ? "flex" : "none";
      rotateEl.style.pointerEvents = locked ? "auto" : "none";
    }
  }

  public setLoadingLock(locked: boolean) {
    this.state.loadingLocked = locked;
    const loadingEl = document.querySelector(".loading-overlay") as HTMLElement;
    if (loadingEl) {
      loadingEl.style.display = locked ? "flex" : "none";
      loadingEl.style.pointerEvents = locked ? "auto" : "none";
    }
  }

  public setSplashLock(locked: boolean) {
    this.state.splashLocked = locked;
  }

  public setUIEditorActive(active: boolean) {
    this.state.uiEditorActive = active;
    const hudContainer = document.getElementById("hud-container");
    if (hudContainer) {
      // When UI editor is active, prevent gameplay controls click-through
      hudContainer.style.pointerEvents = active ? "none" : "auto";
    }
  }

  public setOverlayModal(modalId: string | null) {
    this.state.activeOverlayModal = modalId;
  }

  public isGameplayInputBlocked(): boolean {
    return (
      this.state.rotateDeviceLocked ||
      this.state.loadingLocked ||
      this.state.splashLocked ||
      this.state.uiEditorActive ||
      this.state.activeOverlayModal !== null
    );
  }

  public getState(): Readonly<ScreenGateState> {
    return this.state;
  }
}

export const ScreenGate = new ScreenGateManager();
