import * as screenManager from "./screen-manager";
import { getDefaultMap } from "../../shared/maps/map-registry";
import { ensureAssetsDownloaded } from "../asset-cache";
import { IS_DESKTOP } from "../gates/platform.gate";
import { DS } from "../design-system";
import { StudioPreviewManager } from "../StudioPreviewManager";
import { getAuth } from "firebase/auth";
import { getFriendsList, sendLobbyInvite, cancelLobbyInvites } from "../social";
import { CLASSES, ClassId } from "../../shared/classes";

const sentInviteUids: string[] = [];

function openLobbyInvitePopup(lobbyId: string) {
  import('../audio').then(({ audioManager }) => audioManager.play('click'));

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const myUid = currentUser ? currentUser.uid : null;
  const myName = currentUser?.displayName || (window as any).registeredUserData?.displayName || "Agent";

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', width: '100vw', height: '100vh',
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
    width: 'min(90vw, 420px)',
    background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(8, 8, 12, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.3)`,
    borderRadius: '6px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative'
  });

  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute', top: '12px', right: '16px', cursor: 'pointer', fontSize: '16px', color: DS.colors.textMuted
  });
  closeBtn.onclick = () => overlay.remove();
  popup.appendChild(closeBtn);

  const title = document.createElement('div');
  title.textContent = 'INVITE FRIENDS TO LOBBY';
  Object.assign(title.style, {
    fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px', color: DS.colors.accent, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px'
  });
  popup.appendChild(title);

  const listContainer = document.createElement('div');
  Object.assign(listContainer.style, {
    display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto'
  });

  const loadFriends = async () => {
    if (!myUid) {
      const emptyLabel = document.createElement('div');
      emptyLabel.textContent = 'MUST BE SIGNED IN TO INVITE FRIENDS';
      Object.assign(emptyLabel.style, { fontSize: '11px', color: DS.colors.textMuted, fontStyle: 'italic', padding: '12px 0', textAlign: 'center' });
      listContainer.appendChild(emptyLabel);
      return;
    }
    const friends = await getFriendsList(myUid);
    const accepted = friends.filter(f => f.status === 'accepted');

    if (accepted.length === 0) {
      const emptyLabel = document.createElement('div');
      emptyLabel.textContent = 'NO ACCEPTED FRIENDS FOUND';
      Object.assign(emptyLabel.style, { fontSize: '11px', color: DS.colors.textMuted, fontStyle: 'italic', padding: '12px 0', textAlign: 'center' });
      listContainer.appendChild(emptyLabel);
      return;
    }

    accepted.forEach(friend => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(255,255,255,0.1)'
      });

      const friendName = friend.displayName || friend.codename || friend.uid;
      const nameDiv = document.createElement('div');
      nameDiv.textContent = friendName;
      Object.assign(nameDiv.style, { fontSize: '12px', fontWeight: 'bold' });
      row.appendChild(nameDiv);

      const inviteBtn = document.createElement('button');
      const isAlreadyInvited = sentInviteUids.includes(friend.uid);
      inviteBtn.textContent = isAlreadyInvited ? 'INVITED' : 'INVITE';
      Object.assign(inviteBtn.style, {
        fontSize: '10px', fontWeight: 'bold', color: isAlreadyInvited ? '#888' : DS.colors.accent, background: 'transparent', border: `1px solid ${isAlreadyInvited ? '#444' : DS.colors.accent}`, padding: '4px 10px', cursor: isAlreadyInvited ? 'default' : 'pointer', borderRadius: '2px'
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
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '800',
      background: DS.colors.background,
      display: 'none',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      padding: DS.spacing.md,
      boxSizing: 'border-box',
      justifyContent: 'space-between'
    });

    // Top Section Container
    const topRow = document.createElement('div');
    Object.assign(topRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
      pointerEvents: 'none'
    });

    // 1. BACK button (Top Left)
    const backBtn = document.createElement('div');
    backBtn.textContent = '← BACK';
    Object.assign(backBtn.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(12px, 1.8vh, 16px)',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: DS.colors.textSecondary,
      letterSpacing: DS.typography.letterSpacing.wide,
      cursor: 'pointer',
      padding: `${DS.spacing.md} ${DS.spacing.xl}`,
      background: 'rgba(10, 10, 10, 0.65)',
      border: `${DS.borders.thin} rgba(255, 255, 255, 0.05)`,
      borderRadius: DS.borders.radius.sm,
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
      backBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.color = DS.colors.textSecondary;
      backBtn.style.borderColor = 'rgba(255, 255, 255, 0.05)';
    });
    topRow.appendChild(backBtn);

    // 2. GAMEMODE DETAILS (Top Right)
    const gamemodeBox = document.createElement('div');
    Object.assign(gamemodeBox.style, {
      background: 'rgba(10, 10, 10, 0.65)',
      backdropFilter: DS.glass.blur,
      webkitBackdropFilter: DS.glass.blur,
      border: `${DS.borders.thin} rgba(255, 255, 255, 0.05)`,
      borderRadius: DS.borders.radius.sm,
      padding: `${DS.spacing.lg} ${DS.spacing.xxl}`,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '4px'
    });

    const gmTitle = document.createElement('div');
    gmTitle.textContent = (localStorage.getItem('lastChosenGameMode') || 'INFILTRATION').toUpperCase();
    Object.assign(gmTitle.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(16px, 2.5vh, 22px)',
      fontWeight: 'bold',
      color: DS.colors.accent,
      letterSpacing: DS.typography.letterSpacing.wide
    });

    const gmSubtitle = document.createElement('div');
    gmSubtitle.textContent = 'STANDARD - OPEN MATCH';
    Object.assign(gmSubtitle.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(11px, 1.5vh, 14px)',
      color: DS.colors.textSecondary,
      letterSpacing: DS.typography.letterSpacing.tight
    });

    const gmContractors = document.createElement('div');
    gmContractors.textContent = 'CONTRACTORS: 1 / 10';
    Object.assign(gmContractors.style, {
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(10px, 1.3vh, 12px)',
      color: '#555555',
      letterSpacing: '1px',
      marginTop: '4px'
    });

    gamemodeBox.appendChild(gmTitle);
    gamemodeBox.appendChild(gmSubtitle);
    gamemodeBox.appendChild(gmContractors);
    topRow.appendChild(gamemodeBox);

    el.appendChild(topRow);

    // 3. MIDDLE AREA (Hosts persistent 3D Studio Canvas Backdrop)
    const middleSpacer = document.createElement('div');
    middleSpacer.id = 'lobby-3d-backdrop';
    Object.assign(middleSpacer.style, {
      flex: '1',
      width: '100%',
      position: 'relative',
      pointerEvents: 'auto'
    });
    el.appendChild(middleSpacer);

    requestAnimationFrame(() => {
      StudioPreviewManager.attachTo(middleSpacer, 'LOBBY');
    });

    // 4. BOTTOM CONTAINER (Cards on the left, Ready on the right)
    const bottomRow = document.createElement('div');
    Object.assign(bottomRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      width: '100%',
      gap: '24px',
      pointerEvents: 'none'
    });

    // Class cards list (4-column grid layout across available width, no horizontal scrolling)
    const cardsContainer = document.createElement('div');
    Object.assign(cardsContainer.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      pointerEvents: 'auto',
      flex: '1',
      maxWidth: 'calc(100% - clamp(160px, 18vw, 220px) - 24px)',
      overflow: 'hidden'
    });

    let selectedClassIdx = 0;
    const cards: HTMLElement[] = [];

    const createClassCard = (idx: number, name: string, desc: string, utils: string[]) => {
      const card = document.createElement('div');
      Object.assign(card.style, {
        width: '100%',
        height: 'clamp(130px, 20vh, 190px)',
        background: 'rgba(10, 10, 10, 0.75)',
        backdropFilter: DS.glass.blur,
        webkitBackdropFilter: DS.glass.blur,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        padding: '12px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.18s ease-out'
      });

      const topContent = document.createElement('div');
      topContent.style.display = 'flex';
      topContent.style.flexDirection = 'column';
      topContent.style.gap = '4px';

      const cardName = document.createElement('div');
      cardName.textContent = name;
      Object.assign(cardName.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: 'clamp(16px, 2.5vh, 22px)',
        fontWeight: 'bold',
        color: '#E8E8E8',
        letterSpacing: '1px'
      });

      const cardDesc = document.createElement('div');
      cardDesc.textContent = desc.toUpperCase();
      Object.assign(cardDesc.style, {
        fontFamily: DS.typography.fontFamily,
        fontSize: 'clamp(10px, 1.4vh, 12px)',
        color: '#888888',
        lineHeight: '1.3'
      });

      topContent.appendChild(cardName);
      topContent.appendChild(cardDesc);
      card.appendChild(topContent);

      const utilsContainer = document.createElement('div');
      utilsContainer.style.display = 'flex';
      utilsContainer.style.flexDirection = 'column';
      utilsContainer.style.gap = '2px';

      utils.forEach(u => {
        const uDiv = document.createElement('div');
        uDiv.textContent = `• ${u.toUpperCase()}`;
        uDiv.className = 'lobby-card-ability';
        Object.assign(uDiv.style, {
          fontFamily: DS.typography.fontFamily,
          fontSize: 'clamp(9px, 1.2vh, 11px)',
          color: '#555555',
          letterSpacing: '1px',
          transition: 'color 0.18s ease-out'
        });
        utilsContainer.appendChild(uDiv);
      });

      card.appendChild(utilsContainer);

      card.addEventListener('mouseenter', () => {
        if (selectedClassIdx !== idx) {
          card.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
      });

      card.addEventListener('mouseleave', () => {
        if (selectedClassIdx !== idx) {
          card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        }
      });

      card.addEventListener('click', () => {
        selectedClassIdx = idx;
        updateSelection();
      });

      cards.push(card);
      cardsContainer.appendChild(card);
    };

    const classList = Object.values(CLASSES);
    classList.forEach((cls, idx) => {
      createClassCard(idx, cls.displayName, cls.role, [cls.primaryWeapon, cls.secondaryWeapon, cls.utility1, cls.utility2]);
    });

    const updateSelection = () => {
      cards.forEach((c, i) => {
        if (i === selectedClassIdx) {
          c.style.borderColor = DS.colors.accent;
          c.style.boxShadow = DS.shadows.accent;
          c.style.background = 'rgba(255, 69, 0, 0.05)';
          const abDivs = c.querySelectorAll('.lobby-card-ability');
          abDivs.forEach(ab => {
            (ab as HTMLElement).style.color = DS.colors.accent;
          });
        } else {
          c.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          c.style.boxShadow = 'none';
          c.style.background = 'rgba(10, 10, 10, 0.75)';
          const abDivs = c.querySelectorAll('.lobby-card-ability');
          abDivs.forEach(ab => {
            (ab as HTMLElement).style.color = '#555555';
          });
        }
      });
    };

    updateSelection();
    bottomRow.appendChild(cardsContainer);

    // 5. READY & INVITE Button Container (Bottom Right)
    const actionContainer = document.createElement('div');
    Object.assign(actionContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px',
      pointerEvents: 'auto',
      flexShrink: '0'
    });

    const inviteFriendsBtn = document.createElement('button');
    inviteFriendsBtn.textContent = 'INVITE FRIENDS';
    Object.assign(inviteFriendsBtn.style, {
      width: 'clamp(140px, 15vw, 200px)',
      height: 'clamp(32px, 4.5vh, 40px)',
      background: 'rgba(255, 69, 0, 0.15)',
      border: `1px solid ${DS.colors.accent}`,
      color: DS.colors.accent,
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(11px, 1.6vh, 14px)',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderRadius: DS.borders.radius.sm,
      cursor: 'pointer',
      transition: 'all 0.15s ease-out',
      letterSpacing: '1px'
    });

    inviteFriendsBtn.addEventListener('mouseenter', () => {
      inviteFriendsBtn.style.background = 'rgba(255, 69, 0, 0.3)';
    });

    inviteFriendsBtn.addEventListener('mouseleave', () => {
      inviteFriendsBtn.style.background = 'rgba(255, 69, 0, 0.15)';
    });

    inviteFriendsBtn.addEventListener('click', () => {
      const auth = getAuth();
      const myUid = auth.currentUser?.uid;
      const lobbyId = (window as any).vexLobbyId || (myUid ? `lobby_${myUid}` : `lobby_guest`);
      openLobbyInvitePopup(lobbyId);
    });

    const readyBtn = document.createElement('button');
    readyBtn.textContent = 'READY';
    Object.assign(readyBtn.style, {
      width: 'clamp(140px, 15vw, 200px)',
      height: 'clamp(44px, 6vh, 56px)',
      background: DS.colors.accent,
      border: 'none',
      color: DS.colors.background,
      fontFamily: DS.typography.fontFamily,
      fontSize: 'clamp(18px, 2.5vh, 26px)',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderRadius: DS.borders.radius.sm,
      cursor: 'pointer',
      transition: 'all 0.15s ease-out'
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

      // Synchronously request fullscreen and pointer lock on canvas-container
      if (!IS_DESKTOP) {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (docEl.requestFullscreen) docEl.requestFullscreen();
          else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        }
      }

      const map = getDefaultMap();
      const selectedClassId: ClassId = classList[selectedClassIdx]?.id || 'ASSAULT';
      ensureAssetsDownloaded(() => {
        window.dispatchEvent(new CustomEvent("start-match", {
          detail: {
            map,
            class: selectedClassId,
            isDevQuickStart: false
          }
        }));
      }, map.id);
    });

    actionContainer.appendChild(inviteFriendsBtn);
    actionContainer.appendChild(readyBtn);
    bottomRow.appendChild(actionContainer);

    el.appendChild(bottomRow);
    document.body.appendChild(el);
  }
}
