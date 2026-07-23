import * as screenManager from "./screen-manager";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { DS } from "../design-system";
import { IS_DEV } from "../../shared/gate";
import { getDevMap, getDefaultMap, MAP_REGISTRY } from "../../shared/maps/map-registry";
import { hasCachedBlob, getCachedOrFetchUrl, ensureAssetsDownloaded, getAssetUrl } from "../asset-cache";
import { EXTENDED_SOUNDS, EXTENDED_TEXTURES } from "./splash";

let styleInjected = false;
let activeCardId: string | null = null;
let currentRightPanelMode: 'DEFAULT' | 'MULTIPLAYER' | 'FACTION' | 'INTEL' | 'FEEDBACK' | 'STORE' | 'PROFILE' | 'MAP_EDITOR' | 'PLAY' | 'LOADOUT' = 'DEFAULT';
let userFaction: string | null = null;
let registeredUserData: any = null;
let userSubscriptionUnsubscribe: (() => void) | null = null;
let offersInterval: any = null;

let lastChosenGameMode = localStorage.getItem('lastChosenGameMode') || 'INFILTRATION';
let playCardTitleEl: HTMLElement | null = null;
let playCardEl: HTMLElement | null = null;
const GAME_MODES = [
  { id: 'INFILTRATION', label: 'INFILTRATION', desc: 'Standard covert ops' },
  { id: 'HARDCORE', label: 'HARDCORE', desc: 'High damage tactical combat' },
  { id: 'ARENA', label: 'ARENA', desc: 'Fast-paced close quarters' }
];

let squadMembers: string[] = [];
let friendsList = [
  { codename: 'VALKYRIE', status: 'ONLINE' },
  { codename: 'SPECTER', status: 'ONLINE' },
  { codename: 'GHOST', status: 'IN-GAME' },
  { codename: 'APEX', status: 'OFFLINE' }
];

const cardImages = [
    'faction_card_1.jpg',
    'infiltration_card_1.png',
    'intel_card_1.jpg',
    'leaderboard_card_1.jpg',
    'squad_card_1.jpg',
    'promo_rifle_1.jpg',
    'promo_pistol_1.jpg',
    'promo_shotgun_1.jpg',
    'main_menu_1.jpg'
];

// Element References
let rightPanelContent: HTMLElement;
let leftColumn: HTMLElement;
let multiplayerCard: HTMLElement;
let devQuickstartBtn: HTMLElement | null = null;
let profileRankBadge: HTMLElement;
let profileNameText: HTMLElement;


function getPlayCardImageForMode(modeId: string): string {
  if (modeId === 'INFILTRATION') {
    return 'infiltration_card_1.png';
  }
  return 'infiltration_card_1.png'; // Fallback to infiltration mode image
}

function updatePlayCardBackground() {
  if (playCardEl) {
    const imgName = getPlayCardImageForMode(lastChosenGameMode);
    playCardEl.style.backgroundImage = `url('${getAssetUrl(imgName)}')`;
  }
}


export function initMainMenu() {
  if (offersInterval) {
    clearInterval(offersInterval);
    offersInterval = null;
  }
  cardImages.forEach(name => {
    const img = new Image();
    img.src = getAssetUrl(name);
  });

  const auth = getAuth();
  if (auth.currentUser) {
    const db = getFirestore();
    const uid = auth.currentUser.uid;
    
    if (userSubscriptionUnsubscribe) {
      userSubscriptionUnsubscribe();
    }
    
    userSubscriptionUnsubscribe = onSnapshot(doc(db, 'Users', uid), (snapshot) => {
      if (snapshot.exists()) {
        registeredUserData = snapshot.data();
        userFaction = registeredUserData.faction || null;
        
        const overlay = document.getElementById('vex-enlistment-overlay');
        if (overlay) overlay.remove();
        
        checkDailyRefresh(registeredUserData, doc(db, 'Users', uid));
        enableLeftColumnMenu(true);
      } else {
        registeredUserData = null;
        userFaction = null;
        enableLeftColumnMenu(false);
        showEnlistmentOverlay(db, auth);
      }
      
      updateProfileBox();
      renderRightPanel();
    }, (err) => {
      console.warn("User state subscription failed:", err);
    });
  }

  let el = document.getElementById('main-menu-screen');
  if (el) el.remove();

  if (!styleInjected) {
    const style = document.createElement('style');
    style.innerHTML = `
      #main-menu-screen * {
        box-sizing: border-box;
      }
      .mm-glass {
        background: ${DS.glass.background};
        backdrop-filter: ${DS.glass.blur};
        -webkit-backdrop-filter: ${DS.glass.blur};
        border: ${DS.glass.border};
      }
      .mm-wordmark { font-size: clamp(18px, 3vw, 36px); }
      .mm-right-panel-content {
        transition: opacity ${DS.transitions.panel};
      }
      
      .mm-fisheye-wrap {
        position: absolute;
        inset: 0;
        transform: scale(0.97) perspective(1200px) rotateX(2.5deg);
        transform-style: preserve-3d;
        pointer-events: none;
        z-index: 2;
      }
      .mm-fisheye-wrap > * {
        pointer-events: auto;
      }
      .mm-top-shadow {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: clamp(80px, 15vh, 160px);
        background: linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 100%);
        z-index: 1;
        pointer-events: none;
      }
      .mm-new-card {
        position: relative;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        box-shadow: inset 0 0 60px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.6), 0 6px 15px rgba(0,0,0,0.4);
        cursor: pointer;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s, border 0.2s;
        display: flex;
        flex-direction: column;
        border: none;
        container-type: inline-size;
      }
      .mm-new-card:hover {
        transform: scale(1.02);
        box-shadow: inset 0 0 40px rgba(0,0,0,0.7), inset 0 0 10px rgba(0,0,0,0.4), 0 10px 25px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.05);
        z-index: 10;
      }
      .mm-new-card-title {
        position: absolute;
        top: 0;
        left: 0;
        max-width: 100%;
        box-sizing: border-box;
        font-family: ${DS.typography.fontFamily};
        font-weight: bold;
        font-size: clamp(10px, 6.5cqi, 24px);
        text-transform: uppercase;
        color: #FFFFFF;
        text-shadow: 1px 1px 4px rgba(0,0,0,1);
        padding: clamp(4px, 3cqi, 12px);
        z-index: 2;
        pointer-events: none;
        white-space: nowrap;
        line-height: 1;
        overflow: hidden;
        text-overflow: clip;
      }
      #settings-sidebar::-webkit-scrollbar { display:none; }
      @media (max-width: 768px) {
         .mm-wordmark { font-size: 24px !important; }
         .mm-profile-rank { display: none !important; }
         .mm-new-card-title { font-size: clamp(10px, 7.5cqi, 20px) !important; padding: 6px !important; }
      }
      @keyframes pulse-glow {
        0%, 100% {
          opacity: 0.45;
          transform: scale(0.98);
          filter: drop-shadow(0 0 4px rgba(255, 68, 0, 0.3));
        }
        50% {
          opacity: 0.95;
          transform: scale(1.02);
          filter: drop-shadow(0 0 14px rgba(255, 68, 0, 0.85));
        }
      }
      .mm-updates-glow-anim {
        animation: pulse-glow 2.4s ease-in-out infinite;
      }
      @keyframes deploy-glow {
        0%, 100% {
          box-shadow: 0 0 6px rgba(255, 68, 0, 0.45), 0 2px 4px rgba(0,0,0,0.5);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 16px rgba(255, 68, 0, 0.9), 0 2px 4px rgba(0,0,0,0.5);
          transform: scale(1.04);
        }
      }
      .mm-deploy-btn-glow {
        animation: deploy-glow 2.0s ease-in-out infinite;
      }
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    styleInjected = true;
  }

  el = document.createElement('div');
  el.id = 'main-menu-screen';
  Object.assign(el.style, {
    position: 'fixed', inset: '0', zIndex: '900', display: 'none',
    backgroundColor: DS.colors.background,
    backgroundImage: `url('${getAssetUrl("main_menu_1.jpg")}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: '0', transition: `opacity ${DS.transitions.panel}`,
    overflow: 'hidden'
  });

  const fisheyeWrap = document.createElement('div');
  fisheyeWrap.className = 'mm-fisheye-wrap';
  el.appendChild(fisheyeWrap);

  const vignette = document.createElement('div');
  vignette.className = 'mm-vignette';
  el.appendChild(vignette);

  const topShadow = document.createElement('div');
  topShadow.className = 'mm-top-shadow';
  el.appendChild(topShadow);

  // Region 1 & 2 — Top Row: VEXEΛ Wordmark, Center Profile & Energy/Credits, and Right Settings
  const topRow = document.createElement('div');
  Object.assign(topRow.style, {
    position: 'absolute', top: '0', left: '0', right: '0', zIndex: '10',
    padding: 'clamp(6px, 1vh, 10px) clamp(12px, 2vw, 20px)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  });

  const wordmark = document.createElement('div');
  wordmark.className = 'mm-wordmark';
  wordmark.textContent = 'VEXEΛ';
  Object.assign(wordmark.style, {
    fontFamily: DS.typography.fontFamilyWordmark,
    color: DS.colors.accent,
    letterSpacing: '4px',
    textTransform: 'uppercase',
    fontWeight: '800',
    marginTop: '2px',
    flexShrink: '0'
  });

  // New Navigation Buttons in the top bar in the middle
  const navContainer = document.createElement('div');
  navContainer.id = 'mm-nav-container';
  Object.assign(navContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 1.2vw, 16px)',
    zIndex: '15',
    justifySelf: 'center'
  });

  const navItems = [
    { id: 'DEFAULT', label: 'START' },
    { id: 'LOADOUT', label: 'ARMORY' },
    { id: 'INTEL', label: 'STATS' },
    { id: 'FACTION', label: 'FACTION' },
    { id: 'STORE', label: 'STORE' }
  ];

  navItems.forEach(item => {
    const btn = document.createElement('div');
    btn.className = 'mm-nav-btn';
    btn.setAttribute('data-id', item.id);
    btn.textContent = item.label;
    Object.assign(btn.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(11px, 1.4vh, 14px)',
      fontWeight: 'bold',
      letterSpacing: '2px',
      color: item.id === 'DEFAULT' ? DS.colors.accent : 'rgba(255, 255, 255, 0.6)',
      cursor: 'pointer',
      padding: '4px 8px',
      borderBottom: item.id === 'DEFAULT' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      transition: 'all 0.2s ease',
      userSelect: 'none'
    });

    btn.addEventListener('mouseenter', () => {
      if (currentRightPanelMode !== item.id) {
        btn.style.color = '#FFFFFF';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (currentRightPanelMode !== item.id) {
        btn.style.color = 'rgba(255, 255, 255, 0.6)';
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveCard(item.id);
    });

    navContainer.appendChild(btn);
  });

  // Center Profile Block: Unified horizontal layout containing avatar, vertical progress bar, and name/lvl
  const profileCenterBox = document.createElement('div');
  Object.assign(profileCenterBox.style, {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 'clamp(6px, 1.2vw, 10px)'
  });

  const avatarSquare = document.createElement('div');
  avatarSquare.id = 'profile-avatar-square';
  Object.assign(avatarSquare.style, {
    width: 'clamp(28px, 3.5vh, 34px)',
    height: 'clamp(28px, 3.5vh, 34px)',
    aspectRatio: '1 / 1',
    borderRadius: '4px',
    border: `1px solid ${DS.colors.accent}`,
    overflow: 'hidden',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 6px rgba(255, 68, 0, 0.3)',
    flexShrink: '0'
  });

  const avatarImgEl = document.createElement('img');
  avatarImgEl.id = 'profile-avatar-img';
  Object.assign(avatarImgEl.style, {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  });
  avatarSquare.appendChild(avatarImgEl);
  profileCenterBox.appendChild(avatarSquare);

  // Level XP Progress bar (Vertical)
  const xpBarTrack = document.createElement('div');
  Object.assign(xpBarTrack.style, {
    width: '3px',
    height: '28px',
    background: 'rgba(255, 255, 255, 0.18)',
    borderRadius: '1.5px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    flexShrink: '0'
  });

  const xpFillEl = document.createElement('div');
  xpFillEl.id = 'profile-xp-fill';
  Object.assign(xpFillEl.style, {
    width: '100%',
    height: '65%',
    background: `linear-gradient(180deg, #FFA000, ${DS.colors.accent})`,
    borderRadius: '1.5px',
    transition: 'height 0.3s ease'
  });
  xpBarTrack.appendChild(xpFillEl);
  profileCenterBox.appendChild(xpBarTrack);

  const profileInfoCol = document.createElement('div');
  Object.assign(profileInfoCol.style, {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px'
  });

  profileNameText = document.createElement('div');
  Object.assign(profileNameText.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(10px, 1.2vh, 12px)',
    color: DS.colors.text,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 'bold',
    lineHeight: '1.1'
  });
  profileInfoCol.appendChild(profileNameText);

  profileRankBadge = document.createElement('div');
  profileRankBadge.className = 'mm-profile-rank';
  Object.assign(profileRankBadge.style, {
    background: DS.colors.accent,
    padding: '1px 5px',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(8px, 1vh, 9px)',
    fontWeight: DS.typography.weightBold,
    color: DS.colors.background,
    borderRadius: '2px',
    lineHeight: '1',
    alignSelf: 'start',
    marginTop: '1px'
  });
  profileInfoCol.appendChild(profileRankBadge);

  profileCenterBox.appendChild(profileInfoCol);

  // Energy & Credits Display stacked vertically, RIGHT of the profile
  const crDisplay = document.createElement('div');
  crDisplay.id = 'profile-cr-display';
  Object.assign(crDisplay.style, {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(9px, 1.1vh, 10.5px)',
    color: DS.colors.accent,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
    paddingLeft: '10px',
    height: '28px',
    flexShrink: '0'
  });

  // Far Right Utility buttons: Fullscreen, Feedback, Settings
  const utilityBox = document.createElement('div');
  Object.assign(utilityBox.style, {
    display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.4vw, 18px)'
  });

  const pFullscreen = document.createElement('div');
  pFullscreen.style.color = DS.colors.textMuted;
  pFullscreen.style.cursor = 'pointer';
  pFullscreen.style.display = 'flex';
  pFullscreen.style.alignItems = 'center';
  pFullscreen.style.transition = 'color 0.2s';
  pFullscreen.title = 'Toggle Fullscreen';

  const updateFullscreenIcon = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      pFullscreen.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>`;
    } else {
      pFullscreen.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
    }
  };
  updateFullscreenIcon();

  pFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  });

  pFullscreen.addEventListener('mouseenter', () => { pFullscreen.style.color = DS.colors.text; });
  pFullscreen.addEventListener('mouseleave', () => { pFullscreen.style.color = DS.colors.textMuted; });
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  const pFeedback = document.createElement('div');
  pFeedback.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  pFeedback.style.color = DS.colors.textMuted;
  pFeedback.style.cursor = 'pointer';
  pFeedback.style.display = 'flex';
  pFeedback.style.alignItems = 'center';
  pFeedback.style.transition = 'color 0.2s';
  pFeedback.title = 'Send Feedback';
  pFeedback.onclick = (e) => { e.stopPropagation(); setActiveCard('FEEDBACK'); };
  pFeedback.addEventListener('mouseenter', () => { pFeedback.style.color = DS.colors.text; });
  pFeedback.addEventListener('mouseleave', () => { pFeedback.style.color = DS.colors.textMuted; });
  utilityBox.appendChild(pFullscreen);

  // Add Friends / Party icon right after Feedback
  const pAddFriends = document.createElement('div');
  pAddFriends.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`;
  pAddFriends.style.color = DS.colors.textMuted;
  pAddFriends.style.cursor = 'pointer';
  pAddFriends.style.display = 'flex';
  pAddFriends.style.alignItems = 'center';
  pAddFriends.style.transition = 'color 0.2s';
  pAddFriends.title = 'Squad & Friends';
  pAddFriends.onclick = (e) => { e.stopPropagation(); openSquadFriendsModal(); };
  pAddFriends.addEventListener('mouseenter', () => { pAddFriends.style.color = DS.colors.text; });
  pAddFriends.addEventListener('mouseleave', () => { pAddFriends.style.color = DS.colors.textMuted; });
  utilityBox.appendChild(pAddFriends);

  utilityBox.appendChild(pFeedback);

  const pGear = document.createElement('div');
  pGear.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
  pGear.style.color = DS.colors.textMuted;
  pGear.style.cursor = 'pointer';
  pGear.title = 'Settings';
  pGear.onclick = () => { import("../settings").then(({ openSettings }) => openSettings()); };
  pGear.addEventListener('mouseenter', () => { pGear.style.color = DS.colors.text; });
  pGear.addEventListener('mouseleave', () => { pGear.style.color = DS.colors.textMuted; });
  utilityBox.appendChild(pGear);

  // Left Group: Wordmark on the far left, Credits & Energy right of it, separated by a vertical line border
  const leftGroup = document.createElement('div');
  Object.assign(leftGroup.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 1.5vw, 18px)',
    flex: '1',
    flexBasis: '0',
    minWidth: '0'
  });
  leftGroup.appendChild(wordmark);
  leftGroup.appendChild(crDisplay);
  topRow.appendChild(leftGroup);

  // Center: Navigation options
  Object.assign(navContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 1.2vw, 16px)',
    zIndex: '15',
    flexShrink: '0'
  });
  topRow.appendChild(navContainer);

  // Right Controls Container: Profile Center Box on the left of utility, between nav and utility
  const rightControlsContainer = document.createElement('div');
  Object.assign(rightControlsContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 1.8vw, 18px)',
    justifyContent: 'flex-end',
    flex: '1',
    flexBasis: '0',
    minWidth: '0'
  });
  rightControlsContainer.appendChild(profileCenterBox);
  rightControlsContainer.appendChild(utilityBox);

  topRow.appendChild(rightControlsContainer);
  
  el.appendChild(topRow);
  updateProfileBox();

  const mainLayout = document.createElement('div');
  mainLayout.id = 'mm-main-layout';
  Object.assign(mainLayout.style, {
    position: 'absolute', top: 'clamp(58px, 8vh, 72px)', bottom: 'clamp(12px, 2vh, 20px)', 
    left: 'clamp(12px, 2vh, 20px)', zIndex: '2',
    display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5vh, 20px)',
    width: 'clamp(320px, 45vw, 48vw)', transition: 'opacity 0.3s'
  });

  const menuLeftColumn = document.createElement('div');
  Object.assign(menuLeftColumn.style, {
    display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.0vh, 12px)', flex: '1', minHeight: '0'
  });

  const createNewCard = (title: string, bgImage: string) => {
    const card = document.createElement('div');
    card.className = 'mm-new-card';
    Object.assign(card.style, {
      flex: '1', backgroundImage: `url('${getAssetUrl(bgImage)}')`
    });

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.className = 'mm-new-card-title';
    card.appendChild(titleEl);

    return { card, titleEl };
  };

  // --- ROW 1: PLAY ONLY (Large) ---
  const playObj = createNewCard(lastChosenGameMode.toUpperCase(), getPlayCardImageForMode(lastChosenGameMode));
  const playCard = playObj.card;
  playCardEl = playCard;
  playCardTitleEl = playObj.titleEl;
  playCard.style.flex = '2.7';
  playCard.style.width = '100%';
  playCard.style.minHeight = '0';
  playCard.style.backgroundPosition = 'right top 25%';
  playObj.titleEl.style.fontSize = 'clamp(17px, 12.5cqi, 42px)';
  playCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('PLAY');
  };
  
  const playContent = document.createElement('div');
  Object.assign(playContent.style, {
    position: 'absolute', inset: '0',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 'clamp(4px, 1vh, 8px)', gap: '4px', zIndex: '3', pointerEvents: 'none'
  });

  if (IS_DEV) {
    const devContainer = document.createElement('div');
    Object.assign(devContainer.style, {
      display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center',
      pointerEvents: 'auto', zIndex: '5', marginLeft: 'auto'
    });
    
    const createDevBtn = (text: string, onClick: (e:Event) => void) => {
        const btn = document.createElement('div');
        btn.textContent = text;
        Object.assign(btn.style, {
            color: '#000000', border: 'none', background: DS.colors.accent,
            padding: '3px 8px', fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 2.25cqi, 14px)', cursor: 'pointer',
            fontWeight: 'bold', textShadow: 'none', borderRadius: '2px', whiteSpace: 'nowrap', lineHeight: '1.2'
        });
        btn.onclick = onClick;
        devContainer.appendChild(btn);
    };

    createDevBtn('DEV QUICK START', (e) => {
        e.stopPropagation();
        const mapId = getDefaultMap().id;
        ensureAssetsDownloaded(() => {
            window.dispatchEvent(new CustomEvent('start-match', { detail: { mode: 'STANDARD', class: 'ASSAULT', solo: true, map: getDefaultMap() }}));
            screenManager.showGame();
        }, mapId);
    });
    createDevBtn('MAP EDITOR', (e) => {
        e.stopPropagation();
        screenManager.showDevMapEditor();
    });
    createDevBtn('DEV ENTITIES', (e) => {
        e.stopPropagation();
        screenManager.showDevEntities();
    });
    playContent.appendChild(devContainer);
  }

  const qmBtn = document.createElement('div');
  qmBtn.textContent = 'QUICK MATCH';
  qmBtn.className = 'mm-deploy-btn-glow';
  Object.assign(qmBtn.style, {
    color: DS.colors.background, background: DS.colors.accent, border: 'none',
    padding: '8px 20px',
    fontFamily: DS.typography.fontFamily, fontWeight: DS.typography.weightBold,
    fontSize: 'clamp(16px, 4cqi, 24px)', cursor: 'pointer', pointerEvents: 'auto',
    borderRadius: '2px', textAlign: 'center', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.5)', zIndex: '5'
  });
  qmBtn.onclick = (e) => {
      e.stopPropagation();
      const mapId = getDefaultMap().id;
      ensureAssetsDownloaded(() => {
          try {
              const docEl = document.documentElement as any;
              if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                  if (docEl.requestFullscreen) docEl.requestFullscreen();
                  else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
              }
          } catch (err) {}
          window.dispatchEvent(new CustomEvent('start-match', { detail: { mode: 'STANDARD', class: 'ASSAULT', solo: true, map: getDefaultMap() }}));
          screenManager.showGame();
      }, mapId);
  };
  playContent.appendChild(qmBtn);
  playCard.appendChild(playContent);


  // --- ROW 2: UPDATES, FACTION, INTEL, LOADOUT (25% of Row 1) ---
  const row2Container = document.createElement('div');
  Object.assign(row2Container.style, {
    display: 'flex', flexDirection: 'row', gap: 'clamp(6px, 1vw, 10px)', width: '100%', flex: '1.0', minHeight: '0'
  });

  // 1. UPDATES CARD
  const updatesObj = createNewCard('UPDATES', 'faction_card_1.jpg');
  const updatesCard = updatesObj.card;
  updatesCard.id = 'mm-updates-card';
  updatesCard.style.flex = '1';
  updatesCard.style.height = '100%';
  updatesCard.style.minHeight = '0';
  updatesCard.style.backgroundSize = 'cover';
  updatesCard.style.backgroundPosition = 'center';
  updatesCard.style.backgroundRepeat = 'no-repeat';
  updatesCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('INTEL');
  };

  const updatesGlow = document.createElement('div');
  updatesGlow.className = 'mm-updates-glow-anim';
  Object.assign(updatesGlow.style, {
    position: 'absolute', inset: '0',
    background: 'radial-gradient(ellipse 110% 85% at 50% 120%, rgba(255, 68, 0, 0.8) 0%, rgba(255, 68, 0, 0.3) 50%, transparent 80%)',
    pointerEvents: 'none', zIndex: '3'
  });
  updatesCard.appendChild(updatesGlow);

  const updatesMainText = document.createElement('div');
  updatesMainText.textContent = 'BETA v0.1';
  Object.assign(updatesMainText.style, {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(8px, 1.5vh, 12px)', color: '#FFFFFF',
    fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', width: '90%',
    textShadow: '0 2px 6px rgba(0,0,0,0.9)', zIndex: '4', pointerEvents: 'none'
  });
  updatesCard.appendChild(updatesMainText);

  const updatesSubtext = document.createElement('div');
  updatesSubtext.textContent = 'NEW MAP & WEAPONS';
  Object.assign(updatesSubtext.style, {
    position: 'absolute', bottom: 'clamp(4px, 0.8vh, 8px)', left: 'clamp(6px, 1cqi, 10px)',
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(6px, 0.8vh, 8px)', color: 'rgba(255,255,255,0.85)',
    fontWeight: 'bold', letterSpacing: '1px', textShadow: '1px 1px 3px rgba(0,0,0,0.9)', zIndex: '4', pointerEvents: 'none'
  });
  updatesCard.appendChild(updatesSubtext);

  // 2. LEADERBOARD CARD
  const leaderboardObj = createNewCard('LEADERBOARD', 'leaderboard_card_1.jpg');
  const leaderboardCard = leaderboardObj.card;
  leaderboardCard.id = 'leaderboard-card';
  leaderboardCard.style.flex = '1';
  leaderboardCard.style.height = '100%';
  leaderboardCard.style.minHeight = '0';
  leaderboardCard.style.backgroundPosition = 'top center';
  leaderboardCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('INTEL');
  };

  // 3. INTEL CARD
  const intelObj = createNewCard('INTEL', 'intel_card_1.jpg');
  const intelCard = intelObj.card;
  intelCard.style.flex = '1';
  intelCard.style.height = '100%';
  intelCard.style.minHeight = '0';
  intelCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('INTEL');
  };

  // 4. SQUAD RAID CARD
  const squadRaidObj = createNewCard('SQUAD RAID', 'squad_card_1.jpg');
  const squadRaidCard = squadRaidObj.card;
  squadRaidCard.style.flex = '1';
  squadRaidCard.style.height = '100%';
  squadRaidCard.style.minHeight = '0';
  squadRaidCard.onclick = (e) => {
    e.stopPropagation();
    openSquadFriendsModal();
  };

  row2Container.appendChild(updatesCard);
  row2Container.appendChild(leaderboardCard);
  row2Container.appendChild(intelCard);
  row2Container.appendChild(squadRaidCard);


  // --- ROW 3: CHALLENGES & STORE (50% of Row 1) ---
  const row3Container = document.createElement('div');
  Object.assign(row3Container.style, {
    display: 'flex', flexDirection: 'row', gap: 'clamp(6px, 1vw, 10px)', width: '100%', flex: '2.3', minHeight: '0'
  });

  // 1. STORE CARD (Offers Carousel)
  const storeObj = createNewCard('OFFERS', 'promo_rifle_1.jpg');
  const storeCard = storeObj.card;
  storeCard.style.flex = '1';
  storeCard.style.height = '100%';
  storeCard.style.minHeight = '0';
  storeCard.style.backgroundPosition = 'top center';
  storeCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('STORE');
  };

  // Add Promo Text element in bottom right
  const promoTextEl = document.createElement('div');
  Object.assign(promoTextEl.style, {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    color: '#FFFFFF',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(12px, 2vh, 16px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    zIndex: '4',
    pointerEvents: 'none',
    textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)',
    transition: 'opacity 0.30s ease',
    whiteSpace: 'nowrap'
  });
  storeCard.appendChild(promoTextEl);

  const OFFERS = [
    { image: 'promo_rifle_1.jpg', promo: 'M4-HAZARD SKIN: 400 CR' },
    { image: 'promo_pistol_1.jpg', promo: 'SILENT ASSASSIN: 350 CR' },
    { image: 'promo_shotgun_1.jpg', promo: 'BREACHER SPECIAL: 450 CR' }
  ];
  let currentOfferIdx = 0;

  const updateOffer = (idx: number) => {
    const offer = OFFERS[idx];
    storeCard.style.backgroundImage = `url('${getAssetUrl(offer.image)}')`;
    promoTextEl.textContent = offer.promo.toUpperCase();
  };

  // Initialize first offer
  updateOffer(0);

  // Auto-flipping carousel
  offersInterval = setInterval(() => {
    currentOfferIdx = (currentOfferIdx + 1) % OFFERS.length;
    promoTextEl.style.opacity = '0';
    setTimeout(() => {
      updateOffer(currentOfferIdx);
      promoTextEl.style.opacity = '1';
    }, 300);
  }, 4000);

  // 2. CHALLENGES PANEL (Statically displaying minimum 3 challenges)
  const challengesPanel = document.createElement('div');
  challengesPanel.id = 'mm-challenges-panel';
  Object.assign(challengesPanel.style, {
    position: 'relative', flex: '1', height: '100%', minHeight: '0', zIndex: '2',
    display: 'flex', flexDirection: 'column', padding: 'clamp(4px, 0.8vh, 8px)',
    gap: 'clamp(1px, 0.3vh, 3px)', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.8)',
    boxShadow: '0 0 25px 15px rgba(0, 0, 0, 0.85)', borderRadius: '4px', cursor: 'default',
    transition: 'opacity 0.3s'
  });

  const challengesHeader = document.createElement('div');
  Object.assign(challengesHeader.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '0px'
  });

  const challengesTitle = document.createElement('div');
  challengesTitle.textContent = 'CHALLENGES';
  Object.assign(challengesTitle.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(9px, 1.2vh, 11px)', fontWeight: '200', color: '#FFFFFF',
    letterSpacing: '6px', textAlign: 'center', width: '100%'
  });

  const challengesTimer = document.createElement('div');
  challengesTimer.textContent = 'RESETS IN 14H';
  Object.assign(challengesTimer.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(5.5px, 0.7vh, 7px)', color: 'rgba(255,255,255,0.45)',
    fontWeight: '300', letterSpacing: '1px', textAlign: 'center', marginTop: '1px'
  });

  challengesHeader.appendChild(challengesTitle);
  challengesHeader.appendChild(challengesTimer);
  challengesPanel.appendChild(challengesHeader);

  const challengesData = [
    { name: 'DRONE SWARM DISPATCH', desc: 'Eliminate 20 enemy drones', current: 14, target: 20, reward: '+200 CR' },
    { name: 'HARDPOINT HOLDER', desc: 'Hold objectives for 180s', current: 125, target: 180, reward: '+150 CR' },
    { name: 'PRECISION SHOTS', desc: 'Score 15 headshots', current: 9, target: 15, reward: '+100 EN' }
  ];

  challengesData.forEach((ch) => {
    const item = document.createElement('div');
    Object.assign(item.style, {
      background: 'transparent', border: 'none', padding: '0px',
      display: 'flex', flexDirection: 'column', gap: '0px'
    });

    const topRow = document.createElement('div');
    Object.assign(topRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

    const chName = document.createElement('div');
    chName.textContent = ch.name;
    Object.assign(chName.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(7px, 0.9vh, 8.5px)', fontWeight: 'bold', color: '#FFFFFF',
      lineHeight: '1.0'
    });

    const chReward = document.createElement('div');
    chReward.textContent = ch.reward;
    Object.assign(chReward.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(6px, 0.8vh, 7.5px)', fontWeight: 'normal', color: '#FFFFFF',
      lineHeight: '1.0'
    });

    topRow.appendChild(chName);
    topRow.appendChild(chReward);
    item.appendChild(topRow);

    const descRow = document.createElement('div');
    descRow.textContent = ch.desc;
    Object.assign(descRow.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(5px, 0.65vh, 7px)', color: 'rgba(255,255,255,0.6)',
      lineHeight: '1.0', marginTop: '1px'
    });
    item.appendChild(descRow);

    const progressRow = document.createElement('div');
    Object.assign(progressRow.style, { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' });

    const barBg = document.createElement('div');
    Object.assign(barBg.style, {
      flex: '1', height: '2px', background: 'rgba(255,255,255,0.15)', borderRadius: '1px', overflow: 'hidden'
    });

    const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
    const barFill = document.createElement('div');
    Object.assign(barFill.style, {
      width: `${pct}%`, height: '100%', background: '#FFFFFF', borderRadius: '1px'
    });
    barBg.appendChild(barFill);

    const chVal = document.createElement('div');
    chVal.textContent = `${ch.current}/${ch.target}`;
    Object.assign(chVal.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(6px, 0.8vh, 7.5px)', color: '#FFFFFF', fontWeight: 'bold',
      lineHeight: '1.0'
    });

    progressRow.appendChild(barBg);
    progressRow.appendChild(chVal);
    item.appendChild(progressRow);

    challengesPanel.appendChild(item);
  });

  challengesPanel.onclick = (e) => {
    e.stopPropagation();
  };

  row3Container.appendChild(challengesPanel);
  row3Container.appendChild(storeCard);

  // Assemble the left side
  menuLeftColumn.appendChild(playCard);
  menuLeftColumn.appendChild(row2Container);
  menuLeftColumn.appendChild(row3Container);

  mainLayout.appendChild(menuLeftColumn);
  fisheyeWrap.appendChild(mainLayout);

  const tabContentLayout = document.createElement('div');
  tabContentLayout.id = 'mm-tab-layout';
  Object.assign(tabContentLayout.style, {
    position: 'absolute', top: 'clamp(40px, 7.5vh, 60px)', bottom: 'clamp(15px, 2.5vh, 30px)', 
    left: 'clamp(15px, 2.5vw, 30px)', right: 'clamp(15px, 2.5vw, 30px)', zIndex: '3',
    display: 'none', flexDirection: 'column',
    maxWidth: '600px', margin: '0 auto'
  });

  const backBtn = document.createElement('div');
  backBtn.textContent = 'BACK TO MENU';
  Object.assign(backBtn.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)',
    color: DS.colors.warning, cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold'
  });
  backBtn.onclick = () => {
    setActiveCard('DEFAULT');
  };
  tabContentLayout.appendChild(backBtn);

  const tabTitle = document.createElement('div');
  tabTitle.id = 'dynamic-panel-title';
  Object.assign(tabTitle.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(24px, 4vh, 48px)',
    color: DS.colors.text, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '20px',
    textShadow: DS.shadows.text
  });
  tabContentLayout.appendChild(tabTitle);

  rightPanelContent = document.createElement('div');
  Object.assign(rightPanelContent.style, {
    display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto',
    flex: '1', scrollbarWidth: 'none', msOverflowStyle: 'none'
  });
  tabContentLayout.appendChild(rightPanelContent);
  fisheyeWrap.appendChild(tabContentLayout);

  document.body.appendChild(el);

  // Trigger default panel render for INTEL
  currentRightPanelMode = 'DEFAULT';
  renderRightPanel();

  setTimeout(() => { if (el) el.style.opacity = '1'; }, 50);
}

function updateProfileBox() {
  const leaderboardCard = document.getElementById('leaderboard-card');
  if (leaderboardCard) {
    import('../asset-cache').then(({ getAssetUrl }) => {
      leaderboardCard.style.backgroundImage = `url('${getAssetUrl('faction_card_1.jpg')}')`;
    });
  }

  const coinSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="${DS.colors.accent}" style="vertical-align: middle; display: inline-block;"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v1.17a3 3 0 0 0-1 5.66V13a3 3 0 0 0 2 2.83V17h2v-1.17a3 3 0 0 0 1-5.66V9a3 3 0 0 0-2-2.83z"/></svg>`;
  const boltSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="${DS.colors.accent}" style="vertical-align: middle; display: inline-block;"><path d="M11 21l1.5-7H7l6-12-1.5 7H17l-6 12z"/></svg>`;

  const crDisplay = document.getElementById('profile-cr-display');
  const avatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement | null;
  const xpFill = document.getElementById('profile-xp-fill');

  if (registeredUserData) {
    profileNameText.textContent = `${registeredUserData.displayName.toUpperCase()}`;
    const levelNum = registeredUserData.battlePass || 1;
    profileRankBadge.textContent = `LVL ${levelNum}`;
    profileRankBadge.style.display = 'block';
    profileNameText.style.color = DS.colors.text;

    if (avatarImg) {
      if (registeredUserData.photoURL) {
        avatarImg.src = registeredUserData.photoURL;
      } else {
        avatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2523ff4400"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>';
      }
    }

    if (xpFill) {
      const xp = registeredUserData.xp !== undefined ? registeredUserData.xp : 65;
      const progressPct = Math.min(100, Math.max(15, xp % 100 || 65));
      xpFill.style.height = `${progressPct}%`;
    }

    const creditsVal = registeredUserData.credits !== undefined ? registeredUserData.credits : 100;
    const energyVal = registeredUserData.energy !== undefined ? registeredUserData.energy : 100;

    if (crDisplay) {
      crDisplay.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${coinSvg}<span>${creditsVal}</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${boltSvg}<span>${energyVal}</span>
        </div>
      `;
    }
  } else {
    const guestId = localStorage.getItem('guestId') || Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('guestId', guestId);
    profileNameText.textContent = `GUEST [${guestId}]`;
    profileRankBadge.textContent = 'LVL 1';
    profileNameText.style.color = DS.colors.textMuted;

    if (avatarImg) {
      avatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2523ff4400"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>';
    }

    if (xpFill) {
      xpFill.style.height = '45%';
    }

    if (crDisplay) {
      crDisplay.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${coinSvg}<span>100</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${boltSvg}<span>100</span>
        </div>
      `;
    }
  }
}

function setActiveCard(id: string) {
  if (currentRightPanelMode === id as any) return;
  import('../audio').then(({ audioManager }) => audioManager.play('click'));
  currentRightPanelMode = id as any;
  const titleEl = document.getElementById('dynamic-panel-title');
  if (titleEl) {
    titleEl.textContent = id === 'DEFAULT' ? 'INTEL' : id;
  }
  
  const mainLayout = document.getElementById('mm-main-layout');
  const tabLayout = document.getElementById('mm-tab-layout');
  
  if (id === 'DEFAULT') {
    if (mainLayout) mainLayout.style.display = 'flex';
    if (tabLayout) tabLayout.style.display = 'none';
  } else {
    if (mainLayout) mainLayout.style.display = 'none';
    if (tabLayout) tabLayout.style.display = 'flex';
    renderRightPanel();
  }

  // Update active state of top-bar navigation buttons
  const navBtns = document.querySelectorAll('.mm-nav-btn');
  navBtns.forEach(btn => {
    const btnId = btn.getAttribute('data-id');
    if (btnId === id) {
      (btn as HTMLElement).style.color = DS.colors.accent;
      (btn as HTMLElement).style.borderBottom = `2px solid ${DS.colors.accent}`;
    } else {
      (btn as HTMLElement).style.color = 'rgba(255, 255, 255, 0.6)';
      (btn as HTMLElement).style.borderBottom = '2px solid transparent';
    }
  });
}

function clearActiveCard() {
  setActiveCard('DEFAULT');
}

function createPanelBlock(label: string, renderContent: (container: HTMLElement) => void, isLast: boolean = false) {
  const block = document.createElement('div');
  Object.assign(block.style, {
    padding: 'clamp(8px, 2vh, 16px) 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)'
  });
  
  if (label) {
    const lbl = document.createElement('div');
    lbl.textContent = label;
    Object.assign(lbl.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(8px, 1.25vh, 11px)', textTransform: 'uppercase',
      color: DS.colors.textMuted, letterSpacing: '4px', marginBottom: 'clamp(4px, 1vh, 8px)'
    });
    block.appendChild(lbl);
  }

  renderContent(block);
  return block;
}

function renderRightPanel() {
  rightPanelContent.style.opacity = '0';
  
  // Right Column Overflow Logic
  const rightCol = document.getElementById('mm-right-col');
  if (rightCol) {
     rightCol.style.overflowY = 'auto';
  }

  setTimeout(() => {
    rightPanelContent.innerHTML = '';
    
    if (currentRightPanelMode === 'DEFAULT' || currentRightPanelMode === 'INTEL') {
       rightPanelContent.appendChild(createPanelBlock(currentRightPanelMode === 'DEFAULT' ? 'INTEL SUMMARY' : 'LIFETIME STATS', c => {
         const stats = [
           { l: 'MATCHES', v: registeredUserData ? String(registeredUserData.totalMatches || 0) : '—' },
           { l: 'WINS', v: registeredUserData ? String(registeredUserData.totalWins || 0) : '—' },
           { l: 'WIN RATE', v: registeredUserData ? `${registeredUserData.winRate || 0}%` : '—' },
           { l: 'ELIMINATIONS', v: registeredUserData ? String(registeredUserData.totalDroneEliminations || 0) : '—' },
           { l: 'DEATHS', v: registeredUserData ? String(registeredUserData.totalDeaths || 0) : '—' },
           { l: 'OBJECTIVE TIME', v: registeredUserData ? `${registeredUserData.totalObjectiveTimeHeld || 0}s` : '—' },
           { l: 'REVIVES', v: registeredUserData ? String(registeredUserData.totalRevivesPerformed || 0) : '—' },
           { l: 'BEST SCORE', v: registeredUserData ? String(registeredUserData.highestIndividualScore || 0) : '—' }
         ];
         stats.forEach(s => {
           const row = document.createElement('div');
           Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(4px, 1vh, 8px)' });
           const lbl = document.createElement('span'); lbl.textContent = s.l;
           Object.assign(lbl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 1.5vh, 14px)', color: DS.colors.textMuted });
           const val = document.createElement('span'); val.textContent = s.v;
           Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: DS.colors.text, fontWeight: DS.typography.weightBold });
           row.appendChild(lbl); row.appendChild(val); c.appendChild(row);
         });

         if (IS_DEV) {
           const devBlock = document.createElement('div');
           Object.assign(devBlock.style, {
             marginTop: '24px',
             borderTop: '1px dashed rgba(255,255,255,0.1)',
             paddingTop: '16px',
             fontFamily: DS.typography.fontFamily
           });
           
           const devTitle = document.createElement('div');
           devTitle.textContent = 'DEV DIAGNOSTICS';
           Object.assign(devTitle.style, {
             fontSize: '11px',
             letterSpacing: '3px',
             color: DS.colors.dev,
             marginBottom: '8px'
           });
           devBlock.appendChild(devTitle);
           
           const devNote = document.createElement('div');
           devNote.textContent = 'NOTE: Standard 100-credit allotment is arbitrary and subject to game balance review.';
           Object.assign(devNote.style, {
             fontSize: '10px',
             color: DS.colors.textMuted,
             marginBottom: '12px',
             textTransform: 'none'
           });
           devBlock.appendChild(devNote);
           
           const refillBtn = document.createElement('button');
           refillBtn.textContent = 'REFILL CREDITS & ENERGY [DEV SERVER AUTH]';
           Object.assign(refillBtn.style, {
             width: '100%',
             padding: '8px',
             background: 'rgba(255, 0, 100, 0.15)',
             border: '1px solid rgba(255, 0, 100, 0.4)',
             color: DS.colors.dev,
             fontSize: '11px',
             fontWeight: 'bold',
             letterSpacing: '2px',
             cursor: 'pointer'
           });
           refillBtn.onclick = () => {
             const auth = getAuth();
             import('../main').then(({ getSocketChannel }) => {
               const chan = getSocketChannel();
               if (chan && registeredUserData) {
                 chan.emit('refill_credits', { uid: auth.currentUser?.uid });
                 showMenuNotification("CREDITS REFILL REQUEST EMITTED.");
               } else {
                 showMenuNotification("CHANNEL INACTIVE. OFFLINE FALLBACK EMULATING REFILL.", "warning");
                 const uid = auth.currentUser?.uid;
                 if (uid) {
                   import('firebase/firestore').then(({ updateDoc }) => {
                     updateDoc(doc(getFirestore(), 'Users', uid), {
                       credits: 1000,
                       energy: 1000
                     });
                   });
                 }
               }
             });
           };
           devBlock.appendChild(refillBtn);
           c.appendChild(devBlock);
         }
       }));
       rightPanelContent.appendChild(createPanelBlock('LAST MATCH', c => {
         const lbl = document.createElement('div'); lbl.textContent = 'NO DATA AVAILABLE';
         Object.assign(lbl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 1.5vh, 14px)', color: DS.colors.textMuted });
         c.appendChild(lbl);
       }, true));
    } 
    else if (currentRightPanelMode === 'PLAY') {
      rightPanelContent.appendChild(createPanelBlock('GAME MODE', c => {
         GAME_MODES.forEach(mode => {
            const btn = document.createElement('div');
            btn.textContent = mode.label;
            const isSelected = lastChosenGameMode === mode.id;
            Object.assign(btn.style, {
              fontFamily: DS.typography.fontFamily,
              fontSize: 'clamp(14px, 2.5vh, 18px)',
              padding: 'clamp(4px, 0.8vh, 8px) clamp(6px, 1vw, 12px)',
              marginBottom: 'clamp(2px, 0.5vh, 4px)',
              cursor: 'pointer',
              borderLeft: isSelected ? '2px solid ' + DS.colors.accent : '2px solid transparent',
              background: isSelected ? 'rgba(255, 69, 0, 0.08)' : 'transparent',
              color: isSelected ? DS.colors.text : DS.colors.textMuted,
              transition: 'all 0.2s ease'
            });

            btn.onclick = () => {
                lastChosenGameMode = mode.id;
                localStorage.setItem('lastChosenGameMode', mode.id);
                if (playCardTitleEl) {
                    playCardTitleEl.textContent = mode.id;
                }
                updatePlayCardBackground();
                import('../audio').then(({ audioManager }) => audioManager.play('click'));
                renderRightPanel();
            };
            c.appendChild(btn);
         });
      }));
      rightPanelContent.appendChild(createPanelBlock('MATCH TYPE', c => {
         const opActive = document.createElement('div'); opActive.textContent = 'OPEN MATCH';
         Object.assign(opActive.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: DS.colors.text, borderLeft: '2px solid ' + DS.colors.accent, background: 'rgba(255, 69, 0, 0.08)', padding: 'clamp(2px, 0.5vh, 4px) clamp(4px, 1vw, 8px)', marginBottom: 'clamp(2px, 0.5vh, 4px)' });
         const op2 = document.createElement('div'); op2.textContent = 'PRIVATE MATCH';
         Object.assign(op2.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: DS.colors.text, opacity: '0.6', padding: 'clamp(2px, 0.5vh, 4px) clamp(4px, 1vw, 8px)' });
         c.appendChild(opActive); c.appendChild(op2);
      }));
      rightPanelContent.appendChild(createPanelBlock('CONTRACTORS', c => {
         const val = document.createElement('div'); val.textContent = '1 / 10';
         Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: DS.colors.text });
         c.appendChild(val);
      }));
      rightPanelContent.appendChild(createPanelBlock('', c => {
         const btn = document.createElement('button');
         btn.textContent = 'QUICK MATCH';
         Object.assign(btn.style, {
           width: '100%', height: 'clamp(32px, 6vh, 48px)', background: DS.colors.accent, color: DS.colors.background, border: 'none',
           fontFamily: DS.typography.fontFamily, fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: DS.typography.weightBold, textTransform: 'uppercase',
           cursor: 'pointer'
         });
         btn.addEventListener('click', () => { 
             if (registeredUserData && (registeredUserData.energy || 0) < 10) {
                 showMenuNotification("DEPLOYMENT REJECTED: INSUFFICIENT ENERGY. REFILL DEV CREDITS IN INTEL.", "warning");
                 return;
             }
             ensureAssetsDownloaded(() => screenManager.showLobby(), getDefaultMap().id); 
         });
         c.appendChild(btn);
      }, true));
    }
    else if (currentRightPanelMode === 'LOADOUT') {
        rightPanelContent.appendChild(createPanelBlock('LOADOUT', c => {
            const val = document.createElement('div'); val.textContent = 'EQUIPMENT SYSTEM OFFLINE';
            Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: '#888888' });
            c.appendChild(val);
        }));
    }
    else if (currentRightPanelMode === 'FACTION') {
      const auth = getAuth();
      const isGuest = !auth.currentUser || auth.currentUser.isAnonymous;
      rightPanelContent.appendChild(createPanelBlock('CURRENT FACTION', c => {
         const val = document.createElement('div'); val.textContent = isGuest ? 'UNAFFILIATED' : (userFaction || 'UNASSIGNED');
         Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: DS.colors.text });
         c.appendChild(val);
      }));
      rightPanelContent.appendChild(createPanelBlock('ENLIST', c => {
         ['VIBE CO.', 'SLOP INC.'].forEach((f, i) => {
            const btn = document.createElement('div'); btn.textContent = f;
            const isSelected = userFaction === f;
            Object.assign(btn.style, {
              fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', padding: 'clamp(6px, 1.5vh, 12px)', marginBottom: 'clamp(4px, 1vh, 8px)', cursor: isGuest ? 'default' : 'pointer',
              borderLeft: isSelected ? '2px solid ' + DS.colors.accent : '2px solid transparent',
              background: isSelected ? 'rgba(255, 69, 0, 0.08)' : 'transparent',
              color: isSelected ? DS.colors.text : DS.colors.textMuted
            });
            c.appendChild(btn);
         });
      }));
      rightPanelContent.appendChild(createPanelBlock('', c => {
         const btn = document.createElement('button');
         btn.textContent = 'CONFIRM';
         Object.assign(btn.style, {
           width: '100%', height: 'clamp(32px, 6vh, 48px)', background: isGuest ? '#333' : DS.colors.accent, color: isGuest ? '#666' : DS.colors.background, border: 'none',
           fontFamily: DS.typography.fontFamily, fontSize: 'clamp(16px, 3vh, 24px)', fontWeight: DS.typography.weightBold, textTransform: 'uppercase', cursor: isGuest ? 'default' : 'pointer'
         });
         if (isGuest) btn.disabled = true;
         c.appendChild(btn);
         if (isGuest) {
            const sub = document.createElement('div'); sub.textContent = 'Sign in to save faction.';
            Object.assign(sub.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 1.5vh, 13px)', color: DS.colors.textMuted, textAlign: 'center', marginTop: 'clamp(4px, 1vh, 8px)' });
            c.appendChild(sub);
         }
      }, true));
    }
    else if (currentRightPanelMode === 'FEEDBACK') {
       let sr = 0;
       const stars: HTMLElement[] = [];
       rightPanelContent.appendChild(createPanelBlock('', c => {
         const row = document.createElement('div'); Object.assign(row.style, { display: 'flex', gap: 'clamp(4px, 1vh, 8px)', marginBottom: 'clamp(8px, 2vh, 16px)' });
         for (let i=1; i<=5; i++) {
           const s = document.createElement('div'); s.innerHTML = '★';
           Object.assign(s.style, { fontSize: 'clamp(20px, 3.5vh, 32px)', color: DS.colors.border, cursor: 'pointer', lineHeight: '1' });
           s.onclick = () => { sr = i; stars.forEach((st, idx) => st.style.color = idx < sr ? DS.colors.accent : DS.colors.border); };
           stars.push(s); row.appendChild(s);
         }
         c.appendChild(row);

         const txt = document.createElement('textarea');
         txt.placeholder = 'Describe your experience.';
         Object.assign(txt.style, {
           width: '100%', height: 'clamp(50px, 10vh, 80px)', background: 'rgba(0,0,0,0.4)', border: DS.glass.border,
           color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 1.5vh, 13px)', padding: 'clamp(5px, 1vh, 10px)', resize: 'none'
         });
         c.appendChild(txt);
       }));
       rightPanelContent.appendChild(createPanelBlock('', c => {
         const btn = document.createElement('button'); btn.textContent = 'SUBMIT';
         Object.assign(btn.style, {
           width: '100%', height: 'clamp(30px, 4vh, 40px)', background: DS.colors.accent, color: DS.colors.background, border: 'none',
           fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', fontWeight: DS.typography.weightBold, textTransform: 'uppercase', cursor: 'pointer'
         });
         btn.onclick = async () => {
           const auth = getAuth();
           const uid = auth.currentUser ? auth.currentUser.uid : "guest";
           const txt = rightPanelContent.querySelector('textarea');
           try {
               await addDoc(collection(getFirestore(), "feedback"), {
                   rating: sr, text: txt?.value || '', timestamp: serverTimestamp(), userId: uid
               });
               if(txt) txt.value = '';
               sr = 0; stars.forEach(st => st.style.color = DS.colors.border);
               btn.textContent = 'SENT';
               setTimeout(() => btn.textContent = 'SUBMIT', 2000);
           } catch(e) {}
         };
         c.appendChild(btn);
       }, true));
    }
    else if (currentRightPanelMode === 'STORE') {
        rightPanelContent.appendChild(createPanelBlock('STORE', c => {
            const val = document.createElement('div'); val.textContent = 'OFFLINE';
            Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(14px, 2.5vh, 18px)', color: '#888888' });
            c.appendChild(val);
        }));
    }
    else if (currentRightPanelMode === 'MAP_EDITOR') {
        rightPanelContent.appendChild(createPanelBlock('AVAILABLE MAPS', c => {
            MAP_REGISTRY.forEach(map => {
                const mapBtn = document.createElement('div');
                Object.assign(mapBtn.style, {
                    padding: 'clamp(8px, 1.5vh, 12px)',
                    marginBottom: '8px',
                    borderLeft: `2px solid ${DS.colors.accent}`,
                    background: 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    color: DS.colors.text,
                    fontFamily: DS.typography.fontFamily,
                    fontSize: 'clamp(14px, 2.5vh, 18px)'
                });
                mapBtn.textContent = map.displayName;
                mapBtn.addEventListener('mouseenter', () => { mapBtn.style.background = 'rgba(255,255,255,0.1)'; });
                mapBtn.addEventListener('mouseleave', () => { mapBtn.style.background = 'rgba(255,255,255,0.05)'; });
                mapBtn.addEventListener('click', () => {
                    if ((window as any).launchMapEditor) {
                        (window as any).launchMapEditor(map.id);
                    } else {
                        console.log('launchMapEditor missing');
                    }
                });
                c.appendChild(mapBtn);
            });
        }));
    }

    rightPanelContent.style.opacity = '1';
  }, 100);
}

function checkDailyRefresh(userData: any, userDocRef: any) {
  if (!userData || !userData.dailyRefreshedAt) return;
  
  let refreshedDate: Date;
  if (userData.dailyRefreshedAt.toDate) {
    refreshedDate = userData.dailyRefreshedAt.toDate();
  } else if (userData.dailyRefreshedAt.seconds) {
    refreshedDate = new Date(userData.dailyRefreshedAt.seconds * 1000);
  } else {
    refreshedDate = new Date(userData.dailyRefreshedAt);
  }
  
  const now = new Date();
  
  const refreshedYear = refreshedDate.getFullYear();
  const refreshedMonth = refreshedDate.getMonth();
  const refreshedDay = refreshedDate.getDate();
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  const isDifferentDay = (currentYear > refreshedYear) ||
                         (currentYear === refreshedYear && currentMonth > refreshedMonth) ||
                         (currentYear === refreshedYear && currentMonth === refreshedMonth && currentDay > refreshedDay);
                         
  if (isDifferentDay) {
    import('firebase/firestore').then(async ({ updateDoc, serverTimestamp }) => {
      try {
        await updateDoc(userDocRef, {
          credits: (userData.credits || 0) + 100,
          energy: (userData.energy || 0) + 100,
          dailyRefreshedAt: serverTimestamp()
        });
        showMenuNotification("DAILY REFRESH: +100 Credits & +100 Energy awarded!");
      } catch (err) {
        console.warn("Daily refresh update failed:", err);
      }
    });
  }
}

function showMenuNotification(msg: string, type: 'info' | 'warning' = 'info') {
  const container = document.getElementById('vex-menu-notification-container') || document.createElement('div');
  if (!container.parentElement) {
    container.id = 'vex-menu-notification-container';
    Object.assign(container.style, {
      position: 'absolute',
      top: 'clamp(36px, 5vh, 50px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '4500',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    });
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'mm-glass';
  Object.assign(toast.style, {
    padding: '8px 16px',
    fontFamily: DS.typography.fontFamily,
    fontSize: '12px',
    letterSpacing: '2px',
    color: type === 'warning' ? DS.colors.danger : DS.colors.accent,
    borderLeft: `3px solid ${type === 'warning' ? DS.colors.danger : DS.colors.accent}`,
    boxShadow: DS.glass.glowOuter,
    pointerEvents: 'auto',
    opacity: '0',
    transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
    transform: 'translateY(-20px)'
  });
  toast.textContent = msg.toUpperCase();
  container.appendChild(toast);
  
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function enableLeftColumnMenu(enabled: boolean) {
  const cards = document.querySelectorAll('.mm-new-card');
  cards.forEach(child => {
    const c = child as HTMLElement;
    if (enabled) {
      c.style.pointerEvents = 'auto';
      c.style.opacity = '1';
    } else {
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.3';
    }
  });
}

function showEnlistmentOverlay(db: any, auth: any) {
  let overlay = document.getElementById('vex-enlistment-overlay');
  if (overlay) return;
  
  overlay = document.createElement('div');
  overlay.id = 'vex-enlistment-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '4000',
    background: 'rgba(10, 10, 10, 0.95)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fade-in 400ms ease-out'
  });
  
  const widthContainer = document.createElement('div');
  Object.assign(widthContainer.style, {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  });
  
  const branding = document.createElement('div');
  Object.assign(branding.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '8px'
  });
  const logoStar = document.createElement('div');
  logoStar.textContent = '✧';
  Object.assign(logoStar.style, {
    fontSize: '44px',
    color: DS.colors.accent,
    lineHeight: '1',
    animation: 'pulse 2s infinite ease-in-out'
  });
  branding.appendChild(logoStar);
  
  const word = document.createElement('div');
  word.textContent = 'VEXEΛ SECURE PORTAL';
  Object.assign(word.style, {
    fontFamily: DS.typography.fontFamilyWordmark,
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '6px',
    color: DS.colors.text,
    marginTop: '8px'
  });
  branding.appendChild(word);
  
  const sub = document.createElement('div');
  sub.textContent = 'RESTRICTED SYSTEM ACCESS — REGISTER CODENAME';
  Object.assign(sub.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '11px',
    letterSpacing: '3px',
    color: DS.colors.textMuted,
    marginTop: '4px'
  });
  branding.appendChild(sub);
  widthContainer.appendChild(branding);
  
  const inputGroup = document.createElement('div');
  Object.assign(inputGroup.style, { display: 'flex', flexDirection: 'column', gap: '6px' });
  
  const inputLabel = document.createElement('div');
  inputLabel.textContent = 'CONTRACTOR CODENAME';
  Object.assign(inputLabel.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '11px',
    letterSpacing: '3px',
    color: DS.colors.accent
  });
  inputGroup.appendChild(inputLabel);
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'ENTER CODENAME [3-16 ALPHANUMERIC]';
  Object.assign(input.style, {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: DS.glass.border,
    color: DS.colors.text,
    fontFamily: DS.typography.fontFamily,
    fontSize: '14px',
    letterSpacing: '2px',
    outline: 'none',
    textAlign: 'center'
  });
  input.onfocus = () => { input.style.border = DS.glass.borderAccentFull; };
  input.onblur = () => { input.style.border = DS.glass.border; };
  inputGroup.appendChild(input);
  widthContainer.appendChild(inputGroup);
  
  const factionLabel = document.createElement('div');
  factionLabel.textContent = 'FACTION AFFILIATION [COSMETIC ONLY]';
  Object.assign(factionLabel.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '11px',
    letterSpacing: '3px',
    color: DS.colors.textMuted,
    marginBottom: '-10px'
  });
  widthContainer.appendChild(factionLabel);
  
  const factionsGrid = document.createElement('div');
  Object.assign(factionsGrid.style, {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  });
  
  let selectedFaction: string | null = null;
  
  const vibeCard = document.createElement('div');
  vibeCard.className = 'mm-glass';
  Object.assign(vibeCard.style, {
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 250ms ease'
  });
  vibeCard.innerHTML = `
    <div style="font-family:${DS.typography.fontFamily}; font-size:16px; font-weight:bold; letter-spacing:2px; color:${DS.colors.factions.vibe.primary};">VIBE CO.</div>
    <div style="font-family:${DS.typography.fontFamily}; font-size:9px; letter-spacing:1px; color:${DS.colors.factions.vibe.muted}; margin-top:4px;">SILENT & PRECISE</div>
    <div style="font-family:${DS.typography.fontFamily}; font-size:10px; color:${DS.colors.textMuted}; text-transform:none; margin-top:8px; line-height:1.4;">Corporate infiltrators specialized in speed, stealth, and facility breaches.</div>
  `;
  vibeCard.onclick = () => {
    selectedFaction = 'VIBE CO.';
    vibeCard.style.border = `1px solid ${DS.colors.factions.vibe.primary}`;
    vibeCard.style.boxShadow = `0 0 15px ${DS.colors.factions.vibe.shadow}`;
    slopCard.style.border = DS.glass.border;
    slopCard.style.boxShadow = 'none';
  };
  factionsGrid.appendChild(vibeCard);
  
  const slopCard = document.createElement('div');
  slopCard.className = 'mm-glass';
  Object.assign(slopCard.style, {
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 250ms ease'
  });
  slopCard.innerHTML = `
    <div style="font-family:${DS.typography.fontFamily}; font-size:16px; font-weight:bold; letter-spacing:2px; color:${DS.colors.factions.slop.primary};">SLOP INC.</div>
    <div style="font-family:${DS.typography.fontFamily}; font-size:9px; letter-spacing:1px; color:${DS.colors.factions.slop.muted}; margin-top:4px;">BRUTALIST & UTILITY</div>
    <div style="font-family:${DS.typography.fontFamily}; font-size:10px; color:${DS.colors.textMuted}; text-transform:none; margin-top:8px; line-height:1.4;">Heavy sweeper division specialized in maximum attrition and hardware pacification.</div>
  `;
  slopCard.onclick = () => {
    selectedFaction = 'SLOP INC.';
    slopCard.style.border = `1px solid ${DS.colors.factions.slop.primary}`;
    slopCard.style.boxShadow = `0 0 15px ${DS.colors.factions.slop.shadow}`;
    vibeCard.style.border = DS.glass.border;
    vibeCard.style.boxShadow = 'none';
  };
  factionsGrid.appendChild(slopCard);
  widthContainer.appendChild(factionsGrid);
  
  const errText = document.createElement('div');
  Object.assign(errText.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '11px',
    letterSpacing: '1px',
    color: DS.colors.danger,
    textAlign: 'center',
    height: '14px',
    margin: '-4px 0'
  });
  widthContainer.appendChild(errText);
  
  const enlistBtn = document.createElement('button');
  enlistBtn.textContent = 'ENLIST CONTRACTOR';
  Object.assign(enlistBtn.style, {
    width: '100%',
    padding: '12px',
    background: DS.colors.accent,
    color: DS.colors.background,
    fontFamily: DS.typography.fontFamily,
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 200ms ease'
  });
  
  enlistBtn.onclick = async () => {
    const codename = input.value.trim().toUpperCase();
    if (codename.length < 3 || codename.length > 16) {
      errText.textContent = 'ERROR: CODENAME MUST BE 3 - 16 CHARACTERS';
      return;
    }
    if (!/^[A-Z0-9]+$/.test(codename)) {
      errText.textContent = 'ERROR: ONLY ALPHANUMERIC CHARACTERS ALLOWED';
      return;
    }
    if (!selectedFaction) {
      errText.textContent = 'ERROR: FACTION AFFILIATION REQUIRED';
      return;
    }
    
    enlistBtn.disabled = true;
    enlistBtn.textContent = 'PROCESSING ENLISTMENT...';
    errText.textContent = '';
    
    try {
      await setDoc(doc(db, 'Users', auth.currentUser.uid), {
        displayName: codename,
        faction: selectedFaction,
        credits: 100,
        energy: 100,
        createdAt: serverTimestamp(),
        dailyRefreshedAt: serverTimestamp(),
        
        totalMatches: 0,
        totalWins: 0,
        totalDroneEliminations: 0,
        totalDeaths: 0,
        totalObjectiveTimeHeld: 0,
        totalRevivesPerformed: 0,
        highestIndividualScore: 0,
        winRate: 0,
        score: 0,
        kills: 0,
        battlePass: 1
      });
      showMenuNotification("ENLISTMENT COMPLETE. WELCOME TO VEXEΛ, CONTRACTOR.");
    } catch (e: any) {
      console.warn("Enlistment failed:", e);
      enlistBtn.disabled = false;
      enlistBtn.textContent = 'ENLIST CONTRACTOR';
      errText.textContent = 'ERROR: TRANSACTION REJECTED BY SYSTEM';
    }
  };
  widthContainer.appendChild(enlistBtn);
  widthContainer.appendChild(errText);
  overlay.appendChild(widthContainer);
  
  const menuScreen = document.getElementById('main-menu-screen');
  if (menuScreen) {
    menuScreen.appendChild(overlay);
  }
}

function openSquadFriendsModal() {
  import('../audio').then(({ audioManager }) => audioManager.play('click'));

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', width: '100vw', height: '100vh',
    background: 'rgba(5, 5, 5, 0.85)',
    backdropFilter: 'blur(10px)',
    zIndex: '1000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: DS.typography.fontFamily,
    color: DS.colors.text,
    animation: 'fade-in 0.25s ease-out'
  });

  const container = document.createElement('div');
  Object.assign(container.style, {
    width: 'clamp(320px, 90vw, 540px)',
    background: '#0a0a0a',
    border: `1px solid ${DS.colors.accent}`,
    boxShadow: `0 0 20px rgba(255, 68, 0, 0.25)`,
    padding: 'clamp(16px, 3vh, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderRadius: '4px',
    position: 'relative'
  });

  const closeBtn = document.createElement('div');
  closeBtn.innerHTML = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '12px',
    right: '16px',
    cursor: 'pointer',
    fontSize: '18px',
    color: DS.colors.textMuted,
    transition: 'color 0.2s',
    fontFamily: 'sans-serif'
  });
  closeBtn.onmouseenter = () => { closeBtn.style.color = DS.colors.accent; };
  closeBtn.onmouseleave = () => { closeBtn.style.color = DS.colors.textMuted; };
  closeBtn.onclick = () => {
    import('../audio').then(({ audioManager }) => audioManager.play('click'));
    overlay.remove();
  };
  container.appendChild(closeBtn);

  const title = document.createElement('div');
  title.textContent = 'SQUAD & FRIENDS';
  Object.assign(title.style, {
    fontSize: 'clamp(18px, 3vh, 24px)',
    fontWeight: 'bold',
    letterSpacing: '2px',
    borderBottom: `2px solid ${DS.colors.accent}`,
    paddingBottom: '8px',
    marginBottom: '4px'
  });
  container.appendChild(title);

  let activeTab = 'SQUAD';
  const tabsContainer = document.createElement('div');
  Object.assign(tabsContainer.style, {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '8px'
  });

  const squadTab = document.createElement('div');
  squadTab.textContent = 'MY SQUAD';
  const addTab = document.createElement('div');
  addTab.textContent = 'ADD FRIENDS';

  const styleTab = (tab: HTMLElement, isActive: boolean) => {
    Object.assign(tab.style, {
      cursor: 'pointer',
      fontSize: 'clamp(11px, 1.8vh, 13px)',
      fontWeight: 'bold',
      letterSpacing: '1px',
      color: isActive ? DS.colors.accent : DS.colors.textMuted,
      transition: 'color 0.2s'
    });
  };

  const contentArea = document.createElement('div');
  Object.assign(contentArea.style, {
    minHeight: '240px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  });

  const renderTabContent = () => {
    contentArea.innerHTML = '';
    styleTab(squadTab, activeTab === 'SQUAD');
    styleTab(addTab, activeTab === 'ADD');

    if (activeTab === 'SQUAD') {
      const leaderRow = document.createElement('div');
      Object.assign(leaderRow.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
        padding: '8px 12px',
        borderLeft: `2px solid ${DS.colors.accent}`
      });
      const leaderName = document.createElement('div');
      leaderName.innerHTML = `<span style="color:${DS.colors.accent}; font-weight:bold; margin-right:6px;">[LEADER]</span> ${registeredUserData ? registeredUserData.displayName.toUpperCase() : 'GUEST PLAYER'}`;
      Object.assign(leaderName.style, { fontSize: '13px', letterSpacing: '0.5px' });
      leaderRow.appendChild(leaderName);
      contentArea.appendChild(leaderRow);

      for (let i = 0; i < 3; i++) {
        const slotRow = document.createElement('div');
        Object.assign(slotRow.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)',
          padding: '8px 12px',
          borderLeft: '2px solid rgba(255,255,255,0.05)'
        });

        const memberName = document.createElement('div');
        Object.assign(memberName.style, { fontSize: '13px', letterSpacing: '0.5px' });

        if (squadMembers[i]) {
          memberName.innerHTML = `<span style="color:#FFF; opacity:0.85; font-weight:bold;">${squadMembers[i]}</span>`;
          slotRow.appendChild(memberName);

          const removeBtn = document.createElement('div');
          removeBtn.textContent = 'KICK';
          Object.assign(removeBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: '#ff4444', cursor: 'pointer', padding: '2px 6px', border: '1px solid #ff4444', borderRadius: '2px'
          });
          removeBtn.onclick = () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            squadMembers.splice(i, 1);
            renderTabContent();
          };
          slotRow.appendChild(removeBtn);
        } else {
          memberName.innerHTML = `<span style="color:${DS.colors.textMuted}; opacity:0.5; font-style:italic;">EMPTY SLOT</span>`;
          slotRow.appendChild(memberName);

          const inviteBtn = document.createElement('div');
          inviteBtn.textContent = 'INVITE';
          Object.assign(inviteBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: DS.colors.accent, cursor: 'pointer', padding: '2px 6px', border: `1px solid ${DS.colors.accent}`, borderRadius: '2px'
          });
          inviteBtn.onclick = () => {
            activeTab = 'ADD';
            renderTabContent();
          };
          slotRow.appendChild(inviteBtn);
        }
        contentArea.appendChild(slotRow);
      }

      const deployBtn = document.createElement('div');
      deployBtn.textContent = 'LAUNCH PRIVATE MATCH';
      Object.assign(deployBtn.style, {
        background: DS.colors.accent,
        color: DS.colors.background,
        textAlign: 'center',
        padding: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        marginTop: '12px',
        letterSpacing: '1px',
        transition: 'opacity 0.2s'
      });
      deployBtn.onclick = () => {
        import('../audio').then(({ audioManager }) => audioManager.play('click'));
        overlay.remove();
        const playBtn = document.querySelector('.mm-deploy-btn-glow') as HTMLElement;
        if (playBtn) {
          playBtn.click();
        }
      };
      contentArea.appendChild(deployBtn);
    } else {
      const searchBox = document.createElement('div');
      Object.assign(searchBox.style, {
        display: 'flex', gap: '8px', marginBottom: '8px'
      });
      const input = document.createElement('input');
      input.placeholder = 'ENTER CODENAME...';
      Object.assign(input.style, {
        flex: '1', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '6px 12px', fontSize: '12px', fontFamily: DS.typography.fontFamily, outline: 'none'
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBtn.click();
      });

      const addBtn = document.createElement('div');
      addBtn.textContent = 'ADD';
      Object.assign(addBtn.style, {
        background: DS.colors.accent, color: DS.colors.background, padding: '6px 16px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center'
      });
      addBtn.onclick = () => {
        const val = input.value.trim().toUpperCase();
        if (val) {
          import('../audio').then(({ audioManager }) => audioManager.play('click'));
          if (!friendsList.some(f => f.codename === val)) {
            friendsList.push({ codename: val, status: 'ONLINE' });
          }
          input.value = '';
          renderTabContent();
        }
      };
      searchBox.appendChild(input);
      searchBox.appendChild(addBtn);
      contentArea.appendChild(searchBox);

      const listContainer = document.createElement('div');
      Object.assign(listContainer.style, {
        display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px'
      });

      friendsList.forEach(friend => {
        const friendRow = document.createElement('div');
        Object.assign(friendRow.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)'
        });

        const nameLabel = document.createElement('div');
        const statusColor = friend.status === 'ONLINE' ? '#44ff44' : (friend.status === 'IN-GAME' ? '#ffaa00' : '#888888');
        nameLabel.innerHTML = `<span style="font-weight:bold;">${friend.codename}</span> <span style="font-size:9px; color:${statusColor}; margin-left:6px;">● ${friend.status}</span>`;
        Object.assign(nameLabel.style, { fontSize: '12px' });
        friendRow.appendChild(nameLabel);

        const inviteBtn = document.createElement('div');
        const isAlreadyInSquad = squadMembers.includes(friend.codename);
        inviteBtn.textContent = isAlreadyInSquad ? 'INVITED' : 'INVITE';
        Object.assign(inviteBtn.style, {
          fontSize: '10px',
          fontWeight: 'bold',
          color: isAlreadyInSquad ? '#888888' : DS.colors.accent,
          cursor: isAlreadyInSquad ? 'default' : 'pointer',
          padding: '2px 6px',
          border: `1px solid ${isAlreadyInSquad ? '#444' : DS.colors.accent}`,
          borderRadius: '2px'
        });

        if (!isAlreadyInSquad && friend.status !== 'OFFLINE') {
          inviteBtn.onclick = () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            if (squadMembers.length < 3) {
              squadMembers.push(friend.codename);
              renderTabContent();
            } else {
              alert('SQUAD IS FULL (MAX 4 PLAYERS)');
            }
          };
        }
        friendRow.appendChild(inviteBtn);
        listContainer.appendChild(friendRow);
      });
      contentArea.appendChild(listContainer);
    }
  };

  squadTab.onclick = () => { activeTab = 'SQUAD'; renderTabContent(); };
  addTab.onclick = () => { activeTab = 'ADD'; renderTabContent(); };

  tabsContainer.appendChild(squadTab);
  tabsContainer.appendChild(addTab);
  container.appendChild(tabsContainer);
  container.appendChild(contentArea);
  overlay.appendChild(container);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      import('../audio').then(({ audioManager }) => audioManager.play('click'));
      overlay.remove();
    }
  };

  document.body.appendChild(overlay);
  renderTabContent();
}

