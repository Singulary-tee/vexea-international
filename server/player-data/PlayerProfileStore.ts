import { db, doc, getDoc, setDoc } from "../index";

export interface PlayerGameProfile {
  totalMatches: number;
  classBreakdown: Record<string, number>;
  averages: {
    kills: number;
    deaths: number;
    damageDealt: number;
    damageReceived: number;
    objectiveTime: number;
  };
  preferredRole: string;
  recentMatches: Array<{
    matchId: string;
    result: "win" | "loss";
    classId: string;
    kills: number;
    deaths: number;
    timestamp: number;
  }>;
}

export class PlayerProfileStore {
  /**
   * Fetches the player's game profile from Users/{uid}/gameProfile/v1
   */
  public static async getProfile(uid: string): Promise<PlayerGameProfile | null> {
    if (!uid || uid.startsWith("bot_")) return null;
    try {
      const subDocRef = doc(db, "Users", uid, "gameProfile", "v1");
      const snap = await getDoc(subDocRef);
      if (snap.exists()) {
        return snap.data() as PlayerGameProfile;
      }
    } catch (err) {
      console.error(`[PlayerProfileStore] Failed to get profile for ${uid}:`, err);
    }
    return null;
  }

  /**
   * Updates player game profile after a match completes.
   * Calculates running averages, class selection breakdown, preferred role, and recent match telemetry.
   */
  public static async update(
    uid: string,
    stats: any,
    classId: string,
    result: "win" | "loss",
    matchId: string,
    isBot: boolean
  ): Promise<void> {
    if (!uid || isBot) return;

    try {
      const subDocRef = doc(db, "Users", uid, "gameProfile", "v1");
      const snap = await getDoc(subDocRef);

      const normalizedClass = (classId || "ASSAULT").toUpperCase();
      const currentKills = stats?.droneEliminations || 0;
      const currentDeaths = stats?.deaths || 0;
      const currentDmgDealt = stats?.damageDealt || 0;
      const currentDmgRecv = stats?.damageReceived || 0;
      const currentObjTime = stats?.objectiveTimeHeld || 0;

      let profile: PlayerGameProfile;

      if (snap.exists()) {
        const existing = snap.data() as PlayerGameProfile;
        const totalMatches = (existing.totalMatches || 0) + 1;
        const oldTotal = totalMatches - 1;

        const classBreakdown = { ...(existing.classBreakdown || {}) };
        classBreakdown[normalizedClass] = (classBreakdown[normalizedClass] || 0) + 1;

        const averages = {
          kills: parseFloat((((existing.averages?.kills || 0) * oldTotal + currentKills) / totalMatches).toFixed(2)),
          deaths: parseFloat((((existing.averages?.deaths || 0) * oldTotal + currentDeaths) / totalMatches).toFixed(2)),
          damageDealt: parseFloat((((existing.averages?.damageDealt || 0) * oldTotal + currentDmgDealt) / totalMatches).toFixed(2)),
          damageReceived: parseFloat((((existing.averages?.damageReceived || 0) * oldTotal + currentDmgRecv) / totalMatches).toFixed(2)),
          objectiveTime: parseFloat((((existing.averages?.objectiveTime || 0) * oldTotal + currentObjTime) / totalMatches).toFixed(2)),
        };

        let preferredRole = normalizedClass;
        let maxCount = 0;
        for (const [cls, count] of Object.entries(classBreakdown)) {
          if (count > maxCount) {
            maxCount = count;
            preferredRole = cls;
          }
        }

        const newMatchEntry = {
          matchId,
          result,
          classId: normalizedClass,
          kills: currentKills,
          deaths: currentDeaths,
          timestamp: Date.now(),
        };

        const recentMatches = [newMatchEntry, ...(existing.recentMatches || [])].slice(0, 10);

        profile = {
          totalMatches,
          classBreakdown,
          averages,
          preferredRole,
          recentMatches,
        };
      } else {
        const classBreakdown = { [normalizedClass]: 1 };
        profile = {
          totalMatches: 1,
          classBreakdown,
          averages: {
            kills: currentKills,
            deaths: currentDeaths,
            damageDealt: currentDmgDealt,
            damageReceived: currentDmgRecv,
            objectiveTime: currentObjTime,
          },
          preferredRole: normalizedClass,
          recentMatches: [
            {
              matchId,
              result,
              classId: normalizedClass,
              kills: currentKills,
              deaths: currentDeaths,
              timestamp: Date.now(),
            },
          ],
        };
      }

      await setDoc(subDocRef, profile);
    } catch (err) {
      console.error(`[PlayerProfileStore] Failed to update profile for ${uid}:`, err);
    }
  }
}
