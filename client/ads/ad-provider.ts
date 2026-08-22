import { DS } from "../design-system";
import { audioManager } from "../audio";
import { clientFlagService } from "../flags/flag-service";
import { SharedFeatureFlagKey } from "../../shared/feature-flags";
import { getAuth } from "firebase/auth";

export interface AdRewardResult {
  success: boolean;
  newEnergy?: number;
  adClaimsToday?: number;
  error?: string;
}

export class MockAdProvider {
  private static isPlaying = false;

  public static getDailyCap(): number {
    return clientFlagService.getNumber(SharedFeatureFlagKey.AD_DAILY_CAP, 5);
  }

  public static getRewardEnergy(): number {
    return clientFlagService.getNumber(SharedFeatureFlagKey.AD_REWARD_ENERGY, 3);
  }

  public static getRemainingAds(userData?: any): number {
    const dailyCap = this.getDailyCap();
    if (!userData) {
      const localClaims = parseInt(localStorage.getItem('vex_ad_claims_today') || '0', 10);
      const lastDate = parseInt(localStorage.getItem('vex_last_ad_claim_date') || '0', 10);
      if (!this.isToday(lastDate)) return dailyCap;
      return Math.max(0, dailyCap - localClaims);
    }

    const lastDate = userData.lastAdClaimDate || 0;
    if (!this.isToday(lastDate)) return dailyCap;
    const claims = userData.adClaimsToday ?? 0;
    return Math.max(0, dailyCap - claims);
  }

  public static canWatchAd(userData?: any): boolean {
    return this.getRemainingAds(userData) > 0 && !this.isPlaying;
  }

  private static isToday(timestamp: number): boolean {
    if (!timestamp) return false;
    const lastDate = new Date(timestamp);
    const nowDate = new Date();
    return (
      lastDate.getUTCFullYear() === nowDate.getUTCFullYear() &&
      lastDate.getUTCMonth() === nowDate.getUTCMonth() &&
      lastDate.getUTCDate() === nowDate.getUTCDate()
    );
  }

  public static async watchAd(
    userData: any,
    onRewardSuccess?: (newEnergy: number, claimsToday: number) => void
  ): Promise<AdRewardResult> {
    if (this.isPlaying) {
      return { success: false, error: "Transmission playback already active." };
    }

    const remaining = this.getRemainingAds(userData);
    if (remaining <= 0) {
      return { success: false, error: "Daily transmission reward limit reached." };
    }

    this.isPlaying = true;

    return new Promise<AdRewardResult>((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'vex-ad-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at center, rgba(3, 3, 5, 0.98) 0%, rgba(3, 3, 5, 0.94) 60%, rgba(0, 0, 0, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DS.typography.fontFamily,
        color: DS.colors.text,
        boxSizing: 'border-box',
        padding: 'clamp(0.50rem, 2vh, 1.50rem)'
      });

      const modal = document.createElement('div');
      modal.className = 'mm-glass';
      Object.assign(modal.style, {
        width: 'min(92vw, 36.00rem)',
        background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(8, 8, 10, 0.99) 100%)',
        border: `1px solid ${DS.colors.accent}`,
        padding: 'clamp(1.00rem, 3vh, 1.75rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.75rem, 2vh, 1.25rem)',
        borderRadius: '0px',
        boxSizing: 'border-box',
        position: 'relative'
      });

      const rewardEnergyAmount = this.getRewardEnergy();

      modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.50rem;">
          <div style="font-size:clamp(0.63rem, 1.5vw, 0.81rem); color:${DS.colors.accent}; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">
            SPONSORED TRANSMISSION // RESUPPLY
          </div>
          <div id="ad-timer-badge" style="font-size:clamp(0.56rem, 1.2vw, 0.75rem); color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:1px; border:1px solid rgba(255,255,255,0.2); padding:2px 0.50rem;">
            TIME REMAINING: 3s
          </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:clamp(1.00rem, 3vh, 2.00rem) 0; gap:0.75rem;">
          <div style="width:clamp(3.50rem, 8vh, 4.50rem); height:clamp(3.50rem, 8vh, 4.50rem); border:1px solid ${DS.colors.accent}; display:flex; align-items:center; justify-content:center; background:rgba(255, 68, 0, 0.08);">
            <img src="/ui_svgs/energy.svg" style="width:60%; height:60%; filter:brightness(0) invert(1);" alt="Energy" />
          </div>
          <div style="font-size:clamp(1.00rem, 2.5vw, 1.38rem); font-weight:900; letter-spacing:1.5px; color:#FFFFFF; text-align:center;">
            ENERGY RECHARGE PROTOCOL
          </div>
          <div id="ad-status-text" style="font-size:clamp(0.63rem, 1.3vw, 0.75rem); color:${DS.colors.textMuted}; letter-spacing:1px; text-align:center; max-width:85%;">
            RECEIVING ENCRYPTED SPONSOR PACKET...
          </div>
        </div>

        <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); position:relative; overflow:hidden;">
          <div id="ad-progress-fill" style="width:0%; height:100%; background:${DS.colors.accent}; transition:width 0.1s linear;"></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:clamp(0.50rem, 1vw, 0.63rem); color:${DS.colors.textMuted}; letter-spacing:0.5px;">
          <span>REWARD ON COMPLETION: +${rewardEnergyAmount} ENERGY</span>
          <span>SPONSORED STREAM ACTIVE</span>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      audioManager.play('click');

      const progressFill = modal.querySelector('#ad-progress-fill') as HTMLElement;
      const timerBadge = modal.querySelector('#ad-timer-badge') as HTMLElement;
      const statusText = modal.querySelector('#ad-status-text') as HTMLElement;

      let remainingSec = 3;
      const totalSec = 3;
      const startTime = performance.now();

      const updateLoop = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(1, elapsed / totalSec);
        if (progressFill) progressFill.style.width = `${progress * 100}%`;

        const curRemaining = Math.max(0, Math.ceil(totalSec - elapsed));
        if (timerBadge && curRemaining !== remainingSec) {
          remainingSec = curRemaining;
          timerBadge.textContent = `TIME REMAINING: ${remainingSec}s`;
        }

        if (elapsed < totalSec) {
          requestAnimationFrame(updateLoop);
        } else {
          finishAd();
        }
      };

      requestAnimationFrame(updateLoop);

      const finishAd = async () => {
        if (statusText) statusText.textContent = "TRANSMISSION COMPLETE. DISPATCHING REWARD...";
        if (timerBadge) {
          timerBadge.textContent = "VERIFIED";
          timerBadge.style.borderColor = "#00FF66";
          timerBadge.style.color = "#00FF66";
        }

        const auth = getAuth();
        const playerId = auth.currentUser?.uid || localStorage.getItem('guestId') || (window as any).vexPlayerUid || 'GUEST_USER';
        const currentEnergy = userData?.energy !== undefined ? userData.energy : 10;
        const adClaimsToday = userData?.adClaimsToday ?? parseInt(localStorage.getItem('vex_ad_claims_today') || '0', 10);
        const lastAdClaimDate = userData?.lastAdClaimDate ?? parseInt(localStorage.getItem('vex_last_ad_claim_date') || '0', 10);

        try {
          const response = await fetch('/api/economy/ad-reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              currentEnergy,
              adClaimsToday,
              lastAdClaimDate
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            const newEnergy = data.newEnergy;
            const newClaimsToday = data.adClaimsToday;

            if (userData) {
              userData.energy = newEnergy;
              userData.adClaimsToday = newClaimsToday;
              userData.lastAdClaimDate = Date.now();
            }

            localStorage.setItem('vex_ad_claims_today', String(newClaimsToday));
            localStorage.setItem('vex_last_ad_claim_date', String(Date.now()));

            audioManager.play('credits_spend');

            if (onRewardSuccess) {
              onRewardSuccess(newEnergy, newClaimsToday);
            }

            setTimeout(() => {
              overlay.remove();
              MockAdProvider.isPlaying = false;
              resolve({ success: true, newEnergy, adClaimsToday: newClaimsToday });
            }, 600);
          } else {
            audioManager.play('error');
            const errMsg = data.error?.message || "Reward verification failed.";
            if (statusText) {
              statusText.textContent = `ERROR: ${errMsg.toUpperCase()}`;
              statusText.style.color = DS.colors.danger;
            }
            setTimeout(() => {
              overlay.remove();
              MockAdProvider.isPlaying = false;
              resolve({ success: false, error: errMsg });
            }, 1500);
          }
        } catch (err: any) {
          audioManager.play('error');
          console.error("[MockAdProvider] Ad reward request failed:", err);
          if (statusText) {
            statusText.textContent = "COMMUNICATION ERROR // BACKEND UNREACHABLE";
            statusText.style.color = DS.colors.danger;
          }
          setTimeout(() => {
            overlay.remove();
            MockAdProvider.isPlaying = false;
            resolve({ success: false, error: "Network error during reward verification." });
          }, 1500);
        }
      };
    });
  }
}
