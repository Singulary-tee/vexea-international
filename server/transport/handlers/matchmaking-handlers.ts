import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState } from "../../MatchRoom";
import { Matchmaker } from "../../Matchmaker";
import { ConnectionRegistry } from "../../connection-registry";
import { roomAllocator } from "../../execution/RoomAllocator";
import { RoomExecution } from "../../execution/RoomExecution";
import { InProcessRoomExecution } from "../../execution/InProcessRoomExecution";
import { ForkedRoomExecution } from "../../execution/ForkedRoomExecution";
import { ClassId } from "../../../shared/classes";
import { getAuth } from "firebase-admin/auth";

export function registerMatchmakingHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoom: () => MatchRoom | null,
  getPlayer: () => PlayerState | null,
  matchmaker: Matchmaker,
  connectionRegistry: ConnectionRegistry,
  getRoomExecution?: () => RoomExecution | null
): void {
  const getExec = (): RoomExecution | null => {
    if (getRoomExecution) return getRoomExecution();
    return (channel as any).roomExecution || null;
  };

  const disposeOutboundSubscription = (): void => {
    const unsubscribe = (channel as any).roomExecutionOutboundCleanup;
    if (typeof unsubscribe === "function") unsubscribe();
    (channel as any).roomExecutionOutboundCleanup = undefined;
  };

  const bindChannelToPlayer = (execution: RoomExecution, state: any) => {
    const room = typeof (execution as any).getRoom === "function"
      ? (execution as any).getRoom()
      : null;
    const playerState = state || room?.players?.get?.(state?.id || playerId) || {
      id: playerId,
      reqUid: playerId,
      isAlive: true,
      lastSequence: 0,
    };
    const roomPlayerId = playerState.id || playerId;

    (channel as any).roomExecution = execution;
    (channel as any).currentRoom = room;
    (channel as any).pState = playerState;
    (channel as any).connectionRegistryPlayerId = roomPlayerId;
    connectionRegistry.register(roomPlayerId, channel);
    if (roomPlayerId !== playerId) {
      connectionRegistry.unregister?.(playerId, channel);
    }
  };

  const handleMatchmakingRequest = async (args: any) => {
    disposeOutboundSubscription();
    let reqUid = args?.uid || playerId;
    const providedToken = typeof args?.authToken === "string" ? args.authToken : (typeof args?.idToken === "string" ? args.idToken : null);
    if (providedToken) {
      try {
        const decoded = await getAuth().verifyIdToken(providedToken);
        reqUid = decoded.uid;
      } catch (err) {
        console.warn(`[VEXEA SERVER] Failed to verify authToken for socket ${playerId}:`, err);
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "Authentication token verification failed.",
        });
        return;
      }
    }
    const reqMap = args?.mapId || args?.map?.id || "map_1_facility";
    const reqClass = (args?.class || args?.playerClass || "ASSAULT") as ClassId;
    const reqPrimaryWeaponId = typeof args?.primaryWeaponId === "string" ? args.primaryWeaponId : undefined;
    const reqSecondaryWeaponId = typeof args?.secondaryWeaponId === "string" ? args.secondaryWeaponId : undefined;
    const reqDisplayName = args?.displayName || args?.name || args?.userName;

    console.log(
      `[VEXEA SERVER] Player ${playerId} (${reqDisplayName || "NoName"}) requesting matchmaking (Map: ${reqMap}, Class: ${reqClass}, DevQuickStart: ${!!args?.isDevQuickStart})`,
    );

    // A reconnect must rebind the existing room player, never enqueue a second player.
    const requestedMatchId = typeof args?.matchId === "string" ? args.matchId : "";
    if (requestedMatchId && !args?.isDevQuickStart) {
      const execution = roomAllocator.getExecution(requestedMatchId)
        || (getExec()?.roomId === requestedMatchId ? getExec() : null);
      if (!execution) {
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "The requested match is no longer available.",
        });
        return;
      }

      const status = typeof execution.getStatus === "function"
        ? await execution.getStatus()
        : "active";
      if (status === "ending" || status === "crashed") {
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "The requested match is no longer active.",
        });
        return;
      }

      const accepted = await execution.reconnectPlayer(reqUid, reqUid, channel);
      if (!accepted) {
        channel.emit("reliable_event", {
          type: "MATCHMAKING_ERROR",
          message: "The player identity could not be rebound to this match.",
        });
        return;
      }

      const room = typeof (execution as any).getRoom === "function"
        ? (execution as any).getRoom()
        : null;
      const state = room?.players?.get?.(reqUid) || {
        id: reqUid,
        reqUid,
        isAlive: true,
        lastSequence: 0,
      };
      bindChannelToPlayer(execution, state);
      matchmaker.removePlayerFromPool(playerId);
      matchmaker.removePlayerFromPool(reqUid);
      return;
    }

    // Dev Quick Start path: create/get room directly without multi-player queue
    if (args?.isDevQuickStart) {
      const devMatchId = args?.matchId || `M_DEV_${Math.floor(Math.random() * 1000000)}`;
      const roomPlayerId = reqUid;
      console.log(`[VEXEA SERVER] Dev Quick Start match initialization: ${devMatchId} on map ${reqMap}`);
      const execution = await roomAllocator.allocate(devMatchId, process.env.GEMINI_API_KEY, reqMap);
      const isForked = execution instanceof ForkedRoomExecution;
      const targetRoom = isForked ? null : (execution as InProcessRoomExecution).getRoom();
      const curRoom = getRoom();
      const curPState = getPlayer();
      const previousExecution = getExec();
      if (curRoom && curPState && curRoom !== targetRoom) {
        curRoom.removePlayer(curPState.id);
      } else if (!curRoom && curPState && previousExecution && previousExecution !== execution) {
        await previousExecution.send(curPState.id, { type: "REMOVE_PLAYER" });
      }
      (channel as any).roomExecution = execution;
      (channel as any).currentRoom = targetRoom;

      let initialPState: any = null;
      if (isForked) {
        await (execution as ForkedRoomExecution).registerPlayer(
          roomPlayerId,
          reqClass,
          reqDisplayName,
          reqUid,
          reqPrimaryWeaponId,
          reqSecondaryWeaponId,
          channel.id,
          channel,
        );
        initialPState = {
          id: roomPlayerId,
          reqUid,
          displayName: reqDisplayName || roomPlayerId,
          classId: reqClass,
          isAlive: true,
          lastSequence: 0,
        };
        (channel as any).pState = initialPState;
      } else if (targetRoom) {
        initialPState = targetRoom.registerPlayer(roomPlayerId, channel, null, reqClass, reqDisplayName, reqUid, reqPrimaryWeaponId, reqSecondaryWeaponId);
        (channel as any).pState = initialPState;
      }
      bindChannelToPlayer(execution, initialPState);

      if ((channel as any).isPlayerReady) {
        execution.send(roomPlayerId, { type: "PLAYER_READY" });
        if (targetRoom) {
          targetRoom.setPlayerReady(roomPlayerId);
        }
      }

      (channel as any).roomExecutionOutboundCleanup = execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === roomPlayerId) {
          if (event.type === "MATCH_FORMED") {
            if (!isForked) {
              (channel as any).currentRoom = (execution as InProcessRoomExecution).getRoom();
            }
            (channel as any).roomExecution = execution;
            (channel as any).pState = event.playerState || initialPState;
            disposeOutboundSubscription();
          }
        }
      });
      return;
    }

    // No lobby room to leave. Enter matchmaking pool directly.
    // Replace raw closure with RoomExecution.onOutbound subscription when match forms.
    (channel as any).bindRoomExecution = (execution: RoomExecution, state: PlayerState) => {
      disposeOutboundSubscription();
      bindChannelToPlayer(execution, state);

      (channel as any).roomExecutionOutboundCleanup = execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === playerId) {
          if (event.type === "MATCH_FORMED") {
            bindChannelToPlayer(execution, event.playerState || state);
            disposeOutboundSubscription();
          }
        }
      });
    };

    matchmaker.addPlayerToPool(playerId, reqUid, channel, reqMap, reqClass, reqDisplayName, reqPrimaryWeaponId, reqSecondaryWeaponId);
  };

  channel.on("start_match", handleMatchmakingRequest);
  channel.on("request_matchmaking", handleMatchmakingRequest);

  channel.on("cancel_matchmaking", () => {
    disposeOutboundSubscription();
    matchmaker.removePlayerFromPool(playerId);
    matchmaker.removePlayerFromPool((channel as any).pState?.reqUid || playerId);
  });

  channel.on("loading_complete", (args: any) => {
    (channel as any).loadingComplete = true;
    if (args?.matchId) {
      matchmaker.signalPlayerLoadingComplete(
        args.matchId,
        (channel as any).pState?.id || playerId,
      );
    }
  });

  channel.on("player_ready", () => {
    (channel as any).isPlayerReady = true;
    const roomExec = getExec();
    const p = getPlayer();
    if (roomExec && p) {
      roomExec.send(p.id, { type: "PLAYER_READY" });
    } else if (roomExec) {
      roomExec.send(playerId, { type: "PLAYER_READY" });
    } else {
      const activeRoom = getRoom();
      if (activeRoom && p) {
        activeRoom.setPlayerReady(p.id);
      }
    }
  });

  channel.on("PLAYER_QUIT", async () => {
    disposeOutboundSubscription();
    matchmaker.removePlayerFromPool(playerId);
    const p = getPlayer();
    const roomExec = getExec();
    if (p && roomExec) {
      console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
      await roomExec.send(p.id, { type: "PLAYER_QUIT", channelId: channel.id });
    } else {
      const room = getRoom();
      if (p && room) {
        console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
        await room.handlePlayerAbandonment(p.id, p.channel);
      }
    }
    try {
      channel.emit("disconnect", {});
    } catch (e) {}
  });

  channel.onDisconnect(() => {
    disposeOutboundSubscription();
  });
}
