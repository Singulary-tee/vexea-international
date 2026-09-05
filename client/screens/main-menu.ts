import * as screenManager from "./screen-manager";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot, setDoc, updateDoc, query, where, documentId, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { DS } from "../design-system";
import { IS_DEV } from "../../shared/gates/production.gate";
import { isClientSentryInitialized, getSentryDSN, sendUserFeedback } from "../sentry";
import { clientFlagService } from "../flags/flag-service";
import { ClientFeatureFlagKey } from "../flags/client-flags";
import { SharedFeatureFlagKey } from "../../shared/feature-flags";
import { getDevMap, getDefaultMap, getMapById, MAP_REGISTRY } from "../../shared/maps/map-registry";
import { hasCachedBlob, getCachedOrFetchUrl, ensureAssetsDownloaded, getAssetUrl } from "../asset-cache";
import { EXTENDED_SOUNDS, EXTENDED_TEXTURES } from "./splash";
import catalogData from "../../shared/catalog.json";
import challengesDataList from "../data/challenges.json";
import { verifyPurchase, verifyClaim, calculateLevelMetrics } from "../../shared/verification/verifier";
import { CatalogItem } from "../../shared/verification/types";
import { ValidatorGate } from "../../shared/gates/validator.gate";
import { renderArmoryScreen } from "./armory-screen";
import { renderStatsScreen, setActiveStatsSubTab } from "./stats-screen";
import { renderFactionScreen } from "./faction-screen";
import { renderStoreScreen } from "./store-screen";
import { openInsufficientEnergyModal, getEnergyRegenCountdown, getMaxFreeEnergy, getMatchEnergyCost } from "./energy-modal";
import { StudioPreviewManager } from "../StudioPreviewManager";
import { CLASSES } from "../../shared/classes";
import { resolveDisplayName, sendFriendRequest, getFriendsList, getIncomingRequests, respondToFriendRequest, ensureUsernameMapped, getLobbyInvites, respondToLobbyInvite } from "../social";
import { bindFullscreenButton } from "../src/ui/fullscreen";
import { getRegisteredUserData, setRegisteredUserData } from "./menu-state";
import { showMenuNotification } from "./notification";
import { openProfileAuthModal, showEnlistmentOverlay } from "./auth-modal";
import { openSquadFriendsModal } from "./squad-friends-modal";
import { showArchitecturalAnalysis } from "./dev-analysis";
import { bindTabs, TabItem } from "../src/ui/ui-motion";

// Re-exports preserved for legacy dynamic importers (e.g. stats-screen).
export { showMenuNotification };
export { openProfileAuthModal };

let mainNavTabsHandle: { setActive: (id: string) => void; destroy: () => void } | null = null;
let styleInjected = false;
let activeCardId: string | null = null;
let currentRightPanelMode: 'DEFAULT' | 'MULTIPLAYER' | 'FACTION' | 'INTEL' | 'FEEDBACK' | 'STORE' | 'PROFILE' | 'MAP_EDITOR' | 'PLAY' | 'LOADOUT' = 'DEFAULT';
let userFaction: string | null = null;
let userSubscriptionUnsubscribe: (() => void) | null = null;
let offersInterval: any = null;
let energyRegenInterval: any = null;
let persistentContainers: { [mode: string]: HTMLElement } = {};

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
  persistentContainers = {};
  cardImages.forEach(name => {
    const img = new Image();
    img.src = getAssetUrl(name);
  });

  EXTENDED_TEXTURES.forEach((tex) => {
    getCachedOrFetchUrl(tex, "Image").catch(() => {});
  });
  EXTENDED_SOUNDS.forEach((snd) => {
    getCachedOrFetchUrl(snd, "Sound").catch(() => {});
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
          setRegisteredUserData(snapshot.data());
          (window as any).registeredUserData = getRegisteredUserData();
          userFaction = getRegisteredUserData().faction || null;

          const overlay = document.getElementById('vex-unified-auth-modal') || document.getElementById('vex-enlistment-overlay');
          if (overlay) overlay.remove();

          checkDailyRefresh(getRegisteredUserData(), doc(db, 'Users', uid));
          enableLeftColumnMenu(true);
          if (getRegisteredUserData().displayName) {
            ensureUsernameMapped(uid, getRegisteredUserData().displayName);
          }
        } else {
          if (!user.isAnonymous) {
            const newProfile = {
              displayName: (user.displayName || user.email?.split('@')[0] || 'OPERATIVE').toUpperCase(),
              photoURL: user.photoURL || null,
              email: user.email || null,
              faction: 'VIBE CO.', credits: 500, energy: 10, score: 0, kills: 0, battlePass: 1, unlockedItems: [], totalXp: 0, adClaimsToday: 0, lastAdClaimDate: 0,
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
            setRegisteredUserData(null);
            (window as any).registeredUserData = null;
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
      setRegisteredUserData(null);
      (window as any).registeredUserData = null;
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
      .mm-wordmark { font-size: clamp(1.13rem, 3vw, 2.25rem); }
      .mm-right-panel-content {
        transition: opacity ${DS.transitions.panel};
      }
      
      .mm-fisheye-wrap {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
      }
      @media (min-width: 64.00rem) {
        .mm-fisheye-wrap {
          transform: scale(0.98);
        }
      }
      .mm-fisheye-wrap > * {
        pointer-events: auto;
      }
      .mm-top-shadow {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: clamp(5.00rem, 15vh, 10.00rem);
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
        font-size: clamp(0.63rem, 6.5cqi, 1.50rem);
        text-transform: uppercase;
        color: #FFFFFF;
        text-shadow: 1px 1px 4px rgba(0,0,0,1);
        padding: clamp(4px, 3cqi, 0.75rem);
        z-index: 2;
        pointer-events: none;
        white-space: nowrap;
        line-height: 1;
        overflow: hidden;
        text-overflow: clip;
      }
      #settings-sidebar::-webkit-scrollbar { display:none; }
      @media (max-width: 48.00rem) {
         .mm-wordmark { font-size: ${DS.typography.sizes.headingMd} !important; }
         .mm-profile-rank { display: none !important; }
         .mm-new-card-title { font-size: clamp(0.63rem, 7.5cqi, 1.25rem) !important; padding: 0.38rem !important; }
         #mm-nav-container { gap: 6px !important; }
         .mm-nav-btn { font-size: ${DS.typography.sizes.tiny} !important; padding: 2px 4px !important; }
         #profile-cr-display { display: none !important; }
         #mm-main-layout { width: calc(100vw - 1.50rem) !important; left: 0.75rem !important; }
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
  el.setAttribute('data-ui-surface', 'true');
  el.classList.add('ui-surface');
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

  // 3D Studio Backdrop Layer for Character Model
  const mm3dBackdrop = document.createElement('div');
  mm3dBackdrop.id = 'main-menu-3d-backdrop';
  Object.assign(mm3dBackdrop.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '2',
    pointerEvents: 'none'
  });
  el.appendChild(mm3dBackdrop);

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
    padding: 'clamp(0.38rem, 1vh, 0.63rem) clamp(0.75rem, 2vw, 1.25rem)',
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
  navContainer.className = 'vexea-tab-row';
  Object.assign(navContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 1.2vw, 18px)',
    zIndex: '15',
    flexShrink: '0',
    position: 'relative'
  });

  const navItems = [
    { id: 'DEFAULT', label: 'START' },
    { id: 'LOADOUT', label: 'ARMORY' },
    { id: 'INTEL', label: 'STATS' },
    { id: 'FACTION', label: 'FACTION' },
    { id: 'STORE', label: 'STORE' }
  ];

  const tabElements: TabItem[] = [];
  navItems.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'vexea-tab mm-nav-btn';
    btn.setAttribute('data-id', item.id);
    btn.setAttribute('data-ui-tab', item.id);
    btn.textContent = item.label;
    Object.assign(btn.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.69rem, 1.2vw, 0.81rem)',
      fontWeight: 'bold',
      letterSpacing: '1.5px',
      cursor: 'pointer',
      padding: '4px clamp(6px, 0.8vw, 10px)',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      background: 'transparent',
      border: 'none'
    });

    navContainer.appendChild(btn);
    tabElements.push({ id: item.id, button: btn });
  });

  if (mainNavTabsHandle) {
    mainNavTabsHandle.destroy();
  }
  mainNavTabsHandle = bindTabs(
    navContainer,
    tabElements,
    currentRightPanelMode,
    (selectedId) => {
      setActiveCard(selectedId);
    }
  );

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
    width: 'clamp(1.75rem, 3.5vh, 2.13rem)',
    height: 'clamp(1.75rem, 3.5vh, 2.13rem)',
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
    height: '1.75rem',
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
    fontSize: 'clamp(0.63rem, 1.2vh, 0.75rem)',
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
    padding: '1px 0.31rem',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(0.50rem, 1vh, 0.56rem)',
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
  crDisplay.style.cursor = 'pointer';
  crDisplay.style.pointerEvents = 'auto';
  crDisplay.title = 'Click to inspect Energy Reserves & Resupply';
  crDisplay.onclick = (e) => {
    e.stopPropagation();
    openInsufficientEnergyModal(getRegisteredUserData(), {
      onEnergyRefilled: () => updateProfileBox(),
      onNavigateStore: () => setActiveCard('STORE')
    });
  };
  Object.assign(crDisplay.style, {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(0.56rem, 1.1vh, 0.66rem)',
    color: DS.colors.accent,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    height: 'auto',
    flexShrink: '0',
    padding: '2px 4px'
  });

  // Far Right Utility buttons: Fullscreen, Feedback, Friends, Settings
  const utilityBox = document.createElement('div');
  Object.assign(utilityBox.style, {
    display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.0vw, 14px)'
  });

  const pFullscreen = document.createElement('button');
  pFullscreen.className = 'vexea-icon-button';
  pFullscreen.setAttribute('aria-label', 'Toggle Fullscreen');
  pFullscreen.title = 'Toggle Fullscreen';
  bindFullscreenButton(pFullscreen, 1.13);
  utilityBox.appendChild(pFullscreen);

  const pAddFriends = document.createElement('button');
  pAddFriends.className = 'vexea-icon-button';
  pAddFriends.setAttribute('aria-label', 'Friends');
  pAddFriends.title = 'Friends';
  pAddFriends.innerHTML = `<img class="vexea-icon-button__icon" src="/ui_svgs/add_friend.svg" style="width: 1.13rem; height: 1.13rem;" alt="Add Friend" />`;
  pAddFriends.onclick = (e) => { e.stopPropagation(); openSquadFriendsModal(); };
  utilityBox.appendChild(pAddFriends);

  const pFeedback = document.createElement('button');
  pFeedback.className = 'vexea-icon-button';
  pFeedback.setAttribute('aria-label', 'Send Feedback');
  pFeedback.title = 'Send Feedback';
  pFeedback.innerHTML = `<img class="vexea-icon-button__icon" src="/ui_svgs/messages.svg" style="width: 1.13rem; height: 1.13rem;" alt="Messages" />`;
  pFeedback.onclick = (e) => { e.stopPropagation(); setActiveCard('FEEDBACK'); };
  utilityBox.appendChild(pFeedback);

  const pGear = document.createElement('button');
  pGear.className = 'vexea-icon-button';
  pGear.setAttribute('aria-label', 'Settings');
  pGear.title = 'Settings';
  pGear.innerHTML = `<img class="vexea-icon-button__icon" src="/ui_svgs/settings.svg" style="width: 1.0rem; height: 1.0rem;" alt="Settings" />`;
  pGear.onclick = () => { import("../settings").then(({ openSettings }) => openSettings()); };
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
    height: '1.13rem',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  leftInBetween.appendChild(sepLeft1);
  leftInBetween.appendChild(crDisplay);

  const sepLeft2 = document.createElement('div');
  Object.assign(sepLeft2.style, {
    width: '1px',
    height: '1.13rem',
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
    height: '1.13rem',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: '0'
  });
  rightInBetween.appendChild(sepRight1);
  rightInBetween.appendChild(profileCenterBox);

  const sepRight2 = document.createElement('div');
  Object.assign(sepRight2.style, {
    width: '1px',
    height: '1.13rem',
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
    position: 'absolute', top: 'clamp(3.63rem, 8vh, 4.50rem)', bottom: 'clamp(0.75rem, 2vh, 1.25rem)', 
    left: 'clamp(0.75rem, 2vh, 1.25rem)', zIndex: '2',
    display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5vh, 20px)',
    width: 'clamp(20.00rem, 45vw, 48vw)', transition: 'opacity 0.3s'
  });

  const menuLeftColumn = document.createElement('div');
  Object.assign(menuLeftColumn.style, {
    display: 'flex', flexDirection: 'column', gap: 'clamp(0.38rem, 1.0vh, 0.75rem)', flex: '1', minHeight: '0'
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
  playObj.titleEl.style.fontSize = 'clamp(1.06rem, 12.5cqi, 2.63rem)';
  playCard.onclick = (e) => {
    e.stopPropagation();
    const currentEnergy = getRegisteredUserData()?.energy !== undefined ? getRegisteredUserData().energy : 10;
    const matchCost = getMatchEnergyCost();
    if (currentEnergy < matchCost) {
      openInsufficientEnergyModal(getRegisteredUserData(), {
        onEnergyRefilled: () => updateProfileBox(),
        onNavigateStore: () => setActiveCard('STORE')
      });
      return;
    }
    const lastMapId = localStorage.getItem('lastChosenMap') || getDefaultMap().id;
    ensureAssetsDownloaded(() => screenManager.showLobby(), lastMapId);
  };
  
  const playContent = document.createElement('div');
  Object.assign(playContent.style, {
    position: 'absolute', inset: '0',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 'clamp(4px, 1vh, 0.50rem)', gap: '4px', zIndex: '3', pointerEvents: 'none'
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
            padding: '3px 0.50rem', fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 2.25cqi, 0.88rem)', cursor: 'pointer',
            fontWeight: 'bold', textShadow: 'none', borderRadius: '0px', whiteSpace: 'nowrap', lineHeight: '1.2'
        });
        btn.onclick = onClick;
        devContainer.appendChild(btn);
    };

    createDevBtn('DEV QUICK START', (e) => {
        e.stopPropagation();
        const mapId = getDefaultMap().id;
        ensureAssetsDownloaded(() => {
            window.dispatchEvent(new CustomEvent('start-match', { detail: { mode: 'STANDARD', class: CLASSES.ASSAULT.id, solo: true, map: getDefaultMap(), isDevQuickStart: true }}));
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
    createDevBtn('DEV PLACEMENT', (e) => {
        e.stopPropagation();
        screenManager.showDevPlacement();
    });
    createDevBtn('DEV AUDIO', (e) => {
        e.stopPropagation();
        screenManager.showDevAudio();
    });
    createDevBtn('DEV ANALYSIS', (e) => {
        e.stopPropagation();
        showArchitecturalAnalysis();
    });
    playContent.appendChild(devContainer);
  }

  const getMatchesPlayed = (): number => {
    const localCount = parseInt(localStorage.getItem('matchesPlayed') || '0', 10);
    const cloudCount = getRegisteredUserData()?.playedCount || 0;
    return Math.max(localCount, cloudCount);
  };

  if (getMatchesPlayed() >= 1) {
    const qmBtn = document.createElement('div');
    const curEnergy = getRegisteredUserData()?.energy !== undefined ? getRegisteredUserData().energy : 10;
    const matchCost = getMatchEnergyCost();
    const isLowEnergy = curEnergy < matchCost;

    qmBtn.textContent = isLowEnergy ? 'QUICK MATCH [LOW EN]' : 'QUICK MATCH';
    qmBtn.className = isLowEnergy ? '' : 'mm-deploy-btn-glow';
    Object.assign(qmBtn.style, {
      color: isLowEnergy ? DS.colors.accent : DS.colors.background,
      background: isLowEnergy ? 'rgba(255, 68, 0, 0.15)' : DS.colors.accent,
      border: isLowEnergy ? `1px solid ${DS.colors.accent}` : 'none',
      padding: '0.50rem 1.25rem',
      fontFamily: DS.typography.fontFamily, fontWeight: DS.typography.weightBold,
      fontSize: 'clamp(1.00rem, 4cqi, 1.50rem)', cursor: 'pointer', pointerEvents: 'auto',
      borderRadius: '0px', textAlign: 'center', whiteSpace: 'nowrap',
      boxShadow: isLowEnergy ? 'none' : '0 2px 6px rgba(0,0,0,0.5)', zIndex: '5',
      marginTop: 'auto'
    });
    qmBtn.onclick = (e) => {
        e.stopPropagation();
        const activeEn = getRegisteredUserData()?.energy !== undefined ? getRegisteredUserData().energy : 10;
        if (activeEn < getMatchEnergyCost()) {
          openInsufficientEnergyModal(getRegisteredUserData(), {
            onEnergyRefilled: () => updateProfileBox(),
            onNavigateStore: () => setActiveCard('STORE')
          });
          return;
        }
        const selectedClass = localStorage.getItem('selectedClass') || CLASSES.ASSAULT.id;
        const lastMapId = localStorage.getItem('lastChosenMap') || getDefaultMap().id;
        const lastMap = getMapById(lastMapId) || getDefaultMap();
        ensureAssetsDownloaded(() => {
            try {
                const docEl = document.documentElement as any;
                if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                    if (docEl.requestFullscreen) docEl.requestFullscreen();
                    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
                }
            } catch (err) {}
            window.dispatchEvent(new CustomEvent('start-match', { 
              detail: { 
                mode: localStorage.getItem('lastChosenGameMode') || 'INFILTRATION', 
                class: selectedClass, 
                map: lastMap, 
                isDevQuickStart: false 
              }
            }));
        }, lastMapId);
    };
    playContent.appendChild(qmBtn);
  }

  playCard.appendChild(playContent);


  // --- ROW 2: UPDATES, FACTION, INTEL, LOADOUT (25% of Row 1) ---
  const row2Container = document.createElement('div');
  Object.assign(row2Container.style, {
    display: 'flex', flexDirection: 'row', gap: 'clamp(0.38rem, 1vw, 0.63rem)', width: '100%', flex: '1.0', minHeight: '0'
  });

  // 1. UPDATES CARD
  const updatesObj = createNewCard('UPDATES', 'update_card_1.webp');
  const updatesCard = updatesObj.card;
  updatesCard.id = 'mm-updates-card';
  updatesCard.style.flex = '1.0';
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
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.50rem, 1.5vh, 0.75rem)', color: '#FFFFFF',
    fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', width: '90%',
    textShadow: '0 2px 6px rgba(0,0,0,0.9)', zIndex: '4', pointerEvents: 'none'
  });
  updatesCard.appendChild(updatesMainText);

  const updatesSubtext = document.createElement('div');
  updatesSubtext.textContent = 'NEW MAP & WEAPONS';
  Object.assign(updatesSubtext.style, {
    position: 'absolute', bottom: 'clamp(4px, 0.8vh, 0.50rem)', left: 'clamp(0.38rem, 1cqi, 0.63rem)',
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.38rem, 0.8vh, 0.50rem)', color: 'rgba(255,255,255,0.85)',
    fontWeight: 'bold', letterSpacing: '1px', textShadow: '1px 1px 3px rgba(0,0,0,0.9)', zIndex: '4', pointerEvents: 'none'
  });
  updatesCard.appendChild(updatesSubtext);

  // 3. INTEL CARD
  const intelObj = createNewCard('INTEL', 'intel_card_1.webp');
  const intelCard = intelObj.card;
  intelCard.id = 'mm-intel-card';
  intelCard.style.flex = '1.0';
  intelCard.style.height = '100%';
  intelCard.style.minHeight = '0';
  intelCard.onclick = (e) => {
    e.stopPropagation();
    setActiveStatsSubTab('INTEL');
    setActiveCard('INTEL');
  };

  // 4. BATTLE PASS CARD
  const bpObj = createNewCard('BATTLE PASS', 'squad_card_1.webp'); // Reusing asset for now
  const bpCard = bpObj.card;
  bpCard.id = 'mm-bp-card';
  bpCard.style.flex = '1.2';
  bpCard.style.height = '100%';
  bpCard.style.minHeight = '0';
  bpCard.onclick = (e) => {
    e.stopPropagation();
    setActiveStatsSubTab('BATTLE_PASS');
    setActiveCard('INTEL');
  };

  const currentBPXP = getRegisteredUserData()?.battlePass || 0;
  const currentTier = Math.floor(currentBPXP / 10);
  const progressPct = ((currentBPXP % 10) / 10) * 100;

  const bpInfo = document.createElement('div');
  Object.assign(bpInfo.style, {
    position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    padding: 'clamp(0.38rem, 1vh, 0.63rem)', pointerEvents: 'none', zIndex: '4'
  });

  const tierText = document.createElement('div');
  tierText.textContent = `TIER ${String(currentTier).padStart(2, '0')}`;
  Object.assign(tierText.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.56rem, 1.2vh, 0.69rem)', color: '#FFFFFF',
    fontWeight: '900', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.8)'
  });
  bpInfo.appendChild(tierText);

  const barContainer = document.createElement('div');
  Object.assign(barContainer.style, {
    width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', marginTop: '4px',
    position: 'relative', overflow: 'hidden', borderRadius: '0px'
  });
  
  const barFill = document.createElement('div');
  Object.assign(barFill.style, {
    width: `${progressPct}%`, height: '100%', background: DS.colors.accent,
    boxShadow: `0 0 0.63rem ${DS.colors.accent}`, transition: 'width 0.5s ease-out'
  });
  barContainer.appendChild(barFill);
  bpInfo.appendChild(barContainer);
  bpCard.appendChild(bpInfo);

  row2Container.appendChild(updatesCard);
  row2Container.appendChild(intelCard);
  row2Container.appendChild(bpCard);


  // --- ROW 3: CHALLENGES & STORE (50% of Row 1) ---
  const row3Container = document.createElement('div');
  Object.assign(row3Container.style, {
    display: 'flex', flexDirection: 'row', gap: 'clamp(0.38rem, 1vw, 0.63rem)', width: '100%', flex: '2.3', minHeight: '0'
  });

  // 1. STORE CARD (Offers Carousel)
  const storeObj = createNewCard('OFFERS', 'promo_rifle_1.webp');
  const storeCard = storeObj.card;
  storeCard.id = 'mm-store-card';
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
    bottom: '0.50rem',
    right: '0.50rem',
    color: '#FFFFFF',
    fontFamily: DS.typography.fontFamily,
    fontSize: 'clamp(0.75rem, 2vh, 1.00rem)',
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
    { image: 'promo_rifle_1.webp', promo: 'TEST COATING: 100 CR' },
    { image: 'promo_pistol_1.webp', promo: 'VIPER OPERATIONAL: 150 CR' },
    { image: 'promo_shotgun_1.webp', promo: 'BREACHER SPECIAL: 200 CR' }
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
  if (offersInterval) clearInterval(offersInterval);
  offersInterval = setInterval(() => {
    const mmScreen = document.getElementById('main-menu-screen');
    const isVisible = mmScreen && mmScreen.style.display !== 'none' && mmScreen.style.opacity !== '0';
    if (!isVisible) return; // Skip updating offer when hidden/off-screen to avoid background churn
    
    currentOfferIdx = (currentOfferIdx + 1) % OFFERS.length;
    promoTextEl.style.opacity = '0';
    setTimeout(() => {
      updateOffer(currentOfferIdx);
      promoTextEl.style.opacity = '1';
    }, 300);
  }, 4000);

  // Real-time energy countdown ticker
  if (energyRegenInterval) clearInterval(energyRegenInterval);
  energyRegenInterval = setInterval(() => {
    const mmScreen = document.getElementById('main-menu-screen');
    const isVisible = mmScreen && mmScreen.style.display !== 'none' && mmScreen.style.opacity !== '0';
    if (!isVisible) return;
    const ticker = document.getElementById('top-energy-regen-ticker');
    if (ticker) {
      const countdown = getEnergyRegenCountdown();
      ticker.textContent = `+1 IN ${countdown.formatted}`;
    }
  }, 1000);

  // 2. CHALLENGES PANEL (Statically displaying minimum 3 challenges)
  const challengesPanel = document.createElement('div');
  challengesPanel.id = 'mm-challenges-panel';
  Object.assign(challengesPanel.style, {
    position: 'relative', flex: '1', height: '100%', minHeight: '0', zIndex: '2',
    display: 'flex', flexDirection: 'column', padding: 'clamp(4px, 0.8vh, 0.50rem)',
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
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.56rem, 1.2vh, 0.69rem)', fontWeight: '200', color: '#FFFFFF',
    letterSpacing: '0.38rem', textAlign: 'center', width: '100%'
  });

  const challengesTimer = document.createElement('div');
  challengesTimer.textContent = 'RESETS IN 14H';
  Object.assign(challengesTimer.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.34rem, 0.7vh, 0.44rem)', color: 'rgba(255,255,255,0.45)',
    fontWeight: '300', letterSpacing: '1px', textAlign: 'center', marginTop: '1px'
  });

  challengesHeader.appendChild(challengesTitle);
  challengesHeader.appendChild(challengesTimer);
  challengesPanel.appendChild(challengesHeader);

  const mmStats = getRegisteredUserData()?.stats || {};
  const challengesData = challengesDataList.slice(0, 3).map((ch: any) => {
    let current = 0;
    if (ch.id === 'ch_drone_kills') {
      current = Math.min(ch.target, mmStats.totalDroneEliminations || mmStats.kills || 0);
    } else if (ch.id === 'ch_extraction_hp') {
      current = Math.min(ch.target, mmStats.totalWins || mmStats.wins || 0);
    } else if (ch.id === 'ch_capture_nodes') {
      current = Math.min(ch.target, mmStats.totalObjectiveTimeHeld ? Math.floor(mmStats.totalObjectiveTimeHeld / 60) : 0);
    } else {
      current = getRegisteredUserData()?.challengesProgress?.[ch.id] || 0;
    }
    return {
      name: ch.title,
      desc: ch.description,
      current,
      target: ch.target,
      reward: `+${ch.rewardCredits} CR`
    };
  });

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
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.44rem, 0.9vh, 0.53rem)', fontWeight: 'bold', color: '#FFFFFF',
      lineHeight: '1.0'
    });

    const chReward = document.createElement('div');
    chReward.textContent = ch.reward;
    Object.assign(chReward.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.38rem, 0.8vh, 0.47rem)', fontWeight: 'normal', color: '#FFFFFF',
      lineHeight: '1.0'
    });

    topRow.appendChild(chName);
    topRow.appendChild(chReward);
    item.appendChild(topRow);

    const descRow = document.createElement('div');
    descRow.textContent = ch.desc;
    Object.assign(descRow.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.31rem, 0.65vh, 0.44rem)', color: 'rgba(255,255,255,0.6)',
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
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.38rem, 0.8vh, 0.47rem)', color: '#FFFFFF', fontWeight: 'bold',
      lineHeight: '1.0'
    });

    progressRow.appendChild(barBg);
    progressRow.appendChild(chVal);
    item.appendChild(progressRow);

    challengesPanel.appendChild(item);
  });

  challengesPanel.onclick = (e) => {
    e.stopPropagation();
    setActiveStatsSubTab('CHALLENGES');
    setActiveCard('INTEL');
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
    position: 'absolute', top: 'clamp(2.38rem, 6.5vh, 3.25rem)', bottom: 'clamp(0.75rem, 2vh, 1.50rem)', 
    left: 'clamp(0.75rem, 2vw, 1.50rem)', right: 'clamp(0.75rem, 2vw, 1.50rem)', zIndex: '3',
    display: 'none', flexDirection: 'column',
    maxWidth: '87.50rem', margin: '0 auto',
    background: 'radial-gradient(ellipse at center, rgba(3, 3, 5, 0.98) 0%, rgba(3, 3, 5, 0.85) 65%, rgba(3, 3, 5, 0.3) 85%, rgba(3, 3, 5, 0) 100%)',
    border: 'none',
    borderRadius: '0px',
    padding: 'clamp(0.63rem, 1.8vh, 1.13rem)',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });

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
  if (!profileNameText || !profileRankBadge) {
    console.warn("[MainMenu] updateProfileBox called before profileNameText or profileRankBadge is initialized.");
    return;
  }
  const leaderboardCard = document.getElementById('leaderboard-card');
  if (leaderboardCard) {
    import('../asset-cache').then(({ getAssetUrl }) => {
      leaderboardCard.style.backgroundImage = `url('${getAssetUrl('leaderboard_card_1.webp')}')`;
    });
    leaderboardCard.onclick = (e) => {
      e.stopPropagation();
      setActiveStatsSubTab('LEADERBOARD');
      setActiveCard('INTEL');
    };
  }

  const coinSvg = `<img src="/ui_svgs/coin.svg" style="width: 14px; height: 14px; filter: brightness(0) invert(1); vertical-align: middle; display: inline-block;" alt="Coin" />`;
  const boltSvg = `<img src="/ui_svgs/energy.svg" style="width: 14px; height: 14px; filter: brightness(0) invert(1); vertical-align: middle; display: inline-block;" alt="Energy" />`;

  const crDisplay = document.getElementById('profile-cr-display');
  const avatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement | null;
  const xpFill = document.getElementById('profile-xp-fill');

  if (getRegisteredUserData()) {
    profileNameText.textContent = `${getRegisteredUserData().displayName.toUpperCase()}`;
    const levelNum = getRegisteredUserData().battlePass || 1;
    profileRankBadge.textContent = `LVL ${levelNum}`;
    profileRankBadge.style.display = 'block';
    profileNameText.style.color = DS.colors.text;

    if (avatarImg) {
      if (getRegisteredUserData().photoURL) {
        avatarImg.src = getRegisteredUserData().photoURL;
      } else {
        avatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2523ff4400"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z"/></svg>';
      }
    }

    if (xpFill) {
      const xp = getRegisteredUserData().xp !== undefined ? getRegisteredUserData().xp : 65;
      const progressPct = Math.min(100, Math.max(15, xp % 100 || 65));
      xpFill.style.height = `${progressPct}%`;
    }

    const creditsVal = getRegisteredUserData().credits !== undefined ? getRegisteredUserData().credits : 100;
    const energyVal = getRegisteredUserData().energy !== undefined ? getRegisteredUserData().energy : 10;
    const maxFree = getMaxFreeEnergy();
    const energyPct = Math.min(100, Math.max(0, (energyVal / maxFree) * 100));
    const isBelowMax = energyVal < maxFree;
    const regenCountdown = getEnergyRegenCountdown();

    if (crDisplay) {
      crDisplay.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${coinSvg}<span>${creditsVal} CR</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
            ${boltSvg}<span>${energyVal}/${maxFree}</span>
            ${isBelowMax ? `<span id="top-energy-regen-ticker" style="font-size:clamp(0.44rem, 0.9vh, 0.50rem);color:${DS.colors.textMuted};font-weight:normal;letter-spacing:0.5px;">+1 IN ${regenCountdown.formatted}</span>` : ''}
          </div>
          <div style="width:100%;height:3px;background:rgba(255,255,255,0.12);overflow:hidden;position:relative;">
            <div style="width:${energyPct}%;height:100%;background:${energyVal < 2 ? DS.colors.danger : DS.colors.accent};transition:width 0.3s ease;"></div>
          </div>
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

    const maxFree = getMaxFreeEnergy();
    const guestEnergy = 10;
    const energyPct = Math.min(100, Math.max(0, (guestEnergy / maxFree) * 100));

    if (crDisplay) {
      crDisplay.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
          ${coinSvg}<span>100 CR</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="display:inline-flex;align-items:center;gap:4px;line-height:1;">
            ${boltSvg}<span>${guestEnergy}/${maxFree}</span>
          </div>
          <div style="width:100%;height:3px;background:rgba(255,255,255,0.12);overflow:hidden;position:relative;">
            <div style="width:${energyPct}%;height:100%;background:${DS.colors.accent};transition:width 0.3s ease;"></div>
          </div>
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
    if (id === 'DEFAULT') displayTitle = 'OVERVIEW';
    else if (id === 'INTEL') displayTitle = 'STATISTICS';
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

  // Update active state of top-bar navigation buttons using sliding underline handle
  if (mainNavTabsHandle) {
    mainNavTabsHandle.setActive(id);
  }

  if (id !== 'LOADOUT' && id !== 'STORE') {
    const backdrop = document.getElementById('main-menu-3d-backdrop');
    if (backdrop && StudioPreviewManager.getMode() !== 'MAIN_MENU') {
      StudioPreviewManager.attachTo(backdrop, 'MAIN_MENU');
    }
  }
}

function clearActiveCard() {
  setActiveCard('DEFAULT');
}

function createPanelBlock(label: string, renderContent: (container: HTMLElement) => void, isLast: boolean = false) {
  const block = document.createElement('div');
  Object.assign(block.style, {
    padding: 'clamp(0.50rem, 2vh, 1.00rem) 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)'
  });
  
  if (label) {
    const lbl = document.createElement('div');
    lbl.textContent = label;
    Object.assign(lbl.style, {
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.50rem, 1.25vh, 0.69rem)', textTransform: 'uppercase',
      color: DS.colors.textMuted, letterSpacing: '4px', marginBottom: 'clamp(4px, 1vh, 0.50rem)'
    });
    block.appendChild(lbl);
  }

  renderContent(block);
  return block;
}

function updateDefaultPanelStats() {
  const stats = [
    { key: 'totalMatches', v: getRegisteredUserData() ? String(getRegisteredUserData().totalMatches || 0) : '—' },
    { key: 'totalWins', v: getRegisteredUserData() ? String(getRegisteredUserData().totalWins || 0) : '—' },
    { key: 'winRate', v: getRegisteredUserData() ? `${getRegisteredUserData().winRate || 0}%` : '—' },
    { key: 'totalDroneEliminations', v: getRegisteredUserData() ? String(getRegisteredUserData().totalDroneEliminations || 0) : '—' },
    { key: 'totalDeaths', v: getRegisteredUserData() ? String(getRegisteredUserData().totalDeaths || 0) : '—' },
    { key: 'totalObjectiveTimeHeld', v: getRegisteredUserData() ? `${getRegisteredUserData().totalObjectiveTimeHeld || 0}s` : '—' },
    { key: 'totalRevivesPerformed', v: getRegisteredUserData() ? String(getRegisteredUserData().totalRevivesPerformed || 0) : '—' },
    { key: 'highestIndividualScore', v: getRegisteredUserData() ? String(getRegisteredUserData().highestIndividualScore || 0) : '—' }
  ];
  stats.forEach(s => {
    const el = document.getElementById(`intel-summary-val-${s.key}`);
    if (el) {
      el.textContent = s.v;
    }
  });
}

function updatePlayTabSelection() {
  const container = persistentContainers['PLAY'];
  if (!container) return;
  GAME_MODES.forEach(mode => {
     const isSelected = lastChosenGameMode === mode.id;
     const card = container.querySelector(`[data-mode-id="${mode.id}"]`) as HTMLElement;
     if (card) {
        card.style.background = isSelected ? 'rgba(255, 69, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)';
        card.style.border = isSelected ? `1px solid ${DS.colors.accent}` : '1px solid rgba(255, 255, 255, 0.05)';
        
        const strip = card.children[0] as HTMLElement;
        if (strip) strip.style.background = isSelected ? DS.colors.accent : 'transparent';
        
        const textGroup = card.children[1] as HTMLElement;
        if (textGroup) {
           const nameEl = textGroup.children[0] as HTMLElement;
           if (nameEl) nameEl.style.color = isSelected ? DS.colors.text : 'rgba(255, 255, 255, 0.6)';
           const descEl = textGroup.children[1] as HTMLElement;
           if (descEl) descEl.style.color = isSelected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        }
        
        const statusEl = card.children[2] as HTMLElement;
        if (statusEl) {
           statusEl.textContent = isSelected ? 'ACTIVE' : 'READY';
           statusEl.style.background = isSelected ? 'rgba(255, 69, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)';
           statusEl.style.color = isSelected ? DS.colors.accent : 'rgba(255, 255, 255, 0.4)';
           statusEl.style.border = isSelected ? `1px solid rgba(255, 69, 0, 0.3)` : 'none';
        }
     }
  });
}

function renderRightPanel() {
  if (!rightPanelContent) {
    console.warn("[MainMenu] renderRightPanel called before rightPanelContent is initialized.");
    return;
  }
  rightPanelContent.style.opacity = '1';
  
  // Right Column Overflow Logic
  const rightCol = document.getElementById('mm-right-col');
  if (rightCol) {
     rightCol.style.overflow = 'hidden';
  }

  // Hide all existing persistent containers
  for (const key in persistentContainers) {
    persistentContainers[key].style.display = 'none';
  }

  let container = persistentContainers[currentRightPanelMode];
  if (!container) {
      container = document.createElement('div');
      Object.assign(container.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box'
      });
      rightPanelContent.appendChild(container);
      persistentContainers[currentRightPanelMode] = container;

      // Populate container based on currentRightPanelMode (ONCE)
      if (currentRightPanelMode === 'DEFAULT') {
         container.appendChild(createPanelBlock('STATS SUMMARY', c => {
           const stats = [
             { key: 'totalMatches', l: 'MATCHES', v: '—' },
             { key: 'totalWins', l: 'WINS', v: '—' },
             { key: 'winRate', l: 'WIN RATE', v: '—' },
             { key: 'totalDroneEliminations', l: 'ELIMINATIONS', v: '—' },
             { key: 'totalDeaths', l: 'DEATHS', v: '—' },
             { key: 'totalObjectiveTimeHeld', l: 'OBJECTIVE TIME', v: '—' },
             { key: 'totalRevivesPerformed', l: 'REVIVES', v: '—' },
             { key: 'highestIndividualScore', l: 'BEST SCORE', v: '—' }
           ];
           stats.forEach(s => {
             const row = document.createElement('div');
             Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(4px, 1vh, 0.50rem)' });
             const lbl = document.createElement('span'); lbl.textContent = s.l;
             Object.assign(lbl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 1.5vh, 0.88rem)', color: DS.colors.textMuted });
             const val = document.createElement('span'); 
             val.id = `intel-summary-val-${s.key}`;
             val.textContent = s.v;
             Object.assign(val.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.88rem, 2.5vh, 1.13rem)', color: DS.colors.text, fontWeight: DS.typography.weightBold });
             row.appendChild(lbl); row.appendChild(val); c.appendChild(row);
           });
         }));

         container.appendChild(createPanelBlock('LAST MATCH', c => {
           const lbl = document.createElement('div'); lbl.textContent = 'NO DATA AVAILABLE';
           Object.assign(lbl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 1.5vh, 0.88rem)', color: DS.colors.textMuted });
           c.appendChild(lbl);
         }, true));
      }
      else if (currentRightPanelMode === 'INTEL') {
        renderStatsScreen(container, getRegisteredUserData());
      }
      else if (currentRightPanelMode === 'LOADOUT') {
        renderArmoryScreen(container, getRegisteredUserData());
      }
      else if (currentRightPanelMode === 'FACTION') {
        renderFactionScreen(container, getRegisteredUserData());
      }
      else if (currentRightPanelMode === 'STORE') {
        renderStoreScreen(container, getRegisteredUserData());
      } 
      else if (currentRightPanelMode === 'PLAY') {
        container.style.overflow = 'hidden';

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
          fontSize: DS.typography.sizes.tiny,
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
          card.setAttribute('data-mode-id', mode.id);
          Object.assign(card.style, {
            background: isSelected ? 'rgba(255, 69, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)',
            border: isSelected ? `1px solid ${DS.colors.accent}` : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '0px',
            padding: '0.38rem 0.63rem',
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
            fontSize: DS.typography.sizes.small,
            fontWeight: 'bold',
            color: isSelected ? DS.colors.text : 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.8px'
          });

          const modeHeader = document.createElement('div');
          Object.assign(modeHeader.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          });

          const modeIcon = document.createElement('img');
          modeIcon.src = `/ui_svgs/gamemode_${mode.id.toLowerCase()}.svg`;
          modeIcon.alt = mode.label;
          Object.assign(modeIcon.style, {
            width: '1.0rem',
            height: '1.0rem',
            filter: 'brightness(0) invert(1)'
          });

          modeHeader.appendChild(modeIcon);
          modeHeader.appendChild(nameEl);

          const descEl = document.createElement('div');
          descEl.textContent = mode.desc.toUpperCase();
          Object.assign(descEl.style, {
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.tiny,
            color: isSelected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.5px'
          });

          textGroup.appendChild(modeHeader);
          textGroup.appendChild(descEl);
          card.appendChild(textGroup);

          const statusEl = document.createElement('div');
          statusEl.textContent = isSelected ? 'ACTIVE' : 'READY';
          Object.assign(statusEl.style, {
            fontFamily: DS.typography.fontFamily,
            fontSize: DS.typography.sizes.tiny,
            fontWeight: 'bold',
            letterSpacing: '0.8px',
            padding: '2px 0.38rem',
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
          fontSize: DS.typography.sizes.tiny,
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
          padding: '0.50rem 0.63rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: '1',
          justifyContent: 'space-between',
          minHeight: '0'
        });

        zoneCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; font-weight:bold; color:${DS.colors.text}; letter-spacing:0.8px;">${getDefaultMap().displayName.toUpperCase()}</span>
            <span style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; font-weight:bold; color:#00FF88; background:rgba(0,255,136,0.08); padding:1px 0.31rem; border:1px solid rgba(0,255,136,0.2);">SECURE</span>
          </div>

          <!-- Zone Blueprint Map SVG Preview -->
          <div style="width:100%; height:clamp(3.75rem, 11vh, 5.63rem); background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.06); border-radius:0px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
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
            <div style="position:absolute; bottom:4px; left:0.38rem; font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; letter-spacing:0.8px;">BLUEPRINT v2.1</div>
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
          fontSize: DS.typography.sizes.tiny,
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
          padding: '0.50rem 0.63rem',
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
          fontSize: DS.typography.sizes.tiny,
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
          padding: '0.38rem 3px',
          fontSize: DS.typography.sizes.tiny,
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
          padding: '0.38rem 3px',
          fontSize: DS.typography.sizes.tiny,
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
          padding: '0.38rem 0.50rem',
          background: 'rgba(255, 255, 255, 0.01)',
          border: 'none',
          borderRadius: '0px'
        });

        const contrLabel = document.createElement('div');
        contrLabel.textContent = 'ACTIVE CONTRACTORS IN SECTOR';
        Object.assign(contrLabel.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: DS.typography.sizes.tiny,
          color: DS.colors.textMuted,
          letterSpacing: '0.8px',
          fontWeight: 'bold'
        });

        const contrValue = document.createElement('div');
        contrValue.textContent = '1 / 10 OPERATIVES';
        Object.assign(contrValue.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: DS.typography.sizes.small,
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
          height: 'clamp(2.00rem, 4.5vh, 2.63rem)',
          background: DS.colors.accent,
          color: DS.colors.background,
          border: 'none',
          fontFamily: DS.typography.fontFamily,
          fontSize: 'clamp(0.75rem, 1.8vh, 0.94rem)',
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
          if (getRegisteredUserData() && (getRegisteredUserData().energy || 0) < 10) {
            showMenuNotification("DEPLOYMENT REJECTED: INSUFFICIENT ENERGY. REFILL DEV CREDITS IN INTEL.", "warning");
            return;
          }
          ensureAssetsDownloaded(() => screenManager.showLobby(), getDefaultMap().id);
        };

        paramsCard.appendChild(deployBtn);
        rightCol.appendChild(paramsCard);
        playDashboard.appendChild(rightCol);

        container.appendChild(playDashboard);
      }
      else if (currentRightPanelMode === 'FEEDBACK') {
         let sr = 0;
         const stars: HTMLElement[] = [];
         container.appendChild(createPanelBlock('', c => {
           const row = document.createElement('div'); Object.assign(row.style, { display: 'flex', gap: 'clamp(4px, 1vh, 0.50rem)', marginBottom: 'clamp(0.50rem, 2vh, 1.00rem)' });
           for (let i=1; i<=5; i++) {
             const s = document.createElement('div'); s.innerHTML = '★';
             Object.assign(s.style, { fontSize: 'clamp(1.25rem, 3.5vh, 2.00rem)', color: DS.colors.border, cursor: 'pointer', lineHeight: '1' });
             s.onclick = () => { sr = i; stars.forEach((st, idx) => st.style.color = idx < sr ? DS.colors.accent : DS.colors.border); };
             stars.push(s); row.appendChild(s);
           }
           c.appendChild(row);

           const txt = document.createElement('textarea');
           txt.placeholder = 'Describe your experience.';
           Object.assign(txt.style, {
             width: '100%', height: 'clamp(3.13rem, 10vh, 5.00rem)', background: 'rgba(0,0,0,0.4)', border: DS.glass.border,
             color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 1.5vh, 0.81rem)', padding: 'clamp(0.31rem, 1vh, 0.63rem)', resize: 'none'
           });
           c.appendChild(txt);
         }));
         container.appendChild(createPanelBlock('', c => {
           const btn = document.createElement('button'); btn.textContent = 'SUBMIT';
           Object.assign(btn.style, {
             width: '100%', height: 'clamp(1.88rem, 4vh, 2.50rem)', background: DS.colors.accent, color: DS.colors.background, border: 'none',
             fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.88rem, 2.5vh, 1.13rem)', fontWeight: DS.typography.weightBold, textTransform: 'uppercase', cursor: 'pointer'
           });
           btn.onclick = async () => {
             const auth = getAuth();
             const user = auth.currentUser;
             const uid = user ? user.uid : "guest";
             const txt = container.querySelector('textarea');
             const message = txt?.value || '';

             // Respect Sentry Feedback feature flag
             const feedbackEnabled = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_FEEDBACK_ENABLED, true);
             if (feedbackEnabled && isClientSentryInitialized) {
                 const sent = await sendUserFeedback({
                     message,
                     rating: sr,
                     name: user?.displayName || undefined,
                     email: user?.email || undefined,
                     screen: 'MAIN_MENU'
                 });
                 if (sent) {
                     if(txt) txt.value = '';
                     sr = 0;
                     stars.forEach(st => st.style.color = DS.colors.border);
                     btn.textContent = 'SENT';
                     setTimeout(() => btn.textContent = 'SUBMIT', 2000);
                     return;
                 }
             }

             // Fallback to Firebase if Sentry is disabled or failed
             try {
                 await addDoc(collection(getFirestore(), "feedback"), {
                     rating: sr, text: message, timestamp: serverTimestamp(), userId: uid
                 });
                 if(txt) txt.value = '';
                 sr = 0; stars.forEach(st => st.style.color = DS.colors.border);
                 btn.textContent = 'SENT';
                 setTimeout(() => btn.textContent = 'SUBMIT', 2000);
             } catch(e) {
                 console.error("[Feedback] Firebase submission failed:", e);
             }
           };
           c.appendChild(btn);
         }, true));
      }
      else if (currentRightPanelMode === 'MAP_EDITOR') {
          container.appendChild(createPanelBlock('AVAILABLE MAPS', c => {
              MAP_REGISTRY.forEach(map => {
                  const mapBtn = document.createElement('div');
                  Object.assign(mapBtn.style, {
                      padding: 'clamp(0.50rem, 1.5vh, 0.75rem)',
                      marginBottom: '0.50rem',
                      borderLeft: `2px solid ${DS.colors.accent}`,
                      background: 'rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      color: DS.colors.text,
                      fontFamily: DS.typography.fontFamily,
                      fontSize: 'clamp(0.88rem, 2.5vh, 1.13rem)'
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
    }

    // Toggle active container visibility
    container.style.display = (currentRightPanelMode === 'PLAY') ? 'grid' : 'flex';

    // Perform selective dynamic updates on the active container to avoid rebuilding layout
    if (currentRightPanelMode === 'DEFAULT') {
       updateDefaultPanelStats();
    }
    else if (currentRightPanelMode === 'INTEL') {
       renderStatsScreen(container, getRegisteredUserData());
    }
    else if (currentRightPanelMode === 'LOADOUT') {
       renderArmoryScreen(container, getRegisteredUserData());
    }
    else if (currentRightPanelMode === 'FACTION') {
       renderFactionScreen(container, getRegisteredUserData());
    }
    else if (currentRightPanelMode === 'STORE') {
       renderStoreScreen(container, getRegisteredUserData());
    }
    else if (currentRightPanelMode === 'PLAY') {
       updatePlayTabSelection();
    }

    rightPanelContent.style.opacity = '1';
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

export function refreshCardImages() {
  if (playCardEl) {
    const playUrl = `url('${getAssetUrl(getPlayCardImageForMode(lastChosenGameMode))}')`;
    if (playCardEl.style.backgroundImage !== playUrl) {
      playCardEl.style.backgroundImage = playUrl;
    }
  }
  const cards = [
    { id: 'mm-updates-card', asset: 'update_card_1.webp' },
    { id: 'leaderboard-card', asset: 'leaderboard_card_1.webp' },
    { id: 'mm-intel-card', asset: 'intel_card_1.webp' },
    { id: 'mm-squad-card', asset: 'squad_card_1.webp' },
    { id: 'mm-store-card', asset: 'promo_rifle_1.webp' }
  ];
  cards.forEach(({ id, asset }) => {
    const cardEl = document.getElementById(id);
    if (cardEl) {
      const cardUrl = `url('${getAssetUrl(asset)}')`;
      if (cardEl.style.backgroundImage !== cardUrl) {
        cardEl.style.backgroundImage = cardUrl;
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('show-main-menu', () => {
    refreshCardImages();
    const backdrop = document.getElementById('main-menu-3d-backdrop');
    if (backdrop && StudioPreviewManager.getMode() !== 'MAIN_MENU') {
      StudioPreviewManager.attachTo(backdrop, 'MAIN_MENU');
    }
    renderRightPanel();
    const auth = getAuth();
    const db = getFirestore();
    if (auth.currentUser && auth.currentUser.isAnonymous && !getRegisteredUserData()) {
      showEnlistmentOverlay(db, auth);
    }
  });
}