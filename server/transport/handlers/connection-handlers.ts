import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState } from "../../MatchRoom";
import { ClassId, CLASSES } from "../../../shared/classes";
import { matchmaker } from "../../Matchmaker";

export function registerConnectionHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoom: () => MatchRoom | null,
  getPlayer: () => PlayerState | null,
  db: any,
  doc: any,
  updateDoc: any
): void {
  channel.on("ping", () => {
    channel.emit("pong", { serverTime: Date.now() });
  });

  channel.on("latency_report", (data: any) => {
    if (typeof data?.latency === "number") {
      const p = getPlayer();
      if (p) {
        p.ping = data.latency;
      }
      (channel as any).ping = data.latency;
    }
  });

  channel.on("rewarded_ad", () => {
    const p = getPlayer();
    if (p) {
      p.adMultiplier = 2;
    }
  });

  channel.on("select_class", async (args: any) => {
    const newClassId = (args?.classId || args?.class) as ClassId;
    if (newClassId && CLASSES[newClassId]) {
      const room = getRoom();
      if (args?.matchId) {
        matchmaker.handlePlayerClassChange(args.matchId, playerId, newClassId);
      } else if (room) {
        room.applyPlayerClassLoadout(playerId, newClassId);
      } else if (args?.reqUid || args?.uid) {
        const uid = args.reqUid || args.uid;
        try {
          const userRef = doc(db, "Users", uid);
          await updateDoc(userRef, { selectedClass: newClassId });
        } catch (e) {}
      }
    }
  });
}
