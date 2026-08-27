import { DS } from "../design-system";

export function showMenuNotification(msg: string, type: 'info' | 'warning' = 'info') {
  const container = document.getElementById('vex-menu-notification-container') || document.createElement('div');
  if (!container.parentElement) {
    container.id = 'vex-menu-notification-container';
    Object.assign(container.style, {
      position: 'absolute',
      top: 'clamp(2.25rem, 5vh, 3.13rem)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '4500',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    });
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'mm-glass';
  Object.assign(toast.style, {
    padding: '0.50rem 1.00rem',
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.small,
    letterSpacing: '2px',
    color: type === 'warning' ? DS.colors.danger : DS.colors.accent,
    borderLeft: `3px solid ${type === 'warning' ? DS.colors.danger : DS.colors.accent}`,
    boxShadow: DS.glass.glowOuter,
    pointerEvents: 'auto',
    opacity: '0',
    transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
    transform: 'translateY(-20px)'
  });
  toast.textContent = msg.toUpperCase();
  container.appendChild(toast);
  
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

