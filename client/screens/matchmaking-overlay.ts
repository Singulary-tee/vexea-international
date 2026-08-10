import { DS } from "../design-system";
import { ScreenGate } from "../gates/screen.gate";

export interface MatchmakingOverlayOptions {
  mapId: string;
  onCancel: () => void;
}

let overlayContainer: HTMLElement | null = null;
let countdownOverlayContainer: HTMLElement | null = null;

export function showMatchmakingOverlay(options: MatchmakingOverlayOptions): void {
  hideMatchmakingOverlay();

  // Register screen lock in ScreenGate to suppress all underlying UI button interactions
  ScreenGate.lockScreenGroup('matchmaking');

  // Full-screen backdrop modal blocker
  const backdrop = document.createElement("div");
  backdrop.id = "matchmaking-overlay";
  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(8px)",
    pointerEvents: "auto"
  });

  // Modal box
  const el = document.createElement("div");
  Object.assign(el.style, {
    background: "radial-gradient(ellipse at center, rgba(18, 18, 18, 0.98) 0%, rgba(8, 8, 8, 0.90) 100%)",
    border: `1px solid ${DS.colors.accent}`,
    borderRadius: "0px",
    padding: "1.50rem 2.25rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    fontFamily: DS.typography.fontFamily,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.9)",
    pointerEvents: "auto",
    minWidth: "20.00rem",
    maxWidth: "90vw"
  });

  const headerRow = document.createElement("div");
  Object.assign(headerRow.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  });

  const pulseIndicator = document.createElement("div");
  Object.assign(pulseIndicator.style, {
    width: "0.63rem",
    height: "0.63rem",
    background: DS.colors.accent,
    borderRadius: "0px",
    boxShadow: `0 0 8px ${DS.colors.accent}`,
    animation: "mm-pulse 1.2s infinite ease-in-out"
  });

  const titleText = document.createElement("div");
  titleText.textContent = "MATCHMAKING IN PROGRESS";
  Object.assign(titleText.style, {
    fontSize: "clamp(0.81rem, 1.8vh, 1.00rem)",
    fontWeight: "bold",
    color: DS.colors.accent,
    letterSpacing: "2px",
    textTransform: "uppercase"
  });

  headerRow.appendChild(pulseIndicator);
  headerRow.appendChild(titleText);
  el.appendChild(headerRow);

  const statusText = document.createElement("div");
  statusText.id = "mm-overlay-status";
  statusText.textContent = `MAP: ${(options.mapId || "FACILITY").toUpperCase()} | QUEUE: 1 / 10 | MIN: 4`;
  Object.assign(statusText.style, {
    fontSize: "clamp(0.63rem, 1.4vh, 0.75rem)",
    color: DS.colors.textSecondary,
    letterSpacing: "1px",
    textTransform: "uppercase"
  });
  el.appendChild(statusText);

  const cancelBtn = document.createElement("button");
  cancelBtn.id = "mm-overlay-cancel-btn";
  cancelBtn.textContent = "CANCEL MATCHMAKING";
  Object.assign(cancelBtn.style, {
    background: "rgba(255, 69, 0, 0.15)",
    border: `1px solid ${DS.colors.accent}`,
    color: DS.colors.accent,
    fontFamily: DS.typography.fontFamily,
    fontSize: "clamp(0.69rem, 1.4vh, 0.81rem)",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "0.38rem 1.25rem",
    cursor: "pointer",
    borderRadius: "0px",
    marginTop: "4px",
    transition: "all 0.15s ease-out"
  });

  cancelBtn.addEventListener("mouseenter", () => {
    cancelBtn.style.background = "rgba(255, 69, 0, 0.35)";
    cancelBtn.style.color = "#FFFFFF";
  });
  cancelBtn.addEventListener("mouseleave", () => {
    cancelBtn.style.background = "rgba(255, 69, 0, 0.15)";
    cancelBtn.style.color = DS.colors.accent;
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    options.onCancel();
  });

  el.appendChild(cancelBtn);

  if (!document.getElementById("mm-pulse-style")) {
    const style = document.createElement("style");
    style.id = "mm-pulse-style";
    style.textContent = `
      @keyframes mm-pulse {
        0% { opacity: 0.3; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0.3; transform: scale(0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  backdrop.appendChild(el);
  document.body.appendChild(backdrop);
  overlayContainer = backdrop;
}

export function updateMatchmakingOverlayStatus(data: { mapId?: string; queueSize?: number; minPlayers?: number; maxPlayers?: number }): void {
  const statusText = document.getElementById("mm-overlay-status");
  if (statusText) {
    const mapName = (data.mapId || "FACILITY").toUpperCase();
    const queue = data.queueSize ?? 1;
    const max = data.maxPlayers ?? 10;
    const min = data.minPlayers ?? 4;
    statusText.textContent = `MAP: ${mapName} | QUEUE: ${queue} / ${max} | MIN: ${min}`;
  }
}

export function hideMatchmakingOverlay(): void {
  ScreenGate.unlockScreenGroup('matchmaking');
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
  }
  overlayContainer = null;
  const el = document.getElementById("matchmaking-overlay");
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
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
