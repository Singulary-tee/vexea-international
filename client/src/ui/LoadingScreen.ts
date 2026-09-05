import { DS } from "../../design-system";

export class LoadingScreen {
  private overlay: HTMLDivElement;
  private phaseLabel: HTMLDivElement;
  private progressBarFill: HTMLDivElement;
  private percentageText: HTMLDivElement;
  private tipText: HTMLDivElement;
  private tipInterval: any;
  private tips = [
    "RECON DRONES MAINTAIN CONFIRMED PRESENCE. DESTROY THEM FIRST.",
    "THE LLM COMMANDER ADAPTS EVERY 8 SECONDS. DISRUPT ITS AWARENESS.",
    "SIGNAL DISRUPTOR REMOVES YOU FROM ALL DRONE REPORTING FOR ITS DURATION.",
    "EMP DISABLES CAMERAS IN RADIUS. BLIND THE COMMANDER BEFORE PUSHING.",
    "COORDINATING REVIVES KEEPS YOUR TEAM'S PRESSURE ON THE OBJECTIVE."
  ];

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "fullscreen-overlay loading-overlay ui-surface";
    this.overlay.setAttribute("data-ui-surface", "true");
    this.overlay.style.position = "fixed";
    this.overlay.style.inset = "0";
    this.overlay.style.width = "100%";
    this.overlay.style.height = "100%";
    this.overlay.style.minHeight = "-webkit-fill-available";
    this.overlay.style.backgroundColor = DS.colors.background;
    this.overlay.style.zIndex = "9999";
    this.overlay.style.display = "flex";
    this.overlay.style.flexDirection = "column";
    this.overlay.style.justifyContent = "center";
    this.overlay.style.alignItems = "center";
    this.overlay.style.fontFamily = DS.typography.fontFamily;
    this.overlay.style.pointerEvents = "auto";

    const blockEvents = ["pointerdown", "pointerup", "pointermove", "mousedown", "mouseup", "mousemove", "click", "touchstart", "touchend", "touchmove"];
    blockEvents.forEach(evt => {
      this.overlay.addEventListener(evt, (e) => {
        e.stopPropagation();
        e.preventDefault();
      }, { capture: true });
    });

    // Wordmark
    const wordmark = document.createElement("div");
    wordmark.textContent = "VEXEΛ";
    wordmark.style.fontFamily = DS.typography.fontFamilyWordmark;
    wordmark.style.color = DS.colors.text;
    wordmark.style.fontSize = "clamp(1.75rem, 6vw, 48px)";
    wordmark.style.fontWeight = "800";
    wordmark.style.letterSpacing = "0.2em";
    wordmark.style.marginBottom = "0.63rem";
    this.overlay.appendChild(wordmark);

    // Phase Label
    this.phaseLabel = document.createElement("div");
    this.phaseLabel.style.color = DS.colors.accent;
    this.phaseLabel.style.fontSize = "clamp(0.75rem, 2.5vw, 1.13rem)";
    this.phaseLabel.style.textTransform = "uppercase";
    this.phaseLabel.style.marginBottom = "0.31rem";
    this.phaseLabel.innerText = "INITIALIZING";
    this.overlay.appendChild(this.phaseLabel);

    // Progress Bar Container
    const progressContainer = document.createElement("div");
    progressContainer.className = "vexea-loading-track";
    progressContainer.style.width = "clamp(15.00rem, 60vw, 37.50rem)";
    progressContainer.style.height = "5px";
    progressContainer.style.backgroundColor = "#202827";
    progressContainer.style.marginBottom = "0.63rem";
    progressContainer.style.borderRadius = "0px";
    progressContainer.style.position = "relative";
    progressContainer.style.overflow = "visible";

    // Progress Bar Fill
    this.progressBarFill = document.createElement("div");
    this.progressBarFill.className = "vexea-loading-fill";
    this.progressBarFill.style.width = "0%";
    this.progressBarFill.style.height = "100%";
    this.progressBarFill.style.background = "linear-gradient(90deg, #C9D0C8 0%, #F4F5F1 75%, #C77C3B 100%)";
    this.progressBarFill.style.borderRadius = "0px";
    this.progressBarFill.style.position = "relative";

    // Leading Head (1px x 13px)
    const head = document.createElement("div");
    head.className = "vexea-loading-head";
    this.progressBarFill.appendChild(head);

    // Sheen
    const sheen = document.createElement("div");
    sheen.className = "vexea-loading-sheen";
    this.progressBarFill.appendChild(sheen);

    progressContainer.appendChild(this.progressBarFill);
    this.overlay.appendChild(progressContainer);

    // Percentage Text
    this.percentageText = document.createElement("div");
    this.percentageText.style.color = DS.colors.text;
    this.percentageText.style.fontSize = "clamp(0.69rem, 1.8vw, 0.88rem)";
    this.percentageText.innerText = "0%";
    this.overlay.appendChild(this.percentageText);

    // Tip Text
    this.tipText = document.createElement("div");
    this.tipText.style.position = "absolute";
    this.tipText.style.bottom = "1.25rem";
    this.tipText.style.color = DS.colors.textMuted;
    this.tipText.style.fontSize = "clamp(0.63rem, 1.5vw, 0.81rem)";
    this.tipText.style.textAlign = "center";
    this.tipText.style.width = "100%";
    this.tipText.innerText = this.tips[0];
    this.overlay.appendChild(this.tipText);

    document.body.appendChild(this.overlay);

    let tipIndex = 0;
    this.tipInterval = setInterval(() => {
      tipIndex = (tipIndex + 1) % this.tips.length;
      this.tipText.innerText = this.tips[tipIndex];
    }, 4000);
  }

  show(): void {
    this.overlay.style.display = "flex";
  }

  hide(): void {
    this.overlay.style.display = "none";
  }

  setPhase(label: string): void {
    this.phaseLabel.innerText = label;
  }

  private sheenTriggered = false;

  setProgress(loaded: number, total: number): void {
    const p = Math.max(0, Math.min(100, (loaded / total) * 100));
    this.progressBarFill.style.width = `${p}%`;
    this.percentageText.innerText = `${Math.floor(p)}%`;

    if (p > 20 && !this.sheenTriggered) {
      this.sheenTriggered = true;
      const sheen = this.progressBarFill.querySelector(".vexea-loading-sheen") as HTMLElement | null;
      if (sheen) {
        sheen.classList.add("vexea-sheen-active");
        setTimeout(() => {
          sheen.classList.remove("vexea-sheen-active");
        }, 650);
      }
    }
  }

  destroy(): void {
    clearInterval(this.tipInterval);
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
