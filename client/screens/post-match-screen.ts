import * as screenManager from "./screen-manager";
import { DS } from "../design-system";
import { audioManager } from "../audio";

export interface PlayerStatsPayload {
  damageDealt?: number;
  damageReceived?: number;
  deaths?: number;
  droneEliminations?: number;
  revivesPerformed?: number;
  scoreIndividual?: number;
  assists?: number;
  objectiveTimeHeld?: number;
  distanceTravelled?: number;
  timeAlive?: number;
}

export interface MatchEndPayload {
  type: string;
  result: "win" | "loss";
  stats?: Record<string, PlayerStatsPayload>;
  message?: string;
}

let postMatchScreenEl: HTMLElement | null = null;

export function initPostMatch() {
  postMatchScreenEl = document.getElementById("post-match-screen");
  if (!postMatchScreenEl) {
    postMatchScreenEl = document.createElement("div");
    postMatchScreenEl.id = "post-match-screen";
    postMatchScreenEl.setAttribute("data-ui-surface", "true");
    postMatchScreenEl.classList.add("ui-surface");
    document.body.appendChild(postMatchScreenEl);
  } else {
    postMatchScreenEl.setAttribute("data-ui-surface", "true");
    postMatchScreenEl.classList.add("ui-surface");
  }

  // Set sharp layout styles adhering strictly to DS Item 1 & Item 3
  Object.assign(postMatchScreenEl.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "9999",
    display: "none",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at center, rgba(17, 17, 17, 0.98) 0%, rgba(10, 10, 10, 0.92) 70%, rgba(0, 0, 0, 0.85) 100%)",
    backdropFilter: "none",
    fontFamily: DS.typography.fontFamily,
    color: DS.colors.textPrimary,
    boxSizing: "border-box",
    padding: "1.25rem",
    opacity: "0",
    transition: "opacity 300ms ease-in-out",
  });

  renderPostMatchScreen();
}

export function renderPostMatchScreen(payload?: MatchEndPayload) {
  if (!postMatchScreenEl) return;

  const result = payload?.result || "loss";
  const isWin = result === "win";
  const outcomeText = isWin ? "VICTORY" : "DEFEAT";
  const outcomeColor = isWin ? DS.colors.success : DS.colors.danger;
  const statusMessage = payload?.message || (isWin ? "SYSTEM TERMINATED" : "CONTRACT FAILED");

  // Extract local player stats or fallback to first stats in record
  const localPlayerId = (window as any).lastLocalPlayerId || (window as any).vexPlayerUid || "";
  let stats: PlayerStatsPayload = {};
  if (payload?.stats) {
    if (localPlayerId && payload.stats[localPlayerId]) {
      stats = payload.stats[localPlayerId];
    } else {
      const keys = Object.keys(payload.stats);
      if (keys.length > 0) {
        stats = payload.stats[keys[0]];
      }
    }
  }

  const damageDealt = Math.round(stats.damageDealt ?? 0);
  const damageReceived = Math.round(stats.damageReceived ?? 0);
  const deaths = stats.deaths ?? 0;
  const droneEliminations = stats.droneEliminations ?? 0;
  const revivesPerformed = stats.revivesPerformed ?? 0;
  const scoreIndividual = stats.scoreIndividual ?? 0;
  const assists = stats.assists ?? 0;
  const objectiveTimeHeld = Math.round(stats.objectiveTimeHeld ?? 0);
  const distanceTravelled = Math.round(stats.distanceTravelled ?? 0);
  const timeAliveSec = Math.round(stats.timeAlive ?? 0);
  const timeAliveStr = `${Math.floor(timeAliveSec / 60)}m ${timeAliveSec % 60}s`;

  postMatchScreenEl.innerHTML = `
    <div style="
      width: 100%;
      max-width: 51.25rem;
      background: rgba(15, 15, 15, 0.95);
      border: 1px solid ${DS.colors.border};
      border-top: 3px solid ${outcomeColor};
      border-radius: 0px;
      padding: 1.75rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    ">
      <!-- Header Banner -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid ${DS.colors.border}; padding-bottom: 1.00rem;">
        <div>
          <div style="font-size: ${DS.typography.sizes.small}; color: ${DS.colors.textMuted}; letter-spacing: 3px; font-weight: 700; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">
            OPERATIONAL DEBRIEFING
          </div>
          <div style="font-size: ${DS.typography.sizes.headingLg}; font-weight: 800; color: ${outcomeColor}; letter-spacing: 2px; line-height: 1.1; margin-top: 4px;">
            ${outcomeText}
          </div>
          <div style="font-size: ${DS.typography.sizes.body}; color: ${DS.colors.textSecondary}; font-family: ${DS.typography.fontFamilyMono}; margin-top: 2px;">
            ${statusMessage}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: ${DS.typography.sizes.small}; color: ${DS.colors.textMuted}; letter-spacing: 2px; font-family: ${DS.typography.fontFamilyMono};">
            INDIVIDUAL SCORE
          </div>
          <div style="font-size: ${DS.typography.sizes.headingLg}; font-weight: 800; color: ${DS.colors.accent}; font-family: ${DS.typography.fontFamilyMono};">
            ${scoreIndividual.toLocaleString()}
          </div>
        </div>
      </div>

      <!-- Real Active Stats Grid (10 Stats) -->
      <div>
        <div style="font-size: ${DS.typography.sizes.small}; color: ${DS.colors.textMuted}; letter-spacing: 2px; font-weight: 700; font-family: ${DS.typography.fontFamilyMono}; margin-bottom: 0.63rem; text-transform: uppercase;">
          TRACKED COMBAT METRICS
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
          
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">DRONE ELIMINATIONS</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${droneEliminations}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">DAMAGE DEALT</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${damageDealt.toLocaleString()}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">DAMAGE RECEIVED</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${damageReceived.toLocaleString()}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">DEATHS</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${deaths}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">ASSISTS</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${assists}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">REVIVES PERFORMED</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${revivesPerformed}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">TIME ALIVE</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${timeAliveStr}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">DISTANCE TRAVELLED</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${distanceTravelled}m</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">OBJECTIVE TIME</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.textPrimary}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${objectiveTimeHeld}s</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid ${DS.colors.border}; border-radius: 0px; padding: 0.75rem; text-align: center;">
            <div style="font-size: ${DS.typography.sizes.tiny}; color: ${DS.colors.textMuted}; letter-spacing: 1px; font-family: ${DS.typography.fontFamilyMono}; text-transform: uppercase;">INDIVIDUAL SCORE</div>
            <div style="font-size: ${DS.typography.sizes.headingMd}; font-weight: 800; color: ${DS.colors.accent}; margin-top: 4px; font-family: ${DS.typography.fontFamilyMono};">${scoreIndividual}</div>
          </div>

        </div>
      </div>

      <!-- Footer Action -->
      <div style="display: flex; justify-content: flex-end; padding-top: 0.75rem; border-top: 1px solid ${DS.colors.border};">
        <button id="post-match-return-btn" style="
          background: ${DS.colors.accent};
          color: #FFFFFF;
          border: none;
          border-radius: 0px;
          padding: 0.75rem 2.00rem;
          font-family: ${DS.typography.fontFamily};
          font-size: ${DS.typography.sizes.headingSm};
          font-weight: 700;
          letter-spacing: 2px;
          cursor: pointer;
          transition: background 150ms ease;
          text-transform: uppercase;
        ">
          RETURN TO MAIN MENU
        </button>
      </div>
    </div>
  `;

  // Attach button listener
  const returnBtn = document.getElementById("post-match-return-btn");
  if (returnBtn) {
    returnBtn.addEventListener("click", () => {
      audioManager.play("click");
      document.dispatchEvent(new CustomEvent("VEXEA_PLAYER_QUIT"));
    });
    returnBtn.addEventListener("mouseenter", () => {
      returnBtn.style.background = "#FF5722";
    });
    returnBtn.addEventListener("mouseleave", () => {
      returnBtn.style.background = DS.colors.accent;
    });
  }
}
