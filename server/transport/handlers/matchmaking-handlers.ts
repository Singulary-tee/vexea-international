import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState } from "../../MatchRoom";
import { Matchmaker } from "../../Matchmaker";
import { ConnectionRegistry } from "../../connection-registry";
import { roomAllocator } from "../../execution/RoomAllocator";
import { RoomExecution } from "../../execution/RoomExecution";
import { InProcessRoomExecution } from "../../execution/InProcessRoomExecution";
import { ForkedRoomExecution } from "../../execution/ForkedRoomExecution";
import { ClassId } from "../../../shared/classes";

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

  const handleMatchmakingRequest = async (args: any) => {
    const reqUid = args?.uid || playerId;
    const reqMap = args?.mapId || args?.map?.id || "map_1_facility";
    const reqClass = (args?.class || args?.playerClass || "ASSAULT") as ClassId;
    const reqPrimaryWeaponId = typeof args?.primaryWeaponId === "string" ? args.primaryWeaponId : undefined;
    const reqSecondaryWeaponId = typeof args?.secondaryWeaponId === "string" ? args.secondaryWeaponId : undefined;
    const reqDisplayName = args?.displayName || args?.name || args?.userName;

    console.log(
      `[VEXEA SERVER] Player ${playerId} (${reqDisplayName || "NoName"}) requesting matchmaking (Map: ${reqMap}, Class: ${reqClass}, DevQuickStart: ${!!args?.isDevQuickStart})`,
    );

    // Dev Quick Start path: create/get room directly without multi-player queue
    if (args?.isDevQuickStart) {
      const devMatchId = args?.matchId || `M_DEV_${Math.floor(Math.random() * 1000000)}`;
      console.log(`[VEXEA SERVER] Dev Quick Start match initialization: ${devMatchId} on map ${reqMap}`);
      const execution = await roomAllocator.allocate(devMatchId, process.env.GEMINI_API_KEY, reqMap);
      const isForked = execution instanceof ForkedRoomExecution;
      const targetRoom = isForked ? null : (execution as InProcessRoomExecution).getRoom();
      const curRoom = getRoom();
      const curPState = getPlayer();
      if (curRoom && curPState && curRoom !== targetRoom) {
        curRoom.removePlayer(curPState.id);
      }
      (channel as any).roomExecution = execution;
      (channel as any).currentRoom = targetRoom;

      let initialPState: any = null;
      if (isForked) {
        await (execution as ForkedRoomExecution).registerPlayer(
          playerId,
          reqClass,
          reqDisplayName,
          reqUid,
          reqPrimaryWeaponId,
          reqSecondaryWeaponId
        );
        initialPState = {
          id: playerId,
          reqUid,
          displayName: reqDisplayName || playerId,
          classId: reqClass,
          isAlive: true,
          lastSequence: 0,
        };
        (channel as any).pState = initialPState;
      } else if (targetRoom) {
        initialPState = targetRoom.registerPlayer(playerId, channel, null, reqClass, reqDisplayName, reqUid, reqPrimaryWeaponId, reqSecondaryWeaponId);
        (channel as any).pState = initialPState;
      }

      if ((channel as any).isPlayerReady) {
        execution.send(playerId, { type: "PLAYER_READY" });
        if (targetRoom) {
          targetRoom.setPlayerReady(playerId);
        }
      }

      execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === playerId) {
          if (event.type === "MATCH_FORMED") {
            if (!isForked) {
              (channel as any).currentRoom = (execution as InProcessRoomExecution).getRoom();
            }
            (channel as any).roomExecution = execution;
            (channel as any).pState = event.playerState || initialPState;
          }
        }
      });
      return;
    }

    // No lobby room to leave. Enter matchmaking pool directly.
    // Replace raw closure with RoomExecution.onOutbound subscription when match forms.
    (channel as any).bindRoomExecution = (execution: RoomExecution, state: PlayerState) => {
      (channel as any).roomExecution = execution;
      (channel as any).currentRoom = (execution as InProcessRoomExecution).getRoom ? (execution as InProcessRoomExecution).getRoom() : null;
      (channel as any).pState = state;

      execution.onOutbound((target, event) => {
        if (target === "broadcast" || target === playerId) {
          if (event.type === "MATCH_FORMED") {
            (channel as any).currentRoom = (execution as InProcessRoomExecution).getRoom ? (execution as InProcessRoomExecution).getRoom() : null;
            (channel as any).roomExecution = execution;
            (channel as any).pState = event.playerState || state;
          }
        }
      });
    };

    matchmaker.addPlayerToPool(playerId, reqUid, channel, reqMap, reqClass, reqDisplayName, reqPrimaryWeaponId, reqSecondaryWeaponId);
  };

  channel.on("start_match", handleMatchmakingRequest);
  channel.on("request_matchmaking", handleMatchmakingRequest);

  channel.on("cancel_matchmaking", () => {
    matchmaker.removePlayerFromPool(playerId);
  });

  channel.on("loading_complete", (args: any) => {
    (channel as any).loadingComplete = true;
    if (args?.matchId) {
      matchmaker.signalPlayerLoadingComplete(args.matchId, playerId);
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
    matchmaker.removePlayerFromPool(playerId);
    const p = getPlayer();
    const roomExec = getExec();
    if (p && roomExec) {
      console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
      await roomExec.send(p.id, { type: "PLAYER_QUIT" });
    } else {
      const room = getRoom();
      if (p && room) {
        console.log(`Player quit mission manually (explicit abandon): ${p.id}`);
        await room.handlePlayerAbandonment(p.id);
      }
    }
    try {
      channel.emit("disconnect", {});
    } catch (e) {}
  });
}
