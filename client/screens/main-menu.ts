import * as screenManager from "./screen-manager";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { DS } from "../design-system";
import { IS_DEV } from "../../shared/gates/production.gate";
import { getDevMap, getDefaultMap, MAP_REGISTRY } from "../../shared/maps/map-registry";
import { hasCachedBlob, getCachedOrFetchUrl, ensureAssetsDownloaded, getAssetUrl } from "../asset-cache";
import { EXTENDED_SOUNDS, EXTENDED_TEXTURES } from "./splash";
import offersData from "../data/offers.json";
import catalogData from "../data/catalog.json";
import challengesDataList from "../data/challenges.json";
import { verifyPurchase, verifyClaim, calculateLevelMetrics } from "../../shared/verification/verifier";
import { CatalogItem } from "../../shared/verification/types";
import { ValidatorGate } from "../../shared/gates/validator.gate";
import { renderArmoryScreen } from "./armory-screen";
import { renderStatsScreen } from "./stats-screen";
import { renderFactionScreen } from "./faction-screen";
import { renderStoreScreen } from "./store-screen";
import { StudioPreviewManager } from "../StudioPreviewManager";
import { CLASSES } from "../../shared/classes";
import { resolveDisplayName, sendFriendRequest, getFriendsList, getIncomingRequests, respondToFriendRequest, ensureUsernameMapped, getLobbyInvites, respondToLobbyInvite } from "../social";

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
  { id: 'HARDCORE', label: 'HARDCORE', desc: 'High damage high-stakes combat' },
  { id: 'ARENA', label: 'ARENA', desc: 'Fast-paced close quarters' }
];

let squadMembers: string[] = [];

const cardImages = [
    'update_card_1.webp',
    'infiltration_card_1.webp',
    'intel_card_1.webp',
    'leaderboard_card_1.webp',
    'squad_card_1.webp',
    'promo_rifle_1.webp',
    'promo_pistol_1.webp',
    'promo_shotgun_1.webp',
    'armory_1.webp',
    'faction_1.webp',
    'stats_1.webp',
    'store_1.webp'
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
    return 'infiltration_card_1.webp';
  }
  if (modeId === 'HARDCORE') {
    return 'update_card_1.webp';
  }
  if (modeId === 'ARENA') {
    return 'squad_card_1.webp';
  }
  return 'infiltration_card_1.webp'; // Fallback to infiltration mode image
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
  const db = getFirestore();

  onAuthStateChanged(auth, (user) => {
    if (userSubscriptionUnsubscribe) {
      userSubscriptionUnsubscribe();
      userSubscriptionUnsubscribe = null;
    }

    if (user) {
      const uid = user.uid;
      (window as any).vexPlayerUid = uid;

      userSubscriptionUnsubscribe = onSnapshot(doc(db, 'Users', uid), async (snapshot) => {
        if (snapshot.exists()) {
          registeredUserData = snapshot.data();
          userFaction = registeredUserData.faction || null;

          const overlay = document.getElementById('vex-unified-auth-modal') || document.getElementById('vex-enlistment-overlay');
          if (overlay) overlay.remove();

          checkDailyRefresh(registeredUserData, doc(db, 'Users', uid));
          enableLeftColumnMenu(true);
          if (registeredUserData.displayName) {
            ensureUsernameMapped(uid, registeredUserData.displayName);
          }
        } else {
          if (!user.isAnonymous) {
            const newProfile = {
              displayName: (user.displayName || user.email?.split('@')[0] || 'OPERATIVE').toUpperCase(),
              photoURL: user.photoURL || null,
              email: user.email || null,
              faction: 'VIBE CO.', credits: 100, energy: 100, score: 0, kills: 0, battlePass: 1,
              createdAt: serverTimestamp(), dailyRefreshedAt: serverTimestamp(),
              totalMatches: 0, totalWins: 0, totalDroneEliminations: 0, totalDeaths: 0
            };
            try {
              await setDoc(doc(db, 'Users', uid), newProfile);
              await ensureUsernameMapped(uid, newProfile.displayName);
            } catch (err) {
              console.warn("Auto-provision profile failed:", err);
            }
          } else {
            registeredUserData = null;
            userFaction = null;
            enableLeftColumnMenu(false);
            showEnlistmentOverlay(db, auth);
          }
        }

        updateProfileBox();
        renderRightPanel();
      }, (err) => {
        console.warn("User state subscription failed:", err);
      });
    } else {
      registeredUserData = null;
      userFaction = null;
      enableLeftColumnMenu(false);
      updateProfileBox();
      renderRightPanel();
    }
  });

  let el = document.getElementById('main-menu-screen');
  if (el) el.remove();

  if (!styleInjected) {
    const style = document.createElement('style');
    style.innerHTML = `
      #main-menu-screen * {
        box-sizing: border-box;
      }
      .mm-glass {
        background: rgba(10, 10, 10, 0.85);
        border: ${DS.glass.border};
        border-radius: 0px;
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
    opacity: '0', transition: `opacity ${DS.transitions.panel}`,
    overflow: 'hidden'
  });

  // Create Video Background element
  const videoBg = document.createElement('video');
  videoBg.id = 'main-menu-video-bg';
  videoBg.autoplay = true;
  videoBg.loop = true;
  videoBg.muted = true;
  (videoBg as any).playsInline = true;
  Object.assign(videoBg.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    minWidth: '100%',
    minHeight: '100%',
    width: 'auto',
    height: 'auto',
    transform: 'translate(-50%, -50%)',
    objectFit: 'cover',
    zIndex: '0',
    pointerEvents: 'none',
    display: 'block'
  });

  getCachedOrFetchUrl("main_menu_1.webm", "Video").then(url => {
    videoBg.src = url;
  }).catch(err => {
    console.error("Failed to load main menu video background:", err);
  });

  el.appendChild(videoBg);

  // Create Tab Background Overlay element
  const tabBgOverlay = document.createElement('div');
  tabBgOverlay.id = 'main-menu-tab-bg-overlay';
  Object.assign(tabBgOverlay.style, {
    position: 'absolute',
    inset: '0',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: '1',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)'
  });

  el.appendChild(tabBgOverlay);

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
    gap: 'clamp(10px, 1.6vw, 24px)',
    zIndex: '15',
    flexShrink: '0'
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
      fontSize: 'clamp(11px, 1.2vw, 13px)',
      fontWeight: 'bold',
      letterSpacing: '1.5px',
      color: item.id === 'DEFAULT' ? DS.colors.accent : 'rgba(255, 255, 255, 0.6)',
      cursor: 'pointer',
      padding: '4px 8px',
      borderBottom: item.id === 'DEFAULT' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      transition: 'all 0.2s ease',
      userSelect: 'none',
      whiteSpace: 'nowrap'
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
  profileCenterBox.style.cursor = 'pointer';
  profileCenterBox.onclick = () => openProfileAuthModal();
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
    borderRadius: '0px',
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
    borderRadius: '0px',
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
    background: '#FFFFFF',
    borderRadius: '0px',
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
    borderRadius: '0px',
    lineHeight: '1',
    alignSelf: 'start',
    marginTop: '1px'
  });
  profileInfoCol.appendChild(profileRankBadge);

  profileCenterBox.appendChild(profileInfoCol);

  // Energy & Credits Display stacked vertically
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
  pAddFriends.title = 'Friends';
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

  // Left Group: Wordmark far left, with CR&EN centered in the in-between space
  const leftGroup = document.createElement('div');
  Object.assign(leftGroup.style, {
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    flexBasis: '0',
    minWidth: '0'
  });
  leftGroup.appendChild(wordmark);

  const leftInBetween = document.createElement('div');
  Object.assign(leftInBetween.style, {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '0',
    gap: 'clamp(8px, 1.2vw, 16px)'
  });

  const sepLeft1 = document.createElement('div');
  Object.assign(sepLeft1.style, {
    width: '1px',
    height: '18px',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  leftInBetween.appendChild(sepLeft1);
  leftInBetween.appendChild(crDisplay);

  const sepLeft2 = document.createElement('div');
  Object.assign(sepLeft2.style, {
    width: '1px',
    height: '18px',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  leftInBetween.appendChild(sepLeft2);

  leftGroup.appendChild(leftInBetween);
  topRow.appendChild(leftGroup);

  // Center: Navigation options
  Object.assign(navContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 1.6vw, 24px)',
    zIndex: '15',
    flexShrink: '0'
  });
  topRow.appendChild(navContainer);

  // Right Controls Container: Profile centered in in-between space, Utility far right
  const rightControlsContainer = document.createElement('div');
  Object.assign(rightControlsContainer.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: '1',
    flexBasis: '0',
    minWidth: '0'
  });

  const rightInBetween = document.createElement('div');
  Object.assign(rightInBetween.style, {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '0',
    gap: 'clamp(8px, 1.2vw, 16px)'
  });

  const sepRight1 = document.createElement('div');
  Object.assign(sepRight1.style, {
    width: '1px',
    height: '18px',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  rightInBetween.appendChild(sepRight1);
  rightInBetween.appendChild(profileCenterBox);

  const sepRight2 = document.createElement('div');
  Object.assign(sepRight2.style, {
    width: '1px',
    height: '18px',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  rightInBetween.appendChild(sepRight2);

  rightControlsContainer.appendChild(rightInBetween);
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
            fontWeight: 'bold', textShadow: 'none', borderRadius: '0px', whiteSpace: 'nowrap', lineHeight: '1.2'
        });
        btn.onclick = onClick;
        devContainer.appendChild(btn);
    };

    createDevBtn('DEV QUICK START', (e) => {
        e.stopPropagation();
        const mapId = getDefaultMap().id;
        ensureAssetsDownloaded(() => {
            window.dispatchEvent(new CustomEvent('start-match', { detail: { mode: 'STANDARD', class: CLASSES.ASSAULT.id, solo: true, map: getDefaultMap() }}));
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
    borderRadius: '0px', textAlign: 'center', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.5)', zIndex: '5',
    marginTop: 'auto'
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
          window.dispatchEvent(new CustomEvent('start-match', { detail: { mode: 'STANDARD', class: CLASSES.ASSAULT.id, solo: true, map: getDefaultMap() }}));
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
  const updatesObj = createNewCard('UPDATES', 'update_card_1.webp');
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
  const leaderboardObj = createNewCard('LEADERBOARD', 'leaderboard_card_1.webp');
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
  const intelObj = createNewCard('INTEL', 'intel_card_1.webp');
  const intelCard = intelObj.card;
  intelCard.style.flex = '1';
  intelCard.style.height = '100%';
  intelCard.style.minHeight = '0';
  intelCard.onclick = (e) => {
    e.stopPropagation();
    setActiveCard('INTEL');
  };

  // 4. SQUAD RAID CARD
  const squadRaidObj = createNewCard('SQUAD RAID', 'squad_card_1.webp');
  const squadRaidCard = squadRaidObj.card;
  squadRaidCard.style.flex = '1';
  squadRaidCard.style.height = '100%';
  squadRaidCard.style.minHeight = '0';
  squadRaidCard.onclick = (e) => {
    e.stopPropagation();
    ensureAssetsDownloaded(() => screenManager.showLobby(), getDefaultMap().id);
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
  const storeObj = createNewCard('OFFERS', 'promo_rifle_1.webp');
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
    { image: 'promo_rifle_1.webp', promo: 'M4-HAZARD SKIN: 400 CR' },
    { image: 'promo_pistol_1.webp', promo: 'SILENT ASSASSIN: 350 CR' },
    { image: 'promo_shotgun_1.webp', promo: 'BREACHER SPECIAL: 450 CR' }
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
    boxShadow: '0 0 25px 15px rgba(0, 0, 0, 0.85)', borderRadius: '0px', cursor: 'default',
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
      flex: '1', height: '2px', background: 'rgba(255,255,255,0.15)', borderRadius: '0px', overflow: 'hidden'
    });

    const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
    const barFill = document.createElement('div');
    Object.assign(barFill.style, {
      width: `${pct}%`, height: '100%', background: '#FFFFFF', borderRadius: '0px'
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
    position: 'absolute', top: 'clamp(38px, 6.5vh, 52px)', bottom: 'clamp(12px, 2vh, 24px)', 
    left: 'clamp(12px, 2vw, 24px)', right: 'clamp(12px, 2vw, 24px)', zIndex: '3',
    display: 'none', flexDirection: 'column',
    maxWidth: '1400px', margin: '0 auto',
    background: 'radial-gradient(ellipse at center, rgba(3, 3, 5, 0.98) 0%, rgba(3, 3, 5, 0.85) 65%, rgba(3, 3, 5, 0.3) 85%, rgba(3, 3, 5, 0) 100%)',
    border: 'none',
    borderRadius: '0px',
    padding: 'clamp(10px, 1.8vh, 18px)',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });

  const tabHeaderRow = document.createElement('div');
  Object.assign(tabHeaderRow.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    marginBottom: 'clamp(6px, 1.2vh, 12px)',
    flexShrink: '0'
  });

  const tabTitle = document.createElement('div');
  tabTitle.id = 'dynamic-panel-title';
  Object.assign(tabTitle.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(16px, 2.2vh, 24px)',
    color: DS.colors.text,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textShadow: DS.shadows.text
  });

  const backBtn = document.createElement('div');
  backBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
  Object.assign(backBtn.style, {
    cursor: 'pointer',
    border: 'none',
    borderRadius: '0px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5, 5, 5, 0.92)',
    backdropFilter: 'blur(16px)',
    webkitBackdropFilter: 'blur(16px)',
    color: '#FFFFFF',
    transition: 'all 0.15s ease',
    flexShrink: '0'
  });
  backBtn.onmouseenter = () => {
    backBtn.style.background = 'rgba(25, 25, 25, 0.95)';
    backBtn.style.color = '#FF4500';
  };
  backBtn.onmouseleave = () => {
    backBtn.style.background = 'rgba(5, 5, 5, 0.92)';
    backBtn.style.color = '#FFFFFF';
  };
  backBtn.onclick = () => {
    setActiveCard('DEFAULT');
  };

  tabHeaderRow.appendChild(backBtn);
  tabHeaderRow.appendChild(tabTitle);
  tabContentLayout.appendChild(tabHeaderRow);

  rightPanelContent = document.createElement('div');
  Object.assign(rightPanelContent.style, {
    display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden',
    flex: '1', minHeight: '0', height: '100%'
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
      leaderboardCard.style.backgroundImage = `url('${getAssetUrl('leaderboard_card_1.webp')}')`;
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
    let displayTitle = id;
    if (id === 'DEFAULT') displayTitle = 'INTEL';
    else if (id === 'LOADOUT') displayTitle = 'ARMORY';
    titleEl.textContent = displayTitle;
  }
  
  const mainLayout = document.getElementById('mm-main-layout');
  const tabLayout = document.getElementById('mm-tab-layout');
  
  if (id === 'DEFAULT') {
    if (mainLayout) mainLayout.style.display = 'flex';
    if (tabLayout) tabLayout.style.display = 'none';
  } else {
    if (mainLayout) mainLayout.style.display = 'none';
    if (tabLayout) {
      tabLayout.style.display = 'flex';
      
      if (id === 'LOADOUT') {
        tabLayout.style.background = 'none';
        tabLayout.style.boxShadow = 'none';
        tabLayout.style.backdropFilter = 'none';
        tabLayout.style.setProperty('-webkit-backdrop-filter', 'none');
      } else {
        tabLayout.style.background = 'rgba(3, 3, 5, 0.9)';
        tabLayout.style.boxShadow = '0 0 50px 30px rgba(3, 3, 5, 0.95)';
        tabLayout.style.backdropFilter = 'blur(15px)';
        tabLayout.style.setProperty('-webkit-backdrop-filter', 'blur(15px)');
      }
    }
    
    // Restricted overflow to prevent entire layout vertical scrolling
    if (rightPanelContent) {
      rightPanelContent.style.overflow = 'hidden';
    }

    renderRightPanel();
  }

  // Update background overlays and video playback control
  const tabBgOverlay = document.getElementById('main-menu-tab-bg-overlay');
  const videoBg = document.getElementById('main-menu-video-bg') as HTMLVideoElement | null;

  if (id === 'DEFAULT' || id === 'PLAY') {
    if (tabBgOverlay) {
      tabBgOverlay.style.opacity = '0';
    }
    if (videoBg) {
      videoBg.style.display = 'block';
      videoBg.play().catch(() => {});
    }
  } else {
    let bgFile = '';
    if (id === 'LOADOUT') bgFile = 'armory_1.webp';
    else if (id === 'INTEL') bgFile = 'stats_1.webp';
    else if (id === 'FACTION') bgFile = 'faction_1.webp';
    else if (id === 'STORE') bgFile = 'store_1.webp';

    if (bgFile && tabBgOverlay) {
      tabBgOverlay.style.backgroundImage = `url('${getAssetUrl(bgFile)}')`;
      tabBgOverlay.style.opacity = '1';
      if (videoBg) {
        // Hide and pause video after the cross-fade animation completes to save GPU/CPU cycles
        setTimeout(() => {
          if (currentRightPanelMode !== 'DEFAULT' && currentRightPanelMode !== 'PLAY') {
            videoBg.style.display = 'none';
            videoBg.pause();
          }
        }, 400);
      }
    } else {
      if (tabBgOverlay) {
        tabBgOverlay.style.opacity = '0';
      }
      if (videoBg) {
        videoBg.style.display = 'block';
        videoBg.play().catch(() => {});
      }
    }
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
     rightCol.style.overflow = 'hidden';
  }

  setTimeout(() => {
    rightPanelContent.innerHTML = '';
    
    if (currentRightPanelMode === 'DEFAULT') {
       // Embed 3D Studio Viewport in the Main Menu right panel
       const studioBlock = document.createElement('div');
       studioBlock.id = 'mm-3d-viewport';
       Object.assign(studioBlock.style, {
         width: '100%',
         height: '240px',
         background: '#08080c',
         border: '1px solid rgba(255, 69, 0, 0.4)',
         borderRadius: '0px',
         position: 'relative',
         overflow: 'hidden',
         marginBottom: '12px'
       });
       rightPanelContent.appendChild(studioBlock);

       requestAnimationFrame(() => {
         StudioPreviewManager.attachTo(studioBlock, 'MAIN_MENU');
       });

       rightPanelContent.appendChild(createPanelBlock('INTEL SUMMARY', c => {
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
       }));
       rightPanelContent.appendChild(createPanelBlock('LAST MATCH', c => {
         const lbl = document.createElement('div'); lbl.textContent = 'NO DATA AVAILABLE';
         Object.assign(lbl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(10px, 1.5vh, 14px)', color: DS.colors.textMuted });
         c.appendChild(lbl);
       }, true));
    }
    else if (currentRightPanelMode === 'INTEL') {
      renderStatsScreen(rightPanelContent, registeredUserData);
    }
    else if (currentRightPanelMode === 'LOADOUT') {
      renderArmoryScreen(rightPanelContent);
    }
    else if (currentRightPanelMode === 'FACTION') {
      renderFactionScreen(rightPanelContent, registeredUserData);
    }
    else if (currentRightPanelMode === 'STORE') {
      renderStoreScreen(rightPanelContent, registeredUserData);
    } 
    else if (currentRightPanelMode === 'PLAY') {
      rightPanelContent.style.overflow = 'hidden';

      // Play Tab Content Dashboard
      const playDashboard = document.createElement('div');
      Object.assign(playDashboard.style, {
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 850 ? '1fr' : '1.2fr 1fr 1fr',
        gap: '8px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      });

      // Column 1: Operational Directives Selector
      const leftCol = document.createElement('div');
      Object.assign(leftCol.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: '0'
      });

      const leftTitle = document.createElement('div');
      leftTitle.textContent = 'SELECT OPERATIONAL DIRECTIVE';
      Object.assign(leftTitle.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '8.5px',
        color: DS.colors.textMuted,
        letterSpacing: '1.5px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      });
      leftCol.appendChild(leftTitle);

      const modesContainer = document.createElement('div');
      Object.assign(modesContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: '1',
        minHeight: '0'
      });

      GAME_MODES.forEach(mode => {
        const isSelected = lastChosenGameMode === mode.id;
        const card = document.createElement('div');
        card.className = 'mm-glass';
        Object.assign(card.style, {
          background: isSelected ? 'rgba(255, 69, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)',
          border: isSelected ? `1px solid ${DS.colors.accent}` : '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '0px',
          padding: '6px 10px',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.15s ease-out'
        });

        // Left highlight strip
        const strip = document.createElement('div');
        Object.assign(strip.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '3px',
          background: isSelected ? DS.colors.accent : 'transparent'
        });
        card.appendChild(strip);

        const textGroup = document.createElement('div');
        Object.assign(textGroup.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: '1px'
        });

        const nameEl = document.createElement('div');
        nameEl.textContent = mode.label;
        Object.assign(nameEl.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: '11.5px',
          fontWeight: 'bold',
          color: isSelected ? DS.colors.text : 'rgba(255, 255, 255, 0.6)',
          letterSpacing: '0.8px'
        });

        const descEl = document.createElement('div');
        descEl.textContent = mode.desc.toUpperCase();
        Object.assign(descEl.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: '8px',
          color: isSelected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.5px'
        });

        textGroup.appendChild(nameEl);
        textGroup.appendChild(descEl);
        card.appendChild(textGroup);

        const statusEl = document.createElement('div');
        statusEl.textContent = isSelected ? 'ACTIVE' : 'READY';
        Object.assign(statusEl.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: '7.5px',
          fontWeight: 'bold',
          letterSpacing: '0.8px',
          padding: '2px 6px',
          borderRadius: '0px',
          background: isSelected ? 'rgba(255, 69, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
          color: isSelected ? DS.colors.accent : 'rgba(255, 255, 255, 0.4)',
          border: isSelected ? `1px solid rgba(255, 69, 0, 0.3)` : 'none'
        });
        card.appendChild(statusEl);

        card.onclick = () => {
          lastChosenGameMode = mode.id;
          localStorage.setItem('lastChosenGameMode', mode.id);
          if (playCardTitleEl) {
            playCardTitleEl.textContent = mode.id;
          }
          updatePlayCardBackground();
          import('../audio').then(({ audioManager }) => audioManager.play('click'));
          renderRightPanel();
        };

        modesContainer.appendChild(card);
      });

      leftCol.appendChild(modesContainer);
      playDashboard.appendChild(leftCol);

      // Column 2: Zone & Intelligence Preview
      const centerCol = document.createElement('div');
      Object.assign(centerCol.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: '0'
      });

      const centerTitle = document.createElement('div');
      centerTitle.textContent = 'ZONE INTEL & SECTOR MAP';
      Object.assign(centerTitle.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '8.5px',
        color: DS.colors.textMuted,
        letterSpacing: '1.5px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      });
      centerCol.appendChild(centerTitle);

      const zoneCard = document.createElement('div');
      zoneCard.className = 'mm-glass';
      Object.assign(zoneCard.style, {
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '0px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: '1',
        justifyContent: 'space-between',
        minHeight: '0'
      });

      zoneCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:${DS.typography.fontFamily}; font-size:10px; font-weight:bold; color:${DS.colors.text}; letter-spacing:0.8px;">${getDefaultMap().displayName.toUpperCase()}</span>
          <span style="font-family:${DS.typography.fontFamily}; font-size:7.5px; font-weight:bold; color:#00FF88; background:rgba(0,255,136,0.08); padding:1px 5px; border:1px solid rgba(0,255,136,0.2);">SECURE</span>
        </div>

        <!-- Zone Blueprint Map SVG Preview -->
        <div style="width:100%; height:clamp(60px, 11vh, 90px); background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.06); border-radius:0px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
          <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
            <rect width="200" height="120" fill="#050508"/>
            <path d="M20,20 L180,20 L180,100 L20,100 Z" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 2"/>
            <path d="M50,35 L150,35 L150,85 L50,85 Z" fill="none" stroke="${DS.colors.accent}" stroke-width="1.5"/>
            <line x1="100" y1="20" x2="100" y2="100" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <circle cx="100" cy="60" r="15" fill="none" stroke="${DS.colors.accent}" stroke-width="1"/>
            <circle cx="100" cy="60" r="3" fill="${DS.colors.accent}"/>
            <circle cx="65" cy="45" r="4" fill="#00F0FF"/>
            <circle cx="135" cy="75" r="4" fill="#00FF88"/>
          </svg>
          <div style="position:absolute; bottom:4px; left:6px; font-family:${DS.typography.fontFamily}; font-size:6.5px; color:${DS.colors.textMuted}; letter-spacing:0.8px;">BLUEPRINT v2.1</div>
        </div>
      `;
      centerCol.appendChild(zoneCard);
      playDashboard.appendChild(centerCol);

      // Column 3: Deployment Parameters & Execution
      const rightCol = document.createElement('div');
      Object.assign(rightCol.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: '0'
      });

      const rightTitle = document.createElement('div');
      rightTitle.textContent = 'DEPLOYMENT PARAMETERS';
      Object.assign(rightTitle.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '8.5px',
        color: DS.colors.textMuted,
        letterSpacing: '1.5px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      });
      rightCol.appendChild(rightTitle);

      const paramsCard = document.createElement('div');
      paramsCard.className = 'mm-glass';
      Object.assign(paramsCard.style, {
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '0px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: '1',
        justifyContent: 'space-between',
        minHeight: '0'
      });

      // Match type
      const matchTypeGroup = document.createElement('div');
      Object.assign(matchTypeGroup.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      });

      const matchTypeLabel = document.createElement('div');
      matchTypeLabel.textContent = 'MATCH TYPE';
      Object.assign(matchTypeLabel.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '8px',
        color: DS.colors.textMuted,
        letterSpacing: '1.5px',
        fontWeight: 'bold'
      });
      matchTypeGroup.appendChild(matchTypeLabel);

      const matchTypeToggle = document.createElement('div');
      Object.assign(matchTypeToggle.style, {
        display: 'flex',
        gap: '4px'
      });

      const openBtn = document.createElement('div');
      openBtn.textContent = 'OPEN MATCH';
      Object.assign(openBtn.style, {
        flex: '1',
        textAlign: 'center',
        padding: '6px 3px',
        fontSize: '9px',
        fontWeight: 'bold',
        fontFamily: DS.typography.fontFamily,
        letterSpacing: '0.8px',
        borderRadius: '0px',
        background: 'rgba(255, 69, 0, 0.08)',
        border: `1px solid ${DS.colors.accent}`,
        color: DS.colors.text,
        cursor: 'default'
      });

      const privateBtn = document.createElement('div');
      privateBtn.textContent = 'PRIVATE MATCH';
      Object.assign(privateBtn.style, {
        flex: '1',
        textAlign: 'center',
        padding: '6px 3px',
        fontSize: '9px',
        fontWeight: 'bold',
        fontFamily: DS.typography.fontFamily,
        letterSpacing: '0.8px',
        borderRadius: '0px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.3)',
        cursor: 'not-allowed',
        opacity: '0.6'
      });

      matchTypeToggle.appendChild(openBtn);
      matchTypeToggle.appendChild(privateBtn);
      matchTypeGroup.appendChild(matchTypeToggle);
      paramsCard.appendChild(matchTypeGroup);

      // Contractors indicator
      const contrGroup = document.createElement('div');
      Object.assign(contrGroup.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px 8px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: 'none',
        borderRadius: '0px'
      });

      const contrLabel = document.createElement('div');
      contrLabel.textContent = 'ACTIVE CONTRACTORS IN SECTOR';
      Object.assign(contrLabel.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '8px',
        color: DS.colors.textMuted,
        letterSpacing: '0.8px',
        fontWeight: 'bold'
      });

      const contrValue = document.createElement('div');
      contrValue.textContent = '1 / 10 OPERATIVES';
      Object.assign(contrValue.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: '11px',
        color: DS.colors.text,
        fontWeight: 'bold',
        letterSpacing: '0.5px'
      });

      contrGroup.appendChild(contrLabel);
      contrGroup.appendChild(contrValue);
      paramsCard.appendChild(contrGroup);

      // Deploy Button
      const deployBtn = document.createElement('button');
      deployBtn.textContent = 'DEPLOY TO SECTOR';
      Object.assign(deployBtn.style, {
        width: '100%',
        height: 'clamp(32px, 4.5vh, 42px)',
        background: DS.colors.accent,
        color: DS.colors.background,
        border: 'none',
        fontFamily: DS.typography.fontFamily,
        fontSize: 'clamp(12px, 1.8vh, 15px)',
        fontWeight: DS.typography.weightBold,
        textTransform: 'uppercase',
        cursor: 'pointer',
        borderRadius: '0px',
        transition: 'all 0.15s ease'
      });

      deployBtn.addEventListener('mouseenter', () => {
        deployBtn.style.background = '#FF6347';
      });
      deployBtn.addEventListener('mouseleave', () => {
        deployBtn.style.background = DS.colors.accent;
      });

      deployBtn.onclick = () => {
        if (registeredUserData && (registeredUserData.energy || 0) < 10) {
          showMenuNotification("DEPLOYMENT REJECTED: INSUFFICIENT ENERGY. REFILL DEV CREDITS IN INTEL.", "warning");
          return;
        }
        ensureAssetsDownloaded(() => screenManager.showLobby(), getDefaultMap().id);
      };

      paramsCard.appendChild(deployBtn);
      rightCol.appendChild(paramsCard);
      playDashboard.appendChild(rightCol);

      rightPanelContent.appendChild(playDashboard);
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

export function showMenuNotification(msg: string, type: 'info' | 'warning' = 'info') {
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

function createUnifiedAuthOverlay(db: any, auth: any, defaultTab: 'GUEST' | 'AUTH' = 'GUEST') {
  const existingModal = document.getElementById('vex-unified-auth-modal') || document.getElementById('vex-enlistment-overlay') || document.getElementById('vex-profile-auth-modal');
  if (existingModal) existingModal.remove();

  const user = auth.currentUser;
  let activeTab: 'GUEST' | 'AUTH' = defaultTab;

  const overlay = document.createElement('div');
  overlay.id = 'vex-unified-auth-modal';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '5000',
    background: 'radial-gradient(circle at center, rgba(3, 3, 5, 0.98) 0%, rgba(3, 3, 5, 0.9) 60%, rgba(3, 3, 5, 0.4) 90%, rgba(3, 3, 5, 0) 100%)',
    backdropFilter: 'blur(15px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
    fontFamily: DS.typography.fontFamily, color: DS.colors.text,
    overflowY: 'auto'
  });

  const box = document.createElement('div');
  box.className = 'mm-glass';
  Object.assign(box.style, {
    width: 'min(92vw, 680px)',
    maxHeight: '90vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(6, 6, 9, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.25)`,
    boxShadow: '0 0 35px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 69, 0, 0.15)',
    padding: '20px 20px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderRadius: '0px',
    boxSizing: 'border-box'
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute', top: '14px', right: '16px',
    background: 'none', border: 'none', color: DS.colors.textMuted,
    fontSize: '18px', cursor: 'pointer', zIndex: '10'
  });
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);

  // Header Branding
  const branding = document.createElement('div');
  Object.assign(branding.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
  });

  const word = document.createElement('div');
  word.textContent = 'VEXEΛ SECURE PORTAL';
  Object.assign(word.style, {
    fontFamily: DS.typography.fontFamilyWordmark,
    fontSize: '20px', fontWeight: '800', letterSpacing: '5px',
    color: DS.colors.accent
  });
  branding.appendChild(word);

  const sub = document.createElement('div');
  sub.textContent = 'RESTRICTED SYSTEM ACCESS — OPERATIVE IDENTIFICATION';
  Object.assign(sub.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '10px', letterSpacing: '2px', color: DS.colors.textMuted, marginTop: '2px'
  });
  branding.appendChild(sub);
  box.appendChild(branding);

  // Mode Switcher Tabs
  const navRow = document.createElement('div');
  Object.assign(navRow.style, {
    display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', gap: '4px', marginTop: '4px'
  });

  const tabGuestBtn = document.createElement('button');
  const tabAuthBtn = document.createElement('button');

  const updateTabStyles = () => {
    Object.assign(tabGuestBtn.style, {
      flex: '1', padding: '10px', background: 'none', border: 'none',
      borderBottom: activeTab === 'GUEST' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      color: activeTab === 'GUEST' ? DS.colors.text : DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold',
      letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s'
    });
    tabGuestBtn.textContent = '1. GUEST ENLISTMENT';

    Object.assign(tabAuthBtn.style, {
      flex: '1', padding: '10px', background: 'none', border: 'none',
      borderBottom: activeTab === 'AUTH' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      color: activeTab === 'AUTH' ? DS.colors.text : DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold',
      letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s'
    });
    tabAuthBtn.textContent = '2. ACCOUNT ACCESS';
  };

  navRow.appendChild(tabGuestBtn);
  navRow.appendChild(tabAuthBtn);
  box.appendChild(navRow);

  const contentContainer = document.createElement('div');
  Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '14px' });
  box.appendChild(contentContainer);

  let pendingAuthAction: (() => Promise<void>) | null = null;

  const renderContent = () => {
    updateTabStyles();
    contentContainer.innerHTML = '';

    if (activeTab === 'GUEST') {
      if (registeredUserData && registeredUserData.displayName) {
        const activeCard = document.createElement('div');
        activeCard.className = 'mm-glass';
        Object.assign(activeCard.style, {
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
          borderLeft: `3px solid ${DS.colors.accent}`
        });
        activeCard.innerHTML = `
          <div style="font-size:10px; color:${DS.colors.accent}; letter-spacing:2px; font-weight:bold;">ACTIVE GUEST SESSION</div>
          <div style="font-size:16px; font-weight:bold; letter-spacing:2px; color:${DS.colors.text};">${registeredUserData.displayName}</div>
          <div style="font-size:11px; color:${DS.colors.textMuted};">FACTION: <span style="color:#FFF;">${registeredUserData.faction || 'UNAFFILIATED'}</span></div>
          <div style="font-size:10px; color:${DS.colors.textMuted}; line-height:1.4; margin-top:4px;">
            You are logged in under a guest session. Progress is saved locally. Switch to the Account Access tab to link a permanent Google or Email account.
          </div>
        `;
        contentContainer.appendChild(activeCard);
      } else {
        // Enlistment form
        const inputGroup = document.createElement('div');
        Object.assign(inputGroup.style, { display: 'flex', flexDirection: 'column', gap: '6px' });
        
        const inputLabel = document.createElement('div');
        inputLabel.textContent = 'CONTRACTOR CODENAME';
        Object.assign(inputLabel.style, {
          fontSize: '11px', letterSpacing: '2px', color: DS.colors.accent
        });
        inputGroup.appendChild(inputLabel);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ENTER CODENAME [3-16 ALPHANUMERIC]';
        Object.assign(input.style, {
          width: '100%', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.5)',
          border: DS.glass.border, color: DS.colors.text, fontFamily: DS.typography.fontFamily,
          fontSize: '13px', letterSpacing: '2px', outline: 'none', textAlign: 'center',
          boxSizing: 'border-box'
        });
        inputGroup.appendChild(input);
        contentContainer.appendChild(inputGroup);

        const factionLabel = document.createElement('div');
        factionLabel.textContent = 'FACTION AFFILIATION';
        Object.assign(factionLabel.style, {
          fontSize: '11px', letterSpacing: '2px', color: DS.colors.textMuted
        });
        contentContainer.appendChild(factionLabel);

        const factionsGrid = document.createElement('div');
        Object.assign(factionsGrid.style, {
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'
        });

        let selectedFaction: string | null = null;

        const vibeCard = document.createElement('div');
        vibeCard.className = 'mm-glass';
        Object.assign(vibeCard.style, {
          padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', transition: 'all 200ms ease'
        });
        vibeCard.innerHTML = `
          <div style="font-size:14px; font-weight:bold; letter-spacing:1px; color:${DS.colors.factions.vibe.primary};">VIBE CO.</div>
          <div style="font-size:9px; letter-spacing:1px; color:${DS.colors.factions.vibe.muted}; margin-top:2px;">SILENT & PRECISE</div>
        `;
        vibeCard.onclick = () => {
          selectedFaction = 'VIBE CO.';
          vibeCard.style.border = `1px solid ${DS.colors.factions.vibe.primary}`;
          slopCard.style.border = DS.glass.border;
        };

        const slopCard = document.createElement('div');
        slopCard.className = 'mm-glass';
        Object.assign(slopCard.style, {
          padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', transition: 'all 200ms ease'
        });
        slopCard.innerHTML = `
          <div style="font-size:14px; font-weight:bold; letter-spacing:1px; color:${DS.colors.factions.slop.primary};">SLOP INC.</div>
          <div style="font-size:9px; letter-spacing:1px; color:${DS.colors.factions.slop.muted}; margin-top:2px;">BRUTALIST & UTILITY</div>
        `;
        slopCard.onclick = () => {
          selectedFaction = 'SLOP INC.';
          slopCard.style.border = `1px solid ${DS.colors.factions.slop.primary}`;
          vibeCard.style.border = DS.glass.border;
        };

        factionsGrid.appendChild(vibeCard);
        factionsGrid.appendChild(slopCard);
        contentContainer.appendChild(factionsGrid);

        const errText = document.createElement('div');
        Object.assign(errText.style, {
          fontSize: '11px', color: DS.colors.danger, textAlign: 'center', height: '14px'
        });
        contentContainer.appendChild(errText);

        const enlistBtn = document.createElement('button');
        enlistBtn.textContent = 'ENLIST AS GUEST';
        Object.assign(enlistBtn.style, {
          width: '100%', padding: '12px', background: DS.colors.accent, color: DS.colors.background,
          fontFamily: DS.typography.fontFamily, fontSize: '14px', fontWeight: 'bold',
          letterSpacing: '2px', border: 'none', cursor: 'pointer'
        });

        enlistBtn.onclick = async () => {
          const codename = input.value.trim().toUpperCase();
          if (codename.length < 3 || codename.length > 16 || !/^[A-Z0-9]+$/.test(codename)) {
            errText.textContent = 'ERROR: CODENAME MUST BE 3-16 ALPHANUMERIC CHARS';
            return;
          }
          if (!selectedFaction) {
            errText.textContent = 'ERROR: FACTION AFFILIATION REQUIRED';
            return;
          }
          enlistBtn.disabled = true;
          enlistBtn.textContent = 'PROCESSING...';
          try {
            if (!auth.currentUser) {
              const { signInAnonymously } = await import('firebase/auth');
              await signInAnonymously(auth);
            }
            const uid = auth.currentUser.uid;
            const docData = {
              displayName: codename,
              faction: selectedFaction,
              credits: 100, energy: 100,
              createdAt: serverTimestamp(), dailyRefreshedAt: serverTimestamp(),
              totalMatches: 0, totalWins: 0, totalDroneEliminations: 0, totalDeaths: 0,
              score: 0, kills: 0, battlePass: 1
            };
            await setDoc(doc(db, 'Users', uid), docData);
            await ensureUsernameMapped(uid, codename);
            registeredUserData = docData;
            showMenuNotification("ENLISTMENT COMPLETE. WELCOME TO VEXEΛ.");
            overlay.remove();
          } catch (e: any) {
            console.warn("Enlistment failed:", e);
            enlistBtn.disabled = false;
            enlistBtn.textContent = 'ENLIST AS GUEST';
            errText.textContent = 'ERROR: TRANSACTION REJECTED BY SYSTEM';
          }
        };
        contentContainer.appendChild(enlistBtn);
      }
    } else {
      // Tab AUTH
      if (pendingAuthAction) {
        // Confirmation prompt for guest progress overwrite
        const warnBox = document.createElement('div');
        warnBox.className = 'mm-glass';
        Object.assign(warnBox.style, {
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
          border: `1px solid ${DS.colors.accent}`, background: 'rgba(255, 68, 0, 0.08)'
        });
        warnBox.innerHTML = `
          <div style="font-size:12px; font-weight:bold; color:${DS.colors.accent}; letter-spacing:1px;">⚠️ OVERWRITE GUEST SESSION WARNING</div>
          <div style="font-size:11px; color:${DS.colors.text}; line-height:1.5;">
            Logging into an existing account will end your current guest session <strong style="color:${DS.colors.accent}">${registeredUserData?.displayName || 'GUEST'}</strong> and discard unlinked progress.
          </div>
          <div style="font-size:10px; color:${DS.colors.textMuted};">Are you sure you want to proceed with account authentication?</div>
        `;

        const warnBtnRow = document.createElement('div');
        Object.assign(warnBtnRow.style, { display: 'flex', gap: '10px' });

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'YES, LOG IN NOW';
        Object.assign(confirmBtn.style, {
          flex: '1', padding: '10px', background: DS.colors.accent, color: DS.colors.background,
          fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer'
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'CANCEL';
        Object.assign(cancelBtn.style, {
          flex: '1', padding: '10px', background: 'rgba(255,255,255,0.1)', color: DS.colors.text,
          fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold', border: DS.glass.border, cursor: 'pointer'
        });

        confirmBtn.onclick = async () => {
          const action = pendingAuthAction;
          pendingAuthAction = null;
          if (action) await action();
        };

        cancelBtn.onclick = () => {
          pendingAuthAction = null;
          renderContent();
        };

        warnBtnRow.appendChild(confirmBtn);
        warnBtnRow.appendChild(cancelBtn);
        warnBox.appendChild(warnBtnRow);
        contentContainer.appendChild(warnBox);
        return;
      }

      // Status box
      const statusBox = document.createElement('div');
      statusBox.className = 'mm-glass';
      Object.assign(statusBox.style, { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' });
      const currentUid = user ? user.uid : 'NOT_LOGGED_IN';
      const isAnon = user ? user.isAnonymous : true;
      const authProvider = isAnon ? 'GUEST SESSION' : (user?.providerData[0]?.providerId || 'EMAIL / PASSWORD');
      statusBox.innerHTML = `
        <div style="font-size:10px; color:${DS.colors.textMuted}; letter-spacing:1px;">CURRENT USER IDENTIFIER</div>
        <div style="font-size:11px; font-weight:bold; color:${DS.colors.text}; font-family:monospace; word-break:break-all;">${currentUid}</div>
        <div style="font-size:10px; color:${DS.colors.accent}; font-weight:bold; margin-top:2px;">PROVIDER: ${authProvider.toUpperCase()}</div>
      `;
      contentContainer.appendChild(statusBox);

      // Google Auth button
      const googleBtn = document.createElement('button');
      googleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:8px;"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/></svg>
        SIGN IN WITH GOOGLE
      `;
      Object.assign(googleBtn.style, {
        width: '100%', padding: '11px', background: '#FFFFFF', color: '#000000',
        fontFamily: DS.typography.fontFamily, fontSize: '12px', fontWeight: 'bold',
        border: 'none', borderRadius: '0px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      });

      const execGoogleAuth = async () => {
        try {
          const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();
          const credential = await signInWithPopup(auth, provider);
          const loggedUser = credential.user;

          (window as any).vexPlayerUid = loggedUser.uid;
          const userRef = doc(db, 'Users', loggedUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              displayName: (loggedUser.displayName || loggedUser.email?.split('@')[0] || 'OPERATIVE').toUpperCase(),
              photoURL: loggedUser.photoURL || null,
              email: loggedUser.email || null,
              faction: 'VIBE CO.', credits: 100, energy: 100, score: 0, kills: 0, battlePass: 1,
              createdAt: serverTimestamp(), dailyRefreshedAt: serverTimestamp(),
              totalMatches: 0, totalWins: 0, totalDroneEliminations: 0, totalDeaths: 0
            });
          }
          showMenuNotification(`SIGNED IN AS ${(loggedUser.displayName || loggedUser.email || 'OPERATIVE').toUpperCase()}`);
          overlay.remove();
        } catch (err: any) {
          console.warn("Google Auth error:", err);
          showMenuNotification(`SIGN IN ERROR: ${err?.message || 'Unable to authenticate'}`, "warning");
        }
      };

      googleBtn.onclick = () => {
        if (auth.currentUser?.isAnonymous && registeredUserData?.displayName) {
          pendingAuthAction = execGoogleAuth;
          renderContent();
        } else {
          execGoogleAuth();
        }
      };
      contentContainer.appendChild(googleBtn);

      const divOr = document.createElement('div');
      divOr.textContent = '— OR USE EMAIL / PASSWORD —';
      Object.assign(divOr.style, { fontSize: '10px', color: DS.colors.textMuted, textAlign: 'center' });
      contentContainer.appendChild(divOr);

      const emailInput = document.createElement('input');
      emailInput.type = 'email'; emailInput.placeholder = 'EMAIL ADDRESS';
      Object.assign(emailInput.style, {
        width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: DS.glass.border,
        color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: '12px', outline: 'none', boxSizing: 'border-box'
      });

      const passInput = document.createElement('input');
      passInput.type = 'password'; passInput.placeholder = 'PASSWORD';
      Object.assign(passInput.style, {
        width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: DS.glass.border,
        color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: '12px', outline: 'none', boxSizing: 'border-box'
      });

      contentContainer.appendChild(emailInput);
      contentContainer.appendChild(passInput);

      const btnRow = document.createElement('div');
      Object.assign(btnRow.style, { display: 'flex', gap: '8px' });

      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'EMAIL LOGIN';
      Object.assign(loginBtn.style, {
        flex: '1', padding: '10px', background: DS.colors.accent, color: DS.colors.background,
        fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer'
      });

      const execEmailLogin = async () => {
        const email = emailInput.value.trim();
        const pass = passInput.value;

        const emailCheck = ValidatorGate.validate('email', email);
        if (!emailCheck.isValid) {
          showMenuNotification(emailCheck.error || "INVALID EMAIL FORMAT", "warning");
          return;
        }

        const passCheck = ValidatorGate.validate('password', pass);
        if (!passCheck.isValid) {
          showMenuNotification(passCheck.error || "INVALID PASSWORD FORMAT", "warning");
          return;
        }

        try {
          const { signInWithEmailAndPassword } = await import('firebase/auth');
          await signInWithEmailAndPassword(auth, emailCheck.sanitizedValue, pass);
          showMenuNotification("EMAIL LOGIN SUCCESSFUL");
          overlay.remove();
        } catch (e: any) {
          console.warn("Email login failed:", e);
          showMenuNotification("Authentication Error: Invalid credentials.", "warning");
        }
      };

      loginBtn.onclick = () => {
        if (auth.currentUser?.isAnonymous && registeredUserData?.displayName) {
          pendingAuthAction = execEmailLogin;
          renderContent();
        } else {
          execEmailLogin();
        }
      };

      const registerBtn = document.createElement('button');
      registerBtn.textContent = 'CREATE ACCOUNT';
      Object.assign(registerBtn.style, {
        flex: '1', padding: '10px', background: 'rgba(255,255,255,0.1)', color: DS.colors.text,
        fontFamily: DS.typography.fontFamily, fontSize: '11px', fontWeight: 'bold', border: DS.glass.border, cursor: 'pointer'
      });

      const execCreateAccount = async () => {
        const email = emailInput.value.trim();
        const pass = passInput.value;

        const emailCheck = ValidatorGate.validate('email', email);
        if (!emailCheck.isValid) {
          showMenuNotification(emailCheck.error || "INVALID EMAIL FORMAT", "warning");
          return;
        }

        const passCheck = ValidatorGate.validate('password', pass);
        if (!passCheck.isValid) {
          showMenuNotification(passCheck.error || "INVALID PASSWORD FORMAT", "warning");
          return;
        }

        try {
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          const guestData = registeredUserData;
          const cred = await createUserWithEmailAndPassword(auth, emailCheck.sanitizedValue, pass);
          const userRef = doc(db, 'Users', cred.user.uid);
          
          const newDisplayName = (emailCheck.sanitizedValue.split('@')[0] || 'OPERATIVE').toUpperCase();
          
          // Preserve guest progress seamlessly during signup
          await setDoc(userRef, {
            displayName: newDisplayName,
            email: emailCheck.sanitizedValue,
            faction: guestData?.faction || 'VIBE CO.',
            credits: guestData?.credits ?? 100,
            energy: guestData?.energy ?? 100,
            score: guestData?.score ?? 0,
            kills: guestData?.kills ?? 0,
            battlePass: guestData?.battlePass ?? 1,
            createdAt: serverTimestamp(),
            dailyRefreshedAt: serverTimestamp(),
            totalMatches: guestData?.totalMatches ?? 0,
            totalWins: guestData?.totalWins ?? 0,
            totalDroneEliminations: guestData?.totalDroneEliminations ?? 0,
            totalDeaths: guestData?.totalDeaths ?? 0
          });
          await ensureUsernameMapped(cred.user.uid, newDisplayName);
          showMenuNotification("NEW ACCOUNT CREATED — PROGRESS LINKED");
          overlay.remove();
        } catch (e: any) {
          console.warn("Account creation failed:", e);
          showMenuNotification(`Account Creation Error: ${e?.message || 'Failed to create account'}`, "warning");
        }
      };

      // Creating an account directly registers without false guest loss warning
      registerBtn.onclick = () => {
        execCreateAccount();
      };

      btnRow.appendChild(loginBtn);
      btnRow.appendChild(registerBtn);
      contentContainer.appendChild(btnRow);

      if (user && !user.isAnonymous) {
        const signOutBtn = document.createElement('button');
        signOutBtn.textContent = 'SIGN OUT OF ACCOUNT';
        Object.assign(signOutBtn.style, {
          width: '100%', padding: '10px', background: 'rgba(255, 68, 0, 0.15)',
          border: '1px solid #FF4400', color: '#FF4400', fontFamily: DS.typography.fontFamily,
          fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px'
        });
        signOutBtn.onclick = async () => {
          await auth.signOut();
          showMenuNotification("SIGNED OUT");
          overlay.remove();
        };
        contentContainer.appendChild(signOutBtn);
      }

      if (IS_DEV) {
        const devWipeBtn = document.createElement('button');
        devWipeBtn.textContent = '[DEV] WIPE GUEST & RESET ONBOARDING';
        Object.assign(devWipeBtn.style, {
          width: '100%', padding: '10px', background: DS.colors.danger,
          border: 'none', color: '#FFFFFF', fontFamily: DS.typography.fontFamily,
          fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
        });
        devWipeBtn.onclick = async () => {
          if (auth) {
            try {
              await auth.signOut();
            } catch (e) {
              console.warn("SignOut error during dev wipe:", e);
            }
          }
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        };
        contentContainer.appendChild(devWipeBtn);
      }
    }
  };

  tabGuestBtn.onclick = () => { activeTab = 'GUEST'; renderContent(); };
  tabAuthBtn.onclick = () => { activeTab = 'AUTH'; renderContent(); };

  renderContent();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showEnlistmentOverlay(db: any, auth: any) {
  const splashEl = document.getElementById('splash-screen');
  const isSplashActive = splashEl && splashEl.style.display !== 'none' && splashEl.style.opacity !== '0';
  if ((window as any).interactionStarted && !isSplashActive) {
    if (!document.getElementById('vex-unified-auth-modal')) {
      createUnifiedAuthOverlay(db, auth, 'GUEST');
    }
  }
}

export function openProfileAuthModal() {
  const auth = getAuth();
  const db = getFirestore();
  createUnifiedAuthOverlay(db, auth, 'AUTH');
}

function openSquadFriendsModal() {
  import('../audio').then(({ audioManager }) => audioManager.play('click'));

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', width: '100vw', height: '100vh',
    background: 'radial-gradient(circle at center, rgba(3, 3, 5, 0.98) 0%, rgba(3, 3, 5, 0.9) 60%, rgba(3, 3, 5, 0.4) 90%, rgba(3, 3, 5, 0) 100%)',
    backdropFilter: 'blur(15px)',
    zIndex: '4000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: DS.typography.fontFamily,
    color: DS.colors.text,
    animation: 'fade-in 0.25s ease-out'
  });

  const container = document.createElement('div');
  container.className = 'mm-glass';
  Object.assign(container.style, {
    width: 'min(92vw, 720px)',
    maxHeight: '90vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'linear-gradient(180deg, rgba(12, 12, 15, 0.98) 0%, rgba(6, 6, 8, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.25)`,
    padding: '20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderRadius: '0px',
    position: 'relative',
    boxSizing: 'border-box'
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
  title.textContent = 'FRIENDS MANAGER';
  Object.assign(title.style, {
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    borderBottom: `2px solid ${DS.colors.accent}`,
    paddingBottom: '6px',
    color: DS.colors.text
  });
  container.appendChild(title);

  let activeTab = 'FRIENDS';
  const tabsContainer = document.createElement('div');
  Object.assign(tabsContainer.style, {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '6px'
  });

  const friendsTab = document.createElement('div');
  friendsTab.textContent = 'MY FRIENDS';
  const addTab = document.createElement('div');
  addTab.textContent = 'ADD FRIENDS';
  const requestsTab = document.createElement('div');
  requestsTab.textContent = 'INCOMING REQUESTS';

  const styleTab = (tab: HTMLElement, isActive: boolean) => {
    Object.assign(tab.style, {
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      color: isActive ? DS.colors.accent : DS.colors.textMuted,
      transition: 'color 0.2s'
    });
  };

  const contentArea = document.createElement('div');
  Object.assign(contentArea.style, {
    flex: '1',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden'
  });

  const renderTabContent = () => {
    contentArea.innerHTML = '';
    styleTab(friendsTab, activeTab === 'FRIENDS');
    styleTab(addTab, activeTab === 'ADD');
    styleTab(requestsTab, activeTab === 'REQUESTS');

    if (activeTab === 'FRIENDS') {
      const listContainer = document.createElement('div');
      Object.assign(listContainer.style, {
        display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px'
      });

      const refreshFriendsList = async () => {
        listContainer.innerHTML = '';
        const auth = getAuth();
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        if (!myUid) {
          const emptyLabel = document.createElement('div');
          emptyLabel.textContent = 'MUST BE SIGNED IN TO VIEW FRIENDS';
          Object.assign(emptyLabel.style, { fontSize: '11px', color: DS.colors.textMuted, fontStyle: 'italic', padding: '6px 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        const friendsList = await getFriendsList(myUid);
        const accepted = friendsList.filter(f => f.status === 'accepted');
        if (accepted.length === 0) {
          const emptyLabel = document.createElement('div');
          emptyLabel.textContent = 'NO FRIENDS ADDED YET';
          Object.assign(emptyLabel.style, { fontSize: '11px', color: DS.colors.textMuted, fontStyle: 'italic', padding: '6px 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        accepted.forEach(friend => {
          const friendRow = document.createElement('div');
          Object.assign(friendRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${DS.colors.accent}`
          });

          const friendName = friend.displayName || friend.codename || friend.uid;
          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold; font-size:13px;">${friendName}</span> <span style="font-size:9px; color:#44ff44; margin-left:8px;">● ONLINE</span>`;
          friendRow.appendChild(nameLabel);
          listContainer.appendChild(friendRow);
        });
      };

      refreshFriendsList();
      contentArea.appendChild(listContainer);
    } else if (activeTab === 'REQUESTS') {
      const listContainer = document.createElement('div');
      Object.assign(listContainer.style, {
        display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px'
      });

      const refreshIncomingRequestsList = async () => {
        listContainer.innerHTML = '';
        const auth = getAuth();
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        if (!myUid) return;

        const [incomingList, lobbyInvitesList] = await Promise.all([
          getIncomingRequests(myUid),
          getLobbyInvites(myUid)
        ]);

        if (incomingList.length === 0 && lobbyInvitesList.length === 0) {
          const emptyLabel = document.createElement('div');
          emptyLabel.textContent = 'NO PENDING INCOMING REQUESTS OR LOBBY INVITES';
          Object.assign(emptyLabel.style, { fontSize: '11px', color: DS.colors.textMuted, fontStyle: 'italic', padding: '6px 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        const dbInstance = getFirestore();

        for (const req of incomingList) {
          const reqRow = document.createElement('div');
          Object.assign(reqRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)'
          });

          let senderName = req.senderUid;
          try {
            const userDoc = await getDoc(doc(dbInstance, "Users", req.senderUid));
            if (userDoc.exists() && userDoc.data()?.displayName) {
              senderName = userDoc.data().displayName;
            }
          } catch (e) {}

          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold;">${senderName}</span> <span style="font-size:9px; color:#ffaa00; margin-left:6px;">● FRIEND REQUEST</span>`;
          Object.assign(nameLabel.style, { fontSize: '12px' });
          reqRow.appendChild(nameLabel);

          const actionsContainer = document.createElement('div');
          Object.assign(actionsContainer.style, { display: 'flex', gap: '6px' });

          const acceptBtn = document.createElement('div');
          acceptBtn.textContent = 'ACCEPT';
          Object.assign(acceptBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: '#44ff44', cursor: 'pointer', padding: '2px 6px', border: '1px solid #44ff44', borderRadius: '0px'
          });
          acceptBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            await respondToFriendRequest(myUid, req.senderUid, true);
            refreshIncomingRequestsList();
          };

          const declineBtn = document.createElement('div');
          declineBtn.textContent = 'DECLINE';
          Object.assign(declineBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: '#ff4444', cursor: 'pointer', padding: '2px 6px', border: '1px solid #ff4444', borderRadius: '0px'
          });
          declineBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            await respondToFriendRequest(myUid, req.senderUid, false);
            refreshIncomingRequestsList();
          };

          actionsContainer.appendChild(acceptBtn);
          actionsContainer.appendChild(declineBtn);
          reqRow.appendChild(actionsContainer);
          listContainer.appendChild(reqRow);
        }

        for (const invite of lobbyInvitesList) {
          const inviteRow = document.createElement('div');
          Object.assign(inviteRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,69,0,0.05)', borderLeft: `2px solid ${DS.colors.accent}`
          });

          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold;">${invite.fromName}</span> <span style="font-size:9px; color:${DS.colors.accent}; margin-left:6px;">● LOBBY INVITE</span>`;
          Object.assign(nameLabel.style, { fontSize: '12px' });
          inviteRow.appendChild(nameLabel);

          const actionsContainer = document.createElement('div');
          Object.assign(actionsContainer.style, { display: 'flex', gap: '6px' });

          const acceptBtn = document.createElement('div');
          acceptBtn.textContent = 'JOIN LOBBY';
          Object.assign(acceptBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: '#44ff44', cursor: 'pointer', padding: '2px 6px', border: '1px solid #44ff44', borderRadius: '0px'
          });
          acceptBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            overlay.remove();
            await respondToLobbyInvite(myUid, invite.lobbyId, true);
          };

          const declineBtn = document.createElement('div');
          declineBtn.textContent = 'DECLINE';
          Object.assign(declineBtn.style, {
            fontSize: '10px', fontWeight: 'bold', color: '#ff4444', cursor: 'pointer', padding: '2px 6px', border: '1px solid #ff4444', borderRadius: '0px'
          });
          declineBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            await respondToLobbyInvite(myUid, invite.lobbyId, false);
            refreshIncomingRequestsList();
          };

          actionsContainer.appendChild(acceptBtn);
          actionsContainer.appendChild(declineBtn);
          inviteRow.appendChild(actionsContainer);
          listContainer.appendChild(inviteRow);
        }
      };

      refreshIncomingRequestsList();
      contentArea.appendChild(listContainer);
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

      const addBtn = document.createElement('div');
      addBtn.textContent = 'ADD';
      Object.assign(addBtn.style, {
        background: DS.colors.accent, color: DS.colors.background, padding: '6px 16px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center'
      });

      const feedbackMsg = document.createElement('div');
      Object.assign(feedbackMsg.style, {
        fontSize: '11px', marginBottom: '8px', minHeight: '14px'
      });

      const handleAddFriend = async () => {
        const rawName = input.value.trim();
        if (!rawName) return;

        import('../audio').then(({ audioManager }) => audioManager.play('click'));

        const auth = getAuth();
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        if (!myUid) {
          feedbackMsg.style.color = DS.colors.danger;
          feedbackMsg.textContent = 'MUST BE SIGNED IN TO SEND FRIEND REQUESTS';
          return;
        }

        feedbackMsg.style.color = DS.colors.textMuted;
        feedbackMsg.textContent = 'LOOKING UP CODENAME...';

        const { uid: resolvedUid, error: resolveError } = await resolveDisplayName(rawName);
        if (!resolvedUid) {
          feedbackMsg.style.color = DS.colors.danger;
          feedbackMsg.textContent = resolveError || 'No user found with that name';
          return;
        }

        feedbackMsg.style.color = DS.colors.textMuted;
        feedbackMsg.textContent = 'SENDING FRIEND REQUEST...';

        const sendRes = await sendFriendRequest(myUid, resolvedUid);
        if (sendRes.success) {
          feedbackMsg.style.color = '#44ff44';
          feedbackMsg.textContent = 'FRIEND REQUEST SENT!';
          input.value = '';
        } else {
          feedbackMsg.style.color = DS.colors.danger;
          feedbackMsg.textContent = sendRes.error || 'Failed to send friend request';
        }
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddFriend();
      });
      addBtn.onclick = () => handleAddFriend();

      searchBox.appendChild(input);
      searchBox.appendChild(addBtn);
      contentArea.appendChild(searchBox);
      contentArea.appendChild(feedbackMsg);
    }
  };

  friendsTab.onclick = () => { activeTab = 'FRIENDS'; renderTabContent(); };
  addTab.onclick = () => { activeTab = 'ADD'; renderTabContent(); };
  requestsTab.onclick = () => { activeTab = 'REQUESTS'; renderTabContent(); };

  tabsContainer.appendChild(friendsTab);
  tabsContainer.appendChild(addTab);
  tabsContainer.appendChild(requestsTab);
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

if (typeof window !== 'undefined') {
  window.addEventListener('show-main-menu', () => {
    renderRightPanel();
    const auth = getAuth();
    const db = getFirestore();
    if (auth.currentUser && auth.currentUser.isAnonymous && !registeredUserData) {
      showEnlistmentOverlay(db, auth);
    }
  });
}

