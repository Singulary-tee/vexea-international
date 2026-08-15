import { DS } from "../design-system";
import { audioManager } from "../audio";
import { IS_DEV } from "../../shared/gates/production.gate";
import { StudioPreviewManager } from "../StudioPreviewManager";

const screens = ['splash-screen', 'main-menu-screen', 'lobby-screen', 'dev-map-editor-screen', 'dev-entities-screen', 'post-match-screen', 'battle-pass-screen'];

export type ScreenId = typeof screens[number] | 'game-view';

let currentScreen: ScreenId = 'splash-screen';
let isTransitioning = false;
let transitionQueue: { target: ScreenId; durationMs: number; immediate: boolean; resolve: () => void; reject: (err: any) => void }[] = [];

async function processQueue() {
  if (isTransitioning || transitionQueue.length === 0) return;
  isTransitioning = true;
  const item = transitionQueue.shift();
  if (item) {
    try {
      await executeTransition(item.target, item.durationMs, item.immediate);
      item.resolve();
    } catch (err) {
      console.error("[ScreenManager] Transition failed:", err);
      item.reject(err);
    }
  }
  isTransitioning = false;
  // Use setTimeout to allow the stack to clear and prevent infinite recursion
  setTimeout(processQueue, 0);
}

export function queueTransition(target: ScreenId, durationMs = 100, immediate = false): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transitionQueue.push({ target, durationMs, immediate, resolve, reject });
    processQueue();
  });
}

// Keep track of active timeouts for cleanup
let activeTimers: any[] = [];

function clearAllTimers() {
  activeTimers.forEach(clearTimeout);
  activeTimers = [];
}

async function executeTransition(target: ScreenId, durationMs: number, immediate: boolean): Promise<void> {
  clearAllTimers();

  // 1. Handle fading out of current screen if it's different
  if (currentScreen !== target) {
    if (currentScreen === 'game-view') {
      const canvasContainer = document.getElementById("canvas-container");
      const hudContainer = document.getElementById("hud-container");
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (hudContainer) hudContainer.style.setProperty("display", "none", "important");
    } else {
      const el = document.getElementById(currentScreen);
      if (el) {
        if (immediate || durationMs === 0) {
          el.style.opacity = '0';
          el.style.display = 'none';
        } else {
          el.style.transition = `opacity ${durationMs}ms ease-in-out`;
          el.style.opacity = '0';
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve, durationMs);
            activeTimers.push(timer);
          });
          el.style.display = 'none';
        }
      }
    }
  }

  // 2. Clear Studio backdrops if not mainMenu or lobby
  if (target !== 'main-menu-screen' && target !== 'lobby-screen') {
    StudioPreviewManager.detach();
  }

  // 3. Bring in the target state
  if (target === 'game-view') {
    audioManager.setMatchState(true);
    audioManager.play('join_match');
    audioManager.startMatchAmbience();
    const canvasContainer = document.getElementById("canvas-container");
    const hudContainer = document.getElementById("hud-container");
    if (canvasContainer) {
      const vexeaView = document.getElementById("vexea-view");
      if (vexeaView && canvasContainer.parentElement !== vexeaView) {
        if (hudContainer && hudContainer.parentElement === vexeaView) {
          vexeaView.insertBefore(canvasContainer, hudContainer);
        } else {
          vexeaView.appendChild(canvasContainer);
        }
      }
      Object.assign(canvasContainer.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: '0',
      });
      const renderer = (window as any).renderer;
      if (renderer && renderer.domElement) {
        if (renderer.domElement.parentElement !== canvasContainer) {
          canvasContainer.appendChild(renderer.domElement);
        }
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        if (typeof renderer.setSize === 'function') {
          renderer.setSize(window.innerWidth, window.innerHeight, false);
        }
      }
    }
    if (hudContainer) {
      hudContainer.style.setProperty("display", "block", "important");
    }
    window.dispatchEvent(new Event("resize"));
  } else {
    audioManager.setMatchState(false);
    audioManager.stopMatchAmbience();
    const el = document.getElementById(target);
    if (el) {
      if (immediate || durationMs === 0) {
        el.style.transition = 'none';
        el.style.display = 'flex';
        el.style.opacity = '1';
      } else {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.display = 'flex';
        void el.offsetWidth; // Reflow to apply transition-none and opacity-0
        el.style.transition = `opacity ${durationMs}ms ease-in-out`;
        el.style.opacity = '1';
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, durationMs);
          activeTimers.push(timer);
        });
      }
    }
  }

  currentScreen = target;
}

export function hideAll() {
  transitionQueue = [];
  isTransitioning = false;
  clearAllTimers();

  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '0';
      el.style.display = 'none';
    }
  });

  const canvasContainer = document.getElementById("canvas-container");
  const hudContainer = document.getElementById("hud-container");
  if (canvasContainer) canvasContainer.style.display = 'none';
  if (hudContainer) hudContainer.style.setProperty("display", "none", "important");
  audioManager.setMatchState(false);
}

// Helper to access state machines in tests or outside
export function getCurrentScreenState(): ScreenId {
  return currentScreen;
}

export function isScreenTransitioning(): boolean {
  return isTransitioning || transitionQueue.length > 0;
}

export function showSplash() {
  queueTransition('splash-screen', 0, true);
}

export function showMainMenu() {
  queueTransition('main-menu-screen', 100, false).then(() => {
    const backdrop = document.getElementById('main-menu-3d-backdrop');
    if (backdrop) {
      StudioPreviewManager.attachTo(backdrop, 'MAIN_MENU');
    }
    window.dispatchEvent(new CustomEvent('show-main-menu'));
  });
}

export function showLobby() {
  queueTransition('lobby-screen', 100, false).then(() => {
    const backdrop = document.getElementById('lobby-3d-backdrop');
    if (backdrop) {
      StudioPreviewManager.attachTo(backdrop, 'LOBBY');
    }
    const videoBg = document.getElementById('lobby-video-bg') as HTMLVideoElement | null;
    if (videoBg) {
      videoBg.play().catch(() => {});
    }
  });
}

export function showDevMapEditor() {
  if (!IS_DEV) return;
  import("./dev-map-editor").then(({ initDevMapEditor }) => {
    initDevMapEditor();
    queueTransition('dev-map-editor-screen', 100, false);
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
      queueTransition('dev-entities-screen', 100, false);
    });
  });
}
if (typeof window !== 'undefined') {
  (window as any).showDevEntities = showDevEntities;
}

export function showDevPlacement() {
  if (!IS_DEV) return;
  import("../StudioCharacterPreview").then(({ toggleDevPanel }) => {
    toggleDevPanel();
  });
}
if (typeof window !== 'undefined') {
  (window as any).showDevPlacement = showDevPlacement;
}

export function showGame() {
  queueTransition('game-view', 0, true);
}

export function showPostMatch(matchData?: any) {
  import("./post-match-screen").then(({ renderPostMatchScreen }) => {
    renderPostMatchScreen(matchData);
    queueTransition('post-match-screen', 100, false);
  });
}

export function showBattlePass() {
  import("./battle-pass-screen").then(({ renderBattlePassScreen }) => {
    renderBattlePassScreen();
    queueTransition('battle-pass-screen', 100, false);
  });
}


