import { ChannelAdapter } from "../adapter";
import { MatchRoom, PlayerState, getWeaponReloadTicks } from "../../MatchRoom";
import { processHitscan } from "../../combat/hitscan";
import { getWeaponPerformance } from "../../../shared/constants";
import { recordHitscanRejected } from "../../sentry";

export function registerGameplayHandlers(
  channel: ChannelAdapter,
  playerId: string,
  getRoom: () => MatchRoom | null,
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
        const room = getRoom();
        if (room) {
          room.updatePlayerInput(p, inputMask, pitch, yaw);
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

    const room = getRoom();
    const p = getPlayer();
    if (!room || !p) return;
    if (!p.isAlive) return;

    const type = args.type;
    room.recordPlayerActivity(p);

    if (type === "USE_UTILITY") {
      const slot = args.slot as "utility1" | "utility2";
      if (slot) {
        room.useUtility(p.id, slot);
      }
      return;
    }

    if (type === "OBJECTIVE_HOLD") {
      room.setObjectiveHold(p.id, !!args.holding);
      return;
    }

    if (type === "TOGGLE_FIRE_MODE") {
      const primary = p.weaponState.primary;
      primary.fireMode = primary.fireMode === "auto" ? "burst" : "auto";
      p.channel.emit("reliable_event", {
        type: "FIRE_MODE_CHANGED",
        mode: primary.fireMode,
      });
      return;
    }

    if (type === "RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (!slot) return;
      const wState = p.weaponState[slot];
      const wDef = getWeaponPerformance(wState.weaponId);
      if (!wDef) return;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);

      if (!wState.isReloading && wState.currentMag < wDef.capacity && wState.reserve > 0) {
        wState.isReloading = true;
        wState.reloadTimer = reloadTicks;
      }
      p.channel.emit("reliable_event", {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary,
      });
      return;
    }

    if (type === "CANCEL_RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (!slot) return;
      const wState = p.weaponState[slot];
      if (wState.isReloading) {
        wState.isReloading = false;
        wState.reloadTimer = 0;
      }
      p.channel.emit("reliable_event", {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary,
      });
      return;
    }

    if (type === "FIRE") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (slot !== "primary" && slot !== "secondary") return;
      const wState = p.weaponState[slot];
      const weaponStats = getWeaponPerformance(wState.weaponId);
      if (!weaponStats) return;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);

      if (wState.currentMag <= 0) {
        if (!wState.isReloading && wState.reserve > 0) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
          p.channel.emit("reliable_event", {
            type: "AMMO_STATE",
            primary: p.weaponState.primary,
            secondary: p.weaponState.secondary,
          });
        }
        return;
      }
      if (wState.isReloading) return;

      const now = Date.now();
      const allowedInterval = 1000 / weaponStats.fireRateHz;

      let leakyUpdate = Math.max(
        0,
        wState.leakyBucket -
          (now - wState.lastConfirmedShotT) / allowedInterval,
      );

      if (leakyUpdate < weaponStats.capacity) {
        wState.leakyBucket = leakyUpdate + 1;
        wState.lastConfirmedShotT = now;
        p.firedThisTick = true;

        if (p.infiniteAmmo) {
          wState.currentMag = weaponStats.capacity;
        } else {
          wState.currentMag--;
        }

        if (wState.currentMag === 0 && wState.reserve > 0 && !p.infiniteAmmo) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
        }

        p.channel.emit("reliable_event", {
          type: "AMMO_STATE",
          primary: p.weaponState.primary,
          secondary: p.weaponState.secondary,
        });

        processHitscan(p, room, channel, args);
      } else {
        recordHitscanRejected("rate_limit_exceeded");
      }
      return;
    }
  };

  channel.on("reliable_event", handleReliableGameplayEvent);
}
