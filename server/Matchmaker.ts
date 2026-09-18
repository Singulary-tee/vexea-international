import { ChannelAdapter } from "./transport/adapter";
import { ClassId, CLASSES, getClassWeaponId, isClassWeaponAllowed } from "../shared/classes";
import { isRuntimeWeaponId } from "../shared/constants";
import type { WeaponId } from "../shared/weapons";
import matchManager from "./MatchManager";
import { MatchRoom, PlayerState } from "./MatchRoom";
import { roomAllocator } from "./execution/RoomAllocator";
import { InProcessRoomExecution } from "./execution/InProcessRoomExecution";
import { ForkedRoomExecution } from "./execution/ForkedRoomExecution";
import { RoomExecution } from "./execution/RoomExecution";
import { connectionRegistry } from "./connection-registry";
import { ACTIVE_GAMEMODE } from "../shared/gamemode-configs";
import { MatchAbuseStore } from "./player-data/MatchAbuseStore";

// PLACEHOLDER - not specified, needs playtesting
export const MATCHMAKER_MAX_WAIT_SECONDS = 45;

// PLACEHOLDER - not specified, needs playtesting
export const MATCHMAKER_BOT_FILL_WAIT_SECONDS = 90;

export interface QueuedPlayer {
  id: string;
  reqUid: string;
  displayName?: string;
  channel: ChannelAdapter;
  joinedTimestamp: number;
  mapId: string;
  classId: ClassId;
  primaryWeaponId: WeaponId;
  secondaryWeaponId: WeaponId;
}

interface PendingMatchGroup {
  matchId: string;
  mapId: string;
  room: MatchRoom | null;
  execution: RoomExecution;
  players: QueuedPlayer[];
  loadingComplete: Set<string>;
  countdownTimer: any;
  loadingTimer: any;
  unsubscribeOutbound: (() => void) | undefined;
  countdownRemaining: number;
  hasStartedCountdown: boolean;
  cancelled: boolean;
}

interface AllocationState {
  settled: boolean;
  released: boolean;
}

export class Matchmaker {
  private queue: QueuedPlayer[] = [];
  private pendingMatches: Map<string, PendingMatchGroup> = new Map();
  private allocationStates: Map<string, AllocationState> = new Map();
  private poolInterval: any = null;
  private isShuttingDown = false;

  constructor() {
    // Run matchmaking evaluation loop every second
    this.poolInterval = setInterval(() => {
      this.evaluateAllPools();
    }, 1000);
  }

  public async addPlayerToPool(
    playerId: string,
    reqUid: string,
    channel: ChannelAdapter,
    mapId: string = "map_1_facility",
    classId: ClassId = "ASSAULT",
    displayName?: string,
    requestedPrimaryWeaponId?: string,
    requestedSecondaryWeaponId?: string,
  ): Promise<void> {
    if (this.isShuttingDown) return;

    const uid = reqUid || playerId;

    // Remove if already in queue to prevent duplicates
    this.removePlayerFromPool(playerId);
    if (uid !== playerId) this.removePlayerFromPool(uid);

    const validClassId: ClassId = CLASSES[classId] ? classId : "ASSAULT";
    const primaryWeaponId: WeaponId = requestedPrimaryWeaponId && isRuntimeWeaponId(requestedPrimaryWeaponId) && isClassWeaponAllowed(validClassId, "primary", requestedPrimaryWeaponId)
      ? requestedPrimaryWeaponId
      : getClassWeaponId(validClassId, "primary");
    const secondaryWeaponId: WeaponId = requestedSecondaryWeaponId && isRuntimeWeaponId(requestedSecondaryWeaponId) && isClassWeaponAllowed(validClassId, "secondary", requestedSecondaryWeaponId)
      ? requestedSecondaryWeaponId
      : getClassWeaponId(validClassId, "secondary");
    const queuedPlayer: QueuedPlayer = {
      id: playerId,
      reqUid: uid,
      displayName: displayName,
      channel,
      joinedTimestamp: Date.now(),
      mapId: mapId || "map_1_facility",
      classId: validClassId,
      primaryWeaponId,
      secondaryWeaponId,
    };

    const replacement = this.replacePendingPlayer(queuedPlayer);
    if (replacement instanceof Promise) {
      if (await replacement) return;
    } else if (replacement) {
      return;
    }

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

    // Check account lockout status
    MatchAbuseStore.isLockedOut(uid).then((isLocked) => {
      if (isLocked) {
        console.log(`[MATCHMAKER] Rejecting player ${playerId} (${uid}) from pool: Account locked out or banned due to match abandonment.`);
        this.removePlayerFromPool(playerId);
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "Account locked out due to match abandonment penalties.",
        });
      }
    }).catch(() => {});

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

  public shutdown(): void {
    if (this.poolInterval) clearInterval(this.poolInterval);
    this.poolInterval = null;
    this.isShuttingDown = true;
    for (const pending of this.pendingMatches.values()) this.cancelPendingMatch(pending);
    this.queue = [];
  }

  private releaseExecution(matchId: string): void {
    const state = this.allocationStates.get(matchId);
    if (state?.released) return;
    if (state) state.released = true;
    roomAllocator.release(matchId);
    if (state?.settled) this.allocationStates.delete(matchId);
  }

  private settleAllocation(matchId: string): void {
    const state = this.allocationStates.get(matchId);
    if (!state) return;
    state.settled = true;
    if (state.released) this.allocationStates.delete(matchId);
  }

  private cancelPendingMatch(pending: PendingMatchGroup, releaseExecution = true): void {
    if (this.pendingMatches.get(pending.matchId) !== pending) return;
    if (pending.countdownTimer) clearInterval(pending.countdownTimer);
    if (pending.loadingTimer) clearTimeout(pending.loadingTimer);
    pending.unsubscribeOutbound?.();
    pending.unsubscribeOutbound = undefined;
    pending.countdownTimer = null;
    pending.loadingTimer = null;
    pending.cancelled = true;
    this.pendingMatches.delete(pending.matchId);
    if (releaseExecution) {
      this.releaseExecution(pending.matchId);
    } else {
      this.allocationStates.delete(pending.matchId);
    }
  }

  private replacePendingPlayer(player: QueuedPlayer): boolean | Promise<boolean> {
    for (const pending of this.pendingMatches.values()) {
      const playerIndex = pending.players.findIndex((pendingPlayer) => pendingPlayer.reqUid === player.reqUid);
      if (playerIndex === -1) continue;
      if (!this.isExecutionUsable(pending)) {
        this.cancelPendingMatch(pending);
        continue;
      }

      const previousPlayer = pending.players[playerIndex];
      const previousChannel = previousPlayer.channel as any;
      const previousRegistryIds = new Set<string>([
        previousPlayer.reqUid || previousPlayer.id,
        previousPlayer.id,
        previousChannel.connectionRegistryPlayerId,
      ].filter((id): id is string => Boolean(id)));
      const rollbackReplacement = (): void => {
        const replacementChannel = player.channel as any;
        const replacementRegistryIds = new Set<string>([
          player.reqUid || player.id,
          player.id,
          replacementChannel.connectionRegistryPlayerId,
        ].filter((id): id is string => Boolean(id)));
        for (const registryId of replacementRegistryIds) {
          connectionRegistry.unregister(registryId, player.channel);
        }
        for (const registryId of previousRegistryIds) {
          connectionRegistry.register(registryId, previousPlayer.channel);
        }
      };
      const commitReplacement = (playerState: PlayerState | null): boolean => {
        if (pending.cancelled || this.pendingMatches.get(pending.matchId) !== pending) {
          rollbackReplacement();
          return true;
        }

        const previousCleanup = previousChannel.roomExecutionOutboundCleanup;
        if (typeof previousCleanup === "function") previousCleanup();
        previousChannel.roomExecutionOutboundCleanup = undefined;
        for (const registryId of previousRegistryIds) {
          connectionRegistry.unregister(registryId, previousPlayer.channel);
        }
        if (previousChannel.roomExecution === pending.execution) {
          previousChannel.roomExecution = undefined;
          previousChannel.currentRoom = null;
          previousChannel.pState = undefined;
          previousChannel.connectionRegistryPlayerId = undefined;
        }

        pending.players[playerIndex] = player;
        pending.loadingComplete.delete(previousPlayer.id);
        pending.loadingComplete.delete(previousPlayer.reqUid);
        (player.channel as any).roomExecution = pending.execution;
        (player.channel as any).currentRoom = pending.room;
        const bindRoomExecution = (player.channel as any).bindRoomExecution;
        if (bindRoomExecution && typeof bindRoomExecution === "function") {
          bindRoomExecution(pending.execution, playerState);
        }
        player.channel.emit("reliable_event", {
          type: "MATCH_FOUND",
          matchId: pending.matchId,
          mapId: pending.mapId,
          status: "LOADING_ASSETS",
        });
        return true;
      };

      let playerState: PlayerState | null = null;
      if (pending.room) {
        try {
          playerState = pending.room.registerPlayer(
            player.reqUid || player.id,
            player.channel,
            null,
            player.classId,
            player.displayName,
            player.reqUid,
            player.primaryWeaponId,
            player.secondaryWeaponId,
          );
        } catch (error) {
          rollbackReplacement();
          console.error(`[MATCHMAKER] Failed to rebind replacement transport for ${player.reqUid}:`, error);
          return true;
        }
      } else if (pending.execution instanceof ForkedRoomExecution) {
        playerState = {
          id: player.reqUid || player.id,
          reqUid: player.reqUid,
          displayName: player.displayName || player.reqUid || player.id,
          classId: player.classId,
          isAlive: true,
          lastSequence: 0,
        } as PlayerState;

        let registration: Promise<void>;
        try {
          registration = pending.execution.registerPlayer(
            player.reqUid || player.id,
            player.classId,
            player.displayName,
            player.reqUid,
            player.primaryWeaponId,
            player.secondaryWeaponId,
            player.channel.id,
            player.channel,
          );
        } catch (error) {
          rollbackReplacement();
          console.error(`[MATCHMAKER] Failed to rebind replacement transport for ${player.reqUid}:`, error);
          return true;
        }
        return Promise.resolve(registration).then(
          () => commitReplacement(playerState),
          (error) => {
            rollbackReplacement();
            console.error(`[MATCHMAKER] Failed to rebind replacement transport for ${player.reqUid}:`, error);
            return true;
          },
        );
      }

      return commitReplacement(playerState);
    }
    return false;
  }

  private isExecutionUsable(pending: PendingMatchGroup): boolean {
    const status = (pending.execution as any)?.currentStatus;
    return status !== "ending" && status !== "crashed";
  }

  private evaluateAllPools(): void {
    const maps = new Set(this.queue.map((p) => p.mapId));
    maps.forEach((mapId) => this.evaluatePool(mapId));

    // Live queue-size push updates to all players currently waiting in queue
    for (const queuedPlayer of this.queue) {
      queuedPlayer.channel.emit("reliable_event", {
        type: "MATCHMAKING_STATUS",
        status: "QUEUED",
        mapId: queuedPlayer.mapId,
        queueSize: this.getQueueSizeForMap(queuedPlayer.mapId),
        minPlayers: 4,
        maxPlayers: 10,
      });
    }
  }

  private evaluatePool(mapId: string): void {
    const mapQueue = this.queue.filter((p) => p.mapId === mapId);
    if (mapQueue.length === 0) return;

    const now = Date.now();
    let shouldFormMatch = false;
    let botCount = 0;

    // Condition 1: Full lobby reached (10 players)
    if (mapQueue.length >= 10) {
      shouldFormMatch = true;
      botCount = 0;
    } else {
      // Condition 2: Max wait timeout reached for any player, provided min 4 players exist
      const oldestPlayer = mapQueue.reduce((oldest, p) =>
        p.joinedTimestamp < oldest.joinedTimestamp ? p : oldest,
      );
      const waitedSeconds = (now - oldestPlayer.joinedTimestamp) / 1000;

      if (waitedSeconds >= MATCHMAKER_MAX_WAIT_SECONDS) {
        if (mapQueue.length >= 4) {
          shouldFormMatch = true;
          botCount = 0;
          console.log(
            `[MATCHMAKER] Max wait timeout (${MATCHMAKER_MAX_WAIT_SECONDS}s) reached for player ${oldestPlayer.id}. Starting match with ${mapQueue.length} real players.`,
          );
        } else if (waitedSeconds >= MATCHMAKER_BOT_FILL_WAIT_SECONDS) {
          // Condition 3: Bot-fill fallback timeout reached with < 4 real players
          shouldFormMatch = true;
          botCount = 4 - mapQueue.length;
          console.log(
            `[MATCHMAKER] Bot-fill timeout (${MATCHMAKER_BOT_FILL_WAIT_SECONDS}s) reached for player ${oldestPlayer.id}. Starting match with ${mapQueue.length} real players and ${botCount} bots.`,
          );
        } else {
          // Timeout reached but < 4 real players present: waiting for bot-fill threshold
          console.log(
            `[MATCHMAKER] First-tier timeout reached (${waitedSeconds.toFixed(1)}s) but only ${mapQueue.length} real players present (min 4 required). Waiting for more human players or bot-fill threshold (${MATCHMAKER_BOT_FILL_WAIT_SECONDS}s)...`,
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

      this.formMatch(matchedGroup, mapId, botCount);
    }
  }

  private async formMatch(group: QueuedPlayer[], mapId: string, botCount: number = 0): Promise<void> {
    const matchId = `M_POOL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.allocationStates.set(matchId, { settled: false, released: false });
    if (botCount > 0) {
      console.log(
        `[MATCHMAKER] Forming bot-filled match "${matchId}" on map "${mapId}" with ${group.length} real human players and ${botCount} bots (total: ${group.length + botCount}).`,
      );
    } else {
      console.log(
        `[MATCHMAKER] Forming match "${matchId}" on map "${mapId}" with ${group.length} real human players (no bots).`,
      );
    }

    let allocPromise: Promise<RoomExecution>;
    try {
      allocPromise = roomAllocator.allocate(matchId, process.env.GEMINI_API_KEY, mapId);
    } catch (error) {
      this.settleAllocation(matchId);
      this.releaseExecution(matchId);
      return;
    }
    let immediateExec = roomAllocator.getExecution(matchId);
    if (!immediateExec) {
      try {
        immediateExec = await allocPromise;
      } catch (error) {
        console.error(`[MATCHMAKER] Failed to allocate execution for ${matchId}:`, error);
        this.settleAllocation(matchId);
        this.releaseExecution(matchId);
        return;
      }
      this.settleAllocation(matchId);
    }
    if (!immediateExec) {
      this.releaseExecution(matchId);
      return;
    }
    if (this.isShuttingDown) {
      await allocPromise.catch(() => undefined);
      this.settleAllocation(matchId);
      this.releaseExecution(matchId);
      return;
    }
    const execution = immediateExec;
    const isForked = execution instanceof ForkedRoomExecution;
    const targetRoom = (!isForked && execution instanceof InProcessRoomExecution) ? execution.getRoom() : null;

    if (targetRoom) {
      // Register bot players if fallback triggered
      for (let i = 0; i < botCount; i++) {
        if (typeof targetRoom.registerBotPlayer === "function") {
          targetRoom.registerBotPlayer();
        }
      }
    }

    const pendingGroup: PendingMatchGroup = {
      matchId,
      mapId,
      room: targetRoom,
      execution,
      players: group,
      loadingComplete: new Set<string>(),
      countdownTimer: null,
      loadingTimer: null,
      unsubscribeOutbound: undefined,
      countdownRemaining: 10,
      hasStartedCountdown: false,
      cancelled: false,
    };

    this.pendingMatches.set(matchId, pendingGroup);
    pendingGroup.unsubscribeOutbound = execution.onOutbound((_target, event) => {
      if (event.type === "DISCONNECT" && event.reason === "ROOM_CRASHED") {
        this.cancelPendingMatch(pendingGroup);
      }
    });

    if (botCount > 0 && isForked) {
      await execution.spawnBots(botCount);
      if (this.pendingMatches.get(matchId) !== pendingGroup) {
        await allocPromise.catch(() => undefined);
        this.settleAllocation(matchId);
        return;
      }
    }

    // Register players in target room & send loading instruction
    for (const p of group) {
      const prevRoom = (p.channel as any).currentRoom;
      if (prevRoom && prevRoom !== targetRoom && targetRoom) {
        prevRoom.removePlayer(p.reqUid || p.id);
      }

      (p.channel as any).roomExecution = execution;
      (p.channel as any).currentRoom = targetRoom;
      let newPState: PlayerState | null = null;
      if (targetRoom) {
        newPState = targetRoom.registerPlayer(p.reqUid || p.id, p.channel, null, p.classId, p.displayName, p.reqUid, p.primaryWeaponId, p.secondaryWeaponId);
      } else if (execution instanceof ForkedRoomExecution) {
        const roomPlayerId = p.reqUid || p.id;
        await execution.registerPlayer(
          roomPlayerId,
          p.classId,
          p.displayName,
          p.reqUid,
          p.primaryWeaponId,
          p.secondaryWeaponId,
          p.channel.id,
          p.channel,
        );
        newPState = {
          id: roomPlayerId,
          reqUid: p.reqUid,
          displayName: p.displayName || roomPlayerId,
          classId: p.classId,
          isAlive: true,
          lastSequence: 0,
        } as PlayerState;
      }

      if (this.pendingMatches.get(matchId) !== pendingGroup) {
        await allocPromise.catch(() => undefined);
        this.settleAllocation(matchId);
        return;
      }

      // Notify connection handler that match has formed
      const bindRoomExecution = (p.channel as any).bindRoomExecution;
      if (bindRoomExecution && typeof bindRoomExecution === "function") {
        bindRoomExecution(execution, newPState);
      }
      const onMatchFormed = (p.channel as any).onMatchFormed;
      if (onMatchFormed && typeof onMatchFormed === "function") {
        onMatchFormed(targetRoom, newPState);
      }

      p.channel.emit("reliable_event", {
        type: "MATCH_FOUND",
        matchId,
        mapId,
        status: "LOADING_ASSETS",
      });
    }

    // Fallback: If assets loading takes longer than 6 seconds, force start pre-match countdown
    pendingGroup.loadingTimer = setTimeout(() => {
      const pending = this.pendingMatches.get(matchId);
      if (pending && !pending.hasStartedCountdown) {
        console.log(`[MATCHMAKER] Loading window ended for match "${matchId}". Transitioning to pre-match countdown.`);
        this.startPreMatchCountdown(pending);
      }
    }, 6000);

    // Wait for full allocation if async
    await allocPromise.catch(() => undefined);
    this.settleAllocation(matchId);
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
    } else if (pending) {
      void pending.execution.send(playerId, { type: "SELECT_CLASS", classId: newClassId });
    }
  }

  private broadcastPendingEvent(pending: PendingMatchGroup, event: any): void {
    if (!this.isExecutionUsable(pending)) {
      this.cancelPendingMatch(pending);
      return;
    }
    if (pending.players.length > 0 && !pending.players.some((player) => player.channel.connected !== false)) {
      this.cancelPendingMatch(pending);
      return;
    }
    if (pending.room) {
      pending.room.broadcastReliableEvent(event);
    } else {
      const connectedPlayers = pending.players.filter((player) => player.channel.connected !== false);
      if (connectedPlayers.length === 0) {
        this.cancelPendingMatch(pending);
        return;
      }
      for (const player of connectedPlayers) {
        try {
          player.channel.emit("reliable_event", event);
        } catch (e) {}
      }
      if (!pending.players.some((player) => player.channel.connected !== false)) {
        this.cancelPendingMatch(pending);
      }
    }
  }

  private startPreMatchCountdown(pending: PendingMatchGroup): void {
    if (pending.hasStartedCountdown) return;
    if (pending.cancelled) return;
    if (!this.isExecutionUsable(pending)) {
      this.cancelPendingMatch(pending);
      return;
    }
    if (pending.players.length > 0 && !pending.players.some((player) => player.channel.connected !== false)) {
      this.cancelPendingMatch(pending);
      return;
    }
    pending.hasStartedCountdown = true;
    pending.countdownRemaining = 10;
    if (pending.loadingTimer) {
      clearTimeout(pending.loadingTimer);
      pending.loadingTimer = null;
    }

    console.log(`[MATCHMAKER] 10-second pre-match countdown started for match "${pending.matchId}". Class switching allowed.`);

    this.broadcastPendingEvent(pending, {
      type: "PRE_MATCH_COUNTDOWN",
      countdownSeconds: pending.countdownRemaining,
    });

    if (
      this.pendingMatches.get(pending.matchId) !== pending
      || (pending.players.length > 0 && !pending.players.some((player) => player.channel.connected !== false))
    ) {
      this.cancelPendingMatch(pending);
      return;
    }

    pending.countdownTimer = setInterval(() => {
      if (!this.isExecutionUsable(pending)) {
        this.cancelPendingMatch(pending);
        return;
      }
      pending.countdownRemaining--;

      if (pending.countdownRemaining > 0) {
        this.broadcastPendingEvent(pending, {
          type: "PRE_MATCH_COUNTDOWN_TICK",
          countdownSeconds: pending.countdownRemaining,
        });
      } else {
        clearInterval(pending.countdownTimer);
        pending.countdownTimer = null;
        this.launchMatch(pending);
      }
    }, 1000);
  }

  private launchMatch(pending: PendingMatchGroup): void {
    if (pending.cancelled) return;
    const registeredPending = this.pendingMatches.get(pending.matchId);
    if (registeredPending && registeredPending !== pending) return;
    if (pending.players.length > 0 && !pending.players.some((player) => player.channel.connected !== false)) {
      this.cancelPendingMatch(pending);
      return;
    }
    if (!this.isExecutionUsable(pending)) {
      this.cancelPendingMatch(pending);
      return;
    }
    console.log(`[MATCHMAKER] Pre-match countdown complete for "${pending.matchId}". Triggering match start with duration ${ACTIVE_GAMEMODE.matchDuration}s.`);

    if (pending.room) {
      pending.room.triggerStartMatch();
    } else {
      void pending.execution.send("broadcast", { type: "START_MATCH" });
    }
    this.cancelPendingMatch(pending, false);
  }
}

export const matchmaker = new Matchmaker();
export default matchmaker;
