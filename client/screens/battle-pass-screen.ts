/**
 * VEXEA Battle Pass UI System
 * Full 51-tier season progression contract (Tiers 0..50).
 * Free Track & Premium Track, milestone highlights, mobile vertical spine & desktop horizontal track.
 * Strictly 0px radius, mathematical layout, high-contrast industrial theme.
 */

import { DS } from "../design-system";
import { audioManager } from "../audio";
import { BP_SEASON_01, BattlePassTier } from "../../shared/battle-pass";
import * as screenManager from "./screen-manager";
import { getAssetUrl } from "../asset-cache";
import { getFirestore, doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { mountBattlePassMotion, bindContentEntry, BattlePassMotionHandle } from "../src/ui/ui-motion";

let el: HTMLElement | null = null;
let tiersContainer: HTMLElement | null = null;
let bpMotionHandle: BattlePassMotionHandle | null = null;

export function initBattlePass() {
  if (el) return;

  el = document.createElement('div');
  el.id = 'battle-pass-screen';
  el.setAttribute('data-ui-surface', 'true');
  el.setAttribute('data-bp-state', 'settled');
  el.classList.add('ui-surface');
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '950',
    background: 'transparent',
    display: 'none',
    flexDirection: 'column',
    fontFamily: DS.typography.fontFamily,
    color: DS.colors.text,
    overflow: 'hidden'
  });

  // Background Gradient Layer (Smoke-like)
  const bg = document.createElement('div');
  Object.assign(bg.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '-1',
    background: 'radial-gradient(circle at 50% 100%, rgba(10, 10, 10, 0.95) 0%, rgba(0, 0, 0, 1) 100%)',
    pointerEvents: 'none'
  });
  el.appendChild(bg);

  // Content Wrapper
  const content = document.createElement('div');
  bindContentEntry(content, 0);
  Object.assign(content.style, {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(0.75rem, 2vh, 1.5rem) clamp(0.75rem, 2.5vw, 2.5rem)',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });
  el.appendChild(content);

  // Header Section
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'clamp(0.5rem, 1.5vh, 1rem)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0.75rem',
    flexShrink: '0'
  });

  const headerLeft = document.createElement('div');
  const seasonTitle = document.createElement('div');
  seasonTitle.textContent = BP_SEASON_01.name;
  Object.assign(seasonTitle.style, {
    fontSize: 'clamp(1.1rem, 3vh, 1.75rem)',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#FFFFFF'
  });
  headerLeft.appendChild(seasonTitle);

  const seasonId = document.createElement('div');
  const nowMs = Date.now();
  const bpRemainingDays = Math.max(0, Math.ceil((BP_SEASON_01.endDate - nowMs) / (1000 * 60 * 60 * 24)));
  seasonId.textContent = `SEASON ID: ${BP_SEASON_01.id} // REMAINING: ${bpRemainingDays}D // 51 TIERS`;
  Object.assign(seasonId.style, {
    fontSize: DS.typography.sizes.tiny,
    letterSpacing: '1px',
    color: DS.colors.textMuted,
    marginTop: '2px'
  });
  headerLeft.appendChild(seasonId);
  header.appendChild(headerLeft);

  const headerRight = document.createElement('div');
  Object.assign(headerRight.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  });

  const xpDisplay = document.createElement('div');
  xpDisplay.id = 'bp-xp-display';
  Object.assign(xpDisplay.style, {
    fontSize: DS.typography.sizes.body,
    fontWeight: 'bold',
    color: DS.colors.accent,
    textAlign: 'right'
  });
  headerRight.appendChild(xpDisplay);

  const backBtn = document.createElement('button');
  backBtn.className = 'vexea-btn';
  backBtn.textContent = 'ESC // BACK TO MENU';
  Object.assign(backBtn.style, {
    fontSize: DS.typography.sizes.small,
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    background: '#27272a',
    borderColor: '#3f3f46',
    color: '#FFFFFF',
    padding: '0.38rem 0.88rem'
  });
  backBtn.onclick = () => {
    audioManager.play('click');
    screenManager.showMainMenu();
  };
  headerRight.appendChild(backBtn);

  header.appendChild(headerRight);
  content.appendChild(header);

  // Milestone Banner / Nearest Target Focal Bar
  const targetBar = document.createElement('div');
  targetBar.id = 'bp-target-bar';
  Object.assign(targetBar.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 69, 0, 0.05)',
    border: '1px solid rgba(255, 69, 0, 0.25)',
    padding: '6px 12px',
    marginBottom: '8px',
    flexShrink: '0'
  });
  targetBar.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="color:#C77C3B; font-weight:900; font-size:${DS.typography.sizes.small}; letter-spacing:1px;">NEXT MILESTONE</span>
      <span id="bp-next-target-text" style="color:#FFFFFF; font-size:${DS.typography.sizes.small}; font-weight:bold;">TIER 05 // 100 CREDITS</span>
    </div>
    <div id="bp-tier-50-callout" style="display:flex; align-items:center; gap:6px;">
      <span style="background:#C77C3B; color:#000; font-weight:900; font-size:${DS.typography.sizes.tiny}; padding:1px 6px; letter-spacing:0.5px;">TIER 50 HERO</span>
      <span style="color:#E1E5E3; font-size:${DS.typography.sizes.tiny}; font-weight:bold;">500 CREDITS + ELITE CITATION</span>
    </div>
  `;
  content.appendChild(targetBar);

  // Desktop Progression Line Carrier
  const trackLineWrapper = document.createElement('div');
  trackLineWrapper.className = 'vexea-bp-desktop-track';
  Object.assign(trackLineWrapper.style, {
    width: '100%',
    height: '3px',
    background: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    marginBottom: '8px',
    flexShrink: '0'
  });
  const reachedLine = document.createElement('div');
  reachedLine.className = 'vexea-bp-desktop-reached';
  Object.assign(reachedLine.style, {
    height: '100%',
    width: '0%',
    background: 'linear-gradient(90deg, #C9D0C8 0%, #F4F5F1 75%, #C77C3B 100%)',
    transition: 'width 300ms ease-out'
  });
  trackLineWrapper.appendChild(reachedLine);
  content.appendChild(trackLineWrapper);

  // Tiers Scroll Container
  tiersContainer = document.createElement('div');
  tiersContainer.id = 'bp-tiers-container';
  Object.assign(tiersContainer.style, {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '0.75rem',
    flex: '1',
    minHeight: '0',
    scrollbarWidth: 'thin'
  });
  
  content.appendChild(tiersContainer);
  document.body.appendChild(el);

  bpMotionHandle = mountBattlePassMotion(el);
}

export function renderBattlePassScreen() {
  initBattlePass();
  if (!tiersContainer || !el) return;

  tiersContainer.innerHTML = '';

  const userData = (window as any).registeredUserData || {};
  const currentXP = userData.battlePass || 0;
  const claimedTiers = userData.claimedBPTiers || [];
  const currentTier = Math.min(50, Math.floor(currentXP / 10));

  if (bpMotionHandle) {
    bpMotionHandle.setCurrentTier(currentTier);
  }

  const xpDisplay = document.getElementById('bp-xp-display');
  if (xpDisplay) {
    xpDisplay.innerHTML = `TIER <span style="font-size:1.1em; color:#FFFFFF;">${currentTier}</span>/50 &nbsp;•&nbsp; ${currentXP} XP`;
  }

  // Find nearest unclaimed reachable reward or upcoming milestone
  const nextMilestoneTier = BP_SEASON_01.tiers.find(t => t.index > currentTier && t.freeReward !== null) || BP_SEASON_01.tiers[50];
  const nextTargetText = document.getElementById('bp-next-target-text');
  if (nextTargetText && nextMilestoneTier) {
    const xpDiff = Math.max(0, nextMilestoneTier.xpRequired - currentXP);
    nextTargetText.textContent = `TIER ${String(nextMilestoneTier.index).padStart(2, '0')} // ${nextMilestoneTier.freeReward?.label || 'REWARD'} (${xpDiff} XP TO UNLOCK)`;
  }

  BP_SEASON_01.tiers.forEach((tier) => {
    const tierEl = createTierCard(tier, currentXP, claimedTiers.includes(tier.index), currentTier);
    tiersContainer?.appendChild(tierEl);
  });
}

function createTierCard(tier: BattlePassTier, currentXP: number, isClaimed: boolean, currentTier: number): HTMLElement {
  const isUnlocked = currentXP >= tier.xpRequired;
  const isCurrent = tier.index === currentTier;
  const isMilestone = tier.index % 5 === 0 && tier.index > 0;
  const isHeroTier = tier.index === 50;

  const card = document.createElement('div');
  card.className = `vexea-bp-tier-card ${isMilestone ? 'vexea-bp-milestone' : ''}`;
  Object.assign(card.style, {
    minWidth: isMilestone ? 'clamp(100px, 14vw, 140px)' : 'clamp(85px, 11vw, 115px)',
    height: '100%',
    background: isUnlocked ? (isMilestone ? 'rgba(255, 69, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)') : 'rgba(10, 10, 10, 0.65)',
    border: `1px solid ${isHeroTier ? '#FFD700' : (isUnlocked ? (isClaimed ? 'rgba(255, 255, 255, 0.2)' : DS.colors.accent) : 'rgba(255, 255, 255, 0.06)')}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'all 0.2s ease',
    flexShrink: '0',
    boxSizing: 'border-box',
    boxShadow: isCurrent ? '0 0 10px rgba(199, 124, 59, 0.25)' : 'none'
  });

  // Top Bar: Tier Index + Status
  const topBar = document.createElement('div');
  Object.assign(topBar.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 6px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: isHeroTier ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
  });

  const index = document.createElement('span');
  index.textContent = `T${String(tier.index).padStart(2, '0')}`;
  Object.assign(index.style, {
    fontSize: DS.typography.sizes.tiny,
    fontWeight: '900',
    color: isHeroTier ? '#FFD700' : (isUnlocked ? '#FFFFFF' : DS.colors.textMuted)
  });
  topBar.appendChild(index);

  const status = document.createElement('span');
  status.textContent = isClaimed ? 'CLAIMED' : (isUnlocked ? 'READY' : 'LOCKED');
  Object.assign(status.style, {
    fontSize: '9px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    color: isClaimed ? DS.colors.textMuted : (isUnlocked ? DS.colors.accent : 'rgba(255, 255, 255, 0.25)')
  });
  topBar.appendChild(status);
  card.appendChild(topBar);

  // Center Content (Free Reward)
  const freeRewardSection = document.createElement('div');
  Object.assign(freeRewardSection.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 6px',
    textAlign: 'center',
    gap: '2px',
    minHeight: '0'
  });

  if (tier.freeReward) {
    const icon = document.createElement('div');
    icon.textContent = tier.freeReward.type === 'CREDITS' ? 'CR' : 'ITEM';
    Object.assign(icon.style, {
      fontSize: isMilestone ? DS.typography.sizes.body : DS.typography.sizes.small,
      fontWeight: '900',
      color: isHeroTier ? '#FFD700' : (isUnlocked ? DS.colors.accent : 'rgba(255, 255, 255, 0.3)')
    });
    freeRewardSection.appendChild(icon);

    const label = document.createElement('div');
    label.textContent = tier.freeReward.label;
    Object.assign(label.style, {
      fontSize: DS.typography.sizes.tiny,
      fontWeight: 'bold',
      lineHeight: '1.1',
      color: isUnlocked ? '#FFFFFF' : DS.colors.textMuted
    });
    freeRewardSection.appendChild(label);
  } else {
    const empty = document.createElement('div');
    empty.textContent = '—';
    Object.assign(empty.style, {
      fontSize: DS.typography.sizes.body,
      color: 'rgba(255, 255, 255, 0.08)'
    });
    freeRewardSection.appendChild(empty);
  }
  card.appendChild(freeRewardSection);

  // Bottom Action Button / Track Type Label
  const bottomAction = document.createElement('button');
  bottomAction.className = 'vexea-btn';
  const canClaim = isUnlocked && !isClaimed && Boolean(tier.freeReward);
  bottomAction.textContent = canClaim ? 'CLAIM' : (isClaimed ? 'CLAIMED' : 'FREE TRACK');
  Object.assign(bottomAction.style, {
    width: '100%',
    padding: '3px 0',
    background: canClaim ? DS.colors.accent : 'rgba(255, 255, 255, 0.03)',
    color: canClaim ? '#000000' : DS.colors.textMuted,
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: '9px',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: '1px',
    cursor: canClaim ? 'pointer' : 'default',
    borderRadius: '0px'
  });

  if (canClaim) {
    bottomAction.onclick = (e) => {
      e.stopPropagation();
      claimTier(tier.index);
    };
  }
  card.appendChild(bottomAction);

  return card;
}

async function claimTier(index: number) {
  audioManager.play('click');
  
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const db = getFirestore();
  const userRef = doc(db, 'Users', user.uid);

  const tier = BP_SEASON_01.tiers[index];
  if (!tier || !tier.freeReward) return;

  try {
    const updates: any = {
      claimedBPTiers: arrayUnion(index)
    };

    if (tier.freeReward && tier.freeReward.type === 'CREDITS') {
      updates.credits = increment(tier.freeReward.value as number);
      audioManager.play('credits_gain');
    } else if (tier.freeReward && tier.freeReward.type === 'COSMETIC') {
      updates.unlockedItems = arrayUnion(tier.freeReward.value as string);
      audioManager.play('level_up');
    } else {
      audioManager.play('level_up');
    }

    await updateDoc(userRef, updates);
    console.log(`[BP] Successfully claimed Tier ${index}`);
    
    // Update local window user data cache
    const wData = (window as any).registeredUserData;
    if (wData) {
      wData.claimedBPTiers = wData.claimedBPTiers || [];
      if (!wData.claimedBPTiers.includes(index)) {
        wData.claimedBPTiers.push(index);
      }
      if (tier.freeReward && tier.freeReward.type === 'CREDITS') {
        wData.credits = (wData.credits || 0) + (tier.freeReward.value as number);
      }
    }

    // Refresh UI
    renderBattlePassScreen();
    
  } catch (err) {
    console.error("[BP] Failed to claim tier:", err);
  }
}

