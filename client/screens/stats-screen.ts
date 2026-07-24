import { DS } from "../design-system";
import challengesDataList from "../data/challenges.json";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { audioManager } from "../audio";
import { IS_DEV } from "../../shared/gate";

let activeStatsSubTab: 'PROFILE' | 'INTEL' | 'CHALLENGES' | 'LEADERBOARD' = 'PROFILE';

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
  container.innerHTML = '';

  const wrap = document.createElement('div');
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
  Object.assign(navRow.style, {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '2px',
    flexShrink: '0'
  });

  const subTabs: { id: 'PROFILE' | 'INTEL' | 'CHALLENGES' | 'LEADERBOARD'; label: string }[] = [
    { id: 'PROFILE', label: 'CONTRACTOR PROFILE' },
    { id: 'INTEL', label: 'COMMANDER INTEL' },
    { id: 'CHALLENGES', label: 'DAILY CONTRACTS' },
    { id: 'LEADERBOARD', label: 'GLOBAL STANDINGS' }
  ];

  subTabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    const isActive = tab.id === activeStatsSubTab;
    Object.assign(btn.style, {
      padding: '2px 1px',
      background: 'transparent',
      color: isActive ? DS.colors.accent : 'rgba(255, 255, 255, 0.4)',
      border: 'none',
      borderBottom: isActive ? `2px solid ${DS.colors.accent}` : '2px solid transparent',
      fontFamily: DS.typography.fontFamily,
      fontSize: '9.5px',
      fontWeight: 'bold',
      letterSpacing: '0.8px',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    });

    btn.onclick = () => {
      audioManager.play('click');
      activeStatsSubTab = tab.id;
      renderStatsScreen(container, registeredUserData);
    };

    navRow.appendChild(btn);
  });

  wrap.appendChild(navRow);

  // Content Area
  const contentBody = document.createElement('div');
  Object.assign(contentBody.style, {
    flex: '1',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0'
  });

  if (activeStatsSubTab === 'PROFILE') {
    renderProfileView(contentBody, registeredUserData);
  } else if (activeStatsSubTab === 'INTEL') {
    renderIntelView(contentBody, registeredUserData);
  } else if (activeStatsSubTab === 'CHALLENGES') {
    renderChallengesView(contentBody, registeredUserData);
  } else if (activeStatsSubTab === 'LEADERBOARD') {
    renderLeaderboardView(contentBody, registeredUserData);
  }

  wrap.appendChild(contentBody);
  container.appendChild(wrap);
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
  const level = userData?.battlePass || 1;
  const xp = userData?.xp !== undefined ? userData.xp : 65;
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
    padding: '8px 12px',
    borderRadius: '4px',
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
        <div style="width:30px; height:30px; border:1px solid ${DS.colors.accent}; background:rgba(255,69,0,0.12); display:flex; align-items:center; justify-content:center; color:${DS.colors.accent}; font-family:${DS.typography.fontFamily}; font-size:14px; font-weight:bold; border-radius:2px;">
          ${callsign.charAt(0)}
        </div>
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="font-family:${DS.typography.fontFamily}; font-size:12px; font-weight:bold; color:${DS.colors.text}; letter-spacing:1px; line-height:1.1;">
            ${callsign}
          </div>
          <div style="font-family:${DS.typography.fontFamily}; font-size:8px; color:${DS.colors.textMuted}; letter-spacing:0.5px;">
            FACTION: <span style="color:${faction === 'VIBE CO.' ? '#00F0FF' : DS.colors.accent}; font-weight:bold;">${faction}</span>
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:10.5px; font-weight:bold; color:${DS.colors.accent};">LVL ${level}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:7.5px; color:${DS.colors.textMuted}; font-weight:bold; margin-top:1px;">${xp} / 100 XP</div>
      </div>
    </div>

    <!-- RADAR SPIDER CHART -->
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; margin:4px 0; min-height:0;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:7px; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.8px; margin-bottom:2px;">TACTICAL PROFILE RADAR</div>
      ${createRadarChartSVG(radarStats)}
    </div>

    <!-- Bottom XP Bar -->
    <div style="display:flex; flex-direction:column; gap:2px; margin-top:2px;">
      <div style="display:flex; justify-content:space-between; font-family:${DS.typography.fontFamily}; font-size:7.5px; color:${DS.colors.textMuted}; font-weight:bold;">
        <span>BATTLE PASS PROGRESS</span>
        <span>${xp}%</span>
      </div>
      <div style="width:100%; height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
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
    padding: '8px 12px',
    borderRadius: '4px',
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
    fontSize: '9px',
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
    borderRadius: '4px',
    flexShrink: '0'
  });

  const winGauge = createArcGaugeSVG(winRate, 'WIN RATE', `${winRate}%`, '#00FF88');
  const kdGauge = createArcGaugeSVG(Math.min(100, Math.round(parseFloat(kdRatio) * 25)), 'K/D RATIO', `${kdRatio}`, DS.colors.accent);

  gaugeRow.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center;">
      ${winGauge}
    </div>
    <div style="width:1px; height:40px; background:rgba(255,255,255,0.08);"></div>
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
      padding: '4px 8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      borderRadius: '3px'
    });

    card.innerHTML = `
      <div style="font-family:${DS.typography.fontFamily}; font-size:7px; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.8px; text-transform:uppercase;">
        ${stat.label}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:12px; color:${DS.colors.text}; font-weight:bold; letter-spacing:0.5px; margin-top:1px;">
        ${stat.value}
      </div>
      <div style="width:100%; height:2px; background:rgba(255,255,255,0.06); margin-top:3px; border-radius:1px; overflow:hidden;">
        <div style="width:${stat.barPct}%; height:100%; background:${DS.colors.accent};"></div>
      </div>
    `;
    statsGrid.appendChild(card);
  });

  statsCard.appendChild(statsGrid);
  layout.appendChild(statsCard);
  container.appendChild(layout);
}

// 2. INTEL VIEW
function renderIntelView(container: HTMLElement, userData: any): void {
  const card = document.createElement('div');
  card.className = 'mm-glass';
  Object.assign(card.style, {
    background: 'rgba(255, 255, 255, 0.02)',
    border: DS.glass.border,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderRadius: '4px',
    height: '100%',
    boxSizing: 'border-box'
  });

  card.innerHTML = `
    <div style="font-family:${DS.typography.fontFamily}; font-size:12px; font-weight:bold; color:${DS.colors.accent}; letter-spacing:1px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <span>LLM COMMANDER ADAPTIVE ANALYSIS</span>
      <span style="font-size:8px; color:#00FF88; background:rgba(0,255,136,0.06); padding:2px 6px; border:1px solid rgba(0,255,136,0.2); letter-spacing:1px; font-weight:bold; border-radius:1px;">ACTIVE</span>
    </div>

    <!-- Threat Sector Arc Ring HUD Visual -->
    <div style="display:flex; gap:12px; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.04); padding:10px; border-radius:2px;">
      <div style="flex-shrink:0;">
        ${createArcGaugeSVG(78, 'STEALTH', '78.4%', '#00F0FF')}
      </div>
      <div style="display:flex; flexDirection:column; gap:4px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:11px; font-weight:bold; color:${DS.colors.text}; letter-spacing:1px;">TACTICAL BIOME: CORRIDORS</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:9px; color:${DS.colors.textMuted}; line-height:1.4;">
          AI Tactical Core calculates a <b style="color:#00FF88;">CLASS-A STEALTH INDEX</b> based on contractor movement vectors and target headshot ratios.
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; flex:1;">
      <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04); padding:6px 8px; border-radius:2px; display:flex; flexDirection:column; justifyContent:center;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:7px; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.5px;">HEADSHOT ACCURACY</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:11px; color:${DS.colors.text}; font-weight:bold; margin-top:2px;">34.2% CRITICAL HIT</div>
      </div>
      <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.04); padding:6px 8px; border-radius:2px; display:flex; flexDirection:column; justifyContent:center;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:7px; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.5px;">COVERT RATING</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:11px; color:${DS.colors.accent}; font-weight:bold; margin-top:2px;">MAXIMUM EXPORT</div>
      </div>
    </div>
  `;

  if (IS_DEV) {
    const devBlock = document.createElement('div');
    Object.assign(devBlock.style, {
      padding: '6px 10px',
      background: 'rgba(255, 69, 0, 0.02)',
      border: `1px dashed rgba(255, 69, 0, 0.3)`,
      borderRadius: '2px',
      flexShrink: '0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });

    devBlock.innerHTML = `<div style="font-family:${DS.typography.fontFamily}; font-size:8px; font-weight:bold; color:${DS.colors.accent}; letter-spacing:1px;">OVERRIDE TERMINAL</div>`;

    const refillBtn = document.createElement('button');
    refillBtn.textContent = 'REFILL CR & AP';
    Object.assign(refillBtn.style, {
      padding: '3px 8px', background: DS.colors.accent, border: 'none', color: '#000000',
      fontFamily: DS.typography.fontFamily, fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', borderRadius: '1px'
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
  Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' });

  const titleEl = document.createElement('div');
  Object.assign(titleEl.style, {
    fontFamily: DS.typography.fontFamily, fontSize: '10px', fontWeight: 'bold', color: DS.colors.text,
    letterSpacing: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: '0'
  });
  titleEl.innerHTML = `<span>DAILY CONTRACTS</span><span style="font-size:8px; color:${DS.colors.textMuted}; letter-spacing:0.5px;">RESETS IN 14H</span>`;
  wrap.appendChild(titleEl);

  const grid = document.createElement('div');
  Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', flex: '1' });

  challengesDataList.slice(0, 3).forEach((ch: any) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'mm-glass';
    Object.assign(itemCard.style, {
      background: 'rgba(255, 255, 255, 0.02)', border: DS.glass.border, padding: '10px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '4px'
    });

    const currentVal = Math.floor(ch.target * 0.6);
    const pct = Math.min(100, Math.round((currentVal / ch.target) * 100));

    itemCard.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:3px;">
        <div style="font-family:${DS.typography.fontFamily}; font-size:10px; font-weight:bold; color:${DS.colors.text}; letter-spacing:0.5px;">${ch.title}</div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:8px; color:${DS.colors.textMuted}; line-height:1.3;">${ch.description}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-family:${DS.typography.fontFamily}; font-size:8px; font-weight:bold; color:${DS.colors.accent};">
          <span>+${ch.rewardCredits} CR</span>
          <span>${currentVal}/${ch.target}</span>
        </div>
        <div style="width:100%; height:2px; background:rgba(255,255,255,0.08); overflow:hidden; border-radius:1px;">
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
  Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' });

  const titleEl = document.createElement('div');
  Object.assign(titleEl.style, { fontFamily: DS.typography.fontFamily, fontSize: '10px', fontWeight: 'bold', color: DS.colors.text, letterSpacing: '2px', flexShrink: '0' });
  titleEl.textContent = 'GLOBAL CONTRACTOR STANDINGS';
  wrap.appendChild(titleEl);

  const dummyLeaderboard = [
    { rank: 1, name: 'SPECTER_01', score: 14850, kills: 242, faction: 'VIBE CO.' },
    { rank: 2, name: 'VALKYRIE_99', score: 12900, kills: 198, faction: 'SLOP INC.' },
    { rank: 3, name: 'GHOST_REAPER', score: 11400, kills: 175, faction: 'VIBE CO.' },
    { rank: 4, name: userData?.displayName?.toUpperCase() || 'YOU', score: 3200, kills: 45, faction: userData?.faction || 'UNAFFILIATED' }
  ];

  const table = document.createElement('div');
  Object.assign(table.style, { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1' });

  dummyLeaderboard.forEach(row => {
    const rowEl = document.createElement('div');
    const isUser = row.rank === 4;
    Object.assign(rowEl.style, {
      background: isUser ? 'rgba(255, 69, 0, 0.05)' : 'rgba(255, 255, 255, 0.01)',
      border: isUser ? `1px solid ${DS.colors.accent}` : DS.glass.border,
      padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: DS.typography.fontFamily, fontSize: '9px', borderRadius: '2px'
    });

    rowEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-weight:bold; color:${row.rank <= 3 ? DS.colors.accent : DS.colors.textMuted}; width:16px;">#${row.rank}</span>
        <span style="font-weight:bold; color:${DS.colors.text}; letter-spacing:0.5px;">${row.name}</span>
      </div>
      <div style="display:flex; gap:10px; color:${DS.colors.textMuted}; font-size:8px;">
        <span>FACTION: <b style="color:${row.faction === 'VIBE CO.' ? '#00F0FF' : DS.colors.accent}; font-weight:bold;">${row.faction}</b></span>
        <span>SCORE: <b style="color:${DS.colors.text};">${row.score}</b></span>
      </div>
    `;
    table.appendChild(rowEl);
  });

  wrap.appendChild(table);
  container.appendChild(wrap);
}

