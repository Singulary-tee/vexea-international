import { MatchController } from "../../MatchController";
import { DS } from "../../design-system";

export class ChatHUDSystem {
  private match: MatchController;
  private container: HTMLDivElement | null = null;
  private logEl: HTMLDivElement | null = null;
  private inputContainer: HTMLDivElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private chatBtn: HTMLButtonElement | null = null;

  private isInputActive = false;
  private fadeTimeout: any = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundOnToggleChat: ((e: Event) => void) | null = null;
  private boundOnSendChat: ((e: Event) => void) | null = null;
  private boundOnSettingsChanged: ((e: Event) => void) | null = null;

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {
    this.createDOM();
    this.applySettings();
    this.setupListeners();
    this.showChatTemporarily();
  }

  private showChatTemporarily() {
    if (!this.logEl) return;
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.logEl.style.opacity = "1";
    this.logEl.style.pointerEvents = "auto";
    if (this.isInputActive) return;
    this.fadeTimeout = setTimeout(() => {
      if (this.logEl && !this.isInputActive) {
        this.logEl.style.opacity = "0";
        this.logEl.style.pointerEvents = "none";
      }
    }, 5000) as any;
  }

  private createDOM() {
    // Check if elements already exist, otherwise create them
    let log = document.getElementById("hud-chat-log") as HTMLDivElement;
    if (!log) {
      log = document.createElement("div");
      log.id = "hud-chat-log";
      log.className = "editable-hud-element";
      Object.assign(log.style, {
        position: "absolute",
        left: "1.5vw",
        bottom: "35vh",
        width: "35vw",
        height: "20vh",
        maxWidth: "380px",
        background: "rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        overflowY: "auto",
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px",
        fontFamily: "monospace",
        fontSize: "11px",
        zIndex: "90",
        userSelect: "text",
        opacity: "1",
        transition: "opacity 0.5s ease-out"
      });
      document.getElementById("hud-container")?.appendChild(log);
    }
    this.logEl = log;

    let inputCont = document.getElementById("hud-chat-input-container") as HTMLDivElement;
    if (!inputCont) {
      inputCont = document.createElement("div");
      inputCont.id = "hud-chat-input-container";
      inputCont.className = "hidden";
      Object.assign(inputCont.style, {
        position: "absolute",
        left: "1.5vw",
        bottom: "calc(35vh - 36px)",
        width: "35vw",
        height: "32px",
        maxWidth: "380px",
        background: "#000000",
        border: "1px solid #ffffff",
        display: "none",
        alignItems: "center",
        zIndex: "100",
        pointerEvents: "auto"
      });

      const input = document.createElement("input");
      input.type = "text";
      input.id = "hud-chat-input";
      input.placeholder = "TYPE A MESSAGE...";
      Object.assign(input.style, {
        flex: "1",
        background: "transparent",
        border: "none",
        color: "white",
        padding: "0 8px",
        fontFamily: "monospace",
        fontSize: "11px",
        outline: "none"
      });
      inputCont.appendChild(input);

      const send = document.createElement("button");
      send.id = "hud-chat-send";
      send.innerText = "SEND";
      Object.assign(send.style, {
        background: "#ffffff",
        border: "none",
        color: "#000000",
        fontFamily: "monospace",
        fontWeight: "bold",
        fontSize: "10px",
        padding: "0 12px",
        height: "100%",
        cursor: "pointer"
      });
      inputCont.appendChild(send);

      document.getElementById("hud-container")?.appendChild(inputCont);
    }
    this.inputContainer = inputCont;
    this.inputEl = document.getElementById("hud-chat-input") as HTMLInputElement;
    this.sendBtn = document.getElementById("hud-chat-send") as HTMLButtonElement;
    this.chatBtn = document.getElementById("btn-chat") as HTMLButtonElement;
  }

  public applySettings() {
    const s = (window as any).vexeaSettings;
    const enabled = s ? (s.chatEnabled !== false) : true;
    const fontSize = s ? (s.chatFontSize || 12) : 12;

    if (this.logEl) {
      this.logEl.style.display = enabled ? "flex" : "none";
      this.logEl.style.fontSize = `${fontSize}px`;
    }
  }

  private setupListeners() {
    // 1. Keyboard open/close chat bindings
    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (this.isInputActive) {
          this.sendChatMessage();
        } else {
          this.activateInput();
        }
      } else if (e.key === "Escape" && this.isInputActive) {
        e.preventDefault();
        this.deactivateInput();
      }
    };
    window.addEventListener("keydown", this.boundOnKeyDown);

    // 2. Chat sidekick button click binding
    if (this.chatBtn) {
      this.boundOnToggleChat = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.isInputActive) {
          this.deactivateInput();
        } else {
          this.activateInput();
        }
      };
      this.chatBtn.addEventListener("click", this.boundOnToggleChat);
      this.chatBtn.addEventListener("touchstart", this.boundOnToggleChat, { passive: false });
    }

    // 3. Send button click binding
    if (this.sendBtn) {
      this.boundOnSendChat = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        this.sendChatMessage();
      };
      this.sendBtn.addEventListener("click", this.boundOnSendChat);
      this.sendBtn.addEventListener("touchstart", this.boundOnSendChat, { passive: false });
    }

    // 4. Listen to settings changes
    this.boundOnSettingsChanged = () => {
      this.applySettings();
    };
    document.addEventListener("VEXEA_SETTINGS_CHANGED", this.boundOnSettingsChanged);
  }

  public activateInput() {
    if (this.isInputActive) return;
    this.isInputActive = true;

    if (this.inputContainer && this.inputEl) {
      this.inputContainer.classList.remove("hidden");
      this.inputContainer.style.display = "flex";
      this.inputEl.focus();
      this.inputEl.value = "";
    }

    // Lock game input
    const inputSys = this.match.input;
    if (inputSys && (inputSys as any).inputManager) {
      (inputSys as any).inputManager.setInputLocked(true);
    }
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    this.showChatTemporarily();
  }

  public deactivateInput() {
    if (!this.isInputActive) return;
    this.isInputActive = false;

    if (this.inputContainer && this.inputEl) {
      this.inputContainer.classList.add("hidden");
      this.inputContainer.style.display = "none";
      this.inputEl.blur();
    }

    // Release game input lock
    const inputSys = this.match.input;
    if (inputSys && (inputSys as any).inputManager) {
      (inputSys as any).inputManager.setInputLocked(false);
    }
    this.showChatTemporarily();
  }

  private sendChatMessage() {
    if (!this.inputEl) return;
    const text = this.inputEl.value.trim();
    if (text.length > 0) {
      const channel = this.match.transport;
      if (channel) {
        channel.emit("reliable_event", {
          type: "CHAT_MESSAGE",
          message: text
        });
      } else {
        // Fallback for offline mode testing
        this.addMessage("YOU (LOCAL)", text);
      }
    }
    this.deactivateInput();
  }

  public addMessage(sender: string, message: string) {
    if (!this.logEl) return;
    const s = (window as any).vexeaSettings;
    const enabled = s ? (s.chatEnabled !== false) : true;
    if (!enabled) return;

    const row = document.createElement("div");
    row.style.lineHeight = "1.4";
    row.style.wordBreak = "break-all";

    const senderSpan = document.createElement("span");
    senderSpan.innerText = `[${sender.toUpperCase()}] `;
    senderSpan.style.color = sender.toLowerCase() === "you" || sender.toLowerCase().includes("local") ? DS.colors.accent : "#3b82f6";
    senderSpan.style.fontWeight = "bold";

    const msgSpan = document.createElement("span");
    msgSpan.innerText = message;
    msgSpan.style.color = "#ffffff";

    row.appendChild(senderSpan);
    row.appendChild(msgSpan);
    this.logEl.appendChild(row);

    // Keep log scroll to bottom
    this.logEl.scrollTop = this.logEl.scrollHeight;

    // Limit log rows to 50
    while (this.logEl.children.length > 50) {
      this.logEl.removeChild(this.logEl.firstChild!);
    }
    this.showChatTemporarily();
  }

  public addQuickCommMessage(sender: string, optionId: string) {
    const quickCommTextMap: { [key: string]: string } = {
      "REGROUP": "REGROUP! (SQUAD ASSEMBLY)",
      "NEED_AMMO": "NEED AMMO! (SUPPLY REQUEST)",
      "DRONE_SPOTTED": "DRONE SPOTTED! (WARNING)",
      "ATTACK_ZONE": "ATTACKING ZONE! (OFFENSIVE FOCUS)",
      "DEFEND_ZONE": "DEFENDING ZONE! (DEFENSIVE FOCUS)",
      "HELP": "NEED BACKUP! (CRITICAL ASSISTANCE)",
      "AFFIRMATIVE": "AFFIRMATIVE. (ACKNOWLEDGED)",
      "NEGATIVE": "NEGATIVE. (DISAGREE)"
    };

    const friendlyText = quickCommTextMap[optionId] || optionId;
    if (!this.logEl) return;
    const s = (window as any).vexeaSettings;
    const enabled = s ? (s.chatEnabled !== false) : true;
    if (!enabled) return;

    const row = document.createElement("div");
    row.style.lineHeight = "1.4";
    row.style.wordBreak = "break-all";

    const senderSpan = document.createElement("span");
    senderSpan.innerText = `[${sender.toUpperCase()}] `;
    senderSpan.style.color = "#10b981"; // Emerald green for quick comms
    senderSpan.style.fontWeight = "bold";

    const msgSpan = document.createElement("span");
    msgSpan.innerText = friendlyText;
    msgSpan.style.color = "#a7f3d0"; // Soft mint for transmission content
    msgSpan.style.fontStyle = "italic";

    row.appendChild(senderSpan);
    row.appendChild(msgSpan);
    this.logEl.appendChild(row);

    // Keep log scroll to bottom
    this.logEl.scrollTop = this.logEl.scrollHeight;

    // Limit log rows to 50
    while (this.logEl.children.length > 50) {
      this.logEl.removeChild(this.logEl.firstChild!);
    }
    this.showChatTemporarily();
  }

  public addSystemMessage(message: string) {
    if (!this.logEl) return;
    const s = (window as any).vexeaSettings;
    const enabled = s ? (s.chatEnabled !== false) : true;
    if (!enabled) return;

    const row = document.createElement("div");
    row.style.lineHeight = "1.4";

    const senderSpan = document.createElement("span");
    senderSpan.innerText = "[SYSTEM] ";
    senderSpan.style.color = "#ef4444";
    senderSpan.style.fontWeight = "bold";

    const msgSpan = document.createElement("span");
    msgSpan.innerText = message;
    msgSpan.style.color = "#fca5a5";

    row.appendChild(senderSpan);
    row.appendChild(msgSpan);
    this.logEl.appendChild(row);

    this.logEl.scrollTop = this.logEl.scrollHeight;
    this.showChatTemporarily();
  }

  public dispose() {
    if (this.boundOnKeyDown) {
      window.removeEventListener("keydown", this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }

    if (this.chatBtn && this.boundOnToggleChat) {
      this.chatBtn.removeEventListener("click", this.boundOnToggleChat);
      this.chatBtn.removeEventListener("touchstart", this.boundOnToggleChat);
      this.boundOnToggleChat = null;
    }

    if (this.sendBtn && this.boundOnSendChat) {
      this.sendBtn.removeEventListener("click", this.boundOnSendChat);
      this.sendBtn.removeEventListener("touchstart", this.boundOnSendChat);
      this.boundOnSendChat = null;
    }

    if (this.boundOnSettingsChanged) {
      document.removeEventListener("VEXEA_SETTINGS_CHANGED", this.boundOnSettingsChanged);
      this.boundOnSettingsChanged = null;
    }

    if (this.logEl) {
      this.logEl.remove();
      this.logEl = null;
    }

    if (this.inputContainer) {
      this.inputContainer.remove();
      this.inputContainer = null;
    }
  }
}
