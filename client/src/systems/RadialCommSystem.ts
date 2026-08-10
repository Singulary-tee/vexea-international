import { MatchController } from "../../MatchController";
import { DS } from "../../design-system";

interface RadialOption {
  id: string;
  label: string;
  desc: string;
}

export class RadialCommSystem {
  private match: MatchController;
  private container: HTMLDivElement | null = null;
  private wheelEl: HTMLDivElement | null = null;
  private optionElements: HTMLDivElement[] = [];
  
  private isOpen = false;
  private selectedIndex = -1;
  private touchStartId = -1;

  // Center coordinate of the wheel
  private centerX = 0;
  private centerY = 0;

  // Event listener binders for clean disposal
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundOnKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;
  private boundOnChatButtonDown: ((e: Event) => void) | null = null;

  // Long press detection for mobile chat button
  private chatButtonHoldTimer: any = null;
  private isHoldingChatButton = false;

  private options: RadialOption[] = [
    { id: "REGROUP", label: "REGROUP", desc: "SQUAD ASSEMBLY" },
    { id: "NEED_AMMO", label: "NEED AMMO", desc: "SUPPLY REQUEST" },
    { id: "DRONE_SPOTTED", label: "WARN DRONE", desc: "DRONE SPOTTED" },
    { id: "ATTACK_ZONE", label: "ATTACKING", desc: "OFFENSIVE FOCUS" },
    { id: "DEFEND_ZONE", label: "DEFENDING", desc: "DEFENSIVE FOCUS" },
    { id: "HELP", label: "NEED BACKUP", desc: "CRITICAL ASSISTANCE" },
    { id: "AFFIRMATIVE", label: "AFFIRMATIVE", desc: "ACKNOWLEDGED" },
    { id: "NEGATIVE", label: "NEGATIVE", desc: "DISAGREE" }
  ];

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {
    this.createDOM();
    this.setupListeners();
  }

  private createDOM() {
    // 1. Container overlay
    const cont = document.createElement("div");
    cont.id = "radial-comm-container";
    cont.className = "hidden";
    Object.assign(cont.style, {
      position: "absolute",
      inset: "0",
      background: "rgba(5, 5, 5, 0.65)",
      backdropFilter: "blur(2px)",
      zIndex: "1050",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "auto",
      userSelect: "none"
    });

    // 2. Wheel Center Node
    const wheel = document.createElement("div");
    wheel.id = "radial-comm-wheel";
    Object.assign(wheel.style, {
      position: "relative",
      width: "20.00rem",
      height: "20.00rem",
      background: "rgba(10, 10, 12, 0.95)",
      border: `2px solid ${DS.colors.border}`,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.85)"
    });

    // Inner center hub
    const hub = document.createElement("div");
    Object.assign(hub.style, {
      position: "absolute",
      width: "5.00rem",
      height: "5.00rem",
      background: "rgba(0, 0, 0, 0.5)",
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      borderRadius: "50%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "10"
    });
    
    const crosshair = document.createElement("div");
    Object.assign(crosshair.style, {
      width: "1.00rem",
      height: "1.00rem",
      border: `1px solid ${DS.colors.accent}`,
      borderRadius: "50%"
    });
    hub.appendChild(crosshair);
    wheel.appendChild(hub);

    // 3. Render items mathematically in polar coordinate rings
    this.optionElements = [];
    const radius = 110; // offset in pixels from center
    const cardWidth = 100;
    const cardHeight = 44;

    this.options.forEach((opt, idx) => {
      const angleRad = (idx * 45 - 90) * Math.PI / 180;
      const x = Math.cos(angleRad) * radius;
      const y = Math.sin(angleRad) * radius;

      const card = document.createElement("div");
      card.id = `radial-opt-${opt.id}`;
      Object.assign(card.style, {
        position: "absolute",
        left: `calc(50% + ${x}px - ${cardWidth / 2}px)`,
        top: `calc(50% + ${y}px - ${cardHeight / 2}px)`,
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "0px", // Strict 0px sharp edges
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.1s ease",
        zIndex: "5"
      });

      const label = document.createElement("div");
      label.innerText = opt.label;
      Object.assign(label.style, {
        color: "white",
        fontFamily: "monospace",
        fontSize: DS.typography.sizes.small,
        fontWeight: "bold",
        pointerEvents: "none"
      });

      const desc = document.createElement("div");
      desc.innerText = opt.desc;
      Object.assign(desc.style, {
        color: "#888",
        fontFamily: "monospace",
        fontSize: DS.typography.sizes.tiny,
        marginTop: "2px",
        pointerEvents: "none",
        textTransform: "uppercase"
      });

      card.appendChild(label);
      card.appendChild(desc);
      wheel.appendChild(card);
      this.optionElements.push(card);
    });

    cont.appendChild(wheel);
    document.getElementById("hud-container")?.appendChild(cont);
    this.container = cont;
    this.wheelEl = wheel;
  }

  private setupListeners() {
    // 1. Keyboard shortcuts: Hold "V" to open
    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "v" || e.key === "V") && !this.isOpen) {
        // Prevent opening if player is already typing in chat input
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
        
        e.preventDefault();
        this.openWheel();
      }
    };

    this.boundOnKeyUp = (e: KeyboardEvent) => {
      if ((e.key === "v" || e.key === "V") && this.isOpen) {
        e.preventDefault();
        this.closeWheelAndEmit();
      }
    };

    window.addEventListener("keydown", this.boundOnKeyDown);
    window.addEventListener("keyup", this.boundOnKeyUp);

    // 2. Mobile Touch Long-Press on sidekick Chat button
    const chatBtn = document.getElementById("btn-chat");
    if (chatBtn) {
      this.boundOnChatButtonDown = (e: Event) => {
        this.isHoldingChatButton = true;
        if (this.chatButtonHoldTimer) clearTimeout(this.chatButtonHoldTimer);
        
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight / 2;
        
        if (e instanceof MouseEvent) {
          startX = e.clientX;
          startY = e.clientY;
        } else if (window.TouchEvent && e instanceof TouchEvent && e.touches.length > 0) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }

        this.chatButtonHoldTimer = setTimeout(() => {
          if (this.isHoldingChatButton) {
            this.openWheel(startX, startY);
          }
        }, 300); // 300ms hold threshold
      };

      chatBtn.addEventListener("mousedown", this.boundOnChatButtonDown);
      chatBtn.addEventListener("touchstart", this.boundOnChatButtonDown, { passive: true });

      const onCancelHold = () => {
        this.isHoldingChatButton = false;
        if (this.chatButtonHoldTimer) {
          clearTimeout(this.chatButtonHoldTimer);
          this.chatButtonHoldTimer = null;
        }
        if (this.isOpen) {
          this.closeWheelAndEmit();
        }
      };

      chatBtn.addEventListener("mouseup", onCancelHold);
      chatBtn.addEventListener("touchend", onCancelHold);
      chatBtn.addEventListener("touchcancel", onCancelHold);
    }

    // 3. Pointer drag & tracking coordinates
    this.boundOnPointerMove = (e: PointerEvent) => {
      if (!this.isOpen) return;
      this.trackPointer(e.clientX, e.clientY);
    };

    this.boundOnPointerUp = (e: PointerEvent) => {
      if (this.isOpen) {
        this.closeWheelAndEmit();
      }
    };

    window.addEventListener("pointermove", this.boundOnPointerMove);
    window.addEventListener("pointerup", this.boundOnPointerUp);
  }

  private openWheel(startX?: number, startY?: number) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.selectedIndex = -1;

    // Apply radial opacity settings
    const s = (window as any).vexeaSettings;
    const opacity = s ? (s.radialOpacity !== undefined ? s.radialOpacity : 0.9) : 0.9;
    if (this.container) {
      this.container.style.opacity = opacity.toString();
      this.container.classList.remove("hidden");
      this.container.style.display = "block"; // Use block to allow absolute positioning of wheelEl
    }

    // Determine visual center and position wheel relative to start coordinates
    if (this.wheelEl) {
      const wheelHalf = 160; // 20.00rem width/height divided by 2
      let cx = startX !== undefined ? startX : window.innerWidth / 2;
      let cy = startY !== undefined ? startY : window.innerHeight / 2;
      
      // Clamp within viewport to prevent overflowing boundaries
      cx = Math.max(wheelHalf, Math.min(window.innerWidth - wheelHalf, cx));
      cy = Math.max(wheelHalf, Math.min(window.innerHeight - wheelHalf, cy));

      this.wheelEl.style.position = "absolute";
      this.wheelEl.style.left = `${cx - wheelHalf}px`;
      this.wheelEl.style.top = `${cy - wheelHalf}px`;
      this.wheelEl.style.margin = "0";
      
      this.centerX = cx;
      this.centerY = cy;
    }

    // Reset highlighted elements
    this.optionElements.forEach(el => {
      el.style.background = "rgba(0, 0, 0, 0.8)";
      el.style.borderColor = "rgba(255, 255, 255, 0.15)";
      el.style.transform = "scale(1)";
    });

    // Lock game input
    const inputSys = this.match.input;
    if (inputSys && (inputSys as any).inputManager) {
      (inputSys as any).inputManager.setInputLocked(true);
    }
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  private trackPointer(clientX: number, clientY: number) {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const s = (window as any).vexeaSettings;
    const deadzone = s ? (s.radialSelectionDeadzone !== undefined ? s.radialSelectionDeadzone : 20) : 20;

    if (dist < deadzone) {
      // Inside deadzone, clear selection
      if (this.selectedIndex !== -1) {
        this.clearHighlight(this.selectedIndex);
        this.selectedIndex = -1;
      }
      return;
    }

    // Compute polar angle clockwise starting UP (-90 degrees)
    // Math.atan2 returns angle from X axis (right). We rotate it by 90 degrees to make UP 0 degrees.
    const angleRad = Math.atan2(dy, dx);
    let deg = angleRad * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;

    // Resolve index
    const resolvedIndex = Math.floor(deg / 45) % 8;

    if (resolvedIndex !== this.selectedIndex) {
      if (this.selectedIndex !== -1) {
        this.clearHighlight(this.selectedIndex);
      }
      this.selectedIndex = resolvedIndex;
      this.highlightItem(this.selectedIndex);
    }
  }

  private highlightItem(idx: number) {
    const el = this.optionElements[idx];
    if (el) {
      el.style.background = DS.colors.accent;
      el.style.borderColor = "#ffffff";
      el.style.transform = "scale(1.15)";
      const label = el.children[0] as HTMLDivElement;
      const desc = el.children[1] as HTMLDivElement;
      if (label) label.style.color = "#000000";
      if (desc) desc.style.color = "#333333";
    }
  }

  private clearHighlight(idx: number) {
    const el = this.optionElements[idx];
    if (el) {
      el.style.background = "rgba(0, 0, 0, 0.8)";
      el.style.borderColor = "rgba(255, 255, 255, 0.15)";
      el.style.transform = "scale(1)";
      const label = el.children[0] as HTMLDivElement;
      const desc = el.children[1] as HTMLDivElement;
      if (label) label.style.color = "#ffffff";
      if (desc) desc.style.color = "#888888";
    }
  }

  private closeWheelAndEmit() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this.container) {
      this.container.classList.add("hidden");
      this.container.style.display = "none";
    }

    // Release game input lock
    const inputSys = this.match.input;
    if (inputSys && (inputSys as any).inputManager) {
      (inputSys as any).inputManager.setInputLocked(false);
    }

    // Resolve and dispatch selection
    if (this.selectedIndex !== -1) {
      const selectedOption = this.options[this.selectedIndex];
      const channel = this.match.transport;
      if (channel) {
        channel.emit("reliable_event", {
          type: "QUICK_COMM",
          optionId: selectedOption.id
        });
      } else {
        // Fallback for offline mode testing
        if (this.match.chatHUD) {
          this.match.chatHUD.addQuickCommMessage("YOU (LOCAL)", selectedOption.id);
        }
      }
    }
  }

  public dispose() {
    if (this.boundOnKeyDown) {
      window.removeEventListener("keydown", this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
    if (this.boundOnKeyUp) {
      window.removeEventListener("keyup", this.boundOnKeyUp);
      this.boundOnKeyUp = null;
    }
    if (this.boundOnPointerMove) {
      window.removeEventListener("pointermove", this.boundOnPointerMove);
      this.boundOnPointerMove = null;
    }
    if (this.boundOnPointerUp) {
      window.removeEventListener("pointerup", this.boundOnPointerUp);
      this.boundOnPointerUp = null;
    }

    const chatBtn = document.getElementById("btn-chat");
    if (chatBtn && this.boundOnChatButtonDown) {
      chatBtn.removeEventListener("mousedown", this.boundOnChatButtonDown);
      chatBtn.removeEventListener("touchstart", this.boundOnChatButtonDown);
      this.boundOnChatButtonDown = null;
    }

    if (this.chatButtonHoldTimer) {
      clearTimeout(this.chatButtonHoldTimer);
      this.chatButtonHoldTimer = null;
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
