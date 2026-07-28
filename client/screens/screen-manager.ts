import { DS } from "../design-system";
import { audioManager } from "../audio";
import { IS_DEV } from "../../shared/gates/production.gate";
import { StudioPreviewManager } from "../StudioPreviewManager";

const screens = ['splash-screen', 'main-menu-screen', 'lobby-screen', 'dev-map-editor-screen', 'dev-entities-screen', 'post-match-screen'];
let transitionTimers: number[] = [];

export function hideAll() {
  transitionTimers.forEach(clearTimeout);
  transitionTimers = [];
  
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '0';
      transitionTimers.push(window.setTimeout(() => {
        el.style.display = 'none';
      }, 300));
    }
  });
}

function showScreen(id: string, durationMs: number, immediate: boolean) {
  audioManager.setMatchState(false);
  if (immediate) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'flex';
      el.style.transition = `opacity ${durationMs}ms`;
      void el.offsetWidth;
      el.style.opacity = '1';
    }
  } else {
    hideAll();
    transitionTimers.push(window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.display = 'flex';
        void el.offsetWidth;
        el.style.transition = `opacity ${durationMs}ms`;
        el.style.opacity = '1';
      }
    }, 300));
  }
}

export function showSplash() {
  showScreen('splash-screen', 0, true);
}

export function showMainMenu() {
  showScreen('main-menu-screen', 500, false);
  window.dispatchEvent(new CustomEvent('show-main-menu'));
}

export function showLobby() {
  showScreen('lobby-screen', 500, false);
  const backdrop = document.getElementById('lobby-3d-backdrop');
  if (backdrop) {
    StudioPreviewManager.attachTo(backdrop, 'LOBBY');
  }
}

export function showDevMapEditor() {
  if (!IS_DEV) return;
  import("./dev-map-editor").then(({ initDevMapEditor }) => {
    initDevMapEditor();
    showScreen('dev-map-editor-screen', 500, false);
  });
}
if (typeof window !== 'undefined') {
  (window as any).showDevMapEditor = showDevMapEditor;
}

export function showDevEntities() {
  if (!IS_DEV) return;
  import("./dev-entities").then(({ initDevEntities, activateScreen }) => {
    initDevEntities().then(() => {
      activateScreen();
    });
  });
}
if (typeof window !== 'undefined') {
  (window as any).showDevEntities = showDevEntities;
}

export function showGame() {
  audioManager.setMatchState(true);
  hideAll();
}

export function showPostMatch(matchData?: any) {
  import("./post-match-screen").then(({ renderPostMatchScreen }) => {
    renderPostMatchScreen(matchData);
    showScreen('post-match-screen', 500, false);
  });
}

