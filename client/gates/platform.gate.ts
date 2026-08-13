// client/gates/platform.gate.ts

/**
 * Platform Gate
 * Runs alongside the first checks when the webapp first loads.
 * Responsible for marking the environment as desktop-only or mobile-only.
 * Other systems should use this to gate UI elements, input methods, and default settings.
 */

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
export const IS_DESKTOP = !IS_MOBILE;

export function initPlatformGate() {
  if (IS_DESKTOP) {
    document.body.classList.add("platform-desktop");
    document.body.classList.remove("platform-mobile");
  } else {
    document.body.classList.add("platform-mobile");
    document.body.classList.remove("platform-desktop");
  }
}

export function isUIElement(target: EventTarget | null): boolean {
  if (!target) return false;
  let el = target as HTMLElement;
  while (el) {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'A') {
      return true;
    }
    if (
      el.id === 'dev-overlay' || 
      el.id === 'minimap-container' || 
      el.classList?.contains('fullscreen-minimap') || 
      el.id === 'vexea-settings-overlay' ||
      el.id === 'match-status-modal' ||
      el.id === 'btn-match-status' ||
      el.id === 'ui-editor-bar' ||
      el.id === 'splash-screen' ||
      el.id === 'portrait-lock' ||
      el.classList?.contains('loading-overlay')
    ) {
      return true;
    }
    el = el.parentElement as HTMLElement;
  }
  return false;
}
