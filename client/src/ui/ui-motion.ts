/**
 * VEXEA UI Motion Module
 * Centralized, CSS-first interaction hooks and motion lifecycle handles.
 * Conforms strictly to VEXEA_UI_ANIMATION_CONTRACT.md & VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md.
 */

// ==========================================
// 1. ICON CONTRAST RESPONSE PRIMITIVE
// ==========================================
export function bindIconState(element: HTMLElement): () => void {
  element.classList.add("vexea-icon-clickable");
  element.setAttribute("data-ui-icon-clickable", "true");
  return () => {
    element.classList.remove("vexea-icon-clickable");
    element.removeAttribute("data-ui-icon-clickable");
  };
}

export function bindIconButton(button: HTMLButtonElement, icon: HTMLImageElement): () => void {
  button.classList.add("vexea-icon-button");
  icon.classList.add("vexea-icon-button__icon");
  return () => {
    button.classList.remove("vexea-icon-button");
    icon.classList.remove("vexea-icon-button__icon");
  };
}

// ==========================================
// 2. SLIDING TAB UNDERLINE PRIMITIVE
// ==========================================
export interface TabItem {
  id: string;
  button: HTMLElement;
}

export function bindTabs(tabRow: HTMLElement, tabs: TabItem[], activeId: string, onSelect: (id: string) => void): {
  setActive: (id: string) => void;
  destroy: () => void;
} {
  tabRow.classList.add("vexea-tab-row");

  let underline = tabRow.querySelector(".vexea-tab-underline") as HTMLElement | null;
  if (!underline) {
    underline = document.createElement("span");
    underline.className = "vexea-tab-underline";
    underline.setAttribute("aria-hidden", "true");
    tabRow.appendChild(underline);
  }

  const updateUnderline = (targetBtn: HTMLElement) => {
    if (!underline) return;
    const rowRect = tabRow.getBoundingClientRect();
    const btnRect = targetBtn.getBoundingClientRect();
    const leftOffset = btnRect.left - rowRect.left;
    const width = btnRect.width;
    tabRow.style.setProperty("--ui-underline-x", `${leftOffset}px`);
    tabRow.style.setProperty("--ui-underline-width", `${width}px`);
  };

  const listeners: { btn: HTMLElement; fn: (e: MouseEvent) => void }[] = [];

  tabs.forEach((tab) => {
    tab.button.classList.add("vexea-tab");
    const fn = (e: MouseEvent) => {
      e.stopPropagation();
      onSelect(tab.id);
      setActive(tab.id);
    };
    tab.button.addEventListener("click", fn);
    listeners.push({ btn: tab.button, fn });
  });

  const setActive = (id: string) => {
    const activeTab = tabs.find((t) => t.id === id);
    if (activeTab) {
      tabs.forEach((t) => {
        t.button.removeAttribute("data-ui-selected");
        t.button.classList.remove("active");
      });
      activeTab.button.setAttribute("data-ui-selected", "true");
      activeTab.button.classList.add("active");
      updateUnderline(activeTab.button);
    }
  };

  const resizeHandler = () => {
    const currentActive = tabs.find((t) => t.button.getAttribute("data-ui-selected") === "true") || tabs[0];
    if (currentActive) {
      updateUnderline(currentActive.button);
    }
  };

  window.addEventListener("resize", resizeHandler);

  // Initial measurement
  requestAnimationFrame(() => {
    setActive(activeId);
  });

  return {
    setActive,
    destroy: () => {
      listeners.forEach(({ btn, fn }) => btn.removeEventListener("click", fn));
      window.removeEventListener("resize", resizeHandler);
      if (underline && underline.parentNode) {
        underline.parentNode.removeChild(underline);
      }
    }
  };
}

// ==========================================
// 3. CONTENT SETTLE & STAGGERED ENTRY
// ==========================================
export function bindContentEntry(element: HTMLElement, staggerIndex: number = 0): void {
  const cappedIndex = Math.min(5, Math.max(0, staggerIndex));
  element.setAttribute("data-ui-content-transition", "enter");
  if (cappedIndex > 0) {
    element.style.animationDelay = `${cappedIndex * 28}ms`;
  }
}

// ==========================================
// 4. SELECTED FRAME & BREATH
// ==========================================
export function bindSelection(element: HTMLElement, isSelected: boolean, enableBreath: boolean = false): void {
  element.setAttribute("data-ui-selected", isSelected ? "true" : "false");
  if (isSelected && enableBreath) {
    element.classList.add("vexea-selected-breath");
  } else {
    element.classList.remove("vexea-selected-breath");
  }
}

// ==========================================
// 5. LOADING BAR MOTION HANDLE
// ==========================================
export interface LoadingBarMotionHandle {
  setProgress(value: number): void;
  setPhase(label: string): void;
  complete(): void;
  destroy(): void;
}

export function mountLoadingBarMotion(root: HTMLElement): LoadingBarMotionHandle {
  let track = root.querySelector(".vexea-loading-track") as HTMLElement | null;
  if (!track) {
    track = document.createElement("div");
    track.className = "vexea-loading-track";
    root.appendChild(track);
  }

  let fill = track.querySelector(".vexea-loading-fill") as HTMLElement | null;
  if (!fill) {
    fill = document.createElement("div");
    fill.className = "vexea-loading-fill";
    track.appendChild(fill);
  }

  let head = fill.querySelector(".vexea-loading-head") as HTMLElement | null;
  if (!head) {
    head = document.createElement("div");
    head.className = "vexea-loading-head";
    fill.appendChild(head);
  }

  let sheen = fill.querySelector(".vexea-loading-sheen") as HTMLElement | null;
  if (!sheen) {
    sheen = document.createElement("div");
    sheen.className = "vexea-loading-sheen";
    fill.appendChild(sheen);
  }

  let sheenTriggered = false;

  const triggerSheen = () => {
    if (!sheen || sheenTriggered) return;
    sheenTriggered = true;
    sheen.classList.add("vexea-sheen-active");
    setTimeout(() => {
      sheen?.classList.remove("vexea-sheen-active");
    }, 650);
  };

  return {
    setProgress: (value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      if (fill) {
        fill.style.width = `${clamped}%`;
      }
      if (clamped > 20 && !sheenTriggered) {
        triggerSheen();
      }
    },
    setPhase: (label: string) => {
      const phaseEl = root.querySelector("[data-ui-phase-label]") as HTMLElement | null;
      if (phaseEl) {
        phaseEl.textContent = label.toUpperCase();
      }
    },
    complete: () => {
      if (fill) {
        fill.style.width = "100%";
      }
    },
    destroy: () => {
      // Clean teardown
    }
  };
}

// ==========================================
// 6. BATTLE PASS FULL-SEASON MOTION HANDLE
// ==========================================
export type BattlePassMotionState = "rest" | "revealing" | "settled";

export interface BattlePassMotionHandle {
  setState(state: BattlePassMotionState): void;
  setCurrentTier(tier: number): void;
  setPremiumOwned(owned: boolean): void;
  destroy(): void;
}

export function mountBattlePassMotion(root: HTMLElement): BattlePassMotionHandle {
  return {
    setState: (state: BattlePassMotionState) => {
      root.setAttribute("data-bp-state", state);
    },
    setCurrentTier: (tier: number) => {
      const reachedDesktop = root.querySelector(".vexea-bp-desktop-reached") as HTMLElement | null;
      const reachedMobile = root.querySelector(".vexea-bp-mobile-reached") as HTMLElement | null;
      const pct = Math.min(100, Math.max(0, (tier / 50) * 100));
      if (reachedDesktop) reachedDesktop.style.width = `${pct}%`;
      if (reachedMobile) reachedMobile.style.height = `${pct}%`;
    },
    setPremiumOwned: (owned: boolean) => {
      root.setAttribute("data-bp-premium-owned", owned ? "true" : "false");
    },
    destroy: () => {
      // Clean teardown
    }
  };
}

// ==========================================
// 7. MATCHMAKING RADIAL MOTION & SVG GENERATOR
// ==========================================
export interface MatchmakingRadialOptions {
  mapId: string;
  onCancel: () => void;
}

export interface MatchmakingRadialHandle {
  updateStatus(data: { mapId?: string; queueSize?: number; minPlayers?: number; maxPlayers?: number }): void;
  lockFound(onComplete: () => void): void;
  cancel(): void;
  destroy(): void;
}

/**
 * Builds the exact mathematical SVG geometry defined in VEXEA_UI_ANIMATION_CONTRACT.md:
 * - Normalized coordinate field (center at 50, 50, radius max 50)
 * - Outer circle at radius 49.2 (7s breath)
 * - Primary ring at radius 37.0 (rgba(225,229,227,.86), width .62)
 * - Moving arc at radius 37.0 (rgba(239,241,240,.94), width .72, 9s orbit)
 * - Inner rings at radius 24.7, 18.3, 10.2 (18s counter-rotation)
 * - Tick band from 38.9 to 40.35 (72 hairline ticks at 5° intervals)
 * - 4 registration nodes at (15,15), (85,15), (15,85), (85,85)
 * - Full axes & diagonals
 */
export function createMatchmakingRadialSVG(): string {
  const cx = 50;
  const cy = 50;

  // 72 hairline ticks from r=38.9 to r=40.35 (5 degree interval)
  let ticksSvg = "";
  for (let i = 0; i < 72; i++) {
    const angleRad = (i * 5 * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const x1 = (cx + 38.9 * cos).toFixed(2);
    const y1 = (cy + 38.9 * sin).toFixed(2);
    const x2 = (cx + 40.35 * cos).toFixed(2);
    const y2 = (cy + 40.35 * sin).toFixed(2);
    // Major ticks every 90 deg slightly more defined
    const isMajor = i % 18 === 0;
    const tickOpacity = isMajor ? "0.35" : "0.18";
    ticksSvg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(225,229,227,${tickOpacity})" stroke-width="0.25" />`;
  }

  // Registration nodes at (15,15), (85,15), (15,85), (85,85)
  const regNodesSvg = `
    <!-- Top-Left (15,15) -->
    <path d="M 12 15 H 18 M 15 12 V 18" stroke="rgba(225,229,227,0.18)" stroke-width="0.35" />
    <!-- Top-Right (85,15) -->
    <path d="M 82 15 H 88 M 85 12 V 18" stroke="rgba(225,229,227,0.18)" stroke-width="0.35" />
    <!-- Bottom-Left (15,85) -->
    <path d="M 12 85 H 18 M 15 82 V 88" stroke="rgba(225,229,227,0.18)" stroke-width="0.35" />
    <!-- Bottom-Right (85,85) -->
    <path d="M 82 85 H 88 M 85 82 V 88" stroke="rgba(225,229,227,0.18)" stroke-width="0.35" />
  `;

  // Full Axes & Diagonals
  const gridAxesSvg = `
    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(225,229,227,0.06)" stroke-width="0.25" />
    <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(225,229,227,0.06)" stroke-width="0.25" />
    <line x1="14.6" y1="14.6" x2="85.4" y2="85.4" stroke="rgba(225,229,227,0.04)" stroke-width="0.2" stroke-dasharray="1 2" />
    <line x1="14.6" y1="85.4" x2="85.4" y2="14.6" stroke="rgba(225,229,227,0.04)" stroke-width="0.2" stroke-dasharray="1 2" />
  `;

  return `
    <svg class="vexea-mm-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vexea-mm-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#C77C3B" stop-opacity="0.04" />
          <stop offset="70%" stop-color="#121615" stop-opacity="0.01" />
          <stop offset="100%" stop-color="#090B0B" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Grid and Diagonals -->
      ${gridAxesSvg}

      <!-- Corner Registration Nodes -->
      ${regNodesSvg}

      <!-- Outer Boundary Circle (Radius 49.2, 7s breath) -->
      <circle class="vexea-mm-outer-boundary" cx="50" cy="50" r="49.2" fill="none" stroke="rgba(225,229,227,0.16)" stroke-width="0.35" />

      <!-- Hairline Tick Band (Radius 38.9 to 40.35, 72 ticks at 5 deg) -->
      <g class="vexea-mm-tick-band">
        ${ticksSvg}
      </g>

      <!-- Primary Stable Ring (Radius 37.0, stroke rgba(225,229,227,.86), width .62) -->
      <circle cx="50" cy="50" r="37.0" fill="url(#vexea-mm-core-glow)" stroke="rgba(225,229,227,0.86)" stroke-width="0.62" />

      <!-- Moving Primary Arc (Radius 37.0, stroke rgba(239,241,240,.94), width .72, 9s orbit) -->
      <circle class="vexea-mm-moving-arc" cx="50" cy="50" r="37.0" fill="none" stroke="rgba(239,241,240,0.94)" stroke-width="0.72" stroke-dasharray="35 197.5" stroke-linecap="round" />

      <!-- Inner Counter-Rotation Group (Radius 24.7, 18.3, 10.2, 18s rotation) -->
      <g class="vexea-mm-inner-group">
        <!-- Inner Ring 1: Radius 24.7 -->
        <circle cx="50" cy="50" r="24.7" fill="none" stroke="rgba(225,229,227,0.14)" stroke-width="0.32" stroke-dasharray="4 3" />
        <!-- Inner Ring 2: Radius 18.3 -->
        <circle cx="50" cy="50" r="18.3" fill="none" stroke="rgba(225,229,227,0.09)" stroke-width="0.25" />
        <!-- Inner Ring 3: Radius 10.2 -->
        <circle cx="50" cy="50" r="10.2" fill="none" stroke="rgba(225,229,227,0.12)" stroke-width="0.25" stroke-dasharray="2 2" />
        
        <!-- Subtle Inner Quadrant Marks -->
        <line x1="50" y1="26.0" x2="50" y2="30.0" stroke="rgba(225,229,227,0.18)" stroke-width="0.3" />
        <line x1="50" y1="70.0" x2="50" y2="74.0" stroke="rgba(225,229,227,0.18)" stroke-width="0.3" />
        <line x1="26.0" y1="50" x2="30.0" y2="50" stroke="rgba(225,229,227,0.18)" stroke-width="0.3" />
        <line x1="70.0" y1="50" x2="74.0" y2="50" stroke="rgba(225,229,227,0.18)" stroke-width="0.3" />
      </g>
    </svg>
  `;
}
