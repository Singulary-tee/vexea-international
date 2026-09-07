import { RoomExecution, RoomExecutionStatus, RoomInboundEvent, RoomOutboundEvent } from "./RoomExecution";
import { MatchRoom, PlayerState, getWeaponReloadTicks } from "../MatchRoom";
import { processHitscan } from "../combat/hitscan";
import { getWeaponPerformance } from "../../shared/constants";
import { recordHitscanRejected } from "../sentry";

export class InProcessRoomExecution implements RoomExecution {
  private room: MatchRoom;
  private outboundListeners: Array<(playerId: string | "broadcast", event: RoomOutboundEvent) => void> = [];
  private status: RoomExecutionStatus = "active";

  constructor(room: MatchRoom) {
    this.room = room;
    const prevShutdown = this.room.onShutdown;
    this.room.onShutdown = (id: string) => {
      this.status = "ending";
      if (prevShutdown) prevShutdown(id);
    };
  }

  public get roomId(): string {
    return this.room.roomId;
  }

  public getRoom(): MatchRoom {
    return this.room;
  }

  public onOutbound(callback: (playerId: string | "broadcast", event: RoomOutboundEvent) => void): void {
    this.outboundListeners.push(callback);
  }

  public emitOutbound(playerId: string | "broadcast", event: RoomOutboundEvent): void {
    for (const listener of this.outboundListeners) {
      try {
        listener(playerId, event);
      } catch (err) {
        console.error(`[InProcessRoomExecution] Outbound callback error in room ${this.roomId}:`, err);
      }
    }
  }

  public async send(playerId: string | "broadcast", event: RoomInboundEvent): Promise<void> {
    if (this.status === "ending" || this.status === "crashed") {
      return;
    }

    if (playerId === "broadcast" || event.type === "CHAT_MESSAGE" || event.type === "QUICK_COMM") {
      if (event.type === "CHAT_MESSAGE") {
        const message = event.message;
        if (message && typeof message === "string" && message.trim().length > 0) {
          const trimmed = message.trim().slice(0, 150);
          const p = playerId !== "broadcast" ? this.room.players.get(playerId) : null;
          const senderName = event.sender || p?.displayName || (playerId !== "broadcast" ? playerId : "System");
          
          this.emitOutbound("broadcast", {
            type: "CHAT_MESSAGE",
            sender: senderName,
            message: trimmed,
          });

          for (const [id, player] of this.room.players.entries()) {
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
          const p = playerId !== "broadcast" ? this.room.players.get(playerId) : null;
          const senderName = event.sender || p?.displayName || (playerId !== "broadcast" ? playerId : "System");
          
          this.emitOutbound("broadcast", {
            type: "QUICK_COMM",
            sender: senderName,
            optionId,
          });

          for (const [id, player] of this.room.players.entries()) {
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

    const p = this.room.players.get(playerId);
    if (!p) {
      if (event.type === "PLAYER_QUIT") {
        await this.room.handlePlayerAbandonment(playerId);
      } else if (event.type === "PLAYER_DISCONNECT") {
        this.room.handlePlayerDisconnect(playerId);
      }
      return;
    }

    this.room.recordPlayerActivity(p);

    switch (event.type) {
      case "INPUT": {
        this.room.updatePlayerInput(p, event.inputMask, event.pitch, event.yaw);
        break;
      }
      case "USE_UTILITY": {
        if (p.isAlive && (event.slot === "utility1" || event.slot === "utility2")) {
          this.room.useUtility(p.id, event.slot);
        }
        break;
      }
      case "OBJECTIVE_HOLD": {
        if (p.isAlive) {
          this.room.setObjectiveHold(p.id, !!event.holding);
        }
        break;
      }
      case "PLAYER_READY": {
        this.room.setPlayerReady(p.id);
        break;
      }
      case "PLAYER_QUIT": {
        await this.room.handlePlayerAbandonment(p.id);
        break;
      }
      case "PLAYER_DISCONNECT": {
        this.room.handlePlayerDisconnect(p.id);
        break;
      }
      case "SELECT_CLASS": {
        this.room.applyPlayerClassLoadout(p.id, event.classId);
        break;
      }
      case "REMOVE_PLAYER": {
        this.room.removePlayer(p.id);
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
        this.emitOutbound(p.id, evt);
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
        this.emitOutbound(p.id, evt);
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
        this.emitOutbound(p.id, evt);
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
            this.emitOutbound(p.id, evt);
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
          this.emitOutbound(p.id, evt);
          p.channel.emit("reliable_event", evt);

          processHitscan(p, this.room, p.channel, event);
        } else {
          recordHitscanRejected("rate_limit_exceeded");
        }
        break;
      }
    }
  }

  public async spawnBots(count: number): Promise<void> {
    this.room.spawnTestBots(count);
  }

  public async spawnDrones(count: number, type?: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.room.spawnDrone(type || 4);
    }
  }

  public async spawnProjectiles(count: number): Promise<void> {
    this.room.spawnServerProjectileBatch(count);
  }

  public async getStatus(): Promise<RoomExecutionStatus> {
    return this.status;
  }

  public async terminate(reason: string): Promise<void> {
    console.log(`[InProcessRoomExecution] Terminating room ${this.roomId}: ${reason}`);
    this.status = "ending";
    this.room.shutdown();
  }
}
