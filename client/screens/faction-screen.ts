import { DS } from "../design-system";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { audioManager } from "../audio";
import { getDefaultMap } from "../../shared/maps/map-registry";
import { clientFlagService } from "../flags/flag-service";
import { FeatureFlagKey } from "../../shared/feature-flags";

interface FactionSector {
  id: string;
  name: string;
  controller: 'apex' | 'vanguard' | 'nexus' | 'contested';
  controlPercentage: number;
  activeBattles: number;
  resourceYield: number;
  defenseLevel: number;
}

function createTerritoryArcSVG(vibePct: number, slopPct: number): string {
  const size = 64;
  const center = size / 2;
  const r = 25;
  const circumference = 2 * Math.PI * r;
  const vibeLength = (vibePct / 100) * circumference;
  const slopLength = (slopPct / 100) * circumference;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block; margin:0 auto;">
      <!-- Vibe Arc -->
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#00F0FF" stroke-width="5"
              stroke-dasharray="${vibeLength} ${circumference}" transform="rotate(-90 ${center} ${center})"/>
      <!-- Slop Arc -->
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${DS.colors.accent}" stroke-width="5"
              stroke-dasharray="${slopLength} ${circumference}" stroke-dashoffset="-${vibeLength}" transform="rotate(-90 ${center} ${center})"/>
      <text x="${center}" y="${center - 2}" text-anchor="middle" fill="${DS.colors.text}" font-family="${DS.typography.fontFamily}" font-size="10" font-weight="bold">${vibePct}%</text>
      <text x="${center}" y="${center + 8}" text-anchor="middle" fill="${DS.colors.textMuted}" font-family="${DS.typography.fontFamily}" font-size="5" font-weight="bold">SECTOR CONTROL</text>
    </svg>
  `;
}

export function renderFactionScreen(container: HTMLElement, registeredUserData: any): void {
  container.innerHTML = '';

  const sectors: FactionSector[] = [
    { id: 'sec_0', name: 'APEX CORE', controller: 'apex', controlPercentage: 85, activeBattles: 2, resourceYield: 1.2, defenseLevel: 5 },
    { id: 'sec_1', name: 'NEXUS JUNCTION', controller: 'contested', controlPercentage: 45, activeBattles: 12, resourceYield: 2.5, defenseLevel: 2 },
    { id: 'sec_2', name: 'VANGUARD RIM', controller: 'vanguard', controlPercentage: 70, activeBattles: 4, resourceYield: 1.0, defenseLevel: 4 },
  ];

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: '8px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });

  const auth = getAuth();
  const currentFaction = registeredUserData?.faction || null;
  const activeMap = getDefaultMap();
  const isFactionWarActive = clientFlagService.getBoolean(FeatureFlagKey.FACTION_WAR_ACTIVE, true);

  // Header Title & Territory Control Arc
  const headerCard = document.createElement('div');
  headerCard.className = 'mm-glass';
  Object.assign(headerCard.style, {
    background: 'rgba(255, 255, 255, 0.02)',
    border: DS.glass.border,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '0px',
    flexShrink: '0'
  });

  headerCard.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2px;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:13px; font-weight:bold; color:${DS.colors.text}; letter-spacing:1.5px; display:flex; align-items:center; gap:8px;">
        STRATEGIC FACTION WAR
        ${!isFactionWarActive ? `<span style="font-size:9px; background:rgba(255,68,0,0.15); border:1px solid ${DS.colors.accent}; color:${DS.colors.accent}; padding:1px 6px;">[FACTION WAR CEASEFIRE / LOCKED]</span>` : ''}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:8px; font-weight:bold; color:${DS.colors.accent}; letter-spacing:0.8px;">
        ACTIVE DEPLOYMENT: ${activeMap.displayName.toUpperCase()}
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="text-align:right; font-family:${DS.typography.fontFamily}; font-size:8px; font-weight:bold;">
        <div style="color:#00F0FF; letter-spacing:0.8px;">VIBE CO. 50%</div>
        <div style="color:${DS.colors.accent}; margin-top:2px; letter-spacing:0.8px;">SLOP INC. 50%</div>
      </div>
      ${createTerritoryArcSVG(50, 50)}
    </div>
  `;
  wrap.appendChild(headerCard);

  // Dual Faction Split Panel Comparison
  const splitGrid = document.createElement('div');
  Object.assign(splitGrid.style, {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    flex: '1',
    minHeight: '0'
  });

  // 1. VIBE CO. PANEL
  const vibeSelected = currentFaction === 'VIBE CO.';
  const vibeCard = document.createElement('div');
  vibeCard.className = 'mm-glass';
  Object.assign(vibeCard.style, {
    background: vibeSelected ? 'rgba(0, 240, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
    border: vibeSelected ? '1px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.06)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '0px',
    transition: 'all 0.15s ease-out',
    minHeight: '0'
  });

  vibeCard.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px; min-height:0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" stroke-width="2">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
            <circle cx="12" cy="12" r="3" fill="#00F0FF"/>
          </svg>
          <div style="font-family:${DS.typography.fontFamily}; font-size:15px; font-weight:bold; color:#00F0FF; letter-spacing:1.5px;">
            VIBE CO.
          </div>
        </div>
        ${vibeSelected ? `<div style="background:rgba(0,240,255,0.15); border:1px solid #00F0FF; color:#00F0FF; padding:1px 6px; font-family:${DS.typography.fontFamily}; font-size:7px; font-weight:bold; letter-spacing:0.8px; border-radius:0px;">ACTIVE AFFILIATION</div>` : ''}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:9.5px; color:${DS.colors.textMuted}; letter-spacing:0.5px; line-height:1.3;">
        Minimalist tech syndicate specializing in clean stealth operations, drone camera override, and rapid reconnaissance.
      </div>

      <div style="background:rgba(0,240,255,0.02); border:1px solid rgba(0,240,255,0.08); padding:8px; display:flex; flex-direction:column; gap:4px; border-radius:0px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:7.5px; color:#00F0FF; font-weight:bold; letter-spacing:0.8px; margin-bottom:1px;">SYNDICATE DOCTRINE</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:9px; color:${DS.colors.text}; line-height:1.3;">
          Focuses on high-mobility drone maneuvering, strategic line-of-sight control, and precise asset extraction.
        </div>
      </div>
    </div>
  `;

  const vibeEnlistBtn = document.createElement('button');
  if (!isFactionWarActive && !vibeSelected) {
    vibeEnlistBtn.textContent = 'FACTION WARFARES LOCKED';
    vibeEnlistBtn.disabled = true;
    Object.assign(vibeEnlistBtn.style, {
      width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)', color: DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: '10px', fontWeight: 'bold',
      letterSpacing: '1px', cursor: 'not-allowed', borderRadius: '0px', flexShrink: '0'
    });
  } else {
    vibeEnlistBtn.textContent = vibeSelected ? 'CURRENT AFFILIATION' : 'ENLIST IN VIBE CO.';
    vibeEnlistBtn.disabled = vibeSelected || !auth.currentUser;
    Object.assign(vibeEnlistBtn.style, {
      width: '100%',
      padding: '8px',
      background: vibeSelected ? 'transparent' : '#00F0FF',
      border: vibeSelected ? '1px solid rgba(0,240,255,0.3)' : 'none',
      color: vibeSelected ? '#00F0FF' : '#000000',
      fontFamily: DS.typography.fontFamily,
      fontSize: '10px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      cursor: (vibeSelected || !auth.currentUser) ? 'default' : 'pointer',
      borderRadius: '0px',
      flexShrink: '0',
      transition: 'all 0.15s ease'
    });
  }

  vibeEnlistBtn.onclick = async () => {
    if (!auth.currentUser) return;
    audioManager.play('click');
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'Users', auth.currentUser.uid), { faction: 'VIBE CO.' });
      if (registeredUserData) registeredUserData.faction = 'VIBE CO.';
      renderFactionScreen(container, registeredUserData);
    } catch (e) {
      console.warn("Faction enlist error:", e);
    }
  };
  vibeCard.appendChild(vibeEnlistBtn);

  // 2. SLOP INC. PANEL
  const slopSelected = currentFaction === 'SLOP INC.';
  const slopCard = document.createElement('div');
  slopCard.className = 'mm-glass';
  Object.assign(slopCard.style, {
    background: slopSelected ? DS.utils.rgba(DS.colors.accent, 0.03) : 'rgba(255, 255, 255, 0.01)',
    border: slopSelected ? `1px solid ${DS.colors.accent}` : '1px solid rgba(255, 255, 255, 0.06)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '0px',
    transition: 'all 0.15s ease-out',
    minHeight: '0'
  });

  slopCard.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px; min-height:0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${DS.colors.accent}" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <div style="font-family:${DS.typography.fontFamily}; font-size:15px; font-weight:bold; color:${DS.colors.accent}; letter-spacing:1.5px;">
            SLOP INC.
          </div>
        </div>
        ${slopSelected ? `<div style="background:${DS.utils.rgba(DS.colors.accent, 0.15)}; border:1px solid ${DS.colors.accent}; color:${DS.colors.accent}; padding:1px 6px; font-family:${DS.typography.fontFamily}; font-size:7px; font-weight:bold; letter-spacing:0.8px; border-radius:0px;">ACTIVE AFFILIATION</div>` : ''}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:9.5px; color:${DS.colors.textMuted}; letter-spacing:0.5px; line-height:1.3;">
        Industrial defense group focused on ballistic drone chassis, reinforced shielding, and point defense.
      </div>

      <div style="background:${DS.utils.rgba(DS.colors.accent, 0.02)}; border:1px solid ${DS.utils.rgba(DS.colors.accent, 0.08)}; padding:8px; display:flex; flex-direction:column; gap:4px; border-radius:0px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:7.5px; color:${DS.colors.accent}; font-weight:bold; letter-spacing:0.8px; margin-bottom:1px;">DEFENSE DOCTRINE</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:9px; color:${DS.colors.text}; line-height:1.3;">
          Prioritizes heavy structural durability, defensive choke point control, and sustained suppressive engagement.
        </div>
      </div>
    </div>
  `;

  const slopEnlistBtn = document.createElement('button');
  if (!isFactionWarActive && !slopSelected) {
    slopEnlistBtn.textContent = 'FACTION WARFARES LOCKED';
    slopEnlistBtn.disabled = true;
    Object.assign(slopEnlistBtn.style, {
      width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)', color: DS.colors.textMuted,
      fontFamily: DS.typography.fontFamily, fontSize: '10px', fontWeight: 'bold',
      letterSpacing: '1px', cursor: 'not-allowed', borderRadius: '0px', flexShrink: '0'
    });
  } else {
    slopEnlistBtn.textContent = slopSelected ? 'CURRENT AFFILIATION' : 'ENLIST IN SLOP INC.';
    slopEnlistBtn.disabled = slopSelected || !auth.currentUser;
    Object.assign(slopEnlistBtn.style, {
      width: '100%',
      padding: '8px',
      background: slopSelected ? 'transparent' : DS.colors.accent,
      border: slopSelected ? `1px solid ${DS.utils.rgba(DS.colors.accent, 0.3)}` : 'none',
      color: slopSelected ? DS.colors.accent : '#000000',
      fontFamily: DS.typography.fontFamily,
      fontSize: '10px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      cursor: (slopSelected || !auth.currentUser) ? 'default' : 'pointer',
      borderRadius: '0px',
      flexShrink: '0',
      transition: 'all 0.15s ease'
    });
  }

  slopEnlistBtn.onclick = async () => {
    if (!auth.currentUser) return;
    audioManager.play('click');
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'Users', auth.currentUser.uid), { faction: 'SLOP INC.' });
      if (registeredUserData) registeredUserData.faction = 'SLOP INC.';
      renderFactionScreen(container, registeredUserData);
    } catch (e) {
      console.warn("Faction enlist error:", e);
    }
  };
  slopCard.appendChild(slopEnlistBtn);

  splitGrid.appendChild(vibeCard);
  splitGrid.appendChild(slopCard);
  wrap.appendChild(splitGrid);

  container.appendChild(wrap);
}

