import { MatchController } from "../../MatchController";
import { ACTIVE_GAMEMODE } from "../../../shared/gamemode-configs";
import { PlayerUtilityState, type UtilityId } from "../../../shared/utilities";
import { UTILITY_ASSET_DETAILS } from "../../../shared/asset-details";
import { IS_MOBILE } from "../../gates/platform.gate";
import { bindFullscreenButton } from "../ui/fullscreen";

const UTILITY_ID_BY_DISPLAY_NAME: Record<string, UtilityId> = {
  grenade: 'Grenade',
  'frag grenade': 'Grenade',
  frag: 'Grenade',
  flashbang: 'Flashbang',
  'flash grenade': 'Flashbang',
  medkit: 'Med Kit',
  'med kit': 'Med Kit',
  revive: 'Revive Tool',
  'revive tool': 'Revive Tool',
  radio: 'Radio',
  'field radio': 'Radio',
  'signal jammer': 'Signal Jammer',
  'signal disruptor': 'Signal Jammer',
  'proximity mine': 'Proximity Mine',
  mine: 'Proximity Mine',
  c4: 'C4',
};

export function getUtilitySvgPath(utilityName: string): string {
  const utilityId = UTILITY_ID_BY_DISPLAY_NAME[(utilityName || '').toLowerCase()];
  // SVG CONNECTOR PLACEHOLDER: svg-responsible agent replaces shared registry paths with final approved assets.
  return (utilityId && UTILITY_ASSET_DETAILS[utilityId]?.svgPath) || '/ui_svgs/utility_grenade.svg';
}

export class HUDSystem {
  private match: MatchController;

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {
    this.setupMatchStatusModal();
    this.setupFullscreenButton();
    this.updateHUD();
  }

  private setupFullscreenButton() {
    const fsBtn = document.getElementById("btn-fullscreen");
    if (!fsBtn) return;
    bindFullscreenButton(fsBtn, 1.38);
  }

  private setupMatchStatusModal() {
    const btn = document.getElementById("btn-match-status");
    const closeBtn = document.getElementById("btn-close-match-status");
    const modal = document.getElementById("match-status-modal");

    if (btn && modal) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.style.display = modal.style.display === "none" ? "block" : "none";
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.style.display = "none";
      });
    }
  }

  public updateHUD() {
    const match = this.match;
    const hBar = document.getElementById("health-bar-fill");
    const hpVal = document.getElementById("health-text");
    const scoreVal = document.getElementById("score-val");
    
    if (hBar) hBar.style.width = `${match.playerHP}%`;
    if (hpVal) hpVal.innerText = `${Math.floor(match.playerHP)}`;
    if (scoreVal) scoreVal.innerText = `${match.playerScore}`;

    this.updateMatchStatusUI();
  }

  public updateMatchStatusUI() {
    const match = this.match;
    const modal = document.getElementById("match-status-modal");
    if (!modal || modal.style.display === "none") return;

    const nameEl = document.getElementById("status-player-name");
    const scoreEl = document.getElementById("status-score");
    const pingEl = document.getElementById("status-ping-val");
    const pendingInputsEl = document.getElementById("status-pending-inputs");

    if (nameEl) nameEl.innerText = match.localPlayerId || "OPERATIVE-1";
    if (scoreEl) scoreEl.innerText = `${match.playerScore}`;
    if (pingEl) pingEl.innerText = `${match.latency} ms`;
    if (pendingInputsEl) pendingInputsEl.innerText = `${match.moveHistory.length}`;
  }

  public updateAmmo(primary?: { currentMag: number, reserve: number, isReloading: boolean }, secondary?: { currentMag: number, reserve: number, isReloading: boolean }) {
    const a1 = document.getElementById("weapon-1-ammo");
    const a2 = document.getElementById("weapon-2-ammo");
    
    if (a1 && primary) {
      a1.innerHTML = primary.isReloading
        ? "RELOADING"
        : `<span class="ammo-mag">${primary.currentMag.toString().padStart(2, "0")}</span><span class="ammo-res">/${primary.reserve}</span>`;
    }
    
    if (a2 && secondary) {
      a2.innerHTML = secondary.isReloading
        ? "RELOADING"
        : `<span class="ammo-mag">${secondary.currentMag.toString().padStart(2, "0")}</span><span class="ammo-res">/${secondary.reserve}</span>`;
    }
  }

  public updateTimer(tick: number) {
    const totalSeconds = ACTIVE_GAMEMODE.matchDuration;
    const elapsedSeconds = Math.floor(tick / 60);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    const elapsedVal = document.getElementById("hud-timer");
    if (elapsedVal) elapsedVal.innerText = `${ACTIVE_GAMEMODE.timerLabel.toUpperCase()}: ${minutes}:${seconds}`;
  }


  public triggerUIFlash(color: string = "255, 0, 0", duration: number = 0.5) {
    let flashDiv = document.getElementById("ui-damage-flash");
    if (!flashDiv) {
      flashDiv = document.createElement("div");
      flashDiv.id = "ui-damage-flash";
      Object.assign(flashDiv.style, {
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        zIndex: "999",
        transition: "opacity 0.1s ease-out",
      });
      document.body.appendChild(flashDiv);
    }
    flashDiv.style.background = `rgba(${color}, 0.3)`;
    flashDiv.style.opacity = "1";

    setTimeout(() => {
      if (flashDiv) {
        flashDiv.style.transition = `opacity ${duration}s ease-out`;
        flashDiv.style.opacity = "0";
      }
    }, 100);
  }

  public showDeathOverlay(show: boolean, respawnTimer?: number) {
    const overlay = document.getElementById("death-overlay");
    const countdown = document.getElementById("death-countdown");
    if (overlay) overlay.style.display = show ? "flex" : "none";
    if (countdown && respawnTimer !== undefined) countdown.innerText = String(respawnTimer);
  }

  public updateRespawnCountdown(remaining: number) {
    const countdown = document.getElementById("death-countdown");
    if (countdown) countdown.innerText = String(remaining);
  }

  public updateUtilities(state: PlayerUtilityState) {
    if (!state) return;

    // Utility 1 (Walkie / Grenade)
    const u1Btn = document.getElementById("btn-walkie");
    const u1Badge = document.getElementById("util-1-badge");
    if (state.utility1) {
      if (u1Btn) {
        const u1Img = u1Btn.querySelector("img") as HTMLImageElement;
        if (u1Img) {
          const u1Obj = state.utility1 as any;
          const svgPath = u1Obj.icon || getUtilitySvgPath(u1Obj.name || u1Obj.id || '');
          if (svgPath && u1Img.getAttribute('src') !== svgPath) {
            u1Img.src = svgPath;
          }
        }
        const isOnCooldown = state.utility1.cooldownRemaining > 0 || state.utility1.charges === 0;
        u1Btn.style.filter = isOnCooldown ? "grayscale(1)" : "none";
        u1Btn.style.opacity = isOnCooldown ? "0.4" : "1";
      }
      if (u1Badge && !IS_MOBILE) {
        const isOnCooldown = state.utility1.cooldownRemaining > 0 || state.utility1.charges === 0;
        u1Badge.style.display = "flex";
        u1Badge.innerText = "G";
        u1Badge.style.opacity = isOnCooldown ? "0.4" : "1";
      }
    }

    // Utility 2 (Medkit)
    const u2Btn = document.getElementById("btn-medkit");
    const u2Badge = document.getElementById("util-2-badge");
    if (state.utility2) {
      if (u2Btn) {
        const u2Img = u2Btn.querySelector("img") as HTMLImageElement;
        if (u2Img) {
          const u2Obj = state.utility2 as any;
          const svgPath = u2Obj.icon || getUtilitySvgPath(u2Obj.name || u2Obj.id || '');
          if (svgPath && u2Img.getAttribute('src') !== svgPath) {
            u2Img.src = svgPath;
          }
        }
        const isOnCooldown = state.utility2.cooldownRemaining > 0 || state.utility2.charges === 0;
        u2Btn.style.filter = isOnCooldown ? "grayscale(1)" : "none";
        u2Btn.style.opacity = isOnCooldown ? "0.4" : "1";
      }
      if (u2Badge && !IS_MOBILE) {
        const isOnCooldown = state.utility2.cooldownRemaining > 0 || state.utility2.charges === 0;
        u2Badge.style.display = "flex";
        u2Badge.innerText = "F";
        u2Badge.style.opacity = isOnCooldown ? "0.4" : "1";
      }
    }
  }

  public triggerWhiteoutFlash(duration: number = 3.5, intensity: number = 1.0) {
    let whiteout = document.getElementById("ui-flashbang-whiteout");
    if (!whiteout) {
      whiteout = document.createElement("div");
      whiteout.id = "ui-flashbang-whiteout";
      Object.assign(whiteout.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "9999",
        background: "rgb(255, 255, 255)",
        opacity: "0",
        transition: "opacity 0.05s ease-out",
      });
      document.body.appendChild(whiteout);
    }
    const maxOpacity = Math.min(1.0, Math.max(0.2, intensity));
    whiteout.style.transition = "opacity 0.05s ease-out";
    whiteout.style.opacity = String(maxOpacity);

    setTimeout(() => {
      if (whiteout) {
        whiteout.style.transition = `opacity ${duration}s ease-out`;
        whiteout.style.opacity = "0";
      }
    }, 100);
  }

  public showAFKWarning(remainingSec: number = 60) {
    let warnEl = document.getElementById("ui-afk-warning");
    if (!warnEl) {
      warnEl = document.createElement("div");
      warnEl.id = "ui-afk-warning";
      Object.assign(warnEl.style, {
        position: "absolute",
        top: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(239, 68, 68, 0.9)",
        border: "1px solid #ef4444",
        padding: "0.75rem 1.5rem",
        borderRadius: "0.25rem",
        color: "#ffffff",
        fontFamily: "monospace",
        fontWeight: "bold",
        fontSize: "0.9rem",
        letterSpacing: "1px",
        textAlign: "center",
        zIndex: "9000",
        pointerEvents: "none",
        boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
      });
      const container = document.getElementById("hud-container") || document.body;
      container.appendChild(warnEl);
    }
    warnEl.style.display = "block";
    warnEl.innerText = `AFK WARNING: INACTIVITY DETECTED! MOVE OR FIRE WITHIN ${remainingSec}S TO AVOID BEING KICKED.`;
  }

  public hideAFKWarning() {
    const warnEl = document.getElementById("ui-afk-warning");
    if (warnEl) {
      warnEl.style.display = "none";
    }
  }
}
