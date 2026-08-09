import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState } from "../../MatchRoom";
import { Matchmaker } from "../../Matchmaker";
import { ConnectionRegistry } from "../../connection-registry";
import { matchManager } from "../../MatchManager";
import { ClassId } from "../../../shared/classes";

export function registerMatchmakingHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoom: () => MatchRoom | null,
  getPlayer: () => PlayerState | null,
  matchmaker: Matchmaker,
  connectionRegistry: ConnectionRegistry
): void {
  const handleMatchmakingRequest = (args: any) => {
    const reqUid = args?.uid || playerId;
    const reqMap = args?.mapId || args?.map?.id || "map_1_facility";
    const reqClass = (args?.class || args?.playerClass || "ASSAULT") as ClassId;

    console.log(
      `[VEXEA SERVER] Player ${playerId} requesting matchmaking (Map: ${reqMap}, Class: ${reqClass}, DevQuickStart: ${!!args?.isDevQuickStart})`,
    );

    // Dev Quick Start path: create/get room directly without multi-player queue
    if (args?.isDevQuickStart) {
      const devMatchId = args?.matchId || `M_DEV_${Math.floor(Math.random() * 1000000)}`;
      console.log(`[VEXEA SERVER] Dev Quick Start match initialization: ${devMatchId} on map ${reqMap}`);
      const targetRoom = matchManager.getOrCreateRoom(devMatchId, process.env.GEMINI_API_KEY, reqMap);
      const curRoom = getRoom();
      const curPState = getPlayer();
      if (curRoom && curPState && curRoom !== targetRoom) {
        curRoom.removePlayer(curPState.id);
      }
      (channel as any).currentRoom = targetRoom;
      const newPState = targetRoom.registerPlayer(playerId, channel, null, reqClass);
      (channel as any).pState = newPState;
      if ((channel as any).onMatchFormed) {
        (channel as any).onMatchFormed(targetRoom, newPState);
      }
      return;
    }

    // No lobby room to leave. Enter matchmaking pool directly.
    // Store callback on channel so matchmaker can notify us when match forms.
    (channel as any).onMatchFormed = (room: MatchRoom, state: PlayerState) => {
      (channel as any).currentRoom = room;
      (channel as any).pState = state;
    };

    matchmaker.addPlayerToPool(playerId, reqUid, channel, reqMap, reqClass);
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
    const activeRoom = getRoom();
    const p = getPlayer();
    if (activeRoom && p) {
      activeRoom.setPlayerReady(p.id);
    }
  });

  channel.on("PLAYER_QUIT", () => {
    matchmaker.removePlayerFromPool(playerId);
    const p = getPlayer();
    const room = getRoom();
    if (p && room) {
      console.log(`Player quit mission manually: ${p.id}`);
      room.removePlayer(p.id);
    }
    try {
      channel.emit("disconnect", {});
    } catch (e) {}
  });
}
