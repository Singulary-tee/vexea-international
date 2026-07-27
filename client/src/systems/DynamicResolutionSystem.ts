import { getSettings, applySettings } from '../../settings';

/**
 * Dynamic Resolution System Tunable Parameters.
 * Note: These bounds and step constants are tunable performance parameters.
 */
export const DYNAMIC_RES_MIN = 0.6;
export const DYNAMIC_RES_MAX = 1.5;
export const DYNAMIC_RES_STEP = 0.1;

export const HIGH_FRAME_TIME_THRESHOLD_MS = 20.0;
export const CONSECUTIVE_OVER_BUDGET_TRIGGER = 3;

export const LOW_FRAME_TIME_THRESHOLD_MS = 14.0;
export const CONSECUTIVE_UNDER_BUDGET_RECOVERY = 60;

export class DynamicResolutionSystem {
  private currentPixelRatio: number = DYNAMIC_RES_MAX;
  private overBudgetFrames: number = 0;
  private underBudgetFrames: number = 0;
  private lastFrameTime: number = 0;
  private wasEnabled: boolean = false;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.overBudgetFrames = 0;
    this.underBudgetFrames = 0;
    this.lastFrameTime = 0;
    const s = getSettings();
    if (s.dynamicResolutionEnabled) {
      const cap = Math.min(window.devicePixelRatio || 1.0, DYNAMIC_RES_MAX);
      this.currentPixelRatio = Math.max(DYNAMIC_RES_MIN, cap);
      this.wasEnabled = true;
    } else {
      this.wasEnabled = false;
    }
  }

  public update(nowMs: number, frameDurationMs?: number): void {
    const s = getSettings();

    // When toggled off mid-session: immediately hand control back to manual pixelRatioMode
    if (!s.dynamicResolutionEnabled) {
      if (this.wasEnabled) {
        this.wasEnabled = false;
        this.overBudgetFrames = 0;
        this.underBudgetFrames = 0;
        applySettings(s);
      }
      return;
    }

    // When newly enabled or activated
    if (!this.wasEnabled) {
      this.wasEnabled = true;
      const W = window as any;
      if (W.renderer && typeof W.renderer.getPixelRatio === 'function') {
        const r = W.renderer.getPixelRatio();
        this.currentPixelRatio = Math.min(DYNAMIC_RES_MAX, Math.max(DYNAMIC_RES_MIN, r));
      } else {
        const cap = Math.min(window.devicePixelRatio || 1.0, DYNAMIC_RES_MAX);
        this.currentPixelRatio = Math.max(DYNAMIC_RES_MIN, cap);
      }
      this.overBudgetFrames = 0;
      this.underBudgetFrames = 0;
    }

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = nowMs;
      return;
    }

    const dtMs = frameDurationMs !== undefined ? frameDurationMs : (nowMs - this.lastFrameTime);
    this.lastFrameTime = nowMs;

    // Filter out huge anomaly spikes from tab switching or initial load
    if (dtMs <= 0 || dtMs > 200) {
      this.overBudgetFrames = 0;
      this.underBudgetFrames = 0;
      return;
    }

    // Trigger condition: frame time > 20ms for 3 consecutive frames
    if (dtMs > HIGH_FRAME_TIME_THRESHOLD_MS) {
      this.overBudgetFrames++;
      this.underBudgetFrames = 0;

      if (this.overBudgetFrames >= CONSECUTIVE_OVER_BUDGET_TRIGGER) {
        this.overBudgetFrames = 0;
        const newRatio = Math.max(
          DYNAMIC_RES_MIN,
          Number((this.currentPixelRatio - DYNAMIC_RES_STEP).toFixed(2))
        );
        if (newRatio !== this.currentPixelRatio) {
          this.currentPixelRatio = newRatio;
          this.applyPixelRatio(newRatio);
        }
      }
    }
    // Recovery condition: frame time < 14ms for 60 consecutive frames
    else if (dtMs < LOW_FRAME_TIME_THRESHOLD_MS) {
      this.underBudgetFrames++;
      this.overBudgetFrames = 0;

      if (this.underBudgetFrames >= CONSECUTIVE_UNDER_BUDGET_RECOVERY) {
        this.underBudgetFrames = 0;
        const maxLimit = Math.min(window.devicePixelRatio || 1.0, DYNAMIC_RES_MAX);
        const newRatio = Math.min(
          maxLimit,
          Number((this.currentPixelRatio + DYNAMIC_RES_STEP).toFixed(2))
        );
        if (newRatio !== this.currentPixelRatio) {
          this.currentPixelRatio = newRatio;
          this.applyPixelRatio(newRatio);
        }
      }
    }
    // Steady state in target budget range (14ms - 20ms)
    else {
      this.overBudgetFrames = 0;
      this.underBudgetFrames = 0;
    }
  }

  private applyPixelRatio(ratio: number): void {
    const W = window as any;
    if (W.renderer && typeof W.renderer.setPixelRatio === 'function') {
      W.renderer.setPixelRatio(ratio);

      if (
        W.fxaaPass &&
        W.fxaaPass.material &&
        W.fxaaPass.material.uniforms &&
        W.fxaaPass.material.uniforms.resolution
      ) {
        W.fxaaPass.material.uniforms.resolution.value.set(
          1 / (window.innerWidth * ratio),
          1 / (window.innerHeight * ratio)
        );
      }
    }
  }

  public getCurrentPixelRatio(): number {
    return this.currentPixelRatio;
  }
}

export const dynamicResolutionSystem = new DynamicResolutionSystem();
