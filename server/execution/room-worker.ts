import RAPIER from "@dimforge/rapier3d-compat";
import { MatchRoom, PlayerState, getWeaponReloadTicks } from "../MatchRoom";
import { ChannelAdapter } from "../transport/adapter";
import { ParentToChildMessage, ChildToParentMessage } from "./protocol";
import { RoomInboundEvent, RoomOutboundEvent } from "./RoomExecution";
import { getWeaponPerformance } from "../../shared/constants";
import { processHitscan } from "../combat/hitscan";
import { recordHitscanRejected } from "../sentry";
import "../benchmark/telemetry";

let currentRoom: MatchRoom | null = null;
const channels = new Map<string, ChildChannelAdapter>();

class ChildChannelAdapter implements ChannelAdapter {
  public id: string;
  public connected: boolean = true;
  private disconnectListeners: (() => void)[] = [];
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private rawListeners: ((buf: ArrayBuffer) => void)[] = [];

  constructor(id: string) {
    this.id = id;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectListeners.push(callback);
  }

  on(event: string, callback: (data: unknown) => void): void {
    const list = this.eventListeners.get(event) || [];
    list.push(callback);
    this.eventListeners.set(event, list);
  }

  onRaw(callback: (buffer: ArrayBuffer) => void): void {
    this.rawListeners.push(callback);
  }

  emit(event: string, data: unknown, options?: { reliable?: boolean }): void {
    if (process.send) {
      process.send({
        type: "emit_channel",
        playerId: this.id,
        eventName: event,
        data,
        options,
      } as ChildToParentMessage);
    }
  }

  rawEmit(buffer: ArrayBuffer): void {
    if (process.send) {
      process.send({
        type: "raw_emit_channel",
        playerId: this.id,
        buffer: Buffer.from(buffer),
      } as ChildToParentMessage);
    }
  }

  removeAllListeners(): void {
    this.disconnectListeners = [];
    this.eventListeners.clear();
    this.rawListeners = [];
  }

  triggerDisconnect(): void {
    this.connected = false;
    for (const cb of this.disconnectListeners) {
      try {
        cb();
      } catch (e) {}
    }
  }
}

function getOrCreateChannel(playerId: string): ChildChannelAdapter {
  let ch = channels.get(playerId);
  if (!ch) {
    ch = new ChildChannelAdapter(playerId);
    channels.set(playerId, ch);
  }
  return ch;
}

async function handleInit(msg: Extract<ParentToChildMessage, { type: "init" }>) {
  try {
    await RAPIER.init();
    const room = new MatchRoom(msg.roomId, msg.geminiKey, msg.mapId);
    currentRoom = room;

    room.onShutdown = (id: string) => {
      if (process.send) {
        process.send({
          type: "shutdown",
          roomId: id,
        } as ChildToParentMessage);
      }
      setTimeout(() => process.exit(0), 50);
    };

    if (process.send) {
      process.send({
        type: "ready",
        roomId: msg.roomId,
        pid: process.pid,
      } as ChildToParentMessage);
    }
  } catch (err: any) {
    console.error(`[room-worker] Failed to initialize room ${msg.roomId}:`, err);
    if (process.send) {
      process.send({
        type: "error",
        roomId: msg.roomId,
        error: err?.message || String(err),
      } as ChildToParentMessage);
    }
    process.exit(1);
  }
}

async function handleRegisterPlayer(msg: Extract<ParentToChildMessage, { type: "register_player" }>) {
  if (!currentRoom) return;
  const ch = getOrCreateChannel(msg.playerId);
  currentRoom.registerPlayer(
    msg.playerId,
    ch,
    null,
    msg.classId as any,
    msg.displayName,
    msg.reqUid,
    msg.primaryWeaponId,
    msg.secondaryWeaponId
  );
}

async function handleRemovePlayer(msg: Extract<ParentToChildMessage, { type: "remove_player" }>) {
  if (!currentRoom) return;
  currentRoom.removePlayer(msg.playerId);
  const ch = channels.get(msg.playerId);
  if (ch) {
    ch.triggerDisconnect();
    channels.delete(msg.playerId);
  }
}

async function handleInbound(msg: Extract<ParentToChildMessage, { type: "inbound" }>) {
  if (!currentRoom) return;
  const room = currentRoom;
  const playerId = msg.playerId;
  const event = msg.event;

  if (playerId === "broadcast" || event.type === "CHAT_MESSAGE" || event.type === "QUICK_COMM") {
    if (event.type === "CHAT_MESSAGE") {
      const message = event.message;
      if (message && typeof message === "string" && message.trim().length > 0) {
        const trimmed = message.trim().slice(0, 150);
        const p = playerId !== "broadcast" ? room.players.get(playerId) : null;
        const senderName = event.sender || p?.displayName || (playerId !== "broadcast" ? playerId : "System");

        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: "broadcast",
            event: {
              type: "CHAT_MESSAGE",
              sender: senderName,
              message: trimmed,
            },
          } as ChildToParentMessage);
        }

        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "CHAT_MESSAGE",
            sender: senderName,
            message: trimmed,
          });
        }
      }
      return;
    }

    if (event.type === "QUICK_COMM") {
      const optionId = event.optionId;
      if (optionId && typeof optionId === "string") {
        const p = playerId !== "broadcast" ? room.players.get(playerId) : null;
        const senderName = event.sender || p?.displayName || (playerId !== "broadcast" ? playerId : "System");

        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: "broadcast",
            event: {
              type: "QUICK_COMM",
              sender: senderName,
              optionId,
            },
          } as ChildToParentMessage);
        }

        for (const [id, player] of room.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "QUICK_COMM",
            sender: senderName,
            optionId,
          });
        }
      }
      return;
    }
  }

  let p = room.players.get(playerId);
  if (!p) {
    if (event.type === "PLAYER_QUIT") {
      await room.handlePlayerAbandonment(playerId);
      return;
    } else if (event.type === "PLAYER_DISCONNECT") {
      room.handlePlayerDisconnect(playerId);
      return;
    } else if (event.type === "REGISTER_PLAYER") {
      const ch = getOrCreateChannel(playerId);
      p = room.registerPlayer(
        playerId,
        ch,
        null,
        event.classId,
        event.displayName,
        event.reqUid,
        event.primaryWeaponId,
        event.secondaryWeaponId
      );
    } else {
      // Auto-provision channel if incoming gameplay action
      const ch = getOrCreateChannel(playerId);
      p = room.registerPlayer(playerId, ch);
    }
  }

  if (!p) return;
  room.recordPlayerActivity(p);

  switch (event.type) {
    case "INPUT": {
      room.updatePlayerInput(p, event.inputMask, event.pitch, event.yaw);
      break;
    }
    case "USE_UTILITY": {
      if (p.isAlive && (event.slot === "utility1" || event.slot === "utility2")) {
        room.useUtility(p.id, event.slot);
      }
      break;
    }
    case "OBJECTIVE_HOLD": {
      if (p.isAlive) {
        room.setObjectiveHold(p.id, !!event.holding);
      }
      break;
    }
    case "PLAYER_READY": {
      room.setPlayerReady(p.id);
      break;
    }
    case "PLAYER_QUIT": {
      await room.handlePlayerAbandonment(p.id);
      break;
    }
    case "PLAYER_DISCONNECT": {
      room.handlePlayerDisconnect(p.id);
      break;
    }
    case "SELECT_CLASS": {
      room.applyPlayerClassLoadout(p.id, event.classId);
      break;
    }
    case "REMOVE_PLAYER": {
      room.removePlayer(p.id);
      break;
    }
    case "TOGGLE_FIRE_MODE": {
      if (!p.isAlive) break;
      const primary = p.weaponState.primary;
      primary.fireMode = primary.fireMode === "auto" ? "burst" : "auto";
      const evt: RoomOutboundEvent = {
        type: "FIRE_MODE_CHANGED",
        mode: primary.fireMode,
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt,
        } as ChildToParentMessage);
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "RELOAD": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot as "primary" | "secondary";
      if (!slot) break;
      const wState = p.weaponState[slot];
      const wDef = getWeaponPerformance(wState.weaponId);
      if (!wDef) break;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);

      if (!wState.isReloading && wState.currentMag < wDef.capacity && wState.reserve > 0) {
        wState.isReloading = true;
        wState.reloadTimer = reloadTicks;
      }
      const evt: RoomOutboundEvent = {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary,
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt,
        } as ChildToParentMessage);
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "CANCEL_RELOAD": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot as "primary" | "secondary";
      if (!slot) break;
      const wState = p.weaponState[slot];
      if (wState.isReloading) {
        wState.isReloading = false;
        wState.reloadTimer = 0;
      }
      const evt: RoomOutboundEvent = {
        type: "AMMO_STATE",
        primary: p.weaponState.primary,
        secondary: p.weaponState.secondary,
      };
      if (process.send) {
        process.send({
          type: "outbound",
          targetPlayerId: p.id,
          event: evt,
        } as ChildToParentMessage);
      }
      p.channel.emit("reliable_event", evt);
      break;
    }
    case "FIRE": {
      if (!p.isAlive) break;
      const slot = event.weaponSlot as "primary" | "secondary";
      if (slot !== "primary" && slot !== "secondary") break;
      const wState = p.weaponState[slot];
      const weaponStats = getWeaponPerformance(wState.weaponId);
      if (!weaponStats) break;
      const reloadTicks = getWeaponReloadTicks(wState.weaponId);

      if (wState.currentMag <= 0) {
        if (!wState.isReloading && wState.reserve > 0) {
          wState.isReloading = true;
          wState.reloadTimer = reloadTicks;
          const evt: RoomOutboundEvent = {
            type: "AMMO_STATE",
            primary: p.weaponState.primary,
            secondary: p.weaponState.secondary,
          };
          if (process.send) {
            process.send({
              type: "outbound",
              targetPlayerId: p.id,
              event: evt,
            } as ChildToParentMessage);
          }
          p.channel.emit("reliable_event", evt);
        }
        break;
      }
      if (wState.isReloading) break;

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

        const evt: RoomOutboundEvent = {
          type: "AMMO_STATE",
          primary: p.weaponState.primary,
          secondary: p.weaponState.secondary,
        };
        if (process.send) {
          process.send({
            type: "outbound",
            targetPlayerId: p.id,
            event: evt,
          } as ChildToParentMessage);
        }
        p.channel.emit("reliable_event", evt);

        processHitscan(p, room, p.channel, event);
      } else {
        recordHitscanRejected("rate_limit_exceeded");
      }
      break;
    }
  }
}

async function handleTerminate(msg: Extract<ParentToChildMessage, { type: "terminate" }>) {
  if (currentRoom) {
    currentRoom.shutdown();
  }
  if (process.send) {
    process.send({
      type: "shutdown",
      roomId: currentRoom?.roomId || "unknown",
      reason: msg.reason,
    } as ChildToParentMessage);
  }
  process.exit(0);
}

process.on("message", async (msg: ParentToChildMessage) => {
  if (!msg || typeof msg !== "object") return;
  switch (msg.type) {
    case "init":
      await handleInit(msg);
      break;
    case "register_player":
      await handleRegisterPlayer(msg);
      break;
    case "remove_player":
      await handleRemovePlayer(msg);
      break;
    case "inbound":
      await handleInbound(msg);
      break;
    case "terminate":
      await handleTerminate(msg);
      break;
  }
});

process.on("uncaughtException", (err) => {
  console.error(`[room-worker ${process.pid}] uncaughtException:`, err);
  if (process.send && currentRoom) {
    try {
      process.send({
        type: "error",
        roomId: currentRoom.roomId,
        error: err?.message || String(err),
      } as ChildToParentMessage);
    } catch (e) {}
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(`[room-worker ${process.pid}] unhandledRejection:`, reason);
  if (process.send && currentRoom) {
    try {
      process.send({
        type: "error",
        roomId: currentRoom.roomId,
        error: String(reason),
      } as ChildToParentMessage);
    } catch (e) {}
  }
  process.exit(1);
});
