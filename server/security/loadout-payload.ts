/**
 * Loadout Payload Validation
 * Single responsibility: bound and shape-check the armory documents an
 * authenticated player may persist, so `/api/player/loadout` and
 * `/api/player/item-skins` cannot write arbitrary or oversized structures
 * into the user document.
 */

import { CLASSES } from "../../shared/classes";
import catalogData from "../../shared/catalog.json";

export const MAX_LOADOUT_ITEMS = 8;
export const MAX_SKIN_ENTRIES = 64;
export const MAX_FIELD_LENGTH = 64;

export interface LoadoutItem {
  id: string;
  slotName: string;
  weaponKey?: string;
  skinId?: string;
  name?: string;
  category?: string;
}

const OPTIONAL_STRING_FIELDS = ["weaponKey", "skinId", "name", "category"] as const;

export const STANDARD_CLASS_LOADOUT_ITEMS: Record<string, ReadonlyArray<{ id: string; slotName: string; weaponKey?: string; category?: string; name?: string }>> = {
  ASSAULT: [
    { id: 'm4_rifle_assault', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY' },
    { id: 'f90_smg_assault', name: 'F90 SMG', weaponKey: 'smg', category: 'Submachine Gun', slotName: 'PRIMARY' },
    { id: 'viper_pistol_assault', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY' },
    { id: 'frag_grenade_assault', name: 'FRAG GRENADE', weaponKey: 'grenade', category: 'Ordnance', slotName: 'UTILITY 1' },
    { id: 'flashbang_assault', name: 'FLASH GRENADE', weaponKey: 'flashbang', category: 'Disruption', slotName: 'UTILITY 2' },
  ],
  MEDIC: [
    { id: 'm4_rifle_medic', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY' },
    { id: 'benelli_shotgun_medic', name: 'BENELLI M4 SHOTGUN', weaponKey: 'shotgun', category: 'Shotgun', slotName: 'PRIMARY' },
    { id: 'viper_pistol_medic', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY' },
    { id: 'medkit_medic', name: 'MEDKIT', weaponKey: 'medkit', category: 'Support', slotName: 'UTILITY 1' },
    { id: 'revive_medic', name: 'REVIVE TOOL', weaponKey: 'revive', category: 'Support', slotName: 'UTILITY 2' },
  ],
  RECON: [
    { id: 'm4_rifle_recon', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY' },
    { id: 'pgm_sniper_recon', name: 'PGM ULTIMA RATIO', weaponKey: 'sniper', category: 'Sniper Rifle', slotName: 'PRIMARY' },
    { id: 'viper_pistol_recon', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY' },
    { id: 'radio_recon', name: 'FIELD RADIO', weaponKey: 'radio', category: 'Comms', slotName: 'UTILITY 1' },
    { id: 'disruptor_recon', name: 'SIGNAL DISRUPTOR', weaponKey: 'signal_jammer', category: 'Electronic', slotName: 'UTILITY 2' },
  ],
  DEMOLITIONS: [
    { id: 'm4_rifle_demo', name: 'M4 BATTLE RIFLE', weaponKey: 'rifle', category: 'Assault Rifle', slotName: 'PRIMARY' },
    { id: 'lmg_demo', name: 'LMG RIFLE', weaponKey: 'lmg', category: 'Light Machine Gun', slotName: 'PRIMARY' },
    { id: 'viper_pistol_demo', name: 'VIPER PISTOL', weaponKey: 'pistol', category: 'Sidearm', slotName: 'SECONDARY' },
    { id: 'c4_demo', name: 'C4 EXPLOSIVE', weaponKey: 'c4', category: 'Demolition', slotName: 'UTILITY 1' },
    { id: 'mine_demo', name: 'PROXIMITY MINE', weaponKey: 'proximity_mine', category: 'Demolition', slotName: 'UTILITY 2' },
  ],
};

const ALL_CATALOG_LOADOUT_ITEMS = new Map<string, { id: string; slotName: string; classId: string }>();
for (const [classId, items] of Object.entries(STANDARD_CLASS_LOADOUT_ITEMS)) {
  for (const item of items) {
    ALL_CATALOG_LOADOUT_ITEMS.set(item.id, { id: item.id, slotName: item.slotName, classId });
  }
}

const VALID_CATALOG_SKINS = new Set<string>([
  "STANDARD",
  ...catalogData.filter((i: any) => i.category === "cosmetic").map((i: any) => i.id as string),
]);

export function isDefaultStartingItem(classId: string, itemId: string): boolean {
  const classItems = STANDARD_CLASS_LOADOUT_ITEMS[classId];
  if (!classItems) return false;
  return classItems.some((i) => i.id === itemId);
}

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

export function isValidClassId(classId: unknown): boolean {
  return typeof classId === "string" && Object.prototype.hasOwnProperty.call(CLASSES, classId);
}

/**
 * Returns the sanitized item list, or null when the payload is unusable or
 * contains uncataloged item identifiers.
 * Only the known slot fields survive; unrecognized keys (including the
 * client's derived `stats` blob) are dropped.
 */
export function sanitizeLoadoutItems(items: unknown, targetClassId?: string): LoadoutItem[] | null {
  if (!Array.isArray(items) || items.length > MAX_LOADOUT_ITEMS) return null;

  const sanitized: LoadoutItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    if (!isBoundedString(item.id) || !isBoundedString(item.slotName)) return null;

    const catalogItem = ALL_CATALOG_LOADOUT_ITEMS.get(item.id);
    if (!catalogItem) return null;
    if (targetClassId && catalogItem.classId !== targetClassId) return null;

    const clean: LoadoutItem = { id: item.id, slotName: item.slotName };
    for (const field of OPTIONAL_STRING_FIELDS) {
      const value = item[field];
      if (value === undefined || value === null) continue;
      if (!isBoundedString(value)) return null;
      clean[field] = value;
    }
    sanitized.push(clean);
  }

  return sanitized;
}

/**
 * Returns the sanitized `itemId -> skinId` map, or null when unusable or
 * containing uncataloged weapon/skin identifiers.
 */
export function sanitizeItemSkins(skins: unknown): Record<string, string> | null {
  if (!skins || typeof skins !== "object" || Array.isArray(skins)) return null;

  const entries = Object.entries(skins as Record<string, unknown>);
  if (entries.length > MAX_SKIN_ENTRIES) return null;

  const sanitized: Record<string, string> = {};
  for (const [itemId, skinId] of entries) {
    if (!isBoundedString(itemId) || !isBoundedString(skinId)) return null;
    if (!ALL_CATALOG_LOADOUT_ITEMS.has(itemId)) return null;
    if (!VALID_CATALOG_SKINS.has(skinId)) return null;
    sanitized[itemId] = skinId;
  }

  return sanitized;
}
