import { DS } from './design-system';

export const HUD_HTML = `
    <!-- MAIN INTERACTIVE PORT -->
    <div id="vexea-view" class="absolute inset-0 w-full h-full overflow-hidden bg-transparent select-none text-white touch-none" style="font-family: ${DS.typography.fontFamilySecondary} !important; font-weight: ${DS.typography.weightMedium} !important;">
      
      <!-- Death Overlay -->
      <div id="death-overlay" style="display: none; position: absolute; inset: 0; z-index: 1000; background: ${DS.shadows.overlay}; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; color: white; font-family: ${DS.typography.fontFamilySecondary}, sans-serif; user-select: none;">
        <div style="background: rgba(255,255,255,0.04); border: ${DS.borders.thin} rgba(255,255,255,0.08); backdrop-filter: ${DS.glass.blur}; padding: 2rem 3rem; border-radius: ${DS.borders.radius.none}; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 1.2rem; letter-spacing: ${DS.typography.letterSpacing.wide}; color: rgba(255,255,255,0.4); text-transform: uppercase;">CONTRACTOR DOWN</div>
          <div id="death-countdown" style="font-size: 5rem; color: ${DS.colors.accent}; line-height: 1.2;">5</div>
          <div style="font-size: 0.85rem; letter-spacing: ${DS.typography.letterSpacing.extraWide}; color: rgba(255,255,255,0.3); text-transform: uppercase;">RESPAWNING</div>
        </div>
      </div>

      <!-- 3D Canvas -->
      <div id="canvas-container" class="absolute inset-0 w-full h-full z-0"></div>

<style>
/* 
   EXACT 1681x936 PROPORTIONAL HUD LAYOUT 
   All layout is responsive based purely on vw/vh. No fixed px conflicts.
*/
#hud-container {
  display: none !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  user-select: none !important;
  font-family: ${DS.typography.fontFamilySecondary} !important;
  font-weight: ${DS.typography.weightMedium} !important;
  letter-spacing: ${DS.typography.letterSpacing.tight} !important;
  z-index: 10 !important;
  margin: ${DS.spacing.none} !important;
  padding: ${DS.spacing.none} !important;
  color: white !important;
}
#hud-container * { box-sizing: border-box; }

#look-zone-right {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  width: 50% !important;
  height: 100% !important;
  pointer-events: auto !important;
}

/* SQUAD - TOP LEFT */
#btn-match-status {
  position: absolute !important;
  top: 1.05vh !important;
  left: 0.75vw !important;
  width: clamp(2.50rem, 5vh, 3.00rem) !important;
  height: clamp(2.50rem, 5vh, 3.00rem) !important;
  border-radius: 50% !important;
  background: ${DS.utils.rgba('#000000', 0.3)} !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 100 !important;
  color: white !important;
}
#btn-match-status:hover {
  background: ${DS.utils.rgba(DS.colors.text, 0.15)} !important;
}

/* TIMERS & TEXT - TOP CENTER */
#hud-timer-container {
  position: absolute !important;
  top: 1.05vh !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center !important;
  background: transparent !important;
  z-index: 12 !important;
}
#hud-timer {
  font-weight: ${DS.typography.weightMedium} !important;
  white-space: nowrap !important;
  font-size: clamp(0.75rem, 1.5vw, 1.13rem) !important;
  background: transparent !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  font-family: ${DS.typography.fontFamilySecondary} !important;
}
#hud-location {
  color: white !important;
  white-space: nowrap !important;
  font-size: clamp(0.56rem, 1.1vw, 0.81rem) !important;
  background: transparent !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* MINIMAP - TOP RIGHT */
#minimap-container {
  position: absolute !important;
  top: 1.05vh !important;
  right: 0.75vw !important;
  width: 6.50rem !important;
  height: 5.94rem !important;
  min-width: 6.50rem !important;
  min-height: 5.94rem !important;
  pointer-events: auto !important;
  background: ${DS.utils.rgba('#000000', 0.3)} !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  border-radius: 15px !important;
  overflow: hidden !important;
  z-index: 100 !important;
}
#minimap-player-arrow {
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.85)) !important;
}
#minimap-container.fullscreen-minimap {
 position: absolute !important;
  top: 5vh !important;
  left: 5vw !important;
  right: 5vw !important;
  width: 90vw !important;
  height: 90vh !important;
  z-index: 10000 !important;
  background: ${DS.utils.rgba('#000000', 0.95)} !important;
  border-radius: 4px !important;
}
#minimap-container.fullscreen-minimap ~ #minimap-label {
  display: none !important;
}
#minimap-canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
#minimap-label {
  position: absolute !important;
  /* Float below minimap with gap */
  top: calc(1.05vh + 5.94rem + 3px) !important;
  right: 0.75vw !important;
  width: 5.94rem !important;
  text-align: center !important;
  color: white !important;
  background: transparent !important;
  font-weight: ${DS.typography.weightMedium} !important;
  font-size: clamp(0.63rem, 1.1vw, 0.88rem) !important;
  border: none !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  font-family: ${DS.typography.fontFamilySecondary} !important;
}
#minimap-label svg {
  height: 0.75rem !important;
  width: auto !important;
  color: white !important;
}
@media (max-width: 44.63rem) {
  #minimap-label {
    top: calc(2.1vh + 5.94rem + 0.38rem) !important;
    width: 5.94rem !important;
  }
}

/* SIDEKICK UTIL BUTTONS - COLUMN LEFT OF MINIMAP */
.btn-sidekick {
  position: absolute !important;
  right: 17.5vw !important;
  width: 5vw !important;
  height: 5vw !important;
  min-width: 3rem !important;
  min-height: 3rem !important;
  background: transparent !important;
  border: none !important; /* No outline */
  pointer-events: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
}
#btn-settings { top: 1vh !important; }
#btn-mic { top: 6vh !important; }
#btn-chat { top: 11vh !important; }
#btn-fullscreen { top: 16vh !important; }
@media (max-width: 44.63rem) {
  .btn-sidekick {
    right: calc(0.75vw + 6.25rem + 0.63rem) !important;
  }
}

/* SETTINGS MODAL */
#settings-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  max-width: 28.13rem;
  background: rgba(0, 0, 0, 0.85);
  border: ${DS.borders.thin} #444;
  border-radius: ${DS.borders.radius.md};
  padding: ${DS.spacing.md};
  display: none; /* hidden by default */
  pointer-events: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 7.5px;
}
/* MOVEMENT & JOYSTICK - BOTTOM LEFT */
#joystick-boundary {
  position: absolute !important;
  left: 2.45vw !important;
  bottom: 4.5vh !important;
  width: 18.75vw !important;
  height: 18.75vw !important;
  min-width: 9.38rem !important;
  min-height: 9.38rem !important;
  pointer-events: auto !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#joystick-knob {
  width: 35% !important;
  height: 35% !important;
  border-radius: 50% !important;
  background: white !important;
}

#btn-sprint {
  position: absolute !important;
  left: 3.57vw !important;
  top: 8.28vh !important;
  width: 5.4vw !important;
  height: 5.4vw !important;
  min-width: 3.13rem !important;
  min-height: 3.13rem !important;
  pointer-events: auto !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
}

#btn-fire-left {
  position: absolute !important;
  left: 8.5vw !important;
  bottom: 17.5vh !important;
  width: 5.4vw !important;
  height: 5.4vw !important;
  min-width: 3.13rem !important;
  min-height: 3.13rem !important;
  pointer-events: auto !important;
  z-index: 100 !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: 1px solid white !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
}

/* HEALTH BAR (Filled Rectangle) */
#health-bar {
  position: absolute !important;
  bottom: 1.25vh !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 32vw !important;
  height: 2vh !important;
  min-height: 0.75rem !important;
  background: transparent !important;
  overflow: hidden !important;
}
#health-bar-fill {
  width: 100% !important;
  height: 100% !important;
  background: #fafafa !important;
}

#health-plus-sq-wrap {
  position: absolute !important;
  left: 26vw !important;
  bottom: 2.5vh !important;
  width: 7vw !important;
  height: 2.6vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #666666 !important;
}
#health-plus-sq-wrap svg {
  height: 100% !important;
  width: auto !important;
}
#health-text-wrap {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  pointer-events: none !important;
}
#health-text {
  font-weight: 500 !important;
  color: black !important;
  font-size: clamp(0.50rem, 0.9vw, 0.69rem) !important;
  display: block !important;
}
#health-text-wrap svg {
  height: 60% !important;
  width: auto !important;
  color: black !important;
}

/* WEAPONS - BOTTOM CENTER */
#weapon-selector {
  position: absolute !important;
  bottom: 4vh !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 48vw !important;
  height: 12vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  pointer-events: auto !important;
  background: rgba(0, 0, 0, 0.7) !important;
}
#auto-label {
  position: absolute !important;
  bottom: calc(4vh + 12vh + 4px) !important; /* Above weapon selector */
  left: 50% !important;
  transform: translateX(-50%) !important;
  color: white !important;
  background: transparent !important;
  font-weight: 500 !important;
  font-size: clamp(0.63rem, 1.1vw, 0.88rem) !important;
  border: none !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.btn-util {
  width: 7vw !important;
  height: 7vw !important;
  min-width: 4.00rem !important;
  min-height: 4.00rem !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: none !important; /* No outline */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
}
#weapon-slots-wrap {
  display: flex !important;
  gap: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  background: rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
  width: 28vw !important;
  height: 9vh !important;
}
#weapon-1-ammo, #weapon-2-ammo {
  position: absolute !important;
  bottom: ${DS.spacing.sm} !important;
  left: ${DS.spacing.sm} !important;
  margin: ${DS.spacing.none} !important;
  padding: ${DS.spacing.none} !important;
  font-family: ${DS.typography.fontFamilySecondary} !important;
  font-weight: ${DS.typography.weightMedium} !important;
  letter-spacing: ${DS.typography.letterSpacing.tight} !important;
  color: #CCCCCC !important;
  line-height: 1 !important;
  font-size: ${DS.typography.sizes.tiny} !important;
}
.ammo-mag { font-size: ${DS.typography.sizes.tiny} !important; }
.ammo-res { font-size: ${DS.typography.sizes.tiny} !important; margin-left: 2px !important; }
.weapon-slot {
  width: 50% !important;
  height: 100% !important;
  position: relative !important;
  background: transparent !important;
  color: #FFFFFF !important;
  border: 1px solid transparent !important;
  border-radius: 0 !important;
  box-sizing: border-box !important;
}
.weapon-slot.active {
  background: transparent !important;
  color: #FFFFFF !important;
  border: 1px solid #FFFFFF !important;
}
.weapon-slot.active::before {
  content: "" !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 0 !important;
  height: 0 !important;
  border-top: 0.63rem solid #FFFFFF !important;
  border-right: 0.63rem solid transparent !important;
}
#weapon-slot-1 { opacity: 1 !important; }
#weapon-slot-2 { opacity: 1 !important; }

/* ACTION BUTTONS (THUMB PAD) - BOTTOM RIGHT */
.btn-action {
  position: absolute !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: 1px solid white !important;
  pointer-events: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
}

#btn-fire-right {
  right: 1.5vw !important;
  bottom: 2.5vh !important;
  width: 13.5vw !important;
  height: 13.5vw !important;
  min-width: 6.25rem !important;
  min-height: 6.25rem !important;
}

#btn-ads {
  right: 10vw !important;
  bottom: 7.5vh !important;
  width: 6.75vw !important;
  height: 6.75vw !important;
  min-width: 3.75rem !important;
  min-height: 3.75rem !important;
}

#btn-reload {
  right: 4vw !important;
  bottom: 17.5vh !important;
  width: 5.25vw !important;
  height: 5.25vw !important;
  min-width: 2.81rem !important;
  min-height: 2.81rem !important;
}

#btn-jump {
  right: 11vw !important;
  bottom: 14vh !important;
  width: 6vw !important;
  height: 6vw !important;
  min-width: 3.13rem !important;
  min-height: 3.13rem !important;
}

#btn-crouch {
  right: 1vw !important;
  bottom: 12.5vh !important;
  width: 5.25vw !important;
  height: 5.25vw !important;
  min-width: 2.81rem !important;
  min-height: 2.81rem !important;
}

#btn-dash {
  right: 11vw !important;
  bottom: 1vh !important;
  width: 5.25vw !important;
  height: 5.25vw !important;
  min-width: 2.81rem !important;
  min-height: 2.81rem !important;
}

/* SVG Constraints */
#hud-container svg { width: 50% !important; height: 50% !important; color: white !important; pointer-events: none !important; }
#hud-container svg path, #hud-container svg g { fill: currentColor !important; }
#hud-container .btn-sidekick svg { width: 55% !important; height: 55% !important; }
#hud-container #btn-mic svg { width: 75% !important; height: 75% !important; }
#hud-container .weapon-slot svg {
  height: 85% !important;
  width: 55% !important;
  position: absolute !important;
  top: 50% !important;
  right: 0.88rem !important;
  transform: translateY(-50%) scaleX(-1) !important;
  pointer-events: none !important;
  color: inherit !important;
}
#hud-container .squad-circle svg { width: 70% !important; height: 70% !important; color: white !important; }
#hud-container .btn-util svg { width: 60% !important; height: 60% !important; }
#hud-container .btn-action svg { width: 55% !important; height: 55% !important; }
#hud-container #btn-crouch svg { width: 75% !important; height: 75% !important; }
#hud-container #btn-ads svg { width: 75% !important; height: 75% !important; }
#weapon-slot-1 svg, #weapon-slot-2 svg {
  transform: translateY(-50%) scaleX(-1) !important;
}
#btn-fire-right svg { transform: scaleX(-1) !important; }
#squad-container .squad-circle { border-color: #22c55e !important; }

/* CROSSHAIR */
#center-crosshair {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 0 !important;
  height: 0 !important;
  pointer-events: none !important;
  z-index: 40 !important;
}
.cross-line { position: absolute !important; background: white !important; }
/* File-backed icon contract: all static HUD icons resolve from /ui_svgs/. */
.ui-svg-icon { display: block; width: 72%; height: 72%; object-fit: contain; pointer-events: none; user-select: none; }
.btn-sidekick .ui-svg-icon { width: 1.38rem; height: 1.38rem; }
.btn-util .ui-svg-icon { width: 70%; height: 70%; }
.weapon-slot .ui-svg-icon { width: 100%; height: 100%; }
#minimap-player-arrow .ui-svg-icon, #medkit-arrow .ui-svg-icon, #health-plus-sq-wrap .ui-svg-icon, #health-text-wrap .ui-svg-icon { width: 100%; height: 100%; }

</style>

<div id="hud-container">
  <div id="look-zone-right"></div>
  
  <button id="btn-match-status" title="Match Status & Ping Diagnostics">
    <img class="ui-svg-icon" src="/ui_svgs/status_signal.svg" alt="" aria-hidden="true" draggable="false" style="width:1.38rem;height:1.38rem;">
  </button>

  <!-- MATCH STATUS & LIVE PING MODAL -->
  <div id="match-status-modal" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85vw; max-width: 26.25rem; background: rgba(12, 12, 14, 0.92); border: ${DS.borders.thin} ${DS.utils.rgba(DS.colors.text, 0.15)}; backdrop-filter: ${DS.glass.blur}; border-radius: ${DS.borders.radius.lg}; padding: ${DS.spacing.xxl}; z-index: 1000; color: white; font-family: ${DS.typography.fontFamilySecondary}, sans-serif; box-shadow: 0 0.63rem 1.88rem rgba(0,0,0,0.7);">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.75rem; margin-bottom: 1.00rem;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
          <img class="ui-svg-icon" src="/ui_svgs/profile.svg" alt="" aria-hidden="true" draggable="false" style="width:1.25rem;height:1.25rem;">
        </div>
        <div>
          <div id="status-player-name" style="font-size: 1.1rem; font-weight: 700; letter-spacing: 0.05em; color: white;">OPERATIVE</div>
          <div style="font-size: 0.75rem; color: #a1a1aa; text-transform: uppercase;">ACTIVE MATCH</div>
        </div>
      </div>
      <button id="btn-close-match-status" style="background: transparent; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer; padding: 4px;">&#10005;</button>
    </div>

    <!-- MATCH STATS -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.50rem; margin-bottom: 1.00rem; text-align: center;">
      <div style="background: rgba(255,255,255,0.05); padding: 0.50rem; border-radius: 0.38rem;">
        <div style="font-size: 0.7rem; color: #a1a1aa; text-transform: uppercase;">KILLS</div>
        <div id="status-kills" style="font-size: 1.3rem; font-weight: 700; color: #22c55e;">0</div>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 0.50rem; border-radius: 0.38rem;">
        <div style="font-size: 0.7rem; color: #a1a1aa; text-transform: uppercase;">DEATHS</div>
        <div id="status-deaths" style="font-size: 1.3rem; font-weight: 700; color: #ef4444;">0</div>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 0.50rem; border-radius: 0.38rem;">
        <div style="font-size: 0.7rem; color: #a1a1aa; text-transform: uppercase;">SCORE</div>
        <div id="status-score" style="font-size: 1.3rem; font-weight: 700; color: #eab308;">0</div>
      </div>
    </div>

    <!-- NETCODE & PING DIAGNOSTICS -->
    <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.50rem; padding: 0.75rem;">
      <div style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 0.50rem; text-transform: uppercase; display: flex; align-items: center; justify-content: space-between;">
        <span>NETCODE & PING STATS</span>
        <span id="status-net-mode" style="color: #3b82f6; font-size: 0.7rem;">CLIENT PREDICTIVE</span>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 0.38rem; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #71717a;">PING (RTT):</span>
          <span id="status-ping-val" style="font-weight: 700; color: #22c55e;">-- ms</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #71717a;">JITTER:</span>
          <span id="status-jitter-val" style="color: #d4d4d8;">0 ms</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #71717a;">SERVER TICK RATE:</span>
          <span id="status-tick-val" style="color: #d4d4d8;">60 Hz</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #71717a;">UNACKNOWLEDGED INPUTS:</span>
          <span id="status-pending-inputs" style="color: #d4d4d8;">0</span>
        </div>
      </div>
    </div>
  </div>

  <div id="hud-timer-container">
    <div id="hud-timer">TIME LEFT: 00:00</div>
  </div>

  <div id="compass-placeholder" style="position: absolute; top: 10vh; left: 50%; transform: translateX(-50%); width: 20vw; height: 4vh; border: none !important; background: ${DS.utils.rgba('#000000', 0.3)} !important; z-index: 11 !important;"></div>

  <div id="minimap-container">
    <canvas id="minimap-canvas"></canvas>
    <div id="minimap-players" style="position: absolute; inset: 0; pointer-events: none;">
      <div id="minimap-player-arrow" style="position: absolute; top: 50%; left: 50%; width: 1.25rem; height: 1.25rem; margin-top: -0.63rem; margin-left: -0.63rem; display: flex; align-items: center; justify-content: center; transform-origin: center;">
        <img class="ui-svg-icon" src="/ui_svgs/player_arrow.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
      </div>
    </div>
  </div>
  <div id="minimap-label">CORE</div>

  <button id="btn-settings" class="btn-sidekick text-white">
    <img class="ui-svg-icon" src="/ui_svgs/settings.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-mic" class="btn-sidekick text-white">
    <img class="ui-svg-icon" src="/ui_svgs/microphone.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-chat" class="btn-sidekick text-white">
    <img class="ui-svg-icon" src="/ui_svgs/messages.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-fullscreen" class="btn-sidekick text-white" title="Toggle Fullscreen">
    <img class="ui-svg-icon" src="/ui_svgs/fullscreen.svg" alt="" aria-hidden="true" draggable="false">
  </button>

  <div id="joystick-boundary" class="platform-mobile">
    <div style="position: absolute; top: 4px; left: 50%; transform: translateX(-50%); width: 0.50rem; height: 0.38rem; background: white; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></div>
    <div style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 0.50rem; height: 0.38rem; background: white; clip-path: polygon(50% 100%, 0% 0%, 100% 0%);"></div>
    <div style="position: absolute; left: 4px; top: 50%; transform: translateY(-50%); width: 0.38rem; height: 0.50rem; background: white; clip-path: polygon(0% 50%, 100% 0%, 100% 100%);"></div>
    <div style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 0.38rem; height: 0.50rem; background: white; clip-path: polygon(100% 50%, 0% 0%, 0% 100%);"></div>
    <div id="joystick-knob"></div>
  </div>
  
  <button id="btn-fire-left" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/fire.svg" alt="" aria-hidden="true" draggable="false">
  </button>

  <button id="btn-sprint" class="btn-action platform-mobile" style="position: absolute; left: 7.14vw; top: 16.56vh; width: 5.4vw; height: 5.4vw; min-width: 3.13rem; min-height: 3.13rem; display: none;">
    <img class="ui-svg-icon" src="/ui_svgs/sprint.svg" alt="" aria-hidden="true" draggable="false">
  </button>

  <button id="auto-label" style="background: transparent; border: none; color: inherit; font: inherit; cursor: pointer; pointer-events: auto;">AUTO &rarr;</button>
  <button id="btn-walkie" class="btn-util" style="position: absolute; left: 26vw; bottom: 4vh;">
    <div id="util-1-badge" class="platform-desktop" style="position: absolute; top: -0.38rem; right: -0.38rem; width: 1.13rem; height: 1.13rem; background: rgba(10, 10, 12, 0.85); color: #FFFFFF; font-size: ${DS.typography.sizes.small}; font-weight: 700; padding: 0; border-radius: 0px; border: 1px solid rgba(255,255,255,0.3); font-family: monospace; text-shadow: 0 1px 2px #000; display: flex; align-items: center; justify-content: center;">G</div>
    <img class="ui-svg-icon" src="/ui_svgs/radio.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  
  <button id="btn-helmet" class="btn-util" style="position: absolute; left: 34.5vw; bottom: 4vh; width: 7vw; height: 7vw; min-width: 4.00rem; min-height: 4.00rem; display: flex; align-items: center; justify-content: center; background: transparent; border: none;">
    <img class="ui-svg-icon" src="/ui_svgs/helmet.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
  </button>
  
  <div id="weapon-slots-wrap" style="position: absolute; left: 50%; transform: translateX(-50%); bottom: 4vh;">
    <div id="weapon-slot-1" class="weapon-slot active">
      <img class="ui-svg-icon" src="/ui_svgs/rifle.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
      <div id="weapon-1-ammo"><span class="ammo-mag">40</span><span class="ammo-res">/289</span></div>
    </div>
    <div id="weapon-slot-2" class="weapon-slot">
      <img class="ui-svg-icon" src="/ui_svgs/pistol.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
      <div id="weapon-2-ammo"><span class="ammo-mag">35</span><span class="ammo-res">/241</span></div>
    </div>
  </div>

  <div id="medkit-arrow" style="position: absolute; right: 26vw; bottom: calc(4vh + 7vw + 0.31rem); width: 1.50rem; height: 1.50rem; color: white; opacity: 0.85; pointer-events: auto; display: flex; align-items: center; justify-content: center;">
    <img class="ui-svg-icon" src="/ui_svgs/up_arrow.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
  </div>
  <button id="btn-medkit" class="btn-util" style="position: absolute; right: 26vw; bottom: 4vh;">
    <div id="util-2-badge" class="platform-desktop" style="position: absolute; top: -0.38rem; right: -0.38rem; width: 1.13rem; height: 1.13rem; background: rgba(10, 10, 12, 0.85); color: #FFFFFF; font-size: ${DS.typography.sizes.small}; font-weight: 700; padding: 0; border-radius: 0px; border: 1px solid rgba(255,255,255,0.3); font-family: monospace; text-shadow: 0 1px 2px #000; display: flex; align-items: center; justify-content: center;">F</div>
    <img class="ui-svg-icon" src="/ui_svgs/medkit.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
  </button>

  <div id="health-plus-sq-wrap">
    <img class="ui-svg-icon" src="/ui_svgs/health_plus.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
  </div>

  <div id="health-bar">
    <div id="health-bar-fill"></div>
    <div id="health-text-wrap">
      <img class="ui-svg-icon" src="/ui_svgs/health_status_low.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
      <div id="health-text" style="margin: 0 4px;">100</div>
      <img class="ui-svg-icon" src="/ui_svgs/health_status_critical.svg" alt="" aria-hidden="true" draggable="false" style="width:100%;height:100%;">
    </div>
  </div>

  <button id="btn-fire-right" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/fire.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-ads" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/aim.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-reload" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/reload.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-jump" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/up_arrow.svg" alt="" aria-hidden="true" draggable="false">
  </button>
  <button id="btn-crouch" class="btn-action platform-mobile">
    <img class="ui-svg-icon" src="/ui_svgs/crouch.svg" alt="" aria-hidden="true" draggable="false">
  </button>

  <div id="center-crosshair">
    <div class="cross-line" style="top: -0.6vw; left: -1px; width: 2px; height: 0.6vw; transform: translateY(-0.3vw);"></div>
    <div class="cross-line" style="top: 0; left: -1px; width: 2px; height: 0.6vw; transform: translateY(0.3vw);"></div>
    <div class="cross-line" style="left: -0.6vw; top: -1px; width: 0.6vw; height: 2px; transform: translateX(-0.3vw);"></div>
    <div class="cross-line" style="left: 0; top: -1px; width: 0.6vw; height: 2px; transform: translateX(0.3vw);"></div>
  </div>

  <!-- POST MATCH SUMMARY SCREEN -->
  <div id="post-match-screen" style="display: none; position: absolute; inset: 0; z-index: 2000; background: ${DS.utils.rgba('#050505', 0.95)}; backdrop-filter: ${DS.glass.blur}; -webkit-backdrop-filter: ${DS.glass.blur}; flex-direction: column; align-items: center; justify-content: center; color: white; padding: ${DS.spacing.lg};">
    <div style="width: 100%; max-width: 40.00rem; border: ${DS.borders.thin} ${DS.utils.rgba(DS.colors.text, 0.08)}; background: ${DS.utils.rgba('#0A0A0A', 0.85)}; box-shadow: 0 0 1.88rem rgba(0,0,0,0.8); padding: ${DS.spacing.xl}; display: flex; flex-direction: column; gap: ${DS.spacing.lg};">
      
      <!-- TITLE & STATUS -->
      <div style="text-align: center; border-bottom: ${DS.borders.thin} ${DS.utils.rgba(DS.colors.text, 0.1)}; padding-bottom: ${DS.spacing.md};">
        <div id="summary-victory-status" style="font-size: ${DS.typography.sizes.headingLg}; font-weight: ${DS.typography.weightMedium}; letter-spacing: ${DS.typography.letterSpacing.extraWide}; color: ${DS.colors.accent};">OPERATION COMPLETE</div>
        <div style="font-size: ${DS.typography.tiny}; letter-spacing: ${DS.typography.letterSpacing.wide}; color: ${DS.colors.textSecondary}; margin-top: ${DS.spacing.sm};">CONTRACT DIVISION SYSTEM ENGAGEMENT SUMMARY</div>
      </div>

      <!-- PERSONAL SUMMARY GRID -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.50rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.63rem;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: ${DS.typography.sizes.tiny}; letter-spacing: 2px; color: #888888;">CONTRACTOR SCORE</div>
          <div id="summary-score" style="font-size: ${DS.typography.sizes.headingLg}; font-weight: 500; color: white;">0</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; justify-content: center; align-items: flex-end; text-align: right;">
          <div style="font-size: ${DS.typography.sizes.tiny}; letter-spacing: ${DS.typography.letterSpacing.tight}; color: #888888;">BATTLEPASS TIER</div>
          <div style="font-size: ${DS.typography.sizes.headingSm}; font-weight: ${DS.typography.weightMedium}; color: ${DS.colors.accent}; display: flex; align-items: center; gap: ${DS.spacing.sm};">
            TIER <span id="summary-bp-tier">1</span> <span style="font-size: ${DS.typography.sizes.small}; color: #4ade80;">(+20% XP)</span>
          </div>
        </div>
      </div>

      <!-- PERFORMANCE METRICS STATS -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: ${DS.typography.sizes.small}; letter-spacing: 3px; color: ${DS.colors.accent}; font-weight: 500;">PERFORMANCE ASSESSMENT</div>
        
        <div id="summary-stats-container" style="display: flex; flex-direction: column; gap: 4px;">
          <!-- Dynamically filled stats rows -->
        </div>
      </div>

      <!-- REWARDS GAINED (CREDITS, XP, PASS) -->
      <div style="background: ${DS.utils.rgba(DS.colors.accent, 0.05)}; border: ${DS.borders.thin} ${DS.utils.rgba(DS.colors.accent, 0.15)}; padding: ${DS.spacing.md}; display: flex; flex-direction: column; gap: ${DS.spacing.sm};">
        <div style="font-size: ${DS.typography.sizes.tiny}; letter-spacing: ${DS.typography.letterSpacing.tight}; color: ${DS.colors.accent}; font-weight: ${DS.typography.weightMedium};">EARNED CREDITS & STAMINA TARIFF</div>
        <div style="display: flex; justify-content: space-between; font-size: ${DS.typography.sizes.body};">
          <span style="color: #888888;">MATCH COMPLETION ALLOTMENT</span>
          <span style="color: #4ade80; font-weight: 500;">+25 CR</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${DS.typography.sizes.body};">
          <span style="color: #888888;">OPERATION ENVELOPE TAX (ENERGY)</span>
          <span style="color: #f87171; font-weight: 500;">-10 EN</span>
        </div>
      </div>

      <!-- DISPATCH BUTTON -->
      <div>
        <button id="main-menu-btn" style="width: 100%; padding: 0.88rem; background: ${DS.colors.accent}; border: none; color: ${DS.colors.background}; font-family: inherit; font-size: ${DS.typography.sizes.headingSm}; font-weight: ${DS.typography.weightMedium}; letter-spacing: ${DS.typography.letterSpacing.wide}; cursor: pointer; transition: all 200ms ease;">
          RETURN TO COMMAND PORTAL
        </button>
      </div>

    </div>
  </div>

</div>
`;
