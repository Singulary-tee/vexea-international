import { DS } from "../design-system";
import { DETAILED_WEAPONS } from "../../shared/weapons";
import { audioManager } from "../audio";
import { StudioPreviewManager, AVAILABLE_SKINS } from "../StudioPreviewManager";
import { CLASSES, ClassId } from "../../shared/classes";

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
    { id: 'viper_pistol_assault', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'frag_grenade_assault', name: 'FRAG GRENADE', weaponKey: 'grenade', category: 'Ordnance', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.grenade },
    { id: 'flashbang_assault', name: 'FLASH GRENADE', weaponKey: 'grenade', category: 'Disruption', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 1, capacity: 2, range: 15 } }
  ],
  MEDIC: [
    { id: 'm4_rifle_medic', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'viper_pistol_medic', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'medkit_medic', name: 'MEDKIT', weaponKey: 'medkit', category: 'Support', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.medkit },
    { id: 'revive_medic', name: 'REVIVE TOOL', weaponKey: 'radio', category: 'Support', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 0.5, capacity: 1, range: 4 } }
  ],
  RECON: [
    { id: 'm4_rifle_recon', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'viper_pistol_recon', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'radio_recon', name: 'FIELD RADIO', weaponKey: 'radio', category: 'Comms', slotName: 'UTILITY 1', stats: DETAILED_WEAPONS.radio },
    { id: 'disruptor_recon', name: 'SIGNAL DISRUPTOR', weaponKey: 'radio', category: 'Electronic', slotName: 'UTILITY 2', stats: { damage: 0, fireRateHz: 0.2, capacity: 1, range: 0 } }
  ],
  DEMOLITIONS: [
    { id: 'm4_rifle_demo', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY', stats: DETAILED_WEAPONS.rifle },
    { id: 'viper_pistol_demo', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY', stats: DETAILED_WEAPONS.pistol },
    { id: 'emp_demo', name: 'EMP CHARGE', weaponKey: 'grenade', category: 'Disruption', slotName: 'UTILITY 1', stats: { damage: 0, fireRateHz: 0.5, capacity: 1, range: 10 } },
    { id: 'c4_demo', name: 'C4 EXPLOSIVE', weaponKey: 'grenade', category: 'Demolition', slotName: 'UTILITY 2', stats: { damage: 150, fireRateHz: 0.3, capacity: 1, range: 8 } }
  ]
};

// Saved skin selections per item: itemId -> skinId
const savedSkinSelections: Record<string, string> = JSON.parse(
  localStorage.getItem('vex_armory_item_skins') || '{}'
);

function getEquippedSkin(itemId: string): string {
  return savedSkinSelections[itemId] || 'STANDARD';
}

function setEquippedSkin(itemId: string, skinId: string): void {
  savedSkinSelections[itemId] = skinId;
  localStorage.setItem('vex_armory_item_skins', JSON.stringify(savedSkinSelections));
}

let activeCategory: ClassId = 'ASSAULT';
let selectedItemIdx = 0;

export function renderArmoryScreen(container: HTMLElement): void {
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
  Object.assign(leftCol.style, {
    width: '190px',
    flexShrink: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    height: '100%',
    boxSizing: 'border-box'
  });

  // Category Tabs Header - Preset Classes
  const categoryTabsRow = document.createElement('div');
  Object.assign(categoryTabsRow.style, {
    display: 'flex',
    gap: '2px',
    background: 'transparent',
    border: 'none',
    padding: '0px'
  });

  const categories: { id: ClassId; label: string }[] = Object.values(CLASSES).map(c => ({
    id: c.id,
    label: c.id === 'DEMOLITIONS' ? 'DEMO' : c.displayName
  }));

  categories.forEach(cat => {
    const tabBtn = document.createElement('button');
    tabBtn.textContent = cat.label;
    const isActive = cat.id === activeCategory;
    Object.assign(tabBtn.style, {
      flex: '1',
      padding: '3px 1px',
      background: 'transparent',
      color: isActive ? '#FF4500' : '#444444',
      border: 'none',
      fontFamily: DS.typography.fontFamily,
      fontSize: '7px',
      fontWeight: 'bold',
      letterSpacing: '0px',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    });

    tabBtn.onclick = () => {
      audioManager.play('click');
      activeCategory = cat.id;
      selectedItemIdx = 0;
      renderArmoryScreen(container);
    };

    categoryTabsRow.appendChild(tabBtn);
  });
  leftCol.appendChild(categoryTabsRow);

  const currentList = CATALOG_LOADOUTS[activeCategory] || [];
  const selectedItem = currentList[selectedItemIdx] || currentList[0];

function getSlotIconSvg(weaponKey: string, category: string): string {
  const key = weaponKey.toLowerCase();
  const cat = category.toLowerCase();
  
  if (key === 'rifle' || cat.includes('rifle')) {
    return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 183 107" preserveAspectRatio="xMidYMid meet" style="opacity: 0.85;"><g transform="translate(0.000000,107.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M748 918 l-3 -43 -60 -8 c-33 -5 -114 -11 -180 -13 -66 -2 -130 -6 -142 -9 -13 -3 -34 -23 -48 -45 l-25 -40 -73 0 c-108 0 -111 -3 -98 -129 6 -57 11 -129 11 -161 0 -64 16 -81 54 -57 12 8 33 17 48 20 17 5 30 17 38 39 6 18 30 85 52 148 22 63 49 123 60 133 17 15 43 17 188 17 130 0 169 -3 173 -13 3 -8 -8 -43 -23 -78 -16 -36 -35 -86 -42 -113 -16 -59 -17 -58 134 -121 108 -46 109 -46 208 -43 71 2 100 0 100 -9 0 -6 -20 -59 -45 -119 -25 -59 -45 -113 -45 -119 0 -11 67 -45 89 -45 7 0 51 97 115 253 8 20 22 40 29 43 8 3 17 19 21 35 9 45 74 180 93 195 12 9 52 13 126 14 100 0 109 2 114 20 3 12 14 20 27 21 70 3 71 4 74 32 3 26 1 27 -41 27 -50 0 -57 9 -57 68 0 19 -7 43 -16 53 -9 10 -19 33 -23 51 -4 19 -14 34 -24 36 -14 3 -17 -4 -17 -42 l0 -46 -348 0 c-193 0 -352 4 -357 9 -6 5 -19 11 -30 13 -13 2 -22 13 -25 32 -8 47 -28 43 -32 -6z m570 -74 c20 -6 23 -12 20 -48 l-3 -41 -57 -3 -58 -3 0 45 c0 34 4 46 18 49 27 7 55 7 80 1z m-309 -83 c11 -7 12 -17 5 -43 -10 -33 -10 -33 -71 -33 -34 0 -64 3 -68 7 -9 9 4 68 15 68 5 0 10 -10 12 -22 2 -12 8 -23 15 -25 7 -3 9 3 6 17 -4 13 0 26 8 31 18 11 60 11 78 0z m-750 -103 c-1 -36 -33 -121 -46 -126 -10 -3 -13 16 -13 72 l0 76 30 0 c25 0 30 -4 29 -22z m692 2 c46 0 47 -6 17 -81 -24 -62 -73 -119 -100 -119 -17 0 -78 26 -78 34 0 4 46 136 55 159 6 15 15 18 38 13 16 -3 47 -6 68 -6z"/></g></svg>`;
  }
  if (key === 'pistol' || cat.includes('sidearm') || cat.includes('pistol')) {
    return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 145 105" preserveAspectRatio="xMidYMid meet" style="opacity: 0.85;"><g transform="translate(0.000000,105.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M293 920 c-3 -11 -11 -20 -19 -20 -8 0 -22 -28 -34 -67 -24 -79 -52 -113 -91 -113 -58 0 -46 -25 31 -63 85 -42 87 -84 14 -278 -56 -148 -67 -224 -35 -253 18 -16 38 -19 140 -20 73 -1 124 3 131 10 5 5 24 66 40 134 17 68 39 143 50 168 l20 44 52 -8 c72 -11 195 -5 235 11 40 17 51 38 59 111 4 33 12 62 18 66 6 4 80 8 164 8 84 0 173 5 198 11 l44 11 0 55 c0 38 4 55 15 59 18 7 22 104 4 104 -7 0 -22 11 -35 25 -26 29 -42 32 -50 10 -5 -13 -65 -15 -454 -15 -389 0 -449 2 -454 15 -8 22 -37 18 -43 -5z m342 -334 c10 -40 54 -96 76 -96 7 0 3 10 -10 24 -22 24 -44 92 -35 108 3 4 40 8 83 8 92 0 104 -9 99 -71 -5 -65 -37 -84 -141 -84 -45 0 -94 3 -108 7 -49 14 -62 93 -23 133 25 25 48 14 59 -29z"/></g></svg>`;
  }
  if (key === 'medkit' || cat.includes('support') || cat.includes('medkit') || cat.includes('health')) {
    return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 128 117" preserveAspectRatio="xMidYMid meet" style="opacity: 0.85;"><g transform="translate(0.000000,117.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M470 1030 c-15 -15 -20 -33 -20 -79 l0 -59 -141 -4 -141 -3 -29 -33 -29 -32 0 -319 0 -319 28 -30 c23 -24 40 -32 87 -37 50 -7 555 2 563 9 1 2 -5 19 -13 39 -46 109 19 260 130 302 59 23 156 17 213 -13 23 -12 45 -22 48 -22 3 0 4 90 2 200 l-3 200 -28 27 c-27 27 -31 28 -165 33 l-137 5 -3 55 c-2 39 -9 61 -24 78 -20 21 -29 22 -170 22 -135 0 -150 -2 -168 -20z m304 -46 c3 -9 6 -33 6 -55 l0 -39 -140 0 -140 0 0 48 c0 27 3 52 7 55 3 4 64 7 134 7 106 0 128 -3 133 -16z m-216 -279 c20 -9 47 -25 59 -37 l22 -21 35 31 c43 38 81 46 131 30 84 -28 110 -125 56 -209 -34 -53 -203 -219 -222 -219 -8 0 -61 46 -118 101 -132 130 -162 190 -127 257 19 36 48 61 82 72 41 12 40 12 82 -5z"/><path d="M943 441 c-127 -32 -185 -202 -107 -313 79 -112 249 -112 328 0 64 91 35 232 -58 287 -47 28 -114 38 -163 26z m95 -113 l3 -48 50 0 50 0 -3 -37 c-3 -38 -4 -38 -50 -41 l-47 -3 -3 -42 c-3 -41 -4 -42 -40 -45 l-38 -3 0 45 0 45 -47 3 c-48 3 -48 3 -51 41 l-3 37 50 0 51 0 0 51 0 50 38 -3 c37 -3 37 -3 40 -50z"/></g></svg>`;
  }
  if (key === 'radio' || cat.includes('comms') || cat.includes('electronic') || cat.includes('radio')) {
    return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 74 163" preserveAspectRatio="xMidYMid meet" style="opacity: 0.85;"><g transform="translate(0.000000,163.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M234 1512 c-7 -4 -13 -67 -17 -172 -3 -91 -8 -212 -12 -270 -6 -104 -6 -105 -43 -143 l-37 -38 -3 -198 c-3 -196 -3 -198 22 -246 24 -44 26 -58 26 -180 0 -111 3 -135 17 -146 12 -11 57 -14 190 -14 161 0 176 1 189 19 10 15 14 53 14 150 0 125 1 131 28 170 26 38 27 43 30 204 2 90 1 180 -3 198 -3 19 -23 54 -45 79 -26 30 -37 51 -33 64 8 33 -5 71 -25 71 -28 0 -42 -21 -42 -62 0 -37 -1 -38 -35 -38 l-35 0 0 50 c0 49 -1 50 -30 50 -29 0 -30 -1 -30 -50 l0 -50 -39 0 -40 0 -5 135 c-4 74 -8 197 -12 273 -5 137 -9 157 -30 144z m314 -694 c16 -16 16 -180 0 -196 -17 -17 -329 -17 -346 0 -16 16 -16 180 0 196 17 17 329 17 346 0z m2 -277 c17 -33 12 -89 -10 -111 -18 -18 -33 -20 -163 -20 -173 0 -187 6 -187 79 0 26 5 52 12 59 8 8 61 12 175 12 150 0 163 -1 173 -19z"/><path d="M233 504 c-3 -9 -2 -24 4 -33 9 -14 30 -16 139 -14 70 2 132 7 137 12 5 5 7 17 5 27 -3 17 -16 19 -141 22 -121 2 -138 1 -144 -14z"/></g></svg>`;
  }
  // Default to fire/grenade
  return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 165 165" preserveAspectRatio="xMidYMid meet" style="opacity: 0.85;"><g transform="translate(0.000000,165.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M1387 1536 c-43 -19 -108 -52 -145 -74 -76 -46 -232 -160 -232 -170 0 -4 51 -59 114 -121 102 -102 117 -113 132 -101 33 28 173 251 205 327 17 43 34 99 37 126 6 59 -3 60 -111 13z"/><path d="M925 1220 l-29 -31 122 -122 122 -122 30 30 30 30 -123 123 -123 122 -29 -30z"/><path d="M536 838 l-306 -312 127 -128 c70 -71 133 -128 140 -128 13 0 605 620 601 630 -2 3 -60 60 -129 128 l-126 123 -307 -313z"/><path d="M141 445 c-17 -20 -31 -42 -31 -49 0 -38 209 -246 247 -246 10 0 36 14 57 31 l38 32 -133 133 c-74 74 -137 134 -140 134 -4 0 -21 -16 -38 -35z"/></g></svg>`;
}

  // Equipment List Container (horizontal slots with icons)
  const itemsContainer = document.createElement('div');
  Object.assign(itemsContainer.style, {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box',
    margin: '4px 0 10px 0'
  });

  currentList.forEach((item, idx) => {
    const isSelected = idx === selectedItemIdx;

    const itemCard = document.createElement('div');
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
      renderArmoryScreen(container);
    };

    const shortSlotMap: Record<string, string> = {
      'PRIMARY': 'PRI',
      'SECONDARY': 'SEC',
      'UTILITY 1': 'UT1',
      'UTILITY 2': 'UT2'
    };
    const slotLabel = shortSlotMap[item.slotName] || item.slotName;

    itemCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; color: ${isSelected ? '#FF4500' : '#888888'};">
        ${getSlotIconSvg(item.weaponKey, item.category)}
      </div>
      <div style="font-family:${DS.typography.fontFamily}; font-size: 6.5px; font-weight: bold; letter-spacing: 0.5px; color: ${isSelected ? '#FFFFFF' : '#666666'}; line-height: 1;">
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
        <div style="display: flex; justify-content: space-between; font-family: ${DS.typography.fontFamily}; font-size: 7.5px; color: #888888; margin-bottom: 1px;">
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
    <div style="font-family: ${DS.typography.fontFamily}; font-size: 7.5px; color: #888888; letter-spacing: 0.5px; font-weight: bold; line-height: 1;">
      ${selectedItem ? selectedItem.category.toUpperCase() : "EQUIPMENT"} STATS
    </div>
    <div style="font-family: ${DS.typography.fontFamily}; font-size: 11.5px; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px; margin-top: 1px; line-height: 1.1;">
      ${selectedItem ? selectedItem.name : "N/A"}
    </div>
    <div style="font-family: ${DS.typography.fontFamily}; font-size: 7.5px; color: #888888; margin-bottom: 3px; line-height: 1;">
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
  wrap.appendChild(leftCol);

  // Viewport Container positioned absolutely - starts from the top bar bottom boundary and expands to fill space
  const viewportContainer = document.createElement('div');
  viewportContainer.id = 'armory-3d-viewport';
  Object.assign(viewportContainer.style, {
    position: 'absolute',
    top: '-50px', // Go uppast tabHeaderRow to the top bar's bottom border
    left: '202px', // 190px width + 12px gap
    right: '0px',
    bottom: '40px', // Above the skin bar
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
    left: '202px',
    right: '0px',
    height: '36px',
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
    <div style="font-family:${DS.typography.fontFamily}; font-size: 7px; font-weight:bold; color:#888888; letter-spacing:0.5px; line-height:1;">
      SKINS
    </div>
  `;

  const skinsRow = document.createElement('div');
  Object.assign(skinsRow.style, {
    display: 'flex',
    gap: '4px'
  });

  Object.values(AVAILABLE_SKINS).forEach(skin => {
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
      renderArmoryScreen(container);
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
      previewBox = `<div class="skin-preview-img" style="width: 14px; height: 14px; border: 1px solid ${isSkinEquipped ? '#FF4500' : '#333333'}; background: #111111;"></div>`;
    } else {
      previewBox = `<div style="width: 14px; height: 14px; border: 1px solid ${isSkinEquipped ? '#FF4500' : '#333333'}; background: #111111; display: flex; align-items: center; justify-content: center; font-family: ${DS.typography.fontFamily}; font-size: 5px; color: #888888; text-align: center; font-weight: bold;">BASE</div>`;
    }

    skinTile.innerHTML = `
      ${previewBox}
      <div style="font-family:${DS.typography.fontFamily}; font-size:6px; font-weight:bold; color:${isSkinEquipped ? '#FF4500' : '#666666'}; text-align:center; letter-spacing:0px; line-height:1;">
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
