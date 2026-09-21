/**
 * Loadout Payload Validation
 * Single responsibility: bound and shape-check the armory documents an
 * authenticated player may persist, so `/api/player/loadout` and
 * `/api/player/item-skins` cannot write arbitrary or oversized structures
 * into the user document.
 */

import { CLASSES } from "../../shared/classes";

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

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

export function isValidClassId(classId: unknown): boolean {
  return typeof classId === "string" && Object.prototype.hasOwnProperty.call(CLASSES, classId);
}

/**
 * Returns the sanitized item list, or null when the payload is unusable.
 * Only the known slot fields survive; unrecognized keys (including the
 * client's derived `stats` blob) are dropped.
 */
export function sanitizeLoadoutItems(items: unknown): LoadoutItem[] | null {
  if (!Array.isArray(items) || items.length > MAX_LOADOUT_ITEMS) return null;

  const sanitized: LoadoutItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    if (!isBoundedString(item.id) || !isBoundedString(item.slotName)) return null;

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
 * Returns the sanitized `itemId -> skinId` map, or null when unusable.
 */
export function sanitizeItemSkins(skins: unknown): Record<string, string> | null {
  if (!skins || typeof skins !== "object" || Array.isArray(skins)) return null;

  const entries = Object.entries(skins as Record<string, unknown>);
  if (entries.length > MAX_SKIN_ENTRIES) return null;

  const sanitized: Record<string, string> = {};
  for (const [itemId, skinId] of entries) {
    if (!isBoundedString(itemId) || !isBoundedString(skinId)) return null;
    sanitized[itemId] = skinId;
  }

  return sanitized;
}
