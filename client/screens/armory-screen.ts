import { DS } from "../design-system";
import { DETAILED_WEAPONS } from "../../shared/weapons";
import { audioManager } from "../audio";
import { StudioPreviewManager, AVAILABLE_SKINS } from "../StudioPreviewManager";
import { CLASSES, ClassId } from "../../shared/classes";
import { ClassLoadoutSystem } from "../src/systems/ClassLoadoutSystem";
import { ClassLoadoutPersistence } from "../src/systems/ClassLoadoutPersistence";
import { isRuntimeWeaponId } from "../../shared/constants";
import { UTILITY_DISPLAY_STATS, type UtilityId } from "../../shared/utilities";
import { WEAPON_ASSET_DETAILS, UTILITY_ASSET_DETAILS } from "../../shared/asset-details";
import type { WeaponId } from "../../shared/weapons";
import { bindTabs, bindContentEntry, bindSelection, TabItem } from "../src/ui/ui-motion";

export interface LoadoutSlotItem {
  id: string;
  name: string;
  weaponKey: string;
  category: string; // The class/type of the item
  slotName: string; // The specific loadout slot name
  stats: any;
}

export const CATALOG_LOADOUTS: Record<string, LoadoutSlotItem[]> = {
  ASSAULT: [
    { id: 'm4_rifle_assault', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'f90_smg_assault', name: 'F90 SMG', weaponKey: 'smg', category: 'Submachine Gun', slotName: 'PRIMARY', stats: null },
    { id: 'viper_pistol_assault', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'frag_grenade_assault', name: 'FRAG GRENADE', weaponKey: 'grenade', category: 'Ordnance', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.grenade },
    { id: 'flashbang_assault', name: 'FLASH GRENADE', weaponKey: 'flashbang', category: 'Disruption', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 1, capacity: 2, range: 15 } }
  ],
  MEDIC: [
    { id: 'm4_rifle_medic', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'benelli_shotgun_medic', name: 'BENELLI M4 SHOTGUN', weaponKey: 'shotgun', category: 'Shotgun', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.shotgun },
    { id: 'viper_pistol_medic', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'medkit_medic', name: 'MEDKIT', weaponKey: 'medkit', category: 'Support', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.medkit },
    { id: 'revive_medic', name: 'REVIVE TOOL', weaponKey: 'revive', category: 'Support', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 0.5, capacity: 1, range: 4 } }
  ],
  RECON: [
    { id: 'm4_rifle_recon', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'pgm_sniper_recon', name: 'PGM ULTIMA RATIO', weaponKey: 'sniper', category: 'Sniper Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.sniper },
    { id: 'viper_pistol_recon', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'radio_recon', name: 'FIELD RADIO', weaponKey: 'radio', category: 'Comms', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.radio },
    { id: 'disruptor_recon', name: 'SIGNAL DISRUPTOR', weaponKey: 'signal_jammer', category: 'Electronic', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 0.2, capacity: 1, range: 0 } }
  ],
  DEMOLITIONS: [
    { id: 'm4_rifle_demo', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'lmg_demo', name: 'LMG RIFLE', weaponKey: 'lmg', category: 'Light Machine Gun', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.lmg },
    { id: 'viper_pistol_demo', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'c4_demo', name: 'C4 EXPLOSIVE', weaponKey: 'c4', category: 'Demolition', slotName: 'UTILITY 1', stats: UTILITY_DISPLAY_STATS['C4'] },
    { id: 'mine_demo', name: 'PROXIMITY MINE', weaponKey: 'proximity_mine', category: 'Demolition', slotName: 'UTILITY 2', stats: UTILITY_DISPLAY_STATS['Proximity Mine'] }
  ]
};

function getEquippedSkin(itemId: string): string {
  return ClassLoadoutSystem.getEquippedSkin(itemId);
}

function setEquippedSkin(itemId: string, skinId: string): void {
  ClassLoadoutSystem.equipSkin(itemId, skinId).catch(err => {
    console.warn("Equipping skin failed dynamically:", err);
  });
}

let activeCategory: ClassId = 'ASSAULT';
let selectedItemIdx = 0;

export function renderArmoryScreen(container: HTMLElement, registeredUserData?: any): void {
  activeCategory = ClassLoadoutPersistence.getEquippedClass();
  container.innerHTML = '';
  
  // Enable parent container to display absolute overflow nicely and fill the screen area
  Object.assign(container.style, {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible'
  });

  // Outer Flex Container
  const wrap = document.createElement('div');
  bindContentEntry(wrap, 0);
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    gap: '16px',
    boxSizing: 'border-box',
    position: 'relative'
  });

  // Left Column (Loadout Catalog & Category Tabs & Stats card)
  const leftCol = document.createElement('div');
  const leftColWidth = 'clamp(150px, 22vw, 220px)';
  Object.assign(leftCol.style, {
    width: leftColWidth,
    flexShrink: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    height: '100%',
    boxSizing: 'border-box'
  });

  // Category Tabs Header - Preset Classes
  const categoryTabsRow = document.createElement('div');
  categoryTabsRow.className = 'vexea-tab-row';
  Object.assign(categoryTabsRow.style, {
    display: 'flex',
    gap: '2px',
    background: 'transparent',
    border: 'none',
    padding: '0px',
    position: 'relative'
  });

  const categories: { id: ClassId; label: string }[] = Object.values(CLASSES).map(c => ({
    id: c.id,
    label: c.id === 'DEMOLITIONS' ? 'DEMO' : c.displayName
  }));

  const armoryTabElements: TabItem[] = [];
  categories.forEach(cat => {
    const tabBtn = document.createElement('button');
    tabBtn.className = `vexea-tab ${cat.id === activeCategory ? 'active' : ''}`;
    tabBtn.setAttribute('data-ui-tab', cat.id);
    const isActive = cat.id === activeCategory;
    tabBtn.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:3px;">
        <img src="/ui_svgs/class_${cat.id.toLowerCase()}.svg" style="width:0.88rem; height:0.88rem; filter: brightness(0) invert(1); opacity: ${isActive ? '1' : '0.4'};" alt="${cat.label}" />
        <span>${cat.label}</span>
      </div>
    `;
    Object.assign(tabBtn.style, {
      flex: '1',
      padding: '3px 1px',
      background: 'transparent',
      border: 'none',
      fontFamily: DS.typography.fontFamily,
      fontSize: DS.typography.sizes.tiny,
      fontWeight: 'bold',
      letterSpacing: '0px',
      cursor: 'pointer'
    });

    categoryTabsRow.appendChild(tabBtn);
    armoryTabElements.push({ id: cat.id, button: tabBtn });
  });

  bindTabs(
    categoryTabsRow,
    armoryTabElements,
    activeCategory,
    (selectedCatId) => {
      audioManager.play('click');
      activeCategory = selectedCatId as ClassId;
      ClassLoadoutPersistence.setEquippedClass(activeCategory);
      selectedItemIdx = 0;
      renderArmoryScreen(container, registeredUserData);
    }
  );
  leftCol.appendChild(categoryTabsRow);

  const currentList = CATALOG_LOADOUTS[activeCategory] || [];
  const selectedItem = currentList[selectedItemIdx] || currentList[0];

function getSlotIconSvg(item: LoadoutSlotItem): string {
  const key = (item.weaponKey || '').toLowerCase();
  const weaponDetails = WEAPON_ASSET_DETAILS[key as WeaponId];
  const utilityKeyByCatalogKey: Record<string, UtilityId> = {
    grenade: 'Grenade',
    flashbang: 'Flashbang',
    medkit: 'Med Kit',
    revive: 'Revive Tool',
    radio: 'Radio',
    signal_jammer: 'Signal Jammer',
    proximity_mine: 'Proximity Mine',
    c4: 'C4',
  };
  const utilityId = utilityKeyByCatalogKey[key];
  const utilityDetails = utilityId ? UTILITY_ASSET_DETAILS[utilityId] : undefined;
  // SVG CONNECTOR PLACEHOLDER: svg-responsible agent replaces registry paths only.
  const src = weaponDetails?.svgPath || utilityDetails?.svgPath || '/ui_svgs/utility_grenade.svg';

  return `<img src="${src}" style="width: 1.13rem; height: 1.13rem; filter: brightness(0) invert(1); opacity: 0.85; object-fit: contain;" alt="${item.name}" />`;
}

  // Equipment List Container (horizontal slots with icons)
  const itemsContainer = document.createElement('div');
  Object.assign(itemsContainer.style, {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box',
    margin: '4px 0 0.63rem 0'
  });

  currentList.forEach((item, idx) => {
    const isSelected = idx === selectedItemIdx;

    const itemCard = document.createElement('div');
    bindSelection(itemCard, isSelected, isSelected);
    Object.assign(itemCard.style, {
      flex: '1',
      aspectRatio: '1',
      background: isSelected ? 'rgba(255, 69, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)',
      border: isSelected ? '1px solid #FF4500' : '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '0px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
      position: 'relative',
      padding: '4px 2px',
      color: isSelected ? '#FF4500' : 'rgba(255, 255, 255, 0.4)'
    });

    itemCard.onclick = () => {
      audioManager.play('click');
      selectedItemIdx = idx;
      renderArmoryScreen(container, registeredUserData);
    };

    const shortSlotMap: Record<string, string> = {
      'PRIMARY': 'PRI',
      'SECONDARY': 'SEC',
      'UTILITY 1': 'UT1',
      'UTILITY 2': 'UT2'
    };
    const slotLabel = shortSlotMap[item.slotName] || item.slotName;

    itemCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 1.13rem; height: 1.13rem; color: ${isSelected ? '#FF4500' : '#888888'};">
        ${getSlotIconSvg(item)}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; font-weight: bold; letter-spacing: 0.5px; color: ${isSelected ? '#FFFFFF' : '#666666'}; line-height: 1;">
        ${slotLabel}
      </div>
    `;

    itemsContainer.appendChild(itemCard);
  });

  leftCol.appendChild(itemsContainer);

  const currentSkinId = selectedItem ? getEquippedSkin(selectedItem.id) : 'STANDARD';

  // Stats Card (No borders, no backgrounds) - 25% Larger Parameters
  const statsCard = document.createElement('div');
  Object.assign(statsCard.style, {
    background: 'transparent',
    border: 'none',
    padding: '4px 0px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: 'auto'
  });

  const makeStatBar = (label: string, value: number, maxVal: number, suffix: string = "") => {
    const ratio = Math.min(value / maxVal, 1.0);
    const percentage = ratio * 100;
    
    // Gradient logic: Completely white (255,255,255) at 0% to completely orange-red (255,69,0) at 100%
    const g = Math.round(255 - (255 - 69) * ratio);
    const b = Math.round(255 - 255 * ratio);
    const dynamicColor = `rgb(255, ${g}, ${b})`;

    return `
      <div style="margin-bottom: 2px;">
        <div style="display: flex; justify-content: space-between; font-family: ${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color: #888888; margin-bottom: 1px;">
          <span>${label.toUpperCase()}</span>
          <span style="color: #FFFFFF; font-weight: bold;">${value}${suffix}</span>
        </div>
        <div style="height: 2px; background: #111111; position: relative;">
          <div style="height: 100%; width: ${percentage}%; background: ${dynamicColor};"></div>
        </div>
      </div>
    `;
  };

  const currentSkinName = AVAILABLE_SKINS[currentSkinId]?.name || 'STANDARD';
  const wStats = selectedItem ? selectedItem.stats : null;
  const dmg = wStats ? Math.abs(wStats.damage || 0) : 0;
  const fr = wStats ? (wStats.fireRateHz || 0) : 0;
  const cap = wStats ? (wStats.capacity || 0) : 0;
  const rng = wStats ? (wStats.falloff?.maxDamageRange || wStats.range || 0) : 0;

  statsCard.innerHTML = `
    <div style="font-family: ${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color: #888888; letter-spacing: 0.5px; font-weight: bold; line-height: 1;">
      ${selectedItem ? selectedItem.category.toUpperCase() : "EQUIPMENT"} STATS
    </div>
    <div style="font-family: ${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.small}; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px; margin-top: 1px; line-height: 1.1;">
      ${selectedItem ? selectedItem.name : "N/A"}
    </div>
    <div style="font-family: ${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color: #888888; margin-bottom: 3px; line-height: 1;">
      FINISH: <span style="color: #FF4500; font-weight: bold;">${currentSkinName.toUpperCase()}</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 1px;">
      ${makeStatBar("Damage", dmg, 120)}
      ${makeStatBar("Fire Rate", fr, 20, " Hz")}
      ${makeStatBar("Capacity", cap, 100)}
      ${makeStatBar("Range", rng, 150, "m")}
    </div>
  `;

  leftCol.appendChild(statsCard);

  const slotIndexByName: Record<string, number> = {
    'PRIMARY': 0,
    'SECONDARY': 1,
    'UTILITY 1': 2,
    'UTILITY 2': 3,
  };
  const selectedSlotIndex = selectedItem ? slotIndexByName[selectedItem.slotName] : -1;
  const isWeaponItem = selectedItem?.slotName === 'PRIMARY' || selectedItem?.slotName === 'SECONDARY';
  const hasAuthoredWeaponRuntime = !isWeaponItem || isRuntimeWeaponId(selectedItem!.weaponKey);
  const currentLoadout = ClassLoadoutPersistence.getClassLoadout(activeCategory);
  const isEquipped = selectedItem && selectedSlotIndex >= 0
    ? currentLoadout[selectedSlotIndex]?.id === selectedItem.id
    : false;
  const equipButton = document.createElement('button');
  equipButton.type = 'button';
  equipButton.textContent = !hasAuthoredWeaponRuntime
    ? 'AUTHORING REQUIRED'
    : (isEquipped ? `EQUIPPED · ${selectedItem?.slotName || 'SLOT'}` : `EQUIP · ${selectedItem?.slotName || 'SLOT'}`);
  Object.assign(equipButton.style, {
    width: '100%',
    minHeight: '1.75rem',
    marginTop: '0.35rem',
    background: isEquipped ? 'rgba(255, 69, 0, 0.12)' : 'transparent',
    border: `1px solid ${hasAuthoredWeaponRuntime ? (isEquipped ? '#FF4500' : '#444444') : '#333333'}`,
    color: hasAuthoredWeaponRuntime ? (isEquipped ? '#FF4500' : '#AAAAAA') : '#555555',
    fontFamily: DS.typography.fontFamily,
    fontSize: DS.typography.sizes.tiny,
    fontWeight: 'bold',
    letterSpacing: '0.04em',
    cursor: hasAuthoredWeaponRuntime ? 'pointer' : 'not-allowed',
  });
  equipButton.disabled = !selectedItem || selectedSlotIndex < 0 || !hasAuthoredWeaponRuntime;
  equipButton.title = !hasAuthoredWeaponRuntime
    ? 'This weapon requires authored shared stats before it can enter an authoritative match.'
    : 'Persist this item to the selected class and named slot.';
  equipButton.onclick = async () => {
    if (!selectedItem || selectedSlotIndex < 0 || !hasAuthoredWeaponRuntime) return;
    audioManager.play('click');
    await ClassLoadoutPersistence.saveClassLoadout(activeCategory, selectedSlotIndex, selectedItem);
    renderArmoryScreen(container, registeredUserData);
  };
  leftCol.appendChild(equipButton);
  wrap.appendChild(leftCol);

  // Viewport Container positioned absolutely - starts from the top bar bottom boundary and expands to fill space
  const viewportContainer = document.createElement('div');
  viewportContainer.id = 'armory-3d-viewport';
  Object.assign(viewportContainer.style, {
    position: 'absolute',
    top: '-3.13rem', // Go uppast tabHeaderRow to the top bar's bottom border
    left: `calc(${leftColWidth} + 0.75rem)`,
    right: '0px',
    bottom: '2.50rem', // Above the skin bar
    background: 'transparent',
    border: 'none',
    overflow: 'hidden',
    zIndex: '1'
  });
  wrap.appendChild(viewportContainer);

  // Cosmetics & Skin Palette Toolbar (Bottom Right)
  const skinBar = document.createElement('div');
  Object.assign(skinBar.style, {
    position: 'absolute',
    bottom: '0px',
    left: `calc(${leftColWidth} + 0.75rem)`,
    right: '0px',
    height: '2.25rem',
    background: 'transparent',
    border: 'none',
    padding: '2px 0px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    boxSizing: 'border-box',
    zIndex: '2'
  });

  skinBar.innerHTML = `
    <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; font-weight:bold; color:#888888; letter-spacing:0.5px; line-height:1;">
      SKINS
    </div>
  `;

  const skinsRow = document.createElement('div');
  Object.assign(skinsRow.style, {
    display: 'flex',
    gap: '4px'
  });

  Object.values(AVAILABLE_SKINS).forEach(skin => {
    // Hide skins that are not owned by the user (STANDARD is always owned)
    if (skin.id !== "STANDARD") {
      let owned = false;
      if (registeredUserData) {
        if (Array.isArray(registeredUserData.unlockedItems) && registeredUserData.unlockedItems.includes(skin.id)) {
          owned = true;
        }
        if (Array.isArray(registeredUserData.unlockedSkins) && registeredUserData.unlockedSkins.includes(skin.id)) {
          owned = true;
        }
      }
      try {
        const localOwned = JSON.parse(localStorage.getItem("vex_owned_skins") || "[]");
        if (Array.isArray(localOwned) && localOwned.includes(skin.id)) {
          owned = true;
        }
      } catch (e) {}

      if (!owned) return;
    }

    const isSkinEquipped = skin.id === currentSkinId;

    const skinTile = document.createElement('div');
    Object.assign(skinTile.style, {
      flex: '1',
      padding: '2px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      transition: 'all 0.15s ease',
      position: 'relative',
      overflow: 'hidden'
    });

    skinTile.onclick = () => {
      if (!selectedItem) return;
      audioManager.play('click');
      setEquippedSkin(selectedItem.id, skin.id);
      renderArmoryScreen(container, registeredUserData);
    };

    let previewBox = '';
    if (skin.textureFile) {
      import('../asset-cache').then(({ getAssetUrl }) => {
        const url = getAssetUrl(skin.textureFile!);
        const imgEl = skinTile.querySelector('.skin-preview-img') as HTMLElement;
        if (imgEl) {
          imgEl.style.backgroundImage = `url('${url}')`;
          imgEl.style.backgroundSize = 'cover';
        }
      });
      previewBox = `<div class="skin-preview-img" style="width: 0.88rem; height: 0.88rem; border: 1px solid ${isSkinEquipped ? '#FF4500' : '#333333'}; background: #111111;"></div>`;
    } else {
      previewBox = `<div style="width: 0.88rem; height: 0.88rem; border: 1px solid ${isSkinEquipped ? '#FF4500' : '#333333'}; background: #111111; display: flex; align-items: center; justify-content: center; font-family: ${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; color: #888888; text-align: center; font-weight: bold;">BASE</div>`;
    }

    skinTile.innerHTML = `
      ${previewBox}
      <div style="font-family:${DS.typography.fontFamily}; font-size: ${DS.typography.sizes.tiny}; font-weight:bold; color:${isSkinEquipped ? '#FF4500' : '#666666'}; text-align:center; letter-spacing:0px; line-height:1;">
        ${skin.name}
      </div>
    `;

    skinsRow.appendChild(skinTile);
  });

  skinBar.appendChild(skinsRow);
  wrap.appendChild(skinBar);

  container.appendChild(wrap);

  // Attach Studio Preview Manager to the Canvas Viewport
  requestAnimationFrame(() => {
    StudioPreviewManager.attachTo(viewportContainer, 'ARMORY', {
      itemKey: selectedItem ? selectedItem.weaponKey : 'rifle',
      skinId: currentSkinId
    });
  });
}
