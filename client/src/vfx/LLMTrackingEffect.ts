import { DS } from "../../design-system";

/**
 * LLMTrackingEffect
 * Handles the "LLM has noticed something" HUD notification.
 * Strictly adheres to the 4-phase animation specification.
 * Centralised in the vfx folder.
 */
export class LLMTrackingEffect {
  private container: HTMLDivElement | null = null;
  private eyeOuter: HTMLImageElement | null = null;
  private eyePupil: HTMLImageElement | null = null;
  private refractionBubble: HTMLDivElement | null = null;
  
  private isActive: boolean = false;
  private scanTimer: any = null;
  private phaseTimer: any = null;
  
  // Mathematical bounds for scanning jumps (Architecture Section 11)
  private readonly SCAN_RADIUS = 12; // px offset from center
  private readonly HUD_MARGIN = 32; // px from top-left

  constructor() {
    this.initDOM();
  }

  private initDOM() {
    // Create the SVG Filter for Refraction (No color, pure distortion)
    const svgFilter = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgFilter.setAttribute("style", "position: absolute; width: 0; height: 0;");
    svgFilter.innerHTML = `
      <defs>
        <filter id="refraction-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" seed="1" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    `;
    document.body.appendChild(svgFilter);

    // Main Container
    this.container = document.createElement("div");
    this.container.id = "llm-tracking-hud";
    Object.assign(this.container.style, {
      position: "absolute",
      left: `${this.HUD_MARGIN}px`,
      top: `${this.HUD_MARGIN}px`,
      width: "120px",
      height: "120px",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: "1000",
    });

    // Refraction Bubble
    this.refractionBubble = document.createElement("div");
    Object.assign(this.refractionBubble.style, {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      backdropFilter: "url(#refraction-filter)",
      webkitBackdropFilter: "url(#refraction-filter)",
      opacity: "0",
      transform: "scale(0.5)",
      transition: "opacity 0.3s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    });

    // Outer Eye
    this.eyeOuter = document.createElement("img");
    this.eyeOuter.src = "/ui_svgs/eye_outer.svg";
    Object.assign(this.eyeOuter.style, {
      position: "absolute",
      width: "80px",
      height: "auto",
      opacity: "0",
      transition: "opacity 0.3s ease",
    });

    // Pupil/Focus Glyph (Four-pointed star)
    this.eyePupil = document.createElement("img");
    this.eyePupil.src = "/ui_svgs/eye_pupil.svg";
    Object.assign(this.eyePupil.style, {
      position: "absolute",
      width: "30px",
      height: "auto",
      opacity: "0",
      transform: "scale(0.2)",
    });

    this.container.appendChild(this.refractionBubble);
    this.container.appendChild(this.eyeOuter);
    this.container.appendChild(this.eyePupil);
    document.body.appendChild(this.container);
  }

  public trigger() {
    if (this.isActive) return;
    this.isActive = true;

    if (this.container) this.container.style.display = "flex";

    // PHASE 1: Activation
    this.activate();

    // PHASE 2: Focus Expansion (After 400ms)
    this.phaseTimer = setTimeout(() => {
      this.focusExpansion();
      
      // PHASE 3: Aggressive Scanning (After expansion snap)
      this.phaseTimer = setTimeout(() => {
        this.startScanning();
        
        // PHASE 4: Dissipation (Total sequence 3s, scanning 1.5s)
        this.phaseTimer = setTimeout(() => {
          this.dissipate();
        }, 1500);

      }, 200);
    }, 400);
  }

  private activate() {
    if (!this.refractionBubble || !this.eyeOuter || !this.eyePupil) return;
    
    this.refractionBubble.style.opacity = "1";
    this.refractionBubble.style.transform = "scale(1)";
    this.eyeOuter.style.opacity = "1";
    this.eyePupil.style.opacity = "1";
  }

  private focusExpansion() {
    if (!this.eyePupil) return;
    this.eyePupil.style.transition = "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)";
    this.eyePupil.style.transform = "scale(1)";
  }

  private startScanning() {
    if (!this.eyePupil) return;

    this.eyePupil.style.transition = "none";

    this.scanTimer = setInterval(() => {
      const jumpX = (Math.random() - 0.5) * 2 * this.SCAN_RADIUS;
      const jumpY = (Math.random() - 0.5) * 2 * this.SCAN_RADIUS;
      
      this.eyePupil!.style.left = `calc(50% + ${jumpX}px)`;
      this.eyePupil!.style.top = `calc(50% + ${jumpY}px)`;
    }, 120);
  }

  private dissipate() {
    if (!this.container || !this.refractionBubble || !this.eyeOuter || !this.eyePupil) return;

    clearInterval(this.scanTimer);
    
    this.eyePupil.style.left = "50%";
    this.eyePupil.style.top = "50%";
    
    this.eyePupil.style.transition = "opacity 0.4s ease";
    this.eyeOuter.style.transition = "opacity 0.4s ease";
    this.refractionBubble.style.transition = "opacity 0.5s ease, transform 0.5s ease";

    this.eyePupil.style.opacity = "0";
    this.eyeOuter.style.opacity = "0";
    this.refractionBubble.style.opacity = "0";
    this.refractionBubble.style.transform = "scale(0.8)";

    setTimeout(() => {
      this.container!.style.display = "none";
      this.isActive = false;
      this.eyePupil!.style.transform = "scale(0.2)";
    }, 500);
  }
}

export const llmTrackingVisualSystem = new LLMTrackingEffect();
