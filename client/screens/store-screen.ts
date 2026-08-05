import { DS } from "../design-system";
import catalogDataList from "../data/catalog.json";
import offersDataList from "../data/offers.json";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { audioManager } from "../audio";
import { StudioPreviewManager } from "../StudioPreviewManager";
import { clientFlagService } from "../flags/flag-service";
import { FeatureFlagKey } from "../../shared/feature-flags";

const AVAILABLE_SKINS = {
  HAZARD: { id: 'HAZARD', label: 'HAZARD SKIN' }
};

let activeCategoryFilter: 'ALL' | 'cosmetic' | 'blueprint' = 'ALL';

export function renderStoreScreen(container: HTMLElement, registeredUserData: any): void {
  container.innerHTML = '';

  const discountActive = clientFlagService.getBoolean(FeatureFlagKey.STORE_DISCOUNT_ACTIVE);
  const creditMultiplier = clientFlagService.getNumber(FeatureFlagKey.STORE_CREDIT_MULTIPLIER);

  // Apply multipliers and discounts client-side
  const processedOffers = offersDataList.map(offer => ({
    ...offer,
    priceCredits: Math.floor(offer.priceCredits * (discountActive ? 0.8 : 1.0) * creditMultiplier)
  }));

  const processedCatalog = catalogDataList.map(item => ({
    ...item,
    priceCredits: Math.floor(item.priceCredits * (discountActive ? 0.9 : 1.0) * creditMultiplier)
  }));

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
    fontSize: '8.5px',
    color: DS.colors.textMuted,
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  });
  leftCol.appendChild(featuredLabel);

  const featuredOffer = processedOffers[0] || {
    id: "promo_hazard_set",
    title: "HAZARD SPEC OVERLOAD",
    priceCredits: 600,
    description: "Full Hazard Spec weapon casing and high-threat contractor weave."
  };

  const featuredCard = document.createElement('div');
  Object.assign(featuredCard.style, {
    flex: '1',
    background: `linear-gradient(180deg, ${DS.utils.rgba(DS.colors.accent, 0.04)} 0%, rgba(255, 255, 255, 0.01) 100%)`,
    border: `1px solid ${DS.colors.accent}`,
    padding: '10px 12px',
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

  featuredCard.innerHTML += `
    <div style="display:flex; flex-direction:column; gap:4px; min-height:0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:${DS.typography.fontFamily}; font-size:8px; color:${DS.colors.accent}; font-weight:bold; letter-spacing:1.5px;">FEATURED DEAL</span>
        <span style="font-family:${DS.typography.fontFamily}; font-size:8px; color:#00FF88; font-weight:bold; letter-spacing:0.8px; background:rgba(0,255,136,0.06); padding:1px 5px; border:1px solid rgba(0,255,136,0.15);">30% OFF</span>
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:clamp(13px, 2vh, 16px); font-weight:bold; color:${DS.colors.text}; letter-spacing:1px; line-height:1.1; margin-top:2px;">
        ${featuredOffer.title.toUpperCase()}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:9.5px; color:${DS.colors.textMuted}; line-height:1.3;">
        ${featuredOffer.description}
      </div>
    </div>

    <!-- Inside Specifications Bulletins -->
    <div style="display:flex; flex-direction:column; gap:4px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:6px 8px; border-radius:2px;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:7.5px; color:${DS.colors.textMuted}; font-weight:bold; letter-spacing:0.8px;">INCLUDED SPECS:</div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:9px; color:${DS.colors.text}; font-weight:bold; display:flex; align-items:center; gap:4px;">
        <span style="color:${DS.colors.accent};">•</span> VX-88 HAZARD SHELL ASSEMBLY
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size:9px; color:${DS.colors.text}; font-weight:bold; display:flex; align-items:center; gap:4px;">
        <span style="color:${DS.colors.accent};">•</span> PRE-TUNED AP MUZZLE BRAKE
      </div>
    </div>
  `;

  const featActionRow = document.createElement('div');
  Object.assign(featActionRow.style, {
    display: 'flex',
    gap: '6px',
    flexDirection: 'column',
    flexShrink: '0'
  });

  const featBuyBtn = document.createElement('button');
  featBuyBtn.textContent = `ACQUIRE DEAL — ${featuredOffer.priceCredits} CR`;
  Object.assign(featBuyBtn.style, {
    width: '100%',
    padding: '8px',
    background: DS.colors.accent,
    border: 'none',
    color: '#000000',
    fontFamily: DS.typography.fontFamily,
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    borderRadius: '2px',
    transition: 'all 0.15s ease'
  });

  featBuyBtn.onclick = async () => {
    await handleStorePurchase(featuredOffer.priceCredits, featuredOffer.title, registeredUserData, container);
  };

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
    gap: '10px',
    alignItems: 'center',
    flexShrink: '0'
  });

  const filterLabel = document.createElement('div');
  filterLabel.textContent = 'EQUIPMENT CATALOG';
  Object.assign(filterLabel.style, {
    fontFamily: DS.typography.fontFamily,
    fontSize: '8.5px',
    color: DS.colors.textMuted,
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    marginRight: 'auto'
  });
  filterRow.appendChild(filterLabel);

  const categories: { id: 'ALL' | 'cosmetic' | 'blueprint'; label: string }[] = [
    { id: 'ALL', label: 'ALL' },
    { id: 'cosmetic', label: 'COSMETIC' },
    { id: 'blueprint', label: 'BLUEPRINT' }
  ];

  categories.forEach(cat => {
    const filterBtn = document.createElement('button');
    filterBtn.textContent = cat.label;
    const isFilterActive = activeCategoryFilter === cat.id;
    Object.assign(filterBtn.style, {
      padding: '2px 6px',
      background: isFilterActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      color: isFilterActive ? DS.colors.accent : 'rgba(255, 255, 255, 0.4)',
      border: isFilterActive ? `1px solid ${DS.colors.accent}` : '1px solid transparent',
      fontFamily: DS.typography.fontFamily,
      fontSize: '7.5px',
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

  // Store Catalog Grid (Fits perfectly without overflow or scrollbars)
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

  const filteredCatalog = processedCatalog.filter((item: any) => {
    if (activeCategoryFilter !== 'ALL' && item.category !== activeCategoryFilter) return false;
    return true;
  }).slice(0, 4); // Display top 4 items perfectly fitted in 2x2 grid

  filteredCatalog.forEach((item: any) => {
    const card = document.createElement('div');
    card.className = 'mm-glass';
    Object.assign(card.style, {
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRadius: '4px',
      gap: '2px'
    });

    card.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:${DS.typography.fontFamily}; font-size:8px; color:${DS.colors.accent}; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${item.category}</span>
          <span style="font-family:${DS.typography.fontFamily}; font-size:7px; color:${DS.colors.textMuted}; font-weight:bold;">REQ LVL ${item.requiredLevel}</span>
        </div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:11px; font-weight:bold; color:${DS.colors.text}; letter-spacing:0.5px; margin-top:2px; line-height:1.1;">
          ${item.title.toUpperCase()}
        </div>
        <div style="font-family:${DS.typography.fontFamily}; font-size:8px; color:${DS.colors.textMuted}; line-height:1.2; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${item.description}
        </div>
      </div>
    `;

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '6px', marginTop: '4px' });

    const previewBtn = document.createElement('button');
    previewBtn.textContent = 'INSPECT';
    Object.assign(previewBtn.style, {
      flex: '1',
      padding: '5px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: DS.colors.text,
      fontFamily: DS.typography.fontFamily,
      fontSize: '8px',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      borderRadius: '2px',
      transition: 'all 0.15s ease'
    });

    previewBtn.onclick = () => {
      open3DSkinPreviewModal(item.title, AVAILABLE_SKINS.HAZARD);
    };

    const buyBtn = document.createElement('button');
    buyBtn.textContent = `${item.priceCredits} CR`;
    Object.assign(buyBtn.style, {
      flex: '1',
      padding: '5px',
      background: DS.colors.accent,
      border: 'none',
      color: '#000000',
      fontFamily: DS.typography.fontFamily,
      fontSize: '8px',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      borderRadius: '2px',
      transition: 'all 0.15s ease'
    });

    buyBtn.onclick = async () => {
      await handleStorePurchase(item.priceCredits, item.title, registeredUserData, container);
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

async function handleStorePurchase(price: number, itemTitle: string, userData: any, container: HTMLElement): Promise<void> {
  const currentCredits = userData?.credits !== undefined ? userData.credits : 1000;
  if (currentCredits < price) {
    alert(`INSUFFICIENT CREDITS. Required: ${price} CR | Current: ${currentCredits} CR`);
    return;
  }

  const auth = getAuth();
  if (auth.currentUser) {
    try {
      const newCredits = currentCredits - price;
      const db = getFirestore();
      await updateDoc(doc(db, 'Users', auth.currentUser.uid), {
        credits: newCredits
      });
      if (userData) userData.credits = newCredits;
      audioManager.play('click');
      alert(`PURCHASE SUCCESSFUL: ${itemTitle} for ${price} CR!`);
      renderStoreScreen(container, userData);
    } catch (e) {
      console.warn("Purchase transaction failed:", e);
    }
  } else {
    alert(`PURCHASED ${itemTitle}!`);
  }
}

function open3DSkinPreviewModal(title: string, skin: any): void {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.85)',
    zIndex: '99999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    width: '600px',
    height: '480px',
    background: '#050508',
    border: `1px solid ${DS.colors.accent}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: '20px',
    gap: '16px',
    borderRadius: '4px'
  });

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-family:${DS.typography.fontFamily}; font-size:16px; font-weight:bold; color:${DS.colors.text}; letter-spacing:2px;">
        3D INSPECTOR — ${title}
      </div>
      <button id="close-3d-modal" style="background:none; border:none; color:${DS.colors.accent}; font-family:${DS.typography.fontFamily}; font-size:14px; font-weight:bold; cursor:pointer;">CLOSE [X]</button>
    </div>
  `;

  const canvasContainer = document.createElement('div');
  Object.assign(canvasContainer.style, {
    flex: '1',
    background: '#020204',
    border: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    borderRadius: '2px'
  });

  modal.appendChild(canvasContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeBtn = modal.querySelector('#close-3d-modal') as HTMLElement;
  closeBtn.onclick = () => {
    overlay.remove();
    const backdrop = document.getElementById('main-menu-3d-backdrop');
    if (backdrop) {
      StudioPreviewManager.attachTo(backdrop, 'MAIN_MENU');
    } else {
      StudioPreviewManager.detach();
    }
  };

  requestAnimationFrame(() => {
    StudioPreviewManager.attachTo(canvasContainer, 'STORE', {
      itemKey: 'rifle',
      skinId: skin?.id || 'STANDARD'
    });
  });
}
