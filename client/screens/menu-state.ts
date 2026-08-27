// Single-responsibility shared session state for main-menu submodules.
// Mutable menu-wide state lives here so sibling modules (auth modal, squad
// friends modal, notification toasts) never need circular imports of main-menu.

/** In-memory cache to resolve user profiles without N+1 loops. */
export const userProfileCache = new Map<string, string>();

let registeredUserData: any = null;

export function getRegisteredUserData(): any {
  return registeredUserData;
}

export function setRegisteredUserData(data: any): void {
  registeredUserData = data;
}
