import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { DS } from "../design-system";
import { IS_DEV } from "../../shared/gates/production.gate";
import { ValidatorGate } from "../../shared/gates/validator.gate";
import { ensureUsernameMapped } from "../social";
import { showMenuNotification } from "./notification";
import { getRegisteredUserData, setRegisteredUserData } from "./menu-state";

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
    padding: '1.00rem',
    fontFamily: DS.typography.fontFamily, color: DS.colors.text,
    overflowY: 'auto'
  });

  const box = document.createElement('div');
  box.className = 'mm-glass';
  Object.assign(box.style, {
    width: 'min(92vw, 42.50rem)',
    maxHeight: '90vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'linear-gradient(180deg, rgba(14, 14, 18, 0.98) 0%, rgba(6, 6, 9, 0.99) 100%)',
    border: `1px solid rgba(255, 69, 0, 0.25)`,
    boxShadow: '0 0 35px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 69, 0, 0.15)',
    padding: '1.25rem 1.25rem',
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
    position: 'absolute', top: '0.88rem', right: '1.00rem',
    background: 'none', border: 'none', color: DS.colors.textMuted,
    fontSize: DS.typography.sizes.headingSm, cursor: 'pointer', zIndex: '10'
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
    fontSize: DS.typography.sizes.headingMd, fontWeight: '800', letterSpacing: '0.31rem',
    color: DS.colors.accent
  });
  branding.appendChild(word);

  const sub = document.createElement('div');
  sub.textContent = 'RESTRICTED SYSTEM ACCESS — OPERATIVE IDENTIFICATION';
  Object.assign(sub.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny, letterSpacing: '2px', color: DS.colors.textMuted, marginTop: '2px'
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
      flex: '1', padding: '0.63rem', background: 'none', border: 'none',
      borderBottom: activeTab === 'GUEST' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      color: activeTab === 'GUEST' ? DS.colors.text : DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold',
      letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s'
    });
    tabGuestBtn.textContent = '1. GUEST ENLISTMENT';

    Object.assign(tabAuthBtn.style, {
      flex: '1', padding: '0.63rem', background: 'none', border: 'none',
      borderBottom: activeTab === 'AUTH' ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      color: activeTab === 'AUTH' ? DS.colors.text : DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold',
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
      if (getRegisteredUserData() && getRegisteredUserData().displayName) {
        const activeCard = document.createElement('div');
        activeCard.className = 'mm-glass';
        Object.assign(activeCard.style, {
          padding: '1.00rem', display: 'flex', flexDirection: 'column', gap: '0.50rem',
          borderLeft: `3px solid ${DS.colors.accent}`
        });
        activeCard.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.accent}; letter-spacing:2px; font-weight:bold;">ACTIVE GUEST SESSION</div>
          <div style="font-size: ${DS.typography.sizes.headingSm}; font-weight:bold; letter-spacing:2px; color:${DS.colors.text};">${getRegisteredUserData().displayName}</div>
          <div style="font-size: ${DS.typography.sizes.small}; color:${DS.colors.textMuted};">FACTION: <span style="color:#FFF;">${getRegisteredUserData().faction || 'UNAFFILIATED'}</span></div>
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; line-height:1.4; margin-top:4px;">
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
          fontSize: DS.typography.sizes.small, letterSpacing: '2px', color: DS.colors.accent
        });
        inputGroup.appendChild(inputLabel);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ENTER CODENAME [3-16 ALPHANUMERIC]';
        Object.assign(input.style, {
          width: '100%', padding: '0.63rem 0.75rem', background: 'rgba(0, 0, 0, 0.5)',
          border: DS.glass.border, color: DS.colors.text, fontFamily: DS.typography.fontFamily,
          fontSize: DS.typography.sizes.body, letterSpacing: '2px', outline: 'none', textAlign: 'center',
          boxSizing: 'border-box'
        });
        inputGroup.appendChild(input);
        contentContainer.appendChild(inputGroup);

        const factionLabel = document.createElement('div');
        factionLabel.textContent = 'FACTION AFFILIATION';
        Object.assign(factionLabel.style, {
          fontSize: DS.typography.sizes.small, letterSpacing: '2px', color: DS.colors.textMuted
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
          padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', transition: 'all 200ms ease'
        });
        vibeCard.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.body}; font-weight:bold; letter-spacing:1px; color:${DS.colors.factions.vibe.primary};">VIBE CO.</div>
          <div style="font-size: ${DS.typography.sizes.tiny}; letter-spacing:1px; color:${DS.colors.factions.vibe.muted}; margin-top:2px;">SILENT & PRECISE</div>
        `;
        vibeCard.onclick = () => {
          selectedFaction = 'VIBE CO.';
          vibeCard.style.border = `1px solid ${DS.colors.factions.vibe.primary}`;
          slopCard.style.border = DS.glass.border;
        };

        const slopCard = document.createElement('div');
        slopCard.className = 'mm-glass';
        Object.assign(slopCard.style, {
          padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', transition: 'all 200ms ease'
        });
        slopCard.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.body}; font-weight:bold; letter-spacing:1px; color:${DS.colors.factions.slop.primary};">SLOP INC.</div>
          <div style="font-size: ${DS.typography.sizes.tiny}; letter-spacing:1px; color:${DS.colors.factions.slop.muted}; margin-top:2px;">BRUTALIST & UTILITY</div>
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
          fontSize: DS.typography.sizes.small, color: DS.colors.danger, textAlign: 'center', height: '0.88rem'
        });
        contentContainer.appendChild(errText);

        const enlistBtn = document.createElement('button');
        enlistBtn.textContent = 'ENLIST AS GUEST';
        Object.assign(enlistBtn.style, {
          width: '100%', padding: '0.75rem', background: DS.colors.accent, color: DS.colors.background,
          fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.body, fontWeight: 'bold',
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
              credits: 500, energy: 10, unlockedItems: [], totalXp: 0, adClaimsToday: 0, lastAdClaimDate: 0,
              createdAt: serverTimestamp(), dailyRefreshedAt: serverTimestamp(),
              totalMatches: 0, totalWins: 0, totalDroneEliminations: 0, totalDeaths: 0,
              score: 0, kills: 0, battlePass: 1
            };
            await setDoc(doc(db, 'Users', uid), docData);
            await ensureUsernameMapped(uid, codename);
            setRegisteredUserData(docData);
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
      if (user && !user.isAnonymous) {
        // Authenticated Profile Card (Section 11 Design Protocol)
        const profileCard = document.createElement('div');
        profileCard.className = 'mm-glass';
        Object.assign(profileCard.style, {
          padding: '1.00rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
          border: `1px solid ${DS.colors.accent}`, background: 'rgba(0, 240, 255, 0.03)'
        });

        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' });

        const headerTitle = document.createElement('div');
        const providerName = (user.providerData[0]?.providerId || 'GOOGLE / EMAIL').toUpperCase();
        headerTitle.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.accent}; letter-spacing:2px; font-weight:bold;">AUTHENTICATED ACCOUNT</div>
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; margin-top:2px;">PROVIDER: ${providerName}</div>
        `;

        const statusBadge = document.createElement('div');
        statusBadge.textContent = '[AUTHENTICATED]';
        Object.assign(statusBadge.style, {
          fontSize: DS.typography.sizes.tiny, fontWeight: 'bold', color: '#00FF66', border: '1px solid #00FF66',
          padding: '2px 0.38rem', background: 'rgba(0, 255, 102, 0.12)', letterSpacing: '1px'
        });

        headerRow.appendChild(headerTitle);
        headerRow.appendChild(statusBadge);
        profileCard.appendChild(headerRow);

        // User Avatar & Info
        const infoRow = document.createElement('div');
        Object.assign(infoRow.style, { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2px' });

        if (user.photoURL) {
          const img = document.createElement('img');
          img.src = user.photoURL;
          img.alt = 'User Avatar';
          Object.assign(img.style, { width: '2.63rem', height: '2.63rem', borderRadius: '50%', border: `1px solid ${DS.colors.accent}`, flexShrink: '0' });
          infoRow.appendChild(img);
        } else {
          const avatarBadge = document.createElement('div');
          avatarBadge.textContent = (getRegisteredUserData()?.displayName || user.displayName || user.email || 'OP').charAt(0).toUpperCase();
          Object.assign(avatarBadge.style, {
            width: '2.63rem', height: '2.63rem', borderRadius: '50%', background: DS.colors.accent,
            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: DS.typography.sizes.headingSm, fontWeight: 'bold', flexShrink: '0'
          });
          infoRow.appendChild(avatarBadge);
        }

        const details = document.createElement('div');
        Object.assign(details.style, { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' });
        const nameStr = (getRegisteredUserData()?.displayName || user.displayName || user.email?.split('@')[0] || 'OPERATIVE').toUpperCase();
        details.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.body}; font-weight:bold; color:${DS.colors.text}; letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nameStr}</div>
          <div style="font-size: ${DS.typography.sizes.small}; color:${DS.colors.textMuted}; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.email || user.uid}</div>
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; margin-top:2px;">FACTION: <span style="color:#FFF; font-weight:bold;">${getRegisteredUserData()?.faction || 'VIBE CO.'}</span></div>
        `;
        infoRow.appendChild(details);
        profileCard.appendChild(infoRow);

        // Action Buttons Row
        const actionsRow = document.createElement('div');
        Object.assign(actionsRow.style, { display: 'flex', gap: '0.63rem', marginTop: '0.38rem' });

        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'LOG OUT OF ACCOUNT';
        Object.assign(logoutBtn.style, {
          flex: '1', padding: '0.63rem', background: 'rgba(255, 68, 0, 0.15)', border: `1px solid ${DS.colors.accent}`,
          color: DS.colors.accent, fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold',
          letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s'
        });

        logoutBtn.onclick = async () => {
          try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
            showMenuNotification("LOGGED OUT. RETURNED TO GUEST SESSION.");
            overlay.remove();
          } catch (e: any) {
            console.warn("Logout error:", e);
            showMenuNotification(`Logout Error: ${e?.message || 'Unable to logout'}`, "warning");
          }
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'CLOSE OVERLAY';
        Object.assign(closeBtn.style, {
          flex: '1', padding: '0.63rem', background: 'rgba(255,255,255,0.08)', border: DS.glass.border,
          color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold',
          letterSpacing: '1px', cursor: 'pointer'
        });
        closeBtn.onclick = () => overlay.remove();

        actionsRow.appendChild(logoutBtn);
        actionsRow.appendChild(closeBtn);
        profileCard.appendChild(actionsRow);

        contentContainer.appendChild(profileCard);
        return;
      }

      if (pendingAuthAction) {
        // Confirmation prompt for guest progress overwrite
        const warnBox = document.createElement('div');
        warnBox.className = 'mm-glass';
        Object.assign(warnBox.style, {
          padding: '1.00rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
          border: `1px solid ${DS.colors.accent}`, background: 'rgba(255, 68, 0, 0.08)'
        });
        warnBox.innerHTML = `
          <div style="font-size: ${DS.typography.sizes.small}; font-weight:bold; color:${DS.colors.accent}; letter-spacing:1px;">⚠️ OVERWRITE GUEST SESSION WARNING</div>
          <div style="font-size: ${DS.typography.sizes.small}; color:${DS.colors.text}; line-height:1.5;">
            Logging into an existing account will end your current guest session <strong style="color:${DS.colors.accent}">${getRegisteredUserData()?.displayName || 'GUEST'}</strong> and discard unlinked progress.
          </div>
          <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted};">Are you sure you want to proceed with account authentication?</div>
        `;

        const warnBtnRow = document.createElement('div');
        Object.assign(warnBtnRow.style, { display: 'flex', gap: '10px' });

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'YES, LOG IN NOW';
        Object.assign(confirmBtn.style, {
          flex: '1', padding: '0.63rem', background: DS.colors.accent, color: DS.colors.background,
          fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold', border: 'none', cursor: 'pointer'
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'CANCEL';
        Object.assign(cancelBtn.style, {
          flex: '1', padding: '0.63rem', background: 'rgba(255,255,255,0.1)', color: DS.colors.text,
          fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold', border: DS.glass.border, cursor: 'pointer'
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
      Object.assign(statusBox.style, { padding: '0.63rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' });
      const currentUid = user ? user.uid : 'NOT_LOGGED_IN';
      const isAnon = user ? user.isAnonymous : true;
      const authProvider = isAnon ? 'GUEST SESSION' : (user?.providerData[0]?.providerId || 'EMAIL / PASSWORD');
      statusBox.innerHTML = `
        <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; letter-spacing:1px;">CURRENT USER IDENTIFIER</div>
        <div style="font-size: ${DS.typography.sizes.small}; font-weight:bold; color:${DS.colors.text}; font-family:monospace; word-break:break-all;">${currentUid}</div>
        <div style="font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.accent}; font-weight:bold; margin-top:2px;">PROVIDER: ${authProvider.toUpperCase()}</div>
      `;
      contentContainer.appendChild(statusBox);

      // Google Auth button
      const googleBtn = document.createElement('button');
      googleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:0.50rem;"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/></svg>
        SIGN IN WITH GOOGLE
      `;
      Object.assign(googleBtn.style, {
        width: '100%', padding: '0.69rem', background: '#FFFFFF', color: '#000000',
        fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold',
        border: 'none', borderRadius: '0px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      });

      const execGoogleAuth = async () => {
        const wasFullscreen = !!document.fullscreenElement;
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
          if (wasFullscreen && !document.fullscreenElement) {
            try { await document.documentElement.requestFullscreen(); } catch (e) {}
          }
          showMenuNotification(`SIGNED IN AS ${(loggedUser.displayName || loggedUser.email || 'OPERATIVE').toUpperCase()}`);
          overlay.remove();
        } catch (err: any) {
          console.warn("Google Auth error:", err);
          showMenuNotification(`SIGN IN ERROR: ${err?.message || 'Unable to authenticate'}`, "warning");
        }
      };

      googleBtn.onclick = () => {
        if (auth.currentUser?.isAnonymous && getRegisteredUserData()?.displayName) {
          pendingAuthAction = execGoogleAuth;
          renderContent();
        } else {
          execGoogleAuth();
        }
      };
      contentContainer.appendChild(googleBtn);

      const divOr = document.createElement('div');
      divOr.textContent = '— OR USE EMAIL / PASSWORD —';
      Object.assign(divOr.style, { fontSize: DS.typography.sizes.tiny, color: DS.colors.textMuted, textAlign: 'center' });
      contentContainer.appendChild(divOr);

      const emailInput = document.createElement('input');
      emailInput.type = 'email'; emailInput.placeholder = 'EMAIL ADDRESS';
      Object.assign(emailInput.style, {
        width: '100%', padding: '0.63rem', background: 'rgba(0,0,0,0.5)', border: DS.glass.border,
        color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, outline: 'none', boxSizing: 'border-box'
      });

      const passInput = document.createElement('input');
      passInput.type = 'password'; passInput.placeholder = 'PASSWORD';
      Object.assign(passInput.style, {
        width: '100%', padding: '0.63rem', background: 'rgba(0,0,0,0.5)', border: DS.glass.border,
        color: DS.colors.text, fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, outline: 'none', boxSizing: 'border-box'
      });

      contentContainer.appendChild(emailInput);
      contentContainer.appendChild(passInput);

      const btnRow = document.createElement('div');
      Object.assign(btnRow.style, { display: 'flex', gap: '8px' });

      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'EMAIL LOGIN';
      Object.assign(loginBtn.style, {
        flex: '1', padding: '0.63rem', background: DS.colors.accent, color: DS.colors.background,
        fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold', border: 'none', cursor: 'pointer'
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
        if (auth.currentUser?.isAnonymous && getRegisteredUserData()?.displayName) {
          pendingAuthAction = execEmailLogin;
          renderContent();
        } else {
          execEmailLogin();
        }
      };

      const registerBtn = document.createElement('button');
      registerBtn.textContent = 'CREATE ACCOUNT';
      Object.assign(registerBtn.style, {
        flex: '1', padding: '0.63rem', background: 'rgba(255,255,255,0.1)', color: DS.colors.text,
        fontFamily: DS.typography.fontFamily, fontSize: DS.typography.sizes.small, fontWeight: 'bold', border: DS.glass.border, cursor: 'pointer'
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
          const guestData = getRegisteredUserData();
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

      if (IS_DEV) {
        const devWipeBtn = document.createElement('button');
        devWipeBtn.textContent = '[DEV] WIPE GUEST & RESET ONBOARDING';
        Object.assign(devWipeBtn.style, {
          width: '100%', padding: '0.63rem', background: DS.colors.danger,
          border: 'none', color: '#FFFFFF', fontFamily: DS.typography.fontFamily,
          fontSize: DS.typography.sizes.small, fontWeight: 'bold', cursor: 'pointer', marginTop: '0.63rem'
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

export function showEnlistmentOverlay(db: any, auth: any) {
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

