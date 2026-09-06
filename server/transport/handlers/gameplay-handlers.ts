import { ChannelAdapter } from "../adapter";
import { PlayerState } from "../../MatchRoom";
import { RoomExecution } from "../../execution/RoomExecution";

export function registerGameplayHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoomExecution: () => RoomExecution | null,
  getPlayer: () => PlayerState | null
): void {
  // Raw 20Hz movement input handler
  channel.onRaw((message: any) => {
    const p = getPlayer();
    if (!p) return;
    const buffer = message as ArrayBuffer;
    if (buffer.byteLength >= 20) {
      const dataView = new DataView(buffer);
      const seq = dataView.getUint32(0, true);
      const inputMask = dataView.getUint8(4);
      const pitch = dataView.getFloat32(5, true);
      const yaw = dataView.getFloat32(9, true);

      if (seq > p.lastSequence) {
        p.lastSequence = seq;
        const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
        if (roomExec) {
          roomExec.send(p.id, {
            type: "INPUT",
            seq,
            inputMask,
            pitch,
            yaw,
          });
        } else {
          p.pitch = pitch;
          p.yaw = yaw;
          p.inputMask = inputMask;
        }
      }
    }
  });

  const handleReliableGameplayEvent = (args: any) => {
    if (!args || typeof args !== "object") return;

    const roomExec = typeof getRoomExecution === "function" ? getRoomExecution() : getRoomExecution;
    const p = getPlayer();
    if (!roomExec || !p) return;
    if (!p.isAlive) return;

    const type = args.type;

    if (type === "USE_UTILITY") {
      const slot = args.slot as "utility1" | "utility2";
      if (slot) {
        roomExec.send(p.id, { type: "USE_UTILITY", slot });
      }
      return;
    }

    if (type === "OBJECTIVE_HOLD") {
      roomExec.send(p.id, { type: "OBJECTIVE_HOLD", holding: !!args.holding });
      return;
    }

    if (type === "TOGGLE_FIRE_MODE") {
      roomExec.send(p.id, { type: "TOGGLE_FIRE_MODE" });
      return;
    }

    if (type === "RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (slot) {
        roomExec.send(p.id, { type: "RELOAD", weaponSlot: slot });
      }
      return;
    }

    if (type === "CANCEL_RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (slot) {
        roomExec.send(p.id, { type: "CANCEL_RELOAD", weaponSlot: slot });
      }
      return;
    }

    if (type === "FIRE") {
      roomExec.send(p.id, { type: "FIRE", ...args });
      return;
    }
  };

  channel.on("reliable_event", handleReliableGameplayEvent);
}
