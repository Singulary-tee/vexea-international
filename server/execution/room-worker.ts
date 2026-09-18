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
const cancelledReconnectRequests = new Set<string>();
const latestReconnectGenerationByPlayer = new Map<string, number>();

class ChildChannelAdapter implements ChannelAdapter {
  public id: string;
  public connectionId?: string;
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

  triggerDisconnect(expectedConnectionId?: string): boolean {
    if (expectedConnectionId !== undefined && expectedConnectionId !== this.connectionId) {
      return false;
    }
    this.connected = false;
    for (const cb of this.disconnectListeners) {
      try {
        cb();
      } catch (e) {}
    }
    return true;
  }
}

function getOrCreateChannel(playerId: string, connectionId?: string): ChildChannelAdapter {
  let ch = channels.get(playerId);
  if (!ch) {
    ch = new ChildChannelAdapter(playerId);
    channels.set(playerId, ch);
  }
  if (connectionId !== undefined) ch.connectionId = connectionId;
  return ch;
}

const rapierPromise = RAPIER.init().catch((err) => {
  console.error("[room-worker] Failed to eagerly initialize Rapier WASM:", err);
});

async function handleInit(msg: Extract<ParentToChildMessage, { type: "init" }>) {
  try {
    await rapierPromise;
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
  const ch = getOrCreateChannel(msg.playerId, msg.channelId);
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

async function handleReconnectPlayer(msg: Extract<ParentToChildMessage, { type: "reconnect_player" }>) {
  let accepted = false;
  const latestGeneration = latestReconnectGenerationByPlayer.get(msg.playerId);
  if (
    cancelledReconnectRequests.has(msg.requestId) ||
    (latestGeneration !== undefined && msg.generation < latestGeneration)
  ) {
    if (process.send) {
      process.send({
        type: "reconnect_result",
        requestId: msg.requestId,
        generation: msg.generation,
        accepted: false,
      } as ChildToParentMessage);
    }
    return;
  }

  latestReconnectGenerationByPlayer.set(msg.playerId, msg.generation);
  const existing = currentRoom?.players.get(msg.playerId);
  const existingChannel = channels.get(msg.playerId);
  const channelAvailable = existingChannel
    ? !existingChannel.connected || existingChannel.connectionId === msg.channelId
    : false;
  if (
    !cancelledReconnectRequests.has(msg.requestId) &&
    latestReconnectGenerationByPlayer.get(msg.playerId) === msg.generation &&
    existing &&
    existing.reqUid === msg.reqUid &&
    channelAvailable
  ) {
    const channel = getOrCreateChannel(msg.playerId, msg.channelId);
    channel.connected = true;
    currentRoom!.registerPlayer(
      msg.playerId,
      channel,
      undefined,
      undefined,
      undefined,
      msg.reqUid,
    );
    accepted = true;
  }

  if (process.send) {
    process.send({
      type: "reconnect_result",
      requestId: msg.requestId,
      generation: msg.generation,
      accepted,
    } as ChildToParentMessage);
  }
}

function handleCancelReconnect(msg: Extract<ParentToChildMessage, { type: "cancel_reconnect" }>): void {
  cancelledReconnectRequests.add(msg.requestId);
  const latestGeneration = latestReconnectGenerationByPlayer.get(msg.playerId);
  if (latestGeneration === undefined || msg.generation >= latestGeneration) {
    latestReconnectGenerationByPlayer.set(msg.playerId, msg.generation);
  }
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

  if (playerId === "broadcast") {
    if (event.type === "PRE_MATCH_COUNTDOWN" || event.type === "PRE_MATCH_COUNTDOWN_TICK") {
      room.broadcastReliableEvent(event);
      return;
    }
    if (event.type === "START_MATCH") {
      await room.triggerStartMatch();
      return;
    }
  }

  if (playerId === "broadcast" || event.type === "CHAT_MESSAGE" || event.type === "QUICK_COMM" || event.type.startsWith("DEV_")) {
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

    if (event.type === "DEV_SPAWN_BOTS") {
      const args = event.args || {};
      const count = typeof args.count === "number" ? args.count : 3;
      room.spawnTestBots(count);
      return;
    }

    if (event.type === "DEV_SPAWN_DRONE") {
      const args = event.args || {};
      const type = typeof args.type === "number" ? args.type : Number(args.type);
      const pos = (args.x !== undefined && args.y !== undefined && args.z !== undefined) ? 
        { x: Number(args.x), y: Number(args.y), z: Number(args.z) } : undefined;
      room.registerDeveloperSpawner(type, pos);
      return;
    }

    if (event.type === "DEV_TOGGLE_LLM") {
      const args = event.args || {};
      room.llmCommanderDisabled = !!args?.disabled;
      return;
    }
  }

  let p = room.players.get(playerId);
  if (!p) {
    if (event.type === "PLAYER_QUIT") {
      await room.handlePlayerAbandonment(playerId);
      return;
    } else if (event.type === "PLAYER_DISCONNECT") {
      const channel = channels.get(playerId);
      if (!channel || channel.triggerDisconnect(event.channelId)) {
        room.handlePlayerDisconnect(playerId);
      }
      return;
    } else if (event.type === "REGISTER_PLAYER") {
      const ch = getOrCreateChannel(playerId, event.channelId);
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
      return;
    }
  }

  if (!p) return;
  room.recordPlayerActivity(p);

  switch (event.type) {
    case "INPUT": {
      if (
        !Number.isSafeInteger(event.seq) ||
        event.seq < 0 ||
        !Number.isInteger(event.inputMask) ||
        event.inputMask < 0 ||
        event.inputMask > 0xff ||
        !Number.isFinite(event.pitch) ||
        !Number.isFinite(event.yaw)
      ) {
        break;
      }
      room.updatePlayerInput(p, event.inputMask, event.pitch, event.yaw);
      break;
    }
    case "SET_AIM": {
      room.updatePlayerAiming(p, !!event.aiming);
      break;
    }
    case "SELECT_WEAPON": {
      room.selectPlayerWeapon(p, event.slot);
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
      if (event.channelId && p.channel.id !== event.channelId) break;
      await room.handlePlayerAbandonment(p.id, p.channel);
      break;
    }
    case "PLAYER_DISCONNECT": {
      const channel = channels.get(playerId);
      if (!channel || channel.triggerDisconnect(event.channelId)) {
        room.handlePlayerDisconnect(p.id);
      }
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
      const slot = event.weaponSlot;
      if (slot !== "primary" && slot !== "secondary") break;
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
      const slot = event.weaponSlot;
      if (slot !== "primary" && slot !== "secondary") break;
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
        p.firedSinceBroadcast = true;

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
    case "BENCHMARK_SPAWN_PROJECTILES": {
      if (process.env.VEXEA_BENCHMARK_CONTROL !== "true") break;
      const args = event.args || {};
      const count = Math.max(0, Math.min(200, Math.floor(Number(args?.count) || 0)));
      for (let i = 0; i < count; i += 1) {
        room.spawnServerProjectile(
          p.posX,
          p.posY,
          p.posZ,
          Math.sin(p.yaw + i * 0.05),
          0,
          Math.cos(p.yaw + i * 0.05),
          false,
          1,
          p.id,
        );
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
    case "reconnect_player":
      await handleReconnectPlayer(msg);
      break;
    case "cancel_reconnect":
      handleCancelReconnect(msg);
      break;
    case "remove_player":
      await handleRemovePlayer(msg);
      break;
    case "spawn_bots":
      if (currentRoom) {
        console.log(`[WORKER] Explicit spawn_bots received: ${msg.count}`);
        currentRoom.spawnTestBots(msg.count);
      }
      break;
    case "spawn_drones":
      if (currentRoom) {
        console.log(`[WORKER] Explicit spawn_drones received: ${msg.count}`);
        for (let i = 0; i < msg.count; i++) {
          currentRoom.spawnDrone(msg.droneType || 4);
        }
      }
      break;
    case "spawn_projectiles":
      if (currentRoom) {
        console.log(`[WORKER] Explicit spawn_projectiles received: ${msg.count}`);
        currentRoom.spawnServerProjectileBatch(msg.count);
      }
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
