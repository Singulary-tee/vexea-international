import { MatchController } from "../../MatchController";
import { ACTIVE_GAMEMODE } from "../../../shared/gamemode-configs";
import { PlayerUtilityState } from "../../../shared/utilities";
import { IS_MOBILE } from "../../gates/platform.gate";

export class HUDSystem {
  private match: MatchController;

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {
    this.setupMatchStatusModal();
    this.updateHUD();
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

    // Utility 1
    const u1Badge = document.getElementById("util-1-badge");
    const u1Cooldown = document.getElementById("util-1-cooldown");
    if (u1Badge && state.utility1) {
      if (IS_MOBILE) {
        u1Badge.style.display = "none";
      } else {
        u1Badge.style.display = "flex";
        u1Badge.innerText = "G";
        u1Badge.style.opacity = state.utility1.charges > 0 ? "1" : "0.4";
      }
    }
    if (u1Cooldown && state.utility1) {
      if (state.utility1.cooldownRemaining > 0 && state.utility1.charges === 0) {
        u1Cooldown.style.display = "flex";
        u1Cooldown.innerText = `${Math.ceil(state.utility1.cooldownRemaining)}s`;
      } else {
        u1Cooldown.style.display = "none";
      }
    }

    // Utility 2
    const u2Badge = document.getElementById("util-2-badge");
    const u2Cooldown = document.getElementById("util-2-cooldown");
    if (u2Badge && state.utility2) {
      if (IS_MOBILE) {
        u2Badge.style.display = "none";
      } else {
        u2Badge.style.display = "flex";
        u2Badge.innerText = "F";
        u2Badge.style.opacity = state.utility2.charges > 0 ? "1" : "0.4";
      }
    }
    if (u2Cooldown && state.utility2) {
      if (state.utility2.cooldownRemaining > 0 && state.utility2.charges === 0) {
        u2Cooldown.style.display = "flex";
        u2Cooldown.innerText = `${Math.ceil(state.utility2.cooldownRemaining)}s`;
      } else {
        u2Cooldown.style.display = "none";
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
}
