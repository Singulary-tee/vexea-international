/**
 * VEXEA Matchmaking Overlay System
 * Authoritative CSS-first implementation of the Matchmaking Radial Sequence.
 * Strictly adheres to VEXEA_UI_ANIMATION_CONTRACT.md.
 */

import { DS } from "../design-system";
import { ScreenGate } from "../gates/screen.gate";
import { createMatchmakingRadialSVG } from "../src/ui/ui-motion";
import { audioManager } from "../audio";

export interface MatchmakingOverlayOptions {
  mapId: string;
  onCancel: () => void;
}

let overlayContainer: HTMLElement | null = null;
let countdownOverlayContainer: HTMLElement | null = null;
let isFoundLocking = false;

export function showMatchmakingOverlay(options: MatchmakingOverlayOptions): void {
  hideMatchmakingOverlay();
  isFoundLocking = false;

  // Clean up any stale legacy pulse styles from older sessions if present
  const oldPulseStyle = document.getElementById("mm-pulse-style");
  if (oldPulseStyle && oldPulseStyle.parentNode) {
    oldPulseStyle.parentNode.removeChild(oldPulseStyle);
  }

  // Register screen lock in ScreenGate to suppress all underlying UI button interactions
  ScreenGate.lockScreenGroup("matchmaking");

  // Fullscreen backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "matchmaking-overlay";
  backdrop.className = "vexea-mm-backdrop ui-surface";
  backdrop.setAttribute("data-ui-surface", "true");

  // Content container
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "vexea-mm-content-wrapper";
  Object.assign(contentWrapper.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(6px, 1.6vh, 16px)",
    position: "relative",
    zIndex: "2",
    width: "100%",
    maxWidth: "100vw",
    maxHeight: "100vh",
    boxSizing: "border-box"
  });

  // Radial Geometry Container (920ms radial expansion, 18s inner counter-rotation, 9s primary arc orbit, 7s outer breath)
  const radialContainer = document.createElement("div");
  radialContainer.className = "vexea-mm-radial-container";
  radialContainer.innerHTML = createMatchmakingRadialSVG();

  // Center Readout overlay inside the radial structure
  const centerHUD = document.createElement("div");
  Object.assign(centerHUD.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    pointerEvents: "none",
    width: "80%"
  });

  const tagText = document.createElement("div");
  tagText.textContent = "Q-NET // PROTOCOL";
  Object.assign(tagText.style, {
    fontSize: "clamp(0.48rem, 0.9vh, 0.60rem)",
    fontWeight: "bold",
    color: "rgba(225, 229, 227, 0.45)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: "2px"
  });
  centerHUD.appendChild(tagText);

  const mainTitle = document.createElement("div");
  mainTitle.id = "mm-overlay-title";
  mainTitle.textContent = "MATCHMAKING";
  Object.assign(mainTitle.style, {
    fontSize: "clamp(0.75rem, 1.8vh, 1.10rem)",
    fontWeight: "900",
    color: DS.colors.textPrimary,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    lineHeight: "1.1"
  });
  centerHUD.appendChild(mainTitle);

  const subtitle = document.createElement("div");
  subtitle.id = "mm-overlay-subtitle";
  subtitle.textContent = "SEARCHING OPERATIVES";
  Object.assign(subtitle.style, {
    fontSize: "clamp(0.50rem, 1.1vh, 0.65rem)",
    fontWeight: "bold",
    color: DS.colors.accent,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginTop: "4px"
  });
  centerHUD.appendChild(subtitle);

  radialContainer.appendChild(centerHUD);
  contentWrapper.appendChild(radialContainer);

  // Status Readout Row
  const statusText = document.createElement("div");
  statusText.id = "mm-overlay-status";
  statusText.textContent = `MAP: ${(options.mapId || "FACILITY").toUpperCase()} | QUEUE: 1 / 10 | MIN: 4`;
  Object.assign(statusText.style, {
    fontSize: "clamp(0.58rem, 1.2vh, 0.72rem)",
    color: DS.colors.textSecondary,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontFamily: DS.typography.fontFamily,
    background: "rgba(18, 22, 21, 0.8)",
    border: "1px solid rgba(225, 229, 227, 0.12)",
    padding: "clamp(4px, 0.6vh, 6px) clamp(10px, 1.5vw, 18px)",
    borderRadius: "0px",
    flexShrink: "0"
  });
  contentWrapper.appendChild(statusText);

  // Cancel Button
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "mm-overlay-cancel-btn";
  cancelBtn.className = "vexea-btn";
  cancelBtn.setAttribute("data-ui-btn", "true");
  cancelBtn.textContent = "CANCEL MATCHMAKING";
  Object.assign(cancelBtn.style, {
    background: "rgba(255, 69, 0, 0.12)",
    border: `1px solid ${DS.colors.accent}`,
    color: DS.colors.accent,
    fontFamily: DS.typography.fontFamily,
    fontSize: "clamp(0.65rem, 1.3vh, 0.78rem)",
    fontWeight: "bold",
    letterSpacing: "0.1em",
    padding: "clamp(6px, 1.0vh, 10px) clamp(16px, 2.5vw, 24px)",
    minHeight: "44px",
    cursor: "pointer",
    borderRadius: "0px",
    flexShrink: "0"
  });

  cancelBtn.addEventListener("mouseenter", () => {
    cancelBtn.style.background = "rgba(255, 69, 0, 0.35)";
    cancelBtn.style.color = "#FFFFFF";
  });
  cancelBtn.addEventListener("mouseleave", () => {
    cancelBtn.style.background = "rgba(255, 69, 0, 0.12)";
    cancelBtn.style.color = DS.colors.accent;
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isFoundLocking) return;
    audioManager.play("click");
    options.onCancel();
  });

  contentWrapper.appendChild(cancelBtn);
  backdrop.appendChild(contentWrapper);
  document.body.appendChild(backdrop);
  overlayContainer = backdrop;
}

export function updateMatchmakingOverlayStatus(data: {
  mapId?: string;
  queueSize?: number;
  minPlayers?: number;
  maxPlayers?: number;
}): void {
  const statusText = document.getElementById("mm-overlay-status");
  if (statusText) {
    const mapName = (data.mapId || "FACILITY").toUpperCase();
    const queue = data.queueSize ?? 1;
    const max = data.maxPlayers ?? 10;
    const min = data.minPlayers ?? 4;
    statusText.textContent = `MAP: ${mapName} | QUEUE: ${queue} / ${max} | MIN: ${min}`;
  }
}

/**
 * Triggers the approved 620ms found lock -> 760ms terminal hold -> 360ms reverse exit sequence.
 */
export function animateMatchFound(onComplete: () => void): void {
  if (!overlayContainer || isFoundLocking) {
    onComplete();
    return;
  }
  isFoundLocking = true;

  overlayContainer.classList.add("vexea-mm-found");

  const subtitle = document.getElementById("mm-overlay-subtitle");
  if (subtitle) {
    subtitle.textContent = "MATCH LOCATED // DEPLOYING";
    subtitle.style.color = "#00FF88";
  }

  const cancelBtn = document.getElementById("mm-overlay-cancel-btn");
  if (cancelBtn) {
    cancelBtn.style.display = "none";
  }

  // 620ms found lock + 760ms terminal hold = 1380ms
  setTimeout(() => {
    if (!overlayContainer) {
      onComplete();
      return;
    }
    // 360ms reverse exit
    overlayContainer.classList.add("vexea-mm-exiting");

    setTimeout(() => {
      hideMatchmakingOverlay();
      onComplete();
    }, 360);
  }, 1380);
}

export function hideMatchmakingOverlay(): void {
  ScreenGate.unlockScreenGroup("matchmaking");
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
  }
  overlayContainer = null;
  const el = document.getElementById("matchmaking-overlay");
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
  isFoundLocking = false;
}

export function showPreMatchCountdownOverlay(countdownSeconds: number): void {
  if (countdownSeconds <= 0) {
    hidePreMatchCountdownOverlay();
    return;
  }

  let el = document.getElementById("pre-match-countdown-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "pre-match-countdown-overlay";
    el.setAttribute("data-ui-surface", "true");
    el.classList.add("ui-surface");
    Object.assign(el.style, {
      position: "fixed",
      top: "12%",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "99999",
      background: "radial-gradient(ellipse at center, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.85) 100%)",
      border: `1px solid ${DS.colors.accent}`,
      borderRadius: "0px",
      padding: "1.00rem 2.25rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      fontFamily: DS.typography.fontFamily,
      boxShadow: `0 0 25px rgba(255, 69, 0, 0.3)`,
      pointerEvents: "none"
    });

    const label = document.createElement("div");
    label.textContent = "PRE-MATCH COUNTDOWN";
    Object.assign(label.style, {
      fontSize: "clamp(0.69rem, 1.5vh, 0.88rem)",
      color: DS.colors.accent,
      letterSpacing: "2px",
      fontWeight: "bold",
      textTransform: "uppercase"
    });
    el.appendChild(label);

    const num = document.createElement("div");
    num.id = "pre-match-countdown-num";
    num.textContent = countdownSeconds.toString();
    Object.assign(num.style, {
      fontSize: "clamp(2.25rem, 6vh, 3.38rem)",
      color: "#FFFFFF",
      fontWeight: "bold",
      lineHeight: "1",
      fontFamily: DS.typography.fontFamilySecondary
    });
    el.appendChild(num);

    const sub = document.createElement("div");
    sub.textContent = "PREPARING OPERATIVES";
    Object.assign(sub.style, {
      fontSize: "clamp(0.56rem, 1.2vh, 0.69rem)",
      color: DS.colors.textSecondary,
      letterSpacing: "1px",
      textTransform: "uppercase"
    });
    el.appendChild(sub);

    document.body.appendChild(el);
    countdownOverlayContainer = el;
  } else {
    const num = document.getElementById("pre-match-countdown-num");
    if (num) {
      num.textContent = countdownSeconds.toString();
    }
  }
}

export function hidePreMatchCountdownOverlay(): void {
  if (countdownOverlayContainer && countdownOverlayContainer.parentNode) {
    countdownOverlayContainer.parentNode.removeChild(countdownOverlayContainer);
  }
  countdownOverlayContainer = null;
  const el = document.getElementById("pre-match-countdown-overlay");
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}
