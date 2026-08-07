import { ChannelAdapter } from "./transport/adapter";
import { ClassId, CLASSES } from "../shared/classes";
import matchManager from "./MatchManager";
import { MatchRoom } from "./MatchRoom";
import { ACTIVE_GAMEMODE } from "../shared/gamemode-configs";

// PLACEHOLDER - not specified, needs playtesting
export const MATCHMAKER_MAX_WAIT_SECONDS = 45;

export interface QueuedPlayer {
  id: string;
  reqUid: string;
  channel: ChannelAdapter;
  joinedTimestamp: number;
  mapId: string;
  classId: ClassId;
}

interface PendingMatchGroup {
  matchId: string;
  mapId: string;
  room: MatchRoom;
  players: QueuedPlayer[];
  loadingComplete: Set<string>;
  countdownTimer: any;
  countdownRemaining: number;
  hasStartedCountdown: boolean;
}

export class Matchmaker {
  private queue: QueuedPlayer[] = [];
  private pendingMatches: Map<string, PendingMatchGroup> = new Map();
  private poolInterval: any = null;

  constructor() {
    // Run matchmaking evaluation loop every second
    this.poolInterval = setInterval(() => {
      this.evaluateAllPools();
    }, 1000);
  }

  public addPlayerToPool(
    playerId: string,
    reqUid: string,
    channel: ChannelAdapter,
    mapId: string = "map_1_facility",
    classId: ClassId = "ASSAULT",
  ): void {
    // Remove if already in queue to prevent duplicates
    this.removePlayerFromPool(playerId);

    const validClassId: ClassId = CLASSES[classId] ? classId : "ASSAULT";
    const queuedPlayer: QueuedPlayer = {
      id: playerId,
      reqUid: reqUid || playerId,
      channel,
      joinedTimestamp: Date.now(),
      mapId: mapId || "map_1_facility",
      classId: validClassId,
    };

    this.queue.push(queuedPlayer);
    console.log(
      `[MATCHMAKER] Player ${playerId} added to pool for map "${queuedPlayer.mapId}" with class "${queuedPlayer.classId}". Queue size: ${this.getQueueSizeForMap(queuedPlayer.mapId)}`,
    );

    channel.emit("reliable_event", {
      type: "MATCHMAKING_STATUS",
      status: "QUEUED",
      mapId: queuedPlayer.mapId,
      queueSize: this.getQueueSizeForMap(queuedPlayer.mapId),
      minPlayers: 4,
      maxPlayers: 10,
    });

    // Immediate check if we hit max group size
    this.evaluatePool(queuedPlayer.mapId);
  }

  public removePlayerFromPool(playerId: string): void {
    const initialLen = this.queue.length;
    this.queue = this.queue.filter((p) => p.id !== playerId && p.reqUid !== playerId);
    if (this.queue.length < initialLen) {
      console.log(`[MATCHMAKER] Player ${playerId} removed from pool.`);
    }
  }

  public getQueueSizeForMap(mapId: string): number {
    return this.queue.filter((p) => p.mapId === mapId).length;
  }

  private evaluateAllPools(): void {
    const maps = new Set(this.queue.map((p) => p.mapId));
    maps.forEach((mapId) => this.evaluatePool(mapId));
  }

  private evaluatePool(mapId: string): void {
    const mapQueue = this.queue.filter((p) => p.mapId === mapId);
    if (mapQueue.length === 0) return;

    const now = Date.now();
    let shouldFormMatch = false;

    // Condition 1: Full lobby reached (10 players)
    if (mapQueue.length >= 10) {
      shouldFormMatch = true;
    } else {
      // Condition 2: Max wait timeout reached for any player, provided min 4 players exist
      const oldestPlayer = mapQueue.reduce((oldest, p) =>
        p.joinedTimestamp < oldest.joinedTimestamp ? p : oldest,
      );
      const waitedSeconds = (now - oldestPlayer.joinedTimestamp) / 1000;

      if (waitedSeconds >= MATCHMAKER_MAX_WAIT_SECONDS) {
        if (mapQueue.length >= 4) {
          shouldFormMatch = true;
          console.log(
            `[MATCHMAKER] Max wait timeout (${MATCHMAKER_MAX_WAIT_SECONDS}s) reached for player ${oldestPlayer.id}. Starting match with ${mapQueue.length} real players.`,
          );
        } else {
          // Timeout reached but < 4 real players present: DO NOT start match (no bot fill at pool time)
          console.log(
            `[MATCHMAKER] Timeout reached (${waitedSeconds.toFixed(1)}s) but only ${mapQueue.length} real players present (min 4 required). Waiting for more human players...`,
          );
        }
      }
    }

    if (shouldFormMatch) {
      const matchSize = Math.min(10, mapQueue.length);
      const matchedGroup = mapQueue.slice(0, matchSize);

      // Remove matched group from queue
      const matchedIds = new Set(matchedGroup.map((p) => p.id));
      this.queue = this.queue.filter((p) => !matchedIds.has(p.id));

      this.formMatch(matchedGroup, mapId);
    }
  }

  private formMatch(group: QueuedPlayer[], mapId: string): void {
    const matchId = `M_POOL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    console.log(
      `[MATCHMAKER] Forming match "${matchId}" on map "${mapId}" with ${group.length} real human players (no bots).`,
    );

    const targetRoom = matchManager.getOrCreateRoom(
      matchId,
      process.env.GEMINI_API_KEY,
      mapId,
    );

    const pendingGroup: PendingMatchGroup = {
      matchId,
      mapId,
      room: targetRoom,
      players: group,
      loadingComplete: new Set<string>(),
      countdownTimer: null,
      countdownRemaining: 10,
      hasStartedCountdown: false,
    };

    this.pendingMatches.set(matchId, pendingGroup);

    // Register players in target room & send loading instruction
    group.forEach((p) => {
      (p.channel as any).currentRoom = targetRoom;
      targetRoom.registerPlayer(p.reqUid || p.id, p.channel, null, p.classId);

      p.channel.emit("reliable_event", {
        type: "MATCH_FOUND",
        matchId,
        mapId,
        status: "LOADING_ASSETS",
      });
    });

    // Fallback: If assets loading takes longer than 6 seconds, force start pre-match countdown
    setTimeout(() => {
      const pending = this.pendingMatches.get(matchId);
      if (pending && !pending.hasStartedCountdown) {
        console.log(`[MATCHMAKER] Loading window ended for match "${matchId}". Transitioning to pre-match countdown.`);
        this.startPreMatchCountdown(pending);
      }
    }, 6000);
  }

  public signalPlayerLoadingComplete(matchId: string, playerId: string): void {
    const pending = this.pendingMatches.get(matchId);
    if (!pending) return;

    pending.loadingComplete.add(playerId);
    console.log(
      `[MATCHMAKER] Player ${playerId} loading complete for match "${matchId}" (${pending.loadingComplete.size}/${pending.players.length})`,
    );

    if (pending.loadingComplete.size >= pending.players.length && !pending.hasStartedCountdown) {
      this.startPreMatchCountdown(pending);
    }
  }

  public handlePlayerClassChange(matchId: string, playerId: string, newClassId: ClassId): void {
    const pending = this.pendingMatches.get(matchId);
    if (pending && pending.room) {
      pending.room.applyPlayerClassLoadout(playerId, newClassId);
    }
  }

  private startPreMatchCountdown(pending: PendingMatchGroup): void {
    if (pending.hasStartedCountdown) return;
    pending.hasStartedCountdown = true;
    pending.countdownRemaining = 10;

    console.log(`[MATCHMAKER] 10-second pre-match countdown started for match "${pending.matchId}". Class switching allowed.`);

    pending.room.broadcastReliableEvent({
      type: "PRE_MATCH_COUNTDOWN",
      countdownSeconds: pending.countdownRemaining,
    });

    pending.countdownTimer = setInterval(() => {
      pending.countdownRemaining--;

      if (pending.countdownRemaining > 0) {
        pending.room.broadcastReliableEvent({
          type: "PRE_MATCH_COUNTDOWN_TICK",
          countdownSeconds: pending.countdownRemaining,
        });
      } else {
        clearInterval(pending.countdownTimer);
        this.launchMatch(pending);
      }
    }, 1000);
  }

  private launchMatch(pending: PendingMatchGroup): void {
    console.log(`[MATCHMAKER] Pre-match countdown complete for "${pending.matchId}". Triggering match start with duration ${ACTIVE_GAMEMODE.matchDuration}s.`);

    pending.room.triggerStartMatch();
    this.pendingMatches.delete(pending.matchId);
  }
}

export const matchmaker = new Matchmaker();
export default matchmaker;
