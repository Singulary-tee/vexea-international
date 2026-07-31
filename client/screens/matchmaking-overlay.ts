import { DS } from "../design-system";

export interface MatchmakingOverlayOptions {
  mapId: string;
  onCancel: () => void;
}

let overlayContainer: HTMLElement | null = null;
let countdownOverlayContainer: HTMLElement | null = null;

export function showMatchmakingOverlay(options: MatchmakingOverlayOptions): void {
  hideMatchmakingOverlay();

  const el = document.createElement("div");
  el.id = "matchmaking-overlay";
  Object.assign(el.style, {
    position: "fixed",
    top: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "99999",
    background: "radial-gradient(ellipse at center, rgba(18, 18, 18, 0.96) 0%, rgba(8, 8, 8, 0.90) 100%)",
    border: `1px solid ${DS.colors.accent}`,
    borderRadius: "0px",
    padding: "16px 28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    fontFamily: DS.typography.fontFamily,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
    pointerEvents: "auto",
    minWidth: "320px",
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
    width: "10px",
    height: "10px",
    background: DS.colors.accent,
    borderRadius: "0px",
    boxShadow: `0 0 8px ${DS.colors.accent}`,
    animation: "mm-pulse 1.2s infinite ease-in-out"
  });

  const titleText = document.createElement("div");
  titleText.textContent = "MATCHMAKING IN PROGRESS";
  Object.assign(titleText.style, {
    fontSize: "clamp(13px, 1.8vh, 16px)",
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
    fontSize: "clamp(10px, 1.4vh, 12px)",
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
    fontSize: "clamp(11px, 1.4vh, 13px)",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "6px 20px",
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

  document.body.appendChild(el);
  overlayContainer = el;
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
      padding: "16px 36px",
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
      fontSize: "clamp(11px, 1.5vh, 14px)",
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
      fontSize: "clamp(36px, 6vh, 54px)",
      color: "#FFFFFF",
      fontWeight: "bold",
      lineHeight: "1",
      fontFamily: DS.typography.fontFamilySecondary
    });
    el.appendChild(num);

    const sub = document.createElement("div");
    sub.textContent = "PREPARING OPERATIVES";
    Object.assign(sub.style, {
      fontSize: "clamp(9px, 1.2vh, 11px)",
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
