import { db, doc, setDoc } from "../index";
import type { MatchRoom } from "../MatchRoom";

export interface PlayerMatchArchiveStats {
  id: string;
  stats: {
    damageDealt: number;
    damageReceived: number;
    deaths: number;
    droneEliminations: number;
    assists: number;
    objectiveTimeHeld: number;
    revivesPerformed: number;
    distanceTravelled: number;
    timeAlive: number;
    scoreIndividual: number;
  };
  adMultiplier?: number;
}

export interface MatchArchiveDoc {
  roomId: string;
  mapId: string;
  matchStartTime: number;
  matchEndTime: number;
  durationSeconds: number;
  result: "win" | "loss";
  apiCallCount: number;
  llmTokensUsedThisMatch: number;
  commanderAPRemaining: number;
  fixedWingDeploymentsThisMatch: number;
  players: PlayerMatchArchiveStats[];
  createdAt: string;
  expireAt: Date;
}

/**
 * Collects telemetry data at the end of a match and writes a fire-and-forget archive
 * document to the "MatchArchives" Firestore collection.
 */
export function archiveMatchEvent(room: MatchRoom, result: "win" | "loss"): void {
  const matchEndTime = Date.now();
  const matchStartTime = room.matchStartTime || matchEndTime;
  const durationSeconds = Math.max(0, Math.round((matchEndTime - matchStartTime) / 1000));
  const expireDays = result === "win" ? 90 : 7;
  const expireAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);

  const playersStats: PlayerMatchArchiveStats[] = [];
  for (const [id, p] of room.players.entries()) {
    playersStats.push({
      id,
      stats: { ...p.stats },
      adMultiplier: p.adMultiplier || 1,
    });
  }

  const archiveDoc: MatchArchiveDoc = {
    roomId: room.roomId,
    mapId: room.mapId,
    matchStartTime,
    matchEndTime,
    durationSeconds,
    result,
    apiCallCount: room.apiCallCount || 0,
    llmTokensUsedThisMatch: room.llmTokensUsedThisMatch || 0,
    commanderAPRemaining: room.commanderAP ?? 0,
    fixedWingDeploymentsThisMatch: room.fixedWingDeploymentsThisMatch || 0,
    players: playersStats,
    createdAt: new Date().toISOString(),
    expireAt,
  };

  const archiveRef = doc(db, "MatchArchives", room.roomId);
  setDoc(archiveRef, archiveDoc).catch((err: any) => {
    console.error(`[MatchEventCollector] Failed to write match archive for room ${room.roomId}:`, err);
  });
}
