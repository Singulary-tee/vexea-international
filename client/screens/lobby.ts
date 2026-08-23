import * as screenManager from "./screen-manager";
import { getDefaultMap, getMapById, MAP_REGISTRY } from "../../shared/maps/map-registry";
import { ensureAssetsDownloaded, getCachedOrFetchUrl, getAssetUrl } from "../asset-cache";
import { IS_DESKTOP } from "../gates/platform.gate";
import { DS } from "../design-system";
import { StudioPreviewManager } from "../StudioPreviewManager";
import { getAuth } from "firebase/auth";
import { getFriendsList, sendLobbyInvite, cancelLobbyInvites } from "../social";
import { CLASSES, ClassId } from "../../shared/classes";
import { ClassLoadoutPersistence } from "../src/systems/ClassLoadoutPersistence";
import { ClassLoadoutSystem } from "../src/systems/ClassLoadoutSystem";

const sentInviteUids: string[] = [];

function openLobbyInvitePopup(lobbyId: string) {
  import('../audio').then(({ audioManager }) => audioManager.play('click'));

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const myUid = currentUser ? currentUser.uid : null;
  const myName = currentUser?.displayName || (window as any).registeredUserData?.displayName || "Agent";

  const overlay = document.createElement('div');
  overlay.setAttribute('data-ui-surface', 'true');
  overlay.classList.add('ui-surface');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    zIndex: '3000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: DS.typography.fontFamily,
    color: DS.colors.text
  });

  const popup = document.createElement('div');
  popup.className = 'mm-glass';
  Object.assign(popup.style, {
    width: 'min(90vw, 26.25rem)',
    background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(8, 8, 12, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.3)`,
    borderRadius: '0px',
    padding: '1.00rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative'
  });

  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute', top: '0.75rem', right: '1.00rem', cursor: 'pointer', fontSize: DS.typography.sizes.headingSm, color: DS.colors.textMuted
  });
  closeBtn.onclick = () => overlay.remove();
  popup.appendChild(closeBtn);

  const title = document.createElement('div');
  title.textContent = 'INVITE FRIENDS TO LOBBY';
  Object.assign(title.style, {
    fontSize: DS.typography.sizes.body, fontWeight: 'bold', letterSpacing: '1px', color: DS.colors.accent, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.38rem'
  });
  popup.appendChild(title);

  const listContainer = document.createElement('div');
  Object.assign(listContainer.style, {
    display: 'flex', flexDirection: 'column', gap: '0.50rem', maxHeight: '15.00rem', overflowY: 'auto'
  });

  const loadFriends = async () => {
    if (!myUid) {
      const emptyLabel = document.createElement('div');
      emptyLabel.textContent = 'MUST BE SIGNED IN TO INVITE FRIENDS';
      Object.assign(emptyLabel.style, { fontSize: DS.typography.sizes.small, color: DS.colors.textMuted, fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' });
      listContainer.appendChild(emptyLabel);
      return;
    }
    const friends = await getFriendsList(myUid);
    const accepted = friends.filter(f => f.status === 'accepted');

    if (accepted.length === 0) {
      const emptyLabel = document.createElement('div');
      emptyLabel.textContent = 'NO ACCEPTED FRIENDS FOUND';
      Object.assign(emptyLabel.style, { fontSize: DS.typography.sizes.small, color: DS.colors.textMuted, fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' });
      listContainer.appendChild(emptyLabel);
      return;
    }

    accepted.forEach(friend => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.50rem 0.63rem', background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(255,255,255,0.1)'
      });

      const friendName = friend.displayName || friend.codename || friend.uid;
      const nameDiv = document.createElement('div');
      nameDiv.textContent = friendName;
      Object.assign(nameDiv.style, { fontSize: DS.typography.sizes.small, fontWeight: 'bold' });
      row.appendChild(nameDiv);

      const inviteBtn = document.createElement('button');
      const isAlreadyInvited = sentInviteUids.includes(friend.uid);
      inviteBtn.textContent = isAlreadyInvited ? 'INVITED' : 'INVITE';
      Object.assign(inviteBtn.style, {
        fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: isAlreadyInvited ? '#888' : DS.colors.accent, background: 'transparent', border: `1px solid ${isAlreadyInvited ? '#444' : DS.colors.accent}`, padding: '4px 0.63rem', cursor: isAlreadyInvited ? 'default' : 'pointer', borderRadius: '0px'
      });

      if (!isAlreadyInvited) {
        inviteBtn.onclick = async () => {
          inviteBtn.textContent = 'SENDING...';
          const res = await sendLobbyInvite(myUid, myName, friend.uid, lobbyId);
          if (res.success) {
            inviteBtn.textContent = 'INVITED';
            inviteBtn.style.color = '#888';
            inviteBtn.style.borderColor = '#444';
            inviteBtn.style.cursor = 'default';
            sentInviteUids.push(friend.uid);
          } else {
            inviteBtn.textContent = 'ERROR';
            setTimeout(() => { inviteBtn.textContent = 'INVITE'; }, 2000);
          }
        };
      }

      row.appendChild(inviteBtn);
      listContainer.appendChild(row);
    });
  };

  loadFriends();
  popup.appendChild(listContainer);
  overlay.appendChild(popup);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

export function initLobby() {
  let el = document.getElementById('lobby-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lobby-screen';
    el.setAttribute('data-ui-surface', 'true');
    el.classList.add('ui-surface');
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '800',
      background: DS.colors.background,
      display: 'none',
      width: '100vw',
      height: '100vh',
      boxSizing: 'border-box',
      overflow: 'hidden'
    });

    // Lobby Video Background Layer (Ambient underneath 3D render)
    const videoBg = document.createElement('video');
    videoBg.id = 'lobby-video-bg';
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

    getCachedOrFetchUrl("lobby_1.webm", "Video").then(url => {
      videoBg.src = url;
      videoBg.play().catch(() => {});
    }).catch(err => {
      console.error("Failed to load lobby video background:", err);
    });

    el.appendChild(videoBg);

    // 1. 3D CANVASES BACKDROP (Covers the whole screen behind everything)
    const middleSpacer = document.createElement('div');
    middleSpacer.id = 'lobby-3d-backdrop';
    Object.assign(middleSpacer.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1',
      pointerEvents: 'auto'
    });
    el.appendChild(middleSpacer);

    requestAnimationFrame(() => {
      StudioPreviewManager.attachTo(middleSpacer, 'LOBBY');
    });

    // 2. ABSOLUTE UI OVERLAY (Floating HUD Layer with click events enabled for elements)
    const uiOverlay = document.createElement('div');
    uiOverlay.id = 'lobby-ui-overlay';
    Object.assign(uiOverlay.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '10',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      padding: '0.75rem',
      gap: '16px'
    });

    // --- LEFT COLUMN PANEL (No overlapping, elegant vertical layout) ---
    const leftPanel = document.createElement('div');
    leftPanel.id = 'lobby-left-panel';
    Object.assign(leftPanel.style, {
      flex: '1',
      minWidth: '0',
      maxWidth: '53.13rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    // --- TOP LEFT: BACK BUTTON ---
    const backBtn = document.createElement('div');
    backBtn.textContent = '← BACK';
    Object.assign(backBtn.style, {
      alignSelf: 'flex-start',
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.69rem, 1.5vh, 0.88rem)',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: DS.colors.textSecondary,
      letterSpacing: DS.typography.letterSpacing.wide,
      cursor: 'pointer',
      padding: 'clamp(0.38rem, 1vh, 0.63rem) clamp(0.75rem, 2vw, 1.25rem)',
      background: 'rgba(10, 10, 10, 0.75)',
      border: 'none',
      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0px',
      pointerEvents: 'auto',
      transition: 'all 0.2s ease-out'
    });
    backBtn.addEventListener('click', () => {
      const auth = getAuth();
      const myUid = auth.currentUser?.uid;
      const lobbyId = (window as any).vexLobbyId || (myUid ? `lobby_${myUid}` : null);
      if (myUid && lobbyId && sentInviteUids.length > 0) {
        cancelLobbyInvites(myUid, lobbyId, sentInviteUids);
        sentInviteUids.length = 0;
      }
      screenManager.showMainMenu();
    });
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.color = DS.colors.textPrimary;
      backBtn.style.borderBottomColor = DS.colors.accent;
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.color = DS.colors.textSecondary;
      backBtn.style.borderBottomColor = 'rgba(255, 255, 255, 0.1)';
    });
    leftPanel.appendChild(backBtn);

    // --- BOTTOM LEFT TO BOTTOM MIDDLE: CLASS CARDS GRID (FLOATING OVER BACKGROUND) ---
    const classCardsContainer = document.createElement('div');
    Object.assign(classCardsContainer.style, {
      width: '100%',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    const CLASS_IMAGES: Record<string, string> = {
      ASSAULT: 'assault_card_1.webp',
      DEMOLITIONS: 'demolition_card_1.webp',
      MEDIC: 'medic_card_1.webp',
      RECON: 'recon_card_1.webp'
    };

    const classList = Object.values(CLASSES);
    const savedClassId = ClassLoadoutPersistence.getEquippedClass();
    const initialClassIdx = classList.findIndex(c => c.id === savedClassId);
    let selectedClassIdx = initialClassIdx >= 0 ? initialClassIdx : 0;
    const cards: HTMLElement[] = [];

    const createClassCard = (idx: number, id: string, name: string) => {
      const card = document.createElement('div');
      const cardImg = CLASS_IMAGES[id] || 'assault_card_1.webp';
      card.dataset.classId = id;
      card.dataset.cardImg = cardImg;
      Object.assign(card.style, {
        width: '100%',
        aspectRatio: '1',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        borderRadius: '0px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        transition: 'all 0.18s ease-out',
        position: 'relative',
        overflow: 'hidden'
      });

      getCachedOrFetchUrl(cardImg, "Image").then(url => {
        card.dataset.resolvedUrl = url;
        updateSelection();
      }).catch(err => {
        console.error(`Failed to load card image for ${id}:`, err);
      });

      const cardName = document.createElement('div');
      cardName.className = 'class-card-name';
      cardName.textContent = name.toUpperCase();
      Object.assign(cardName.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: 'clamp(0.50rem, 1.1vh, 0.69rem)',
        fontWeight: 'bold',
        color: '#CCCCCC',
        letterSpacing: '0.5px',
        textAlign: 'center',
        width: '100%',
        padding: '0.38rem 2px',
        boxSizing: 'border-box',
        marginTop: 'auto',
        background: 'transparent',
        transition: 'color 0.18s ease-out',
        textShadow: '0 2px 4px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.9)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      });
      card.appendChild(cardName);

      card.addEventListener('mouseenter', () => {
        if (selectedClassIdx !== idx) {
          card.style.filter = 'brightness(1.15)';
        }
      });

      card.addEventListener('mouseleave', () => {
        if (selectedClassIdx !== idx) {
          card.style.filter = 'none';
        }
      });

      card.addEventListener('click', () => {
        selectedClassIdx = idx;
        updateSelection();
      });

      cards.push(card);
      classCardsContainer.appendChild(card);
    };

    classList.forEach((cls, idx) => {
      createClassCard(idx, cls.id, cls.displayName);
    });

    const updateSelection = () => {
      const selectedClass = classList[selectedClassIdx];
      if (selectedClass) {
        ClassLoadoutPersistence.setEquippedClass(selectedClass.id);
        const loadout = ClassLoadoutPersistence.getClassLoadout(selectedClass.id);
        const primaryItem = loadout.find(item => item.slotName === 'PRIMARY') || loadout[0];
        const weaponKey = primaryItem?.weaponKey || 'rifle';
        const itemId = primaryItem?.id || '';
        const skinId = ClassLoadoutSystem.getEquippedSkin(itemId);
        StudioPreviewManager.setLobbyLoadout(weaponKey, skinId);
      }
      cards.forEach((c, i) => {
        const nameEl = c.querySelector('.class-card-name') as HTMLElement;
        const cardImg = c.dataset.cardImg || 'assault_card_1.webp';
        const imgUrl = c.dataset.resolvedUrl || getAssetUrl(cardImg);
        c.style.border = 'none';
        if (i === selectedClassIdx) {
          c.style.filter = 'none';
          c.style.boxShadow = '0 0 12px rgba(255, 69, 0, 0.3)';
          c.style.backgroundImage = `linear-gradient(180deg, rgba(255, 69, 0, 0.2) 0%, rgba(0, 0, 0, 0.3) 100%), url('${imgUrl}')`;
          c.style.borderBottom = `3px solid ${DS.colors.accent}`;
          if (nameEl) {
            nameEl.style.color = '#FFFFFF';
            nameEl.style.background = 'transparent';
          }
        } else {
          c.style.boxShadow = 'none';
          c.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.55) 100%), url('${imgUrl}')`;
          c.style.borderBottom = '3px solid transparent';
          if (nameEl) {
            nameEl.style.color = '#AAAAAA';
            nameEl.style.background = 'transparent';
          }
        }
      });
    };

    updateSelection();

    // --- STYLISH MINIMALIST VERTICAL PROGRESSION (NO WORDS, NUMBERS ONLY) ---
    const progressionContainer = document.createElement('div');
    Object.assign(progressionContainer.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '16px',
      height: 'clamp(4.38rem, 15vh, 7.50rem)',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      paddingLeft: '0.75rem'
    });

    const trackCol = document.createElement('div');
    Object.assign(trackCol.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      width: '0.75rem',
      height: '100%'
    });

    const trackLine = document.createElement('div');
    Object.assign(trackLine.style, {
      position: 'absolute',
      top: '4px',
      bottom: '4px',
      width: '2px',
      background: 'rgba(255, 255, 255, 0.1)',
      zIndex: '1'
    });
    trackCol.appendChild(trackLine);

    const trackActiveLine = document.createElement('div');
    Object.assign(trackActiveLine.style, {
      position: 'absolute',
      top: '4px',
      bottom: '33%',
      width: '2px',
      background: DS.colors.accent,
      zIndex: '2'
    });
    trackCol.appendChild(trackActiveLine);

    const numbersCol = document.createElement('div');
    Object.assign(numbersCol.style, {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%'
    });

    // Replace hardcoded values with actual registered user progression stats, padded nicely
    const uData = (window as any).registeredUserData;
    const values = [
      String(uData?.battlePass || 1).padStart(2, '0'),
      String(uData?.totalMatches || 0).padStart(2, '0'),
      String(uData?.totalWins || 0).padStart(2, '0'),
      String(uData?.credits || 100).padStart(2, '0')
    ];
    values.forEach((val, index) => {
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '0.38rem',
        height: '0.38rem',
        borderRadius: '50%',
        background: index <= 2 ? DS.colors.accent : 'rgba(255, 255, 255, 0.2)',
        zIndex: '3',
        boxShadow: index <= 2 ? '0 0 6px ' + DS.colors.accent : 'none'
      });
      trackCol.appendChild(dot);

      const valEl = document.createElement('div');
      valEl.textContent = val;
      Object.assign(valEl.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: 'clamp(0.75rem, 1.8vh, 1.00rem)',
        fontWeight: '900',
        color: index <= 2 ? '#FFFFFF' : '#444444',
        letterSpacing: '1px',
        lineHeight: '1'
      });
      numbersCol.appendChild(valEl);
    });

    progressionContainer.appendChild(trackCol);
    progressionContainer.appendChild(numbersCol);
    leftPanel.appendChild(progressionContainer);

    leftPanel.appendChild(classCardsContainer);
    uiOverlay.appendChild(leftPanel);

    // --- RIGHT COLUMN PANEL (No overlapping, elegant vertical layout) ---
    const rightPanel = document.createElement('div');
    rightPanel.id = 'lobby-right-panel';
    Object.assign(rightPanel.style, {
      width: 'clamp(13.75rem, 25vw, 17.50rem)',
      flexShrink: '0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    // --- TOP TO MIDDLE RIGHT: GAMEMODE & MAP SELECTOR (CARDS WITH IMAGES) ---
    const selectionContainer = document.createElement('div');
    Object.assign(selectionContainer.style, {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    const availableModes = ['INFILTRATION', 'TEAM DEATHMATCH', 'HARDPOINT'];
    const MODE_IMAGES: Record<string, string> = {
      'INFILTRATION': 'infiltration_card_1.webp',
      'TEAM DEATHMATCH': 'squad_card_1.webp',
      'HARDPOINT': 'intel_card_1.webp'
    };
    let currentModeIdx = Math.max(0, availableModes.indexOf(localStorage.getItem('lastChosenGameMode') || 'INFILTRATION'));
    if (currentModeIdx < 0) currentModeIdx = 0;

    const availableMaps = MAP_REGISTRY.filter(m => !m.isDevMap || (window as any).IS_DEV);
    let currentMapId = localStorage.getItem('lastChosenMap') || getDefaultMap().id;
    let currentMapIdx = Math.max(0, availableMaps.findIndex(m => m.id === currentMapId));
    if (currentMapIdx < 0) currentMapIdx = 0;

    // Gamemode Card with Real Image Background
    const modeCard = document.createElement('div');
    Object.assign(modeCard.style, {
      width: '100%',
      height: 'clamp(4.06rem, 10vh, 5.31rem)',
      borderRadius: '0px',
      border: 'none',
      borderBottom: `3px solid ${DS.colors.accent}`,
      padding: 'clamp(0.50rem, 1.5vh, 1.00rem)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      cursor: 'pointer',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
    });

    const updateModeBg = () => {
      const modeName = availableModes[currentModeIdx];
      const imgFile = MODE_IMAGES[modeName] || 'infiltration_card_1.webp';
      modeCard.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%), url('${getAssetUrl(imgFile)}')`;
    };
    updateModeBg();

    const modeLabel = document.createElement('span');
    modeLabel.textContent = 'GAME MODE';
    Object.assign(modeLabel.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.50rem, 1vh, 0.63rem)',
      color: DS.colors.accent,
      fontWeight: '800',
      letterSpacing: '2px',
      marginBottom: '2px'
    });

    const modeTitle = document.createElement('div');
    modeTitle.textContent = availableModes[currentModeIdx];
    Object.assign(modeTitle.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.88rem, 2vh, 1.13rem)',
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: '1px',
      textTransform: 'uppercase'
    });

    modeCard.appendChild(modeLabel);
    modeCard.appendChild(modeTitle);

    modeCard.onclick = () => {
      currentModeIdx = (currentModeIdx + 1) % availableModes.length;
      const newMode = availableModes[currentModeIdx];
      modeTitle.textContent = newMode;
      updateModeBg();
      localStorage.setItem('lastChosenGameMode', newMode);
      import('../audio').then(({ audioManager }) => audioManager.play('click'));
    };

    // Map Card with Real Image Background
    const mapCard = document.createElement('div');
    Object.assign(mapCard.style, {
      width: '100%',
      height: 'clamp(4.06rem, 10vh, 5.31rem)',
      borderRadius: '0px',
      border: 'none',
      borderBottom: '3px solid rgba(255, 255, 255, 0.4)',
      padding: 'clamp(0.50rem, 1.5vh, 1.00rem)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      cursor: 'pointer',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
    });

    const mapLabel = document.createElement('span');
    mapLabel.textContent = 'MAP';
    Object.assign(mapLabel.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.50rem, 1vh, 0.63rem)',
      color: '#BBBBBB',
      fontWeight: '800',
      letterSpacing: '2px',
      marginBottom: '2px'
    });

    const mapTitle = document.createElement('div');
    const updateMapTitle = () => {
      const selectedMapObj = availableMaps[currentMapIdx] || getDefaultMap();
      mapTitle.textContent = selectedMapObj.displayName.toUpperCase();
    };
    updateMapTitle();
    Object.assign(mapTitle.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.88rem, 2vh, 1.13rem)',
      color: '#FFFFFF',
      fontWeight: '800',
      letterSpacing: '1px'
    });

    mapCard.appendChild(mapLabel);
    mapCard.appendChild(mapTitle);

    mapCard.onclick = () => {
      currentMapIdx = (currentMapIdx + 1) % availableMaps.length;
      const newMapObj = availableMaps[currentMapIdx];
      localStorage.setItem('lastChosenMap', newMapObj.id);
      updateMapTitle();
      import('../audio').then(({ audioManager }) => audioManager.play('click'));
    };

    selectionContainer.appendChild(modeCard);
    selectionContainer.appendChild(mapCard);
    rightPanel.appendChild(selectionContainer);

    // --- BOTTOM RIGHT: PRIMARY READY BUTTON & MUCH SMALLER SECONDARY INVITE BUTTON ---
    const actionsContainer = document.createElement('div');
    Object.assign(actionsContainer.style, {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });

    // Secondary, much smaller Invite Friends button
    const inviteFriendsBtn = document.createElement('button');
    inviteFriendsBtn.textContent = 'INVITE FRIENDS';
    Object.assign(inviteFriendsBtn.style, {
      alignSelf: 'flex-end',
      padding: '4px 0.63rem',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#AAAAAA',
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(0.56rem, 1.2vh, 0.69rem)',
      fontWeight: '700',
      textTransform: 'uppercase',
      borderRadius: '0px',
      cursor: 'pointer',
      pointerEvents: 'auto',
      transition: 'all 0.15s ease-out',
      letterSpacing: '1px'
    });

    inviteFriendsBtn.addEventListener('mouseenter', () => {
      inviteFriendsBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      inviteFriendsBtn.style.color = '#FFFFFF';
      inviteFriendsBtn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    });

    inviteFriendsBtn.addEventListener('mouseleave', () => {
      inviteFriendsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      inviteFriendsBtn.style.color = '#AAAAAA';
      inviteFriendsBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    inviteFriendsBtn.addEventListener('click', () => {
      const auth = getAuth();
      const myUid = auth.currentUser?.uid;
      const lobbyId = (window as any).vexLobbyId || (myUid ? `lobby_${myUid}` : `lobby_guest`);
      openLobbyInvitePopup(lobbyId);
    });

    // Big, Primary, bold Ready Button
    const readyBtn = document.createElement('button');
    readyBtn.textContent = 'READY';
    Object.assign(readyBtn.style, {
      width: '100%',
      height: 'clamp(2.50rem, 8vh, 3.50rem)',
      background: DS.colors.accent,
      border: 'none',
      color: DS.colors.background,
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(1.13rem, 3vh, 1.50rem)',
      fontWeight: '900',
      textTransform: 'uppercase',
      borderRadius: '0px',
      cursor: 'pointer',
      pointerEvents: 'auto',
      transition: 'all 0.15s ease-out',
      letterSpacing: '1px'
    });

    readyBtn.addEventListener('mouseenter', () => {
      readyBtn.style.background = '#FF6347';
      readyBtn.style.boxShadow = DS.shadows.accentStrong;
    });

    readyBtn.addEventListener('mouseleave', () => {
      readyBtn.style.background = DS.colors.accent;
      readyBtn.style.boxShadow = 'none';
    });

    readyBtn.addEventListener('mousedown', () => {
      readyBtn.style.background = '#CD3700';
    });

    readyBtn.addEventListener('mouseup', () => {
      readyBtn.style.background = DS.colors.accent;
    });

    readyBtn.addEventListener('touchstart', () => {
      readyBtn.style.background = '#CD3700';
    });

    readyBtn.addEventListener('touchend', () => {
      readyBtn.style.background = DS.colors.accent;
    });

    readyBtn.addEventListener('click', () => {
      const auth = getAuth();
      const myUid = auth.currentUser?.uid;
      const lobbyId = (window as any).vexLobbyId || (myUid ? `lobby_${myUid}` : null);
      if (myUid && lobbyId && sentInviteUids.length > 0) {
        cancelLobbyInvites(myUid, lobbyId, sentInviteUids);
        sentInviteUids.length = 0;
      }

      if (!IS_DESKTOP) {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (docEl.requestFullscreen) docEl.requestFullscreen();
          else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        }
      }

      const selectedMapId = localStorage.getItem('lastChosenMap') || getDefaultMap().id;
      const map = getMapById(selectedMapId) || getDefaultMap();
      const selectedClassId: ClassId = classList[selectedClassIdx]?.id || 'ASSAULT';
      const selectedMode = localStorage.getItem('lastChosenGameMode') || 'INFILTRATION';
      ensureAssetsDownloaded(() => {
        window.dispatchEvent(new CustomEvent("start-match", {
          detail: {
            mode: selectedMode,
            map,
            class: selectedClassId,
            isDevQuickStart: false
          }
        }));
      }, map.id);
    });

    actionsContainer.appendChild(inviteFriendsBtn);
    actionsContainer.appendChild(readyBtn);
    rightPanel.appendChild(actionsContainer);

    uiOverlay.appendChild(rightPanel);

    el.appendChild(uiOverlay);
    document.body.appendChild(el);
  }
}
