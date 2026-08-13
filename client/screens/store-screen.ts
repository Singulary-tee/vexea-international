import { DS } from "../design-system";
import catalogItems from "../../shared/catalog.json";
import { CatalogItem } from "../../shared/verification/types";
import { audioManager } from "../audio";
import { StudioPreviewManager, AVAILABLE_SKINS } from "../StudioPreviewManager";
import { auth } from "../firebase";

let activeCategoryFilter: 'ALL' | 'cosmetic' | 'blueprint' | 'booster' | 'bundle' = 'ALL';

function getPlayerId(): string {
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if ((window as any).vexPlayerUid && (window as any).vexPlayerUid !== "guest") {
    return (window as any).vexPlayerUid;
  }
  try {
    let guestId = localStorage.getItem('vex_guest_uid');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      localStorage.setItem('vex_guest_uid', guestId);
    }
    return guestId;
  } catch (e) {
    return `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
  }
}

export function renderStoreScreen(container: HTMLElement, registeredUserData: any): void {
  container.innerHTML = '';

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: '10px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });

  // Main Split Store Layout (Zero Scroll)
  const storeSplit = document.createElement('div');
  Object.assign(storeSplit.style, {
    display: 'flex',
    flexDirection: window.innerWidth < 800 ? 'column' : 'row',
    gap: '8px',
    flex: '1',
    width: '100%',
    height: '100%',
    minHeight: '0'
  });

  // ==========================================
  // LEFT COLUMN: Featured Exclusive Offer (35%)
  // ==========================================
  const leftCol = document.createElement('div');
  Object.assign(leftCol.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '0'
  });

  const featuredLabel = document.createElement('div');
  featuredLabel.textContent = 'PROMOTIONAL BROADCAST';
  Object.assign(featuredLabel.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    color: DS.colors.textMuted,
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  });
  leftCol.appendChild(featuredLabel);

  const featuredOffer = (catalogItems as CatalogItem[]).find(i => i.featured) || (catalogItems as CatalogItem[])[0];

  const featuredCard = document.createElement('div');
  Object.assign(featuredCard.style, {
    flex: '1',
    background: `linear-gradient(180deg, ${DS.utils.rgba(DS.colors.accent, 0.04)} 0%, rgba(255, 255, 255, 0.01) 100%)`,
    border: `1px solid ${DS.colors.accent}`,
    padding: '0.63rem 0.75rem',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    gap: '6px',
    minHeight: '0'
  });

  // Glowing orange visual strip
  const glowBar = document.createElement('div');
  Object.assign(glowBar.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '2px',
    background: DS.colors.accent,
    boxShadow: `0 0 10px ${DS.colors.accent}`
  });
  featuredCard.appendChild(glowBar);

  const discountBadge = featuredOffer.discountPercentage ? `${featuredOffer.discountPercentage}% OFF` : 'FEATURED';
  const priceDisplay = featuredOffer.currency === 'energy'
    ? `<img src="/ui_svgs/energy.svg" style="width:0.88rem; height:0.88rem; vertical-align:middle; filter:brightness(0) invert(1);" alt="Energy" /> ${featuredOffer.priceEnergy} ENERGY`
    : `<img src="/ui_svgs/coin.svg" style="width:0.88rem; height:0.88rem; vertical-align:middle; filter:brightness(0) invert(1);" alt="Coin" /> ${featuredOffer.priceCredits} CR`;

  featuredCard.innerHTML += `
    <div style="display:flex; flex-direction:column; gap:0.5vh; min-height:0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.69rem); color:${DS.colors.accent}; font-weight:bold; letter-spacing:0.1vw;">FEATURED DEAL</span>
        <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); color:#00FF88; font-weight:bold; letter-spacing:0.05vw; background:rgba(0,255,136,0.06); padding:0.2vh 0.5vw; border:1px solid rgba(0,255,136,0.15);">${discountBadge}</span>
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.81rem, 2vh, 1.00rem); font-weight:bold; color:${DS.colors.text}; letter-spacing:0.1vw; line-height:1.1; margin-top:0.2vh;">
        ${featuredOffer.title.toUpperCase()}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; line-height:1.3;">
        ${featuredOffer.description}
      </div>
    </div>

    <!-- Inside Specifications Bulletins -->
    <div style="display:flex; flex-direction:column; gap:0.5vh; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:0.8vh 1vw; border-radius:0px;">
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.05vw;">SPECIFICATIONS:</div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1.1vh, 0.75rem); color:${DS.colors.text}; font-weight:bold; display:flex; align-items:center; gap:0.5vw;">
        <span style="color:${DS.colors.accent};">•</span> CATEGORY: ${featuredOffer.category.toUpperCase()}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1.1vh, 0.75rem); color:${DS.colors.text}; font-weight:bold; display:flex; align-items:center; gap:0.5vw;">
        <span style="color:${DS.colors.accent};">•</span> FACTION: ${featuredOffer.faction || 'ANY'}
      </div>
    </div>
  `;

  const featActionRow = document.createElement('div');
  Object.assign(featActionRow.style, {
    display: 'flex',
    gap: '6px',
    flexDirection: 'row',
    flexShrink: '0'
  });

  const featPreviewBtn = document.createElement('button');
  featPreviewBtn.textContent = 'INSPECT';
  Object.assign(featPreviewBtn.style, {
    flex: '1',
    padding: '0.50rem',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: DS.colors.text,
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    borderRadius: '2px',
    transition: 'all 0.15s ease'
  });

  featPreviewBtn.onclick = () => {
    open3DSkinPreviewModal(featuredOffer.title, AVAILABLE_SKINS.test_skin, 'rifle');
  };

  const featBuyBtn = document.createElement('button');
  featBuyBtn.textContent = `ACQUIRE DEAL — ${priceDisplay}`;
  Object.assign(featBuyBtn.style, {
    flex: '2.2',
    padding: '0.50rem',
    background: DS.colors.accent,
    border: 'none',
    color: '#000000',
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    borderRadius: '2px',
    transition: 'all 0.15s ease'
  });

  featBuyBtn.onclick = async () => {
    await handleStorePurchase(featuredOffer.id, registeredUserData, container);
  };

  featActionRow.appendChild(featPreviewBtn);
  featActionRow.appendChild(featBuyBtn);
  featuredCard.appendChild(featActionRow);
  leftCol.appendChild(featuredCard);
  storeSplit.appendChild(leftCol);

  // ==========================================
  // RIGHT COLUMN: Equipment Catalog Grid (65%)
  // ==========================================
  const rightCol = document.createElement('div');
  Object.assign(rightCol.style, {
    flex: '1.8',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '0'
  });

  // Top Catalog Navigation Filters
  const filterRow = document.createElement('div');
  Object.assign(filterRow.style, {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: '0'
  });

  const filterLabel = document.createElement('div');
  filterLabel.textContent = 'EQUIPMENT CATALOG';
  Object.assign(filterLabel.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    color: DS.colors.textMuted,
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    marginRight: 'auto'
  });
  filterRow.appendChild(filterLabel);

  const categories: { id: 'ALL' | 'cosmetic' | 'blueprint' | 'booster' | 'bundle'; label: string }[] = [
    { id: 'ALL', label: 'ALL' },
    { id: 'cosmetic', label: 'COSMETIC' },
    { id: 'blueprint', label: 'BLUEPRINT' },
    { id: 'booster', label: 'BOOSTER' },
    { id: 'bundle', label: 'BUNDLE' }
  ];

  categories.forEach(cat => {
    const filterBtn = document.createElement('button');
    filterBtn.textContent = cat.label;
    const isFilterActive = activeCategoryFilter === cat.id;
    Object.assign(filterBtn.style, {
      padding: '2px 0.38rem',
      background: isFilterActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      color: isFilterActive ? DS.colors.accent : 'rgba(255, 255, 255, 0.4)',
      border: isFilterActive ? `1px solid ${DS.colors.accent}` : '1px solid transparent',
      fontFamily: DS.typography.fontFamily,
      fontSize: DS.typography.sizes.tiny,
      fontWeight: 'bold',
      letterSpacing: '0.8px',
      borderRadius: '2px',
      cursor: 'pointer',
      transition: 'all 0.1s ease-out'
    });

    filterBtn.onclick = () => {
      audioManager.play('click');
      activeCategoryFilter = cat.id;
      renderStoreScreen(container, registeredUserData);
    };

    filterRow.appendChild(filterBtn);
  });

  rightCol.appendChild(filterRow);

  // Store Catalog Grid
  const gridContainer = document.createElement('div');
  Object.assign(gridContainer.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '6px',
    flex: '1',
    minHeight: '0',
    overflow: 'hidden'
  });

  const filteredCatalog = (catalogItems as CatalogItem[]).filter((item) => {
    if (activeCategoryFilter !== 'ALL' && item.category !== activeCategoryFilter) return false;
    return true;
  }).slice(0, 4);

  filteredCatalog.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'mm-glass';
    Object.assign(card.style, {
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '0.8vh 1vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRadius: '0px',
      gap: '0.3vh'
    });

    const itemPriceDisplay = item.currency === 'energy'
      ? `<img src="/ui_svgs/energy.svg" style="width:0.81rem; height:0.81rem; vertical-align:middle; filter:brightness(0) invert(1);" alt="Energy" /> ${item.priceEnergy} ENERGY`
      : `<img src="/ui_svgs/coin.svg" style="width:0.81rem; height:0.81rem; vertical-align:middle; filter:brightness(0) invert(1);" alt="Coin" /> ${item.priceCredits} CR`;

    card.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.3vh;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); color:${DS.colors.accent}; font-weight:bold; letter-spacing:0.08vw; text-transform:uppercase;">${item.category}</span>
          <span style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.44rem, 0.9vh, 0.56rem); color:${DS.colors.textMuted}; font-weight:bold;">REQ LVL ${item.requiredLevel}</span>
        </div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.63rem, 1.2vh, 0.81rem); font-weight:bold; color:${DS.colors.text}; letter-spacing:0.04vw; margin-top:0.2vh; line-height:1.1;">
          ${item.title.toUpperCase()}
        </div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.50rem, 1vh, 0.63rem); color:${DS.colors.textMuted}; line-height:1.2; margin-top:0.2vh; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${item.description}
        </div>
      </div>
    `;

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '0.8vw', marginTop: '0.5vh' });

    const previewBtn = document.createElement('button');
    previewBtn.textContent = 'INSPECT';
    Object.assign(previewBtn.style, {
      flex: '1',
      padding: '0.31rem',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: DS.colors.text,
      fontFamily: DS.typography.fontFamily,
      fontSize: DS.typography.sizes.tiny,
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      borderRadius: '2px',
      transition: 'all 0.15s ease'
    });

    previewBtn.onclick = () => {
      let itemKey = 'rifle';
      const titleLower = item.title.toLowerCase();
      const idLower = (item.id || '').toLowerCase();
      if (titleLower.includes('pistol') || idLower.includes('pistol') || titleLower.includes('viper')) {
        itemKey = 'pistol';
      } else if (item.category === 'cosmetic' || titleLower.includes('operative') || titleLower.includes('titan')) {
        itemKey = 'Player_one-optimized.glb';
      } else if (titleLower.includes('rifle') || titleLower.includes('vx-88') || titleLower.includes('vx88')) {
        itemKey = 'rifle';
      }

      let skinId = 'STANDARD';
      if (idLower.includes('test_skin') || idLower.includes('test') || titleLower.includes('test')) {
        skinId = 'test_skin';
      }

      const skinObj = AVAILABLE_SKINS[skinId] || AVAILABLE_SKINS.STANDARD;
      open3DSkinPreviewModal(item.title, skinObj, itemKey);
    };

    const buyBtn = document.createElement('button');
    buyBtn.textContent = itemPriceDisplay;
    Object.assign(buyBtn.style, {
      flex: '1',
      padding: '0.31rem',
      background: DS.colors.accent,
      border: 'none',
      color: '#000000',
      fontFamily: DS.typography.fontFamily,
      fontSize: DS.typography.sizes.tiny,
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      borderRadius: '2px',
      transition: 'all 0.15s ease'
    });

    buyBtn.onclick = async () => {
      await handleStorePurchase(item.id, registeredUserData, container);
    };

    btnRow.appendChild(previewBtn);
    btnRow.appendChild(buyBtn);
    card.appendChild(btnRow);

    gridContainer.appendChild(card);
  });

  rightCol.appendChild(gridContainer);
  storeSplit.appendChild(rightCol);

  wrap.appendChild(storeSplit);
  container.appendChild(wrap);
}

async function handleStorePurchase(itemId: string, userData: any, container: HTMLElement): Promise<void> {
  const catalogItem = (catalogItems as CatalogItem[]).find(i => i.id === itemId);
  if (!catalogItem) {
    alert("Item not found in catalog.");
    return;
  }

  const currentCredits = userData?.credits !== undefined ? userData.credits : 500;
  const currentEnergy = userData?.energy !== undefined ? userData.energy : 10;
  const unlockedItems = userData?.unlockedItems || [];
  const playerId = getPlayerId();

  try {
    const response = await fetch('/api/economy/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        itemId: catalogItem.id,
        currentCredits,
        currentEnergy,
        unlockedItems
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      if (userData) {
        userData.credits = data.newCredits;
        userData.energy = data.newEnergy;
        userData.unlockedItems = data.unlockedItems;
      }
      try {
        const owned = JSON.parse(localStorage.getItem('vex_owned_skins') || '[]');
        if (!owned.includes(catalogItem.id)) {
          owned.push(catalogItem.id);
          localStorage.setItem('vex_owned_skins', JSON.stringify(owned));
        }
      } catch (e) {
        console.warn("Local storage ownership write failed:", e);
      }

      audioManager.play('click');
      alert(`PURCHASE SUCCESSFUL: ${catalogItem.title}!`);
      renderStoreScreen(container, userData);
    } else {
      alert(`PURCHASE REJECTED: ${data.error?.message || "Transaction failed."}`);
    }
  } catch (err: any) {
    console.error("Store purchase error:", err);
    alert("PURCHASE ERROR: Could not connect to server economy service.");
  }
}

function open3DSkinPreviewModal(title: string, skin: any, itemKey?: string): void {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.88)',
    backdropFilter: 'blur(6px)',
    zIndex: '99999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(0.50rem, 2vh, 1.00rem)',
    boxSizing: 'border-box'
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    width: 'min(40.00rem, 95vw)',
    height: 'min(31.25rem, 92vh)',
    maxHeight: '96vh',
    background: '#050508',
    border: `1px solid ${DS.colors.accent}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: 'clamp(0.50rem, 1.5vw, 0.75rem)',
    gap: '0.8vh',
    borderRadius: '0px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  });

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; height:clamp(2.25rem, 8vh, 2.75rem); flex-shrink:0;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 2.5vw, 0.94rem); font-weight:bold; color:${DS.colors.text}; letter-spacing:1.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; margin-right:1vw;">
        3D INSPECTOR — ${title}
      </div>
      <button id="close-3d-modal" style="background:none; border:1px solid ${DS.colors.accent}; color:${DS.colors.accent}; font-family:${DS.typography.fontFamily}; font-size:clamp(0.69rem, 2.5vw, 0.81rem); font-weight:bold; cursor:pointer; min-width:5vw; height:4vh; padding:0 1.2vw; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:0px;">CLOSE [X]</button>
    </div>
  `;

  const canvasContainer = document.createElement('div');
  Object.assign(canvasContainer.style, {
    flex: '1',
    width: '100%',
    minHeight: '0',
    background: '#020204',
    border: '1px solid rgba(255,255,255,0.06)',
    position: 'relative',
    borderRadius: '0px',
    overflow: 'hidden',
    touchAction: 'none'
  });

  const tipNotice = document.createElement('div');
  tipNotice.textContent = 'DRAG / TOUCH TO ROTATE 360°';
  Object.assign(tipNotice.style, {
    position: 'absolute',
    bottom: '0.38rem',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
    pointerEvents: 'none',
    textTransform: 'uppercase',
    textAlign: 'center',
    zIndex: '2'
  });
  canvasContainer.appendChild(tipNotice);

  modal.appendChild(canvasContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      StudioPreviewManager.resizeToContainer();
    });
    resizeObserver.observe(canvasContainer);
  }

  const handleWindowResize = () => {
    StudioPreviewManager.resizeToContainer();
  };
  window.addEventListener('resize', handleWindowResize);

  const closeModal = () => {
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('resize', handleWindowResize);
    window.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    const backdrop = document.getElementById('main-menu-3d-backdrop');
    if (backdrop) {
      StudioPreviewManager.attachTo(backdrop, 'MAIN_MENU');
    } else {
      StudioPreviewManager.detach();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  overlay.onclick = (e: MouseEvent) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  const closeBtn = modal.querySelector('#close-3d-modal') as HTMLElement;
  closeBtn.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    closeModal();
  };

  requestAnimationFrame(() => {
    StudioPreviewManager.attachTo(canvasContainer, 'STORE', {
      itemKey: itemKey || 'rifle',
      skinId: skin?.id || 'STANDARD'
    });
    StudioPreviewManager.resizeToContainer();
  });
}
