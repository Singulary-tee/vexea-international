/**
 * Reusable Fullscreen UI Helper & Icon Synchronization Module
 * Standardizes vendor-prefixed Fullscreen API interactions and keeps UI icons in sync.
 */

export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (!isFullscreen()) {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } else {
      const doc = document as any;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn("Fullscreen toggle failed:", err);
  }
}

export function getFullscreenIconSrc(): string {
  return isFullscreen() ? "/ui_svgs/fullscreen_exit.svg" : "/ui_svgs/fullscreen.svg";
}

/**
 * Binds a DOM element (button or container) to toggle fullscreen on click
 * and continuously sync its child <img> icon with native fullscreen state changes.
 * 
 * @param element The container or button element
 * @param iconSizeRem The CSS width/height for the icon in rem (default: 1.38rem)
 * @returns Cleanup function to unbind event listeners
 */
export function bindFullscreenButton(
  element: HTMLElement | null,
  iconSizeRem: number = 1.38
): () => void {
  if (!element) return () => {};

  const updateIcon = () => {
    const iconSrc = getFullscreenIconSrc();
    element.innerHTML = `<img src="${iconSrc}" style="width: ${iconSizeRem}rem; height: ${iconSizeRem}rem; filter: brightness(0) invert(1);" alt="Fullscreen" />`;
  };

  // Initial icon sync
  updateIcon();

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleFullscreen();
  };

  element.addEventListener("click", handleClick);
  document.addEventListener("fullscreenchange", updateIcon);
  document.addEventListener("webkitfullscreenchange", updateIcon);

  return () => {
    element.removeEventListener("click", handleClick);
    document.removeEventListener("fullscreenchange", updateIcon);
    document.removeEventListener("webkitfullscreenchange", updateIcon);
  };
}
