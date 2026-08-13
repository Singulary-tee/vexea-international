import { db, doc, getDoc, setDoc } from "../index";

export interface MatchAbuseRecord {
  offenseCount: number;
  lastOffenseAt: number;
  lockoutUntil: number;
  banned: boolean;
}

const DEFAULT_RECORD: MatchAbuseRecord = {
  offenseCount: 0,
  lastOffenseAt: 0,
  lockoutUntil: 0,
  banned: false,
};

export class MatchAbuseStore {
  /**
   * Reads player abuse record from Users/{uid}/matchAbuse/v1
   */
  public static async getRecord(uid: string): Promise<MatchAbuseRecord> {
    if (!uid || uid.startsWith("bot_")) {
      return { ...DEFAULT_RECORD };
    }
    try {
      const subDocRef = doc(db, `Users/${uid}/matchAbuse/v1`);
      const snap = await getDoc(subDocRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<MatchAbuseRecord>;
        return {
          offenseCount: data.offenseCount ?? 0,
          lastOffenseAt: data.lastOffenseAt ?? 0,
          lockoutUntil: data.lockoutUntil ?? 0,
          banned: data.banned ?? false,
        };
      }
    } catch (err) {
      console.error(`[MatchAbuseStore] Failed to get abuse record for ${uid}:`, err);
    }
    return { ...DEFAULT_RECORD };
  }

  /**
   * Records an abandonment offense and applies escalating penalties.
   * Resets offense count if last offense was over 14 days ago.
   */
  public static async recordOffense(uid: string): Promise<MatchAbuseRecord> {
    if (!uid || uid.startsWith("bot_")) {
      return { ...DEFAULT_RECORD };
    }

    try {
      const current = await MatchAbuseStore.getRecord(uid);
      const now = Date.now();
      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

      let count = current.offenseCount;
      if (current.lastOffenseAt > 0 && (now - current.lastOffenseAt) > FOURTEEN_DAYS_MS) {
        count = 0;
      }

      count += 1;
      let lockoutUntil = current.lockoutUntil;
      let banned = current.banned;

      if (count === 1 || count === 2) {
        // Warning tier, no lockout time change
      } else if (count === 3) {
        // 30 minute lockout
        lockoutUntil = now + 30 * 60 * 1000;
      } else if (count === 4) {
        // 24 hour lockout
        lockoutUntil = now + 24 * 60 * 60 * 1000;
      } else if (count >= 5) {
        // Permanent ban from matchmaking
        banned = true;
      }

      const updatedRecord: MatchAbuseRecord = {
        offenseCount: count,
        lastOffenseAt: now,
        lockoutUntil,
        banned,
      };

      const subDocRef = doc(db, `Users/${uid}/matchAbuse/v1`);
      await setDoc(subDocRef, updatedRecord);
      console.log(`[MatchAbuseStore] Recorded offense for ${uid}: tier ${count}, lockoutUntil ${lockoutUntil}, banned ${banned}`);
      return updatedRecord;
    } catch (err) {
      console.error(`[MatchAbuseStore] Failed to record offense for ${uid}:`, err);
      return { ...DEFAULT_RECORD };
    }
  }

  /**
   * Helper to check if a user is currently locked out or banned from matchmaking.
   */
  public static async isLockedOut(uid: string): Promise<boolean> {
    const rec = await MatchAbuseStore.getRecord(uid);
    if (rec.banned) return true;
    if (rec.lockoutUntil > Date.now()) return true;
    return false;
  }
}
