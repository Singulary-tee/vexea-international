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
  let el = (target instanceof Element ? target : (target as Node).parentElement) as HTMLElement | null;
  while (el) {
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A' || tag === 'TEXTAREA' || tag === 'LABEL') {
      return true;
    }
    if (
      el.hasAttribute?.('data-ui-surface') ||
      el.classList?.contains('ui-surface')
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}
