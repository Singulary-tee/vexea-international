import { DS } from "../design-system";
import { audioManager } from "../audio";
import { MockAdProvider } from "../ads/ad-provider";
import { clientFlagService } from "../flags/flag-service";
import { SharedFeatureFlagKey } from "../../shared/feature-flags";

let activeModalOverlay: HTMLElement | null = null;
let regenIntervalTimer: any = null;

export function getRegenIntervalMinutes(): number {
  return clientFlagService.getNumber(SharedFeatureFlagKey.ENERGY_REGEN_MINUTES, 10);
}

export function getMaxFreeEnergy(): number {
  return clientFlagService.getNumber(SharedFeatureFlagKey.ENERGY_MAX_FREE, 10);
}

export function getMatchEnergyCost(): number {
  return clientFlagService.getNumber(SharedFeatureFlagKey.MATCH_ENERGY_COST, 2);
}

export function getEnergyRegenCountdown(): { minutes: number; seconds: number; formatted: string; totalSecondsRemaining: number } {
  const regenMinutes = getRegenIntervalMinutes();
  const regenDurationMs = regenMinutes * 60 * 1000;
  
  let baseTimestamp = parseInt(localStorage.getItem('vex_last_energy_tick') || '0', 10);
  const now = Date.now();

  if (!baseTimestamp || baseTimestamp > now || (now - baseTimestamp) > 7 * 24 * 60 * 60 * 1000) {
    baseTimestamp = now;
    localStorage.setItem('vex_last_energy_tick', String(baseTimestamp));
  }

  const elapsedMs = (now - baseTimestamp) % regenDurationMs;
  const remainingMs = regenDurationMs - elapsedMs;
  const totalSecondsRemaining = Math.max(0, Math.floor(remainingMs / 1000));
  
  const minutes = Math.floor(totalSecondsRemaining / 60);
  const seconds = totalSecondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { minutes, seconds, formatted, totalSecondsRemaining };
}

export function openInsufficientEnergyModal(
  userData: any,
  options?: {
    onEnergyRefilled?: (newEnergy: number) => void;
    onNavigateStore?: () => void;
  }
): void {
  closeInsufficientEnergyModal();

  audioManager.play('click');

  const overlay = document.createElement('div');
  overlay.id = 'vex-insufficient-energy-modal';
  activeModalOverlay = overlay;

  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(circle at center, rgba(3, 3, 5, 0.96) 0%, rgba(2, 2, 4, 0.98) 70%, rgba(0, 0, 0, 0.99) 100%)',
    backdropFilter: 'blur(12px)',
    zIndex: '9500',
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
    width: 'min(92vw, 38.00rem)',
    background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(8, 8, 10, 0.99) 100%)',
    border: `1px solid ${DS.colors.accent}`,
    padding: 'clamp(1.00rem, 2.5vh, 1.75rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(0.75rem, 2vh, 1.25rem)',
    borderRadius: '0px',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: '0 0 40px rgba(0,0,0,0.85)'
  });

  const currentEnergy = userData?.energy !== undefined ? userData.energy : 0;
  const matchCost = getMatchEnergyCost();
  const maxFree = getMaxFreeEnergy();
  const rewardEnergy = MockAdProvider.getRewardEnergy();
  const remainingAds = MockAdProvider.getRemainingAds(userData);
  const dailyCap = MockAdProvider.getDailyCap();

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.50rem;">
      <div style="display:flex; align-items:center; gap:0.50rem;">
        <img src="/ui_svgs/energy.svg" style="width:1.25rem; height:1.25rem; filter:brightness(0) invert(1);" alt="Energy" />
        <span style="font-size:clamp(0.75rem, 1.8vw, 1.00rem); color:${DS.colors.accent}; font-weight:900; letter-spacing:2px; text-transform:uppercase;">
          INSUFFICIENT ENERGY RESERVES
        </span>
      </div>
      <button id="close-energy-modal-btn" style="background:none; border:none; color:${DS.colors.textMuted}; font-size:1.25rem; cursor:pointer; padding:0 0.38rem; line-height:1; transition:color 0.2s;">✕</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:0.50rem; padding:0.25rem 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:0.75rem 1.00rem;">
        <div>
          <div style="font-size:clamp(0.56rem, 1.1vw, 0.69rem); color:${DS.colors.textMuted}; letter-spacing:1px; text-transform:uppercase;">CURRENT BALANCE</div>
          <div style="font-size:clamp(1.13rem, 2.8vw, 1.63rem); font-weight:900; color:#FFFFFF; letter-spacing:1px;">
            ${currentEnergy} <span style="font-size:clamp(0.69rem, 1.5vw, 0.88rem); color:${DS.colors.textMuted}; font-weight:normal;">/ ${maxFree} EN</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:clamp(0.56rem, 1.1vw, 0.69rem); color:${DS.colors.textMuted}; letter-spacing:1px; text-transform:uppercase;">DEPLOYMENT COST</div>
          <div style="font-size:clamp(1.13rem, 2.8vw, 1.63rem); font-weight:900; color:${DS.colors.accent}; letter-spacing:1px;">
            ${matchCost} EN
          </div>
        </div>
      </div>

      <div style="font-size:clamp(0.56rem, 1.1vw, 0.69rem); color:rgba(255,255,255,0.7); line-height:1.4; letter-spacing:0.5px;">
        Deployment requires active power cells. Choose a replenishment method below to recharge your operative suite.
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:0.63rem;">
      <!-- CTA 1: WATCH AD -->
      <button id="cta-watch-ad-btn" style="
        display:flex; justify-content:space-between; align-items:center;
        width:100%; padding:0.75rem 1.00rem;
        background:${remainingAds > 0 ? DS.colors.accent : 'rgba(255,255,255,0.05)'};
        border:none;
        color:${remainingAds > 0 ? '#000000' : 'rgba(255,255,255,0.3)'};
        font-family:${DS.typography.fontFamily};
        font-size:clamp(0.69rem, 1.4vw, 0.88rem);
        font-weight:900;
        letter-spacing:1.5px;
        text-transform:uppercase;
        cursor:${remainingAds > 0 ? 'pointer' : 'not-allowed'};
        border-radius:0px;
        transition:all 0.15s ease;
      ">
        <div style="display:flex; align-items:center; gap:0.50rem;">
          <img src="/ui_svgs/messages.svg" style="width:1.00rem; height:1.00rem; filter:${remainingAds > 0 ? 'brightness(0)' : 'brightness(0) invert(1) opacity(0.3)'};" alt="Stream" />
          <span>WATCH TRANSMISSION (+${rewardEnergy} ENERGY)</span>
        </div>
        <span style="font-size:clamp(0.56rem, 1.1vw, 0.69rem); opacity:0.85;">
          ${remainingAds > 0 ? `${remainingAds}/${dailyCap} REMAINING` : 'CAP REACHED'}
        </span>
      </button>

      <!-- CTA 2: BUY ENERGY -->
      <button id="cta-buy-energy-btn" style="
        display:flex; justify-content:space-between; align-items:center;
        width:100%; padding:0.75rem 1.00rem;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255, 68, 0, 0.4);
        color:#FFFFFF;
        font-family:${DS.typography.fontFamily};
        font-size:clamp(0.69rem, 1.4vw, 0.88rem);
        font-weight:900;
        letter-spacing:1.5px;
        text-transform:uppercase;
        cursor:pointer;
        border-radius:0px;
        transition:all 0.15s ease;
      ">
        <div style="display:flex; align-items:center; gap:0.50rem;">
          <img src="/ui_svgs/coin.svg" style="width:1.00rem; height:1.00rem; filter:brightness(0) invert(1);" alt="Store" />
          <span>COMMANDER RESUPPLY // STORE</span>
        </div>
        <span style="font-size:clamp(0.56rem, 1.1vw, 0.69rem); color:${DS.colors.accent};">
          VIEW PACKS →
        </span>
      </button>

      <!-- CTA 3: WAIT / REGEN TIMER -->
      <div id="cta-wait-panel" style="
        display:flex; justify-content:space-between; align-items:center;
        width:100%; padding:0.75rem 1.00rem;
        background:rgba(0,0,0,0.4);
        border:1px solid rgba(255,255,255,0.08);
        box-sizing:border-box;
      ">
        <div style="display:flex; align-items:center; gap:0.50rem;">
          <img src="/ui_svgs/energy.svg" style="width:0.88rem; height:0.88rem; filter:brightness(0) invert(1) opacity(0.6);" alt="Timer" />
          <span style="font-size:clamp(0.63rem, 1.2vw, 0.75rem); color:${DS.colors.textMuted}; letter-spacing:1px; text-transform:uppercase;">
            AUTOMATIC REGEN PROTOCOL
          </span>
        </div>
        <div id="energy-modal-regen-timer" style="font-size:clamp(0.69rem, 1.3vw, 0.81rem); font-weight:bold; color:${DS.colors.accent}; letter-spacing:1px;">
          +1 IN ${getEnergyRegenCountdown().formatted}
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Set up live countdown ticker
  if (regenIntervalTimer) {
    clearInterval(regenIntervalTimer);
  }
  regenIntervalTimer = setInterval(() => {
    const timerEl = document.getElementById('energy-modal-regen-timer');
    if (timerEl) {
      const countdown = getEnergyRegenCountdown();
      timerEl.textContent = `+1 IN ${countdown.formatted}`;
    }
  }, 1000);

  // Wire buttons
  const closeBtn = modal.querySelector('#close-energy-modal-btn') as HTMLElement;
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeInsufficientEnergyModal();
    };
  }

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeInsufficientEnergyModal();
    }
  };

  const watchAdBtn = modal.querySelector('#cta-watch-ad-btn') as HTMLButtonElement;
  if (watchAdBtn && remainingAds > 0) {
    watchAdBtn.onclick = async () => {
      closeInsufficientEnergyModal();
      const res = await MockAdProvider.watchAd(userData, (newEnergy) => {
        if (options?.onEnergyRefilled) {
          options.onEnergyRefilled(newEnergy);
        }
      });
      if (!res.success && res.error) {
        alert(res.error);
      }
    };
  }

  const buyEnergyBtn = modal.querySelector('#cta-buy-energy-btn') as HTMLButtonElement;
  if (buyEnergyBtn) {
    buyEnergyBtn.onclick = () => {
      closeInsufficientEnergyModal();
      if (options?.onNavigateStore) {
        options.onNavigateStore();
      } else {
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'STORE' } }));
      }
    };
  }
}

export function closeInsufficientEnergyModal(): void {
  if (regenIntervalTimer) {
    clearInterval(regenIntervalTimer);
    regenIntervalTimer = null;
  }
  if (activeModalOverlay) {
    activeModalOverlay.remove();
    activeModalOverlay = null;
  }
}
