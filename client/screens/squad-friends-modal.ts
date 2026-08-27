import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { DS } from "../design-system";
import {
  resolveDisplayName,
  sendFriendRequest,
  getFriendsList,
  getIncomingRequests,
  respondToFriendRequest,
  getLobbyInvites,
  respondToLobbyInvite
} from "../social";
import { userProfileCache } from "./menu-state";

export function openSquadFriendsModal() {
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
    width: 'min(92vw, 45.00rem)',
    maxHeight: '90vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'linear-gradient(180deg, rgba(12, 12, 15, 0.98) 0%, rgba(6, 6, 8, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.25)`,
    padding: '1.25rem 1.25rem',
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
    top: '0.75rem',
    right: '1.00rem',
    cursor: 'pointer',
    fontSize: DS.typography.sizes.headingSm,
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
    fontSize: DS.typography.sizes.headingSm,
    fontWeight: 'bold',
    letterSpacing: '2px',
    borderBottom: `2px solid ${DS.colors.accent}`,
    paddingBottom: '0.38rem',
    color: DS.colors.text
  });
  container.appendChild(title);

  let activeTab = 'FRIENDS';
  const tabsContainer = document.createElement('div');
  Object.assign(tabsContainer.style, {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0.38rem'
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
      fontSize: DS.typography.sizes.small,
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
        display: 'flex', flexDirection: 'column', gap: '0.50rem', maxHeight: '17.50rem', overflowY: 'auto', paddingRight: '4px'
      });

      const refreshFriendsList = async () => {
        listContainer.innerHTML = '';
        const auth = getAuth();
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        if (!myUid) {
          const emptyLabel = document.createElement('div');
          emptyLabel.textContent = 'MUST BE SIGNED IN TO VIEW FRIENDS';
          Object.assign(emptyLabel.style, { fontSize: DS.typography.sizes.small, color: DS.colors.textMuted, fontStyle: 'italic', padding: '0.38rem 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        const friendsList = await getFriendsList(myUid);
        const accepted = friendsList.filter(f => f.status === 'accepted');
        if (accepted.length === 0) {
          const emptyLabel = document.createElement('div');
          emptyLabel.textContent = 'NO FRIENDS ADDED YET';
          Object.assign(emptyLabel.style, { fontSize: DS.typography.sizes.small, color: DS.colors.textMuted, fontStyle: 'italic', padding: '0.38rem 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        accepted.forEach(friend => {
          const friendRow = document.createElement('div');
          Object.assign(friendRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.50rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${DS.colors.accent}`
          });

          const friendName = friend.displayName || friend.codename || friend.uid;
          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold; font-size: ${DS.typography.sizes.body};">${friendName}</span> <span style="font-size: ${DS.typography.sizes.tiny}; color:#44ff44; margin-left:0.50rem;">● ONLINE</span>`;
          friendRow.appendChild(nameLabel);
          listContainer.appendChild(friendRow);
        });
      };

      refreshFriendsList();
      contentArea.appendChild(listContainer);
    } else if (activeTab === 'REQUESTS') {
      const listContainer = document.createElement('div');
      Object.assign(listContainer.style, {
        display: 'flex', flexDirection: 'column', gap: '0.50rem', maxHeight: '17.50rem', overflowY: 'auto', paddingRight: '4px'
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
          Object.assign(emptyLabel.style, { fontSize: DS.typography.sizes.small, color: DS.colors.textMuted, fontStyle: 'italic', padding: '0.38rem 0' });
          listContainer.appendChild(emptyLabel);
          return;
        }

        const dbInstance = getFirestore();

        // Optimize N+1 Firestore queries via Batch Fetch & Cache (PROPOSED_PLAN.md Issue 3)
        const uncachedUids = Array.from(new Set(incomingList.map(req => req.senderUid)))
          .filter(uid => !userProfileCache.has(uid));

        if (uncachedUids.length > 0) {
          const chunkSize = 30;
          for (let i = 0; i < uncachedUids.length; i += chunkSize) {
            const chunk = uncachedUids.slice(i, i + chunkSize);
            try {
              const usersQuery = query(
                collection(dbInstance, "Users"),
                where(documentId(), "in", chunk)
              );
              const querySnapshot = await getDocs(usersQuery);
              querySnapshot.forEach(userDoc => {
                const data = userDoc.data();
                if (data && data.displayName) {
                  userProfileCache.set(userDoc.id, data.displayName);
                }
              });
            } catch (e) {
              console.warn("Failed to batch fetch user profiles:", e);
            }
          }
        }

        for (const req of incomingList) {
          const reqRow = document.createElement('div');
          Object.assign(reqRow.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.38rem 0.50rem', background: 'rgba(255,255,255,0.02)'
          });

          const senderName = userProfileCache.get(req.senderUid) || req.senderUid;

          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold;">${senderName}</span> <span style="font-size: ${DS.typography.sizes.tiny}; color:#ffaa00; margin-left:0.38rem;">● FRIEND REQUEST</span>`;
          Object.assign(nameLabel.style, { fontSize: DS.typography.sizes.small });
          reqRow.appendChild(nameLabel);

          const actionsContainer = document.createElement('div');
          Object.assign(actionsContainer.style, { display: 'flex', gap: '6px' });

          const acceptBtn = document.createElement('div');
          acceptBtn.textContent = 'ACCEPT';
          Object.assign(acceptBtn.style, {
            fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: '#44ff44', cursor: 'pointer', padding: '2px 0.38rem', border: '1px solid #44ff44', borderRadius: '0px'
          });
          acceptBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            await respondToFriendRequest(myUid, req.senderUid, true);
            refreshIncomingRequestsList();
          };

          const declineBtn = document.createElement('div');
          declineBtn.textContent = 'DECLINE';
          Object.assign(declineBtn.style, {
            fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: '#ff4444', cursor: 'pointer', padding: '2px 0.38rem', border: '1px solid #ff4444', borderRadius: '0px'
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.38rem 0.50rem', background: 'rgba(255,69,0,0.05)', borderLeft: `2px solid ${DS.colors.accent}`
          });

          const nameLabel = document.createElement('div');
          nameLabel.innerHTML = `<span style="font-weight:bold;">${invite.fromName}</span> <span style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.accent}; margin-left:0.38rem;">● LOBBY INVITE</span>`;
          Object.assign(nameLabel.style, { fontSize: DS.typography.sizes.small });
          inviteRow.appendChild(nameLabel);

          const actionsContainer = document.createElement('div');
          Object.assign(actionsContainer.style, { display: 'flex', gap: '6px' });

          const acceptBtn = document.createElement('div');
          acceptBtn.textContent = 'JOIN LOBBY';
          Object.assign(acceptBtn.style, {
            fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: '#44ff44', cursor: 'pointer', padding: '2px 0.38rem', border: '1px solid #44ff44', borderRadius: '0px'
          });
          acceptBtn.onclick = async () => {
            import('../audio').then(({ audioManager }) => audioManager.play('click'));
            overlay.remove();
            await respondToLobbyInvite(myUid, invite.lobbyId, true);
          };

          const declineBtn = document.createElement('div');
          declineBtn.textContent = 'DECLINE';
          Object.assign(declineBtn.style, {
            fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: '#ff4444', cursor: 'pointer', padding: '2px 0.38rem', border: '1px solid #ff4444', borderRadius: '0px'
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
        display: 'flex', gap: '0.50rem', marginBottom: '0.50rem'
      });
      const input = document.createElement('input');
      input.placeholder = 'ENTER CODENAME...';
      Object.assign(input.style, {
        flex: '1', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '0.38rem 0.75rem', fontSize: DS.typography.sizes.small, fontFamily: DS.typography.fontFamily, outline: 'none'
      });

      const addBtn = document.createElement('div');
      addBtn.textContent = 'ADD';
      Object.assign(addBtn.style, {
        background: DS.colors.accent, color: DS.colors.background, padding: '0.38rem 1.00rem', fontWeight: 'bold', fontSize: DS.typography.sizes.small, cursor: 'pointer', display: 'flex', alignItems: 'center'
      });

      const feedbackMsg = document.createElement('div');
      Object.assign(feedbackMsg.style, {
        fontSize: DS.typography.sizes.small, marginBottom: '0.50rem', minHeight: '0.88rem'
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

