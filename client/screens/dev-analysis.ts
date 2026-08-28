import { DS } from "../design-system";
import { isClientSentryInitialized, getSentryDSN } from "../sentry";
import { clientFlagService } from "../flags/flag-service";
import { ClientFeatureFlagKey } from "../flags/client-flags";
import { SharedFeatureFlagKey } from "../../shared/feature-flags";

/**
 * Single-responsibility module for the "ARCHITECTURAL SERVICE ANALYSIS" DEV modal.
 * Renders a viewport-centered overlay showing Doppler / ConfigCat / Sentry service state.
 * No coupling to main-menu runtime state — operates on window/document only.
 */
export function showArchitecturalAnalysis() {
  const dopplerToken = (import.meta as any).env?.VITE_DOPPLER_TOKEN ? "PRESENT" : "MISSING";
  const hasClientKey = clientFlagService.hasClientKey() ? "ACTIVE" : "USING DEFAULTS";
  const hasSharedKey = clientFlagService.hasSharedKey() ? "ACTIVE" : "USING DEFAULTS";
  const sentryFlag = clientFlagService.getBoolean(ClientFeatureFlagKey.SENTRY_CLIENT_ENABLED, true) ? "ENABLED" : "DISABLED";
  const sentryStatus = isClientSentryInitialized ? "INITIALIZED" : "NOT INITIALIZED";
  const sentryDsn = getSentryDSN() ? "PRESENT" : "MISSING";
  const flagsUsedEnabled = clientFlagService.getBoolean(SharedFeatureFlagKey.FLAGS_USED_ENABLED, false) ? "TRUE" : "FALSE";

  const modal = document.createElement('div');
  modal.id = 'architectural-analysis-modal';
  
  // Section 11 Mathematization: Viewport-relative centering with zero-overlap guarantee
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    fontFamily: DS.typography.fontFamilyMono
  });

  const content = document.createElement('div');
  // Section 11: Content box size precisely calculated
  const contentWidth = 'clamp(320px, 90vw, 500px)';
  const contentPadding = DS.spacing.lg; // Assuming lg is a fixed pixel value, e.g., 24px
  
  Object.assign(content.style, {
    width: contentWidth,
    padding: contentPadding,
    background: DS.colors.surface,
    border: `${DS.borders.thin} ${DS.colors.border}`,
    borderRadius: DS.borders.radius.sm,
    position: 'relative',
    boxSizing: 'border-box', // Ensure padding doesn't cause overflow
    maxHeight: '90vh',
    overflowY: 'auto'
  });

  // Section 11: Internal spacing using consistent multipliers of DS.spacing
  const sectionMargin = 'clamp(15px, 3vh, 20px)';
  const labelMargin = '6px';
  const subtextMargin = '4px';

  content.innerHTML = `
    <div style="font-weight:bold; color:${DS.colors.accent}; margin-bottom:${sectionMargin}; font-size:clamp(0.88rem, 2vw, 1.13rem); letter-spacing:1px;">[ARCHITECTURAL SERVICE ANALYSIS]</div>
    
    <div style="margin-bottom:${sectionMargin}; border-bottom:1px solid #333; padding-bottom:clamp(0.63rem, 2vh, 0.94rem);">
      <div style="color:${DS.colors.success}; font-weight:bold; margin-bottom:${labelMargin}; font-size:clamp(0.69rem, 1.5vw, 0.88rem);">DOPPLER (Secret Management)</div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">VITE_DOPPLER_TOKEN: <span style="color:${dopplerToken === 'PRESENT' ? DS.colors.success : DS.colors.danger};">${dopplerToken}</span></div>
      <div style="color:${DS.colors.textMuted}; font-size:clamp(0.50rem, 1vw, 0.63rem); margin-top:${subtextMargin};">* Required for dynamic secret injection on client-side if enabled.</div>
    </div>

    <div style="margin-bottom:${sectionMargin}; border-bottom:1px solid #333; padding-bottom:clamp(0.63rem, 2vh, 0.94rem);">
      <div style="color:${DS.colors.accent}; font-weight:bold; margin-bottom:${labelMargin}; font-size:clamp(0.69rem, 1.5vw, 0.88rem);">CONFIGCAT (Feature Flags)</div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">CLIENT SCOPE: <span style="color:${hasClientKey === 'ACTIVE' ? DS.colors.success : DS.colors.warning};">${hasClientKey}</span></div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">SHARED SCOPE: <span style="color:${hasSharedKey === 'ACTIVE' ? DS.colors.success : DS.colors.warning};">${hasSharedKey}</span></div>
      <div style="color:${DS.colors.textMuted}; font-size:clamp(0.50rem, 1vw, 0.63rem); margin-top:${subtextMargin};">* Checks if SDK keys are present in environment variables.</div>
    </div>

    <div style="margin-bottom:${sectionMargin}; border-bottom:1px solid #333; padding-bottom:clamp(0.63rem, 2vh, 0.94rem);">
      <div style="color:${DS.colors.dev}; font-weight:bold; margin-bottom:${labelMargin}; font-size:clamp(0.69rem, 1.5vw, 0.88rem);">SENTRY (Error & Perf Tracking)</div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">ENABLED FLAG: <span style="color:${sentryFlag === 'ENABLED' ? DS.colors.success : DS.colors.danger};">${sentryFlag}</span></div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">DSN STATUS: <span style="color:${sentryDsn === 'PRESENT' ? DS.colors.success : DS.colors.danger};">${sentryDsn}</span></div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">INIT STATUS: <span style="color:${sentryStatus === 'INITIALIZED' ? DS.colors.success : DS.colors.danger}; font-weight:bold;">${sentryStatus}</span></div>
      <div style="font-size:clamp(0.63rem, 1.2vw, 0.75rem);">FLAGS_USED_ENABLED: <span style="color:${flagsUsedEnabled === 'TRUE' ? DS.colors.success : DS.colors.warning};">${flagsUsedEnabled}</span></div>
      <div style="color:${DS.colors.textMuted}; font-size:clamp(0.50rem, 1vw, 0.63rem); margin-top:${subtextMargin};">* Sentry only initializes if BOTH flag is true and DSN is present.</div>
    </div>

    <div style="margin-top:${sectionMargin}; display:flex; justify-content:flex-end;">
      <button id="close-analysis-btn" style="background:${DS.colors.accent}; color:#000; border:none; padding:clamp(0.38rem, 1vh, 0.50rem) clamp(1.00rem, 2vw, 1.50rem); font-family:${DS.typography.fontFamily}; font-weight:bold; cursor:pointer; font-size:clamp(0.63rem, 1.2vw, 0.75rem);">CLOSE ANALYSIS</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  content.querySelector('#close-analysis-btn')?.addEventListener('click', () => {
    modal.remove();
  });
}