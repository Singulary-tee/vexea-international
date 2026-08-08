import { db, doc, setDoc } from "../index";
import type { MatchRoom } from "../MatchRoom";

export interface PlayerMatchArchiveStats {
  id: string;
  isBot: boolean;
  classId?: string;
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
  matchId: string;
  roomId: string;
  mapId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  result: "win" | "loss";
  playerCount: number;
  players: PlayerMatchArchiveStats[];
  commanderStats: {
    apiCalls: number;
    tokensUsed: number;
    finalAP: number;
    fixedWingDeployments: number;
  };
  expireAt: Date;
}

/**
 * Collects telemetry data at the end of a match and writes a fire-and-forget archive
 * document to the "MatchArchives" Firestore collection.
 */
export function archiveMatchEvent(room: MatchRoom, result: "win" | "loss"): void {
  const endedAt = new Date();
  const startedAt = new Date(room.matchStartTime || endedAt.getTime());
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const expireDays = result === "win" ? 90 : 7;
  const expireAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);

  const players: PlayerMatchArchiveStats[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    isBot: !!p.isBot,
    classId: p.classId || "assault",
    stats: { ...p.stats },
    adMultiplier: p.adMultiplier || 1,
  }));

  const archiveDoc: MatchArchiveDoc = {
    matchId: room.roomId,
    roomId: room.roomId,
    mapId: room.mapId,
    startedAt,
    endedAt,
    durationSeconds,
    result,
    playerCount: players.length,
    players,
    commanderStats: {
      apiCalls: room.apiCallCount || 0,
      tokensUsed: room.llmTokensUsedThisMatch || 0,
      finalAP: room.commanderAP ?? 0,
      fixedWingDeployments: room.fixedWingDeploymentsThisMatch || 0,
    },
    expireAt,
  };

  const archiveRef = doc(db, "MatchArchives", room.roomId);
  setDoc(archiveRef, archiveDoc).catch((err: any) => {
    console.error(`[MatchEventCollector] Failed to write match archive for room ${room.roomId}:`, err);
  });
}
