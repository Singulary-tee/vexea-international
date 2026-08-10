/**
 * ============================================================================
 * DESIGN SYSTEM COMPLIANCE & RE-ORDER MANUAL (SENIOR IMPLEMENTER RULES)
 * ============================================================================
 * 1. ROUNDED CORNERS AND GLASSMORPHISM ARE STRICTLY FORBIDDEN.
 *    - All containers, cards, tabs, buttons, and interactive components must use
 *      perfectly sharp, orthogonal edges (no border-radius, i.e., 0px).
 *    - No fuzzy frosted glass panels or complex radial-gradient reflections.
 *
 * 2. BORDERS ARE ONLY SELECTIVELY USED.
 *    - Do not outline everything. Minimize visual clutter. Only use highly selective,
 *      thin borders or status accent indicators to group critical systems.
 *
 * 3. DARK BACKGROUNDS MUST ALWAYS USE TRANSPARENCY AND SMOKE-LIKE BLURRY EDGES.
 *    - Never use hard dark blocks, rigid card boundaries, or stark light-dark dividing walls.
 *    - Dark backgrounds must merge seamlessly with the scene using smooth, transparent,
 *      smoke-like radial/linear gradients fading gently to 100% transparent.
 *
 * 4. GRADIENTS ARE SELECTIVELY USED AND ARE VERY SUBTLE.
 *    - Bright high-contrast gradients are banned. Use only extremely low-contrast,
 *      nearly invisible fusions of adjacent tones or soft neutral darkness.
 *
 * 5. AREA MANAGEMENT & ABSOLUTE NO SCROLLING RULE (STRICT RULE).
 *    - NO SCROLLING is permitted unless explicitly allowed by the user.
 *    - Posting a cut or cropped screenshot DOES NOT WARRANT USING SCROLLING.
 *      A cut screenshot means you failed to make the items adapt correctly to the viewport.
 *    - Screens and UI elements MUST dynamically adapt, scale, and utilize available horizontal
 *      and vertical space (multi-column grids, responsive font/padding scaling, flex layouts)
 *      so that all content fits within the viewport without clipping or scrollbars.
 *    - Converting unoptimized layouts into scrollable containers or tiny scroll strips is strictly prohibited.
 *
 * 6. EYEBALLING IS ABSOLUTELY FORBIDDEN & STRICT MATHEMATICAL GUARANTEES MANDATED.
 *    - Eyeballing any layout sizes, element positions, HUD components, UI alignments,
 *      or 3D canvas models is strictly prohibited.
 *    - Every sizing, gap, offset, padding, and layout structure must have a proven,
 *      strict mathematical guarantee to prevent overlap, clipping, or scrolling.
 *    - You must allocate available space (using exact percentages, clamp bounds, or
 *      box-sizing) mathematically so that the elements are guaranteed never to collide
 *      or overflow. Do not resize or position based on arbitrary visual estimation.
 * ============================================================================
 */

export const DS = {
  colors: {
    background: '#0A0A0A',
    surface: '#111111',
    border: '#2A2A2A',
    accent: '#FF4500',
    textPrimary: '#E8E8E8',
    textSecondary: '#888888',
    danger: '#CC3333',
    success: '#33AA66',
    warning: '#EAB308',
    dev: '#FF0064',
    info: '#3b82f6',
    text: '#E8E8E8',
    textMuted: '#888888',
    factions: {
      vibe: {
        primary: '#A855F7',
        muted: '#c084fc',
        shadow: 'rgba(168,85,247,0.2)'
      },
      slop: {
        primary: '#F97316',
        muted: '#fdba74',
        shadow: 'rgba(249,115,22,0.2)'
      }
    },
    zones: {
      spawn: "#5a6982",
      courtyard: "#8292ab",
      warehouse: "#93c5fd",
      bridge: "#fca5a5",
      plant: "#86efac",
      tunnels: "#d8b4fe",
      core: "#fde047"
    },
    drones: {
      recon: "#00aaff",
      rotary: "#00aaff",
      bomber: "#ff4400",
      ground: "#ff8800"
    }
  },
  glass: {
    background: 'rgba(10, 10, 10, 0.55)',
    blur: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderAccent: '1px solid #FF4500',
    borderAccentFull: '2px solid #FF4500',
    glowInner: 'inset 0 0 16px rgba(255, 69, 0, 0.08)',
    glowOuter: '0 0 12px rgba(255, 69, 0, 0.25)',
  },
  typography: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontFamilySecondary: "'Rajdhani', sans-serif",
    fontFamilyWordmark: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    fontFamilyMono: "'Roboto Mono', monospace",
    sizes: {
      display: 'clamp(36px, 6vw, 64px)',
      headingLg: 'clamp(24px, 4vw, 36px)',
      headingMd: 'clamp(18px, 3vw, 24px)',
      headingSm: 'clamp(14px, 2.2vw, 18px)',
      body: 'clamp(12px, 1.8vw, 15px)',
      small: 'clamp(11px, 1.5vw, 13px)',
      tiny: 'clamp(9px, 1.2vw, 11px)',
    },
    large: 'clamp(28px, 4.5cqi, 48px)',
    medium: 'clamp(18px, 2.8cqi, 24px)',
    small: 'clamp(12px, 1.8cqi, 14px)',
    tiny: 'clamp(9px, 1.4cqi, 11px)',
    weightBold: '700',
    weightMedium: '500',
    weightRegular: '400',
    transform: 'uppercase',
    letterSpacing: {
      normal: 'normal',
      tight: '0.05em',
      wide: '0.15em',
      extraWide: '0.3em',
      mega: '0.4em'
    }
  },
  spacing: {
    none: '0px',
    xs: 'clamp(1px, 0.3cqi, 2px)',
    sm: 'clamp(2px, 0.5cqi, 4px)',
    md: 'clamp(4px, 1cqi, 8px)',
    lg: 'clamp(6px, 1.5cqi, 12px)',
    xl: 'clamp(10px, 2cqi, 16px)',
    xxl: 'clamp(16px, 3cqi, 24px)',
    huge: 'clamp(20px, 4cqi, 32px)'
  },
  layout: {
    headerHeight: 'clamp(44px, 7vh, 56px)',
    colLeft: 'clamp(160px, 22vw, 240px)',
    colRight: 'clamp(240px, 28vw, 360px)',
    sidebarWidth: 'clamp(200px, 25vw, 300px)',
    cardPadding: 'clamp(10px, 2vw, 20px)',
    gap: 'clamp(8px, 1.5vw, 16px)',
    maxContentWidth: '100%'
  },
  borders: {
    thin: '1px solid',
    thick: '2px solid',
    radius: {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px'
    }
  },
  shadows: {
    accent: '0 0 16px rgba(255, 69, 0, 0.15)',
    accentStrong: '0 0 24px rgba(255, 69, 0, 0.3)',
    text: '2px 2px 4px rgba(0,0,0,0.5)',
    overlay: 'rgba(0, 0, 0, 0.88)'
  },
  motion: {
    fast: '150ms ease',
    normal: '300ms ease-in-out',
    slow: '2000ms ease-in-out'
  },
  transitions: {
    screenDurationMs: 100,
    card: '180ms ease-out',
    panel: '250ms ease-out',
    expand: '320ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  utils: {
    rgba: (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
};

export function createSkeletonBox(width: string, height: string, label: string = 'SYNCING DATA...'): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const box = document.createElement('div');
  box.className = 'vexea-skeleton-box';
  Object.assign(box.style, {
    width,
    height,
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '0.38rem',
    boxSizing: 'border-box'
  });

  const tag = document.createElement('span');
  tag.textContent = label;
  Object.assign(tag.style, {
    fontFamily: DS.typography.fontFamilyMono,
    fontSize: '0.56rem',
    letterSpacing: '2px',
    color: 'rgba(255, 69, 0, 0.6)',
    textTransform: 'uppercase'
  });
  box.appendChild(tag);
  return box;
}

export function createSkeletonText(width: string, height: string = '0.88rem'): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const text = document.createElement('div');
  text.className = 'vexea-skeleton-text';
  Object.assign(text.style, {
    width,
    height,
    boxSizing: 'border-box'
  });
  return text;
}
