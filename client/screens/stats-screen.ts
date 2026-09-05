import { DS } from "../design-system";
import challengesDataList from "../data/challenges.json";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { audioManager } from "../audio";
import { IS_DEV } from "../../shared/gates/production.gate";
import { GAMEMODES } from "../../shared/gamemode-configs";
import { BP_SEASON_01 } from "../../shared/battle-pass";
import { calculateLevelMetrics } from "../../shared/verification/verifier";
import { bindTabs, bindContentEntry, TabItem } from "../src/ui/ui-motion";

let activeStatsSubTab: 'PROFILE' | 'INTEL' | 'BATTLE_PASS' | 'CHALLENGES' | 'LEADERBOARD' = 'PROFILE';
let statsTabsHandle: { setActive: (id: string) => void; destroy: () => void } | null = null;

export function setActiveStatsSubTab(tab: 'PROFILE' | 'INTEL' | 'BATTLE_PASS' | 'CHALLENGES' | 'LEADERBOARD') {
  activeStatsSubTab = tab;
}

// ==========================================
// SVG GRAPHICS HELPER FUNCTIONS
// ==========================================

function createRadarChartSVG(stats: { label: string; value: number }[]): string {
  const size = 110;
  const center = size / 2;
  const radius = 38;
  const total = stats.length;
  const angleStep = (Math.PI * 2) / total;

  // Background concentric grid polygons
  let bgPolygons = '';
  [0.25, 0.5, 0.75, 1.0].forEach(scale => {
    const points = stats.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + radius * scale * Math.cos(angle);
      const y = center + radius * scale * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    bgPolygons += `<polygon points="${points}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="${scale === 1.0 ? 'none' : '2 2'}"/>`;
  });

  // Radial axis lines & Labels
  let axisLines = '';
  let labels = '';
  stats.forEach((stat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    axisLines += `<line x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;

    // Label coordinates
    const labelRadius = radius + 11;
    const lx = center + labelRadius * Math.cos(angle);
    const ly = center + labelRadius * Math.sin(angle);
    const anchor = Math.abs(lx - center) < 8 ? 'middle' : lx > center ? 'start' : 'end';
    labels += `<text x="${lx.toFixed(1)}" y="${(ly + 2.5).toFixed(1)}" text-anchor="${anchor}" fill="${DS.colors.textMuted}" font-family="${DS.typography.fontFamily}" font-size="6" font-weight="bold" letter-spacing="0.5">${stat.label}</text>`;
  });

  // Data Polygon
  const dataPoints = stats.map((stat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const valRatio = Math.max(0.15, Math.min(1.0, stat.value / 100));
    const x = center + radius * valRatio * Math.cos(angle);
    const y = center + radius * valRatio * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyString = dataPoints.join(' ');

  // Vertex Nodes
  let vertexNodes = '';
  dataPoints.forEach(pt => {
    const [x, y] = pt.split(',');
    vertexNodes += `<circle cx="${x}" cy="${y}" r="2.5" fill="${DS.colors.accent}" stroke="#000" stroke-width="1"/>`;
  });

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible; display:block; margin:0 auto;">
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${DS.colors.accent}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${DS.colors.accent}" stop-opacity="0.05"/>
        </radialGradient>
      </defs>
      ${bgPolygons}
      ${axisLines}
      <polygon points="${polyString}" fill="url(#radarGlow)" stroke="${DS.colors.accent}" stroke-width="1.5"/>
      ${vertexNodes}
      ${labels}
    </svg>
  `;
}

function createArcGaugeSVG(percent: number, label: string, valueDisplay: string, color: string = DS.colors.accent): string {
  const size = 64;
  const center = size / 2;
  const r = 25;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75; // 270 degree arc
  const offset = arcLength - (Math.min(100, Math.max(0, percent)) / 100) * arcLength;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block; margin:0 auto;">
      <defs>
        <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <!-- Background Arc -->
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4.5" 
              stroke-linecap="round" stroke-dasharray="${arcLength} ${circumference}" transform="rotate(135 ${center} ${center})"/>
      <!-- Value Arc -->
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${color}" stroke-width="4.5" 
              stroke-linecap="round" stroke-dasharray="${arcLength} ${circumference}" stroke-dashoffset="${offset}"
              transform="rotate(135 ${center} ${center})" filter="url(#arcGlow)" style="transition: stroke-dashoffset 0.5s ease-out;"/>
      <!-- Inner text -->
      <text x="${center}" y="${center - 1}" text-anchor="middle" fill="${DS.colors.text}" font-family="${DS.typography.fontFamily}" font-size="10.5" font-weight="bold" letter-spacing="0.5">${valueDisplay}</text>
      <text x="${center}" y="${center + 9}" text-anchor="middle" fill="${DS.colors.textMuted}" font-family="${DS.typography.fontFamily}" font-size="5" font-weight="bold" letter-spacing="0.5">${label}</text>
    </svg>
  `;
}

export function renderStatsScreen(container: HTMLElement, registeredUserData: any): void {
  let wrap = container.querySelector('.stats-screen-wrap') as HTMLElement;
  if (!wrap) {
    container.innerHTML = '';
    wrap = document.createElement('div');
    wrap.className = 'stats-screen-wrap';
    Object.assign(wrap.style, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      gap: '6px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    });

    // Top Sub-Tab Navigation Bar inside STATS
    const navRow = document.createElement('div');
    navRow.className = 'vexea-tab-row';
    Object.assign(navRow.style, {
      display: 'flex',
      gap: 'clamp(6px, 1.2vw, 14px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      paddingBottom: '2px',
      flexShrink: '0',
      position: 'relative'
    });

    const subTabs: { id: 'PROFILE' | 'INTEL' | 'BATTLE_PASS' | 'CHALLENGES' | 'LEADERBOARD'; label: string }[] = [
      { id: 'PROFILE', label: 'CONTRACTOR PROFILE' },
      { id: 'BATTLE_PASS', label: 'BATTLE PASS' },
      { id: 'INTEL', label: 'COMMANDER INTEL' },
      { id: 'CHALLENGES', label: 'DAILY CONTRACTS' },
      { id: 'LEADERBOARD', label: 'GLOBAL STANDINGS' }
    ];

    const tabElements: TabItem[] = [];
    subTabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `vexea-tab stats-subtab-btn ${tab.id === activeStatsSubTab ? 'active' : ''}`;
      btn.setAttribute('data-tab-id', tab.id);
      btn.setAttribute('data-ui-tab', tab.id);
      btn.textContent = tab.label;
      Object.assign(btn.style, {
        padding: '3px 6px',
        background: 'transparent',
        border: 'none',
        fontFamily: DS.typography.fontFamily,
        fontSize: DS.typography.sizes.tiny,
        fontWeight: 'bold',
        letterSpacing: '0.8px',
        cursor: 'pointer'
      });

      navRow.appendChild(btn);
      tabElements.push({ id: tab.id, button: btn });
    });

    if (statsTabsHandle) {
      statsTabsHandle.destroy();
    }
    statsTabsHandle = bindTabs(
      navRow,
      tabElements,
      activeStatsSubTab,
      (selectedId) => {
        audioManager.play('click');
        activeStatsSubTab = selectedId as any;
        renderStatsScreen(container, registeredUserData);
      }
    );

    wrap.appendChild(navRow);

    // Content Area
    const contentBody = document.createElement('div');
    contentBody.className = 'stats-content-body';
    Object.assign(contentBody.style, {
      flex: '1',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0'
    });
    wrap.appendChild(contentBody);
    container.appendChild(wrap);
  }

  const contentBody = wrap.querySelector('.stats-content-body') as HTMLElement;
  if (contentBody) {
    contentBody.innerHTML = '';
    bindContentEntry(contentBody, 0);
    if (activeStatsSubTab === 'PROFILE') {
      renderProfileView(contentBody, registeredUserData);
    } else if (activeStatsSubTab === 'BATTLE_PASS') {
      renderBattlePassView(contentBody, registeredUserData);
    } else if (activeStatsSubTab === 'INTEL') {
      renderIntelView(contentBody, registeredUserData);
    } else if (activeStatsSubTab === 'CHALLENGES') {
      renderChallengesView(contentBody, registeredUserData);
    } else if (activeStatsSubTab === 'LEADERBOARD') {
      renderLeaderboardView(contentBody, registeredUserData);
    }
  }
}

// 1. PROFILE VIEW
function renderProfileView(container: HTMLElement, userData: any): void {
  const layout = document.createElement('div');
  Object.assign(layout.style, {
    display: 'grid',
    gridTemplateColumns: window.innerWidth < 800 ? '1fr' : '1fr 1.3fr',
    gap: '8px',
    width: '100%',
    height: '100%',
    alignItems: 'stretch',
    minHeight: '0'
  });

  const callsign = userData?.displayName?.toUpperCase() || 'UNREGISTERED CONTRACTOR';
  const lifetimeXpVal = userData?.lifetimeXP || 0;
  const levelMetrics = calculateLevelMetrics(lifetimeXpVal);
  const level = levelMetrics.level;
  const xp = levelMetrics.totalXp - levelMetrics.xpForCurrentLevel;
  const faction = userData?.faction || 'UNAFFILIATED';
  const kills = userData?.totalDroneEliminations || userData?.kills || 0;
  const deaths = userData?.totalDeaths || 1;
  const kdRatio = (kills / Math.max(1, deaths)).toFixed(1);
  const winRate = userData?.winRate || (userData?.totalMatches ? Math.round((userData.totalWins / userData.totalMatches) * 100) : 0);

  // Left side: Operative Identity + Combat Radar Graph
  const badgeCard = document.createElement('div');
  badgeCard.className = 'mm-glass';
  Object.assign(badgeCard.style, {
    background: 'rgba(255, 255, 255, 0.02)',
    border: DS.glass.border,
    padding: '0.50rem 0.75rem',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '0'
  });

  // Radar Attributes Data
  const radarStats = [
    { label: 'DMG', value: 85 },
    { label: 'ACC', value: 72 },
    { label: 'MOB', value: 90 },
    { label: 'SRV', value: 68 },
    { label: 'TAC', value: 80 }
  ];

  badgeCard.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="width:1.88rem; height:1.88rem; border:1px solid ${DS.colors.accent}; background:rgba(255,69,0,0.12); display:flex; align-items:center; justify-content:center; color:${DS.colors.accent}; font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.body}; font-weight:bold; border-radius:0px;">
          ${callsign.charAt(0)}
        </div>
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.small}; font-weight:bold; color:${DS.colors.text}; letter-spacing:1px; line-height:1.1;">
            ${callsign}
          </div>
          <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; letter-spacing:0.5px;">
            FACTION: <span style="color:${faction === 'VIBE CO.' ? DS.colors.factions.vibe.primary : DS.colors.accent}; font-weight:bold;">${faction}</span>
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.small}; font-weight:bold; color:${DS.colors.accent};">LVL ${level}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; font-weight:bold; margin-top:1px;">${xp} / 100 XP</div>
      </div>
    </div>

    <!-- RADAR SPIDER CHART -->
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; margin:4px 0; min-height:0;">
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.8px; margin-bottom:2px;">COMBAT PROFILE RADAR</div>
      ${createRadarChartSVG(radarStats)}
    </div>

    <!-- Bottom XP Bar -->
    <div style="display:flex; flex-direction:column; gap:2px; margin-top:2px;">
      <div style="display:flex; justify-content:space-between; font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; font-weight:bold;">
        <span>BATTLE PASS PROGRESS</span>
        <span>${xp}%</span>
      </div>
      <div style="width:100%; height:3px; background:rgba(255,255,255,0.06); border-radius:0px; overflow:hidden;">
        <div style="width:${xp}%; height:100%; background:${DS.colors.accent};"></div>
      </div>
    </div>
  `;
  layout.appendChild(badgeCard);

  // Right side: Career Performance Gauges & Metrics
  const statsCard = document.createElement('div');
  statsCard.className = 'mm-glass';
  Object.assign(statsCard.style, {
    background: 'rgba(255, 255, 255, 0.01)',
    border: DS.glass.border,
    padding: '0.50rem 0.75rem',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '0',
    gap: '6px'
  });

  const gridTitle = document.createElement('div');
  gridTitle.textContent = 'CAREER PERFORMANCE METRICS';
  Object.assign(gridTitle.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    fontWeight: 'bold',
    color: DS.colors.textMuted,
    letterSpacing: '1.5px',
    flexShrink: '0'
  });
  statsCard.appendChild(gridTitle);

  // Dual Circular Gauge Row
  const gaugeRow = document.createElement('div');
  Object.assign(gaugeRow.style, {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '4px 0',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '0px',
    flexShrink: '0'
  });

  const winGauge = createArcGaugeSVG(winRate, 'WIN RATE', `${winRate}%`, '#00FF88');
  const kdGauge = createArcGaugeSVG(Math.min(100, Math.round(parseFloat(kdRatio) * 25)), 'K/D RATIO', `${kdRatio}`, DS.colors.accent);

  gaugeRow.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center;">
      ${winGauge}
    </div>
    <div style="width:1px; height:2.50rem; background:rgba(255,255,255,0.08);"></div>
    <div style="display:flex; flex-direction:column; align-items:center;">
      ${kdGauge}
    </div>
  `;
  statsCard.appendChild(gaugeRow);

  // Stats cards grid
  const statsGrid = document.createElement('div');
  Object.assign(statsGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
    flex: '1',
    minHeight: '0'
  });

  const statsList = [
    { label: 'MATCHES PLAYED', value: userData?.totalMatches || 0, barPct: 60 },
    { label: 'TOTAL WINS', value: userData?.totalWins || 0, barPct: winRate },
    { label: 'ELIMINATIONS', value: kills, barPct: Math.min(100, kills * 2) },
    { label: 'BEST SCORE', value: userData?.highestIndividualScore || 0, barPct: 80 }
  ];

  statsList.forEach(stat => {
    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '4px 0.50rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      borderRadius: '0px'
    });

    card.innerHTML = `
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.8px; text-transform:uppercase;">
        ${stat.label}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.small}; color:${DS.colors.text}; font-weight:bold; letter-spacing:0.5px; margin-top:1px;">
        ${stat.value}
      </div>
      <div style="width:100%; height:2px; background:rgba(255,255,255,0.06); margin-top:3px; border-radius:0px; overflow:hidden;">
        <div style="width:${stat.barPct}%; height:100%; background:${DS.colors.accent};"></div>
      </div>
    `;
    statsGrid.appendChild(card);
  });

  statsCard.appendChild(statsGrid);
  layout.appendChild(statsCard);
  container.appendChild(layout);
}

// 2. INTEL VIEW - Player Intelligence Dossier
function renderIntelView(container: HTMLElement, userData: any): void {
  const card = document.createElement('div');
  card.className = 'mm-glass';
  Object.assign(card.style, {
    background: 'rgba(255, 255, 255, 0.02)',
    border: DS.glass.border,
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderRadius: '0px',
    height: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto'
  });

  const name = userData?.displayName?.toUpperCase() || 'OPERATIVE';
  const faction = userData?.faction || 'UNAFFILIATED';
  const stats = userData?.stats || {};
  const totalKills = stats.totalDroneEliminations || stats.kills || 0;
  const totalDeaths = stats.totalDeaths || stats.deaths || 0;
  const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const winCount = stats.totalWins || stats.wins || 0;
  const totalMatches = stats.totalMatches || stats.matches || 0;
  const winRate = totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0;

  card.innerHTML = `
    <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 1.4vh, 0.94rem); font-weight:bold; color:${DS.colors.accent}; letter-spacing:0.1vw; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <span>OPERATIVE INTELLIGENCE DOSSIER</span>
      <span style="font-size:clamp(0.50rem, 1vh, 0.63rem); color:#00FF88; background:rgba(0,255,136,0.06); padding:0.2vh 0.6vw; border:1px solid rgba(0,255,136,0.2); letter-spacing:0.1vw; font-weight:bold; border-radius:0px;">FIELD VERIFIED</span>
    </div>

    <!-- Operative Summary Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.04); padding:1vh; border-radius:0px;">
      <div style="display:flex; flex-direction:column; gap:0.3vh;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.63rem, 1.3vh, 0.81rem); font-weight:bold; color:${DS.colors.text}; letter-spacing:0.1vw;">CODENAME: ${name}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted};">FACTION AFFILIATION: <b style="color:${DS.colors.accent}">${faction}</b></div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); color:${DS.colors.textMuted};">COMBAT RATING</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.75rem, 1.6vh, 1.13rem); font-weight:bold; color:${DS.colors.accent};">${Math.max(100, totalKills * 15 + winCount * 50)}</div>
      </div>
    </div>

    <!-- Intelligence Metrics Grid -->
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.8vh; flex-shrink:0;">
      <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04); padding:0.8vh 1vw; border-radius:0px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); color:${DS.colors.textMuted}; font-weight:bold;">CONFIRMED KILLS</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 1.4vh, 0.94rem); color:${DS.colors.text}; font-weight:bold; margin-top:0.2vh;">${totalKills}</div>
      </div>
      <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04); padding:0.8vh 1vw; border-radius:0px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); color:${DS.colors.textMuted}; font-weight:bold;">K/D RATIO</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 1.4vh, 0.94rem); color:${DS.colors.accent}; font-weight:bold; margin-top:0.2vh;">${kdRatio}</div>
      </div>
      <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04); padding:0.8vh 1vw; border-radius:0px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); color:${DS.colors.textMuted}; font-weight:bold;">EXTRACTION WIN RATE</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 1.4vh, 0.94rem); color:#00FF88; font-weight:bold; margin-top:0.2vh;">${winRate}%</div>
      </div>
    </div>

    <!-- Extended Profile Telemetry (Class Breakdown & Recent Matches) -->
    <div id="intel-v1-details" style="display:flex; flex-direction:column; gap:1vh;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted};">LOADING PROFILE TELEMETRY...</div>
    </div>

    <!-- Commander Briefing -->
    <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.04); padding:0.8vh; border-radius:0px;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); font-weight:bold; color:${DS.colors.textMuted}; letter-spacing:0.1vw; margin-bottom:0.4vh;">COMMANDER ASSESSMENT</div>
      <div id="intel-commander-assessment" style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); color:${DS.colors.text}; line-height:1.4;">
        LOADING TELEMETRY ASSESSMENT...
      </div>
    </div>
  `;

  const auth = getAuth();
  if (auth.currentUser) {
    const uid = auth.currentUser.uid;
    const db = getFirestore();

    const truncateText = (str: string, maxChars: number = 260) => {
      if (!str || str.length <= maxChars) return str;
      return str.slice(0, maxChars - 3).trimEnd() + "...";
    };

    const updateAssessmentUI = (text: string) => {
      const el = card.querySelector('#intel-commander-assessment');
      if (el) {
        el.textContent = truncateText(text, 260);
      }
    };

    getDoc(doc(db, "Users", uid, "gameProfile", "v1")).then(async (snap) => {
      const detailsContainer = card.querySelector('#intel-v1-details');
      let gameProfile: any = null;

      if (snap.exists()) {
        gameProfile = snap.data();
      }

      // Read LLM dossier document from Users/{uid}/dossier
      let dossierText = "";
      try {
        const dossierSnap = await getDoc(doc(db, "Users", uid, "dossier"));
        if (dossierSnap.exists()) {
          const dData = dossierSnap.data();
          if (
            dData &&
            typeof dData.text === "string" &&
            dData.text.trim().length > 0 &&
            (!gameProfile || dData.matchCountAtGeneration === gameProfile.totalMatches)
          ) {
            dossierText = dData.text.trim();
          }
        }
      } catch (e) {
        // Fallback to template if dossier read fails
      }

      if (dossierText) {
        updateAssessmentUI(dossierText);
      } else if (gameProfile) {
        // Fallback to Phase 1 template logic
        const totalMatches = gameProfile.totalMatches || 0;
        const preferredRole = gameProfile.preferredRole || "ASSAULT";
        const label = auth.currentUser?.displayName || "CONTRACTOR";

        if (totalMatches === 0) {
          updateAssessmentUI(`OPERATIVE ${label}: FIRST ENGAGEMENT. No historical telemetry. Treat as untested asset — high predictability assumed.`);
        } else if (totalMatches < 3) {
          updateAssessmentUI(`OPERATIVE ${label}: ${totalMatches} engagement(s) logged. Preferred role: ${preferredRole}. Insufficient data for pattern analysis.`);
        } else {
          const roleSelectionCount = gameProfile.classBreakdown?.[preferredRole] || 0;
          const rolePct = Math.round((roleSelectionCount / Math.max(1, totalMatches)) * 100);
          const avgKills = (gameProfile.averages?.kills || 0).toFixed(1);
          const avgDeaths = (gameProfile.averages?.deaths || 0).toFixed(1);
          const avgDmg = Math.round(gameProfile.averages?.damageDealt || 0);
          const recentMatches = gameProfile.recentMatches || [];
          const wins = recentMatches.filter((m: any) => m.result === "win").length;
          const recentCount = recentMatches.length;

          const sentence1 = `Operative ${label} favors ${preferredRole} class (${rolePct}% selection rate across ${totalMatches} matches).`;
          const sentence2 = `Averages ${avgKills} eliminations and ${avgDeaths} deaths per match with ${avgDmg} damage output.`;
          const sentence3 =
            recentCount > 0
              ? `Recent trajectory: ${wins} wins across last ${recentCount} recorded engagements.`
              : `No recent match telemetry logged.`;

          updateAssessmentUI(`${sentence1} ${sentence2} ${sentence3}`);
        }
      } else {
        const label = auth.currentUser?.displayName || "CONTRACTOR";
        updateAssessmentUI(`OPERATIVE ${label}: FIRST ENGAGEMENT. No historical telemetry. Treat as untested asset — high predictability assumed.`);
      }

      if (!detailsContainer) return;

      if (snap.exists()) {
        const gameProfile = snap.data();
        const classBreakdown = gameProfile.classBreakdown || {};
        const recentMatches = gameProfile.recentMatches || [];
        const preferredRole = gameProfile.preferredRole || "ASSAULT";

        const classItems = Object.entries(classBreakdown)
          .map(([cls, count]) => `<span style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:0.2vh 0.6vw; font-size:clamp(0.50rem, 1vh, 0.63rem); font-family:${DS.typography.fontFamily}; color:${cls === preferredRole ? DS.colors.accent : DS.colors.text}; font-weight:bold;">${cls}: ${count}</span>`)
          .join(' ');

        const matchItems = recentMatches.map((m: any) => {
          const resColor = m.result === 'win' ? '#00FF88' : DS.colors.accent;
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.03); padding:0.5vh 0.8vw; font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem);">
              <span style="color:${resColor}; font-weight:bold;">${(m.result || 'WIN').toUpperCase()}</span>
              <span style="color:${DS.colors.textMuted};">${m.classId || 'ASSAULT'}</span>
              <span style="color:${DS.colors.text};">K: ${m.kills || 0} / D: ${m.deaths || 0}</span>
            </div>
          `;
        }).join('');

        detailsContainer.innerHTML = `
          <!-- Preferred Role & Class Breakdown -->
          <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.04); padding:1vh; border-radius:0px;">
            <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); font-weight:bold; color:${DS.colors.textMuted}; letter-spacing:0.1vw; margin-bottom:0.4vh;">CLASS DISTRIBUTION (PREFERRED: <b style="color:${DS.colors.accent}">${preferredRole}</b>)</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.5vh;">${classItems || '<span style="font-size:clamp(0.50rem, 1vh, 0.63rem); color:' + DS.colors.textMuted + ';">NO CLASS DATA LOGGED</span>'}</div>
          </div>

          <!-- Recent Engagements -->
          <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.04); padding:1vh; border-radius:0px;">
            <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); font-weight:bold; color:${DS.colors.textMuted}; letter-spacing:0.1vw; margin-bottom:0.4vh;">RECENT MATCH TELEMETRY (LAST 5)</div>
            <div style="display:flex; flex-direction:column; gap:0.4vh;">
              ${matchItems || '<div style="font-family:' + DS.typography.fontFamily + '; font-size:clamp(0.50rem, 1vh, 0.63rem); color:' + DS.colors.textMuted + ';">NO RECENT MATCHES LOGGED</div>'}
            </div>
          </div>
        `;
      } else {
        detailsContainer.innerHTML = `
          <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.04); padding:1vh;">
            <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted};">PROFILE TELEMETRY: INSUFFICIENT MATCH HISTORY (< 3 MATCHES LOGGED).</div>
          </div>
        `;
      }
    }).catch(() => {
      const detailsContainer = card.querySelector('#intel-v1-details');
      if (detailsContainer) {
        detailsContainer.innerHTML = `<div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted};">PROFILE TELEMETRY: OFFLINE</div>`;
      }
    });
  }

  if (IS_DEV) {
    const devBlock = document.createElement('div');
    Object.assign(devBlock.style, {
      padding: '0.8vh 1vw',
      background: 'rgba(255, 69, 0, 0.02)',
      border: `1px dashed rgba(255, 69, 0, 0.3)`,
      borderRadius: '0px',
      flexShrink: '0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });

    devBlock.innerHTML = `<div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); font-weight:bold; color:${DS.colors.accent}; letter-spacing:0.1vw;">OVERRIDE TERMINAL</div>`;

    const refillBtn = document.createElement('button');
    refillBtn.textContent = 'REFILL CR & AP';
    Object.assign(refillBtn.style, {
      padding: '0.4vh 1vw', background: DS.colors.accent, border: 'none', color: '#000000',
      fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.50rem, 1vh, 0.63rem)', fontWeight: 'bold', letterSpacing: '0.08vw', cursor: 'pointer', borderRadius: '0px'
    });

    refillBtn.onclick = async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        try {
          const db = getFirestore();
          await updateDoc(doc(db, 'Users', auth.currentUser.uid), { credits: 1000, energy: 1000 });
          import('./main-menu').then(({ showMenuNotification }) => { showMenuNotification("DEV REFILL COMPLETED: 1000 CR / 1000 AP", "info"); });
        } catch (e) { console.warn('Refill error:', e); }
      }
    };
    devBlock.appendChild(refillBtn);
    card.appendChild(devBlock);
  }

  container.appendChild(card);
}

// 3. CHALLENGES VIEW
function renderChallengesView(container: HTMLElement, userData: any): void {
  const wrap = document.createElement('div');
  Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '1vh', height: '100%' });

  const titleEl = document.createElement('div');
  Object.assign(titleEl.style, {
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 1.2vh, 0.88rem)', fontWeight: 'bold', color: DS.colors.text,
    letterSpacing: '0.15vw', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: '0'
  });
  titleEl.innerHTML = `<span>DAILY CONTRACTS</span><span style="font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted}; letter-spacing:0.05vw;">RESETS IN 14H</span>`;
  wrap.appendChild(titleEl);

  const grid = document.createElement('div');
  Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1vh', flex: '1' });

  const userStats = userData?.stats || {};
  challengesDataList.slice(0, 3).forEach((ch: any) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'mm-glass';
    Object.assign(itemCard.style, {
      background: 'rgba(255, 255, 255, 0.02)', border: DS.glass.border, padding: '1.2vh 1.2vw',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '0px'
    });

    let currentVal = 0;
    if (ch.id === 'ch_drone_kills') {
      currentVal = Math.min(ch.target, userStats.totalDroneEliminations || userStats.kills || 0);
    } else if (ch.id === 'ch_extraction_hp') {
      currentVal = Math.min(ch.target, userStats.totalWins || userStats.wins || 0);
    } else if (ch.id === 'ch_capture_nodes') {
      currentVal = Math.min(ch.target, userStats.totalObjectiveTimeHeld ? Math.floor(userStats.totalObjectiveTimeHeld / 60) : 0);
    } else {
      currentVal = userData?.challengesProgress?.[ch.id] || 0;
    }

    const pct = Math.min(100, Math.round((currentVal / ch.target) * 100));

    itemCard.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.4vh;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.63rem, 1.2vh, 0.81rem); font-weight:bold; color:${DS.colors.text}; letter-spacing:0.05vw;">${ch.title}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted}; line-height:1.3;">${ch.description}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.5vh; margin-top:1vh;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); font-weight:bold; color:${DS.colors.accent};">
          <span>+${ch.rewardCredits} CR</span>
          <span>${currentVal}/${ch.target}</span>
        </div>
        <div style="width:100%; height:2px; background:rgba(255,255,255,0.08); overflow:hidden; border-radius:0px;">
          <div style="width:${pct}%; height:100%; background:${DS.colors.accent};"></div>
        </div>
      </div>
    `;
    grid.appendChild(itemCard);
  });

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

// 4. LEADERBOARD VIEW
function renderLeaderboardView(container: HTMLElement, userData: any): void {
  const wrap = document.createElement('div');
  Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '1vh', height: '100%' });

  const titleEl = document.createElement('div');
  Object.assign(titleEl.style, { fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.63rem, 1.2vh, 0.88rem)', fontWeight: 'bold', color: DS.colors.text, letterSpacing: '0.15vw', flexShrink: '0' });
  titleEl.textContent = 'GLOBAL CONTRACTOR STANDINGS';
  wrap.appendChild(titleEl);

  const table = document.createElement('div');
  Object.assign(table.style, { display: 'flex', flexDirection: 'column', gap: '0.5vh', flex: '1', overflowY: 'auto' });

  const name = userData?.displayName?.toUpperCase() || 'OPERATIVE';
  const faction = userData?.faction || 'UNAFFILIATED';
  const userKills = userData?.stats?.totalDroneEliminations || userData?.stats?.kills || 0;
  const userWins = userData?.stats?.totalWins || userData?.stats?.wins || 0;
  const userScore = userKills * 100 + userWins * 500 + (userData?.credits || 0);

  const userEntry = { rank: 1, name, score: userScore, kills: userKills, faction };

  const rowEl = document.createElement('div');
  Object.assign(rowEl.style, {
    background: 'rgba(255, 69, 0, 0.05)',
    border: `1px solid ${DS.colors.accent}`,
    padding: '0.8vh 1.2vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontFamily: DS.typography.fontFamily, fontSize: 'clamp(0.56rem, 1.1vh, 0.75rem)', borderRadius: '0px'
  });

  rowEl.innerHTML = `
    <div style="display:flex; align-items:center; gap:1vw;">
      <span style="font-weight:bold; color:${DS.colors.accent}; width:2vw;">#${userEntry.rank}</span>
      <span style="font-weight:bold; color:${DS.colors.text}; letter-spacing:0.05vw;">${userEntry.name}</span>
    </div>
    <div style="display:flex; gap:1vw; color:${DS.colors.textMuted}; font-size:clamp(0.50rem, 1vh, 0.69rem);">
      <span>FACTION: <b style="color:${DS.colors.accent}; font-weight:bold;">${userEntry.faction}</b></span>
      <span>KILLS: <b style="color:${DS.colors.text};">${userEntry.kills}</b></span>
      <span>SCORE: <b style="color:${DS.colors.text};">${userEntry.score}</b></span>
    </div>
  `;
  table.appendChild(rowEl);

  wrap.appendChild(table);
  container.appendChild(wrap);
}

// 5. BATTLE PASS VIEW
function renderBattlePassView(container: HTMLElement, userData: any): void {
  const currentXP = userData?.battlePass || 0;
  const claimedTiers = userData?.claimedBPTiers || [];
  const tierCount = BP_SEASON_01.tiers.length;
  
  const layout = document.createElement('div');
  Object.assign(layout.style, {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: '1vh',
    overflow: 'hidden'
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '1vh 1.2vw',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    flexShrink: '0'
  });

  const nowMs = Date.now();
  const bpRemainingDays = Math.max(0, Math.ceil((BP_SEASON_01.endDate - nowMs) / (1000 * 60 * 60 * 24)));

  header.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.3vh;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 1.4vh, 0.94rem); font-weight:bold; color:#FFFFFF; letter-spacing:0.1vw;">${BP_SEASON_01.name}</div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.textMuted}; letter-spacing:0.05vw;">SEASON ACTIVE: ${bpRemainingDays} DAYS REMAINING</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.63rem, 1.2vh, 0.88rem); font-weight:bold; color:${DS.colors.accent};">TOTAL XP: ${currentXP}</div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); color:${DS.colors.textMuted};">TIERS COMPLETED: ${Math.floor(currentXP / 10)} / ${tierCount - 1}</div>
    </div>
  `;
  layout.appendChild(header);

  const tiersScroll = document.createElement('div');
  Object.assign(tiersScroll.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '0.8vh',
    flex: '1',
    overflowY: 'auto',
    padding: '0.2vh',
    minHeight: '0'
  });

  BP_SEASON_01.tiers.forEach((tier: any) => {
    const isUnlocked = currentXP >= tier.xpRequired;
    const isClaimed = claimedTiers.includes(tier.index);
    
    const card = document.createElement('div');
    Object.assign(card.style, {
      background: isUnlocked ? 'rgba(255, 255, 255, 0.04)' : 'rgba(10, 10, 10, 0.4)',
      border: `1px solid ${isUnlocked ? (isClaimed ? 'rgba(255, 255, 255, 0.1)' : DS.colors.accent) : 'rgba(255, 255, 255, 0.03)'}`,
      padding: '1vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5vh',
      position: 'relative',
      minHeight: '12vh',
      transition: 'all 0.15s ease'
    });

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.56rem, 1.1vh, 0.75rem); font-weight:900; color:${isUnlocked ? '#FFF' : DS.colors.textMuted};">${String(tier.index).padStart(2, '0')}</span>
        <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.63rem); font-weight:bold; color:${isClaimed ? DS.colors.textMuted : (isUnlocked ? DS.colors.accent : 'rgba(255, 255, 255, 0.15)')};">${isClaimed ? 'CLAIMED' : (isUnlocked ? 'READY' : 'LOCKED')}</span>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5vh; text-align:center;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.75rem, 1.8vh, 1.13rem); font-weight:900; color:${isUnlocked ? DS.colors.accent : 'rgba(255,255,255,0.1)'};">${tier.freeReward ? (tier.freeReward.type === 'CREDITS' ? 'CR' : 'ITEM') : '—'}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); font-weight:bold; color:${isUnlocked ? '#FFF' : DS.colors.textMuted}; line-height:1.1;">${tier.freeReward ? tier.freeReward.label : 'NO REWARD'}</div>
      </div>
    `;

    if (isUnlocked && !isClaimed && tier.freeReward) {
      const claimBtn = document.createElement('div');
      claimBtn.textContent = 'CLAIM';
      Object.assign(claimBtn.style, {
        width: '100%',
        padding: '0.5vh 0',
        background: DS.colors.accent,
        color: '#000',
        fontSize: 'clamp(0.50rem, 1vh, 0.63rem)',
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: '0.08vw',
        cursor: 'pointer',
        marginTop: '0.5vh'
      });
      claimBtn.onclick = (e) => {
        e.stopPropagation();
        handleBPClaim(tier.index, userData);
      };
      card.appendChild(claimBtn);
    } else {
      const trackLabel = document.createElement('div');
      trackLabel.textContent = 'FREE TRACK';
      Object.assign(trackLabel.style, {
        width: '100%',
        padding: '0.5vh 0',
        background: 'rgba(255, 255, 255, 0.03)',
        color: DS.colors.textMuted,
        fontSize: 'clamp(0.44rem, 0.9vh, 0.56rem)',
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: '0.08vw',
        marginTop: '0.5vh'
      });
      card.appendChild(trackLabel);
    }

    tiersScroll.appendChild(card);
  });

  layout.appendChild(tiersScroll);
  container.appendChild(layout);
}

async function handleBPClaim(index: number, userData: any) {
  audioManager.play('click');

  const auth = getAuth();
  if (!auth.currentUser) return;

  const db = getFirestore();
  const userRef = doc(db, 'Users', auth.currentUser.uid);
  const tier = BP_SEASON_01.tiers[index];

  try {
    const updates: any = {
      claimedBPTiers: arrayUnion(index)
    };

    if (tier.freeReward && tier.freeReward.type === 'CREDITS') {
      updates.credits = increment(tier.freeReward.value as number);
    } else if (tier.freeReward && tier.freeReward.type === 'COSMETIC') {
      updates.unlockedItems = arrayUnion(tier.freeReward.value as string);
    }

    await updateDoc(userRef, updates);
    // Profile box is updated via window observer usually, but we need to re-render local tab
    userData.claimedBPTiers = userData.claimedBPTiers || [];
    userData.claimedBPTiers.push(index);
    const container = document.querySelector('.stats-content-body') as HTMLElement;
    if (container) renderBattlePassView(container, userData);
    
  } catch (err) {
    console.error("[BP] Claim failed:", err);
  }
}

