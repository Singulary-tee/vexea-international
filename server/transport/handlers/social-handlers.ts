import { ChannelAdapter } from "../adapter";
import { PlayerState } from "../../MatchRoom";
import { RoomExecution } from "../../execution/RoomExecution";

export function registerSocialHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoomExecution: () => RoomExecution | null,
  getPlayer: () => PlayerState | null
): void {
  const handleSocialReliableEvent = (args: any) => {
    if (!args || typeof args !== "object") return;

    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();

    if (args.type === "CHAT_MESSAGE") {
      if (!roomExec) return;
      const message = args.message;
      if (message && typeof message === "string" && message.trim().length > 0) {
        const trimmed = message.trim().slice(0, 150);
        const sender = p?.displayName || p?.id || playerId;
        roomExec.send("broadcast", {
          type: "CHAT_MESSAGE",
          sender,
          message: trimmed,
        });
      }
      return;
    }

    if (args.type === "QUICK_COMM") {
      if (!roomExec) return;
      const optionId = args.optionId;
      if (optionId && typeof optionId === "string") {
        const sender = p?.displayName || p?.id || playerId;
        roomExec.send("broadcast", {
          type: "QUICK_COMM",
          sender,
          optionId,
        });
      }
      return;
    }
  };

  channel.on("reliable_event", handleSocialReliableEvent);

  // Direct event fallbacks
  channel.on("CHAT_MESSAGE", (args: any) => {
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec) return;
    const message = typeof args === "string" ? args : args?.message;
    if (message && typeof message === "string" && message.trim().length > 0) {
      const trimmed = message.trim().slice(0, 150);
      const sender = p?.displayName || p?.id || playerId;
      roomExec.send("broadcast", {
        type: "CHAT_MESSAGE",
        sender,
        message: trimmed,
      });
    }
  });

  channel.on("QUICK_COMM", (args: any) => {
    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec) return;
    const optionId = typeof args === "string" ? args : args?.optionId;
    if (optionId && typeof optionId === "string") {
      const sender = p?.displayName || p?.id || playerId;
      roomExec.send("broadcast", {
        type: "QUICK_COMM",
        sender,
        optionId,
      });
    }
  });
}
