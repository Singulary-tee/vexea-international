import { db, doc, getDoc, setDoc } from "../../index";

export interface StrategyBriefDoc {
  mapId: string;
  content: string;           // The actual brief text
  version: number;           // Incremented on each update
  updatedAt: Date;
  updatedBy: string;         // "manual" or future automation ID
  matchCountAtUpdate: number; // How many matches existed when written
}

export class StrategyBriefStore {
  /**
   * Reads a strategy brief document for the specified mapId from Firestore.
   * Path: StrategyBriefs/{mapId}
   */
  public static async getBrief(mapId: string): Promise<StrategyBriefDoc | null> {
    if (!mapId) return null;
    try {
      const ref = doc(db, "StrategyBriefs", mapId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data === "object") {
          return {
            mapId: data.mapId || mapId,
            content: data.content || "",
            version: data.version || 1,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            updatedBy: data.updatedBy || "manual",
            matchCountAtUpdate: data.matchCountAtUpdate || 0,
          };
        }
      }
      return null;
    } catch (e) {
      console.warn(`[StrategyBriefStore] Failed to fetch brief for ${mapId}:`, e);
      return null;
    }
  }

  /**
   * Creates and persists a default strategy brief if none exists for the specified mapId.
   */
  public static async ensureDefaultBrief(mapId: string): Promise<StrategyBriefDoc> {
    const existing = await this.getBrief(mapId);
    if (existing) {
      return existing;
    }

    const displayName = mapId === "map_1_facility" ? "Facility" : mapId;
    const defaultContent = `[STRATEGY BRIEF — ${displayName}]
Status: Skeleton v1 | Matches analyzed: 0

AP ECONOMY:
- No validated heuristics yet.

ZONE PRIORITY:
- No validated heuristics yet.

UNIT COMPOSITION:
- No validated heuristics yet.

COUNTER-UTILITY:
- No validated heuristics yet.

ENDGAME:
- No validated heuristics yet.`;

    const defaultDoc: StrategyBriefDoc = {
      mapId,
      content: defaultContent,
      version: 1,
      updatedAt: new Date(),
      updatedBy: "manual",
      matchCountAtUpdate: 0,
    };

    try {
      const ref = doc(db, "StrategyBriefs", mapId);
      await setDoc(ref, {
        ...defaultDoc,
        updatedAt: defaultDoc.updatedAt.toISOString(),
      });
    } catch (e) {
      console.warn(`[StrategyBriefStore] Failed to save default brief for ${mapId}:`, e);
    }

    return defaultDoc;
  }
}
