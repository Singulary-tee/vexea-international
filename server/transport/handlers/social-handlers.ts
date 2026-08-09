import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState } from "../../MatchRoom";

export function registerSocialHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoom: () => MatchRoom | null,
  getPlayer: () => PlayerState | null
): void {
  const handleSocialReliableEvent = (args: any) => {
    if (!args || typeof args !== "object") return;

    const room = getRoom();
    const p = getPlayer();

    if (args.type === "CHAT_MESSAGE") {
      if (!room || !p) return;
      const message = args.message;
      if (message && typeof message === "string" && message.trim().length > 0) {
        const trimmed = message.trim().slice(0, 150);
        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "CHAT_MESSAGE",
            sender: p.id,
            message: trimmed,
          });
        }
      }
      return;
    }

    if (args.type === "QUICK_COMM") {
      if (!room || !p) return;
      const optionId = args.optionId;
      if (optionId && typeof optionId === "string") {
        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "QUICK_COMM",
            sender: p.id,
            optionId: optionId,
          });
        }
      }
      return;
    }
  };

  channel.on("reliable_event", handleSocialReliableEvent);

  // Direct event fallbacks
  channel.on("CHAT_MESSAGE", (args: any) => {
    const room = getRoom();
    const p = getPlayer();
    if (!room || !p) return;
    const message = typeof args === "string" ? args : args?.message;
    if (message && typeof message === "string" && message.trim().length > 0) {
      const trimmed = message.trim().slice(0, 150);
      for (const [id, player] of room.players.entries()) {
        player.channel.emit("reliable_event", {
          type: "CHAT_MESSAGE",
          sender: p.id,
          message: trimmed,
        });
      }
    }
  });

  channel.on("QUICK_COMM", (args: any) => {
    const room = getRoom();
    const p = getPlayer();
    if (!room || !p) return;
    const optionId = typeof args === "string" ? args : args?.optionId;
    if (optionId && typeof optionId === "string") {
      for (const [id, player] of room.players.entries()) {
        player.channel.emit("reliable_event", {
          type: "QUICK_COMM",
          sender: p.id,
          optionId: optionId,
        });
      }
    }
  });
}
