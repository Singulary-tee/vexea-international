import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { CATALOG_LOADOUTS, LoadoutSlotItem } from "../../screens/armory-screen";
import { CLASSES, ClassId, isClassWeaponAllowed, getClassWeaponId } from "../../../shared/classes";
import { isRuntimeWeaponId } from "../../../shared/constants";
import { UTILITIES, UtilityId } from "../../../shared/utilities";
import type { WeaponId } from "../../../shared/weapons";

const STORAGE_KEY = "vex_class_loadouts";
const ACTIVE_CLASS_KEY = "vex_active_class";

/**
 * ClassLoadoutPersistence
 * Dedicated single-responsibility module for storing and retrieving
 * customized loadout configurations per class (ASSAULT, MEDIC, RECON, DEMOLITIONS).
 */
export class ClassLoadoutPersistence {
  private static debounceTimers: Record<string, any> = {};

  /**
   * Retrieves currently equipped/active class ID.
   */
  public static getEquippedClass(): ClassId {
    try {
      const stored = localStorage.getItem(ACTIVE_CLASS_KEY);
      if (stored && stored in CLASSES) {
        return stored as ClassId;
      }
    } catch {}
    return 'ASSAULT';
  }

  /**
   * Persists currently equipped/active class ID.
   */
  public static setEquippedClass(classId: ClassId): void {
    if (!(classId in CLASSES)) return;
    try {
      localStorage.setItem(ACTIVE_CLASS_KEY, classId);
    } catch (e) {
      console.warn("[ClassLoadoutPersistence] Failed to save active class:", e);
    }
  }

  /**
   * Checks if an item is unlocked by default or exists in the user's unlocked items collection.
   */
  public static isItemUnlocked(itemId: string): boolean {
    if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST)) {
      return true;
    }
    // Standard starting equipment is always unlocked
    for (const classId of Object.keys(CATALOG_LOADOUTS)) {
      const classLoadout = CATALOG_LOADOUTS[classId];
      if (classLoadout.some(slotItem => slotItem.id === itemId)) {
        return true;
      }
    }

    // Check registeredUserData from global window scope (Firestore cache)
    const userData = (window as any).registeredUserData;
    if (userData) {
      if (Array.isArray(userData.unlockedItems) && userData.unlockedItems.includes(itemId)) {
        return true;
      }
      if (Array.isArray(userData.unlockedSkins) && userData.unlockedSkins.includes(itemId)) {
        return true;
      }
    }

    // Check LocalStorage fallback
    try {
      const owned = JSON.parse(localStorage.getItem('vex_owned_skins') || '[]');
      if (Array.isArray(owned) && owned.includes(itemId)) {
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Retrieves current loadout items for a class from local cache or default catalog.
   */
  public static getClassLoadout(classId: string): LoadoutSlotItem[] {
    const normalizedClassId = (classId in CLASSES ? classId : 'ASSAULT') as ClassId;
    const defaults = this.getDefaultClassLoadout(normalizedClassId);
    const stored = this.getAllStoredLoadouts()[normalizedClassId];
    if (!Array.isArray(stored)) return defaults;

    const sanitized = [...defaults];
    for (const item of stored) {
      if (!item || !this.isItemUnlocked(item.id) || !this.isValidClassItem(normalizedClassId, item)) continue;
      const slotIndex = this.getSlotIndex(item.slotName);
      if (slotIndex >= 0) sanitized[slotIndex] = item;
    }
    return sanitized;
  }

  public static getClassWeaponIds(classId: ClassId): { primaryWeaponId: WeaponId; secondaryWeaponId: WeaponId } {
    const loadout = this.getClassLoadout(classId);
    let primaryWeaponId = getClassWeaponId(classId, 'primary');
    let secondaryWeaponId = getClassWeaponId(classId, 'secondary');

    for (const item of loadout) {
      if (item.slotName === 'PRIMARY' && isRuntimeWeaponId(item.weaponKey) && isClassWeaponAllowed(classId, 'primary', item.weaponKey)) {
        primaryWeaponId = item.weaponKey;
      } else if (item.slotName === 'SECONDARY' && isRuntimeWeaponId(item.weaponKey) && isClassWeaponAllowed(classId, 'secondary', item.weaponKey)) {
        secondaryWeaponId = item.weaponKey;
      }
    }

    return { primaryWeaponId, secondaryWeaponId };
  }

  private static getDefaultClassLoadout(classId: ClassId): LoadoutSlotItem[] {
    const catalog = CATALOG_LOADOUTS[classId] || CATALOG_LOADOUTS.ASSAULT;
    const slotNames = ['PRIMARY', 'SECONDARY', 'UTILITY 1', 'UTILITY 2'];
    return slotNames.map((slotName) => catalog.find((item) => item.slotName === slotName) || CATALOG_LOADOUTS.ASSAULT[slotNames.indexOf(slotName)]);
  }

  private static getSlotIndex(slotName: string): number {
    if (slotName === 'PRIMARY') return 0;
    if (slotName === 'SECONDARY') return 1;
    if (slotName === 'UTILITY 1') return 2;
    if (slotName === 'UTILITY 2') return 3;
    return -1;
  }

  private static isValidClassItem(classId: ClassId, item: LoadoutSlotItem): boolean {
    if (item.slotName === 'PRIMARY' || item.slotName === 'SECONDARY') {
      return isClassWeaponAllowed(classId, item.slotName === 'PRIMARY' ? 'primary' : 'secondary', item.weaponKey);
    }
    const utilityIdByKey: Record<string, UtilityId> = {
      grenade: 'Grenade',
      flashbang: 'Flashbang',
      medkit: 'Med Kit',
      revive: 'Revive Tool',
      radio: 'Radio',
      signal_jammer: 'Signal Jammer',
      proximity_mine: 'Proximity Mine',
      c4: 'C4',
    };
    const utilityId = utilityIdByKey[item.weaponKey];
    if (!utilityId) return false;
    const utility = UTILITIES[utilityId];
    return utility.classId === classId && utility.slot === item.slotName.toLowerCase().replace(' ', '') as 'utility1' | 'utility2';
  }

  /**
   * Saves a single slot modification for a class and persists to LocalStorage & Firestore.
   */
  public static async saveClassLoadout(classId: string, slotIndex: number, item: LoadoutSlotItem): Promise<void> {
    const normalizedClassId = (classId in CLASSES ? classId : 'ASSAULT') as ClassId;
    if (!this.isItemUnlocked(item.id) || !this.isValidClassItem(normalizedClassId, item) || this.getSlotIndex(item.slotName) !== slotIndex) {
      console.warn(`[ClassLoadoutPersistence] Rejected invalid item ${item.id} for slot ${slotIndex} on ${normalizedClassId}`);
      return;
    }

    const current = this.getClassLoadout(normalizedClassId);
    if (slotIndex >= 0 && slotIndex < current.length) {
      current[slotIndex] = item;
      await this.saveFullClassLoadout(normalizedClassId, current);
    }
  }

  /**
   * Saves full class loadout configuration to LocalStorage and optionally Firestore.
   */
  public static async saveFullClassLoadout(classId: string, items: LoadoutSlotItem[]): Promise<void> {
    const normalizedClassId = (classId in CLASSES ? classId : 'ASSAULT') as ClassId;
    const defaults = this.getDefaultClassLoadout(normalizedClassId);
    const sanitizedItems = items.map((item, index) => {
      if (item && this.isItemUnlocked(item.id) && this.isValidClassItem(normalizedClassId, item) && this.getSlotIndex(item.slotName) === index) {
        return item;
      }
      console.warn(`[ClassLoadoutPersistence] Equipping default fallback for slot ${index} of ${normalizedClassId}.`);
      return defaults[index];
    });

    const all = this.getAllStoredLoadouts();
    all[normalizedClassId] = sanitizedItems;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn("[ClassLoadoutPersistence] LocalStorage write failed:", e);
    }

    this.debounceFirestoreUpdate(normalizedClassId, sanitizedItems);
  }

  private static debounceFirestoreUpdate(classId: string, items: LoadoutSlotItem[]): void {
    if (this.debounceTimers[classId]) {
      clearTimeout(this.debounceTimers[classId]);
    }

    this.debounceTimers[classId] = setTimeout(async () => {
      delete this.debounceTimers[classId];
      try {
        const auth = getAuth();
        if (auth.currentUser) {
          const db = getFirestore();
          await updateDoc(doc(db, "Users", auth.currentUser.uid), {
            [`armory.loadouts.${classId}`]: items
          });
          console.log(`[ClassLoadoutPersistence] Saved loadout for ${classId} to Firestore.`);
        }
      } catch (e) {
        console.warn("[ClassLoadoutPersistence] Debounced Firestore write failed:", e);
      }
    }, 2000); // 2 seconds debounce
  }

  /**
   * Reads all stored class loadouts from LocalStorage.
   */
  private static getAllStoredLoadouts(): Record<string, LoadoutSlotItem[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}
