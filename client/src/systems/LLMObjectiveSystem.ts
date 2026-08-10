import * as THREE from "three/webgpu";
import { MatchController } from "../../MatchController";
import { ACTIVE_GAMEMODE } from "../../../shared/gamemode-configs";
import { DS } from "../../design-system";

/**
 * LLMObjectiveSystem: Manages interaction with the rogue LLM Core objective terminal in zone_core (384, 384).
 * Handles proximity detection, hold keybind / mobile pop-up button, progress timer, and server event streaming.
 */
export class LLMObjectiveSystem {
  private match: MatchController;
  private corePos = new THREE.Vector3(384, 0, 384);
  private proximityRadius = ACTIVE_GAMEMODE.objectiveProximityRadius || 3.0;
  private requiredHoldTime = ACTIVE_GAMEMODE.objectiveHoldTime || 8.0;

  private isPlayerInZone = false;
  private isHolding = false;
  private holdProgress = 0.0; // Seconds held (0.0 to requiredHoldTime)

  private hudOverlayEl: HTMLElement | null = null;
  private hudButtonEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private progressTextEl: HTMLElement | null = null;
  private keyHintEl: HTMLElement | null = null;

  private isTouch = false;
  private boundKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(match: MatchController) {
    this.match = match;
  }

  public init(): void {
    this.isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.createHUDOverlay();
    this.setupInputListeners();
  }

  private createHUDOverlay(): void {
    const hudContainer = document.getElementById("hud-container") || document.body;

    const overlay = document.createElement("div");
    overlay.id = "llm-objective-overlay";
    Object.assign(overlay.style, {
      position: "absolute",
      bottom: "7.50rem",
      left: "50%",
      transform: "translateX(-50%)",
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      zIndex: "3000",
      pointerEvents: "none",
      fontFamily: "'Chakra Petch', sans-serif"
    });

    // Key Hint / Title
    const hint = document.createElement("div");
    hint.id = "llm-objective-hint";
    Object.assign(hint.style, {
      color: "#ffaa00",
      fontSize: DS.typography.sizes.body,
      fontWeight: "bold",
      letterSpacing: "1.5px",
      textShadow: "0 0 8px rgba(255, 170, 0, 0.6)",
      textTransform: "uppercase"
    });
    hint.textContent = this.isTouch ? "APPROACH TERMINAL" : "[E] HOLD TO DISABLE LLM";
    overlay.appendChild(hint);
    this.keyHintEl = hint;

    // Mobile Pop-Up Button (Touch target >= 44px)
    if (this.isTouch) {
      const btn = document.createElement("button");
      btn.id = "llm-objective-touch-btn";
      btn.textContent = "HOLD TO DISABLE LLM";
      Object.assign(btn.style, {
        pointerEvents: "auto",
        minWidth: "10.00rem",
        minHeight: "48px",
        padding: "0.63rem 1.13rem",
        background: "rgba(255, 170, 0, 0.2)",
        border: "2px solid #ffaa00",
        borderRadius: "4px",
        color: "#ffffff",
        fontSize: DS.typography.sizes.small,
        fontWeight: "bold",
        letterSpacing: "1px",
        boxShadow: "0 0 12px rgba(255, 170, 0, 0.4)",
        cursor: "pointer",
        userSelect: "none",
        webkitUserSelect: "none"
      });

      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startHold();
      }, { passive: false });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.stopHold();
      }, { passive: false });

      btn.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        this.stopHold();
      }, { passive: false });

      overlay.appendChild(btn);
      this.hudButtonEl = btn;
    }

    // Progress Bar Container
    const barWrap = document.createElement("div");
    Object.assign(barWrap.style, {
      width: "12.50rem",
      height: "0.63rem",
      background: "rgba(0, 0, 0, 0.7)",
      border: "1px solid rgba(255, 170, 0, 0.6)",
      borderRadius: "2px",
      overflow: "hidden",
      position: "relative"
    });

    const fill = document.createElement("div");
    fill.id = "llm-objective-progress-fill";
    Object.assign(fill.style, {
      width: "0%",
      height: "100%",
      background: "linear-gradient(90deg, #ff8800, #ffaa00)",
      boxShadow: "0 0 10px #ffaa00",
      transition: "width 50ms linear"
    });
    barWrap.appendChild(fill);
    this.progressBarEl = fill;

    // Progress Text %
    const pText = document.createElement("div");
    pText.id = "llm-objective-progress-text";
    Object.assign(pText.style, {
      fontSize: DS.typography.sizes.tiny,
      color: "#ffaa00",
      fontWeight: "bold",
      letterSpacing: "1px"
    });
    pText.textContent = "PROGRESS: 0%";
    overlay.appendChild(barWrap);
    overlay.appendChild(pText);
    this.progressTextEl = pText;

    hudContainer.appendChild(overlay);
    this.hudOverlayEl = overlay;
  }

  private setupInputListeners(): void {
    if (this.isTouch) return;

    this.boundKeyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        if (this.isPlayerInZone && !this.isHolding) {
          this.startHold();
        }
      }
    };

    this.boundKeyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        if (this.isHolding) {
          this.stopHold();
        }
      }
    };

    window.addEventListener("keydown", this.boundKeyDownHandler);
    window.addEventListener("keyup", this.boundKeyUpHandler);
  }

  private startHold(): void {
    if (!this.isPlayerInZone) return;
    this.isHolding = true;
    this.sendHoldStateToServer(true);
  }

  private stopHold(): void {
    this.isHolding = false;
    this.holdProgress = 0.0;
    this.updateProgressUI();
    this.sendHoldStateToServer(false);
  }

  public resetProgressOnDamage(): void {
    if (ACTIVE_GAMEMODE.objectiveResetOnDamage) {
      this.holdProgress = 0.0;
      this.updateProgressUI();
      if (this.isHolding) {
        this.stopHold();
      }
    }
  }

  private sendHoldStateToServer(holding: boolean): void {
    if (this.match.transport) {
      this.match.transport.emit("reliable_event", {
        type: "OBJECTIVE_HOLD",
        holding,
        timestamp: Date.now()
      });
    }
  }

  public update(dt: number): void {
    const pPos = this.match.playerPos;
    if (!pPos) return;

    // Measure distance to objective core (384, 384) in 2D horizontal plane
    const dx = pPos.x - this.corePos.x;
    const dz = pPos.z - this.corePos.z;
    const distSq = dx * dx + dz * dz;
    const inRange = distSq <= this.proximityRadius * this.proximityRadius;

    if (inRange !== this.isPlayerInZone) {
      this.isPlayerInZone = inRange;
      if (this.hudOverlayEl) {
        this.hudOverlayEl.style.display = inRange ? "flex" : "none";
      }
      if (!inRange && this.isHolding) {
        this.stopHold();
      }
    }

    if (this.isPlayerInZone && this.isHolding) {
      this.holdProgress += dt;
      if (this.holdProgress > this.requiredHoldTime) {
        this.holdProgress = this.requiredHoldTime;
      }
      this.updateProgressUI();
    }
  }

  public onServerProgressUpdate(progressSec: number): void {
    this.holdProgress = progressSec;
    this.updateProgressUI();
  }

  private updateProgressUI(): void {
    const pct = Math.min(100, Math.floor((this.holdProgress / this.requiredHoldTime) * 100));
    if (this.progressBarEl) {
      this.progressBarEl.style.width = `${pct}%`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `OVERRIDING: ${pct}%`;
    }
  }

  public destroy(): void {
    if (this.boundKeyDownHandler) {
      window.removeEventListener("keydown", this.boundKeyDownHandler);
    }
    if (this.boundKeyUpHandler) {
      window.removeEventListener("keyup", this.boundKeyUpHandler);
    }
    if (this.hudOverlayEl && this.hudOverlayEl.parentElement) {
      this.hudOverlayEl.parentElement.removeChild(this.hudOverlayEl);
    }
  }
}
